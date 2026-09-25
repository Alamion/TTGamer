import type { TemplateNode } from '../../../types/template';
import { isContainerNode } from '../../../types/template';
import type { EditorDraft } from './draft';
import type { EditorShortcut } from './shortcuts';

export type MoveCommand = Extract<
    EditorShortcut,
    'move-up' | 'move-down' | 'move-out' | 'move-in' | 'column-prev' | 'column-next'
>;

/**
 * Where a keyboard move puts a node: `index` is its final position among the new siblings (the
 * `moveNode` convention); `column` is the column to set, `null` to clear it, absent to keep it.
 */
export interface MoveTarget {
    parentId: string | null;
    index: number;
    column?: number | null;
}

interface Located {
    node: TemplateNode;
    siblings: TemplateNode[];
    index: number;
    parent: TemplateNode | null;
    grandSiblings: TemplateNode[] | null;
    parentIndex: number;
}

function locate(draft: EditorDraft, nodeId: string): Located | undefined {
    const search = (
        siblings: TemplateNode[],
        parent: TemplateNode | null,
        grandSiblings: TemplateNode[] | null,
        parentIndex: number
    ): Located | undefined => {
        for (let index = 0; index < siblings.length; index += 1) {
            const node = siblings[index]!;
            if (node.id === nodeId) {
                return { node, siblings, index, parent, grandSiblings, parentIndex };
            }
            if (isContainerNode(node)) {
                const found = search(node.children, node, siblings, index);
                if (found) return found;
            }
        }
        return undefined;
    };
    return search(draft.children, null, null, -1);
}

function parentColumns(parent: TemplateNode | null): number {
    return parent && isContainerNode(parent) ? (parent.columns ?? 1) : 1;
}

/** The column a child renders in (unplaced children go to column 1, as the renderer does). */
function columnOf(node: TemplateNode, columns: number): number {
    return columns > 1 ? Math.min(Math.max(node.column ?? 1, 1), columns) : 1;
}

export function resolveMoveTarget(
    draft: EditorDraft,
    nodeId: string,
    command: MoveCommand
): MoveTarget | null {
    const located = locate(draft, nodeId);
    if (!located) return null;
    const { node, siblings, index, parent } = located;
    const parentId = parent?.id ?? null;
    const columns = parentColumns(parent);
    const column = columnOf(node, columns);
    const sameColumn = (candidate: TemplateNode) => columnOf(candidate, columns) === column;

    switch (command) {
        case 'move-up': {
            for (let j = index - 1; j >= 0; j -= 1) {
                if (sameColumn(siblings[j]!)) return { parentId, index: j };
            }
            return null;
        }
        case 'move-down': {
            for (let j = index + 1; j < siblings.length; j += 1) {
                if (sameColumn(siblings[j]!)) return { parentId, index: j };
            }
            return null;
        }
        case 'move-out': {
            if (!parent || !located.grandSiblings) return null;
            const grandParentColumns = columnsOfSiblingsParent(draft, parent.id);
            return {
                parentId: parentIdOf(draft, parent.id),
                index: located.parentIndex + 1,
                column: grandParentColumns > 1 ? columnOf(parent, grandParentColumns) : null,
            };
        }
        case 'move-in': {
            for (let j = index - 1; j >= 0; j -= 1) {
                const candidate = siblings[j]!;
                if (isContainerNode(candidate) && sameColumn(candidate)) {
                    return {
                        parentId: candidate.id,
                        index: candidate.children.length,
                        column: null,
                    };
                }
            }
            return null;
        }
        case 'column-prev':
        case 'column-next': {
            if (columns <= 1) return null;
            const nextColumn = column + (command === 'column-prev' ? -1 : 1);
            if (nextColumn < 1 || nextColumn > columns) return null;
            const detached = siblings.filter((sibling) => sibling.id !== nodeId);
            let last = -1;
            detached.forEach((sibling, position) => {
                if (columnOf(sibling, columns) === nextColumn) last = position;
            });
            return {
                parentId,
                index: last === -1 ? Math.min(index, detached.length) : last + 1,
                column: nextColumn,
            };
        }
    }
}

function parentIdOf(draft: EditorDraft, nodeId: string): string | null {
    return locate(draft, nodeId)?.parent?.id ?? null;
}

function columnsOfSiblingsParent(draft: EditorDraft, nodeId: string): number {
    return parentColumns(locate(draft, nodeId)?.parent ?? null);
}
