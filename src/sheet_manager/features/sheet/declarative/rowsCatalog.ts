import { normalizeSearchText } from '@site/src/shared/utils/normalizeSearchText';

import type { CatalogEntry } from '../../../components/controls/CatalogSuggest';
import { bookNameOf, type CatalogBindingEntry } from '../../../systems';
import type { RowsBinding, RowsCatalogParent } from '../../../systems/templateBindings';
import type { LimitByParent } from '../../../types/template';
import { readDetailValue } from '../data/catalogBindings';

type RowsCatalog = NonNullable<RowsBinding['catalog']>;
type Catalogs = Pick<ReadonlyMap<string, CatalogBindingEntry>, 'get'>;

/** A name-column suggestion; `parentId` is set when the catalog declares a parent. */
export interface RowSuggestion extends CatalogEntry {
    parentId?: string;
    /** The entry's level when the page limits rows by their parent. */
    level?: number;
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
    locale: string,
    limit?: LimitByParent
): RowSuggestion[] {
    return catalog.catalogIds.flatMap((catalogId) => {
        const binding = catalogs.get(catalogId);
        return (binding?.entries ?? []).map((entry) => {
            const parentId = catalog.parent
                ? readDetailValue(entry, catalog.parent.entryKey)
                : undefined;
            const level = limit ? Number(readDetailValue(entry, limit.entryKey)) : NaN;
            return {
                id: `${catalogId}/${entry.id}`,
                name: binding!.pickLabel(entry, locale),
                ...(Number.isFinite(level) ? { level } : {}),
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
    return entryIdsNamed(catalogs, parent.catalogId, names, locale);
}

/**
 * Entry ids of a catalog named in `names`: by the English, localized, or picker name, or by the
 * book name in trailing parentheses.
 */
export function entryIdsNamed(
    catalogs: Catalogs,
    catalogId: string,
    names: readonly string[],
    locale: string
): Set<string> {
    const wanted = new Set(
        names
            .flatMap((name) => [name, bookNameOf(name) ?? ''])
            .map(normalize)
            .filter(Boolean)
    );
    const binding = catalogs.get(catalogId);
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

const namedRecords = (parent: RowsCatalogParent, data: Readonly<Record<string, unknown>>) =>
    parent.namedBy && Array.isArray(data[parent.namedBy.dataKey])
        ? (data[parent.namedBy.dataKey] as Array<Record<string, unknown>>)
        : [];

/** Dots of each parent named on the sheet, by parent entry id (the highest when named twice). */
function parentValues(
    catalogs: Catalogs,
    parent: RowsCatalogParent,
    limit: LimitByParent | undefined,
    data: Readonly<Record<string, unknown>>,
    locale: string
): Map<string, { name: string; value: number }> {
    const values = new Map<string, { name: string; value: number }>();
    if (!limit || !parent.namedBy) return values;
    for (const record of namedRecords(parent, data)) {
        const name = cellText(record, parent.namedBy.column);
        const value = Number(record[limit.parentValue]);
        if (!name.trim() || !Number.isFinite(value)) continue;
        for (const id of parentIdsNamed(catalogs, parent, [name], locale)) {
            const known = values.get(id);
            if (!known || known.value < value) values.set(id, { name, value });
        }
    }
    return values;
}

/**
 * The parent a stored row exceeds (its level above the parent's dots on the sheet), or `null`
 * — also when the parent is typed freely or has no dots on the sheet.
 */
export function rowAboveLimit(
    catalogs: Catalogs,
    catalog: RowsCatalog,
    limit: LimitByParent | undefined,
    row: Readonly<Record<string, unknown>>,
    data: Readonly<Record<string, unknown>>,
    locale: string
): { parent: string; dots: number } | null {
    const parent = catalog.parent;
    if (!parent || !limit) return null;
    const level = Number(cellText(row, limit.column));
    if (!Number.isFinite(level) || level <= 0) return null;
    const values = parentValues(catalogs, parent, limit, data, locale);
    for (const id of parentIdsNamed(catalogs, parent, [cellText(row, parent.column)], locale)) {
        const known = values.get(id);
        if (known && level > known.value) return { parent: known.name, dots: known.value };
    }
    return null;
}

/**
 * Suggestions for one row: entries of the parents named in the row's parent cell or, when it is
 * empty, in the `namedBy` rows of the document. Unmatched names leave every entry offered.
 */
export function suggestionsForRow(
    catalogs: Catalogs,
    catalog: RowsCatalog,
    limit: LimitByParent | undefined,
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
        : namedRecords(parent, data).map((named) => cellText(named, parent.namedBy!.column));
    const ids = parentIdsNamed(catalogs, parent, names, locale);
    if (ids.size === 0) return all;
    const values = parentValues(catalogs, parent, limit, data, locale);
    return all.filter((suggestion) => {
        if (!suggestion.parentId || !ids.has(suggestion.parentId)) return false;
        const dots = values.get(suggestion.parentId)?.value;
        return dots === undefined || suggestion.level === undefined || suggestion.level <= dots;
    });
}
