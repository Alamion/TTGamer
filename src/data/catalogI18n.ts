import { translate } from '@docusaurus/Translate';
import type { CatalogMessageDescriptor } from '@site/src/shared/components/DataCatalog';
import { useLocale } from '@site/src/shared/hooks/useLocale';
import {
    catalogEntryList,
    catalogEntryText,
    type CatalogLike,
    entryEnumLabel,
} from '@site/src/sheet_manager/systems/catalogs';
import type { ColumnMeta } from '@tanstack/react-table';
import { useMemo } from 'react';

/**
 * Locale helpers for the documentation catalog tables (`*Config.tsx`). Headers and labels are
 * translation descriptors; entry text comes from the catalog translations and falls back to
 * the English record.
 */

/** A column header translated when the table renders. */
export function columnHeader(message: CatalogMessageDescriptor): () => string {
    return () => translate(message);
}

/** Column meta: the table shows, sorts, and searches `key` in the reader's locale. */
export function localizedTextMeta<T>(catalogId: string, key: string): ColumnMeta<T, unknown> {
    return {
        localizedText: (row, locale) =>
            catalogEntryText(catalogId, row as unknown as CatalogLike, key, locale),
    };
}

/** Column meta: enumerated values (`_labels.<field>`) are shown, filtered, and searched by label. */
export function enumLabelMeta<T>(catalogId: string, field: string): ColumnMeta<T, unknown> {
    return { valueLabel: (value, locale) => entryEnumLabel(catalogId, field, value, locale) };
}

export interface CatalogLocaleText {
    locale: string;
    /** Localized string property of an entry (English fallback, `''` when absent). */
    text: (entry: object, key: string) => string;
    /** Localized string list of an entry (English fallback, `[]` when absent). */
    list: (entry: object, key: string) => readonly string[];
    /** Label of an enumerated value of `field`. */
    label: (field: string, value: string) => string;
}

/** Entry text of `catalogId` in the reader's locale, for detail panels and cells. */
export function useCatalogText(catalogId: string): CatalogLocaleText {
    const locale = useLocale();
    return useMemo(
        () => ({
            locale,
            text: (entry, key) =>
                catalogEntryText(catalogId, entry as CatalogLike, key, locale) ?? '',
            list: (entry, key) =>
                catalogEntryList(catalogId, entry as CatalogLike, key, locale) ?? [],
            label: (field, value) => entryEnumLabel(catalogId, field, value, locale),
        }),
        [catalogId, locale]
    );
}
