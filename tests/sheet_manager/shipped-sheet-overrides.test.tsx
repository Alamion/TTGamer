// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { resolveEffectiveTemplate } from '@site/src/sheet_manager/systems/view';
import {
    DocumentKindSchema,
    type UnknownDocumentEnvelope,
} from '@site/src/sheet_manager/types/document';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

/** An edit of the Star Wars full sheet saved before spec 042 keeps its own layout (FR-007). */

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

afterEach(cleanup);

const saved = CustomTemplateSchema.parse(
    JSON.parse(readFileSync('tests/sheet_manager/fixtures/full-sheet-041.json', 'utf8'))
);

function seed() {
    const definition = systemRegistry.getDocumentDefinition('star-wars-wod', 'character')!;
    const data = definition.createDefault() as {
        metadata: { name: string; concept: string; homeWorld: string };
    };
    data.metadata.name = 'Kyla Venn';
    data.metadata.concept = 'Smuggler';
    data.metadata.homeWorld = 'Corellia';
    useDocumentStore.setState({
        documents: [
            {
                id: 'kyla',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'character',
                schemaVersion: 1,
                metadata: { title: 'Kyla Venn', tags: [] },
                templateValues: {},
                data,
            } as unknown as UnknownDocumentEnvelope,
        ],
        currentDocumentId: 'kyla',
    });
}

describe('an edit of a shipped full sheet saved before the new layout', () => {
    it('still resolves as the edit and shows the document’s values', () => {
        const overrides = { 'star-wars-wod:full-sheet': saved };
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: overrides });
        const resolved = resolveEffectiveTemplate(
            'full-sheet',
            { templates: [], defaultOverrides: overrides },
            'star-wars-wod',
            DocumentKindSchema.parse('character')
        )!;
        expect(resolved.modified).toBe(true);
        expect(resolved.template.children.map(({ id }) => id)).toEqual(
            saved.children.map(({ id }) => id)
        );
        seed();
        render(createElement(DeclarativeSheetView, { template: resolved.template }));
        for (const value of ['Kyla Venn', 'Smuggler', 'Corellia']) {
            expect(screen.getByDisplayValue(value)).toBeTruthy();
        }
    }, 20_000);
});
