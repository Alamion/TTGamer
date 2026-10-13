import type { DocumentBindingDescriptor } from '../../../../systems/templateBindings';
import type { TemplateField, TemplateNode } from '../../../../types/template';

/** The field-scoped edits a field's settings make (a page field, a table column, a list entry). */
export interface FieldEditorCallbacks {
    onUpdate: (updates: Partial<TemplateField>) => void;
    onChangeType: (type: TemplateField['type']) => void;
    onAddOption: () => void;
    onUpdateOption: (optionId: string, label: string) => void;
    onRemoveOption: (optionId: string) => void;
    onAttachCatalog: (catalogId: string) => void;
    onDetachCatalog: () => void;
    onUpdateFill: (
        detailKey: string,
        rule: { targetFieldId: string; disabled?: boolean } | undefined
    ) => void;
    onReplace: (next: TemplateNode) => void;
}

export interface FieldSettingsOptions {
    callbacks: FieldEditorCallbacks;
    field: TemplateField;
    bindings: readonly DocumentBindingDescriptor[];
    /** A table column: a tracker cannot be one (spec 018); its label is set in the column row. */
    inTable?: boolean;
    /**
     * A custom list's entry template (spec 016): settings that cannot apply to repeated copies
     * (storage, required) are hidden, and a formula is not offered.
     */
    itemOfList?: boolean;
    /** Prefix of every `data-setting` key: `column:<id>.` or `entry.` (spec 022, R3). */
    prefix?: string;
    /**
     * Several selected fields of one type (spec 023, US3): `field` is the first of them, every
     * change reaches them all, and settings that belong to one field are left out.
     */
    several?: SeveralFields;
}

export interface SeveralFields {
    fields: readonly TemplateField[];
    /** A change worked out for each field, such as one S/P/E flag that keeps the others. */
    onUpdateEach: (update: (field: TemplateField) => Partial<TemplateField>) => void;
}

/** What every settings group of one field reads: the options plus values worked out once. */
export interface FieldContext {
    bindings: readonly DocumentBindingDescriptor[];
    callbacks: FieldEditorCallbacks;
    field: TemplateField;
    inTable: boolean;
    itemOfList: boolean;
    prefix: string;
    several: SeveralFields | undefined;
    key: (name: string) => string;
    fields: readonly TemplateField[];
    isCustom: boolean;
    /** Trait values render with the sheet's own trait row: rating bounds and maxFrom do not apply. */
    isTraitSource: boolean;
    update: FieldEditorCallbacks['onUpdate'];
}
