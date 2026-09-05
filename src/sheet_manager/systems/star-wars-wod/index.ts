import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { BaseCharacter } from '../../types/character';
import { BaseCharacterSchema } from '../../types/character';
import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
    SystemIdSchema,
} from '../../types/document';
import type {
    DocumentDefinition,
    DocumentViewLabel,
    SheetBlockPlacement,
    SystemPlugin,
} from '../types';
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

function builtInView(
    id: string,
    label: DocumentViewLabel,
    blocks: readonly SheetBlockPlacement[],
    legacyIds: readonly string[] = []
) {
    return {
        id: DocumentViewIdSchema.parse(id),
        label,
        layout: { type: 'built-in' as const, blocks },
        legacyIds: legacyIds.map((legacyId) => DocumentViewIdSchema.parse(legacyId)),
    };
}

const viewLabels = uiMessages.sheet.documents.views;

const CHARACTER_FULL_VIEW = builtInView('full-sheet', viewLabels.fullSheet, [
    { id: 'base', accentColor: 'primary' },
    { id: 'attributes', accentColor: 'secondary' },
    { id: 'skills', accentColor: 'primary' },
    { id: 'advantages', accentColor: 'secondary' },
    { id: 'force', accentColor: 'primary' },
    { id: 'body', accentColor: 'secondary' },
    { id: 'other', accentColor: 'primary' },
]);
const BRIEF_VIEW = builtInView('brief', viewLabels.brief, [{ id: 'brief-document' }], ['npc-card']);

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
const DROID_FULL_VIEW = builtInView('droid-sheet', viewLabels.droidSheet, [
    { id: 'base', accentColor: 'primary' },
    { id: 'attributes', accentColor: 'secondary' },
    { id: 'skills', accentColor: 'primary' },
    { id: 'advantages', accentColor: 'secondary' },
    { id: 'force', accentColor: 'primary' },
    { id: 'body', accentColor: 'secondary' },
    { id: 'other', accentColor: 'primary' },
]);
const CREATURE_FULL_VIEW = builtInView('creature-sheet', viewLabels.creatureSheet, [
    { id: 'star-wars-creature-sheet' },
]);
const VEHICLE_FULL_VIEW = builtInView('vehicle-sheet', viewLabels.vehicleSheet, [
    { id: 'star-wars-vehicle-sheet' },
]);
const FODDER_VIEW = builtInView('fodder-sheet', viewLabels.fodderSheet, [
    { id: 'star-wars-fodder-sheet' },
]);

export const starWarsCharacterDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('character'),
    kind: DocumentKindSchema.parse('character'),
    label: 'Character',
    schemaVersion: 1,
    schema: StarWarsCharacterDataSchema,
    createDefault: createDefaultStarWarsCharacterData,
    defaultViewId: CHARACTER_FULL_VIEW.id,
    views: [CHARACTER_FULL_VIEW, BRIEF_VIEW],
    capabilities: { character: characterCapability },
};

export const starWarsDroidDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('droid'),
    kind: DocumentKindSchema.parse('character'),
    label: 'Droid',
    schemaVersion: 1,
    schema: DroidDataSchema,
    createDefault: createDefaultDroidData,
    defaultViewId: DROID_FULL_VIEW.id,
    views: [DROID_FULL_VIEW, BRIEF_VIEW],
    capabilities: { character: droidCharacterCapability },
};

export const starWarsCreatureDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('creature'),
    kind: DocumentKindSchema.parse('creature'),
    label: 'Creature',
    schemaVersion: 1,
    schema: CreatureDataSchema,
    createDefault: createDefaultCreatureData,
    defaultViewId: CREATURE_FULL_VIEW.id,
    views: [CREATURE_FULL_VIEW, BRIEF_VIEW],
};

export const starWarsVehicleDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('vehicle'),
    kind: DocumentKindSchema.parse('vehicle'),
    label: 'Vehicle',
    schemaVersion: 1,
    schema: VehicleDataSchema,
    createDefault: createDefaultVehicleData,
    defaultViewId: VEHICLE_FULL_VIEW.id,
    views: [VEHICLE_FULL_VIEW, BRIEF_VIEW],
};

export const starWarsFodderDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('fodder-group'),
    kind: DocumentKindSchema.parse('group'),
    label: 'Fodder group',
    schemaVersion: 1,
    schema: FodderDataSchema,
    createDefault: createDefaultFodderData,
    defaultViewId: FODDER_VIEW.id,
    views: [FODDER_VIEW, BRIEF_VIEW],
};

export const starWarsWodSystem: SystemPlugin = {
    id: STAR_WARS_WOD_SYSTEM_ID,
    label: 'Star Wars WoD 2e',
    documents: [
        starWarsCharacterDefinition,
        starWarsDroidDefinition,
        starWarsCreatureDefinition,
        starWarsVehicleDefinition,
        starWarsFodderDefinition,
    ],
};

export * from './profile';
export * from './schema';
