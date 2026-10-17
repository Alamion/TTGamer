import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus, X } from 'lucide-react';

import {
    BUTTON_ICONS,
    type ButtonChange,
    type ButtonNode,
    type RowButton,
    TEMPLATE_LIMITS,
} from '../../../types/template';
import { generateDraftId } from '../model/ids';
import { useEditorModel } from '../session/EditorModel';
import type { NodeEdits } from '../session/useNodeEdits';
import { FormulaField } from '../settings/FormulaField';
import type { GroupedSettings } from '../settings/groupedSettings';
import { inputClasses } from '../settings/inputClasses';
import { SettingField } from '../settings/SettingField';
import { ToggleRow } from './LayoutControls';

const editor = uiMessages.sheet.templates.editor;
const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

type ButtonUpdate = Partial<Omit<RowButton, 'id'>>;

const OUTCOMES = ['onSuccess', 'onFailure', 'always'] as const;
type Outcome = (typeof OUTCOMES)[number];

const OUTCOME_LABELS: Record<Outcome, { id: string; message: string }> = {
    onSuccess: editor.buttonOnSuccess,
    onFailure: editor.buttonOnFailure,
    always: editor.buttonAlways,
};

/** The changes of one outcome: value, add or set, amount (a formula). */
function ChangeList({
    changes,
    onChange,
    outcome,
    prefix,
}: {
    changes: readonly ButtonChange[];
    onChange: (next: ButtonChange[]) => void;
    outcome: Outcome;
    prefix: string;
}) {
    const { coordinateListId } = useEditorModel();
    const label = t(OUTCOME_LABELS[outcome]);
    const replace = (index: number, change: Partial<ButtonChange>) =>
        onChange(changes.map((old, at) => (at === index ? { ...old, ...change } : old)));
    return (
        <fieldset className="grid gap-2" data-setting={`${prefix}${outcome}`}>
            <legend className="text-xs font-semibold text-textPrimary">{label}</legend>
            {changes.map((change, index) => (
                <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-end gap-1"
                >
                    <SettingField label={t(editor.buttonChangeTarget)}>
                        {(control) => (
                            <input
                                {...control}
                                value={change.target}
                                list={coordinateListId}
                                spellCheck={false}
                                onChange={(event) => replace(index, { target: event.target.value })}
                                className={`${inputClasses} w-full font-mono`}
                            />
                        )}
                    </SettingField>
                    <SettingField label={t(editor.buttonChangeOp)}>
                        {(control) => (
                            <select
                                {...control}
                                value={change.op}
                                onChange={(event) =>
                                    replace(index, { op: event.target.value as ButtonChange['op'] })
                                }
                                className={inputClasses}
                            >
                                <option value="add">{t(editor.buttonOpAdd)}</option>
                                <option value="set">{t(editor.buttonOpSet)}</option>
                            </select>
                        )}
                    </SettingField>
                    <SettingField label={t(editor.buttonChangeAmount)}>
                        {(control) => (
                            <input
                                {...control}
                                value={change.amount}
                                spellCheck={false}
                                onChange={(event) => replace(index, { amount: event.target.value })}
                                className={`${inputClasses} w-full font-mono`}
                            />
                        )}
                    </SettingField>
                    <button
                        type="button"
                        onClick={() => onChange(changes.filter((_, at) => at !== index))}
                        aria-label={t(editor.buttonRemoveChange, {
                            outcome: label,
                            index: index + 1,
                        })}
                        className="mb-1 rounded-sm p-1 text-textSecondary hover:text-error"
                    >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                </div>
            ))}
            {changes.length < TEMPLATE_LIMITS.buttonChangesMax && (
                <button
                    type="button"
                    onClick={() => onChange([...changes, { target: '', op: 'add', amount: '1' }])}
                    className="flex items-center gap-1 justify-self-start text-xs text-primary"
                >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(editor.buttonAddChange, { outcome: label })}
                </button>
            )}
        </fieldset>
    );
}

/** Label, icon, availability, roll, and changes of a page or row button. */
function buttonGroups(
    button: RowButton,
    update: (next: ButtonUpdate) => void,
    prefix = ''
): GroupedSettings {
    const roll = button.roll;
    const setRoll = (next: Partial<NonNullable<RowButton['roll']>>) =>
        update({ roll: { ...roll!, ...next } });
    return {
        content: (
            <>
                <SettingField label={t(editor.label)} setting={`${prefix}label`}>
                    {(control) => (
                        <input
                            {...control}
                            value={button.label}
                            onChange={(event) =>
                                update({ label: event.target.value, labelMessage: undefined })
                            }
                            className={`${inputClasses} w-full font-medium`}
                        />
                    )}
                </SettingField>
                <SettingField label={t(editor.buttonIcon)} setting={`${prefix}icon`}>
                    {(control) => (
                        <select
                            {...control}
                            value={button.icon ?? 'dice'}
                            onChange={(event) =>
                                update({ icon: event.target.value as RowButton['icon'] })
                            }
                            className={inputClasses}
                        >
                            {BUTTON_ICONS.map((icon) => (
                                <option key={icon} value={icon}>
                                    {t(editor.buttonIcons[icon])}
                                </option>
                            ))}
                        </select>
                    )}
                </SettingField>
            </>
        ),
        value: (
            <>
                <ToggleRow
                    checked={roll !== undefined}
                    label={t(editor.buttonRoll)}
                    setting={`${prefix}roll`}
                    onChange={(checked) =>
                        update({
                            roll: checked
                                ? { notation: '1d10>=6', successAt: 1, gameDice: false }
                                : undefined,
                        })
                    }
                />
                {roll && (
                    <div className="grid gap-2 pl-5">
                        <SettingField
                            label={t(editor.buttonNotation)}
                            hint={t(editor.buttonNotationHint)}
                            help="buttons"
                            setting={`${prefix}notation`}
                        >
                            {(control) => (
                                <input
                                    {...control}
                                    value={roll.notation}
                                    spellCheck={false}
                                    onChange={(event) => setRoll({ notation: event.target.value })}
                                    className={`${inputClasses} w-full font-mono`}
                                />
                            )}
                        </SettingField>
                        <FormulaField
                            help="buttons"
                            label={t(editor.buttonCount)}
                            setting={`${prefix}count`}
                            value={roll.count}
                            placeholder="1"
                            onChange={(count) => setRoll({ count })}
                        />
                        <FormulaField
                            help="buttons"
                            label={t(editor.buttonReroll)}
                            setting={`${prefix}rerollWhen`}
                            value={roll.rerollWhen}
                            onChange={(rerollWhen) => setRoll({ rerollWhen })}
                        />
                        <SettingField
                            label={t(editor.buttonSuccessAt)}
                            setting={`${prefix}successAt`}
                        >
                            {(control) => (
                                <input
                                    {...control}
                                    type="number"
                                    min={1}
                                    value={roll.successAt}
                                    onChange={(event) =>
                                        setRoll({
                                            successAt: Math.max(1, Number(event.target.value) || 1),
                                        })
                                    }
                                    className={`${inputClasses} w-20`}
                                />
                            )}
                        </SettingField>
                        <ToggleRow
                            checked={roll.gameDice}
                            label={t(editor.buttonGameDice)}
                            setting={`${prefix}gameDice`}
                            onChange={(gameDice) => setRoll({ gameDice })}
                        />
                    </div>
                )}
                {OUTCOMES.filter((outcome) => roll || outcome !== 'onFailure').map((outcome) => (
                    <ChangeList
                        key={outcome}
                        changes={button[outcome]}
                        outcome={outcome}
                        prefix={prefix}
                        onChange={(next) => update({ [outcome]: next })}
                    />
                ))}
                <SettingField label={t(editor.buttonSuccessText)} setting={`${prefix}successText`}>
                    {(control) => (
                        <input
                            {...control}
                            value={button.successText ?? ''}
                            onChange={(event) =>
                                update({
                                    successText: event.target.value || undefined,
                                    successMessage: undefined,
                                })
                            }
                            className={`${inputClasses} w-full`}
                        />
                    )}
                </SettingField>
                {roll && (
                    <SettingField
                        label={t(editor.buttonFailureText)}
                        setting={`${prefix}failureText`}
                    >
                        {(control) => (
                            <input
                                {...control}
                                value={button.failureText ?? ''}
                                onChange={(event) =>
                                    update({
                                        failureText: event.target.value || undefined,
                                        failureMessage: undefined,
                                    })
                                }
                                className={`${inputClasses} w-full`}
                            />
                        )}
                    </SettingField>
                )}
            </>
        ),
        visibility: (
            <FormulaField
                help="buttons"
                label={t(editor.buttonAvailableWhen)}
                setting={`${prefix}availableWhen`}
                value={button.availableWhen}
                onChange={(availableWhen) => update({ availableWhen })}
            />
        ),
    };
}

export function buttonSettings(node: ButtonNode, edits: NodeEdits): GroupedSettings {
    return buttonGroups(node, (updates) => edits.onUpdate(node.id, updates));
}

/** A new row button: a Rouse-like roll with no changes yet. */
export function newRowButton(label: string): RowButton {
    return {
        id: generateDraftId('btn'),
        label,
        onSuccess: [],
        onFailure: [],
        always: [],
    };
}

/** Buttons on every row of a table or built-in rows: add, remove, and edit each one. */
export function RowButtonsSetting({
    buttons,
    onChange,
}: {
    buttons: readonly RowButton[];
    onChange: (next: RowButton[] | undefined) => void;
}) {
    const replace = (index: number, updates: ButtonUpdate) =>
        onChange(buttons.map((button, at) => (at === index ? { ...button, ...updates } : button)));
    return (
        <fieldset className="grid gap-2" data-setting="rowButtons">
            <legend className="text-xs font-semibold text-textPrimary">
                {t(editor.rowButtons)}
            </legend>
            <p className="text-xs text-textSecondary">{t(editor.rowButtonsHint)}</p>
            {buttons.map((button, index) => {
                const groups = buttonGroups(
                    button,
                    (updates) => replace(index, updates),
                    `rowButton:${button.id}.`
                );
                return (
                    <details key={button.id} className="rounded-sm border border-border p-2">
                        <summary className="cursor-pointer text-xs font-medium text-textPrimary">
                            {button.label}
                        </summary>
                        <div className="mt-2 grid gap-2">
                            {groups.content}
                            {groups.value}
                            {groups.visibility}
                            <button
                                type="button"
                                onClick={() => {
                                    const next = buttons.filter((_, at) => at !== index);
                                    onChange(next.length > 0 ? next : undefined);
                                }}
                                className="justify-self-start text-xs text-error"
                            >
                                {t(editor.rowButtonsRemove, { label: button.label })}
                            </button>
                        </div>
                    </details>
                );
            })}
            {buttons.length < TEMPLATE_LIMITS.rowButtonsMax && (
                <button
                    type="button"
                    onClick={() => onChange([...buttons, newRowButton(t(editor.rowButtonNew))])}
                    className="flex items-center gap-1 justify-self-start text-xs text-primary"
                >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(editor.rowButtonsAdd)}
                </button>
            )}
        </fieldset>
    );
}
