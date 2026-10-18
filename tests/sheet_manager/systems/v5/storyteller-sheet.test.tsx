// @vitest-environment happy-dom

import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DocumentCreateDialog } from '@site/src/sheet_manager/components/dialogs/DocumentCreateDialog';
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import {
    createV5StorytellerDefault,
    type V5StorytellerData,
    V5StorytellerSchema,
} from '@site/src/sheet_manager/systems/v5/core/storyteller';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { setTestLocale } from '../../../stubs/testLocale';

/** The Storyteller character's pages and rolls (spec 040, US1 and US2). */

const RENDER_TIMEOUT = 40_000;
const DOCUMENT_ID = 'doc-storyteller';

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(() => {
    cleanup();
    setTestLocale('en');
    useDocumentTypeStore.setState({ settings: {}, types: {} });
});

const RUIZ: Partial<V5StorytellerData> = {
    name: 'Detective Ruiz',
    pools: { physical: { value: 3 }, social: { value: 5 }, mental: { value: 4 } },
    health: { levels: [], bonus: 1 },
    willpower: { levels: [], bonus: 1 },
    exceptional: [
        { id: 'e1', name: 'Investigation', value: 7 },
        { id: 'e2', name: 'Firearms', value: 5 },
    ],
};

function seed(overrides: Partial<V5StorytellerData> = RUIZ, viewId = 'v5-storyteller-sheet') {
    const data = V5StorytellerSchema.parse({ ...createV5StorytellerDefault(), ...overrides });
    useDocumentStore.setState({
        documents: [
            {
                id: DOCUMENT_ID,
                kind: 'storyteller',
                systemId: 'wod-v5',
                definitionId: 'v5-storyteller',
                schemaVersion: 1,
                metadata: { title: data.name, tags: [], preferredViewId: viewId },
                templateValues: {},
                data,
            } as never,
        ],
        currentDocumentId: DOCUMENT_ID,
    });
}

/** Rolls `act` triggers (render included), with the dice panel's roll replaced by a spy. */
function rollsOf(act: () => void) {
    const roll = vi.fn(async () => null);
    const original = useDiceRollerStore.getState().roll;
    useDiceRollerStore.setState({ roll });
    try {
        act();
        return roll.mock.calls as unknown as Array<[string, { origin?: unknown }]>;
    } finally {
        useDiceRollerStore.setState({ roll: original });
    }
}

describe('the Storyteller character sheet (spec 040, US1)', () => {
    it(
        'shows identity, pools, tracks, exceptional pools, powers, and the publisher badge',
        () => {
            seed();
            render(createElement(CharacterSheet));
            expect(screen.getAllByDisplayValue('Detective Ruiz').length).toBeGreaterThan(0);
            for (const label of ['Physical', 'Social', 'Mental']) {
                expect(screen.getAllByRole('spinbutton', { name: label }).length).toBeGreaterThan(
                    0
                );
            }
            expect(screen.getByDisplayValue('Investigation')).toBeTruthy();
            expect(screen.getByText('Disciplines and powers')).toBeTruthy();
            expect(screen.getAllByRole('button', { name: /^Health \d: empty$/ })).toHaveLength(5);
            expect(screen.getByRole('complementary', { name: 'Publisher notice' })).toBeTruthy();
        },
        RENDER_TIMEOUT
    );

    it(
        'renders the brief',
        () => {
            seed(RUIZ, 'v5-storyteller-brief');
            render(createElement(CharacterSheet));
            expect(screen.getByDisplayValue('Firearms')).toBeTruthy();
            expect(screen.getAllByText('Health').length).toBeGreaterThan(0);
        },
        RENDER_TIMEOUT
    );

    it('is offered by the create dialog under the V5 rules and in a V5 user setting', () => {
        useDocumentTypeStore.setState({
            settings: {
                'user-setting-lunar001': {
                    id: 'user-setting-lunar001',
                    name: 'Lunar Colony',
                    systemId: 'wod-v5',
                    pages: {},
                    createdAt: '2026-10-18T00:00:00.000Z',
                    updatedAt: '2026-10-18T00:00:00.000Z',
                } as never,
            },
        });
        setTestLocale('ru');
        render(createElement(DocumentCreateDialog, { open: true, onOpenChange: () => {} }));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'рассказчик' } });
        const kinds = [...document.querySelectorAll('[data-kind]')].map((node) =>
            node.getAttribute('data-kind')
        );
        expect(kinds).toEqual([
            'wod-v5/v5-storyteller',
            'wod-v5/v5-storyteller/user-setting-lunar001',
        ]);
    });
});

describe('rolling a Storyteller character (spec 040, US2)', () => {
    it(
        'rolls a standard and an exceptional pool without Hunger or Desperation dice',
        () => {
            seed();
            const calls = rollsOf(() => {
                render(createElement(CharacterSheet));
                fireEvent.contextMenu(screen.getAllByRole('button', { name: 'Roll Social' })[0]!);
                fireEvent.contextMenu(screen.getAllByRole('button', { name: 'Roll Firearms' })[0]!);
            });
            expect(calls.map(([notation]) => notation)).toEqual(['5d10>=6', '5d10>=6']);
            for (const [, options] of calls) {
                expect(options.origin).toMatchObject({
                    kind: 'sheet',
                    source: { systemId: 'wod-v5', definitionId: 'v5-storyteller' },
                });
                expect(
                    (options.origin as { source: { specialDice?: number } }).source.specialDice ?? 0
                ).toBe(0);
            }
        },
        RENDER_TIMEOUT
    );
});
