// @vitest-environment happy-dom
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    createStaticDocumentSource,
    DocumentSourceContext,
} from '@site/src/sheet_manager/hooks/useDocumentSource';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Buttons on the page and on table rows (spec 038, US1). */

vi.setConfig({ testTimeout: 20_000 });

const rouse = {
    id: 'rouse',
    type: 'button',
    label: 'Rouse',
    roll: { notation: '1d10>=6' },
    onFailure: [{ target: 'hunger', op: 'add', amount: '1' }],
};

const page = (children: unknown[]) =>
    CustomTemplateSchema.parse({
        id: 'button-kit',
        name: 'Button Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [{ id: 'hunger', type: 'number', label: 'Hunger', min: 0, max: 5 }, ...children],
    });

function mount(children: unknown[], values: Record<string, unknown>, readOnly = false) {
    const template = page(children);
    const document = {
        id: 'doc-button',
        kind: 'character',
        systemId: 'star-wars-wod',
        definitionId: 'star-wars-wod-character',
        schemaVersion: 1,
        metadata: { title: 'Kira', tags: [] },
        templateValues: values,
        data: { metadata: { name: 'Kira', type: 'sentient' } },
    } as never;
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    useDocumentStore.setState({ documents: [document], currentDocumentId: 'doc-button' });
    const sheet = createElement(DeclarativeSheetView, { template });
    return render(
        createElement(
            'div',
            null,
            createElement(Toaster),
            readOnly
                ? createElement(
                      DocumentSourceContext.Provider,
                      { value: createStaticDocumentSource(document) },
                      sheet
                  )
                : sheet
        )
    );
}

/** Every roll answers with the next total; `null` cancels. */
function rolls(...totals: Array<number | null>) {
    const roll = vi.fn(async () => {
        const total = totals.shift();
        return total === null || total === undefined ? null : ({ total } as RollResult);
    });
    useDiceRollerStore.setState({ roll });
    return roll;
}

const hunger = () =>
    (useDocumentStore.getState().documents[0]!.templateValues as Record<string, unknown>).hunger;

afterEach(() => {
    act(() => toast.remove());
    cleanup();
    takeSheetIssues();
});

describe('a button on the page', () => {
    it('rolls, writes the change, says what changed, and undoes it', async () => {
        const roll = rolls(0);
        mount([rouse], { hunger: 2 });
        fireEvent.click(screen.getByRole('button', { name: 'Rouse' }));
        await waitFor(() => expect(hunger()).toBe(3));
        expect(roll).toHaveBeenCalledWith('1d10>=6', expect.anything());
        expect(await screen.findByText(/Rouse: failure · Hunger 2 → 3/)).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        await waitFor(() => expect(hunger()).toBe(2));
    });

    it('keeps a value the reader changed before Undo', async () => {
        rolls(0);
        mount([rouse], { hunger: 2 });
        fireEvent.click(screen.getByRole('button', { name: 'Rouse' }));
        await waitFor(() => expect(hunger()).toBe(3));
        const input = screen.getByLabelText('Hunger');
        fireEvent.change(input, { target: { value: '4' } });
        fireEvent.blur(input);
        fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
        expect(await screen.findByText(/Kept, changed since: Hunger/)).not.toBeNull();
        expect(hunger()).toBe(4);
    });

    it('writes nothing when the roll is cancelled', async () => {
        rolls(null);
        mount([rouse], { hunger: 2 });
        fireEvent.click(screen.getByRole('button', { name: 'Rouse' }));
        expect(await screen.findByText(/roll cancelled/)).not.toBeNull();
        expect(hunger()).toBe(2);
    });

    it('is disabled in a read-only document and while unavailable, with the reason', () => {
        mount([rouse], { hunger: 2 }, true);
        const readOnly = screen.getByRole('button', { name: 'Rouse' }) as HTMLButtonElement;
        expect(readOnly.disabled).toBe(true);
        expect(readOnly.title).toBe('This document is read-only');
        cleanup();
        mount([{ ...rouse, availableWhen: 'hunger < 5' }], { hunger: 5 });
        const unavailable = screen.getByRole('button', { name: 'Rouse' }) as HTMLButtonElement;
        expect(unavailable.disabled).toBe(true);
        expect(unavailable.title).toBe('Rouse is not available now');
    });
});

describe('row buttons', () => {
    it('show on each row, named for the row, and read its cells', async () => {
        rolls(0, 0);
        mount(
            [
                {
                    id: 'powers',
                    type: 'table',
                    title: 'Powers',
                    columns: [
                        { id: 'name', type: 'text', label: 'Name' },
                        { id: 'cost', type: 'number', label: 'Cost' },
                    ],
                    rowButtons: [
                        {
                            ...rouse,
                            type: undefined,
                            roll: { notation: '1d10>=6', count: 'row.cost' },
                        },
                    ],
                },
            ],
            { hunger: 1, powers: { '0': { name: 'Awe', cost: 2 } } }
        );
        fireEvent.click(screen.getByRole('button', { name: 'Rouse for Awe' }));
        await waitFor(() => expect(hunger()).toBe(3));
        expect(await screen.findByText(/Rouse: 0 of 2 succeeded/)).not.toBeNull();
    });
});
