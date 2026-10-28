import { describeError, reportSheetIssue } from '../diagnostics';
import { repairFolders } from '../features/documents/operations';
import { deletePortrait, listStoredPictures } from '../persistence/portraitStorage';
import {
    countCleanLaunch,
    deviceImageIdsOf,
    listRecordIds,
    purgedIds,
    readEnvelope,
    readRecord,
    removeRecord,
} from './documentContent';
import { entryOf, nextRank } from './documentIndex';
import type { DocumentStoreState } from './documentStore';
import { forgetDocumentLinks, scheduleLinkIndexLoad } from './linkIndexStore';

/** The part of the store the start-up work needs. */
export interface BootApi {
    getState(): DocumentStoreState;
    setState(partial: Partial<DocumentStoreState>): void;
    openDocument(id: string): Promise<boolean>;
}

/**
 * Records with no entry and no tombstone are documents whose index row was lost (a stale tab, a
 * crash): their entries are rebuilt from the record, never deleted (spec 032, D5).
 */
export async function reconcileIndex(api: BootApi): Promise<number> {
    const known = new Set(api.getState().entries.map(({ id }) => id));
    const tombstones = new Set(api.getState().pendingPurge);
    const orphans = (await listRecordIds()).filter((id) => !known.has(id) && !tombstones.has(id));
    let rebuilt = 0;
    for (const id of orphans) {
        const document = await readEnvelope(id, undefined);
        if (!document) continue;
        const { entries } = api.getState();
        if (entries.some((entry) => entry.id === id)) continue;
        api.setState({
            entries: [
                ...entries,
                { ...entryOf(document, undefined, {}, Date.now()), rank: nextRank(entries) },
            ],
        });
        rebuilt += 1;
        reportSheetIssue({
            code: 'document-index-rebuilt',
            message: 'A stored document had no index entry; the entry was rebuilt',
            details: { documentId: id },
        });
    }
    return rebuilt;
}

/** Cuts a loop in the stored folders, which would hide those folders from the tree. */
export function repairFolderLoops(api: BootApi): number {
    const { folders } = api.getState();
    const { folders: repaired, repaired: count } = repairFolders(folders, Date.now());
    if (count === 0) return 0;
    api.setState({ folders: repaired });
    reportSheetIssue({
        code: 'document-folders-repaired',
        message: 'Stored folders formed a loop; the loop was cut',
        details: { folders: count },
    });
    return count;
}

/** Removes the records (and images) of deleted documents that were not restored. */
export async function purgeDeleted(api: BootApi): Promise<void> {
    const { pendingPurge } = api.getState();
    if (pendingPurge.length === 0) return;
    const done = new Set<string>();
    for (const id of pendingPurge) {
        if (api.getState().entries.some((entry) => entry.id === id)) {
            done.add(id);
            continue;
        }
        try {
            const images = deviceImageIdsOf(await readRecord(id));
            await removeRecord(id);
            await forgetDocumentLinks(id);
            await Promise.all([...images].map((imageId) => deletePortrait(imageId)));
            done.add(id);
            purgedIds.add(id);
        } catch (error) {
            reportSheetIssue({
                code: 'document-purge-failed',
                message: 'A deleted document could not be removed from storage yet',
                details: { documentId: id, error: describeError(error) },
            });
        }
    }
    api.setState({
        pendingPurge: api.getState().pendingPurge.filter((id) => !done.has(id)),
    });
}

/**
 * What runs once the slim state is loaded: the open document first (the sheet waits for it),
 * then the index check, the purge, and the count toward deleting the v4 backup.
 */
export async function bootDocuments(api: BootApi): Promise<void> {
    try {
        const { currentDocumentId, entries } = api.getState();
        let opened = true;
        if (currentDocumentId) {
            if (entries.some(({ id }) => id === currentDocumentId)) {
                opened = await api.openDocument(currentDocumentId);
            } else {
                api.setState({ currentDocumentId: null });
            }
        }
        repairFolderLoops(api);
        await reconcileIndex(api);
        await purgeDeleted(api);
        // Off the start-up path: the sheet waits only for the open document.
        scheduleLinkIndexLoad(
            () => api.getState().entries.map(({ id }) => id),
            (id) => readEnvelope(id, undefined)
        );
        schedulePictureSweep(api);
        if (opened) await countCleanLaunch();
    } catch (error) {
        reportSheetIssue({
            code: 'document-boot-failed',
            message: 'Document start-up work failed',
            details: { error: describeError(error) },
        });
    }
}

/** The picture sweep runs at most this often on a device (it reads every document record). */
const SWEEP_EVERY_MS = 7 * 24 * 60 * 60 * 1000;
/** A picture stored this recently may belong to a document not saved yet (this or another tab). */
const SWEEP_SPARES_MS = 24 * 60 * 60 * 1000;
const SWEEP_AT_KEY = 'ttgamer.pictures.sweptAt';
const SWEEP_CHUNK = 50;

let sweepScheduled: (() => void) | undefined;
let sweepGeneration = 0;

function sweptAt(): number {
    try {
        return Number(localStorage.getItem(SWEEP_AT_KEY) ?? 0) || 0;
    } catch {
        return 0;
    }
}

/**
 * Deletes stored pictures no document names (F-010, spec 045): portraits, image fields, and note
 * pictures of live documents and of deleted ones waiting for their purge are kept, and so is any
 * picture stored in the last day. One unreadable record stops the sweep before anything is deleted.
 * Returns how many pictures went, or nothing when the sweep did not run to the end.
 */
export async function sweepPictures(api: BootApi, now = Date.now()): Promise<number | undefined> {
    const started = sweepGeneration;
    const { entries, pendingPurge } = api.getState();
    const ids = [...new Set([...entries.map(({ id }) => id), ...pendingPurge])];
    const named = new Set<string>();
    for (let index = 0; index < ids.length; index += SWEEP_CHUNK) {
        const records = await Promise.all(ids.slice(index, index + SWEEP_CHUNK).map(readRecord));
        if (started !== sweepGeneration) return undefined;
        if (records.some((record) => record === null || record === undefined)) return undefined;
        for (const record of records) for (const id of deviceImageIdsOf(record)) named.add(id);
    }
    const stored = await listStoredPictures();
    if (started !== sweepGeneration) return undefined;
    const orphans = stored.filter(
        ({ id, createdAt }) => !named.has(id) && now - createdAt > SWEEP_SPARES_MS
    );
    await Promise.all(orphans.map(({ id }) => deletePortrait(id)));
    try {
        localStorage.setItem(SWEEP_AT_KEY, String(now));
    } catch {
        // Without storage the sweep runs again next start; it is idempotent.
    }
    if (orphans.length > 0) {
        reportSheetIssue({
            code: 'pictures-swept',
            message: 'Stored pictures no document names were deleted',
            details: { pictures: orphans.length },
        });
    }
    return orphans.length;
}

/** Runs the sweep at idle when the last one is a week old. */
export function schedulePictureSweep(api: BootApi): void {
    sweepScheduled?.();
    if (Date.now() - sweptAt() < SWEEP_EVERY_MS) return;
    const run = () => {
        sweepScheduled = undefined;
        void sweepPictures(api).catch((error: unknown) =>
            reportSheetIssue({
                code: 'document-boot-failed',
                message: 'The picture sweep stopped',
                details: { error: describeError(error) },
            })
        );
    };
    if (typeof requestIdleCallback === 'function') {
        const handle = requestIdleCallback(run, { timeout: 10_000 });
        sweepScheduled = () => cancelIdleCallback(handle);
    } else {
        const handle = setTimeout(run, 2000);
        sweepScheduled = () => clearTimeout(handle);
    }
}

/** Stops a pending or running sweep (tests). */
export function cancelPictureSweep(): void {
    sweepScheduled?.();
    sweepScheduled = undefined;
    sweepGeneration += 1;
}
