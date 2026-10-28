// @vitest-environment happy-dom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { DocumentLinkContext } from '@site/src/sheet_manager/features/sheet/declarative/documentLinks';
import {
    MENTIONS_SOURCES_MAX,
    MentionsFieldControl,
} from '@site/src/sheet_manager/features/sheet/declarative/MentionsFieldControl';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { saveDocumentLinks, useLinkIndex } from '@site/src/sheet_manager/store/linkIndexStore';
import { noteEnvelope, noteTemplate } from '@site/src/sheet_manager/systems/general/note';
import {
    CustomTemplateSchema,
    LIST_ITEM_TYPES,
    type TemplateField,
} from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** "Mentioned in": the documents whose markdown links to the shown one (spec 044, US5). */

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

afterEach(cleanup);

const FIELD = {
    id: 'mentions',
    type: 'mentions',
    label: 'Mentioned in',
    maxShown: 2,
    required: false,
} as unknown as TemplateField;

async function seed(target: string, sources: Array<[id: string, name: string, body: string]>) {
    const documents = [
        noteEnvelope('docks', target, ''),
        ...sources.map(([id, name, body]) => noteEnvelope(id, name, body)),
    ];
    useDocumentStore.setState({ documents, currentDocumentId: 'docks' });
    for (const document of documents) await saveDocumentLinks(document);
    useLinkIndex.setState({ ready: true });
}

const followed: string[] = [];

function mount() {
    followed.length = 0;
    return render(
        createElement(
            DocumentLinkContext.Provider,
            { value: (id: string) => void followed.push(id) },
            createElement(MentionsFieldControl, {
                field: FIELD,
                value: undefined,
                onChange: () => undefined,
                disabled: false,
            })
        )
    );
}

describe('Mentioned in', () => {
    it('lists the documents that link here with the line around each link, and opens one', async () => {
        await seed('Docks', [
            ['a', 'Session 1', 'Plan\nMeet at [[Docks]] at night'],
            ['b', 'Location', 'See [[docks|the docks]] and [[Elsewhere]]'],
            ['c', 'Unrelated', 'Nothing here'],
        ]);
        mount();
        const items = screen.getAllByRole('listitem');
        expect(items.map((item) => item.textContent)).toEqual([
            'Location · NoteSee [[docks|the docks]] and [[Elsewhere]]',
            'Session 1 · NoteMeet at [[Docks]] at night',
        ]);
        fireEvent.click(screen.getByRole('button', { name: /Session 1/ }));
        expect(followed).toEqual(['a']);
    });

    it('follows edits: a document that stops linking leaves the list', async () => {
        await seed('Docks', [['a', 'Session 1', '[[Docks]]']]);
        mount();
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        await act(async () => {
            await saveDocumentLinks(noteEnvelope('a', 'Session 1', 'No link now'));
        });
        expect(screen.getByText('No document links here yet.')).toBeTruthy();
    });

    it('folds entries past its limit behind Show all', async () => {
        await seed('Docks', [
            ['a', 'A', '[[Docks]]'],
            ['b', 'B', '[[Docks]]'],
            ['c', 'C', '[[Docks]]'],
        ]);
        mount();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        const toggle = screen.getByRole('button', { name: 'Show all (3)' });
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(toggle);
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('lists at most the source limit and reports the rest', async () => {
        const sources = Array.from(
            { length: MENTIONS_SOURCES_MAX + 1 },
            (_, index) =>
                [`s${String(index)}`, `Source ${String(index)}`, '[[Docks]]'] as [
                    string,
                    string,
                    string,
                ]
        );
        await seed('Docks', sources);
        mount();
        expect(screen.getByText(/More documents link here than are listed/)).toBeTruthy();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['mentions-truncated']);
    });

    it('waits for the link index before saying nothing links here', () => {
        useDocumentStore.setState({ documents: [noteEnvelope('docks', 'Docks', '')] });
        mount();
        expect(screen.getByRole('status').textContent).toBe('Looking for links…');
    });
});

describe('the field type', () => {
    it('sits at the bottom of the note page and nowhere in lists or tables', async () => {
        expect(noteTemplate.children.at(-1)).toMatchObject({ type: 'mentions' });
        expect(LIST_ITEM_TYPES).not.toContain('mentions');
        const table = CustomTemplateSchema.safeParse({
            id: 'mentions-table',
            name: 'Table',
            documentKind: 'character',
            schemaVersion: 4,
            children: [
                {
                    id: 'table',
                    type: 'table',
                    title: 'Table',
                    columns: [{ id: 'm', type: 'mentions', label: 'M' }],
                },
            ],
        });
        expect(table.success).toBe(false);
        await seed('Docks', [['a', 'Session', '[[Docks]]']]);
        render(createElement(DeclarativeSheetView, { template: noteTemplate }));
        expect(screen.getByRole('list', { name: 'Mentioned in' })).toBeTruthy();
    });
});
