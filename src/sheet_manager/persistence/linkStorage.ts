import { CONTEXT_MAX, LINKS_PER_TEXT_MAX } from '@site/src/shared/markdown/links';
import { z } from 'zod';

/**
 * The link index on the device (spec 044, D3): one record per document that has markdown, in its
 * own localForage store, holding the links its markdown makes as written. Which document a link
 * means is resolved from the document index when it is read, never stored.
 */

export const LINK_RECORD_VERSION = 1;
/** At most this many links are kept per document. */
export const LINKS_PER_DOCUMENT_MAX = LINKS_PER_TEXT_MAX;

export const LinkRowSchema = z.object({
    /** Name and folder path as written (`World/Items/Sword`). */
    reference: z.string().min(1).max(1000),
    section: z.string().max(1000).optional(),
    alias: z.string().max(1000).optional(),
    embed: z.boolean(),
    /** The template value key of the markdown the link is in. */
    key: z.string().min(1).max(128),
    line: z.number().int().nonnegative(),
    context: z.string().max(CONTEXT_MAX),
});

export const LinkRecordSchema = z.object({
    v: z.literal(LINK_RECORD_VERSION),
    links: z.array(LinkRowSchema).max(LINKS_PER_DOCUMENT_MAX),
});

export type LinkRow = z.infer<typeof LinkRowSchema>;
export type LinkRecord = z.infer<typeof LinkRecordSchema>;

export interface LinkStorage {
    get(id: string): Promise<unknown>;
    set(id: string, record: LinkRecord): Promise<void>;
    remove(id: string): Promise<void>;
    /** Every stored record, read with one cursor. */
    iterate(visit: (record: unknown, id: string) => void): Promise<void>;
}

function localForageLinkStorage(): LinkStorage {
    let instance: Promise<LocalForage> | undefined;
    const store = () =>
        (instance ??= import('localforage').then(({ default: localforage }) =>
            localforage.createInstance({ name: 'ttgamer-links', storeName: 'links' })
        ));
    return {
        get: async (id) => (await store()).getItem(id),
        set: async (id, record) => {
            await (await store()).setItem(id, record);
        },
        remove: async (id) => (await store()).removeItem(id),
        iterate: async (visit) => {
            await (
                await store()
            ).iterate((record, id) => {
                visit(record, id);
            });
        },
    };
}

let storage: LinkStorage = localForageLinkStorage();

/** Replaces the storage (tests); returns the previous one. */
export function configureLinkStorage(next: LinkStorage): LinkStorage {
    const previous = storage;
    storage = next;
    return previous;
}

/** A link storage held in memory. */
export function createMemoryLinkStorage(): LinkStorage & { dump(): Map<string, unknown> } {
    const map = new Map<string, unknown>();
    return {
        get: async (id) => (map.has(id) ? structuredClone(map.get(id)) : null),
        set: async (id, record) => {
            map.set(id, structuredClone(record));
        },
        remove: async (id) => {
            map.delete(id);
        },
        iterate: async (visit) => {
            for (const [id, record] of map) visit(structuredClone(record), id);
        },
        dump: () => map,
    };
}

export const readLinkRecord = (id: string) => storage.get(id);
export const writeLinkRecord = (id: string, record: LinkRecord) => storage.set(id, record);
export const removeLinkRecord = (id: string) => storage.remove(id);
export const iterateLinkRecords = (visit: (record: unknown, id: string) => void) =>
    storage.iterate(visit);
