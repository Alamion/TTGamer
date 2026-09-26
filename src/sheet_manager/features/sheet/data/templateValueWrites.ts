import {
    collectTemplateFields,
    type CustomTemplate,
    fieldValueKey,
    type TableNode,
    tableValueKey,
    type TemplateField,
    walkTemplateNodes,
} from '../../../types/template';
import {
    TEMPLATE_VALUES_LIMITS,
    type TemplateFieldValue,
    type TemplatePageValues,
    type TemplateTableRows,
    TemplateTableRowSchema,
    validateTemplateValue,
} from '../../../types/templateValues';

export type TemplateValueWriteResult =
    | { ok: true; values: TemplatePageValues }
    | { ok: false; key: string; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function collectTableBlocks(template: CustomTemplate): Map<string, TableNode> {
    const blocks = new Map<string, TableNode>();
    walkTemplateNodes(template.children, (node) => {
        if (node.type === 'table') blocks.set(node.id, node);
    });
    return blocks;
}

/**
 * Strict write path: changed entries whose storage key (valueKey) matches a template field or
 * table are validated against the template's own definitions. Unchanged entries pass through,
 * so a value stored before a template edit never blocks writes to other keys; orphaned entries
 * (keys the template no longer declares) pass through untouched so template edits never
 * destroy character data.
 */
function validateTemplatePageValues(
    template: CustomTemplate,
    page: TemplatePageValues,
    previous: TemplatePageValues
): TemplateValueWriteResult {
    const fieldDefs = new Map<string, TemplateField>();
    for (const field of collectTemplateFields(template).values()) {
        fieldDefs.set(fieldValueKey(field), field);
    }
    const tableBlocks = new Map<string, TableNode>();
    for (const block of collectTableBlocks(template).values()) {
        tableBlocks.set(tableValueKey(block), block);
    }
    const validated: TemplatePageValues = {};

    for (const [key, value] of Object.entries(page)) {
        // `undefined` means "clear this entry" — the key is dropped from the sparse bag.
        if (value === undefined) continue;
        if (value === previous[key]) {
            validated[key] = value;
            continue;
        }

        const field = fieldDefs.get(key);
        if (field) {
            const result = validateTemplateValue(field, value);
            if (!result.ok) return { ok: false, key, reason: result.reason };
            validated[key] = result.value;
            continue;
        }

        const block = tableBlocks.get(key);
        if (block) {
            if (!isRecord(value)) return { ok: false, key, reason: 'table-not-object' };
            if (Object.keys(value).length > block.maxRows) {
                return { ok: false, key, reason: 'table-max-rows' };
            }
            const columns = new Map(block.columns.map((column) => [column.id, column]));
            const rows: TemplateTableRows = {};
            for (const [rowIndex, row] of Object.entries(value)) {
                const rowKey = `${key}[${rowIndex}]`;
                if (!isRecord(row)) return { ok: false, key: rowKey, reason: 'row-not-object' };
                const cells: Record<string, TemplateFieldValue> = {};
                for (const [columnId, cell] of Object.entries(row)) {
                    if (cell === undefined) continue;
                    const column = columns.get(columnId);
                    const cellKey = `${rowKey}.${columnId}`;
                    if (!column) return { ok: false, key: cellKey, reason: 'unknown-column' };
                    const result = validateTemplateValue(column, cell);
                    if (!result.ok) return { ok: false, key: cellKey, reason: result.reason };
                    cells[columnId] = result.value;
                }
                if (Object.keys(cells).length === 0 && Object.keys(row).length === 0) {
                    rows[rowIndex] = {};
                    continue;
                }
                const parsedRow = TemplateTableRowSchema.safeParse(cells);
                if (!parsedRow.success) return { ok: false, key: rowKey, reason: 'row-schema' };
                rows[rowIndex] = parsedRow.data;
            }
            validated[key] = rows;
            continue;
        }

        validated[key] = value;
    }

    if (Object.keys(validated).length > TEMPLATE_VALUES_LIMITS.entriesPerTemplate) {
        return { ok: false, key: '<bag>', reason: 'entry-limit' };
    }
    return { ok: true, values: validated };
}

/**
 * The one rule every document source writes template values with: validate the changed keys,
 * keep orphans, and drop keys the updater cleared (`undefined`) — a plain spread would
 * resurrect them.
 */
export function applyTemplateValueWrites(
    template: CustomTemplate,
    previous: TemplatePageValues,
    next: TemplatePageValues
): TemplateValueWriteResult {
    const validation = validateTemplatePageValues(template, next, previous);
    if (!validation.ok) return validation;
    const merged: TemplatePageValues = { ...previous };
    for (const key of Object.keys(previous)) {
        if (next[key] === undefined) delete merged[key];
    }
    for (const [key, value] of Object.entries(validation.values)) {
        merged[key] = value as TemplatePageValues[string];
    }
    return { ok: true, values: merged };
}
