import {
    evaluateFormula,
    evaluateFormulaValue,
    type FormulaValue,
    parseFormula,
} from '@site/src/sheet_manager/features/sheet/declarative/formula';
import { describe, expect, it } from 'vitest';

/** Rounding, comparisons, conditions, and text in template formulas (spec 038, US2). */

const values: Record<string, FormulaValue> = {
    'blood-potency': 3,
    generation: 12,
    hunger: 0,
    clan: 'Brujah',
};

function run(source: string, row?: Record<string, FormulaValue>) {
    const parsed = parseFormula(source);
    if (!parsed.ok) throw new Error(`${source}: ${parsed.error.message}`);
    return evaluateFormulaValue(parsed.expr, (path) => values[path], {
        ...(row ? { row: (column: string) => row[column] } : {}),
    });
}

const value = (source: string, row?: Record<string, FormulaValue>) => {
    const result = run(source, row);
    if (!result.ok) throw new Error(`${source}: ${result.error}`);
    return result.value;
};

describe('formula functions', () => {
    it('rounds', () => {
        expect(value('ceil(blood-potency / 2)')).toBe(2);
        expect(value('floor(blood-potency / 2)')).toBe(1);
        expect(value('round(2.5)')).toBe(3);
        expect(value('abs(0 - 4)')).toBe(4);
    });

    it('compares to 1 or 0, below the arithmetic', () => {
        expect(value('blood-potency >= 3')).toBe(1);
        expect(value('blood-potency > 3')).toBe(0);
        expect(value('blood-potency < 2 + 2')).toBe(1);
        expect(value('blood-potency <= 2')).toBe(0);
        expect(value('blood-potency = 3')).toBe(1);
        expect(value('blood-potency != 3')).toBe(0);
        expect(value('clan = "Brujah"')).toBe(1);
        expect(value('clan != "Gangrel"')).toBe(1);
    });

    it('joins conditions', () => {
        expect(value('and(blood-potency > 1, hunger = 0)')).toBe(1);
        expect(value('or(blood-potency > 5, hunger > 0)')).toBe(0);
        expect(value('not(hunger)')).toBe(1);
        expect(value('not(clan)')).toBe(0);
    });

    it('chooses with if and evaluates only the chosen branch', () => {
        expect(value('if(blood-potency >= 2, 2, 1)')).toBe(2);
        expect(value('if(hunger, missing, 7)')).toBe(7);
        expect(
            value(
                'if(blood-potency >= 5, "Must kill", if(blood-potency >= 3, "Animals: none", "-"))'
            )
        ).toBe('Animals: none');
    });

    it('joins texts and numbers with &', () => {
        expect(value('"BP " & floor(blood-potency / 2) & "–" & blood-potency')).toBe('BP 1–3');
        expect(value('""')).toBe('');
    });

    it('reports arithmetic on a text as not a number', () => {
        expect(run('clan + 1')).toEqual({ ok: false, error: 'non-numeric' });
        expect(run('clan > 1')).toEqual({ ok: false, error: 'non-numeric' });
    });

    it('reads the row it runs on', () => {
        expect(value('row.level <= ceil(blood-potency / 2)', { level: 2 })).toBe(1);
        expect(value('row.rouse > 0', { rouse: 0 })).toBe(0);
        expect(run('row.level')).toEqual({
            ok: false,
            error: 'unknown-coordinate',
            coordinate: 'row.level',
        });
    });

    it('keeps numbers-only evaluation for bounds and lengths', () => {
        const parsed = parseFormula('"text"');
        expect(parsed.ok && evaluateFormula(parsed.expr, () => undefined)).toEqual({
            ok: false,
            error: 'non-numeric',
        });
        const max = parseFormula('max(blood-potency, 2) * 2');
        expect(max.ok && evaluateFormula(max.expr, (path) => values[path] as number)).toEqual({
            ok: true,
            value: 6,
        });
    });

    it('names parse mistakes with their position', () => {
        const cases: Array<[string, RegExp]> = [
            ['if(1, 2)', /if.*3/],
            ['ceil(1, 2)', /ceil.*1/],
            ['"open', /string/i],
            ['rating("a", "b")', /rating/],
            ['rating(disciplines)', /rating/],
            ['1 <', /end/i],
            ['1 ! 2', /Unexpected/],
        ];
        for (const [source, message] of cases) {
            const parsed = parseFormula(source);
            expect(parsed.ok, source).toBe(false);
            if (!parsed.ok) expect(parsed.error.message, source).toMatch(message);
        }
    });

    it('lists coordinates a formula reads, the rated list included, rows excluded', () => {
        const parsed = parseFormula('rating(disciplines, "Auspex") + row.level + hunger');
        expect(parsed.ok && parsed.coords).toEqual(['disciplines', 'hunger']);
    });
});
