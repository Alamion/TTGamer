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
import clsx from 'clsx';
import { ExternalLink, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { buildRows, documentKey, type DocumentsNode } from '../../features/documents/rows';
import { useDocumentStore } from '../../store/documentStore';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { DocumentDetails } from './DocumentDetails';
import { DocumentsTree } from './DocumentsTree';
import { RejectedFiles } from './RejectedFiles';

const labels = uiMessages.sheet.documents.manager;

const TREE_LIMITS: Record<'tree', PaneLimits> = { tree: { min: 180, max: 520, initial: 280 } };
const TREE_ROOM = { restMin: 240, dividers: 6 };

export interface DocumentsWindowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * The documents window (spec 032): the tree of folders and documents on the left, the selected
 * one's details on the right, over the sheet page and not blocking it. On a phone it fills the
 * screen with the tree and the details as two tabs, and opening a document closes it.
 */
export function DocumentsWindow({ open, onOpenChange }: DocumentsWindowProps) {
    const plural = usePluralMessage();
    const narrow = useMediaQuery('(max-width: 767px)');
    const entries = useDocumentStore((state) => state.entries);
    const folders = useDocumentStore((state) => state.folders);
    const currentDocumentId = useDocumentStore((state) => state.currentDocumentId);
    const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);
    const deleteDocument = useDocumentStore((state) => state.deleteDocument);

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
    const [confirmDelete, setConfirmDelete] = useState(false);
    const treeRegion = useRef<HTMLDivElement>(null);
    const { ref: bodyRef, node: body, width: bodyWidth } = useMeasuredElement<HTMLDivElement>();
    const panes = usePaneSizes('documents-panes', TREE_LIMITS, bodyWidth, TREE_ROOM);
    const previewTree = useCallback(
        (width: number) => body?.style.setProperty('--tree', `${width}px`),
        [body]
    );

    const byKey = useMemo(() => new Map(rows.map((row) => [row.key, row])), [rows]);
    const selectedDocuments = useMemo(
        () =>
            [...selection].flatMap((key) => {
                const node = byKey.get(key)?.node;
                return node?.type === 'document' ? [node.entry] : [];
            }),
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

    const openDocument = (id: string) => {
        setCurrentDocument(id);
        if (narrow) onOpenChange(false);
    };
    const activate = (item: TreeRowItem<DocumentsNode>) => {
        if (item.node.type === 'document') openDocument(item.node.entry.id);
        else if (item.expandable) toggleFolder(item.key, !item.expanded);
    };

    /** Deletes the selected documents; the sheet moves to the nearest document left, or empties. */
    const deleteSelected = () => {
        const doomed = new Set(selectedDocuments.map(({ id }) => id));
        if (doomed.size === 0) return;
        const order = rows.flatMap(({ node }) => (node.type === 'document' ? [node.entry.id] : []));
        const first = order.findIndex((id) => doomed.has(id));
        const survivor =
            order.slice(first).find((id) => !doomed.has(id)) ??
            order
                .slice(0, first)
                .reverse()
                .find((id) => !doomed.has(id));
        const wasOpen = currentDocumentId !== null && doomed.has(currentDocumentId);
        doomed.forEach(deleteDocument);
        if (wasOpen) setCurrentDocument(survivor ?? null);
        reset([]);
        setConfirmDelete(false);
    };

    const menuItem = menu ? byKey.get(menu.key) : undefined;
    const menuDocument = menuItem?.node.type === 'document' ? menuItem.node.entry : undefined;

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
                        ref={treeRegion}
                        className={clsx(
                            'min-h-0 flex-1 overflow-y-auto p-2 md:block md:w-[var(--tree)] md:flex-none',
                            tab === 'tree' ? 'block' : 'hidden'
                        )}
                    >
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
                                onDelete={() =>
                                    selectedDocuments.length > 0 && setConfirmDelete(true)
                                }
                                onMenu={(key, anchor) => setMenu({ key, ...anchor })}
                                scrollRef={treeRegion}
                            />
                        )}
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
                            documents={selectedDocuments}
                            onOpen={(entry) => openDocument(entry.id)}
                            onDelete={() => setConfirmDelete(true)}
                        />
                    </div>
                </div>
                <RejectedFiles />
            </FloatingWindow>
            {open && menu && menuDocument && (
                <TreeContextMenu
                    label={translate(labels.rowActions, { name: menuItem?.name ?? '' })}
                    container={null}
                    anchor={menu}
                    actions={[
                        {
                            id: 'open',
                            label: translate(labels.details.open),
                            icon: ExternalLink,
                        },
                        {
                            id: 'delete',
                            label: translate(labels.details.delete),
                            icon: Trash2,
                            danger: true,
                        },
                    ]}
                    onAction={(id) => {
                        if (id === 'open') openDocument(menuDocument.id);
                        else {
                            if (!selection.has(documentKey(menuDocument.id))) {
                                reset([documentKey(menuDocument.id)]);
                            }
                            setConfirmDelete(true);
                        }
                    }}
                    onClose={() => setMenu(undefined)}
                />
            )}
            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                onConfirm={deleteSelected}
                title={translate(labels.deleteTitle)}
                description={plural(labels.deleteDescription, selectedDocuments.length)}
                confirmLabel={translate(labels.deleteSelected)}
                cancelLabel={translate(uiMessages.sheet.documents.create.cancel)}
                variant="danger"
            />
        </>
    );
}
