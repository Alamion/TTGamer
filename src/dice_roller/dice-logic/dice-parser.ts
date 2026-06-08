import { type LexerToken, tokenize } from './dice-lexer';
import type { ASTNode, ComparePoint, DiceModifiers, TokenType } from './types';
import { debug, warn } from '../utils/logging';

const PRECEDENCE: Record<string, number> = {
    '^': 4,
    '*': 3,
    '/': 3,
    '%': 3,
    '+': 2,
    '-': 2,
};

function parseModifierValue(token: LexerToken): number {
    if (token.type === 'NUMBER') {
        return typeof token.value === 'number' ? token.value : parseInt(token.value as string, 10);
    }
    const text = token.text;
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
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

    expect(type: TokenType): LexerToken | undefined {
        const token = this.peek();
        if (token && token.type === type) {
            return this.consume();
        }
        return undefined;
    }

    has(type: TokenType): boolean {
        const token = this.peek();
        return token ? token.type === type : false;
    }

    isEnd(): boolean {
        const token = this.peek();
        return token ? token.type === 'END' : true;
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
        warn('Unexpected end of input', 'Parser');
        return { type: 'NumericLiteral', value: 0 };
    }

    if (token.type === 'LPAREN') {
        stream.consume();
        const expr = parseExpression(stream);
        if (stream.peek() && stream.peek()!.type === 'RPAREN') {
            stream.consume();
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
        stream.consume();
        return { type: 'NumericLiteral', value: 0 };
    }

    warn(`Unexpected token: ${token.type} (${token.text})`, 'Parser');
    stream.consume();
    return { type: 'NumericLiteral', value: 0 };
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
        const value =
            valueToken && valueToken.type === 'NUMBER'
                ? typeof valueToken.value === 'number'
                    ? valueToken.value
                    : parseInt(valueToken.value as string, 10)
                : 0;
        if (valueToken && valueToken.type === 'NUMBER') {
            stream.consume();
        }
        return {
            operator: mapCompareOperator(opToken),
            value,
        };
    }
    return undefined;
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

    const count = diceValue.count || 1;
    const sides = diceValue.sides || 6;
    const fudge = diceValue.fudge || false;
    const customFaces: number[] | undefined = diceValue.customFaces;

    const modifiers: DiceModifiers = {};
    let forcedValues: number[] | undefined;

    const parseExplode = (tok: LexerToken) => {
        const text = tok.text;
        modifiers.explode = {};
        modifiers.explode.compounding = text.startsWith('!!') || undefined;
        modifiers.explode.penetrating = text.endsWith('p') || undefined;
        const cp = parseComparePoint(stream);
        if (cp) modifiers.explode.comparePoint = cp;
    };

    const parseReroll = (tok: LexerToken) => {
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
    };

    const parseUnique = (tok: LexerToken) => {
        const once = tok.text.startsWith('uo');
        if (stream.peek() && isCompareType(stream.peek()?.type)) {
            const cp = parseComparePoint(stream);
            modifiers.unique = { once, comparePoint: cp };
        } else {
            modifiers.unique = { once };
        }
    };

    const parseKeep = (tok: LexerToken) => {
        const text = tok.text;
        if (text.startsWith('kl')) {
            modifiers.keepLowest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
        } else if (text.startsWith('kh') || text === 'k') {
            modifiers.keepHighest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
        } else {
            modifiers.keepHighest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
        }
    };

    const parseDrop = (tok: LexerToken) => {
        const text = tok.text;
        if (text.startsWith('dh')) {
            modifiers.dropHighest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
        } else if (text.startsWith('dl')) {
            modifiers.dropLowest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
        } else {
            modifiers.dropLowest = hasEmbeddedNumber(tok) ? parseModifierValue(tok) : 1;
        }
    };

    while (stream.peek() && !stream.isEnd()) {
        const peekToken = stream.peek()!;
        let parsed = true;

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

        switch (peekToken.type) {
            case 'MOD_EXPLODE':
                parseExplode(stream.consume()!);
                break;

            case 'MOD_REROLL':
                parseReroll(stream.consume()!);
                break;

            case 'MOD_UNIQUE':
                parseUnique(stream.consume()!);
                break;

            case 'MOD_KEEP':
                parseKeep(stream.consume()!);
                break;

            case 'MOD_DROP':
                parseDrop(stream.consume()!);
                break;

            case 'MOD_SORT': {
                const tok = stream.consume()!;
                modifiers.sort = tok.text === 'sd' ? 'desc' : 'asc';
                break;
            }

            case 'MOD_MIN': {
                const tok = stream.consume()!;
                modifiers.min = hasEmbeddedNumber(tok)
                    ? parseModifierValue(tok)
                    : stream.peek()?.type === 'NUMBER'
                      ? parseModifierValue(stream.consume()!)
                      : 1;
                break;
            }

            case 'MOD_MAX': {
                const tok = stream.consume()!;
                modifiers.max = hasEmbeddedNumber(tok)
                    ? parseModifierValue(tok)
                    : stream.peek()?.type === 'NUMBER'
                      ? parseModifierValue(stream.consume()!)
                      : 1;
                break;
            }

            case 'MOD_CSB': {
                stream.consume();
                const cp = parseComparePoint(stream);
                modifiers.criticalSuccess = cp || true;
                modifiers.criticalSuccessBotch = true;
                break;
            }

            case 'MOD_CFB': {
                stream.consume();
                const cp = parseComparePoint(stream);
                modifiers.criticalFailure = cp || true;
                modifiers.criticalFailureBotch = true;
                break;
            }

            case 'MOD_CS': {
                stream.consume();
                const cp = parseComparePoint(stream);
                modifiers.criticalSuccess = cp || true;
                break;
            }

            case 'MOD_CF': {
                stream.consume();
                const cp = parseComparePoint(stream);
                modifiers.criticalFailure = cp || true;
                break;
            }

            case 'MOD_FAILURE': {
                stream.consume();
                const cp = parseComparePoint(stream);
                if (cp) modifiers.targetFailure = cp;
                break;
            }

            // Target success (order 8) — bare compare point
            case 'GT':
            case 'GTE':
            case 'LT':
            case 'LTE':
            case 'EQ':
            case 'NEQ': {
                const cp = parseComparePoint(stream);
                if (cp) modifiers.targetSuccess = cp;
                break;
            }

            default:
                parsed = false;
        }

        if (!parsed) break;
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

export function parseToAST(input: string): ASTNode {
    const tokens = tokenize(input);
    debug(
        'Tokens:',
        tokens.map((t) => ({ type: t.type, text: t.text }))
    );
    const stream = new TokenStream(tokens);
    return parseExpression(stream);
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
