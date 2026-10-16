/**
 * What Blood Potency gives a vampire, and its range per generation (core rulebook pp. 214–216,
 * spec 037 D4). Computed mechanics shown on the sheet, not a reproduction of the book's table.
 */

export type FeedingPenalty =
    | { id: 'animalHalf' }
    | { id: 'animalNone' }
    | { id: 'humanLess'; count: number }
    | { id: 'mustKill'; limit: number };

export interface BloodPotencyEffects {
    /** Dice a Blood Surge adds. */
    surge: number;
    /** Superficial damage mended per Rouse check. */
    mend: number;
    /** Dice added to Discipline pools. */
    bonus: number;
    /** Highest Discipline level whose Rouse checks may be re-rolled (0: none). */
    reroll: number;
    severity: number;
    feeding: FeedingPenalty[];
}

const MEND = [1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 5] as const;

/** Penalties grow every level from 2 on; each row keeps the ones before it. */
function feedingPenalties(potency: number): FeedingPenalty[] {
    if (potency < 2) return [];
    if (potency === 2) return [{ id: 'animalHalf' }];
    const penalties: FeedingPenalty[] = [{ id: 'animalNone' }];
    if (potency >= 4) {
        penalties.push({ id: 'humanLess', count: potency >= 10 ? 3 : potency >= 7 ? 2 : 1 });
    }
    if (potency >= 5) penalties.push({ id: 'mustKill', limit: potency >= 9 ? 3 : 2 });
    return penalties;
}

export function bloodPotencyEffects(value: number): BloodPotencyEffects {
    const potency = Math.max(0, Math.min(10, Math.trunc(value)));
    const half = Math.ceil(potency / 2);
    return {
        surge: half,
        mend: MEND[potency]!,
        bonus: Math.floor(potency / 2),
        reroll: half,
        severity: half,
        feeding: feedingPenalties(potency),
    };
}

/** Lowest and highest Blood Potency a generation allows (thin-bloods: 0). */
export function potencyRange(generation: number): { min: number; max: number } {
    if (generation >= 14) return { min: 0, max: 0 };
    if (generation >= 12) return { min: 1, max: 3 };
    if (generation >= 10) return { min: 1, max: 4 };
    const byGeneration: Record<number, { min: number; max: number }> = {
        4: { min: 5, max: 10 },
        5: { min: 4, max: 9 },
        6: { min: 3, max: 8 },
        7: { min: 3, max: 7 },
        8: { min: 2, max: 6 },
        9: { min: 2, max: 5 },
    };
    return byGeneration[generation] ?? { min: 5, max: 10 };
}
