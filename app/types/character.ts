import { z } from 'zod';

export const CharacterTypeSchema = z.enum(['sentient', 'droid', 'vehicle']);

export const ConditionMarkSchema = z.enum(['empty', 'slash', 'cross']);
export type ConditionMark = z.infer<typeof ConditionMarkSchema>;

export const CharacterMetadataSchema = z.object({
    name: z.string().min(1),
    type: CharacterTypeSchema,
    template: z.string().min(1),
    player: z.string().optional(),
    adventure: z.string().optional(),
    concept: z.string().optional(),
    nature: z.string().optional(),
    demeanor: z.string().optional(),
    species: z.string().optional(),
    homeWorld: z.string().optional(),
    age: z.string().optional(),
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
    for (let i = 0; i < 6; i++) {
        if (levels[i] !== 'empty') {
            return HEALTH_LEVELS[i].penalty;
        }
    }
    return 0;
}

export const ItemSchema = z.object({
    id: z.string(),
    text: z.string(),
});

export const ArmorItemSchema = z.object({
    id: z.string(),
    type: z.string(),
    classVal: z.string(),
    ar: z.string(),
    dex: z.string(),
});

export const WeaponItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    damage: z.string(),
    range: z.string(),
    ammo: z.string(),
});

export const CustomSkillSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: z.number().min(0).max(5),
    specialization: z.boolean().optional(),
    experienced: z.boolean().optional(),
    practiced: z.boolean().optional(),
});

export const BackgroundSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: z.number().min(0).max(5),
});

export const MeritFlawSchema = z.object({
    id: z.string(),
    points: z.number(),
    label: z.string(),
});

export type ArmorItem = z.infer<typeof ArmorItemSchema>;
export type WeaponItem = z.infer<typeof WeaponItemSchema>;
export type CustomSkill = z.infer<typeof CustomSkillSchema>;
export type Background = z.infer<typeof BackgroundSchema>;
export type MeritFlawItem = z.infer<typeof MeritFlawSchema>;

export const TraitModifierSchema = z.object({
    specialization: z.boolean().optional(),
    experienced: z.boolean().optional(),
    practiced: z.boolean().optional(),
});

export const TraitValueSchema = z.object({
    value: z.number().min(0).max(5),
    specializationText: z.string().optional(),
    ...TraitModifierSchema.shape,
});

export type TraitModifier = z.infer<typeof TraitModifierSchema>;
export type TraitValue = z.infer<typeof TraitValueSchema>;

export const BaseCharacterSchema = z.object({
    id: z.string().uuid(),
    metadata: CharacterMetadataSchema,
    attributes: z.record(TraitValueSchema),
    skills: z.record(TraitValueSchema),
    forceSkills: z.record(TraitValueSchema).optional(),
    virtues: z.record(TraitValueSchema).optional(),
    backgrounds: z.array(BackgroundSchema).optional(),
    merits: z.array(MeritFlawSchema).optional(),
    flaws: z.array(MeritFlawSchema).optional(),
    willpower: z.object({ current: z.number(), max: z.number() }).optional(),
    forcePoints: z.object({ current: z.number(), max: z.number() }).optional(),
    darkSideResistance: z.number().optional(),
    health: HealthSchema,
    inventory: z.array(ItemSchema),
    armor: z.array(ArmorItemSchema),
    weapons: z.array(WeaponItemSchema),
    experience: z
        .object({
            total: z.number().default(0),
            spent: z.number().default(0),
        })
        .optional(),
    customTalents: z.array(CustomSkillSchema),
    customSkills: z.array(CustomSkillSchema),
    customKnowledges: z.array(CustomSkillSchema),
    notes: z.string(),
});

export type CharacterType = z.infer<typeof CharacterTypeSchema>;
export type CharacterMetadata = z.infer<typeof CharacterMetadataSchema>;
export type Health = z.infer<typeof HealthSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type BaseCharacter = z.infer<typeof BaseCharacterSchema>;

export const DEFAULT_TRAIT_VALUE: TraitValue = {
    value: 1,
    specialization: false,
    experienced: false,
    practiced: false,
};

export function createDefaultCharacter(): BaseCharacter {
    return {
        id: crypto.randomUUID(),
        metadata: {
            name: 'New Character',
            type: 'sentient',
            template: 'standard',
            player: '',
            adventure: '',
            concept: '',
            nature: '',
            demeanor: '',
            species: '',
            homeWorld: '',
            age: '',
        },
        attributes: {
            Strength: { ...DEFAULT_TRAIT_VALUE },
            Dexterity: { ...DEFAULT_TRAIT_VALUE },
            Stamina: { ...DEFAULT_TRAIT_VALUE },
            Charisma: { ...DEFAULT_TRAIT_VALUE },
            Manipulation: { ...DEFAULT_TRAIT_VALUE },
            Appearance: { ...DEFAULT_TRAIT_VALUE },
            Perception: { ...DEFAULT_TRAIT_VALUE },
            Intelligence: { ...DEFAULT_TRAIT_VALUE },
            Wits: { ...DEFAULT_TRAIT_VALUE },
        },
        skills: {},
        forceSkills: {},
        virtues: {
            Conscience: { ...DEFAULT_TRAIT_VALUE },
            Passion: { ...DEFAULT_TRAIT_VALUE },
            'Self Control': { ...DEFAULT_TRAIT_VALUE },
        },
        backgrounds: [],
        merits: [],
        flaws: [],
        willpower: { current: 5, max: 5 },
        forcePoints: { current: 0, max: 10 },
        darkSideResistance: 5,
        health: {
            levels: ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        },
        inventory: [],
        armor: [],
        weapons: [],
        experience: { total: 0, spent: 0 },
        customTalents: [],
        customSkills: [],
        customKnowledges: [],
        notes: '',
    };
}
