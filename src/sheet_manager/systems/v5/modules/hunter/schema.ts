import { z } from 'zod';

import { migrateV5CoreDraft, V5_LIMITS, V5CoreShape } from '../../ruleset/schema';

/** Hunter module limits on top of the V5 core (data-model.md). */
export const HUNTER_LIMITS = {
    edges: 20,
    perks: 60,
    cellRating: { min: 0, max: 5 },
} as const;

const text = (max: number) => z.string().max(max).default('');

const rowId = z.string().min(1).max(128);

export const HunterEdgeSchema = z.object({
    id: rowId,
    name: text(V5_LIMITS.text.short),
    note: text(V5_LIMITS.text.medium),
});

/** A Perk row names the Edge it belongs to as text (custom Edges and Perks allowed). */
export const HunterPerkSchema = z.object({
    id: rowId,
    name: text(V5_LIMITS.text.short),
    edge: text(V5_LIMITS.text.short),
    note: text(V5_LIMITS.text.medium),
});

/** Pre-release drafts kept perks as a string list on each Edge row: lift them into Perk rows. */
function liftEdgePerks(raw: unknown): unknown {
    if (
        typeof raw !== 'object' ||
        raw === null ||
        !Array.isArray((raw as { edges?: unknown }).edges)
    ) {
        return raw;
    }
    const data = raw as { edges: Array<Record<string, unknown>>; perks?: unknown };
    if (!data.edges.some((edge) => Array.isArray(edge?.perks))) return raw;
    const lifted = data.edges.flatMap((edge, edgeIndex) =>
        (Array.isArray(edge?.perks) ? edge.perks : [])
            .filter((perk): perk is string => typeof perk === 'string')
            .map((perk, perkIndex) => ({
                id: `${String(edge.id ?? edgeIndex)}-perk-${perkIndex + 1}`,
                name: perk,
                edge: typeof edge.name === 'string' ? edge.name : '',
            }))
    );
    return {
        ...data,
        edges: data.edges.map((edge) => {
            const next = { ...edge };
            delete next.perks;
            delete next.entryId;
            return next;
        }),
        perks: [...(Array.isArray(data.perks) ? data.perks : []), ...lifted],
    };
}

const cellRating = z
    .number()
    .int()
    .min(HUNTER_LIMITS.cellRating.min)
    .max(HUNTER_LIMITS.cellRating.max)
    .default(0);

export const HunterModuleShape = {
    concept: text(V5_LIMITS.text.short),
    creed: text(V5_LIMITS.text.short),
    drive: text(V5_LIMITS.text.short),
    ambition: text(V5_LIMITS.text.medium),
    desire: text(V5_LIMITS.text.medium),
    redemption: text(V5_LIMITS.text.medium),
    creedFields: text(V5_LIMITS.text.long),
    edges: z.array(HunterEdgeSchema).max(HUNTER_LIMITS.edges).default([]),
    perks: z.array(HunterPerkSchema).max(HUNTER_LIMITS.perks).default([]),
    despair: z.boolean().default(false),
    /** Cell values: each hunter keeps a copy until cells exist as documents. */
    desperation: cellRating,
    danger: cellRating,
};

const HunterObjectSchema = z.object({ ...V5CoreShape, ...HunterModuleShape });

export const HunterSchema = z.preprocess(
    (raw) => liftEdgePerks(migrateV5CoreDraft(raw)),
    HunterObjectSchema
);

export type HunterData = z.infer<typeof HunterObjectSchema>;

export function createHunterDefault(): HunterData {
    return HunterObjectSchema.parse({});
}
