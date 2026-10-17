import type { TemplateField } from '../../../../types/template';
import { KeyField } from '../../settings/KeyField';
import { settingLabel } from '../../settings/registry';
import { CatalogBindingEditor } from '../CatalogBindingEditor';
import { ToggleRow } from '../LayoutControls';
import { TrackerSourceSelect, ValueSourceSelect } from '../SourceControls';
import { FromCatalogSetting } from './FromCatalogSetting';
import { ReferenceKindsControl } from './ReferenceKindsControl';
import { editor, t } from './shared';
import type { FieldContext } from './types';

export function valueSettings({
    callbacks,
    field,
    itemOfList,
    several,
    key,
    fields,
    isCustom,
    update,
}: FieldContext) {
    return (
        <>
            {!itemOfList && !several && field.type === 'tracker' && (
                <TrackerSourceSelect
                    node={field}
                    setting={key('source')}
                    onReplace={(_, next) => callbacks.onReplace(next)}
                />
            )}
            {!itemOfList && !several && field.type !== 'tracker' && (
                <ValueSourceSelect
                    node={field}
                    setting={key('source')}
                    onReplace={(_, next) => callbacks.onReplace(next)}
                />
            )}
            {isCustom && !itemOfList && !several && (
                <KeyField
                    label={settingLabel('valueKey')}
                    hint={t(editor.valueKeyHint)}
                    help="sharedValueKey"
                    setting={key('valueKey')}
                    value={field.valueKey ?? ''}
                    onChange={(next) =>
                        update({
                            valueKey: (next.length > 0
                                ? next
                                : undefined) as TemplateField['valueKey'],
                        })
                    }
                />
            )}
            {field.type === 'select' && (
                <>
                    <ToggleRow
                        checked={field.multiple}
                        disabled={fields.some(
                            (each) => each.type === 'select' && each.binding !== undefined
                        )}
                        label={settingLabel('multiple')}
                        setting={key('multiple')}
                        onChange={(checked) => update({ multiple: checked })}
                    />
                    {!several && (
                        <CatalogBindingEditor
                            callbacks={{
                                onAttach: callbacks.onAttachCatalog,
                                onDetach: callbacks.onDetachCatalog,
                                onUpdateFill: callbacks.onUpdateFill,
                            }}
                            field={field}
                            selfId={field.id}
                            setting={key('catalog')}
                        />
                    )}
                </>
            )}
            {field.type === 'text' && !itemOfList && !several && (
                <FromCatalogSetting
                    value={field.fromCatalog}
                    setting={key('fromCatalog')}
                    onChange={(fromCatalog) => update({ fromCatalog })}
                />
            )}
            {field.type === 'reference' && (
                <>
                    <ReferenceKindsControl
                        setting={key('targetKinds')}
                        value={field.targetKinds}
                        onChange={(targetKinds) =>
                            update({ targetKinds: targetKinds as typeof field.targetKinds })
                        }
                    />
                    <ToggleRow
                        checked={field.multiple}
                        label={settingLabel('multiple')}
                        setting={key('multiple')}
                        onChange={(checked) => update({ multiple: checked })}
                    />
                </>
            )}
        </>
    );
}
