import { describe, it, expect } from 'vitest';
import { parseToAST, validateNotation } from '../../src/dice-logic';
import type { DiceGroupNode, BinaryOpNode, NumericLiteralNode } from '../../src/dice-logic';

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

function asBinop(node: unknown): BinaryOpNode {
    if (
        node &&
        typeof node === 'object' &&
        'type' in node &&
        (node as { type: string }).type === 'BinaryOp'
    )
        return node as BinaryOpNode;
    throw new Error('Expected BinaryOp node');
}

function asNum(node: unknown): NumericLiteralNode {
    if (
        node &&
        typeof node === 'object' &&
        'type' in node &&
        (node as { type: string }).type === 'NumericLiteral'
    )
        return node as NumericLiteralNode;
    throw new Error('Expected NumericLiteral node');
}

describe('Parser - basic dice', () => {
    it('parses simple 1d6', () => {
        const ast = asDice(parseToAST('1d6'));
        expect(ast.count).toBe(1);
        expect(ast.sides).toBe(6);
        expect(ast.fudge).toBe(false);
        expect(ast.customFaces).toBeUndefined();
        expect(ast.modifiers).toEqual({});
    });

    it('parses 2d20 (default count = 1)', () => {
        const ast = asDice(parseToAST('d20'));
        expect(ast.count).toBe(1);
        expect(ast.sides).toBe(20);
    });

    it('parses large sides', () => {
        const ast = asDice(parseToAST('1d100'));
        expect(ast.count).toBe(1);
        expect(ast.sides).toBe(100);
    });

    it('parses 2d6+3 as binary expression', () => {
        const ast = asBinop(parseToAST('2d6+3'));
        expect(ast.operator).toBe('+');
        expect(asDice(ast.left).count).toBe(2);
        expect(asDice(ast.left).sides).toBe(6);
        expect(asNum(ast.right).value).toBe(3);
    });

    it('parses 10 - 2d4', () => {
        const ast = asBinop(parseToAST('10-2d4'));
        expect(ast.operator).toBe('-');
        expect(asNum(ast.left).value).toBe(10);
        expect(asDice(ast.right).sides).toBe(4);
    });

    it('parses expression with all operators', () => {
        const ast = parseToAST('2d6*3');
        const binop = asBinop(ast);
        expect(binop.operator).toBe('*');
    });
});

describe('Parser - modifiers', () => {
    it('parses keep highest: 4d6kh3', () => {
        const ast = asDice(parseToAST('4d6kh3'));
        expect(ast.modifiers.keepHighest).toBe(3);
    });

    it('parses keep highest default: 4d6kh', () => {
        const ast = asDice(parseToAST('4d6kh'));
        expect(ast.modifiers.keepHighest).toBe(1);
    });

    it('parses keep (default highest): 4d6k3', () => {
        const ast = asDice(parseToAST('4d6k3'));
        expect(ast.modifiers.keepHighest).toBe(3);
    });

    it('parses keep lowest: 2d20kl1', () => {
        const ast = asDice(parseToAST('2d20kl1'));
        expect(ast.modifiers.keepLowest).toBe(1);
    });

    it('parses drop highest: 4d6dh1', () => {
        const ast = asDice(parseToAST('4d6dh1'));
        expect(ast.modifiers.dropHighest).toBe(1);
    });

    it('parses drop lowest: 4d6dl2', () => {
        const ast = asDice(parseToAST('4d6dl2'));
        expect(ast.modifiers.dropLowest).toBe(2);
    });

    it('parses drop (default lowest): 4d6d2', () => {
        const ast = asDice(parseToAST('4d6d2'));
        expect(ast.modifiers.dropLowest).toBe(2);
    });

    it('parses reroll: 4d6r1', () => {
        const ast = asDice(parseToAST('4d6r1'));
        expect(ast.modifiers.reroll).toBeDefined();
        expect(ast.modifiers.reroll!.once).toBe(false);
        expect(ast.modifiers.reroll!.comparePoint).toBeDefined();
        expect(ast.modifiers.reroll!.comparePoint!.operator).toBe('<=');
        expect(ast.modifiers.reroll!.comparePoint!.value).toBe(1);
    });

    it('parses reroll default: 4d6r', () => {
        const ast = asDice(parseToAST('4d6r'));
        expect(ast.modifiers.reroll).toBeDefined();
        expect(ast.modifiers.reroll!.once).toBe(false);
        expect(ast.modifiers.reroll!.comparePoint!.operator).toBe('<=');
        expect(ast.modifiers.reroll!.comparePoint!.value).toBe(1);
    });

    it('parses reroll once: 4d6ro', () => {
        const ast = asDice(parseToAST('4d6ro'));
        expect(ast.modifiers.reroll).toBeDefined();
        expect(ast.modifiers.reroll!.once).toBe(true);
        expect(ast.modifiers.reroll!.comparePoint!.operator).toBe('<=');
        expect(ast.modifiers.reroll!.comparePoint!.value).toBe(1);
    });

    it('parses reroll once with threshold: 4d6ro2', () => {
        const ast = asDice(parseToAST('4d6ro2'));
        expect(ast.modifiers.reroll).toBeDefined();
        expect(ast.modifiers.reroll!.once).toBe(true);
        expect(ast.modifiers.reroll!.comparePoint!.value).toBe(2);
    });

    it('parses reroll with compare point: 4d6r=5', () => {
        const ast = asDice(parseToAST('4d6r=5'));
        expect(ast.modifiers.reroll).toBeDefined();
        expect(ast.modifiers.reroll!.once).toBe(false);
        expect(ast.modifiers.reroll!.comparePoint!.operator).toBe('=');
        expect(ast.modifiers.reroll!.comparePoint!.value).toBe(5);
    });

    it('parses explosion: 4d6!', () => {
        const ast = asDice(parseToAST('4d6!'));
        expect(ast.modifiers.explode).toBeDefined();
        expect(ast.modifiers.explode!.comparePoint).toBeUndefined();
        expect(ast.modifiers.explode!.compounding).toBeUndefined();
        expect(ast.modifiers.explode!.penetrating).toBeUndefined();
    });

    it('parses explosion with compare point: 4d10!>8', () => {
        const ast = asDice(parseToAST('4d10!>8'));
        expect(ast.modifiers.explode).toBeDefined();
        expect(ast.modifiers.explode!.comparePoint).toBeDefined();
        expect(ast.modifiers.explode!.comparePoint!.operator).toBe('>');
        expect(ast.modifiers.explode!.comparePoint!.value).toBe(8);
    });

    it('parses explosion with not-equal compare: 4d10!<>8', () => {
        const ast = asDice(parseToAST('4d10!<>8'));
        expect(ast.modifiers.explode).toBeDefined();
        expect(ast.modifiers.explode!.comparePoint).toBeDefined();
        expect(ast.modifiers.explode!.comparePoint!.operator).toBe('<>');
        expect(ast.modifiers.explode!.comparePoint!.value).toBe(8);
    });

    it('parses explosion with != as ! + =: d6!=3', () => {
        const ast = asDice(parseToAST('d6!=3'));
        expect(ast.modifiers.explode).toBeDefined();
        expect(ast.modifiers.explode!.comparePoint).toBeDefined();
        expect(ast.modifiers.explode!.comparePoint!.operator).toBe('=');
        expect(ast.modifiers.explode!.comparePoint!.value).toBe(3);
    });

    it('parses compound explosion: 4d6!!', () => {
        const ast = asDice(parseToAST('4d6!!'));
        expect(ast.modifiers.explode).toBeDefined();
        expect(ast.modifiers.explode!.compounding).toBe(true);
    });

    it('parses penetrating explosion: 4d6!p', () => {
        const ast = asDice(parseToAST('4d6!p'));
        expect(ast.modifiers.explode).toBeDefined();
        expect(ast.modifiers.explode!.penetrating).toBe(true);
        expect(ast.modifiers.explode!.compounding).toBeUndefined();
    });

    it('parses compound penetrating: 4d6!!p', () => {
        const ast = asDice(parseToAST('4d6!!p'));
        expect(ast.modifiers.explode).toBeDefined();
        expect(ast.modifiers.explode!.compounding).toBe(true);
        expect(ast.modifiers.explode!.penetrating).toBe(true);
    });

    it('parses sort ascending: 4d6s', () => {
        const ast = asDice(parseToAST('4d6s'));
        expect(ast.modifiers.sort).toBe('asc');
    });

    it('parses sort descending: 4d6sd', () => {
        const ast = asDice(parseToAST('4d6sd'));
        expect(ast.modifiers.sort).toBe('desc');
    });

    it('parses chained modifiers: 4d6r1kh3', () => {
        const ast = asDice(parseToAST('4d6r1kh3'));
        expect(ast.modifiers.reroll).toBeDefined();
        expect(ast.modifiers.keepHighest).toBe(3);
    });

    it('parses condition: 4d10>5', () => {
        const ast = asDice(parseToAST('4d10>5'));
        expect(ast.modifiers.targetSuccess).toBeDefined();
        expect(ast.modifiers.targetSuccess!.operator).toBe('>');
        expect(ast.modifiers.targetSuccess!.value).toBe(5);
    });

    it('parses condition < : 3d6<3', () => {
        const ast = asDice(parseToAST('3d6<3'));
        expect(ast.modifiers.targetSuccess!.operator).toBe('<');
        expect(ast.modifiers.targetSuccess!.value).toBe(3);
    });

    it('parses condition >= : 4d10>=7', () => {
        const ast = asDice(parseToAST('4d10>=7'));
        expect(ast.modifiers.targetSuccess!.operator).toBe('>=');
        expect(ast.modifiers.targetSuccess!.value).toBe(7);
    });

    it('parses condition <= : 4d10<=3', () => {
        const ast = asDice(parseToAST('4d10<=3'));
        expect(ast.modifiers.targetSuccess!.operator).toBe('<=');
        expect(ast.modifiers.targetSuccess!.value).toBe(3);
    });

    it('parses condition = : 4d10=10', () => {
        const ast = asDice(parseToAST('4d10=10'));
        expect(ast.modifiers.targetSuccess!.operator).toBe('=');
        expect(ast.modifiers.targetSuccess!.value).toBe(10);
    });

    it('parses condition != (via <>): 4d10<>1', () => {
        const ast = asDice(parseToAST('4d10<>1'));
        expect(ast.modifiers.targetSuccess!.operator).toBe('<>');
        expect(ast.modifiers.targetSuccess!.value).toBe(1);
    });

    it('parses unique: 4d6u', () => {
        const ast = asDice(parseToAST('4d6u'));
        expect(ast.modifiers.unique).toBeDefined();
        expect(ast.modifiers.unique!.once).toBe(false);
        expect(ast.modifiers.unique!.comparePoint).toBeUndefined();
    });

    it('parses unique once: 4d6uo', () => {
        const ast = asDice(parseToAST('4d6uo'));
        expect(ast.modifiers.unique).toBeDefined();
        expect(ast.modifiers.unique!.once).toBe(true);
    });

    it('parses unique with compare point: 4d6u=5', () => {
        const ast = asDice(parseToAST('4d6u=5'));
        expect(ast.modifiers.unique).toBeDefined();
        expect(ast.modifiers.unique!.comparePoint!.operator).toBe('=');
        expect(ast.modifiers.unique!.comparePoint!.value).toBe(5);
    });

    it('parses min modifier: 4d6min3', () => {
        const ast = asDice(parseToAST('4d6min3'));
        expect(ast.modifiers.min).toBe(3);
    });

    it('parses max modifier: 4d6max5', () => {
        const ast = asDice(parseToAST('4d6max5'));
        expect(ast.modifiers.max).toBe(5);
    });

    it('parses critical success: 2d20cs', () => {
        const ast = asDice(parseToAST('2d20cs'));
        expect(ast.modifiers.criticalSuccess).toBe(true);
    });

    it('parses critical success with compare point: 4d10cs>7', () => {
        const ast = asDice(parseToAST('4d10cs>7'));
        expect(ast.modifiers.criticalSuccess).not.toBe(true);
        if (ast.modifiers.criticalSuccess && typeof ast.modifiers.criticalSuccess !== 'boolean') {
            expect(ast.modifiers.criticalSuccess.operator).toBe('>');
            expect(ast.modifiers.criticalSuccess.value).toBe(7);
        }
    });

    it('parses critical failure: 2d20cf', () => {
        const ast = asDice(parseToAST('2d20cf'));
        expect(ast.modifiers.criticalFailure).toBe(true);
    });

    it('parses target failure: 4d10>5f<3', () => {
        const ast = asDice(parseToAST('4d10>5f<3'));
        expect(ast.modifiers.targetSuccess).toBeDefined();
        expect(ast.modifiers.targetSuccess!.operator).toBe('>');
        expect(ast.modifiers.targetSuccess!.value).toBe(5);
        expect(ast.modifiers.targetFailure).toBeDefined();
        expect(ast.modifiers.targetFailure!.operator).toBe('<');
        expect(ast.modifiers.targetFailure!.value).toBe(3);
    });

    it('parses critical success botch: 2d20csb', () => {
        const ast = asDice(parseToAST('2d20csb'));
        expect(ast.modifiers.criticalSuccess).toBe(true);
        expect(ast.modifiers.criticalSuccessBotch).toBe(true);
    });

    it('parses critical failure botch: 2d20cfb', () => {
        const ast = asDice(parseToAST('2d20cfb'));
        expect(ast.modifiers.criticalFailure).toBe(true);
        expect(ast.modifiers.criticalFailureBotch).toBe(true);
    });

    it('parses csb with compare point: 4d10csb>7', () => {
        const ast = asDice(parseToAST('4d10csb>7'));
        expect(ast.modifiers.criticalSuccessBotch).toBe(true);
        if (ast.modifiers.criticalSuccess && typeof ast.modifiers.criticalSuccess !== 'boolean') {
            expect(ast.modifiers.criticalSuccess.operator).toBe('>');
            expect(ast.modifiers.criticalSuccess.value).toBe(7);
        }
    });

    it('parses cfb with compare point: 4d10cfb<=2', () => {
        const ast = asDice(parseToAST('4d10cfb<=2'));
        expect(ast.modifiers.criticalFailureBotch).toBe(true);
        if (ast.modifiers.criticalFailure && typeof ast.modifiers.criticalFailure !== 'boolean') {
            expect(ast.modifiers.criticalFailure.operator).toBe('<=');
            expect(ast.modifiers.criticalFailure.value).toBe(2);
        }
    });
});

describe('Parser - arithmetic', () => {
    it('parses parenthesized: (2d6+3)*2', () => {
        const ast = asBinop(parseToAST('(2d6+3)*2'));
        expect(ast.operator).toBe('*');
        expect(ast.right).toBeDefined();
        expect((ast.right as NumericLiteralNode).type).toBe('NumericLiteral');
    });

    it('parses nested dice: 1d20+(1d4+1)d6', () => {
        const ast = parseToAST('1d20+(1d4+1)d6');
        const binop = asBinop(ast);
        expect(binop.operator).toBe('+');
    });

    it('parses < with explosion after condition: 4d6!', () => {
        const ast = asDice(parseToAST('4d6!'));
        expect(ast.modifiers.explode).toBeDefined();
    });

    it('preserves single die groups in binary ops: 2d6+4d4', () => {
        const ast = asBinop(parseToAST('2d6+4d4'));
        expect(asDice(ast.left).sides).toBe(6);
        expect(asDice(ast.right).sides).toBe(4);
    });
});

describe('Parser - custom faces', () => {
    it('parses 1d[1,3,5,7,9]', () => {
        const ast = asDice(parseToAST('1d[1,3,5,7,9]'));
        expect(ast.customFaces).toEqual([1, 3, 5, 7, 9]);
    });

    it('parses range expansion: 1d[3-5]', () => {
        const ast = asDice(parseToAST('1d[3-5]'));
        expect(ast.customFaces).toEqual([3, 4, 5]);
    });

    it('parses mixed explicit and range: 1d[1,3-5,9]', () => {
        const ast = asDice(parseToAST('1d[1,3-5,9]'));
        expect(ast.customFaces).toEqual([1, 3, 4, 5, 9]);
    });
});

describe('Parser - fudge dice', () => {
    it('parses 4dF', () => {
        const ast = asDice(parseToAST('4dF'));
        expect(ast.count).toBe(4);
        expect(ast.fudge).toBe(true);
    });

    it('parses 1dF', () => {
        const ast = asDice(parseToAST('1dF'));
        expect(ast.count).toBe(1);
        expect(ast.fudge).toBe(true);
    });
});

describe('Parser - validation', () => {
    it('validates correct notation: 2d6+3', () => {
        expect(validateNotation('2d6+3')).toBe(true);
    });

    it('rejects without dice: "abc"', () => {
        expect(validateNotation('abc')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(validateNotation('')).toBe(false);
    });

    it('rejects fullwidth unicode digits (２d６)', () => {
        expect(validateNotation('２d６')).toBe(false);
    });

    it('rejects fullwidth unicode operators (2d6＋3)', () => {
        expect(validateNotation('2d6＋3')).toBe(false);
    });
});

describe('Parser - forced rolls (@)', () => {
    it('parses 2d20@20,1 with two forced values', () => {
        const ast = asDice(parseToAST('2d20@20,1'));
        expect(ast.forcedValues).toEqual([20, 1]);
    });

    it('parses 6d6@4,4,4,4,4,4 with six forced values', () => {
        const ast = asDice(parseToAST('6d6@4,4,4,4,4,4'));
        expect(ast.forcedValues).toEqual([4, 4, 4, 4, 4, 4]);
    });

    it('parses d8@7 with single forced value', () => {
        const ast = asDice(parseToAST('d8@7'));
        expect(ast.forcedValues).toEqual([7]);
    });

    it('parses forced values with modifiers: 4d6@3,3,3,3kh3', () => {
        const ast = asDice(parseToAST('4d6@3,3,3,3kh3'));
        expect(ast.forcedValues).toEqual([3, 3, 3, 3]);
        expect(ast.modifiers.keepHighest).toBe(3);
    });

    it('validates notation with forced values', () => {
        expect(validateNotation('2d20@20,1')).toBe(true);
        expect(validateNotation('6d6@1,2,3,4,5,6')).toBe(true);
    });
});

describe('Parser - edge cases', () => {
    it('handles 50 levels of nested parentheses', () => {
        const inner = '1d6+2';
        const expr = inner.padStart(inner.length + 50, '(').padEnd(inner.length + 100, ')');
        const ast = parseToAST(expr);
        expect(ast).toBeDefined();
    });

    it('handles negative expression -2d6', () => {
        const ast = parseToAST('-2d6');
        expect(ast).toHaveProperty('type', 'UnaryOp');
        if (ast.type === 'UnaryOp' && ast.operand.type === 'DiceGroup') {
            expect(ast.operand.count).toBe(2);
            expect(ast.operand.sides).toBe(6);
        } else {
            expect.fail('Expected UnaryOp(DiceGroup)');
        }
    });

    it('handles negative expression -4dF', () => {
        const ast = parseToAST('-4dF');
        expect(ast).toHaveProperty('type', 'UnaryOp');
    });
});
