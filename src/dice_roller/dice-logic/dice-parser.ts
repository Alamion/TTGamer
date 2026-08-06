import { debug } from '@site/src/shared/utils/logging';

import {
    MAX_AST_NODES,
    MAX_DICE_COUNT,
    MAX_DICE_SIDES,
    MAX_NOTATION_LENGTH,
    MAX_NUMERIC_LITERAL,
} from '../utils/constants';
import { type LexerToken, tokenize } from './dice-lexer';
import type { ASTNode, ComparePoint, DiceModifiers, TokenType } from './types';

const PRECEDENCE: Record<string, number> = {
    '^': 4,
    '*': 3,
    '/': 3,
    '%': 3,
    '+': 2,
    '-': 2,
};

function parseModifierValue(token: LexerToken): number {
    let value: number;
    if (token.type === 'NUMBER') {
        value = typeof token.value === 'number' ? token.value : parseInt(token.value as string, 10);
    } else {
        const match = token.text.match(/\d+/);
        value = match ? parseInt(match[0], 10) : 1;
    }
    if (!Number.isFinite(value) || value > MAX_NUMERIC_LITERAL) {
        throw new RangeError(`Numeric values may not exceed ${MAX_NUMERIC_LITERAL}`);
    }
    return value;
}

function hasEmbeddedNumber(token: LexerToken): boolean {
    return /\d/.test(token.text);
}

class TokenStream {
    private tokens: LexerToken[];
    private position: number = 0;

    constructor(tokens: LexerToken[]) {
        this.tokens = tokens;
    }

    peek(): LexerToken | undefined {
        return this.tokens[this.position];
    }

    consume(): LexerToken | undefined {
        return this.tokens[this.position++];
    }

    expect(type: TokenType): LexerToken {
        const token = this.peek();
        if (token && token.type === type) {
            return this.consume()!;
        }
        throw this.error(`Expected ${type}`);
    }

    has(type: TokenType): boolean {
        const token = this.peek();
        return token ? token.type === type : false;
    }

    isEnd(): boolean {
        const token = this.peek();
        return token ? token.type === 'END' : true;
    }

    error(message: string, token = this.peek()): SyntaxError {
        const location = token ? ` at line ${token.line || 1}, column ${token.col || 1}` : '';
        return new SyntaxError(`${message}${location}`);
    }
}

function parseExpression(stream: TokenStream): ASTNode {
    return parseAddSub(stream);
}

function parseAddSub(stream: TokenStream): ASTNode {
    let left = parseMulDivMod(stream);

    while (stream.peek() && (stream.peek()!.type === 'PLUS' || stream.peek()!.type === 'MINUS')) {
        const operator = stream.consume()!.type === 'PLUS' ? '+' : '-';
        const right = parseMulDivMod(stream);
        left = { type: 'BinaryOp', operator, left, right };
    }

    return left;
}

function parseMulDivMod(stream: TokenStream): ASTNode {
    let left = parseExponent(stream);

    while (
        stream.peek() &&
        (stream.peek()!.type === 'MULTIPLY' ||
            stream.peek()!.type === 'DIVIDE' ||
            stream.peek()!.type === 'MODULO')
    ) {
        const operatorToken = stream.consume()!;
        const operator = (
            operatorToken.type === 'MULTIPLY' ? '*' : operatorToken.type === 'DIVIDE' ? '/' : '%'
        ) as '+' | '-' | '*' | '/' | '%' | '^';
        const right = parseExponent(stream);
        left = { type: 'BinaryOp', operator, left, right };
    }

    return left;
}

function parseExponent(stream: TokenStream): ASTNode {
    let left = parseUnary(stream);

    while (stream.peek() && stream.peek()!.type === 'EXPONENT') {
        stream.consume();
        const right = parseUnary(stream);
        left = { type: 'BinaryOp', operator: '^', left, right };
    }

    return left;
}

function parseUnary(stream: TokenStream): ASTNode {
    if (stream.peek() && (stream.peek()!.type === 'PLUS' || stream.peek()!.type === 'MINUS')) {
        const operator = stream.consume()!.type === 'PLUS' ? '+' : '-';
        const operand = parseUnary(stream);
        return { type: 'UnaryOp', operator, operand };
    }
    return parsePrimary(stream);
}

function parsePrimary(stream: TokenStream): ASTNode {
    const token = stream.peek();

    if (!token) {
        throw stream.error('Unexpected end of input');
    }

    if (token.type === 'LPAREN') {
        stream.consume();
        const expr = parseExpression(stream);
        stream.expect('RPAREN');
        // Parse and distribute group-level modifiers to all dice inside the parens
        const groupMods = parseGroupModifiers(stream);
        if (groupMods) {
            distributeModifiersToDiceGroups(expr, groupMods);
        }
        return { type: 'Parenthesized', expression: expr };
    }

    if (token.type === 'NUMBER') {
        stream.consume();
        return {
            type: 'NumericLiteral',
            value:
                typeof token.value === 'number' ? token.value : parseInt(token.value as string, 10),
        };
    }

    if (token.type === 'DICE') {
        return parseDiceGroup(stream);
    }

    if (token.type === 'MINUS') {
        stream.consume();
        const operand = parsePrimary(stream);
        return { type: 'UnaryOp', operator: '-', operand };
    }

    if (token.type === 'END') {
        throw stream.error('Expected a number, dice group, or parenthesized expression', token);
    }

    throw stream.error(`Unexpected token ${token.type} (${token.text})`, token);
}

function isCompareType(type?: TokenType): boolean {
    return (
        type === 'GT' ||
        type === 'GTE' ||
        type === 'LT' ||
        type === 'LTE' ||
        type === 'EQ' ||
        type === 'NEQ'
    );
}

function mapCompareOperator(token: LexerToken): ComparePoint['operator'] {
    const opMap: Record<string, ComparePoint['operator']> = {
        GT: '>',
        GTE: '>=',
        LT: '<',
        LTE: '<=',
        EQ: '=',
        NEQ: '<>',
    };
    return opMap[token.type] || '=';
}

function parseComparePoint(stream: TokenStream): ComparePoint | undefined {
    const next = stream.peek();
    if (next && isCompareType(next.type)) {
        const opToken = stream.consume()!;
        const valueToken = stream.peek();
        if (!valueToken || valueToken.type !== 'NUMBER') {
            throw stream.error('Comparison operator must be followed by a number', valueToken);
        }
        const value =
            typeof valueToken.value === 'number'
                ? valueToken.value
                : parseInt(valueToken.value as string, 10);
        stream.consume();
        return {
            operator: mapCompareOperator(opToken),
            value,
        };
    }
    return undefined;
}

function tryParseOneModifier(stream: TokenStream, modifiers: DiceModifiers): boolean {
    const peekToken = stream.peek();
    if (!peekToken) return false;

    switch (peekToken.type) {
        case 'MOD_EXPLODE': {
            const tok = stream.consume()!;
            const exp: DiceModifiers['explode'] = {};
            exp.compounding = tok.text.startsWith('!!') || undefined;
            exp.penetrating = tok.text.endsWith('p') || undefined;
            const cp = parseComparePoint(stream);
            if (cp) exp.comparePoint = cp;
            modifiers.explode = exp;
            return true;
        }

        case 'MOD_REROLL': {
            const tok = stream.consume()!;
            const text = tok.text;
            const once = text.startsWith('ro');
            if (hasEmbeddedNumber(tok)) {
                const val = parseModifierValue(tok);
                modifiers.reroll = { once, comparePoint: { operator: '<=', value: val } };
            } else if (stream.peek() && isCompareType(stream.peek()?.type)) {
                const cp = parseComparePoint(stream);
                modifiers.reroll = { once, comparePoint: cp };
            } else {
                const val =
                    stream.peek()?.type === 'NUMBER' ? parseModifierValue(stream.consume()!) : 1;
                modifiers.reroll = { once, comparePoint: { operator: '<=', value: val } };
            }
            return true;
        }

        case 'MOD_UNIQUE': {
            const tok = stream.consume()!;
            const once = tok.text.startsWith('uo');
            if (stream.peek() && isCompareType(stream.peek()?.type)) {
                const cp = parseComparePoint(stream);
                modifiers.unique = { once, comparePoint: cp };
            } else {
                modifiers.unique = { once };
            }
            return true;
        }

        case 'MOD_KEEP': {
            const tok = stream.consume()!;
            const text = tok.text;
            if (text.startsWith('kl')) {
                modifiers.keepLowest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
            } else if (text.startsWith('kh') || text === 'k') {
                modifiers.keepHighest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
            } else {
                modifiers.keepHighest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
            }
            return true;
        }

        case 'MOD_DROP': {
            const tok = stream.consume()!;
            const text = tok.text;
            if (text.startsWith('dh')) {
                modifiers.dropHighest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
            } else if (text.startsWith('dl')) {
                modifiers.dropLowest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
            } else {
                modifiers.dropLowest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
            }
            return true;
        }

        case 'MOD_SORT': {
            const tok = stream.consume()!;
            modifiers.sort = tok.text === 'sd' ? 'desc' : 'asc';
            return true;
        }

        case 'MOD_MIN': {
            const tok = stream.consume()!;
            modifiers.min = hasEmbeddedNumber(tok)
                ? parseModifierValue(tok)
                : stream.peek()?.type === 'NUMBER'
                  ? parseModifierValue(stream.consume()!)
                  : 1;
            return true;
        }

        case 'MOD_MAX': {
            const tok = stream.consume()!;
            modifiers.max = hasEmbeddedNumber(tok)
                ? parseModifierValue(tok)
                : stream.peek()?.type === 'NUMBER'
                  ? parseModifierValue(stream.consume()!)
                  : 1;
            return true;
        }

        case 'MOD_CSB': {
            stream.consume();
            const cp = parseComparePoint(stream);
            modifiers.criticalSuccess = cp || true;
            modifiers.criticalSuccessBotch = true;
            return true;
        }

        case 'MOD_CFB': {
            stream.consume();
            const cp = parseComparePoint(stream);
            modifiers.criticalFailure = cp || true;
            modifiers.criticalFailureBotch = true;
            return true;
        }

        case 'MOD_CS': {
            stream.consume();
            const cp = parseComparePoint(stream);
            modifiers.criticalSuccess = cp || true;
            return true;
        }

        case 'MOD_CF': {
            stream.consume();
            const cp = parseComparePoint(stream);
            modifiers.criticalFailure = cp || true;
            return true;
        }

        case 'MOD_FAILURE': {
            stream.consume();
            const cp = parseComparePoint(stream);
            if (cp) modifiers.targetFailure = cp;
            return true;
        }

        case 'GT':
        case 'GTE':
        case 'LT':
        case 'LTE':
        case 'EQ':
        case 'NEQ': {
            const cp = parseComparePoint(stream);
            if (cp) modifiers.targetSuccess = cp;
            return true;
        }

        default:
            return false;
    }
}

function parseDiceGroup(stream: TokenStream): ASTNode {
    const token = stream.consume();
    if (!token) {
        return { type: 'NumericLiteral', value: 0 };
    }

    const diceValue = token.value as {
        count: number;
        sides: number;
        fudge: boolean;
        customFaces?: number[];
    };

    const count = diceValue.count;
    const sides = diceValue.sides;
    const fudge = diceValue.fudge || false;
    const customFaces: number[] | undefined = diceValue.customFaces;

    if (!Number.isInteger(count) || count < 1 || count > MAX_DICE_COUNT) {
        throw stream.error(`Dice count must be between 1 and ${MAX_DICE_COUNT}`, token);
    }
    if (!Number.isInteger(sides) || sides < 1 || sides > MAX_DICE_SIDES) {
        throw stream.error(`Dice sides must be between 1 and ${MAX_DICE_SIDES}`, token);
    }

    const modifiers: DiceModifiers = {};
    let forcedValues: number[] | undefined;

    while (stream.peek() && !stream.isEnd()) {
        const peekToken = stream.peek()!;

        // DICE tokens starting with bare "d" followed by digits are drop modifiers
        if (peekToken.type === 'DICE' && /^d\d+$/.test(peekToken.text)) {
            const tok = stream.consume()!;
            modifiers.dropLowest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
            break;
        }

        // Forced values (@N,N,N,..) — parse values, then continue for remaining modifiers
        if (peekToken.type === 'AT') {
            stream.consume();
            forcedValues = [];
            while (stream.peek() && stream.peek()!.type !== 'END') {
                const tok = stream.peek()!;
                if (tok.type === 'NUMBER') {
                    stream.consume();
                    forcedValues.push(
                        typeof tok.value === 'number'
                            ? tok.value
                            : parseInt(tok.value as string, 10)
                    );
                } else if (tok.type === 'COMMA') {
                    stream.consume();
                } else {
                    break;
                }
            }
            continue;
        }

        if (!tryParseOneModifier(stream, modifiers)) break;
    }

    return {
        type: 'DiceGroup',
        count,
        sides,
        modifiers,
        customFaces,
        fudge,
        forcedValues: forcedValues && forcedValues.length > 0 ? forcedValues : undefined,
    };
}

function parseGroupModifiers(stream: TokenStream): DiceModifiers | undefined {
    const modifiers: DiceModifiers = {};
    let foundAny = false;

    while (stream.peek() && !stream.isEnd()) {
        const peekToken = stream.peek()!;

        // DICE-to-DROP fallback (bare "dN" token after RPAREN)
        if (peekToken.type === 'DICE' && /^d\d+$/.test(peekToken.text)) {
            stream.consume();
            modifiers.dropLowest = hasEmbeddedNumber(peekToken) ? parseModifierValue(peekToken) : 1;
            foundAny = true;
            break;
        }

        if (tryParseOneModifier(stream, modifiers)) {
            foundAny = true;
        } else {
            break;
        }
    }

    return foundAny ? modifiers : undefined;
}

function mergeModifiers(target: DiceModifiers, source: DiceModifiers): void {
    if (source.min !== undefined) target.min = source.min;
    if (source.max !== undefined) target.max = source.max;
    if (source.explode !== undefined) target.explode = source.explode;
    if (source.reroll !== undefined) target.reroll = source.reroll;
    if (source.unique !== undefined) target.unique = source.unique;
    if (source.keepHighest !== undefined) target.keepHighest = source.keepHighest;
    if (source.keepLowest !== undefined) target.keepLowest = source.keepLowest;
    if (source.dropHighest !== undefined) target.dropHighest = source.dropHighest;
    if (source.dropLowest !== undefined) target.dropLowest = source.dropLowest;
    if (source.targetSuccess !== undefined) target.targetSuccess = source.targetSuccess;
    if (source.targetFailure !== undefined) target.targetFailure = source.targetFailure;
    if (source.criticalSuccess !== undefined) target.criticalSuccess = source.criticalSuccess;
    if (source.criticalFailure !== undefined) target.criticalFailure = source.criticalFailure;
    if (source.criticalSuccessBotch !== undefined)
        target.criticalSuccessBotch = source.criticalSuccessBotch;
    if (source.criticalFailureBotch !== undefined)
        target.criticalFailureBotch = source.criticalFailureBotch;
    if (source.sort !== undefined) target.sort = source.sort;
}

function distributeModifiersToDiceGroups(node: ASTNode, mods: DiceModifiers): void {
    if (node.type === 'DiceGroup') {
        mergeModifiers(node.modifiers, mods);
    } else if (node.type === 'BinaryOp') {
        distributeModifiersToDiceGroups(node.left, mods);
        distributeModifiersToDiceGroups(node.right, mods);
    } else if (node.type === 'UnaryOp') {
        distributeModifiersToDiceGroups(node.operand, mods);
    } else if (node.type === 'Parenthesized') {
        distributeModifiersToDiceGroups(node.expression, mods);
    }
}

export function parseToAST(input: string): ASTNode {
    if (input.length > MAX_NOTATION_LENGTH) {
        throw new SyntaxError(`Notation may contain at most ${MAX_NOTATION_LENGTH} characters`);
    }
    const tokens = tokenize(input);
    const invalidToken = tokens.find((token) => token.type === 'ERROR');
    if (invalidToken) {
        throw new SyntaxError(
            `Unexpected token ${invalidToken.text} at line ${invalidToken.line}, column ${invalidToken.col}`
        );
    }
    const excessiveNumber = tokens.find(
        (token) =>
            token.type === 'NUMBER' &&
            (typeof token.value !== 'number' ||
                !Number.isFinite(token.value) ||
                token.value > MAX_NUMERIC_LITERAL)
    );
    if (excessiveNumber) {
        throw new RangeError(
            `Numeric values may not exceed ${MAX_NUMERIC_LITERAL} at line ${excessiveNumber.line}, column ${excessiveNumber.col}`
        );
    }
    debug(
        'Tokens:',
        tokens.map((t) => ({ type: t.type, text: t.text }))
    );
    const stream = new TokenStream(tokens);
    const ast = parseExpression(stream);
    if (!stream.isEnd()) {
        const token = stream.peek();
        throw stream.error(`Unexpected trailing token ${token?.text || token?.type}`, token);
    }

    let nodeCount = 0;
    let diceCount = 0;
    const visit = (node: ASTNode): void => {
        nodeCount++;
        if (nodeCount > MAX_AST_NODES) {
            throw new SyntaxError(`Notation may contain at most ${MAX_AST_NODES} expressions`);
        }
        if (node.type === 'DiceGroup') {
            diceCount += node.count;
            if (diceCount > MAX_DICE_COUNT) {
                throw new SyntaxError(`A roll may contain at most ${MAX_DICE_COUNT} dice`);
            }
        } else if (node.type === 'BinaryOp') {
            visit(node.left);
            visit(node.right);
        } else if (node.type === 'UnaryOp') {
            visit(node.operand);
        } else if (node.type === 'Parenthesized') {
            visit(node.expression);
        }
    };
    visit(ast);
    return ast;
}

export function parseDiceNotation(notation: string): {
    expressions: Array<{
        type: 'dice' | 'number';
        value: unknown;
        operation: '+' | '-' | '*' | '/' | '%' | '^';
    }>;
    original: string;
} {
    try {
        const ast = parseToAST(notation);
        const expressions = flattenAST(ast, '+');
        return { expressions, original: notation };
    } catch (err) {
        debug('Failed to parse dice notation:', notation, err);
        return { expressions: [], original: notation };
    }
}

function flattenAST(
    node: ASTNode,
    operation: '+' | '-' | '*' | '/' | '%' | '^' = '+'
): Array<{
    type: 'dice' | 'number';
    value: unknown;
    operation: '+' | '-' | '*' | '/' | '%' | '^';
}> {
    if (node.type === 'NumericLiteral') {
        return [{ type: 'number', value: node.value, operation }];
    }

    if (node.type === 'DiceGroup') {
        return [{ type: 'dice', value: node, operation }];
    }

    if (node.type === 'BinaryOp') {
        const leftExprs = flattenAST(node.left, operation);
        const rightExprs = flattenAST(node.right, node.operator);
        return [...leftExprs, ...rightExprs];
    }

    if (node.type === 'UnaryOp') {
        const op = node.operator === '-' ? ('-' as const) : ('+' as const);
        return flattenAST(node.operand, op);
    }

    if (node.type === 'Parenthesized') {
        return flattenAST(node.expression, operation);
    }

    return [];
}

export function validateNotation(notation: string): boolean {
    if (!notation || !notation.trim()) return false;
    try {
        const tokens = tokenize(notation);
        for (const token of tokens) {
            if (token.type === 'ERROR') {
                return false;
            }
        }
        parseToAST(notation);
        return true;
    } catch {
        return false;
    }
}

export { PRECEDENCE };
