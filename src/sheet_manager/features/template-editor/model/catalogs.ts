import type { TemplateField } from '../../../types/template';
import { mapFieldItems } from './fields';
import { type EditorDraft } from './types';

/** Attaches (or re-points) a catalog binding on a select field; enforces single choice. */
export function attachCatalog(draft: EditorDraft, fieldId: string, catalogId: string): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select') return field;
        return {
            ...field,
            multiple: false,
            binding: { catalogId, fills: field.binding?.fills ?? {} },
        } as TemplateField;
    });
}

export function detachCatalog(draft: EditorDraft, fieldId: string): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select') return field;
        const { binding: _removed, ...withoutBinding } = field;
        void _removed;
        return withoutBinding as TemplateField;
    });
}

export function updateFill(
    draft: EditorDraft,
    fieldId: string,
    detailKey: string,
    rule: { targetFieldId: string; disabled?: boolean } | undefined
): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select' || !field.binding) return field;
        const fills = { ...field.binding.fills };
        if (rule) fills[detailKey] = rule;
        else delete fills[detailKey];
        return { ...field, binding: { ...field.binding, fills } } as TemplateField;
    });
}
