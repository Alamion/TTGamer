// @vitest-environment happy-dom
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openWindow, resetDocuments, seedDocuments } from './helpers/documentsWindow';

vi.setConfig({ testTimeout: 20_000 });

const row = (name: string) => screen.getByRole('treeitem', { name: new RegExp(`^${name}`) });

describe('selecting documents with a finger (spec 032, FR-025 on a phone)', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.useFakeTimers();
        window.matchMedia = ((query: string) => ({
            matches: query.includes('coarse') || query.includes('767'),
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
        cleanup();
        resetDocuments();
        vi.useRealTimers();
    });

    it('holds to start, taps to add, deletes from the bar, and stops with the icon', () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo']);
        openWindow();
        const press = new Event('pointerdown', { bubbles: true });
        Object.assign(press, { pointerType: 'touch', clientX: 0, clientY: 0 });
        fireEvent(row('Ana'), press);
        act(() => vi.advanceTimersByTime(600));
        fireEvent.click(row('Ana'));
        fireEvent.click(row('Cleo'));
        // Nothing opened, and the bar counts the rows.
        expect(useDocumentStore.getState().currentDocumentId).toBeNull();
        expect(screen.getAllByText('2 items selected').length).toBeGreaterThan(0);
        expect(row('Ana').getAttribute('draggable')).toBe('false');

        fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
        const dialog = screen.getAllByRole('dialog').at(-1)!;
        expect(dialog.textContent).toContain('Delete 2 documents?');
        fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!);

        fireEvent.click(screen.getByRole('button', { name: 'Stop selecting' }));
        expect(screen.queryByRole('button', { name: 'Stop selecting' })).toBeNull();
        // A tap opens again.
        fireEvent.click(row('Bruno'));
        expect(useDocumentStore.getState().currentDocumentId).toBe('Bruno');
    });
});
