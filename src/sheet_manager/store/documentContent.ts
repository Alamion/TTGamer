import { describeError, reportSheetIssue } from '../diagnostics';
import { systemRegistry } from '../systems';
import type { UnknownDocumentEnvelope } from '../types/document';
import {
    applyEntryFields,
    BACKUP_KEY,
    type DocumentIndexEntry,
    isRecordKey,
    LAUNCHES_KEY,
    recordIdOf,
    recordKey,
} from './documentIndex';

/** Where document records live; localForage in the app, a map in tests. */
export interface RecordStorage {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
}

function localForageStorage(): RecordStorage {
    const store = async () => (await import('localforage')).default;
    return {
        get: async (key) => (await store()).getItem(key),
        set: async (key, value) => {
            await (await store()).setItem(key, value);
        },
        remove: async (key) => (await store()).removeItem(key),
        keys: async () => (await store()).keys(),
    };
}

let storage: RecordStorage = localForageStorage();

/** Deleted ids whose records are already removed; a stored copy must not bring them back. */
export const purgedIds = new Set<string>();

/** Documents read from disk and not changed since; they are not written back. */
const cleanEnvelopes = new WeakSet<UnknownDocumentEnvelope>();
export const isCleanEnvelope = (document: UnknownDocumentEnvelope) => cleanEnvelopes.has(document);

function portraitIdOf(document: object): string | undefined {
    if (!('data' in document)) return undefined;
    const { data } = document;
    if (!data || typeof data !== 'object' || !('metadata' in data)) return undefined;
    const { metadata } = data;
    if (!metadata || typeof metadata !== 'object' || !('portraitId' in metadata)) return undefined;
    return typeof metadata.portraitId === 'string' ? metadata.portraitId : undefined;
}

// Page values nest images at most in list entries (values → list → entry → value).
const IMAGE_VALUE_DEPTH = 6;

/**
 * Every device image a document names: its portrait and the images in its page values, list
 * entries included. A blob no document names is never shown again.
 */
export function deviceImageIdsOf(document: unknown): Set<string> {
    const ids = new Set<string>();
    if (!document || typeof document !== 'object') return ids;
    const portraitId = portraitIdOf(document);
    if (portraitId) ids.add(portraitId);
    const visit = (value: unknown, depth: number) => {
        if (depth > IMAGE_VALUE_DEPTH || !value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
            for (const item of value) visit(item, depth + 1);
            return;
        }
        const record = value as Record<string, unknown>;
        if (record.source === 'device' && typeof record.blobId === 'string') {
            ids.add(record.blobId);
            return;
        }
        for (const item of Object.values(record)) visit(item, depth + 1);
    };
    if ('templateValues' in document) visit(document.templateValues, 0);
    return ids;
}

/** Replaces the storage (tests); returns the previous one. */
export function configureRecordStorage(next: RecordStorage): RecordStorage {
    const previous = storage;
    storage = next;
    return previous;
}

/** A storage held in memory, with a way to look at what it keeps. */
export function createMemoryRecordStorage(): RecordStorage & { dump(): Map<string, unknown> } {
    const map = new Map<string, unknown>();
    return {
        get: async (key) => (map.has(key) ? structuredClone(map.get(key)) : null),
        set: async (key, value) => {
            map.set(key, structuredClone(value));
        },
        remove: async (key) => {
            map.delete(key);
        },
        keys: async () => [...map.keys()],
        dump: () => map,
    };
}

/** Records are saved as JSON text, as the whole collection was before (spec 032, D2). */
export async function readRecord(id: string): Promise<unknown> {
    const stored = await storage.get(recordKey(id));
    return typeof stored === 'string' ? (JSON.parse(stored) as unknown) : stored;
}
export const writeRecord = (id: string, document: UnknownDocumentEnvelope) =>
    storage.set(recordKey(id), JSON.stringify(document));
export const removeRecord = (id: string) => storage.remove(recordKey(id));

export async function listRecordIds(): Promise<string[]> {
    return (await storage.keys()).filter(isRecordKey).map(recordIdOf);
}

/**
 * A stored record as an envelope: parsed with its registered definition, and with the fields a
 * library move rewrote on the entry (system, setting, template) applied. `null` when the record
 * is missing or no longer valid; the cause is reported.
 */
export async function readEnvelope(
    id: string,
    entry: DocumentIndexEntry | undefined
): Promise<UnknownDocumentEnvelope | null> {
    let raw: unknown;
    try {
        raw = await readRecord(id);
    } catch (error) {
        reportSheetIssue({
            code: 'document-record-unreadable',
            message: 'A document record could not be read',
            details: { documentId: id, error: describeError(error) },
        });
        return null;
    }
    if (raw === null || raw === undefined) {
        reportSheetIssue({
            code: 'document-record-missing',
            message: 'A document has an index entry but no stored record',
            details: { documentId: id },
        });
        return null;
    }
    try {
        const { envelope } = systemRegistry.parseDocument(raw);
        const applied = entry ? applyEntryFields(envelope, entry) : envelope;
        if (applied === envelope) cleanEnvelopes.add(applied);
        return applied;
    } catch (error) {
        reportSheetIssue({
            code: 'document-record-invalid',
            message: 'A stored document failed validation and was not opened',
            details: { documentId: id, error: describeError(error) },
        });
        return null;
    }
}

export interface RecordWriter {
    schedule(document: UnknownDocumentEnvelope): void;
    flush(): Promise<void>;
    isPending(id: string): boolean;
}

/**
 * Saves changed documents once the current task ends, one write per document however often it
 * changed within it. Saving at once (as the whole collection was before) keeps a reload right after
 * an edit from losing it. A failed write stays queued for the next flush and is reported.
 *
 * The versions to write are taken when the previous write has ended, not when they were scheduled:
 * changes made while a write runs (fast typing in a long note, spec 043) become one write of the
 * latest version instead of a queue of stale ones that delays the latest and a reload cuts short.
 */
export function createRecordWriter({
    delay = 0,
    write = writeRecord,
}: {
    delay?: number;
    write?: (id: string, document: UnknownDocumentEnvelope) => Promise<void>;
} = {}): RecordWriter {
    const pending = new Map<string, UnknownDocumentEnvelope>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running: Promise<void> = Promise.resolve();

    const run = (): Promise<void> => {
        timer = undefined;
        running = running.then(async () => {
            const batch = [...pending];
            pending.clear();
            await Promise.all(
                batch.map(async ([id, document]) => {
                    try {
                        await write(id, document);
                    } catch (error) {
                        // A newer version scheduled meanwhile replaces the failed one.
                        if (!pending.has(id)) pending.set(id, document);
                        reportSheetIssue({
                            code: 'document-write-failed',
                            message: 'A document could not be saved; it stays queued',
                            details: { documentId: id, error: describeError(error) },
                        });
                    }
                })
            );
        });
        return running;
    };

    return {
        schedule(document) {
            pending.set(document.id, document);
            timer ??= setTimeout(() => void run(), delay);
        },
        async flush() {
            if (timer) clearTimeout(timer);
            await run();
        },
        isPending: (id) => pending.has(id),
    };
}

export const recordWriter = createRecordWriter();

/** Clean launches after the migration before the v4 backup is deleted. */
export const BACKUP_CLEAN_LAUNCHES = 2;

export const hasBackup = async () => (await storage.get(BACKUP_KEY)) != null;
export const saveBackup = (raw: unknown) => storage.set(BACKUP_KEY, JSON.stringify(raw));
export const removeBackup = () => storage.remove(BACKUP_KEY);

async function readLaunches(): Promise<number> {
    const value = await storage.get(LAUNCHES_KEY);
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Marks that the migration just ran: the backup waits for two clean launches. */
export const startBackupCountdown = () => storage.set(LAUNCHES_KEY, 0);

/**
 * One clean launch with the v4 backup present counts toward its removal; after the second the
 * backup and the counter are deleted. Returns whether the backup was removed.
 */
export async function countCleanLaunch(): Promise<boolean> {
    if (!(await hasBackup())) {
        await storage.remove(LAUNCHES_KEY);
        return false;
    }
    const launches = (await readLaunches()) + 1;
    if (launches >= BACKUP_CLEAN_LAUNCHES) {
        await removeBackup();
        await storage.remove(LAUNCHES_KEY);
        return true;
    }
    await storage.set(LAUNCHES_KEY, launches);
    return false;
}
