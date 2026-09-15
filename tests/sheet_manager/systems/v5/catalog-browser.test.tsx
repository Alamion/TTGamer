// @vitest-environment jsdom

import { catalogTranslations } from '@site/src/i18n/generated/catalogTranslations';
import { CatalogBrowser } from '@site/src/sheet_manager/docsEmbeds';
import { CATALOG_BINDINGS } from '@site/src/sheet_manager/features/sheet/data/catalogBindings';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

afterEach(cleanup);

beforeAll(() => {
    globalThis.matchMedia ??= (() => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    })) as never;
});

const BROWSABLE = [
    'v5-hunter-edges',
    'v5-hunter-advantages',
    'v5-hunter-weapons',
    'v5-hunter-armor',
    'v5-hunter-gear',
];

describe('hunter documentation catalogs', () => {
    it('declares a browse view and Russian names for every documented catalog', () => {
        for (const catalogId of BROWSABLE) {
            const catalog = CATALOG_BINDINGS.get(catalogId)!;
            expect(catalog.browse, catalogId).toBeDefined();
            for (const entry of catalog.entries) {
                expect(catalog.entryLabel(entry, 'ru'), `${catalogId}/${entry.id}`).not.toBe('');
                expect(
                    (catalogTranslations.ru as Record<string, Record<string, unknown>>)[
                        catalogId
                    ]?.[entry.id],
                    `${catalogId}/${entry.id} ru`
                ).toBeDefined();
            }
        }
    });

    it('keeps advantage polarity consistent with the entry type', () => {
        for (const entry of CATALOG_BINDINGS.get('v5-hunter-advantages')!.entries) {
            const { type, polarity } = entry as unknown as { type: string; polarity: string };
            expect(polarity, entry.id).toBe(type === 'flaw' ? 'negative' : 'positive');
        }
    });

    it('renders a catalog as a searchable table', () => {
        render(createElement(CatalogBrowser, { catalogId: 'v5-hunter-weapons' }));
        expect(screen.getByPlaceholderText('Search the catalog...')).toBeTruthy();
        expect(screen.getAllByText('Heavy gunshot').length).toBeGreaterThan(0);
    });
});
