import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { JAX_VORN_PRESET } from '../../data/presets';
import type { BaseCharacter } from '../../types/character';
import { BaseCharacterSchema } from '../../types/character';
import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
    SystemIdSchema,
} from '../../types/document';
import type { DocumentDefinition, DocumentViewLabel, SystemPlugin } from '../types';
import { classicWodTraitPool } from '../wod-like/dicePool';
import { starWarsCatalogs } from './catalogs';
import { characterDocumentFromBase } from './characterDocument';
import { starWarsWodDefaultTemplates } from './defaultTemplates';
import { starWarsTemplateBindings } from './documentBindings';
import { starWarsExampleDocument } from './examples';
import {
    createDefaultCreatureData,
    createDefaultDroidData,
    createDefaultFodderData,
    createDefaultStarWarsCharacterData,
    createDefaultVehicleData,
    CreatureDataSchema,
    DroidDataSchema,
    FodderDataSchema,
    StarWarsCharacterDataSchema,
    VehicleDataSchema,
} from './schema';

export const STAR_WARS_WOD_SYSTEM_ID = SystemIdSchema.parse('star-wars-wod');

const viewLabels = uiMessages.sheet.documents.views;
const typeLabels = uiMessages.sheet.documents.types;

/** A view whose page is the shipped default template with the same id. */
function templateView(id: string, label: DocumentViewLabel, legacyIds: readonly string[] = []) {
    return {
        id: DocumentViewIdSchema.parse(id),
        label,
        layout: { type: 'declarative' as const, templateId: id },
        legacyIds: legacyIds.map((legacyId) => DocumentViewIdSchema.parse(legacyId)),
    };
}

const CHARACTER_FULL_VIEW = templateView('full-sheet', viewLabels.fullSheet);
const BRIEF_VIEW = templateView('brief', viewLabels.brief, ['npc-card']);

function dataUpdates(updates: Partial<BaseCharacter>) {
    const next = { ...updates } as Record<string, unknown>;
    delete next.id;
    return next;
}

const characterCapability = {
    read: (documentId: string, data: unknown) =>
        BaseCharacterSchema.parse({ id: documentId, ...(data as Record<string, unknown>) }),
    applyUpdates: (data: unknown, updates: Partial<BaseCharacter>) =>
        StarWarsCharacterDataSchema.parse({
            ...StarWarsCharacterDataSchema.parse(data),
            ...dataUpdates(updates),
        }),
};

const droidCharacterCapability = {
    read: (documentId: string, data: unknown) => {
        const droid = DroidDataSchema.parse(data);
        return BaseCharacterSchema.parse({
            id: documentId,
            ...droid,
            health: droid.damage,
            inventory: droid.builtInEquipment,
        });
    },
    applyUpdates: (data: unknown, updates: Partial<BaseCharacter>) => {
        const next = dataUpdates(updates);
        if (next.health) {
            next.damage = next.health;
            delete next.health;
        }
        if (next.inventory) {
            next.builtInEquipment = next.inventory;
            delete next.inventory;
        }
        return DroidDataSchema.parse({ ...DroidDataSchema.parse(data), ...next });
    },
};
const DROID_FULL_VIEW = templateView('droid-sheet', viewLabels.droidSheet);
// Droids get their own brief page; documents saved with the shared brief id resolve to it.
const DROID_BRIEF_VIEW = templateView('droid-brief', viewLabels.brief, ['brief', 'npc-card']);
const CREATURE_FULL_VIEW = templateView('creature-sheet', viewLabels.creatureSheet);
const VEHICLE_FULL_VIEW = templateView('vehicle-sheet', viewLabels.vehicleSheet);
const FODDER_VIEW = templateView('fodder-sheet', viewLabels.fodderSheet);
// Entity documents saved with the shared brief id (or the older npc-card) open their own brief.
const CREATURE_BRIEF_VIEW = templateView('creature-brief', viewLabels.brief, ['brief', 'npc-card']);
const VEHICLE_BRIEF_VIEW = templateView('vehicle-brief', viewLabels.brief, ['brief', 'npc-card']);
const FODDER_BRIEF_VIEW = templateView('fodder-brief', viewLabels.brief, ['brief', 'npc-card']);

const exampleLabels = uiMessages.sheet.documents.examples;

/** A shipped example, built on demand (examples reference the definitions below). */
function example(id: string, label: DocumentViewLabel) {
    return {
        id,
        label,
        create: () => {
            const document = starWarsExampleDocument(id);
            if (!document) throw new Error(`Unknown Star Wars example ${id}`);
            return document;
        },
    };
}

export const starWarsCharacterDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('character'),
    kind: DocumentKindSchema.parse('character'),
    label: typeLabels.character,
    schemaVersion: 1,
    schema: StarWarsCharacterDataSchema,
    createDefault: createDefaultStarWarsCharacterData,
    defaultViewId: CHARACTER_FULL_VIEW.id,
    views: [CHARACTER_FULL_VIEW, BRIEF_VIEW],
    capabilities: { character: characterCapability },
    examples: [
        {
            id: JAX_VORN_PRESET.id,
            label: exampleLabels.jaxVorn,
            create: () => characterDocumentFromBase(JAX_VORN_PRESET),
        },
    ],
};

export const starWarsDroidDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('droid'),
    kind: DocumentKindSchema.parse('character'),
    label: typeLabels.droid,
    schemaVersion: 1,
    schema: DroidDataSchema,
    createDefault: createDefaultDroidData,
    defaultViewId: DROID_FULL_VIEW.id,
    views: [DROID_FULL_VIEW, DROID_BRIEF_VIEW],
    capabilities: { character: droidCharacterCapability },
};

export const starWarsCreatureDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('creature'),
    kind: DocumentKindSchema.parse('creature'),
    label: typeLabels.creature,
    schemaVersion: 1,
    schema: CreatureDataSchema,
    createDefault: createDefaultCreatureData,
    defaultViewId: CREATURE_FULL_VIEW.id,
    views: [CREATURE_FULL_VIEW, CREATURE_BRIEF_VIEW],
    examples: [example('wampa::preset', exampleLabels.wampa)],
};

export const starWarsVehicleDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('vehicle'),
    kind: DocumentKindSchema.parse('vehicle'),
    label: typeLabels.vehicle,
    schemaVersion: 1,
    schema: VehicleDataSchema,
    createDefault: createDefaultVehicleData,
    defaultViewId: VEHICLE_FULL_VIEW.id,
    views: [VEHICLE_FULL_VIEW, VEHICLE_BRIEF_VIEW],
    examples: [
        example('red-five::preset', exampleLabels.redFive),
        example('lukes-landspeeder::preset', exampleLabels.landspeeder),
        example('millennium-falcon::preset', exampleLabels.falcon),
    ],
};

export const starWarsFodderDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('fodder-group'),
    kind: DocumentKindSchema.parse('group'),
    label: typeLabels.fodderGroup,
    schemaVersion: 1,
    schema: FodderDataSchema,
    createDefault: createDefaultFodderData,
    defaultViewId: FODDER_VIEW.id,
    views: [FODDER_VIEW, FODDER_BRIEF_VIEW],
    examples: [example('stormtrooper-squad::preset', exampleLabels.stormtroopers)],
};

export const starWarsWodSystem: SystemPlugin = {
    id: STAR_WARS_WOD_SYSTEM_ID,
    label: uiMessages.sheet.documents.systems.starWarsWod,
    // A setting on the classic WoD 2e engine: the library lists it under that ruleset.
    ruleset: SystemIdSchema.parse('wod-2e'),
    documents: [
        starWarsCharacterDefinition,
        starWarsDroidDefinition,
        starWarsCreatureDefinition,
        starWarsVehicleDefinition,
        starWarsFodderDefinition,
    ],
    defaultTemplates: starWarsWodDefaultTemplates,
    templateBindings: starWarsTemplateBindings,
    catalogs: starWarsCatalogs,
    dice: { traitPool: classicWodTraitPool },
};

export * from './catalogs';
export * from './profile';
export * from './schema';
