// @vitest-environment jsdom
import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { CULT_ID, resetLibraryStores, seedReferenceTypes } from './helpers/library';

/** Own trackers on the sheet (spec 018, US1–US5). */

const LEVELS = [
    ['bruised', 'Bruised', '0'],
    ['hurt', 'Hurt', '-1'],
    ['injured', 'Injured', '-1'],
    ['wounded', 'Wounded', '-2'],
    ['mauled', 'Mauled', '-2'],
    ['crippled', 'Crippled', '-5'],
    ['down', 'Incapacitated', ''],
].map(([id, name, value]) => ({ id, name, value }));

const BASHING = { id: 'bashing', name: 'Bashing', symbol: '╱', fill: 'secondary' };
const LETHAL = { id: 'lethal', name: 'Lethal', symbol: '×', fill: 'error' };
const AGGRAVATED = { id: 'aggravated', name: 'Aggravated', symbol: '✱', fill: 'tertiary' };

function trackerPage(extra: Record<string, unknown> = {}, target = { documentKind: 'mortal' }) {
    return CustomTemplateSchema.parse({
        id: 'tpl-tracker',
        name: 'Trackers',
        systemId: 'wod-v5',
        schemaVersion: 3,
        ...target,
        children: [
            {
                id: 'wounds',
                type: 'tracker',
                label: 'Wounds',
                marks: [BASHING, LETHAL],
                levels: LEVELS,
                valueColumn: { title: 'Penalty', show: true },
                columns: [{ id: 'damage', kind: 'marks', title: 'Damage' }],
                ...extra,
            },
        ],
    });
}

type Page = ReturnType<typeof trackerPage>;

function mount(
    template: Page,
    { value, readOnly = false }: { value?: unknown; readOnly?: boolean } = {}
) {
    useTemplateStore.setState({ templates: [template], quarantine: [], defaultOverrides: {} });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-tracker',
                kind: 'mortal',
                systemId: 'wod-v5',
                definitionId: 'v5-character',
                schemaVersion: 1,
                metadata: { title: 'Mara', tags: [] },
                templateValues: value === undefined ? {} : { wounds: value },
                data: {},
            } as never,
        ],
        currentDocumentId: 'doc-tracker',
    });
    const view = createElement(DeclarativeSheetView, { template });
    return render(
        readOnly
            ? createElement(
                  CharacterContext.Provider,
                  { value: { character: null, readOnly: true } },
                  view
              )
            : view
    );
}

const stored = () =>
    useDocumentStore.getState().documents.find(({ id }) => id === 'doc-tracker')!.templateValues
        ?.wounds as {
        length?: number;
        columns: Record<string, { id: string; marks?: object; texts?: object }[]>;
    };

const box = (name: string) => screen.getByRole('button', { name });
const totalRow = () => document.querySelector('[data-tracker-total]') as HTMLElement;

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

afterEach(() => {
    cleanup();
    takeSheetIssues();
});

describe('marking boxes (US1)', () => {
    it('steps a box through the marks and keeps them with the document', () => {
        mount(trackerPage());
        fireEvent.click(box('Hurt: empty'));
        expect(box('Hurt: Bashing').textContent).toBe('╱');
        fireEvent.click(box('Hurt: Bashing'));
        expect(stored().columns.damage).toEqual([{ id: 'a', marks: { hurt: 'lethal' } }]);
        fireEvent.click(box('Hurt: Lethal'));
        expect(stored().columns.damage).toEqual([{ id: 'a' }]);

        fireEvent.click(box('Hurt: empty'));
        cleanup();
        mount(trackerPage(), { value: stored() });
        expect(box('Hurt: Bashing')).toBeTruthy();
    });

    it('shows the value of the deepest marked level in the total row', () => {
        mount(trackerPage(), {
            value: {
                tracker: 1,
                columns: { damage: [{ id: 'a', marks: { bruised: 'bashing', hurt: 'lethal' } }] },
            },
        });
        expect(totalRow().textContent).toContain('-1');
        // A divider in the table's border color, no background (spec clarification 2026-09-30).
        expect(totalRow().className).toContain('border-border');
        expect(totalRow().className).not.toMatch(/\bbg-/);
    });

    it('shows the value column under its own title, or hides it', () => {
        mount(trackerPage({ valueColumn: { title: 'Bonus', show: true } }));
        expect(screen.getByRole('columnheader', { name: 'Bonus' })).toBeTruthy();
        cleanup();
        mount(trackerPage({ valueColumn: { title: 'Bonus', show: false }, total: false }));
        expect(screen.queryByRole('columnheader', { name: 'Bonus' })).toBeNull();
    });

    it('shows marks read-only and changes nothing', () => {
        mount(trackerPage(), {
            readOnly: true,
            value: { tracker: 1, columns: { damage: [{ id: 'a', marks: { hurt: 'bashing' } }] } },
        });
        expect((box('Hurt: Bashing') as HTMLButtonElement).disabled).toBe(true);
    });

    it('reads an unreadable value as empty and reports it once', () => {
        mount(trackerPage(), { value: { columns: 'broken' } });
        expect(box('Hurt: empty')).toBeTruthy();
        const codes = takeSheetIssues().map(({ code }) => code);
        expect(codes.filter((code) => code === 'template-value-unreadable')).toHaveLength(1);
    });

    it('hides marks of levels the tracker lost, and reports how many', () => {
        mount(trackerPage(), {
            value: {
                tracker: 1,
                columns: { damage: [{ id: 'a', marks: { gone: 'lethal', hurt: 'retired' } }] },
            },
        });
        expect(box('Hurt: empty')).toBeTruthy();
        const hidden = takeSheetIssues().filter(({ code }) => code === 'template-value-hidden');
        expect(hidden).toHaveLength(1);
        expect(hidden[0]!.details).toMatchObject({ count: 2 });
    });

    it('works on a page of a user document type', () => {
        seedReferenceTypes();
        const page = trackerPage({}, { documentKind: CULT_ID });
        useTemplateStore.setState({ templates: [page], quarantine: [], defaultOverrides: {} });
        useDocumentStore.setState({ currentDocumentId: 'cult-1' });
        render(createElement(DeclarativeSheetView, { template: page }));
        fireEvent.click(box('Hurt: empty'));
        const cult = useDocumentStore.getState().documents.find(({ id }) => id === 'cult-1')!;
        expect(cult.templateValues?.wounds).toEqual({
            tracker: 1,
            columns: { damage: [{ id: 'a', marks: { hurt: 'bashing' } }] },
        });
        resetLibraryStores();
    });
});

describe('kinds of marks (US2)', () => {
    it('cycles three marks, then back to empty', () => {
        mount(trackerPage({ marks: [BASHING, LETHAL, AGGRAVATED] }));
        for (const name of ['empty', 'Bashing', 'Lethal', 'Aggravated']) {
            fireEvent.click(box(`Hurt: ${name}`));
        }
        expect(box('Hurt: empty')).toBeTruthy();
    });

    it('fills an own color inline and a palette color by class', () => {
        mount(trackerPage({ marks: [{ ...BASHING, fill: '#0e7490' }, LETHAL] }), {
            value: {
                tracker: 1,
                columns: { damage: [{ id: 'a', marks: { hurt: 'bashing', injured: 'lethal' } }] },
            },
        });
        expect(box('Hurt: Bashing').style.backgroundColor).toBe('rgb(14, 116, 144)');
        expect(box('Injured: Lethal').className).toContain('bg-error');
    });

    it('follows a reordered kind list and keeps stored marks on their kinds', () => {
        mount(trackerPage({ marks: [LETHAL, BASHING] }), {
            value: { tracker: 1, columns: { damage: [{ id: 'a', marks: { hurt: 'bashing' } }] } },
        });
        expect(box('Hurt: Bashing')).toBeTruthy();
        fireEvent.click(box('Injured: empty'));
        expect(box('Injured: Lethal')).toBeTruthy();
    });

    it('lists each mark in a legend, its symbol centred in the box', () => {
        mount(trackerPage({ marks: [BASHING, LETHAL, AGGRAVATED], legend: true }));
        const legend = screen.getByRole('list');
        const items = within(legend).getAllByRole('listitem');
        expect(items.map((item) => item.textContent)).toEqual([
            '╱Bashing',
            '×Lethal',
            '✱Aggravated',
        ]);
        const swatch = items[2]!.querySelector('span')!;
        expect(swatch.className).toContain('place-items-center');
        expect(swatch.className).toContain('bg-tertiary');
    });

    it('has no legend unless turned on, and none on one line', () => {
        mount(trackerPage({ marks: [BASHING, LETHAL] }));
        expect(screen.queryByRole('list')).toBeNull();
        cleanup();
        mount(trackerPage({ display: 'line', legend: true }));
        expect(screen.queryByRole('list')).toBeNull();
    });
});

describe('displays (US3)', () => {
    it('draws a table, strips, or one small line', () => {
        mount(trackerPage());
        expect(screen.getByRole('table')).toBeTruthy();
        cleanup();
        mount(trackerPage({ display: 'strip' }));
        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.getByRole('group', { name: 'Wounds' })).toBeTruthy();
        expect(box('Hurt: empty').className).toContain('h-8');
        cleanup();
        mount(trackerPage({ display: 'line' }));
        expect(box('Hurt: empty').className).toContain('h-6');
    });
});

describe('columns and copies (US4)', () => {
    const copies = {
        columns: [{ id: 'damage', kind: 'marks', title: 'Damage', copies: { max: 4 } }],
    };

    it('adds copies A, B, C… up to the maximum and relabels after a removal', () => {
        mount(trackerPage(copies));
        const add = () => fireEvent.click(screen.getByRole('button', { name: 'Add Damage' }));
        add();
        add();
        add();
        expect(
            (screen.getByRole('button', { name: 'Add Damage' }) as HTMLButtonElement).disabled
        ).toBe(true);
        expect(stored().columns.damage).toHaveLength(4);
        fireEvent.click(screen.getByRole('button', { name: 'Remove Damage B' }));
        expect(stored().columns.damage).toHaveLength(3);
        expect(screen.getByRole('columnheader', { name: /Damage C/ })).toBeTruthy();
        expect(screen.queryByRole('columnheader', { name: /Damage D/ })).toBeNull();
    });

    it('asks before removing a copy that holds marks', () => {
        mount(trackerPage(copies), {
            value: {
                tracker: 1,
                columns: { damage: [{ id: 'a' }, { id: 'b', marks: { hurt: 'lethal' } }] },
            },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Remove Damage B' }));
        fireEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' })
        );
        expect(stored().columns.damage).toEqual([{ id: 'a' }]);
    });

    it('stores notes in a text column on the levels it covers', () => {
        mount(
            trackerPage({
                columns: [
                    { id: 'damage', kind: 'marks', title: 'Damage' },
                    { id: 'source', kind: 'text', title: 'Source', covers: 3 },
                ],
            })
        );
        fireEvent.change(screen.getByLabelText('Source — Hurt'), { target: { value: 'Blaster' } });
        expect(stored().columns.source).toEqual([{ id: 'a', texts: { hurt: 'Blaster' } }]);
        expect(screen.queryByLabelText('Source — Wounded')).toBeNull();
    });

    it('says in a strip that text columns show in the table', () => {
        mount(
            trackerPage({
                display: 'strip',
                columns: [
                    { id: 'damage', kind: 'marks', title: 'Damage' },
                    { id: 'source', kind: 'text', title: 'Source' },
                ],
            })
        );
        expect(screen.getByText('Text columns (Source) show only in the table.')).toBeTruthy();
    });
});

describe('lengths and out (US5)', () => {
    const fodder = {
        columns: [{ id: 'health', kind: 'marks', title: 'Health', copies: { max: 12 } }],
        lengths: [
            { levels: ['hurt', 'injured', 'down'] },
            { levels: ['bruised', 'hurt', 'injured', 'wounded', 'down'] },
            { levels: LEVELS.map(({ id }) => id) },
        ],
        out: true,
    };
    const shownLevels = () => screen.getAllByRole('rowheader').map((header) => header.textContent);

    it('shows the first length, then the levels of each length', () => {
        mount(trackerPage(fodder));
        expect(shownLevels()).toEqual(['Hurt', 'Injured', 'Incapacitated', 'Penalty']);
        fireEvent.click(screen.getByRole('button', { name: 'Extend Wounds' }));
        expect(shownLevels()).toEqual([
            'Bruised',
            'Hurt',
            'Injured',
            'Wounded',
            'Incapacitated',
            'Penalty',
        ]);
    });

    it('asks before shortening over marks, then folds them, heaviest first', () => {
        mount(trackerPage(fodder), {
            value: {
                tracker: 1,
                length: 1,
                columns: {
                    health: [
                        {
                            id: 'a',
                            marks: {
                                bruised: 'bashing',
                                hurt: 'bashing',
                                injured: 'bashing',
                                wounded: 'lethal',
                            },
                        },
                    ],
                },
            },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Shorten Wounds' }));
        fireEvent.click(
            within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Cancel' })[0]!
        );
        expect(stored().length).toBe(1);
        fireEvent.click(screen.getByRole('button', { name: 'Shorten Wounds' }));
        fireEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' })
        );
        expect(stored()).toMatchObject({
            length: 0,
            columns: {
                health: [
                    { id: 'a', marks: { hurt: 'bashing', injured: 'bashing', down: 'lethal' } },
                ],
            },
        });
    });

    it('strikes a copy out once its last shown level is marked', () => {
        mount(trackerPage(fodder), {
            value: {
                tracker: 1,
                columns: { health: [{ id: 'a', marks: { down: 'bashing' } }, { id: 'b' }] },
            },
        });
        const header = screen.getByRole('columnheader', { name: /Health A/ });
        expect(header.querySelector('.line-through')).toBeTruthy();
        expect(totalRow().textContent).toContain('out');
    });
});
