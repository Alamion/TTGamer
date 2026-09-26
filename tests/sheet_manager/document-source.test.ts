// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    createScratchDocumentSource,
    createStaticDocumentSource,
    DocumentSourceContext,
    type ScratchDocumentSource,
} from '@site/src/sheet_manager/hooks/useDocumentSource';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import {
    createDefaultStarWarsCharacterData,
    starWarsCharacterDefinition,
} from '@site/src/sheet_manager/systems/star-wars-wod';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

function characterDocument(id: string, name: string, extra: Record<string, unknown> = {}) {
    const data = createDefaultStarWarsCharacterData();
    return {
        id,
        kind: 'character',
        systemId: 'star-wars-wod',
        definitionId: 'character',
        schemaVersion: 1,
        metadata: { title: name, tags: [] },
        templateValues: { origin: 'Corellia' },
        data: { ...data, metadata: { ...data.metadata, name }, ...extra },
    } as unknown as UnknownDocumentEnvelope;
}

const template = CustomTemplateSchema.parse({
    id: 'source-kit',
    name: 'Source Kit',
    documentKind: 'character',
    schemaVersion: 3,
    children: [
        { id: 'name', type: 'primitive', bindingKey: 'field:name', compact: false },
        { id: 'origin', type: 'text', label: 'Origin' },
        {
            id: 'powers',
            type: 'list',
            bindingKey: 'list:forcePowers',
            presets: [{ key: 'sense', label: 'Sense', value: 1 }],
        },
    ],
});

describe('document source seam', () => {
    beforeEach(() => {
        useDocumentStore.setState({
            documents: [characterDocument('store-doc', 'Store Hero')],
            currentDocumentId: 'store-doc',
        });
    });
    afterEach(cleanup);

    it('renders a provided document read-only instead of the store document', () => {
        const preset = characterDocument('preset-doc', 'Preset Hero');
        render(
            createElement(
                DocumentSourceContext.Provider,
                { value: createStaticDocumentSource(preset) },
                createElement(DeclarativeSheetView, { template })
            )
        );
        const name = screen.getByLabelText('Name') as HTMLInputElement;
        expect(name.value).toBe('Preset Hero');
        expect(name.disabled).toBe(true);
        expect((screen.getByLabelText('Origin') as HTMLInputElement).value).toBe('Corellia');
        // Read-only sources never seed presets or touch the store.
        expect(useDocumentStore.getState().documents[0]!.metadata.seededPresets).toBeUndefined();
    });

    it('seeds Force power presets into forcePowerItems (the bound data key)', () => {
        render(createElement(DeclarativeSheetView, { template }));
        const data = useDocumentStore.getState().documents[0]!.data as {
            forcePowerItems: Array<{ id: string }>;
        };
        expect(data.forcePowerItems.map(({ id }) => id)).toEqual(['preset-source-kit-sense']);
    });
});

describe('scratch document source (template editor sample data)', () => {
    const scratchTemplate = CustomTemplateSchema.parse({
        ...template,
        id: 'scratch-kit',
        children: [
            ...template.children.filter(({ id }) => id !== 'powers'),
            { id: 'rank', type: 'number', label: 'Rank', min: 0, max: 5 },
        ],
    });

    function ScratchView({ scratch }: { scratch: ScratchDocumentSource }) {
        return createElement(
            DocumentSourceContext.Provider,
            { value: scratch.useSource() },
            createElement(DeclarativeSheetView, { template: scratchTemplate, embedded: true })
        );
    }

    beforeEach(() => {
        useDocumentStore.setState({
            documents: [characterDocument('store-doc', 'Store Hero')],
            currentDocumentId: 'store-doc',
        });
    });
    afterEach(cleanup);

    it('writes values and data to the scratch copy only', () => {
        const before = useDocumentStore.getState().documents;
        const scratch = createScratchDocumentSource(
            characterDocument('sample', 'Sample Hero'),
            starWarsCharacterDefinition
        );
        render(createElement(ScratchView, { scratch }));

        const name = screen.getByLabelText('Name') as HTMLInputElement;
        expect(name.disabled).toBe(false);
        fireEvent.change(name, { target: { value: 'Renamed' } });
        fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'Tatooine' } });

        const sample = scratch.getDocument();
        expect(sample.templateValues.origin).toBe('Tatooine');
        expect((sample.data as { metadata: { name: string } }).metadata.name).toBe('Renamed');
        expect(useDocumentStore.getState().documents).toBe(before);
    });

    it('rejects invalid values like the store does and marks itself a preview', () => {
        const scratch = createScratchDocumentSource(
            characterDocument('sample', 'Sample Hero'),
            starWarsCharacterDefinition
        );
        let source: ReturnType<ScratchDocumentSource['useSource']> | undefined;
        function Probe() {
            source = scratch.useSource();
            return null;
        }
        render(createElement(Probe));
        expect(source?.preview).toBe(true);
        expect(source?.readOnly).toBe(false);

        source?.updateTemplateValues('sample', scratchTemplate, (values) => ({
            ...values,
            rank: 9,
        }));
        expect(scratch.getDocument().templateValues.rank).toBeUndefined();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual([
            'template-value-write-rejected',
        ]);
    });
});
