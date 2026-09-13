import { parseToAST } from '@site/src/dice_roller/dice-logic/dice-parser';
import {
    processExplosionLoop,
    processRethrowLoop,
} from '@site/src/dice_roller/dice-logic/roll-orchestrator';
import type { DiceGroupNode, DiceRoll } from '@site/src/dice_roller/dice-logic/types';
import { MAX_EXPLOSIONS } from '@site/src/dice_roller/utils/constants';
import { describe, expect, it, vi } from 'vitest';

function parseGroup(notation: string): DiceGroupNode {
    const node = parseToAST(notation);
    if (node.type !== 'DiceGroup') throw new Error('Expected a dice group');
    return node;
}

const prepareGeometries = vi.fn((groups: Array<{ count: number }>) => ({
    geometries: Array.from({ length: groups[0].count }, () => ({}) as never),
    groupSizes: [groups[0].count],
}));

describe('3D explosion orchestration', () => {
    it('continues compound explosions based on each latest raw value', async () => {
        const group = parseGroup('1d6!!');
        const rolls: DiceRoll[] = [{ sides: 6, value: 6, dropped: false }];
        const addDice = vi.fn().mockResolvedValueOnce([6]).mockResolvedValueOnce([2]);

        await processExplosionLoop(
            group,
            rolls,
            1,
            { addDice },
            { diceColor: '#000', textColor: '#fff' },
            prepareGeometries
        );

        expect(addDice).toHaveBeenCalledTimes(2);
        expect(rolls).toEqual([
            expect.objectContaining({ value: 14, exploded: true, compounded: true }),
        ]);
    });

    it('checks penetrating continuation before subtracting one', async () => {
        const group = parseGroup('1d6!!p');
        const rolls: DiceRoll[] = [{ sides: 6, value: 6, dropped: false }];
        const addDice = vi.fn().mockResolvedValueOnce([6]).mockResolvedValueOnce([2]);

        await processExplosionLoop(
            group,
            rolls,
            1,
            { addDice },
            { diceColor: '#000', textColor: '#fff' },
            prepareGeometries
        );

        expect(rolls[0]).toEqual(
            expect.objectContaining({ value: 12, compounded: true, penetrating: true })
        );
    });

    it('caps total physical explosion work for a group', async () => {
        const group = parseGroup('200d1!');
        const rolls: DiceRoll[] = Array.from({ length: 200 }, () => ({
            sides: 1,
            value: 1,
            dropped: false,
        }));
        const addDice = vi.fn(async (geometries: unknown[]) => geometries.map(() => 1));

        await processExplosionLoop(
            group,
            rolls,
            1,
            { addDice },
            { diceColor: '#000', textColor: '#fff' },
            prepareGeometries
        );

        expect(addDice).toHaveBeenCalledTimes(1);
        expect(addDice.mock.calls[0][0]).toHaveLength(MAX_EXPLOSIONS);
        expect(rolls).toHaveLength(200 + MAX_EXPLOSIONS);
        expect(rolls.every((roll) => roll.exploded)).toBe(true);
    });

    it('falls back instead of truncating when explosions exceed physical-session capacity', async () => {
        const group = parseGroup('3d6!');
        const rolls: DiceRoll[] = Array.from({ length: 3 }, () => ({
            sides: 6,
            value: 6,
            dropped: false,
        }));
        const addDice = vi.fn(async (geometries: unknown[]) => geometries.map(() => 2));
        const capacity = { remaining: 2 };

        await expect(
            processExplosionLoop(
                group,
                rolls,
                1,
                { addDice },
                { diceColor: '#000', textColor: '#fff' },
                prepareGeometries,
                capacity
            )
        ).rejects.toThrow(/physical-session limit/);

        expect(addDice).not.toHaveBeenCalled();
        expect(capacity.remaining).toBe(2);
    });
});

describe('3D reroll orchestration', () => {
    it('uses the shared recursive-modifier cap instead of a separate literal', async () => {
        const group = parseGroup('1d1r=1');
        const rolls: DiceRoll[] = [{ sides: 1, value: 1, dropped: false }];
        const rethrow = vi.fn(async () => [1]);

        await processRethrowLoop(
            group,
            rolls,
            [1],
            0,
            1,
            { lockDice: vi.fn(), rethrow },
            (_group, currentRolls) => currentRolls.map((_, index) => index)
        );

        expect(rethrow).toHaveBeenCalledTimes(MAX_EXPLOSIONS);
    });
});
