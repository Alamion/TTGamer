// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { usePaneStore } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import {
    PANES_STORAGE_KEY,
    readArrangement,
} from '@site/src/sheet_manager/features/sheet/panes/types';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { resetDocuments, seedDocuments } from './helpers/documentsWindow';

vi.setConfig({ testTimeout: 30_000 });

const arrangement = (extra = {}) => ({
    ids: ['Ana', 'Bruno', 'Cleo'],
    recent: ['Bruno', 'Ana', 'Cleo'],
    weights: { Ana: 1.5, Bruno: 0.75, Cleo: 0.75 },
    views: { Bruno: 'v5-hunter-brief' },
    maximized: null,
    ...extra,
});
const stored = () => JSON.parse(localStorage.getItem(PANES_STORAGE_KEY) ?? 'null');
const tabs = () => screen.queryAllByRole('tab').map((tab) => tab.textContent);

beforeEach(() => {
    localStorage.clear();
    usePaneStore.setState({ ids: [], recent: [], weights: {}, views: {}, maximized: null });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
});
afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
    localStorage.clear();
});

describe('the stored arrangement (spec 034, FR-012)', () => {
    it('is kept on the device as the panes change', () => {
        usePaneStore.setState(arrangement());
        expect(stored().state).toEqual(arrangement());
        expect(stored().version).toBe(1);
    });

    it('is read back whole after a reload', async () => {
        localStorage.setItem(
            PANES_STORAGE_KEY,
            JSON.stringify({ state: arrangement({ maximized: 'Ana' }), version: 1 })
        );
        await usePaneStore.persist.rehydrate();
        expect(usePaneStore.getState()).toMatchObject(arrangement({ maximized: 'Ana' }));
    });

    it('makes a damaged value safe, and reports one that is not an arrangement', async () => {
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

        localStorage.setItem(PANES_STORAGE_KEY, JSON.stringify({ state: { ids: 7 }, version: 1 }));
        await usePaneStore.persist.rehydrate();
        expect(usePaneStore.getState().ids).toEqual([]);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['pane-arrangement-invalid']);

        localStorage.setItem(PANES_STORAGE_KEY, '{not json');
        await usePaneStore.persist.rehydrate();
        expect(usePaneStore.getState().ids).toEqual([]);
        takeSheetIssues();
    });
});

describe('the sheet restores the panes', () => {
    it('shows the stored documents again, with their views and weights', async () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo'], { current: 'Bruno' });
        usePaneStore.setState(arrangement());
        render(createElement(CharacterSheet));

        await waitFor(() => expect(tabs()).toEqual(['Ana', 'Bruno', 'Cleo']));
        expect(screen.getAllByRole('region')).toHaveLength(3);
        expect(usePaneStore.getState().views).toEqual({ Bruno: 'v5-hunter-brief' });
        expect(useDocumentStore.getState().currentDocumentId).toBe('Bruno');
    });

    it('drops a document that no longer exists without an error', async () => {
        seedDocuments(['Ana', 'Bruno'], { current: 'Ana' });
        usePaneStore.setState(arrangement({ ids: ['Ana', 'Gone', 'Bruno'], recent: ['Gone'] }));
        render(createElement(CharacterSheet));

        await waitFor(() => expect(tabs()).toEqual(['Ana', 'Bruno']));
        expect(usePaneStore.getState().ids).toEqual(['Ana', 'Bruno']);
        expect(usePaneStore.getState().weights).not.toHaveProperty('Gone');
    });

    it('makes the current document a pane when the stored panes lack it', async () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo'], { current: 'Cleo' });
        usePaneStore.setState(
            arrangement({ ids: ['Ana', 'Bruno'], recent: ['Bruno', 'Ana'], weights: {}, views: {} })
        );
        render(createElement(CharacterSheet));

        await waitFor(() => expect(tabs()).toEqual(['Ana', 'Cleo']));
    });

    it('shows the current document alone when nothing is stored', () => {
        seedDocuments(['Ana', 'Bruno'], { current: 'Ana' });
        render(createElement(CharacterSheet));
        expect(screen.queryByRole('tablist')).toBeNull();
        expect(useDocumentStore.getState().currentDocumentId).toBe('Ana');
        act(() => undefined);
    });
});
