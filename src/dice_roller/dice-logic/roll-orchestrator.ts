import { parseToAST } from './dice-parser';
import { detectExplosion, detectRerolls, detectUnique, evaluateDiceAST } from './dice-evaluator';
import { prepareDiceGeometries, startPhysicsRoll } from './renderer';
import type { DiceGeometryData } from './renderer';
import type { ASTNode, DiceGroupNode, DiceRoll, RollResult } from './types';
import { buildGroupKey } from './utils';
import { debug, warn } from '@site/src/shared/utils/logging';
import type { MixedRollConfig } from '../utils/types-ext';
import { RollCancelledError } from './errors';

const SUPPORTED_3D_SIDES = new Set([2, 4, 6, 8, 10, 12, 20, 100]);
const FUDGE_LABEL_MAP: Record<number, string> = { [-1]: '-', [0]: ' ', [1]: '+' };

function hasForcedValues(ast: ASTNode): boolean {
    let found = false;
    function traverse(node: ASTNode): void {
        if (node.type === 'DiceGroup' && node.forcedValues && node.forcedValues.length > 0) {
            found = true;
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

async function processRethrowLoop(
    group: DiceGroupNode,
    allGroupRolls: DiceRoll[],
    flatValues: number[],
    flatOffset: number,
    multiplier: number,
    handle: {
        renderer: { lockDice: (indices: number[]) => void };
        rethrow: (indices: number[]) => Promise<number[]>;
    },
    detectFn: (g: DiceGroupNode, rolls: DiceRoll[]) => number[],
    rerolledOnceSet?: Set<number>,
    onceFlag?: boolean
): Promise<number[]> {
    const isD100 = group.sides === 100;
    let current = flatValues;
    for (let iter = 0; iter < 10; iter++) {
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

        handle.renderer.lockDice(allLockIndices);
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

async function processExplosionLoop(
    group: DiceGroupNode,
    allGroupRolls: DiceRoll[],
    multiplier: number,
    handle: { addDice: (extraDiceData: DiceGeometryData[]) => Promise<number[]> },
    config: { diceColor: string; textColor: string }
): Promise<void> {
    const isD100 = group.sides === 100;
    let safetyCounter = 0;
    while (safetyCounter < 100) {
        const explodeIndices = detectExplosion(group, allGroupRolls);
        if (explodeIndices.length === 0) break;

        const isCompounding = group.modifiers.explode?.compounding ?? false;
        const isPenetrating = group.modifiers.explode?.penetrating ?? false;

        for (const idx of explodeIndices) {
            allGroupRolls[idx] = {
                ...allGroupRolls[idx],
                exploded: true,
                compounded: isCompounding || undefined,
                penetrating: isPenetrating || undefined,
            };
        }

        const extraData = prepareDiceGeometries(
            [
                {
                    sides: isD100 ? 10 : group.sides,
                    count: explodeIndices.length * multiplier,
                    modifiers: {},
                    fudge: group.fudge,
                },
            ],
            { diceColor: config.diceColor, textColor: config.textColor, scaler: 1 }
        );

        const explosionValues = await handle.addDice(extraData.geometries);

        let evIdx = 0;
        for (let ei = 0; ei < explodeIndices.length; ei++) {
            const explodeIdx = explodeIndices[ei];

            for (let p = 0; p < multiplier; p++) {
                let rawVal = explosionValues[evIdx++];

                if (isD100) {
                    const tens = rawVal % 10;
                    const ones = p + 1 < multiplier ? explosionValues[evIdx++] % 10 : 0;
                    rawVal = tens * 10 + ones === 0 ? 100 : tens * 10 + ones;
                }

                const explosionVal = isPenetrating ? Math.max(0, rawVal - 1) : rawVal;

                if (isCompounding) {
                    const existing = allGroupRolls[explodeIdx];
                    allGroupRolls[explodeIdx] = {
                        ...existing,
                        value: existing.value + explosionVal,
                        compounded: true,
                    };
                } else {
                    allGroupRolls.push({
                        sides: isD100 ? 100 : group.sides,
                        value: explosionVal,
                        dropped: false,
                        penetrating: isPenetrating || undefined,
                    });
                }

                if (!isD100) break;
            }
        }

        safetyCounter++;
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
    };

    let ast: ASTNode | null = null;

    try {
        ast = parseToAST(notation);

        const hasForced = hasForcedValues(ast);

        if (hasForced && defaultConfig.enable3dDice && has3DSupportedDice(ast)) {
            warn(
                `Forced rolls (@) not supported in 3D mode — rolling ${notation} with random physics`,
                '3DDiceRolls'
            );
        }

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
        }));

        const { geometries, groupSizes } = prepareDiceGeometries(flatGroups, {
            diceColor: defaultConfig.diceColor,
            textColor: defaultConfig.textColor,
            scaler: 1,
        });

        if (geometries.length === 0) {
            warn('No 3D geometries could be created — falling back to 2D roll', '3DDiceRolls');
            return evaluateDiceAST(ast, notation);
        }

        const handle = startPhysicsRoll(
            {
                diceColor: defaultConfig.diceColor,
                textColor: defaultConfig.textColor,
                scaler: 1,
                enableSound: defaultConfig.enableSound,
                soundVolume: defaultConfig.soundVolume,
                timeToReact: defaultConfig.timeToReact,
                timeToReactSeconds: defaultConfig.timeToReactSeconds,
            },
            geometries,
            groupSizes
        );

        let flatValues = await handle.settle;

        // Sanitize flatValues: replace undefined/NaN with a random fallback
        flatValues = flatValues.map((v, i) => {
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                warn(
                    `Physics returned invalid value for die ${i}, using random fallback`,
                    '3DDiceRolls'
                );
                return Math.floor(Math.random() * 20) + 1;
            }
            return v;
        });

        const preGeneratedValues = new Map<string, DiceRoll[]>();
        let flatOffset = 0;

        for (let g = 0; g < diceGroupNodes.length; g++) {
            const group = diceGroupNodes[g];
            const multiplier = group.sides === 100 ? 2 : 1;
            const key = buildGroupKey(group, g);
            const initialPhysCount = groupSizes[g];

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

            await processExplosionLoop(group, allGroupRolls, multiplier, handle, defaultConfig);

            groupSizes[g] = allGroupRolls.length;
            preGeneratedValues.set(key, allGroupRolls);
            flatOffset += initialPhysCount;
        }

        handle.arrangeAndDismiss();

        return evaluateDiceAST(ast, notation, preGeneratedValues);
    } catch (err) {
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
