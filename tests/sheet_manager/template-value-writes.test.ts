// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { starWarsWodDefaultTemplates } from '@site/src/sheet_manager/systems/star-wars-wod/defaultTemplates';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

function seedDocument(templateValues: Record<string, unknown> = {}) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-writes',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'character',
                schemaVersion: 1,
                metadata: { title: 'Writes', tags: [], seededPresets: ['number-kit'] },
                templateValues,
                data: createDefaultStarWarsCharacterData(),
            } as never,
        ],
        currentDocumentId: 'doc-writes',
    });
}

function numberTemplate() {
    return CustomTemplateSchema.parse({
        id: 'number-kit',
        name: 'Number Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'field-luck',
                type: 'number',
                label: 'Luck',
                valueKey: 'luck',
                min: 0,
                max: 5,
            },
        ],
    });
}

const storedValues = () => useDocumentStore.getState().documents[0]!.templateValues ?? {};

describe('template value write path', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
        seedDocument();
    });
    afterEach(cleanup);

    it('persists values written on a shipped default template (not in the user library)', () => {
        const fullSheet = starWarsWodDefaultTemplates.find(({ id }) => id === 'full-sheet')!;
        render(createElement(DeclarativeSheetView, { template: fullSheet }));
        takeSheetIssues(); // render-time degradation (e.g. missing body handlers) is out of scope

        const urlInput = screen.getByLabelText('Image URL') as HTMLInputElement;
        fireEvent.change(urlInput, { target: { value: 'https://example.test/portrait.webp' } });
        fireEvent.blur(urlInput);

        expect(storedValues().portrait).toEqual({
            source: 'url',
            url: 'https://example.test/portrait.webp',
        });
    });

    it('validates fields by their valueKey, not their node id', () => {
        const template = numberTemplate();
        useDocumentStore
            .getState()
            .updateTemplateValues('doc-writes', template, (page) => ({ ...page, luck: 3 }));
        expect(storedValues().luck).toBe(3);

        useDocumentStore
            .getState()
            .updateTemplateValues('doc-writes', template, (page) => ({ ...page, luck: 99 }));
        expect(storedValues().luck).toBe(3);
        expect(takeSheetIssues()).toEqual([
            expect.objectContaining({
                code: 'template-value-write-rejected',
                details: expect.objectContaining({ key: 'luck', reason: 'bounds' }),
            }),
        ]);
    });

    it('does not let an unchanged stale value block writes to other keys', () => {
        // `luck` was stored before the template narrowed its bounds.
        seedDocument({ luck: 42 });
        const template = numberTemplate();
        useDocumentStore
            .getState()
            .updateTemplateValues('doc-writes', template, (page) => ({ ...page, notes: 'kept' }));
        expect(storedValues()).toEqual({ luck: 42, notes: 'kept' });
    });

    it('reports writes to a document that does not exist', () => {
        useDocumentStore
            .getState()
            .updateTemplateValues('missing-doc', numberTemplate(), (page) => page);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['template-value-write-skipped']);
    });
});
