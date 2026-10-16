import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { ActionBinding, ActionContext, ActionOutcome } from '../../../templateBindings';
import { bloodPotencyEffects } from './bloodPotency';
import { VAMPIRE_LIMITS } from './schema';

const messages = uiMessages.sheet.v5Vampire.rouse;

/** A Rouse check: one die, 6 or more passes (core rulebook p. 211). */
const ROUSE_NOTATION = '1d10>=6';

const numberOf = (value: unknown) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Makes `count` Rouse checks, re-rolling each failure once when `reroll` allows it, and raises
 * Hunger by one per failure up to 5 (spec 037 D6). A cancelled roll stops and writes what the
 * finished checks changed.
 */
async function rouseChecks(
    context: ActionContext,
    count: number,
    reroll: boolean
): Promise<ActionOutcome> {
    const start = numberOf((context.data as { hunger?: unknown } | null)?.hunger);
    let hunger = start;
    let passed = 0;
    for (let check = 0; check < count; check += 1) {
        let result = await context.roll(ROUSE_NOTATION);
        if (result && result.total < 1 && reroll) result = await context.roll(ROUSE_NOTATION);
        if (!result) {
            return {
                ...(hunger !== start ? { update: { hunger } } : {}),
                message: { descriptor: messages.cancelled },
                tone: 'info',
            };
        }
        if (result.total >= 1) passed += 1;
        else hunger = Math.min(VAMPIRE_LIMITS.hunger.max, hunger + 1);
    }
    const update = hunger !== start ? { update: { hunger } } : {};
    if (count > 1) {
        return {
            ...update,
            message: { descriptor: messages.checks, values: { passed, count } },
            tone: passed === count ? 'success' : 'error',
        };
    }
    if (passed === 1) {
        return { message: { descriptor: messages.passed, values: { hunger } }, tone: 'success' };
    }
    if (start >= VAMPIRE_LIMITS.hunger.max) {
        return { message: { descriptor: messages.atMax }, tone: 'info' };
    }
    return {
        ...update,
        message: { descriptor: messages.failed, values: { hunger } },
        tone: 'error',
    };
}

const kinds: ReadonlySet<string> = new Set(['vampire']);

/** The general Rouse check by Hunger (no Blood Potency re-roll: it is not a Discipline's). */
export const rouseAction: ActionBinding = {
    key: 'action:rouse',
    kind: 'action',
    label: messages.action.message,
    translation: messages.action,
    documentKinds: kinds,
    run: (context) => rouseChecks(context, 1, false),
};

/**
 * A power's Rouse checks (its catalog cost); Blood Potency re-rolls failures of powers at or below
 * its re-roll level. Powers typed by the player have no cost and no button.
 */
export const rousePowerAction: ActionBinding = {
    key: 'action:rouse-power',
    kind: 'action',
    label: messages.action.message,
    translation: messages.action,
    rowTranslation: messages.actionFor,
    documentKinds: kinds,
    available: (_data, row) => Boolean(row?.entry) && numberOf(row?.rouse) > 0,
    run: (context) => {
        const potency = numberOf((context.data as { bloodPotency?: unknown } | null)?.bloodPotency);
        const level = numberOf(context.row?.level);
        const reroll = level > 0 && level <= bloodPotencyEffects(potency).reroll;
        return rouseChecks(context, numberOf(context.row?.rouse), reroll);
    },
};
