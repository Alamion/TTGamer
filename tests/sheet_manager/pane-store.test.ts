// @vitest-environment happy-dom
import {
    type GroupNode,
    groupOf,
    groupsInOrder,
    type LayoutNode,
    type LayoutState,
    reconcileLayout,
} from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import {
    closeTab,
    focusTab,
    openBeside,
    openInNewTab,
    toggleMaximized,
    usePaneStore,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';

const names = 'abcdefghijklmnop'.split('');
const current = () => useDocumentStore.getState().currentDocumentId;
const layout = () => usePaneStore.getState();
const tabsByGroup = (root = layout().root) => groupsInOrder(root).map((group) => group.tabs);
const g = (id: string, tabs: string[], shown = tabs[0]!): GroupNode => ({
    type: 'group',
    id,
    tabs,
    shown,
});
const row = (...children: LayoutNode[]): LayoutNode => ({
    type: 'split',
    direction: 'row',
    children,
    weights: children.map(() => 1),
});
const state = (extra: Partial<LayoutState>): LayoutState => ({
    root: null,
    recent: [],
    views: {},
    maximized: null,
    floating: [],
    lastRect: {},
    lastSide: {},
    ...extra,
});
const entryIds = (list: readonly string[] = names) => new Set(list);

beforeEach(() => {
    resetDocuments();
    usePaneStore.setState(state({}));
    seedDocuments(names, { current: 'a' });
});

describe('the layout that is true now (spec 036, D2)', () => {
    it('shows the current document alone when nothing was arranged', () => {
        const next = reconcileLayout(state({}), 'a', entryIds());
        expect(tabsByGroup(next.root)).toEqual([['d:a']]);
        expect(next.recent).toEqual(['d:a']);
    });

    it('lets Open take the place of the last used document of the last used group', () => {
        const before = state({
            root: row(g('A', ['d:a', 'd:x', 't:dice'], 't:dice'), g('B', ['d:b'])),
            recent: ['t:dice', 'd:b', 'd:a'],
        });
        const next = reconcileLayout(before, 'c', entryIds([...names, 'x']));
        expect(tabsByGroup(next.root)).toEqual([['d:a', 'd:x', 't:dice'], ['d:c']]);
        expect(next.recent).toEqual(['t:dice', 'd:c', 'd:a']);
    });

    it('never puts an opened document in place of a floating one', () => {
        const before = state({
            root: g('A', ['d:a']),
            floating: [{ key: 'd:b', rect: { x: 0, y: 0, width: 400, height: 300 } }],
            recent: ['d:b', 'd:a'],
        });
        const next = reconcileLayout(before, 'c', entryIds());
        expect(tabsByGroup(next.root)).toEqual([['d:c']]);
        expect(next.floating.map(({ key }) => key)).toEqual(['d:b']);
    });

    it('shows the current document in its group and puts it first among the documents', () => {
        const before = state({ root: g('A', ['d:a', 'd:b'], 'd:a'), recent: ['d:a', 'd:b'] });
        const next = reconcileLayout(before, 'b', entryIds());
        expect((next.root as GroupNode).shown).toBe('d:b');
        expect(next.recent).toEqual(['d:b', 'd:a']);
    });

    it('corrects a stale order of use instead of trusting it', () => {
        const before = state({ root: row(g('A', ['d:a']), g('B', ['d:b'])), recent: ['d:a'] });
        expect(reconcileLayout(before, 'b', entryIds()).recent).toEqual(['d:b', 'd:a']);
    });

    it('drops deleted documents and their emptied groups, and is unchanged when true', () => {
        const before = state({
            root: row(g('A', ['d:a']), g('B', ['d:b']), g('C', ['d:c'])),
            recent: ['d:a', 'd:b', 'd:c'],
            views: { b: 'brief', c: 'brief' },
        });
        const next = reconcileLayout(before, 'a', entryIds(['a', 'c']));
        expect(tabsByGroup(next.root)).toEqual([['d:a'], ['d:c']]);
        expect(next.views).toEqual({ c: 'brief' });
        expect(reconcileLayout(before, 'a', entryIds())).toBe(before);
    });

    it('lets the maximized group follow the current document and gives it up when it goes', () => {
        const before = state({
            root: row(g('A', ['d:a']), g('B', ['d:b']), g('C', ['d:c'])),
            recent: ['d:c', 'd:b', 'd:a'],
            maximized: 'B',
        });
        expect(reconcileLayout(before, 'c', entryIds()).maximized).toBe('C');
        expect(reconcileLayout(before, 'a', entryIds(['a'])).maximized).toBeNull();
    });
});

describe('opening documents', () => {
    it('beside: a new group right of the last used one, in its brief, made current', () => {
        openBeside('c');
        openBeside('b');
        expect(tabsByGroup()).toEqual([['d:a'], ['d:c'], ['d:b']]);
        expect(current()).toBe('b');
        expect(layout().views.b).toBeDefined();
    });

    it('focuses the tab that already holds the document instead of adding another', () => {
        openBeside('b');
        openBeside('a');
        expect(tabsByGroup()).toEqual([['d:a'], ['d:b']]);
        expect(current()).toBe('a');
    });

    it('beside at six groups adds a tab and says so', () => {
        for (const id of ['b', 'c', 'd', 'e', 'f']) openBeside(id);
        expect(groupsInOrder(layout().root)).toHaveLength(6);
        expect(openBeside('g')).toEqual({ closed: null, asTab: true });
        expect(groupsInOrder(layout().root)).toHaveLength(6);
        expect(groupOf(layout().root, 'd:g')?.tabs).toEqual(['d:f', 'd:g']);
    });

    it('in a new tab: after the shown tab of the last used group, made current', () => {
        openInNewTab('b');
        focusTab('d:a');
        openInNewTab('c');
        expect(tabsByGroup()).toEqual([['d:a', 'd:c', 'd:b']]);
        expect(current()).toBe('c');
    });

    it('a 13th document closes the least recently used tab that is not shown', () => {
        for (const id of names.slice(1, 12)) openInNewTab(id);
        expect(tabsByGroup()[0]).toHaveLength(12);
        expect(openInNewTab('m')).toEqual({ closed: 'a', asTab: false });
        expect(tabsByGroup()[0]).toHaveLength(12);
        expect(tabsByGroup()[0]).not.toContain('d:a');
    });
});

describe('closing and focusing tabs', () => {
    it('keeps the document, shows the neighbour, and makes it current', () => {
        openBeside('b');
        openInNewTab('c');
        closeTab('d:c');
        expect(tabsByGroup()).toEqual([['d:a'], ['d:b']]);
        expect(current()).toBe('b');
        expect(useDocumentStore.getState().entries.some(({ id }) => id === 'c')).toBe(true);
    });

    it('closing a tab that is not current leaves the focus where it was', () => {
        openBeside('b');
        closeTab('d:a');
        expect(tabsByGroup()).toEqual([['d:b']]);
        expect(current()).toBe('b');
    });

    it('does not close the last open document', () => {
        usePaneStore.setState(state({ root: g('A', ['d:a']), recent: ['d:a'] }));
        closeTab('d:a');
        expect(tabsByGroup()).toEqual([['d:a']]);
    });

    it('focusing a tab makes its document current', () => {
        openBeside('b');
        focusTab('d:a');
        expect(current()).toBe('a');
        expect(layout().recent[0]).toBe('d:a');
    });
});

describe('giving a group the whole area (spec 034, FR-018)', () => {
    it('toggles, and is not offered with one group', () => {
        openBeside('b');
        const groupB = groupOf(layout().root, 'd:b')!.id;
        toggleMaximized(groupB);
        expect(layout().maximized).toBe(groupB);
        toggleMaximized(groupB);
        expect(layout().maximized).toBeNull();
        closeTab('d:b');
        toggleMaximized(groupsInOrder(layout().root)[0]!.id);
        expect(layout().maximized).toBeNull();
    });

    it('opening beside gives the area back', () => {
        openBeside('b');
        toggleMaximized(groupOf(layout().root, 'd:b')!.id);
        openBeside('c');
        expect(layout().maximized).toBeNull();
    });
});
