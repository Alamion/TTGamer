import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { Plus, Trash2 } from 'lucide-react';

import { fallbackRowName, RowMoveControls } from '../../../components/controls/RowMoveControls';
import type { ListNode, TableNode } from '../../../types/template';
import { listIsNamed, listItemField, TEMPLATE_LIMITS } from '../../../types/template';
import type { NodeUpdates } from '../model/types';
import { ListCatalogPicker } from '../panels/CatalogBindingEditor';
import { FieldEditor } from '../panels/FieldEditor';
import { ToggleRow } from '../panels/LayoutControls';
import { ListSourceSelect } from '../panels/SourceControls';
import { EditorFillTargetsContext } from '../session/EditorModel';
import { type NodeEdits } from '../session/useNodeEdits';
import { fieldEditsFor } from '../session/useNodeEdits';
import { type GroupedSettings } from '../settings/groupedSettings';
import { inputClasses } from '../settings/inputClasses';
import { KeyField } from '../settings/KeyField';
import { settingLabel } from '../settings/registry';
import { SettingField } from '../settings/SettingField';
import { TitleSetting } from './containers';
import { KindChoice } from './KindChoice';
import { tableKindBlocked } from './kinds';

const editor = uiMessages.sheet.templates.editor;
const primitives = uiMessages.sheet.templates.primitives;

const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

export function tableSettings(node: TableNode, callbacks: NodeEdits): GroupedSettings {
    const update = (updates: NodeUpdates) => callbacks.onUpdate(node.id, updates);
    return {
        content: (
            <>
                <KindChoice
                    node={node}
                    onSwitch={(kind) => callbacks.onSwitchKind(node.id, kind)}
                />
                <TitleSetting
                    node={node}
                    onChange={(title) => update({ title: title || undefined })}
                />
                <TableColumns callbacks={callbacks} node={node} />
            </>
        ),
        value: (
            <KeyField
                label={settingLabel('valueKey')}
                hint={t(editor.rowsKeyHint)}
                help="sharedValueKey"
                setting="valueKey"
                value={node.valueKey ?? ''}
                onChange={(valueKey) => update({ valueKey })}
            />
        ),
        limits: (
            <div className="grid grid-cols-2 gap-2">
                <SettingField label={settingLabel('minRows')} setting="minRows">
                    {({ id, 'data-setting': key }) => (
                        <NumberInput
                            id={id}
                            setting={key}
                            value={node.minRows}
                            min={0}
                            max={node.maxRows}
                            step={1}
                            optional={false}
                            onChange={(minRows) => update({ minRows: minRows ?? node.minRows })}
                            label={t(editor.minRows)}
                            className={`${inputClasses} w-full`}
                        />
                    )}
                </SettingField>
                <SettingField label={settingLabel('maxRows')} setting="maxRows">
                    {({ id, 'data-setting': key }) => (
                        <NumberInput
                            id={id}
                            setting={key}
                            value={node.maxRows}
                            min={Math.max(1, node.minRows)}
                            max={1000}
                            step={1}
                            optional={false}
                            onChange={(maxRows) => update({ maxRows: maxRows ?? node.maxRows })}
                            label={t(editor.maxRows)}
                            className={`${inputClasses} w-full`}
                        />
                    )}
                </SettingField>
            </div>
        ),
    };
}

/** A table's columns: a label row each, with the column's own settings folded below it. */
function TableColumns({ callbacks, node }: { callbacks: NodeEdits; node: TableNode }) {
    return (
        <div className="grid gap-1">
            <p className="text-xs font-semibold text-textPrimary">{t(editor.columns)}</p>
            <div className="grid gap-1" data-setting-list="" data-reorder-list="">
                {node.columns.map((column, index) => (
                    <div
                        key={column.id}
                        className="grid gap-1 [&[data-reorder-target]]:shadow-[0_-2px_0_0_rgb(var(--primary))]"
                        data-column-id={column.id}
                        data-reorder-row=""
                    >
                        <div className="flex items-center gap-1">
                            <RowMoveControls
                                count={node.columns.length}
                                index={index}
                                name={column.label || fallbackRowName(index)}
                                onMove={(to) => callbacks.onMoveTableColumn(node.id, index, to)}
                            />
                            <input
                                value={column.label}
                                onChange={(event) =>
                                    callbacks.onFieldUpdate(column.id, {
                                        label: event.target.value,
                                    })
                                }
                                aria-label={t(editor.fieldLabel)}
                                data-setting={`column:${column.id}.label`}
                                className={`${inputClasses} min-w-0 flex-1`}
                            />
                            <button
                                type="button"
                                onClick={() => callbacks.onRemoveTableColumn(node.id, column.id)}
                                disabled={node.columns.length <= 1}
                                aria-label={t(editor.remove)}
                                className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-error disabled:opacity-40"
                            >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </div>
                        <details className="pl-2" data-column-settings={column.id}>
                            <summary className="cursor-pointer text-xs text-textSecondary">
                                {t(editor.columnSettings, { label: column.label })}
                            </summary>
                            {/* A column's catalog fills write the other columns of its row. */}
                            <EditorFillTargetsContext.Provider
                                value={node.columns
                                    .filter(({ id }) => id !== column.id)
                                    .map(({ id, type, label }) => ({ id, type, label }))}
                            >
                                <FieldEditor
                                    callbacks={fieldEditsFor(callbacks, column.id)}
                                    field={column}
                                    inTable
                                    prefix={`column:${column.id}.`}
                                />
                            </EditorFillTargetsContext.Provider>
                        </details>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={() => callbacks.onAddTableColumn(node.id)}
                disabled={node.columns.length >= TEMPLATE_LIMITS.tableColumnsMax}
                className="flex items-center gap-1 justify-self-start rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t(editor.addField)}
            </button>
        </div>
    );
}

const NO_FILL_TARGETS: readonly never[] = [];

export function listSettings(node: ListNode, callbacks: NodeEdits): GroupedSettings {
    const listUpdate = (updates: Partial<ListNode>) =>
        callbacks.onUpdate(node.id, updates as NodeUpdates);
    const custom = node.valueKey !== undefined;
    const named = !custom || listIsNamed(node);
    const item = listItemField(node);
    return {
        content: (
            <>
                <KindChoice
                    node={node}
                    blocked={tableKindBlocked(node) ? t(editor.tableUnavailable) : undefined}
                    onSwitch={(kind) => callbacks.onSwitchKind(node.id, kind)}
                />
                <TitleSetting
                    node={node}
                    onChange={(title) => listUpdate({ title: title || undefined })}
                />
                {custom && (
                    <ToggleRow
                        checked={named}
                        label={settingLabel('named')}
                        setting="named"
                        onChange={(checked) => listUpdate({ named: checked ? undefined : false })}
                    />
                )}
                {custom && (
                    <details open className="rounded border border-border">
                        <summary className="cursor-pointer px-2 py-1 text-xs font-medium text-textSecondary">
                            {t(editor.listEntry)}
                        </summary>
                        {/* An entry is one field: a choice's catalog has no sibling to fill. */}
                        <EditorFillTargetsContext.Provider value={NO_FILL_TARGETS}>
                            <FieldEditor
                                callbacks={fieldEditsFor(callbacks, item.id)}
                                field={item}
                                itemOfList
                                prefix="entry."
                            />
                        </EditorFillTargetsContext.Provider>
                    </details>
                )}
                {named && <ListPresetsEditor callbacks={callbacks} node={node} />}
            </>
        ),
        value: (
            <>
                <ListSourceSelect node={node} onReplace={callbacks.onReplace} />
                {custom && (
                    <ListCatalogPicker
                        catalog={node.catalog}
                        itemType={item.type}
                        disabledNote={named ? undefined : t(editor.listCatalogNeedsNames)}
                        onChange={(catalog) => listUpdate({ catalog })}
                    />
                )}
            </>
        ),
        look: (
            <>
                <SettingField label={settingLabel('columns')} setting="columns">
                    {(control) => (
                        <select
                            {...control}
                            value={node.columns ?? 1}
                            onChange={(event) =>
                                listUpdate({ columns: Number(event.target.value) })
                            }
                            className={inputClasses}
                        >
                            {Array.from(
                                { length: TEMPLATE_LIMITS.columnsMax },
                                (_, index) => index + 1
                            ).map((count) => (
                                <option key={count} value={count}>
                                    {count}
                                </option>
                            ))}
                        </select>
                    )}
                </SettingField>
                <ToggleRow
                    checked={node.showTitle === true}
                    label={settingLabel('showTitle')}
                    setting="showTitle"
                    onChange={(checked) => listUpdate({ showTitle: checked || undefined })}
                />
                <ToggleRow
                    checked={node.framed === true}
                    label={settingLabel('framed')}
                    setting="framed"
                    onChange={(checked) => listUpdate({ framed: checked || undefined })}
                />
            </>
        ),
    };
}

function ListPresetsEditor({ callbacks, node }: { callbacks: NodeEdits; node: ListNode }) {
    const presets = node.presets ?? [];
    const update = (next: typeof presets) =>
        callbacks.onUpdate(node.id, { presets: next } as NodeUpdates);
    return (
        <div className="grid gap-1">
            <p className="text-xs font-semibold text-textPrimary">{t(primitives.presets)}</p>
            <div className="grid gap-1" data-setting-list="">
                {presets.map((preset, index) => (
                    <div
                        key={`${node.id}-preset-${preset.key}`}
                        className="flex items-center gap-2"
                    >
                        <input
                            value={preset.label}
                            onChange={(event) => {
                                const next = [...presets];
                                next[index] = { ...preset, label: event.target.value };
                                update(next);
                            }}
                            aria-label={t(primitives.presetLabel)}
                            placeholder={t(primitives.presetLabel)}
                            data-setting={`preset:${index}`}
                            className={`${inputClasses} min-w-0 flex-1`}
                        />
                        <NumberInput
                            min={0}
                            max={20}
                            step={1}
                            value={preset.value ?? 0}
                            onChange={(value) => {
                                const next = [...presets];
                                next[index] = { ...preset, value: value ?? 0 };
                                update(next);
                            }}
                            label={t(primitives.presetValue)}
                            className={`${inputClasses} w-16`}
                        />
                        <button
                            type="button"
                            onClick={() =>
                                update(presets.filter((_, candidate) => candidate !== index))
                            }
                            aria-label={t(primitives.removePreset)}
                            className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-error"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={() =>
                    update([
                        ...presets,
                        {
                            key: `preset-${presets.length + 1}-${Date.now().toString(36)}`,
                            label: '',
                            value: 0,
                        },
                    ])
                }
                className="flex items-center gap-1 justify-self-start rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t(primitives.addPreset)}
            </button>
        </div>
    );
}
