import { Plus, Trash2 } from 'lucide-react';

import type { TemplateField } from '../../../../types/template';
import { TEMPLATE_LIMITS } from '../../../../types/template';
import { inputClasses } from '../../settings/inputClasses';
import { editor, t } from './shared';
import type { FieldEditorCallbacks } from './types';

/** A choice's options, one row each (`option:<index>` keys). */
export function SelectOptions({
    callbacks,
    field,
    prefix,
}: {
    callbacks: FieldEditorCallbacks;
    field: Extract<TemplateField, { type: 'select' }>;
    prefix: string;
}) {
    return (
        <div className="grid gap-1">
            <p className="text-xs font-semibold text-textPrimary">{t(editor.options)}</p>
            <div className="grid gap-1" data-setting-list="">
                {field.options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                        <input
                            value={option.label}
                            onChange={(event) =>
                                callbacks.onUpdateOption(option.id, event.target.value)
                            }
                            aria-label={t(editor.optionLabel)}
                            data-setting={`${prefix}option:${index}`}
                            className={`${inputClasses} min-w-0 flex-1`}
                        />
                        <button
                            type="button"
                            onClick={() => callbacks.onRemoveOption(option.id)}
                            disabled={field.options.length <= 1}
                            aria-label={t(editor.remove)}
                            className="rounded-sm p-1 text-textSecondary hover:bg-bgSurface hover:text-error disabled:opacity-40"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={callbacks.onAddOption}
                disabled={field.options.length >= TEMPLATE_LIMITS.optionsPerField}
                className="flex items-center gap-1 justify-self-start rounded-sm px-2 py-1 text-xs text-primary hover:bg-bgSurface disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t(editor.addOption)}
            </button>
        </div>
    );
}
