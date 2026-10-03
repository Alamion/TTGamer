import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { type ReactNode, useId } from 'react';

import { EDITOR_GUIDE, EditorHelp } from '../EditorHelp';
import { useMixedSetting } from './mixedSettings';

/** Attributes the control spreads so its label, key, and message reach it. */
export interface SettingControlProps {
    id: string;
    'data-setting'?: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
}

export interface SettingMessage {
    tone: 'error' | 'ok';
    text: string;
}

/**
 * One setting: a visible label above the control (its accessible name), an optional help link
 * beside the label, then the control, a hint, and a message (spec 022, FR-001).
 */
export function SettingField({
    children,
    className,
    help,
    hint,
    label,
    message,
    setting,
}: {
    children: (control: SettingControlProps) => ReactNode;
    className?: string;
    help?: keyof typeof EDITOR_GUIDE;
    hint?: ReactNode;
    label: string;
    message?: SettingMessage;
    /** The control's `data-setting` key, which issues use to focus it. */
    setting?: string;
}) {
    const id = useId();
    const mixed = useMixedSetting(setting);
    const messageId = `${id}-message`;
    const error = message?.tone === 'error';
    return (
        <div className={clsx('grid min-w-0 gap-1', className)}>
            <div className="flex min-w-0 items-center gap-1">
                <label htmlFor={id} className="text-xs font-semibold text-textPrimary">
                    {label}
                </label>
                {help && <EditorHelp topic={help} about={label} />}
                {mixed && (
                    <span data-setting-mixed="" className="text-[11px] text-textSecondary">
                        · {translate(uiMessages.sheet.templates.editor.mixed)}
                    </span>
                )}
            </div>
            {children({
                id,
                ...(setting ? { 'data-setting': setting } : {}),
                ...(error ? { 'aria-invalid': true as const } : {}),
                ...(message ? { 'aria-describedby': messageId } : {}),
            })}
            {hint && <p className="text-[11px] text-textSecondary">{hint}</p>}
            {message && (
                <p
                    id={messageId}
                    className={clsx('text-[11px]', error ? 'text-error' : 'text-success')}
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}
