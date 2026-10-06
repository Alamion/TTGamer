import { type ReactNode } from 'react';

import type { EDITOR_GUIDE } from '../EditorHelp';
import { SettingField } from './SettingField';

/** A value key: `#` marks it as a name, not text shown to readers. */
export function KeyField({
    help,
    hint,
    label,
    onChange,
    placeholder,
    setting,
    value,
}: {
    help?: keyof typeof EDITOR_GUIDE;
    hint?: ReactNode;
    label: string;
    onChange: (value: string) => void;
    placeholder?: string;
    setting: string;
    value: string;
}) {
    return (
        <SettingField label={label} help={help} hint={hint} setting={setting}>
            {(control) => (
                <div className="flex min-w-0 items-stretch overflow-hidden rounded border border-border bg-bgSurface focus-within:ring-1 focus-within:ring-primary">
                    <span
                        aria-hidden="true"
                        className="self-center pl-2 pr-0.5 font-mono text-xs text-textSecondary"
                    >
                        #
                    </span>
                    <input
                        {...control}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        placeholder={placeholder}
                        spellCheck={false}
                        className="min-w-0 flex-1 bg-transparent py-1.5 pr-2 font-mono text-sm text-textPrimary focus:outline-none"
                    />
                </div>
            )}
        </SettingField>
    );
}
