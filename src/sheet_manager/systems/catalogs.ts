import { localizeCatalogLabel, localizedCatalogField } from '@site/src/data/localizeCatalogEntry';

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
    /**
     * Name offered and written by sheet pickers: outside English it keeps the book name in
     * parentheses ("Арсенал (Arsenal)") so players can match it to the English books.
     */
    pickLabel: (entry: TEntry, lang: string) => string;
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
    /** Localized string list (specialties, scale…); falls back when lengths differ. */
    entryList: (entry: TEntry, key: string, lang: string) => readonly string[] | undefined;
    /** Text matched by picker search: the localized and the English name. */
    pickSearchText: (entry: TEntry, lang: string) => string;
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

/** `localized (English)`, or just the English name when there is no distinct translation. */
export function bookNameLabel(localized: string | undefined, english: string): string {
    return localized && localized !== english ? `${localized} (${english})` : english;
}

/**
 * The book name inside a picked label: `"Арсенал (Arsenal)"` → `"Arsenal"`; `undefined` when the
 * label has no trailing parentheses.
 */
export function bookNameOf(label: string): string | undefined {
    return /\(([^()]+)\)\s*$/.exec(label)?.[1]?.trim() || undefined;
}

/**
 * Localized value of an entry's string property from `<catalogId>.yaml`; English, a missing
 * translation, or an empty one fall back to the entry's own value.
 */
export function catalogEntryText(
    catalogId: string,
    entry: CatalogLike,
    key: string,
    lang: string
): string | undefined {
    const own = (entry as unknown as Record<string, unknown>)[key];
    const fallback = typeof own === 'string' ? own : undefined;
    if (lang === 'en') return fallback;
    const localized = localizedCatalogField(catalogId, entry.id, lang, key);
    return typeof localized === 'string' && localized.length > 0 ? localized : fallback;
}

/** Localized string list of an entry; falls back to the entry's own list when lengths differ. */
export function catalogEntryList(
    catalogId: string,
    entry: CatalogLike,
    key: string,
    lang: string
): readonly string[] | undefined {
    const own = (entry as unknown as Record<string, unknown>)[key];
    const fallback = Array.isArray(own) ? (own as string[]) : undefined;
    if (lang === 'en') return fallback;
    const localized = localizedCatalogField(catalogId, entry.id, lang, key);
    return Array.isArray(localized) && (!fallback || localized.length === fallback.length)
        ? (localized as readonly string[])
        : fallback;
}

/** Label of an enumerated value (`_labels.<field>.<value>`), falling back to the value. */
export function entryEnumLabel(
    catalogId: string,
    field: string,
    value: string,
    lang: string
): string {
    return lang === 'en' ? value : localizeCatalogLabel(catalogId, field, value, lang);
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
    const entryText = (entry: TEntry, key: string, lang: string) =>
        catalogEntryText(catalogId, entry, key, lang);
    return {
        ...(resolveDetails ? { resolveDetails } : {}),
        ...(browse ? { browse } : {}),
        catalogId,
        entries,
        entryText,
        entryList: (entry, key, lang) => catalogEntryList(catalogId, entry, key, lang),
        pickSearchText: (entry, lang) =>
            [entryText(entry, 'name', lang), entry.name].filter(Boolean).join(' '),
        entryLabel: (entry, lang) => entryText(entry, 'name', lang) ?? entry.name,
        pickLabel: (entry, lang) => bookNameLabel(entryText(entry, 'name', lang), entry.name),
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
