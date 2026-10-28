import { linkName, type LinkTarget } from '@site/src/shared/markdown/links';

import type { DocumentIndexEntry, Folder } from '../../store/documentIndex';

/**
 * Which document a `[[link]]` means (spec 044, D1): a pure function of the index and the link's
 * place, so nothing stored goes stale. Among documents of the written name (and folder path, when
 * written), the one sharing the most leading folders with the link's document wins, then the
 * earliest created.
 */

/** Folders above a document never go deeper than the tree allows (operations.ts, depth 32). */
const FOLDER_DEPTH_MAX = 32;

export interface LinkBuckets {
    entries: readonly DocumentIndexEntry[];
    byId: ReadonlyMap<string, DocumentIndexEntry>;
    byName: ReadonlyMap<string, readonly DocumentIndexEntry[]>;
    folders: ReadonlyMap<string, Folder>;
}

let cached:
    | { entries: readonly DocumentIndexEntry[]; folders: readonly Folder[]; buckets: LinkBuckets }
    | undefined;

/** Name buckets, built once per `entries` and `folders` arrays. */
export function linkBuckets(
    entries: readonly DocumentIndexEntry[],
    folders: readonly Folder[]
): LinkBuckets {
    if (cached?.entries === entries && cached.folders === folders) return cached.buckets;
    const byName = new Map<string, DocumentIndexEntry[]>();
    for (const entry of entries) {
        const key = linkName(entry.name);
        if (!key) continue;
        const bucket = byName.get(key);
        if (bucket) bucket.push(entry);
        else byName.set(key, [entry]);
    }
    const buckets: LinkBuckets = {
        entries,
        byId: new Map(entries.map((entry) => [entry.id, entry])),
        byName,
        folders: new Map(folders.map((folder) => [folder.id, folder])),
    };
    cached = { entries, folders, buckets };
    return buckets;
}

/** The folders above a document or folder, top first. */
export function folderChain(
    parentId: string | null | undefined,
    buckets: Pick<LinkBuckets, 'folders'>
): Folder[] {
    const chain: Folder[] = [];
    let id = parentId ?? null;
    while (id !== null && chain.length < FOLDER_DEPTH_MAX) {
        const folder = buckets.folders.get(id);
        if (!folder || chain.includes(folder)) break;
        chain.unshift(folder);
        id = folder.parentId;
    }
    return chain;
}

/** The folder path of a document as a link writes it (`World/Items`), empty at the top. */
export function folderPathOf(entry: DocumentIndexEntry, buckets: LinkBuckets): string {
    return folderChain(entry.parentId, buckets)
        .map(({ name }) => name)
        .join('/');
}

function sharedDepth(a: readonly Folder[], b: readonly Folder[]): number {
    let depth = 0;
    while (depth < a.length && depth < b.length && a[depth] === b[depth]) depth += 1;
    return depth;
}

/** Whether a document's folders end with the written path (`Items` matches `World/Items`). */
function inPath(chain: readonly Folder[], path: string): boolean {
    const wanted = path.split('/').map(linkName).filter(Boolean);
    if (wanted.length > chain.length) return false;
    const tail = chain.slice(chain.length - wanted.length);
    return tail.every((folder, index) => linkName(folder.name) === wanted[index]);
}

/** Missing times sort last; ISO strings compare in time order. */
const byCreation = (a: DocumentIndexEntry, b: DocumentIndexEntry) =>
    a.createdAt === b.createdAt
        ? a.id.localeCompare(b.id)
        : a.createdAt === undefined
          ? 1
          : b.createdAt === undefined
            ? -1
            : a.createdAt.localeCompare(b.createdAt);

/**
 * Documents a link may mean, best first. `sourceParentId` is the folder of the document the link
 * is in (`null` at the top, `undefined` when the link is in no document).
 */
export function linkCandidates(
    target: Pick<LinkTarget, 'name' | 'path'>,
    sourceParentId: string | null | undefined,
    buckets: LinkBuckets
): DocumentIndexEntry[] {
    const named = buckets.byName.get(linkName(target.name));
    if (!named) return [];
    const source = folderChain(sourceParentId, buckets);
    return named
        .map((entry) => ({ entry, chain: folderChain(entry.parentId, buckets) }))
        .filter(({ chain }) => !target.path || inPath(chain, target.path))
        .map(({ entry, chain }) => ({ entry, depth: sharedDepth(source, chain) }))
        .sort((a, b) => b.depth - a.depth || byCreation(a.entry, b.entry))
        .map(({ entry }) => entry);
}

/** The document a link means, if any. */
export function resolveLink(
    target: Pick<LinkTarget, 'name' | 'path'>,
    sourceParentId: string | null | undefined,
    buckets: LinkBuckets
): DocumentIndexEntry | undefined {
    return linkCandidates(target, sourceParentId, buckets)[0];
}

/**
 * How a link from a document in `sourceParentId` should name `target`: its name when that alone
 * finds it, else its full folder path.
 */
export function linkReferenceFor(
    target: DocumentIndexEntry,
    sourceParentId: string | null | undefined,
    buckets: LinkBuckets
): string {
    if (resolveLink({ name: target.name }, sourceParentId, buckets)?.id === target.id) {
        return target.name;
    }
    const path = folderPathOf(target, buckets);
    return path ? `${path}/${target.name}` : target.name;
}
