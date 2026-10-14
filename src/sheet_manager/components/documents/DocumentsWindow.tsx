import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { FloatingWindow } from '@site/src/shared/components/FloatingWindow';
import { Splitter } from '@site/src/shared/components/Splitter';
import { TreeContextMenu } from '@site/src/shared/components/tree/TreeContextMenu';
import type { TreeRowItem } from '@site/src/shared/components/tree/TreeView';
import { useLocalStorageState } from '@site/src/shared/hooks/useLocalStorageState';
import { useMediaQuery } from '@site/src/shared/hooks/useMediaQuery';
import {
    type PaneLimits,
    useMeasuredElement,
    usePaneSizes,
} from '@site/src/shared/hooks/usePaneSizes';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { useTreeSelection } from '@site/src/shared/hooks/useTreeSelection';
import { generateId } from '@site/src/shared/utils/random';
import clsx from 'clsx';
import { ExternalLink, FolderInput, FolderPlus, Pencil, Redo2, Trash2, Undo2 } from 'lucide-react';
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';

import {
    collectDeletion,
    MAX_TREE_DEPTH,
    type TreeProblem,
} from '../../features/documents/operations';
import { buildRows, type DocumentsNode, folderKey, idOfKey } from '../../features/documents/rows';
import {
    redoTreeChange,
    runTreeChange,
    undoTreeChange,
    useDocumentsHistory,
} from '../../features/documents/treeActions';
import { useDocumentStore } from '../../store/documentStore';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { DocumentDetails } from './DocumentDetails';
import { DocumentsTree } from './DocumentsTree';
import { FolderNameDialog } from './FolderNameDialog';
import { MoveToPicker } from './MoveToPicker';
import { RejectedFiles } from './RejectedFiles';
import { useDocumentsDrag } from './useDocumentsDrag';

const labels = uiMessages.sheet.documents.manager;

const TREE_LIMITS: Record<'tree', PaneLimits> = { tree: { min: 180, max: 520, initial: 280 } };
const TREE_ROOM = { restMin: 240, dividers: 6 };

export interface DocumentsWindowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type NameDialog =
    { mode: 'create'; parentId: string | null } | { mode: 'rename'; id: string; name: string };

const iconButton =
    'inline-flex items-center justify-center rounded-sm border border-border p-1.5 text-textSecondary transition-colors hover:border-secondary hover:bg-secondary/10 hover:text-textPrimary disabled:cursor-not-allowed disabled:opacity-40 [@media(pointer:coarse)]:p-2.5';

/**
 * The documents window (spec 032): the tree of folders and documents on the left, the selected
 * rows' details on the right, over the sheet page and not blocking it. On a phone it fills the
 * screen with the tree and the details as two tabs, and opening a document closes it.
 */
export function DocumentsWindow({ open, onOpenChange }: DocumentsWindowProps) {
    const plural = usePluralMessage();
    const narrow = useMediaQuery('(max-width: 767px)');
    const entries = useDocumentStore((state) => state.entries);
    const folders = useDocumentStore((state) => state.folders);
    const currentDocumentId = useDocumentStore((state) => state.currentDocumentId);
    const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);
    const history = useDocumentsHistory();

    const [openFolders, setOpenFolders] = useLocalStorageState<string[]>(
        'documents-window-open-folders',
        []
    );
    const expanded = useMemo(() => new Set(openFolders), [openFolders]);
    const rows = useMemo(() => buildRows(entries, folders, expanded), [entries, folders, expanded]);
    const visibleKeys = useMemo(() => rows.map(({ key }) => key), [rows]);
    const { focused, selection, select, reset } = useTreeSelection(visibleKeys);

    const [tab, setTab] = useState<'tree' | 'details'>('tree');
    const [menu, setMenu] = useState<{ key: string; x: number; y: number }>();
    /** The rows a delete or move acts on, fixed when the action starts. */
    const [acting, setActing] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [picking, setPicking] = useState(false);
    const [nameDialog, setNameDialog] = useState<NameDialog>();
    const [status, setStatus] = useState<{ text: string; alert: boolean }>();
    const treeRegion = useRef<HTMLDivElement>(null);
    const { ref: bodyRef, node: body, width: bodyWidth } = useMeasuredElement<HTMLDivElement>();
    const panes = usePaneSizes('documents-panes', TREE_LIMITS, bodyWidth, TREE_ROOM);
    const previewTree = useCallback(
        (width: number) => body?.style.setProperty('--tree', `${width}px`),
        [body]
    );

    const byKey = useMemo(() => new Map(rows.map((row) => [row.key, row])), [rows]);
    const selectedItems = useMemo(
        () => [...selection].flatMap((key) => (byKey.has(key) ? [byKey.get(key)!.node] : [])),
        [selection, byKey]
    );

    const toggleFolder = useCallback(
        (key: string, openIt?: boolean) =>
            setOpenFolders((current) => {
                const next = new Set(current);
                const shouldOpen = openIt ?? !next.has(key);
                if (shouldOpen) next.add(key);
                else next.delete(key);
                return [...next];
            }),
        [setOpenFolders]
    );
    const revealFolder = useCallback(
        (folderId: string | null) => {
            if (folderId === null) return;
            setOpenFolders((current) =>
                current.includes(folderKey(folderId)) ? current : [...current, folderKey(folderId)]
            );
        },
        [setOpenFolders]
    );

    const openDocument = (id: string) => {
        setCurrentDocument(id);
        if (narrow) onOpenChange(false);
    };
    const activate = (item: TreeRowItem<DocumentsNode>) => {
        if (item.node.type === 'document') openDocument(item.node.entry.id);
        else if (item.expandable) toggleFolder(item.key, !item.expanded);
    };

    const problemText = (problem: TreeProblem | undefined) => {
        if (!problem) return translate(labels.refused.generic);
        if (problem.code === 'cycle') return translate(labels.refused.cycle);
        if (problem.code === 'depth') {
            return translate(labels.refused.depth, { max: MAX_TREE_DEPTH });
        }
        if (problem.code === 'missing') return translate(labels.refused.missing);
        return translate(labels.refused.generic);
    };

    /** Runs one named change; what was refused is said at once, never silently dropped. */
    const change = (
        name: keyof typeof labels.history,
        operations: Parameters<typeof runTreeChange>[1]
    ) => {
        const result = runTreeChange(translate(labels.history[name]), operations);
        const problem = result.problems[0];
        if (problem) setStatus({ text: problemText(problem), alert: true });
        return result;
    };

    const moveRows = (ids: string[], parentId: string | null, before: string | null) => {
        const result = change('move', [{ op: 'move', ids, parentId, before }]);
        if (result.inverse.length > 0) {
            revealFolder(parentId);
            setStatus({ text: plural(labels.announce.moved, ids.length), alert: false });
        }
    };

    const drag = useDocumentsDrag({ rows, folders, selection, onDrop: moveRows });

    /** The rows a menu or a button acts on: the selection when the row is in it, else the row. */
    const keysFor = (key: string) => (selection.has(key) ? [...selection] : [key]);
    const startDelete = (keys: string[]) => {
        if (keys.length === 0) return;
        setActing(keys);
        setConfirmDelete(true);
    };
    const startMove = (keys: string[]) => {
        if (keys.length === 0) return;
        setActing(keys);
        setPicking(true);
    };
    const startCreate = () => {
        const [only] = selectedItems;
        const parentId =
            selectedItems.length === 1 && only
                ? only.type === 'folder'
                    ? only.folder.id
                    : only.entry.parentId
                : null;
        setNameDialog({ mode: 'create', parentId });
    };
    const startRename = (folderId: string, name: string) =>
        setNameDialog({ mode: 'rename', id: folderId, name });

    const submitName = (name: string) => {
        if (!nameDialog) return;
        if (nameDialog.mode === 'rename') {
            change('rename', [{ op: 'rename', id: nameDialog.id, name }]);
            return;
        }
        const id = generateId();
        const result = change('createFolder', [
            { op: 'createFolder', id, name, parentId: nameDialog.parentId },
        ]);
        if (result.added.length > 0) {
            revealFolder(nameDialog.parentId);
            reset([folderKey(id)]);
        }
    };

    const doomed = useMemo(
        () => collectDeletion({ entries, folders }, acting.map(idOfKey)),
        [entries, folders, acting]
    );
    const openWillClose =
        currentDocumentId !== null && doomed.documentIds.includes(currentDocumentId);

    /** Deletes the acting rows; the sheet moves to the nearest document left, or empties. */
    const deleteActing = () => {
        const gone = new Set(doomed.documentIds);
        const order = entries.map(({ id }) => id);
        const visible = rows.flatMap(({ node }) =>
            node.type === 'document' ? [node.entry.id] : []
        );
        const first = visible.findIndex((id) => gone.has(id));
        const survivor =
            visible.slice(Math.max(first, 0)).find((id) => !gone.has(id)) ??
            visible
                .slice(0, Math.max(first, 0))
                .reverse()
                .find((id) => !gone.has(id)) ??
            order.find((id) => !gone.has(id));
        const wasOpen = openWillClose;
        change('delete', [{ op: 'delete', ids: acting.map(idOfKey) }]);
        if (wasOpen) setCurrentDocument(survivor ?? null);
        reset([]);
        setConfirmDelete(false);
    };

    const undo = () => {
        const name = history.undoLabel;
        if (name && undoTreeChange()) {
            setStatus({ text: translate(labels.announce.undone, { name }), alert: false });
        }
    };
    const redo = () => {
        const name = history.redoLabel;
        if (name && redoTreeChange()) {
            setStatus({ text: translate(labels.announce.redone, { name }), alert: false });
        }
    };

    const onCommand = (event: KeyboardEvent<HTMLDivElement>, item: TreeRowItem<DocumentsNode>) => {
        const modifier = event.ctrlKey || event.metaKey;
        if (modifier && !event.altKey && event.key.toLowerCase() === 'z') {
            if (event.shiftKey) redo();
            else undo();
            return true;
        }
        if (modifier && !event.altKey && event.key.toLowerCase() === 'y') {
            redo();
            return true;
        }
        if (event.key === 'F2' && item.node.type === 'folder') {
            startRename(item.node.folder.id, item.node.folder.name);
            return true;
        }
        return false;
    };

    const selectedKeys = useMemo(
        () => [...selection].filter((key) => byKey.has(key)),
        [selection, byKey]
    );
    const movingFolders = useMemo(
        () => new Set(acting.filter((key) => key.startsWith('folder:')).map(idOfKey)),
        [acting]
    );

    const menuItem = menu ? byKey.get(menu.key) : undefined;
    const menuActions = menuItem
        ? menuItem.node.type === 'document'
            ? [
                  { id: 'open', label: translate(labels.details.open), icon: ExternalLink },
                  { id: 'move', label: translate(labels.details.move), icon: FolderInput },
                  {
                      id: 'delete',
                      label: translate(labels.details.delete),
                      icon: Trash2,
                      danger: true,
                  },
              ]
            : [
                  { id: 'rename', label: translate(labels.details.rename), icon: Pencil },
                  { id: 'newFolder', label: translate(labels.toolbar.newFolder), icon: FolderPlus },
                  { id: 'move', label: translate(labels.details.move), icon: FolderInput },
                  {
                      id: 'delete',
                      label: translate(labels.details.delete),
                      icon: Trash2,
                      danger: true,
                  },
              ]
        : [];

    const onMenuAction = (id: string) => {
        if (!menuItem) return;
        const keys = keysFor(menuItem.key);
        if (id === 'open' && menuItem.node.type === 'document')
            openDocument(menuItem.node.entry.id);
        else if (id === 'rename' && menuItem.node.type === 'folder') {
            startRename(menuItem.node.folder.id, menuItem.node.folder.name);
        } else if (id === 'newFolder' && menuItem.node.type === 'folder') {
            setNameDialog({ mode: 'create', parentId: menuItem.node.folder.id });
        } else if (id === 'move') startMove(keys);
        else if (id === 'delete') startDelete(keys);
    };

    const deleteWhat = [
        ...(doomed.folderIds.length > 0
            ? [plural(labels.counts.folders, doomed.folderIds.length)]
            : []),
        ...(doomed.documentIds.length > 0
            ? [plural(labels.counts.documents, doomed.documentIds.length)]
            : []),
    ].join(translate(uiMessages.sheet.documents.manager.and));

    return (
        <>
            <FloatingWindow
                open={open}
                onClose={() => onOpenChange(false)}
                title={translate(labels.title)}
                closeLabel={translate(labels.close)}
                id="documents"
            >
                <div
                    role="tablist"
                    aria-label={translate(labels.tabs.label)}
                    className="flex border-b border-border md:hidden"
                >
                    {(['tree', 'details'] as const).map((value) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => setTab(value)}
                            className={clsx(
                                'flex-1 px-3 py-2.5 text-sm',
                                tab === value
                                    ? 'border-b-2 border-primary font-medium text-textPrimary'
                                    : 'text-textSecondary'
                            )}
                        >
                            {translate(labels.tabs[value])}
                        </button>
                    ))}
                </div>
                <div
                    ref={bodyRef}
                    style={{ '--tree': `${panes.sizes.tree}px` } as React.CSSProperties}
                    className="flex min-h-0 flex-1"
                >
                    <div
                        className={clsx(
                            'min-h-0 min-w-0 flex-1 flex-col md:flex md:w-[var(--tree)] md:flex-none',
                            tab === 'tree' ? 'flex' : 'hidden'
                        )}
                    >
                        <div
                            role="toolbar"
                            aria-label={translate(labels.toolbar.label)}
                            className="flex items-center gap-1.5 border-b border-border px-2 py-1.5"
                        >
                            <button
                                type="button"
                                onClick={startCreate}
                                aria-label={translate(labels.toolbar.newFolder)}
                                title={translate(labels.toolbar.newFolder)}
                                className={iconButton}
                            >
                                <FolderPlus className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={undo}
                                disabled={history.undoLabel === null}
                                aria-label={
                                    history.undoLabel
                                        ? translate(labels.toolbar.undoNamed, {
                                              name: history.undoLabel,
                                          })
                                        : translate(labels.toolbar.undo)
                                }
                                title={translate(labels.toolbar.undo)}
                                className={iconButton}
                            >
                                <Undo2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={redo}
                                disabled={history.redoLabel === null}
                                aria-label={
                                    history.redoLabel
                                        ? translate(labels.toolbar.redoNamed, {
                                              name: history.redoLabel,
                                          })
                                        : translate(labels.toolbar.redo)
                                }
                                title={translate(labels.toolbar.redo)}
                                className={iconButton}
                            >
                                <Redo2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div
                            role={drag.refused || status?.alert ? 'alert' : 'status'}
                            className={clsx(
                                'px-2 text-xs',
                                (drag.refused || status?.alert) && 'py-1 text-error',
                                !drag.refused && !status?.alert && 'text-textSecondary',
                                !drag.refused && !status && 'sr-only'
                            )}
                        >
                            {drag.refused ? translate(labels.refused.cycle) : status?.text}
                        </div>
                        <div ref={treeRegion} className="min-h-0 flex-1 overflow-y-auto p-2">
                            {rows.length === 0 ? (
                                <p className="p-4 text-sm text-textSecondary">
                                    {translate(labels.empty)}
                                </p>
                            ) : (
                                <DocumentsTree
                                    rows={rows}
                                    focused={focused}
                                    selection={selection}
                                    currentDocumentId={currentDocumentId}
                                    onSelect={select}
                                    onRowClick={(item) => {
                                        if (item.node.type === 'document') {
                                            openDocument(item.node.entry.id);
                                        }
                                    }}
                                    onToggle={toggleFolder}
                                    onEnter={activate}
                                    onDelete={() => startDelete(selectedKeys)}
                                    onMenu={(key, anchor) => setMenu({ key, ...anchor })}
                                    onCommand={onCommand}
                                    dragFor={drag.dragFor}
                                    scrollRef={treeRegion}
                                />
                            )}
                        </div>
                    </div>
                    <Splitter
                        label={translate(labels.resizeTree)}
                        min={TREE_LIMITS.tree.min}
                        max={TREE_LIMITS.tree.max}
                        value={panes.sizes.tree}
                        clamp={(width) => panes.clamp('tree', width)}
                        onPreview={previewTree}
                        onChange={(width) => panes.setSize('tree', width)}
                        onReset={() => panes.reset('tree')}
                    />
                    <div
                        className={clsx(
                            'min-h-0 min-w-0 flex-1 overflow-y-auto md:block',
                            tab === 'details' ? 'block' : 'hidden'
                        )}
                    >
                        <DocumentDetails
                            items={selectedItems}
                            folders={folders}
                            entries={entries}
                            onOpen={(entry) => openDocument(entry.id)}
                            onRename={(folder) => startRename(folder.id, folder.name)}
                            onMove={() => startMove(selectedKeys)}
                            onDelete={() => startDelete(selectedKeys)}
                        />
                    </div>
                </div>
                <RejectedFiles />
            </FloatingWindow>
            {open && menu && menuItem && (
                <TreeContextMenu
                    label={translate(labels.rowActions, { name: menuItem.name })}
                    container={null}
                    anchor={menu}
                    actions={menuActions}
                    onAction={onMenuAction}
                    onClose={() => setMenu(undefined)}
                />
            )}
            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                onConfirm={deleteActing}
                title={translate(labels.deleteTitle)}
                description={[
                    translate(labels.deleteDescription, { what: deleteWhat }),
                    ...(openWillClose ? [translate(labels.deleteOpenNote)] : []),
                ].join('\n')}
                confirmLabel={translate(labels.deleteSelected)}
                cancelLabel={translate(uiMessages.sheet.documents.create.cancel)}
                variant="danger"
            />
            {nameDialog && (
                <FolderNameDialog
                    open
                    onOpenChange={(next) => !next && setNameDialog(undefined)}
                    title={translate(
                        nameDialog.mode === 'create'
                            ? labels.folder.createTitle
                            : labels.folder.renameTitle
                    )}
                    nameLabel={translate(labels.folder.name)}
                    initialName={
                        nameDialog.mode === 'rename'
                            ? nameDialog.name
                            : translate(labels.folder.defaultName)
                    }
                    confirmLabel={translate(
                        nameDialog.mode === 'create' ? labels.folder.create : labels.folder.rename
                    )}
                    cancelLabel={translate(uiMessages.sheet.documents.create.cancel)}
                    onSubmit={submitName}
                />
            )}
            {picking && (
                <MoveToPicker
                    open
                    onOpenChange={(next) => !next && setPicking(false)}
                    folders={folders}
                    moving={movingFolders}
                    title={plural(labels.move.title, acting.length)}
                    onPick={(parentId) => moveRows(acting.map(idOfKey), parentId, null)}
                />
            )}
        </>
    );
}
