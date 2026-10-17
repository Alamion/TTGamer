/**
 * Template formula engine (feature 006, contracts/formula-grammar.md; spec 038): expressions over
 * value coordinates with arithmetic, comparisons (1 or 0), texts joined by `&`, rounding,
 * `if`/`and`/`or`/`not`, `rating(list, "Name")`, and `row.<column>` inside table rows. Pure and
 * deterministic — no UI, store, or system imports; errors are values, never throws. A bare
 * coordinate is a valid formula, so one mechanism covers direct value links and computed formulas.
 */

type ArithmeticOp = '+' | '-' | '*' | '/';
type ComparisonOp = '<' | '<=' | '>' | '>=' | '=' | '!=';
type BinaryOp = ArithmeticOp | ComparisonOp | '&';

export type Expr =
    | { kind: 'num'; value: number }
    | { kind: 'str'; value: string }
    | { kind: 'coord'; path: string }
    | { kind: 'row'; column: string }
    | { kind: 'bin'; op: BinaryOp; left: Expr; right: Expr }
    | { kind: 'neg'; operand: Expr }
    | { kind: 'call'; fn: FormulaFunction; args: Expr[] };

export type FormulaFunction =
    'min' | 'max' | 'ceil' | 'floor' | 'round' | 'abs' | 'if' | 'and' | 'or' | 'not' | 'rating';

/** Argument counts: exact, or at least `min`. */
const ARITY: Readonly<Record<FormulaFunction, { exact?: number; min?: number }>> = {
    min: { min: 1 },
    max: { min: 1 },
    ceil: { exact: 1 },
    floor: { exact: 1 },
    round: { exact: 1 },
    abs: { exact: 1 },
    if: { exact: 3 },
    and: { min: 1 },
    or: { min: 1 },
    not: { exact: 1 },
    rating: { exact: 2 },
};

const FUNCTIONS: ReadonlySet<string> = new Set(Object.keys(ARITY));

/** A formula's result: a number or a text (spec 038 D1). */
export type FormulaValue = number | string;

export type FormulaEvaluationError =
    'unknown-coordinate' | 'non-numeric' | 'division-by-zero' | 'circular';

export type FormulaEvaluationResult =
    { ok: true; value: number } | { ok: false; error: FormulaEvaluationError; coordinate?: string };

export type FormulaValueResult =
    | { ok: true; value: FormulaValue }
    | { ok: false; error: FormulaEvaluationError; coordinate?: string };

export type FormulaParseResult =
    | { ok: true; expr: Expr; coords: string[] }
    | { ok: false; error: { message: string; position: number } };

/** What a formula may read besides coordinates. */
export interface FormulaScope {
    /** The table row the formula runs on (`row.<column>`). */
    row?: (column: string) => FormulaValue | undefined;
    /** `rating(list, "Name")`: the summed rating of the list's entries with that name. */
    rating?: (listCoordinate: string, name: string) => number | undefined;
}

type Token =
    | { kind: 'num'; value: number; position: number }
    | { kind: 'str'; value: string; position: number }
    | { kind: 'coord'; path: string; position: number }
    | { kind: 'row'; column: string; position: number }
    | { kind: 'op'; op: BinaryOp; position: number }
    | { kind: 'lparen'; position: number }
    | { kind: 'rparen'; position: number }
    | { kind: 'comma'; position: number }
    | { kind: 'fn'; fn: FormulaFunction; position: number };

const COORDINATE_PATTERN = /[a-z][a-z0-9]*(?:-[a-z0-9]+)*/y;
const POOL_PARTS = new Set(['current', 'max']);
const NUMBER_PATTERN = /\d+(?:\.\d+)?/y;
/** Two-character operators first, so `<=` is not read as `<` then `=`. */
const OPERATORS: readonly BinaryOp[] = ['<=', '>=', '!=', '<', '>', '=', '+', '-', '*', '/', '&'];

function tokenize(source: string): Token[] | { message: string; position: number } {
    const tokens: Token[] = [];
    let position = 0;
    while (position < source.length) {
        const char = source[position]!;
        if (/\s/.test(char)) {
            position += 1;
            continue;
        }
        if (char === '(' || char === ')' || char === ',') {
            const kind = char === '(' ? 'lparen' : char === ')' ? 'rparen' : 'comma';
            tokens.push({ kind, position });
            position += 1;
            continue;
        }
        if (char === '"') {
            const end = source.indexOf('"', position + 1);
            if (end < 0) return { message: 'Unclosed string: add the closing "', position };
            tokens.push({ kind: 'str', value: source.slice(position + 1, end), position });
            position = end + 1;
            continue;
        }
        const op = OPERATORS.find((candidate) => source.startsWith(candidate, position));
        if (op) {
            tokens.push({ kind: 'op', op, position });
            position += op.length;
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
                if (path === 'row' && part && !POOL_PARTS.has(part[0])) {
                    tokens.push({ kind: 'row', column: part[0], position: start });
                    position = COORDINATE_PATTERN.lastIndex;
                    continue;
                }
                if (!part || !POOL_PARTS.has(part[0])) {
                    return { message: `Invalid coordinate suffix after "${path}."`, position };
                }
                path = `${path}.${part[0]}`;
                position = COORDINATE_PATTERN.lastIndex;
            }
            // A coordinate token records where it ends (`renameFormulaCoordinates` relies on it).
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

const COMPARISONS: ReadonlySet<BinaryOp> = new Set(['<', '<=', '>', '>=', '=', '!=']);

/**
 * Recursive-descent parser over the token stream. Precedence, loosest first: comparison →
 * `&` → additive → multiplicative → unary.
 */
class FormulaParser {
    private cursor = 0;
    private readonly tokens: readonly Token[];

    constructor(tokens: readonly Token[]) {
        this.tokens = tokens;
    }

    parseExpression(): Parsed {
        const left = this.parseJoin();
        if (isParseError(left)) return left;
        const token = this.peek();
        if (token?.kind !== 'op' || !COMPARISONS.has(token.op)) return left;
        this.cursor += 1;
        const right = this.parseJoin();
        if (isParseError(right)) return right;
        return { kind: 'bin', op: token.op, left, right };
    }

    private parseJoin(): Parsed {
        return this.parseLevel(['&'], () => this.parseAdditive());
    }

    private parseAdditive(): Parsed {
        return this.parseLevel(['+', '-'], () => this.parseTerm());
    }

    private parseTerm(): Parsed {
        return this.parseLevel(['*', '/'], () => this.parseFactor());
    }

    private parseLevel(ops: readonly BinaryOp[], next: () => Parsed): Parsed {
        const first = next();
        if (isParseError(first)) return first;
        let left = first;
        for (;;) {
            const token = this.peek();
            if (token?.kind !== 'op' || !ops.includes(token.op)) return left;
            this.cursor += 1;
            const right = next();
            if (isParseError(right)) return right;
            left = { kind: 'bin', op: token.op, left, right };
        }
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
        switch (token.kind) {
            case 'num':
            case 'str':
                this.cursor += 1;
                return { kind: token.kind, value: token.value } as Expr;
            case 'coord':
                this.cursor += 1;
                return { kind: 'coord', path: token.path };
            case 'row':
                this.cursor += 1;
                return { kind: 'row', column: token.column };
            case 'fn':
                return this.parseCall(token);
            case 'lparen': {
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
            default:
                return {
                    message: 'Expected a number, text, coordinate, or parenthesis',
                    position: token.position,
                };
        }
    }

    private parseCall(token: Extract<Token, { kind: 'fn' }>): Parsed {
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
        const arity = ARITY[token.fn];
        if (arity.exact !== undefined && args.length !== arity.exact) {
            return {
                message: `${token.fn} takes ${arity.exact} argument${arity.exact === 1 ? '' : 's'}`,
                position: token.position,
            };
        }
        if (
            token.fn === 'rating' &&
            (args[0]?.kind !== 'coord' || args[0].path.includes('.') || args[1]?.kind !== 'str')
        ) {
            return {
                message: 'rating takes a list and a name in quotes: rating(list, "Name")',
                position: token.position,
            };
        }
        return { kind: 'call', fn: token.fn, args };
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
}

/**
 * Rewrites the coordinates a formula reads (`rename` returns the new base name, or undefined to
 * keep it); pool parts (`.current`, `.max`), row columns, and everything else stay as written. A
 * formula that does not tokenize is returned unchanged.
 */
export function renameFormulaCoordinates(
    source: string,
    rename: (coordinate: string) => string | undefined
): string {
    const tokens = tokenize(source);
    if (!Array.isArray(tokens)) return source;
    let result = source;
    for (const token of [...tokens].reverse()) {
        if (token.kind !== 'coord') continue;
        // A coordinate token records where it ends; the name starts `path.length` before.
        const start = token.position - token.path.length;
        const base = token.path.split('.')[0]!;
        const renamed = rename(base);
        if (renamed === undefined || renamed === base) continue;
        result = result.slice(0, start) + renamed + result.slice(start + base.length);
    }
    return result;
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
        const next = tokens[parser.consumed()]!;
        return {
            ok: false,
            error: {
                message:
                    next.kind === 'op' && COMPARISONS.has(next.op)
                        ? 'Only one comparison per expression: use and(…) or or(…)'
                        : 'Unexpected trailing input',
                position: next.position,
            },
        };
    }
    return { ok: true, expr, coords: collectDependencies(expr) };
}

/**
 * Extracts every coordinate path the expression reads (authoring picker + cycles); a `rating` list
 * counts, row columns do not (they belong to the row, not the page).
 */
export function collectDependencies(expr: Expr): string[] {
    const coords = new Set<string>();
    const walk = (node: Expr): void => {
        switch (node.kind) {
            case 'num':
            case 'str':
            case 'row':
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

/** A condition holds for a non-zero number or a non-empty text. */
export function formulaTruthy(value: FormulaValue): boolean {
    return typeof value === 'number' ? value !== 0 : value.length > 0;
}

type Resolver = (path: string) => FormulaValue | undefined;

const NON_NUMERIC = { ok: false, error: 'non-numeric' } as const;

function evaluateNode(node: Expr, resolve: Resolver, scope: FormulaScope): FormulaValueResult {
    const numbers = (args: readonly Expr[]): number[] | FormulaValueResult => {
        const result: number[] = [];
        for (const argument of args) {
            const value = evaluateNode(argument, resolve, scope);
            if (!value.ok) return value;
            if (typeof value.value !== 'number') return NON_NUMERIC;
            result.push(value.value);
        }
        return result;
    };
    switch (node.kind) {
        case 'num':
        case 'str':
            return { ok: true, value: node.value };
        case 'coord':
        case 'row': {
            const path = node.kind === 'row' ? `row.${node.column}` : node.path;
            const resolved = node.kind === 'row' ? scope.row?.(node.column) : resolve(node.path);
            if (resolved === undefined) {
                return { ok: false, error: 'unknown-coordinate', coordinate: path };
            }
            if (typeof resolved === 'number' && !Number.isFinite(resolved)) return NON_NUMERIC;
            return { ok: true, value: resolved };
        }
        case 'neg': {
            const inner = numbers([node.operand]);
            return Array.isArray(inner) ? { ok: true, value: -inner[0]! } : inner;
        }
        case 'call':
            return evaluateCall(node.fn, node.args, resolve, scope, numbers);
        case 'bin': {
            const left = evaluateNode(node.left, resolve, scope);
            if (!left.ok) return left;
            const right = evaluateNode(node.right, resolve, scope);
            if (!right.ok) return right;
            const [a, b] = [left.value, right.value];
            if (node.op === '&') return { ok: true, value: `${a}${b}` };
            if (node.op === '=' || node.op === '!=') {
                const same = typeof a === typeof b ? a === b : String(a) === String(b);
                return { ok: true, value: (node.op === '=') === same ? 1 : 0 };
            }
            if (typeof a !== 'number' || typeof b !== 'number') return NON_NUMERIC;
            switch (node.op) {
                case '+':
                    return { ok: true, value: a + b };
                case '-':
                    return { ok: true, value: a - b };
                case '*':
                    return { ok: true, value: a * b };
                case '/':
                    return b === 0
                        ? { ok: false, error: 'division-by-zero' }
                        : { ok: true, value: a / b };
                case '<':
                    return { ok: true, value: a < b ? 1 : 0 };
                case '<=':
                    return { ok: true, value: a <= b ? 1 : 0 };
                case '>':
                    return { ok: true, value: a > b ? 1 : 0 };
                case '>=':
                    return { ok: true, value: a >= b ? 1 : 0 };
            }
        }
    }
}

function evaluateCall(
    fn: FormulaFunction,
    args: readonly Expr[],
    resolve: Resolver,
    scope: FormulaScope,
    numbers: (args: readonly Expr[]) => number[] | FormulaValueResult
): FormulaValueResult {
    const truth = (argument: Expr): boolean | FormulaValueResult => {
        const value = evaluateNode(argument, resolve, scope);
        return value.ok ? formulaTruthy(value.value) : value;
    };
    switch (fn) {
        case 'if': {
            // Only the chosen branch is read: the other may name a value that does not exist.
            const condition = truth(args[0]!);
            if (typeof condition !== 'boolean') return condition;
            return evaluateNode(condition ? args[1]! : args[2]!, resolve, scope);
        }
        case 'and':
        case 'or': {
            for (const argument of args) {
                const value = truth(argument);
                if (typeof value !== 'boolean') return value;
                if (value === (fn === 'or')) return { ok: true, value: fn === 'or' ? 1 : 0 };
            }
            return { ok: true, value: fn === 'and' ? 1 : 0 };
        }
        case 'not': {
            const value = truth(args[0]!);
            return typeof value === 'boolean' ? { ok: true, value: value ? 0 : 1 } : value;
        }
        case 'rating': {
            const list = (args[0] as Extract<Expr, { kind: 'coord' }>).path;
            const name = (args[1] as Extract<Expr, { kind: 'str' }>).value;
            const value = scope.rating?.(list, name);
            return value === undefined
                ? { ok: false, error: 'unknown-coordinate', coordinate: list }
                : { ok: true, value };
        }
        default: {
            const values = numbers(args);
            if (!Array.isArray(values)) return values;
            const [first] = values as [number];
            const value =
                fn === 'min'
                    ? Math.min(...values)
                    : fn === 'max'
                      ? Math.max(...values)
                      : fn === 'ceil'
                        ? Math.ceil(first)
                        : fn === 'floor'
                          ? Math.floor(first)
                          : fn === 'round'
                            ? Math.round(first)
                            : Math.abs(first);
            return { ok: true, value };
        }
    }
}

/**
 * Evaluates the AST to a number or a text. Any unknown coordinate, non-finite result, or division
 * by zero surfaces as an explicit error — never a silent fallback value (spec FR-15).
 */
export function evaluateFormulaValue(
    expr: Expr,
    resolve: Resolver,
    scope: FormulaScope = {}
): FormulaValueResult {
    const result = evaluateNode(expr, resolve, scope);
    if (result.ok && typeof result.value === 'number' && !Number.isFinite(result.value)) {
        return NON_NUMERIC;
    }
    return result;
}

/** Numbers only (bounds, lengths, maxima): a text result is "not a number". */
export function evaluateFormula(
    expr: Expr,
    resolve: Resolver,
    scope: FormulaScope = {}
): FormulaEvaluationResult {
    const result = evaluateFormulaValue(expr, resolve, scope);
    if (!result.ok) return result;
    return typeof result.value === 'number' ? { ok: true, value: result.value } : NON_NUMERIC;
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
