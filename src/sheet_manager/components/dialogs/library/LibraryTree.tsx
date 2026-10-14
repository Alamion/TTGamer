import type { SelectExtend, TreeRowDrag } from '@site/src/shared/components/tree/TreeRowShell';
import { type TreeRowItem, TreeView } from '@site/src/shared/components/tree/TreeView';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import type { ReactNode, RefObject } from 'react';
import { useMemo } from 'react';

import {
    childrenOf,
    flattenVisible,
    type LibraryNode,
} from '../../../features/sheet/data/libraryTree';
import { libraryNodeHasChildren, libraryRowSlots, libraryTreeLabels } from './TreeRow';

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
    /** Several selected rows, when more than one is (Ctrl/Cmd click, Shift click). */
    selectedKeys?: ReadonlySet<string>;
    onSelect: (key: string, extend: SelectExtend) => void;
    /** A plain pointer click on a row (narrow screens switch to the details tab). */
    onRowClick?: (key: string) => void;
    onToggle: (key: string, open?: boolean) => void;
    /** Enter on a page. */
    onOpenPage: (node: LibraryNode) => void;
    onDelete?: (node: LibraryNode) => void;
    onMenu: (key: string, anchor: { x: number; y: number }) => void;
    /** Space on a row (export and import modes tick it). */
    onSpace?: (node: LibraryNode) => void;
    rowExtras?: (node: LibraryNode) => RowExtras | undefined;
    /** Whether a row has a menu (a row with no action to offer shows no menu button). */
    hasMenu?: (node: LibraryNode) => boolean;
    /** The scrolling region around the tree, so a long library draws only the rows in view. */
    scrollRef?: RefObject<HTMLElement | null>;
}

/**
 * The library tree (contracts/library-ui.md): the shared tree over the library's nodes. Rows render
 * flat from the expanded branches only, one row is tabbable, and selection follows focus.
 */
export function LibraryTree({
    label,
    tree,
    expanded,
    selectedKey,
    selectedKeys,
    onSelect,
    onRowClick,
    onToggle,
    onOpenPage,
    onDelete,
    onMenu,
    onSpace,
    rowExtras,
    hasMenu,
    scrollRef,
}: LibraryTreeProps) {
    const plural = usePluralMessage();
    const rows = useMemo<TreeRowItem<LibraryNode>[]>(() => {
        const sibling = new Map<string, { size: number; position: number }>();
        const visit = (nodes: readonly LibraryNode[]) => {
            nodes.forEach((node, index) => {
                sibling.set(node.key, { size: nodes.length, position: index + 1 });
                visit(childrenOf(node));
            });
        };
        visit(tree);
        return flattenVisible(tree, expanded).map(({ node, depth, parentKey }) => ({
            key: node.key,
            node,
            name: node.name,
            depth,
            setSize: sibling.get(node.key)?.size ?? 1,
            position: sibling.get(node.key)?.position ?? 1,
            expandable: libraryNodeHasChildren(node),
            expanded: expanded.has(node.key),
            parentKey,
        }));
    }, [tree, expanded]);

    return (
        <TreeView
            label={label}
            rows={rows}
            selectedKey={selectedKey}
            selectedKeys={selectedKeys}
            onSelect={onSelect}
            onRowClick={(key, extend) => {
                if (extend === 'none') onRowClick?.(key);
            }}
            onToggle={onToggle}
            onEnter={(item) => {
                if (item.node.level === 'page') onOpenPage(item.node);
                else if (item.expandable) onToggle(item.key, !item.expanded);
            }}
            onDelete={onDelete ? (item) => onDelete(item.node) : undefined}
            onMenu={onMenu}
            onSpace={onSpace ? (item) => onSpace(item.node) : undefined}
            renderRow={({ node }) => ({
                ...libraryRowSlots(node, plural),
                ...rowExtras?.(node),
                menu: hasMenu ? hasMenu(node) : true,
            })}
            labels={libraryTreeLabels}
            idPrefix="library-row-"
            scrollRef={scrollRef}
        />
    );
}
