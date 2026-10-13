import { z } from 'zod';

import { type ConditionMark, ConditionMarkSchema } from '../../../types/condition';
import { ArmorItemSchema, ItemSchema, WeaponItemSchema } from '../../../types/equipment';
import {
    BackgroundSchema,
    CustomSkillSchema,
    DEFAULT_ATTRIBUTE_VALUE,
    MeritFlawSchema,
    TraitValueSchema,
} from '../../../types/trait';

const resourceValueSchema = z.number().int().min(0).max(10);
const nonNegativeIntegerSchema = z.number().int().nonnegative();

/** A current/maximum pair; the current value never exceeds its maximum. */
export const ResourcePairSchema = z
    .object({ current: resourceValueSchema, max: resourceValueSchema })
    .refine(({ current, max }) => current <= max, {
        message: 'Current value cannot exceed maximum value',
        path: ['current'],
    });

export const HEALTH_LEVELS = [
    { name: 'Bruised', penalty: 0 },
    { name: 'Hurt', penalty: -1 },
    { name: 'Injured', penalty: -2 },
    { name: 'Wounded', penalty: -3 },
    { name: 'Mauled', penalty: -4 },
    { name: 'Crippled', penalty: -5 },
    { name: 'Incapacitated', penalty: 0 },
] as const;

export const HealthSchema = z.object({
    levels: z.array(ConditionMarkSchema).length(7),
});

export function calculateHealthPenalty(levels: ConditionMark[]): number {
    for (let i = HEALTH_LEVELS.length - 1; i >= 0; i--) {
        if (levels[i] !== 'empty') {
            return HEALTH_LEVELS[i].penalty;
        }
    }
    return 0;
}

/**
 * The classic World of Darkness 2nd Edition character (spec 012, T-041; the source of the shape
 * since spec 031): the engine part of what the Star Wars conversion has always stored. Setting
 * additions (Force, implants, species, droids) are layered on by the setting; field names never
 * change, so stored documents parse exactly as before.
 */
export const Wod2eMetadataSchema = z.object({
    name: z.string().default(''),
    player: z.string().optional(),
    owner: z.string().optional(),
    adventure: z.string().optional(),
    concept: z.string().optional(),
    nature: z.string().optional(),
    demeanor: z.string().optional(),
    age: z.string().optional(),
    setting: z.string().optional(),
    gender: z.string().optional(),
    height: z.string().optional(),
    build: z.string().optional(),
    hair: z.string().optional(),
    eyes: z.string().optional(),
    features: z.string().optional(),
    biography: z.string().optional(),
    imageUrl: z.string().optional(),
    /** Device-local IndexedDB key. Exported character JSON intentionally omits it. */
    portraitId: z.string().optional(),
});

export const Wod2eCharacterDataSchema = z.object({
    metadata: Wod2eMetadataSchema,
    attributes: z.record(z.string(), TraitValueSchema),
    skills: z.record(z.string(), TraitValueSchema),
    virtues: z.record(z.string(), TraitValueSchema).optional(),
    backgrounds: z.array(BackgroundSchema).default([]),
    merits: z.array(MeritFlawSchema).default([]),
    flaws: z.array(MeritFlawSchema).default([]),
    willpower: ResourcePairSchema.optional(),
    health: HealthSchema,
    inventory: z.array(ItemSchema).default([]),
    armor: z.array(ArmorItemSchema).default([]),
    weapons: z.array(WeaponItemSchema).default([]),
    experience: z
        .object({
            total: nonNegativeIntegerSchema.default(0),
            spent: nonNegativeIntegerSchema.default(0),
        })
        .refine(({ spent, total }) => spent <= total, {
            message: 'Spent experience cannot exceed total experience',
            path: ['spent'],
        })
        .optional(),
    customTalents: z.array(CustomSkillSchema).default([]),
    customSkills: z.array(CustomSkillSchema).default([]),
    customKnowledges: z.array(CustomSkillSchema).default([]),
    notes: z.string(),
});

/** Spreadable engine fields for settings built on the ruleset. */
export const Wod2eCoreShape = Wod2eCharacterDataSchema.shape;

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
