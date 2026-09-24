import { parseToAST } from '@site/src/dice_roller/dice-logic/dice-parser';
import {
    diceScaleFor,
    processExplosionLoop,
    processRethrowLoop,
} from '@site/src/dice_roller/dice-logic/roll-orchestrator';
import type { DiceGroupNode, DiceRoll } from '@site/src/dice_roller/dice-logic/types';
import {
    FULL_SIZE_DICE_POOL,
    MAX_EXPLOSIONS,
    MAX_PHYSICAL_3D_DICE,
    MIN_DICE_SCALE,
} from '@site/src/dice_roller/utils/constants';
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

describe('large-pool dice size (dice #12)', () => {
    it('keeps full-size dice up to a dozen and shrinks larger pools by area', () => {
        expect(diceScaleFor(1)).toBe(1);
        expect(diceScaleFor(FULL_SIZE_DICE_POOL)).toBe(1);
        expect(diceScaleFor(FULL_SIZE_DICE_POOL * 4)).toBeCloseTo(0.5);
        expect(diceScaleFor(MAX_PHYSICAL_3D_DICE)).toBeGreaterThanOrEqual(MIN_DICE_SCALE);
        expect(diceScaleFor(10_000)).toBe(MIN_DICE_SCALE);
    });

    it('gives exploding dice the size of the throw they join', async () => {
        const group = parseGroup('1d6!');
        const rolls: DiceRoll[] = [{ sides: 6, value: 6, dropped: false }];
        const prepare = vi.fn(prepareGeometries);
        await processExplosionLoop(
            group,
            rolls,
            1,
            { addDice: vi.fn().mockResolvedValueOnce([2]) },
            { diceColor: '#000', textColor: '#fff', scaler: 0.5 },
            prepare
        );
        expect(prepare).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ scaler: 0.5 })
        );
    });
});

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

const RENDERER_PATH = '@site/src/dice_roller/dice-logic/renderer';
const ORCHESTRATOR_PATH = '@site/src/dice_roller/dice-logic/roll-orchestrator';

/** Counts how often the renderer module is actually evaluated (i.e. downloaded). */
const rendererLoads = vi.hoisted(() => ({ count: 0, failFirst: false }));

function mockRenderer(): void {
    vi.doMock(RENDERER_PATH, () => {
        rendererLoads.count++;
        const prepare = (groups: Array<{ count: number }>) => ({
            geometries: Array.from({ length: groups[0].count }, () => ({}) as never),
            groupSizes: [groups[0].count],
        });
        return {
            get prepareDiceGeometries() {
                if (rendererLoads.failFirst) {
                    rendererLoads.failFirst = false;
                    throw new Error('chunk unavailable');
                }
                return prepare;
            },
            startPhysicsRoll: () => ({
                sessionId: 1,
                settle: Promise.resolve([4]),
                lockDice: vi.fn(),
                rethrow: vi.fn(async () => []),
                addDice: vi.fn(async () => []),
                arrangeAndDismiss: vi.fn(),
                wasManuallyRerolled: () => false,
            }),
        };
    });
}

async function loadOrchestrator() {
    vi.resetModules();
    rendererLoads.count = 0;
    mockRenderer();
    return import(ORCHESTRATOR_PATH);
}

const config3d = { enable3dDice: true, diceColor: '#000', textColor: '#fff' };

describe('3D renderer loading', () => {
    it('never loads the renderer for a roll that resolves in 2D', async () => {
        const { executeUnifiedRoll } = await loadOrchestrator();

        await executeUnifiedRoll('1d6', { enable3dDice: false });
        await executeUnifiedRoll('1d7', config3d); // unsupported sides
        // 101 d100 are 202 physical d10: over the limit, though within the parser's 200 dice.
        await executeUnifiedRoll(`${MAX_PHYSICAL_3D_DICE / 2 + 1}d100`, config3d);

        expect(rendererLoads.count).toBe(0);
    });

    it('loads the renderer once across sequential 3D rolls', async () => {
        const { executeUnifiedRoll } = await loadOrchestrator();

        await executeUnifiedRoll('1d6', config3d);
        await executeUnifiedRoll('1d6', config3d);

        expect(rendererLoads.count).toBe(1);
    });

    it('loads the renderer once for concurrent 3D rolls', async () => {
        const { executeUnifiedRoll } = await loadOrchestrator();

        const [first, second] = await Promise.all([
            executeUnifiedRoll('1d6', config3d),
            executeUnifiedRoll('1d6', config3d),
        ]);

        expect(rendererLoads.count).toBe(1);
        expect(first.total).toBe(4);
        expect(second.total).toBe(4);
    });

    it('falls back to 2D with a flag when the renderer cannot be loaded', async () => {
        const { executeUnifiedRoll } = await loadOrchestrator();
        rendererLoads.failFirst = true;

        const result = await executeUnifiedRoll('1d6', config3d);

        expect(result.renderer3dUnavailable).toBe(true);
        expect(result.total).toBeGreaterThanOrEqual(1);
        expect(result.total).toBeLessThanOrEqual(6);
    });

    it('retries the load on a later roll after a failure', async () => {
        const { executeUnifiedRoll } = await loadOrchestrator();
        rendererLoads.failFirst = true;

        const failed = await executeUnifiedRoll('1d6', config3d);
        const recovered = await executeUnifiedRoll('1d6', config3d);

        expect(failed.renderer3dUnavailable).toBe(true);
        expect(recovered.renderer3dUnavailable).toBeUndefined();
        expect(recovered.total).toBe(4);
    });
});

describe('3D colour of labelled dice', () => {
    // Plain objects suffice: vi.doMock factories run later, inside each test.
    const prepared = { groups: [] as { count: number; diceColor?: string }[][] };
    const configs = { list: [] as { diceColor?: string }[] };

    async function loadColouredOrchestrator(settleValues: number[], explosionValues: number[]) {
        vi.resetModules();
        prepared.groups = [];
        configs.list = [];
        vi.doMock(RENDERER_PATH, () => ({
            prepareDiceGeometries: (
                groups: { count: number; diceColor?: string }[],
                config: { diceColor?: string }
            ) => {
                prepared.groups.push(groups.map(({ count, diceColor }) => ({ count, diceColor })));
                configs.list.push(config);
                return {
                    geometries: groups.flatMap((group) =>
                        Array.from({ length: group.count }, () => ({}) as never)
                    ),
                    groupSizes: groups.map((group) => group.count),
                };
            },
            startPhysicsRoll: () => ({
                sessionId: 1,
                settle: Promise.resolve(settleValues),
                lockDice: vi.fn(),
                rethrow: vi.fn(async () => []),
                addDice: vi.fn(async () => explosionValues),
                arrangeAndDismiss: vi.fn(),
                wasManuallyRerolled: () => false,
            }),
        }));
        return import(ORCHESTRATOR_PATH);
    }

    const colours = { ...config3d, diceColor: '#111111', specialDiceColor: '#8B0000' };

    it('gives labelled groups the special colour and leaves the others primary', async () => {
        const { executeUnifiedRoll } = await loadColouredOrchestrator([6, 3, 10], []);
        const result = await executeUnifiedRoll('(2d10+1d10:h)>=6', colours);

        expect(prepared.groups[0]).toEqual([
            { count: 2, diceColor: undefined },
            { count: 1, diceColor: '#8B0000' },
        ]);
        expect(configs.list[0].diceColor).toBe('#111111');
        expect(result.total).toBe(2);
    });

    it('keeps the special colour on dice exploded from a labelled group', async () => {
        const { executeUnifiedRoll } = await loadColouredOrchestrator([10], [3]);
        await executeUnifiedRoll('1d10:h>=6!', colours);
        expect(configs.list.at(-1)?.diceColor).toBe('#8B0000');
    });

    it('explodes unlabelled dice in the primary colour', async () => {
        const { executeUnifiedRoll } = await loadColouredOrchestrator([10], [3]);
        await executeUnifiedRoll('1d10>=6!', colours);
        expect(configs.list.at(-1)?.diceColor).toBe('#111111');
    });
});
