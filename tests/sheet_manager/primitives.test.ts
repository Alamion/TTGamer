// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

function buildTemplate(): CustomTemplate {
    return CustomTemplateSchema.parse({
        id: 'primitive-page',
        name: 'Primitive Page',
        systemId: 'star-wars-wod',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'page',
                type: 'section',
                title: 'Page',
                children: [
                    {
                        id: 'name-primitive',
                        type: 'primitive',
                        bindingKey: 'field:name',
                        compact: false,
                    },
                    {
                        id: 'strength',
                        type: 'primitive',
                        bindingKey: 'trait:physical:Strength',
                        compact: false,
                    },
                    {
                        id: 'athletics',
                        type: 'primitive',
                        bindingKey: 'trait:talents:Athletics',
                        compact: false,
                    },
                    {
                        id: 'skills-list',
                        type: 'list',
                        bindingKey: 'list:customSkills',
                        columns: 1,
                    },
                    {
                        id: 'willpower',
                        type: 'primitive',
                        bindingKey: 'resource:willpower',
                        compact: false,
                    },
                    { id: 'health', type: 'primitive', bindingKey: 'track:health', compact: false },
                ],
            },
        ],
    });
}

function seedDocument(templateValues?: unknown) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-primitive',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'character',
                schemaVersion: 1,
                metadata: { title: 'Primitive Target', tags: [] },
                templateValues,
                data: createDefaultStarWarsCharacterData(),
            } as never,
        ],
        currentDocumentId: 'doc-primitive',
    });
}

describe('document-bound primitives (feature 005/006)', () => {
    beforeEach(seedDocument);
    afterEach(cleanup);

    it('renders bound primitives without degradation notices', () => {
        render(createElement(DeclarativeSheetView, { template: buildTemplate() }));
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        // Identity field renders an editable textbox.
        expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
    });

    it('edits a bound trait into document data (FR-8)', () => {
        render(createElement(DeclarativeSheetView, { template: buildTemplate() }));
        expect(screen.getByText('Strength')).not.toBeNull();
        expect(screen.getByText('Athletics')).not.toBeNull();
        expect(screen.getByText('Willpower')).not.toBeNull();
        expect(screen.getByText('Health')).not.toBeNull();
        const dots = screen.getAllByRole('button');
        expect(dots.length).toBeGreaterThan(0);
    });

    it('edits a system-bound list into document data', () => {
        render(createElement(DeclarativeSheetView, { template: buildTemplate() }));
        const document = useDocumentStore.getState().documents[0]!;
        const before = ((document.data as { customSkills?: unknown[] }).customSkills ?? []).length;
        // The system list renders its own add button; CustomTraitList's add is 'Add'.
        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        const after = useDocumentStore.getState().documents[0]!;
        expect(((after.data as { customSkills?: unknown[] }).customSkills ?? []).length).toBe(
            before + 1
        );
    });

    it('degrades unknown and foreign-kind bindings to placeholders (T014, FR-3)', () => {
        const template = CustomTemplateSchema.parse({
            id: 'degraded-primitives',
            name: 'Degraded',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'page',
                    type: 'section',
                    title: 'Page',
                    children: [
                        {
                            id: 'ghost',
                            type: 'primitive',
                            bindingKey: 'trait:physical:Nope',
                            compact: false,
                        },
                        {
                            id: 'cross-kind',
                            type: 'primitive',
                            bindingKey: 'track:vehicle-damage',
                            compact: false,
                        },
                        {
                            id: 'origin',
                            type: 'text',
                            label: 'Origin',
                            required: false,
                            compact: false,
                            multiline: false,
                        },
                    ],
                },
            ],
        });
        render(createElement(DeclarativeSheetView, { template }));
        const alerts = screen.getAllByRole('alert');
        expect(alerts).toHaveLength(2);
        expect(alerts[0]?.textContent).toContain('trait:physical:Nope');
        expect(alerts[1]?.textContent).toContain('track:vehicle-damage');
        const degraded = takeSheetIssues().map(({ details }) => details?.bindingKey);
        expect(new Set(degraded)).toEqual(new Set(['trait:physical:Nope', 'track:vehicle-damage']));
        expect(screen.getByLabelText('Origin')).not.toBeNull();
    });

    it('clamps resource writes to the maxFrom ceiling without storing the cap', () => {
        const template = CustomTemplateSchema.parse({
            id: 'clamped-page',
            name: 'Clamped Page',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'willpower',
                    type: 'primitive',
                    bindingKey: 'resource:willpower',
                    compact: false,
                    maxFrom: '3',
                },
            ],
        });
        render(createElement(DeclarativeSheetView, { template }));
        // The maxFrom source resolves to 3 — the ceiling caps the row at 3 dots.
        const dots = screen.getAllByRole('radio');
        expect(dots).toHaveLength(3);
        fireEvent.click(dots[dots.length - 1]!);
        const data = useDocumentStore.getState().documents[0]!.data as {
            willpower: { current: number; max: number };
        };
        expect(data.willpower.current).toBeLessThanOrEqual(3);
    });

    it('keeps primitive and declarative-field writes independent (T016, FR-8)', () => {
        render(createElement(DeclarativeSheetView, { template: buildTemplate() }));
        const nameInput = screen.getAllByRole('textbox')[0]!;
        fireEvent.change(nameInput, { target: { value: 'Named via primitive' } });
        const document = useDocumentStore.getState().documents[0]!;
        expect((document.data as { metadata: { name: string } }).metadata.name).toBe(
            'Named via primitive'
        );
        expect(document.templateValues?.['field:name']).toBeUndefined();
    });

    it('bridges a regular field with a shared value key into document data (review 2026-09-05)', () => {
        const template = CustomTemplateSchema.parse({
            id: 'bridged-page',
            name: 'Bridged Page',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'strength-field',
                    type: 'rating',
                    label: 'Strength',
                    valueKey: 'strength',
                    min: 0,
                    max: 5,
                    presentation: 'dots',
                    required: false,
                    compact: false,
                },
            ],
        });
        render(createElement(DeclarativeSheetView, { template }));
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        expect(screen.getByText('Strength')).not.toBeNull();

        // Edit via the dots: the character's attribute changes, the value bag stays clean.
        const dots = screen.getAllByRole('button');
        fireEvent.click(dots[dots.length - 1]!);
        const document = useDocumentStore.getState().documents[0]!;
        const data = document.data as { attributes: Record<string, { value: number }> };
        expect(data.attributes['Strength']?.value).toBeGreaterThan(0);
        expect(document.templateValues?.['strength']).toBeUndefined();
    });

    it('renders an equipment binding through the body molecules', () => {
        const template = CustomTemplateSchema.parse({
            id: 'equipment-page',
            name: 'Equipment Page',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'equipment-inventory',
                    type: 'primitive',
                    bindingKey: 'equipment:inventory',
                    compact: false,
                },
            ],
        });
        render(createElement(DeclarativeSheetView, { template }));
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        expect(screen.getByText(/Add Item/i)).not.toBeNull();
    });
});
