import type { TemplateNode } from '../../../types/template';
import { isContainerNode } from '../../../types/template';
import { duplicateNode } from '../model/clone';
import { type MoveCommand, resolveMoveTarget } from '../model/moveTargets';
import { normalizeSelection } from '../model/selection';
import {
    findNode,
    findNodePosition,
    insertAtPlacement,
    materializeColumns,
    moveNode,
    type NodePlacement,
    removeNode,
    updateNode,
} from '../model/tree';
import { type DraftOpResult, type EditorDraft } from '../model/types';

/**
 * Structural operations on several elements at once (spec 023). Each takes the selected ids,
 * normalizes them (ancestors win, page order), and returns one draft: one undo step.
 */
export type MultiOpResult =
    { ok: true; draft: EditorDraft; ids: string[] } | Extract<DraftOpResult, { ok: false }>;

const failed = (result: DraftOpResult) => result as Extract<DraftOpResult, { ok: false }>;

/** Removes the elements; `next` is the element to select afterwards (or their parent). */
export function removeNodes(
    draft: EditorDraft,
    ids: readonly string[]
): { draft: EditorDraft; next: string | null; count: number } {
    const targets = normalizeSelection(draft, ids);
    const removed = new Set(targets);
    const last = targets[targets.length - 1];
    const position = last ? findNodePosition(draft, last) : undefined;
    const next =
        position?.siblings.slice(position.index + 1).find(({ id }) => !removed.has(id))?.id ??
        position?.siblings
            .slice(0, position.index)
            .reverse()
            .find(({ id }) => !removed.has(id))?.id ??
        position?.parentId ??
        null;
    let current = draft;
    for (const id of targets) current = removeNode(current, id);
    return { draft: current, next, count: targets.length };
}

/** Puts a copy of each element right after its original; the copies become the selection. */
export function duplicateNodes(draft: EditorDraft, ids: readonly string[]): MultiOpResult {
    let current = draft;
    const copies: string[] = [];
    for (const id of normalizeSelection(draft, ids)) {
        const result = duplicateNode(current, id);
        if (!result.ok) return failed(result);
        current = result.draft;
        if (result.copyId) copies.push(result.copyId);
    }
    return { ok: true, draft: current, ids: copies };
}

/** Inserts the nodes together, in order, at one place (paste, drop of a set). */
export function insertNodesAt(
    draft: EditorDraft,
    placement: NodePlacement,
    nodes: readonly TemplateNode[]
): MultiOpResult {
    let current = draft;
    for (const [offset, node] of nodes.entries()) {
        const result = insertAtPlacement(
            current,
            { ...placement, index: placement.index + offset },
            node
        );
        if (!result.ok) return failed(result);
        current = result.draft;
    }
    return { ok: true, draft: current, ids: nodes.map(({ id }) => id) };
}

function containsId(node: TemplateNode, id: string): boolean {
    if (node.id === id) return true;
    return isContainerNode(node) && node.children.some((child) => containsId(child, id));
}

/** Moves the set to one place in page order; a place inside any of them is refused. */
export function placeNodes(
    draft: EditorDraft,
    ids: readonly string[],
    placement: NodePlacement
): MultiOpResult {
    const prepared =
        placement.column === null ? draft : materializeColumns(draft, placement.parentId);
    const targets = normalizeSelection(prepared, ids);
    const nodes = targets.map((id) => findNode(prepared, id)!);
    if (
        placement.parentId !== null &&
        nodes.some((node) => containsId(node, placement.parentId!))
    ) {
        return { ok: false, error: 'self-move' };
    }
    const shift = targets.filter((id) => {
        const position = findNodePosition(prepared, id);
        return position?.parentId === placement.parentId && position.index < placement.index;
    }).length;
    let detached = prepared;
    for (const id of targets) detached = removeNode(detached, id);
    const placed = nodes.map((node) => {
        const { column: _column, ...rest } = node;
        void _column;
        return (
            placement.column === null ? rest : { ...rest, column: placement.column }
        ) as TemplateNode;
    });
    return insertNodesAt(
        detached,
        { parentId: placement.parentId, index: placement.index - shift, column: null },
        placed
    );
}

function applyMove(draft: EditorDraft, id: string, command: MoveCommand): DraftOpResult | null {
    const columnMove = command === 'column-prev' || command === 'column-next';
    const prepared = columnMove
        ? materializeColumns(draft, findNodePosition(draft, id)?.parentId ?? null)
        : draft;
    const target = resolveMoveTarget(prepared, id, command);
    if (!target) return null;
    const moved = moveNode(prepared, id, target.parentId, target.index);
    if (!moved.ok || target.column === undefined) return moved;
    return { ok: true, draft: updateNode(moved.draft, id, { column: target.column ?? undefined }) };
}

/**
 * Keyboard moves of the selection (research R7, clarification Q2). Up and down move each element
 * one place within its own group, from the edge inwards so neighbours move as a block, and an
 * element at the edge stays; out, in, and columns move every element or none.
 */
export function moveEachByCommand(
    draft: EditorDraft,
    ids: readonly string[],
    command: MoveCommand
): MultiOpResult & { moved?: number } {
    const ordered = normalizeSelection(draft, ids);
    let current = draft;
    if (command === 'move-up' || command === 'move-down') {
        const sequence = command === 'move-up' ? ordered : [...ordered].reverse();
        const stuck = new Set<string>();
        let moved = 0;
        for (const id of sequence) {
            const target = resolveMoveTarget(current, id, command);
            const partner = target && findNodePosition(current, id)?.siblings[target.index]?.id;
            if (!target || (partner && stuck.has(partner))) {
                stuck.add(id);
                continue;
            }
            const result = moveNode(current, id, target.parentId, target.index);
            if (!result.ok) return failed(result);
            current = result.draft;
            moved += 1;
        }
        return { ok: true, draft: current, ids: ordered, moved };
    }
    // Moving out inserts each element right after its group: last first keeps their order.
    const sequence = command === 'move-out' ? [...ordered].reverse() : ordered;
    for (const id of sequence) {
        const result = applyMove(current, id, command);
        if (!result) return { ok: true, draft, ids: ordered, moved: 0 };
        if (!result.ok) return failed(result);
        current = result.draft;
    }
    return { ok: true, draft: current, ids: ordered, moved: ordered.length };
}
