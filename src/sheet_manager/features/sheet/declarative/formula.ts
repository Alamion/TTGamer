/**
 * Template formula engine (feature 006, contracts/formula-grammar.md): arithmetic expressions
 * over value coordinates, plus the `min(a, b, …)` / `max(a, b, …)` functions. Pure and deterministic — no UI, store, or system
 * imports; errors are values, never throws. A bare coordinate is a valid formula, so one
 * mechanism covers direct value links and computed formulas (`maxFrom`, FR-12/FR-13).
 */

export type Expr =
    | { kind: 'num'; value: number }
    | { kind: 'coord'; path: string }
    | { kind: 'bin'; op: '+' | '-' | '*' | '/'; left: Expr; right: Expr }
    | { kind: 'neg'; operand: Expr }
    | { kind: 'call'; fn: FormulaFunction; args: Expr[] };

export type FormulaFunction = 'min' | 'max';

const FUNCTIONS: ReadonlySet<string> = new Set<FormulaFunction>(['min', 'max']);

export type FormulaEvaluationError =
    | 'unknown-coordinate'
    | 'non-numeric'
    | 'division-by-zero'
    | 'circular';

export type FormulaEvaluationResult =
    | { ok: true; value: number }
    | { ok: false; error: FormulaEvaluationError; coordinate?: string };

export type FormulaParseResult =
    | { ok: true; expr: Expr; coords: string[] }
    | { ok: false; error: { message: string; position: number } };

type Token =
    | { kind: 'num'; value: number; position: number }
    | { kind: 'coord'; path: string; position: number }
    | { kind: 'op'; op: '+' | '-' | '*' | '/'; position: number }
    | { kind: 'lparen'; position: number }
    | { kind: 'rparen'; position: number }
    | { kind: 'comma'; position: number }
    | { kind: 'fn'; fn: FormulaFunction; position: number };

const COORDINATE_PATTERN = /[a-z][a-z0-9]*(?:-[a-z0-9]+)*/y;
const POOL_PARTS = new Set(['current', 'max']);
const NUMBER_PATTERN = /\d+(?:\.\d+)?/y;

function tokenize(source: string): Token[] | { message: string; position: number } {
    const tokens: Token[] = [];
    let position = 0;
    while (position < source.length) {
        const char = source[position]!;
        if (/\s/.test(char)) {
            position += 1;
            continue;
        }
        if (char === '(') {
            tokens.push({ kind: 'lparen', position });
            position += 1;
            continue;
        }
        if (char === ')') {
            tokens.push({ kind: 'rparen', position });
            position += 1;
            continue;
        }
        if (char === ',') {
            tokens.push({ kind: 'comma', position });
            position += 1;
            continue;
        }
        if ('+-*/'.includes(char)) {
            tokens.push({ kind: 'op', op: char as '+' | '-' | '*' | '/', position });
            position += 1;
            continue;
        }
        if (/\d/.test(char)) {
            NUMBER_PATTERN.lastIndex = position;
            const match = NUMBER_PATTERN.exec(source);
            if (!match) return { message: 'Invalid number', position };
            tokens.push({ kind: 'num', value: Number(match[0]), position });
            position = NUMBER_PATTERN.lastIndex;
            continue;
        }
        if (/[a-z]/.test(char)) {
            COORDINATE_PATTERN.lastIndex = position;
            const base = COORDINATE_PATTERN.exec(source);
            if (!base) return { message: 'Invalid coordinate', position };
            let path = base[0];
            const start = position;
            position = COORDINATE_PATTERN.lastIndex;
            // A known function name directly followed by "(" is a call, not a coordinate.
            if (FUNCTIONS.has(path) && /^\s*\(/.test(source.slice(position))) {
                tokens.push({ kind: 'fn', fn: path as FormulaFunction, position: start });
                continue;
            }
            if (source[position] === '.') {
                COORDINATE_PATTERN.lastIndex = position + 1;
                const part = COORDINATE_PATTERN.exec(source);
                if (!part || !POOL_PARTS.has(part[0])) {
                    return { message: `Invalid coordinate suffix after "${path}."`, position };
                }
                path = `${path}.${part[0]}`;
                position = COORDINATE_PATTERN.lastIndex;
            }
            tokens.push({ kind: 'coord', path, position });
            continue;
        }
        return { message: `Unexpected character "${char}"`, position };
    }
    return tokens;
}

interface ParseError {
    message: string;
    position: number;
}

type Parsed = Expr | ParseError;

function isParseError(value: Parsed): value is ParseError {
    return (value as ParseError).message !== undefined && (value as Expr).kind === undefined;
}

/** Recursive-descent parser over the token stream (precedence: unary → multiplicative → additive). */
class FormulaParser {
    private cursor = 0;
    private readonly tokens: readonly Token[];

    constructor(tokens: readonly Token[]) {
        this.tokens = tokens;
    }

    parseExpression(): Parsed {
        const first = this.parseTerm();
        if (isParseError(first)) return first;
        let left = first;
        while (this.peek()?.kind === 'op') {
            const opToken = this.peek()!;
            if (!this.isAdditive(opToken)) break;
            this.cursor += 1;
            const right = this.parseTerm();
            if (isParseError(right)) return right;
            left = { kind: 'bin', op: opToken.op, left, right };
        }
        return left;
    }

    private parseTerm(): Parsed {
        const first = this.parseFactor();
        if (isParseError(first)) return first;
        let left = first;
        while (this.peek()?.kind === 'op') {
            const opToken = this.peek()!;
            if (!this.isMultiplicative(opToken)) break;
            this.cursor += 1;
            const right = this.parseFactor();
            if (isParseError(right)) return right;
            left = { kind: 'bin', op: opToken.op, left, right };
        }
        return left;
    }

    private parseFactor(): Parsed {
        const token = this.peek();
        if (!token) {
            return { message: 'Unexpected end of formula', position: Number.MAX_SAFE_INTEGER };
        }
        if (token.kind === 'op' && token.op === '-') {
            this.cursor += 1;
            const operand = this.parseFactor();
            if (isParseError(operand)) return operand;
            return { kind: 'neg', operand };
        }
        return this.parsePrimary();
    }

    private parsePrimary(): Parsed {
        const token = this.peek();
        if (!token)
            return { message: 'Unexpected end of formula', position: Number.MAX_SAFE_INTEGER };
        if (token.kind === 'num') {
            this.cursor += 1;
            return { kind: 'num', value: token.value };
        }
        if (token.kind === 'coord') {
            this.cursor += 1;
            return { kind: 'coord', path: token.path };
        }
        if (token.kind === 'fn') {
            this.cursor += 1;
            const open = this.peek();
            if (!open || open.kind !== 'lparen') {
                return { message: `Expected "(" after ${token.fn}`, position: token.position };
            }
            this.cursor += 1;
            const args: Expr[] = [];
            for (;;) {
                const argument = this.parseExpression();
                if (isParseError(argument)) return argument;
                args.push(argument);
                const separator = this.peek();
                if (separator?.kind === 'comma') {
                    this.cursor += 1;
                    continue;
                }
                if (separator?.kind === 'rparen') {
                    this.cursor += 1;
                    break;
                }
                return {
                    message: 'Missing closing parenthesis',
                    position: separator?.position ?? token.position,
                };
            }
            return { kind: 'call', fn: token.fn, args };
        }
        if (token.kind === 'lparen') {
            this.cursor += 1;
            const inner = this.parseExpression();
            if (isParseError(inner)) return inner;
            const closing = this.peek();
            if (!closing || closing.kind !== 'rparen') {
                return {
                    message: 'Missing closing parenthesis',
                    position: closing?.position ?? token.position,
                };
            }
            this.cursor += 1;
            return inner;
        }
        return {
            message: 'Expected a number, coordinate, or parenthesis',
            position: token.position,
        };
    }

    private peek(): Token | undefined {
        return this.tokens[this.cursor];
    }

    atEnd(): boolean {
        return this.cursor >= this.tokens.length;
    }

    consumed(): number {
        return this.cursor;
    }

    private isAdditive(token: Token): token is Extract<Token, { kind: 'op' }> {
        return token.kind === 'op' && (token.op === '+' || token.op === '-');
    }

    private isMultiplicative(token: Token): token is Extract<Token, { kind: 'op' }> {
        return token.kind === 'op' && (token.op === '*' || token.op === '/');
    }
}

export function parseFormula(source: string): FormulaParseResult {
    const tokens = tokenize(source);
    if (!Array.isArray(tokens)) return { ok: false, error: tokens };
    if (tokens.length === 0) {
        return { ok: false, error: { message: 'Empty formula', position: 0 } };
    }
    const parser = new FormulaParser(tokens);
    const expr = parser.parseExpression();
    if (isParseError(expr)) return { ok: false, error: expr };
    if (!parser.atEnd()) {
        return {
            ok: false,
            error: {
                message: 'Unexpected trailing input',
                position: tokens[parser.consumed()]!.position,
            },
        };
    }
    return { ok: true, expr, coords: collectDependencies(expr) };
}

/** Extracts every coordinate path referenced by the expression (authoring picker + cycles). */
export function collectDependencies(expr: Expr): string[] {
    const coords = new Set<string>();
    const walk = (node: Expr): void => {
        switch (node.kind) {
            case 'num':
                break;
            case 'coord':
                coords.add(node.path);
                break;
            case 'neg':
                walk(node.operand);
                break;
            case 'bin':
                walk(node.left);
                walk(node.right);
                break;
            case 'call':
                node.args.forEach(walk);
                break;
        }
    };
    walk(expr);
    return [...coords];
}

/**
 * Evaluates the AST against a coordinate resolver. Any unknown coordinate, non-finite
 * result, or division by zero surfaces as an explicit error — never a silent fallback number
 * (spec FR-15).
 */
export function evaluateFormula(
    expr: Expr,
    resolve: (path: string) => number | undefined
): FormulaEvaluationResult {
    const evalNode = (node: Expr): FormulaEvaluationResult => {
        switch (node.kind) {
            case 'num':
                return { ok: true, value: node.value };
            case 'coord': {
                const resolved = resolve(node.path);
                if (resolved === undefined) {
                    return { ok: false, error: 'unknown-coordinate', coordinate: node.path };
                }
                if (!Number.isFinite(resolved)) return { ok: false, error: 'non-numeric' };
                return { ok: true, value: resolved };
            }
            case 'neg': {
                const inner = evalNode(node.operand);
                return inner.ok ? { ok: true, value: -inner.value } : inner;
            }
            case 'call': {
                const values: number[] = [];
                for (const argument of node.args) {
                    const result = evalNode(argument);
                    if (!result.ok) return result;
                    values.push(result.value);
                }
                return {
                    ok: true,
                    value: node.fn === 'min' ? Math.min(...values) : Math.max(...values),
                };
            }
            case 'bin': {
                const left = evalNode(node.left);
                if (!left.ok) return left;
                const right = evalNode(node.right);
                if (!right.ok) return right;
                switch (node.op) {
                    case '+':
                        return { ok: true, value: left.value + right.value };
                    case '-':
                        return { ok: true, value: left.value - right.value };
                    case '*':
                        return { ok: true, value: left.value * right.value };
                    case '/':
                        return right.value === 0
                            ? { ok: false, error: 'division-by-zero' }
                            : { ok: true, value: left.value / right.value };
                }
            }
        }
    };
    const result = evalNode(expr);
    if (result.ok && !Number.isFinite(result.value)) return { ok: false, error: 'non-numeric' };
    return result;
}

export interface FormulaDependencyEntry {
    /** Human-facing identifier for cycle messages (node id). */
    id: string;
    /** Coordinate the formula writes (formula fields); `maxFrom` bounds and writes nothing. */
    writes?: string;
    reads: readonly string[];
}

/**
 * Authoring-time cycle detection (contracts/formula-grammar.md §4): builds the
 * coordinate → writer graph and returns every cycle as a named id path. A chain through
 * document-owned coordinates (system traits) cannot cycle — only formula writers create edges.
 */
export function detectDependencyCycles(entries: readonly FormulaDependencyEntry[]): string[][] {
    const writerOf = new Map<string, string>();
    for (const entry of entries) {
        if (entry.writes !== undefined) writerOf.set(entry.writes, entry.id);
    }
    const graph = new Map<string, readonly string[]>();
    for (const entry of entries) {
        const dependencyIds = entry.reads
            .map((coordinate) => writerOf.get(coordinate))
            .filter((id): id is string => id !== undefined);
        graph.set(entry.id, dependencyIds);
    }

    const cycles: string[][] = [];
    const VISITING = 1 as const;
    const DONE = 2 as const;
    const state = new Map<string, 1 | 2>();
    const stack: string[] = [];
    const visit = (id: string): void => {
        const current = state.get(id);
        if (current === DONE) return;
        if (current === VISITING) {
            const start = stack.indexOf(id);
            cycles.push([...stack.slice(start), id]);
            return;
        }
        state.set(id, VISITING);
        stack.push(id);
        for (const dependency of graph.get(id) ?? []) visit(dependency);
        stack.pop();
        state.set(id, DONE);
    };
    for (const id of graph.keys()) visit(id);
    return cycles;
}
