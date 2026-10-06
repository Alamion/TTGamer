import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { TemplateField } from '../../../types/template';
import { isTemplateField, listItemField, TEMPLATE_LIMITS } from '../../../types/template';
import { baseField } from './factories';
import { generateDraftId } from './ids';
import { keepTermOnRename, mapNodes, type TermCarrier, withChildren } from './tree';
import { type EditorDraft } from './types';

export function mapFieldItems(
    draft: EditorDraft,
    fieldId: string,
    map: (field: TemplateField) => TemplateField
): EditorDraft {
    return withChildren(
        draft,
        mapNodes(draft.children, (node) => {
            if (node.type === 'table' && node.columns.some((column) => column.id === fieldId)) {
                return {
                    ...node,
                    columns: node.columns.map((column) =>
                        column.id === fieldId ? map(column) : column
                    ),
                };
            }
            // A custom list's entry template (spec 016); a legacy list gets its item on first edit.
            if (node.type === 'list' && node.valueKey !== undefined) {
                const item = listItemField(node);
                if (item.id !== fieldId) return node;
                const next = map(item);
                return next.type === 'formula' || next.type === 'tracker'
                    ? node
                    : { ...node, item: next };
            }
            return isTemplateField(node) && node.id === fieldId ? map(node) : node;
        })
    );
}

/** Changing the type resets type-specific settings so the field stays valid. */
function retypeField(field: TemplateField, type: TemplateField['type']): TemplateField {
    const next = baseField(type, field.label);
    return {
        ...next,
        id: field.id,
        required: field.required,
        ...(field.valueKey !== undefined ? { valueKey: field.valueKey } : {}),
    };
}

export function changeFieldType(
    draft: EditorDraft,
    fieldId: string,
    type: TemplateField['type']
): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        const retyped = retypeField(field, type);
        // A new reference points at documents of the template's own kind by default.
        return retyped.type === 'reference' && field.type !== 'reference'
            ? { ...retyped, targetKinds: [draft.documentKind] }
            : retyped;
    });
}

export function updateField(
    draft: EditorDraft,
    fieldId: string,
    updates: Partial<TemplateField>
): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        const next = { ...field, ...updates } as TemplateField;
        // An author-edited label replaces the shipped translation reference (term kept, above).
        if ('label' in updates) keepTermOnRename(next as TermCarrier);
        return next;
    });
}

export function addOption(draft: EditorDraft, fieldId: string): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select' || field.options.length >= TEMPLATE_LIMITS.optionsPerField) {
            return field;
        }
        return {
            ...field,
            options: [
                ...field.options,
                {
                    id: generateDraftId('opt'),
                    label: translate(uiMessages.sheet.templates.editor.newOption, {
                        index: field.options.length + 1,
                    }),
                },
            ],
        };
    });
}

export function updateOption(
    draft: EditorDraft,
    fieldId: string,
    optionId: string,
    label: string
): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select') return field;
        return {
            ...field,
            options: field.options.map((option) =>
                option.id === optionId ? { ...option, label } : option
            ),
        };
    });
}

export function removeOption(draft: EditorDraft, fieldId: string, optionId: string): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select' || field.options.length <= 1) return field;
        return { ...field, options: field.options.filter((option) => option.id !== optionId) };
    });
}
