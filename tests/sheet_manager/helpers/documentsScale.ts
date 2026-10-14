import type { DocumentLabeler } from '@site/src/sheet_manager/features/documents/query';
import type { DocumentIndexEntry, Folder } from '@site/src/sheet_manager/store/documentIndex';

const STAMP = '2026-10-01T10:00:00.000Z';

export const scaleLabeler: DocumentLabeler = {
    kind: (_system, kind) => kind,
    system: (system) => system,
    setting: () => 'Hunter',
    title: (entry) => entry.name,
};

/**
 * `count` documents in folders three levels deep (about twenty documents in each lowest folder),
 * the shape of a GM's shelf of campaigns, sessions, and characters.
 */
export function makeScaleTree(count: number): { entries: DocumentIndexEntry[]; folders: Folder[] } {
    const folders: Folder[] = [];
    const leaves: string[] = [];
    const perLeaf = 20;
    const leafCount = Math.max(1, Math.ceil(count / perLeaf));
    const campaigns = Math.max(1, Math.ceil(leafCount / 25));
    for (let campaign = 0; campaign < campaigns; campaign++) {
        const campaignId = `c${campaign}`;
        folders.push(folder(campaignId, `Campaign ${campaign}`, null, campaign));
        for (let session = 0; session < 5; session++) {
            const sessionId = `${campaignId}s${session}`;
            folders.push(folder(sessionId, `Session ${session}`, campaignId, session));
            for (let group = 0; group < 5; group++) {
                const groupId = `${sessionId}g${group}`;
                folders.push(folder(groupId, `Group ${group}`, sessionId, group));
                leaves.push(groupId);
            }
        }
    }
    const entries: DocumentIndexEntry[] = Array.from({ length: count }, (_, index) => ({
        id: `d${index}`,
        name: `Doc ${String(index).padStart(4, '0')}`,
        kind: index % 5 === 0 ? 'droid' : 'character',
        systemId: 'wod-v5',
        definitionId: 'hunter',
        parentId: leaves[index % leaves.length] ?? null,
        rank: Math.floor(index / leaves.length),
        createdAt: STAMP,
        changedAt: STAMP,
        updatedAt: 1,
    }));
    return { entries, folders };
}

function folder(id: string, name: string, parentId: string | null, rank: number): Folder {
    return { id, name, parentId, rank, createdAt: STAMP, changedAt: STAMP, updatedAt: 1 };
}
