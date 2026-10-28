import type { TemplateField } from '../../../../types/template';
import type { FieldLabelPosition } from '../../../../types/template';
import {
    fieldLabelPosition,
    hasLabelPositionChoice,
    LIST_ITEM_TYPES,
    TEMPLATE_FIELD_TYPES,
} from '../../../../types/template';
import { inputClasses } from '../../settings/inputClasses';
import { settingLabel } from '../../settings/registry';
import { SettingField } from '../../settings/SettingField';
import { ToggleRow } from '../LayoutControls';
import { SelectOptions } from './SelectOptions';
import { editor, fieldTypes, optionalText, t } from './shared';
import type { FieldContext } from './types';

export function contentSettings({
    callbacks,
    field,
    inTable,
    itemOfList,
    prefix,
    several,
    key,
    isCustom,
    update,
}: FieldContext) {
    const types = itemOfList
        ? LIST_ITEM_TYPES
        : inTable
          ? TEMPLATE_FIELD_TYPES.filter(
                (type) => type !== 'tracker' && type !== 'markdown' && type !== 'mentions'
            )
          : TEMPLATE_FIELD_TYPES;
    return (
        <>
            {!inTable && !several && (
                <SettingField
                    label={t(itemOfList ? editor.entryLabel : editor.label)}
                    hint={itemOfList ? t(editor.entryLabelHint) : undefined}
                    setting={key('label')}
                >
                    {(control) => (
                        <input
                            {...control}
                            value={field.label}
                            onChange={(event) => update({ label: event.target.value })}
                            className={`${inputClasses} w-full`}
                        />
                    )}
                </SettingField>
            )}
            <SettingField
                label={settingLabel('type')}
                setting={key('type')}
                hint={isCustom ? undefined : t(editor.sourceTypeLocked)}
            >
                {(control) => (
                    <select
                        {...control}
                        value={field.type}
                        disabled={!isCustom}
                        onChange={(event) =>
                            callbacks.onChangeType(event.target.value as TemplateField['type'])
                        }
                        className={`${inputClasses} w-full disabled:opacity-60`}
                    >
                        {types.map((type) => (
                            <option key={type} value={type}>
                                {t(fieldTypes[type])}
                            </option>
                        ))}
                    </select>
                )}
            </SettingField>
            <SettingField label={settingLabel('description')} setting={key('description')}>
                {(control) => (
                    <input
                        {...control}
                        value={field.description ?? ''}
                        onChange={(event) =>
                            update({ description: optionalText(event.target.value) })
                        }
                        className={`${inputClasses} w-full`}
                    />
                )}
            </SettingField>
            <ToggleRow
                checked={!field.hideLabel}
                label={settingLabel('hideLabel')}
                setting={key('hideLabel')}
                onChange={(checked) => update({ hideLabel: checked ? undefined : true })}
            />
            {hasLabelPositionChoice(field.type) && (
                <SettingField label={settingLabel('labelPosition')} setting={key('labelPosition')}>
                    {(control) => (
                        <select
                            {...control}
                            value={fieldLabelPosition(field)}
                            disabled={field.hideLabel === true}
                            onChange={(event) => {
                                const position = event.target.value as FieldLabelPosition;
                                // The type's own default is not stored, so it can change with the type.
                                const fallback = fieldLabelPosition({ type: field.type });
                                update({
                                    labelPosition: position === fallback ? undefined : position,
                                });
                            }}
                            className={`${inputClasses} disabled:opacity-50`}
                        >
                            <option value="top">{t(editor.labelTop)}</option>
                            <option value="left">{t(editor.labelLeft)}</option>
                        </select>
                    )}
                </SettingField>
            )}
            {field.type === 'text' && (
                <SettingField label={settingLabel('placeholder')} setting={key('placeholder')}>
                    {(control) => (
                        <input
                            {...control}
                            value={field.placeholder ?? ''}
                            onChange={(event) =>
                                update({
                                    placeholder: optionalText(event.target.value),
                                    placeholderMessage: undefined,
                                })
                            }
                            className={`${inputClasses} w-full`}
                        />
                    )}
                </SettingField>
            )}
            {field.type === 'select' && !several && (
                <SelectOptions callbacks={callbacks} field={field} prefix={prefix} />
            )}
        </>
    );
}
