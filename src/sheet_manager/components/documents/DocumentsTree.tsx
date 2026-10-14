import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { SelectExtend, TreeRowDrag } from '@site/src/shared/components/tree/TreeRowShell';
import { type TreeRowItem, TreeView } from '@site/src/shared/components/tree/TreeView';
import { FileText, Folder, FolderOpen } from 'lucide-react';
import type { KeyboardEvent, RefObject } from 'react';

import type { DocumentsNode } from '../../features/documents/rows';

const labels = uiMessages.sheet.documents.manager;

export interface DocumentsTreeProps {
    rows: readonly TreeRowItem<DocumentsNode>[];
    focused: string | undefined;
    selection: ReadonlySet<string>;
    /** The document shown on the sheet, marked in the list. */
    currentDocumentId: string | null;
    onSelect: (key: string, extend: SelectExtend) => void;
    /** A plain click on a row. */
    onRowClick: (item: TreeRowItem<DocumentsNode>) => void;
    onToggle: (key: string, open?: boolean) => void;
    /** Enter on a row: a document opens, a folder opens or closes. */
    onEnter: (item: TreeRowItem<DocumentsNode>) => void;
    onDelete: (item: TreeRowItem<DocumentsNode>) => void;
    onMenu: (key: string, anchor: { x: number; y: number }) => void;
    /** Keys the window handles itself (F2, Ctrl+Z); true when handled. */
    onCommand: (event: KeyboardEvent<HTMLDivElement>, item: TreeRowItem<DocumentsNode>) => boolean;
    dragFor: (item: TreeRowItem<DocumentsNode>) => TreeRowDrag;
    scrollRef: RefObject<HTMLElement | null>;
}

const iconClass = 'h-4 w-4 shrink-0 text-textSecondary';

/** The documents tree: the shared tree over folders and documents (spec 032, FR-023). */
export function DocumentsTree({
    rows,
    focused,
    selection,
    currentDocumentId,
    onSelect,
    onRowClick,
    onToggle,
    onEnter,
    onDelete,
    onMenu,
    onCommand,
    dragFor,
    scrollRef,
}: DocumentsTreeProps) {
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return (
        <TreeView
            label={translate(labels.treeLabel)}
            rows={rows}
            selectedKey={focused}
            selectedKeys={selection}
            onSelect={onSelect}
            onRowClick={(key, extend) => {
                const item = byKey.get(key);
                if (item && extend === 'none') onRowClick(item);
            }}
            onToggle={onToggle}
            onEnter={onEnter}
            onDelete={onDelete}
            onMenu={onMenu}
            onCommand={onCommand}
            onSpace={(item) => onSelect(item.key, 'toggle')}
            renderRow={(item) => {
                const { node, expanded } = item;
                const drag = dragFor(item);
                return node.type === 'folder'
                    ? {
                          icon: expanded ? (
                              <FolderOpen className={iconClass} aria-hidden="true" />
                          ) : (
                              <Folder className={iconClass} aria-hidden="true" />
                          ),
                          drag,
                      }
                    : {
                          icon: <FileText className={iconClass} aria-hidden="true" />,
                          drag,
                          badges:
                              node.entry.id === currentDocumentId ? (
                                  <span className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                      {translate(labels.current)}
                                  </span>
                              ) : undefined,
                      };
            }}
            labels={{
                toggle: (name, expanded) =>
                    translate(expanded ? labels.collapse : labels.expand, { name }),
                actions: (name) => translate(labels.rowActions, { name }),
            }}
            idPrefix="documents-row-"
            scrollRef={scrollRef}
        />
    );
}
