import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    evaluateFormulaValue,
    formulaTruthy,
    parseFormula,
} from '@site/src/sheet_manager/features/sheet/declarative/formula';
import { bloodPotencyEffects } from '@site/src/sheet_manager/systems/v5/modules/vampire/templates/mechanics';
import { isFormulaCondition, type TemplateField } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

/**
 * What Blood Potency gives, and its range per generation (core rulebook pp. 214–216; spec 037),
 * computed by the sheet's derived values (spec 038).
 */

const fields = new Map(bloodPotencyEffects().map((field) => [field.id, field]));

function compute(id: string, values: Record<string, number>) {
    const field = fields.get(id) as Extract<TemplateField, { type: 'formula' }>;
    const parsed = parseFormula(field.formula);
    if (!parsed.ok) throw new Error(`${id}: ${parsed.error.message}`);
    const result = evaluateFormulaValue(parsed.expr, (path) => values[path]);
    if (!result.ok) throw new Error(`${id}: ${result.error}`);
    return result.value;
}

const feeding = uiMessages.sheet.v5Vampire.potency.feeding;

describe('Blood Potency effects', () => {
    it.each([
        [0, { surge: 0, mend: 1, bonus: 0, reroll: 0, severity: 0 }],
        [1, { surge: 1, mend: 1, bonus: 0, reroll: 1, severity: 1 }],
        [2, { surge: 1, mend: 2, bonus: 1, reroll: 1, severity: 1 }],
        [3, { surge: 2, mend: 2, bonus: 1, reroll: 2, severity: 2 }],
        [4, { surge: 2, mend: 3, bonus: 2, reroll: 2, severity: 2 }],
        [5, { surge: 3, mend: 3, bonus: 2, reroll: 3, severity: 3 }],
        [6, { surge: 3, mend: 3, bonus: 3, reroll: 3, severity: 3 }],
        [7, { surge: 4, mend: 3, bonus: 3, reroll: 4, severity: 4 }],
        [8, { surge: 4, mend: 4, bonus: 4, reroll: 4, severity: 4 }],
        [9, { surge: 5, mend: 4, bonus: 4, reroll: 5, severity: 5 }],
        [10, { surge: 5, mend: 5, bonus: 5, reroll: 5, severity: 5 }],
    ])('Blood Potency %i', (potency, expected) => {
        const at = (id: string) => compute(id, { 'blood-potency': potency });
        expect({
            surge: at('blood-surge'),
            mend: at('mend'),
            bonus: at('power-bonus'),
            reroll: at('rouse-reroll'),
            severity: at('bane-severity'),
        }).toEqual(expected);
    });

    it.each([
        [1, feeding.none],
        [2, feeding.b2],
        [3, feeding.b3],
        [4, feeding.b4],
        [6, feeding.b5],
        [8, feeding.b7],
        [9, feeding.b9],
        [10, feeding.b10],
    ])('feeding at Blood Potency %i', (potency, message) => {
        expect(compute('feeding-penalty', { 'blood-potency': potency })).toBe(message.message);
    });

    it('translates every feeding text it can give', () => {
        const field = fields.get('feeding-penalty') as Extract<TemplateField, { type: 'formula' }>;
        expect(Object.keys(field.textMessages ?? {}).sort()).toEqual(
            Object.values(feeding)
                .map(({ message }) => message)
                .sort()
        );
    });
});

describe('Blood Potency range per generation', () => {
    const outside = fields.get('potency-outside')!;
    const condition = outside.visibleWhen!;

    it.each([
        [4, '5–10'],
        [7, '3–7'],
        [10, '1–4'],
        [11, '1–4'],
        [13, '1–3'],
        [14, '0–0'],
        [16, '0–0'],
    ])('generation %i: %s', (generation, range) => {
        expect(compute('potency-range', { generation })).toBe(range);
    });

    it.each([
        [13, 1, false],
        [13, 4, true],
        [9, 1, true],
        [14, 0, false],
    ])('generation %i at Blood Potency %i is outside: %s', (generation, potency, shown) => {
        expect(isFormulaCondition(condition)).toBe(true);
        if (!isFormulaCondition(condition)) return;
        const parsed = parseFormula(condition.formula);
        const result =
            parsed.ok &&
            evaluateFormulaValue(parsed.expr, (path) =>
                path === 'generation' ? generation : path === 'blood-potency' ? potency : undefined
            );
        expect(result && result.ok && formulaTruthy(result.value)).toBe(shown);
    });
});
