import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { clsx } from 'clsx';
import { Plus, Trash2 } from 'lucide-react';

import { kindLabel, listTemplateTargets } from '../../../features/sheet/data/documentLabels';
import type {
    FieldLabelPosition,
    RatingFlag,
    TemplateField,
    TemplateNode,
} from '../../../types/template';
import {
    fieldLabelPosition,
    hasLabelPositionChoice,
    LIST_ITEM_TYPES,
    RATING_FLAGS,
    TEMPLATE_FIELD_TYPES,
    TEMPLATE_LIMITS,
} from '../../../types/template';
import { CatalogBindingEditor } from './CatalogBindingEditor';
import { EditorHelp } from './EditorHelp';
import { useEditorModel } from './EditorModel';
import { ToggleRow } from './LayoutControls';
import { ValueSourceSelect } from './SourceControls';
import { currentValueSource, CUSTOM_SOURCE } from './sourceNodes';
import { TermHintControl } from './TermHintControl';

const editor = uiMessages.sheet.templates.editor;
const fieldTypes = uiMessages.sheet.templates.fieldTypes;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

const optionalText = (value: string) => (value.length > 0 ? value : undefined);

/**
 * Config-only field editor: the panel header (move/collapse/remove affordances) belongs to
 * the owning ElementEditor — this component renders just the field's settings, so its
 * appearance is identical wherever the field lives (page root, group, section, table).
 */
export interface FieldEditorCallbacks {
    onUpdate: (updates: Partial<TemplateField>) => void;
    onChangeType: (type: TemplateField['type']) => void;
    onAddOption: () => void;
    onUpdateOption: (optionId: string, label: string) => void;
    onRemoveOption: (optionId: string) => void;
    onAttachCatalog: (catalogId: string) => void;
    onDetachCatalog: () => void;
    onUpdateFill: (
        detailKey: string,
        rule: { targetFieldId: string; disabled?: boolean } | undefined
    ) => void;
    onReplace: (next: TemplateNode) => void;
}

export function FieldEditor({
    callbacks,
    field,
    itemOfList = false,
}: {
    callbacks: FieldEditorCallbacks;
    field: TemplateField;
    /**
     * A custom list's entry template (spec 016): settings that cannot apply to repeated copies
     * (storage, required) are hidden, and a formula is not offered.
     */
    itemOfList?: boolean;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const { bindings, coordinateListId: coordinateDatalist } = useEditorModel();
    const sourceKey = currentValueSource(field, bindings);
    const isCustom = itemOfList || sourceKey === CUSTOM_SOURCE;
    const types = itemOfList ? LIST_ITEM_TYPES : TEMPLATE_FIELD_TYPES;
    // Trait values render with the sheet's own trait row: rating bounds and maxFrom do not apply.
    const isTraitSource = bindings.some(
        (binding) => binding.key === sourceKey && binding.kind === 'trait'
    );

    return (
        <div
            className="space-y-2 rounded border border-border bg-bgSurface p-3"
            data-field-id={field.id}
        >
            <div className="flex flex-wrap items-center gap-2">
                <input
                    value={field.label}
                    onChange={(event) => callbacks.onUpdate({ label: event.target.value })}
                    placeholder={t(editor.fieldLabel)}
                    aria-label={t(editor.fieldLabel)}
                    className={`${inputClasses} min-w-0 flex-[2_1_8rem]`}
                />
                <select
                    value={field.type}
                    disabled={!isCustom}
                    title={isCustom ? undefined : t(editor.sourceTypeLocked)}
                    onChange={(event) =>
                        callbacks.onChangeType(event.target.value as TemplateField['type'])
                    }
                    aria-label={t(editor.fieldType)}
                    className={`${inputClasses} min-w-0 flex-[1_1_7rem] disabled:opacity-60`}
                >
                    {types.map((type) => (
                        <option key={type} value={type}>
                            {t(fieldTypes[type])}
                        </option>
                    ))}
                </select>
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
                className={`${inputClasses} w-full`}
            />

            {!itemOfList && (
                <ValueSourceSelect
                    node={field}
                    onReplace={(_, next) => callbacks.onReplace(next)}
                />
            )}
            {!isCustom && (
                <p className="text-[11px] text-textSecondary">{t(editor.sourceTypeLocked)}</p>
            )}

            {isCustom && !itemOfList && (
                <div className="flex items-center gap-2">
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
                        className={`${inputClasses} min-w-0 flex-1`}
                    />
                    <EditorHelp topic="sharedValueKey" about={t(editor.valueKeyLabel)} />
                </div>
            )}

            {!itemOfList && (
                <label className="flex items-center gap-2 text-xs text-textSecondary">
                    <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) => callbacks.onUpdate({ required: event.target.checked })}
                        className="h-3.5 w-3.5"
                    />
                    {t(editor.fieldRequired)}
                </label>
            )}

            <ToggleRow
                checked={!field.hideLabel}
                label={t(editor.showLabel)}
                onChange={(checked) =>
                    callbacks.onUpdate({ hideLabel: checked ? undefined : true })
                }
            />
            {hasLabelPositionChoice(field.type) && (
                <label className="flex items-center gap-2 text-xs text-textSecondary">
                    {t(editor.labelPosition)}
                    <select
                        value={fieldLabelPosition(field)}
                        disabled={field.hideLabel === true}
                        onChange={(event) => {
                            const position = event.target.value as FieldLabelPosition;
                            // The type's own default is not stored, so it can change with the type.
                            const fallback = fieldLabelPosition({ type: field.type });
                            callbacks.onUpdate({
                                labelPosition: position === fallback ? undefined : position,
                            });
                        }}
                        className={`${inputClasses} py-1 disabled:opacity-50`}
                    >
                        <option value="top">{t(editor.labelTop)}</option>
                        <option value="left">{t(editor.labelLeft)}</option>
                    </select>
                </label>
            )}
            <TermHintControl
                node={field}
                onChange={(termHint) => callbacks.onUpdate({ termHint })}
            />

            {field.type === 'text' && (
                <input
                    value={field.placeholder ?? ''}
                    onChange={(event) =>
                        callbacks.onUpdate({
                            placeholder: optionalText(event.target.value),
                            placeholderMessage: undefined,
                        })
                    }
                    placeholder={t(editor.placeholderText)}
                    aria-label={t(editor.placeholderText)}
                    className={`${inputClasses} w-full`}
                />
            )}

            {field.type === 'formula' && (
                <label className="grid gap-1 text-xs text-textSecondary">
                    <span className="flex items-center gap-1">
                        {t(editor.formula)}
                        <EditorHelp topic="formulas" about={t(editor.formula)} />
                    </span>
                    <input
                        value={field.formula}
                        onChange={(event) => callbacks.onUpdate({ formula: event.target.value })}
                        placeholder={t(editor.formulaPlaceholder)}
                        aria-label={t(editor.formula)}
                        list={coordinateDatalist}
                        className={`${inputClasses} w-full font-mono`}
                    />
                </label>
            )}

            {field.type === 'formula' && (
                <div className="flex items-center gap-2">
                    <input
                        value={field.prefix ?? ''}
                        maxLength={8}
                        onChange={(event) =>
                            callbacks.onUpdate({ prefix: optionalText(event.target.value) })
                        }
                        placeholder={t(editor.formulaPrefix)}
                        aria-label={t(editor.formulaPrefix)}
                        className={`${inputClasses} min-w-0 flex-1`}
                    />
                    <input
                        value={field.suffix ?? ''}
                        maxLength={8}
                        onChange={(event) =>
                            callbacks.onUpdate({ suffix: optionalText(event.target.value) })
                        }
                        placeholder={t(editor.formulaSuffix)}
                        aria-label={t(editor.formulaSuffix)}
                        className={`${inputClasses} min-w-0 flex-1`}
                    />
                </div>
            )}

            {!isTraitSource && (field.type === 'number' || field.type === 'rating') && (
                <label className="grid gap-1 text-xs text-textSecondary">
                    <span className="flex items-center gap-1">
                        {t(editor.maxFrom)}
                        <EditorHelp topic="limitsFromValues" about={t(editor.maxFrom)} />
                    </span>
                    <input
                        value={field.maxFrom ?? ''}
                        onChange={(event) =>
                            callbacks.onUpdate({
                                maxFrom:
                                    event.target.value.length > 0 ? event.target.value : undefined,
                            })
                        }
                        placeholder={t(editor.maxFromPlaceholder)}
                        aria-label={t(editor.maxFrom)}
                        list={coordinateDatalist}
                        className={`${inputClasses} w-full font-mono`}
                    />
                </label>
            )}

            {field.type === 'text' && (
                <label className="flex items-center gap-2 text-xs text-textSecondary">
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
                <div className="flex items-center gap-2 text-xs text-textSecondary">
                    <NumberInput
                        value={field.min}
                        max={field.max}
                        onChange={(min) => callbacks.onUpdate({ min })}
                        placeholder={t(editor.numberMin)}
                        label={t(editor.numberMin)}
                        className={`${inputClasses} w-20`}
                    />
                    <NumberInput
                        value={field.max}
                        min={field.min}
                        onChange={(max) => callbacks.onUpdate({ max })}
                        placeholder={t(editor.numberMax)}
                        label={t(editor.numberMax)}
                        className={`${inputClasses} w-20`}
                    />
                    <NumberInput
                        value={field.step}
                        min={0}
                        onChange={(step) =>
                            callbacks.onUpdate({ step: step === 0 ? undefined : step })
                        }
                        placeholder={t(editor.numberStep)}
                        label={t(editor.numberStep)}
                        className={`${inputClasses} w-20`}
                    />
                </div>
            )}

            {field.type === 'select' && (
                <div>
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
                    {field.multiple && (
                        <label className="mt-1 flex items-center gap-2 text-xs text-textSecondary">
                            <input
                                type="checkbox"
                                checked={field.hideUnselected === true}
                                onChange={(event) =>
                                    callbacks.onUpdate({
                                        hideUnselected: event.target.checked || undefined,
                                    })
                                }
                                className="h-3.5 w-3.5"
                            />
                            {t(editor.hideUnselected)}
                        </label>
                    )}
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
                        field={field}
                        selfId={field.id}
                    />
                </div>
            )}

            {!isTraitSource && field.type === 'rating' && (
                <div className="flex items-center gap-2 text-xs text-textSecondary">
                    <NumberInput
                        value={field.min}
                        min={0}
                        max={field.max}
                        step={1}
                        optional={false}
                        onChange={(min) => callbacks.onUpdate({ min: min ?? 0 })}
                        placeholder={t(editor.numberMin)}
                        label={t(editor.numberMin)}
                        className={`${inputClasses} w-20`}
                    />
                    <NumberInput
                        value={field.max}
                        min={Math.max(1, field.min)}
                        max={TEMPLATE_LIMITS.ratingMax}
                        step={1}
                        optional={false}
                        onChange={(max) => callbacks.onUpdate({ max: max ?? field.max })}
                        placeholder={t(editor.numberMax)}
                        label={t(editor.numberMax)}
                        className={`${inputClasses} w-20`}
                    />
                    <select
                        value={field.presentation}
                        onChange={(event) =>
                            callbacks.onUpdate({
                                presentation: event.target.value as 'dots' | 'number',
                            })
                        }
                        aria-label={t(editor.presentation)}
                        className={inputClasses}
                    >
                        <option value="dots">{t(editor.ratingDots)}</option>
                        <option value="number">{t(editor.ratingNumber)}</option>
                    </select>
                    <EditorHelp topic="rating" about={t(editor.presentation)} />
                </div>
            )}

            {!isTraitSource && field.type === 'rating' && (
                <RatingSwitches field={field} onUpdate={callbacks.onUpdate} />
            )}

            {field.type === 'resource' && (
                <div className="flex items-center gap-2 text-xs text-textSecondary">
                    <NumberInput
                        value={field.min}
                        min={0}
                        max={field.max}
                        step={1}
                        optional={false}
                        onChange={(min) => callbacks.onUpdate({ min: min ?? 0 })}
                        placeholder={t(editor.numberMin)}
                        label={t(editor.numberMin)}
                        className={`${inputClasses} w-20`}
                    />
                    <NumberInput
                        value={field.max}
                        min={Math.max(1, field.min)}
                        max={TEMPLATE_LIMITS.resourceMax}
                        step={1}
                        optional={false}
                        onChange={(max) => callbacks.onUpdate({ max: max ?? field.max })}
                        placeholder={t(editor.numberMax)}
                        label={t(editor.numberMax)}
                        className={`${inputClasses} w-20`}
                    />
                </div>
            )}

            {field.type === 'reference' && (
                <>
                    <ReferenceKindsControl
                        value={field.targetKinds}
                        onChange={(targetKinds) =>
                            callbacks.onUpdate({
                                targetKinds: targetKinds as typeof field.targetKinds,
                            })
                        }
                    />
                    <label className="flex items-center gap-2 text-xs text-textSecondary">
                        <input
                            type="checkbox"
                            checked={field.multiple}
                            onChange={(event) =>
                                callbacks.onUpdate({ multiple: event.target.checked })
                            }
                            className="h-3.5 w-3.5"
                        />
                        {t(editor.multiple)}
                    </label>
                </>
            )}
        </div>
    );
}

/** The document kinds a reference may point to: shipped kinds and user types (at least one). */
function ReferenceKindsControl({
    onChange,
    value,
}: {
    onChange: (kinds: string[]) => void;
    value: readonly string[];
}) {
    // Kinds are shared across systems (a reference lists documents of any system).
    const seen = new Set<string>();
    const kinds: Array<{ kind: string; label: string }> = [];
    for (const { kind, systemId } of listTemplateTargets()) {
        if (seen.has(kind)) continue;
        seen.add(kind);
        kinds.push({ kind, label: kindLabel(systemId, kind) });
    }
    for (const kind of value) {
        if (!seen.has(kind)) kinds.push({ kind, label: kind });
    }
    return (
        <fieldset className="grid gap-1">
            <legend className="text-xs text-textSecondary">
                {translate(uiMessages.sheet.templates.editor.referenceKinds)}
            </legend>
            {kinds.map(({ kind, label }) => (
                <label key={kind} className="flex items-center gap-2 text-xs text-textPrimary">
                    <input
                        type="checkbox"
                        checked={value.includes(kind)}
                        disabled={value.length === 1 && value.includes(kind)}
                        onChange={(event) =>
                            onChange(
                                event.target.checked
                                    ? [...value, kind]
                                    : value.filter((candidate) => candidate !== kind)
                            )
                        }
                        className="h-3.5 w-3.5"
                    />
                    {label}
                </label>
            ))}
        </fieldset>
    );
}

const flagMessages = uiMessages.sheet.controls.statDot;

const RATING_FLAG_UI = {
    specialization: { letter: 'S', title: flagMessages.specialization },
    practiced: { letter: 'P', title: flagMessages.practiced },
    experienced: { letter: 'E', title: flagMessages.experienced },
} as const;

/** Trait-row switches of a rating (spec 014): text, numbers, die, and S/P/E on the dot style. */
function RatingSwitches({
    field,
    onUpdate,
}: {
    field: Extract<TemplateField, { type: 'rating' }>;
    onUpdate: FieldEditorCallbacks['onUpdate'];
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const switches = [
        ['textInput', editor.ratingTextInput],
        ['showNumbers', editor.ratingShowNumbers],
        ['dice', editor.ratingDice],
    ] as const;
    const flags = field.flags ?? [];
    const toggleFlag = (flag: RatingFlag) => {
        const next = RATING_FLAGS.filter((candidate) =>
            candidate === flag ? !flags.includes(flag) : flags.includes(candidate)
        );
        onUpdate({ flags: next.length > 0 ? next : undefined });
    };
    return (
        <div className="space-y-1 text-xs text-textSecondary">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {switches.map(([key, label]) => (
                    <ToggleRow
                        key={key}
                        checked={field[key] === true}
                        label={t(label)}
                        onChange={(checked) => onUpdate({ [key]: checked || undefined })}
                    />
                ))}
                <EditorHelp topic="rating" about={t(editor.ratingDice)} />
            </div>
            {field.presentation === 'dots' && (
                <div className="flex flex-wrap items-center gap-2">
                    <span>{t(editor.ratingFlags)}</span>
                    {RATING_FLAGS.map((flag) => (
                        <button
                            key={flag}
                            type="button"
                            aria-pressed={flags.includes(flag)}
                            title={t(RATING_FLAG_UI[flag].title)}
                            aria-label={t(RATING_FLAG_UI[flag].title)}
                            onClick={() => toggleFlag(flag)}
                            className={clsx(
                                'h-6 w-6 rounded border text-xs font-bold transition-colors',
                                flags.includes(flag)
                                    ? 'border-primary bg-primary-muted text-textPrimary'
                                    : 'border-border text-textSecondary hover:border-primary/60'
                            )}
                        >
                            {RATING_FLAG_UI[flag].letter}
                        </button>
                    ))}
                    <span className="basis-full text-[11px]">{t(editor.ratingFlagsHint)}</span>
                </div>
            )}
        </div>
    );
}
