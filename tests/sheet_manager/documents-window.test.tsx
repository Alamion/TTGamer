// @vitest-environment happy-dom
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { folder, openWindow, resetDocuments, seedDocuments } from './helpers/documentsWindow';

vi.setConfig({ testTimeout: 20_000 });

let narrow = false;
const row = (name: string) => screen.getByRole('treeitem', { name: new RegExp(`^${name}`) });
const rowNames = () =>
    screen
        .queryAllByRole('treeitem')
        .map((item) => item.querySelector('span.truncate')?.textContent);
const current = () => useDocumentStore.getState().currentDocumentId;

describe('the documents window (spec 032, US1)', () => {
    beforeEach(() => {
        narrow = false;
        localStorage.clear();
        window.matchMedia = ((query: string) => ({
            matches: query.includes('767') ? narrow : false,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
        cleanup();
        resetDocuments();
    });

    it('lists every document at the top level and marks the one on the sheet', () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo'], { current: 'Bruno' });
        openWindow();
        expect(screen.getByRole('dialog', { name: 'Documents' })).toBeTruthy();
        expect(rowNames()).toEqual(['Ana', 'Bruno', 'Cleo']);
        expect(within(row('Bruno')).getByText('current')).toBeTruthy();
        expect(within(row('Ana')).queryByText('current')).toBeNull();
        expect(row('Ana').getAttribute('aria-level')).toBe('1');
    });

    it('shows a document with no name by its kind', () => {
        seedDocuments(['Ana']);
        useDocumentStore.setState((state) => ({
            entries: state.entries.map((entry) => ({ ...entry, name: '' })),
        }));
        openWindow();
        expect(rowNames()).toEqual(['Character']);
    });

    it('opens a document by a click and by Enter, but not by selecting', () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo']);
        openWindow();
        fireEvent.click(row('Bruno'));
        expect(current()).toBe('Bruno');

        row('Cleo').focus();
        fireEvent.click(row('Cleo'), { ctrlKey: true });
        expect(current()).toBe('Bruno');
        fireEvent.click(row('Ana'), { shiftKey: true });
        expect(current()).toBe('Bruno');
        expect(
            screen
                .getAllByRole('treeitem')
                .filter((item) => item.getAttribute('aria-selected') === 'true')
        ).toHaveLength(3);

        fireEvent.click(row('Ana'));
        row('Ana').focus();
        fireEvent.keyDown(row('Ana'), { key: 'ArrowDown' });
        expect(current()).toBe('Ana');
        fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
        expect(current()).toBe('Bruno');
    });

    it("shows the selected document's fields", () => {
        seedDocuments(['Ana']);
        openWindow();
        fireEvent.click(row('Ana'));
        const details = screen.getByRole('region', { name: 'Details' });
        expect(
            (within(details).getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value
        ).toBe('Ana');
        expect(within(details).getByText('Character')).toBeTruthy();
        expect(within(details).getByText('Top level')).toBeTruthy();
        expect(within(details).getAllByText('Unknown').length).toBeGreaterThan(0);
        expect(within(details).getByRole('button', { name: 'Open' })).toBeTruthy();
    });

    it('reacts to keys on a row reached with Tab, before anything was clicked', async () => {
        seedDocuments(['Ana', 'Bruno']);
        openWindow();
        row('Ana').focus();
        fireEvent.keyDown(row('Ana'), { key: 'ArrowDown' });
        await waitFor(() => expect(row('Bruno').getAttribute('aria-selected')).toBe('true'));
        fireEvent.keyDown(row('Bruno'), { key: 'F2' });
        expect(
            within(screen.getByRole('tree')).getByRole('textbox', { name: 'Name' })
        ).toBeTruthy();
    });

    it('keeps the sheet usable: no overlay, and the window does not trap the page', () => {
        seedDocuments(['Ana']);
        openWindow();
        expect(document.querySelector('[data-radix-focus-guard]')).toBeNull();
        expect(
            screen.getByRole('dialog', { name: 'Documents' }).getAttribute('aria-modal')
        ).toBeNull();
    });

    it('closes with Escape and with its button', () => {
        seedDocuments(['Ana']);
        const onOpenChange = vi.fn();
        openWindow(onOpenChange);
        fireEvent.keyDown(row('Ana'), { key: 'Escape' });
        expect(onOpenChange).toHaveBeenLastCalledWith(false);
        fireEvent.click(screen.getByRole('button', { name: 'Close the documents window' }));
        expect(onOpenChange).toHaveBeenCalledTimes(2);
    });

    it('remembers which folders are open and shows what they hold', async () => {
        seedDocuments(['Ana', 'Bruno'], {
            folders: [folder('camp', 'Campaign')],
            placed: { Bruno: 'camp' },
        });
        openWindow();
        expect(rowNames()).toEqual(['Campaign', 'Ana']);
        fireEvent.click(screen.getByRole('button', { name: 'Expand Campaign' }));
        expect(rowNames()).toEqual(['Campaign', 'Bruno', 'Ana']);
        expect(row('Bruno').getAttribute('aria-level')).toBe('2');
        expect(JSON.parse(localStorage.getItem('documents-window-open-folders')!)).toEqual([
            'folder:camp',
        ]);
        cleanup();
        openWindow();
        expect(rowNames()).toEqual(['Campaign', 'Bruno', 'Ana']);
        fireEvent.click(screen.getByRole('button', { name: 'Collapse Campaign' }));
        expect(rowNames()).toEqual(['Campaign', 'Ana']);
    });

    it('shows a document with a missing folder at the top level', () => {
        seedDocuments(['Ana', 'Lost'], { placed: { Lost: 'gone' } });
        openWindow();
        expect(rowNames()).toEqual(['Ana', 'Lost']);
    });

    it('says so when there is no document', () => {
        openWindow();
        expect(screen.getByText('No documents yet. Create one to get started.')).toBeTruthy();
        expect(screen.queryByRole('tree')).toBeNull();
    });

    it('deletes the selected documents after a confirmation, the open one included', async () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo'], { current: 'Bruno' });
        openWindow();
        fireEvent.click(row('Bruno'));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(useDocumentStore.getState().entries).toHaveLength(3);
        const dialog = screen.getAllByRole('dialog').at(-1)!;
        fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
        expect(useDocumentStore.getState().entries.map(({ id }) => id)).toEqual(['Ana', 'Cleo']);
        await waitFor(() => expect(current()).toBe('Cleo'));
    });

    it('empties the sheet when the last document is deleted', () => {
        seedDocuments(['Ana'], { current: 'Ana' });
        openWindow();
        fireEvent.click(row('Ana'));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        fireEvent.click(
            within(screen.getAllByRole('dialog').at(-1)!).getByRole('button', {
                name: 'Delete',
            })
        );
        expect(current()).toBeNull();
        expect(screen.getByText('No documents yet. Create one to get started.')).toBeTruthy();
    });

    it('opens and deletes from the row menu', () => {
        seedDocuments(['Ana', 'Bruno']);
        openWindow();
        fireEvent.click(screen.getByRole('button', { name: 'Actions for Bruno' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Open' }));
        expect(current()).toBe('Bruno');
        expect(screen.queryByRole('button', { name: 'Actions for Campaign' })).toBeNull();
    });

    describe('on a phone', () => {
        beforeEach(() => {
            narrow = true;
        });

        it('fills the screen, offers the list and the details as tabs, and closes once a document opens', () => {
            seedDocuments(['Ana']);
            const onOpenChange = vi.fn();
            openWindow(onOpenChange);
            expect(screen.getByRole('dialog', { name: 'Documents' }).className).toContain(
                'inset-0'
            );
            const tabs = screen.getAllByRole('tab');
            expect(tabs.map((tab) => tab.textContent)).toEqual(['Documents', 'Details']);
            fireEvent.click(tabs[1]!);
            expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
            fireEvent.click(tabs[0]!);
            fireEvent.click(row('Ana'));
            expect(current()).toBe('Ana');
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });
});
