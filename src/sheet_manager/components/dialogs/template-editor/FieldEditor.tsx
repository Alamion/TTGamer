import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

import type { CustomTemplate, TemplateField } from '../../../types/template';
import { TEMPLATE_LIMITS } from '../../../types/template';
import { CatalogBindingEditor } from './CatalogBindingEditor';

const editor = uiMessages.sheet.templates.editor;
const fieldTypes = uiMessages.sheet.templates.fieldTypes;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

const FIELD_TYPE_OPTIONS: ReadonlyArray<{ value: TemplateField['type']; label: string }> = [
    { value: 'text', label: fieldTypes.text.message },
    { value: 'number', label: fieldTypes.number.message },
    { value: 'toggle', label: fieldTypes.toggle.message },
    { value: 'select', label: fieldTypes.select.message },
    { value: 'rating', label: fieldTypes.rating.message },
    { value: 'resource', label: fieldTypes.resource.message },
    { value: 'reference', label: fieldTypes.reference.message },
];

export interface FieldEditorCallbacks {
    onUpdate: (updates: Partial<TemplateField>) => void;
    onChangeType: (type: TemplateField['type']) => void;
    onMove: (offset: -1 | 1) => void;
    onRemove: () => void;
    onAddOption: () => void;
    onUpdateOption: (optionId: string, label: string) => void;
    onRemoveOption: (optionId: string) => void;
    onAttachCatalog: (catalogId: string) => void;
    onDetachCatalog: () => void;
    onUpdateFill: (
        detailKey: string,
        rule: { targetFieldId: string; disabled?: boolean } | undefined
    ) => void;
}

export function FieldEditor({
    callbacks,
    draft,
    field,
    selfId,
}: {
    callbacks: FieldEditorCallbacks;
    draft: CustomTemplate;
    field: TemplateField;
    selfId: string;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);

    return (
        <div className="rounded border border-border bg-bgBase p-3" data-field-id={field.id}>
            <div className="flex items-center gap-2">
                <input
                    value={field.label}
                    onChange={(event) => callbacks.onUpdate({ label: event.target.value })}
                    placeholder={t(editor.fieldLabel)}
                    aria-label={t(editor.fieldLabel)}
                    className={`${inputClasses} flex-1`}
                />
                <select
                    value={field.type}
                    onChange={(event) =>
                        callbacks.onChangeType(event.target.value as TemplateField['type'])
                    }
                    aria-label={t(editor.fieldType)}
                    className={inputClasses}
                >
                    {FIELD_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => callbacks.onMove(-1)}
                    aria-label={t(editor.moveUp)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary"
                >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => callbacks.onMove(1)}
                    aria-label={t(editor.moveDown)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary"
                >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={callbacks.onRemove}
                    aria-label={t(editor.remove)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-error"
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            <input
                value={field.description ?? ''}
                onChange={(event) =>
                    callbacks.onUpdate(
                        event.target.value.length > 0
                            ? { description: event.target.value }
                            : { description: undefined }
                    )
                }
                placeholder={t(editor.fieldDescription)}
                aria-label={t(editor.fieldDescription)}
                className={`${inputClasses} mt-2 w-full`}
            />

            <input
                value={field.valueKey ?? ''}
                onChange={(event) =>
                    callbacks.onUpdate(
                        event.target.value.length > 0
                            ? { valueKey: event.target.value as TemplateField['valueKey'] }
                            : { valueKey: undefined }
                    )
                }
                placeholder={t(editor.valueKeyLabel)}
                aria-label={t(editor.valueKeyLabel)}
                className={`${inputClasses} mt-2 w-full`}
            />

            <label className="mt-2 flex items-center gap-2 text-xs text-textSecondary">
                <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) => callbacks.onUpdate({ required: event.target.checked })}
                    className="h-3.5 w-3.5"
                />
                {t(editor.fieldRequired)}
            </label>

            {field.type === 'text' && (
                <label className="mt-2 flex items-center gap-2 text-xs text-textSecondary">
                    <input
                        type="checkbox"
                        checked={field.multiline}
                        onChange={(event) =>
                            callbacks.onUpdate({ multiline: event.target.checked })
                        }
                        className="h-3.5 w-3.5"
                    />
                    {t(editor.multiline)}
                </label>
            )}

            {field.type === 'number' && (
                <div className="mt-2 flex items-center gap-2 text-xs text-textSecondary">
                    <input
                        type="number"
                        value={field.min ?? ''}
                        onChange={(event) =>
                            callbacks.onUpdate(
                                event.target.value === ''
                                    ? { min: undefined }
                                    : { min: Number(event.target.value) }
                            )
                        }
                        placeholder={t(editor.numberMin)}
                        aria-label={t(editor.numberMin)}
                        className={`${inputClasses} w-20`}
                    />
                    <input
                        type="number"
                        value={field.max ?? ''}
                        onChange={(event) =>
                            callbacks.onUpdate(
                                event.target.value === ''
                                    ? { max: undefined }
                                    : { max: Number(event.target.value) }
                            )
                        }
                        placeholder={t(editor.numberMax)}
                        aria-label={t(editor.numberMax)}
                        className={`${inputClasses} w-20`}
                    />
                    <input
                        type="number"
                        value={field.step ?? ''}
                        onChange={(event) =>
                            callbacks.onUpdate(
                                event.target.value === ''
                                    ? { step: undefined }
                                    : { step: Number(event.target.value) }
                            )
                        }
                        placeholder={t(editor.numberStep)}
                        aria-label={t(editor.numberStep)}
                        className={`${inputClasses} w-20`}
                    />
                </div>
            )}

            {field.type === 'select' && (
                <div className="mt-2">
                    <label className="flex items-center gap-2 text-xs text-textSecondary">
                        <input
                            type="checkbox"
                            checked={field.multiple}
                            disabled={field.binding !== undefined}
                            onChange={(event) =>
                                callbacks.onUpdate({ multiple: event.target.checked })
                            }
                            className="h-3.5 w-3.5"
                        />
                        {t(editor.multiple)}
                    </label>
                    <div className="mt-2 space-y-1">
                        {field.options.map((option) => (
                            <div key={option.id} className="flex items-center gap-2">
                                <input
                                    value={option.label}
                                    onChange={(event) =>
                                        callbacks.onUpdateOption(option.id, event.target.value)
                                    }
                                    aria-label={t(editor.optionLabel)}
                                    className={`${inputClasses} flex-1`}
                                />
                                <button
                                    type="button"
                                    onClick={() => callbacks.onRemoveOption(option.id)}
                                    disabled={field.options.length <= 1}
                                    aria-label={t(editor.remove)}
                                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-error disabled:opacity-40"
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
                        className="mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface disabled:opacity-40"
                    >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t(editor.addOption)}
                    </button>
                    <CatalogBindingEditor
                        callbacks={{
                            onAttach: callbacks.onAttachCatalog,
                            onDetach: callbacks.onDetachCatalog,
                            onUpdateFill: callbacks.onUpdateFill,
                        }}
                        draft={draft}
                        field={field}
                        selfId={selfId}
                    />
                </div>
            )}

            {field.type === 'rating' && (
                <div className="mt-2 flex items-center gap-2 text-xs text-textSecondary">
                    <input
                        type="number"
                        value={field.max}
                        min={1}
                        max={100}
                        onChange={(event) =>
                            callbacks.onUpdate({ max: Number(event.target.value) })
                        }
                        aria-label={t(editor.numberMax)}
                        className={`${inputClasses} w-20`}
                    />
                    <select
                        value={field.presentation}
                        onChange={(event) =>
                            callbacks.onUpdate({
                                presentation: event.target.value as 'dots' | 'boxes' | 'number',
                            })
                        }
                        aria-label={t(editor.presentation)}
                        className={inputClasses}
                    >
                        <option value="dots">{t(editor.ratingDots)}</option>
                        <option value="boxes">{t(editor.ratingBoxes)}</option>
                        <option value="number">{t(editor.ratingNumber)}</option>
                    </select>
                </div>
            )}

            {field.type === 'resource' && (
                <div className="mt-2 flex items-center gap-2 text-xs text-textSecondary">
                    <input
                        type="number"
                        value={field.min}
                        min={0}
                        onChange={(event) =>
                            callbacks.onUpdate({ min: Number(event.target.value) })
                        }
                        aria-label={t(editor.numberMin)}
                        className={`${inputClasses} w-20`}
                    />
                    <input
                        type="number"
                        value={field.max}
                        min={1}
                        max={1_000_000}
                        onChange={(event) =>
                            callbacks.onUpdate({ max: Number(event.target.value) })
                        }
                        aria-label={t(editor.numberMax)}
                        className={`${inputClasses} w-20`}
                    />
                </div>
            )}

            {field.type === 'reference' && (
                <label className="mt-2 flex items-center gap-2 text-xs text-textSecondary">
                    <input
                        type="checkbox"
                        checked={field.multiple}
                        onChange={(event) => callbacks.onUpdate({ multiple: event.target.checked })}
                        className="h-3.5 w-3.5"
                    />
                    {t(editor.multiple)}
                </label>
            )}
        </div>
    );
}
