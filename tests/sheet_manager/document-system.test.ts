import { migrateDocumentStoreState } from '@site/src/sheet_manager/store/documentStore';
import type { SystemPlugin } from '@site/src/sheet_manager/systems';
import {
    createWodSheetProfileVariant,
    defineWodSheetProfile,
    resolveDocumentView,
    starWarsCharacterDefinition,
    starWarsCreatureDefinition,
    starWarsDroidDefinition,
    starWarsFodderDefinition,
    starWarsVehicleDefinition,
    starWarsWodProfile,
    starWarsWodSystem,
    SystemRegistry,
} from '@site/src/sheet_manager/systems';
import { DroidDataSchema } from '@site/src/sheet_manager/systems/star-wars-wod';
import { createDefaultCharacter } from '@site/src/sheet_manager/types/character';
import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
    SystemIdSchema,
} from '@site/src/sheet_manager/types/document';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { takeSheetIssues } from '../setup/sheetIssues';

describe('custom document templates', () => {
    it('accepts custom document kinds, bounded fields, tables, and references', () => {
        const template = CustomTemplateSchema.parse({
            id: 'campaign-organization',
            name: 'Campaign Organization',
            documentKind: 'organization',
            schemaVersion: 3,
            children: [
                {
                    id: 'identity',
                    type: 'section',
                    title: 'Identity',
                    children: [
                        {
                            id: 'name',
                            label: 'Name',
                            type: 'text',
                            required: true,
                            compact: false,
                            multiline: false,
                        },
                        {
                            id: 'influence',
                            label: 'Influence',
                            type: 'rating',
                            max: 10,
                            min: 0,
                            presentation: 'dots',
                            required: false,
                            compact: false,
                        },
                        {
                            id: 'allies',
                            label: 'Allies',
                            type: 'reference',
                            targetKinds: ['character', 'organization'],
                            multiple: true,
                            required: false,
                            compact: false,
                        },
                        {
                            id: 'members',
                            type: 'table',
                            minRows: 0,
                            maxRows: 100,
                            columns: [
                                {
                                    id: 'name',
                                    label: 'Name',
                                    type: 'text',
                                    required: false,
                                    compact: false,
                                    multiline: false,
                                },
                                {
                                    id: 'active',
                                    label: 'Active',
                                    type: 'toggle',
                                    required: false,
                                    compact: false,
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        expect(template.documentKind).toBe('organization');
        const identity = template.children[0]!;
        if (identity.type !== 'section' && identity.type !== 'group') {
            throw new Error('expected a container');
        }
        expect(identity.children).toHaveLength(4);
    });

    it('rejects duplicate IDs and invalid numeric bounds', () => {
        const result = CustomTemplateSchema.safeParse({
            id: 'broken-template',
            name: 'Broken Template',
            documentKind: 'event',
            schemaVersion: 3,
            children: [
                {
                    id: 'details',
                    type: 'section',
                    title: 'Details',
                    children: [
                        {
                            id: 'score',
                            label: 'Score',
                            type: 'number',
                            min: 10,
                            max: 1,
                            required: false,
                            compact: false,
                        },
                    ],
                },
            ],
        });

        expect(result.success).toBe(false);
    });

    it('rejects duplicate select option IDs', () => {
        const result = CustomTemplateSchema.safeParse({
            id: 'duplicate-options',
            name: 'Duplicate Options',
            documentKind: 'item',
            schemaVersion: 3,
            children: [
                {
                    id: 'details',
                    type: 'section',
                    title: 'Details',
                    children: [
                        {
                            id: 'quality',
                            label: 'Quality',
                            type: 'select',
                            multiple: false,
                            options: [
                                { id: 'standard', label: 'Standard' },
                                { id: 'standard', label: 'Also standard' },
                            ],
                            required: false,
                            compact: false,
                        },
                    ],
                },
            ],
        });

        expect(result.success).toBe(false);
    });
});

describe('system registry', () => {
    it('registers every Star Wars document family with named views', () => {
        expect(starWarsWodSystem.documents.map(({ id }) => id)).toEqual([
            'character',
            'droid',
            'creature',
            'vehicle',
            'fodder-group',
        ]);
        expect(starWarsCharacterDefinition.views.map(({ id }) => id)).toEqual([
            'full-sheet',
            'brief',
        ]);
        expect(starWarsDroidDefinition.views.map(({ id }) => id)).toEqual(['droid-sheet', 'brief']);
        expect(starWarsCreatureDefinition.views.map(({ id }) => id)).toEqual([
            'creature-sheet',
            'brief',
        ]);
        expect(starWarsVehicleDefinition.views.map(({ id }) => id)).toEqual([
            'vehicle-sheet',
            'brief',
        ]);
        expect(starWarsFodderDefinition.views.map(({ id }) => id)).toEqual([
            'fodder-sheet',
            'brief',
        ]);

        for (const definition of starWarsWodSystem.documents) {
            expect(definition.schema.safeParse(definition.createDefault()).success).toBe(true);
            expect(definition.views.some(({ id }) => id === definition.defaultViewId)).toBe(true);
        }
        expect(starWarsDroidDefinition.kind).toBe('character');
        expect(starWarsCreatureDefinition.kind).toBe('creature');
        expect(starWarsVehicleDefinition.kind).toBe('vehicle');
        expect(starWarsFodderDefinition.kind).toBe('group');

        const droidLayout = starWarsDroidDefinition.views[0].layout;
        expect(droidLayout.type).toBe('built-in');
        if (droidLayout.type === 'built-in') {
            expect(droidLayout.blocks.map(({ id }) => id)).toEqual([
                'base',
                'attributes',
                'skills',
                'advantages',
                'force',
                'body',
                'other',
            ]);
        }
    });

    it('resolves the retired npc-card ID to the standard brief capability', () => {
        const view = resolveDocumentView(
            starWarsCharacterDefinition,
            DocumentViewIdSchema.parse('npc-card')
        );

        expect(view?.id).toBe('brief');
    });

    it('adapts droid damage and built-in equipment through the character capability', () => {
        const capability = starWarsDroidDefinition.capabilities?.character;
        const data = starWarsDroidDefinition.createDefault();
        expect(capability).toBeDefined();

        const character = capability!.read('droid-1', data);
        const updated = DroidDataSchema.parse(
            capability!.applyUpdates(data, {
                health: {
                    levels: ['slash', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
                },
                inventory: [
                    {
                        id: 'tool-1',
                        text: 'Integrated scanner',
                        description: '',
                        effects: '',
                        weight: '',
                        price: '',
                        quantity: 1,
                        maxQuantity: 1,
                        equipped: true,
                    },
                ],
            })
        );

        expect(character.metadata.type).toBe('droid');
        expect(updated.damage.levels[0]).toBe('slash');
        expect(updated.builtInEquipment[0].text).toBe('Integrated scanner');
    });

    it('validates a registered document envelope with the selected system schema', () => {
        const registry = new SystemRegistry([
            {
                id: SystemIdSchema.parse('star-wars-wod'),
                label: 'Star Wars WoD 2e',
                documents: [starWarsCharacterDefinition],
            },
        ]);

        const result = registry.parseDocument({
            id: 'character-1',
            kind: 'character',
            systemId: 'star-wars-wod',
            definitionId: 'character',
            schemaVersion: 1,
            metadata: { title: 'Jax Vorn' },
            data: createDefaultCharacter(),
        });

        expect(result.definition.id).toBe('character');
        expect(result.envelope.data).toMatchObject({ metadata: { name: '' } });
    });

    it('rejects newer documents before their data can be stripped by an older schema', () => {
        const registry = new SystemRegistry([
            {
                id: SystemIdSchema.parse('star-wars-wod'),
                label: 'Star Wars WoD 2e',
                documents: [starWarsCharacterDefinition],
            },
        ]);

        expect(() =>
            registry.parseDocument({
                id: 'future-character',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'character',
                schemaVersion: 2,
                metadata: {},
                data: createDefaultCharacter(),
            })
        ).toThrow('newer than supported');
    });

    it('runs an explicit migration before validating older document data', () => {
        const plugin: SystemPlugin = {
            id: SystemIdSchema.parse('custom-system'),
            label: 'Custom System',
            documents: [
                {
                    id: DocumentDefinitionIdSchema.parse('event'),
                    kind: DocumentKindSchema.parse('event'),
                    label: 'Event',
                    schemaVersion: 2,
                    schema: z.object({ title: z.string() }),
                    createDefault: () => ({ title: '' }),
                    defaultViewId: DocumentViewIdSchema.parse('default'),
                    views: [
                        {
                            id: DocumentViewIdSchema.parse('default'),
                            label: { id: 'test.event.views.default', message: 'Default' },
                            layout: { type: 'built-in', blocks: [] },
                        },
                    ],
                    migrate: (data, fromVersion) => {
                        if (fromVersion !== 1 || typeof data !== 'string') return undefined;
                        return { title: data };
                    },
                },
            ],
        };
        const registry = new SystemRegistry([plugin]);

        const result = registry.parseDocument({
            id: 'event-1',
            kind: 'event',
            systemId: 'custom-system',
            definitionId: 'event',
            schemaVersion: 1,
            metadata: {},
            data: 'The eclipse',
        });

        expect(result.envelope.schemaVersion).toBe(2);
        expect(result.envelope.data).toEqual({ title: 'The eclipse' });
    });

    it('rejects duplicate system and definition IDs', () => {
        const plugin: SystemPlugin = {
            id: SystemIdSchema.parse('duplicate-system'),
            label: 'Duplicate System',
            documents: [starWarsCharacterDefinition, starWarsCharacterDefinition],
        };

        expect(() => new SystemRegistry([plugin])).toThrow('Duplicate document definition ID');
        expect(
            () =>
                new SystemRegistry([
                    { ...plugin, documents: [starWarsCharacterDefinition] },
                    { ...plugin, documents: [starWarsCharacterDefinition] },
                ])
        ).toThrow('Duplicate system ID');
    });

    it('rejects duplicate views and missing default views', () => {
        const duplicateViews = {
            ...starWarsCharacterDefinition,
            views: [starWarsCharacterDefinition.views[0], starWarsCharacterDefinition.views[0]],
        };
        expect(
            () =>
                new SystemRegistry([
                    {
                        id: SystemIdSchema.parse('view-system'),
                        label: 'View System',
                        documents: [duplicateViews],
                    },
                ])
        ).toThrow('Duplicate document view ID');

        expect(
            () =>
                new SystemRegistry([
                    {
                        id: SystemIdSchema.parse('view-system'),
                        label: 'View System',
                        documents: [
                            {
                                ...starWarsCharacterDefinition,
                                defaultViewId: DocumentViewIdSchema.parse('missing'),
                            },
                        ],
                    },
                ])
        ).toThrow('Missing default document view');
    });
});

describe('WoD-family sheet profiles', () => {
    it('creates a bounded variant without copying or mutating the base profile', () => {
        const vampireProfile = createWodSheetProfileVariant(starWarsWodProfile, {
            id: 'vampire-modern',
            label: 'Vampire: modern nights',
            traitGroups: [
                ...starWarsWodProfile.traitGroups.filter(({ role }) => role !== 'special'),
                {
                    id: 'disciplines',
                    label: 'Disciplines',
                    role: 'special',
                    traits: [
                        {
                            id: 'celerity',
                            key: 'Celerity',
                            label: 'Celerity',
                            minimum: 0,
                            maximum: 5,
                        },
                    ],
                },
            ],
            resources: [
                {
                    id: 'blood-pool',
                    label: 'Blood Pool',
                    mode: 'pool',
                    minimum: 0,
                    maximum: 10,
                },
            ],
        });

        expect(vampireProfile.traitGroups.some(({ id }) => id === 'disciplines')).toBe(true);
        expect(vampireProfile.traitGroups.some(({ id }) => id === 'force-skills')).toBe(false);
        expect(vampireProfile.resources.map(({ id }) => id)).toEqual(['blood-pool']);
        expect(starWarsWodProfile.traitGroups.some(({ id }) => id === 'force-skills')).toBe(true);
    });

    it('rejects duplicate configuration IDs at the profile boundary', () => {
        expect(() =>
            defineWodSheetProfile({
                id: 'broken-profile',
                label: 'Broken profile',
                traitGroups: [
                    {
                        id: 'attributes',
                        label: 'Attributes',
                        role: 'attribute',
                        traits: [
                            { id: 'strength', key: 'Strength', label: 'Strength', maximum: 5 },
                            { id: 'strength', key: 'Other', label: 'Other', maximum: 5 },
                        ],
                    },
                ],
            })
        ).toThrow();
    });
});

describe('document store migration', () => {
    it('moves legacy characters into envelopes without duplicating their IDs in data', () => {
        const character = createDefaultCharacter();
        character.metadata.name = 'Mara';
        const migrated = migrateDocumentStoreState({
            characters: [character],
            currentCharacter: character,
        });

        expect(migrated.currentDocumentId).toBe(character.id);
        expect(migrated.documents[0]).toMatchObject({
            id: character.id,
            definitionId: 'character',
            metadata: { title: 'Mara', preferredViewId: 'full-sheet' },
        });
        expect(migrated.documents[0].data).not.toHaveProperty('id');
    });

    it('converts legacy droids and retains invalid entries for recovery', () => {
        const droid = createDefaultCharacter();
        droid.metadata.type = 'droid';
        const invalid = { id: 'broken' };
        const migrated = migrateDocumentStoreState({
            characters: [droid, invalid],
            currentCharacter: droid,
        });

        expect(migrated.documents[0].definitionId).toBe('droid');
        expect(migrated.documents[0].data).toHaveProperty('damage');
        expect(migrated.recoveryEntries).toEqual([invalid]);
        expect(takeSheetIssues()).toEqual([
            expect.objectContaining({
                code: 'document-recovered',
                details: expect.objectContaining({ documentId: 'broken' }),
            }),
        ]);
    });
});
