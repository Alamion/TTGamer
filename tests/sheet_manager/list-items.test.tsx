// @vitest-environment jsdom
import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

type Entry = { id: string; label?: string; value?: unknown; detail?: unknown };

const OPTIONS = [
    { id: 'low', label: 'Low' },
    { id: 'high', label: 'High' },
];

const ITEMS = {
    text: { type: 'text' },
    notes: { type: 'text', multiline: true },
    number: { type: 'number' },
    toggle: { type: 'toggle' },
    select: { type: 'select', options: OPTIONS },
    rating: { type: 'rating', max: 5 },
    ratingNumber: { type: 'rating', presentation: 'number', min: 1, max: 10 },
    resource: { type: 'resource', max: 10 },
    reference: { type: 'reference', targetKinds: ['mortal'] },
    image: { type: 'image' },
} as const;

function page(list: Record<string, unknown>) {
    return CustomTemplateSchema.parse({
        id: 'tpl-listitem',
        name: 'Lists',
        systemId: 'wod-v5',
        documentKind: 'mortal',
        schemaVersion: 3,
        children: [{ id: 'bonds', type: 'list', valueKey: 'bonds', title: 'Bonds', ...list }],
    });
}

function withItem(kind: keyof typeof ITEMS, list: Record<string, unknown> = {}) {
    return page({ item: { id: 'bond', label: 'Bond', ...ITEMS[kind] }, ...list });
}

function mount(
    template: ReturnType<typeof page>,
    entries: Entry[] = [],
    { readOnly = false }: { readOnly?: boolean } = {}
) {
    useTemplateStore.setState({ templates: [template], quarantine: [], defaultOverrides: {} });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-lists',
                kind: 'mortal',
                systemId: 'wod-v5',
                definitionId: 'v5-character',
                schemaVersion: 1,
                metadata: { title: 'Mara', tags: [] },
                templateValues: entries.length > 0 ? { bonds: entries } : {},
                data: {},
            } as never,
        ],
        currentDocumentId: 'doc-lists',
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
    (useDocumentStore.getState().documents[0]!.templateValues?.bonds ?? []) as Entry[];

const addEntry = () => fireEvent.click(screen.getByRole('button', { name: /^Add$/ }));

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

describe('each entry type on a named list (spec 016, US1)', () => {
    it('stores a text entry with its name', () => {
        mount(withItem('text'));
        addEntry();
        fireEvent.change(screen.getByLabelText('Bonds — name'), { target: { value: 'Aunt Vera' } });
        fireEvent.change(screen.getByLabelText('Aunt Vera'), {
            target: { value: 'owes a favour' },
        });
        expect(stored()).toEqual([
            { id: expect.any(String), label: 'Aunt Vera', value: 'owes a favour' },
        ]);
    });

    it('keeps every line of a multi-line entry', () => {
        mount(withItem('notes'));
        addEntry();
        fireEvent.change(screen.getByLabelText('Bonds, entry 1'), {
            target: { value: 'first\nsecond' },
        });
        expect(stored()[0]?.value).toBe('first\nsecond');
    });

    it('stores numbers, toggles, and choices per entry', () => {
        mount(withItem('number'));
        addEntry();
        fireEvent.change(screen.getByLabelText('Bonds, entry 1'), { target: { value: '4' } });
        fireEvent.blur(screen.getByLabelText('Bonds, entry 1'));
        expect(stored()[0]?.value).toBe(4);
        cleanup();

        mount(withItem('toggle'));
        addEntry();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Bonds, entry 1' }));
        expect(stored()[0]?.value).toBe(true);
        cleanup();

        mount(withItem('select'), [
            { id: 'e1', label: 'One' },
            { id: 'e2', label: 'Two' },
        ]);
        fireEvent.change(screen.getByLabelText('One'), { target: { value: 'high' } });
        fireEvent.change(screen.getByLabelText('Two'), { target: { value: 'low' } });
        expect(stored().map(({ value }) => value)).toEqual(['high', 'low']);
    });

    it('holds a number-style rating to its range', () => {
        mount(withItem('ratingNumber'), [{ id: 'e1', label: 'Grit' }]);
        const input = screen.getByLabelText('Grit');
        fireEvent.change(input, { target: { value: '12' } });
        fireEvent.blur(input);
        expect(stored()[0]?.value).toBe(10);
    });

    it('rates a dot entry and keeps its flags', () => {
        mount(page({}), [{ id: 'e1', label: 'Brawl', value: 1 }]);
        fireEvent.click(screen.getByRole('radio', { name: 'Brawl: 3' }));
        expect(stored()[0]).toMatchObject({ label: 'Brawl', value: 3 });
        fireEvent.click(screen.getByRole('button', { name: 'S' }));
        expect(stored()[0]).toMatchObject({ value: 3, detail: { specialization: true } });
    });

    it('edits a resource entry and shows its maximum', () => {
        mount(withItem('resource'), [{ id: 'e1', label: 'Oath' }]);
        const current = screen.getByLabelText('Oath — current');
        fireEvent.change(current, { target: { value: '3' } });
        fireEvent.blur(current);
        expect(stored()[0]?.value).toEqual({ current: 3, max: 10 });
        expect((screen.getByLabelText('Oath — max') as HTMLInputElement).value).toBe('10');
    });

    it('shows a missing reference target like a reference field', () => {
        mount(withItem('reference'), [{ id: 'e1', label: 'Rival', value: 'doc-gone' }]);
        expect(screen.getAllByText('Linked document no longer exists').length).toBeGreaterThan(0);
        expect(takeSheetIssues().map(({ code }) => code)).toContain('reference-target-missing');
    });

    it('shows an image entry', () => {
        mount(withItem('image', { named: false }), [
            { id: 'e1', value: { source: 'url', url: 'https://example.com/a.png' } },
        ]);
        expect(screen.getByRole('img')).toBeTruthy();
    });
});

describe('stored values the entry type cannot show (spec 016, C1)', () => {
    it('shows the entry empty and reports it once', () => {
        mount(withItem('resource'), [{ id: 'e1', label: 'Oath', value: 'from a text entry' }]);
        expect((screen.getByLabelText('Oath — current') as HTMLInputElement).value).toBe('0');
        const issues = takeSheetIssues().filter(({ code }) => code === 'list-entry-unreadable');
        expect(issues).toHaveLength(1);
        expect(issues[0]?.details).toMatchObject({ listId: 'bonds', count: 1 });
        expect(stored()[0]?.value).toBe('from a text entry');
    });
});

describe('long lists (spec 016, SC-006)', () => {
    it('leaves every other entry untouched when one changes', () => {
        const entries = Array.from({ length: 1000 }, (_, index) => ({
            id: `e${index}`,
            value: `note ${index}`,
        }));
        mount(withItem('text', { named: false }), entries);
        const before = stored();
        act(() => {
            fireEvent.change(
                screen.getByLabelText('Bond', { selector: '[data-list-entry="e500"] input' }),
                {
                    target: { value: 'changed' },
                }
            );
        });
        const after = stored();
        expect(after[500]?.value).toBe('changed');
        expect(after.filter((entry, index) => entry !== before[index])).toHaveLength(1);
    }, 60_000);
});

describe('read-only sheets', () => {
    it('shows no add or remove control', () => {
        const { container } = mount(withItem('text'), [{ id: 'e1', label: 'Vera' }], {
            readOnly: true,
        });
        expect(screen.queryByRole('button', { name: /^Add$/ })).toBeNull();
        expect(within(container).queryByRole('button', { name: /^Remove/ })).toBeNull();
    });
});

describe('named and unnamed entries (spec 016, US2)', () => {
    it('shows a name box only on named lists', () => {
        mount(withItem('text'), [{ id: 'e1', label: 'Vera', value: 'note' }]);
        expect(screen.getByLabelText('Bonds — name')).toBeTruthy();
        cleanup();

        mount(withItem('text', { named: false }), [{ id: 'e1', value: 'note' }]);
        expect(screen.queryByLabelText('Bonds — name')).toBeNull();
        expect((screen.getByLabelText('Bond') as HTMLInputElement).value).toBe('note');
    });

    it('names an unnamed entry by its position when the item label is hidden', () => {
        mount(
            page({
                named: false,
                item: { id: 'bond', type: 'image', label: 'Memento', hideLabel: true },
            }),
            [{ id: 'e1' }, { id: 'e2' }]
        );
        expect(screen.queryByLabelText('Bonds — name')).toBeNull();
        expect(screen.getByRole('button', { name: 'Remove Bonds, entry 2' })).toBeTruthy();
    });

    it('seeds presets with their names and numbers', () => {
        const presets = [{ key: 'oath', label: 'Oath', value: 3 }];
        mount(withItem('resource', { presets }));
        expect(stored()).toEqual([
            { id: 'preset-tpl-listitem-oath', label: 'Oath', value: { current: 3, max: 10 } },
        ]);
        cleanup();
        useDocumentStore.setState({ documents: [] });

        mount(withItem('number', { presets }));
        expect(stored()[0]).toMatchObject({ label: 'Oath', value: 3 });
        cleanup();

        mount(withItem('text', { presets }));
        expect(stored()).toEqual([{ id: 'preset-tpl-listitem-oath', label: 'Oath' }]);
        cleanup();

        mount(withItem('number', { presets, named: false }));
        expect(stored()).toEqual([]);
    });

    it('rolls a rating entry under its name', () => {
        mount(page({}), [{ id: 'e1', label: 'Brawl', value: 2 }]);
        expect(screen.getByRole('button', { name: /Roll Brawl/ })).toBeTruthy();
    });
});

describe('removing entries (spec 016, US3)', () => {
    const values: Record<keyof typeof ITEMS, unknown> = {
        text: 'a',
        notes: 'a\nb',
        number: 2,
        toggle: true,
        select: 'low',
        rating: 2,
        ratingNumber: 3,
        resource: { current: 1, max: 10 },
        reference: 'doc-lists',
        image: { source: 'url', url: 'https://example.com/a.png' },
    };

    it.each(Object.keys(ITEMS) as Array<keyof typeof ITEMS>)(
        'removes the first of two %s entries from the keyboard',
        (kind) => {
            mount(withItem(kind), [
                { id: 'e1', label: 'First', value: values[kind] },
                { id: 'e2', label: 'Second', value: values[kind] },
            ]);
            const second = stored()[1];
            const remove = screen.getByRole('button', { name: 'Remove First' });
            remove.focus();
            expect(document.activeElement).toBe(remove);
            fireEvent.click(remove);
            expect(stored()).toEqual([second]);
            expect(stored()[0]).toBe(second);
            takeSheetIssues();
        }
    );

    it('puts the remove control of a block entry above the field, never over it', () => {
        const { container } = mount(withItem('notes'), [{ id: 'e1', label: 'First', value: 'x' }]);
        const remove = screen.getByRole('button', { name: 'Remove First' });
        const field = container.querySelector('textarea')!;
        expect(
            remove.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });
});

describe('lists saved before entry templates (spec 016, US4)', () => {
    it('render the classic trait row', () => {
        mount(page({}), [{ id: 'e1', label: 'Brawl', value: 2 }]);
        expect((screen.getByLabelText('Bonds — name') as HTMLInputElement).value).toBe('Brawl');
        expect(screen.getAllByRole('radio')).toHaveLength(5);
        expect(screen.getByRole('radio', { name: 'Brawl: 2' }).getAttribute('aria-checked')).toBe(
            'true'
        );
        for (const flag of ['S', 'P', 'E']) {
            expect(screen.getByRole('button', { name: flag })).toBeTruthy();
        }
        expect(screen.getByRole('button', { name: /Roll Brawl/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Remove Brawl' })).toBeTruthy();
    });

    it('keep a value above five stored and show five dots', () => {
        mount(page({}), [{ id: 'e1', label: 'Brawl', value: 8 }]);
        expect(screen.getByRole('radio', { name: 'Brawl: 5' }).getAttribute('aria-checked')).toBe(
            'true'
        );
        expect(stored()[0]?.value).toBe(8);
        expect(takeSheetIssues().map(({ code }) => code)).not.toContain('list-entry-unreadable');
    });

    it('keep a flag after the list re-reads the store', () => {
        mount(page({}), [{ id: 'e1', label: 'Brawl', value: 2 }]);
        fireEvent.click(screen.getByRole('button', { name: 'P' }));
        cleanup();
        mount(page({}), stored());
        expect(screen.getByRole('button', { name: 'P' }).getAttribute('aria-pressed')).toBe('true');
    });
});
