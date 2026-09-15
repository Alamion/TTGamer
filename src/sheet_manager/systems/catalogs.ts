import { localizeCatalogEntry } from '@site/src/data/localizeCatalogEntry';

/**
 * Catalog definition primitives (system-neutral). A catalog is a code-owned list of entries a
 * template can suggest and copy from; plugins declare their catalogs on `SystemPlugin.catalogs`
 * and `features/sheet/data/catalogBindings.ts` aggregates them. Templates persist only ids.
 */

export type CatalogFillKind = 'text' | 'number' | 'boolean' | 'rows';

export interface CatalogFillableDetail {
    key: string;
    kind: CatalogFillKind;
    label: string;
}

export type CatalogDetailRow = Readonly<Record<string, string | number | boolean>>;

export type CatalogDetailValue = string | number | boolean | null | readonly CatalogDetailRow[];

/** Translation descriptor as generated in `uiMessages`. */
export interface CatalogMessage {
    id: string;
    message: string;
}

/**
 * One column of a catalog's documentation browser. The value is the entry property `key`:
 * a translation descriptor is translated, a value listed in `labels` shows its label, other
 * strings localize through the catalog translations (`<catalogId>.yaml`, same key).
 */
export interface CatalogBrowseColumn {
    key: string;
    header: CatalogMessage;
    labels?: Readonly<Record<string, CatalogMessage>>;
    /** Offer a filter over this column's values. */
    filter?: boolean;
    /** Only in the detail panel, not as a table column. */
    detailOnly?: boolean;
}

/** How documentation pages browse a catalog (searchable table with filters and details). */
export interface CatalogBrowse {
    columns: readonly CatalogBrowseColumn[];
    /** Child entries listed in the detail panel: entries of `catalogId` whose `key` is this id. */
    children?: { catalogId: string; key: string; header: CatalogMessage };
}

export interface CatalogLike {
    id: string;
    name: string;
}

export interface CatalogBindingEntry<TEntry extends CatalogLike = CatalogLike> {
    catalogId: string;
    entries: readonly TEntry[];
    entryLabel: (entry: TEntry, lang: string) => string;
    fillableDetails: readonly CatalogFillableDetail[];
    /** Suggested default: every declared detail starts offered; `''` = author picks a target. */
    defaultMapping: Readonly<Record<string, string>>;
    /**
     * Sheet-ready detail values (converted by the owning system). Without it, details are the
     * entry's own scalar properties. `undefined` = leave the target untouched, `null` = clear it.
     */
    resolveDetails?: (entry: TEntry) => Readonly<Record<string, CatalogDetailValue | undefined>>;
    /** Localized value of a string property (English falls back to the entry's own value). */
    entryText: (entry: TEntry, key: string, lang: string) => string | undefined;
    browse?: CatalogBrowse;
}

export function rowsDetail(key: string, label: string): CatalogFillableDetail {
    return { key, kind: 'rows', label };
}

export function booleanDetail(key: string, label: string): CatalogFillableDetail {
    return { key, kind: 'boolean', label };
}

export function textDetail(key: string, label: string): CatalogFillableDetail {
    return { key, kind: 'text', label };
}

export function numberDetail(key: string, label: string): CatalogFillableDetail {
    return { key, kind: 'number', label };
}

/**
 * Declares a catalog. Entry names localize through the catalog translations generated from
 * `translations/source/<locale>/data/<catalogId>.yaml` (`<entryId>.name`); English falls back to
 * the entry's own name.
 */
export function defineCatalog<TEntry extends CatalogLike>(
    catalogId: string,
    entries: readonly TEntry[],
    fillableDetails: readonly CatalogFillableDetail[],
    resolveDetails?: CatalogBindingEntry<TEntry>['resolveDetails'],
    browse?: CatalogBrowse
): CatalogBindingEntry<TEntry> {
    const entryText = (entry: TEntry, key: string, lang: string) => {
        const own = (entry as unknown as Record<string, unknown>)[key];
        const fallback = typeof own === 'string' ? own : undefined;
        if (lang === 'en') return fallback;
        const localized = localizeCatalogEntry<Record<string, unknown>>(catalogId, entry.id, lang, {
            [key]: fallback,
        })[key];
        return typeof localized === 'string' && localized.length > 0 ? localized : fallback;
    };
    return {
        ...(resolveDetails ? { resolveDetails } : {}),
        ...(browse ? { browse } : {}),
        catalogId,
        entries,
        entryText,
        entryLabel: (entry, lang) => entryText(entry, 'name', lang) ?? entry.name,
        fillableDetails,
        defaultMapping: Object.fromEntries(fillableDetails.map((detail) => [detail.key, ''])),
    };
}

/** Erases a catalog's entry type for registry storage (plugins declare heterogeneous catalogs). */
export function anyCatalog<TEntry extends CatalogLike>(
    catalog: CatalogBindingEntry<TEntry>
): CatalogBindingEntry {
    return catalog as unknown as CatalogBindingEntry;
}
