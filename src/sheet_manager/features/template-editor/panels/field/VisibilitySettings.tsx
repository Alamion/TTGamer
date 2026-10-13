import { settingLabel } from '../../settings/registry';
import { ToggleRow } from '../LayoutControls';
import { hasTermHint, TermHintControl } from '../TermHintControl';
import type { FieldContext } from './types';

export function visibilitySettings({ field, itemOfList, several, key, update }: FieldContext) {
    return (
        <>
            {!itemOfList && (
                <ToggleRow
                    checked={field.required}
                    label={settingLabel('required')}
                    setting={key('required')}
                    onChange={(checked) => update({ required: checked })}
                />
            )}
            {hasTermHint(field) && !several && (
                <TermHintControl
                    node={field}
                    setting={key('termHint')}
                    onChange={(termHint) => update({ termHint })}
                />
            )}
        </>
    );
}
