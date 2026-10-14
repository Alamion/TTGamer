import { describeError, reportSheetIssue } from '../diagnostics';
import { repairFolders } from '../features/documents/operations';
import { deletePortrait } from '../persistence/portraitStorage';
import {
    countCleanLaunch,
    listRecordIds,
    portraitIdOf,
    purgedIds,
    readEnvelope,
    readRecord,
    removeRecord,
} from './documentContent';
import { entryOf, nextRank } from './documentIndex';
import type { DocumentStoreState } from './documentStore';

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

/** Removes the records (and portraits) of deleted documents that were not restored. */
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
            const portraitId = portraitIdOf(await readRecord(id));
            await removeRecord(id);
            if (portraitId) await deletePortrait(portraitId);
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
        if (opened) await countCleanLaunch();
    } catch (error) {
        reportSheetIssue({
            code: 'document-boot-failed',
            message: 'Document start-up work failed',
            details: { error: describeError(error) },
        });
    }
}
