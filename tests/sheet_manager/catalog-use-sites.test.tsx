// @vitest-environment happy-dom
import { validateTemplateReferences } from '@site/src/sheet_manager/features/sheet/data/templateReferences';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import {
    ASHEN_ID,
    BLACK_MIRROR,
    CURSED_COLUMN,
    FIREARMS_ID,
    POWER_COLUMN,
    RELICS_ID,
    resetLibraryStores,
    seedLibrary,
    userCatalog,
} from './helpers/library';

type Children = unknown[];

function relicField(extra: Record<string, unknown> = {}) {
    return {
        id: 'relic',
        type: 'select',
        label: 'Relic',
        options: [{ id: 'none', label: 'None' }],
        binding: {
            catalogId: RELICS_ID,
            fills: {
                [POWER_COLUMN]: { targetFieldId: 'relic-power' },
                [CURSED_COLUMN]: { targetFieldId: 'relic-cursed' },
            },
        },
        ...extra,
    };
}

function page(children: Children, target: Record<string, unknown> = {}) {
    return CustomTemplateSchema.parse({
        id: 'tpl-relicpg1',
        name: 'Relic page',
        systemId: 'wod-v5',
        documentKind: 'mortal',
        settingId: ASHEN_ID,
        schemaVersion: 3,
        children,
        ...target,
    });
}

const fieldPage = () =>
    page([
        relicField(),
        { id: 'relic-power', type: 'number', label: 'Relic power' },
        { id: 'relic-cursed', type: 'toggle', label: 'Relic cursed' },
    ]);

function mount(template: ReturnType<typeof page>, values: Record<string, unknown> = {}) {
    useTemplateStore.setState({ templates: [template], quarantine: [], defaultOverrides: {} });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-relic',
                kind: 'mortal',
                systemId: 'wod-v5',
                definitionId: 'v5-character',
                schemaVersion: 1,
                metadata: { title: 'Mara', tags: [], settingId: ASHEN_ID },
                templateValues: values,
                data: {},
            } as never,
        ],
        currentDocumentId: 'doc-relic',
    });
    return render(createElement(DeclarativeSheetView, { template }));
}

const values = () => useDocumentStore.getState().documents[0]!.templateValues ?? {};

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

beforeEach(seedLibrary);
afterEach(() => {
    cleanup();
    resetLibraryStores();
    takeSheetIssues();
});

describe('choice fields bound to a user catalog (spec 015, US2)', () => {
    it('writes the entry id, its name, and every mapped column in one change', () => {
        mount(fieldPage());
        const select = screen.getByLabelText('Relic') as HTMLSelectElement;
        expect([...select.options].map(({ text }) => text)).toEqual([
            '—',
            'Bone Flute',
            'Black Mirror',
        ]);
        fireEvent.change(select, { target: { value: BLACK_MIRROR } });
        expect(values()).toEqual({
            relic: BLACK_MIRROR,
            'relic#label': 'Black Mirror',
            'relic-power': 4,
            'relic-cursed': true,
        });
    });

    it('follows a renamed entry and keeps the last name once the catalog is gone', () => {
        mount(fieldPage(), { relic: BLACK_MIRROR, 'relic#label': 'Black Mirror' });
        act(() => {
            const catalog = userCatalog();
            useDocumentTypeStore.getState().saveCatalog({
                ...catalog,
                entries: catalog.entries.map((entry) =>
                    entry.id === BLACK_MIRROR ? { ...entry, name: 'Dark Mirror' } : entry
                ),
            });
        });
        const select = () => screen.getByLabelText('Relic') as HTMLSelectElement;
        expect(select().selectedOptions[0]!.text).toBe('Dark Mirror');

        act(() => useDocumentTypeStore.getState().removeCatalog(RELICS_ID));
        expect(select().selectedOptions[0]!.text).toBe('Black Mirror');
        expect(values().relic).toBe(BLACK_MIRROR);
        expect(takeSheetIssues().map(({ code }) => code)).toContain('catalog-unavailable');
    });

    it('says so when the catalog has no entries yet', () => {
        act(() => useDocumentTypeStore.getState().saveCatalog(userCatalog({ entries: [] })));
        mount(fieldPage());
        expect(screen.getByText('No entries yet')).toBeTruthy();
    });

    it('becomes searchable above 12 entries', () => {
        act(() =>
            useDocumentTypeStore.getState().saveCatalog(
                userCatalog({
                    entries: Array.from({ length: 13 }, (_, i) => ({
                        id: `e-${String(i).padStart(8, '0')}`,
                        name: `Relic ${i}`,
                        values: {},
                    })),
                })
            )
        );
        mount(fieldPage());
        expect((screen.getByLabelText('Relic') as HTMLElement).tagName).toBe('INPUT');
    });

    it('binds only catalogs in the template scope', () => {
        const ruleset = { ...relicField(), binding: { catalogId: FIREARMS_ID, fills: {} } };
        const hunter = page([ruleset], { documentKind: 'character', settingId: undefined });
        expect(validateTemplateReferences(hunter)).toEqual([]);
        const elsewhere = page([relicField()], {
            systemId: 'star-wars-wod',
            documentKind: 'character',
            settingId: undefined,
        });
        expect(validateTemplateReferences(elsewhere)).toContainEqual({
            code: 'unknown-catalog',
            nodeId: 'relic',
            key: RELICS_ID,
        });
    });
});

describe('lists and table columns bound to a user catalog (spec 015, US3)', () => {
    const listPage = () =>
        page([
            {
                id: 'carried',
                type: 'list',
                valueKey: 'carried',
                title: 'Relics carried',
                catalog: { catalogId: RELICS_ID, valueFrom: POWER_COLUMN },
            },
        ]);

    it('suggests entries in a custom list and copies the mapped number', () => {
        mount(listPage(), { carried: [{ id: 'row-1', label: '', value: 0 }] });
        const name = screen.getByPlaceholderText('Relics carried');
        fireEvent.focus(name);
        fireEvent.change(name, { target: { value: 'Bo' } });
        fireEvent.click(screen.getByRole('option', { name: /Bone Flute/ }));
        expect(values().carried).toEqual([{ id: 'row-1', label: 'Bone Flute', value: 2 }]);

        fireEvent.change(screen.getByPlaceholderText('Relics carried'), {
            target: { value: 'Grandmother’s ring' },
        });
        expect(values().carried).toEqual([{ id: 'row-1', label: 'Grandmother’s ring', value: 2 }]);
    });

    const tablePage = () =>
        page([
            {
                id: 'inventory',
                type: 'table',
                columns: [
                    {
                        id: 'item',
                        type: 'select',
                        label: 'Item',
                        options: [{ id: 'none', label: 'None' }],
                        binding: {
                            catalogId: RELICS_ID,
                            fills: {
                                [POWER_COLUMN]: { targetFieldId: 'power' },
                                [CURSED_COLUMN]: { targetFieldId: 'cursed' },
                            },
                        },
                    },
                    { id: 'power', type: 'number', label: 'Power' },
                    { id: 'cursed', type: 'toggle', label: 'Cursed' },
                ],
            },
        ]);

    it('fills only the row where the pick happened', () => {
        mount(tablePage(), {
            inventory: { '0': { power: 9 }, '1': {} },
        });
        const secondRow = document.querySelector('tr[data-row="1"]')!;
        fireEvent.change(secondRow.querySelector('select')!, { target: { value: BLACK_MIRROR } });
        expect(values().inventory).toEqual({
            '0': { power: 9 },
            '1': { item: BLACK_MIRROR, 'item#label': 'Black Mirror', power: 4, cursed: true },
        });
    });

    it('reports fill targets outside the table and list value columns that are not numbers', () => {
        const outside = page([
            {
                id: 'inventory',
                type: 'table',
                columns: [
                    {
                        id: 'item',
                        type: 'select',
                        label: 'Item',
                        options: [{ id: 'none', label: 'None' }],
                        binding: {
                            catalogId: RELICS_ID,
                            fills: { [POWER_COLUMN]: { targetFieldId: 'page-power' } },
                        },
                    },
                ],
            },
            { id: 'page-power', type: 'number', label: 'Power' },
        ]);
        expect(validateTemplateReferences(outside)).toContainEqual({
            code: 'unknown-fill-target',
            nodeId: 'item',
            key: 'page-power',
        });
        const wrongValue = page([
            {
                id: 'carried',
                type: 'list',
                valueKey: 'carried',
                catalog: { catalogId: RELICS_ID, valueFrom: CURSED_COLUMN },
            },
        ]);
        expect(validateTemplateReferences(wrongValue)).toContainEqual({
            code: 'unknown-fill-detail',
            nodeId: 'carried',
            key: CURSED_COLUMN,
        });
        expect(validateTemplateReferences(listPage())).toEqual([]);
        expect(validateTemplateReferences(tablePage())).toEqual([]);
    });
});

describe('list entry types filled from a catalog (spec 016, US5)', () => {
    const listWith = (item: Record<string, unknown>, valueFrom: string, extra = {}) =>
        page([
            {
                id: 'carried',
                type: 'list',
                valueKey: 'carried',
                title: 'Relics carried',
                item: { id: 'relic-entry', label: 'Relic', ...item },
                catalog: { catalogId: RELICS_ID, valueFrom },
                ...extra,
            },
        ]);

    const pick = (typed: string, name: RegExp) => {
        const input = screen.getByPlaceholderText('Relics carried');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: typed } });
        fireEvent.click(screen.getByRole('option', { name }));
    };

    it('copies a number column into a number entry', () => {
        mount(listWith({ type: 'number' }, POWER_COLUMN), {
            carried: [{ id: 'row-1', label: '' }],
        });
        pick('Bl', /Black Mirror/);
        expect(values().carried).toEqual([{ id: 'row-1', label: 'Black Mirror', value: 4 }]);
    });

    it('copies a number column into a resource entry and keeps its maximum', () => {
        mount(listWith({ type: 'resource', max: 10 }, POWER_COLUMN), {
            carried: [{ id: 'row-1', label: '', value: { current: 0, max: 6 } }],
        });
        pick('Bo', /Bone Flute/);
        expect(values().carried).toEqual([
            { id: 'row-1', label: 'Bone Flute', value: { current: 2, max: 6 } },
        ]);
    });

    it('copies a toggle column into a toggle entry', () => {
        mount(listWith({ type: 'toggle' }, CURSED_COLUMN), {
            carried: [{ id: 'row-1', label: '' }],
        });
        pick('Bl', /Black Mirror/);
        expect(values().carried).toEqual([{ id: 'row-1', label: 'Black Mirror', value: true }]);
    });

    it('reports a value column that does not fit and a catalog on an unnamed list', () => {
        expect(
            validateTemplateReferences(listWith({ type: 'image' }, POWER_COLUMN))
        ).toContainEqual({
            code: 'unknown-fill-detail',
            nodeId: 'carried',
            key: POWER_COLUMN,
        });
        expect(validateTemplateReferences(listWith({ type: 'toggle' }, CURSED_COLUMN))).toEqual([]);
        expect(
            validateTemplateReferences(listWith({ type: 'text' }, POWER_COLUMN, { named: false }))
        ).toContainEqual({ code: 'list-catalog-unnamed', nodeId: 'carried', key: RELICS_ID });
    });
});
