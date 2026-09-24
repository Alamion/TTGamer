import { describe, expect, it } from 'vitest';

import { evaluate, evaluateWithValues, faceToRandom } from '../helpers';

const d10 = (...faces: number[]) => faces.map((face) => faceToRandom(face, 10));

describe('Evaluator - set bonus', () => {
    it.each([
        ['6d10@6,7,10,10,4,2>=6x2=10', 6, 1],
        ['6d10@10,10,10,3,3,3>=6x2=10', 5, 1],
        ['4d10@10,10,10,10>=6x2=10', 8, 2],
        ['4d10@3,3,3,3>=6x2=10', 0, 0],
        ['2d10@10,3>=6x2=10', 1, 0],
        ['(4d10@10,3,3,3+2d10:h@10,1)>=6x2=10', 4, 1],
        ['(4d10@10,3,3,3+2d10:h@10,1)>=6f=1x2=10', 3, 1],
        ['6d10@6,7,10,10,4,2>=6', 4, 0],
    ])('%s totals %i with %i set(s)', (notation, total, sets) => {
        const result = evaluate(notation);
        expect(result.total).toBe(total);
        const setCount = result.setBonus?.reduce((sum, entry) => sum + entry.sets, 0) ?? 0;
        expect(setCount).toBe(sets);
    });

    it('marks set members with a set index and the trailing x', () => {
        const result = evaluate('6d10@6,7,10,10,4,2>=6x2=10');
        const members = result.diceGroups[0].rolls.filter((roll) => roll.setIndex !== undefined);
        expect(members.map((roll) => roll.value)).toEqual([10, 10]);
        expect(members.every((roll) => roll.setIndex === 0)).toBe(true);
        expect(result.details).toBe('6*, 7*, 10*x, 10*x, 4, 2');
        expect(result.setBonus).toEqual([{ sets: 1, added: 2 }]);
    });

    it('keeps the formatted sum equal to the total', () => {
        const result = evaluate('6d10@6,7,10,10,4,2>=6x2=10');
        expect(result.formatted).toBe('1+1+1+2+1+0+0');
        const summed = result.formatted.split('+').reduce((sum, part) => sum + Number(part), 0);
        expect(summed).toBe(result.total);
    });

    it('forms sets across the terms of a pool in roll order', () => {
        const result = evaluate('(3d10@10,10,10+2d10:h@10,2)>=6x2=10');
        expect(result.total).toBe(8);
        const indexes = result.diceGroups.flatMap((group) =>
            group.rolls.map((roll) => roll.setIndex)
        );
        expect(indexes).toEqual([0, 0, 1, 1, undefined]);
    });

    it('never forms sets from dropped dice', () => {
        const result = evaluate('4d10@10,10,10,2>=6kh2x2=10');
        expect(result.total).toBe(4);
        const dropped = evaluate('3d10@10,10,1>=6dh1x2=10');
        expect(dropped.total).toBe(1);
        expect(dropped.setBonus).toEqual([{ sets: 0, added: 0 }]);
    });

    it('counts exploded dice in sets', () => {
        // 10 explodes into 10 (explodes again) and 3; the two 10s form a set.
        const result = evaluate('1d10>=6!x2=10', ...d10(10, 10, 3));
        expect(result.diceGroups[0].rolls.map((roll) => roll.value)).toEqual([10, 10, 3]);
        expect(result.total).toBe(4);
    });

    it('applies to pre-generated (3D) values', () => {
        const result = evaluateWithValues('(4d10+2d10:h)>=6x2=10', [10, 6, 6, 3], [10, 4]);
        expect(result.total).toBe(6);
    });

    it('supports an explicit bonus per set', () => {
        expect(evaluate('6d6@5,5,5,6,6,6>=5x3.1>=5').total).toBe(8);
    });

    it('leaves notations without a set bonus unchanged', () => {
        expect(evaluate('(3d10@10,10,1+1d10@10)>=6f=1').total).toBe(2);
        expect(evaluate('6d10@6,7,10,10,4,2>=6').setBonus).toBeUndefined();
    });
});
