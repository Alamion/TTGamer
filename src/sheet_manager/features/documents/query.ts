import { normalizeSearchText } from '@site/src/shared/utils/normalizeSearchText';

import type { DocumentIndexEntry, Folder } from '../../store/documentIndex';

export type SortKey = 'manual' | 'name' | 'kind' | 'system' | 'created' | 'changed';
/** Documents made or changed within a day, a week, a month, longer ago, or with no known time. */
export type TimePreset = 'day' | 'week' | 'month' | 'older' | 'unknown';

export const SORT_KEYS: readonly SortKey[] = [
    'manual',
    'name',
    'kind',
    'system',
    'created',
    'changed',
];
export const TIME_PRESETS: readonly TimePreset[] = ['day', 'week', 'month', 'older', 'unknown'];

/** What the person asked to see: kept for a visit and applied to the index (spec 032, US3). */
export interface DocumentsQuery {
    text: string;
    kind: string | null;
    system: string | null;
    setting: string | null;
    created: TimePreset | null;
    changed: TimePreset | null;
    sort: SortKey;
    descending: boolean;
}

export const EMPTY_QUERY: DocumentsQuery = {
    text: '',
    kind: null,
    system: null,
    setting: null,
    created: null,
    changed: null,
    sort: 'manual',
    descending: false,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The query of an untrusted stored value; anything unreadable falls back to the empty query. */
export function readQuery(raw: unknown): DocumentsQuery {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_QUERY;
    const value = raw as Record<string, unknown>;
    const text = (key: string) => (typeof value[key] === 'string' ? (value[key] as string) : null);
    const preset = (key: string): TimePreset | null => {
        const found = text(key);
        return TIME_PRESETS.find((candidate) => candidate === found) ?? null;
    };
    return {
        text: text('text') ?? '',
        kind: text('kind'),
        system: text('system'),
        setting: text('setting'),
        created: preset('created'),
        changed: preset('changed'),
        sort: SORT_KEYS.find((candidate) => candidate === value.sort) ?? 'manual',
        descending: value.descending === true,
    };
}

/** Whether a search or a filter narrows the rows (sorting alone does not). */
export const isNarrowing = (query: DocumentsQuery): boolean =>
    normalizeSearchText(query.text) !== '' ||
    query.kind !== null ||
    query.system !== null ||
    query.setting !== null ||
    query.created !== null ||
    query.changed !== null;

/** What a document's labels read as, supplied by the caller so this module knows no registry. */
export interface DocumentLabeler {
    kind: (systemId: string, kind: string) => string;
    system: (systemId: string) => string;
    setting: (systemId: string, kind: string, settingId?: string) => string;
    /** The name the lists show for a document with none of its own. */
    title: (entry: DocumentIndexEntry) => string;
}

export interface Facet {
    value: string;
    label: string;
}

interface Labels {
    name: string;
    /** The name as a search reads it. */
    searchable: string;
    kind: string;
    system: string;
    setting: string;
}

/** What a query needs per entry, worked out once per list of entries (not per keystroke). */
export interface QueryIndex {
    labels: Map<string, Labels>;
    /** `kind`, `system`, and `setting` facets: every distinct value present, by label. */
    kinds: Facet[];
    systems: Facet[];
    settings: Facet[];
}

const byLabel = (a: Facet, b: Facet) => a.label.localeCompare(b.label);

export function buildQueryIndex(
    entries: readonly DocumentIndexEntry[],
    labeler: DocumentLabeler
): QueryIndex {
    const labels = new Map<string, Labels>();
    const kinds = new Map<string, string>();
    const systems = new Map<string, string>();
    const settings = new Map<string, string>();
    const pairs = new Map<string, Pick<Labels, 'kind' | 'system' | 'setting'>>();
    for (const entry of entries) {
        const pairKey = `${entry.systemId}\u0000${entry.kind}\u0000${entry.settingId ?? ''}`;
        let pair = pairs.get(pairKey);
        if (!pair) {
            pair = {
                kind: labeler.kind(entry.systemId, entry.kind),
                system: labeler.system(entry.systemId),
                setting: labeler.setting(entry.systemId, entry.kind, entry.settingId),
            };
            pairs.set(pairKey, pair);
        }
        const name = labeler.title(entry);
        labels.set(entry.id, { name, searchable: normalizeSearchText(name), ...pair });
        if (!kinds.has(entry.kind)) kinds.set(entry.kind, pair.kind);
        if (!systems.has(entry.systemId)) systems.set(entry.systemId, pair.system);
        if (!settings.has(pair.setting)) settings.set(pair.setting, pair.setting);
    }
    const facets = (map: Map<string, string>): Facet[] =>
        [...map].map(([value, label]) => ({ value, label })).sort(byLabel);
    return { labels, kinds: facets(kinds), systems: facets(systems), settings: facets(settings) };
}

/** The preset a time falls in; a missing or unreadable time is `unknown`, never a made-up one. */
export function timePreset(iso: string | undefined, now: number): TimePreset {
    const time = iso ? Date.parse(iso) : Number.NaN;
    if (Number.isNaN(time)) return 'unknown';
    const age = now - time;
    if (age <= DAY_MS) return 'day';
    if (age <= 7 * DAY_MS) return 'week';
    if (age <= 30 * DAY_MS) return 'month';
    return 'older';
}

export interface QueryResult {
    entries: DocumentIndexEntry[];
    folders: Folder[];
    /** Folders that hold a row that stays: shown open while the query narrows the list. */
    open: Set<string>;
    /** Documents that match; folders kept only as a path to them are not counted. */
    matches: number;
}

/**
 * The rows that stay for a query. A document stays when it passes every filter and its name
 * matches, or it sits inside a folder whose own name matches; a folder stays when its name matches
 * or it holds a row that stays. Without a narrowing query everything stays.
 */
export function applyQuery(
    entries: readonly DocumentIndexEntry[],
    folders: readonly Folder[],
    query: DocumentsQuery,
    index: QueryIndex,
    now: number
): QueryResult {
    if (!isNarrowing(query)) {
        return {
            entries: [...entries],
            folders: [...folders],
            open: new Set(),
            matches: entries.length,
        };
    }
    const hasText = normalizeSearchText(query.text) !== '';
    const folderById = new Map(folders.map((folder) => [folder.id, folder]));
    const parentOf = (parentId: string | null) =>
        parentId !== null ? folderById.get(parentId) : undefined;
    const parts = normalizeSearchText(query.text).split(/\s+/).filter(Boolean);
    const nameMatches = (searchable: string) => parts.every((part) => searchable.includes(part));
    const folderMatch = new Map<string, boolean>();
    for (const folder of folders) {
        folderMatch.set(folder.id, hasText && nameMatches(normalizeSearchText(folder.name)));
    }

    /** Whether this folder or one above it matches the text by its own name. */
    const insideMatch = (folderId: string | null): boolean => {
        const seen = new Set<string>();
        let at = parentOf(folderId);
        while (at && !seen.has(at.id)) {
            if (folderMatch.get(at.id)) return true;
            seen.add(at.id);
            at = parentOf(at.parentId);
        }
        return false;
    };

    const keptEntries: DocumentIndexEntry[] = [];
    const keptFolders = new Set<string>();
    const open = new Set<string>();
    const keepPath = (parentId: string | null) => {
        const seen = new Set<string>();
        let at = parentOf(parentId);
        while (at && !seen.has(at.id)) {
            keptFolders.add(at.id);
            open.add(at.id);
            seen.add(at.id);
            at = parentOf(at.parentId);
        }
    };
    for (const entry of entries) {
        const labels = index.labels.get(entry.id);
        if (!labels) continue;
        if (query.kind !== null && entry.kind !== query.kind) continue;
        if (query.system !== null && entry.systemId !== query.system) continue;
        if (query.setting !== null && labels.setting !== query.setting) continue;
        if (query.created !== null && timePreset(entry.createdAt, now) !== query.created) continue;
        if (query.changed !== null && timePreset(entry.changedAt, now) !== query.changed) continue;
        if (hasText && !nameMatches(labels.searchable) && !insideMatch(entry.parentId)) continue;
        keptEntries.push(entry);
        keepPath(entry.parentId);
    }
    const matches = keptEntries.length;
    for (const folder of folders) {
        if (!folderMatch.get(folder.id)) continue;
        keptFolders.add(folder.id);
        keepPath(folder.parentId);
    }
    return {
        entries: keptEntries,
        folders: folders.filter((folder) => keptFolders.has(folder.id)),
        open,
        matches,
    };
}

type Compare<T> = (a: T, b: T) => number;

export interface RowOrder {
    folders: Compare<Folder>;
    documents: Compare<DocumentIndexEntry>;
}

const byRank = <T extends { rank: number }>(a: T, b: T) => a.rank - b.rank;

/** Times compare by date; a row with no time goes last in either direction. */
function compareTimes(a: string | undefined, b: string | undefined, descending: boolean): number {
    const left = a ? Date.parse(a) : Number.NaN;
    const right = b ? Date.parse(b) : Number.NaN;
    if (Number.isNaN(left) || Number.isNaN(right)) {
        return Number.isNaN(left) === Number.isNaN(right) ? 0 : Number.isNaN(left) ? 1 : -1;
    }
    return descending ? right - left : left - right;
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

/** How rows order inside a folder for a query; folders always come before documents. */
export function orderFor(query: DocumentsQuery, index: QueryIndex): RowOrder {
    if (query.sort === 'manual') return { folders: byRank, documents: byRank };
    const sign = query.descending ? -1 : 1;
    const text = collator.compare;
    const nameOf = (entry: DocumentIndexEntry) => index.labels.get(entry.id)?.name ?? entry.name;
    const field = (entry: DocumentIndexEntry, key: 'kind' | 'system') =>
        index.labels.get(entry.id)?.[key] ?? '';
    const documents: Compare<DocumentIndexEntry> = (a, b) => {
        let result = 0;
        if (query.sort === 'name') result = sign * text(nameOf(a), nameOf(b));
        else if (query.sort === 'kind' || query.sort === 'system') {
            result = sign * text(field(a, query.sort), field(b, query.sort));
        } else if (query.sort === 'created') {
            result = compareTimes(a.createdAt, b.createdAt, query.descending);
        } else if (query.sort === 'changed') {
            result = compareTimes(a.changedAt, b.changedAt, query.descending);
        }
        return result || text(nameOf(a), nameOf(b)) || byRank(a, b);
    };
    const folders: Compare<Folder> = (a, b) => {
        let result = 0;
        if (query.sort === 'name') result = sign * text(a.name, b.name);
        else if (query.sort === 'created') {
            result = compareTimes(a.createdAt, b.createdAt, query.descending);
        } else if (query.sort === 'changed') {
            result = compareTimes(a.changedAt, b.changedAt, query.descending);
        }
        return result || text(a.name, b.name) || byRank(a, b);
    };
    return { folders, documents };
}
