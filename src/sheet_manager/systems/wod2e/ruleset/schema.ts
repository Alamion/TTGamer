import type { z } from 'zod';

import {
    BaseCharacterSchema,
    CharacterMetadataSchema,
    DEFAULT_ATTRIBUTE_VALUE,
} from '../../../types/character';

/**
 * The classic World of Darkness 2nd Edition character (spec 012, T-041): the engine part of the
 * shape the Star Wars conversion has always stored. Setting additions (Force, implants, species,
 * droids) are layered on by the setting; field names never change, so stored documents parse
 * exactly as before.
 */
export const Wod2eMetadataSchema = CharacterMetadataSchema.omit({
    type: true,
    template: true,
    species: true,
    homeWorld: true,
});

export const Wod2eCharacterDataSchema = BaseCharacterSchema.omit({
    id: true,
    metadata: true,
    forceSkills: true,
    forcePoints: true,
    darkSideResistance: true,
    forcePowerItems: true,
    implants: true,
}).extend({ metadata: Wod2eMetadataSchema });

/** Spreadable engine fields for settings built on the ruleset. */
export const Wod2eCoreShape = Wod2eCharacterDataSchema.shape;

/** What a setting adds to the engine character (the Star Wars conversion's own fields). */
export const StarWarsSettingShape = BaseCharacterSchema.pick({
    forceSkills: true,
    forcePoints: true,
    darkSideResistance: true,
    forcePowerItems: true,
    implants: true,
}).shape;

export type Wod2eCharacterData = z.infer<typeof Wod2eCharacterDataSchema>;

export const WOD2E_ATTRIBUTE_KEYS = [
    'Strength',
    'Dexterity',
    'Stamina',
    'Charisma',
    'Manipulation',
    'Appearance',
    'Perception',
    'Intelligence',
    'Wits',
] as const;

export const WOD2E_VIRTUE_KEYS = ['Conscience', 'Self-Control', 'Courage'] as const;

export function createDefaultWod2eCharacterData(): Wod2eCharacterData {
    return Wod2eCharacterDataSchema.parse({
        metadata: { name: '', biography: '', imageUrl: '' },
        attributes: Object.fromEntries(
            WOD2E_ATTRIBUTE_KEYS.map((key) => [key, { ...DEFAULT_ATTRIBUTE_VALUE }])
        ),
        skills: {},
        virtues: Object.fromEntries(
            WOD2E_VIRTUE_KEYS.map((key) => [key, { ...DEFAULT_ATTRIBUTE_VALUE }])
        ),
        backgrounds: [],
        merits: [],
        flaws: [],
        willpower: { current: 1, max: 1 },
        health: { levels: ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'] },
        inventory: [],
        armor: [],
        weapons: [],
        experience: { total: 0, spent: 0 },
        customTalents: [],
        customSkills: [],
        customKnowledges: [],
        notes: '',
    });
}
