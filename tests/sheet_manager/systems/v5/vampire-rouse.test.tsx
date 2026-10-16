// @vitest-environment happy-dom

import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    createStaticDocumentSource,
    DocumentSourceContext,
} from '@site/src/sheet_manager/hooks/useDocumentSource';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type {
    ActionBinding,
    ActionContext,
} from '@site/src/sheet_manager/systems/templateBindings';
import {
    createVampireDefault,
    type VampireData,
    VampireSchema,
} from '@site/src/sheet_manager/systems/v5/modules/vampire/schema';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Rouse checks raise Hunger on a failure, with Blood Potency re-rolls (spec 037, US3). */

const action = (key: string) =>
    systemRegistry
        .getSystem('wod-v5')!
        .templateBindings!.find(
            (binding) => binding.key === key && binding.documentKinds.has('vampire')
        ) as ActionBinding;

const vampire = (overrides: Partial<VampireData> = {}) =>
    VampireSchema.parse({ ...createVampireDefault(), ...overrides });

/** A roll that answers each check with the next face (6+ passes); `null` cancels. */
function rolls(...faces: Array<number | null>) {
    const notations: string[] = [];
    const roll = vi.fn(async (notation: string) => {
        notations.push(notation);
        const face = faces.shift();
        if (face === null || face === undefined) return null;
        return { total: face >= 6 ? 1 : 0 } as RollResult;
    });
    return { roll, notations };
}

const power = (level: number, rouse: number) => ({
    id: 'p1',
    name: 'Power',
    discipline: 'Auspex',
    level: String(level),
    note: '',
    entry: 'auspex-power',
    rouse: String(rouse),
});

async function run(key: string, context: Omit<ActionContext, 'roll'>, faces: Array<number | null>) {
    const { roll, notations } = rolls(...faces);
    const outcome = await action(key).run({ ...context, roll });
    return { outcome, notations };
}

describe('Rouse check', () => {
    it('keeps Hunger on a pass and raises it on a failure, one die without Hunger dice', async () => {
        const passed = await run('action:rouse', { data: vampire({ hunger: 3 }) }, [7]);
        expect(passed.outcome?.update).toBeUndefined();
        expect(passed.outcome?.message.values).toMatchObject({ hunger: 3 });
        expect(passed.notations).toEqual(['1d10>=6']);

        const failed = await run('action:rouse', { data: vampire({ hunger: 3 }) }, [2]);
        expect(failed.outcome?.update).toEqual({ hunger: 4 });
        expect(failed.outcome?.tone).toBe('error');
    });

    it('warns at Hunger 5 and still rolls', async () => {
        const { outcome, notations } = await run(
            'action:rouse',
            { data: vampire({ hunger: 5 }) },
            [1]
        );
        expect(notations).toHaveLength(1);
        expect(outcome?.update).toBeUndefined();
        expect(outcome?.message.descriptor.id).toMatch(/rouse\.atMax$/);
    });

    it('writes nothing when the roll is cancelled', async () => {
        const { outcome } = await run('action:rouse', { data: vampire({ hunger: 2 }) }, [null]);
        expect(outcome?.update).toBeUndefined();
        expect(outcome?.message.descriptor.id).toMatch(/rouse\.cancelled$/);
    });

    it('pays a power’s cost in checks', async () => {
        const { outcome, notations } = await run(
            'action:rouse-power',
            { data: vampire({ hunger: 1, bloodPotency: 0 }), row: power(2, 2) },
            [2, 3]
        );
        expect(notations).toHaveLength(2);
        expect(outcome?.update).toEqual({ hunger: 3 });
    });

    it('re-rolls a failed check when Blood Potency covers the power’s level', async () => {
        const covered = await run(
            'action:rouse-power',
            { data: vampire({ hunger: 1, bloodPotency: 2 }), row: power(1, 1) },
            [2, 8]
        );
        expect(covered.notations).toHaveLength(2);
        expect(covered.outcome?.update).toBeUndefined();

        const above = await run(
            'action:rouse-power',
            { data: vampire({ hunger: 1, bloodPotency: 2 }), row: power(2, 1) },
            [2, 8]
        );
        expect(above.notations).toHaveLength(1);
        expect(above.outcome?.update).toEqual({ hunger: 2 });
    });

    it('offers the power button only on catalog powers with a cost', () => {
        const rouse = action('action:rouse-power');
        expect(rouse.available!(vampire(), power(1, 1))).toBe(true);
        expect(rouse.available!(vampire(), power(1, 0))).toBe(false);
        expect(rouse.available!(vampire(), { ...power(1, 1), entry: '', rouse: '' })).toBe(false);
    });
});

describe('Rouse buttons on the sheet', () => {
    afterEach(cleanup);

    function mount(readOnly = false) {
        const document = {
            id: 'doc-vampire',
            kind: 'vampire',
            systemId: 'wod-v5',
            definitionId: 'vampire',
            schemaVersion: 1,
            metadata: { title: 'Mira', tags: [] },
            templateValues: {},
            data: vampire({
                disciplines: [{ id: 'd1', name: 'Auspex', value: 1 }],
                powers: [{ ...power(1, 1), name: 'Heightened Senses' }],
            }),
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

    it('names the buttons for their action and power', () => {
        useDiceRollerStore.setState({ roll: vi.fn(async () => null) });
        mount();
        expect(screen.getByRole('button', { name: 'Rouse check' })).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Rouse check for Heightened Senses' })
        ).toBeTruthy();
    }, 40_000);

    it('disables Rouse in a read-only document', () => {
        mount(true);
        expect(
            (screen.getByRole('button', { name: 'Rouse check' }) as HTMLButtonElement).disabled
        ).toBe(true);
    }, 40_000);
});
