// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    createStaticDocumentSource,
    DocumentSourceContext,
} from '@site/src/sheet_manager/hooks/useDocumentSource';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
