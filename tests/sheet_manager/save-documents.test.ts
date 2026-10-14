// @vitest-environment happy-dom
import { savedValuesMayChange } from '@site/src/sheet_manager/features/template-editor/session/saveDocuments';
import { writeRecord } from '@site/src/sheet_manager/store/documentContent';
import { entryOf } from '@site/src/sheet_manager/store/documentIndex';
import { loadDocuments, useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { libraryDocument } from './helpers/library';

function template(children: unknown[]) {
    return CustomTemplateSchema.parse({
        id: 'tpl-savedocs1',
        name: 'Page',
        systemId: 'wod-v5',
        documentKind: 'mortal',
        schemaVersion: 3,
        children,
    });
}

const list = (title: string) => ({
    id: 'bonds',
    type: 'list',
    valueKey: 'bonds',
    title,
});
const text = (label: string, id = 'note') => ({ id, type: 'text', label, valueKey: id });

describe('when a save reads stored values (spec 032, D2)', () => {
    it('reads nothing when only text fields and titles change', () => {
        expect(
            savedValuesMayChange(
                template([list('Bonds'), text('A')]),
                template([list('Bonds'), text('B')])
            )
        ).toBe(false);
    });

    it('reads when a list changed or went away', () => {
        expect(savedValuesMayChange(template([list('Bonds')]), template([list('Ties')]))).toBe(
            true
        );
        expect(savedValuesMayChange(template([list('Bonds')]), template([text('A')]))).toBe(true);
    });

    it('reads nothing for a page that has no list, table, or tracker', () => {
        expect(
            savedValuesMayChange(template([text('A')]), template([text('B'), text('C', 'other')]))
        ).toBe(false);
    });
});

describe('loadDocuments', () => {
    beforeEach(() => {
        useDocumentStore.setState({ documents: [], entries: [], currentDocumentId: null });
    });

    it('returns open documents from memory and the others from their records', async () => {
        const open = libraryDocument('open', { systemId: 'wod-v5', definitionId: 'hunter' });
        const stored = libraryDocument('stored', { systemId: 'wod-v5', definitionId: 'hunter' });
        await writeRecord('stored', stored);
        useDocumentStore.setState({
            documents: [open],
            entries: [open, stored].map((document) => entryOf(document, undefined, {}, 1)),
        });
        const loaded = await loadDocuments(['open', 'stored', 'unknown']);
        expect(loaded.map(({ id }) => id)).toEqual(['open', 'stored']);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['document-record-missing']);
        expect(useDocumentStore.getState().documents.map(({ id }) => id)).toEqual(['open']);
    });
});
