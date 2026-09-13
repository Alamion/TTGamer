// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function textField(id: string, valueKey: string) {
    return {
        id,
        type: 'text' as const,
        label: 'Eye color',
        valueKey,
        multiline: false,
        compact: false,
        required: false,
    };
}

function buildTemplate(id: string) {
    return CustomTemplateSchema.parse({
        id,
        name: id,
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'identity',
                type: 'section',
                title: 'Identity',
                children: [textField('color', 'appearance-color')],
            },
        ],
    });
}

function seedDocument(templateValues?: unknown) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-shared',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'character',
                schemaVersion: 1,
                metadata: { title: 'Shared', tags: [] },
                templateValues: templateValues ?? {},
                data: { metadata: { name: '', type: 'sentient' } },
            } as never,
        ],
        currentDocumentId: 'doc-shared',
    });
}

describe('shared value store across templates', () => {
    beforeEach(() => {
        seedDocument();
    });

    afterEach(() => {
        cleanup();
    });

    it('two templates with an equal valueKey read and write one value', () => {
        const humanPage = buildTemplate('human-page');
        const vampirePage = CustomTemplateSchema.parse({
            ...buildTemplate('vampire-page'),
            children: [
                {
                    id: 'identity',
                    type: 'section',
                    title: 'True identity',
                    children: [textField('eye-color', 'appearance-color')],
                },
            ],
        });
        useTemplateStore.setState({
            templates: [humanPage, vampirePage],
            quarantine: [],
        });

        // Write from the human page.
        render(createElement(DeclarativeSheetView, { template: humanPage }));
        fireEvent.change(screen.getByLabelText('Eye color'), {
            target: { value: 'ice blue' },
        });
        cleanup();

        // The vampire page reads the same document-scoped value.
        render(createElement(DeclarativeSheetView, { template: vampirePage }));
        const eye = screen.getByLabelText('Eye color') as HTMLInputElement;
        expect(eye.value).toBe('ice blue');

        // Writing from the vampire page updates the shared coordinate for both pages.
        fireEvent.change(eye, { target: { value: 'crimson' } });
        expect(useDocumentStore.getState().documents[0]!.templateValues?.['appearance-color']).toBe(
            'crimson'
        );
    });

    it('re-assigning a different template preserves document-scoped values', () => {
        seedDocument({ 'appearance-color': 'ice blue' });
        const template = buildTemplate('other-page');
        useTemplateStore.setState({ templates: [template], quarantine: [] });
        render(createElement(DeclarativeSheetView, { template }));

        const eye = screen.getByLabelText('Eye color') as HTMLInputElement;
        expect(eye.value).toBe('ice blue');
    });
});
