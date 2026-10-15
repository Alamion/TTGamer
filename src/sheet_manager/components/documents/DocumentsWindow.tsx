import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { FloatingWindow } from '@site/src/shared/components/FloatingWindow';
import { Splitter } from '@site/src/shared/components/Splitter';
import { SelectionBar } from '@site/src/shared/components/tree/SelectionBar';
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
import { useSessionStorageState } from '@site/src/shared/hooks/useSessionStorageState';
import { useTreeSelection } from '@site/src/shared/hooks/useTreeSelection';
import { generateId } from '@site/src/shared/utils/random';
import clsx from 'clsx';
import {
    Columns2,
    ExternalLink,
    FilePlus,
    FolderInput,
    FolderPlus,
    Pencil,
    Redo2,
    SquarePlus,
    Trash2,
    Undo2,
} from 'lucide-react';
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { documentLabeler } from '../../features/documents/labeler';
import {
    collectDeletion,
    MAX_TREE_DEPTH,
    type TreeProblem,
} from '../../features/documents/operations';
import {
    applyQuery,
    buildQueryIndex,
    type DocumentsQuery,
    EMPTY_QUERY,
    isNarrowing,
    orderFor,
    readQuery,
} from '../../features/documents/query';
import {
    buildRows,
    documentKey,
    type DocumentsNode,
    folderKey,
    idOfKey,
} from '../../features/documents/rows';
import {
    redoTreeChange,
    runTreeChange,
    undoTreeChange,
    useDocumentsHistory,
} from '../../features/documents/treeActions';
import { openBeside, openInNewTab, type OpenOutcome } from '../../features/sheet/panes/paneStore';
import { MAX_DOCUMENTS } from '../../features/sheet/panes/types';
import { useDocumentStore } from '../../store/documentStore';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { DocumentCreateDialog } from '../dialogs/DocumentCreateDialog';
import { DocumentDetails } from './DocumentDetails';
import { DocumentsToolbar } from './DocumentsToolbar';
import { DocumentsTree } from './DocumentsTree';
import { MoveToPicker } from './MoveToPicker';
import { RejectedFiles } from './RejectedFiles';
import { useDocumentsDrag } from './useDocumentsDrag';

const labels = uiMessages.sheet.documents.manager;

const TREE_LIMITS: Record<'tree', PaneLimits> = { tree: { min: 180, max: 520, initial: 280 } };
const STATUS_MS = 5000;
const TREE_ROOM = { restMin: 240, dividers: 6 };

export interface DocumentsWindowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const iconButton =
    'inline-flex items-center justify-center rounded-sm border border-border p-1.5 text-textSecondary transition-colors hover:border-secondary hover:bg-secondary/10 hover:text-textPrimary disabled:cursor-not-allowed disabled:opacity-40 [@media(pointer:coarse)]:p-2.5';

/** Sorting stays when the search and filters are cleared. */
const pickSort = ({ sort, descending }: DocumentsQuery) => ({ sort, descending });

/**
 * The documents window (spec 032): the tree of folders and documents on the left, the selected
 * rows' details on the right, over the sheet page and not blocking it. On a phone it fills the
 * screen with the tree and the details as two tabs, and opening a document closes it.
 */
export function DocumentsWindow({ open, onOpenChange }: DocumentsWindowProps) {
    // Closed, it holds no subscription and builds no rows: the sheet pays nothing for it (FR-017).
    return open ? <OpenDocumentsWindow open onOpenChange={onOpenChange} /> : null;
}

function OpenDocumentsWindow({ open, onOpenChange }: DocumentsWindowProps) {
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
    const [storedQuery, setStoredQuery] = useSessionStorageState<unknown>(
        'documents-window-query',
        EMPTY_QUERY
    );
    const query = useMemo(() => readQuery(storedQuery), [storedQuery]);
    // Time presets are measured from when the query last changed, not on every render.
    const [clock, setClock] = useState(() => Date.now());
    const changeQuery = useCallback(
        (patch: Partial<DocumentsQuery>) => {
            setClock(Date.now());
            setStoredQuery((current: unknown) => ({ ...readQuery(current), ...patch }));
        },
        [setStoredQuery]
    );
    const clearQuery = useCallback(() => {
        setStoredQuery((current: unknown) => ({
            ...EMPTY_QUERY,
            ...pickSort(readQuery(current)),
        }));
    }, [setStoredQuery]);
    const narrowing = isNarrowing(query);
    const queryIndex = useMemo(() => buildQueryIndex(entries, documentLabeler), [entries]);
    const found = useMemo(
        () => applyQuery(entries, folders, query, queryIndex, clock),
        [entries, folders, query, queryIndex, clock]
    );
    const expanded = useMemo(
        () => new Set([...openFolders, ...(narrowing ? [...found.open].map(folderKey) : [])]),
        [openFolders, narrowing, found.open]
    );
    const order = useMemo(() => orderFor(query, queryIndex), [query, queryIndex]);
    const rows = useMemo(
        () => buildRows(found.entries, found.folders, expanded, order),
        [found, expanded, order]
    );
    const visibleKeys = useMemo(() => rows.map(({ key }) => key), [rows]);
    const { focused, selection, select, reset } = useTreeSelection(visibleKeys);

    const [tab, setTab] = useState<'tree' | 'details'>('tree');
    const [menu, setMenu] = useState<{ key: string; x: number; y: number }>();
    /** The rows a delete or move acts on, fixed when the action starts. */
    const [acting, setActing] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [picking, setPicking] = useState(false);
    const [creatingIn, setCreatingIn] = useState<{ parentId: string | null }>();
    /** The row whose name is being typed in place. */
    const [editing, setEditing] = useState<string | null>(null);
    /** A finger-started selection: a tap toggles a row until it is stopped. */
    const [selecting, setSelecting] = useState(false);
    const coarse = useMediaQuery('(pointer: coarse)');
    const [status, setStatus] = useState<{ text: string; alert: boolean }>();
    // What was just done is said for a few seconds, not left standing.
    useEffect(() => {
        if (!status || status.alert) return;
        const timer = window.setTimeout(() => setStatus(undefined), STATUS_MS);
        return () => window.clearTimeout(timer);
    }, [status]);
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
    /** Says which tab gave way, or that no group could be made (spec 036, FR-012). */
    const announceOpening = (id: string, { closed, asTab }: OpenOutcome) => {
        const nameOf = (candidate: string) => {
            const entry = entries.find(({ id: entryId }) => entryId === candidate);
            return entry ? documentLabeler.title(entry) : candidate;
        };
        if (closed) {
            toast(
                translate(uiMessages.sheet.documents.panes.closedHidden, {
                    max: MAX_DOCUMENTS,
                    name: nameOf(id),
                    closed: nameOf(closed),
                })
            );
        }
        if (asTab) {
            toast(translate(uiMessages.sheet.documents.panes.openedAsTab, { name: nameOf(id) }));
        }
    };
    const openDocumentInNewTab = (id: string) => {
        announceOpening(id, openInNewTab(id));
        if (narrow) onOpenChange(false);
    };
    const openDocumentBeside = (id: string) => {
        announceOpening(id, openBeside(id));
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

    const drag = useDocumentsDrag({
        rows,
        folders,
        selection,
        reorderable: query.sort === 'manual',
        enabled: !coarse,
        onDrop: moveRows,
    });

    /** The rows a menu or a button acts on: the selection when the row is in it, else the row. */
    const startSelecting = (key: string) => {
        setSelecting(true);
        reset([key]);
    };
    const stopSelecting = () => {
        setSelecting(false);
        reset([]);
    };
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
    /** Where a new row goes: inside the selected folder, beside the selected document, else top. */
    const newRowPlace = (): string | null => {
        const [only] = selectedItems;
        if (selectedItems.length !== 1 || !only) return null;
        return only.type === 'folder' ? only.folder.id : only.entry.parentId;
    };
    /** A new folder appears at once with a name to type over, as in a file manager. */
    const createFolderIn = (parentId: string | null) => {
        // A search or filter could hide the new row.
        if (narrowing) clearQuery();
        const id = generateId();
        const result = change('createFolder', [
            { op: 'createFolder', id, name: translate(labels.folder.defaultName), parentId },
        ]);
        if (result.added.length === 0) return;
        revealFolder(parentId);
        reset([folderKey(id)]);
        setTab('tree');
        setEditing(folderKey(id));
    };
    const startCreate = () => createFolderIn(newRowPlace());
    const startCreateDocument = () => setCreatingIn({ parentId: newRowPlace() });

    const focusRow = (key: string) =>
        window.setTimeout(
            () =>
                treeRegion.current
                    ?.querySelector<HTMLElement>(`[data-tree-row="${CSS.escape(key)}"]`)
                    ?.focus(),
            0
        );
    const startRename = (key: string) => {
        setTab('tree');
        setEditing(key);
    };
    const stopEditing = (key: string) => {
        setEditing(null);
        focusRow(key);
    };
    const renameRow = (key: string, name: string) => {
        const trimmed = name.trim();
        if (trimmed) change('rename', [{ op: 'rename', id: idOfKey(key), name: trimmed }]);
        stopEditing(key);
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
        if (event.key === 'F2') {
            startRename(item.key);
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
                  {
                      id: 'openInNewTab',
                      label: translate(labels.details.openInNewTab),
                      icon: SquarePlus,
                  },
                  {
                      id: 'openBeside',
                      label: translate(labels.details.openBeside),
                      icon: Columns2,
                  },
                  { id: 'rename', label: translate(labels.details.rename), icon: Pencil },
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
        else if (id === 'openInNewTab' && menuItem.node.type === 'document')
            openDocumentInNewTab(menuItem.node.entry.id);
        else if (id === 'openBeside' && menuItem.node.type === 'document')
            openDocumentBeside(menuItem.node.entry.id);
        else if (id === 'rename') startRename(menuItem.key);
        else if (id === 'newFolder' && menuItem.node.type === 'folder') {
            createFolderIn(menuItem.node.folder.id);
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
                                onClick={startCreateDocument}
                                aria-label={translate(labels.toolbar.newDocument)}
                                title={translate(labels.toolbar.newDocument)}
                                className={iconButton}
                            >
                                <FilePlus className="h-4 w-4" aria-hidden="true" />
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
                        <DocumentsToolbar
                            query={query}
                            onChange={changeQuery}
                            onClear={clearQuery}
                            index={queryIndex}
                            shown={found.matches}
                            total={entries.length}
                        />
                        {selecting && (
                            <SelectionBar
                                text={plural(labels.details.selected, selectedKeys.length)}
                                cancelLabel={translate(labels.toolbar.stopSelecting)}
                                onCancel={stopSelecting}
                                actions={
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => startMove(selectedKeys)}
                                            disabled={selectedKeys.length === 0}
                                            aria-label={translate(labels.details.move)}
                                            title={translate(labels.details.move)}
                                            className={iconButton}
                                        >
                                            <FolderInput className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => startDelete(selectedKeys)}
                                            disabled={selectedKeys.length === 0}
                                            aria-label={translate(labels.details.delete)}
                                            title={translate(labels.details.delete)}
                                            className={iconButton}
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </>
                                }
                            />
                        )}
                        <div
                            role={drag.refused || status?.alert ? 'alert' : 'status'}
                            className={clsx(
                                'px-2 text-xs',
                                (drag.refused || status?.alert) && 'py-1 text-error',
                                !drag.refused && !status?.alert && 'text-textSecondary',
                                !drag.refused && !status && 'sr-only'
                            )}
                        >
                            {drag.refused ? translate(labels.refused[drag.refused]) : status?.text}
                        </div>
                        <div
                            ref={treeRegion}
                            className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2"
                        >
                            {rows.length === 0 ? (
                                narrowing ? (
                                    <div className="space-y-2 p-4 text-sm text-textSecondary">
                                        <p className="m-0">{translate(labels.search.noMatch)}</p>
                                        <button
                                            type="button"
                                            onClick={clearQuery}
                                            className="text-primary underline-offset-2 hover:underline"
                                        >
                                            {translate(labels.search.clearAll)}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="p-4 text-sm text-textSecondary">
                                        {translate(labels.empty)}
                                    </p>
                                )
                            ) : (
                                <DocumentsTree
                                    rows={rows}
                                    focused={focused}
                                    selection={selection}
                                    currentDocumentId={currentDocumentId}
                                    onSelect={select}
                                    // A click only selects (T-116); on a phone it shows the details,
                                    // where Open and Open beside are.
                                    onRowClick={(item) => {
                                        if (narrow && item.node.type === 'document') {
                                            setTab('details');
                                        }
                                    }}
                                    onToggle={toggleFolder}
                                    onEnter={activate}
                                    onDelete={() => startDelete(selectedKeys)}
                                    onMenu={(key, anchor) => setMenu({ key, ...anchor })}
                                    onCommand={onCommand}
                                    dragFor={drag.dragFor}
                                    editing={editing}
                                    onRename={renameRow}
                                    onRenameCancel={stopEditing}
                                    highlight={query.text}
                                    selecting={selecting}
                                    onLongPress={startSelecting}
                                    scrollRef={treeRegion}
                                />
                            )}
                            <div
                                aria-hidden="true"
                                {...drag.endZone}
                                className={clsx(
                                    'min-h-10 flex-1 border-t-2 border-transparent',
                                    drag.atEnd && 'border-primary'
                                )}
                            />
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
                            onOpenBeside={(entry) => openDocumentBeside(entry.id)}
                            onOpenInNewTab={(entry) => openDocumentInNewTab(entry.id)}
                            onRename={renameRow}
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
            <DocumentCreateDialog
                open={creatingIn !== undefined}
                onOpenChange={(next) => !next && setCreatingIn(undefined)}
                activate={false}
                parentId={creatingIn?.parentId ?? null}
                onCreated={(id) => {
                    if (narrowing) clearQuery();
                    revealFolder(creatingIn?.parentId ?? null);
                    reset([documentKey(id)]);
                    setTab('tree');
                    // A new document asks for its name at once, like a new folder.
                    // After the dialog has let go of the focus, or its trap would take it back.
                    window.setTimeout(() => setEditing(documentKey(id)), 0);
                }}
            />
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
