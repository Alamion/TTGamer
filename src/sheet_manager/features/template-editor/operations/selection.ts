import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { elementName } from '../elements/registry';
import type { MoveCommand } from '../model/moveTargets';
import { normalizeSelection, selectOnly } from '../model/selection';
import { findNode } from '../model/tree';
import { type EditorDraft } from '../model/types';
import { duplicateNodes, moveEachByCommand, removeNodes } from './multi';
import type { Announcement, Operation, OpResult } from './types';

const editor = uiMessages.sheet.templates.editor;

export function labelIn(draft: EditorDraft, nodeId: string): string {
    const node = findNode(draft, nodeId);
    return node ? elementName(node) : nodeId;
}

/**
 * One element is named; several are counted (FR-007). A group selected with its own element
 * counts once.
 */
function told(
    draft: EditorDraft,
    ids: readonly string[],
    one: Announcement['message'],
    many: Announcement['message'],
    count: number
): Announcement {
    const targets = normalizeSelection(draft, ids);
    return targets.length === 1
        ? { message: one, values: { label: labelIn(draft, targets[0]!) } }
        : { message: many, count, values: { count } };
}

/** Removes the selection; the next element, or the parent, becomes the selection. */
export const removeSelection: Operation = (draft, selection) => {
    const { ids } = selection;
    if (ids.length === 0) return { ok: true, draft };
    const removed = removeNodes(draft, ids);
    return {
        ok: true,
        draft: removed.draft,
        selection: selectOnly(removed.next),
        announce: told(draft, ids, editor.removed, editor.removedMany, removed.count),
    };
};

/** Copies each selected element right after itself; the copies become the selection. */
export const duplicateSelection: Operation = (draft, selection) => {
    const { ids } = selection;
    if (ids.length === 0) return { ok: true, draft };
    const result = duplicateNodes(draft, ids);
    if (!result.ok) return result;
    const copies = result.ids;
    return {
        ok: true,
        draft: result.draft,
        selection: { ids: copies, anchor: copies[copies.length - 1] ?? null },
        announce: told(draft, ids, editor.duplicated, editor.duplicatedMany, copies.length),
    };
};

/** Moves the selection one step (research R7); elements that cannot move stay. */
export function moveSelection(command: MoveCommand): Operation {
    return (draft, selection): OpResult => {
        const { ids } = selection;
        if (ids.length === 0) return { ok: true, draft };
        const result = moveEachByCommand(draft, ids, command);
        if (!result.ok) return result;
        const moved = result.moved ?? 0;
        if (moved === 0) return { ok: true, draft };
        const targets = normalizeSelection(draft, ids);
        if (targets.length > 1) {
            return {
                ok: true,
                draft: result.draft,
                announce: { message: editor.movedMany, count: moved, values: { count: moved } },
            };
        }
        const label = labelIn(draft, targets[0]!);
        const columnMove = command === 'column-prev' || command === 'column-next';
        const column = columnMove ? findNode(result.draft, targets[0]!)?.column : undefined;
        return {
            ok: true,
            draft: result.draft,
            announce: column
                ? { message: editor.movedColumn, values: { label, column } }
                : { message: editor.moved, values: { label } },
        };
    };
}

/** Whether a move command would move anything in the selection (menus disable it otherwise). */
export function canMoveSelection(
    draft: EditorDraft,
    ids: readonly string[],
    command: MoveCommand
): boolean {
    if (ids.length === 0) return false;
    const result = moveEachByCommand(draft, ids, command);
    return result.ok && (result.moved ?? 0) > 0;
}
