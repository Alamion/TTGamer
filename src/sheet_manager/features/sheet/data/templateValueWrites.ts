import {
    collectListNodes,
    collectTemplateFields,
    type CustomTemplate,
    fieldValueKey,
    listIsNamed,
    listItemField,
    type ListNode,
    listValueKey,
    type TableNode,
    tableValueKey,
    type TemplateField,
    type TrackerColumn,
    walkTemplateNodes,
} from '../../../types/template';
import {
    pickLabelBase,
    PickLabelSchema,
    ratingDetailBase,
    RatingDetailSchema,
    TEMPLATE_VALUES_LIMITS,
    type TemplateFieldValue,
    type TemplateListEntry,
    TemplateListEntrySchema,
    type TemplatePageValues,
    type TemplateTableRows,
    TemplateTableRowSchema,
    validateTemplateValue,
    validateTrackerValue,
} from '../../../types/templateValues';

export type TemplateValueWriteResult =
    { ok: true; values: TemplatePageValues } | { ok: false; key: string; reason: string };

/** A choice field bound to a catalog: picks from it may keep the picked name beside the id. */
function isCatalogSelect(field: TemplateField | undefined): boolean {
    return field?.type === 'select' && field.binding !== undefined;
}

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

type ListValidation =
    { ok: true; value: TemplateListEntry[] } | { ok: false; key: string; reason: string };

/**
 * A custom list's entries against its entry template (spec 016, R3). Only changed entries are
 * checked, so a value an earlier template version stored never blocks edits to other entries;
 * companions the current template has no use for (a name on an unnamed list, a stale detail)
 * are dropped from the changed entry.
 */
function validateListEntries(
    list: ListNode,
    key: string,
    value: unknown,
    previous: unknown
): ListValidation {
    if (!Array.isArray(value)) return { ok: false, key, reason: 'list-not-array' };
    if (value.length > TEMPLATE_VALUES_LIMITS.listEntriesMax) {
        return { ok: false, key, reason: 'list-max-entries' };
    }
    const before = new Map<string, unknown>();
    if (Array.isArray(previous)) {
        for (const entry of previous) {
            if (isRecord(entry) && typeof entry.id === 'string') before.set(entry.id, entry);
        }
    }
    const item = listItemField(list);
    const named = listIsNamed(list);
    const seen = new Set<string>();
    const entries: TemplateListEntry[] = [];
    for (const raw of value) {
        const parsed = TemplateListEntrySchema.safeParse(raw);
        if (!parsed.success) return { ok: false, key, reason: 'entry-schema' };
        const entry = parsed.data;
        const entryKey = `${key}[${entry.id}]`;
        if (seen.has(entry.id)) return { ok: false, key: entryKey, reason: 'duplicate-entry' };
        seen.add(entry.id);
        if (before.get(entry.id) === raw) {
            entries.push(raw as TemplateListEntry);
            continue;
        }
        const next: TemplateListEntry = { id: entry.id };
        if (named && entry.label !== undefined) next.label = entry.label;
        if (entry.value !== undefined) {
            const result = validateTemplateValue(item, entry.value);
            if (!result.ok) return { ok: false, key: entryKey, reason: result.reason };
            next.value = result.value as TemplateListEntry['value'];
        }
        if (item.type === 'rating' && entry.detail !== undefined) next.detail = entry.detail;
        if (isCatalogSelect(item) && entry.pickLabel !== undefined) {
            next.pickLabel = entry.pickLabel;
        }
        entries.push(next);
    }
    return { ok: true, value: entries };
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
    const customLists = new Map<string, ListNode>();
    for (const list of collectListNodes(template)) {
        if (list.bindingKey === undefined) customLists.set(listValueKey(list), list);
    }
    // Built-in trackers keep their extra columns' values in the page (spec 018, R4).
    const trackerExtras = new Map<string, readonly TrackerColumn[]>();
    walkTemplateNodes(template.children, (node) => {
        if (node.type === 'primitive' && node.tracker?.columns) {
            trackerExtras.set(node.tracker.valueKey ?? node.id, node.tracker.columns);
        }
    });
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

        const extras = trackerExtras.get(key);
        if (extras) {
            // Member tracks key their repeated columns by member, so copies are not capped here.
            const result = validateTrackerValue(
                extras.map((column) =>
                    column.copies ? { ...column, copies: { max: 24 } } : column
                ),
                value
            );
            if (!result.ok) return { ok: false, key, reason: result.reason };
            validated[key] = result.value;
            continue;
        }

        const pickedKey = pickLabelBase(key);
        if (pickedKey !== undefined && isCatalogSelect(fieldDefs.get(pickedKey))) {
            const label = PickLabelSchema.safeParse(value);
            if (!label.success) return { ok: false, key, reason: 'type' };
            validated[key] = label.data;
            continue;
        }

        const ratingKey = ratingDetailBase(key);
        if (ratingKey !== undefined && fieldDefs.get(ratingKey)?.type === 'rating') {
            const detail = RatingDetailSchema.safeParse(value);
            if (!detail.success) return { ok: false, key, reason: 'type' };
            validated[key] = detail.data;
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
                    const cellKey = `${rowKey}.${columnId}`;
                    const pickedColumn = pickLabelBase(columnId);
                    if (pickedColumn !== undefined && isCatalogSelect(columns.get(pickedColumn))) {
                        const label = PickLabelSchema.safeParse(cell);
                        if (!label.success) return { ok: false, key: cellKey, reason: 'type' };
                        cells[columnId] = label.data;
                        continue;
                    }
                    const column = columns.get(columnId);
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

        const list = customLists.get(key);
        if (list) {
            const result = validateListEntries(list, key, value, previous[key]);
            if (!result.ok) return result;
            validated[key] = result.value;
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
