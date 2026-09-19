// @vitest-environment jsdom

import { MERITS_FLAWS_COLUMNS, MERITS_FLAWS_FILTERS } from '@site/src/data/meritsFlawsConfig';
import { MERITS_FLAWS } from '@site/src/data/meritsFlawsData';
import { DataCatalog } from '@site/src/shared/components/DataCatalog';
import type { ColumnDef } from '@tanstack/react-table';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { setTestLocale } from '../stubs/testLocale';

interface Row {
    id: string;
    name: string;
    tags: string[];
}

const ROWS: Row[] = Array.from({ length: 20 }, (_, index) => ({
    id: `row-${index}`,
    name: `Row ${index}`,
    tags: [`tag-${index % 4}`],
}));

const COLUMNS: ColumnDef<Row>[] = [
    { id: 'name', header: 'Name', accessorKey: 'name', enableSorting: false },
    { id: 'tags', header: 'Tags', accessorKey: 'tags', enableSorting: false },
];

function renderCatalog() {
    return render(
        createElement(DataCatalog<Row>, {
            data: ROWS,
            columns: COLUMNS,
            renderDetail: (row) => row.name,
            filters: [{ columnId: 'tags', label: 'Tags', mode: 'multi' }],
        })
    );
}

/** Opens the tag filter and returns its option checkboxes. */
function openTags(): HTMLElement[] {
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    return screen.getAllByRole('checkbox');
}

beforeAll(() => {
    globalThis.matchMedia ??= (() => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    })) as never;
});

afterEach(() => {
    cleanup();
    setTestLocale('en');
});

describe('DataCatalog chrome in Russian', () => {
    it('translates the search placeholder, pagination, and navigation labels', () => {
        setTestLocale('ru');
        renderCatalog();
        expect(screen.getByPlaceholderText('Поиск...')).toBeTruthy();
        expect(screen.getByText('Страница 1 из 2')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Предыдущая страница' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Следующая страница' })).toBeTruthy();
        expect(screen.getByRole('row', { name: 'Row 0 — открыть подробности' })).toBeTruthy();
    });

    it('renders the selection count as a Russian plural', () => {
        setTestLocale('ru');
        renderCatalog();
        const boxes = openTags();
        fireEvent.click(boxes[0]);
        expect(screen.getByText('Выбран 1')).toBeTruthy();
        fireEvent.click(boxes[1]);
        fireEvent.click(boxes[2]);
        expect(screen.getByText('Выбрано 3')).toBeTruthy();
    });

    it('translates the clear-search label and the empty state', () => {
        setTestLocale('ru');
        renderCatalog();
        fireEvent.change(screen.getByPlaceholderText('Поиск...'), {
            target: { value: 'нет такой строки' },
        });
        expect(screen.getByRole('button', { name: 'Очистить поиск' })).toBeTruthy();
        expect(screen.getByText('Ничего не найдено.')).toBeTruthy();
    });

    it('translates the detail panel labels', () => {
        setTestLocale('ru');
        renderCatalog();
        act(() => {
            fireEvent.click(screen.getByText('Row 0'));
        });
        expect(
            screen.getByRole('complementary', { name: 'Подробности записи каталога' })
        ).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Закрыть подробности' })).toBeTruthy();
    });

    it('keeps the English chrome in English', () => {
        renderCatalog();
        expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
        expect(screen.getByText('Page 1 of 2')).toBeTruthy();
        const boxes = openTags();
        fireEvent.click(boxes[0]);
        fireEvent.click(boxes[1]);
        expect(screen.getByText('2 selected')).toBeTruthy();
    });

    it('renders catalog headers and filter labels from descriptors', () => {
        setTestLocale('ru');
        render(
            createElement(DataCatalog<(typeof MERITS_FLAWS)[number]>, {
                data: MERITS_FLAWS,
                columns: MERITS_FLAWS_COLUMNS,
                renderDetail: () => null,
                filters: MERITS_FLAWS_FILTERS,
            })
        );
        expect(screen.getByText('Достоинство / недостаток')).toBeTruthy();
        expect(screen.getByRole('combobox', { name: 'Тип' })).toBeTruthy();
        expect(screen.getByRole('combobox', { name: 'Категория' })).toBeTruthy();
    });
});
