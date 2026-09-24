import { parseToAST } from '@site/src/dice_roller/dice-logic/dice-parser';
import { NotationError } from '@site/src/dice_roller/dice-logic/errors';
import type { ASTNode } from '@site/src/dice_roller/dice-logic/types';
import { describe, expect, it } from 'vitest';

function labels(node: ASTNode): (string | undefined)[] {
    if (node.type === 'DiceGroup') return [node.label];
    if (node.type === 'BinaryOp') return [...labels(node.left), ...labels(node.right)];
    if (node.type === 'Parenthesized') return labels(node.expression);
    if (node.type === 'UnaryOp') return labels(node.operand);
    return [];
}

function diagnosticOf(notation: string) {
    try {
        parseToAST(notation);
    } catch (error) {
        expect(error).toBeInstanceOf(NotationError);
        return (error as NotationError).diagnostic;
    }
    throw new Error(`expected ${notation} to be invalid`);
}

describe('dice label notation', () => {
    it.each([
        ['2d10:h', ['h']],
        ['2d10:h@10,4>=6', ['h']],
        ['d10:hk', ['h']],
        ['2d10:hd1', ['h']],
        ['(3d10+2d10:h)>=6f=1', [undefined, 'h']],
        ['3d10>=6 + 2d10:h>=6', [undefined, 'h']],
    ])('parses %s', (notation, expected) => {
        expect(labels(parseToAST(notation))).toEqual(expected);
    });

    it('keeps the modifiers that follow the label', () => {
        const ast = parseToAST('2d10:h@10,4>=6');
        if (ast.type !== 'DiceGroup') throw new Error('expected a dice group');
        expect(ast.forcedValues).toEqual([10, 4]);
        expect(ast.modifiers.targetSuccess).toEqual({ operator: '>=', value: 6 });
    });

    it.each([
        ['2d10>=6:h', 7],
        ['(2d10):h', 6],
        ['5:h', 1],
        [':h', 0],
        ['2d10@1,2:h', 8],
    ])('rejects a misplaced label in %s', (notation, offset) => {
        expect(diagnosticOf(notation)).toMatchObject({ kind: 'label-position', offset, length: 2 });
    });
});
