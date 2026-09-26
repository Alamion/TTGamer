import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import {
    ChevronRight,
    Dices,
    FileText,
    Globe2,
    LayoutTemplate,
    MoreHorizontal,
    Star,
} from 'lucide-react';
import type { DragEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { memo } from 'react';

import type { LibraryLevel, LibraryNode } from '../../../features/sheet/data/libraryTree';

const labels = uiMessages.sheet.library;

const LEVEL_ICON: Record<LibraryLevel, typeof Dices> = {
    ruleset: Dices,
    setting: Globe2,
    type: LayoutTemplate,
    page: FileText,
};

const badge = 'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

export interface TreeRowDrag {
    draggable: boolean;
    onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
    onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
    onDragLeave?: (event: DragEvent<HTMLDivElement>) => void;
    onDrop?: (event: DragEvent<HTMLDivElement>) => void;
    /** A dragged row may be dropped here. */
    over?: boolean;
}

export interface TreeRowProps {
    node: LibraryNode;
    depth: number;
    setSize: number;
    position: number;
    expanded: boolean;
    selected: boolean;
    tabbable: boolean;
    /** Briefly highlighted after a move landed here. */
    flash?: boolean;
    /** Export/import mode: the row's checkbox, rendered before its name. */
    checkbox?: ReactNode;
    /** Import mode: state badge and reason. */
    trailing?: ReactNode;
    drag?: TreeRowDrag;
    onSelect: (key: string) => void;
    onToggle: (key: string) => void;
    onMenu: (key: string, anchor: { x: number; y: number }) => void;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

function hasChildren(node: LibraryNode): boolean {
    switch (node.level) {
        case 'ruleset':
            return node.settings.length > 0;
        case 'setting':
            return node.types.length > 0;
        case 'type':
            return node.pages.length > 0;
        case 'page':
            return false;
    }
}

/** One `treeitem` of the library (contracts/library-ui.md "Row content"). Props only. */
export const TreeRow = memo(function TreeRow({
    node,
    depth,
    setSize,
    position,
    expanded,
    selected,
    tabbable,
    flash,
    checkbox,
    trailing,
    drag,
    onSelect,
    onToggle,
    onMenu,
    onKeyDown,
}: TreeRowProps) {
    const plural = usePluralMessage();
    const Icon = LEVEL_ICON[node.level];
    const expandable = hasChildren(node);
    const count =
        node.level === 'ruleset'
            ? plural(labels.counts.settings, node.settings.length)
            : node.level === 'setting'
              ? plural(labels.counts.types, node.types.length)
              : node.level === 'type'
                ? plural(labels.counts.documents, node.documentCount)
                : undefined;
    const edited = node.level === 'page' && node.ref.kind === 'shipped' && node.ref.edited;
    const openMenu = (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(node.key);
        onMenu(node.key, { x: event.clientX, y: event.clientY });
    };

    return (
        <div
            role="treeitem"
            id={`library-row-${node.key}`}
            data-library-row={node.key}
            aria-level={depth}
            aria-setsize={setSize}
            aria-posinset={position}
            aria-selected={selected}
            aria-expanded={expandable ? expanded : undefined}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onSelect(node.key)}
            onContextMenu={openMenu}
            onKeyDown={onKeyDown}
            draggable={drag?.draggable ?? false}
            onDragStart={drag?.onDragStart}
            onDragOver={drag?.onDragOver}
            onDragLeave={drag?.onDragLeave}
            onDrop={drag?.onDrop}
            className={clsx(
                'group flex min-h-8 cursor-pointer items-center gap-1.5 rounded border pr-1 text-sm outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-primary',
                selected
                    ? 'border-primary/60 bg-primary/10 text-textPrimary'
                    : 'border-transparent text-textPrimary hover:bg-secondary/10',
                drag?.over && 'border-primary bg-primary/5',
                flash && 'bg-secondary/20',
                node.unavailable && 'opacity-60',
                drag?.draggable && 'active:cursor-grabbing'
            )}
            style={{ paddingLeft: `${(depth - 1) * 0.875 + 0.25}rem` }}
        >
            <button
                type="button"
                tabIndex={-1}
                aria-label={translate(expanded ? labels.row.collapse : labels.row.expand, {
                    name: node.name,
                })}
                onClick={(event) => {
                    event.stopPropagation();
                    onToggle(node.key);
                }}
                className={clsx(
                    'rounded p-0.5 text-textSecondary hover:text-textPrimary',
                    !expandable && 'invisible'
                )}
            >
                <ChevronRight
                    className={clsx('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
                    aria-hidden="true"
                />
            </button>
            {checkbox}
            <Icon className="h-4 w-4 shrink-0 text-textSecondary" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
            {node.level === 'page' && node.isDefault && (
                <Star
                    className="h-3.5 w-3.5 shrink-0 fill-secondary text-secondary"
                    aria-label={translate(labels.badges.default)}
                    role="img"
                />
            )}
            {node.ownership === 'user' && node.level !== 'ruleset' && (
                <span className={clsx(badge, 'bg-primary/10 text-primary')}>
                    {translate(labels.badges.yours)}
                </span>
            )}
            {edited && (
                <span className={clsx(badge, 'bg-secondary/15 text-textPrimary')}>
                    {translate(labels.badges.edited)}
                </span>
            )}
            {node.level === 'setting' && node.ref.kind === 'rules' && (
                <span className={clsx(badge, 'bg-bgBase text-textSecondary')}>
                    {translate(labels.badges.noSetting)}
                </span>
            )}
            {node.unavailable && (
                <span className={clsx(badge, 'bg-bgBase text-textSecondary')}>
                    {translate(labels.badges.unavailable)}
                </span>
            )}
            {trailing}
            {count && (
                <span className="hidden shrink-0 text-xs tabular-nums text-textSecondary sm:inline">
                    {count}
                </span>
            )}
            <button
                type="button"
                tabIndex={-1}
                aria-label={translate(labels.row.actions, { name: node.name })}
                onClick={openMenu}
                className="rounded p-1 text-textSecondary opacity-60 hover:bg-bgBase hover:text-textPrimary group-hover:opacity-100"
            >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
});
