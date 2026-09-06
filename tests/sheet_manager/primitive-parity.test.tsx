// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    createDefaultCreatureData,
    createDefaultDroidData,
    createDefaultFodderData,
    createDefaultStarWarsCharacterData,
    createDefaultVehicleData,
} from '@site/src/sheet_manager/systems/star-wars-wod';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function defaultTemplate(id: string) {
    return systemRegistry.getSystem('star-wars-wod')?.defaultTemplates?.find((t) => t.id === id);
}

function seedDocument() {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-parity',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'character',
                schemaVersion: 1,
                metadata: { title: 'Parity Target', tags: [] },
                templateValues: {},
                data: createDefaultStarWarsCharacterData(),
            } as never,
        ],
        currentDocumentId: 'doc-parity',
    });
}

describe('primitive-composed default templates (feature 005)', () => {
    beforeEach(seedDocument);
    afterEach(cleanup);

    it('character full default covers identity, traits, lists, condition + legacy parts (T020)', () => {
        const template = defaultTemplate('full-sheet');
        expect(template).toBeDefined();
        render(createElement(DeclarativeSheetView, { template: template! }));
        // No degradation: every binding resolves and every legacy placement mounts.
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        // Identity fields (primitives).
        expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(8);
        // Attribute rows (primitives) — sample labels across the three groups.
        expect(screen.getAllByText('Strength').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Charisma').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Wits').length).toBeGreaterThan(0);
        // Ability rows — one from each ability group.
        expect(screen.getAllByText('Athletics').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Blaster').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Astrogation').length).toBeGreaterThan(0);
        // Condition primitives.
        expect(screen.getAllByText('Health').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Willpower').length).toBeGreaterThan(0);
        // Legacy placements mounted (advantages/force/body) — their content is present.
        expect(screen.getAllByText('Advantages').length).toBeGreaterThan(0);
    });

    it('droid/creature/vehicle/fodder defaults render without degradation (T021)', () => {
        const cases: Array<{
            viewId: string;
            document: Record<string, unknown>;
        }> = [
            {
                viewId: 'droid-sheet',
                document: {
                    id: 'doc-droid',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'droid',
                    schemaVersion: 1,
                    metadata: { title: 'Droid', tags: [] },
                    templateValues: {},
                    data: createDefaultDroidData(),
                },
            },
            {
                viewId: 'creature-sheet',
                document: {
                    id: 'doc-creature',
                    kind: 'creature',
                    systemId: 'star-wars-wod',
                    definitionId: 'creature',
                    schemaVersion: 1,
                    metadata: { title: 'Creature', tags: [] },
                    templateValues: {},
                    data: createDefaultCreatureData(),
                },
            },
            {
                viewId: 'vehicle-sheet',
                document: {
                    id: 'doc-vehicle',
                    kind: 'vehicle',
                    systemId: 'star-wars-wod',
                    definitionId: 'vehicle',
                    schemaVersion: 1,
                    metadata: { title: 'Vehicle', tags: [] },
                    templateValues: {},
                    data: createDefaultVehicleData(),
                },
            },
            {
                viewId: 'fodder-sheet',
                document: {
                    id: 'doc-fodder',
                    kind: 'group',
                    systemId: 'star-wars-wod',
                    definitionId: 'fodder-group',
                    schemaVersion: 1,
                    metadata: { title: 'Fodder', tags: [] },
                    templateValues: {},
                    data: createDefaultFodderData(),
                },
            },
        ];
        for (const { viewId, document } of cases) {
            cleanup();
            useDocumentStore.setState({
                documents: [document as never],
                currentDocumentId: document.id as string,
            });
            const template = defaultTemplate(viewId);
            expect(template, viewId).toBeDefined();
            render(createElement(DeclarativeSheetView, { template: template! }));
            expect(screen.queryAllByRole('alert')).toHaveLength(0);
        }
    });

    it('scenario: no Force, with Willpower, custom skills (T022, SC-002)', () => {
        // A user composes a variant: drop the Force/advantages/body legacy parts, keep the rest.
        const full = defaultTemplate('full-sheet')!;
        const variant = {
            ...full,
            id: 'no-force-variant',
            name: 'No Force Variant',
            sections: full.sections.map((section) =>
                section.id === 'legacy-parts'
                    ? {
                          ...section,
                          blocks: section.blocks.filter(
                              (block) =>
                                  !('blockId' in block) ||
                                  (block.blockId !== 'force' && block.blockId !== 'advantages')
                          ),
                      }
                    : section
            ),
        };
        render(createElement(DeclarativeSheetView, { template: variant as typeof full }));
        // Willpower (derived resource) is still present and rendered.
        expect(screen.getAllByText('Willpower').length).toBeGreaterThan(0);
        // Skills remain composable: they render as rows on the page.
        expect(screen.getAllByText('Blaster').length).toBeGreaterThan(0);
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    it('brief default is composed from bridged compact fields (T023/T024)', () => {
        const brief = defaultTemplate('brief');
        expect(brief).toBeDefined();
        // No legacy placement: the brief is field-composed. System-backed rows are regular
        // fields with shared value keys bridged to document data (review 2026-09-05); only the
        // condition track stays a primitive (fields cannot express it yet).
        for (const section of brief!.sections) {
            for (const block of section.blocks) {
                expect(['fields', 'primitive']).toContain(block.type);
                if (block.type === 'primitive') {
                    // Only the sanctioned custom primitives remain: tracks and preset lists.
                    expect(
                        block.type === 'primitive' &&
                            (block.bindingKey.startsWith('track:') ||
                                block.bindingKey.startsWith('list:'))
                    ).toBe(true);
                }
            }
        }
        // Compact flags ride on the bridged fields (brief-format rendering).
        const attributesSection = brief!.sections.find(({ id }) => id === 'attributes');
        const firstTrait = attributesSection?.blocks[0];
        expect(firstTrait?.type).toBe('fields');
        if (firstTrait?.type === 'fields') {
            expect(firstTrait.fields.every((f) => f.compact)).toBe(true);
        }
        render(createElement(DeclarativeSheetView, { template: brief! }));
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    it('legacy placements still render for pre-005 templates (T027, FR-12)', () => {
        const preUpgrade = {
            id: 'pre-005-template',
            name: 'Pre-005 Template',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 1,
            sections: [
                {
                    id: 'page',
                    title: 'Page',
                    presentation: 'plain',
                    blocks: [
                        { id: 'base', type: 'built-in', blockId: 'base' },
                        { id: 'skills', type: 'built-in', blockId: 'skills' },
                    ],
                },
            ],
        } as const;
        render(
            createElement(DeclarativeSheetView, {
                template: preUpgrade as unknown as Parameters<
                    typeof DeclarativeSheetView
                >[0]['template'],
            })
        );
        // Legacy path retained: the placements render (their content mounts), no crash.
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        expect(screen.getAllByText('Skills').length).toBeGreaterThan(0);
    });
});
