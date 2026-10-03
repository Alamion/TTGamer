import { clsx } from 'clsx';
import { type ReactNode } from 'react';

import { checkFormulaInput } from '../../../../features/sheet/data/formulaCheck';
import type { EDITOR_GUIDE } from '../EditorHelp';
import { useEditorCoordinates, useEditorModel } from '../EditorModel';
import { formulaCheckMessage } from './formulaMessage';
import { SettingField } from './SettingField';

/** A setting holding a formula: an fx mark, a monospace box, value suggestions, a live check. */
export function FormulaField({
    help = 'limitsFromValues',
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
    onChange: (value: string | undefined) => void;
    placeholder?: string;
    setting: string;
    value: string | undefined;
}) {
    const { coordinateListId } = useEditorModel();
    const message = formulaCheckMessage(checkFormulaInput(value, useEditorCoordinates()));
    const bad = message?.tone === 'error';
    return (
        <SettingField label={label} help={help} hint={hint} setting={setting} message={message}>
            {(control) => (
                <div
                    className={clsx(
                        'flex min-w-0 items-stretch overflow-hidden rounded border bg-bgSurface focus-within:ring-1',
                        bad
                            ? 'border-error focus-within:ring-error'
                            : 'border-border focus-within:ring-primary'
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={clsx(
                            'grid place-items-center px-2 font-serif text-xs font-semibold italic text-white',
                            bad ? 'bg-error' : 'bg-primary-muted'
                        )}
                    >
                        fx
                    </span>
                    <input
                        {...control}
                        value={value ?? ''}
                        onChange={(event) =>
                            onChange(event.target.value.length > 0 ? event.target.value : undefined)
                        }
                        placeholder={placeholder}
                        list={coordinateListId}
                        spellCheck={false}
                        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-sm text-textPrimary focus:outline-none"
                    />
                </div>
            )}
        </SettingField>
    );
}
