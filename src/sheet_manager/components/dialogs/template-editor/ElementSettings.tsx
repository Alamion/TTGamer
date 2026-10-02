import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { Fragment, memo } from 'react';

import type { DocumentBindingDescriptor } from '../../../systems/templateBindings';
import type {
    GroupNode,
    ListNode,
    SectionNode,
    TableNode,
    TemplateField,
    TemplateNode,
} from '../../../types/template';
import {
    isContainerNode,
    isTemplateField,
    listIsNamed,
    listItemField,
    TEMPLATE_LIMITS,
} from '../../../types/template';
import { ListCatalogPicker } from './CatalogBindingEditor';
import type { NodeUpdates } from './draft';
import { EditorFillTargetsContext, useEditorModel } from './EditorModel';
import { FieldEditor, type FieldEditorCallbacks, fieldSettings } from './FieldEditor';
import {
    ColumnLayoutControl,
    ColumnPlacementControl,
    ColumnSpanControl,
    ToggleRow,
    VisibilityControl,
} from './LayoutControls';
import { primitiveSettings } from './PrimitiveConfig';
import { type GroupedSettings, mergeGroups } from './settings/groupedSettings';
import { inputClasses } from './settings/inputClasses';
import { KeyField } from './settings/KeyField';
import { SettingField } from './settings/SettingField';
import { SettingsGroup } from './settings/SettingsGroup';
import { ListSourceSelect } from './SourceControls';

const editor = uiMessages.sheet.templates.editor;
const primitives = uiMessages.sheet.templates.primitives;
const fieldTypes = uiMessages.sheet.templates.fieldTypes;

const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

export interface ElementEditorCallbacks {
    onUpdate: (nodeId: string, updates: NodeUpdates) => void;
    onInsert: (parentId: string | null, index: number, node: TemplateNode) => void;
    onRemove: (nodeId: string) => void;
    onMove: (nodeId: string, targetParentId: string | null, index: number) => void;
    onFieldUpdate: (fieldId: string, updates: Partial<TemplateField>) => void;
    onFieldTypeChange: (fieldId: string, type: TemplateField['type']) => void;
    onAddOption: (fieldId: string) => void;
    onUpdateOption: (fieldId: string, optionId: string, label: string) => void;
    onRemoveOption: (fieldId: string, optionId: string) => void;
    onAttachCatalog: (fieldId: string, catalogId: string) => void;
    onDetachCatalog: (fieldId: string) => void;
    onUpdateFill: (
        fieldId: string,
        detailKey: string,
        rule: { targetFieldId: string; disabled?: boolean } | undefined
    ) => void;
    onAddTableColumn: (tableId: string) => void;
    onRemoveTableColumn: (tableId: string, columnId: string) => void;
    /** Swaps a node for another shape (source changes), keeping its id. */
    onReplace: (nodeId: string, next: TemplateNode) => void;
}

/** What the outline, chips, and announcements call a node. */
export function nodeDisplayName(node: TemplateNode): string {
    const name =
        node.type === 'primitive'
            ? (node.label ?? node.bindingKey)
            : node.type === 'list'
              ? (node.title ?? node.bindingKey ?? node.valueKey)
              : node.type === 'table' || isContainerNode(node)
                ? node.title
                : node.label;
    return name || '—';
}

/** The translated element kind (Section, Field group, Rating, …). */
export function nodeKindLabel(node: TemplateNode): string {
    if (node.type === 'primitive') return translate(fieldTypes.builtIn);
    return translate(fieldTypes[node.type]);
}

export interface ElementActions {
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDuplicate: () => void;
    onRemove: () => void;
}

/** The field editor's callbacks for one field id (a page field or a table column). */
function fieldCallbacks(callbacks: ElementEditorCallbacks, fieldId: string): FieldEditorCallbacks {
    return {
        onUpdate: (updates) => callbacks.onFieldUpdate(fieldId, updates),
        onChangeType: (type) => callbacks.onFieldTypeChange(fieldId, type),
        onAddOption: () => callbacks.onAddOption(fieldId),
        onUpdateOption: (optionId, label) => callbacks.onUpdateOption(fieldId, optionId, label),
        onRemoveOption: (optionId) => callbacks.onRemoveOption(fieldId, optionId),
        onAttachCatalog: (catalogId) => callbacks.onAttachCatalog(fieldId, catalogId),
        onDetachCatalog: () => callbacks.onDetachCatalog(fieldId),
        onUpdateFill: (detailKey, rule) => callbacks.onUpdateFill(fieldId, detailKey, rule),
        onReplace: (next) => callbacks.onReplace(fieldId, next),
    };
}

const actionButton =
    'flex h-7 w-7 items-center justify-center rounded border border-transparent text-textSecondary hover:border-border hover:text-textPrimary disabled:opacity-40';

/** Actions first, then the kind and the full name: a narrow area never hides the name. */
function ElementHeader({ actions, node }: { actions: ElementActions; node: TemplateNode }) {
    return (
        <div className="grid gap-1.5">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={actions.onMoveUp}
                    disabled={!actions.onMoveUp}
                    aria-label={t(editor.moveUp)}
                    title={t(editor.moveUp)}
                    className={actionButton}
                >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={actions.onMoveDown}
                    disabled={!actions.onMoveDown}
                    aria-label={t(editor.moveDown)}
                    title={t(editor.moveDown)}
                    className={actionButton}
                >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={actions.onDuplicate}
                    aria-label={t(editor.duplicate)}
                    title={t(editor.duplicate)}
                    className={actionButton}
                >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="flex-1" />
                <button
                    type="button"
                    onClick={actions.onRemove}
                    aria-label={t(editor.remove)}
                    title={t(editor.remove)}
                    className={`${actionButton} hover:text-error`}
                >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </div>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5" data-element-name="">
                <span className="shrink-0 rounded bg-bgBase px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-textSecondary">
                    {nodeKindLabel(node)}
                </span>
                <span className="min-w-0 break-words text-sm font-semibold text-textPrimary">
                    {nodeDisplayName(node)}
                </span>
            </p>
        </div>
    );
}

/** Where the element sits in a multi-column parent (Look) and when it shows (Visibility). */
function placementSettings({
    callbacks,
    node,
    parentColumns,
    pinnedSiblings,
}: {
    callbacks: ElementEditorCallbacks;
    node: TemplateNode;
    parentColumns: number;
    pinnedSiblings: boolean;
}): GroupedSettings {
    return {
        look:
            parentColumns > 1 ? (
                <>
                    <ColumnPlacementControl
                        parentColumns={parentColumns}
                        value={node.column}
                        onChange={(column) => callbacks.onUpdate(node.id, { column })}
                    />
                    <ColumnSpanControl
                        parentColumns={parentColumns}
                        pinnedSiblings={pinnedSiblings}
                        value={node.span}
                        onChange={(span) => callbacks.onUpdate(node.id, { span })}
                    />
                </>
            ) : null,
        visibility: (
            <VisibilityControl
                value={node.visibleWhen}
                onChange={(visibleWhen) => callbacks.onUpdate(node.id, { visibleWhen })}
            />
        ),
    };
}

/** The settings of the element's own kind. */
function kindSettings(
    node: TemplateNode,
    callbacks: ElementEditorCallbacks,
    bindings: readonly DocumentBindingDescriptor[]
): GroupedSettings {
    switch (node.type) {
        case 'section':
            return sectionSettings(node, callbacks);
        case 'group':
            return groupSettings(node, callbacks);
        case 'table':
            return tableSettings(node, callbacks);
        case 'list':
            return listSettings(node, callbacks);
        case 'primitive':
            return primitiveSettings({
                bindings,
                node,
                onUpdate: callbacks.onUpdate,
                onReplace: callbacks.onReplace,
            });
        default:
            return isTemplateField(node)
                ? fieldSettings({
                      bindings,
                      callbacks: fieldCallbacks(callbacks, node.id),
                      field: node,
                  })
                : {};
    }
}

/**
 * The settings of one element (spec 012), grouped in a fixed order across kinds (spec 022):
 * Content, Value, Limits and formulas, Look, Visibility and help. Empty groups are left out.
 */
export const ElementSettings = memo(function ElementSettings({
    actions,
    callbacks,
    node,
    parentColumns = 1,
    pinnedSiblings = false,
}: {
    actions: ElementActions;
    callbacks: ElementEditorCallbacks;
    node: TemplateNode;
    parentColumns?: number;
    /** Some element of the same container is pinned to a column (spans do not apply). */
    pinnedSiblings?: boolean;
}) {
    const { bindings } = useEditorModel();
    const groups = mergeGroups([
        kindSettings(node, callbacks, bindings),
        placementSettings({ callbacks, node, parentColumns, pinnedSiblings }),
    ]);
    return (
        <div className="grid gap-2" data-settings-for={node.id}>
            <ElementHeader actions={actions} node={node} />
            <div>
                {groups.map(({ id, nodes }) => (
                    <SettingsGroup key={id} id={id} nodeId={node.id}>
                        {nodes.map((setting, index) => (
                            <Fragment key={index}>{setting}</Fragment>
                        ))}
                    </SettingsGroup>
                ))}
            </div>
        </div>
    );
});

function TitleSetting({
    node,
    onChange,
}: {
    node: { title?: string };
    onChange: (title: string) => void;
}) {
    return (
        <SettingField label={t(editor.title)} setting="title">
            {(control) => (
                <input
                    {...control}
                    value={node.title ?? ''}
                    onChange={(event) => onChange(event.target.value)}
                    className={`${inputClasses} w-full font-medium`}
                />
            )}
        </SettingField>
    );
}

function DocsLinkSetting({
    node,
    onChange,
}: {
    node: { docsPath?: string };
    onChange: (docsPath: string | undefined) => void;
}) {
    return (
        <SettingField label={t(editor.docsLink)} help="documentationLink" setting="docsPath">
            {(control) => (
                <input
                    {...control}
                    value={node.docsPath ?? ''}
                    onChange={(event) => onChange(event.target.value.trim() || undefined)}
                    className={`${inputClasses} w-full`}
                />
            )}
        </SettingField>
    );
}

function sectionSettings(node: SectionNode, callbacks: ElementEditorCallbacks): GroupedSettings {
    const update = (updates: NodeUpdates) => callbacks.onUpdate(node.id, updates);
    return {
        content: <TitleSetting node={node} onChange={(title) => update({ title })} />,
        look: (
            <ColumnLayoutControl
                columns={node.columns}
                columnWidths={node.columnWidths}
                onChange={update}
            />
        ),
        visibility: (
            <>
                <ToggleRow
                    checked={node.defaultCollapsed === true}
                    label={t(editor.startsCollapsed)}
                    setting="defaultCollapsed"
                    onChange={(checked) => update({ defaultCollapsed: checked })}
                />
                <DocsLinkSetting node={node} onChange={(docsPath) => update({ docsPath })} />
            </>
        ),
    };
}

function groupSettings(node: GroupNode, callbacks: ElementEditorCallbacks): GroupedSettings {
    const update = (updates: NodeUpdates) => callbacks.onUpdate(node.id, updates);
    return {
        content: <TitleSetting node={node} onChange={(title) => update({ title })} />,
        look: (
            <>
                <ToggleRow
                    checked={!node.hideTitle}
                    label={t(editor.showTitle)}
                    setting="hideTitle"
                    onChange={(checked) => update({ hideTitle: !checked })}
                />
                <ColumnLayoutControl
                    columns={node.columns}
                    columnWidths={node.columnWidths}
                    onChange={update}
                />
            </>
        ),
        visibility: (
            <>
                <ToggleRow
                    checked={node.collapsible && !node.hideTitle}
                    disabled={node.hideTitle === true}
                    hint={node.hideTitle ? t(editor.hiddenTitleHint) : undefined}
                    label={t(editor.groupCollapsible)}
                    setting="collapsible"
                    onChange={(checked) => update({ collapsible: checked })}
                />
                {node.collapsible && !node.hideTitle && (
                    <ToggleRow
                        checked={node.defaultCollapsed === true}
                        label={t(editor.startsCollapsed)}
                        setting="defaultCollapsed"
                        onChange={(checked) => update({ defaultCollapsed: checked })}
                    />
                )}
                {!node.hideTitle && (
                    <DocsLinkSetting node={node} onChange={(docsPath) => update({ docsPath })} />
                )}
            </>
        ),
    };
}

function tableSettings(node: TableNode, callbacks: ElementEditorCallbacks): GroupedSettings {
    const update = (updates: NodeUpdates) => callbacks.onUpdate(node.id, updates);
    return {
        content: (
            <>
                <TitleSetting
                    node={node}
                    onChange={(title) => update({ title: title || undefined })}
                />
                <TableColumns callbacks={callbacks} node={node} />
            </>
        ),
        value: (
            <KeyField
                label={t(editor.valueKey)}
                hint={t(editor.rowsKeyHint)}
                help="sharedValueKey"
                setting="valueKey"
                value={node.valueKey ?? ''}
                onChange={(valueKey) => update({ valueKey })}
            />
        ),
        limits: (
            <div className="grid grid-cols-2 gap-2">
                <SettingField label={t(editor.minRows)} setting="minRows">
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
                <SettingField label={t(editor.maxRows)} setting="maxRows">
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
function TableColumns({ callbacks, node }: { callbacks: ElementEditorCallbacks; node: TableNode }) {
    return (
        <div className="grid gap-1">
            <p className="text-xs font-semibold text-textPrimary">{t(editor.columns)}</p>
            <div className="grid gap-1" data-setting-list="">
                {node.columns.map((column) => (
                    <div key={column.id} className="grid gap-1" data-column-id={column.id}>
                        <div className="flex items-center gap-1">
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
                                    callbacks={fieldCallbacks(callbacks, column.id)}
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

function listSettings(node: ListNode, callbacks: ElementEditorCallbacks): GroupedSettings {
    const listUpdate = (updates: Partial<ListNode>) =>
        callbacks.onUpdate(node.id, updates as NodeUpdates);
    const custom = node.valueKey !== undefined;
    const named = !custom || listIsNamed(node);
    const item = listItemField(node);
    return {
        content: (
            <>
                <TitleSetting
                    node={node}
                    onChange={(title) => listUpdate({ title: title || undefined })}
                />
                {custom && (
                    <ToggleRow
                        checked={named}
                        label={t(editor.listNamed)}
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
                                callbacks={fieldCallbacks(callbacks, item.id)}
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
                <SettingField label={t(editor.columns)} setting="columns">
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
                    label={t(editor.listShowTitle)}
                    setting="showTitle"
                    onChange={(checked) => listUpdate({ showTitle: checked || undefined })}
                />
                <ToggleRow
                    checked={node.framed === true}
                    label={t(editor.listFramed)}
                    setting="framed"
                    onChange={(checked) => listUpdate({ framed: checked || undefined })}
                />
            </>
        ),
    };
}

function ListPresetsEditor({
    callbacks,
    node,
}: {
    callbacks: ElementEditorCallbacks;
    node: ListNode;
}) {
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
