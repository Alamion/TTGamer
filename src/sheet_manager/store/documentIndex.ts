import { z } from 'zod';

import type { UnknownDocumentEnvelope } from '../types/document';

const id = z.string().min(1).max(128);
const identifier = z.string().min(1).max(64);
const isoTime = z.string().min(1).max(40);

/**
 * The light record of one document (spec 032, D1): what the library, the pickers, and the
 * documents window read without opening the document. Name, kind, system, setting, and template
 * mirror the envelope; place, rank, and times exist only here, so the envelope, the export file,
 * and the cloud contract do not change.
 */
export const DocumentIndexEntrySchema = z.object({
    id,
    name: z.string().max(200),
    kind: identifier,
    systemId: identifier,
    definitionId: identifier,
    settingId: identifier.optional(),
    templateId: identifier.optional(),
    parentId: id.nullable(),
    rank: z.number().finite(),
    createdAt: isoTime.optional(),
    changedAt: isoTime.optional(),
    /** Epoch milliseconds of the last change to this record; the newer one wins a merge. */
    updatedAt: z.number().int().nonnegative(),
});

export const FolderSchema = z.object({
    id,
    name: z.string().min(1).max(200),
    parentId: id.nullable(),
    rank: z.number().finite(),
    createdAt: isoTime,
    changedAt: isoTime,
    updatedAt: z.number().int().nonnegative(),
});

export type DocumentIndexEntry = z.infer<typeof DocumentIndexEntrySchema>;
export type Folder = z.infer<typeof FolderSchema>;

export const BACKUP_KEY = 'universal-character-storage:v4-backup';
export const LAUNCHES_KEY = 'meta:v4-backup-launches';
const RECORD_PREFIX = 'doc:';

export const recordKey = (documentId: string) => `${RECORD_PREFIX}${documentId}`;
export const isRecordKey = (key: string) => key.startsWith(RECORD_PREFIX);
export const recordIdOf = (key: string) => key.slice(RECORD_PREFIX.length);

/** The entry of an envelope; place and times carry over from the previous entry. */
export function entryOf(
    document: UnknownDocumentEnvelope,
    previous: DocumentIndexEntry | undefined,
    times: { createdAt?: string; changedAt?: string },
    now: number
): DocumentIndexEntry {
    const { metadata } = document;
    return {
        id: document.id,
        name: metadata.title,
        kind: document.kind,
        systemId: document.systemId,
        definitionId: document.definitionId,
        ...(metadata.settingId ? { settingId: metadata.settingId } : {}),
        ...(metadata.templateId ? { templateId: metadata.templateId } : {}),
        parentId: previous?.parentId ?? null,
        rank: previous?.rank ?? 0,
        ...((times.createdAt ?? previous?.createdAt)
            ? { createdAt: times.createdAt ?? previous?.createdAt }
            : {}),
        ...((times.changedAt ?? previous?.changedAt)
            ? { changedAt: times.changedAt ?? previous?.changedAt }
            : {}),
        updatedAt: now,
    };
}

/** Whether two entries say the same thing (the merge stamp is ignored). */
export function sameEntry(a: DocumentIndexEntry, b: DocumentIndexEntry): boolean {
    return (
        a.id === b.id &&
        a.name === b.name &&
        a.kind === b.kind &&
        a.systemId === b.systemId &&
        a.definitionId === b.definitionId &&
        a.settingId === b.settingId &&
        a.templateId === b.templateId &&
        a.parentId === b.parentId &&
        a.rank === b.rank &&
        a.createdAt === b.createdAt &&
        a.changedAt === b.changedAt
    );
}

/** The envelope fields a library move rewrites without opening the document (spec 013). */
export function applyEntryFields(
    document: UnknownDocumentEnvelope,
    entry: DocumentIndexEntry
): UnknownDocumentEnvelope {
    const { settingId, templateId, ...rest } = document.metadata;
    const unchanged =
        document.systemId === entry.systemId &&
        settingId === entry.settingId &&
        templateId === entry.templateId;
    if (unchanged) return document;
    return {
        ...document,
        systemId: entry.systemId as UnknownDocumentEnvelope['systemId'],
        metadata: {
            ...rest,
            ...(entry.settingId ? { settingId: entry.settingId } : {}),
            ...(entry.templateId ? { templateId: entry.templateId } : {}),
        },
    };
}

/**
 * Two lists of records by id: the left order first, then what only the right holds; the newer
 * `updatedAt` wins a clash (a tie keeps the left one); `removed` ids are dropped (D13).
 */
export function mergeById<T extends { id: string; updatedAt: number }>(
    left: readonly T[],
    right: readonly T[],
    removed: ReadonlySet<string> = new Set()
): T[] {
    const rightById = new Map(right.map((item) => [item.id, item]));
    const merged: T[] = [];
    const seen = new Set<string>();
    for (const item of left) {
        if (removed.has(item.id) || seen.has(item.id)) continue;
        seen.add(item.id);
        const other = rightById.get(item.id);
        merged.push(other && other.updatedAt > item.updatedAt ? other : item);
    }
    for (const item of right) {
        if (removed.has(item.id) || seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
    }
    return merged;
}

/** The valid entries of an untrusted list; the rest are counted so the caller can report them. */
export function parseEntries(raw: unknown): { entries: DocumentIndexEntry[]; dropped: number } {
    if (!Array.isArray(raw)) return { entries: [], dropped: 0 };
    const entries: DocumentIndexEntry[] = [];
    let dropped = 0;
    for (const item of raw) {
        const parsed = DocumentIndexEntrySchema.safeParse(item);
        if (parsed.success) entries.push(parsed.data);
        else dropped += 1;
    }
    return { entries, dropped };
}

export function parseFolders(raw: unknown): { folders: Folder[]; dropped: number } {
    if (!Array.isArray(raw)) return { folders: [], dropped: 0 };
    const folders: Folder[] = [];
    let dropped = 0;
    for (const item of raw) {
        const parsed = FolderSchema.safeParse(item);
        if (parsed.success) folders.push(parsed.data);
        else dropped += 1;
    }
    return { folders, dropped };
}

/** Rank for a record that goes last among all entries. */
export const nextRank = (entries: readonly DocumentIndexEntry[]): number =>
    entries.reduce((highest, { rank }) => Math.max(highest, rank), 0) + 1;

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const idList = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * The slim state about to be saved, merged with what another tab saved meanwhile (D13): entries
 * join by id with the newer stamp winning, an id this tab deleted stays deleted, and an id a
 * stored tombstone names comes back only when this tab still holds its entry (an undo here).
 * `purged` lists tombstones already carried out, which must not return from the stored copy.
 */
export function mergeStoredValue(
    stored: string | null,
    next: string,
    purged: ReadonlySet<string>
): string {
    if (!stored) return next;
    try {
        const before: unknown = JSON.parse(stored);
        const after: unknown = JSON.parse(next);
        if (!isRecord(before) || !isRecord(after)) return next;
        if (before.version !== after.version) return next;
        const storedState = before.state;
        const nextState = after.state;
        if (!isRecord(storedState) || !isRecord(nextState)) return next;
        const nextEntries = parseEntries(nextState.entries).entries;
        const nextFolders = parseFolders(nextState.folders).folders;
        const held = new Set([...nextEntries, ...nextFolders].map(({ id }) => id));
        const pendingHere = idList(nextState.pendingPurge);
        const carried = idList(storedState.pendingPurge).filter(
            (id) => !purged.has(id) && !held.has(id)
        );
        const pendingPurge = [...new Set([...pendingHere, ...carried])];
        const entries = mergeById(
            nextEntries,
            parseEntries(storedState.entries).entries,
            new Set(pendingPurge)
        );
        const folders = mergeById(
            nextFolders,
            parseFolders(storedState.folders).folders,
            new Set(pendingPurge)
        );
        return JSON.stringify({
            ...after,
            state: { ...nextState, entries, folders, pendingPurge },
        });
    } catch {
        return next;
    }
}

/**
 * An entry in the shape of a document for code that reads only a document's identity, kind,
 * place in the library, and name (pickers, library counts, retargeting).
 */
export interface DocumentRef {
    id: string;
    kind: string;
    systemId: string;
    definitionId: string;
    metadata: { title: string; settingId?: string; templateId?: string };
}

export function refOf(document: UnknownDocumentEnvelope): DocumentRef {
    const { metadata } = document;
    return {
        id: document.id,
        kind: document.kind,
        systemId: document.systemId,
        definitionId: document.definitionId,
        metadata: {
            title: metadata.title,
            ...(metadata.settingId ? { settingId: metadata.settingId } : {}),
            ...(metadata.templateId ? { templateId: metadata.templateId } : {}),
        },
    };
}

const refsByEntries = new WeakMap<readonly DocumentIndexEntry[], DocumentRef[]>();

/** The refs of every entry; the list is rebuilt only when the entries list itself changes. */
export function documentRefs(entries: readonly DocumentIndexEntry[]): DocumentRef[] {
    let refs = refsByEntries.get(entries);
    if (!refs) {
        refs = entries.map((entry) => ({
            id: entry.id,
            kind: entry.kind,
            systemId: entry.systemId,
            definitionId: entry.definitionId,
            metadata: {
                title: entry.name,
                ...(entry.settingId ? { settingId: entry.settingId } : {}),
                ...(entry.templateId ? { templateId: entry.templateId } : {}),
            },
        }));
        refsByEntries.set(entries, refs);
    }
    return refs;
}
