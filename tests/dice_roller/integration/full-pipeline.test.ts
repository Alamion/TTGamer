import { describe, it, expect } from 'vitest';
import { rollDices, parseToAST, validateNotation } from '../../src/dice-logic';
import { extractRawValuesFromAST } from '../../src/dice-logic';

function mockRandom(...values: number[]): () => number {
    let i = 0;
    return () => values[i++];
}

describe('Integration - full pipeline', () => {
    it('rollDices produces formatted output', () => {
        const result = rollDices('2d6+3', mockRandom(0.1, 0.5));
        expect(result.notation).toBe('2d6+3');
        expect(result.total).toBe(8);
        expect(result.formatted).toBe('1+4+3');
        expect(result.details).toBe('1, 4');
    });

    it('rollDices returns correct structure for simple roll', () => {
        const result = rollDices('1d20', mockRandom(0.95));
        expect(result).toHaveProperty('notation');
        expect(result).toHaveProperty('diceGroups');
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('formatted');
        expect(result.diceGroups[0].rolls).toHaveLength(1);
    });

    it('rollDices handles fudge dice through pipeline', () => {
        const result = rollDices('4dF', mockRandom(0.0, 0.4, 0.6, 0.9));
        expect(result.total).toBe(0);
        expect(result.formatted).toBe('-1+0+0+1');
        expect(result.details).toBe('-,  ,  , +');
    });

    it('extractRawValuesFromAST returns raw values', () => {
        const ast = parseToAST('2d6');
        const raw = extractRawValuesFromAST(ast, mockRandom(0.3, 0.7));
        expect(raw.size).toBe(1);
        const rolls = raw.values().next().value;
        expect(rolls).toHaveLength(2);
        expect(rolls[0].value).toBe(2);
        expect(rolls[1].value).toBe(5);
    });

    it('validateNotation returns true for valid', () => {
        expect(validateNotation('2d6+3')).toBe(true);
        expect(validateNotation('4dF')).toBe(true);
        expect(validateNotation('1d[1,3,5]')).toBe(true);
    });

    it('validateNotation returns false for invalid', () => {
        expect(validateNotation('')).toBe(false);
        expect(validateNotation('abc')).toBe(false);
    });

    it('complex expression with multiple dice types, parentheses, and fudge', () => {
        // 7d2! - 2d20 + 3*( 3dF - 2 )
        // mockRandom consumed in tree order:
        //   7d2!: 7 initial rolls → all=1 (no explosion, no 2s)
        //   2d20: 2 rolls → 10, 6
        //   3dF: 3 rolls → -1, 0, 1
        // Total = 7 - 16 + 3*(0 - 2) = -15
        const result = rollDices(
            '7d2! - 2d20kh + 3*( 3dF - 2 )',
            mockRandom(0.0, 0.7, 0.2, 0.3, 0.4, 0.4, 0.9, 0.2, 0.2, 0.45, 0.25, 0.1, 0.5, 0.8)
        );
        expect(result.diceGroups).toHaveLength(3);
        expect(result.diceGroups[0].notation).toBe('7d2!');
        expect(result.diceGroups[1].notation).toBe('2d20kh1');
        expect(result.diceGroups[2].notation).toBe('3dF');
        expect(result.diceGroups[0].sum).toBe(11);
        expect(result.diceGroups[1].sum).toBe(10);
        expect(result.diceGroups[2].sum).toBe(0);
        expect(result.total).toBe(-5);
        expect(result.details).toBe('(1, 2!, 1, 1, 1, 1, 1, 2!, 1) (10, ~~6~~) (-,  , +)');
        expect(result.formatted).toBe('(1+2+1+1+1+1+1+2+1)-(10)+3*((-1+0+1)-2)');
    });

    it('complex chained expression through full pipeline', () => {
        // 4d6r1kh3+1d8
        // mockRandom consumed: initial[die0,die1,die2,die3], reroll[die0], then 1d8
        // initial: die0=0.1→1, die1=0.5→4, die2=0.8→5, die3=0.3→2
        // reroll die0: 0.7→5 (stop)
        // after reroll: [5, 4, 5, 2]
        // kh3: keep [5, 5, 4], drop [2], sum=14
        // 1d8: 0.4→floor(0.4*8)+1=4
        // total = 14 + 4 = 18
        const result = rollDices('4d6r1kh3+1d8', mockRandom(0.1, 0.5, 0.8, 0.3, 0.7, 0.4));
        expect(result.total).toBe(18);
        expect(result.diceGroups).toHaveLength(2);
    });
});
