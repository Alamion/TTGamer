import type { TemplateNode } from '../../../types/template';
import { collectTemplateNodes, isContainerNode, TEMPLATE_LIMITS } from '../../../types/template';
import { type DraftOpResult, type EditorDraft, type NodeUpdates } from './types';

export function ok(draft: EditorDraft): DraftOpResult {
    return { ok: true, draft };
}

export function fail(
    error: 'depth' | 'count' | 'self-move',
    limit?: number,
    actual?: number
): DraftOpResult {
    return { ok: false, error, limit, actual };
}

function countSubtree(node: TemplateNode): number {
    let count = 1;
    if (isContainerNode(node)) for (const child of node.children) count += countSubtree(child);
    return count;
}

function subtreeHeight(node: TemplateNode): number {
    if (!isContainerNode(node)) return 1;
    return 1 + Math.max(0, ...node.children.map(subtreeHeight));
}

interface NodeLocation {
    parent: TemplateNode[] | undefined; // undefined = page root
    parentId: string | null;
    index: number;
    depth: number; // depth of the node itself (root children are 1)
}

export function locate(draft: EditorDraft, nodeId: string): NodeLocation | undefined {
    let found: NodeLocation | undefined;
    const search = (children: TemplateNode[], parentId: string | null, depth: number): boolean => {
        for (let index = 0; index < children.length; index += 1) {
            const node = children[index]!;
            if (node.id === nodeId) {
                found = { parent: children, parentId, index, depth };
                return true;
            }
            if (isContainerNode(node) && search(node.children, node.id, depth + 1)) return true;
        }
        return false;
    };
    search(draft.children, null, 1);
    return found;
}

function containsNode(node: TemplateNode, nodeId: string): boolean {
    if (node.id === nodeId) return true;
    if (!isContainerNode(node)) return false;
    return node.children.some((child) => containsNode(child, nodeId));
}

/**
 * Structural-sharing tree map: `visit` returns the same node when nothing changes, and only the
 * containers (and arrays) on the path to a changed node are rebuilt. Untouched subtrees keep
 * their identity, so memoized editor panels skip re-rendering.
 */
export function mapNodes(
    children: TemplateNode[],
    visit: (node: TemplateNode) => TemplateNode
): TemplateNode[] {
    let changed = false;
    const next = children.map((node) => {
        let result = visit(node);
        if (result === node && isContainerNode(node)) {
            const mappedChildren = mapNodes(node.children, visit);
            if (mappedChildren !== node.children) result = { ...node, children: mappedChildren };
        }
        if (result !== node) changed = true;
        return result;
    });
    return changed ? next : children;
}

export function withChildren(draft: EditorDraft, children: TemplateNode[]): EditorDraft {
    return children === draft.children ? draft : { ...draft, children };
}

function replaceAt(
    children: TemplateNode[],
    parentId: string | null,
    nodeId: string,
    next: TemplateNode | undefined
): TemplateNode[] {
    const replaceIn = (siblings: TemplateNode[]) =>
        next === undefined
            ? siblings.filter((node) => node.id !== nodeId)
            : siblings.map((node) => (node.id === nodeId ? next : node));
    if (parentId === null) return replaceIn(children);
    return mapNodes(children, (node) =>
        isContainerNode(node) && node.id === parentId
            ? { ...node, children: replaceIn(node.children) }
            : node
    );
}

function insertInto(draft: EditorDraft, index: number, node: TemplateNode): EditorDraft {
    const children = [...draft.children];
    children.splice(Math.min(Math.max(index, 0), children.length), 0, node);
    return { ...draft, children };
}

function insertIntoContainer(
    draft: EditorDraft,
    parentId: string,
    index: number,
    node: TemplateNode
): EditorDraft {
    return withChildren(
        draft,
        mapNodes(draft.children, (child) => {
            if (!isContainerNode(child) || child.id !== parentId) return child;
            const next = [...child.children];
            next.splice(Math.min(Math.max(index, 0), next.length), 0, node);
            return { ...child, children: next };
        })
    );
}

export function insertNode(
    draft: EditorDraft,
    parentId: string | null,
    index: number,
    node: TemplateNode
): DraftOpResult {
    const parentDepth = parentId === null ? 0 : locate(draft, parentId)?.depth;
    if (parentDepth === undefined) return fail('self-move');
    const height = subtreeHeight(node);
    if (parentDepth + height > TEMPLATE_LIMITS.maxDepth) {
        return fail('depth', TEMPLATE_LIMITS.maxDepth, parentDepth + height);
    }
    const total = collectTemplateNodes(draft).length + countSubtree(node);
    if (total > TEMPLATE_LIMITS.nodesPerTemplate) {
        return fail('count', TEMPLATE_LIMITS.nodesPerTemplate, total);
    }
    return ok(
        parentId === null
            ? insertInto(draft, index, node)
            : insertIntoContainer(draft, parentId, index, node)
    );
}

export function removeNode(draft: EditorDraft, nodeId: string): EditorDraft {
    const location = locate(draft, nodeId);
    if (!location) return draft;
    return {
        ...draft,
        children: replaceAt(draft.children, location.parentId, nodeId, undefined),
    };
}

/** Moves the whole subtree (ids and children intact); rejects self-subtree targets. */
export function moveNode(
    draft: EditorDraft,
    nodeId: string,
    targetParentId: string | null,
    targetIndex: number
): DraftOpResult {
    const location = locate(draft, nodeId);
    if (!location) return fail('self-move');
    if (targetParentId !== null) {
        const node = location.parent![location.index]!;
        if (containsNode(node, targetParentId)) return fail('self-move');
    }
    const node = location.parent![location.index]!;
    const parentDepth = targetParentId === null ? 0 : locate(draft, targetParentId)?.depth;
    if (parentDepth === undefined) return fail('self-move');
    if (parentDepth + 1 + subtreeHeight(node) - 1 > TEMPLATE_LIMITS.maxDepth) {
        return fail('depth', TEMPLATE_LIMITS.maxDepth, parentDepth + subtreeHeight(node));
    }
    const detached = {
        ...draft,
        children: replaceAt(draft.children, location.parentId, nodeId, undefined),
    };
    // `targetIndex` is the node's final position among its new siblings.
    return ok(
        targetParentId === null
            ? insertInto(detached, targetIndex, node)
            : insertIntoContainer(detached, targetParentId, targetIndex, node)
    );
}

/** Where a node sits: its parent (null = page root) and its index among the siblings. */
export function findNodePosition(
    draft: EditorDraft,
    nodeId: string
): { parentId: string | null; index: number; siblings: readonly TemplateNode[] } | undefined {
    const location = locate(draft, nodeId);
    if (!location) return undefined;
    return { parentId: location.parentId, index: location.index, siblings: location.parent! };
}

export function findNode(draft: EditorDraft, nodeId: string): TemplateNode | undefined {
    const location = locate(draft, nodeId);
    return location ? location.parent![location.index] : undefined;
}

/**
 * A multi-column container whose children set no `column` flows them row by row. Before one
 * child is placed in a column, every sibling gets the column it currently shows in, so placing
 * one element never reshuffles the others (the renderer stacks all children once any is placed).
 */
export function materializeColumns(draft: EditorDraft, parentId: string | null): EditorDraft {
    if (parentId === null) return draft;
    const parent = findNode(draft, parentId);
    if (!parent || !isContainerNode(parent)) return draft;
    const columns = parent.columns ?? 1;
    if (columns <= 1 || parent.children.some((child) => child.column !== undefined)) return draft;
    const children = parent.children.map((child, index) => ({
        ...child,
        column: (index % columns) + 1,
    }));
    return replaceNode(draft, parentId, { ...parent, children } as TemplateNode);
}

export interface NodePlacement {
    parentId: string | null;
    /** Insertion index: the node lands before the sibling currently at this index. */
    index: number;
    /** The column to stack into, or `null` for flowing/single-column parents. */
    column: number | null;
}

function withColumn(draft: EditorDraft, nodeId: string, column: number | null): EditorDraft {
    return updateNode(draft, nodeId, { column: column ?? undefined });
}

/** Moves a node to a slot on the page or in the outline (one undo step, column included). */
export function placeNode(
    draft: EditorDraft,
    nodeId: string,
    placement: NodePlacement
): DraftOpResult {
    const prepared =
        placement.column === null ? draft : materializeColumns(draft, placement.parentId);
    const current = findNodePosition(prepared, nodeId);
    if (!current) return fail('self-move');
    const sameParent = current.parentId === placement.parentId;
    const finalIndex =
        sameParent && current.index < placement.index ? placement.index - 1 : placement.index;
    const moved = moveNode(prepared, nodeId, placement.parentId, finalIndex);
    if (!moved.ok) return moved;
    return ok(withColumn(moved.draft, nodeId, placement.column));
}

/** Inserts a new node at a slot, in the slot's column. */
export function insertAtPlacement(
    draft: EditorDraft,
    placement: NodePlacement,
    node: TemplateNode
): DraftOpResult {
    const prepared =
        placement.column === null ? draft : materializeColumns(draft, placement.parentId);
    const placed = placement.column === null ? node : { ...node, column: placement.column };
    return insertNode(prepared, placement.parentId, placement.index, placed);
}

/** Swaps a node for another (e.g. a field switching to a system resource); ids stay stable. */
export function replaceNode(draft: EditorDraft, nodeId: string, next: TemplateNode): EditorDraft {
    return withChildren(
        draft,
        mapNodes(draft.children, (node) => (node.id === nodeId ? next : node))
    );
}

export interface TermCarrier {
    type?: string;
    labelMessage?: string;
    termRef?: string;
}

/** Containers carry titles, not book terms (only fields and primitives accept `termRef`). */
const NO_TERM_TYPES = new Set(['section', 'group', 'list', 'table']);

/** Drops the label translation of a renamed node but keeps its book term as `termRef`. */
export function keepTermOnRename(node: TermCarrier): void {
    if (node.labelMessage && !node.termRef && !NO_TERM_TYPES.has(node.type ?? '')) {
        node.termRef = node.labelMessage;
    }
    delete node.labelMessage;
}

export function updateNode(draft: EditorDraft, nodeId: string, updates: NodeUpdates): EditorDraft {
    const apply = (node: TemplateNode): TemplateNode => {
        if (node.id !== nodeId) return node;
        const merged = { ...node, ...updates } as TemplateNode;
        // An author-edited label replaces the shipped translation reference; the book term it
        // stood for is kept as termRef (spec 009) so the English-name hint survives renaming.
        if ('label' in updates || 'title' in updates) {
            keepTermOnRename(merged as TermCarrier);
        }
        // Clearing optional strings normalizes to absent instead of empty strings.
        for (const key of [
            'docsPath',
            'valueKey',
            'bindingKey',
            'label',
            'maxFrom',
            'minFrom',
            'maxMinFrom',
        ] as const) {
            if (key in updates && (merged as Record<string, unknown>)[key] === '') {
                delete (merged as Record<string, unknown>)[key];
            }
        }
        for (const key of ['visibleWhen', 'defaultCollapsed', 'span'] as const) {
            if (key in updates && !updates[key]) delete (merged as Record<string, unknown>)[key];
        }
        // Fewer columns: children placed past the new last column move into it.
        if ('columns' in updates && isContainerNode(merged)) {
            const columns = merged.columns ?? 1;
            merged.children = merged.children.map((child) =>
                child.column !== undefined && child.column > columns
                    ? { ...child, column: columns > 1 ? columns : undefined }
                    : child
            );
        }
        return merged;
    };
    return withChildren(draft, mapNodes(draft.children, apply));
}
