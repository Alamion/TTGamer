// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { openBeside } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { openDocumentIds, resetLayout } from './helpers/panes';

vi.setConfig({ testTimeout: 30_000 });

const current = () => useDocumentStore.getState().currentDocumentId;
const tabs = () => within(screen.getByRole('tablist')).getAllByRole('tab');

/** happy-dom lays nothing out; the area is as wide as a desktop window. */
function stubWidth(width: number) {
    return vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
}

beforeEach(() => {
    stubWidth(1280);
    resetLayout();
    seedDocuments(['Ana', 'Bruno', 'Cleo'], { current: 'Ana' });
    render(createElement(CharacterSheet));
});
afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
});

describe('the tab strip and panes (spec 034, US1)', () => {
    it('has no strip until a second document is opened beside', () => {
        expect(screen.queryByRole('tablist')).toBeNull();
        expect(screen.queryByRole('region', { name: 'Ana' })).toBeNull();
    });

    it('shows one tab and one labelled region per document, the focused one selected', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(tabs()).toHaveLength(2));

        expect(tabs().map((tab) => tab.textContent)).toEqual(['Ana', 'Bruno']);
        expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true']);
        expect(screen.getByRole('tablist').getAttribute('aria-label')).toBe('Open documents');
        for (const name of ['Ana', 'Bruno']) {
            expect(screen.getByRole('region', { name })).toBeTruthy();
        }
        expect(current()).toBe('Bruno');
    });

    it('moves between tabs with the arrow keys, Home, and End', async () => {
        act(() => {
            openBeside('Bruno');
            openBeside('Cleo');
        });
        await waitFor(() => expect(tabs()).toHaveLength(3));

        fireEvent.keyDown(tabs()[2]!, { key: 'ArrowLeft' });
        expect(current()).toBe('Bruno');
        fireEvent.keyDown(tabs()[1]!, { key: 'Home' });
        expect(current()).toBe('Ana');
        fireEvent.keyDown(tabs()[0]!, { key: 'End' });
        expect(current()).toBe('Cleo');
        fireEvent.keyDown(tabs()[2]!, { key: 'ArrowRight' });
        expect(current()).toBe('Ana');
        expect(document.activeElement).toBe(tabs()[0]);
    });

    it('closes a pane from its tab and keeps the document', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(tabs()).toHaveLength(2));

        fireEvent.click(
            within(screen.getByRole('tablist')).getByRole('button', { name: 'Close Bruno' })
        );
        await waitFor(() => expect(screen.queryByRole('tablist')).toBeNull());
        expect(current()).toBe('Ana');
        expect(useDocumentStore.getState().entries.map(({ id }) => id)).toContain('Bruno');
    });

    it('focuses a pane when it is clicked, and every close button has a name', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(tabs()).toHaveLength(2));

        fireEvent.pointerDown(screen.getByRole('region', { name: 'Ana' }));
        expect(current()).toBe('Ana');
        for (const button of screen.getAllByRole('button', { name: /^Close / })) {
            expect(button.getAttribute('aria-label')).toMatch(/^Close (Ana|Bruno)$/);
        }
    });

    it('removes the pane of a document that is deleted, and the strip when one is left', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(tabs()).toHaveLength(2));

        act(() => useDocumentStore.getState().deleteDocument('Ana'));
        await waitFor(() => expect(screen.queryByRole('tablist')).toBeNull());
        expect(openDocumentIds()).toEqual(['Bruno']);
    });

    it('shows a notice in the pane of a document whose record cannot be read', async () => {
        useDocumentStore.setState((state) => ({
            entries: [...state.entries, { ...state.entries[0]!, id: 'Ghost', name: 'Ghost' }],
        }));
        act(() => void openBeside('Ghost'));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe('This document could not be read.');
        expect(takeSheetIssues().length).toBeGreaterThan(0);
        fireEvent.click(
            within(screen.getByRole('tablist')).getByRole('button', { name: 'Close Ghost' })
        );
        await waitFor(() => expect(screen.queryByRole('tablist')).toBeNull());
    });
});
