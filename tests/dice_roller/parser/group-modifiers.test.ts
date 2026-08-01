import { describe, it, expect } from 'vitest';
import { parseToAST, validateNotation } from '@site/src/dice_roller/dice-logic';
import type {
    ASTNode,
    DiceGroupNode,
    BinaryOpNode,
    ParenthesizedNode,
} from '@site/src/dice_roller/dice-logic';

function asDice(node: unknown): DiceGroupNode {
    if (
        node &&
        typeof node === 'object' &&
        'type' in node &&
        (node as { type: string }).type === 'DiceGroup'
    )
        return node as DiceGroupNode;
    throw new Error('Expected DiceGroup node');
}

function asBinop(node: ASTNode): BinaryOpNode {
    if (node.type === 'BinaryOp') return node;
    throw new Error('Expected BinaryOp node');
}

function asParen(node: ASTNode): ParenthesizedNode {
    if (node.type === 'Parenthesized') return node;
    throw new Error('Expected Parenthesized node');
}

describe('Parser - group modifiers (syntactic sugar distribution)', () => {
    it('distributes target success >=6 to both dice in (3d10+1d10)>=6', () => {
        const ast = asParen(parseToAST('(3d10+1d10)>=6'));
        const binop = asBinop(ast.expression);
        const left = asDice(binop.left);
        const right = asDice(binop.right);
        expect(left.count).toBe(3);
        expect(left.sides).toBe(10);
        expect(left.modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        expect(right.count).toBe(1);
        expect(right.sides).toBe(10);
        expect(right.modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
    });

    it('distributes target success and failure: (3d10+1d10)>=6f=1', () => {
        const ast = asParen(parseToAST('(3d10+1d10)>=6f=1'));
        const binop = asBinop(ast.expression);
        const left = asDice(binop.left);
        const right = asDice(binop.right);
        expect(left.modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        expect(left.modifiers.targetFailure).toEqual({ operator: '=', value: 1 });
        expect(right.modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        expect(right.modifiers.targetFailure).toEqual({ operator: '=', value: 1 });
    });

    it('distributes keep highest: (3d10+1d10)kh3', () => {
        const ast = asParen(parseToAST('(3d10+1d10)kh3'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.keepHighest).toBe(3);
        expect(asDice(binop.right).modifiers.keepHighest).toBe(3);
    });

    it('distributes keep lowest: (3d10+1d10)kl1', () => {
        const ast = asParen(parseToAST('(3d10+1d10)kl1'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.keepLowest).toBe(1);
        expect(asDice(binop.right).modifiers.keepLowest).toBe(1);
    });

    it('distributes drop highest: (3d10+1d10)dh1', () => {
        const ast = asParen(parseToAST('(3d10+1d10)dh1'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.dropHighest).toBe(1);
        expect(asDice(binop.right).modifiers.dropHighest).toBe(1);
    });

    it('distributes drop lowest: (3d10+1d10)dl2', () => {
        const ast = asParen(parseToAST('(3d10+1d10)dl2'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.dropLowest).toBe(2);
        expect(asDice(binop.right).modifiers.dropLowest).toBe(2);
    });

    it('distributes explosion: (3d10+1d10)!', () => {
        const ast = asParen(parseToAST('(3d10+1d10)!'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.explode).toBeDefined();
        expect(asDice(binop.right).modifiers.explode).toBeDefined();
    });

    it('distributes compound explosion: (3d10+1d10)!!', () => {
        const ast = asParen(parseToAST('(3d10+1d10)!!'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.explode!.compounding).toBe(true);
        expect(asDice(binop.right).modifiers.explode!.compounding).toBe(true);
    });

    it('distributes reroll: (3d10+1d10)r1', () => {
        const ast = asParen(parseToAST('(3d10+1d10)r1'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.reroll).toBeDefined();
        expect(asDice(binop.right).modifiers.reroll).toBeDefined();
    });

    it('distributes sort: (3d10+1d10)s', () => {
        const ast = asParen(parseToAST('(3d10+1d10)s'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.sort).toBe('asc');
        expect(asDice(binop.right).modifiers.sort).toBe('asc');
    });

    it('distributes min/max: (3d10+1d10)min2max8', () => {
        const ast = asParen(parseToAST('(3d10+1d10)min2max8'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.min).toBe(2);
        expect(asDice(binop.right).modifiers.min).toBe(2);
        expect(asDice(binop.left).modifiers.max).toBe(8);
        expect(asDice(binop.right).modifiers.max).toBe(8);
    });

    it('distributes critical: (3d10+1d10)cs', () => {
        const ast = asParen(parseToAST('(3d10+1d10)cs'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.criticalSuccess).toBe(true);
        expect(asDice(binop.right).modifiers.criticalSuccess).toBe(true);
    });

    it('distributes critical failure: (3d10+1d10)cf', () => {
        const ast = asParen(parseToAST('(3d10+1d10)cf'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.criticalFailure).toBe(true);
        expect(asDice(binop.right).modifiers.criticalFailure).toBe(true);
    });

    it('distributes multiple modifiers combined (no collision): (3d10+1d10)!r1kh3s', () => {
        const ast = asParen(parseToAST('(3d10+1d10)!r1kh3s'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.explode).toBeDefined();
        expect(asDice(binop.left).modifiers.reroll).toBeDefined();
        expect(asDice(binop.left).modifiers.keepHighest).toBe(3);
        expect(asDice(binop.left).modifiers.sort).toBe('asc');
        expect(asDice(binop.right).modifiers.explode).toBeDefined();
        expect(asDice(binop.right).modifiers.reroll).toBeDefined();
        expect(asDice(binop.right).modifiers.keepHighest).toBe(3);
        expect(asDice(binop.right).modifiers.sort).toBe('asc');
    });

    it('distributes target+sort combined: (3d10+1d10)>=6f=1s', () => {
        const ast = asParen(parseToAST('(3d10+1d10)>=6f=1s'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        expect(asDice(binop.left).modifiers.targetFailure).toEqual({ operator: '=', value: 1 });
        expect(asDice(binop.left).modifiers.sort).toBe('asc');
        expect(asDice(binop.right).modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        expect(asDice(binop.right).modifiers.targetFailure).toEqual({ operator: '=', value: 1 });
        expect(asDice(binop.right).modifiers.sort).toBe('asc');
    });

    it('distributes to single dice group in parens: (3d10)>=6', () => {
        const ast = asParen(parseToAST('(3d10)>=6'));
        const dice = asDice(ast.expression);
        expect(dice.count).toBe(3);
        expect(dice.modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
    });

    it('distributes to nested parentheses: ((3d10+1d10)>=6)kh3', () => {
        const outer = asParen(parseToAST('((3d10+1d10)>=6)kh3'));
        const inner = asParen(outer.expression);
        const binop = asBinop(inner.expression);
        expect(asDice(binop.left).modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        expect(asDice(binop.right).modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        expect(asDice(binop.left).modifiers.keepHighest).toBe(3);
        expect(asDice(binop.right).modifiers.keepHighest).toBe(3);
    });

    it('maintains Parenthesized wrapper when no group modifiers: (3d10+1d10)', () => {
        const ast = asParen(parseToAST('(3d10+1d10)'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers).toEqual({});
        expect(asDice(binop.right).modifiers).toEqual({});
    });

    it('distributes to expression with unary operator: (-3d10)>=6', () => {
        const ast = asParen(parseToAST('(-3d10)>=6'));
        const unary = ast.expression;
        expect(unary.type).toBe('UnaryOp');
        if (unary.type === 'UnaryOp' && unary.operand.type === 'DiceGroup') {
            expect(unary.operand.modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        } else {
            expect.fail('Expected UnaryOp(DiceGroup)');
        }
    });

    it('distributes to expression with arithmetic: (3d10+5)>=6', () => {
        const ast = asParen(parseToAST('(3d10+5)>=6'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
    });
});

describe('Parser - group modifiers with per-die modifiers', () => {
    it('group modifiers override per-die modifiers: (3d10>8+1d10)>=6 applies >=6 to both', () => {
        const ast = asParen(parseToAST('(3d10>8+1d10)>=6'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        expect(asDice(binop.right).modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
    });

    it('group chain with multiple modifier types: (3d10!+1d10!)kh3', () => {
        const ast = asParen(parseToAST('(3d10!+1d10!)kh3'));
        const binop = asBinop(ast.expression);
        expect(asDice(binop.left).modifiers.explode).toBeDefined();
        expect(asDice(binop.right).modifiers.explode).toBeDefined();
        expect(asDice(binop.left).modifiers.keepHighest).toBe(3);
        expect(asDice(binop.right).modifiers.keepHighest).toBe(3);
    });
});

describe('Parser - validation with group modifiers', () => {
    it('validates (3d10+1d10)>=6', () => {
        expect(validateNotation('(3d10+1d10)>=6')).toBe(true);
    });

    it('validates (3d10+1d10)>=6f=1', () => {
        expect(validateNotation('(3d10+1d10)>=6f=1')).toBe(true);
    });

    it('validates (3d10+1d10)kh3', () => {
        expect(validateNotation('(3d10+1d10)kh3')).toBe(true);
    });

    it('validates parens with group modifiers: (3d10)>=6', () => {
        expect(validateNotation('(3d10)>=6')).toBe(true);
    });
});
