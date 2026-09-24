import { describe, expect, it } from 'vitest';

import { evaluate, evaluateWithValues, faceToRandom } from '../helpers';

describe('Evaluator - dice label', () => {
    it('labels every die of the term and the group, without changing values', () => {
        const result = evaluate('3d10@7,3,3>=6 + 2d10:h@10,1>=6');
        expect(result.total).toBe(2);
        const [regular, special] = result.diceGroups;
        expect(regular.label).toBeUndefined();
        expect(regular.rolls.every((roll) => roll.label === undefined)).toBe(true);
        expect(special.label).toBe('h');
        expect(special.rolls.map((roll) => [roll.value, roll.label])).toEqual([
            [10, 'h'],
            [1, 'h'],
        ]);
        expect(special.notation).toBe('2d10:h>=6');
    });

    it('keeps the label on exploded and rerolled dice', () => {
        const exploded = evaluate('1d10:h>=6!', faceToRandom(10, 10), faceToRandom(4, 10))
            .diceGroups[0];
        expect(exploded.rolls.map((roll) => roll.value)).toEqual([10, 4]);
        expect(exploded.rolls.every((roll) => roll.label === 'h')).toBe(true);

        const rerolled = evaluate('1d10:hr1', faceToRandom(1, 10), faceToRandom(8, 10))
            .diceGroups[0];
        expect(rerolled.rolls.map((roll) => [roll.value, roll.label])).toEqual([[8, 'h']]);
    });

    it('labels pre-generated (3D) values', () => {
        const result = evaluateWithValues('(2d10+1d10:h)>=6', [6, 2], [1]);
        expect(result.diceGroups[1].rolls[0]).toMatchObject({ value: 1, label: 'h' });
    });
});
