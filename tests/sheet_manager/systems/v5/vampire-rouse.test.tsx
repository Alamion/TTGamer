// @vitest-environment happy-dom

import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    evaluateFormulaValue,
    type FormulaValue,
    parseFormula,
} from '@site/src/sheet_manager/features/sheet/declarative/formula';
import {
    type ButtonRunContext,
    runButton,
} from '@site/src/sheet_manager/features/sheet/declarative/runButton';
import {
    createStaticDocumentSource,
    DocumentSourceContext,
} from '@site/src/sheet_manager/hooks/useDocumentSource';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    createVampireDefault,
    type VampireData,
    VampireSchema,
} from '@site/src/sheet_manager/systems/v5/modules/vampire/schema';
import {
    powerRouseButton,
    remorseButton,
    rouseButton,
} from '@site/src/sheet_manager/systems/v5/modules/vampire/templates/mechanics';
import type { RowButton } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Rouse and Remorse checks as configured buttons of the shipped vampire sheet (spec 037 US3,
 * spec 038 US6): the rules hold through the generic button.
 */

const BOUNDS: Record<string, { min: number; max: number }> = {
    hunger: { min: 0, max: 5 },
    humanity: { min: 0, max: 10 },
    stains: { min: 0, max: 10 },
};

/** Runs a button on a vampire's values; rolls answer with the next face (6+ succeeds). */
async function press(
    button: RowButton,
    values: Record<string, number>,
    faces: Array<number | null>,
    row?: Record<string, FormulaValue>
) {
    const notations: string[] = [];
    const context: ButtonRunContext = {
        evaluate: (source) => {
            const parsed = parseFormula(source);
            if (!parsed.ok) return { ok: false, error: 'parse' };
            return evaluateFormulaValue(parsed.expr, (path) => values[path], {
                ...(row ? { row: (column: string) => row[column] } : {}),
            });
        },
        read: (target) => values[target],
        bounds: (target) => BOUNDS[target],
        roll: async (notation) => {
            notations.push(notation);
            const face = faces.shift();
            return face === null || face === undefined ? null : { total: face >= 6 ? 1 : 0 };
        },
    };
    return { result: await runButton(button, context), notations };
}

const power = (level: number, rouse: number) => ({ level, rouse });

describe('Rouse check', () => {
    it('keeps Hunger on a pass and raises it on a failure, one plain die', async () => {
        const passed = await press(rouseButton(), { hunger: 3 }, [7]);
        expect(passed.result).toMatchObject({ status: 'success', values: {} });
        expect(passed.notations).toEqual(['1d10>=6']);
        const failed = await press(rouseButton(), { hunger: 3 }, [2]);
        expect(failed.result).toMatchObject({ status: 'failure', values: { hunger: 4 } });
    });

    it('says Hunger is already at 5 and still rolls', async () => {
        const { result, notations } = await press(rouseButton(), { hunger: 5 }, [1]);
        expect(notations).toHaveLength(1);
        expect(result.changes).toEqual([{ target: 'hunger', from: 5, to: 5, atLimit: true }]);
    });

    it('writes nothing when the roll is cancelled', async () => {
        const { result } = await press(rouseButton(), { hunger: 2 }, [null]);
        expect(result).toMatchObject({ status: 'cancelled', values: {} });
    });

    it('pays a power’s cost in checks', async () => {
        const { result, notations } = await press(
            powerRouseButton(),
            { hunger: 1, 'blood-potency': 0 },
            [2, 3],
            power(2, 2)
        );
        expect(notations).toHaveLength(2);
        expect(result.values).toEqual({ hunger: 3 });
    });

    it('re-rolls a failed check when Blood Potency covers the power’s level', async () => {
        const covered = await press(
            powerRouseButton(),
            { hunger: 1, 'blood-potency': 2 },
            [2, 8],
            power(1, 1)
        );
        expect(covered.notations).toHaveLength(2);
        expect(covered.result.values).toEqual({});
        const above = await press(
            powerRouseButton(),
            { hunger: 1, 'blood-potency': 2 },
            [2, 8],
            power(2, 1)
        );
        expect(above.notations).toHaveLength(1);
        expect(above.result.values).toEqual({ hunger: 2 });
    });

    it('is unavailable on powers without a cost', async () => {
        const { result } = await press(powerRouseButton(), { hunger: 1 }, [1], power(1, 0));
        expect(result.status).toBe('unavailable');
    });
});

describe('Remorse check', () => {
    it('rolls a die per box neither filled nor stained, at least one', async () => {
        const few = await press(remorseButton(), { humanity: 7, stains: 2 }, [7]);
        expect(few.notations).toEqual(['1d10>=6']);
        const many = await press(remorseButton(), { humanity: 5, stains: 1 }, [7]);
        expect(many.notations).toEqual(['4d10>=6']);
    });

    it('keeps Humanity on a success, lowers it on a failure, and clears the stains', async () => {
        const kept = await press(remorseButton(), { humanity: 7, stains: 2 }, [7]);
        expect(kept.result.values).toEqual({ stains: 0 });
        const lost = await press(remorseButton(), { humanity: 7, stains: 2 }, [3]);
        expect(lost.result.values).toEqual({ humanity: 6, stains: 0 });
    });

    it('is unavailable without stains', async () => {
        const { result } = await press(remorseButton(), { humanity: 7, stains: 0 }, [7]);
        expect(result.status).toBe('unavailable');
    });
});

describe('Rouse and Remorse on the sheet', () => {
    afterEach(cleanup);

    const vampire = (overrides: Partial<VampireData> = {}) =>
        VampireSchema.parse({ ...createVampireDefault(), ...overrides });

    function mount(data: VampireData, readOnly = false) {
        const document = {
            id: 'doc-vampire',
            kind: 'vampire',
            systemId: 'wod-v5',
            definitionId: 'vampire',
            schemaVersion: 1,
            metadata: { title: 'Mira', tags: [] },
            templateValues: {},
            data,
        } as never;
        useDocumentStore.setState({ documents: [document], currentDocumentId: 'doc-vampire' });
        const template = systemRegistry
            .getSystem('wod-v5')!
            .defaultTemplates!.find((t) => t.id === 'v5-vampire-sheet')!;
        const sheet = createElement(DeclarativeSheetView, { template });
        render(
            readOnly
                ? createElement(
                      DocumentSourceContext.Provider,
                      { value: createStaticDocumentSource(document) },
                      sheet
                  )
                : sheet
        );
    }

    const stored = () => useDocumentStore.getState().documents[0]!.data as VampireData;

    it('names the buttons for their action and power, and raises Hunger', async () => {
        useDiceRollerStore.setState({ roll: vi.fn(async () => ({ total: 0 }) as RollResult) });
        mount(
            vampire({
                hunger: 1,
                disciplines: [{ id: 'd1', name: 'Auspex', value: 1 }],
                powers: [
                    {
                        id: 'p1',
                        name: 'Heightened Senses',
                        discipline: 'Auspex',
                        level: '1',
                        note: '',
                        entry: 'auspex-heightened-senses',
                        rouse: '1',
                    },
                ],
            })
        );
        expect(
            screen.getByRole('button', { name: 'Rouse check for Heightened Senses' })
        ).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Rouse check' }));
        await waitFor(() => expect(stored().hunger).toBe(2));
    }, 40_000);

    it('runs Remorse on the stored Humanity and stains', async () => {
        useDiceRollerStore.setState({ roll: vi.fn(async () => ({ total: 0 }) as RollResult) });
        mount(vampire({ humanity: 7, stains: 2 }));
        fireEvent.click(screen.getByRole('button', { name: 'Remorse check' }));
        await waitFor(() => expect(stored()).toMatchObject({ humanity: 6, stains: 0 }));
    }, 40_000);

    it('disables both in a read-only document', () => {
        mount(vampire({ stains: 1 }), true);
        for (const name of ['Rouse check', 'Remorse check']) {
            expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true);
        }
    }, 40_000);
});
