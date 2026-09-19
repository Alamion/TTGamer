import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useEffect, useMemo } from 'react';

import type { CatalogEntry } from '../../../components';
import { reportSheetIssue } from '../../../diagnostics';
import { CATALOG_BINDINGS } from '../data/catalogBindings';

/**
 * Localized suggestion entries of a catalog for free-text inputs (names only; picking one just
 * writes its name). An unregistered catalog reports `catalog-unavailable` once.
 */
export function useCatalogSuggestions(catalogId: string | undefined): CatalogEntry[] {
    const locale = useDocusaurusContext().i18n.currentLocale;
    const catalog = catalogId ? CATALOG_BINDINGS.get(catalogId) : undefined;
    const missing = Boolean(catalogId) && !catalog;

    useEffect(() => {
        if (!missing) return;
        reportSheetIssue({
            code: 'catalog-unavailable',
            message: 'Suggestions reference a catalog that is not registered',
            details: { catalogId },
        });
    }, [catalogId, missing]);

    return useMemo(
        () =>
            (catalog?.entries ?? []).map((entry) => ({
                id: entry.id,
                name: catalog!.pickLabel(entry, locale),
            })),
        [catalog, locale]
    );
}
