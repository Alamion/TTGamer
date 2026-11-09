import type { CustomTemplate, TemplateNode } from '../../../types/template';
import { isContainerNode } from '../../../types/template';
import type { FlatTree, Placement, SubtreePlacement } from './flatten';
import { equal, flatten, orderedSlots, position, propsOf, rebuild } from './flatten';

export interface ReviewItem {
    key: string;
    nodeId: string;
    path: string[];
    kind: 'added' | 'removed' | 'moved' | 'changed';
    origin: 'shipped' | 'conflict' | 'difference';
    prop?: string;
    userValue: unknown;
    shippedValue: unknown;
}

function side(value: unknown, item: ReviewItem): 'copy' | 'shipped' | 'other' {
    if (equal(value, item.userValue)) return 'copy';
    if (equal(value, item.shippedValue)) return 'shipped';
    return 'other';
}

function isCollision(item: ReviewItem): boolean {
    return item.kind === 'added' && item.userValue !== undefined;
}

export function itemState(draft: CustomTemplate, item: ReviewItem): 'copy' | 'shipped' | 'other' {
    const tree = flatten(draft);
    const row = tree.nodes.get(item.nodeId);
    if (item.kind === 'changed') {
        if (item.nodeId !== '$page' && !row) return 'other';
        const props =
            item.nodeId === '$page' ? (draft as unknown as Record<string, unknown>) : row!.props;
        return side(props[item.prop!], item);
    }
    if (item.prop === '$order')
        return side(tree.orders.get(item.nodeId === 'root' ? null : item.nodeId), item);
    if (item.kind === 'moved') return row ? side(position(tree, item.nodeId), item) : 'other';
    if (isCollision(item)) {
        if (!row) return 'other';
        if (equal(row.props, item.userValue)) return 'copy';
        return equal(row.props, propsOf((item.shippedValue as SubtreePlacement).node, ['children']))
            ? 'shipped'
            : 'other';
    }
    if (item.kind === 'removed') {
        const copyHasNode = item.userValue !== undefined;
        return row ? (copyHasNode ? 'copy' : 'shipped') : copyHasNode ? 'shipped' : 'copy';
    }
    if (!row) return 'copy';
    const place = item.shippedValue as SubtreePlacement;
    return equal(position(tree, item.nodeId), { parentId: place.parentId, afterId: place.afterId })
        ? 'shipped'
        : 'other';
}

function detach(tree: FlatTree, id: string): void {
    const row = tree.nodes.get(id);
    if (!row) return;
    tree.orders.set(
        row.parentId,
        (tree.orders.get(row.parentId) ?? []).filter((child) => child !== id)
    );
}

function remove(tree: FlatTree, id: string): void {
    detach(tree, id);
    const descend = (nodeId: string): void => {
        for (const child of tree.orders.get(nodeId) ?? []) descend(child);
        tree.nodes.delete(nodeId);
        tree.orders.delete(nodeId);
    };
    descend(id);
}

function placeNode(tree: FlatTree, id: string, place: Placement, path: string[]): void {
    let parentId = place.parentId;
    let afterId = place.afterId;
    const isParent = (candidate: string): boolean => {
        const row = tree.nodes.get(candidate);
        return !!row && isContainerNode(row.props as unknown as TemplateNode);
    };
    if (parentId !== null && !isParent(parentId)) {
        parentId = path.slice(0, -1).reverse().find(isParent) ?? null;
        afterId = (tree.orders.get(parentId) ?? []).filter((child) => child !== id).at(-1) ?? null;
    }
    // A later edit can make the original destination part of the moving subtree.
    let ancestor = parentId;
    while (ancestor !== null) {
        if (ancestor === id) return;
        ancestor = tree.nodes.get(ancestor)?.parentId ?? null;
    }
    detach(tree, id);
    const order = [...(tree.orders.get(parentId) ?? [])];
    const index = afterId === null ? 0 : Math.max(0, order.indexOf(afterId) + 1);
    order.splice(index, 0, id);
    tree.orders.set(parentId, order);
    tree.nodes.set(id, { ...tree.nodes.get(id)!, parentId });
}

function insert(
    draft: CustomTemplate,
    tree: FlatTree,
    value: SubtreePlacement,
    path: string[]
): void {
    const added = flatten({ ...draft, children: [value.node] });
    for (const [id, row] of added.nodes) {
        if (tree.nodes.has(id)) continue;
        tree.nodes.set(id, row);
        if (isContainerNode(row.node)) tree.orders.set(id, []);
        if (row.parentId !== null) tree.orders.get(row.parentId)?.push(id);
    }
    placeNode(tree, value.node.id, value, path);
}

export function switchItem(
    draft: CustomTemplate,
    item: ReviewItem,
    to: 'copy' | 'shipped'
): CustomTemplate {
    if (itemState(draft, item) === to) return draft;
    const value = to === 'copy' ? item.userValue : item.shippedValue;
    if (item.kind === 'changed' && item.nodeId === '$page') {
        const next = { ...draft };
        if (value === undefined) delete (next as unknown as Record<string, unknown>)[item.prop!];
        else
            Object.defineProperty(next, item.prop!, {
                value,
                enumerable: true,
                configurable: true,
                writable: true,
            });
        return next;
    }
    const tree = flatten(draft);
    const row = tree.nodes.get(item.nodeId);
    if (item.kind === 'changed') {
        if (!row) return draft;
        const props = { ...row.props };
        if (value === undefined) delete props[item.prop!];
        else
            Object.defineProperty(props, item.prop!, {
                value,
                enumerable: true,
                configurable: true,
                writable: true,
            });
        tree.nodes.set(item.nodeId, { ...row, props });
    } else if (item.prop === '$order') {
        const parentId = item.nodeId === 'root' ? null : item.nodeId;
        const order = tree.orders.get(parentId);
        if (!order) return draft;
        tree.orders.set(parentId, orderedSlots(order, value as string[]));
    } else if (item.kind === 'moved') {
        if (!row) return draft;
        placeNode(tree, item.nodeId, value as Placement, item.path);
    } else if (isCollision(item)) {
        if (!row) return draft;
        const props =
            to === 'copy'
                ? (value as Record<string, unknown>)
                : propsOf((value as SubtreePlacement).node, ['children']);
        tree.nodes.set(item.nodeId, { ...row, props });
    } else if (value === undefined) remove(tree, item.nodeId);
    else if (!row) insert(draft, tree, value as SubtreePlacement, item.path);
    else if (item.kind === 'added')
        placeNode(tree, item.nodeId, value as SubtreePlacement, item.path);
    return rebuild(draft, tree);
}
