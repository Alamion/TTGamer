import { generateId } from '@site/src/shared/utils/random';
import { z } from 'zod';

const dotValueSchema = z.number().finite().int().min(0).max(5);
const resourceValueSchema = z.number().finite().int().min(0).max(10);
const nonNegativeIntegerSchema = z.number().finite().int().nonnegative();
const resourcePairSchema = z
    .object({ current: resourceValueSchema, max: resourceValueSchema })
    .refine(({ current, max }) => current <= max, {
        message: 'Current value cannot exceed maximum value',
        path: ['current'],
    });

export const CharacterTypeSchema = z.enum(['sentient', 'droid', 'vehicle']);

export const ConditionMarkSchema = z.enum(['empty', 'slash', 'cross']);
export type ConditionMark = z.infer<typeof ConditionMarkSchema>;

export const CharacterMetadataSchema = z.object({
    name: z.string().default(''),
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

export const ItemSchema = z
    .object({
        id: z.string(),
        text: z.string(),
        description: z.string().default(''),
        effects: z.string().default(''),
        weight: z.string().default(''),
        price: z.string().default(''),
        quantity: nonNegativeIntegerSchema.default(1),
        maxQuantity: nonNegativeIntegerSchema.default(1),
        equipped: z.boolean().default(false),
    })
    .refine(({ maxQuantity, quantity }) => quantity <= maxQuantity, {
        message: 'Quantity cannot exceed maximum quantity',
        path: ['quantity'],
    });

export const ArmorItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    classVal: z.string(),
    ar: z.string(),
    dex: z.string(),
});

export const WeaponItemSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        damage: z.string(),
        range: z.string(),
        ammo: z.coerce.number().finite().int().nonnegative().default(0),
        maxAmmo: z.coerce.number().finite().int().nonnegative().default(0),
    })
    .refine(({ ammo, maxAmmo }) => ammo <= maxAmmo, {
        message: 'Ammo cannot exceed maximum ammo',
        path: ['ammo'],
    });

export const ImplantItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    effect: z.string(),
});

export const CustomSkillSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: dotValueSchema,
    specialization: z.boolean().optional(),
    experienced: z.boolean().optional(),
    practiced: z.boolean().optional(),
});

export const BackgroundSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: dotValueSchema,
    catalogId: z.string().optional(),
});

export const MeritFlawSchema = z.object({
    id: z.string(),
    points: z.number().finite().int().min(1).max(5),
    label: z.string(),
    catalogId: z.string().optional(),
});

export const ForcePowerItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    value: dotValueSchema.default(0),
    catalogId: z.string().optional(),
});

export type ArmorItem = z.infer<typeof ArmorItemSchema>;
export type WeaponItem = z.infer<typeof WeaponItemSchema>;
export type ImplantItem = z.infer<typeof ImplantItemSchema>;
export type CustomSkill = z.infer<typeof CustomSkillSchema>;
export type Background = z.infer<typeof BackgroundSchema>;
export type MeritFlawItem = z.infer<typeof MeritFlawSchema>;
export type ForcePowerItem = z.infer<typeof ForcePowerItemSchema>;

export const TraitModifierSchema = z.object({
    specialization: z.boolean().optional(),
    experienced: z.boolean().optional(),
    practiced: z.boolean().optional(),
});

export const TraitValueSchema = z.object({
    value: dotValueSchema,
    specializationText: z.string().optional(),
    ...TraitModifierSchema.shape,
});

export type TraitModifier = z.infer<typeof TraitModifierSchema>;
export type TraitValue = z.infer<typeof TraitValueSchema>;

export const BaseCharacterSchema = z.object({
    id: z.string(),
    metadata: CharacterMetadataSchema,
    attributes: z.record(TraitValueSchema),
    skills: z.record(TraitValueSchema),
    forceSkills: z.record(TraitValueSchema).optional(),
    virtues: z.record(TraitValueSchema).optional(),
    backgrounds: z.array(BackgroundSchema).default([]),
    merits: z.array(MeritFlawSchema).default([]),
    flaws: z.array(MeritFlawSchema).default([]),
    willpower: resourcePairSchema.optional(),
    forcePoints: resourcePairSchema.optional(),
    darkSideResistance: resourceValueSchema.optional(),
    forcePowerItems: z.array(ForcePowerItemSchema).default([]),
    health: HealthSchema,
    inventory: z.array(ItemSchema).default([]),
    armor: z.array(ArmorItemSchema).default([]),
    weapons: z.array(WeaponItemSchema).default([]),
    implants: z.array(ImplantItemSchema).default([]),
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

export type CharacterType = z.infer<typeof CharacterTypeSchema>;
export type CharacterMetadata = z.infer<typeof CharacterMetadataSchema>;
export type Health = z.infer<typeof HealthSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type BaseCharacter = z.infer<typeof BaseCharacterSchema>;

export const DEFAULT_ATTRIBUTE_VALUE: TraitValue = {
    value: 1,
    specialization: false,
    experienced: false,
    practiced: false,
};

export const DEFAULT_SKILL_VALUE: TraitValue = {
    ...DEFAULT_ATTRIBUTE_VALUE,
    value: 0,
};

export function createDefaultCharacter(): BaseCharacter {
    return {
        id: generateId(),
        metadata: {
            name: '',
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
            setting: 'Star Wars WoD 2e',
            gender: '',
            height: '',
            build: '',
            hair: '',
            eyes: '',
            features: '',
            biography: '',
            imageUrl: '',
        },
        attributes: {
            Strength: { ...DEFAULT_ATTRIBUTE_VALUE },
            Dexterity: { ...DEFAULT_ATTRIBUTE_VALUE },
            Stamina: { ...DEFAULT_ATTRIBUTE_VALUE },
            Charisma: { ...DEFAULT_ATTRIBUTE_VALUE },
            Manipulation: { ...DEFAULT_ATTRIBUTE_VALUE },
            Appearance: { ...DEFAULT_ATTRIBUTE_VALUE },
            Perception: { ...DEFAULT_ATTRIBUTE_VALUE },
            Intelligence: { ...DEFAULT_ATTRIBUTE_VALUE },
            Wits: { ...DEFAULT_ATTRIBUTE_VALUE },
        },
        skills: {},
        forceSkills: {},
        virtues: {
            Conscience: { ...DEFAULT_ATTRIBUTE_VALUE },
            Passion: { ...DEFAULT_ATTRIBUTE_VALUE },
            'Self Control': { ...DEFAULT_ATTRIBUTE_VALUE },
        },
        backgrounds: [],
        merits: [],
        flaws: [],
        willpower: { current: 5, max: 5 },
        forcePoints: { current: 0, max: 0 },
        darkSideResistance: 5,
        forcePowerItems: [],
        health: {
            levels: ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        },
        inventory: [],
        armor: [],
        weapons: [],
        implants: [],
        experience: { total: 0, spent: 0 },
        customTalents: [],
        customSkills: [],
        customKnowledges: [],
        notes: '',
    };
}
