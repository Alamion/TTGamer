import { withSpecialDice } from '@site/src/dice_roller/dice-logic/notation-utils';
import { describe, expect, it } from 'vitest';

/** Special dice replace regular dice of a pool when it is rolled (V5 Hunger, spec 037 D2). */
describe('withSpecialDice', () => {
    it('turns part of a pool into special dice', () => {
        expect(withSpecialDice('5d10>=6', 2)).toBe('3d10>=6 + 2d10:h>=6');
    });

    it('never adds dice beyond the pool', () => {
        expect(withSpecialDice('3d10>=6', 4)).toBe('3d10:h>=6');
    });

    it('keeps the pool modifiers on both parts', () => {
        expect(withSpecialDice('6d10>=6x2=10', 1)).toBe('5d10>=6x2=10 + 1d10:h>=6x2=10');
    });

    it('leaves the notation alone without special dice', () => {
        expect(withSpecialDice('5d10>=6', 0)).toBe('5d10>=6');
    });

    it('keeps a notation that already has special dice (a re-roll from history)', () => {
        expect(withSpecialDice('3d10>=6 + 2d10:h>=6', 3)).toBe('3d10>=6 + 2d10:h>=6');
    });

    it('returns null for a notation that is not one success pool', () => {
        expect(withSpecialDice('2d6+3', 2)).toBeNull();
        expect(withSpecialDice('3d10>=6 + 2d6', 1)).toBeNull();
    });
});
