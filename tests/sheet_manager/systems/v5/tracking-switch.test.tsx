// @vitest-environment happy-dom

import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { HunterSchema } from '@site/src/sheet_manager/systems/v5';
import { hungerDiceLine } from '@site/src/sheet_manager/systems/v5/modules/vampire/dice';
import { VampireSchema } from '@site/src/sheet_manager/systems/v5/modules/vampire/schema';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/** Antagonists the Storyteller runs without Hunger and Willpower (spec 040, US4). */

const RENDER_TIMEOUT = 40_000;

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(cleanup);

function seed(definitionId: 'vampire' | 'hunter', data: object, viewId: string) {
    const definition = systemRegistry.getDocumentDefinition('wod-v5', definitionId)!;
    useDocumentStore.setState({
        documents: [
            {
                id: 'antagonist',
                kind: definition.kind,
                systemId: 'wod-v5',
                definitionId,
                schemaVersion: 1,
                metadata: { title: 'The Sheriff', tags: [], preferredViewId: viewId },
                templateValues: {},
                data,
            } as never,
        ],
        currentDocumentId: 'antagonist',
    });
}

const stored = () => useDocumentStore.getState().documents[0]!.data as Record<string, unknown>;
const toggle = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

describe('the tracking switch', () => {
    it('is on for documents saved before it existed', () => {
        expect(VampireSchema.parse({}).trackResources).toBe(true);
        expect(HunterSchema.parse({}).trackResources).toBe(true);
    });

    it('turns Hunger dice off without touching the stored Hunger', () => {
        expect(hungerDiceLine.replaces!.count({ hunger: 3 })).toBe(3);
        expect(hungerDiceLine.replaces!.count({ hunger: 3, trackResources: false })).toBe(0);
    });

    for (const viewId of ['v5-vampire-sheet', 'v5-vampire-brief']) {
        it(
            `hides Hunger, Rouse, and Willpower on a vampire (${viewId}) and brings them back`,
            () => {
                seed('vampire', VampireSchema.parse({ hunger: 3, name: 'The Sheriff' }), viewId);
                render(createElement(CharacterSheet));
                expect(screen.getAllByRole('button', { name: /^Willpower 1/ }).length).toBe(1);
                expect(screen.getByRole('button', { name: 'Rouse check' })).toBeTruthy();
                fireEvent.click(toggle('Track Hunger and Willpower'));
                expect(stored().trackResources).toBe(false);
                expect(screen.queryAllByRole('button', { name: /^Willpower 1/ })).toHaveLength(0);
                expect(screen.queryByRole('button', { name: 'Rouse check' })).toBeNull();
                expect(screen.queryByText('Hunger')).toBeNull();
                fireEvent.click(toggle('Track Hunger and Willpower'));
                expect(stored()).toMatchObject({ trackResources: true, hunger: 3 });
                expect(screen.getByRole('button', { name: 'Rouse check' })).toBeTruthy();
            },
            RENDER_TIMEOUT
        );
    }

    it(
        'rolls a vampire antagonist without Hunger dice',
        () => {
            const roll = vi.fn(async () => null);
            const original = useDiceRollerStore.getState().roll;
            useDiceRollerStore.setState({ roll });
            try {
                seed(
                    'vampire',
                    VampireSchema.parse({ hunger: 3, trackResources: false }),
                    'v5-vampire-sheet'
                );
                render(createElement(CharacterSheet));
                fireEvent.contextMenu(screen.getAllByRole('button', { name: 'Roll Wits' })[0]!);
                expect(roll).toHaveBeenCalledWith(
                    '1d10>=6',
                    expect.objectContaining({
                        origin: {
                            kind: 'sheet',
                            source: { systemId: 'wod-v5', definitionId: 'vampire' },
                        },
                    })
                );
            } finally {
                useDiceRollerStore.setState({ roll: original });
            }
        },
        RENDER_TIMEOUT
    );

    it(
        'hides only Willpower on a hunter and keeps Desperation',
        () => {
            seed('hunter', HunterSchema.parse({ desperation: 2 }), 'v5-hunter-sheet');
            render(createElement(CharacterSheet));
            fireEvent.click(toggle('Track Willpower'));
            expect(screen.queryAllByRole('button', { name: /^Willpower 1/ })).toHaveLength(0);
            expect(screen.getAllByText('Desperation').length).toBeGreaterThan(0);
            expect(stored()).toMatchObject({ trackResources: false, desperation: 2 });
        },
        RENDER_TIMEOUT
    );
});
