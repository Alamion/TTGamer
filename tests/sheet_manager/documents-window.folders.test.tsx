// @vitest-environment happy-dom
import { documentsHistory } from '@site/src/sheet_manager/features/documents/treeActions';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { cleanup, createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { folder, openWindow, resetDocuments, seedDocuments } from './helpers/documentsWindow';

vi.setConfig({ testTimeout: 20_000 });

const row = (name: string) => screen.getByRole('treeitem', { name: new RegExp(`^${name}`) });
const rowNames = () =>
    screen
        .queryAllByRole('treeitem')
        .map((item) => item.querySelector('span.truncate')?.textContent);
const state = () => useDocumentStore.getState();
const placeOf = (id: string) => state().entries.find((entry) => entry.id === id)?.parentId;

const dataTransfer = () => ({
    data: new Map<string, string>(),
    effectAllowed: '',
    dropEffect: '',
    setData(type: string, value: string) {
        this.data.set(type, value);
    },
});

/** Drags one row onto another; `at` is the pointer height inside the target (0 top, 1 bottom). */
function drag(source: HTMLElement, target: HTMLElement, at = 0.5) {
    target.getBoundingClientRect = () =>
        ({
            top: 100,
            height: 40,
            left: 0,
            width: 200,
            bottom: 140,
            right: 200,
            x: 0,
            y: 100,
        }) as DOMRect;
    const transfer = dataTransfer();
    fireEvent.dragStart(source, { dataTransfer: transfer });
    fireDrag('dragOver', target, transfer, 100 + 40 * at);
    fireDrag('drop', target, transfer, 100 + 40 * at);
    fireEvent.dragEnd(source, { dataTransfer: transfer });
}

/** happy-dom's drag events carry no pointer position, so the test gives them one. */
function fireDrag(
    type: 'dragOver' | 'drop',
    target: HTMLElement,
    transfer: ReturnType<typeof dataTransfer>,
    clientY: number
) {
    const event = createEvent[type](target, { dataTransfer: transfer });
    Object.defineProperty(event, 'clientY', { value: clientY });
    fireEvent(target, event);
}

describe('folders in the documents window (spec 032, US2)', () => {
    beforeEach(() => {
        localStorage.clear();
        documentsHistory.clear();
        window.matchMedia = ((query: string) => ({
            matches: false,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
        cleanup();
        resetDocuments();
    });

    it('creates a folder from the toolbar and selects it', () => {
        seedDocuments(['Ana']);
        openWindow();
        fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
        const input = screen.getByRole('textbox', { name: 'Folder name' }) as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Campaign' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        expect(rowNames()).toEqual(['Campaign', 'Ana']);
        expect(row('Campaign').getAttribute('aria-selected')).toBe('true');
        expect(state().folders[0]).toMatchObject({ name: 'Campaign', parentId: null });
    });

    it('renames a folder with F2 and from its details, and undoes it', () => {
        seedDocuments(['Ana'], { folders: [folder('f1', 'Old')] });
        openWindow();
        row('Old').focus();
        fireEvent.click(row('Old'));
        fireEvent.keyDown(row('Old'), { key: 'F2' });
        fireEvent.change(screen.getByRole('textbox', { name: 'Folder name' }), {
            target: { value: 'Renamed' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
        expect(rowNames()).toContain('Renamed');
        fireEvent.click(screen.getByRole('button', { name: /^Undo/ }));
        expect(rowNames()).toContain('Old');
    });

    it('drags a document onto a folder, opens nothing, and undoes the move', () => {
        seedDocuments(['Ana', 'Bruno'], { folders: [folder('f1', 'Campaign')] });
        openWindow();
        drag(row('Bruno'), row('Campaign'));
        expect(placeOf('Bruno')).toBe('f1');
        expect(state().currentDocumentId).toBeNull();
        expect(rowNames()).toEqual(['Campaign', 'Bruno', 'Ana']);
        fireEvent.click(screen.getByRole('button', { name: /^Undo: Move/ }));
        expect(placeOf('Bruno')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /^Redo: Move/ }));
        expect(placeOf('Bruno')).toBe('f1');
    });

    it('reorders by dropping above or below a row', () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo']);
        openWindow();
        drag(row('Cleo'), row('Ana'), 0.1);
        expect(rowNames()).toEqual(['Cleo', 'Ana', 'Bruno']);
        drag(row('Cleo'), row('Bruno'), 0.9);
        expect(rowNames()).toEqual(['Ana', 'Bruno', 'Cleo']);
        fireEvent.click(row('Ana'), { ctrlKey: true });
        fireEvent.keyDown(row('Ana'), { key: 'z', ctrlKey: true });
        expect(rowNames()).toEqual(['Cleo', 'Ana', 'Bruno']);
    });

    it('refuses a drop of a folder into its own subfolder and says so', () => {
        seedDocuments(['Ana'], {
            folders: [folder('f1', 'Outer'), folder('f2', 'Inner', 'f1')],
        });
        localStorage.setItem('documents-window-open-folders', JSON.stringify(['folder:f1']));
        openWindow();
        const transfer = dataTransfer();
        fireEvent.dragStart(row('Outer'), { dataTransfer: transfer });
        const inner = row('Inner');
        inner.getBoundingClientRect = () => ({ top: 0, height: 40 }) as DOMRect;
        fireDrag('dragOver', inner, transfer, 20);
        expect(screen.getByRole('alert').textContent).toContain('cannot go into itself');
        fireDrag('drop', inner, transfer, 20);
        expect(state().folders.find((item) => item.id === 'f1')!.parentId).toBeNull();
    });

    it('moves several selected rows as one step with the "Move to…" picker', () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo'], { folders: [folder('f1', 'Campaign')] });
        openWindow();
        fireEvent.click(row('Ana'), { ctrlKey: true });
        fireEvent.click(row('Bruno'), { ctrlKey: true });
        fireEvent.click(screen.getAllByRole('button', { name: 'Move to…' }).at(-1)!);
        const picker = screen.getAllByRole('dialog').at(-1)!;
        expect(within(picker).getByText('Move 2 items to…')).toBeTruthy();
        fireEvent.click(within(picker).getByRole('treeitem', { name: /Campaign/ }));
        fireEvent.click(within(picker).getByRole('button', { name: 'Move here' }));
        expect([placeOf('Ana'), placeOf('Bruno'), placeOf('Cleo')]).toEqual(['f1', 'f1', null]);
        fireEvent.click(screen.getByRole('button', { name: /^Undo: Move/ }));
        expect([placeOf('Ana'), placeOf('Bruno')]).toEqual([null, null]);
    });

    it('does not offer a folder being moved, or what is inside it, as a target', () => {
        seedDocuments([], {
            folders: [folder('f1', 'Outer'), folder('f2', 'Inner', 'f1'), folder('f3', 'Other')],
        });
        openWindow();
        fireEvent.click(row('Outer'));
        fireEvent.click(screen.getAllByRole('button', { name: 'Move to…' }).at(-1)!);
        const picker = screen.getAllByRole('dialog').at(-1)!;
        const names = within(picker)
            .getAllByRole('treeitem')
            .map((item) => item.textContent);
        expect(names.join('|')).toContain('Other');
        expect(names.join('|')).not.toContain('Outer');
        expect(names.join('|')).not.toContain('Inner');
    });

    it('deletes a folder with its contents after a confirmation that lists them, and undoes it', async () => {
        seedDocuments(['Ana', 'Bruno', 'Cleo'], {
            folders: [folder('f1', 'Campaign')],
            placed: { Ana: 'f1', Bruno: 'f1' },
            current: 'Ana',
        });
        openWindow();
        fireEvent.click(row('Campaign'));
        fireEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!);
        const dialog = screen.getAllByRole('dialog').at(-1)!;
        expect(dialog.textContent).toContain('Delete 1 folder and 2 documents?');
        expect(dialog.textContent).toContain('The open document is among them');
        expect(state().entries).toHaveLength(3);
        fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
        expect(state().entries.map(({ id }) => id)).toEqual(['Cleo']);
        expect(state().folders).toEqual([]);
        await waitFor(() => expect(state().currentDocumentId).toBe('Cleo'));
        fireEvent.click(screen.getByRole('button', { name: /^Undo: Delete/ }));
        expect(state().entries).toHaveLength(3);
        expect(state().folders).toHaveLength(1);
        expect(state().pendingPurge).toEqual([]);
    });

    it('deletes selected folders and documents together from the keyboard', () => {
        seedDocuments(['Ana', 'Bruno'], { folders: [folder('f1', 'Campaign')] });
        openWindow();
        fireEvent.click(row('Campaign'));
        row('Campaign').focus();
        fireEvent.click(row('Ana'), { ctrlKey: true });
        row('Ana').focus();
        fireEvent.keyDown(row('Ana'), { key: 'Delete' });
        const dialog = screen.getAllByRole('dialog').at(-1)!;
        expect(dialog.textContent).toContain('Delete 1 folder and 1 document?');
    });

    it('offers rename and new folder in a folder row menu, and creates inside it', () => {
        seedDocuments([], { folders: [folder('f1', 'Campaign')] });
        openWindow();
        fireEvent.click(screen.getByRole('button', { name: 'Actions for Campaign' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'New folder' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        expect(state().folders.find((item) => item.name === 'New folder')!.parentId).toBe('f1');
    });

    it('adds a document from the window without showing it, inside the selected folder', () => {
        seedDocuments(['Ana'], { folders: [folder('f1', 'Campaign')], current: 'Ana' });
        openWindow();
        fireEvent.click(row('Campaign'));
        fireEvent.click(screen.getByRole('button', { name: 'Add a document' }));
        fireEvent.click(screen.getAllByRole('button').at(-1)!);
        expect(state().entries).toHaveLength(2);
        const created = state().entries.find((entry) => entry.id !== 'Ana')!;
        expect(created.parentId).toBe('f1');
        expect(state().currentDocumentId).toBe('Ana');
        expect(row('Campaign').getAttribute('aria-expanded')).toBe('true');
    });

    it('moves a row to the end of the top level when it is dropped under the last row', () => {
        seedDocuments(['Ana', 'Bruno'], {
            folders: [folder('f1', 'Campaign')],
            placed: { Ana: 'f1' },
        });
        localStorage.setItem('documents-window-open-folders', JSON.stringify(['folder:f1']));
        openWindow();
        const transfer = dataTransfer();
        fireEvent.dragStart(row('Ana'), { dataTransfer: transfer });
        const end = document.querySelector('[aria-hidden="true"].flex-1') as HTMLElement;
        fireEvent.dragOver(end, { dataTransfer: transfer });
        fireEvent.drop(end, { dataTransfer: transfer });
        expect(placeOf('Ana')).toBeNull();
        expect(rowNames()).toEqual(['Campaign', 'Bruno', 'Ana']);
    });
});
