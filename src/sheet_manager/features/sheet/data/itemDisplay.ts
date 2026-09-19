import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useCallback } from 'react';

import { catalogEntryText, type CatalogLike } from '../../../systems/catalogs';
import { EQUIPMENT_SOURCES, type EquipmentSourceId, parseEntryRef } from './bodyEquipmentCatalogs';
import { CATALOG_BINDINGS } from './catalogBindings';

function referencedEntry(entryRef: string | undefined) {
    const ref = parseEntryRef(entryRef);
    if (!ref) return undefined;
    const entries: readonly CatalogLike[] | undefined =
        EQUIPMENT_SOURCES[ref.catalogId as EquipmentSourceId] ??
        CATALOG_BINDINGS.get(ref.catalogId)?.entries;
    const entry = entries?.find((candidate) => candidate.id === ref.entryId);
    return entry ? { catalogId: ref.catalogId, entry } : undefined;
}

/**
 * Display name of an equipment item (FR-015): an item picked from a catalog shows the entry's
 * name in the reader's language while the stored name is empty or still the English entry
 * name; a name the user typed is always shown as typed.
 */
export function resolveItemName(
    stored: string,
    entryRef: string | undefined,
    locale: string
): string {
    const found = referencedEntry(entryRef);
    if (!found || (stored && stored !== found.entry.name)) return stored;
    return catalogEntryText(found.catalogId, found.entry, 'name', locale) ?? found.entry.name;
}

/** `resolveItemName` bound to the current locale. */
export function useItemName() {
    const locale = useDocusaurusContext().i18n.currentLocale;
    return useCallback(
        (stored: string, entryRef: string | undefined) => resolveItemName(stored, entryRef, locale),
        [locale]
    );
}
