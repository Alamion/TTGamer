import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { TemplateNode } from '../../../types/template';
import type { OverlayPlacement } from '../../sheet/declarative/editorOverlay';
import { elementName } from '../elements/registry';
import { selectOnly } from '../model/selection';
import { findNode, insertAtPlacement, placeNode } from '../model/tree';
import { type EditorDraft } from '../model/types';
import { labelIn } from './selection';
import type { Announcement, Operation } from './types';

const editor = uiMessages.sheet.templates.editor;

function movedTo(label: string, column: number | null | undefined): Announcement {
    return column
        ? { message: editor.movedColumn, values: { label, column } }
        : { message: editor.moved, values: { label } };
}

/** Inserts a new element at a slot; it becomes the selection. */
export function insertAt(placement: OverlayPlacement, node: TemplateNode): Operation {
    return (draft) => {
        const result = insertAtPlacement(draft, placement, node);
        if (!result.ok) return result;
        return {
            ok: true,
            draft: result.draft,
            selection: selectOnly(node.id),
            announce: { message: editor.inserted, values: { label: elementName(node) } },
        };
    };
}

/** Moves an element to a slot (keyboard drop or the insertion menu); it becomes the selection. */
export function placeAt(nodeId: string, placement: OverlayPlacement): Operation {
    return (draft) => {
        const result = placeNode(draft, nodeId, placement);
        if (!result.ok) return result;
        return {
            ok: true,
            draft: result.draft,
            selection: selectOnly(nodeId),
            announce: movedTo(labelIn(draft, nodeId), placement.column),
        };
    };
}

/** Records a page a drag produced; the dragged elements become the selection. */
export function commitDrag(nodeIds: readonly string[], next: EditorDraft): Operation {
    return (draft) => {
        const [first] = nodeIds;
        if (!first) return { ok: true, draft };
        return {
            ok: true,
            draft: next,
            selection: { ids: [...nodeIds], anchor: nodeIds[nodeIds.length - 1]! },
            announce:
                nodeIds.length > 1
                    ? {
                          message: editor.movedMany,
                          count: nodeIds.length,
                          values: { count: nodeIds.length },
                      }
                    : movedTo(labelIn(draft, first), findNode(next, first)?.column),
        };
    };
}
