import { z } from 'zod';

import { ItemSchema, WeaponItemSchema } from '../../../types/character';
import { V5_ATTRIBUTE_KEYS, V5_SKILL_KEYS } from './profile';

/** Validation limits of the V5 core data (data-model.md). */
export const V5_LIMITS = {
    attribute: { min: 1, max: 5 },
    skill: { min: 0, max: 5 },
    specialization: { maxLength: 200 },
    track: { minBonus: -5, maxBonus: 10, maxLength: 15 },
    advantageDots: { min: 1, max: 5 },
    rows: { advantages: 50, touchstones: 20, weapons: 30, inventory: 100 },
    experience: { max: 9_999 },
    text: { short: 200, medium: 500, long: 2_000, notes: 10_000, tiny: 50 },
} as const;

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const text = (max: number) => z.string().max(max).default('');
const rowId = z.string().min(1).max(128);

export const V5AttributeSchema = z.object({
    value: int(V5_LIMITS.attribute.min, V5_LIMITS.attribute.max).default(V5_LIMITS.attribute.min),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** Specialties are free text (`Firearms: Pistols, Rifles`), like the WoD trait row. */
export const V5SkillSchema = z.preprocess(
    (raw) => {
        // Pre-release drafts stored a `specialties` string list.
        if (!isRecord(raw) || !Array.isArray(raw.specialties)) return raw;
        const { specialties, ...rest } = raw;
        return {
            ...rest,
            specializationText:
                rest.specializationText ??
                specialties.filter((item) => typeof item === 'string').join(', '),
        };
    },
    z.object({
        value: int(V5_LIMITS.skill.min, V5_LIMITS.skill.max).default(0),
        specializationText: z.string().max(V5_LIMITS.specialization.maxLength).default(''),
    })
);

const ConditionMarkSchema = z.enum(['empty', 'slash', 'cross']);

/**
 * A V5 Health or Willpower track: one condition mark per box (slash = Superficial, cross =
 * Aggravated) plus the player's length adjustment. Boxes past the current length are kept.
 */
export const V5TrackSchema = z.preprocess(
    (raw) => {
        // Pre-release drafts stored mark counts per severity.
        if (!isRecord(raw) || Array.isArray(raw.levels)) return raw;
        const count = (key: string) =>
            typeof raw[key] === 'number' ? Math.max(0, Math.trunc(raw[key] as number)) : 0;
        const levels = [
            ...Array<string>(count('aggravated')).fill('cross'),
            ...Array<string>(count('superficial')).fill('slash'),
        ].slice(0, V5_LIMITS.track.maxLength);
        return { levels, bonus: raw.bonus };
    },
    z.object({
        levels: z.array(ConditionMarkSchema).max(V5_LIMITS.track.maxLength).default([]),
        bonus: int(V5_LIMITS.track.minBonus, V5_LIMITS.track.maxBonus).default(0),
    })
);

/** Advantages and flaws share the merit/flaw list entry shape (`{ id, label, points }`). */
export const V5AdvantageSchema = z.object({
    id: rowId,
    label: z.string().max(V5_LIMITS.text.short).default(''),
    points: int(V5_LIMITS.advantageDots.min, V5_LIMITS.advantageDots.max).default(1),
});

export const V5TouchstoneSchema = z.object({
    id: rowId,
    name: z.string().max(V5_LIMITS.text.short).default(''),
    conviction: z.string().max(V5_LIMITS.text.medium).default(''),
});

export const V5ExperienceSchema = z.object({
    total: int(0, V5_LIMITS.experience.max).default(0),
    spent: int(0, V5_LIMITS.experience.max).default(0),
});

export const V5BiographySchema = z.object({
    age: text(V5_LIMITS.text.tiny),
    dateOfBirth: text(V5_LIMITS.text.tiny),
    appearance: text(V5_LIMITS.text.long),
    distinguishingFeatures: text(V5_LIMITS.text.long),
    history: text(V5_LIMITS.text.notes),
});

function traitRecord<T extends z.ZodTypeAny>(keys: readonly string[], schema: T) {
    return z.object(
        Object.fromEntries(keys.map((key) => [key, schema.default({})])) as {
            [key: string]: z.ZodDefault<T>;
        }
    );
}

/** Portrait in the shared document convention (`metadata.portraitId` or `metadata.imageUrl`). */
export const V5MetadataSchema = z.object({
    portraitId: z.string().max(200).optional(),
    imageUrl: z.string().max(V5_LIMITS.text.long).optional(),
});

/** Fields every V5 character carries, whatever its module. Modules extend this shape. */
export const V5CoreShape = {
    metadata: V5MetadataSchema.default({}),
    name: z.string().max(V5_LIMITS.text.short).default(''),
    attributes: traitRecord(V5_ATTRIBUTE_KEYS, V5AttributeSchema).default({}),
    skills: traitRecord(V5_SKILL_KEYS, V5SkillSchema).default({}),
    health: V5TrackSchema.default({}),
    willpower: V5TrackSchema.default({}),
    advantages: z.array(V5AdvantageSchema).max(V5_LIMITS.rows.advantages).default([]),
    flaws: z.array(V5AdvantageSchema).max(V5_LIMITS.rows.advantages).default([]),
    touchstones: z.array(V5TouchstoneSchema).max(V5_LIMITS.rows.touchstones).default([]),
    experience: V5ExperienceSchema.default({}),
    chronicleTenets: text(V5_LIMITS.text.notes),
    weapons: z.array(WeaponItemSchema).max(V5_LIMITS.rows.weapons).default([]),
    inventory: z.array(ItemSchema).max(V5_LIMITS.rows.inventory).default([]),
    notes: text(V5_LIMITS.text.notes),
    biography: V5BiographySchema.default({}),
};

/**
 * Pre-release drafts kept equipment as one text: it becomes one inventory item holding the text
 * as its description. Modules compose this into their own schema.
 */
export function migrateV5CoreDraft(raw: unknown): unknown {
    if (!isRecord(raw) || typeof raw.equipment !== 'string') return raw;
    const { equipment, ...rest } = raw;
    if (equipment.trim() === '' || Array.isArray(rest.inventory)) return rest;
    return {
        ...rest,
        inventory: [
            {
                id: 'equipment-notes',
                text: 'Equipment',
                description: equipment,
                effects: '',
                weight: '',
                price: '',
                quantity: 1,
                maxQuantity: 1,
                equipped: false,
            },
        ],
    };
}

const V5CoreObjectSchema = z.object(V5CoreShape);

export const V5CoreSchema = z.preprocess(migrateV5CoreDraft, V5CoreObjectSchema);

export type V5CoreData = z.infer<typeof V5CoreObjectSchema>;

export function createV5CoreDefault(): V5CoreData {
    return V5CoreObjectSchema.parse({});
}
