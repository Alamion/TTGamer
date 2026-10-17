import {
    evaluateFormulaValue,
    parseFormula,
} from '@site/src/sheet_manager/features/sheet/declarative/formula';
import {
    type ButtonRunContext,
    runButton,
} from '@site/src/sheet_manager/features/sheet/declarative/runButton';
import { RowButtonSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it, vi } from 'vitest';

/** What one press of a button rolls and changes (spec 038, US1). */

const button = (spec: Record<string, unknown>) =>
    RowButtonSchema.parse({ id: 'b', label: 'Check', ...spec });

const BOUNDS: Record<string, { min: number; max: number }> = {
    hunger: { min: 0, max: 5 },
    humanity: { min: 0, max: 10 },
    stains: { min: 0, max: 10 },
};

/** A page of values, a row, and rolls that answer with the given totals (`null` cancels). */
function context(
    values: Record<string, number>,
    totals: Array<number | null>,
    row?: Record<string, number>
) {
    const notations: string[] = [];
    const roll = vi.fn(async (notation: string) => {
        notations.push(notation);
        const total = totals.shift();
        return total === null || total === undefined ? null : { total };
    });
    const ctx: ButtonRunContext = {
        evaluate: (source) => {
            const parsed = parseFormula(source);
            if (!parsed.ok) return { ok: false, error: 'parse' };
            return evaluateFormulaValue(parsed.expr, (path) => values[path], {
                ...(row ? { row: (column: string) => row[column] } : {}),
            });
        },
        read: (target) => values[target],
        bounds: (target) => BOUNDS[target],
        roll,
    };
    return { ctx, notations, roll };
}

const rouse = {
    roll: { notation: '1d10>=6' },
    onFailure: [{ target: 'hunger', op: 'add', amount: '1' }],
};

describe('a button press', () => {
    it('applies the success or failure changes of its roll', async () => {
        const passed = await runButton(button(rouse), context({ hunger: 2 }, [1]).ctx);
        expect(passed).toMatchObject({ status: 'success', changes: [] });
        const failed = await runButton(button(rouse), context({ hunger: 2 }, [0]).ctx);
        expect(failed).toMatchObject({
            status: 'failure',
            changes: [{ target: 'hunger', from: 2, to: 3, atLimit: false }],
            values: { hunger: 3 },
            previous: { hunger: 2 },
        });
    });

    it('keeps an added value within its bounds and says it is at its limit', async () => {
        const result = await runButton(button(rouse), context({ hunger: 5 }, [0]).ctx);
        expect(result.changes).toEqual([{ target: 'hunger', from: 5, to: 5, atLimit: true }]);
        expect(result.values).toEqual({});
    });

    it('sets values, applies "always" once, and orders two changes of one value', async () => {
        const remorse = button({
            roll: { notation: '{max(1, 10 - humanity - stains)}d10>=6' },
            onFailure: [{ target: 'humanity', op: 'add', amount: '-1' }],
            always: [
                { target: 'stains', op: 'add', amount: '5' },
                { target: 'stains', op: 'set', amount: '0' },
            ],
        });
        const { ctx, notations } = context({ humanity: 7, stains: 2 }, [0]);
        const result = await runButton(remorse, ctx);
        expect(notations).toEqual(['1d10>=6']);
        expect(result.values).toEqual({ humanity: 6, stains: 0 });
        expect(result.changes.find(({ target }) => target === 'stains')).toMatchObject({
            from: 2,
            to: 0,
        });
    });

    it('rolls `count` times and re-rolls a failure once while the condition holds', async () => {
        const power = button({
            roll: { notation: '1d10>=6', count: 'row.cost', rerollWhen: 'row.level <= potency' },
            onFailure: [{ target: 'hunger', op: 'add', amount: '1' }],
        });
        const covered = context({ hunger: 1, potency: 2 }, [0, 1, 0, 0], { cost: 2, level: 1 });
        const result = await runButton(power, covered.ctx);
        expect(covered.roll).toHaveBeenCalledTimes(4);
        expect(result).toMatchObject({
            status: 'checks',
            passed: 1,
            rolls: 2,
            values: { hunger: 2 },
        });

        const above = context({ hunger: 1, potency: 0 }, [0, 0], { cost: 2, level: 1 });
        expect((await runButton(power, above.ctx)).values).toEqual({ hunger: 3 });
        expect(above.roll).toHaveBeenCalledTimes(2);
    });

    it('keeps what finished rolls changed when a later roll is cancelled', async () => {
        const twice = button({
            ...rouse,
            roll: { notation: '1d10>=6', count: '2' },
            always: [{ target: 'stains', op: 'set', amount: '0' }],
        });
        const result = await runButton(twice, context({ hunger: 1, stains: 3 }, [0, null]).ctx);
        expect(result).toMatchObject({ status: 'cancelled', rolls: 1, values: { hunger: 2 } });
    });

    it('writes nothing when the only roll is cancelled', async () => {
        const result = await runButton(button(rouse), context({ hunger: 1 }, [null]).ctx);
        expect(result).toMatchObject({ status: 'cancelled', values: {}, changes: [] });
    });

    it('does nothing while unavailable, and names a formula that cannot be computed', async () => {
        const remorse = button({ ...rouse, availableWhen: 'stains > 0' });
        const unavailable = context({ hunger: 1, stains: 0 }, [0]);
        expect(await runButton(remorse, unavailable.ctx)).toMatchObject({ status: 'unavailable' });
        expect(unavailable.roll).not.toHaveBeenCalled();

        const broken = button({ roll: { notation: '{missing}d10' } });
        expect(await runButton(broken, context({}, []).ctx)).toMatchObject({
            status: 'error',
            problem: { setting: 'notation', error: 'unknown-coordinate', coordinate: 'missing' },
        });
    });

    it('applies the success changes directly without a roll', async () => {
        const spend = button({ onSuccess: [{ target: 'hunger', op: 'add', amount: '-1' }] });
        const { ctx, roll } = context({ hunger: 3 }, []);
        expect(await runButton(spend, ctx)).toMatchObject({
            status: 'done',
            values: { hunger: 2 },
        });
        expect(roll).not.toHaveBeenCalled();
    });

    it('skips a change whose value the document cannot store and names it', async () => {
        const result = await runButton(
            button({
                onSuccess: [
                    { target: 'gone', op: 'set', amount: '1' },
                    { target: 'hunger', op: 'set', amount: '9' },
                ],
            }),
            context({ hunger: 0 }, []).ctx
        );
        expect(result).toMatchObject({ skipped: ['gone'], values: { hunger: 5 } });
    });
});
