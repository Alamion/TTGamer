import {
    readLayout as readWindowLayout,
    type WindowLayout,
} from '@site/src/shared/utils/windowLayout';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { reportSheetIssue } from '../../../diagnostics';
import { useDocumentStore } from '../../../store/documentStore';
import type { DropTarget } from './dropTargets';
import { SIDE_BY_SIDE_WIDTH } from './layout';
import {
    documentGroup,
    EMPTY_LAYOUT,
    findGroup,
    focusedGroup,
    groupOf,
    groupsInOrder,
    type LayoutNode,
    type LayoutState,
    makeGroup,
    minSizeOf,
    normalize,
    openKeys,
    placeTab,
    reconcileLayout,
    removeTab,
    setWeightsAt,
    splitGroup,
    type SplitSide,
} from './layoutTree';
import {
    docKey,
    documentIdOf,
    parseTabKey,
    type TabKey,
    tabKindOf,
    type ToolId,
    toolKey,
} from './tabKeys';
import {
    layoutFromArrangement,
    MAX_DOCUMENTS,
    MAX_FLOATING,
    MAX_GROUPS,
    PANES_STORAGE_KEY,
    PANES_V1_STORAGE_KEY,
    readArrangement,
    readLayout,
} from './types';
import { defaultPaneView } from './views';

/** The device's storage when it works; the layout is a convenience, losing it is fine. */
const safeStorage = {
    getItem: (name: string) => {
        try {
            return globalThis.localStorage?.getItem(name) ?? null;
        } catch {
            return null;
        }
    },
    setItem: (name: string, value: string) => {
        try {
            globalThis.localStorage?.setItem(name, value);
        } catch {
            // See above.
        }
    },
    removeItem: (name: string) => {
        try {
            globalThis.localStorage?.removeItem(name);
        } catch {
            // See above.
        }
    },
};

const invalid = (message: string) =>
    reportSheetIssue({ code: 'pane-arrangement-invalid', message });

/** The spec 034 arrangement as a layout, once: the old value is removed after it is read. */
function migrateArrangement(): LayoutState | null {
    const raw = safeStorage.getItem(PANES_V1_STORAGE_KEY);
    if (raw === null) return null;
    safeStorage.removeItem(PANES_V1_STORAGE_KEY);
    let arrangement = null;
    try {
        arrangement = readArrangement((JSON.parse(raw) as { state?: unknown }).state);
    } catch {
        // Reported below.
    }
    if (!arrangement) {
        invalid('The stored panes of spec 034 could not be read; one document shows');
        return null;
    }
    return layoutFromArrangement(arrangement);
}

/**
 * The layout of this device (spec 036, FR-015): kept in localStorage, not in the documents'
 * storage, because it is a reading preference that is neither exported nor synced. It is read when
 * the module loads; the sheet draws it only after the documents are loaded, so the server render,
 * which has no documents, never differs from the first browser render.
 */
/** The layout plus what lives only while the page is open. */
export interface PaneState extends LayoutState {
    /** The tool a phone shows over the page (the narrow view draws no groups). */
    shownTool: TabKey | null;
    /** Where a floating window's title bar would dock, while it is dragged. */
    dockHint: DropTarget | null;
}

export const usePaneStore = create<PaneState>()(
    persist((): PaneState => ({ ...EMPTY_LAYOUT, shownTool: null, dockHint: null }), {
        name: PANES_STORAGE_KEY,
        version: 2,
        storage: createJSONStorage(() => safeStorage),
        partialize: ({ root, recent, views, maximized, floating, lastRect, lastSide }) => ({
            root,
            recent,
            views,
            maximized,
            floating,
            lastRect,
            lastSide,
        }),
        merge: (persisted, current) => {
            if (persisted === undefined || persisted === null) {
                const migrated = migrateArrangement();
                return migrated ? { ...current, ...migrated } : current;
            }
            const stored = readLayout(persisted);
            if (!stored) {
                invalid('The stored layout could not be read; one document shows');
                return current;
            }
            if (stored.dropped.length > 0) {
                invalid(`Parts of the stored layout were dropped: ${stored.dropped.join('; ')}`);
            }
            return { ...current, ...stored.layout };
        },
    })
);

/** The layout made true for the current document and the documents that exist. */
function reconciled(): LayoutState {
    const documents = useDocumentStore.getState();
    return reconcileLayout(
        usePaneStore.getState(),
        documents.currentDocumentId,
        new Set(documents.entries.map((entry) => entry.id))
    );
}

const rankIn = (recent: readonly TabKey[]) => (key: TabKey) => {
    const position = recent.indexOf(key);
    return position === -1 ? Number.POSITIVE_INFINITY : position;
};

/**
 * Makes room for one more document (FR-012): at the limit the least recently used document tab
 * that no group shows and no window holds is closed. Returns the layout and the closed document.
 */
function admitDocument(state: LayoutState): { state: LayoutState; closed: string | null } {
    const documents = openKeys(state).filter((key) => documentIdOf(key) !== null);
    if (documents.length < MAX_DOCUMENTS) return { state, closed: null };
    const shown = new Set([
        ...groupsInOrder(state.root).map((group) => group.shown),
        ...state.floating.map(({ key }) => key),
    ]);
    const rank = rankIn(state.recent);
    const victim = documents
        .filter((key) => !shown.has(key))
        .reduce<TabKey | undefined>(
            (oldest, key) => (oldest === undefined || rank(key) > rank(oldest) ? key : oldest),
            undefined
        );
    if (!victim) return { state, closed: null };
    return {
        state: { ...state, root: removeTab(state.root, victim) },
        closed: documentIdOf(victim),
    };
}

const startView = (id: string) => {
    const entry = useDocumentStore.getState().entries.find((candidate) => candidate.id === id);
    return entry ? defaultPaneView(entry) : undefined;
};

/** What happened when a document was opened: a tab that gave way, or a group that could not be. */
export interface OpenOutcome {
    closed: string | null;
    asTab: boolean;
}

let measuredArea: { width: number; height: number } | null = null;

/** The size of the sheet's layout area, as last drawn; `null` before it is drawn. */
export function setLayoutArea(size: { width: number; height: number } | null): void {
    measuredArea = size;
}

/**
 * Whether every group of `root` keeps its minimum size in the layout area (the window's size
 * until the area is drawn). Below the side-by-side width only the group count matters: the narrow
 * view shows one document anyway (design D7).
 */
function hasRoomFor(root: LayoutNode | null): boolean {
    const area =
        measuredArea ??
        (typeof window === 'undefined'
            ? null
            : { width: window.innerWidth, height: window.innerHeight });
    if (!area || area.width < SIDE_BY_SIDE_WIDTH) return true;
    const needed = minSizeOf(root);
    return needed.width <= area.width && needed.height <= area.height;
}

function openDocument(id: string, place: 'beside' | 'tab'): OpenOutcome {
    const documents = useDocumentStore.getState();
    const key = docKey(id);
    let state = reconciled();
    if (openKeys(state).includes(key)) {
        focusTab(key);
        return { closed: null, asTab: false };
    }
    const admitted = admitDocument(state);
    state = admitted.state;
    const group = documentGroup(state);
    const beside =
        group && place === 'beside' && groupsInOrder(state.root).length < MAX_GROUPS
            ? splitGroup(state.root, group.id, 'right', key)
            : null;
    const asTab = !beside || !hasRoomFor(beside);
    const root = !group ? state.root : asTab ? placeTab(state.root, key, group.id) : beside;
    const view = place === 'beside' ? startView(id) : undefined;
    usePaneStore.setState({
        ...state,
        root,
        recent: [key, ...state.recent],
        views: view ? { ...state.views, [id]: view } : state.views,
        maximized: null,
    });
    documents.setCurrentDocument(id);
    return { closed: admitted.closed, asTab: asTab && place === 'beside' };
}

/** **Open beside**: a new group right of the last used one, starting in the document's brief. */
export const openBeside = (id: string) => openDocument(id, 'beside');

/** **Open in new tab**: a tab of the last used group, after its shown tab (spec 036, FR-003). */
export const openInNewTab = (id: string) => openDocument(id, 'tab');

/** Shows the tab in its group and makes it the one used last; a document becomes current. */
export function focusTab(key: TabKey): void {
    const state = reconciled();
    const group = groupOf(state.root, key);
    const root =
        group && group.shown !== key
            ? placeTab(state.root, key, group.id, group.tabs.indexOf(key))
            : state.root;
    const recent = [key, ...state.recent.filter((candidate) => candidate !== key)];
    usePaneStore.setState({ ...state, root, recent });
    const id = documentIdOf(key);
    if (id && useDocumentStore.getState().currentDocumentId !== id) {
        useDocumentStore.getState().setCurrentDocument(id);
    }
}

/**
 * Closes a tab (a document stays in the collection, a tool closes); the group's neighbour tab is
 * shown. The last open document is not closed: the sheet always shows one.
 */
export function closeTab(key: TabKey): void {
    const state = reconciled();
    const id = documentIdOf(key);
    const documents = openKeys(state).filter((candidate) => documentIdOf(candidate) !== null);
    if (!openKeys(state).includes(key) || (id !== null && documents.length < 2)) return;
    const floating = state.floating.filter((entry) => entry.key !== key);
    const root =
        floating.length === state.floating.length ? removeTab(state.root, key) : state.root;
    const recent = state.recent.filter((candidate) => candidate !== key);
    usePaneStore.setState({ ...state, root, floating, recent });
    if (id === null) {
        tabKindOf(key)?.onClose?.();
        return;
    }
    const current = useDocumentStore.getState();
    if (current.currentDocumentId !== id) return;
    const before = groupOf(state.root, key);
    const neighbour = before ? findGroup(root, before.id)?.shown : undefined;
    const firstDocument = (keys: readonly TabKey[]) =>
        keys.map(documentIdOf).find((candidate) => candidate !== null) ?? null;
    const next =
        (neighbour ? documentIdOf(neighbour) : null) ??
        firstDocument(recent) ??
        firstDocument(openKeys({ root, floating }));
    if (next) current.setCurrentDocument(next);
}

/** Gives the group the whole area, or gives it back when it already has it. */
export function toggleMaximized(groupId: string): void {
    const state = reconciled();
    const group = findGroup(state.root, groupId);
    if (!group || groupsInOrder(state.root).length < 2) return;
    usePaneStore.setState({ ...state, maximized: state.maximized === groupId ? null : groupId });
    focusTab(group.shown);
}

/** Stores the sizes of the children of the split at `path` as weights. */
export function setSplitWeights(path: readonly number[], weights: readonly number[]): void {
    usePaneStore.setState((state) => ({ root: setWeightsAt(state.root, path, weights) }));
}

/** Sets a document tab's own view; `undefined` goes back to the document's preferred one. */
export function setPaneView(id: string, view: string | undefined): void {
    usePaneStore.setState((state) => {
        const rest = Object.fromEntries(Object.entries(state.views).filter(([key]) => key !== id));
        return { views: view === undefined ? rest : { ...rest, [id]: view } };
    });
}

/** Puts the tab in group `groupId` at gap `gap` of its strip, shown and focused (spec 036, US2). */
export function moveTab(key: TabKey, groupId: string, gap?: number): void {
    const state = reconciled();
    const root = placeTab(state.root, key, groupId, gap);
    if (root === state.root) return;
    usePaneStore.setState({ ...state, root, maximized: null });
    focusTab(key);
}

/** Moves the tab one place left (`-1`) or right (`1`) in its strip. */
export function moveTabBy(key: TabKey, offset: -1 | 1): void {
    const group = groupOf(usePaneStore.getState().root, key);
    if (!group) return;
    const from = group.tabs.indexOf(key);
    const gap = offset < 0 ? from - 1 : from + 2;
    if (gap < 0 || gap > group.tabs.length) return;
    moveTab(key, group.id, gap);
}

/** Moves the tab to the next group in reading order (the first after the last). */
export function moveToNextGroup(key: TabKey): void {
    const groups = groupsInOrder(usePaneStore.getState().root);
    const index = groups.findIndex((group) => group.tabs.includes(key));
    if (index === -1 || groups.length < 2) return;
    moveTab(key, groups[(index + 1) % groups.length]!.id);
}

/**
 * Splits group `groupId` on `side` and puts the tab alone in the new group. Refused at six groups;
 * whether the new group fits is checked by the caller, which knows the area.
 */
export function splitWith(key: TabKey, groupId: string, side: SplitSide): boolean {
    const state = reconciled();
    if (groupsInOrder(state.root).length >= MAX_GROUPS) return false;
    const root = splitGroup(state.root, groupId, side, key);
    if (root === state.root) return false;
    usePaneStore.setState({ ...state, root, maximized: null });
    focusTab(key);
    return true;
}

const isTool = (key: TabKey) => parseTabKey(key)?.kind === 'tool';

/** A new window: as wide as the documents window always was, so tools show their full layout. */
/**
 * Where the documents window of spec 032 was, read once from its own key and then removed: it
 * becomes where the documents tool floats (spec 036).
 */
function legacyRect(key: TabKey): WindowLayout | undefined {
    if (key !== toolKey('documents')) return undefined;
    const raw = safeStorage.getItem('window-layout:documents');
    if (raw === null) return undefined;
    safeStorage.removeItem('window-layout:documents');
    try {
        const rect = readWindowLayout(JSON.parse(raw), { x: 0, y: 0, width: 0, height: 0 });
        return rect.width > 0 && rect.height > 0 ? rect : undefined;
    } catch {
        return undefined;
    }
}

const DEFAULT_FLOAT = { width: 720, height: 560 };

/** Where a tool goes the first time it opens (spec 036, D10). */
const FIRST_SIDE: Record<ToolId, 'left' | 'right'> = {
    documents: 'left',
    library: 'left',
    dice: 'right',
};

/** A tool's share of the width beside the rest, as a weight against an average group of 1. */
const TOOL_WEIGHT = 0.7;

/**
 * The layout with the tool docked on `side`: as a tab of the outermost group there when that one
 * holds a tool, or when no other group fits (six groups, or no room); else in a new group at that
 * edge of the whole layout.
 */
function dockTool(root: LayoutNode | null, key: TabKey, side: 'left' | 'right'): LayoutNode | null {
    if (!root) return makeGroup([key]);
    const groups = groupsInOrder(root);
    const edge = side === 'left' ? groups[0]! : groups.at(-1)!;
    const fresh = makeGroup([key]);
    const rest = root.type === 'split' && root.direction === 'row' ? root.children.length : 1;
    const beside = normalize({
        type: 'split',
        direction: 'row',
        children: side === 'left' ? [fresh, root] : [root, fresh],
        weights: side === 'left' ? [TOOL_WEIGHT, rest] : [rest, TOOL_WEIGHT],
    });
    const joinEdge = edge.tabs.some(isTool) || groups.length >= MAX_GROUPS || !hasRoomFor(beside);
    return joinEdge ? placeTab(root, key, edge.id) : beside;
}

/** The side of the layout a grouped tab is on: the first half of the groups is the left. */
function sideOf(state: LayoutState, key: TabKey): 'left' | 'right' | undefined {
    const groups = groupsInOrder(state.root);
    const index = groups.findIndex((group) => group.tabs.includes(key));
    if (index === -1 || groups.length < 2) return undefined;
    return index < groups.length / 2 ? 'left' : 'right';
}

/**
 * Opens a tool (spec 036, US3): one that is open is shown and brought forward; otherwise it docks
 * on its last side (first time: documents and library left, dice right). A phone shows it over
 * the page.
 */
export function openTool(toolId: ToolId): void {
    const key = toolKey(toolId);
    const state = reconciled();
    if (openKeys(state).includes(key)) {
        if (state.floating.some((entry) => entry.key === key)) raise(key);
        else focusTab(key);
        usePaneStore.setState({ shownTool: key });
        return;
    }
    const side = state.lastSide[key] ?? FIRST_SIDE[toolId];
    if (!useDocumentStore.getState().currentDocumentId) {
        // No document, no layout to dock in: the tool floats where it last did.
        const offset = 32 * state.floating.length;
        const rect = state.lastRect[key] ??
            legacyRect(key) ?? { x: 160 + offset, y: 120 + offset, ...DEFAULT_FLOAT };
        usePaneStore.setState({
            floating: [...state.floating.filter((entry) => entry.key !== key), { key, rect }],
            recent: [key, ...state.recent],
            shownTool: key,
        });
        return;
    }
    usePaneStore.setState({
        ...state,
        root: dockTool(state.root, key, side),
        recent: [key, ...state.recent],
        lastSide: { ...state.lastSide, [key]: side },
        maximized: null,
        shownTool: key,
    });
}

/** Whether a tool is open (in a group or a window). */
export const isToolOpen = (state: LayoutState, toolId: ToolId) =>
    openKeys(state).includes(toolKey(toolId));

/** The phone's view of a tool is put away; the tool keeps its place on a wide screen. */
export const hideShownTool = () => usePaneStore.setState({ shownTool: null });

/**
 * Takes a tab out of its group into a window above the page (at `at`, else where the tool last
 * floated, else a cascaded default). Refused at four windows: `false`.
 */
export function floatTab(key: TabKey, at?: { x: number; y: number }): boolean {
    const state = reconciled();
    if (state.floating.length >= MAX_FLOATING) return false;
    if (!groupOf(state.root, key)) return false;
    const offset = 32 * state.floating.length;
    const rect: WindowLayout = at
        ? { x: Math.max(0, at.x - 120), y: Math.max(0, at.y - 16), ...DEFAULT_FLOAT }
        : (state.lastRect[key] ??
          legacyRect(key) ?? { x: 160 + offset, y: 120 + offset, ...DEFAULT_FLOAT });
    const side = sideOf(state, key);
    usePaneStore.setState({
        ...state,
        root: removeTab(state.root, key),
        floating: [...state.floating, { key, rect }],
        recent: [key, ...state.recent.filter((candidate) => candidate !== key)],
        lastSide: isTool(key) && side ? { ...state.lastSide, [key]: side } : state.lastSide,
        maximized: null,
    });
    return true;
}

/** Brings a floating window to the front and makes it the one used last. */
export function raise(key: TabKey): void {
    const state = usePaneStore.getState();
    const entry = state.floating.find((candidate) => candidate.key === key);
    if (!entry) return;
    const front = state.floating.at(-1)?.key === key && state.recent[0] === key;
    if (!front) {
        usePaneStore.setState({
            floating: [...state.floating.filter((candidate) => candidate.key !== key), entry],
            recent: [key, ...state.recent.filter((candidate) => candidate !== key)],
        });
    }
    const id = documentIdOf(key);
    if (id && useDocumentStore.getState().currentDocumentId !== id) {
        useDocumentStore.getState().setCurrentDocument(id);
    }
}

/** Stores where a floating window is (`null`: back to its default place). */
export function setFloatingRect(key: TabKey, rect: WindowLayout | null): void {
    usePaneStore.setState((state) => {
        const next = rect ?? { x: 160, y: 120, ...DEFAULT_FLOAT };
        return {
            floating: state.floating.map((entry) =>
                entry.key === key ? { key, rect: next } : entry
            ),
            lastRect: isTool(key) ? { ...state.lastRect, [key]: next } : state.lastRect,
        };
    });
}

/**
 * Puts a floating window back into the layout: at `target` (its title bar was dropped there),
 * else a tool on its last side and a document as a tab of the last used group.
 */
export function dockFloating(key: TabKey, target?: DropTarget): void {
    const state = reconciled();
    if (!state.floating.some((entry) => entry.key === key)) return;
    const floating = state.floating.filter((entry) => entry.key !== key);
    let root: LayoutNode | null;
    if (target?.kind === 'edge') {
        root = splitGroup(state.root, target.groupId, target.side, key);
    } else if (target) {
        root = placeTab(
            state.root,
            key,
            target.groupId,
            target.kind === 'strip' ? target.gap : undefined
        );
    } else if (isTool(key)) {
        const toolId = parseTabKey(key)!.id as ToolId;
        root = dockTool(state.root, key, state.lastSide[key] ?? FIRST_SIDE[toolId]);
    } else {
        const group = focusedGroup(state);
        root = group ? placeTab(state.root, key, group.id) : makeGroup([key]);
    }
    usePaneStore.setState({ ...state, root, floating, dockHint: null });
    focusTab(key);
}

/** Whether splitting the group on `side` for `key` keeps under seven groups that all fit. */
export function canSplitAt(groupId: string, side: SplitSide, key: TabKey): boolean {
    const { root } = usePaneStore.getState();
    if (groupsInOrder(root).length >= MAX_GROUPS) return false;
    const probe = splitGroup(root, groupId, side, key, 'probe');
    return probe !== root && hasRoomFor(probe);
}
