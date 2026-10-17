import type { ButtonChange, RowButton } from '../../../types/template';
import { formulaTruthy } from './formula';
import type { FormulaRun } from './hooks';

/** What a press needs from the page; formulas already see the button's row, if any. */
export interface ButtonRunContext {
    evaluate(source: string): FormulaRun;
    /** A value's current number; `undefined` when the document cannot store it. */
    read(target: string): number | undefined;
    bounds(target: string): { min: number; max: number } | undefined;
    /** Rolls through the dice roller; `null` when the reader cancels. */
    roll(notation: string): Promise<{ total: number } | null>;
}

export interface ButtonChangeReport {
    target: string;
    from: number;
    to: number;
    /** An add that the value's bounds stopped. */
    atLimit: boolean;
}

export type ButtonSetting = 'availableWhen' | 'count' | 'notation' | 'rerollWhen' | 'amount';

export interface ButtonRunResult {
    status: 'success' | 'failure' | 'checks' | 'done' | 'cancelled' | 'unavailable' | 'error';
    /** Rolls that finished, and how many of them succeeded. */
    rolls: number;
    passed: number;
    changes: ButtonChangeReport[];
    /** Final values of the targets that changed, and what they held before the press. */
    values: Record<string, number>;
    previous: Record<string, number>;
    /** Targets the document cannot store (skipped). */
    skipped: string[];
    problem?: { setting: ButtonSetting; error: string; coordinate?: string };
}

/** Rolls per press, whatever a formula says (a runaway count would freeze the dice panel). */
const MAX_ROLLS = 20;

class ButtonProblem extends Error {
    readonly problem: NonNullable<ButtonRunResult['problem']>;

    constructor(problem: NonNullable<ButtonRunResult['problem']>) {
        super(problem.error);
        this.problem = problem;
    }
}

function numberOf(context: ButtonRunContext, source: string, setting: ButtonSetting): number {
    const result = context.evaluate(source);
    if (!result.ok) {
        throw new ButtonProblem({
            setting,
            error: result.error,
            ...(result.coordinate ? { coordinate: result.coordinate } : {}),
        });
    }
    if (typeof result.value !== 'number') {
        throw new ButtonProblem({ setting, error: 'non-numeric' });
    }
    return result.value;
}

function holds(context: ButtonRunContext, source: string, setting: ButtonSetting): boolean {
    const result = context.evaluate(source);
    if (!result.ok) {
        throw new ButtonProblem({
            setting,
            error: result.error,
            ...(result.coordinate ? { coordinate: result.coordinate } : {}),
        });
    }
    return formulaTruthy(result.value);
}

/** `{formula}` segments of a notation computed to whole numbers. */
function notationOf(context: ButtonRunContext, notation: string): string {
    return notation.replace(/\{([^{}]*)\}/g, (_, source: string) =>
        String(Math.round(numberOf(context, source, 'notation')))
    );
}

/**
 * One press of a button (spec 038 D6): checks availability, rolls `count` times (re-rolling a
 * failed roll once while `rerollWhen` holds), applies each roll's success or failure changes to
 * a working copy within the values' bounds, then `always`. A cancelled roll stops the press and
 * keeps what finished rolls changed. Pure apart from the context; never writes.
 */
export async function runButton(
    button: RowButton,
    context: ButtonRunContext
): Promise<ButtonRunResult> {
    const working = new Map<string, number>();
    const previous = new Map<string, number>();
    const skipped = new Set<string>();
    const limited = new Set<string>();
    const result = (
        status: ButtonRunResult['status'],
        rolls = 0,
        passed = 0,
        problem?: ButtonRunResult['problem']
    ): ButtonRunResult => {
        const changes = [...previous].map(([target, from]) => {
            const to = working.get(target) ?? from;
            return { target, from, to, atLimit: limited.has(target) && to === from };
        });
        return {
            status,
            rolls,
            passed,
            changes,
            values: Object.fromEntries(
                changes.filter(({ from, to }) => from !== to).map(({ target, to }) => [target, to])
            ),
            previous: Object.fromEntries(
                changes
                    .filter(({ from, to }) => from !== to)
                    .map(({ target, from }) => [target, from])
            ),
            skipped: [...skipped],
            ...(problem ? { problem } : {}),
        };
    };
    const apply = (changes: readonly ButtonChange[]) => {
        for (const change of changes) {
            const current = working.get(change.target) ?? context.read(change.target);
            if (current === undefined) {
                skipped.add(change.target);
                continue;
            }
            const amount = numberOf(context, change.amount, 'amount');
            const wanted = change.op === 'add' ? current + amount : amount;
            const bounds = context.bounds(change.target);
            const next = bounds ? Math.min(Math.max(wanted, bounds.min), bounds.max) : wanted;
            if (!previous.has(change.target)) previous.set(change.target, current);
            if (change.op === 'add' && amount !== 0 && next === current) limited.add(change.target);
            working.set(change.target, next);
        }
    };

    try {
        if (button.availableWhen && !holds(context, button.availableWhen, 'availableWhen')) {
            return result('unavailable');
        }
        const roll = button.roll;
        if (!roll) {
            apply(button.onSuccess);
            apply(button.always);
            return result('done');
        }
        const count = roll.count
            ? Math.max(0, Math.min(MAX_ROLLS, Math.floor(numberOf(context, roll.count, 'count'))))
            : 1;
        const notation = notationOf(context, roll.notation);
        const reroll = roll.rerollWhen ? holds(context, roll.rerollWhen, 'rerollWhen') : false;
        let rolls = 0;
        let passed = 0;
        for (let index = 0; index < count; index += 1) {
            let outcome = await context.roll(notation);
            if (outcome && outcome.total < roll.successAt && reroll) {
                outcome = await context.roll(notation);
            }
            if (!outcome) return result('cancelled', rolls, passed);
            rolls += 1;
            const success = outcome.total >= roll.successAt;
            if (success) passed += 1;
            apply(success ? button.onSuccess : button.onFailure);
        }
        apply(button.always);
        if (count === 1) return result(passed === 1 ? 'success' : 'failure', rolls, passed);
        return result(count === 0 ? 'done' : 'checks', rolls, passed);
    } catch (error) {
        if (error instanceof ButtonProblem) return result('error', 0, 0, error.problem);
        throw error;
    }
}
