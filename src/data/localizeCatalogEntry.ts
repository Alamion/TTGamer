import {
    type CatalogTranslations,
    catalogTranslations,
} from '@site/src/i18n/generated/catalogTranslations';

const translations: CatalogTranslations = catalogTranslations;

export function localizeCatalogEntry<T extends Record<string, unknown>>(
    catalog: string,
    id: string,
    locale: string,
    fallback: T
): T {
    const localized = translations[locale]?.[catalog]?.[id];
    return localized ? ({ ...fallback, ...localized } as T) : fallback;
}
