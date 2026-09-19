import { normalizeSearchText } from '@site/src/shared/utils/normalizeSearchText';

import type { CatalogEntry } from '../../../components';
import { bookNameOf, type CatalogBindingEntry } from '../../../systems';
import type { RowsBinding, RowsCatalogParent } from '../../../systems/templateBindings';
import { readDetailValue } from '../data/catalogBindings';

type RowsCatalog = NonNullable<RowsBinding['catalog']>;
type Catalogs = ReadonlyMap<string, CatalogBindingEntry>;

/** A name-column suggestion; `parentId` is set when the catalog declares a parent. */
export interface RowSuggestion extends CatalogEntry {
    parentId?: string;
}

const normalize = normalizeSearchText;

/** Picker name of a parent entry, as a filled cell shows it (the id when the entry is unknown). */
export function parentName(
    catalogs: Catalogs,
    parent: RowsCatalogParent,
    parentId: string,
    locale: string
): string {
    const binding = catalogs.get(parent.catalogId);
    const entry = binding?.entries.find(({ id }) => id === parentId);
    return entry && binding ? binding.pickLabel(entry, locale) : parentId;
}

/** Every entry of the row catalogs, localized; a declared parent's name is the subtitle. */
export function rowSuggestions(
    catalogs: Catalogs,
    catalog: RowsCatalog,
    locale: string
): RowSuggestion[] {
    return catalog.catalogIds.flatMap((catalogId) => {
        const binding = catalogs.get(catalogId);
        return (binding?.entries ?? []).map((entry) => {
            const parentId = catalog.parent
                ? readDetailValue(entry, catalog.parent.entryKey)
                : undefined;
            return {
                id: `${catalogId}/${entry.id}`,
                name: binding!.pickLabel(entry, locale),
                ...(catalog.parent && parentId !== undefined
                    ? {
                          parentId: String(parentId),
                          subtitle: parentName(catalogs, catalog.parent, String(parentId), locale),
                      }
                    : {}),
            };
        });
    });
}

/**
 * Parent entry ids named in `names`: by the English, localized, or picker name, or by the book
 * name in trailing parentheses (`"Мой арсенал (Arsenal)"` names Arsenal).
 */
function parentIdsNamed(
    catalogs: Catalogs,
    parent: RowsCatalogParent,
    names: readonly string[],
    locale: string
): Set<string> {
    const wanted = new Set(
        names
            .flatMap((name) => [name, bookNameOf(name) ?? ''])
            .map(normalize)
            .filter(Boolean)
    );
    const binding = catalogs.get(parent.catalogId);
    const ids = new Set<string>();
    for (const entry of binding?.entries ?? []) {
        const labels = [
            entry.name,
            binding!.entryLabel(entry, locale),
            binding!.pickLabel(entry, locale),
        ];
        if (labels.some((label) => wanted.has(normalize(label)))) ids.add(entry.id);
    }
    return ids;
}

const cellText = (row: Readonly<Record<string, unknown>>, key: string) =>
    typeof row[key] === 'string' ? (row[key] as string) : '';

/**
 * Suggestions for one row: entries of the parents named in the row's parent cell or, when it is
 * empty, in the `namedBy` rows of the document. Unmatched names leave every entry offered.
 */
export function suggestionsForRow(
    catalogs: Catalogs,
    catalog: RowsCatalog,
    all: readonly RowSuggestion[],
    row: Readonly<Record<string, unknown>>,
    data: Readonly<Record<string, unknown>>,
    locale: string
): readonly RowSuggestion[] {
    const parent = catalog.parent;
    if (!parent) return all;
    const own = cellText(row, parent.column);
    const names = own.trim()
        ? [own]
        : parent.namedBy && Array.isArray(data[parent.namedBy.dataKey])
          ? (data[parent.namedBy.dataKey] as Array<Record<string, unknown>>).map((named) =>
                cellText(named, parent.namedBy!.column)
            )
          : [];
    const ids = parentIdsNamed(catalogs, parent, names, locale);
    if (ids.size === 0) return all;
    return all.filter((suggestion) => suggestion.parentId && ids.has(suggestion.parentId));
}
