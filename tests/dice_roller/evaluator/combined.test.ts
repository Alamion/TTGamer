import { describe, it, expect } from 'vitest';
import { parseToAST } from '../../src/dice-logic/dice-parser';
import { evaluateDiceAST } from '../../src/dice-logic/dice-evaluator';

function mockRandom(...values: number[]): () => number {
    let i = 0;
    return () => values[i++];
}

function evaluate(notation: string, ...randomValues: number[]) {
    const ast = parseToAST(notation);
    return evaluateDiceAST(ast, notation, undefined, mockRandom(...randomValues));
}

describe('Evaluator - combined expressions', () => {
    it('2d6+4d4 sums multiple groups', () => {
        const result = evaluate('2d6+4d4', 0.1, 0.9, 0.3, 0.5, 0.7, 0.2);
        expect(result.total).toBe(16);
        expect(result.diceGroups).toHaveLength(2);
    });

    it('3d8-1d6 subtracts dice groups', () => {
        const result = evaluate('3d8-1d6', 0.5, 0.9, 0.1, 0.9);
        expect(result.total).toBe(8);
        expect(result.diceGroups).toHaveLength(2);
        expect(result.diceGroups[0].operation).toBe('+');
        expect(result.diceGroups[1].operation).toBe('-');
    });

    it('(2d6+3)*2 evaluates parenthesized expression', () => {
        const result = evaluate('(2d6+3)*2', 0.1, 0.5);
        expect(result.total).toBe(16);
    });

    it('1d20+(1d4+1) — d6 after expression is not parsed as nested dice', () => {
        const result = evaluate('1d20+(1d4+1)d6', 0.5, 0.3, 0.7);
        expect(result.total).toBe(14);
    });

    it('10/2d5 with division', () => {
        const result = evaluate('10/2d5', 0.5, 0.9);
        expect(result.total).toBe(1);
    });

    it('2d10%3 with modulo', () => {
        const result = evaluate('2d10%3', 0.5, 0.9);
        expect(result.total).toBe(1);
    });

    it('combined: 2d20kh1 + 4d6kh3 (advantage + keep)', () => {
        const result = evaluate('2d20kh1+4d6kh3', 0.1, 0.95, 0.3, 0.5, 0.7, 0.9);
        expect(result.total).toBe(35);
    });

    it('condition + combined groups: 4d10>5+2d6', () => {
        const result = evaluate('4d10>5+2d6', 0.1, 0.9, 0.5, 0.7, 0.3, 0.8);
        expect(result.total).toBe(10);
        expect(result.diceGroups).toHaveLength(2);
    });
});
