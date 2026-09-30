import { isTemplateCompatible } from '../../../systems/view';
import {
    collectListNodes,
    type CustomTemplate,
    listIsNamed,
    listItemField,
    type ListNode,
    listValueKey,
} from '../../../types/template';
import { coerceListValue, type TemplateListEntry } from '../../../types/templateValues';

/** What saving a list's new entry template stops showing (spec 016, R6). */
export interface ListItemChange {
    listId: string;
    title: string;
    /** Documents with at least one affected entry. */
    documents: number;
    /** Entries whose shown value the new entry template cannot show. */
    lostValues: number;
    /** Entry names hidden because the list stops being named. */
    hiddenNames: number;
}

interface StoredDocument {
    systemId: string;
    kind: string;
    templateValues?: Readonly<Record<string, unknown>>;
}

function customLists(template: CustomTemplate): Map<string, ListNode> {
    return new Map(
        collectListNodes(template)
            .filter((list) => list.bindingKey === undefined)
            .map((list) => [list.id, list])
    );
}

/**
 * Per custom list present in both versions: how many stored values and names the saved version
 * would stop showing. Entries live in the document's shared value bag under the list's key, so
 * every document the template can render counts. Nothing is deleted by the change; the report
 * is what the author confirms before saving.
 */
export function listItemChangeReport(
    before: CustomTemplate | undefined,
    after: CustomTemplate,
    documents: readonly StoredDocument[]
): ListItemChange[] {
    if (!before) return [];
    const previous = customLists(before);
    const changes: ListItemChange[] = [];
    for (const list of customLists(after).values()) {
        const old = previous.get(list.id);
        if (!old) continue;
        const oldItem = listItemField(old);
        const newItem = listItemField(list);
        const hidesNames = listIsNamed(old) && !listIsNamed(list);
        if (!hidesNames && JSON.stringify(oldItem) === JSON.stringify(newItem)) continue;
        const key = listValueKey(list);
        let affectedDocuments = 0;
        let lostValues = 0;
        let hiddenNames = 0;
        for (const document of documents) {
            if (!isTemplateCompatible(after, document)) continue;
            const stored = document.templateValues?.[key];
            if (!Array.isArray(stored)) continue;
            let affected = false;
            for (const entry of stored as TemplateListEntry[]) {
                const shown = coerceListValue(oldItem, entry.value);
                if (shown !== undefined && coerceListValue(newItem, entry.value) === undefined) {
                    lostValues += 1;
                    affected = true;
                }
                if (hidesNames && entry.label) {
                    hiddenNames += 1;
                    affected = true;
                }
            }
            if (affected) affectedDocuments += 1;
        }
        if (lostValues + hiddenNames > 0) {
            changes.push({
                listId: list.id,
                title: list.title ?? newItem.label,
                documents: affectedDocuments,
                lostValues,
                hiddenNames,
            });
        }
    }
    return changes;
}
