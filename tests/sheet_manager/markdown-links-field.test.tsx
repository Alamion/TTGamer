// @vitest-environment happy-dom
import {
    findSection,
    scrollToSection,
} from '@site/src/sheet_manager/features/documents/followLink';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { DocumentLinkContext } from '@site/src/sheet_manager/features/sheet/declarative/documentLinks';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { noteEnvelope, noteTemplate } from '@site/src/sheet_manager/systems/general/note';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Links between documents in a markdown field (spec 044, US1 and US2). */

const panes = vi.hoisted(() => ({ newTab: [] as string[] }));

vi.mock('@site/src/sheet_manager/features/sheet/panes/paneStore', async (original) => ({
    ...(await original<object>()),
    openInNewTab: (id: string) => void panes.newTab.push(id),
}));

vi.setConfig({ testTimeout: 20_000 });

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

beforeEach(() => {
    panes.newTab = [];
});

afterEach(cleanup);

const followed: string[] = [];

function mountNote(body: string, others: ReturnType<typeof noteEnvelope>[] = []) {
    followed.length = 0;
    useDocumentStore.setState({
        documents: [noteEnvelope('note-1', 'Session', body), ...others],
        currentDocumentId: 'note-1',
    });
    return render(
        createElement(
            DocumentLinkContext.Provider,
            { value: (id: string) => void followed.push(id) },
            createElement(DeclarativeSheetView, { template: noteTemplate })
        )
    );
}

describe('following a link', () => {
    it('opens the linked document through the link history, by its name or its alias', () => {
        mountNote('Meet [[Ines Ruiz]] and [[The Lantern Choir|the choir]].', [
            noteEnvelope('ines', 'Ines Ruiz', ''),
            noteEnvelope('choir', 'The Lantern Choir', ''),
        ]);
        fireEvent.click(screen.getByRole('link', { name: 'Ines Ruiz' }));
        fireEvent.click(screen.getByRole('link', { name: 'the choir' }));
        expect(followed).toEqual(['ines', 'choir']);
        expect(panes.newTab).toEqual([]);
    });

    it('opens the document in a new tab on Ctrl-click and middle click', () => {
        mountNote('[[Ines Ruiz]]', [noteEnvelope('ines', 'Ines Ruiz', '')]);
        const link = screen.getByRole('link', { name: 'Ines Ruiz' });
        fireEvent.click(link, { ctrlKey: true });
        fireEvent(link, new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }));
        expect(panes.newTab).toEqual(['ines', 'ines']);
        expect(followed).toEqual([]);
    });

    it('offers to create a note for a missing name, next to the note, and opens it', async () => {
        mountNote('Go to [[Docks]]');
        fireEvent.click(screen.getByRole('button', { name: 'Docks' }));
        await act(async () => {
            fireEvent.click(await screen.findByRole('button', { name: 'Create note' }));
        });
        const created = useDocumentStore.getState().entries.find(({ name }) => name === 'Docks');
        expect(created).toMatchObject({
            systemId: 'general',
            definitionId: 'note',
            parentId: null,
        });
        expect(followed).toEqual([created!.id]);
        expect(screen.getByRole('link', { name: 'Docks' })).toBeTruthy();
        expect(takeSheetIssues().map(({ code }) => code)).toContain('link-unresolved');
    });

    it('marks every titled node of the page and the page with its document', () => {
        const { container } = mountNote('# Plans\ntext');
        const root = container.querySelector('[data-document-id="note-1"]');
        expect(root).toBeTruthy();
        expect(findSection(root!, 'plans')?.tagName).toBe('H2');
        expect(findSection(root!, 'Name')).toBeTruthy();
    });
});

describe('sections', () => {
    it('match the shown name or the source name of an anchor', () => {
        const root = document.createElement('div');
        root.innerHTML =
            '<div class="contents" data-section="Навыки" data-section-source="Skills"><section id="skills"></section></div>';
        expect(findSection(root, 'skills')?.id).toBe('skills');
        expect(findSection(root, 'НАВЫКИ')?.id).toBe('skills');
        expect(findSection(root, 'Powers')).toBeUndefined();
    });

    it('report a section the target lacks once the wait is over', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'Date'] });
        try {
            const root = document.createElement('div');
            root.dataset.documentId = 'target';
            document.body.append(root);
            scrollToSection('target', 'Nowhere');
            vi.advanceTimersByTime(2500);
            root.remove();
        } finally {
            vi.useRealTimers();
        }
        expect(takeSheetIssues()).toEqual([
            expect.objectContaining({
                code: 'link-section-missing',
                details: { documentId: 'target', section: 'Nowhere' },
            }),
        ]);
    });
});

describe('suggestions while a link is typed', () => {
    const textarea = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Text' });

    function type(value: string) {
        fireEvent.change(textarea(), { target: { value } });
        textarea().setSelectionRange(value.length, value.length);
        fireEvent.select(textarea());
    }

    function mountEditing(others: ReturnType<typeof noteEnvelope>[]) {
        mountNote('', others);
    }

    it('lists documents by name with their kind, and Enter inserts the link', () => {
        mountEditing([
            noteEnvelope('ines', 'Ines Ruiz', ''),
            noteEnvelope('inn', 'Inn of the Seven', ''),
            noteEnvelope('bruno', 'Bruno Kessel', ''),
        ]);
        type('Meet [[in');
        const options = screen.getAllByRole('option');
        expect(options.map((option) => option.textContent)).toEqual([
            'Ines RuizNote',
            'Inn of the SevenNote',
        ]);
        expect(textarea().getAttribute('aria-activedescendant')).toBe(options[0]!.id);
        fireEvent.keyDown(textarea(), { key: 'ArrowDown' });
        expect(textarea().getAttribute('aria-activedescendant')).toBe(options[1]!.id);
        fireEvent.keyDown(textarea(), { key: 'ArrowUp' });
        fireEvent.keyDown(textarea(), { key: 'Enter' });
        expect(textarea().value).toBe('Meet [[Ines Ruiz]]');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('writes a folder path when the nearest rule would pick another document', () => {
        useDocumentStore.setState({
            folders: [
                {
                    id: 'far',
                    name: 'World 2',
                    parentId: null,
                    rank: 1,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    changedAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: 0,
                },
            ],
        });
        mountEditing([noteEnvelope('a', 'Sword', ''), noteEnvelope('b', 'Sword', '')]);
        useDocumentStore.setState((state) => ({
            entries: state.entries.map((entry) =>
                entry.id === 'b' ? { ...entry, parentId: 'far' } : entry
            ),
        }));
        type('[[Sw');
        expect(screen.getAllByRole('option')[1]?.textContent).toContain('World 2');
        fireEvent.click(screen.getAllByRole('option')[1]!);
        expect(textarea().value).toBe('[[World 2/Sword]]');
    });

    it('lists the sections of the named document after #', async () => {
        mountEditing([noteEnvelope('docks', 'Docks', '# History\n## Who works here')]);
        type('[[Docks#hi');
        await screen.findByRole('listbox', { name: 'Sections of Docks' });
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
            'History',
        ]);
        fireEvent.keyDown(textarea(), { key: 'Tab' });
        expect(textarea().value).toBe('[[Docks#History]]');
    });

    it('closes on Esc without ending the editing, and keeps the text', () => {
        mountEditing([noteEnvelope('ines', 'Ines Ruiz', '')]);
        type('[[Ine');
        expect(screen.getByRole('listbox')).toBeTruthy();
        fireEvent.keyDown(textarea(), { key: 'Escape' });
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(textarea().value).toBe('[[Ine');
        type('[[Nobody here');
        expect(screen.queryByRole('listbox')).toBeNull();
    });
});

describe('another document on the same page', () => {
    it('starts an empty note in edit mode after a note that was being read', () => {
        mountNote('Some text', [noteEnvelope('empty', 'Fresh', '')]);
        expect(screen.queryByRole('textbox', { name: 'Text' })).toBeNull();
        act(() => useDocumentStore.setState({ currentDocumentId: 'empty' }));
        expect(screen.getByRole('textbox', { name: 'Text' })).toBeTruthy();
        act(() => useDocumentStore.setState({ currentDocumentId: 'note-1' }));
        expect(screen.queryByRole('textbox', { name: 'Text' })).toBeNull();
    });
});
