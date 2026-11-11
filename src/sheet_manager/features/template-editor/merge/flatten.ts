import type { CustomTemplate, TemplateNode } from '../../../types/template';
import {
    isContainerNode,
    TEMPLATE_FIELD_TYPES,
    TEMPLATE_LIMITS,
    TEMPLATE_STRUCTURE_TYPES,
} from '../../../types/template';

const nodeTypes: ReadonlySet<string> = new Set([
    ...TEMPLATE_FIELD_TYPES,
    ...TEMPLATE_STRUCTURE_TYPES,
]);

export interface FlatNode {
    id: string;
    parentId: string | null;
    index: number;
    props: Record<string, unknown>;
    node: TemplateNode;
}

export interface FlatTree {
    nodes: Map<string, FlatNode>;
    orders: Map<string | null, string[]>;
}

export interface Placement {
    parentId: string | null;
    afterId: string | null;
}

export interface SubtreePlacement extends Placement {
    node: TemplateNode;
}

export function equal(left: unknown, right: unknown): boolean {
    if (left === right) return true;
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
        return false;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
        return (
            Array.isArray(left) &&
            Array.isArray(right) &&
            left.length === right.length &&
            left.every((value, index) => equal(value, right[index]))
        );
    }
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    const keys = Object.keys(a).filter((key) => a[key] !== undefined);
    return (
        keys.length === Object.keys(b).filter((key) => b[key] !== undefined).length &&
        keys.every((key) => Object.hasOwn(b, key) && equal(a[key], b[key]))
    );
}

export function propsOf(value: object, excluded: readonly string[]): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !excluded.includes(key)));
}

/** Reject cycles in atomic property objects as well as in the node tree. */
function checkJson(value: unknown, active: Set<object>, depth = 0): void {
    if (depth > TEMPLATE_LIMITS.maxDepth * 4) throw new Error('Template data is too deep');
    if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'boolean'
    )
        return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || active.has(value))
        throw new Error('Invalid or cyclic template data');
    active.add(value);
    for (const entry of Object.values(value)) checkJson(entry, active, depth + 1);
    active.delete(value);
}

export function flatten(template: CustomTemplate): FlatTree {
    checkJson(template, new Set());
    const nodes = new Map<string, FlatNode>();
    const orders = new Map<string | null, string[]>();
    const visit = (children: TemplateNode[], parentId: string | null, depth: number): void => {
        if (!Array.isArray(children)) throw new Error('Template children must be an array');
        if (depth > TEMPLATE_LIMITS.maxDepth * 3) throw new Error('Template tree is too deep');
        orders.set(
            parentId,
            children.map((node) => node.id)
        );
        children.forEach((node, index) => {
            if (!node || typeof node.id !== 'string' || !nodeTypes.has(node.type)) {
                throw new Error('Invalid template node');
            }
            if (nodes.has(node.id)) throw new Error(`Duplicate template node id: ${node.id}`);
            if (nodes.size >= TEMPLATE_LIMITS.nodesPerTemplate * 3)
                throw new Error('Too many template nodes');
            nodes.set(node.id, {
                id: node.id,
                parentId,
                index,
                props: propsOf(node, ['children']),
                node,
            });
            if (isContainerNode(node)) visit(node.children, node.id, depth + 1);
            else if ('children' in node) throw new Error('A leaf cannot have children');
        });
    };
    visit(template.children, null, 1);
    return { nodes, orders };
}

export function position(tree: FlatTree, id: string): Placement {
    const row = tree.nodes.get(id)!;
    return {
        parentId: row.parentId,
        afterId: tree.orders.get(row.parentId)?.[row.index - 1] ?? null,
    };
}

export function subtree(tree: FlatTree, id: string): SubtreePlacement {
    return { node: tree.nodes.get(id)!.node, ...position(tree, id) };
}

export function pathOf(tree: FlatTree, id: string): string[] {
    const path: string[] = [];
    let current: string | null = id;
    while (current !== null && tree.nodes.has(current)) {
        if (path.includes(current)) throw new Error('Cyclic template parents');
        path.unshift(current);
        current = tree.nodes.get(current)!.parentId;
    }
    return path;
}

/** Rebuild only changed ancestors; original arrays and nodes survive unchanged edits. */
export function rebuild(template: CustomTemplate, tree: FlatTree): CustomTemplate {
    const visited = new Set<string>();
    const childrenOf = (parentId: string | null): TemplateNode[] =>
        (tree.orders.get(parentId) ?? []).map((id) => {
            if (visited.has(id)) throw new Error('Cyclic or duplicate result node');
            visited.add(id);
            const row = tree.nodes.get(id);
            if (!row) throw new Error('Missing result node');
            const candidate = row.props as unknown as TemplateNode;
            const children = isContainerNode(candidate) ? childrenOf(id) : undefined;
            const original = row.node;
            const sameChildren =
                children === undefined ||
                (isContainerNode(original) &&
                    children.length === original.children.length &&
                    children.every((child, index) => child === original.children[index]));
            if (equal(row.props, propsOf(original, ['children'])) && sameChildren) return original;
            return (children === undefined
                ? { ...row.props }
                : { ...row.props, children }) as unknown as TemplateNode;
        });
    const children = childrenOf(null);
    if (visited.size !== tree.nodes.size) throw new Error('Unreachable or cyclic result nodes');
    if (
        children.length === template.children.length &&
        children.every((node, index) => node === template.children[index])
    )
        return template;
    return { ...template, children };
}

/** Fill the existing slots of listed ids, leaving later/unrelated additions in place. */
export function orderedSlots(current: string[], wanted: string[]): string[] {
    const present = new Set(current);
    const ordered = wanted.filter((id) => present.has(id));
    const included = new Set(ordered);
    let index = 0;
    return current.map((id) => (included.has(id) ? ordered[index++]! : id));
}
