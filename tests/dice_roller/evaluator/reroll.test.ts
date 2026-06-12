import { describe, it, expect } from 'vitest';
import { parseToAST, evaluateDiceAST, detectRerolls } from '@site/src/dice_roller/dice-logic';
import type { DiceRoll } from '@site/src/dice_roller/dice-logic';

function mockRandom(...values: number[]): () => number {
    let i = 0;
    return () => values[i++];
}

function evaluate(notation: string, ...randomValues: number[]) {
    const ast = parseToAST(notation);
    return evaluateDiceAST(ast, notation, undefined, mockRandom(...randomValues));
}

describe('Evaluator - reroll', () => {
    it('rerolls 1s: 2d6r1', () => {
        // mockRandom consumed in order: initial[die0, die1], then reroll[die0]
        const result = evaluate('2d6r1', 0.1, 0.5, 0.8);
        // initial: die0=0.1→1, die1=0.5→4
        // reroll die0: 0.8→5
        // final: [5, 4]
        expect(result.total).toBe(9);
        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([5, 4]);
    });

    it('rerolls values <= threshold', () => {
        // mockRandom consumed: initial[die0, die1, die2, die3], then reroll[die0, die1]
        const result = evaluate('4d6r2', 0.1, 0.3, 0.95, 0.5, 0.8, 0.7);
        // initial: die0=0.1→1, die1=0.3→2, die2=0.95→6, die3=0.5→4
        // reroll die0: 0.8→5 (stop), reroll die1: 0.7→5 (stop)
        // final: [5, 5, 6, 4]
        expect(result.total).toBe(20);
        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([5, 5, 6, 4]);
    });

    it('rerolls repeatedly until value exceeds threshold', () => {
        const result = evaluate('1d6r4', 0.1, 0.2, 0.4, 0.9);
        // initial: die0=0.1→1, reroll: 0.2→2, 0.4→3, 0.9→6
        expect(result.total).toBe(6);
    });

    it('reroll-once only rerolls one time: 1d6ro', () => {
        const result = evaluate('1d6ro', 0.1, 0.1);
        // initial: die0=0.1→1, reroll-once: 0.1→1 (stop even though ≤1)
        expect(result.total).toBe(1);
    });

    it('reroll with compare point: 1d6r=5', () => {
        const result = evaluate('1d6r=5', 0.7, 0.3);
        // initial: die0=0.7→5, reroll: 0.3→2 (≠5, stop)
        expect(result.total).toBe(2);
    });

    it('detectRerolls skips already-rerolled dice when once is set', () => {
        const ast = parseToAST('3d6ro');
        if (ast.type !== 'DiceGroup') {
            expect.fail('Expected DiceGroup');
            return;
        }
        const node = ast;
        const rolls: DiceRoll[] = [
            { sides: 6, value: 1, dropped: false, rerolledOnce: true },
            { sides: 6, value: 4, dropped: false },
            { sides: 6, value: 1, dropped: false, rerolledOnce: true },
        ];
        // With once flag, die0 and die2 (already rerolledOnce) should be skipped
        const indices = detectRerolls(
            node,
            rolls.map((r) => r.value),
            rolls
        );
        expect(indices).toEqual([]);
    });

    it('detectRerolls returns indices for non-rerolledOnce dice', () => {
        const ast = parseToAST('3d6ro');
        if (ast.type !== 'DiceGroup') {
            expect.fail('Expected DiceGroup');
            return;
        }
        const node = ast;
        const rolls: DiceRoll[] = [
            { sides: 6, value: 1, dropped: false },
            { sides: 6, value: 4, dropped: false },
            { sides: 6, value: 1, dropped: false },
        ];
        // die0=1 and die2=1 should be detected
        const indices = detectRerolls(
            node,
            rolls.map((r) => r.value),
            rolls
        );
        expect(indices).toEqual([0, 2]);
    });

    it('chained: 4d6r1kh3 (reroll then keep)', () => {
        // mockRandom consumed: initial[die0, die1, die2, die3], then reroll[die0]
        const result = evaluate('4d6r1kh3', 0.1, 0.5, 0.3, 0.95, 0.8);
        // initial: die0=0.1→1, die1=0.5→4, die2=0.3→2, die3=0.95→6
        // reroll die0: 0.8→5
        // after reroll: [5, 4, 2, 6]
        // kh3: keep [6, 5, 4], drop [2], sum=15
        expect(result.total).toBe(15);
    });

    it('rerolls on custom faces', () => {
        // mockRandom consumed: initial[die0, die1], then reroll[die0]
        const result = evaluate('2d[1,3,5]r2', 0.0, 0.5, 0.9);
        // initial: die0=0.0→faces[0]=1, die1=0.5→faces[1]=3
        // reroll die0: 0.9→faces[2]=5
        // final: [5, 3]
        expect(result.total).toBe(8);
        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([5, 3]);
    });
});
