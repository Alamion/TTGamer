import clsx from 'clsx';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import type { DragEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { memo } from 'react';

/** What extends the selection: a plain click or key replaces it; Ctrl/Cmd toggles; Shift ranges. */
export type SelectExtend = 'none' | 'toggle' | 'range';

export interface TreeRowDrag {
    draggable: boolean;
    onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
    onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
    onDragLeave?: (event: DragEvent<HTMLDivElement>) => void;
    onDrop?: (event: DragEvent<HTMLDivElement>) => void;
    /** A dragged row would land inside this row. */
    over?: boolean;
    /** A dragged row would land just above or below this row. */
    edge?: 'before' | 'after';
}

/** What a tree's owner puts into a row besides its name. */
export interface TreeRowSlots {
    icon?: ReactNode;
    /** Export/import mode: the row's checkbox, rendered before the icon. */
    checkbox?: ReactNode;
    /** Badges after the name. */
    badges?: ReactNode;
    /** A state badge and reason, after the badges. */
    trailing?: ReactNode;
    /** A short count shown from the `sm` breakpoint up. */
    count?: string;
    drag?: TreeRowDrag;
    /** Briefly highlighted after a move landed here. */
    flash?: boolean;
    /** Shown dimmed (its owner is not available). */
    dimmed?: boolean;
    /** Whether the row has a menu: its button and its keys; `false` when it has nothing to offer. */
    menu?: boolean;
}

export interface TreeRowShellProps extends TreeRowSlots {
    /** Prefix of the row's element id, unique per tree on the page. */
    idPrefix: string;
    rowKey: string;
    name: string;
    depth: number;
    setSize: number;
    position: number;
    expandable: boolean;
    expanded: boolean;
    selected: boolean;
    tabbable: boolean;
    /** The accessible names of the chevron and the row menu button. */
    toggleLabel: string;
    actionsLabel: string;
    onSelect: (key: string, extend: SelectExtend) => void;
    onToggle: (key: string) => void;
    /** The menu button: opens the menu and nothing else (no selection, no click on the row). */
    onMenu: (key: string, anchor: { x: number; y: number }) => void;
    /** A right click: selects the row (without the click's side effects), then opens the menu. */
    onContext: (key: string, anchor: { x: number; y: number }) => void;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const extendOf = (event: MouseEvent<HTMLElement>): SelectExtend =>
    event.ctrlKey || event.metaKey ? 'toggle' : event.shiftKey ? 'range' : 'none';

/**
 * One `treeitem` of every tree (WAI-ARIA tree pattern): chevron, selection and focus styles, the
 * row menu, drag slots. What a row says is the owner's (`TreeRowSlots`). Props only.
 */
export const TreeRowShell = memo(function TreeRowShell({
    idPrefix,
    rowKey,
    name,
    depth,
    setSize,
    position,
    expandable,
    expanded,
    selected,
    tabbable,
    toggleLabel,
    actionsLabel,
    icon,
    checkbox,
    badges,
    trailing,
    count,
    drag,
    flash,
    dimmed,
    menu = true,
    onSelect,
    onToggle,
    onMenu,
    onContext,
    onKeyDown,
}: TreeRowShellProps) {
    const openMenu = (event: MouseEvent<HTMLElement>, open: TreeRowShellProps['onMenu']) => {
        event.preventDefault();
        event.stopPropagation();
        open(rowKey, { x: event.clientX, y: event.clientY });
    };

    return (
        <div
            role="treeitem"
            id={`${idPrefix}${rowKey}`}
            data-tree-row={rowKey}
            aria-level={depth}
            aria-setsize={setSize}
            aria-posinset={position}
            aria-selected={selected}
            aria-expanded={expandable ? expanded : undefined}
            tabIndex={tabbable ? 0 : -1}
            onClick={(event) => onSelect(rowKey, extendOf(event))}
            onContextMenu={menu ? (event) => openMenu(event, onContext) : undefined}
            onKeyDown={onKeyDown}
            draggable={drag?.draggable ?? false}
            onDragStart={drag?.onDragStart}
            onDragOver={drag?.onDragOver}
            onDragLeave={drag?.onDragLeave}
            onDrop={drag?.onDrop}
            className={clsx(
                'group flex min-h-8 cursor-pointer items-center gap-1.5 rounded-sm border pr-1 text-sm outline-hidden transition-colors [@media(pointer:coarse)]:min-h-11',
                'focus-visible:ring-2 focus-visible:ring-primary',
                selected
                    ? 'border-primary/60 bg-primary/10 text-textPrimary'
                    : 'border-transparent text-textPrimary hover:bg-secondary/10',
                drag?.over && 'border-primary bg-primary/5',
                drag?.edge === 'before' && 'border-t-2 border-t-primary',
                drag?.edge === 'after' && 'border-b-2 border-b-primary',
                flash && 'bg-secondary/20',
                dimmed && 'opacity-60',
                drag?.draggable && 'active:cursor-grabbing'
            )}
            style={{ paddingLeft: `${(depth - 1) * 0.875 + 0.25}rem` }}
        >
            <button
                type="button"
                tabIndex={-1}
                aria-label={toggleLabel}
                onClick={(event) => {
                    event.stopPropagation();
                    onToggle(rowKey);
                }}
                className={clsx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-textSecondary hover:text-textPrimary [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-8',
                    !expandable && 'invisible'
                )}
            >
                <ChevronRight
                    className={clsx(
                        'h-3.5 w-3.5 transition-transform duration-200 ease-linear motion-reduce:transition-none',
                        expanded && 'rotate-90'
                    )}
                    aria-hidden="true"
                />
            </button>
            {checkbox}
            {icon}
            <span className="min-w-0 flex-1 truncate">{name}</span>
            {badges}
            {trailing}
            {count && (
                <span className="hidden shrink-0 text-xs tabular-nums text-textSecondary sm:inline">
                    {count}
                </span>
            )}
            {menu && (
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label={actionsLabel}
                    onClick={(event) => openMenu(event, onMenu)}
                    className="rounded-sm p-1 text-textSecondary opacity-60 hover:bg-bgBase hover:text-textPrimary group-hover:opacity-100 [@media(pointer:coarse)]:p-2.5 [@media(pointer:coarse)]:opacity-100"
                >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
});
