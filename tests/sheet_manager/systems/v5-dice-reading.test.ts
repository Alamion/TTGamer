import { evaluateDiceAST } from '@site/src/dice_roller/dice-logic/dice-evaluator';
import { parseToAST } from '@site/src/dice_roller/dice-logic/dice-parser';
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import {
    createV5DiceReading,
    desperationDiceLine,
    hungerDiceLine,
} from '@site/src/sheet_manager/systems/v5';
import { describe, expect, it } from 'vitest';

/** Rolls a V5 pool with fixed regular and Hunger/Desperation faces, pairs counted. */
function pool(regular: number[], special: number[]): RollResult {
    const terms = [
        regular.length > 0 ? `${regular.length}d10@${regular.join(',')}>=6` : '',
        special.length > 0 ? `${special.length}d10:h@${special.join(',')}>=6` : '',
    ].filter(Boolean);
    const notation = v5DiceReading.prepare(terms.join(' + '), { criticalPairs: true });
    if (!notation) throw new Error('not a V5 pool');
    return evaluateDiceAST(parseToAST(notation), notation);
}

const ids = (result: RollResult, line: string, difficulty: number | null = null, outcomes = true) =>
    v5DiceReading
        .interpret(result, { line, outcomes, difficulty })
        .map((outcome) => `${outcome.id}${outcome.conditional ? '?' : ''}`);

function handCount(regular: number[], special: number[]): number {
    const faces = [...regular, ...special];
    const successes = faces.filter((face) => face >= 6).length;
    const tens = faces.filter((face) => face === 10).length;
    return successes + 2 * Math.floor(tens / 2);
}

const v5DiceReading = createV5DiceReading([hungerDiceLine, desperationDiceLine]);

describe('V5 dice reading', () => {
    it('prepares success pools and refuses other notations', () => {
        expect(v5DiceReading.prepare('5d10>=6', { criticalPairs: true })).toBe('5d10>=6x2=10');
        expect(v5DiceReading.prepare('5d10>=6', { criticalPairs: false })).toBe('5d10>=6');
        expect(v5DiceReading.prepare('2d6+3', { criticalPairs: true })).toBeNull();
        expect(v5DiceReading.prepare('5d10>=6x2=10', { criticalPairs: true })).toBe('5d10>=6x2=10');
    });

    it('names the hunter line', () => {
        expect(v5DiceReading.lineFor('hunter')).toBe('desperation');
        expect(v5DiceReading.lineFor('character')).toBeUndefined();
    });

    describe('totals match a hand count (SC-001)', () => {
        const cases: [number[], number[]][] = [];
        for (let tens = 0; tens <= 4; tens++) {
            for (let specials = 0; specials <= 3; specials++) {
                const regular = [...Array(tens).fill(10), 7, 3, 1];
                const special = [1, 10, 6].slice(0, specials);
                cases.push([regular, special]);
            }
        }
        it.each(cases)('regular %j + special %j', (regular, special) => {
            expect(pool(regular, special).total).toBe(handCount(regular, special));
        });
    });

    describe('Desperation', () => {
        it('reports the price of a 1 on a Desperation die', () => {
            expect(ids(pool([7, 3, 3, 3], [6, 1]), 'desperation')).toEqual(['desperation-one']);
        });
        it('reports nothing without a 1 on the Desperation dice', () => {
            expect(ids(pool([1, 3, 3, 3], [6, 6]), 'desperation')).toEqual([]);
        });
        it('reports nothing when outcomes are off', () => {
            expect(ids(pool([7], [1]), 'desperation', null, false)).toEqual([]);
        });
    });

    describe('Hunger', () => {
        it('reports a messy critical when a critical includes a Hunger 10', () => {
            expect(ids(pool([10, 6, 6, 3], [10, 4]), 'hunger', 3)).toEqual(['messy-critical']);
            expect(ids(pool([10, 6, 6, 3], [10, 4]), 'hunger')).toEqual(['messy-critical?']);
        });
        it('reports no messy critical without a critical or without a Hunger 10', () => {
            expect(ids(pool([6, 6, 3], [10, 4]), 'hunger', 1)).toEqual([]);
            expect(ids(pool([10, 10, 3], [6, 4]), 'hunger', 1)).toEqual([]);
        });
        it('reports no messy critical when the roll misses a known Difficulty', () => {
            expect(ids(pool([10, 3], [10]), 'hunger', 9)).toEqual([]);
        });
        it('reports a bestial failure when the roll fails with a Hunger 1', () => {
            expect(ids(pool([3, 3, 3, 3], [6, 1]), 'hunger', 3)).toEqual(['bestial-failure']);
            expect(ids(pool([3, 3, 3, 3], [6, 1]), 'hunger')).toEqual(['bestial-failure?']);
            expect(ids(pool([7, 7, 7, 3], [6, 1]), 'hunger', 3)).toEqual([]);
        });
        it('reports a special 1 next to a regular critical', () => {
            expect(ids(pool([10, 10, 3], [1]), 'hunger')).toEqual(['bestial-failure?']);
        });
    });
});
