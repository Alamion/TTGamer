import moo, { type Lexer, type Token } from 'moo';
import type { TokenType } from './types';

const lexer: Lexer = moo.compile({
    WS: { match: /\s+/, lineBreaks: true },
    DICE: /(?:\d+)?d(?:\d+|[fF]|\[[^\]]+\])/,
    NUMBER: /[0-9]+/,
    PLUS: '+',
    MINUS: '-',
    MULTIPLY: '*',
    DIVIDE: '/',
    MODULO: '%',
    EXPONENT: '^',
    LPAREN: '(',
    RPAREN: ')',
    AT: '@',
    COMMA: ',',
    MOD_EXPLODE: /!!p|!!|!p|!/,
    MOD_REROLL: /ro\d*|r\d*/,
    MOD_UNIQUE: /uo\d*|u\d*/,
    MOD_KEEP: /k(?:h|l)?\d*/,
    MOD_DROP: /d(?:h|l)?\d*/,
    MOD_SORT: /s[ad]?/,
    MOD_MIN: /min\d*/,
    MOD_MAX: /max\d*/,
    MOD_CSB: 'csb',
    MOD_CFB: 'cfb',
    MOD_CS: 'cs',
    MOD_CF: 'cf',
    MOD_FAILURE: 'f',
    NEQ: /<>/,
    GTE: '>=',
    LTE: '<=',
    GT: '>',
    LT: '<',
    EQ: '=',
    ERROR: moo.error,
});

export interface DiceTokenValue {
    count: number;
    sides: number;
    fudge: boolean;
    customFaces?: number[];
}

export interface LexerToken {
    type: TokenType;
    value: string | number | number[] | DiceTokenValue;
    text: string;
    line: number;
    col: number;
}

function isFudgeDice(text: string): boolean {
    return /d[fF]$/.test(text);
}

function hasCustomFaces(text: string): boolean {
    return /\[/.test(text);
}

function parseDiceCount(text: string): number {
    const match = text.match(/^(\d+)d/);
    return match ? parseInt(match[1], 10) : 1;
}

function parseDiceSides(text: string): number {
    if (isFudgeDice(text)) return 6;
    if (hasCustomFaces(text)) {
        const faces = parseCustomFaces(text);
        return faces.length > 0 ? Math.max(...faces) : 6;
    }
    const match = text.match(/d(\d+)$/);
    return match ? parseInt(match[1], 10) : 6;
}

function parseCustomFaces(text: string): number[] {
    const bracketStart = text.indexOf('[');
    if (bracketStart === -1) return [];
    const content = text.slice(bracketStart + 1, -1);
    const parts = content.split(',').map((s) => s.trim());
    const result: number[] = [];
    for (const p of parts) {
        if (p.includes('-')) {
            const [start, end] = p.split('-').map((s) => parseInt(s.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                for (let i = min; i <= max; i++) {
                    result.push(i);
                }
            }
        } else {
            const n = parseInt(p, 10);
            if (!isNaN(n)) result.push(n);
        }
    }
    return result;
}

function mapTokenType(token: Token): TokenType {
    switch (token.type) {
        case 'NUMBER':
            return 'NUMBER';
        case 'PLUS':
            return 'PLUS';
        case 'MINUS':
            return 'MINUS';
        case 'MULTIPLY':
            return 'MULTIPLY';
        case 'DIVIDE':
            return 'DIVIDE';
        case 'MODULO':
            return 'MODULO';
        case 'EXPONENT':
            return 'EXPONENT';
        case 'LPAREN':
            return 'LPAREN';
        case 'RPAREN':
            return 'RPAREN';
        case 'DICE':
            return 'DICE';
        case 'AT':
            return 'AT';
        case 'COMMA':
            return 'COMMA';
        case 'MOD_EXPLODE':
            return 'MOD_EXPLODE';
        case 'MOD_REROLL':
            return 'MOD_REROLL';
        case 'MOD_UNIQUE':
            return 'MOD_UNIQUE';
        case 'MOD_KEEP':
            return 'MOD_KEEP';
        case 'MOD_DROP':
            return 'MOD_DROP';
        case 'MOD_SORT':
            return 'MOD_SORT';
        case 'MOD_MIN':
            return 'MOD_MIN';
        case 'MOD_MAX':
            return 'MOD_MAX';
        case 'MOD_CSB':
            return 'MOD_CSB';
        case 'MOD_CFB':
            return 'MOD_CFB';
        case 'MOD_CS':
            return 'MOD_CS';
        case 'MOD_CF':
            return 'MOD_CF';
        case 'MOD_FAILURE':
            return 'MOD_FAILURE';
        case 'NEQ':
            return 'NEQ';
        case 'GTE':
            return 'GTE';
        case 'LTE':
            return 'LTE';
        case 'GT':
            return 'GT';
        case 'LT':
            return 'LT';
        case 'EQ':
            return 'EQ';
        case 'ERROR':
            return 'ERROR';
        default:
            return 'ERROR';
    }
}

export function tokenize(input: string): LexerToken[] {
    lexer.reset(input);
    const tokens: LexerToken[] = [];

    for (const token of lexer) {
        if (token.type === 'WS') {
            continue;
        }

        const mappedType = mapTokenType(token);
        let value: LexerToken['value'] = token.value;

        if (token.type === 'NUMBER') {
            value = parseInt(token.value as string, 10);
        } else if (token.type === 'DICE') {
            const text = token.text;
            value = {
                count: parseDiceCount(text),
                sides: parseDiceSides(text),
                fudge: isFudgeDice(text),
                customFaces: hasCustomFaces(text) ? parseCustomFaces(text) : undefined,
            };
        }

        tokens.push({
            type: mappedType,
            value,
            text: token.text,
            line: token.line,
            col: token.col,
        });
    }

    tokens.push({
        type: 'END',
        value: '',
        text: '',
        line: 0,
        col: 0,
    });

    return tokens;
}
