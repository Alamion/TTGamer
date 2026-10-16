import {
    bloodPotencyEffects,
    potencyRange,
} from '@site/src/sheet_manager/systems/v5/modules/vampire/bloodPotency';
import { describe, expect, it } from 'vitest';

/** What Blood Potency gives, and its range per generation (core rulebook pp. 214–216; spec 037). */
describe('Blood Potency effects', () => {
    it.each([
        [0, { surge: 0, mend: 1, bonus: 0, reroll: 0, severity: 0 }],
        [1, { surge: 1, mend: 1, bonus: 0, reroll: 1, severity: 1 }],
        [2, { surge: 1, mend: 2, bonus: 1, reroll: 1, severity: 1 }],
        [3, { surge: 2, mend: 2, bonus: 1, reroll: 2, severity: 2 }],
        [4, { surge: 2, mend: 3, bonus: 2, reroll: 2, severity: 2 }],
        [5, { surge: 3, mend: 3, bonus: 2, reroll: 3, severity: 3 }],
        [6, { surge: 3, mend: 3, bonus: 3, reroll: 3, severity: 3 }],
        [7, { surge: 4, mend: 3, bonus: 3, reroll: 4, severity: 4 }],
        [8, { surge: 4, mend: 4, bonus: 4, reroll: 4, severity: 4 }],
        [9, { surge: 5, mend: 4, bonus: 4, reroll: 5, severity: 5 }],
        [10, { surge: 5, mend: 5, bonus: 5, reroll: 5, severity: 5 }],
    ])('Blood Potency %i', (potency, expected) => {
        expect(bloodPotencyEffects(potency)).toMatchObject(expected);
    });

    it('lists feeding penalties as they grow', () => {
        expect(bloodPotencyEffects(1).feeding).toEqual([]);
        expect(bloodPotencyEffects(2).feeding).toEqual([{ id: 'animalHalf' }]);
        expect(bloodPotencyEffects(4).feeding).toEqual([
            { id: 'animalNone' },
            { id: 'humanLess', count: 1 },
        ]);
        expect(bloodPotencyEffects(10).feeding).toEqual([
            { id: 'animalNone' },
            { id: 'humanLess', count: 3 },
            { id: 'mustKill', limit: 3 },
        ]);
    });

    it('clamps values outside 0–10', () => {
        expect(bloodPotencyEffects(14)).toEqual(bloodPotencyEffects(10));
        expect(bloodPotencyEffects(-2)).toEqual(bloodPotencyEffects(0));
    });
});

describe('Blood Potency range per generation', () => {
    it.each([
        [4, 5, 10],
        [7, 3, 7],
        [10, 1, 4],
        [11, 1, 4],
        [13, 1, 3],
        [14, 0, 0],
        [16, 0, 0],
    ])('generation %i: %i–%i', (generation, min, max) => {
        expect(potencyRange(generation)).toEqual({ min, max });
    });
});
