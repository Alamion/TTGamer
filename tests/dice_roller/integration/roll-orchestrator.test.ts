import { parseToAST } from '@site/src/dice_roller/dice-logic/dice-parser';
import {
    diceScaleFor,
    physicalTargets,
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
const rendererLoads = vi.hoisted(() => ({
    count: 0,
    failFirst: false,
    targets: undefined as readonly (number | undefined)[] | undefined,
}));

function mockRenderer(): void {
    vi.doMock(RENDERER_PATH, () => {
        rendererLoads.count++;
        const prepare = (groups: Array<{ count: number }>) => ({
            geometries: groups.flatMap((group) =>
                Array.from({ length: group.count }, () => ({}) as never)
            ),
            groupSizes: groups.map((group) => group.count),
        });
        return {
            get prepareDiceGeometries() {
                if (rendererLoads.failFirst) {
                    rendererLoads.failFirst = false;
                    throw new Error('chunk unavailable');
                }
                return prepare;
            },
            startPhysicsRoll: (
                _config: unknown,
                diceData: unknown[],
                _sizes: unknown,
                targets?: readonly (number | undefined)[]
            ) => {
                rendererLoads.targets = targets;
                return {
                    sessionId: 1,
                    // Physics shows 4 on every die; aimed dice must not keep it.
                    settle: Promise.resolve(diceData.map(() => 4)),
                    lockDice: vi.fn(),
                    rethrow: vi.fn(async () => []),
                    addDice: vi.fn(async () => []),
                    arrangeAndDismiss: vi.fn(),
                    wasManuallyRerolled: () => false,
                };
            },
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
                settle: settleValues,
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

describe('forced values in 3D (dice #14)', () => {
    it('aims each physical die at its forced value; d100 at its tens and ones faces', () => {
        const groups = [parseGroup('2d6@3,5'), parseGroup('3d8'), parseGroup('2d100@70,100')];
        expect(physicalTargets(groups, [2, 3, 4])).toEqual([
            3,
            5,
            undefined,
            undefined,
            undefined,
            7,
            10,
            10,
            10,
        ]);
        expect(physicalTargets([parseGroup('1d100@7')], [2])).toEqual([10, 7]);
    });

    it('skips groups without 3D dice', () => {
        expect(physicalTargets([parseGroup('2d7@1,2'), parseGroup('1d6@6')], [0, 1])).toEqual([6]);
    });

    it('rolls forced notation in 3D and reports the forced values', async () => {
        const { executeUnifiedRoll } = await loadOrchestrator();
        const result = await executeUnifiedRoll('2d6@3,5+1d6', config3d);

        expect(rendererLoads.targets).toEqual([3, 5, undefined]);
        expect(result.total).toBe(12);
        expect(result.diceGroups[0].rolls.map((roll: DiceRoll) => roll.value)).toEqual([3, 5]);
    });
});

/** What the scripted renderer answers, one entry per physics call, and what it was asked. */
/** `'cancel'` is the player cancelling; an Error is the renderer failing. */
type Answer = number[] | Error | 'cancel';

interface Script {
    settle: Answer;
    rethrows?: Answer[];
    additions?: Answer[];
}

const scripted = {
    groupSizes: [] as number[],
    targets: undefined as readonly (number | undefined)[] | undefined,
    handle: undefined as
        | {
              lockDice: ReturnType<typeof vi.fn>;
              rethrow: ReturnType<typeof vi.fn>;
              addDice: ReturnType<typeof vi.fn>;
              arrangeAndDismiss: ReturnType<typeof vi.fn>;
          }
        | undefined,
};

const ERRORS_PATH = '@site/src/dice_roller/dice-logic/errors';
const PHYSICAL_SIDES = new Set([2, 4, 6, 8, 10, 12, 20, 100]);

/** A renderer whose dice carry their sides, with physics answers taken from `script`. */
async function loadScriptedOrchestrator(script: Script) {
    vi.resetModules();
    scripted.handle = undefined;
    // The error class of the fresh module graph, the one the orchestrator checks against.
    const { RollCancelledError } = await import(ERRORS_PATH);
    const answer = async (next: Answer | undefined) => {
        if (next === 'cancel') throw new RollCancelledError();
        if (next instanceof Error) throw next;
        return next ?? [];
    };
    vi.doMock(RENDERER_PATH, () => ({
        // Mirrors the factory: a d100 is a tens die and a ones die; odd sides get no dice.
        prepareDiceGeometries: (groups: Array<{ sides: number; count: number }>) => {
            const sizes = groups.map((group) =>
                PHYSICAL_SIDES.has(group.sides) ? group.count * (group.sides === 100 ? 2 : 1) : 0
            );
            return {
                geometries: groups.flatMap((group, index) =>
                    Array.from({ length: sizes[index] }, (_, die) => ({
                        sides: group.sides === 100 && die % 2 === 1 ? 10 : group.sides,
                    }))
                ),
                groupSizes: sizes,
            };
        },
        startPhysicsRoll: (
            _config: unknown,
            _dice: unknown[],
            groupSizes: number[],
            targets?: readonly (number | undefined)[]
        ) => {
            scripted.groupSizes = [...groupSizes];
            scripted.targets = targets;
            scripted.handle = {
                lockDice: vi.fn(),
                rethrow: vi.fn(() => answer(script.rethrows?.shift())),
                addDice: vi.fn(() => answer(script.additions?.shift())),
                arrangeAndDismiss: vi.fn(),
            };
            return {
                sessionId: 1,
                settle: answer(script.settle),
                ...scripted.handle,
                wasManuallyRerolled: () => false,
            };
        },
    }));
    return import(ORCHESTRATOR_PATH);
}

/** Makes every 2D die roll its highest face, so 2D values are recognisable. */
function rollHighIn2D() {
    return vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
        (array as Uint32Array).fill(0xffffffff);
        return array;
    });
}

const valuesOf = (result: { diceGroups: Array<{ rolls: DiceRoll[] }> }, group: number) =>
    result.diceGroups[group].rolls.map((roll) => roll.value);

describe('mixed 3D and 2D groups (dice #5)', () => {
    it('rolls a group without 3D dice in 2D instead of reading its neighbours', async () => {
        const random = rollHighIn2D();
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            settle: [4, 5],
        });
        const result = await executeUnifiedRoll('1d7+2d6', config3d);
        random.mockRestore();

        expect(scripted.groupSizes).toEqual([0, 2]);
        expect(valuesOf(result, 0)).toEqual([7]);
        expect(valuesOf(result, 1)).toEqual([4, 5]);
        expect(result.total).toBe(16);
    });

    it('keeps forced values of a group without 3D dice and aims only the physical ones', async () => {
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            settle: [4, 4],
        });
        const result = await executeUnifiedRoll('1d7@2+2d6@6,1', config3d);

        expect(scripted.targets).toEqual([6, 1]);
        expect(valuesOf(result, 0)).toEqual([2]);
        expect(valuesOf(result, 1)).toEqual([6, 1]);
    });

    it('rerolls a physical group after a skipped one at its own dice', async () => {
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            settle: [1, 4],
            rethrows: [[3, 4]],
        });
        const result = await executeUnifiedRoll('2d7@5,5+2d6r=1', config3d);

        expect(scripted.handle!.rethrow).toHaveBeenCalledWith([0]);
        expect(scripted.handle!.lockDice).toHaveBeenCalledWith([1]);
        expect(valuesOf(result, 1)).toEqual([3, 4]);
    });
});

describe('d100 rerolls and explosions in 3D (dice #5)', () => {
    it('rerolls both dice of a d100 and reads the new pair', async () => {
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            // 42 and 00 (= 100); the 100 is rerolled into 35.
            settle: [4, 2, 10, 10],
            rethrows: [[4, 2, 3, 5]],
        });
        const result = await executeUnifiedRoll('2d100r=100', config3d);

        expect(scripted.handle!.lockDice).toHaveBeenCalledWith([0, 1]);
        expect(scripted.handle!.rethrow).toHaveBeenCalledWith([2, 3]);
        expect(valuesOf(result, 0)).toEqual([42, 35]);
        expect(result.total).toBe(77);
    });

    it('explodes a d100 into a new tens and ones pair', async () => {
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            settle: [10, 10],
            additions: [[5, 10]],
        });
        const result = await executeUnifiedRoll('1d100!', config3d);

        const added = scripted.handle!.addDice.mock.calls[0][0] as Array<{ sides: number }>;
        expect(added.map((die) => die.sides)).toEqual([100, 10]);
        expect(valuesOf(result, 0)).toEqual([100, 50]);
        expect(result.total).toBe(150);
    });

    it('compounds d100 explosions into the die that exploded', async () => {
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            settle: [10, 10],
            additions: [
                [10, 10],
                [1, 2],
            ],
        });
        const result = await executeUnifiedRoll('1d100!!', config3d);

        expect(scripted.handle!.addDice).toHaveBeenCalledTimes(2);
        expect(valuesOf(result, 0)).toEqual([212]);
    });
});

describe('falling back to 2D mid-roll (dice #5)', () => {
    it('rolls in 2D and clears the table when physics returns an unreadable value', async () => {
        const random = rollHighIn2D();
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            settle: [Number.NaN],
        });
        const result = await executeUnifiedRoll('1d6', config3d);
        random.mockRestore();

        expect(result.total).toBe(6);
        expect(scripted.handle!.arrangeAndDismiss).toHaveBeenCalledTimes(1);
    });

    it('rolls in 2D and clears the table when the renderer fails during a reroll', async () => {
        const random = rollHighIn2D();
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            settle: [1],
            rethrows: [new Error('No active session')],
        });
        const result = await executeUnifiedRoll('1d6r=1', config3d);
        random.mockRestore();

        expect(result.total).toBe(6);
        expect(scripted.handle!.arrangeAndDismiss).toHaveBeenCalledTimes(1);
    });

    it('rolls in 2D when explosions would outgrow the physical-dice limit', async () => {
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            // Every d100 of a full table shows 100 and would explode.
            settle: Array.from({ length: MAX_PHYSICAL_3D_DICE }, () => 10),
        });
        const random = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
            (array as Uint32Array).fill(0);
            return array;
        });
        const result = await executeUnifiedRoll(`${MAX_PHYSICAL_3D_DICE / 2}d100!`, config3d);
        random.mockRestore();

        expect(scripted.handle!.addDice).not.toHaveBeenCalled();
        expect(scripted.handle!.arrangeAndDismiss).toHaveBeenCalledTimes(1);
        expect(result.total).toBe(MAX_PHYSICAL_3D_DICE / 2);
    });
});

describe('cancelling a 3D roll (dice #5)', () => {
    const cancelledError = async () => (await import(ERRORS_PATH)).RollCancelledError;

    it('rejects with the cancellation instead of rolling in 2D', async () => {
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({ settle: 'cancel' });
        const RollCancelledError = await cancelledError();

        await expect(executeUnifiedRoll('2d6', config3d)).rejects.toBeInstanceOf(
            RollCancelledError
        );
        expect(scripted.handle!.arrangeAndDismiss).toHaveBeenCalledTimes(1);
    });

    it('rejects when the roll is cancelled during a reroll', async () => {
        const { executeUnifiedRoll } = await loadScriptedOrchestrator({
            settle: [1],
            rethrows: ['cancel'],
        });
        const RollCancelledError = await cancelledError();

        await expect(executeUnifiedRoll('1d6r=1', config3d)).rejects.toBeInstanceOf(
            RollCancelledError
        );
    });

    it('reaches no history or Discord subscriber', async () => {
        await loadScriptedOrchestrator({ settle: 'cancel' });
        const { handleRollEvent } = await import('@site/src/dice_roller/utils/events');
        const { onRollResult } = await import('@site/src/dice_roller/dice-logic/dice-roller');
        const subscriber = vi.fn();
        const unsubscribe = onRollResult(subscriber);
        const RollCancelledError = await cancelledError();

        await expect(handleRollEvent('2d6', config3d)).rejects.toBeInstanceOf(RollCancelledError);
        unsubscribe();
        expect(subscriber).not.toHaveBeenCalled();
    });
});
