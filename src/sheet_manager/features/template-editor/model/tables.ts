import type { TemplateField } from '../../../types/template';
import { TEMPLATE_LIMITS } from '../../../types/template';
import { moveItem } from '../../sheet/declarative/rowOrder';
import { newField } from './factories';
import { mapNodes, withChildren } from './tree';
import { type EditorDraft } from './types';

function mapTableColumns(
    draft: EditorDraft,
    tableId: string,
    map: (columns: TemplateField[]) => TemplateField[]
): EditorDraft {
    return withChildren(
        draft,
        mapNodes(draft.children, (node) =>
            node.type === 'table' && node.id === tableId
                ? { ...node, columns: map([...node.columns]) }
                : node
        )
    );
}

export function addTableColumn(draft: EditorDraft, tableId: string): EditorDraft {
    return mapTableColumns(draft, tableId, (columns) =>
        columns.length >= TEMPLATE_LIMITS.tableColumnsMax
            ? columns
            : [...columns, newField('text', `Column ${columns.length + 1}`)]
    );
}

/** Moves a table column (spec 022, US5): cells are keyed by column id, so values stay put. */
export function moveTableColumn(
    draft: EditorDraft,
    tableId: string,
    from: number,
    to: number
): EditorDraft {
    return mapTableColumns(draft, tableId, (columns) => moveItem(columns, from, to));
}

export function removeTableColumn(
    draft: EditorDraft,
    tableId: string,
    columnId: string
): EditorDraft {
    return mapTableColumns(draft, tableId, (columns) =>
        columns.length <= 1 ? columns : columns.filter((column) => column.id !== columnId)
    );
}
