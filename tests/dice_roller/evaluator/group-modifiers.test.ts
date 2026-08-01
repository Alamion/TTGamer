import { describe, it, expect } from 'vitest';
import { parseToAST, evaluateDiceAST, rollDices } from '@site/src/dice_roller/dice-logic';
import type { DiceRoll } from '@site/src/dice_roller/dice-logic';

function mockRandom(...values: number[]): () => number {
    let i = 0;
    return () => values[i++];
}

function evaluate(notation: string, ...randomValues: number[]) {
    const ast = parseToAST(notation);
    return evaluateDiceAST(ast, notation, undefined, mockRandom(...randomValues));
}

describe('Evaluator - group modifiers (syntactic sugar)', () => {
    it('(3d10+1d10)>=6 counts successes across groups', () => {
        const result = evaluate('(3d10+1d10)>=6', 0.0, 0.5, 0.8, 0.2);
        // floor(rand*10)+1: 0.0→1, 0.5→6, 0.8→9, 0.2→3
        // >=6 successes: 6, 9 → total=2
        expect(result.total).toBe(2);
        expect(result.diceGroups).toHaveLength(2);
        expect(result.diceGroups[0].sum).toBe(2);
        expect(result.diceGroups[1].sum).toBe(0);
    });

    it('(3d10+1d10)>=6f=1 counts successes and failures', () => {
        const result = evaluate('(3d10+1d10)>=6f=1', 0.0, 0.5, 0.9, 0.0);
        // 0.0→1, 0.5→6, 0.9→10, 0.0→1
        // >=6 successes: 6, 10 → 2
        // f=1 failures: 1, 1 → 2
        // total = 2 - 2 = 0
        expect(result.total).toBe(0);
    });

    it('(3d10+1d10)>=6 with no successes when all below threshold', () => {
        const result = evaluate('(3d10+1d10)>=6', 0.0, 0.3, 0.4, 0.1);
        // 0.0→1, 0.3→4, 0.4→5, 0.1→2
        // >=6 successes: none → total=0
        expect(result.total).toBe(0);
    });

    it('(3d10+1d10)>=6 with all successes', () => {
        const result = evaluate('(3d10+1d10)>=6', 0.5, 0.6, 0.9, 0.7);
        // 0.5→6, 0.6→7, 0.9→10, 0.7→8
        // >=6 successes: all → total=4
        expect(result.total).toBe(4);
    });

    it('(3d10+1d10)kh3 keeps 3 from each group', () => {
        const ast = parseToAST('(3d10+1d10)kh3');
        const preGenerated = new Map<string, DiceRoll[]>();
        preGenerated.set('3d10__0_', [
            { sides: 10, value: 1, dropped: false },
            { sides: 10, value: 7, dropped: false },
            { sides: 10, value: 4, dropped: false },
        ]);
        preGenerated.set('1d10__1_', [{ sides: 10, value: 9, dropped: false }]);
        const result = evaluateDiceAST(ast, '(3d10+1d10)kh3', preGenerated);
        // Group0: keep 3 out of 3 → all kept, sum=12
        // Group1: keep 3 out of 1 → 1 kept, sum=9
        // total = 12 + 9 = 21
        expect(result.total).toBe(21);
        expect(result.diceGroups[0].keptRolls).toHaveLength(3);
        expect(result.diceGroups[1].keptRolls).toHaveLength(1);
    });

    it('(3d10+1d10)dl2 drops 2 lowest from each group', () => {
        const ast = parseToAST('(3d10+1d10)dl2');
        const preGenerated = new Map<string, DiceRoll[]>();
        preGenerated.set('3d10__0_', [
            { sides: 10, value: 2, dropped: false },
            { sides: 10, value: 8, dropped: false },
            { sides: 10, value: 4, dropped: false },
        ]);
        preGenerated.set('1d10__1_', [{ sides: 10, value: 5, dropped: false }]);
        const result = evaluateDiceAST(ast, '(3d10+1d10)dl2', preGenerated);
        // Group0: drop 2 lowest → keep [8], sum=8
        // Group1: drop 2 of 1 → keep none, sum=0
        // total = 8 + 0 = 8
        expect(result.total).toBe(8);
    });

    it('(3d10+1d10)! explodes both groups', () => {
        // With mockRandom: roll dice, then check explosion flag is present
        const result = evaluate('(3d10+1d10)!', 0.0, 0.5, 0.9, 0.3);
        // Explosion happens on max value (10), which 0.9→10 triggers
        expect(result.diceGroups).toHaveLength(2);
        expect(result.diceGroups[0].rolls.length).toBeGreaterThanOrEqual(3);
        expect(result.diceGroups[1].rolls.length).toBeGreaterThanOrEqual(1);
    });

    it('(3d10+1d10)r1 rerolls ones in both groups', () => {
        // Group0 init: 0.0→1, 0.4→5, 0.7→8
        // Group0 reroll: die0=1 needs reroll → 0.1→2, die1=5 ok, die2=8 ok
        // Group1 init: 0.5→6
        // Group1 reroll: die0=6 ok
        const result = evaluate('(3d10+1d10)r1', 0.0, 0.4, 0.7, 0.1, 0.5);
        // After rerolls: [2,5,8] + [6]
        // total = 15 + 6 = 21
        expect(result.total).toBe(21);
    });

    it('(3d10+1d10)s sorts each group ascending', () => {
        const ast = parseToAST('(3d10+1d10)s');
        const preGenerated = new Map<string, DiceRoll[]>();
        preGenerated.set('3d10__0_', [
            { sides: 10, value: 7, dropped: false },
            { sides: 10, value: 3, dropped: false },
            { sides: 10, value: 9, dropped: false },
        ]);
        preGenerated.set('1d10__1_', [{ sides: 10, value: 5, dropped: false }]);
        const result = evaluateDiceAST(ast, '(3d10+1d10)s', preGenerated);
        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([3, 7, 9]);
        expect(result.diceGroups[1].rolls.map((r) => r.value)).toEqual([5]);
    });

    it('(3d10+1d10)min2max8 clamps values', () => {
        const ast = parseToAST('(3d10+1d10)min2max8');
        const preGenerated = new Map<string, DiceRoll[]>();
        preGenerated.set('3d10__0_', [
            { sides: 10, value: 1, dropped: false },
            { sides: 10, value: 10, dropped: false },
            { sides: 10, value: 5, dropped: false },
        ]);
        preGenerated.set('1d10__1_', [{ sides: 10, value: 0, dropped: false }]);
        const result = evaluateDiceAST(ast, '(3d10+1d10)min2max8', preGenerated);
        // After min2max8: [2,8,5] + [2]
        expect(result.total).toBe(17);
        expect(result.diceGroups[0].rolls[0].value).toBe(2);
        expect(result.diceGroups[0].rolls[0].minRaised).toBe(true);
        expect(result.diceGroups[0].rolls[1].value).toBe(8);
        expect(result.diceGroups[0].rolls[1].maxCapped).toBe(true);
    });
});

describe('Evaluator - group modifiers full pipeline (rollDices)', () => {
    it('rollDices works with group modifiers: (3d10+1d10)>=6f=1', () => {
        const result = rollDices('(3d10+1d10)>=6f=1', mockRandom(0.5, 0.6, 0.9, 0.0));
        // rolls: 3d10=[6,7,10], 1d10=[1]
        // >=6 successes: 6,7,10 → 3 successes
        // f=1 failures: 1 → 1 failure
        // total = 3 - 1 = 2
        expect(result.total).toBe(2);
        expect(result.notation).toBe('(3d10+1d10)>=6f=1');
        expect(result.diceGroups).toHaveLength(2);
        expect(result.details).toContain('*');
        expect(result.details).toContain('_');
    });

    it('full pipeline with group keep: (3d10+1d10)kh3', () => {
        const result = rollDices('(3d10+1d10)kh3', mockRandom(0.2, 0.9, 0.5, 0.3));
        // rolls: 3d10=[3,10,6], 1d10=[4]
        // Group0 kh3: keep 3 out of 3 → [3,10,6], sum=19
        // Group1 kh3: keep 3 out of 1 → [4], sum=4
        // total = 23
        expect(result.total).toBe(23);
        expect(result.diceGroups[0].notation).toBe('3d10kh3');
        expect(result.diceGroups[1].notation).toBe('1d10kh3');
    });

    it('full pipeline with group sort: (3d10+1d10)s', () => {
        const result = rollDices('(3d10+1d10)s', mockRandom(0.7, 0.1, 0.9, 0.4));
        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([2, 8, 10]);
        expect(result.diceGroups[1].rolls.map((r) => r.value)).toEqual([5]);
    });

    it('nested group modifiers through full pipeline: ((3d10)>=6)kh2', () => {
        // After distribution: 3d10>=6kh2
        // 0.0→1, 0.5→6, 0.9→10
        // targetSuccess: 6✓, 10✓ → 2 successes
        // kh2: keep [10,6], drop [1]
        // sum = 2 (success count with targetSuccess active)
        const result = rollDices('((3d10)>=6)kh2', mockRandom(0.0, 0.5, 0.9));
        expect(result.total).toBe(2);
    });
});
