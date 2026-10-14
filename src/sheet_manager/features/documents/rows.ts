import { translate } from '@docusaurus/Translate';
import type { TreeRowItem } from '@site/src/shared/components/tree/TreeView';

import type { DocumentIndexEntry, Folder } from '../../store/documentIndex';
import { systemRegistry } from '../../systems';
import { descendantFolderIds } from './operations';

/** What a row of the documents tree holds. */
export type DocumentsNode =
    { type: 'folder'; folder: Folder } | { type: 'document'; entry: DocumentIndexEntry };

export const folderKey = (id: string) => `folder:${id}`;
export const documentKey = (id: string) => `doc:${id}`;
/** The id inside a row key of either kind. */
export const idOfKey = (key: string) => key.slice(key.indexOf(':') + 1);

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

export const ROOT_KEY = 'place:root';

/**
 * The rows of a folder picker: a "top level" row, then the folders, all open. `excluded` folders
 * (the ones being moved) and everything inside them are left out, so no illegal target is offered.
 */
export function buildFolderRows(
    folders: readonly Folder[],
    rootName: string,
    excluded: ReadonlySet<string>
): TreeRowItem<Folder | null>[] {
    const hidden = new Set(excluded);
    for (const id of excluded)
        descendantFolderIds(folders, id).forEach((child) => hidden.add(child));
    const known = new Set(folders.map(({ id }) => id));
    const children = new Map<string | null, Folder[]>();
    for (const folder of folders) {
        if (hidden.has(folder.id)) continue;
        const place =
            folder.parentId !== null && known.has(folder.parentId) ? folder.parentId : null;
        const list = children.get(place);
        if (list) list.push(folder);
        else children.set(place, [folder]);
    }
    const rows: TreeRowItem<Folder | null>[] = [
        {
            key: ROOT_KEY,
            node: null,
            name: rootName,
            depth: 1,
            setSize: 1,
            position: 1,
            expandable: false,
            expanded: true,
            parentKey: undefined,
        },
    ];
    const walk = (place: string | null, depth: number, parentKey: string) => {
        const list = [...(children.get(place) ?? [])].sort(byRank);
        list.forEach((folder, index) => {
            const key = folderKey(folder.id);
            const open = (children.get(folder.id)?.length ?? 0) > 0;
            rows.push({
                key,
                node: folder,
                name: folder.name,
                depth,
                setSize: list.length,
                position: index + 1,
                expandable: open,
                expanded: open,
                parentKey,
            });
            walk(folder.id, depth + 1, key);
        });
    };
    walk(null, 2, ROOT_KEY);
    rows[0]!.expandable = rows.length > 1;
    return rows;
}

/** The names of a folder's ancestors and itself, outermost first. */
export function placePath(folders: readonly Folder[], folderId: string | null): string[] {
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const path: string[] = [];
    const seen = new Set<string>();
    let at = folderId === null ? undefined : byId.get(folderId);
    while (at && !seen.has(at.id)) {
        seen.add(at.id);
        path.unshift(at.name);
        at = at.parentId === null ? undefined : byId.get(at.parentId);
    }
    return path;
}
