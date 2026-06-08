import { describe, it, expect } from 'vitest';
import { parseToAST } from '../../src/dice-logic';
import { evaluateDiceAST, detectUnique } from '../../src/dice-logic/dice-evaluator';
import type { DiceRoll } from '../../src/dice-logic';

function pregen(notation: string, rolls: number[], groupIndex = 0): Map<string, DiceRoll[]> {
    const node = parseToAST(notation);
    if (node.type !== 'DiceGroup') throw new Error('Expected DiceGroup node');
    const key = `${node.count}d${node.sides}_${node.fudge ? 'f' : ''}_${groupIndex}_${node.customFaces ? node.customFaces.join(',') : ''}`;
    const map = new Map<string, DiceRoll[]>();
    map.set(
        key,
        rolls.map((v) => ({ sides: node.sides, value: v, dropped: false }))
    );
    return map;
}

function evaluateWithValues(notation: string, values: number[], groupIndex = 0) {
    const ast = parseToAST(notation);
    const preGenerated = pregen(notation, values, groupIndex);
    return evaluateDiceAST(ast, notation, preGenerated);
}

describe('Evaluator - keep/drop', () => {
    it('4d6kh3 keeps highest 3, drops lowest 1', () => {
        const result = evaluateWithValues('4d6kh3', [1, 6, 3, 4]);
        expect(result.total).toBe(13);
        expect(result.diceGroups[0].keptRolls).toHaveLength(3);
        expect(result.diceGroups[0].droppedRolls).toHaveLength(1);
    });

    it('2d20kl1 keeps lowest 1 (disadvantage)', () => {
        const result = evaluateWithValues('2d20kl1', [15, 5]);
        expect(result.total).toBe(5);
        expect(result.diceGroups[0].keptRolls).toHaveLength(1);
        expect(result.diceGroups[0].droppedRolls).toHaveLength(1);
        expect(result.diceGroups[0].keptRolls[0].value).toBe(5);
    });

    it('4d6dh1 drops highest 1', () => {
        const result = evaluateWithValues('4d6dh1', [2, 5, 3, 6]);
        expect(result.total).toBe(10);
        expect(result.diceGroups[0].keptRolls).toHaveLength(3);
    });

    it('4d6dl2 drops lowest 2', () => {
        const result = evaluateWithValues('4d6dl2', [1, 4, 3, 5]);
        expect(result.total).toBe(9);
        expect(result.diceGroups[0].keptRolls).toHaveLength(2);
    });

    it('all dice kept when keep > count', () => {
        const result = evaluateWithValues('3d6kh5', [4, 5, 6]);
        expect(result.total).toBe(15);
        expect(result.diceGroups[0].droppedRolls).toHaveLength(0);
    });

    it('all dice dropped when drop >= count', () => {
        const result = evaluateWithValues('3d6dl3', [4, 5, 6]);
        expect(result.total).toBe(0);
        expect(result.diceGroups[0].keptRolls).toHaveLength(0);
    });
});

describe('Evaluator - condition modifiers', () => {
    it('4d10>5 counts successes (>5)', () => {
        const result = evaluateWithValues('4d10>5', [2, 10, 5, 7]);
        expect(result.total).toBe(2);
        expect(result.diceGroups[0].keptRolls).toHaveLength(4);
        expect(result.diceGroups[0].droppedRolls).toHaveLength(0);
    });

    it('3d6<3 counts successes (<3)', () => {
        const result = evaluateWithValues('3d6<3', [1, 4, 2]);
        expect(result.total).toBe(2);
    });

    it('4d10>=7 counts successes (>=7)', () => {
        const result = evaluateWithValues('4d10>=7', [6, 7, 10, 3]);
        expect(result.total).toBe(2);
    });

    it('4d10<=3 counts successes (<=3)', () => {
        const result = evaluateWithValues('4d10<=3', [3, 4, 1, 5]);
        expect(result.total).toBe(2);
    });

    it('4d10=10 counts only exact 10s', () => {
        const result = evaluateWithValues('4d10=10', [10, 5, 10, 3]);
        expect(result.total).toBe(2);
    });

    it('4d10<>1 excludes only 1s', () => {
        const result = evaluateWithValues('4d10<>1', [1, 5, 1, 9]);
        expect(result.total).toBe(2);
    });
});

describe('Evaluator - sort', () => {
    it('4d6s sorts ascending', () => {
        const result = evaluateWithValues('4d6s', [3, 5, 1, 4]);
        const values = result.diceGroups[0].rolls.filter((r) => !r.dropped).map((r) => r.value);
        expect(values).toEqual([1, 3, 4, 5]);
    });

    it('4d6sd sorts descending', () => {
        const result = evaluateWithValues('4d6sd', [3, 5, 1, 4]);
        const values = result.diceGroups[0].rolls.filter((r) => !r.dropped).map((r) => r.value);
        expect(values).toEqual([5, 4, 3, 1]);
    });
});

describe('Evaluator - min/max', () => {
    it('4d6min3 raises low values to min', () => {
        const result = evaluateWithValues('4d6min3', [1, 4, 2, 5]);
        expect(result.total).toBe(15);
        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([3, 4, 3, 5]);
    });

    it('4d6max3 caps high values to max', () => {
        const result = evaluateWithValues('4d6max3', [5, 4, 3, 2]);
        expect(result.total).toBe(11);
        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([3, 3, 3, 2]);
    });

    it('formatRollValues shows ^ for min-raised values', () => {
        const result = evaluateWithValues('4d6min3', [1, 4, 2, 5]);
        const raised = result.diceGroups[0].rolls.filter((r) => r.minRaised);
        expect(raised).toHaveLength(2);
        expect(raised[0].value).toBe(3);
        expect(raised[1].value).toBe(3);
    });

    it('formatRollValues shows v for max-capped values', () => {
        const result = evaluateWithValues('4d6max3', [5, 4, 3, 2]);
        const capped = result.diceGroups[0].rolls.filter((r) => r.maxCapped);
        expect(capped).toHaveLength(2);
        expect(capped[0].value).toBe(3);
        expect(capped[1].value).toBe(3);
    });

    it('min and max can be combined', () => {
        const result = evaluateWithValues('4d6min2max5', [1, 3, 6, 4]);
        const values = result.diceGroups[0].rolls.map((r) => r.value);
        expect(values).toEqual([2, 3, 5, 4]);
        expect(result.total).toBe(14);
        const minRaised = result.diceGroups[0].rolls.filter((r) => r.minRaised);
        expect(minRaised).toHaveLength(1);
        expect(minRaised[0].value).toBe(2);
        const maxCapped = result.diceGroups[0].rolls.filter((r) => r.maxCapped);
        expect(maxCapped).toHaveLength(1);
        expect(maxCapped[0].value).toBe(5);
    });

    it('details shows plain values (no annotation markers)', () => {
        const result = evaluateWithValues('4d6min3', [1, 4, 2, 5]);
        expect(result.details).toBe('3^, 4, 3^, 5');
    });

    it('details shows plain values for max-capped dice', () => {
        const result = evaluateWithValues('4d6max3', [5, 4, 3, 2]);
        expect(result.details).toBe('3v, 3v, 3, 2');
    });
});

describe('Evaluator - target failure', () => {
    it('4d10>5f<3 counts successes minus failures', () => {
        const result = evaluateWithValues('4d10>5f<3', [2, 10, 1, 7]);
        // >5 successes: 10, 7 → 2 successes
        // <3 failures: 2, 1 → 2 failures
        // total = 2 - 2 = 0
        expect(result.total).toBe(0);
    });
});

describe('Evaluator - critical markings', () => {
    it('2d20cs marks natural 20 as critical', () => {
        const result = evaluateWithValues('2d20cs', [20, 5]);
        const critRoll = result.diceGroups[0].rolls.find((r) => r.value === 20);
        expect(critRoll?.criticalSuccess).toBe(true);
        expect(
            result.diceGroups[0].rolls.find((r) => r.value === 5)?.criticalSuccess
        ).toBeUndefined();
    });

    it('2d20cf marks natural 1 as critical failure', () => {
        const result = evaluateWithValues('2d20cf', [1, 15]);
        const failRoll = result.diceGroups[0].rolls.find((r) => r.value === 1);
        expect(failRoll?.criticalFailure).toBe(true);
        expect(
            result.diceGroups[0].rolls.find((r) => r.value === 15)?.criticalFailure
        ).toBeUndefined();
    });

    it('2d20csb marks critical success and adds botch flag on die', () => {
        const result = evaluateWithValues('2d20csb', [20, 5]);
        const critRoll = result.diceGroups[0].rolls.find((r) => r.value === 20);
        expect(critRoll?.criticalSuccess).toBe(true);
        expect(critRoll?.criticalSuccessBotch).toBe(true);
        const normalRoll = result.diceGroups[0].rolls.find((r) => r.value === 5);
        expect(normalRoll?.criticalSuccess).toBeUndefined();
        expect(normalRoll?.criticalSuccessBotch).toBeUndefined();
    });

    it('2d20cfb marks critical failure and adds botch flag on die', () => {
        const result = evaluateWithValues('2d20cfb', [1, 15]);
        const failRoll = result.diceGroups[0].rolls.find((r) => r.value === 1);
        expect(failRoll?.criticalFailure).toBe(true);
        expect(failRoll?.criticalFailureBotch).toBe(true);
        const normalRoll = result.diceGroups[0].rolls.find((r) => r.value === 15);
        expect(normalRoll?.criticalFailure).toBeUndefined();
        expect(normalRoll?.criticalFailureBotch).toBeUndefined();
    });
});

describe('Evaluator - botch sum adjustment', () => {
    it('1d10>=6cfb with roll 1 gives total -1', () => {
        const result = evaluateWithValues('1d10>=6cfb', [1]);
        // roll 1: >=6 fails → 0 successes, cfb → -1
        expect(result.total).toBe(-1);
    });

    it('1d10>=6csb with roll 10 gives total 2', () => {
        const result = evaluateWithValues('1d10>=6csb', [10]);
        // roll 10: >=6 succeeds → 1 success, csb → +1, total = 2
        expect(result.total).toBe(2);
    });

    it('2d10>=6csb with one crit and one success', () => {
        const result = evaluateWithValues('2d10>=6csb', [10, 7]);
        // roll 10: success + crit botch → 1 + 1 = 2
        // roll 7: success → 1
        // total = 2 + 1 = 3
        expect(result.total).toBe(3);
    });

    it('2d10>=6cfb with one crit fail and one fail', () => {
        const result = evaluateWithValues('2d10>=6cfb', [1, 3]);
        // roll 1: fail + crit fail botch → 0 - 1 = -1
        // roll 3: fail → 0
        // total = -1 + 0 = -1
        expect(result.total).toBe(-1);
    });

    it('3d6csb without target success adds +1 per crit success', () => {
        const result = evaluateWithValues('3d6csb', [6, 3, 6]);
        // Without targetSuccess: sum = 6+3+6 = 15, csb adds +2 (two 6s) = 17
        expect(result.total).toBe(17);
        const crits = result.diceGroups[0].rolls.filter((r) => r.criticalSuccessBotch);
        expect(crits).toHaveLength(2);
    });
});

describe('Evaluator - unique modifier (2D path)', () => {
    function mockRandom(...values: number[]): () => number {
        let i = 0;
        return () => values[i++];
    }

    function evaluate(notation: string, ...randomValues: number[]) {
        const ast = parseToAST(notation);
        return evaluateDiceAST(ast, notation, undefined, mockRandom(...randomValues));
    }

    it('unique re-rolls duplicates: 3d6u', () => {
        const result = evaluate('3d6u', 0.1, 0.5, 0.1, 0.8, 0.9);
        // initial: [1, 4, 1] -> die0 and die2 are 1 (duplicate)
        // re-roll die0: 0.8→5, die2: 0.9→6, final: [5, 4, 6]
        expect(result.total).toBe(15);
        const values = result.diceGroups[0].rolls.map((r) => r.value);
        expect(values).toEqual([5, 4, 6]);
    });

    it('unique once: 3d6uo only re-rolls once', () => {
        const result = evaluate('3d6uo', 0.1, 0.1, 0.1, 0.2, 0.3, 0.4);
        // initial: [1, 1, 1] all duplicates
        // unique-once: re-roll die0(1)→0.2→2, die1(1)→0.3→2, die2(1)→0.4→3
        // no re-check because once, final: [2, 2, 3]
        const values = result.diceGroups[0].rolls.map((r) => r.value);
        expect(values).toEqual([2, 2, 3]);
        expect(result.total).toBe(7);
    });

    it('unique with compare point: 4d6u=5 only re-rolls duplicates that are 5', () => {
        const result = evaluate('4d6u=5', 0.7, 0.7, 0.3, 0.7, 0.1, 0.2, 0.3);
        // initial: [5, 5, 2, 5] -> 5 appears 3 times
        // unique with cp=5: re-roll die0(5)→0.1→1, die1(5)→0.2→2, die3(5)→0.3→2
        // After re-roll: [1, 2, 2, 2] -> no 5s left, unique modifier done
        const values = result.diceGroups[0].rolls.map((r) => r.value);
        expect(values.filter((v) => v === 5)).toHaveLength(0);
        expect(result.total).toBeGreaterThan(0);
    });

    it('unique with pregenerated values (3D path) skips unique modifier', () => {
        const result = evaluateWithValues('4d6u', [1, 1, 2, 3]);
        // With pregen, unique is skipped (handled by 3D physics)
        const values = result.diceGroups[0].rolls.map((r) => r.value);
        expect(values).toEqual([1, 1, 2, 3]);
    });

    it('detectUnique finds duplicate values', () => {
        const ast = parseToAST('4d6u');
        if (ast.type !== 'DiceGroup') {
            expect.fail();
            return;
        }
        const rolls = [
            { sides: 6, value: 3, dropped: false },
            { sides: 6, value: 5, dropped: false },
            { sides: 6, value: 3, dropped: false },
            { sides: 6, value: 2, dropped: false },
        ];
        const indices = detectUnique(ast, rolls);
        expect(indices).toEqual([0, 2]);
    });

    it('detectUnique respects once flag with rerolledOnce', () => {
        const ast = parseToAST('4d6uo');
        if (ast.type !== 'DiceGroup') {
            expect.fail();
            return;
        }
        const rolls = [
            { sides: 6, value: 3, dropped: false, rerolledOnce: true },
            { sides: 6, value: 5, dropped: false },
            { sides: 6, value: 3, dropped: false },
            { sides: 6, value: 2, dropped: false },
        ];
        const indices = detectUnique(ast, rolls);
        // die2 (value 3, not rerolled yet) still has a duplicate with die0 (value 3)
        expect(indices).toEqual([2]);
    });

    it('detectUnique returns empty for all unique values', () => {
        const ast = parseToAST('4d6u');
        if (ast.type !== 'DiceGroup') {
            expect.fail();
            return;
        }
        const rolls = [
            { sides: 6, value: 3, dropped: false },
            { sides: 6, value: 5, dropped: false },
            { sides: 6, value: 1, dropped: false },
            { sides: 6, value: 2, dropped: false },
        ];
        const indices = detectUnique(ast, rolls);
        expect(indices).toEqual([]);
    });

    it('detectUnique with compare point only flags matching duplicates', () => {
        const ast = parseToAST('4d6u=5');
        if (ast.type !== 'DiceGroup') {
            expect.fail();
            return;
        }
        const rolls = [
            { sides: 6, value: 5, dropped: false },
            { sides: 6, value: 5, dropped: false },
            { sides: 6, value: 3, dropped: false },
            { sides: 6, value: 3, dropped: false },
        ];
        // Only 5s trigger because compare point is =5
        const indices = detectUnique(ast, rolls);
        expect(indices).toEqual([0, 1]);
    });
});
