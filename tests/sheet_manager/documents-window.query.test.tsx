// @vitest-environment happy-dom
import { useSessionStorageState } from '@site/src/shared/hooks/useSessionStorageState';
import { EMPTY_QUERY } from '@site/src/sheet_manager/features/documents/query';
import {
    act,
    cleanup,
    createEvent,
    fireEvent,
    renderHook,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { folder, openWindow, resetDocuments, seedDocuments } from './helpers/documentsWindow';

vi.setConfig({ testTimeout: 20_000 });

const rowNames = () =>
    screen
        .queryAllByRole('treeitem')
        .map((item) => item.querySelector('span.truncate')?.textContent);
const search = () => screen.getByRole('searchbox', { name: 'Search names' });
const type = (text: string) => fireEvent.change(search(), { target: { value: text } });

/** The kept query lives in session storage and a module cache; start each test from nothing. */
function resetQuery() {
    const hook = renderHook(() => useSessionStorageState<unknown>('documents-window-query', null));
    act(() => hook.result.current[1](EMPTY_QUERY));
    hook.unmount();
}

describe('search, filters, and sort in the documents window (spec 032, US3)', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        resetQuery();
        window.matchMedia = ((query: string) => ({
            matches: false,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        })) as unknown as typeof window.matchMedia;
        seedDocuments(['Ana', 'Bruno', 'Cleo', 'Zed'], {
            folders: [folder('f1', 'Campaign'), folder('f2', 'Archive', 'f1', 2)],
            placed: { Bruno: 'f1', Zed: 'f2' },
        });
    });
    afterEach(() => {
        cleanup();
        resetDocuments();
        resetQuery();
    });

    it('shows matches with the folders above them open, marks them, and counts them', async () => {
        openWindow();
        type('zed');
        await waitFor(() => expect(rowNames()).toEqual(['Campaign', 'Archive', 'Zed']));
        const zed = screen.getByRole('treeitem', { name: /Zed/ });
        expect(zed.querySelector('mark')?.textContent).toBe('Zed');
        expect(
            screen.getByRole('treeitem', { name: /Campaign/ }).getAttribute('aria-expanded')
        ).toBe('true');
        expect(screen.getByText('Showing 1 of 4')).toBeTruthy();
    });

    it('says nothing matches and clears search and filters in one action', async () => {
        openWindow();
        type('nothing like it');
        await waitFor(() =>
            expect(screen.getByText('Nothing matches the search and filters.')).toBeTruthy()
        );
        expect(screen.queryByRole('tree')).toBeNull();
        fireEvent.click(screen.getAllByRole('button', { name: 'Clear search and filters' })[0]!);
        await waitFor(() => expect(rowNames()).toContain('Ana'));
        expect((search() as HTMLInputElement).value).toBe('');
    });

    it('filters by type with a visible chip that clears one filter at a time', () => {
        openWindow();
        const toggle = screen.getByRole('button', { name: 'Filters and sort' });
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
        expect(panel.classList.contains('hidden')).toBe(true);
        fireEvent.click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(panel.classList.contains('hidden')).toBe(false);
        fireEvent.change(screen.getByLabelText('Created'), { target: { value: 'unknown' } });
        fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'character' } });
        const chip = screen.getByRole('button', { name: 'Remove filter: Type: Character' });
        expect(
            screen.getByRole('button', { name: 'Remove filter: Created: Unknown' })
        ).toBeTruthy();
        fireEvent.click(chip);
        expect(screen.queryByRole('button', { name: /Remove filter: Type/ })).toBeNull();
        expect(screen.getByRole('button', { name: /Remove filter: Created/ })).toBeTruthy();
        // No document has a known time here, so "unknown" keeps them all.
        expect(rowNames()).toContain('Ana');
        fireEvent.change(screen.getByLabelText('Created'), { target: { value: 'day' } });
        expect(screen.queryByRole('tree')).toBeNull();
    });

    it('sorts by name in both directions, folders first, and returns to the manual order', () => {
        openWindow();
        fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name' } });
        fireEvent.click(screen.getByRole('button', { name: 'Descending order' }));
        expect(rowNames()).toEqual(['Campaign', 'Cleo', 'Ana']);
        fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'manual' } });
        expect(rowNames()[0]).toBe('Campaign');
        expect(rowNames()).toEqual(['Campaign', 'Ana', 'Cleo']);
    });

    it('is kept when the window closes and opens again in the same visit, and cleared by one action', async () => {
        const first = openWindow();
        type('ana');
        await waitFor(() => expect(rowNames()).toEqual(['Ana']));
        first.unmount();
        openWindow();
        expect((search() as HTMLInputElement).value).toBe('ana');
        expect(rowNames()).toEqual(['Ana']);
        fireEvent.click(screen.getAllByRole('button', { name: 'Clear search and filters' })[0]!);
        await waitFor(() => expect(rowNames()).toContain('Cleo'));
    });

    it('creates a folder in plain view even when a search would hide it', async () => {
        openWindow();
        type('ana');
        await waitFor(() => expect(rowNames()).toEqual(['Ana']));
        fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
        expect(
            within(screen.getByRole('tree')).getByRole('textbox', { name: 'Name' })
        ).toBeTruthy();
    });

    it('refuses to reorder in a sorted view and says to switch to manual order', () => {
        openWindow();
        fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name' } });
        const transfer = { setData: () => undefined, effectAllowed: '', dropEffect: '' };
        const target = screen.getByRole('treeitem', { name: /Ana/ });
        target.getBoundingClientRect = () => ({ top: 0, height: 40 }) as DOMRect;
        fireEvent.dragStart(screen.getByRole('treeitem', { name: /Cleo/ }), {
            dataTransfer: transfer,
        });
        const over = createEvent.dragOver(target, { dataTransfer: transfer });
        Object.defineProperty(over, 'clientY', { value: 4 });
        fireEvent(target, over);
        expect(screen.getByRole('alert').textContent).toContain('Switch to manual order');
    });
});
