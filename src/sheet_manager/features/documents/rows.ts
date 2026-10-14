import { translate } from '@docusaurus/Translate';
import type { TreeRowItem } from '@site/src/shared/components/tree/TreeView';

import type { DocumentIndexEntry, Folder } from '../../store/documentIndex';
import { systemRegistry } from '../../systems';

/** What a row of the documents tree holds. */
export type DocumentsNode =
    { type: 'folder'; folder: Folder } | { type: 'document'; entry: DocumentIndexEntry };

export const folderKey = (id: string) => `folder:${id}`;
export const documentKey = (id: string) => `doc:${id}`;

/** A document's name as the lists show it: its own, else its kind's. */
export function entryTitle(entry: DocumentIndexEntry): string {
    if (entry.name) return entry.name;
    const definition = systemRegistry.getDocumentDefinition(entry.systemId, entry.definitionId);
    return definition ? translate(definition.label) : entry.definitionId;
}

const byRank = <T extends { rank: number }>(a: T, b: T) => a.rank - b.rank;

/**
 * The rows of the tree in display order: folders before documents within a place, each by rank,
 * and the contents of open folders only. A document or folder whose place is gone is shown at the
 * top level, so nothing is ever hidden by a broken link.
 */
export function buildRows(
    entries: readonly DocumentIndexEntry[],
    folders: readonly Folder[],
    expanded: ReadonlySet<string>
): TreeRowItem<DocumentsNode>[] {
    const folderIds = new Set(folders.map(({ id }) => id));
    const placeOf = (parentId: string | null) =>
        parentId !== null && folderIds.has(parentId) ? parentId : null;
    const folderChildren = new Map<string | null, Folder[]>();
    const documentChildren = new Map<string | null, DocumentIndexEntry[]>();
    const push = <T>(map: Map<string | null, T[]>, key: string | null, item: T) => {
        const list = map.get(key);
        if (list) list.push(item);
        else map.set(key, [item]);
    };
    for (const folder of folders) push(folderChildren, placeOf(folder.parentId), folder);
    for (const entry of entries) push(documentChildren, placeOf(entry.parentId), entry);

    const rows: TreeRowItem<DocumentsNode>[] = [];
    const walk = (place: string | null, depth: number, parentKey: string | undefined) => {
        const subfolders = [...(folderChildren.get(place) ?? [])].sort(byRank);
        const documents = [...(documentChildren.get(place) ?? [])].sort(byRank);
        const size = subfolders.length + documents.length;
        let position = 0;
        for (const folder of subfolders) {
            const key = folderKey(folder.id);
            const open = expanded.has(key);
            const hasChildren =
                (folderChildren.get(folder.id)?.length ?? 0) +
                    (documentChildren.get(folder.id)?.length ?? 0) >
                0;
            rows.push({
                key,
                node: { type: 'folder', folder },
                name: folder.name,
                depth,
                setSize: size,
                position: ++position,
                expandable: hasChildren,
                expanded: open && hasChildren,
                parentKey,
            });
            if (open && hasChildren) walk(folder.id, depth + 1, key);
        }
        for (const entry of documents) {
            rows.push({
                key: documentKey(entry.id),
                node: { type: 'document', entry },
                name: entryTitle(entry),
                depth,
                setSize: size,
                position: ++position,
                expandable: false,
                expanded: false,
                parentKey,
            });
        }
    };
    walk(null, 1, undefined);
    return rows;
}
