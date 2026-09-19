// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CatalogBrowser } from '../../src/sheet_manager/docsEmbeds';
import { CATALOG_BINDINGS } from '../../src/sheet_manager/features/sheet/data/catalogBindings';
import { setTestLocale } from '../stubs/testLocale';

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

describe('catalog browser search', () => {
    it('finds entries by their English book name in the Russian locale', () => {
        setTestLocale('ru');
        const catalog = CATALOG_BINDINGS.get('v5-hunter-weapons')!;
        const [first, second] = catalog.entries;
        render(createElement(CatalogBrowser, { catalogId: 'v5-hunter-weapons' }));
        const russianFirst = catalog.entryLabel(first, 'ru');
        const russianSecond = catalog.entryLabel(second, 'ru');
        expect(russianFirst).not.toBe(first.name);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: first.name } });
        expect(screen.queryAllByText(russianFirst).length).toBeGreaterThan(0);
        expect(screen.queryAllByText(russianSecond)).toHaveLength(0);
    });
});
