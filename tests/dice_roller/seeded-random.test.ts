import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { rollDices } from '../../src/dice_roller/dice-logic/dice-roller';
import {
    createSeededRandom,
    SEEDED_ROLL_ALGORITHM,
} from '../../src/dice_roller/dice-logic/seeded-random';
import type { FullRollResult } from '../../src/dice_roller/dice-logic/types';

interface RollVectors {
    algorithm: string;
    draws: { seed: string; values: number[]; uint32: number[] }[];
    rolls: { notation: string; seed: string; dice: number[][]; total: number }[];
}

const vectors = JSON.parse(
    readFileSync('contracts/cloud-api/roll-vectors.json', 'utf8')
) as RollVectors;

/** The contract's rule computed with Node's own SHA-256, independent of the app's library. */
const nodeDraw = (seed: string, index: number) =>
    createHash('sha256').update(`${seed}:${index}`, 'utf8').digest().readUInt32BE(0) / 2 ** 32;

const diceOf = (result: FullRollResult) =>
    result.diceGroups.map((group) => group.rolls.map((roll) => roll.value));

describe('seeded random source (spec 030, FR-011)', () => {
    it('draws what an independent SHA-256 computes for seed:index', () => {
        const random = createSeededRandom('a1b2c3d4e5f60718293a4b5c6d7e8f90');
        for (let index = 0; index < 50; index++) {
            expect(random()).toBe(nodeDraw('a1b2c3d4e5f60718293a4b5c6d7e8f90', index));
        }
    });

    it('stays below 1 and at or above 0', () => {
        const random = createSeededRandom('bounds');
        for (let index = 0; index < 1_000; index++) {
            const value = random();
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });

    it('gives the same roll for the same seed and another roll for another seed', () => {
        const roll = (seed: string) => rollDices('10d10!', createSeededRandom(seed));
        expect(diceOf(roll('same'))).toEqual(diceOf(roll('same')));
        expect(diceOf(roll('same'))).not.toEqual(diceOf(roll('other')));
    });
});

describe('roll test vectors (spec 030, SC-003)', () => {
    it('name the algorithm the app implements', () => {
        expect(vectors.algorithm).toBe(SEEDED_ROLL_ALGORITHM);
    });

    it.each(vectors.draws)('reproduce the draws of seed $seed', ({ seed, values, uint32 }) => {
        const random = createSeededRandom(seed);
        expect(values.map(() => random())).toEqual(values);
        expect(uint32.map((value) => value / 2 ** 32)).toEqual(values);
        expect(values.map((_, index) => nodeDraw(seed, index))).toEqual(values);
    });

    it.each(vectors.rolls)(
        'reproduce $notation with seed $seed',
        ({ notation, seed, dice, total }) => {
            const result = rollDices(notation, createSeededRandom(seed));
            expect(diceOf(result)).toEqual(dice);
            expect(result.total).toBe(total);
        }
    );
});
