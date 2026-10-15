import { randomToken } from '@site/src/shared/utils/random';
import type { WindowLayout } from '@site/src/shared/utils/windowLayout';

import { DIVIDER_SIZE, fitSizes, MIN_GROUP_HEIGHT, MIN_GROUP_WIDTH } from './layout';
import { docKey, documentIdOf, type TabKey } from './tabKeys';

/** The side of a collapsed group (spec 036, US5). */
export const COLLAPSED_SIZE = 28;

export type SplitDirection = 'row' | 'column';
export type SplitSide = 'left' | 'right' | 'top' | 'bottom';

/** A rectangle of the layout with its own tabs, one of them shown. */
export interface GroupNode {
    type: 'group';
    id: string;
    tabs: TabKey[];
    shown: TabKey;
    collapsed?: boolean;
}

/** Children side by side (`row`) or one above the other (`column`), with relative sizes. */
export interface SplitNode {
    type: 'split';
    direction: SplitDirection;
    children: LayoutNode[];
    weights: number[];
}

export type LayoutNode = GroupNode | SplitNode;

export interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export const newGroupId = () => `g${randomToken(8)}`;

export function makeGroup(tabs: readonly TabKey[], id = newGroupId()): GroupNode {
    return { type: 'group', id, tabs: [...tabs], shown: tabs[0]! };
}

const usable = (weight: number | undefined) =>
    weight !== undefined && Number.isFinite(weight) && weight > 0;

/**
 * The one shape of an arrangement (design D2 of spec 035): emptied groups go, a split with one
 * child is that child, a split inside a split of the same direction is merged into it, and a shown
 * tab is one of the group's tabs. The same object comes back when nothing changes.
 */
export function normalize(node: LayoutNode | null): LayoutNode | null {
    if (!node) return null;
    if (node.type === 'group') {
        if (node.tabs.length === 0) return null;
        return node.tabs.includes(node.shown) ? node : { ...node, shown: node.tabs[0]! };
    }
    const children: LayoutNode[] = [];
    const weights: number[] = [];
    let changed = node.weights.length !== node.children.length;
    node.children.forEach((child, index) => {
        const weight = node.weights[index];
        if (!usable(weight)) changed = true;
        const own = usable(weight) ? weight! : 1;
        const next = normalize(child);
        if (next !== child) changed = true;
        if (!next) return;
        if (next.type === 'split' && next.direction === node.direction) {
            changed = true;
            const total = next.weights.reduce((sum, value) => sum + value, 0);
            next.children.forEach((grandchild, position) => {
                children.push(grandchild);
                weights.push((own * next.weights[position]!) / total);
            });
            return;
        }
        children.push(next);
        weights.push(own);
    });
    if (children.length === 0) return null;
    if (children.length === 1) return children[0]!;
    return changed ? { type: 'split', direction: node.direction, children, weights } : node;
}

/** Every group in reading order: depth first, left to right, top to bottom. */
export function groupsInOrder(node: LayoutNode | null): GroupNode[] {
    if (!node) return [];
    return node.type === 'group' ? [node] : node.children.flatMap(groupsInOrder);
}

export const groupOf = (root: LayoutNode | null, key: TabKey) =>
    groupsInOrder(root).find((group) => group.tabs.includes(key));

export const findGroup = (root: LayoutNode | null, id: string) =>
    groupsInOrder(root).find((group) => group.id === id);

/** The tree with one node replaced (by identity); unrelated nodes are kept. */
function replaceNode(node: LayoutNode, target: LayoutNode, next: LayoutNode): LayoutNode {
    if (node === target) return next;
    if (node.type === 'group') return node;
    let changed = false;
    const children = node.children.map((child) => {
        const replaced = replaceNode(child, target, next);
        if (replaced !== child) changed = true;
        return replaced;
    });
    return changed ? { ...node, children } : node;
}

/** The tree without that tab; the neighbour on the right (else the left) is shown instead. */
export function removeTab(root: LayoutNode | null, key: TabKey): LayoutNode | null {
    const group = groupOf(root, key);
    if (!root || !group) return root;
    const position = group.tabs.indexOf(key);
    const tabs = group.tabs.filter((tab) => tab !== key);
    const shown = group.shown === key ? (tabs[position] ?? tabs[position - 1] ?? '') : group.shown;
    return normalize(replaceNode(root, group, { ...group, tabs, shown }));
}

/**
 * The tree with the tab in group `groupId` at gap `gap` of that strip as drawn (the tab itself
 * counted if it is already there), shown; taken out of any other group first. Without a gap the
 * tab goes after the shown one.
 */
export function placeTab(
    root: LayoutNode | null,
    key: TabKey,
    groupId: string,
    gap?: number
): LayoutNode | null {
    const source = groupOf(root, key);
    const tree = source && source.id !== groupId ? removeTab(root, key) : root;
    const target = findGroup(tree, groupId);
    if (!tree || !target) return root;
    const from = target.tabs.indexOf(key);
    const tabs = target.tabs.filter((tab) => tab !== key);
    const index =
        gap === undefined
            ? tabs.indexOf(target.shown) + 1 || tabs.length
            : from !== -1 && from < gap
              ? gap - 1
              : gap;
    tabs.splice(Math.max(0, Math.min(tabs.length, index)), 0, key);
    const same =
        tabs.length === target.tabs.length &&
        tabs.every((tab, position) => tab === target.tabs[position]) &&
        target.shown === key;
    return same ? tree : normalize(replaceNode(tree, target, { ...target, tabs, shown: key }));
}

const axisOf = (side: SplitSide): SplitDirection =>
    side === 'left' || side === 'right' ? 'row' : 'column';

function insertBeside(
    node: LayoutNode,
    groupId: string,
    fresh: GroupNode,
    side: SplitSide
): LayoutNode {
    const direction = axisOf(side);
    const before = side === 'left' || side === 'top';
    const pair = (group: LayoutNode): SplitNode => ({
        type: 'split',
        direction,
        children: before ? [fresh, group] : [group, fresh],
        weights: [1, 1],
    });
    if (node.type === 'group') return node.id === groupId ? pair(node) : node;
    const index = node.children.findIndex(
        (child) => child.type === 'group' && child.id === groupId
    );
    if (index !== -1 && node.direction === direction) {
        const weight = node.weights[index]! / 2;
        const children = [...node.children];
        const weights = [...node.weights];
        weights[index] = weight;
        children.splice(before ? index : index + 1, 0, fresh);
        weights.splice(before ? index : index + 1, 0, weight);
        return { ...node, children, weights };
    }
    let changed = false;
    const children = node.children.map((child) => {
        const next = insertBeside(child, groupId, fresh, side);
        if (next !== child) changed = true;
        return next;
    });
    return changed ? { ...node, children } : node;
}

/**
 * The tree with group `groupId` split on `side`: the tab leaves its group and is alone in a new
 * group there. A group's only tab on its own edge changes nothing.
 */
export function splitGroup(
    root: LayoutNode | null,
    groupId: string,
    side: SplitSide,
    key: TabKey,
    freshId = newGroupId()
): LayoutNode | null {
    const target = findGroup(root, groupId);
    if (!root || !target) return root;
    if (target.tabs.length === 1 && target.tabs[0] === key) return root;
    const tree = groupOf(root, key) ? removeTab(root, key) : root;
    if (!tree) return root;
    return normalize(insertBeside(tree, groupId, makeGroup([key], freshId), side));
}

/** The smallest the node can be drawn: groups at their minimum, collapsed ones as a strip. */
export function minSizeOf(node: LayoutNode | null): { width: number; height: number } {
    if (!node) return { width: 0, height: 0 };
    if (node.type === 'group') {
        return node.collapsed
            ? { width: COLLAPSED_SIZE, height: COLLAPSED_SIZE }
            : { width: MIN_GROUP_WIDTH, height: MIN_GROUP_HEIGHT };
    }
    const sizes = node.children.map(minSizeOf);
    const dividers = DIVIDER_SIZE * (node.children.length - 1);
    return node.direction === 'row'
        ? {
              width: sizes.reduce((sum, size) => sum + size.width, 0) + dividers,
              height: Math.max(...sizes.map((size) => size.height)),
          }
        : {
              width: Math.max(...sizes.map((size) => size.width)),
              height: sizes.reduce((sum, size) => sum + size.height, 0) + dividers,
          };
}

export interface DividerPlace {
    /** Child indexes from the root to the split. */
    path: number[];
    /** The divider follows child `index`. */
    index: number;
    direction: SplitDirection;
    rect: Rect;
    /** The children's sizes along the split's axis, and their minimums. */
    sizes: number[];
    mins: number[];
}

export interface Placement {
    groups: { id: string; rect: Rect }[];
    dividers: DividerPlace[];
}

const isCollapsed = (node: LayoutNode) => node.type === 'group' && node.collapsed === true;

/**
 * Where every group and divider is drawn in an area this big; `weightsAt` replaces the weights of
 * one split (a divider drag being previewed).
 */
export function rectsOf(
    root: LayoutNode | null,
    area: { width: number; height: number },
    weightsAt?: { path: readonly number[]; weights: readonly number[] }
): Placement {
    const placement: Placement = { groups: [], dividers: [] };
    const place = (node: LayoutNode, rect: Rect, path: number[]) => {
        if (node.type === 'group') {
            placement.groups.push({ id: node.id, rect });
            return;
        }
        const row = node.direction === 'row';
        const count = node.children.length;
        const length = (row ? rect.width : rect.height) - DIVIDER_SIZE * (count - 1);
        const override =
            weightsAt && weightsAt.path.join('.') === path.join('.') ? weightsAt.weights : null;
        const weights = override ?? node.weights;
        const mins = node.children.map((child) => {
            const size = minSizeOf(child);
            return row ? size.width : size.height;
        });
        const open = node.children
            .map((child, index) => ({ child, index }))
            .filter(({ child }) => !isCollapsed(child));
        const fixed = (count - open.length) * COLLAPSED_SIZE;
        const fitted = fitSizes(
            open.map(({ index }) => weights[index]!),
            length - fixed,
            open.map(({ index }) => mins[index]!)
        );
        const sizes = node.children.map((child, index) =>
            isCollapsed(child)
                ? COLLAPSED_SIZE
                : fitted[open.findIndex((entry) => entry.index === index)]!
        );
        let offset = row ? rect.left : rect.top;
        node.children.forEach((child, index) => {
            const size = sizes[index]!;
            const childRect = row
                ? { left: offset, top: rect.top, width: size, height: rect.height }
                : { left: rect.left, top: offset, width: rect.width, height: size };
            place(child, childRect, [...path, index]);
            offset += size;
            if (index < count - 1) {
                placement.dividers.push({
                    path,
                    index,
                    direction: node.direction,
                    rect: row
                        ? { left: offset, top: rect.top, width: DIVIDER_SIZE, height: rect.height }
                        : { left: rect.left, top: offset, width: rect.width, height: DIVIDER_SIZE },
                    sizes,
                    mins,
                });
                offset += DIVIDER_SIZE;
            }
        });
    };
    if (root) place(root, { left: 0, top: 0, width: area.width, height: area.height }, []);
    return placement;
}

/** The tree with the weights of the split at `path` replaced. */
export function setWeightsAt(
    node: LayoutNode | null,
    path: readonly number[],
    weights: readonly number[]
): LayoutNode | null {
    if (!node || node.type === 'group') return node;
    if (path.length === 0) {
        return weights.length === node.children.length ? { ...node, weights: [...weights] } : node;
    }
    const [head, ...rest] = path;
    const child = node.children[head!];
    if (!child) return node;
    const next = setWeightsAt(child, rest, weights);
    if (next === child || !next) return node;
    const children = [...node.children];
    children[head!] = next;
    return { ...node, children };
}

/** A tab above the page, with its place and size. */
export interface FloatingTab {
    key: TabKey;
    rect: WindowLayout;
}

/** Everything the device keeps of the layout (spec 036, FR-015). */
export interface LayoutState {
    root: LayoutNode | null;
    /** Tab keys, the most recently used first; the current document's key leads the documents. */
    recent: TabKey[];
    /** A document's own view in its tab (a view id or `tpl:<template id>`). */
    views: Record<string, string>;
    /** The group that has the whole area while the others are hidden. */
    maximized: string | null;
    /** Floating windows, the front one last. */
    floating: FloatingTab[];
    /** Where a tool last floated. */
    lastRect: Record<TabKey, WindowLayout>;
    /** The side a tool was last docked on. */
    lastSide: Record<TabKey, 'left' | 'right'>;
}

export const EMPTY_LAYOUT: LayoutState = {
    root: null,
    recent: [],
    views: {},
    maximized: null,
    floating: [],
    lastRect: {},
    lastSide: {},
};

/** Every open tab key: in the groups in reading order, then the floating windows. */
export function openKeys(state: Pick<LayoutState, 'root' | 'floating'>): TabKey[] {
    return [
        ...groupsInOrder(state.root).flatMap((group) => group.tabs),
        ...state.floating.map(({ key }) => key),
    ];
}

/**
 * The group the reader used last: the one holding the most recent key that is in a group, else
 * the first group.
 */
export function focusedGroup(state: Pick<LayoutState, 'root' | 'recent'>): GroupNode | undefined {
    for (const key of state.recent) {
        const group = groupOf(state.root, key);
        if (group) return group;
    }
    return groupsInOrder(state.root)[0];
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The layout that is true now (spec 036, D2): tabs of deleted documents drop out, the current
 * document has a tab (**Open** takes the place of the last used document of the last used group),
 * its group shows it, and its key leads the documents in `recent`. Pure apart from new group ids;
 * the same object comes back when nothing changes.
 */
export function reconcileLayout(
    state: LayoutState,
    currentId: string | null,
    entryIds: ReadonlySet<string>
): LayoutState {
    const alive = (key: TabKey) => {
        const id = documentIdOf(key);
        return id === null || entryIds.has(id);
    };
    let root = state.root;
    for (const group of groupsInOrder(root)) {
        for (const key of group.tabs) if (!alive(key)) root = removeTab(root, key);
    }
    const floating = state.floating.filter(({ key }) => alive(key));
    if (currentId) {
        const key = docKey(currentId);
        const holder = groupOf(root, key);
        if (holder) {
            if (holder.shown !== key)
                root = placeTab(root, key, holder.id, holder.tabs.indexOf(key));
        } else if (!floating.some((entry) => entry.key === key)) {
            root = openInPlace(root, state.recent, key);
        }
    }
    const open = new Set(openKeys({ root, floating }));
    const currentKey = currentId ? docKey(currentId) : null;
    let recent = state.recent.filter(
        (key, index, list) => open.has(key) && list.indexOf(key) === index
    );
    if (currentKey && open.has(currentKey)) {
        const firstDocument = recent.findIndex((key) => documentIdOf(key) !== null);
        if (recent[firstDocument] !== currentKey) {
            recent = recent.filter((key) => key !== currentKey);
            recent.splice(firstDocument === -1 ? recent.length : firstDocument, 0, currentKey);
        }
    }
    const views = Object.fromEntries(
        Object.entries(state.views).filter(([id]) => open.has(docKey(id)))
    );
    const groups = groupsInOrder(root);
    const currentGroup = currentKey ? groupOf(root, currentKey) : undefined;
    const maximized =
        state.maximized === null || groups.length < 2
            ? null
            : currentGroup && currentGroup.id !== state.maximized && recent[0] === currentKey
              ? currentGroup.id
              : groups.some((group) => group.id === state.maximized)
                ? state.maximized
                : null;
    const next = {
        ...state,
        root,
        recent: sameJson(recent, state.recent) ? state.recent : recent,
        views: sameJson(views, state.views) ? state.views : views,
        floating: floating.length === state.floating.length ? state.floating : floating,
        maximized,
    };
    return next.root === state.root &&
        next.recent === state.recent &&
        next.views === state.views &&
        next.floating === state.floating &&
        next.maximized === state.maximized
        ? state
        : next;
}

/** **Open**: the document takes the place of the last used document of the last used group. */
function openInPlace(root: LayoutNode | null, recent: readonly TabKey[], key: TabKey) {
    if (!root) return makeGroup([key]);
    for (const candidate of recent) {
        if (documentIdOf(candidate) === null) continue;
        const group = groupOf(root, candidate);
        if (!group) continue;
        const tabs = group.tabs.map((tab) => (tab === candidate ? key : tab));
        return normalize(replaceNode(root, group, { ...group, tabs, shown: key }));
    }
    const withDocument = groupsInOrder(root).find((group) =>
        group.tabs.some((tab) => documentIdOf(tab) !== null)
    );
    if (withDocument) {
        const old = withDocument.tabs.find((tab) => documentIdOf(tab) !== null)!;
        const tabs = withDocument.tabs.map((tab) => (tab === old ? key : tab));
        return normalize(replaceNode(root, withDocument, { ...withDocument, tabs, shown: key }));
    }
    // Only tools are open: the document gets a group of its own beside the first one.
    return splitGroup(root, groupsInOrder(root)[0]!.id, 'right', key);
}
