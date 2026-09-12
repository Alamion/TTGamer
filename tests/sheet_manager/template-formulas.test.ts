import {
    collectDependencies,
    detectDependencyCycles,
    evaluateFormula,
    type FormulaDependencyEntry,
    parseFormula,
} from '@site/src/sheet_manager/features/sheet/declarative/formula';
import { describe, expect, it } from 'vitest';

describe('formula grammar acceptance (T005)', () => {
    it('accepts bare coordinates, numbers, arithmetic, parentheses, and unary minus', () => {
        expect(parseFormula('willpower').ok).toBe(true);
        expect(parseFormula('willpower.max').ok).toBe(true);
        expect(parseFormula('42').ok).toBe(true);
        expect(parseFormula('1 + 2 * 3').ok).toBe(true);
        expect(parseFormula('(1 + 2) * 3').ok).toBe(true);
        expect(parseFormula('-5').ok).toBe(true);
        expect(parseFormula('a--b').ok).toBe(true);
        expect(parseFormula('wits + alertness').ok).toBe(true);
        expect(parseFormula('conscience + passion + self-control').ok).toBe(true);
        expect(parseFormula('willpower.current - 1').ok).toBe(true);
    });

    it('rejects unicode operators and malformed expressions with positions', () => {
        expect(parseFormula('a × b').ok).toBe(false);
        expect(parseFormula('a ÷ b').ok).toBe(false);
        expect(parseFormula('a ** b').ok).toBe(false);
        expect(parseFormula('1 +').ok).toBe(false);
        expect(parseFormula('(1 + 2').ok).toBe(false);
        expect(parseFormula('').ok).toBe(false);
        expect(parseFormula('1 2').ok).toBe(false);
        const failing = parseFormula('a + +');
        expect(failing.ok).toBe(false);
        if (!failing.ok) expect(failing.error.position).toBeGreaterThanOrEqual(0);
    });

    it('extracts every referenced coordinate', () => {
        const parsed = parseFormula('wits + alertness - willpower.current + force-points.max');
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect([...parsed.coords].sort()).toEqual([
                'alertness',
                'force-points.max',
                'willpower.current',
                'wits',
            ]);
        }
    });
});

describe('formula evaluation (T005)', () => {
    const resolver = (path: string): number | undefined => {
        const table: Record<string, number> = {
            wits: 3,
            alertness: 2,
            'willpower.current': 6,
            'willpower.max': 8,
        };
        return table[path];
    };

    it('honors precedence and parentheses', () => {
        const expr = parseFormula('2 + 3 * 4');
        expect(expr.ok && evaluateFormula(expr.expr, resolver)).toEqual({ ok: true, value: 14 });
        const parenthesized = parseFormula('(2 + 3) * 4');
        expect(parenthesized.ok && evaluateFormula(parenthesized.expr, resolver)).toEqual({
            ok: true,
            value: 20,
        });
    });

    it('resolves coordinates with .current/.max suffixes', () => {
        const current = parseFormula('willpower.current');
        expect(current.ok && evaluateFormula(current.expr, resolver)).toEqual({
            ok: true,
            value: 6,
        });
        const max = parseFormula('willpower.max');
        expect(max.ok && evaluateFormula(max.expr, resolver)).toEqual({ ok: true, value: 8 });
    });

    it('surfaces unknown coordinates, non-numeric sources, and division by zero', () => {
        const unknown = parseFormula('no-such-coordinate + 1');
        expect(unknown.ok && evaluateFormula(unknown.expr, resolver)).toEqual({
            ok: false,
            error: 'unknown-coordinate',
            coordinate: 'no-such-coordinate',
        });

        const nonNumeric = parseFormula('wits + alertness');
        expect(
            nonNumeric.ok &&
                evaluateFormula(nonNumeric.expr, (path) => (path === 'wits' ? Number.NaN : 1))
        ).toEqual({ ok: false, error: 'non-numeric' });

        const division = parseFormula('10 / alertness');
        expect(division.ok && evaluateFormula(division.expr, () => 0)).toEqual({
            ok: false,
            error: 'division-by-zero',
        });
    });

    it('evaluates deep chains without stack issues', () => {
        const deep = Array.from({ length: 50 }, () => '1').join(' + ');
        const parsed = parseFormula(deep);
        expect(parsed.ok && evaluateFormula(parsed.expr, resolver)).toEqual({
            ok: true,
            value: 50,
        });
    });
});

describe('cycle detection (T005)', () => {
    const entry = (id: string, reads: string[], writes?: string): FormulaDependencyEntry => ({
        id,
        reads,
        ...(writes ? { writes } : {}),
    });

    it('detects a two-node cycle and names both ids', () => {
        const cycles = detectDependencyCycles([
            entry('left', ['right-coord'], 'left-coord'),
            entry('right', ['left-coord'], 'right-coord'),
        ]);
        expect(cycles).toHaveLength(1);
        expect(cycles[0]).toContain('left');
        expect(cycles[0]).toContain('right');
    });

    it('detects self-writes (a formula reading its own output)', () => {
        const cycles = detectDependencyCycles([entry('solo', ['solo-coord'], 'solo-coord')]);
        expect(cycles).toHaveLength(1);
        expect(cycles[0]).toContain('solo');
    });

    it('accepts dependency chains without cycles', () => {
        const cycles = detectDependencyCycles([
            entry('base', []),
            entry('mid', ['base-coord'], 'mid-coord'),
            entry('top', ['mid-coord'], 'top-coord'),
        ]);
        expect(cycles).toHaveLength(0);
    });

    it('collectDependencies walks nested unary expressions', () => {
        const parsed = parseFormula('-(a + b) * 2');
        expect(parsed.ok).toBe(true);
        if (parsed.ok) expect([...collectDependencies(parsed.expr)].sort()).toEqual(['a', 'b']);
    });
});
