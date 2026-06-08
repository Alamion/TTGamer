import { describe, it, expect } from 'vitest';
import { parseToAST, evaluateDiceAST, detectExplosion } from '../../src/dice-logic';

function mockRandom(...values: number[]): () => number {
    let i = 0;
    return () => values[i++];
}

function evaluate(notation: string, ...randomValues: number[]) {
    const ast = parseToAST(notation);
    return evaluateDiceAST(ast, notation, undefined, mockRandom(...randomValues));
}

describe('Evaluator - explosion', () => {
    it('explodes on max value: 2d6!', () => {
        const result = evaluate('2d6!', 0.9, 0.3, 0.7);
        expect(result.total).toBe(13);
        expect(result.diceGroups[0].rolls).toHaveLength(3);
        expect(result.diceGroups[0].rolls[0].exploded).toBe(true);
    });

    it('explodes with compare point: 4d10!>8', () => {
        const result = evaluate('4d10!>8', 0.95, 0.1, 0.5, 0.85, 0.4, 0.2);
        expect(result.total).toBe(35);
        expect(result.diceGroups[0].rolls).toHaveLength(6);
        const exploded = result.diceGroups[0].rolls.filter((r) => r.exploded);
        expect(exploded).toHaveLength(2);
    });

    it('explodes with != as ! + =: d6!=3', () => {
        // d6!=3: ! is explosion, =3 is compare point (explode on roll equal to 3)
        const result = evaluate('d6!=3', 0.4, 0.8);
        // 0.4→3 (=3, explode!), 0.8→5 (≠3, stop)
        expect(result.total).toBe(8);
        expect(result.diceGroups[0].rolls[0].exploded).toBe(true);
    });

    it('does not explode on non-max value', () => {
        const result = evaluate('2d6!', 0.3, 0.5);
        expect(result.total).toBe(6);
        expect(result.diceGroups[0].rolls).toHaveLength(2);
    });

    it('explodes with not-equal compare: 2d6!<>6', () => {
        // 2d6!<>6: explode values not equal to max (6)
        // Each explosion uses mock 0.9→6 which stops the chain
        const result = evaluate('2d6!<>6', 0.2, 0.9, 0.3, 0.9);
        // die0: 0.2→2 (≠6, explode→0.9→6 stop), die1: 0.3→2 (≠6, explode→0.9→6 stop)
        // total: (2+6)+(2+6)=16
        expect(result.total).toBe(16);
    });

    it('compound explosion combines values: 1d6!!', () => {
        const result = evaluate('1d6!!', 0.9, 0.8, 0.3);
        expect(result.total).toBe(11);
        expect(result.diceGroups[0].rolls[0].compounded).toBe(true);
    });

    it('penetrating explosion subtracts 1: 2d6!p', () => {
        const result = evaluate('2d6!p', 0.9, 0.3, 0.7);
        expect(result.total).toBe(12);
        expect(result.diceGroups[0].rolls[0].penetrating).toBe(true);
    });

    it('compound penetrating: 1d6!!p', () => {
        const result = evaluate('1d6!!p', 0.9, 0.8, 0.3);
        expect(result.total).toBe(10);
        expect(result.diceGroups[0].rolls[0].compounded).toBe(true);
        expect(result.diceGroups[0].rolls[0].penetrating).toBe(true);
    });

    it('compound explosion chains multiple explosions: 1d6!!', () => {
        const result = evaluate('1d6!!', 0.9, 0.9, 0.9, 0.3);
        // initial: 6 (max, explode+compound)
        // explode1: 6 (max, explode+compound)
        // explode2: 6 (max, explode+compound)
        // explode3: 2 (stop)
        // total: 6+6+6+2 = 20
        expect(result.total).toBe(20);
        expect(result.diceGroups[0].rolls[0].compounded).toBe(true);
        expect(result.diceGroups[0].rolls).toHaveLength(1);
    });

    it('penetrating explosion applies -1: 1d6!p chain', () => {
        const result = evaluate('1d6!p', 0.9, 0.9, 0.3);
        // initial: 6 (max, explode)
        // explode1: 6-1=5 (!p)
        // total: 6+5 = 11
        expect(result.total).toBe(11);
        expect(result.diceGroups[0].rolls[0].exploded).toBe(true);
        expect(result.diceGroups[0].rolls[0].penetrating).toBe(true);
        expect(result.diceGroups[0].rolls[1].penetrating).toBe(true);
        expect(result.diceGroups[0].rolls[1].value).toBe(5);
    });

    it('compound penetrating: 1d6!!p chain', () => {
        const result = evaluate('1d6!!p', 0.9, 0.9, 0.3);
        // initial: 6 (compound, penetrating)
        // explode1: raw=6, penetrating -1 = 5, compound=6+5=11
        // explode2: raw=2, penetrating -1 = 1, compound=11+1=12, stop (2 ≠ 6)
        // total: 6+5+1 = 12
        expect(result.total).toBe(12);
        expect(result.diceGroups[0].rolls[0].compounded).toBe(true);
        expect(result.diceGroups[0].rolls).toHaveLength(1);
    });

    it('2d6!! compound: two dice compound separately', () => {
        const result = evaluate('2d6!!', 0.9, 0.9, 0.3, 0.5);
        // die0: 6 (max, compound→0.3→2, stop) → compounded value = 8
        // die1: 6 (max, compound→0.5→4, stop) → compounded value = 10
        // total: 8+10 = 18
        expect(result.total).toBe(18);
        expect(result.diceGroups[0].rolls).toHaveLength(2);
        expect(result.diceGroups[0].rolls[0].compounded).toBe(true);
        expect(result.diceGroups[0].rolls[1].compounded).toBe(true);
    });

    it('detectExplosion finds exploding dice', () => {
        const ast = parseToAST('3d6!');
        if (ast.type !== 'DiceGroup') {
            expect.fail();
            return;
        }
        const rolls = [
            { sides: 6, value: 6, dropped: false },
            { sides: 6, value: 3, dropped: false },
            { sides: 6, value: 6, dropped: false },
        ];
        const indices = detectExplosion(ast, rolls);
        expect(indices).toEqual([0, 2]);
    });

    it('capped by MAX_EXPLOSIONS for infinite chain (1d1!)', () => {
        const vals = new Array(1002).fill(0.5);
        const result = evaluate('1d1!', ...vals);
        expect(result.diceGroups[0].rolls).toHaveLength(1001);
        expect(result.total).toBe(1001);
    });
});
