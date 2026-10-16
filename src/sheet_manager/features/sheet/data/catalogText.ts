import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useEffect, useState } from 'react';

import { describeError, reportSheetIssue } from '../../../diagnostics';

/**
 * Long catalog fields (summaries, banes, …) that a catalog's English source marks `_lazy`: they
 * are generated into `src/i18n/generated/catalogText/<catalogId>.ts` and loaded on first use, so
 * they stay off the page bundle (spec 037, D9).
 */
export type CatalogText = Readonly<
    Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>
>;

const loaded = new Map<string, CatalogText>();
const pending = new Map<string, Promise<CatalogText | null>>();

/** Loads one catalog's long fields once; `null` when the module is missing (reported). */
export function loadCatalogText(catalogId: string): Promise<CatalogText | null> {
    const cached = loaded.get(catalogId);
    if (cached) return Promise.resolve(cached);
    let request = pending.get(catalogId);
    if (!request) {
        // A relative path with its extension: both webpack and Vite build a chunk per file.
        request = import(`../../../../i18n/generated/catalogText/${catalogId}.ts`)
            .then((module: { default: CatalogText }) => {
                loaded.set(catalogId, module.default);
                return module.default;
            })
            .catch((error: unknown) => {
                pending.delete(catalogId);
                reportSheetIssue({
                    code: 'catalog-unavailable',
                    message: 'Long catalog texts could not be loaded',
                    details: { catalogId, error: describeError(error) },
                });
                return null;
            });
        pending.set(catalogId, request);
    }
    return request;
}

/** Reads a loaded field in a locale, falling back to English. */
export function catalogTextField(
    text: CatalogText | undefined,
    locale: string,
    entryId: string,
    field: string
): string | undefined {
    return text?.[locale]?.[entryId]?.[field] ?? text?.en?.[entryId]?.[field];
}

/**
 * A catalog's long fields in the reader's language: `undefined` while loading, then a reader
 * `(entryId, field) => text`.
 */
export function useCatalogText(
    catalogId: string | undefined
): ((entryId: string, field: string) => string | undefined) | undefined {
    const locale = useDocusaurusContext().i18n.currentLocale;
    const [, setLoads] = useState(0);
    useEffect(() => {
        if (!catalogId || loaded.has(catalogId)) return;
        let active = true;
        void loadCatalogText(catalogId).then((next) => {
            if (active && next) setLoads((count) => count + 1);
        });
        return () => {
            active = false;
        };
    }, [catalogId]);
    const text = catalogId ? loaded.get(catalogId) : undefined;
    if (!text) return undefined;
    return (entryId, field) => catalogTextField(text, locale, entryId, field);
}
