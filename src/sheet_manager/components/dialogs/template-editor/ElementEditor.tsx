import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import {
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ChevronUp,
    GripVertical,
    Plus,
    Trash2,
} from 'lucide-react';
import { memo, useState } from 'react';

import { useExpandedState } from '../../../hooks';
import type {
    FieldBinding,
    ResourceBinding,
    TraitBinding,
} from '../../../systems/templateBindings';
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
    TEMPLATE_FIELD_TYPES,
    TEMPLATE_LIMITS,
} from '../../../types/template';
import { generateDraftId, newField as newDraftField, type NodeUpdates } from './draft';
import { useEditorModel } from './EditorModel';
import { FieldEditor } from './FieldEditor';
import { ColumnLayoutControl, ColumnPlacementControl, ToggleRow } from './LayoutControls';
import { PrimitiveConfig } from './PrimitiveConfig';

const editor = uiMessages.sheet.templates.editor;
const primitives = uiMessages.sheet.templates.primitives;
const fieldTypes = uiMessages.sheet.templates.fieldTypes;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

const NODE_MIME = 'application/x-ttgamer-template-node';

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
}

const isContainer = isContainerNode;
const isFieldNode = isTemplateField;

function bridgedTraitField(binding: TraitBinding): TemplateField {
    return {
        id: generateDraftId('f'),
        label: binding.label,
        required: false,
        compact: false,
        type: 'rating',
        min: 0,
        max: binding.maximum,
        presentation: 'dots',
        valueKey: binding.coordinate,
    };
}

function bridgedResourceField(binding: ResourceBinding): TemplateField {
    return {
        id: generateDraftId('f'),
        label: binding.label,
        required: false,
        compact: false,
        type: 'resource',
        min: 0,
        max: binding.maximum,
        valueKey: binding.coordinate,
    };
}

function bridgedIdentityField(binding: FieldBinding): TemplateField {
    return {
        id: generateDraftId('f'),
        label: binding.label,
        required: false,
        compact: false,
        type: 'text',
        multiline: false,
        valueKey: binding.coordinate,
    };
}

/**
 * Renders the ordered children of one container (or the page root): each child panel is a
 * drop target that inserts before it; the trailing zone appends to this container. Shared by
 * sections, groups, and the page root — one placement rule at every level (spec FR-1).
 */
export const ChildrenList = memo(function ChildrenList({
    callbacks,
    depth,
    nodes,
    parentId,
    parentColumns,
}: {
    callbacks: ElementEditorCallbacks;
    depth: number;
    nodes: readonly TemplateNode[];
    parentId: string | null;
    /** Column count of the container these children live in (placement is offered above 1). */
    parentColumns?: number;
}) {
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const { atNodeLimit } = useEditorModel();

    /**
     * Drops land in the innermost list only: the event must not bubble to ancestor lists, which
     * would run a second move into the outer container. `index` is the slot before which the
     * element lands; moving an element later within the same list shifts the final position.
     */
    const dropAt = (event: React.DragEvent, index: number) => {
        const draggedId = event.dataTransfer.getData(NODE_MIME);
        if (!draggedId) return;
        event.preventDefault();
        event.stopPropagation();
        setDropIndex(null);
        const currentIndex = nodes.findIndex((node) => node.id === draggedId);
        if (currentIndex !== -1 && (currentIndex === index || currentIndex === index - 1)) return;
        const finalIndex = currentIndex !== -1 && currentIndex < index ? index - 1 : index;
        callbacks.onMove(draggedId, parentId, finalIndex);
    };

    const dragOverAt = (event: React.DragEvent, index: number) => {
        if (!event.dataTransfer.types.includes(NODE_MIME)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        if (dropIndex !== index) setDropIndex(index);
    };

    return (
        <div className="space-y-2" data-children-of={parentId ?? 'root'}>
            {nodes.map((node, index) => (
                <div
                    key={node.id}
                    onDragOver={(event) => dragOverAt(event, index)}
                    onDragLeave={() => setDropIndex(null)}
                    onDrop={(event) => dropAt(event, index)}
                    className={clsx(
                        'rounded-lg border-t-2 border-transparent',
                        dropIndex === index && 'border-primary'
                    )}
                >
                    <ElementEditor
                        callbacks={callbacks}
                        depth={depth}
                        indexInParent={index}
                        node={node}
                        parentId={parentId}
                        parentColumns={parentColumns}
                    />
                </div>
            ))}
            <div
                onDragOver={(event) => dragOverAt(event, nodes.length)}
                onDragLeave={() => setDropIndex(null)}
                onDrop={(event) => dropAt(event, nodes.length)}
                className={clsx(
                    'min-h-3 rounded border-t-2 border-transparent',
                    dropIndex === nodes.length && 'border-primary'
                )}
                data-drop-zone={parentId ?? 'root'}
            />
            <AddElementPalette
                disabled={depth > TEMPLATE_LIMITS.maxDepth || atNodeLimit}
                onInsert={(node) => callbacks.onInsert(parentId, Number.MAX_SAFE_INTEGER, node)}
                open={paletteOpen}
                onOpenChange={setPaletteOpen}
            />
        </div>
    );
});

function AddElementPalette({
    disabled,
    onInsert,
    open,
    onOpenChange,
}: {
    disabled: boolean;
    onInsert: (node: TemplateNode) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const { bindings } = useEditorModel();

    const paletteButton = (label: string, build: () => TemplateNode) => (
        <button
            key={label}
            type="button"
            onClick={() => onInsert(build())}
            disabled={disabled}
            data-palette-option={label}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface disabled:opacity-40"
        >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
        </button>
    );

    const traitBindings = bindings.filter(
        (binding): binding is TraitBinding => binding.kind === 'trait'
    );
    const resourceBindings = bindings.filter(
        (binding): binding is ResourceBinding => binding.kind === 'resource'
    );
    const fieldBindings = bindings.filter(
        (binding): binding is FieldBinding => binding.kind === 'field'
    );
    const listBindings = bindings.filter((binding) => binding.kind === 'list');
    const trackBindings = bindings.filter((binding) => binding.kind === 'track');
    const equipmentBindings = bindings.filter((binding) => binding.kind === 'equipment');

    const groups: ReadonlyArray<{ title: string; entries: React.ReactNode[] }> = [
        {
            title: t(editor.paletteFields),
            entries: FIELD_TYPE_OPTIONS.map((option) =>
                paletteButton(option.label, () => newDraftField(option.value))
            ),
        },
        {
            title: t(editor.paletteContainers),
            entries: [
                paletteButton(fieldTypes.section.message, () => ({
                    id: generateDraftId('sec'),
                    type: 'section',
                    title: 'New section',
                    children: [],
                })),
                paletteButton(fieldTypes.group.message, () => ({
                    id: generateDraftId('grp'),
                    type: 'group',
                    title: 'New group',
                    collapsible: false,
                    children: [],
                })),
            ],
        },
        {
            title: t(editor.paletteData),
            entries: [
                paletteButton(fieldTypes.table.message, () => ({
                    id: generateDraftId('blk'),
                    type: 'table',
                    minRows: 0,
                    maxRows: 100,
                    columns: [newDraftField('text', 'Column 1')],
                })),
                paletteButton(fieldTypes.list.message, () => ({
                    id: generateDraftId('lst'),
                    type: 'list',
                    columns: 1,
                    valueKey: generateDraftId('lst'),
                })),
            ],
        },
        ...(listBindings.length > 0
            ? [
                  {
                      title: t(editor.paletteSystemLists),
                      entries: listBindings.map((binding) =>
                          paletteButton(binding.label, () => ({
                              id: generateDraftId('lst'),
                              type: 'list',
                              columns: 1,
                              bindingKey: binding.key,
                          }))
                      ),
                  },
              ]
            : []),
        ...(trackBindings.length > 0
            ? [
                  {
                      title: t(editor.paletteTracks),
                      entries: trackBindings.map((binding) =>
                          paletteButton(binding.label, () => ({
                              id: generateDraftId('blk'),
                              type: 'primitive',
                              bindingKey: binding.key,
                              compact: false,
                          }))
                      ),
                  },
              ]
            : []),
        ...(equipmentBindings.length > 0
            ? [
                  {
                      title: t(editor.paletteEquipment),
                      entries: equipmentBindings.map((binding) =>
                          paletteButton(binding.label, () => ({
                              id: generateDraftId('blk'),
                              type: 'primitive',
                              bindingKey: binding.key,
                              compact: false,
                          }))
                      ),
                  },
              ]
            : []),
        ...(traitBindings.length > 0 || resourceBindings.length > 0 || fieldBindings.length > 0
            ? [
                  {
                      title: t(editor.paletteSystemValues),
                      entries: [
                          ...traitBindings.map((binding) =>
                              paletteButton(binding.label, () => bridgedTraitField(binding))
                          ),
                          ...resourceBindings.map((binding) =>
                              paletteButton(binding.label, () => bridgedResourceField(binding))
                          ),
                          ...fieldBindings.map((binding) =>
                              paletteButton(binding.label, () => bridgedIdentityField(binding))
                          ),
                      ],
                  },
              ]
            : []),
    ];

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={() => onOpenChange(!open)}
                aria-expanded={open}
                aria-label={t(editor.addElement)}
                className="w-full rounded-lg border border-dashed border-border py-1.5 text-xs text-primary hover:bg-bgBase"
            >
                + {t(editor.addElement)}
            </button>
            {open && (
                <div className="mt-2 space-y-2 rounded-lg border border-border bg-bgBase p-3">
                    {groups.map((group) => (
                        <div key={group.title}>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                                {group.title}
                            </p>
                            <div className="flex flex-wrap gap-2">{group.entries}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const FIELD_TYPE_OPTIONS: ReadonlyArray<{ value: TemplateField['type']; label: string }> =
    TEMPLATE_FIELD_TYPES.map((type) => ({ value: type, label: fieldTypes[type].message }));

/**
 * The recursive node editor: one panel per element at any depth. Affordances (spec FR-6/FR-7):
 * the grip handle on the LEFT edge moves (drag, arrow keys on the focused grip, or the
 * always-visible arrow buttons), the collapse chevron sits on the RIGHT edge — different
 * icons, different sides, never a shared hit area at any nesting level.
 */
const ElementEditor = memo(function ElementEditor({
    callbacks,
    depth,
    indexInParent,
    node,
    parentId,
    parentColumns = 1,
}: {
    callbacks: ElementEditorCallbacks;
    depth: number;
    indexInParent: number;
    node: TemplateNode;
    parentId: string | null;
    parentColumns?: number;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const container = isContainer(node);
    const { draftId } = useEditorModel();
    const [isExpanded, toggleExpanded] = useExpandedState(`template-editor-${draftId}-${node.id}`);

    const move = (offset: -1 | 1) => callbacks.onMove(node.id, parentId, indexInParent + offset);

    const onDragStart = (event: React.DragEvent) => {
        event.dataTransfer.setData(NODE_MIME, node.id);
        event.dataTransfer.effectAllowed = 'move';
    };

    const onGripKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            move(-1);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            move(1);
        }
    };

    return (
        <div
            className={clsx('rounded-lg border border-border bg-bgBase p-3', depth > 1 && 'ml-4')}
            data-node-id={node.id}
            data-node-type={node.type}
        >
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    draggable
                    onDragStart={onDragStart}
                    onKeyDown={onGripKeyDown}
                    aria-label={t(editor.gripHandle)}
                    data-testid={`grip-${node.id}`}
                    className="cursor-grab rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary active:cursor-grabbing"
                >
                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => move(-1)}
                    aria-label={t(editor.moveUp)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary"
                >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => move(1)}
                    aria-label={t(editor.moveDown)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary"
                >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1">
                    <NodeTitleLabel node={node} />
                </div>
                {container && (
                    <button
                        type="button"
                        onClick={toggleExpanded}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? t(editor.collapse) : t(editor.expand)}
                        data-testid={`collapse-${node.id}`}
                        className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary"
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => callbacks.onRemove(node.id)}
                    aria-label={t(editor.remove)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-error"
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            {(!container || isExpanded) && (
                <div className="mt-3 space-y-3">
                    {parentColumns > 1 && (
                        <ColumnPlacementControl
                            parentColumns={parentColumns}
                            value={node.column}
                            onChange={(column) => callbacks.onUpdate(node.id, { column })}
                        />
                    )}
                    {node.type === 'section' && <SectionConfig callbacks={callbacks} node={node} />}
                    {node.type === 'group' && <GroupConfig callbacks={callbacks} node={node} />}
                    {node.type === 'table' && <TableConfig callbacks={callbacks} node={node} />}
                    {node.type === 'list' && <ListConfig callbacks={callbacks} node={node} />}
                    {node.type === 'primitive' && (
                        <PrimitiveConfig node={node} onUpdate={callbacks.onUpdate} />
                    )}
                    {isFieldNode(node) && (
                        <FieldEditor
                            callbacks={{
                                onUpdate: (updates) => callbacks.onFieldUpdate(node.id, updates),
                                onChangeType: (type) => callbacks.onFieldTypeChange(node.id, type),
                                onAddOption: () => callbacks.onAddOption(node.id),
                                onUpdateOption: (optionId, label) =>
                                    callbacks.onUpdateOption(node.id, optionId, label),
                                onRemoveOption: (optionId) =>
                                    callbacks.onRemoveOption(node.id, optionId),
                                onAttachCatalog: (catalogId) =>
                                    callbacks.onAttachCatalog(node.id, catalogId),
                                onDetachCatalog: () => callbacks.onDetachCatalog(node.id),
                                onUpdateFill: (detailKey, rule) =>
                                    callbacks.onUpdateFill(node.id, detailKey, rule),
                            }}
                            field={node}
                        />
                    )}
                    {container && (
                        <div className="mt-3">
                            <ChildrenList
                                callbacks={callbacks}
                                depth={depth + 1}
                                nodes={node.children}
                                parentId={node.id}
                                parentColumns={node.columns}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

/** Header name of every panel, so collapsed containers still say what they hold. */
function NodeTitleLabel({ node }: { node: TemplateNode }) {
    const kind = fieldTypes[node.type as keyof typeof fieldTypes]?.message;
    const name =
        node.type === 'primitive'
            ? (node.label ?? node.bindingKey)
            : node.type === 'list'
              ? (node.title ?? node.bindingKey ?? node.valueKey)
              : node.type === 'table' || isContainer(node)
                ? node.title
                : node.label;
    return (
        <span
            className="flex min-w-0 flex-1 items-baseline gap-2"
            data-primitive-binding={node.type === 'primitive' ? node.bindingKey : undefined}
        >
            <span className="truncate text-sm font-medium text-textPrimary">{name || '—'}</span>
            {kind && isContainer(node) && (
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-textSecondary">
                    {kind}
                </span>
            )}
        </span>
    );
}

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
                <input
                    type="number"
                    value={node.minRows}
                    min={0}
                    max={1000}
                    onChange={(event) =>
                        callbacks.onUpdate(node.id, { minRows: Number(event.target.value) })
                    }
                    aria-label={t(editor.minRows)}
                    className={`${inputClasses} w-20`}
                />
                <input
                    type="number"
                    value={node.maxRows}
                    min={1}
                    max={1000}
                    onChange={(event) =>
                        callbacks.onUpdate(node.id, { maxRows: Number(event.target.value) })
                    }
                    aria-label={t(editor.maxRows)}
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
    const bindings = useEditorModel().bindings.filter((binding) => binding.kind === 'list');
    const isSystemMode = node.bindingKey !== undefined;
    const listUpdate = (updates: Partial<ListNode>) =>
        callbacks.onUpdate(node.id, updates as NodeUpdates);
    return (
        <div className="space-y-2">
            <label className="grid gap-1 text-xs text-textSecondary">
                {t(editor.listMode)}
                <select
                    value={isSystemMode ? 'system' : 'custom'}
                    onChange={(event) => {
                        if (event.target.value === 'system') {
                            listUpdate({
                                valueKey: undefined,
                                bindingKey: bindings[0]?.key ?? 'list:customTalents',
                            });
                        } else {
                            listUpdate({ bindingKey: undefined });
                        }
                    }}
                    aria-label={t(editor.listMode)}
                    className={inputClasses}
                >
                    <option value="custom">{t(editor.listModeCustom)}</option>
                    <option value="system">{t(editor.listModeSystem)}</option>
                </select>
            </label>
            {isSystemMode ? (
                <label className="grid gap-1 text-xs text-textSecondary">
                    {t(editor.listSystemBinding)}
                    <select
                        value={node.bindingKey ?? ''}
                        onChange={(event) => listUpdate({ bindingKey: event.target.value })}
                        aria-label={t(editor.listSystemBinding)}
                        className={inputClasses}
                    >
                        {bindings.map((binding) => (
                            <option key={binding.key} value={binding.key}>
                                {binding.label}
                            </option>
                        ))}
                    </select>
                </label>
            ) : (
                <input
                    value={node.valueKey ?? ''}
                    onChange={(event) => listUpdate({ valueKey: event.target.value })}
                    placeholder={t(editor.listCustomKey)}
                    aria-label={t(editor.listCustomKey)}
                    className={inputClasses}
                />
            )}
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
                    <input
                        type="number"
                        min={0}
                        max={20}
                        value={preset.value ?? 0}
                        onChange={(event) => {
                            const next = [...presets];
                            next[index] = { ...preset, value: Number(event.target.value) || 0 };
                            update(next);
                        }}
                        aria-label={t(primitives.presetValue)}
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
