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
import {
    dockFloating,
    floatTab,
    openTool,
    raise,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { resetLayout, roomyArea } from './helpers/panes';

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
    resetLayout();
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

    it('keeps a tool shown that the reader chose over the current document in its group', () => {
        const before = state({
            root: g('A', ['d:a', 'd:b', 't:library'], 't:library'),
            recent: ['t:library', 'd:a', 'd:b'],
        });
        expect(reconcileLayout(before, 'a', entryIds())).toBe(before);
        // A document made current elsewhere is still shown.
        expect((reconcileLayout(before, 'b', entryIds()).root as GroupNode).shown).toBe('d:b');
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
        roomyArea();
        for (const id of ['b', 'c', 'd', 'e', 'f']) openBeside(id);
        expect(groupsInOrder(layout().root)).toHaveLength(6);
        expect(openBeside('g')).toEqual({ closed: null, asTab: true });
        expect(groupsInOrder(layout().root)).toHaveLength(6);
        expect(groupOf(layout().root, 'd:g')?.tabs).toEqual(['d:f', 'd:g']);
    });

    it('beside adds a tab when another group would not keep its minimum in the area', () => {
        roomyArea(1280, 800);
        for (const id of ['b', 'c']) openBeside(id);
        expect(groupsInOrder(layout().root)).toHaveLength(3);
        expect(openBeside('d')).toEqual({ closed: null, asTab: true });
        expect(tabsByGroup()).toEqual([['d:a'], ['d:b'], ['d:c', 'd:d']]);
    });

    it('beside on a phone still makes a group: the narrow view shows one document anyway', () => {
        roomyArea(375, 700);
        for (const id of ['b', 'c', 'd']) openBeside(id);
        expect(groupsInOrder(layout().root)).toHaveLength(4);
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

describe('tools and floating windows (spec 036, US3)', () => {
    const keysOf = () => tabsByGroup();
    const floatingKeys = () => layout().floating.map(({ key }) => key);

    it('opens the documents and the library together on the left, the dice on the right', () => {
        roomyArea(1920, 1000);
        openTool('documents');
        openTool('library');
        openTool('dice');
        expect(keysOf()).toEqual([['t:documents', 't:library'], ['d:a'], ['t:dice']]);
        expect(layout().lastSide).toEqual({
            't:documents': 'left',
            't:library': 'left',
            't:dice': 'right',
        });
        expect(current()).toBe('a');
    });

    it('shows a tool that is open instead of adding it again, and keeps it in one place', () => {
        openTool('dice');
        focusTab('d:a');
        openTool('dice');
        expect(
            keysOf()
                .flat()
                .filter((key) => key === 't:dice')
        ).toHaveLength(1);
        expect(layout().recent[0]).toBe('t:dice');
        expect(layout().shownTool).toBe('t:dice');
    });

    it('opens documents in the group of the last used document, never in a tool’s', () => {
        roomyArea(1920, 1000);
        openTool('dice');
        expect(layout().recent[0]).toBe('t:dice');
        openInNewTab('b');
        expect(keysOf()).toEqual([['d:a', 'd:b'], ['t:dice']]);
        openBeside('c');
        expect(keysOf()).toEqual([['d:a', 'd:b'], ['d:c'], ['t:dice']]);
    });

    it('opens a tool on the side it was last on', () => {
        roomyArea(1920, 1000);
        openTool('dice');
        closeTab('t:dice');
        usePaneStore.setState({ lastSide: { 't:dice': 'left' } });
        openTool('dice');
        expect(keysOf()).toEqual([['t:dice'], ['d:a']]);
    });

    it('never refuses a tool: at six groups it joins the outermost group of its side', () => {
        roomyArea();
        for (const id of ['b', 'c', 'd', 'e', 'f']) openBeside(id);
        openTool('documents');
        expect(groupsInOrder(layout().root)).toHaveLength(6);
        expect(keysOf()[0]).toEqual(['d:a', 't:documents']);
    });

    it('floats a tab, at most four, and docks it back where it belongs', () => {
        roomyArea(1920, 1000);
        openTool('dice');
        for (const id of ['b', 'c', 'd']) openInNewTab(id);
        expect(floatTab('t:dice')).toBe(true);
        expect(floatingKeys()).toEqual(['t:dice']);
        expect(keysOf().flat()).not.toContain('t:dice');
        for (const key of ['d:b', 'd:c', 'd:d']) expect(floatTab(key)).toBe(true);
        expect(floatTab('d:a')).toBe(false);
        expect(floatingKeys()).toHaveLength(4);

        raise('t:dice');
        expect(floatingKeys().at(-1)).toBe('t:dice');
        raise('d:b');
        expect(current()).toBe('b');

        dockFloating('t:dice');
        expect(keysOf().at(-1)).toEqual(['t:dice']);
        dockFloating('d:c', {
            kind: 'edge',
            groupId: groupsInOrder(layout().root)[0]!.id,
            side: 'bottom',
        });
        expect(keysOf()).toContainEqual(['d:c']);
        expect(current()).toBe('c');
    });

    it('closes a tool with its tab; a 13th document never closes a floating one', () => {
        roomyArea(1920, 1000);
        for (const id of names.slice(1, 12)) openInNewTab(id);
        expect(floatTab('d:a')).toBe(true);
        focusTab('d:l');
        expect(openInNewTab('m').closed).not.toBe('a');
        expect(floatingKeys()).toEqual(['d:a']);
    });
});

describe('the documents window of spec 032 carries its place over', () => {
    it('floats where it was, once, and its old key goes', () => {
        localStorage.setItem(
            'window-layout:documents',
            JSON.stringify({ x: 300, y: 90, width: 760, height: 600 })
        );
        openTool('documents');
        expect(floatTab('t:documents')).toBe(true);
        expect(layout().floating[0]!.rect).toEqual({ x: 300, y: 90, width: 760, height: 600 });
        expect(localStorage.getItem('window-layout:documents')).toBeNull();
    });
});
