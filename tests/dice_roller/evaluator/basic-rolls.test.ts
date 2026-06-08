import { describe, it, expect } from 'vitest';
import { parseToAST, evaluateDiceAST, getRawDiceValues, rollDices } from '../../src/dice-logic';
import type { DiceRoll, ASTNode, DiceGroupNode } from '../../src/dice-logic';

function mockRandom(...values: number[]): () => number {
    let i = 0;
    return () => values[i++];
}

function evaluate(notation: string, ...randomValues: number[]) {
    const ast = parseToAST(notation);
    return evaluateDiceAST(ast, notation, undefined, mockRandom(...randomValues));
}

describe('Evaluator - basic rolls', () => {
    it('sums 2d6 correctly', () => {
        const result = evaluate('2d6', 0.1, 0.5);
        expect(result.total).toBe(5);
        expect(result.diceGroups).toHaveLength(1);
        expect(result.diceGroups[0].rolls).toHaveLength(2);
    });

    it('evaluates 2d6+3 with numeric constant', () => {
        const result = evaluate('2d6+3', 0.3, 0.7);
        expect(result.total).toBe(10);
        expect(result.diceGroups).toHaveLength(1);
    });

    it('evaluates 1d20', () => {
        const result = evaluate('1d20', 0.95);
        expect(result.total).toBe(20);
    });

    it('evaluates 10-2d4', () => {
        const result = evaluate('10-2d4', 0.5, 0.5);
        expect(result.total).toBe(4);
    });

    it('evaluates -4d6 (unary minus)', () => {
        const result = evaluate('-4d6', 0.2, 0.3, 0.4, 0.1);
        expect(result.total).toBe(-8);
    });
});

describe('Evaluator - custom faces', () => {
    it('evaluates 1d[1,3,5,7,9]', () => {
        const result1 = evaluate('1d[1,3,5,7,9]', 0.0);
        expect(result1.total).toBe(1);

        const result2 = evaluate('1d[1,3,5,7,9]', 0.5);
        expect(result2.total).toBe(5);
    });

    it('evaluates 2d[2,4,6] with range', () => {
        const result = evaluate('2d[2,4,6]', 0.0, 0.99);
        expect(result.total).toBe(8);
        expect(result.diceGroups[0].rolls[0].value).toBe(2);
        expect(result.diceGroups[0].rolls[1].value).toBe(6);
    });
});

describe('Evaluator - fudge dice', () => {
    it('evaluates 4dF with known values', () => {
        const result = evaluate('4dF', 0.0, 0.4, 0.6, 0.9);
        expect(result.total).toBe(0);
        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([-1, 0, 0, 1]);
    });

    it('evaluates 1dF to -1, 0, or 1', () => {
        const r1 = evaluate('1dF', 0.0);
        expect(r1.total).toBe(-1);

        const r2 = evaluate('1dF', 0.4);
        expect(r2.total).toBe(0);

        const r3 = evaluate('1dF', 0.9);
        expect(r3.total).toBe(1);
    });

    it('correctly sums negative fudge values', () => {
        const result = evaluate('4dF', 0.0, 0.1, 0.2, 0.4);
        expect(result.total).toBe(-3);
    });
});

describe('Evaluator - forced rolls (@)', () => {
    it('2d20@20,1 uses forced values', () => {
        const ast = parseToAST('2d20@20,1');
        const result = evaluateDiceAST(ast, '2d20@20,1');
        expect(result.total).toBe(21);
        expect(result.diceGroups[0].rolls[0].value).toBe(20);
        expect(result.diceGroups[0].rolls[1].value).toBe(1);
    });

    it('6d6@4,4,4,4,4,4 all dice show 4', () => {
        const ast = parseToAST('6d6@4,4,4,4,4,4');
        const result = evaluateDiceAST(ast, '6d6@4,4,4,4,4,4');
        expect(result.total).toBe(24);
        result.diceGroups[0].rolls.forEach((r) => {
            expect(r.value).toBe(4);
        });
    });

    it('forced values work with keep modifier: 4d6@6,1,6,1kh3', () => {
        const ast = parseToAST('4d6@6,1,6,1kh3');
        const result = evaluateDiceAST(ast, '4d6@6,1,6,1kh3');
        expect(result.total).toBe(13);
        expect(result.diceGroups[0].keptRolls).toHaveLength(3);
    });

    it('forced values throw on count mismatch', () => {
        const ast = parseToAST('2d6@1');
        expect(() => evaluateDiceAST(ast, '2d6@1')).toThrow(/count mismatch/);
    });

    it('forced values work through rollDices pipeline', () => {
        const result = rollDices('2d20@20,1');
        expect(result.total).toBe(21);
        expect(result.diceGroups[0].rolls[0].value).toBe(20);
    });

    it('getRawDiceValues respects forced values', () => {
        const ast = parseToAST('2d20@20,1');
        function findDice(n: ASTNode): ASTNode {
            if (n.type === 'DiceGroup') return n;
            if (n.type === 'BinaryOp') return findDice(n.left) || findDice(n.right);
            if (n.type === 'UnaryOp') return findDice(n.operand);
            if (n.type === 'Parenthesized') return findDice(n.expression);
            return n;
        }
        const diceNode = findDice(ast);
        const raw = getRawDiceValues(diceNode as DiceGroupNode);
        expect(raw.map((r) => r.value)).toEqual([20, 1]);
    });
});

describe('Evaluator - pre-generated values (deterministic)', () => {
    it('uses pre-generated values when provided', () => {
        const ast = parseToAST('2d6');
        const preGenerated = new Map<string, DiceRoll[]>();
        preGenerated.set('2d6__0_', [
            { sides: 6, value: 4, dropped: false },
            { sides: 6, value: 5, dropped: false },
        ]);
        const result = evaluateDiceAST(ast, '2d6', preGenerated);
        expect(result.total).toBe(9);
    });

    it('falls back to random when pre-generated map is empty', () => {
        const ast = parseToAST('2d6');
        const result = evaluateDiceAST(ast, '2d6', new Map(), mockRandom(0.1, 0.5));
        expect(result.total).toBe(5);
    });
});
