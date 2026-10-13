import { NumberInput } from '@site/src/shared/components/NumberInput';

import { inputClasses } from '../../settings/inputClasses';
import { SettingField } from '../../settings/SettingField';

/** A number setting with its visible name. */
export function NumberSetting({
    label,
    max,
    min,
    onChange,
    required = false,
    setting,
    step,
    value,
}: {
    label: string;
    max?: number;
    min?: number;
    onChange: (value: number | undefined) => void;
    required?: boolean;
    setting: string;
    step?: number;
    value: number | undefined;
}) {
    return (
        <SettingField label={label} setting={setting}>
            {({ id, 'data-setting': key }) => (
                <NumberInput
                    id={id}
                    setting={key}
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    optional={!required}
                    onChange={onChange}
                    label={label}
                    className={`${inputClasses} w-full`}
                />
            )}
        </SettingField>
    );
}
