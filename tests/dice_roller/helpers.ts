import { evaluateDiceAST } from '@site/src/dice_roller/dice-logic/dice-evaluator';
import { parseToAST } from '@site/src/dice_roller/dice-logic/dice-parser';
import type { ASTNode, DiceGroupNode, DiceRoll } from '@site/src/dice_roller/dice-logic/types';
import { buildGroupKey } from '@site/src/dice_roller/dice-logic/utils';

/** Returns a `Math.random`-style function yielding `values` in order. */
export function mockRandom(...values: number[]): () => number {
    let i = 0;
    return () => values[i++];
}

/** The random value that `rollSingleDie` turns into `face` on a `sides`-sided die. */
export function faceToRandom(face: number, sides: number): number {
    return (face - 0.5) / sides;
}

/** Evaluates `notation` in 2D with the given random values consumed in order. */
export function evaluate(notation: string, ...randomValues: number[]) {
    return evaluateDiceAST(parseToAST(notation), notation, undefined, mockRandom(...randomValues));
}

function diceGroupsOf(node: ASTNode, out: DiceGroupNode[] = []): DiceGroupNode[] {
    if (node.type === 'DiceGroup') out.push(node);
    else if (node.type === 'BinaryOp') {
        diceGroupsOf(node.left, out);
        diceGroupsOf(node.right, out);
    } else if (node.type === 'UnaryOp') diceGroupsOf(node.operand, out);
    else if (node.type === 'Parenthesized') diceGroupsOf(node.expression, out);
    return out;
}

/**
 * Evaluates `notation` with pre-generated (3D-style) values, one array per dice term in
 * notation order, keyed exactly as the orchestrator keys them.
 */
export function evaluateWithValues(notation: string, ...groups: number[][]) {
    const ast = parseToAST(notation);
    const preGenerated = new Map<string, DiceRoll[]>();
    diceGroupsOf(ast).forEach((node, index) => {
        const values = groups[index] ?? [];
        preGenerated.set(
            buildGroupKey(node, index),
            values.map((value) => ({ sides: node.sides, value, dropped: false }))
        );
    });
    return evaluateDiceAST(ast, notation, preGenerated);
}
