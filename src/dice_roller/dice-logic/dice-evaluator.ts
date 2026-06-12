import type {
    ASTNode,
    ComparePoint,
    DiceGroupResult,
    DiceRoll,
    FullRollResult,
    DiceGroupNode,
    ExplodeModifier,
    RerollModifier,
    UniqueModifier,
} from './types';
import { formatModifiers, applyKeepDrop, formatRollValues, buildGroupKey } from './utils';
import { debug } from '@site/src/shared/utils/logging';
import { MAX_EXPLOSIONS } from '../utils/constants';

function randFloat(randomFn?: () => number): number {
    if (randomFn) return randomFn();
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / (0xffffffff + 1);
}

function rollSingleDie(sides: number, customFaces?: number[], randomFn?: () => number): number {
    const rand = randFloat(randomFn);
    if (customFaces && customFaces.length > 0) {
        const index = Math.floor(rand * customFaces.length);
        return customFaces[index];
    }
    return Math.floor(rand * sides) + 1;
}

function rollFudgeDie(randomFn?: () => number): { value: number; faceLabel: string } {
    const rand = randFloat(randomFn);
    const index = Math.floor(rand * 3);
    const values = [-1, 0, 1];
    const labels = ['-', ' ', '+'];
    return { value: values[index], faceLabel: labels[index] };
}

function matchesComparePoint(value: number, cp: ComparePoint): boolean {
    switch (cp.operator) {
        case '>':
            return value > cp.value;
        case '>=':
            return value >= cp.value;
        case '<':
            return value < cp.value;
        case '<=':
            return value <= cp.value;
        case '=':
            return value === cp.value;
        case '!=':
            return value !== cp.value;
        case '<>':
            return value !== cp.value;
        default:
            return false;
    }
}

function matchesExplosionCondition(
    value: number,
    sides: number,
    explode: ExplodeModifier,
    customFaces?: number[]
): boolean {
    if (explode.comparePoint) {
        return matchesComparePoint(value, explode.comparePoint);
    }
    const maxVal = customFaces && customFaces.length > 0 ? Math.max(...customFaces) : sides;
    return value === maxVal;
}

// Modifier order 1: Min
function applyMin(rolls: DiceRoll[], minValue: number): DiceRoll[] {
    return rolls.map((r) => ({
        ...r,
        value: r.value < minValue ? minValue : r.value,
        minRaised: r.value < minValue ? true : undefined,
    }));
}

// Modifier order 2: Max
function applyMax(rolls: DiceRoll[], maxValue: number): DiceRoll[] {
    return rolls.map((r) => ({
        ...r,
        value: r.value > maxValue ? maxValue : r.value,
        maxCapped: r.value > maxValue ? true : undefined,
    }));
}

// Modifier order 3: Explode (including compound and penetrating)
function applyExplode(
    rolls: DiceRoll[],
    sides: number,
    explode: ExplodeModifier,
    customFaces?: number[],
    randomFn?: () => number,
    explosionCount?: { count: number }
): DiceRoll[] {
    const result: DiceRoll[] = [];
    const counter = explosionCount || { count: 0 };

    for (const roll of rolls) {
        if (!roll.exploded && matchesExplosionCondition(roll.value, sides, explode, customFaces)) {
            if (explode.compounding) {
                let compoundValue = roll.value;
                let currentVal = roll.value;
                while (
                    matchesExplosionCondition(currentVal, sides, explode, customFaces) &&
                    counter.count < MAX_EXPLOSIONS
                ) {
                    const newVal = rollSingleDie(sides, customFaces, randomFn);
                    counter.count++;
                    const addVal = explode.penetrating ? Math.max(0, newVal - 1) : newVal;
                    compoundValue += addVal;
                    currentVal = newVal;
                    if (!matchesExplosionCondition(currentVal, sides, explode, customFaces)) break;
                }
                result.push({
                    ...roll,
                    value: compoundValue,
                    compounded: true,
                    penetrating: explode.penetrating || undefined,
                });
            } else {
                result.push({
                    ...roll,
                    exploded: true,
                    penetrating: explode.penetrating || undefined,
                });
                const newVal = rollSingleDie(sides, customFaces, randomFn);
                counter.count++;
                const explosionVal = explode.penetrating ? Math.max(0, newVal - 1) : newVal;
                const newRoll: DiceRoll = {
                    sides,
                    value: explosionVal,
                    dropped: false,
                    exploded: false,
                    penetrating: explode.penetrating || undefined,
                };
                if (
                    matchesExplosionCondition(explosionVal, sides, explode, customFaces) &&
                    counter.count < MAX_EXPLOSIONS
                ) {
                    const subRolls = applyExplode(
                        [newRoll],
                        sides,
                        explode,
                        customFaces,
                        randomFn,
                        counter
                    );
                    result.push(...subRolls);
                } else {
                    result.push(newRoll);
                }
            }
        } else {
            result.push({ ...roll });
        }
    }

    return result;
}

// Modifier order 4: Reroll
function applyReroll(
    rolls: DiceRoll[],
    sides: number,
    reroll: RerollModifier,
    customFaces?: number[],
    randomFn?: () => number
): DiceRoll[] {
    return rolls.map((roll) => {
        let current = { ...roll };
        let attempts = 0;
        const shouldReroll = (val: number) =>
            reroll.comparePoint ? matchesComparePoint(val, reroll.comparePoint) : false;

        while (shouldReroll(current.value) && attempts < MAX_EXPLOSIONS) {
            current = { ...current, value: rollSingleDie(sides, customFaces, randomFn) };
            attempts++;
            if (reroll.once) break;
        }
        return current;
    });
}

// Modifier order 5: Unique
function applyUnique(
    rolls: DiceRoll[],
    sides: number,
    unique: UniqueModifier,
    customFaces?: number[],
    randomFn?: () => number
): DiceRoll[] {
    const result = rolls.map((r) => ({ ...r }));
    let safety = 0;
    const rerolledOnce = new Set<number>();

    while (safety < MAX_EXPLOSIONS) {
        const valueCounts = new Map<number, number[]>();
        result.forEach((r, idx) => {
            const list = valueCounts.get(r.value) || [];
            list.push(idx);
            valueCounts.set(r.value, list);
        });

        const toReroll: number[] = [];
        for (const [, indices] of valueCounts) {
            if (indices.length > 1) {
                for (const idx of indices) {
                    if (unique.once && rerolledOnce.has(idx)) continue;
                    const val = result[idx].value;
                    if (!unique.comparePoint || matchesComparePoint(val, unique.comparePoint)) {
                        toReroll.push(idx);
                    }
                }
            }
        }

        if (toReroll.length === 0) break;

        const deduped = [...new Set(toReroll)];
        for (const idx of deduped) {
            result[idx] = { ...result[idx], value: rollSingleDie(sides, customFaces, randomFn) };
            rerolledOnce.add(idx);
        }

        if (unique.once) break;
        safety++;
    }

    return result;
}

function applyTargetSuccess(rolls: DiceRoll[], condition: ComparePoint): DiceRoll[] {
    return rolls.map((r) => ({
        ...r,
        targetSuccess: matchesComparePoint(r.value, condition) ? true : undefined,
        hasTarget: true,
    }));
}

function applyTargetFailure(rolls: DiceRoll[], condition: ComparePoint): DiceRoll[] {
    return rolls.map((r) => ({
        ...r,
        targetFailure: matchesComparePoint(r.value, condition) ? true : undefined,
        hasTarget: true,
    }));
}

function applyCriticalSuccess(
    rolls: DiceRoll[],
    sides: number,
    criticalMod: ComparePoint | true,
    customFaces?: number[],
    botch?: boolean
): DiceRoll[] {
    return rolls.map((r) => {
        const isCrit =
            criticalMod === true
                ? r.value ===
                  (customFaces && customFaces.length > 0 ? Math.max(...customFaces) : sides)
                : matchesComparePoint(r.value, criticalMod);
        return {
            ...r,
            criticalSuccess: isCrit ? true : undefined,
            criticalSuccessBotch: isCrit && botch ? true : undefined,
        };
    });
}

function applyCriticalFailure(
    rolls: DiceRoll[],
    criticalMod: ComparePoint | true,
    customFaces?: number[],
    botch?: boolean
): DiceRoll[] {
    return rolls.map((r) => {
        const isCrit =
            criticalMod === true
                ? r.value === (customFaces && customFaces.length > 0 ? Math.min(...customFaces) : 1)
                : matchesComparePoint(r.value, criticalMod);
        return {
            ...r,
            criticalFailure: isCrit ? true : undefined,
            criticalFailureBotch: isCrit && botch ? true : undefined,
        };
    });
}

export function detectRerolls(
    node: DiceGroupNode,
    rawValues: number[],
    rolls?: DiceRoll[]
): number[] {
    if (!node.modifiers.reroll) return [];
    const reroll = node.modifiers.reroll;
    const indices: number[] = [];
    for (let i = 0; i < rawValues.length; i++) {
        if (reroll.comparePoint && matchesComparePoint(rawValues[i], reroll.comparePoint)) {
            if (reroll.once && rolls?.[i]?.rerolledOnce) continue;
            indices.push(i);
        }
    }
    return indices;
}

export function detectExplosion(node: DiceGroupNode, rolls: DiceRoll[]): number[] {
    if (!node.modifiers.explode) return [];
    const explode = node.modifiers.explode;
    const indices: number[] = [];
    for (let i = 0; i < rolls.length; i++) {
        if (
            !rolls[i].exploded &&
            matchesExplosionCondition(rolls[i].value, node.sides, explode, node.customFaces)
        ) {
            indices.push(i);
        }
    }
    return indices;
}

export function detectUnique(node: DiceGroupNode, rolls: DiceRoll[]): number[] {
    if (!node.modifiers.unique) return [];
    const unique = node.modifiers.unique;
    const valueCounts = new Map<number, number[]>();
    rolls.forEach((r, idx) => {
        if (r.dropped) return;
        const list = valueCounts.get(r.value) || [];
        list.push(idx);
        valueCounts.set(r.value, list);
    });

    const indices: number[] = [];
    for (const [, positions] of valueCounts) {
        if (positions.length > 1) {
            for (const idx of positions) {
                if (unique.once && rolls[idx].rerolledOnce) continue;
                const val = rolls[idx].value;
                if (!unique.comparePoint || matchesComparePoint(val, unique.comparePoint)) {
                    indices.push(idx);
                }
            }
        }
    }
    return [...new Set(indices)];
}

function evaluateDiceGroup(
    node: DiceGroupNode,
    operation: '+' | '-' | '*' | '/' | '%' | '^',
    groupIndex: number,
    preGeneratedValues?: Map<string, DiceRoll[]>,
    randomFn?: () => number
): DiceGroupResult {
    const groupKey = buildGroupKey(node, groupIndex);

    const preRolls = preGeneratedValues?.get(groupKey);
    let rolls: DiceRoll[];

    if (preRolls) {
        rolls = preRolls.map((r) => ({ ...r }));
    } else if (node.forcedValues) {
        if (node.forcedValues.length !== node.count) {
            throw new Error(
                `Forced roll count mismatch for ${node.count}d${node.sides}: ` +
                    `expected ${node.count} value(s), got ${node.forcedValues.length} ` +
                    `(${node.forcedValues.join(',')})`
            );
        }
        rolls = node.forcedValues.map((val) => ({
            sides: node.sides,
            value: val,
            dropped: false,
        }));
    } else {
        rolls = [];

        if (node.fudge) {
            for (let i = 0; i < node.count; i++) {
                const fd = rollFudgeDie(randomFn);
                rolls.push({
                    sides: 6,
                    value: fd.value,
                    faceLabel: fd.faceLabel,
                    dropped: false,
                });
            }
        } else {
            for (let i = 0; i < node.count; i++) {
                rolls.push({
                    sides:
                        node.customFaces && node.customFaces.length > 0
                            ? Math.max(...node.customFaces)
                            : node.sides,
                    value: rollSingleDie(node.sides, node.customFaces, randomFn),
                    dropped: false,
                });
            }
        }
    }

    // Order 1: Min — always applies (including pre-gen)
    if (node.modifiers.min) {
        rolls = applyMin(rolls, node.modifiers.min);
    }

    // Order 2: Max — always applies (including pre-gen)
    if (node.modifiers.max) {
        rolls = applyMax(rolls, node.modifiers.max);
    }

    // Order 3-5: Explode/Reroll/Unique — only for non-pre-gen
    if (!preRolls) {
        if (node.modifiers.explode) {
            rolls = applyExplode(
                rolls,
                node.sides,
                node.modifiers.explode,
                node.customFaces,
                randomFn
            );
        }
        if (node.modifiers.reroll) {
            rolls = applyReroll(
                rolls,
                node.sides,
                node.modifiers.reroll,
                node.customFaces,
                randomFn
            );
        }
        if (node.modifiers.unique) {
            rolls = applyUnique(
                rolls,
                node.sides,
                node.modifiers.unique,
                node.customFaces,
                randomFn
            );
        }
    }

    // Order 6-7: Keep/Drop (always applies)
    rolls = applyKeepDrop(rolls, node.modifiers);

    // Order 8: Target success/failure
    if (node.modifiers.targetSuccess) {
        rolls = applyTargetSuccess(rolls, node.modifiers.targetSuccess);
    }
    if (node.modifiers.targetFailure) {
        rolls = applyTargetFailure(rolls, node.modifiers.targetFailure);
    }

    // Order 9: Critical success
    if (node.modifiers.criticalSuccess) {
        rolls = applyCriticalSuccess(
            rolls,
            node.sides,
            node.modifiers.criticalSuccess,
            node.customFaces,
            node.modifiers.criticalSuccessBotch
        );
    }

    // Order 10: Critical failure
    if (node.modifiers.criticalFailure) {
        rolls = applyCriticalFailure(
            rolls,
            node.modifiers.criticalFailure,
            node.customFaces,
            node.modifiers.criticalFailureBotch
        );
    }

    // Order 11: Sort
    if (node.modifiers.sort) {
        const dropped = rolls.filter((r) => r.dropped);
        const kept = rolls.filter((r) => !r.dropped);
        kept.sort((a, b) =>
            node.modifiers.sort === 'asc' ? a.value - b.value : b.value - a.value
        );
        rolls = [...kept, ...dropped];
    }

    const keptRolls = rolls.filter((r) => !r.dropped);
    const droppedRolls = rolls.filter((r) => r.dropped);

    let sum: number;
    if (node.modifiers.targetSuccess) {
        const successCount = keptRolls.filter((r) => r.targetSuccess).length;
        const failureCount = keptRolls.filter((r) => r.targetFailure).length;
        sum = successCount - failureCount;
    } else {
        sum = keptRolls.reduce((acc, r) => acc + r.value, 0);
    }

    // Botch adjustment: csb adds +1 per crit success, cfb subtracts 1 per crit failure
    if (node.modifiers.criticalSuccessBotch) {
        sum += keptRolls.filter((r) => r.criticalSuccessBotch).length;
    }
    if (node.modifiers.criticalFailureBotch) {
        sum -= keptRolls.filter((r) => r.criticalFailureBotch).length;
    }

    const notationParts: string[] = [];
    if (node.fudge) {
        notationParts.push(`${node.count}dF`);
    } else if (node.customFaces) {
        notationParts.push(`${node.count}d[${node.customFaces.join(',')}]`);
    } else {
        notationParts.push(`${node.count}d${node.sides}`);
    }

    return {
        notation: `${notationParts.join('')}${formatModifiers(node.modifiers)}`,
        sides: node.fudge ? 6 : node.sides,
        rolls,
        keptRolls,
        droppedRolls,
        sum,
        operation,
    };
}

function evaluateAST(
    node: ASTNode,
    operation: '+' | '-' | '*' | '/' | '%' | '^' = '+',
    preGeneratedValues?: Map<string, DiceRoll[]>,
    groupIndex: { current: number } = { current: 0 },
    randomFn?: () => number
): { value: number; diceGroups: DiceGroupResult[] } {
    if (node.type === 'NumericLiteral') {
        return { value: node.value, diceGroups: [] };
    }

    if (node.type === 'DiceGroup') {
        const idx = groupIndex.current++;
        const group = evaluateDiceGroup(node, operation, idx, preGeneratedValues, randomFn);
        return { value: group.sum, diceGroups: [group] };
    }

    if (node.type === 'BinaryOp') {
        const leftResult = evaluateAST(
            node.left,
            operation,
            preGeneratedValues,
            groupIndex,
            randomFn
        );
        const rightResult = evaluateAST(
            node.right,
            node.operator,
            preGeneratedValues,
            groupIndex,
            randomFn
        );

        let value: number;
        switch (node.operator) {
            case '+':
                value = leftResult.value + rightResult.value;
                break;
            case '-':
                value = leftResult.value - rightResult.value;
                break;
            case '*':
                value = leftResult.value * rightResult.value;
                break;
            case '/':
                value =
                    rightResult.value !== 0 ? Math.floor(leftResult.value / rightResult.value) : 0;
                break;
            case '%':
                value = leftResult.value % rightResult.value;
                break;
            case '^':
                value = Math.pow(leftResult.value, rightResult.value);
                break;
            default:
                value = 0;
        }

        return {
            value,
            diceGroups: [...leftResult.diceGroups, ...rightResult.diceGroups],
        };
    }

    if (node.type === 'UnaryOp') {
        const operandResult = evaluateAST(
            node.operand,
            operation,
            preGeneratedValues,
            groupIndex,
            randomFn
        );
        const value = node.operator === '-' ? -operandResult.value : operandResult.value;
        return { value, diceGroups: operandResult.diceGroups };
    }

    if (node.type === 'Parenthesized') {
        return evaluateAST(node.expression, operation, preGeneratedValues, groupIndex, randomFn);
    }

    return { value: 0, diceGroups: [] };
}

function formatASTWithValues(
    node: ASTNode,
    diceGroups: DiceGroupResult[],
    groupIndex: { current: number }
): string {
    if (node.type === 'NumericLiteral') {
        return String(node.value);
    }
    if (node.type === 'DiceGroup') {
        const group = diceGroups[groupIndex.current++];
        const values = formatRollValues(group.rolls, '+');
        return diceGroups.length === 1 ? values : `(${values})`;
    }
    if (node.type === 'BinaryOp') {
        const left = formatASTWithValues(node.left, diceGroups, groupIndex);
        const right = formatASTWithValues(node.right, diceGroups, groupIndex);
        return `${left}${node.operator}${right}`;
    }
    if (node.type === 'UnaryOp') {
        const operand = formatASTWithValues(node.operand, diceGroups, groupIndex);
        return `${node.operator}${operand}`;
    }
    if (node.type === 'Parenthesized') {
        return `(${formatASTWithValues(node.expression, diceGroups, groupIndex)})`;
    }
    return '';
}

export function evaluateDiceAST(
    ast: ASTNode,
    originalNotation: string,
    preGeneratedValues?: Map<string, DiceRoll[]>,
    randomFn?: () => number
): FullRollResult {
    debug('DiceEvaluator: Evaluating AST for:', originalNotation, preGeneratedValues);
    const result = evaluateAST(ast, '+', preGeneratedValues, { current: 0 }, randomFn);
    const { value: total, diceGroups } = result;
    let details: string;
    if (diceGroups.length === 1) {
        details = formatRollValues(diceGroups[0].rolls, ',');
    } else {
        details = diceGroups.map((g) => `(${formatRollValues(g.rolls, ',')})`).join(' ');
    }
    const formatted = formatASTWithValues(ast, diceGroups, { current: 0 });
    debug(
        'DiceEvaluator: Total:',
        total,
        'details:',
        details,
        'formatted:',
        formatted,
        'groups:',
        diceGroups
    );
    return {
        notation: originalNotation,
        diceGroups,
        total,
        details,
        formatted,
    };
}

export function getRawDiceValues(
    node: DiceGroupNode,
    randomFn?: () => number
): { value: number; faceLabel?: string }[] {
    if (node.forcedValues) {
        return node.forcedValues.map((val) => ({ value: val }));
    }
    const rawValues: { value: number; faceLabel?: string }[] = [];
    if (node.fudge) {
        for (let i = 0; i < node.count; i++) {
            const fd = rollFudgeDie(randomFn);
            rawValues.push({ value: fd.value, faceLabel: fd.faceLabel });
        }
    } else {
        for (let i = 0; i < node.count; i++) {
            rawValues.push({ value: rollSingleDie(node.sides, node.customFaces, randomFn) });
        }
    }
    return rawValues;
}

export function extractRawValuesFromAST(
    ast: ASTNode,
    randomFn?: () => number
): Map<string, DiceRoll[]> {
    const results = new Map<string, DiceRoll[]>();
    let groupIndex = 0;

    function traverse(node: ASTNode): void {
        if (node.type === 'DiceGroup') {
            const idx = groupIndex++;
            const groupKey = buildGroupKey(node, idx);
            const rawValues = getRawDiceValues(node, randomFn);
            const rolls: DiceRoll[] = rawValues.map((val) => ({
                sides: node.sides,
                value: val.value,
                faceLabel: val.faceLabel,
                dropped: false,
                exploded: false,
            }));
            results.set(groupKey, rolls);
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
    return results;
}
