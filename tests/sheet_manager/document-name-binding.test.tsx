// @vitest-environment happy-dom
import { rollNameOf } from '@site/src/sheet_manager/features/sheet/data/documentLabels';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import {
    DOCUMENT_NAME_COORDINATE,
    listDocumentBindings,
} from '@site/src/sheet_manager/systems/templateBindings';
import { type CustomTemplate, CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mountSheet } from './helpers/sheet';

/** A name for documents of an own type (spec 045, US3). */

const KIND = 'user-faction1';
const NOW = '2026-10-28T10:00:00.000Z';

const template: CustomTemplate = CustomTemplateSchema.parse({
    id: 'tpl-faction',
    name: 'Faction',
    systemId: 'wod-v5',
    documentKind: KIND,
    schemaVersion: 4,
    children: [{ id: 'title', type: 'text', label: 'Title', valueKey: DOCUMENT_NAME_COORDINATE }],
});

beforeEach(() => {
    useDocumentTypeStore.setState({
        types: {
            [KIND]: {
                id: KIND,
                name: 'Faction',
                owner: { systemId: 'wod-v5' } as never,
                defaultTemplateId: 'tpl-faction',
                createdAt: NOW,
                updatedAt: NOW,
            },
        },
        settings: {},
        defaultPages: {},
    });
    const created = useDocumentStore
        .getState()
        .createDocument('wod-v5', KIND, { activate: true, title: '' });
    expect(created).toBeTruthy();
});

afterEach(() => {
    cleanup();
    useDocumentTypeStore.setState({ types: {}, settings: {}, defaultPages: {} });
});

const current = () => {
    const { documents, currentDocumentId } = useDocumentStore.getState();
    return documents.find(({ id }) => id === currentDocumentId)!;
};

describe('the Document name source', () => {
    it('is offered where a kind has no name field, and not added where one exists', () => {
        const own = listDocumentBindings('wod-v5', KIND).map(({ key }) => key);
        expect(own).toContain('field:document-name');
        const note = listDocumentBindings('general', 'note').map(({ key }) => key);
        expect(note).not.toContain('field:document-name');
    });

    it('renames the document as the reader types, and shows a rename from elsewhere', () => {
        mountSheet(template);
        const field = screen.getByRole('textbox', { name: 'Title' });
        fireEvent.change(field, { target: { value: 'The Ashen Court' } });
        expect(current().metadata.title).toBe('The Ashen Court');
        const entry = useDocumentStore.getState().entries.find(({ id }) => id === current().id);
        expect(entry?.name).toBe('The Ashen Court');
        act(() =>
            useDocumentStore.getState().updateDocumentMetadata(current().id, { title: 'Court' })
        );
        expect((screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value).toBe(
            'Court'
        );
    });

    it('names a roll of a document without a name after its type', () => {
        expect(rollNameOf(current())).toBe('Faction');
        expect(
            rollNameOf({ ...current(), metadata: { ...current().metadata, title: 'Court' } })
        ).toBe('Court');
    });
});
