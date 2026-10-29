import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { SelectExtend, TreeRowDrag } from '@site/src/shared/components/tree/TreeRowShell';
import { type TreeRowItem, TreeView } from '@site/src/shared/components/tree/TreeView';
import { useSitePath } from '@site/src/shared/hooks/useSitePath';
import { FileText, Folder, FolderOpen } from 'lucide-react';
import type { KeyboardEvent, RefObject } from 'react';
import { useState } from 'react';

import { reportSheetIssue } from '../../diagnostics';
import { highlightSegments } from '../../features/documents/highlight';
import { type DocumentBadge, documentBadge } from '../../features/documents/labeler';
import type { DocumentsNode } from '../../features/documents/rows';
import { InlineName } from './InlineName';
import { svgDataUrl } from './settingPicture';

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
    /** Enter or a double click on a row: a document opens, a folder opens or closes. */
    onEnter: (item: TreeRowItem<DocumentsNode>) => void;
    onDelete: (item: TreeRowItem<DocumentsNode>) => void;
    onMenu: (key: string, anchor: { x: number; y: number }) => void;
    /** Keys the window handles itself (F2, Ctrl+Z); true when handled. */
    onCommand: (event: KeyboardEvent<HTMLDivElement>, item: TreeRowItem<DocumentsNode>) => boolean;
    dragFor: (item: TreeRowItem<DocumentsNode>) => TreeRowDrag;
    /** The row whose name is typed in place, if any. */
    editing: string | null;
    onRename: (key: string, name: string) => void;
    onRenameCancel: (key: string) => void;
    /** The search text: matches in names are marked. */
    highlight: string;
    /** A finger-started selection is on (a tap toggles). */
    selecting: boolean;
    onLongPress: (key: string) => void;
    scrollRef: RefObject<HTMLElement | null>;
}

const iconClass = 'h-4 w-4 shrink-0 text-textSecondary';

const failedPictures = new Set<string>();

/** Once per setting and page load: every row of the setting fails the same way. */
function reportPictureFailure(settingId: string) {
    if (failedPictures.has(settingId)) return;
    failedPictures.add(settingId);
    reportSheetIssue({
        code: 'setting-picture-failed',
        message: "A setting's picture could not be drawn; its letters show instead",
        details: { settingId },
    });
}

/**
 * The setting a document belongs to: its own picture, its mark, else its letters; the full name is the tooltip and
 * what readers hear. A mark is a one-colour file masking the text colour, so it follows the theme.
 */
function SystemBadge({ badge, name, mark, picture }: DocumentBadge) {
    const sitePath = useSitePath();
    const [failed, setFailed] = useState<string>();
    const maskImage = mark ? `url("${sitePath(mark)}")` : undefined;
    const shownPicture = picture && failed !== picture.svg ? picture : undefined;
    return (
        <span
            title={name}
            className="inline-flex shrink-0 items-center rounded-sm border border-border px-1 py-0.5 text-[10px] font-medium text-textSecondary"
        >
            {shownPicture ? (
                <img
                    alt=""
                    src={svgDataUrl(shownPicture.svg)}
                    onError={() => {
                        setFailed(shownPicture.svg);
                        reportPictureFailure(shownPicture.settingId);
                    }}
                    className="block h-3 w-3 object-contain"
                />
            ) : maskImage ? (
                <span
                    aria-hidden="true"
                    data-badge-mark={mark}
                    className="block h-3 w-3 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
                    style={{ maskImage, WebkitMaskImage: maskImage }}
                />
            ) : (
                <span aria-hidden="true">{badge}</span>
            )}
            <span className="sr-only">{name}</span>
        </span>
    );
}

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
    editing,
    onRename,
    onRenameCancel,
    highlight,
    selecting,
    onLongPress,
    scrollRef,
}: DocumentsTreeProps) {
    const byKey = new Map(rows.map((row) => [row.key, row]));
    // A badge every shown row shares says nothing (one game, or a system filter on).
    const byTarget = new Map<string, DocumentBadge>();
    const badgeFor = (systemId: string, kind: string, settingId?: string) => {
        const target = `${systemId}\u0000${kind}\u0000${settingId ?? ''}`;
        let badge = byTarget.get(target);
        if (!badge) {
            badge = documentBadge(systemId, kind, settingId);
            byTarget.set(target, badge);
        }
        return badge;
    };
    const badges = new Map(
        rows.flatMap(({ key, node }) =>
            node.type === 'document'
                ? [
                      [
                          key,
                          badgeFor(node.entry.systemId, node.entry.kind, node.entry.settingId),
                      ] as const,
                  ]
                : []
        )
    );
    const badged = new Set([...badges.values()].map(({ name }) => name)).size > 1;
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
            onRowDoubleClick={onEnter}
            onDelete={onDelete}
            onMenu={onMenu}
            onCommand={onCommand}
            selecting={selecting}
            onLongPress={onLongPress}
            onSpace={(item) => onSelect(item.key, 'toggle')}
            renderRow={(item) => {
                const { node, expanded } = item;
                const isEditing = editing === item.key;
                const drag = isEditing ? undefined : dragFor(item);
                const nameSlot = isEditing ? (
                    <InlineName
                        initial={item.name}
                        label={translate(labels.details.name)}
                        onCommit={(name) => onRename(item.key, name)}
                        onCancel={() => onRenameCancel(item.key)}
                    />
                ) : highlight.trim() ? (
                    <span className="min-w-0 flex-1 truncate">
                        {highlightSegments(item.name, highlight).map((segment, position) =>
                            segment.match ? (
                                <mark
                                    key={position}
                                    className="rounded-sm bg-primary/25 text-inherit"
                                >
                                    {segment.text}
                                </mark>
                            ) : (
                                segment.text
                            )
                        )}
                    </span>
                ) : undefined;
                return node.type === 'folder'
                    ? {
                          icon: expanded ? (
                              <FolderOpen className={iconClass} aria-hidden="true" />
                          ) : (
                              <Folder className={iconClass} aria-hidden="true" />
                          ),
                          drag,
                          nameSlot,
                      }
                    : {
                          icon: <FileText className={iconClass} aria-hidden="true" />,
                          drag,
                          nameSlot,
                          badges: (
                              <>
                                  {badged && <SystemBadge {...badges.get(item.key)!} />}
                                  {node.entry.id === currentDocumentId && (
                                      <span className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                          {translate(labels.current)}
                                      </span>
                                  )}
                              </>
                          ),
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
