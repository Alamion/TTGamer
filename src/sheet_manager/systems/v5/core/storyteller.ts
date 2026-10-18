import { z } from 'zod';

import { V5_LIMITS, V5MetadataSchema } from '../ruleset/schema';

/**
 * A V5 Storyteller character (spec 040): the rules' short form for the people and creatures the
 * players meet — three standard pools, set Health and Willpower, exceptional pools, powers, and an
 * optional simple-foe Difficulty.
 */
export const STORYTELLER_LIMITS = {
    pool: { min: 0, max: 15 },
    /** Health and Willpower: four boxes, shortened or extended to 1–15 on the track itself. */
    track: { base: 4, min: 1, max: V5_LIMITS.track.maxLength },
    difficulty: { min: 0, max: 5 },
    powerDots: { min: 0, max: 5 },
    exceptional: 30,
    powers: 30,
} as const;

export const STORYTELLER_TYPES = ['mortal', 'ghoul', 'animal', 'supernatural', 'other'] as const;

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const text = (max: number) => z.string().max(max).default('');
const rowId = z.string().min(1).max(128);

const PoolSchema = z.object({
    value: int(STORYTELLER_LIMITS.pool.min, STORYTELLER_LIMITS.pool.max).default(2),
});

const NamedValueSchema = (max: number) =>
    z.object({
        id: rowId,
        name: text(V5_LIMITS.text.short),
        value: int(0, max).default(0),
        catalogId: z.string().max(128).optional(),
    });

const { base, min, max } = STORYTELLER_LIMITS.track;

/** A V5 track whose length is its four base boxes plus `bonus` (the track's own +/−). */
const StorytellerTrackSchema = z.object({
    levels: z
        .array(z.enum(['empty', 'slash', 'cross']))
        .max(max)
        .default([]),
    bonus: int(min - base, max - base).default(0),
});

const StorytellerObjectSchema = z.object({
    metadata: V5MetadataSchema.prefault({}),
    name: text(V5_LIMITS.text.short),
    concept: text(V5_LIMITS.text.short),
    type: z.enum(STORYTELLER_TYPES).default('mortal'),
    difficulty: int(STORYTELLER_LIMITS.difficulty.min, STORYTELLER_LIMITS.difficulty.max).default(
        0
    ),
    pools: z
        .object({
            physical: PoolSchema.prefault({}),
            social: PoolSchema.prefault({}),
            mental: PoolSchema.prefault({}),
        })
        .prefault({}),
    health: StorytellerTrackSchema.prefault({}),
    willpower: StorytellerTrackSchema.prefault({}),
    exceptional: z
        .array(NamedValueSchema(STORYTELLER_LIMITS.pool.max))
        .max(STORYTELLER_LIMITS.exceptional)
        .default([]),
    powers: z
        .array(NamedValueSchema(STORYTELLER_LIMITS.powerDots.max))
        .max(STORYTELLER_LIMITS.powers)
        .default([]),
    notes: text(V5_LIMITS.text.notes),
});

export const V5StorytellerSchema = StorytellerObjectSchema;

export type V5StorytellerData = z.infer<typeof StorytellerObjectSchema>;

export function createV5StorytellerDefault(): V5StorytellerData {
    return StorytellerObjectSchema.parse({});
}
