// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import {
    groupsInOrder,
    type LayoutState,
    type SplitNode,
} from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import { usePaneStore } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import {
    PANES_STORAGE_KEY,
    PANES_V1_STORAGE_KEY,
    readArrangement,
    readLayout,
} from '@site/src/sheet_manager/features/sheet/panes/types';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { openDocumentIds, resetLayout } from './helpers/panes';

vi.setConfig({ testTimeout: 30_000 });

const group = (id: string, tabs: string[]) => ({
    type: 'group' as const,
    id,
    tabs,
    shown: tabs[0]!,
});
const layout = (extra: Partial<LayoutState> = {}): LayoutState => ({
    root: {
        type: 'split',
        direction: 'row',
        children: [group('A', ['d:Ana']), group('B', ['d:Bruno']), group('C', ['d:Cleo'])],
        weights: [1.5, 0.75, 0.75],
    },
    recent: ['d:Bruno', 'd:Ana', 'd:Cleo'],
    views: { Bruno: 'v5-hunter-brief' },
    maximized: null,
    floating: [],
    lastRect: {},
    lastSide: {},
    ...extra,
});
const v1 = {
    ids: ['Ana', 'Bruno', 'Cleo'],
    recent: ['Bruno', 'Ana', 'Cleo'],
    weights: { Ana: 1.5, Bruno: 0.75, Cleo: 0.75 },
    views: { Bruno: 'v5-hunter-brief' },
    maximized: 'Cleo',
};
const stored = () => JSON.parse(localStorage.getItem(PANES_STORAGE_KEY) ?? 'null');
const tabs = () => screen.queryAllByRole('tab').map((tab) => tab.textContent);

beforeEach(() => {
    localStorage.clear();
    resetLayout();
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
});
afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
    localStorage.clear();
});

describe('the stored layout (spec 036, FR-015)', () => {
    it('is kept on the device as it changes, under version 2', () => {
        usePaneStore.setState(layout());
        expect(stored().state).toEqual(layout());
        expect(stored().version).toBe(2);
    });

    it('is read back whole after a reload', async () => {
        localStorage.setItem(
            PANES_STORAGE_KEY,
            JSON.stringify({ state: layout({ maximized: 'A' }), version: 2 })
        );
        await usePaneStore.persist.rehydrate();
        expect(usePaneStore.getState()).toMatchObject(layout({ maximized: 'A' }));
        expect(takeSheetIssues()).toEqual([]);
    });

    it('drops what it cannot keep and says what went', () => {
        const read = readLayout(
            layout({
                root: {
                    type: 'split',
                    direction: 'row',
                    children: [
                        group('A', [
                            'd:a',
                            'd:a',
                            'x:b',
                            ...'cdefghijklmn'.split('').map((c) => `d:${c}`),
                        ]),
                        group('A', ['d:z', 't:dice']),
                    ],
                    weights: [1],
                },
                recent: ['d:a', 'd:gone'],
                maximized: 'zzz',
                floating: [
                    { key: 't:dice', rect: { x: 0, y: 0, width: 300, height: 300 } },
                    { key: 't:library', rect: { x: 0, y: 0, width: 0, height: 300 } },
                ],
                lastRect: { 'd:a': { x: 0, y: 0, width: 300, height: 300 } },
            })
        )!;
        const groups = groupsInOrder(read.layout.root);
        expect(groups[0]!.tabs).toHaveLength(12);
        expect(groups[1]!.tabs).toEqual(['t:dice']);
        expect(groups[1]!.id).not.toBe('A');
        expect((read.layout.root as SplitNode).weights).toEqual([1, 1]);
        expect(read.layout.recent).toEqual(['d:a']);
        expect(read.layout.maximized).toBeNull();
        expect(read.layout.floating).toEqual([]);
        expect(read.layout.lastRect).toEqual({});
        expect(read.dropped).toEqual([
            'repeated tab d:a',
            'unknown tab x:b',
            'document past 12: d:n',
            'document past 12: d:z',
            'repeated tab t:dice',
            'floating window without a place: t:library',
        ]);
    });

    it('reports a value that is not a layout once, and one with dropped parts once', async () => {
        localStorage.setItem(PANES_STORAGE_KEY, JSON.stringify({ state: { root: 7 }, version: 2 }));
        await usePaneStore.persist.rehydrate();
        expect(usePaneStore.getState().root).toBeNull();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['pane-arrangement-invalid']);

        localStorage.setItem(
            PANES_STORAGE_KEY,
            JSON.stringify({
                state: layout({ recent: [], root: group('A', ['d:a', 'd:a']) }),
                version: 2,
            })
        );
        await usePaneStore.persist.rehydrate();
        expect(openDocumentIds()).toEqual(['a']);
        expect(takeSheetIssues().map(({ message }) => message)).toEqual([
            'Parts of the stored layout were dropped: repeated tab d:a',
        ]);

        localStorage.setItem(PANES_STORAGE_KEY, '{not json');
        await usePaneStore.persist.rehydrate();
        takeSheetIssues();
    });
});

describe('the spec 034 panes carry over (FR-015)', () => {
    it('as one row of one-tab groups with the same order, weights, views, and maximized pane', async () => {
        localStorage.removeItem(PANES_STORAGE_KEY);
        localStorage.setItem(PANES_V1_STORAGE_KEY, JSON.stringify({ state: v1, version: 1 }));
        await usePaneStore.persist.rehydrate();
        const state = usePaneStore.getState();
        const root = state.root as SplitNode;
        expect(groupsInOrder(root).map((g) => g.tabs)).toEqual([
            ['d:Ana'],
            ['d:Bruno'],
            ['d:Cleo'],
        ]);
        expect(root.weights).toEqual([1.5, 0.75, 0.75]);
        expect(state.views).toEqual({ Bruno: 'v5-hunter-brief' });
        expect(state.recent).toEqual(['d:Bruno', 'd:Ana', 'd:Cleo']);
        expect(state.maximized).toBe(groupsInOrder(root)[2]!.id);
        expect(localStorage.getItem(PANES_V1_STORAGE_KEY)).toBeNull();
        expect(takeSheetIssues()).toEqual([]);
    });

    it('reports an unreadable old value once and removes it', async () => {
        localStorage.removeItem(PANES_STORAGE_KEY);
        localStorage.setItem(PANES_V1_STORAGE_KEY, JSON.stringify({ state: { ids: 3 } }));
        await usePaneStore.persist.rehydrate();
        expect(usePaneStore.getState().root).toBeNull();
        expect(localStorage.getItem(PANES_V1_STORAGE_KEY)).toBeNull();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['pane-arrangement-invalid']);
    });

    it('still reads a damaged old value safely', () => {
        expect(
            readArrangement({
                ids: ['a', 'a', 'b', 'c', 'd', 'e', 'f', 'g'],
                recent: ['b', 'zzz', 'b'],
                weights: { a: 2, b: -1, zzz: 3 },
                views: { a: 'brief', b: '' },
                maximized: 'zzz',
            })
        ).toEqual({
            ids: ['a', 'b', 'c', 'd', 'e', 'f'],
            recent: ['b'],
            weights: { a: 2 },
            views: { a: 'brief' },
            maximized: null,
        });
    });
});

describe('the sheet restores the layout', () => {
    it('shows the stored documents again, with their views', async () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo'], { current: 'Bruno' });
        usePaneStore.setState(layout());
        render(createElement(CharacterSheet));

        await waitFor(() => expect(tabs()).toEqual(['Ana', 'Bruno', 'Cleo']));
        expect(screen.getAllByRole('region')).toHaveLength(3);
        expect(usePaneStore.getState().views).toEqual({ Bruno: 'v5-hunter-brief' });
        expect(useDocumentStore.getState().currentDocumentId).toBe('Bruno');
    });

    it('drops a document that no longer exists without an error', async () => {
        seedDocuments(['Ana', 'Bruno'], { current: 'Ana' });
        usePaneStore.setState(layout());
        render(createElement(CharacterSheet));

        await waitFor(() => expect(tabs()).toEqual(['Ana', 'Bruno']));
        expect(openDocumentIds()).toEqual(['Ana', 'Bruno']);
        expect(takeSheetIssues()).toEqual([]);
    });

    it('opens the current document in place of the last used one when the layout lacks it', async () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo', 'Dora'], { current: 'Dora' });
        usePaneStore.setState(layout());
        render(createElement(CharacterSheet));

        await waitFor(() => expect(tabs()).toEqual(['Ana', 'Dora', 'Cleo']));
    });

    it('shows the current document alone when nothing is stored', () => {
        seedDocuments(['Ana', 'Bruno'], { current: 'Ana' });
        render(createElement(CharacterSheet));
        expect(screen.queryByRole('tablist')).toBeNull();
        expect(useDocumentStore.getState().currentDocumentId).toBe('Ana');
        act(() => undefined);
    });
});
