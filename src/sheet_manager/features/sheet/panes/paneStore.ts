import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { reportSheetIssue } from '../../../diagnostics';
import { useDocumentStore } from '../../../store/documentStore';
import { SIDE_BY_SIDE_WIDTH } from './layout';
import {
    EMPTY_LAYOUT,
    findGroup,
    focusedGroup,
    groupOf,
    groupsInOrder,
    type LayoutNode,
    type LayoutState,
    minSizeOf,
    openKeys,
    placeTab,
    reconcileLayout,
    removeTab,
    setWeightsAt,
    splitGroup,
    type SplitSide,
} from './layoutTree';
import { docKey, documentIdOf, type TabKey, tabKindOf } from './tabKeys';
import {
    layoutFromArrangement,
    MAX_DOCUMENTS,
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
export const usePaneStore = create<LayoutState>()(
    persist(() => EMPTY_LAYOUT, {
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
    const group = focusedGroup(state);
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
