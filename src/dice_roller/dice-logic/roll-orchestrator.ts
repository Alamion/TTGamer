import { debug, warn } from '@site/src/shared/utils/logging';

import {
    FULL_SIZE_DICE_POOL,
    MAX_EXPLOSIONS,
    MAX_PHYSICAL_3D_DICE,
    MIN_DICE_SCALE,
} from '../utils/constants';
import type { MixedRollConfig } from '../utils/types-ext';
import { detectExplosion, detectRerolls, detectUnique, evaluateDiceAST } from './dice-evaluator';
import { parseToAST } from './dice-parser';
import { RollCancelledError } from './errors';
import type { DiceGeometryData, prepareDiceGeometries, startPhysicsRoll } from './renderer';
import type { PhysicsRollHandle } from './renderer/renderer-pool';
import type { ASTNode, DiceGroupNode, DiceRoll, RollResult } from './types';
import { buildGroupKey } from './utils';

const SUPPORTED_3D_SIDES = new Set([2, 4, 6, 8, 10, 12, 20, 100]);

interface RendererApi {
    prepareDiceGeometries: typeof prepareDiceGeometries;
    startPhysicsRoll: typeof startPhysicsRoll;
}

let rendererApi: Promise<RendererApi> | undefined;

/**
 * The 3D renderer and its physics engine are downloaded on the first 3D roll, never as part
 * of a page load. The promise is memoized so concurrent and later rolls share one download; a
 * rejected load clears it so a later roll can try again.
 */
function loadRenderer(): Promise<RendererApi> {
    rendererApi ??= import('./renderer')
        .then((module) => ({
            prepareDiceGeometries: module.prepareDiceGeometries,
            startPhysicsRoll: module.startPhysicsRoll,
        }))
        .catch((err: unknown) => {
            rendererApi = undefined;
            throw err;
        });
    return rendererApi;
}
const FUDGE_LABEL_MAP: Record<number, string> = { [-1]: '-', [0]: ' ', [1]: '+' };

function has3DSupportedDice(ast: ASTNode): boolean {
    let found = false;
    function traverse(node: ASTNode): void {
        if (node.type === 'DiceGroup') {
            if (SUPPORTED_3D_SIDES.has(node.sides)) {
                found = true;
            }
        } else if (node.type === 'BinaryOp') {
            traverse(node.left);
            traverse(node.right);
        } else if (node.type === 'UnaryOp') {
            traverse(node.operand);
        } else if (node.type === 'Parenthesized') {
            traverse(node.expression);
        }
    }
    traverse(ast);
    return found;
}

function extractDiceGroupNodes(ast: ASTNode): DiceGroupNode[] {
    const groups: DiceGroupNode[] = [];
    function traverse(node: ASTNode): void {
        if (node.type === 'DiceGroup') {
            groups.push(node);
        } else if (node.type === 'BinaryOp') {
            traverse(node.left);
            traverse(node.right);
        } else if (node.type === 'UnaryOp') {
            traverse(node.operand);
        } else if (node.type === 'Parenthesized') {
            traverse(node.expression);
        }
    }
    traverse(ast);
    return groups;
}

function convertFlatToGroupRolls(
    flatValues: number[],
    flatOffset: number,
    group: DiceGroupNode,
    multiplier: number,
    count: number
): DiceRoll[] {
    const rolls: DiceRoll[] = [];
    const isD100 = group.sides === 100;
    for (let d = 0; d < count; d++) {
        if (isD100) {
            const tens = flatValues[flatOffset + d * multiplier] % 10;
            const ones = flatValues[flatOffset + d * multiplier + 1] % 10;
            rolls.push({
                sides: 100,
                value: tens * 10 + ones === 0 ? 100 : tens * 10 + ones,
                dropped: false,
            });
        } else {
            const val = flatValues[flatOffset + d];
            rolls.push({
                sides: group.sides,
                value: val,
                faceLabel: group.fudge ? (FUDGE_LABEL_MAP[val] ?? String(val)) : undefined,
                dropped: false,
            });
        }
    }
    return rolls;
}

export async function processRethrowLoop(
    group: DiceGroupNode,
    allGroupRolls: DiceRoll[],
    flatValues: number[],
    flatOffset: number,
    multiplier: number,
    handle: {
        lockDice: (indices: number[]) => void;
        rethrow: (indices: number[]) => Promise<number[]>;
    },
    detectFn: (g: DiceGroupNode, rolls: DiceRoll[]) => number[],
    rerolledOnceSet?: Set<number>,
    onceFlag?: boolean
): Promise<number[]> {
    const isD100 = group.sides === 100;
    let current = flatValues;
    for (let iter = 0; iter < MAX_EXPLOSIONS; iter++) {
        const localIndices = detectFn(group, allGroupRolls);
        if (localIndices.length === 0) break;

        if (rerolledOnceSet && group.modifiers.reroll?.once) {
            for (const ri of localIndices) rerolledOnceSet.add(ri);
        }

        const flatIndices: number[] = [];
        for (const idx of localIndices) {
            for (let p = 0; p < multiplier; p++) {
                flatIndices.push(flatOffset + idx * multiplier + p);
            }
        }

        const allLockIndices: number[] = [];
        for (let i = 0; i < current.length; i++) {
            if (!flatIndices.includes(i)) allLockIndices.push(i);
        }

        handle.lockDice(allLockIndices);
        current = await handle.rethrow(flatIndices);

        for (const ri of localIndices) {
            let newValue: number;
            if (isD100) {
                const tens = current[flatOffset + ri * multiplier] % 10;
                const ones = current[flatOffset + ri * multiplier + 1] % 10;
                newValue = tens * 10 + ones === 0 ? 100 : tens * 10 + ones;
            } else {
                newValue = current[flatOffset + ri];
            }
            allGroupRolls[ri] = {
                ...allGroupRolls[ri],
                value: newValue,
                rerolledOnce:
                    rerolledOnceSet?.has(ri) || (onceFlag ? true : undefined) || undefined,
            };
        }

        if (onceFlag) break;
    }
    return current;
}

/**
 * Dice size for a throw of `physicalDice` dice. Large pools shrink so their total footprint
 * stays near that of a full-size dozen: fewer collisions keep frames cheap and let the pile
 * settle instead of jostling until the time limit.
 */
export function diceScaleFor(physicalDice: number): number {
    if (physicalDice <= FULL_SIZE_DICE_POOL) return 1;
    return Math.max(MIN_DICE_SCALE, Math.sqrt(FULL_SIZE_DICE_POOL / physicalDice));
}

/** The two d10 faces a d100 value shows: tens then ones, where 0 is the '00'/'0' face. */
function d100Faces(value: number): [number, number] {
    const tens = Math.floor((value % 100) / 10);
    const ones = value % 10;
    return [tens || 10, ones || 10];
}

/**
 * Per physical die of a throw, the value a forced `@` value needs it to show, or undefined for
 * a die physics decides. Groups without 3D geometry contribute no dice.
 */
export function physicalTargets(
    groups: readonly DiceGroupNode[],
    groupSizes: readonly number[]
): (number | undefined)[] {
    return groups.flatMap((group, index) => {
        if (!groupSizes[index]) return [];
        if (!group.forcedValues) return Array<undefined>(groupSizes[index]).fill(undefined);
        return group.forcedValues.flatMap((value) =>
            group.sides === 100 ? d100Faces(value) : [value]
        );
    });
}

export async function processExplosionLoop(
    group: DiceGroupNode,
    allGroupRolls: DiceRoll[],
    multiplier: number,
    handle: { addDice: (extraDiceData: DiceGeometryData[]) => Promise<number[]> },
    config: { diceColor: string; textColor: string; scaler?: number },
    prepareGeometries: typeof prepareDiceGeometries,
    physicalCapacity = { remaining: MAX_PHYSICAL_3D_DICE }
): Promise<void> {
    const isD100 = group.sides === 100;
    const isCompounding = group.modifiers.explode?.compounding ?? false;
    const isPenetrating = group.modifiers.explode?.penetrating ?? false;
    let explosionCount = 0;
    let compoundPending: number[] | undefined;

    while (explosionCount < MAX_EXPLOSIONS) {
        const detectedIndices = isCompounding
            ? (compoundPending ?? detectExplosion(group, allGroupRolls))
            : detectExplosion(group, allGroupRolls);
        const logicalCapacity = Math.floor(physicalCapacity.remaining / multiplier);
        const boundedDetectionCount = Math.min(
            detectedIndices.length,
            MAX_EXPLOSIONS - explosionCount
        );
        if (boundedDetectionCount > logicalCapacity) {
            throw new RangeError(
                `3D roll exceeded the ${MAX_PHYSICAL_3D_DICE}-die physical-session limit during explosions`
            );
        }
        const explodeIndices = detectedIndices.slice(
            0,
            Math.min(MAX_EXPLOSIONS - explosionCount, logicalCapacity)
        );
        if (explodeIndices.length === 0) break;

        for (const idx of explodeIndices) {
            allGroupRolls[idx] = {
                ...allGroupRolls[idx],
                exploded: true,
                compounded: isCompounding || undefined,
                penetrating: isPenetrating || undefined,
            };
        }

        const extraData = prepareGeometries(
            [
                {
                    // A d100 comes back as its tens and ones dice.
                    sides: group.sides,
                    count: explodeIndices.length,
                    modifiers: {},
                    fudge: group.fudge,
                },
            ],
            {
                diceColor: config.diceColor,
                textColor: config.textColor,
                scaler: config.scaler ?? 1,
            }
        );

        const explosionValues = await handle.addDice(extraData.geometries);
        physicalCapacity.remaining -= extraData.geometries.length;

        let evIdx = 0;
        const nextCompoundPending: number[] = [];
        for (const explodeIdx of explodeIndices) {
            let rawVal: number;
            if (isD100) {
                const tens = explosionValues[evIdx++] % 10;
                const ones = explosionValues[evIdx++] % 10;
                rawVal = tens * 10 + ones === 0 ? 100 : tens * 10 + ones;
            } else {
                rawVal = explosionValues[evIdx++];
            }

            const explosionVal = isPenetrating ? Math.max(0, rawVal - 1) : rawVal;

            if (isCompounding) {
                const existing = allGroupRolls[explodeIdx];
                allGroupRolls[explodeIdx] = {
                    ...existing,
                    value: existing.value + explosionVal,
                    compounded: true,
                };
                const rawRoll: DiceRoll = {
                    sides: group.sides,
                    value: rawVal,
                    dropped: false,
                };
                if (detectExplosion(group, [rawRoll]).length > 0) {
                    nextCompoundPending.push(explodeIdx);
                }
            } else {
                allGroupRolls.push({
                    sides: isD100 ? 100 : group.sides,
                    value: explosionVal,
                    dropped: false,
                    penetrating: isPenetrating || undefined,
                });
            }
        }

        explosionCount += explodeIndices.length;
        if (isCompounding) compoundPending = nextCompoundPending;
    }

    if (explosionCount >= MAX_EXPLOSIONS || physicalCapacity.remaining < multiplier) {
        const unprocessedIndices = isCompounding
            ? (compoundPending ?? detectExplosion(group, allGroupRolls))
            : detectExplosion(group, allGroupRolls);
        for (const index of unprocessedIndices) {
            allGroupRolls[index] = {
                ...allGroupRolls[index],
                exploded: true,
                compounded: isCompounding || undefined,
                penetrating: isPenetrating || undefined,
            };
        }
    }
}

export async function executeUnifiedRoll(
    notation: string,
    config?: Partial<MixedRollConfig>
): Promise<RollResult> {
    debug('Executing unified roll:', notation);

    const defaultConfig: MixedRollConfig = {
        diceColor: config?.diceColor ?? '#4a90e2',
        textColor: config?.textColor ?? '#ffffff',
        enable3dDice: config?.enable3dDice ?? false,
        enableSound: config?.enableSound ?? true,
        soundVolume: config?.soundVolume ?? 80,
        timeToReact: config?.timeToReact ?? false,
        timeToReactSeconds: config?.timeToReactSeconds ?? 5,
        diceLiveliness: config?.diceLiveliness,
        specialDiceColor: config?.specialDiceColor,
    };
    const colourOf = (group: DiceGroupNode) =>
        group.label && defaultConfig.specialDiceColor
            ? defaultConfig.specialDiceColor
            : defaultConfig.diceColor;

    let ast: ASTNode | null = null;
    let activeHandle: PhysicsRollHandle | undefined;

    try {
        ast = parseToAST(notation);

        if (!defaultConfig.enable3dDice || !has3DSupportedDice(ast)) {
            return evaluateDiceAST(ast, notation);
        }

        const diceGroupNodes = extractDiceGroupNodes(ast);
        const flatGroups = diceGroupNodes.map((g) => ({
            sides: g.sides,
            count: g.count,
            modifiers: g.modifiers,
            customFaces: g.customFaces,
            fudge: g.fudge,
            diceColor: g.label ? colourOf(g) : undefined,
        }));
        const physicalDiceCount = flatGroups.reduce(
            (total, group) => total + group.count * (group.sides === 100 ? 2 : 1),
            0
        );
        if (physicalDiceCount > MAX_PHYSICAL_3D_DICE) {
            warn(
                `3D rolls are limited to ${MAX_PHYSICAL_3D_DICE} physical dice — falling back to 2D`,
                '3DDiceRolls'
            );
            return evaluateDiceAST(ast, notation);
        }

        let renderer: RendererApi;
        try {
            renderer = await loadRenderer();
        } catch (err) {
            warn(
                `3D dice could not be loaded (${err instanceof Error ? err.message : String(err)}) — rolling ${notation} in 2D`,
                '3DDiceRolls'
            );
            return { ...evaluateDiceAST(ast, notation), renderer3dUnavailable: true };
        }
        const { prepareDiceGeometries, startPhysicsRoll } = renderer;
        const scaler = diceScaleFor(physicalDiceCount);

        const { geometries, groupSizes } = prepareDiceGeometries(flatGroups, {
            diceColor: defaultConfig.diceColor,
            textColor: defaultConfig.textColor,
            scaler,
        });

        if (geometries.length === 0) {
            warn('No 3D geometries could be created — falling back to 2D roll', '3DDiceRolls');
            return evaluateDiceAST(ast, notation);
        }

        const targets = physicalTargets(diceGroupNodes, groupSizes);
        const handle = startPhysicsRoll(
            {
                diceColor: defaultConfig.diceColor,
                textColor: defaultConfig.textColor,
                scaler,
                enableSound: defaultConfig.enableSound,
                soundVolume: defaultConfig.soundVolume,
                timeToReact: defaultConfig.timeToReact,
                timeToReactSeconds: defaultConfig.timeToReactSeconds,
                liveliness: defaultConfig.diceLiveliness,
            },
            geometries,
            groupSizes,
            targets
        );
        activeHandle = handle;

        let flatValues = await handle.settle;
        // Forced values are the result; the dice were aimed at them, and a throw disturbed
        // from outside (a click, another roll) only changes what is drawn.
        if (targets.some((target, index) => target !== undefined && target !== flatValues[index])) {
            warn(
                `Aimed dice of ${notation} landed differently; using the forced values`,
                '3DDiceRolls'
            );
        }
        flatValues = flatValues.map((value, index) => targets[index] ?? value);

        if (flatValues.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
            warn('Physics returned an invalid die value — falling back to 2D', '3DDiceRolls');
            handle.arrangeAndDismiss();
            activeHandle = undefined;
            return evaluateDiceAST(ast, notation);
        }

        const preGeneratedValues = new Map<string, DiceRoll[]>();
        let flatOffset = 0;
        const physicalCapacity = { remaining: MAX_PHYSICAL_3D_DICE - physicalDiceCount };

        for (let g = 0; g < diceGroupNodes.length; g++) {
            const group = diceGroupNodes[g];
            const multiplier = group.sides === 100 ? 2 : 1;
            const key = buildGroupKey(group, g);
            const initialPhysCount = groupSizes[g];
            // A group without 3D dice has no values here; the evaluator rolls it in 2D.
            if (!initialPhysCount) continue;

            const allGroupRolls = convertFlatToGroupRolls(
                flatValues,
                flatOffset,
                group,
                multiplier,
                group.count
            );

            const rerolledOnceIndices = new Set<number>();
            flatValues = await processRethrowLoop(
                group,
                allGroupRolls,
                flatValues,
                flatOffset,
                multiplier,
                handle,
                (g, rolls) =>
                    detectRerolls(
                        g,
                        rolls.map((r) => r.value),
                        rolls
                    ),
                rerolledOnceIndices
            );

            flatValues = await processRethrowLoop(
                group,
                allGroupRolls,
                flatValues,
                flatOffset,
                multiplier,
                handle,
                detectUnique,
                undefined,
                group.modifiers.unique?.once || undefined
            );

            await processExplosionLoop(
                group,
                allGroupRolls,
                multiplier,
                handle,
                { ...defaultConfig, diceColor: colourOf(group), scaler },
                prepareDiceGeometries,
                physicalCapacity
            );

            groupSizes[g] = allGroupRolls.length;
            preGeneratedValues.set(key, allGroupRolls);
            flatOffset += initialPhysCount;
        }

        handle.arrangeAndDismiss();
        activeHandle = undefined;

        const result = evaluateDiceAST(ast, notation, preGeneratedValues);
        return { ...result, manuallyRerolled: handle.wasManuallyRerolled() || undefined };
    } catch (err) {
        activeHandle?.arrangeAndDismiss();
        if (err instanceof RollCancelledError) {
            throw err;
        }
        const errMsg = err instanceof Error ? err.message : String(err);
        warn(errMsg, 'Unified roll failed');
        if (!ast) {
            ast = parseToAST(notation);
        }
        return evaluateDiceAST(ast!, notation);
    }
}

export function execute2DRoll(notation: string): RollResult {
    debug('Executing 2D roll:', notation);
    const ast = parseToAST(notation);
    return evaluateDiceAST(ast, notation);
}
