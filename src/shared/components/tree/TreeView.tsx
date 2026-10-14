import { normalizeSearchText } from '@site/src/shared/utils/normalizeSearchText';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { type SelectExtend, TreeRowShell, type TreeRowSlots } from './TreeRowShell';
import { useRowWindow } from './useRowWindow';

/** One row of a flattened tree: where it sits and what it is; `node` is the owner's data. */
export interface TreeRowItem<T> {
    key: string;
    node: T;
    /** The name type-ahead matches and the row menu announces. */
    name: string;
    /** 1 for the top level. */
    depth: number;
    setSize: number;
    position: number;
    expandable: boolean;
    expanded: boolean;
    parentKey: string | undefined;
}

export interface TreeViewLabels {
    /** The chevron's name for a row in its current state. */
    toggle: (name: string, expanded: boolean) => string;
    actions: (name: string) => string;
}

export interface TreeViewProps<T> {
    label: string;
    rows: readonly TreeRowItem<T>[];
    /** The focused row: the one Tab reaches. In a single selection it is also the selected one. */
    selectedKey: string | undefined;
    /** Several selected rows (Ctrl/Cmd and Shift click, Shift with arrows); omit for one. */
    selectedKeys?: ReadonlySet<string>;
    onSelect: (key: string, extend: SelectExtend) => void;
    /** A pointer click on a row, after it was selected. */
    onRowClick?: (key: string, extend: SelectExtend) => void;
    onToggle: (key: string, open?: boolean) => void;
    /** Enter on a row; by default a branch opens or closes. */
    onEnter?: (item: TreeRowItem<T>) => void;
    onDelete?: (item: TreeRowItem<T>) => void;
    onMenu: (key: string, anchor: { x: number; y: number }) => void;
    /** Space on a row (export and import modes tick it; the documents window toggles it). */
    onSpace?: (item: TreeRowItem<T>) => void;
    renderRow: (item: TreeRowItem<T>) => TreeRowSlots | undefined;
    labels: TreeViewLabels;
    /** Prefix of the rows' element ids. */
    idPrefix: string;
    /** The scrolling ancestor; given, a list longer than `windowAbove` draws only the rows in view. */
    scrollRef?: RefObject<HTMLElement | null>;
    windowAbove?: number;
    emptyMessage?: ReactNode;
}

const TYPE_AHEAD_MS = 600;
const WINDOW_ABOVE = 200;

/**
 * The tree every list of nested rows uses (library, documents): WAI-ARIA tree pattern, one
 * tabbable row, arrows, Home, End, type-ahead, menu keys, optional multi-selection, and fixed-height
 * row windowing for long lists. Rows come flat from the owner, who knows its nodes.
 */
export function TreeView<T>({
    label,
    rows,
    selectedKey,
    selectedKeys,
    onSelect,
    onRowClick,
    onToggle,
    onEnter,
    onDelete,
    onMenu,
    onSpace,
    renderRow,
    labels,
    idPrefix,
    scrollRef,
    windowAbove = WINDOW_ABOVE,
    emptyMessage,
}: TreeViewProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const focusPending = useRef(false);
    const typed = useRef({ text: '', at: 0 });
    const { windowed, range, stride, scrollToIndex } = useRowWindow({
        count: rows.length,
        threshold: windowAbove,
        scrollRef,
        containerRef,
    });
    const shown = windowed ? rows.slice(range.start, range.end) : rows;

    const selectedIndex = rows.findIndex(({ key }) => key === selectedKey);
    const tabbableKey =
        selectedIndex >= range.start && selectedIndex < range.end
            ? selectedKey
            : (shown[0]?.key ?? undefined);

    useEffect(() => {
        if (!focusPending.current || !selectedKey) return;
        const row = containerRef.current?.querySelector<HTMLElement>(
            `[data-tree-row="${CSS.escape(selectedKey)}"]`
        );
        if (!row) {
            // Not drawn yet: bring its place into view; the window then draws it and this runs again.
            if (selectedIndex >= 0) scrollToIndex(selectedIndex);
            return;
        }
        focusPending.current = false;
        row.focus();
        row.scrollIntoView?.({ block: 'nearest' });
    }, [selectedKey, selectedIndex, range.start, range.end, scrollToIndex]);

    const moveTo = useCallback(
        (key: string | undefined, extend: SelectExtend = 'none') => {
            if (!key) return;
            focusPending.current = true;
            onSelect(key, extend);
        },
        [onSelect]
    );

    const openMenuAtRow = (key: string) => {
        const row = containerRef.current?.querySelector<HTMLElement>(
            `[data-tree-row="${CSS.escape(key)}"]`
        );
        const rect = row?.getBoundingClientRect();
        onMenu(key, rect ? { x: rect.left + 24, y: rect.bottom } : { x: 0, y: 0 });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        const index = rows.findIndex(({ key }) => key === selectedKey);
        const current = rows[index];
        if (!current) return;
        const handled = () => {
            event.preventDefault();
            event.stopPropagation();
        };
        const extend: SelectExtend = event.shiftKey ? 'range' : 'none';
        const firstChild = rows[index + 1]?.parentKey === current.key ? rows[index + 1] : undefined;
        switch (event.key) {
            case 'ArrowDown':
                handled();
                moveTo(rows[index + 1]?.key, extend);
                return;
            case 'ArrowUp':
                handled();
                moveTo(rows[index - 1]?.key, extend);
                return;
            case 'ArrowRight':
                handled();
                if (!current.expandable) return;
                if (!current.expanded) onToggle(current.key, true);
                else moveTo(firstChild?.key);
                return;
            case 'ArrowLeft':
                handled();
                if (current.expanded && current.expandable) onToggle(current.key, false);
                else moveTo(current.parentKey);
                return;
            case 'Home':
                handled();
                moveTo(rows[0]?.key, extend);
                return;
            case 'End':
                handled();
                moveTo(rows.at(-1)?.key, extend);
                return;
            case 'Enter':
                handled();
                if (onEnter) onEnter(current);
                else if (current.expandable) onToggle(current.key, !current.expanded);
                return;
            case ' ':
                if (!onSpace) return;
                handled();
                onSpace(current);
                return;
            case 'Delete':
                if (!onDelete) return;
                handled();
                onDelete(current);
                return;
            case 'ContextMenu':
                handled();
                openMenuAtRow(current.key);
                return;
            case 'F10':
                if (!event.shiftKey) return;
                handled();
                openMenuAtRow(current.key);
                return;
            default:
                break;
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = event.timeStamp;
            const text =
                (now - typed.current.at < TYPE_AHEAD_MS ? typed.current.text : '') +
                normalizeSearchText(event.key);
            typed.current = { text, at: now };
            const ordered = [...rows.slice(index + 1), ...rows.slice(0, index + 1)];
            const match = ordered.find((row) => normalizeSearchText(row.name).startsWith(text));
            if (match) {
                handled();
                moveTo(match.key);
            }
        }
    };

    const clickRow = useCallback(
        (key: string, extend: SelectExtend) => {
            onSelect(key, extend);
            onRowClick?.(key, extend);
        },
        [onSelect, onRowClick]
    );

    if (rows.length === 0 && emptyMessage) return <>{emptyMessage}</>;

    return (
        <div
            ref={containerRef}
            role="tree"
            aria-label={label}
            aria-multiselectable={selectedKeys ? true : undefined}
            className="flex flex-col gap-0.5"
            style={
                windowed
                    ? {
                          paddingTop: range.start * stride,
                          paddingBottom: (rows.length - range.end) * stride,
                      }
                    : undefined
            }
        >
            {shown.map((item) => (
                <TreeRowShell
                    key={item.key}
                    idPrefix={idPrefix}
                    rowKey={item.key}
                    name={item.name}
                    depth={item.depth}
                    setSize={item.setSize}
                    position={item.position}
                    expandable={item.expandable}
                    expanded={item.expanded}
                    selected={selectedKeys ? selectedKeys.has(item.key) : item.key === selectedKey}
                    tabbable={item.key === tabbableKey}
                    toggleLabel={labels.toggle(item.name, item.expanded)}
                    actionsLabel={labels.actions(item.name)}
                    {...renderRow(item)}
                    onSelect={clickRow}
                    onToggle={onToggle}
                    onMenu={onMenu}
                    onKeyDown={handleKeyDown}
                />
            ))}
        </div>
    );
}
