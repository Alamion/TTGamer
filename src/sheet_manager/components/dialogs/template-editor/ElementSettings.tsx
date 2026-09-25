import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { memo } from 'react';

import type {
    GroupNode,
    ListNode,
    SectionNode,
    TableNode,
    TemplateField,
    TemplateNode,
} from '../../../types/template';
import { isContainerNode, isTemplateField, TEMPLATE_LIMITS } from '../../../types/template';
import type { NodeUpdates } from './draft';
import { FieldEditor } from './FieldEditor';
import {
    ColumnLayoutControl,
    ColumnPlacementControl,
    ToggleRow,
    VisibilityControl,
} from './LayoutControls';
import { PrimitiveConfig } from './PrimitiveConfig';
import { ListSourceSelect } from './SourceControls';

const editor = uiMessages.sheet.templates.editor;
const primitives = uiMessages.sheet.templates.primitives;
const fieldTypes = uiMessages.sheet.templates.fieldTypes;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

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

/**
 * The settings of one element (spec 012): the same controls the recursive panels used, shown for
 * the selected element only. `parentColumns` offers column placement inside multi-column parents.
 */
export const ElementSettings = memo(function ElementSettings({
    actions,
    callbacks,
    node,
    parentColumns = 1,
}: {
    actions: ElementActions;
    callbacks: ElementEditorCallbacks;
    node: TemplateNode;
    parentColumns?: number;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const iconButton =
        'flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-textSecondary hover:bg-bgBase hover:text-textPrimary disabled:opacity-40';
    return (
        <div className="space-y-3" data-settings-for={node.id}>
            <p className="flex items-baseline gap-2">
                <span className="truncate text-sm font-semibold text-textPrimary">
                    {nodeDisplayName(node)}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-textSecondary">
                    {nodeKindLabel(node)}
                </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
                <button
                    type="button"
                    onClick={actions.onMoveUp}
                    disabled={!actions.onMoveUp}
                    className={iconButton}
                >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(editor.moveUp)}
                </button>
                <button
                    type="button"
                    onClick={actions.onMoveDown}
                    disabled={!actions.onMoveDown}
                    className={iconButton}
                >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(editor.moveDown)}
                </button>
                <button type="button" onClick={actions.onDuplicate} className={iconButton}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(editor.duplicate)}
                </button>
                <button
                    type="button"
                    onClick={actions.onRemove}
                    className={`${iconButton} hover:text-error`}
                >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(editor.remove)}
                </button>
            </div>
            {parentColumns > 1 && (
                <ColumnPlacementControl
                    parentColumns={parentColumns}
                    value={node.column}
                    onChange={(column) => callbacks.onUpdate(node.id, { column })}
                />
            )}
            <VisibilityControl
                value={node.visibleWhen}
                onChange={(visibleWhen) => callbacks.onUpdate(node.id, { visibleWhen })}
            />
            {node.type === 'section' && <SectionConfig callbacks={callbacks} node={node} />}
            {node.type === 'group' && <GroupConfig callbacks={callbacks} node={node} />}
            {node.type === 'table' && <TableConfig callbacks={callbacks} node={node} />}
            {node.type === 'list' && <ListConfig callbacks={callbacks} node={node} />}
            {node.type === 'primitive' && (
                <PrimitiveConfig
                    node={node}
                    onUpdate={callbacks.onUpdate}
                    onReplace={callbacks.onReplace}
                />
            )}
            {isTemplateField(node) && (
                <FieldEditor
                    callbacks={{
                        onUpdate: (updates) => callbacks.onFieldUpdate(node.id, updates),
                        onChangeType: (type) => callbacks.onFieldTypeChange(node.id, type),
                        onAddOption: () => callbacks.onAddOption(node.id),
                        onUpdateOption: (optionId, label) =>
                            callbacks.onUpdateOption(node.id, optionId, label),
                        onRemoveOption: (optionId) => callbacks.onRemoveOption(node.id, optionId),
                        onAttachCatalog: (catalogId) =>
                            callbacks.onAttachCatalog(node.id, catalogId),
                        onDetachCatalog: () => callbacks.onDetachCatalog(node.id),
                        onUpdateFill: (detailKey, rule) =>
                            callbacks.onUpdateFill(node.id, detailKey, rule),
                        onReplace: (next) => callbacks.onReplace(node.id, next),
                    }}
                    field={node}
                />
            )}
        </div>
    );
});

function SectionConfig({
    callbacks,
    node,
}: {
    callbacks: ElementEditorCallbacks;
    node: SectionNode;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    return (
        <div className="space-y-2">
            <input
                value={node.title}
                onChange={(event) => callbacks.onUpdate(node.id, { title: event.target.value })}
                aria-label={t(editor.sectionTitle)}
                className={`${inputClasses} w-full font-medium`}
            />
            <input
                value={node.docsPath ?? ''}
                onChange={(event) => callbacks.onUpdate(node.id, { docsPath: event.target.value })}
                placeholder={t(editor.docsLink)}
                aria-label={t(editor.docsLink)}
                className={`${inputClasses} w-full`}
            />
            <ToggleRow
                checked={node.defaultCollapsed === true}
                label={t(editor.startsCollapsed)}
                onChange={(checked) => callbacks.onUpdate(node.id, { defaultCollapsed: checked })}
            />
            <ColumnLayoutControl
                columns={node.columns}
                columnWidths={node.columnWidths}
                onChange={(updates) => callbacks.onUpdate(node.id, updates)}
            />
        </div>
    );
}

function GroupConfig({ callbacks, node }: { callbacks: ElementEditorCallbacks; node: GroupNode }) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    return (
        <div className="space-y-2">
            <input
                value={node.title}
                onChange={(event) => callbacks.onUpdate(node.id, { title: event.target.value })}
                aria-label={t(editor.groupTitle)}
                className={`${inputClasses} w-full font-medium`}
            />
            <ToggleRow
                checked={!node.hideTitle}
                label={t(editor.showTitle)}
                onChange={(checked) => callbacks.onUpdate(node.id, { hideTitle: !checked })}
            />
            <ToggleRow
                checked={node.collapsible && !node.hideTitle}
                disabled={node.hideTitle === true}
                hint={node.hideTitle ? t(editor.hiddenTitleHint) : undefined}
                label={t(editor.groupCollapsible)}
                onChange={(checked) => callbacks.onUpdate(node.id, { collapsible: checked })}
            />
            {node.collapsible && !node.hideTitle && (
                <ToggleRow
                    checked={node.defaultCollapsed === true}
                    label={t(editor.startsCollapsed)}
                    onChange={(checked) =>
                        callbacks.onUpdate(node.id, { defaultCollapsed: checked })
                    }
                />
            )}
            {!node.hideTitle && (
                <input
                    value={node.docsPath ?? ''}
                    onChange={(event) =>
                        callbacks.onUpdate(node.id, { docsPath: event.target.value })
                    }
                    placeholder={t(editor.docsLink)}
                    aria-label={t(editor.docsLink)}
                    className={`${inputClasses} w-full`}
                />
            )}
            <ColumnLayoutControl
                columns={node.columns}
                columnWidths={node.columnWidths}
                onChange={(updates) => callbacks.onUpdate(node.id, updates)}
            />
        </div>
    );
}

function ColumnSelect({
    onChange,
    value,
}: {
    onChange: (columns: number | undefined) => void;
    value: number | undefined;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    return (
        <select
            value={value ?? 1}
            onChange={(event) =>
                onChange(Number(event.target.value) === 1 ? undefined : Number(event.target.value))
            }
            aria-label={t(editor.columns)}
            className={inputClasses}
        >
            {Array.from({ length: TEMPLATE_LIMITS.columnsMax }, (_, index) => index + 1).map(
                (count) => (
                    <option key={count} value={count}>
                        {t(editor.columns)}: {count}
                    </option>
                )
            )}
        </select>
    );
}

function TableConfig({ callbacks, node }: { callbacks: ElementEditorCallbacks; node: TableNode }) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    return (
        <div className="space-y-2">
            <input
                value={node.title ?? ''}
                onChange={(event) => callbacks.onUpdate(node.id, { title: event.target.value })}
                placeholder={t(editor.tableTitle)}
                aria-label={t(editor.tableTitle)}
                className={`${inputClasses} w-full`}
            />
            <input
                value={node.valueKey ?? ''}
                onChange={(event) => callbacks.onUpdate(node.id, { valueKey: event.target.value })}
                placeholder={t(editor.tableValueKey)}
                aria-label={t(editor.tableValueKey)}
                className={`${inputClasses} w-full`}
            />
            <div className="flex items-center gap-2">
                <NumberInput
                    value={node.minRows}
                    min={0}
                    max={node.maxRows}
                    step={1}
                    optional={false}
                    onChange={(minRows) =>
                        callbacks.onUpdate(node.id, { minRows: minRows ?? node.minRows })
                    }
                    label={t(editor.minRows)}
                    className={`${inputClasses} w-20`}
                />
                <NumberInput
                    value={node.maxRows}
                    min={Math.max(1, node.minRows)}
                    max={1000}
                    step={1}
                    optional={false}
                    onChange={(maxRows) =>
                        callbacks.onUpdate(node.id, { maxRows: maxRows ?? node.maxRows })
                    }
                    label={t(editor.maxRows)}
                    className={`${inputClasses} w-20`}
                />
            </div>
            <div className="space-y-1">
                {node.columns.map((column) => (
                    <div key={column.id} className="flex items-center gap-2">
                        <input
                            value={column.label}
                            onChange={(event) =>
                                callbacks.onFieldUpdate(column.id, { label: event.target.value })
                            }
                            aria-label={t(editor.fieldLabel)}
                            className={`${inputClasses} flex-1`}
                        />
                        <button
                            type="button"
                            onClick={() => callbacks.onRemoveTableColumn(node.id, column.id)}
                            aria-label={t(editor.remove)}
                            className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-error"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={() => callbacks.onAddTableColumn(node.id)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t(editor.addField)}
            </button>
        </div>
    );
}

function ListConfig({ callbacks, node }: { callbacks: ElementEditorCallbacks; node: ListNode }) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const listUpdate = (updates: Partial<ListNode>) =>
        callbacks.onUpdate(node.id, updates as NodeUpdates);
    return (
        <div className="space-y-2">
            <input
                value={node.title ?? ''}
                onChange={(event) => listUpdate({ title: event.target.value || undefined })}
                placeholder={t(editor.listTitle)}
                aria-label={t(editor.listTitle)}
                className={`${inputClasses} w-full`}
            />
            <ListSourceSelect node={node} onReplace={callbacks.onReplace} />
            <ColumnSelect
                onChange={(columns) => listUpdate({ columns: columns ?? 1 })}
                value={node.columns}
            />
            <ToggleRow
                checked={node.showTitle === true}
                label={t(editor.listShowTitle)}
                onChange={(checked) => listUpdate({ showTitle: checked || undefined })}
            />
            <ToggleRow
                checked={node.framed === true}
                label={t(editor.listFramed)}
                onChange={(checked) => listUpdate({ framed: checked || undefined })}
            />
            <ListPresetsEditor callbacks={callbacks} node={node} />
        </div>
    );
}

function ListPresetsEditor({
    callbacks,
    node,
}: {
    callbacks: ElementEditorCallbacks;
    node: ListNode;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const presets = node.presets ?? [];
    const update = (next: typeof presets) =>
        callbacks.onUpdate(node.id, { presets: next } as NodeUpdates);
    return (
        <div className="grid gap-2">
            <p className="text-xs font-semibold text-textSecondary">{t(primitives.presets)}</p>
            {presets.map((preset, index) => (
                <div key={`${node.id}-preset-${preset.key}`} className="flex items-center gap-2">
                    <input
                        value={preset.label}
                        onChange={(event) => {
                            const next = [...presets];
                            next[index] = { ...preset, label: event.target.value };
                            update(next);
                        }}
                        aria-label={t(primitives.presetLabel)}
                        placeholder={t(primitives.presetLabel)}
                        className={`${inputClasses} flex-1`}
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
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t(primitives.addPreset)}
            </button>
        </div>
    );
}
