import type { TreeRowDrag } from '@site/src/shared/components/tree/TreeRowShell';
import type { TreeRowItem } from '@site/src/shared/components/tree/TreeView';
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type DocumentsNode, idOfKey } from '../../features/documents/rows';
import type { Folder } from '../../store/documentIndex';

const MIME = 'application/x-ttg-documents';

type Mode = 'into' | 'before' | 'after';

interface Drop {
    mode: Mode;
    parentId: string | null;
    before: string | null;
}

export interface DocumentsDragOptions {
    rows: readonly TreeRowItem<DocumentsNode>[];
    folders: readonly Folder[];
    selection: ReadonlySet<string>;
    /** Rows may be put above or below others (manual order); a sorted view allows only "into". */
    reorderable: boolean;
    /** Rows were dropped: where they go and before which sibling (null: last). */
    onDrop: (ids: string[], parentId: string | null, before: string | null) => void;
}

const parentOf = (item: TreeRowItem<DocumentsNode>, known: ReadonlySet<string>): string | null => {
    const parentId =
        item.node.type === 'folder' ? item.node.folder.parentId : item.node.entry.parentId;
    return parentId !== null && known.has(parentId) ? parentId : null;
};

/**
 * Mouse drag of tree rows (touch has "Move to…" instead, spec 032 D11). Shows where the rows would
 * land before they are dropped; a place inside a dragged folder is refused and says why.
 */
export function useDocumentsDrag({
    rows,
    folders,
    selection,
    reorderable,
    onDrop,
}: DocumentsDragOptions) {
    const dragged = useRef<{ ids: string[]; folderIds: Set<string> } | null>(null);
    const [target, setTarget] = useState<{
        key: string;
        mode: Mode;
        blocked: 'cycle' | 'sorted' | null;
    } | null>(null);
    const [atEnd, setAtEnd] = useState(false);
    const known = useMemo(() => new Set(folders.map(({ id }) => id)), [folders]);
    const parents = useMemo(
        () => new Map(folders.map((folder) => [folder.id, folder.parentId])),
        [folders]
    );
    const indexOf = useMemo(() => new Map(rows.map((row, index) => [row.key, index])), [rows]);

    const finish = useCallback(() => {
        dragged.current = null;
        setTarget(null);
        setAtEnd(false);
    }, []);
    useEffect(() => {
        document.addEventListener('dragend', finish);
        return () => document.removeEventListener('dragend', finish);
    }, [finish]);

    const resolve = useCallback(
        (item: TreeRowItem<DocumentsNode>, event: DragEvent<HTMLDivElement>): Drop => {
            const rect = event.currentTarget.getBoundingClientRect();
            const fraction = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
            const isFolder = item.node.type === 'folder';
            const mode: Mode = isFolder
                ? fraction < 0.3
                    ? 'before'
                    : fraction > 0.7
                      ? 'after'
                      : 'into'
                : fraction < 0.5
                  ? 'before'
                  : 'after';
            const id = idOfKey(item.key);
            if (mode === 'into') return { mode, parentId: id, before: null };
            const parentId = parentOf(item, known);
            if (mode === 'before') return { mode, parentId, before: id };
            const start = indexOf.get(item.key) ?? 0;
            let before: string | null = null;
            for (let at = start + 1; at < rows.length; at += 1) {
                const row = rows[at]!;
                if (row.depth < item.depth) break;
                if (row.depth === item.depth && row.parentKey === item.parentKey) {
                    before = idOfKey(row.key);
                    break;
                }
            }
            return { mode, parentId, before };
        },
        [indexOf, known, rows]
    );

    /** Whether the rows being dragged may not go into this place. */
    const blockedPlace = useCallback(
        (parentId: string | null, item: TreeRowItem<DocumentsNode>): boolean => {
            const active = dragged.current;
            if (!active) return true;
            if (active.ids.includes(idOfKey(item.key))) return true;
            const seen = new Set<string>();
            let at = parentId;
            while (at !== null && !seen.has(at)) {
                if (active.folderIds.has(at)) return true;
                seen.add(at);
                at = parents.get(at) ?? null;
            }
            return false;
        },
        [parents]
    );

    const refusal = useCallback(
        (drop: Drop, item: TreeRowItem<DocumentsNode>): 'cycle' | 'sorted' | null => {
            if (blockedPlace(drop.parentId, item)) return 'cycle';
            return !reorderable && drop.mode !== 'into' ? 'sorted' : null;
        },
        [blockedPlace, reorderable]
    );

    const dragFor = useCallback(
        (item: TreeRowItem<DocumentsNode>): TreeRowDrag => {
            const hovering = target?.key === item.key ? target : null;
            return {
                draggable: true,
                over: hovering?.mode === 'into' && hovering.blocked === null,
                edge:
                    hovering && hovering.mode !== 'into' && hovering.blocked === null
                        ? hovering.mode
                        : undefined,
                onDragStart: (event) => {
                    const keys = selection.has(item.key) ? [...selection] : [item.key];
                    const ids = keys.map(idOfKey);
                    dragged.current = {
                        ids,
                        folderIds: new Set(
                            keys.filter((key) => key.startsWith('folder:')).map(idOfKey)
                        ),
                    };
                    event.dataTransfer.setData(MIME, JSON.stringify(ids));
                    event.dataTransfer.effectAllowed = 'move';
                },
                onDragOver: (event) => {
                    if (!dragged.current) return;
                    const drop = resolve(item, event);
                    const blocked = refusal(drop, item);
                    setTarget((current) =>
                        current?.key === item.key &&
                        current.mode === drop.mode &&
                        current.blocked === blocked
                            ? current
                            : { key: item.key, mode: drop.mode, blocked }
                    );
                    if (blocked) {
                        event.dataTransfer.dropEffect = 'none';
                        return;
                    }
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                },
                onDragLeave: (event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setTarget((current) => (current?.key === item.key ? null : current));
                },
                onDrop: (event) => {
                    const active = dragged.current;
                    if (!active) return;
                    event.preventDefault();
                    const drop = resolve(item, event);
                    const ids = active.ids;
                    const blocked = refusal(drop, item);
                    finish();
                    if (!blocked) onDrop(ids, drop.parentId, drop.before);
                },
            };
        },
        [finish, onDrop, refusal, resolve, selection, target]
    );

    /** The empty space under the last row: a drop there puts the rows last at the top level. */
    const endZone = useMemo(
        () => ({
            onDragOver: (event: DragEvent<HTMLElement>) => {
                if (!dragged.current) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setTarget(null);
                setAtEnd(true);
            },
            onDragLeave: () => setAtEnd(false),
            onDrop: (event: DragEvent<HTMLElement>) => {
                const active = dragged.current;
                if (!active) return;
                event.preventDefault();
                finish();
                onDrop(active.ids, null, null);
            },
        }),
        [finish, onDrop]
    );

    return { dragFor, endZone, atEnd, refused: target?.blocked ?? null };
}
