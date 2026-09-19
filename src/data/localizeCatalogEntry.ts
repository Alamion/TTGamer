import {
    type CatalogFieldValue,
    type CatalogTranslations,
    catalogTranslations,
} from '@site/src/i18n/generated/catalogTranslations';

const translations: CatalogTranslations = catalogTranslations;

/** Reserved entry id of a catalog translation file holding enumerated value labels. */
const LABELS_KEY = '_labels';

export function localizeCatalogEntry<T extends Record<string, unknown>>(
    catalog: string,
    id: string,
    locale: string,
    fallback: T
): T {
    const localized = translations[locale]?.[catalog]?.[id];
    return localized ? ({ ...fallback, ...localized } as T) : fallback;
}

/** Localized value of one catalog field, or `undefined` when the locale has none. */
export function localizedCatalogField(
    catalog: string,
    id: string,
    locale: string,
    key: string
): CatalogFieldValue | undefined {
    return translations[locale]?.[catalog]?.[id]?.[key];
}

/**
 * Label of an enumerated value (category, era, tag…) from the catalog's `_labels` map, falling
 * back to the raw value.
 */
export function localizeCatalogLabel(
    catalog: string,
    field: string,
    value: string,
    locale: string
): string {
    const labels = translations[locale]?.[catalog]?.[LABELS_KEY]?.[field];
    if (typeof labels !== 'object' || labels === null || Array.isArray(labels)) return value;
    const label = (labels as Readonly<Record<string, CatalogFieldValue>>)[value];
    return typeof label === 'string' && label.length > 0 ? label : value;
}
