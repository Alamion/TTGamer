import { tokenize } from '@site/src/dice_roller/dice-logic/dice-lexer';
import { parseToAST, validateNotation } from '@site/src/dice_roller/dice-logic/dice-parser';
import { NotationError } from '@site/src/dice_roller/dice-logic/errors';
import type { ASTNode } from '@site/src/dice_roller/dice-logic/types';
import { describe, expect, it } from 'vitest';

function diagnosticOf(notation: string) {
    try {
        parseToAST(notation);
    } catch (error) {
        expect(error).toBeInstanceOf(NotationError);
        return (error as NotationError).diagnostic;
    }
    throw new Error(`expected ${notation} to be invalid`);
}

function innerGroups(node: ASTNode): ASTNode[] {
    if (node.type === 'Parenthesized') return innerGroups(node.expression);
    if (node.type === 'BinaryOp') return [...innerGroups(node.left), ...innerGroups(node.right)];
    return [node];
}

describe('set bonus notation', () => {
    it('lexes x{N} and x{N}.{K} as one modifier token', () => {
        expect(tokenize('6d10>=6x2=10').map((t) => t.type)).toEqual([
            'DICE',
            'GTE',
            'NUMBER',
            'MOD_SET',
            'EQ',
            'NUMBER',
            'END',
        ]);
        expect(tokenize('5d6>=5x3.1>=5').find((t) => t.type === 'MOD_SET')?.text).toBe('x3.1');
    });

    it('stores a term-level bonus with its own compare point and default bonus', () => {
        const ast = parseToAST('6d10>=6x2=10');
        expect(ast.type).toBe('DiceGroup');
        if (ast.type !== 'DiceGroup') return;
        expect(ast.modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
        expect(ast.modifiers.setBonus).toMatchObject({
            size: 2,
            bonus: 2,
            comparePoint: { operator: '=', value: 10 },
        });
    });

    it('accepts an explicit bonus', () => {
        const ast = parseToAST('5d6>=5x3.1>=5');
        if (ast.type !== 'DiceGroup') throw new Error('expected a dice group');
        expect(ast.modifiers.setBonus).toMatchObject({ size: 3, bonus: 1 });
    });

    it('keeps a group-level bonus on the group and does not distribute it', () => {
        const ast = parseToAST('(4d10+2d10)>=6x2=10');
        expect(ast.type).toBe('Parenthesized');
        if (ast.type !== 'Parenthesized') return;
        expect(ast.poolModifiers?.setBonus).toMatchObject({ size: 2, bonus: 2 });
        for (const group of innerGroups(ast)) {
            if (group.type !== 'DiceGroup') throw new Error('expected dice groups');
            expect(group.modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
            expect(group.modifiers.setBonus).toBeUndefined();
        }
    });

    it('accepts a group bonus when every term has its own target', () => {
        expect(validateNotation('(3d10>=6+2d10>=6)x2=10')).toBe(true);
    });

    it('rejects a bonus without a success target in scope', () => {
        expect(diagnosticOf('3d6x3=6')).toMatchObject({
            kind: 'set-bonus-needs-target',
            offset: 3,
            length: 2,
        });
        expect(diagnosticOf('(3d10+2d10>=6)x2=10').kind).toBe('set-bonus-needs-target');
    });

    it('rejects invalid set sizes and bonuses', () => {
        expect(diagnosticOf('6d10>=6x1=10')).toMatchObject({
            kind: 'invalid-set-size',
            offset: 7,
            length: 2,
        });
        expect(diagnosticOf('6d10>=6x2.0=10').kind).toBe('invalid-set-size');
    });

    it('requires a compare point after the set size', () => {
        expect(diagnosticOf('6d10>=6x2')).toMatchObject({
            kind: 'unexpected-end',
            offset: 9,
            expected: ['compare'],
        });
    });

    it('rejects a second bonus in the same scope', () => {
        expect(diagnosticOf('6d10>=6x2=10x3=9')).toMatchObject({
            kind: 'unexpected-token',
            offset: 12,
            length: 2,
        });
    });
});
