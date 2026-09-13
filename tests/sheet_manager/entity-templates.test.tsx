// @vitest-environment jsdom

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    createDefaultCreatureData,
    createDefaultFodderData,
    createDefaultVehicleData,
    type CreatureData,
    FodderDataSchema,
    type VehicleData,
} from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import { resolveDocumentView } from '@site/src/sheet_manager/systems/view';
import { DocumentViewIdSchema } from '@site/src/sheet_manager/types/document';
import type { CustomTemplate, TemplateNode } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

const RENDER_TIMEOUT = 20_000;

function template(id: string): CustomTemplate {
    return systemRegistry.getSystem('star-wars-wod')!.defaultTemplates!.find((t) => t.id === id)!;
}

function seed(
    data: unknown,
    kind: string,
    definitionId: string,
    templateValues: Record<string, unknown> = {},
    extra: unknown[] = []
) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-entity',
                kind,
                systemId: 'star-wars-wod',
                definitionId,
                schemaVersion: 1,
                metadata: { title: 'Entity', tags: [] },
                templateValues,
                data,
            } as never,
            ...(extra as never[]),
        ],
        currentDocumentId: 'doc-entity',
    });
}

const current = () => useDocumentStore.getState().documents.find(({ id }) => id === 'doc-entity')!;

function nodeIds(nodes: readonly TemplateNode[]): string[] {
    return nodes.flatMap((node) => [
        node.id,
        ...(node.type === 'section' || node.type === 'group' ? nodeIds(node.children) : []),
    ]);
}

function bindingKeys(nodes: readonly TemplateNode[]): string[] {
    return nodes.flatMap((node) => [
        ...(node.type === 'primitive' || (node.type === 'list' && node.bindingKey)
            ? [node.bindingKey!]
            : []),
        ...('valueKey' in node && node.valueKey ? [node.valueKey] : []),
        ...(node.type === 'section' || node.type === 'group' ? bindingKeys(node.children) : []),
    ]);
}

/** Conversion book sheet coverage (SC-001) plus the FR-004 additions, as storage addresses. */
const COVERAGE: Record<string, readonly string[]> = {
    'creature-sheet': [
        'name',
        'species',
        'creature-type',
        'field:scale',
        'size',
        'owner',
        'strength',
        'dexterity',
        'stamina',
        'perception',
        'intelligence',
        'wits',
        'list:abilities',
        'resource:willpower',
        'armor-name',
        'armor-armor-rating',
        'rows:attacks',
        'track:members-health',
        'notes',
        // additions
        'creature-merits',
        'creature-flaws',
        'movement',
        'threat-tier',
        'description',
        'source',
    ],
    'vehicle-sheet': [
        'name',
        'model',
        'owner',
        'field:scale',
        'crew',
        'length',
        'cargo-capacity',
        'passengers',
        'consumables',
        'resource:durability',
        'resource:maneuverability',
        'speed',
        'altitude',
        'resource:communications-sensors',
        'sensor-range',
        'resource:hyperdrive',
        'navigation-computer',
        'resource:shields',
        'resource:front-shields',
        'resource:rear-shields',
        'rows:configuration',
        'rows:weapons',
        'track:members-damage',
        'notes',
        // additions
        'category',
        'durability-reroll',
        'vehicle-systems',
        'crew-pilot',
        'crew-copilot',
        'crew-gunners',
        'crew-engineer',
        'crew-sensors',
        'crew-comms',
        'vehicle-modifications',
        'description',
    ],
    'fodder-sheet': [
        'concept',
        'notes',
        'strength',
        'dexterity',
        'stamina',
        'charisma',
        'manipulation',
        'appearance',
        'perception',
        'intelligence',
        'wits',
        'list:abilities',
        'resource:willpower',
        'armor-name',
        'armor-armor-rating',
        'armor-dexterity-modifier',
        'rows:weapons',
        'track:members-health',
        // additions
        'leader',
        'quick-pool-specialty',
        'quick-pool-secondary',
    ],
};

function tableKeys(nodes: readonly TemplateNode[]): string[] {
    return nodes.flatMap((node) => [
        ...(node.type === 'table' ? [node.valueKey ?? node.id] : []),
        ...(node.type === 'section' || node.type === 'group' ? tableKeys(node.children) : []),
    ]);
}

describe('shipped entity templates (feature 007)', () => {
    afterEach(cleanup);

    it('cover the conversion sheets and the GM additions', () => {
        for (const [id, expected] of Object.entries(COVERAGE)) {
            const addresses = new Set([
                ...bindingKeys(template(id).children),
                ...tableKeys(template(id).children),
                ...nodeIds(template(id).children),
            ]);
            for (const address of expected) {
                expect(addresses.has(address), `${id}: ${address}`).toBe(true);
            }
        }
    });

    it('collapse the secondary sections by default', () => {
        const collapsed = (id: string) =>
            template(id)
                .children.filter((node) => node.type === 'section' && node.defaultCollapsed)
                .map(({ id: nodeId }) => nodeId);
        expect(collapsed('creature-sheet')).toEqual(['details']);
        expect(collapsed('vehicle-sheet')).toEqual(['modifications', 'details']);
        expect(collapsed('fodder-sheet')).toEqual(['quick-pools', 'details']);
    });

    it.each([
        ['creature-sheet', 'creature', 'creature', createDefaultCreatureData],
        ['creature-brief', 'creature', 'creature', createDefaultCreatureData],
        ['vehicle-sheet', 'vehicle', 'vehicle', createDefaultVehicleData],
        ['vehicle-brief', 'vehicle', 'vehicle', createDefaultVehicleData],
        ['fodder-sheet', 'group', 'fodder-group', createDefaultFodderData],
        ['fodder-brief', 'group', 'fodder-group', createDefaultFodderData],
    ])(
        '%s renders a default document without degradation',
        (id, kind, definitionId, create) => {
            seed(create(), kind, definitionId);
            render(createElement(DeclarativeSheetView, { template: template(id) }));
            expect(screen.queryAllByRole('alert')).toHaveLength(0);
        },
        RENDER_TIMEOUT
    );

    it(
        'fills a creature from the bestiary, overwriting only mapped values',
        () => {
            const data = createDefaultCreatureData();
            data.name = 'Old Snowy';
            data.notes = 'Keep me';
            seed(data, 'creature', 'creature');
            render(createElement(DeclarativeSheetView, { template: template('creature-sheet') }));
            const bestiary = screen.getByRole('combobox', { name: 'Bestiary entry' });

            fireEvent.change(bestiary, { target: { value: 'wampa' } });
            let stored = current().data as CreatureData;
            expect(stored.species).toBe('Wampa');
            expect(stored.attributes.Strength.value).toBe(5);
            expect(stored.willpower).toEqual({ current: 5, max: 5 });
            expect(stored.attacks.map(({ name }) => name)).toEqual(['Claw', 'Teeth']);
            expect(stored.armor.name).toBe('Tough hide');
            expect(stored.name).toBe('Old Snowy');
            expect(stored.notes).toBe('Keep me');
            expect(current().templateValues?.['creature-merits']).toHaveLength(3);
            expect(current().templateValues?.movement).toBe('Tracking, Walking');

            fireEvent.change(bestiary, { target: { value: 'rancor' } });
            stored = current().data as CreatureData;
            expect(stored.species).toBe('Rancor');
            expect(stored.name).toBe('Old Snowy');
            expect(stored.members).toHaveLength(1);
        },
        RENDER_TIMEOUT
    );

    it(
        'switches the soak reminder with the threat tier',
        () => {
            seed(createDefaultCreatureData(), 'creature', 'creature');
            render(createElement(DeclarativeSheetView, { template: template('creature-sheet') }));
            expect(screen.getByText('Soak (lethal and bashing)')).toBeTruthy();
            expect(screen.queryByText('Soak (bashing only)')).toBeNull();
            fireEvent.change(screen.getByRole('combobox', { name: 'Threat tier' }), {
                target: { value: 'fodder' },
            });
            expect(screen.getByText('Soak (bashing only)')).toBeTruthy();
            expect(screen.queryByText('Soak (lethal and bashing)')).toBeNull();
        },
        RENDER_TIMEOUT
    );

    it(
        'fills a vehicle from the catalog without touching crew stations or its name',
        () => {
            const data = createDefaultVehicleData();
            data.name = 'Red Five';
            seed(data, 'vehicle', 'vehicle', { 'crew-pilot': 'pilot-doc' }, [
                {
                    id: 'pilot-doc',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Luke', tags: [] },
                    templateValues: {},
                    data: {},
                },
            ]);
            render(createElement(DeclarativeSheetView, { template: template('vehicle-sheet') }));
            fireEvent.change(screen.getByRole('combobox', { name: 'Catalog model' }), {
                target: { value: 'x-wing' },
            });
            const stored = current().data as VehicleData;
            expect(stored.model).toBe('Incom T-65B X-wing');
            expect(stored.scale).toBe('starfighter');
            expect(stored.maneuverability).toBe(3);
            expect(stored.weapons[0]?.arc).toBe('front');
            expect(stored.name).toBe('Red Five');
            expect(current().templateValues?.['crew-pilot']).toBe('pilot-doc');
            expect(current().templateValues?.category).toBe('Space superiority fighter');
            expect(current().metadata.title).toBe('Entity');
        },
        RENDER_TIMEOUT
    );

    it(
        'shows every stored value of a pre-feature creature',
        () => {
            const data = createDefaultCreatureData();
            Object.assign(data, {
                name: 'Legacy Rancor',
                species: 'Rancor',
                size: '5m',
                owner: 'Jabba',
            });
            data.attacks = [{ id: 'a1', name: 'Bite', type: 'L', damage: 'STR+2D', range: '' }];
            seed(data, 'creature', 'creature');
            render(createElement(DeclarativeSheetView, { template: template('creature-sheet') }));
            for (const value of ['Legacy Rancor', 'Rancor', '5m', 'Jabba', 'Bite', 'STR+2D']) {
                expect(screen.getAllByDisplayValue(value).length, value).toBeGreaterThan(0);
            }
        },
        RENDER_TIMEOUT
    );

    it(
        'keeps a pre-feature fodder group on its full seven-level track',
        () => {
            const legacy = { ...createDefaultFodderData() } as Record<string, unknown>;
            delete legacy.trackLength;
            seed(FodderDataSchema.parse(legacy), 'group', 'fodder-group');
            render(createElement(DeclarativeSheetView, { template: template('fodder-sheet') }));
            expect(screen.getByText('Bruised')).toBeTruthy();
            expect(screen.getByText('Mauled')).toBeTruthy();
        },
        RENDER_TIMEOUT
    );

    it('resolves stored shared brief ids to each kind’s own brief', () => {
        for (const [definitionId, brief] of [
            ['creature', 'creature-brief'],
            ['vehicle', 'vehicle-brief'],
            ['fodder-group', 'fodder-brief'],
        ] as const) {
            const definition = systemRegistry.getDocumentDefinition('star-wars-wod', definitionId)!;
            for (const legacy of ['brief', 'npc-card']) {
                expect(
                    resolveDocumentView(definition, DocumentViewIdSchema.parse(legacy))?.id
                ).toBe(brief);
            }
        }
    });
});

describe('setting neutrality of the shared template layer (feature 007, FR-010/011)', () => {
    const root = path.resolve(__dirname, '../../src/sheet_manager');
    const files = (directory: string): string[] =>
        readdirSync(directory).flatMap((entry) => {
            const full = path.join(directory, entry);
            return statSync(full).isDirectory() ? files(full) : [full];
        });
    const neutral = [
        path.join(root, 'templates/builders.ts'),
        path.join(root, 'systems/templateBindings.ts'),
        ...files(path.join(root, 'features/sheet/declarative')),
    ];

    it('contains no Star Wars identifiers or imports', () => {
        for (const file of neutral) {
            const source = readFileSync(file, 'utf8');
            expect(source, file).not.toMatch(/star-wars-wod/);
            expect(source, file).not.toMatch(
                /'(creature|vehicle|fodder|fodder-group|starfighter|speeder|turret)'/
            );
        }
    });
});
