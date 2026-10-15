import { z } from 'zod';

/** The most documents shown side by side or as tabs on the sheet page (spec 034, FR-004). */
export const MAX_PANES = 6;

/** What the device keeps of the panes (the key says the version). */
export const PANES_STORAGE_KEY = 'ttgamer:panes:v1';

const StoredArrangementSchema = z.object({
    ids: z.array(z.string()),
    recent: z.array(z.string()),
    weights: z.record(z.string(), z.number()),
    views: z.record(z.string(), z.string()),
    maximized: z.string().nullable(),
});

export type StoredArrangement = z.infer<typeof StoredArrangementSchema>;

/**
 * A stored arrangement made safe to use: no duplicates, at most the limit, only entries of panes
 * that exist, only usable weights. `null` when the value is not an arrangement at all.
 */
export function readArrangement(raw: unknown): StoredArrangement | null {
    const parsed = StoredArrangementSchema.safeParse(raw);
    if (!parsed.success) return null;
    const stored = parsed.data;
    const ids = [...new Set(stored.ids)].slice(0, MAX_PANES);
    const own = <T>(record: Record<string, T>, keep: (value: T) => boolean) =>
        Object.fromEntries(
            Object.entries(record).filter(([id, value]) => ids.includes(id) && keep(value))
        );
    return {
        ids,
        recent: [...new Set(stored.recent)].filter((id) => ids.includes(id)),
        weights: own(stored.weights, (weight) => Number.isFinite(weight) && weight > 0),
        views: own(stored.views, (view) => view.length > 0),
        maximized:
            stored.maximized !== null && ids.includes(stored.maximized) ? stored.maximized : null,
    };
}
