import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { clsx } from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { Fragment, useMemo } from 'react';

import { systemRegistry } from '../../../systems';
import type { DocumentBindingDescriptor } from '../../../systems/templateBindings';
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
import { referenceKindName, referenceTargetsOf } from '../../sheet/data/referenceScope';
import { EditorHelp } from '../components/EditorHelp';
import { currentValueSource, CUSTOM_SOURCE } from '../elements/sources';
import { useEditorModel } from '../session/EditorModel';
import { FormulaField } from '../settings/FormulaField';
import { type GroupedSettings, mergeGroups } from '../settings/groupedSettings';
import { inputClasses } from '../settings/inputClasses';
import { KeyField } from '../settings/KeyField';
import { settingLabel } from '../settings/registry';
import { SettingField } from '../settings/SettingField';
import { CatalogBindingEditor } from './CatalogBindingEditor';
import { ToggleRow } from './LayoutControls';
import { PoolTrackerSettings } from './PoolTrackerSettings';
import { TrackerSourceSelect, ValueSourceSelect } from './SourceControls';
import { hasTermHint, TermHintControl } from './TermHintControl';
import { TrackerSettings } from './TrackerSettings';

const editor = uiMessages.sheet.templates.editor;
const fieldTypes = uiMessages.sheet.templates.fieldTypes;

const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

const optionalText = (value: string) => (value.length > 0 ? value : undefined);

/** The field-scoped edits a field's settings make (a page field, a table column, a list entry). */
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

export interface FieldSettingsOptions {
    callbacks: FieldEditorCallbacks;
    field: TemplateField;
    bindings: readonly DocumentBindingDescriptor[];
    /** A table column: a tracker cannot be one (spec 018); its label is set in the column row. */
    inTable?: boolean;
    /**
     * A custom list's entry template (spec 016): settings that cannot apply to repeated copies
     * (storage, required) are hidden, and a formula is not offered.
     */
    itemOfList?: boolean;
    /** Prefix of every `data-setting` key: `column:<id>.` or `entry.` (spec 022, R3). */
    prefix?: string;
    /**
     * Several selected fields of one type (spec 023, US3): `field` is the first of them, every
     * change reaches them all, and settings that belong to one field are left out.
     */
    several?: SeveralFields;
}

export interface SeveralFields {
    fields: readonly TemplateField[];
    /** A change worked out for each field, such as one S/P/E flag that keeps the others. */
    onUpdateEach: (update: (field: TemplateField) => Partial<TemplateField>) => void;
}

/**
 * A field's settings per group (spec 022): what it says and holds (Content), where its value is
 * stored (Value), its bounds and formulas, its look, and when and how readers see help.
 */
export function fieldSettings({
    bindings,
    callbacks,
    field,
    inTable = false,
    itemOfList = false,
    prefix = '',
    several,
}: FieldSettingsOptions): GroupedSettings {
    const key = (name: string) => `${prefix}${name}`;
    const fields = several?.fields ?? [field];
    const sourceKeys = fields.map((each) => currentValueSource(each, bindings));
    const isCustom = itemOfList || sourceKeys.every((source) => source === CUSTOM_SOURCE);
    const types = itemOfList
        ? LIST_ITEM_TYPES
        : inTable
          ? TEMPLATE_FIELD_TYPES.filter((type) => type !== 'tracker')
          : TEMPLATE_FIELD_TYPES;
    // Trait values render with the sheet's own trait row: rating bounds and maxFrom do not apply.
    const isTraitSource = bindings.some(
        (binding) => sourceKeys.includes(binding.key) && binding.kind === 'trait'
    );
    const update = callbacks.onUpdate;

    const content = (
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

    const value = (
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

    const bounds =
        field.type === 'number' ? (
            <div className="grid grid-cols-3 gap-2">
                <NumberSetting
                    label={settingLabel('min')}
                    setting={key('min')}
                    value={field.min}
                    max={field.max}
                    onChange={(min) => update({ min })}
                />
                <NumberSetting
                    label={settingLabel('max')}
                    setting={key('max')}
                    value={field.max}
                    min={field.min}
                    onChange={(max) => update({ max })}
                />
                <NumberSetting
                    label={settingLabel('step')}
                    setting={key('step')}
                    value={field.step}
                    min={0}
                    onChange={(step) => update({ step: step === 0 ? undefined : step })}
                />
            </div>
        ) : (field.type === 'rating' && !isTraitSource) || field.type === 'resource' ? (
            <div className="grid grid-cols-2 gap-2">
                <NumberSetting
                    label={settingLabel('min')}
                    setting={key('min')}
                    value={field.min}
                    min={0}
                    max={field.max}
                    step={1}
                    required
                    onChange={(min) => update({ min: min ?? 0 })}
                />
                <NumberSetting
                    label={settingLabel('max')}
                    setting={key('max')}
                    value={field.max}
                    min={Math.max(1, field.min)}
                    max={
                        field.type === 'rating'
                            ? TEMPLATE_LIMITS.ratingMax
                            : field.poolTracker
                              ? TEMPLATE_LIMITS.trackerLevelsMax
                              : TEMPLATE_LIMITS.resourceMax
                    }
                    step={1}
                    required
                    onChange={(max) => update({ max: max ?? field.max })}
                />
            </div>
        ) : null;

    const limits = (
        <>
            {bounds}
            {field.type === 'formula' && (
                <FormulaField
                    label={settingLabel('formula')}
                    help="formulas"
                    setting={key('formula')}
                    placeholder={t(editor.formulaPlaceholder)}
                    value={field.formula}
                    onChange={(formula) => update({ formula: formula ?? '' })}
                />
            )}
            {!isTraitSource && (field.type === 'number' || field.type === 'rating') && (
                <FormulaField
                    label={settingLabel('maxFrom')}
                    setting={key('maxFrom')}
                    placeholder={t(editor.maxFromPlaceholder)}
                    value={field.maxFrom}
                    onChange={(maxFrom) => update({ maxFrom })}
                />
            )}
        </>
    );

    const look = (
        <>
            {!isTraitSource && field.type === 'rating' && (
                <>
                    <SettingField
                        label={settingLabel('presentation')}
                        help="rating"
                        setting={key('presentation')}
                    >
                        {(control) => (
                            <select
                                {...control}
                                value={field.presentation}
                                onChange={(event) =>
                                    update({
                                        presentation: event.target.value as 'dots' | 'number',
                                    })
                                }
                                className={inputClasses}
                            >
                                <option value="dots">{t(editor.ratingDots)}</option>
                                <option value="number">{t(editor.ratingNumber)}</option>
                            </select>
                        )}
                    </SettingField>
                    <RatingSwitches
                        field={field}
                        onUpdate={update}
                        prefix={prefix}
                        several={several}
                    />
                </>
            )}
            {field.type === 'text' && (
                <ToggleRow
                    checked={field.multiline}
                    label={settingLabel('multiline')}
                    setting={key('multiline')}
                    onChange={(checked) => update({ multiline: checked })}
                />
            )}
            {field.type === 'select' && field.multiple && (
                <ToggleRow
                    checked={field.hideUnselected === true}
                    label={settingLabel('hideUnselected')}
                    setting={key('hideUnselected')}
                    onChange={(checked) => update({ hideUnselected: checked || undefined })}
                />
            )}
            {field.type === 'formula' && (
                <div className="grid grid-cols-2 gap-2">
                    <SettingField label={settingLabel('prefix')} setting={key('prefix')}>
                        {(control) => (
                            <input
                                {...control}
                                value={field.prefix ?? ''}
                                maxLength={8}
                                onChange={(event) =>
                                    update({ prefix: optionalText(event.target.value) })
                                }
                                className={`${inputClasses} w-full`}
                            />
                        )}
                    </SettingField>
                    <SettingField label={settingLabel('suffix')} setting={key('suffix')}>
                        {(control) => (
                            <input
                                {...control}
                                value={field.suffix ?? ''}
                                maxLength={8}
                                onChange={(event) =>
                                    update({ suffix: optionalText(event.target.value) })
                                }
                                className={`${inputClasses} w-full`}
                            />
                        )}
                    </SettingField>
                </div>
            )}
            {field.type === 'resource' && (
                <ResourceDisplay
                    field={field}
                    setting={key('tracker')}
                    onChange={(poolTracker) => update({ poolTracker })}
                />
            )}
            {field.type === 'tracker' && (
                <div data-setting-list="" data-setting={key('tracker')} tabIndex={-1}>
                    <TrackerSettings
                        value={field}
                        onChange={(updates) => update(updates as Partial<TemplateField>)}
                    />
                </div>
            )}
        </>
    );

    const visibility = (
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

    return { content, value, limits, look, visibility };
}

/**
 * A table column's or list entry's settings, inside the table's or list's Content group: the
 * groups follow one another without their own headers.
 */
export function FieldEditor(props: Omit<FieldSettingsOptions, 'bindings'>) {
    const { bindings } = useEditorModel();
    return (
        <div
            className="grid gap-3 rounded border border-border bg-bgSurface p-3"
            data-field-id={props.field.id}
        >
            {mergeGroups([fieldSettings({ ...props, bindings })]).map(({ id, nodes }) => (
                <Fragment key={id}>
                    {nodes.map((node, index) => (
                        <Fragment key={index}>{node}</Fragment>
                    ))}
                </Fragment>
            ))}
        </div>
    );
}

/** A number setting with its visible name. */
function NumberSetting({
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

/** A choice's options, one row each (`option:<index>` keys). */
function SelectOptions({
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
                className="flex items-center gap-1 justify-self-start rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t(editor.addOption)}
            </button>
        </div>
    );
}

/**
 * The document kinds a reference may point to (spec 017): the types of the draft's setting, then
 * stored targets the setting does not offer, kept and marked unavailable (at least one checked).
 */
function ReferenceKindsControl({
    onChange,
    setting,
    value,
}: {
    onChange: (kinds: string[]) => void;
    setting: string;
    value: readonly string[];
}) {
    const { systemId, documentKind, settingId } = useEditorModel();
    const targets = useMemo(
        () => referenceTargetsOf(systemRegistry, { systemId, documentKind, settingId }),
        [systemId, documentKind, settingId]
    );
    const offered = new Set(targets.map(({ kind }) => kind));
    const kinds = [
        ...targets,
        ...value
            .filter((kind) => !offered.has(kind))
            .map((kind) => ({
                kind,
                label: translate(editor.referenceKindUnavailable, {
                    type: referenceKindName(systemRegistry, kind),
                }),
            })),
    ];
    return (
        <fieldset className="grid gap-1" data-setting={setting} tabIndex={-1}>
            <legend className="text-xs font-semibold text-textPrimary">
                {t(editor.referenceKinds)}
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
    prefix,
    several,
}: {
    field: Extract<TemplateField, { type: 'rating' }>;
    onUpdate: FieldEditorCallbacks['onUpdate'];
    prefix: string;
    several?: SeveralFields;
}) {
    const switches = [
        ['textInput', editor.ratingTextInput],
        ['showNumbers', editor.ratingShowNumbers],
        ['dice', editor.ratingDice],
    ] as const;
    const fields = several?.fields ?? [field];
    const flagsOf = (each: TemplateField) => (each.type === 'rating' ? (each.flags ?? []) : []);
    /** On for every field, off for every field, or mixed across several. */
    const flagState = (flag: RatingFlag) => {
        const on = fields.filter((each) => flagsOf(each).includes(flag)).length;
        return on === 0 ? false : on === fields.length ? true : ('mixed' as const);
    };
    const withFlag = (each: TemplateField, flag: RatingFlag, on: boolean) => {
        const next = RATING_FLAGS.filter((candidate) =>
            candidate === flag ? on : flagsOf(each).includes(candidate)
        );
        return { flags: next.length > 0 ? next : undefined };
    };
    const toggleFlag = (flag: RatingFlag) => {
        const on = flagState(flag) !== true;
        if (several) several.onUpdateEach((each) => withFlag(each, flag, on));
        else onUpdate(withFlag(field, flag, on));
    };
    return (
        <div className="grid gap-1 text-xs text-textSecondary">
            {switches.map(([name, label]) => (
                <ToggleRow
                    key={name}
                    checked={field[name] === true}
                    label={t(label)}
                    setting={`${prefix}${name}`}
                    onChange={(checked) => onUpdate({ [name]: checked || undefined })}
                />
            ))}
            {field.presentation === 'dots' && (
                <div className="flex flex-wrap items-center gap-2">
                    <span>{t(editor.ratingFlags)}</span>
                    {RATING_FLAGS.map((flag) => {
                        const state = flagState(flag);
                        return (
                            <button
                                key={flag}
                                type="button"
                                aria-pressed={state}
                                title={t(RATING_FLAG_UI[flag].title)}
                                aria-label={t(RATING_FLAG_UI[flag].title)}
                                onClick={() => toggleFlag(flag)}
                                className={clsx(
                                    'h-6 w-6 rounded border text-xs font-bold transition-colors',
                                    state === true
                                        ? 'border-primary bg-primary-muted text-textPrimary'
                                        : state === 'mixed'
                                          ? 'border-dashed border-primary text-textPrimary'
                                          : 'border-border text-textSecondary hover:border-primary/60'
                                )}
                            >
                                {RATING_FLAG_UI[flag].letter}
                            </button>
                        );
                    })}
                    <EditorHelp topic="rating" about={t(editor.ratingDice)} />
                    <span className="basis-full text-[11px]">{t(editor.ratingFlagsHint)}</span>
                </div>
            )}
        </div>
    );
}

/** A resource field's look (spec 020): two numbers, or one tracker of up to 20 boxes. */
function ResourceDisplay({
    field,
    onChange,
    setting,
}: {
    field: Extract<TemplateField, { type: 'resource' }>;
    onChange: (poolTracker: Extract<TemplateField, { type: 'resource' }>['poolTracker']) => void;
    setting: string;
}) {
    const tooMany = field.max > TEMPLATE_LIMITS.trackerLevelsMax;
    const asTracker = field.poolTracker !== undefined;
    return (
        <div className="grid gap-2">
            <div
                role="group"
                aria-label={t(editor.primitiveDisplay)}
                className="flex flex-wrap items-center gap-1 text-xs text-textSecondary"
            >
                <span className="font-semibold text-textPrimary">{t(editor.primitiveDisplay)}</span>
                {([false, true] as const).map((tracker) => (
                    <button
                        key={String(tracker)}
                        type="button"
                        aria-pressed={asTracker === tracker}
                        disabled={tracker && !asTracker && tooMany}
                        onClick={() => {
                            if (asTracker === tracker) return;
                            onChange(
                                tracker ? { display: 'row', legend: false, total: true } : undefined
                            );
                        }}
                        className={clsx(
                            'rounded border px-2.5 py-1 text-xs transition-colors disabled:opacity-50',
                            asTracker === tracker
                                ? 'border-primary bg-primary-muted text-textPrimary'
                                : 'border-border text-textSecondary hover:border-primary/60'
                        )}
                    >
                        {t(tracker ? editor.displayTracker : editor.displayNumbers)}
                    </button>
                ))}
            </div>
            {tooMany && !asTracker && (
                <p className="text-[11px] text-textSecondary">
                    {t(editor.poolTrackerLimit, { max: TEMPLATE_LIMITS.trackerLevelsMax })}
                </p>
            )}
            {field.poolTracker && (
                <div data-setting-list="" data-setting={setting} tabIndex={-1}>
                    <PoolTrackerSettings value={field.poolTracker} onChange={onChange} />
                </div>
            )}
        </div>
    );
}
