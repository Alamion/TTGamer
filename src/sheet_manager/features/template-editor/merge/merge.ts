import type { CustomTemplate } from '../../../types/template';
import { isContainerNode } from '../../../types/template';
import type { FlatNode, FlatTree, Placement } from './flatten';
import {
    equal,
    flatten,
    orderedSlots,
    pathOf,
    position,
    propsOf,
    rebuild,
    subtree,
} from './flatten';
import type { ReviewItem } from './items';

export type MergeResult = { draft: CustomTemplate; items: ReviewItem[] } | { error: string };

interface Choice {
    value: unknown;
    origin?: 'shipped' | 'conflict';
}

function choose(base: unknown, shipped: unknown, copy: unknown): Choice {
    if (equal(shipped, base) || equal(copy, shipped)) return { value: copy };
    if (equal(copy, base)) return { value: shipped, origin: 'shipped' };
    return { value: copy, origin: 'conflict' };
}

function mergeProps(
    base: Record<string, unknown>,
    shipped: Record<string, unknown>,
    copy: Record<string, unknown>,
    nodeId: string,
    items: ReviewItem[]
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const prop of [
        ...new Set([...Object.keys(base), ...Object.keys(shipped), ...Object.keys(copy)]),
    ].sort()) {
        const choice = choose(base[prop], shipped[prop], copy[prop]);
        if (choice.value !== undefined)
            Object.defineProperty(result, prop, {
                value: choice.value,
                enumerable: true,
                configurable: true,
                writable: true,
            });
        if (choice.origin)
            items.push({
                key: `${nodeId}:${prop}`,
                nodeId,
                path: [],
                kind: 'changed',
                prop,
                origin: choice.origin,
                userValue: copy[prop],
                shippedValue: shipped[prop],
            });
    }
    return result;
}

function unchanged(base: FlatNode, other: FlatNode): boolean {
    return base.parentId === other.parentId && equal(base.props, other.props);
}

function removedRoot(id: string, removed: Set<string>, copy: FlatTree): string | undefined {
    let root: string | undefined;
    let current: string | null = id;
    while (current !== null) {
        if (removed.has(current)) root = current;
        current = copy.nodes.get(current)!.parentId;
    }
    return root;
}

function hasNewDescendant(id: string, base: FlatTree, copy: FlatTree): boolean {
    return [...copy.nodes.keys()].some(
        (child) => !base.nodes.has(child) && pathOf(copy, child).includes(id)
    );
}

function nearestParent(id: string, shipped: FlatTree, result: FlatTree): string | null {
    let parent = shipped.nodes.get(id)?.parentId ?? null;
    while (parent !== null) {
        const row = result.nodes.get(parent);
        if (row && isContainerNode(row.props as unknown as FlatNode['node'])) return parent;
        parent = shipped.nodes.get(parent)?.parentId ?? null;
    }
    return null;
}

function insertionPlace(id: string, shipped: FlatTree, result: FlatTree): Placement {
    const row = result.nodes.get(id)!;
    const siblings = result.orders.get(row.parentId) ?? [];
    const shippedRow = shipped.nodes.get(id)!;
    if (shippedRow.parentId !== row.parentId) {
        return { parentId: row.parentId, afterId: siblings.at(-1) ?? null };
    }
    const previous = (shipped.orders.get(shippedRow.parentId) ?? [])
        .slice(0, shippedRow.index)
        .reverse();
    return {
        parentId: row.parentId,
        afterId: previous.find((candidate) => siblings.includes(candidate)) ?? null,
    };
}

/** Compare identities first, then resolve placement and order against the surviving nodes. */
function merge(
    basePage: CustomTemplate,
    shippedPage: CustomTemplate,
    copyPage: CustomTemplate
): MergeResult {
    const base = flatten(basePage);
    const shipped = flatten(shippedPage);
    const copy = flatten(copyPage);
    const items: ReviewItem[] = [];
    const excluded = ['children', 'id', 'systemId', 'documentKind', 'schemaVersion', 'settingId'];
    const pageProps = mergeProps(
        propsOf(basePage, excluded),
        propsOf(shippedPage, excluded),
        propsOf(copyPage, excluded),
        '$page',
        items
    );
    const nodes = new Map<string, FlatNode>();
    const result: FlatTree = { nodes, orders: new Map() };
    const removed = new Set(
        [...base.nodes.keys()].filter((id) => {
            const c = copy.nodes.get(id);
            return (
                c &&
                !shipped.nodes.has(id) &&
                unchanged(base.nodes.get(id)!, c) &&
                !hasNewDescendant(id, base, copy)
            );
        })
    );
    const ids = [
        ...new Set([...base.nodes.keys(), ...shipped.nodes.keys(), ...copy.nodes.keys()]),
    ].sort();

    for (const id of ids) {
        const b = base.nodes.get(id);
        const s = shipped.nodes.get(id);
        const c = copy.nodes.get(id);
        if (b && s && c) {
            const props = mergeProps(b.props, s.props, c.props, id, items);
            const parent = choose(b.parentId, s.parentId, c.parentId);
            nodes.set(id, { ...c, props, parentId: parent.value as string | null });
            if (parent.origin)
                items.push({
                    key: `${id}:$moved`,
                    nodeId: id,
                    path: [],
                    kind: 'moved',
                    prop: '$moved',
                    origin: parent.origin,
                    userValue: position(copy, id),
                    shippedValue: position(shipped, id),
                });
        } else if (!b && s) {
            nodes.set(id, c ?? s);
            if (c) {
                if (!equal(c.props, s.props))
                    items.push({
                        key: `${id}:$added`,
                        nodeId: id,
                        path: [],
                        kind: 'added',
                        origin: 'conflict',
                        userValue: c.props,
                        shippedValue: subtree(shipped, id),
                    });
            } else if (
                s.parentId === null ||
                base.nodes.has(s.parentId) ||
                copy.nodes.has(s.parentId)
            ) {
                items.push({
                    key: `${id}:$added`,
                    nodeId: id,
                    path: [],
                    kind: 'added',
                    origin: 'shipped',
                    userValue: undefined,
                    shippedValue: subtree(shipped, id),
                });
            }
        } else if (b && c && !s) {
            const root = removedRoot(id, removed, copy);
            if (root === undefined) nodes.set(id, c);
            if (root === undefined || root === id)
                items.push({
                    key: `${id}:$removed`,
                    nodeId: id,
                    path: [],
                    kind: 'removed',
                    origin: root === undefined ? 'conflict' : 'shipped',
                    userValue: subtree(copy, id),
                    shippedValue: undefined,
                });
        } else if (b && s && !c) {
            if (!unchanged(b, s))
                items.push({
                    key: `${id}:$removed`,
                    nodeId: id,
                    path: [],
                    kind: 'removed',
                    origin: 'conflict',
                    userValue: undefined,
                    shippedValue: subtree(shipped, id),
                });
        } else if (c && !b && !s) nodes.set(id, c);
    }

    const relocated = new Set<string>();
    for (const [id, row] of nodes) {
        if (
            row.parentId !== null &&
            (!nodes.has(row.parentId) ||
                !isContainerNode(nodes.get(row.parentId)!.props as unknown as FlatNode['node']))
        ) {
            nodes.set(id, { ...row, parentId: nearestParent(id, shipped, result) });
            relocated.add(id);
        }
    }

    for (const parentId of [null, ...nodes.keys()]) {
        const parent = parentId === null ? undefined : nodes.get(parentId)!;
        if (parent && !isContainerNode(parent.props as unknown as FlatNode['node'])) continue;
        const copyOrder = copy.orders.get(parentId) ?? [];
        const baseOrder = base.orders.get(parentId) ?? [];
        const shippedOrder = shipped.orders.get(parentId) ?? [];
        let order = copyOrder.filter(
            (id) => nodes.has(id) && nodes.get(id)!.parentId === parentId && !relocated.has(id)
        );
        const common = new Set(
            baseOrder.filter(
                (id) => copyOrder.includes(id) && shippedOrder.includes(id) && order.includes(id)
            )
        );
        const b = baseOrder.filter((id) => common.has(id));
        const s = shippedOrder.filter((id) => common.has(id));
        const c = copyOrder.filter((id) => common.has(id));
        if (!equal(s, b) && !equal(s, c)) {
            const origin = equal(c, b) ? 'shipped' : 'conflict';
            if (origin === 'shipped') order = orderedSlots(order, s);
            items.push({
                key: `${parentId ?? 'root'}:$order`,
                nodeId: parentId ?? 'root',
                path: [],
                kind: 'moved',
                prop: '$order',
                origin,
                userValue: copyOrder,
                shippedValue: shippedOrder,
            });
        }
        result.orders.set(parentId, order);
    }

    // Shipped preorder makes newly inserted predecessors available before their successors.
    for (const id of [...shipped.nodes.keys(), ...copy.nodes.keys()]) {
        const row = nodes.get(id);
        if (!row) continue;
        const order = result.orders.get(row.parentId)!;
        if (order.includes(id)) continue;
        const place = shipped.nodes.has(id)
            ? insertionPlace(id, shipped, result)
            : { afterId: order.at(-1) ?? null };
        const index = place.afterId === null ? 0 : order.indexOf(place.afterId) + 1;
        order.splice(index, 0, id);
    }

    const header = {
        ...pageProps,
        id: shippedPage.id,
        systemId: shippedPage.systemId,
        documentKind: shippedPage.documentKind,
        schemaVersion: shippedPage.schemaVersion,
        children: copyPage.children,
    } as CustomTemplate;
    if (copyPage.settingId !== undefined) header.settingId = copyPage.settingId;
    const draft = rebuild(header, result);
    const finalTree = flatten(draft);
    for (const item of items) {
        if (item.nodeId === '$page' || (item.prop === '$order' && item.nodeId === 'root'))
            item.path = [];
        else
            item.path = pathOf(
                finalTree.nodes.has(item.nodeId)
                    ? finalTree
                    : copy.nodes.has(item.nodeId)
                      ? copy
                      : shipped,
                item.nodeId
            );
        if (item.kind === 'added' && item.userValue === undefined) {
            const value = item.shippedValue as { node: FlatNode['node'] };
            item.shippedValue = { ...value, ...position(finalTree, item.nodeId) };
        }
    }
    return { draft, items };
}

export function mergePages(
    base: CustomTemplate,
    shipped: CustomTemplate,
    copy: CustomTemplate
): MergeResult {
    try {
        return merge(base, shipped, copy);
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unable to merge template pages' };
    }
}
