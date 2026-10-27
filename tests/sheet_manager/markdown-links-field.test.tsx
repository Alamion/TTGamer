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
