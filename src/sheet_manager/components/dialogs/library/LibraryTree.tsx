import { normalizeSearchText } from '@site/src/shared/utils/normalizeSearchText';
import type { KeyboardEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
    childrenOf,
    flattenVisible,
    type LibraryNode,
} from '../../../features/sheet/data/libraryTree';
import { TreeRow, type TreeRowDrag } from './TreeRow';

export interface RowExtras {
    checkbox?: ReactNode;
    trailing?: ReactNode;
    drag?: TreeRowDrag;
    flash?: boolean;
}

export interface LibraryTreeProps {
    label: string;
    tree: readonly LibraryNode[];
    expanded: ReadonlySet<string>;
    selectedKey: string | undefined;
    onSelect: (key: string) => void;
    /** A pointer click on a row (narrow screens switch to the details tab). */
    onRowClick?: (key: string) => void;
    onToggle: (key: string, open?: boolean) => void;
    /** Enter on a page. */
    onOpenPage: (node: LibraryNode) => void;
    onDelete?: (node: LibraryNode) => void;
    onMenu: (key: string, anchor: { x: number; y: number }) => void;
    /** Space on a row (export and import modes tick it). */
    onSpace?: (node: LibraryNode) => void;
    rowExtras?: (node: LibraryNode) => RowExtras | undefined;
}

const TYPE_AHEAD_MS = 600;

/**
 * The library `tree` (WAI-ARIA tree pattern, contracts/library-ui.md): rows render flat from the
 * expanded branches only, one row is tabbable, and selection follows focus.
 */
export function LibraryTree({
    label,
    tree,
    expanded,
    selectedKey,
    onSelect,
    onRowClick,
    onToggle,
    onOpenPage,
    onDelete,
    onMenu,
    onSpace,
    rowExtras,
}: LibraryTreeProps) {
    const rows = useMemo(() => flattenVisible(tree, expanded), [tree, expanded]);
    const focusPending = useRef(false);
    const typed = useRef({ text: '', at: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const siblingsInfo = useMemo(() => {
        const info = new Map<string, { size: number; position: number }>();
        const visit = (nodes: readonly LibraryNode[]) => {
            nodes.forEach((node, index) => {
                info.set(node.key, { size: nodes.length, position: index + 1 });
                visit(childrenOf(node));
            });
        };
        visit(tree);
        return info;
    }, [tree]);

    const tabbableKey = rows.some(({ node }) => node.key === selectedKey)
        ? selectedKey
        : rows[0]?.node.key;

    useEffect(() => {
        if (!focusPending.current || !selectedKey) return;
        focusPending.current = false;
        const row = containerRef.current?.querySelector<HTMLElement>(
            `[data-library-row="${selectedKey}"]`
        );
        row?.focus();
        row?.scrollIntoView?.({ block: 'nearest' });
    }, [selectedKey, rows]);

    const moveTo = useCallback(
        (key: string | undefined) => {
            if (!key) return;
            focusPending.current = true;
            onSelect(key);
        },
        [onSelect]
    );

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        const index = rows.findIndex(({ node }) => node.key === selectedKey);
        const current = rows[index];
        if (!current) return;
        const { node } = current;
        const children = childrenOf(node);
        const isOpen = expanded.has(node.key);
        const handled = () => {
            event.preventDefault();
            event.stopPropagation();
        };
        switch (event.key) {
            case 'ArrowDown':
                handled();
                moveTo(rows[index + 1]?.node.key);
                return;
            case 'ArrowUp':
                handled();
                moveTo(rows[index - 1]?.node.key);
                return;
            case 'ArrowRight':
                handled();
                if (children.length === 0) return;
                if (!isOpen) onToggle(node.key, true);
                else moveTo(children[0]?.key);
                return;
            case 'ArrowLeft':
                handled();
                if (isOpen && children.length > 0) onToggle(node.key, false);
                else moveTo(current.parentKey);
                return;
            case 'Home':
                handled();
                moveTo(rows[0]?.node.key);
                return;
            case 'End':
                handled();
                moveTo(rows.at(-1)?.node.key);
                return;
            case 'Enter':
                handled();
                if (node.level === 'page') onOpenPage(node);
                else if (children.length > 0) onToggle(node.key, !isOpen);
                return;
            case ' ':
                if (!onSpace) return;
                handled();
                onSpace(node);
                return;
            case 'Delete':
                if (!onDelete) return;
                handled();
                onDelete(node);
                return;
            case 'ContextMenu':
                handled();
                openMenuAtRow(node.key);
                return;
            case 'F10':
                if (!event.shiftKey) return;
                handled();
                openMenuAtRow(node.key);
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
            const match = ordered.find(({ node: row }) =>
                normalizeSearchText(row.name).startsWith(text)
            );
            if (match) {
                handled();
                moveTo(match.node.key);
            }
        }
    };

    const clickRow = useCallback(
        (key: string) => {
            onSelect(key);
            onRowClick?.(key);
        },
        [onSelect, onRowClick]
    );

    const openMenuAtRow = (key: string) => {
        const row = containerRef.current?.querySelector<HTMLElement>(`[data-library-row="${key}"]`);
        const rect = row?.getBoundingClientRect();
        onMenu(key, rect ? { x: rect.left + 24, y: rect.bottom } : { x: 0, y: 0 });
    };

    return (
        <div ref={containerRef} role="tree" aria-label={label} className="flex flex-col gap-0.5">
            {rows.map(({ node, depth }) => {
                const position = siblingsInfo.get(node.key) ?? { size: 1, position: 1 };
                const extras = rowExtras?.(node);
                return (
                    <TreeRow
                        key={node.key}
                        node={node}
                        depth={depth}
                        setSize={position.size}
                        position={position.position}
                        expanded={expanded.has(node.key)}
                        selected={node.key === selectedKey}
                        tabbable={node.key === tabbableKey}
                        flash={extras?.flash}
                        checkbox={extras?.checkbox}
                        trailing={extras?.trailing}
                        drag={extras?.drag}
                        onSelect={clickRow}
                        onToggle={onToggle}
                        onMenu={onMenu}
                        onKeyDown={handleKeyDown}
                    />
                );
            })}
        </div>
    );
}
