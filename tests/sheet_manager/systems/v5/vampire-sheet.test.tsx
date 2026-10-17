// @vitest-environment happy-dom

import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import clanText from '@site/src/i18n/generated/catalogText/v5-vampire-clans';
import predatorText from '@site/src/i18n/generated/catalogText/v5-vampire-predator-types';
import { CATALOG_BINDINGS } from '@site/src/sheet_manager/features/sheet/data/catalogBindings';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    rowSuggestions,
    suggestionsForRow,
} from '@site/src/sheet_manager/features/sheet/declarative/rowsCatalog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { RowsBinding } from '@site/src/sheet_manager/systems/templateBindings';
import {
    createVampireDefault,
    type VampireData,
    VampireSchema,
} from '@site/src/sheet_manager/systems/v5/modules/vampire/schema';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/** The vampire's full sheet (spec 037, US1 and US2). */

const RENDER_TIMEOUT = 40_000;
const DOCUMENT_ID = 'doc-vampire';

afterEach(cleanup);

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

const sheet = (): CustomTemplate =>
    systemRegistry.getSystem('wod-v5')!.defaultTemplates!.find((t) => t.id === 'v5-vampire-sheet')!;

function seed(overrides: Partial<VampireData> = {}) {
    const data = VampireSchema.parse({ ...createVampireDefault(), ...overrides });
    useDocumentStore.setState({
        documents: [
            {
                id: DOCUMENT_ID,
                kind: 'vampire',
                systemId: 'wod-v5',
                definitionId: 'vampire',
                schemaVersion: 1,
                metadata: { title: 'Mira', tags: [] },
                templateValues: {},
                data,
            } as never,
        ],
        currentDocumentId: DOCUMENT_ID,
    });
}

const current = () =>
    useDocumentStore.getState().documents.find(({ id }) => id === DOCUMENT_ID)!.data as VampireData;

const mount = () => render(createElement(DeclarativeSheetView, { template: sheet() }));

const field = (label: string) =>
    screen.getAllByLabelText(label).find((node) => /INPUT|TEXTAREA/.test(node.tagName)) as
        HTMLInputElement | HTMLTextAreaElement;

describe('vampire full sheet', () => {
    it(
        'shows the clan’s bane and compulsion until the player writes their own',
        async () => {
            seed({ clan: 'Tremere' });
            mount();
            await waitFor(() =>
                expect(field('Bane').getAttribute('placeholder')).toBe(clanText.en!.tremere!.bane)
            );
            expect(field('Compulsion').getAttribute('placeholder')).toBe(
                clanText.en!.tremere!.compulsion
            );

            useDocumentStore.setState({
                documents: useDocumentStore.getState().documents.map((document) => ({
                    ...document,
                    data: { ...current(), baneVariant: 'variant' },
                })),
            });
            await waitFor(() =>
                expect(field('Bane').getAttribute('placeholder')).toBe(
                    clanText.en!.tremere!.variantBane
                )
            );

            fireEvent.change(field('Bane'), { target: { value: 'My own curse' } });
            expect(current().bane).toBe('My own curse');
            fireEvent.change(field('Clan'), { target: { value: 'Brujah' } });
            expect(current().bane).toBe('My own curse');
            expect(field('Compulsion').getAttribute('placeholder')).toBe(
                clanText.en!.brujah!.compulsion
            );
        },
        RENDER_TIMEOUT
    );

    it(
        'shows what the predator type gives and changes nothing else',
        async () => {
            seed({ predatorType: 'Siren' });
            const before = current();
            mount();
            await screen.findByText(predatorText.en!.siren!.grants!);
            expect(current()).toEqual(before);
        },
        RENDER_TIMEOUT
    );

    it(
        'shows rituals only with Blood Sorcery, Oblivion, or Thin-Blood Alchemy',
        () => {
            seed({ disciplines: [{ id: 'd1', name: 'Auspex', value: 2 }] });
            mount();
            expect(screen.queryByText('Rituals, ceremonies, and formulas')).toBeNull();
            cleanup();
            seed({ disciplines: [{ id: 'd1', name: 'Blood Sorcery', value: 1 }] });
            mount();
            expect(screen.getAllByText('Rituals, ceremonies, and formulas').length).toBeGreaterThan(
                0
            );
        },
        RENDER_TIMEOUT
    );

    it(
        'rolls a stat with the vampire’s Hunger in its source',
        () => {
            const roll = vi.fn(async () => null);
            const original = useDiceRollerStore.getState().roll;
            useDiceRollerStore.setState({ roll });
            try {
                seed({ hunger: 2 });
                mount();
                fireEvent.contextMenu(
                    screen.getAllByRole('button', { name: 'Roll Dexterity' })[0]!
                );
                expect(roll).toHaveBeenCalledWith(
                    '1d10>=6',
                    expect.objectContaining({
                        origin: {
                            kind: 'sheet',
                            source: { systemId: 'wod-v5', definitionId: 'vampire', specialDice: 2 },
                        },
                    })
                );
            } finally {
                useDiceRollerStore.setState({ roll: original });
            }
        },
        RENDER_TIMEOUT
    );
});

describe('a copied vampire page (US5)', () => {
    it(
        'keeps the values and still rolls with Hunger after blocks move',
        () => {
            const roll = vi.fn(async () => null);
            const original = useDiceRollerStore.getState().roll;
            useDiceRollerStore.setState({ roll });
            try {
                seed({ hunger: 3, name: 'Mira' });
                const copy: CustomTemplate = {
                    ...sheet(),
                    id: 'tpl-vampire-copy',
                    name: 'My vampire page',
                    children: [...sheet().children].reverse(),
                };
                render(createElement(DeclarativeSheetView, { template: copy }));
                expect((field('Name') as HTMLInputElement).value).toBe('Mira');
                fireEvent.contextMenu(screen.getAllByRole('button', { name: 'Roll Wits' })[0]!);
                expect(roll).toHaveBeenCalledWith(
                    '1d10>=6',
                    expect.objectContaining({
                        origin: expect.objectContaining({
                            source: expect.objectContaining({ specialDice: 3 }),
                        }),
                    })
                );
            } finally {
                useDiceRollerStore.setState({ roll: original });
            }
        },
        RENDER_TIMEOUT
    );
});

describe('vampire brief', () => {
    it(
        'renders and rolls a discipline with Hunger',
        () => {
            const roll = vi.fn(async () => null);
            const original = useDiceRollerStore.getState().roll;
            useDiceRollerStore.setState({ roll });
            try {
                seed({ hunger: 1, disciplines: [{ id: 'd1', name: 'Auspex', value: 2 }] });
                const brief = systemRegistry
                    .getSystem('wod-v5')!
                    .defaultTemplates!.find((t) => t.id === 'v5-vampire-brief')!;
                render(createElement(DeclarativeSheetView, { template: brief }));
                fireEvent.contextMenu(screen.getAllByRole('button', { name: /^Roll Auspex/ })[0]!);
                expect(roll).toHaveBeenCalledWith(
                    '2d10>=6',
                    expect.objectContaining({
                        origin: expect.objectContaining({
                            source: expect.objectContaining({ specialDice: 1 }),
                        }),
                    })
                );
            } finally {
                useDiceRollerStore.setState({ roll: original });
            }
        },
        RENDER_TIMEOUT
    );
});

describe('vampire power suggestions', () => {
    const powers = systemRegistry
        .getSystem('wod-v5')!
        .templateBindings!.find(
            (binding) => binding.key === 'rows:powers' && binding.documentKinds.has('vampire')
        ) as RowsBinding;

    it('offers the powers of the vampire’s disciplines up to their dots', () => {
        const limit = { entryKey: 'level', column: 'level', parentValue: 'value' };
        const all = rowSuggestions(CATALOG_BINDINGS, powers.catalog!, 'en', limit);
        const offered = suggestionsForRow(
            CATALOG_BINDINGS,
            powers.catalog!,
            limit,
            all,
            { discipline: '' },
            { disciplines: [{ id: 'd1', name: 'Auspex', value: 2 }] },
            'en'
        );
        expect(offered.length).toBeGreaterThan(2);
        expect(offered.every(({ parentId, level }) => parentId === 'auspex' && level! <= 2)).toBe(
            true
        );
    });
});
