import { debug } from '@site/src/shared/utils/logging';

import {
    MAX_AST_NODES,
    MAX_DICE_COUNT,
    MAX_DICE_SIDES,
    MAX_NOTATION_LENGTH,
    MAX_NUMERIC_LITERAL,
} from '../utils/constants';
import { type LexerToken, tokenize } from './dice-lexer';
import {
    type LimitName,
    type NotationDiagnostic,
    NotationError,
    type NotationErrorKind,
} from './errors';
import type {
    ASTNode,
    ComparePoint,
    DiceGroupNode,
    DiceLabel,
    DiceModifiers,
    SetBonus,
    TokenType,
} from './types';

const PRIMARY_EXPECTED = ['number', 'dice', '('];

function tokenSpan(token: LexerToken): { offset: number; length: number; found?: string } {
    return {
        offset: token.offset,
        length: token.text.length,
        found: token.text || undefined,
    };
}

function locate(token: LexerToken): string {
    return ` at line ${token.line || 1}, column ${token.col || 1}`;
}

function limitError(
    message: string,
    name: LimitName,
    max: number,
    span: { offset: number; length: number; found?: string }
): NotationError {
    return new NotationError(message, { kind: 'limit-exceeded', ...span, limit: { name, max } });
}

function parseModifierValue(token: LexerToken): number {
    let value: number;
    if (token.type === 'NUMBER') {
        value = typeof token.value === 'number' ? token.value : parseInt(token.value as string, 10);
    } else {
        const match = token.text.match(/\d+/);
        value = match ? parseInt(match[0], 10) : 1;
    }
    if (!Number.isFinite(value) || value > MAX_NUMERIC_LITERAL) {
        throw limitError(
            `Numeric values may not exceed ${MAX_NUMERIC_LITERAL}`,
            'numeric-literal',
            MAX_NUMERIC_LITERAL,
            tokenSpan(token)
        );
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

    has(type: TokenType): boolean {
        const token = this.peek();
        return token ? token.type === type : false;
    }

    isEnd(): boolean {
        const token = this.peek();
        return token ? token.type === 'END' : true;
    }

    /** The END token, kept so end-of-input errors can point past the last character. */
    end(): LexerToken {
        return this.tokens[this.tokens.length - 1];
    }

    error(
        message: string,
        kind: NotationErrorKind,
        token: LexerToken = this.peek() ?? this.end(),
        expected?: string[]
    ): NotationError {
        return new NotationError(`${message}${locate(token)}`, {
            kind,
            ...tokenSpan(token),
            expected,
        });
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
        throw stream.error(
            'Unexpected end of input',
            'unexpected-end',
            stream.end(),
            PRIMARY_EXPECTED
        );
    }

    if (token.type === 'LPAREN') {
        const open = stream.consume()!;
        const expr = parseExpression(stream);
        const close = stream.peek();
        if (!close || close.type === 'END') {
            throw stream.error('Expected RPAREN', 'unclosed-group', open);
        }
        if (close.type !== 'RPAREN') {
            throw stream.error('Expected RPAREN', 'unexpected-token', close, [')']);
        }
        stream.consume();
        // Group modifiers are distributed to the inner terms; a set bonus stays pool-wide.
        const groupMods = parseGroupModifiers(stream);
        const setBonus = groupMods?.setBonus;
        if (groupMods) {
            delete groupMods.setBonus;
            distributeModifiersToDiceGroups(expr, groupMods);
        }
        return {
            type: 'Parenthesized',
            expression: expr,
            ...(setBonus ? { poolModifiers: { setBonus } } : {}),
        };
    }

    if (token.type === 'LABEL') {
        throw labelPositionError(stream, token);
    }

    if (token.type === 'NUMBER') {
        stream.consume();
        if (stream.peek()?.type === 'LABEL') {
            throw labelPositionError(stream, stream.peek()!);
        }
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
        throw stream.error(
            'Expected a number, dice group, or parenthesized expression',
            'unexpected-end',
            token,
            PRIMARY_EXPECTED
        );
    }

    throw stream.error(
        `Unexpected token ${token.type} (${token.text})`,
        'unexpected-token',
        token,
        PRIMARY_EXPECTED
    );
}

function labelPositionError(stream: TokenStream, token: LexerToken): NotationError {
    return stream.error('A label must follow the dice it marks', 'label-position', token);
}

function parseSetBonus(stream: TokenStream, modifiers: DiceModifiers): void {
    const tok = stream.consume()!;
    const span = { offset: tok.offset, length: tok.text.length };
    if (modifiers.setBonus) {
        throw stream.error('Only one set bonus is allowed per pool', 'unexpected-token', tok);
    }
    const [sizeText, bonusText] = tok.text.slice(1).split('.');
    const size = parseInt(sizeText, 10);
    const bonus = bonusText === undefined ? size : parseInt(bonusText, 10);
    if (!(size >= 2 && size <= MAX_DICE_COUNT) || !(bonus >= 1 && bonus <= MAX_NUMERIC_LITERAL)) {
        throw stream.error(
            `Set size must be 2–${MAX_DICE_COUNT} and the bonus at least 1`,
            'invalid-set-size',
            tok
        );
    }
    const next = stream.peek();
    if (!next || !isCompareType(next.type)) {
        const end = !next || next.type === 'END';
        throw stream.error(
            'A set bonus must be followed by a compare point',
            end ? 'unexpected-end' : 'unexpected-token',
            next ?? stream.end(),
            ['compare']
        );
    }
    const comparePoint = parseComparePoint(stream)!;
    const setBonus: SetBonus = { size, bonus, comparePoint, span };
    modifiers.setBonus = setBonus;
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
            throw stream.error(
                'Comparison operator must be followed by a number',
                'missing-compare-value',
                opToken,
                ['number']
            );
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
            const tok = stream.consume()!;
            const cp = parseComparePoint(stream);
            if (!cp) {
                throw stream.error(
                    'A failure modifier must be followed by a compare point',
                    'missing-compare-value',
                    tok,
                    ['compare']
                );
            }
            modifiers.targetFailure = cp;
            return true;
        }

        case 'MOD_SET': {
            parseSetBonus(stream, modifiers);
            return true;
        }

        case 'LABEL':
            throw labelPositionError(stream, peekToken);

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
        throw limitError(
            `Dice count must be between 1 and ${MAX_DICE_COUNT}${locate(token)}`,
            'dice-count',
            MAX_DICE_COUNT,
            tokenSpan(token)
        );
    }
    if (!Number.isInteger(sides) || sides < 1 || sides > MAX_DICE_SIDES) {
        throw limitError(
            `Dice sides must be between 1 and ${MAX_DICE_SIDES}${locate(token)}`,
            'dice-sides',
            MAX_DICE_SIDES,
            tokenSpan(token)
        );
    }

    const modifiers: DiceModifiers = {};
    let forcedValues: number[] | undefined;
    let label: DiceLabel | undefined;
    let forcedSpanStart = 0;
    let forcedSpanEnd = 0;

    if (stream.peek()?.type === 'LABEL') {
        stream.consume();
        label = 'h';
    }

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
            const at = stream.consume()!;
            forcedValues = [];
            forcedSpanStart = at.offset;
            forcedSpanEnd = at.offset + at.text.length;
            while (stream.peek() && stream.peek()!.type !== 'END') {
                const tok = stream.peek()!;
                if (tok.type === 'NUMBER' || tok.type === 'COMMA') {
                    forcedSpanEnd = tok.offset + tok.text.length;
                }
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

    if (forcedValues && forcedValues.length !== count) {
        throw new NotationError(
            `Forced roll count mismatch: expected ${count} value(s), got ${forcedValues.length}`,
            {
                kind: 'forced-values-count',
                offset: forcedSpanStart,
                length: forcedSpanEnd - forcedSpanStart,
                found: String(forcedValues.length),
                limit: { name: 'dice-count', max: count },
            }
        );
    }

    return {
        type: 'DiceGroup',
        count,
        sides,
        modifiers,
        customFaces,
        fudge,
        forcedValues: forcedValues && forcedValues.length > 0 ? forcedValues : undefined,
        ...(label ? { label } : {}),
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
    const wholeInput = { offset: 0, length: input.length };
    if (input.length > MAX_NOTATION_LENGTH) {
        throw limitError(
            `Notation may contain at most ${MAX_NOTATION_LENGTH} characters`,
            'notation-length',
            MAX_NOTATION_LENGTH,
            wholeInput
        );
    }
    const tokens = tokenize(input);
    const invalidToken = tokens.find((token) => token.type === 'ERROR');
    if (invalidToken) {
        throw new NotationError(`Unexpected token ${invalidToken.text}${locate(invalidToken)}`, {
            kind: 'unknown-character',
            offset: invalidToken.offset,
            length: 1,
            found: invalidToken.text.charAt(0),
        });
    }
    const excessiveNumber = tokens.find(
        (token) =>
            token.type === 'NUMBER' &&
            (typeof token.value !== 'number' ||
                !Number.isFinite(token.value) ||
                token.value > MAX_NUMERIC_LITERAL)
    );
    if (excessiveNumber) {
        throw limitError(
            `Numeric values may not exceed ${MAX_NUMERIC_LITERAL}${locate(excessiveNumber)}`,
            'numeric-literal',
            MAX_NUMERIC_LITERAL,
            tokenSpan(excessiveNumber)
        );
    }
    debug(
        'Tokens:',
        tokens.map((t) => ({ type: t.type, text: t.text }))
    );
    const stream = new TokenStream(tokens);
    const ast = parseExpression(stream);
    if (!stream.isEnd()) {
        const token = stream.peek()!;
        throw stream.error(
            `Unexpected trailing token ${token.text || token.type}`,
            'trailing-input',
            token
        );
    }

    const setBonusNeedsTarget = (bonus: SetBonus): NotationError =>
        new NotationError('A set bonus needs a success target in the same pool', {
            kind: 'set-bonus-needs-target',
            offset: bonus.span?.offset ?? 0,
            length: bonus.span?.length ?? input.length,
        });
    const diceGroupsIn = (node: ASTNode, out: DiceGroupNode[] = []): DiceGroupNode[] => {
        if (node.type === 'DiceGroup') out.push(node);
        else if (node.type === 'BinaryOp') {
            diceGroupsIn(node.left, out);
            diceGroupsIn(node.right, out);
        } else if (node.type === 'UnaryOp') diceGroupsIn(node.operand, out);
        else if (node.type === 'Parenthesized') diceGroupsIn(node.expression, out);
        return out;
    };

    let nodeCount = 0;
    let diceCount = 0;
    const visit = (node: ASTNode): void => {
        nodeCount++;
        if (nodeCount > MAX_AST_NODES) {
            throw limitError(
                `Notation may contain at most ${MAX_AST_NODES} expressions`,
                'ast-nodes',
                MAX_AST_NODES,
                wholeInput
            );
        }
        if (node.type === 'DiceGroup') {
            if (node.modifiers.setBonus && !node.modifiers.targetSuccess) {
                throw setBonusNeedsTarget(node.modifiers.setBonus);
            }
            diceCount += node.count;
            if (diceCount > MAX_DICE_COUNT) {
                throw limitError(
                    `A roll may contain at most ${MAX_DICE_COUNT} dice`,
                    'dice-count',
                    MAX_DICE_COUNT,
                    wholeInput
                );
            }
        } else if (node.type === 'BinaryOp') {
            visit(node.left);
            visit(node.right);
        } else if (node.type === 'UnaryOp') {
            visit(node.operand);
        } else if (node.type === 'Parenthesized') {
            const poolBonus = node.poolModifiers?.setBonus;
            if (poolBonus) {
                const groups = diceGroupsIn(node.expression);
                if (groups.length === 0 || groups.some((g) => !g.modifiers.targetSuccess)) {
                    throw setBonusNeedsTarget(poolBonus);
                }
            }
            visit(node.expression);
        }
    };
    visit(ast);
    return ast;
}

/** Why `notation` is invalid, or `null` when it parses. Empty input is not diagnosed. */
export function diagnoseNotation(notation: string): NotationDiagnostic | null {
    if (!notation || !notation.trim()) return null;
    try {
        parseToAST(notation);
        return null;
    } catch (error) {
        if (error instanceof NotationError) return error.diagnostic;
        return { kind: 'unexpected-token', offset: 0, length: notation.length };
    }
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
