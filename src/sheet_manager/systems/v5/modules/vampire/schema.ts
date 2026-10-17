import { z } from 'zod';

import { migrateV5CoreDraft, V5_LIMITS, V5CoreShape } from '../../ruleset/schema';

/** Vampire module limits on top of the V5 core (spec 037). */
export const VAMPIRE_LIMITS = {
    generation: { min: 4, max: 16, default: 13 },
    hunger: { min: 0, max: 5, default: 1 },
    humanity: { min: 0, max: 10, default: 7 },
    bloodPotency: { min: 0, max: 10, default: 1 },
    disciplineDots: { min: 0, max: 5 },
    disciplines: 16,
    powers: 60,
    rituals: 40,
} as const;

const text = (max: number) => z.string().max(max).default('');
const int = (min: number, max: number) => z.number().int().min(min).max(max);
const rowId = z.string().min(1).max(128);
const rowText = (max: number) => z.string().max(max).default('');

export const VampireDisciplineSchema = z.object({
    id: rowId,
    name: rowText(V5_LIMITS.text.short),
    value: int(VAMPIRE_LIMITS.disciplineDots.min, VAMPIRE_LIMITS.disciplineDots.max).default(1),
});

/**
 * A power row: the discipline it belongs to is text (custom disciplines and powers allowed);
 * `entry` and `rouse` are filled from the catalog and hidden on the sheet.
 */
export const VampirePowerSchema = z.object({
    id: rowId,
    name: rowText(V5_LIMITS.text.short),
    discipline: rowText(V5_LIMITS.text.short),
    level: rowText(2),
    note: rowText(V5_LIMITS.text.medium),
    entry: rowText(128),
    rouse: rowText(2),
});

/** A Blood Sorcery ritual, an Oblivion ceremony, or a Thin-Blood Alchemy formula. */
export const VampireRitualSchema = z.object({
    id: rowId,
    name: rowText(V5_LIMITS.text.short),
    discipline: rowText(V5_LIMITS.text.short),
    level: rowText(2),
    note: rowText(V5_LIMITS.text.medium),
    entry: rowText(128),
});

export const VampireModuleShape = {
    concept: text(V5_LIMITS.text.short),
    chronicle: text(V5_LIMITS.text.short),
    sire: text(V5_LIMITS.text.short),
    clan: text(V5_LIMITS.text.short),
    generation: int(VAMPIRE_LIMITS.generation.min, VAMPIRE_LIMITS.generation.max).default(
        VAMPIRE_LIMITS.generation.default
    ),
    predatorType: text(V5_LIMITS.text.short),
    ambition: text(V5_LIMITS.text.medium),
    desire: text(V5_LIMITS.text.medium),
    hunger: int(VAMPIRE_LIMITS.hunger.min, VAMPIRE_LIMITS.hunger.max).default(
        VAMPIRE_LIMITS.hunger.default
    ),
    humanity: int(VAMPIRE_LIMITS.humanity.min, VAMPIRE_LIMITS.humanity.max).default(
        VAMPIRE_LIMITS.humanity.default
    ),
    stains: int(0, VAMPIRE_LIMITS.humanity.max).default(0),
    bloodPotency: int(VAMPIRE_LIMITS.bloodPotency.min, VAMPIRE_LIMITS.bloodPotency.max).default(
        VAMPIRE_LIMITS.bloodPotency.default
    ),
    baneVariant: z.enum(['usual', 'variant']).default('usual'),
    /** Empty while the bane follows the clan catalog (design D5). */
    bane: text(V5_LIMITS.text.long),
    compulsion: text(V5_LIMITS.text.long),
    disciplines: z.array(VampireDisciplineSchema).max(VAMPIRE_LIMITS.disciplines).default([]),
    powers: z.array(VampirePowerSchema).max(VAMPIRE_LIMITS.powers).default([]),
    rituals: z.array(VampireRitualSchema).max(VAMPIRE_LIMITS.rituals).default([]),
};

const VampireObjectSchema = z.object({ ...V5CoreShape, ...VampireModuleShape });

/** Stains fill the boxes Humanity leaves empty, never more (design D7). */
function fitStains(data: z.infer<typeof VampireObjectSchema>) {
    const room = VAMPIRE_LIMITS.humanity.max - data.humanity;
    return data.stains > room ? { ...data, stains: room } : data;
}

export const VampireSchema = z
    .preprocess((raw) => migrateV5CoreDraft(raw), VampireObjectSchema)
    .transform(fitStains);

export type VampireData = z.infer<typeof VampireObjectSchema>;

export function createVampireDefault(): VampireData {
    return VampireObjectSchema.parse({});
}
