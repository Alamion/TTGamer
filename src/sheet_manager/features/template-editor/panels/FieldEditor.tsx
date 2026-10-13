import { Fragment } from 'react';

import { currentValueSource, CUSTOM_SOURCE } from '../elements/sources';
import { useEditorModel } from '../session/EditorModel';
import { type GroupedSettings, mergeGroups } from '../settings/groupedSettings';
import { contentSettings } from './field/ContentSettings';
import { limitsSettings } from './field/LimitsSettings';
import { lookSettings } from './field/LookSettings';
import type { FieldContext, FieldSettingsOptions } from './field/types';
import { valueSettings } from './field/ValueSettings';
import { visibilitySettings } from './field/VisibilitySettings';

export type { FieldEditorCallbacks, FieldSettingsOptions, SeveralFields } from './field/types';

/**
 * A field's settings per group (spec 022): what it says and holds (Content), where its value is
 * stored (Value), its bounds and formulas, its look, and when and how readers see help.
 */
export function fieldSettings({
    bindings,
    callbacks,
    field,
    inTable = false,
    itemOfList = false,
    prefix = '',
    several,
}: FieldSettingsOptions): GroupedSettings {
    const fields = several?.fields ?? [field];
    const sourceKeys = fields.map((each) => currentValueSource(each, bindings));
    const ctx: FieldContext = {
        bindings,
        callbacks,
        field,
        inTable,
        itemOfList,
        prefix,
        several,
        key: (name) => `${prefix}${name}`,
        fields,
        isCustom: itemOfList || sourceKeys.every((source) => source === CUSTOM_SOURCE),
        isTraitSource: bindings.some(
            (binding) => sourceKeys.includes(binding.key) && binding.kind === 'trait'
        ),
        update: callbacks.onUpdate,
    };
    return {
        content: contentSettings(ctx),
        value: valueSettings(ctx),
        limits: limitsSettings(ctx),
        look: lookSettings(ctx),
        visibility: visibilitySettings(ctx),
    };
}

/**
 * A table column's or list entry's settings, inside the table's or list's Content group: the
 * groups follow one another without their own headers.
 */
export function FieldEditor(props: Omit<FieldSettingsOptions, 'bindings'>) {
    const { bindings } = useEditorModel();
    return (
        <div
            className="grid gap-3 rounded-sm border border-border bg-bgSurface p-3"
            data-field-id={props.field.id}
        >
            {mergeGroups([fieldSettings({ ...props, bindings })]).map(({ id, nodes }) => (
                <Fragment key={id}>
                    {nodes.map((node, index) => (
                        <Fragment key={index}>{node}</Fragment>
                    ))}
                </Fragment>
            ))}
        </div>
    );
}
