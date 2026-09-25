import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Redo2, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { kindLabel, listTemplateTargets } from '../../features/sheet/data/documentLabels';
import { listTemplateNumericCoordinates } from '../../features/sheet/data/templateReferences';
import type { OverlayPlacement } from '../../features/sheet/declarative/editorOverlay';
import { useTemplateStore } from '../../store/templateStore';
import { listDocumentBindings } from '../../systems/templateBindings';
import { isUserKind } from '../../systems/userTypes';
import { isDefaultTemplateId } from '../../systems/view';
import {
    collectTemplateFields,
    collectTemplateNodes,
    type CustomTemplate,
    CustomTemplateSchema,
    isContainerNode,
    TEMPLATE_LIMITS,
    type TemplateNode,
} from '../../types/template';
import { ConfirmDialog } from './ConfirmDialog';
import {
    addOption,
    addTableColumn,
    attachCatalog,
    changeFieldType,
    collectDraftIssues,
    createDraftFromTemplate,
    createEmptyDraft,
    describeDraft,
    detachCatalog,
    type DraftOpResult,
    duplicateNode,
    type EditorDraft,
    findNode,
    findNodePosition,
    generateDraftId,
    insertAtPlacement,
    materializeColumns,
    moveNode,
    placeNode,
    removeNode,
    removeOption,
    removeTableColumn,
    replaceNode,
    setDraftKind,
    updateField,
    updateFill,
    updateNode,
    updateOption,
} from './template-editor/draft';
import {
    type EditorActions,
    EditorActionsContext,
    type EditorSelection,
    EditorSelectionContext,
} from './template-editor/editorActions';
import {
    EditorFillTargetsContext,
    type EditorModel,
    EditorModelContext,
    type FillTarget,
} from './template-editor/EditorModel';
import { EditorPage } from './template-editor/EditorPage';
import { EditorPreview } from './template-editor/EditorPreview';
import {
    type ElementEditorCallbacks,
    ElementSettings,
    nodeDisplayName,
} from './template-editor/ElementSettings';
import {
    applyChange,
    canRedo,
    canUndo,
    createHistory,
    type DraftChangeMeta,
    type EditorHistory,
    redo,
    select,
    undo,
} from './template-editor/history';
import { type MoveCommand, resolveMoveTarget } from './template-editor/moveTargets';
import { OutlineTree } from './template-editor/OutlineTree';
import { type EditorShortcutHandlers, useEditorShortcuts } from './template-editor/shortcuts';

const editor = uiMessages.sheet.templates.editor;
const library = uiMessages.sheet.templates.library;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

type EditorArea = 'page' | 'outline' | 'settings';
type EditorMode = 'edit' | 'preview';

export interface TemplateEditorDialogProps {
    base:
        | { kind: 'empty'; documentKind?: string; systemId?: string; name?: string }
        | { kind: 'skeleton'; documentKind: string; template: CustomTemplate }
        | { kind: 'duplicate' | 'edit'; template: CustomTemplate };
    onClose: () => void;
    /** Called with the saved template (user templates only; e.g. to create a user type). */
    onSaved?: (template: CustomTemplate) => void;
}

function initialDraft(base: TemplateEditorDialogProps['base']): EditorDraft {
    if (base.kind === 'empty') {
        const draft = createEmptyDraft(base.documentKind ?? 'character', base.systemId);
        return base.name ? { ...draft, name: base.name } : draft;
    }
    if (base.kind === 'edit') return createDraftFromTemplate(base.template);
    return createDraftFromTemplate(base.template, { id: generateDraftId('tpl') });
}

/** The column count of a node's parent (1 at the page root or for single-column parents). */
function parentColumnsOf(draft: EditorDraft, nodeId: string): number {
    const position = findNodePosition(draft, nodeId);
    if (!position || position.parentId === null) return 1;
    const parent = findNode(draft, position.parentId);
    return parent && isContainerNode(parent) ? (parent.columns ?? 1) : 1;
}

function labelIn(draft: EditorDraft, nodeId: string): string {
    const node = findNode(draft, nodeId);
    return node ? nodeDisplayName(node) : nodeId;
}

function reveal(selector: string, block: ScrollLogicalPosition) {
    const element = document.querySelector(selector);
    const reduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element?.scrollIntoView?.({ block, behavior: reduced ? 'auto' : 'smooth' });
}

export function TemplateEditorDialog({ base, onClose, onSaved }: TemplateEditorDialogProps) {
    const { saveTemplate, setDefaultOverride } = useTemplateStore();
    const t = useCallback((descriptor: { message: string }) => translate(descriptor), []);
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    // Feature 004: editing a default template targets its override, never the custom library.
    const editingDefault =
        base.kind === 'edit' && isDefaultTemplateId(base.template.id, base.template.systemId);

    const [history, setHistory] = useState<EditorHistory>(() =>
        createHistory(initialDraft(base), null)
    );
    const draft = history.present.draft;
    const selectedId = history.present.selectedId;
    const [mode, setMode] = useState<EditorMode>('edit');
    const [area, setArea] = useState<EditorArea>('page');
    const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
    const [saveIssues, setSaveIssues] = useState<readonly string[]>([]);
    const [announcement, setAnnouncement] = useState('');
    const [initialJson] = useState(() => JSON.stringify(draft));
    const isDirty = JSON.stringify(draft) !== initialJson;
    const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);

    // Callbacks keep their identity across edits (memoized panels and frames), so they read the
    // latest state from a ref instead of a render-time closure.
    const historyRef = useRef(history);
    useEffect(() => {
        historyRef.current = history;
    }, [history]);
    const commit = useCallback((next: EditorHistory) => {
        historyRef.current = next;
        setHistory(next);
    }, []);

    const change = useCallback(
        (update: (current: EditorDraft) => EditorDraft, meta?: DraftChangeMeta) => {
            const current = historyRef.current;
            commit(applyChange(current, update(current.present.draft), meta));
            setSaveIssues([]);
        },
        [commit]
    );

    const describeFailure = useCallback(
        (result: Extract<DraftOpResult, { ok: false }>) =>
            result.error === 'depth'
                ? t(editor.depthMessage).replace('{limit}', String(result.limit ?? 0))
                : result.error === 'count'
                  ? t(editor.countMessage).replace('{limit}', String(result.limit ?? 0))
                  : t(editor.cannotMoveIntoItself),
        [t]
    );

    /** Structural operations that may be refused (limits, moving into itself). */
    const applyOp = useCallback(
        (
            operation: (current: EditorDraft) => DraftOpResult,
            meta: DraftChangeMeta & { announce?: string } = {}
        ) => {
            const current = historyRef.current;
            const result = operation(current.present.draft);
            if (!result.ok) {
                const message = describeFailure(result);
                setSaveIssues([message]);
                setAnnouncement(message);
                return false;
            }
            commit(applyChange(current, result.draft, meta));
            setSaveIssues([]);
            if (meta.announce) setAnnouncement(meta.announce);
            return true;
        },
        [commit, describeFailure]
    );

    const selectNode = useCallback(
        (nodeId: string | null, origin?: 'page' | 'outline') => {
            commit(select(historyRef.current, nodeId));
            if (!nodeId) return;
            if (origin === 'page') reveal(`[data-outline-row="${nodeId}"]`, 'nearest');
            if (origin === 'outline')
                reveal(`[data-editor-frame][data-node-id="${nodeId}"]`, 'center');
        },
        [commit]
    );

    const removeSelected = useCallback(
        (nodeId: string) => {
            const current = historyRef.current.present.draft;
            const position = findNodePosition(current, nodeId);
            if (!position) return;
            const next =
                position.siblings[position.index + 1]?.id ??
                position.siblings[position.index - 1]?.id ??
                position.parentId;
            const label = labelIn(historyRef.current.present.draft, nodeId);
            change((draftNow) => removeNode(draftNow, nodeId), { selectedId: next });
            setAnnouncement(translate(editor.removed, { label }));
        },
        // labelOf reads the ref only.

        [change]
    );

    const duplicate = useCallback(
        (nodeId: string) => {
            const label = labelIn(historyRef.current.present.draft, nodeId);
            let copyId: string | undefined;
            applyOp(
                (current) => {
                    const result = duplicateNode(current, nodeId);
                    copyId = result.copyId;
                    return result;
                },
                { announce: translate(editor.duplicated, { label }) }
            );
            if (copyId) commit(select(historyRef.current, copyId));
        },

        [applyOp, commit]
    );

    const moveByCommand = useCallback(
        (nodeId: string, command: MoveCommand) => {
            const current = historyRef.current.present.draft;
            const position = findNodePosition(current, nodeId);
            const columnMove = command === 'column-prev' || command === 'column-next';
            const prepared = columnMove
                ? materializeColumns(current, position?.parentId ?? null)
                : current;
            const target = resolveMoveTarget(prepared, nodeId, command);
            if (!target) return;
            const label = labelIn(historyRef.current.present.draft, nodeId);
            applyOp(
                () => {
                    const moved = moveNode(prepared, nodeId, target.parentId, target.index);
                    if (!moved.ok || target.column === undefined) return moved;
                    return {
                        ok: true,
                        draft: updateNode(moved.draft, nodeId, {
                            column: target.column ?? undefined,
                        }),
                    };
                },
                {
                    announce:
                        columnMove && target.column
                            ? translate(editor.movedColumn, { label, column: target.column })
                            : translate(editor.moved, { label }),
                }
            );
        },

        [applyOp]
    );

    const actions = useMemo<EditorActions>(
        () => ({
            select: selectNode,
            insertAt: (placement: OverlayPlacement, node: TemplateNode) =>
                applyOp((current) => insertAtPlacement(current, placement, node), {
                    selectedId: node.id,
                    announce: translate(editor.inserted, { label: nodeDisplayName(node) }),
                }),
            moveTo: (nodeId: string, placement: OverlayPlacement) =>
                applyOp((current) => placeNode(current, nodeId, placement), {
                    selectedId: nodeId,
                    announce: placement.column
                        ? translate(editor.movedColumn, {
                              label: labelIn(historyRef.current.present.draft, nodeId),
                              column: placement.column,
                          })
                        : translate(editor.moved, {
                              label: labelIn(historyRef.current.present.draft, nodeId),
                          }),
                }),
        }),

        [applyOp, selectNode]
    );

    const callbacks = useMemo<ElementEditorCallbacks>(
        () => ({
            onUpdate: (nodeId, updates) =>
                change((current) => updateNode(current, nodeId, updates), {
                    coalesceKey: `${nodeId}:${Object.keys(updates).join(',')}`,
                }),
            onInsert: (parentId, index, node) =>
                applyOp((current) =>
                    insertAtPlacement(current, { parentId, index, column: null }, node)
                ),
            onRemove: (nodeId) => removeSelected(nodeId),
            onMove: (nodeId, targetParentId, index) =>
                applyOp((current) => moveNode(current, nodeId, targetParentId, index)),
            onFieldUpdate: (fieldId, updates) =>
                change((current) => updateField(current, fieldId, updates), {
                    coalesceKey: `${fieldId}:${Object.keys(updates).join(',')}`,
                }),
            onFieldTypeChange: (fieldId, type) =>
                change((current) => changeFieldType(current, fieldId, type)),
            onAddOption: (fieldId) => change((current) => addOption(current, fieldId)),
            onUpdateOption: (fieldId, optionId, label) =>
                change((current) => updateOption(current, fieldId, optionId, label), {
                    coalesceKey: `${fieldId}:option:${optionId}`,
                }),
            onRemoveOption: (fieldId, optionId) =>
                change((current) => removeOption(current, fieldId, optionId)),
            onAttachCatalog: (fieldId, catalogId) =>
                change((current) => attachCatalog(current, fieldId, catalogId)),
            onDetachCatalog: (fieldId) => change((current) => detachCatalog(current, fieldId)),
            onUpdateFill: (fieldId, detailKey, rule) =>
                change((current) => updateFill(current, fieldId, detailKey, rule)),
            onAddTableColumn: (tableId) => change((current) => addTableColumn(current, tableId)),
            onRemoveTableColumn: (tableId, columnId) =>
                change((current) => removeTableColumn(current, tableId, columnId)),
            onReplace: (nodeId, next) => change((current) => replaceNode(current, nodeId, next)),
        }),
        [applyOp, change, removeSelected]
    );

    const undoChange = useCallback(() => commit(undo(historyRef.current)), [commit]);
    const redoChange = useCallback(() => commit(redo(historyRef.current)), [commit]);
    const onSelection = useCallback((run: (nodeId: string) => void) => {
        const nodeId = historyRef.current.present.selectedId;
        if (nodeId) run(nodeId);
    }, []);
    const shortcutHandlers = useMemo<EditorShortcutHandlers>(() => {
        const move = (command: MoveCommand) => () =>
            onSelection((nodeId) => moveByCommand(nodeId, command));
        return {
            undo: undoChange,
            redo: redoChange,
            duplicate: () => onSelection(duplicate),
            delete: () => onSelection(removeSelected),
            'move-up': move('move-up'),
            'move-down': move('move-down'),
            'move-out': move('move-out'),
            'move-in': move('move-in'),
            'column-prev': move('column-prev'),
            'column-next': move('column-next'),
        };
    }, [duplicate, moveByCommand, onSelection, redoChange, removeSelected, undoChange]);
    useEditorShortcuts(contentElement, mode === 'edit' ? shortcutHandlers : {});

    const draftIssues = useMemo(
        () =>
            collectDraftIssues(draft, {
                emptyName: t(editor.emptyName),
                emptyLabel: t(editor.emptyLabel),
                duplicateId: t(editor.duplicateId),
                invalidKey: t(editor.invalidKey),
                limitReached: t(editor.limitReached),
                invalidBounds: t(editor.invalidBounds),
                invalidFormula: t(editor.invalidFormula),
                unknownCoordinate: t(editor.unknownCoordinate),
                circularDependency: t(editor.circularDependency),
                unknownBinding: t(editor.unknownBinding),
                unknownCatalog: t(editor.unknownCatalog),
                unknownFillTarget: t(editor.unknownFillTarget),
                unknownLabelMessage: t(editor.unknownLabelMessage),
            }),
        [draft, t]
    );
    const issueNodeKey = draftIssues
        .map(({ nodeId }) => nodeId)
        .filter(Boolean)
        .join('|');
    const selection = useMemo<EditorSelection>(
        () => ({
            selectedId,
            issueNodeIds: new Set(issueNodeKey ? issueNodeKey.split('|') : []),
        }),
        [selectedId, issueNodeKey]
    );

    const handleSave = () => {
        try {
            const parsed = CustomTemplateSchema.parse(draft);
            if (editingDefault) {
                // Draft-until-save (FR-9): the override lands only on explicit save; assigned
                // documents then render the saved version (live propagation, clarification Q2).
                setDefaultOverride(parsed);
            } else {
                saveTemplate(parsed);
                onSaved?.(parsed);
            }
            onClose();
        } catch (error) {
            const fallback =
                error instanceof Error && error.message.length > 0 ? [error.message] : [];
            setSaveIssues(fallback);
        }
    };

    const requestClose = () => {
        if (isDirty) setDiscardConfirmOpen(true);
        else onClose();
    };

    const atNodeLimit = collectTemplateNodes(draft).length >= TEMPLATE_LIMITS.nodesPerTemplate;
    const editorModel = useMemo<EditorModel>(
        () => ({
            draftId: draft.id,
            systemId: draft.systemId,
            documentKind: draft.documentKind,
            bindings: listDocumentBindings(draft.systemId, draft.documentKind),
            coordinateListId: `template-coordinates-${draft.id}`,
            atNodeLimit,
        }),
        [draft.id, draft.systemId, draft.documentKind, atNodeLimit]
    );

    // Keyed by content so the context value changes only when a fill target actually changes.
    const fillTargetsKey = JSON.stringify(
        [...collectTemplateFields(draft).values()].map(({ id, type, label }) => [id, type, label])
    );
    const fillTargets = useMemo<readonly FillTarget[]>(
        () =>
            (JSON.parse(fillTargetsKey) as Array<[string, FillTarget['type'], string]>).map(
                ([id, type, label]) => ({ id, type, label })
            ),
        [fillTargetsKey]
    );
    const coordinatesKey = JSON.stringify(
        listTemplateNumericCoordinates(draft).map(({ coordinate, label }) => [coordinate, label])
    );
    const coordinateOptions = useMemo(
        () =>
            (JSON.parse(coordinatesKey) as Array<[string, string]>).map(([coordinate, label]) => (
                <option key={coordinate} value={coordinate}>
                    {label}
                </option>
            )),
        [coordinatesKey]
    );

    const kindOptions = listTemplateTargets()
        .filter((target) => target.systemId === draft.systemId)
        .map(({ kind }) => ({ kind, label: kindLabel(draft.systemId, kind) }));
    if (!kindOptions.some(({ kind }) => kind === draft.documentKind)) {
        kindOptions.push({ kind: draft.documentKind, label: draft.documentKind });
    }

    const selectedNode = selectedId ? findNode(draft, selectedId) : undefined;
    const selectedPosition = selectedId ? findNodePosition(draft, selectedId) : undefined;
    const canMoveUp = selectedPosition !== undefined && selectedPosition.index > 0;
    const canMoveDown =
        selectedPosition !== undefined &&
        selectedPosition.index < selectedPosition.siblings.length - 1;

    const areas: ReadonlyArray<{ id: EditorArea; label: string }> = [
        { id: 'page', label: t(editor.areaPage) },
        { id: 'outline', label: t(editor.areaOutline) },
        { id: 'settings', label: t(editor.areaSettings) },
    ];
    const paneClasses = (id: EditorArea) =>
        clsx('min-h-0 overflow-y-auto', area === id ? 'block' : 'hidden', 'md:block');
    const visibleIssues = [...draftIssues.map(({ message }) => message), ...saveIssues];
    const toolbarButton =
        'flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-textSecondary hover:bg-bgBase hover:text-textPrimary disabled:opacity-40';

    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open) requestClose();
            }}
        >
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content
                    ref={setContentElement}
                    className="fixed left-1/2 top-1/2 z-[9999] flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[110rem] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-bgSurface shadow-xl focus:outline-none"
                >
                    <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                        <Dialog.Title className="mr-auto min-w-0 truncate text-lg font-semibold text-textPrimary">
                            {draft.name.trim().length > 0 ? draft.name : t(editor.untitledName)}
                        </Dialog.Title>
                        <div
                            role="group"
                            aria-label={t(editor.modeLabel)}
                            className="flex overflow-hidden rounded border border-border"
                        >
                            {(['edit', 'preview'] as const).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={mode === value}
                                    onClick={() => setMode(value)}
                                    className={clsx(
                                        'px-3 py-1 text-sm',
                                        mode === value
                                            ? 'bg-editor text-white'
                                            : 'text-textSecondary hover:bg-bgBase'
                                    )}
                                >
                                    {value === 'edit' ? t(editor.modeEdit) : t(editor.modePreview)}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={undoChange}
                            disabled={mode !== 'edit' || !canUndo(history)}
                            aria-label={t(editor.undo)}
                            title={t(editor.undo)}
                            className={toolbarButton}
                        >
                            <Undo2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={redoChange}
                            disabled={mode !== 'edit' || !canRedo(history)}
                            aria-label={t(editor.redo)}
                            title={t(editor.redo)}
                            className={toolbarButton}
                        >
                            <Redo2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                    <Dialog.Description className="sr-only">{t(library.title)}</Dialog.Description>

                    {mode === 'edit' && (
                        <div className="border-b border-border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    value={draft.name}
                                    onChange={(event) => {
                                        const name = event.target.value;
                                        change((current) => ({ ...current, name }), {
                                            coalesceKey: 'template:name',
                                        });
                                    }}
                                    placeholder={t(editor.namePlaceholder)}
                                    aria-label={t(editor.name)}
                                    className={`${inputClasses} min-w-0 flex-1 font-medium`}
                                />
                                <select
                                    value={draft.documentKind}
                                    onChange={(event) => {
                                        const kind = event.target.value;
                                        change((current) => setDraftKind(current, kind));
                                    }}
                                    // A user type's pages always belong to that type.
                                    disabled={isUserKind(draft.documentKind)}
                                    aria-label={t(library.kind)}
                                    className={inputClasses}
                                >
                                    {kindOptions.map(({ kind, label }) => (
                                        <option key={kind} value={kind}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <input
                                value={draft.description ?? ''}
                                onChange={(event) => {
                                    const description = event.target.value;
                                    change((current) => describeDraft(current, description), {
                                        coalesceKey: 'template:description',
                                    });
                                }}
                                placeholder={t(editor.descriptionPlaceholder)}
                                aria-label={t(editor.descriptionLabel)}
                                className={`${inputClasses} mt-2 w-full`}
                            />
                        </div>
                    )}

                    <EditorModelContext.Provider value={editorModel}>
                        <EditorFillTargetsContext.Provider value={fillTargets}>
                            <EditorActionsContext.Provider value={actions}>
                                <EditorSelectionContext.Provider value={selection}>
                                    {mode === 'preview' ? (
                                        <div className="min-h-0 flex-1 overflow-y-auto bg-bgBase">
                                            <EditorPreview draft={draft} />
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                role="tablist"
                                                aria-label={t(editor.areaTabs)}
                                                className="flex border-b border-border md:hidden"
                                            >
                                                {areas.map(({ id, label }) => (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={area === id}
                                                        onClick={() => setArea(id)}
                                                        className={clsx(
                                                            'flex-1 px-3 py-2 text-sm',
                                                            area === id
                                                                ? 'border-b-2 border-editor font-medium text-textPrimary'
                                                                : 'text-textSecondary'
                                                        )}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)_20rem]">
                                                <section
                                                    aria-label={t(editor.areaOutline)}
                                                    className={clsx(
                                                        paneClasses('outline'),
                                                        'border-border p-2 md:border-r'
                                                    )}
                                                >
                                                    <h3 className="mb-1 hidden px-1 text-[11px] font-semibold uppercase tracking-wider text-textSecondary md:block">
                                                        {t(editor.areaOutline)}
                                                    </h3>
                                                    <OutlineTree nodes={draft.children} />
                                                </section>
                                                <section
                                                    aria-label={t(editor.areaPage)}
                                                    className={clsx(
                                                        paneClasses('page'),
                                                        'bg-bgBase'
                                                    )}
                                                >
                                                    <EditorPage draft={draft} />
                                                </section>
                                                <section
                                                    aria-label={t(editor.areaSettings)}
                                                    className={clsx(
                                                        paneClasses('settings'),
                                                        'space-y-4 border-border p-3 md:border-l'
                                                    )}
                                                >
                                                    <h3 className="hidden text-[11px] font-semibold uppercase tracking-wider text-textSecondary md:block">
                                                        {t(editor.areaSettings)}
                                                    </h3>
                                                    {selectedNode ? (
                                                        <ElementSettings
                                                            key={selectedNode.id}
                                                            actions={{
                                                                onMoveUp: canMoveUp
                                                                    ? () =>
                                                                          moveByCommand(
                                                                              selectedNode.id,
                                                                              'move-up'
                                                                          )
                                                                    : undefined,
                                                                onMoveDown: canMoveDown
                                                                    ? () =>
                                                                          moveByCommand(
                                                                              selectedNode.id,
                                                                              'move-down'
                                                                          )
                                                                    : undefined,
                                                                onDuplicate: () =>
                                                                    duplicate(selectedNode.id),
                                                                onRemove: () =>
                                                                    removeSelected(selectedNode.id),
                                                            }}
                                                            callbacks={callbacks}
                                                            node={selectedNode}
                                                            parentColumns={parentColumnsOf(
                                                                draft,
                                                                selectedNode.id
                                                            )}
                                                        />
                                                    ) : (
                                                        <p className="text-sm text-textSecondary">
                                                            {t(editor.selectPrompt)}
                                                        </p>
                                                    )}
                                                    <p className="text-xs leading-relaxed text-textSecondary">
                                                        {t(editor.shortcutsHint)}
                                                    </p>
                                                </section>
                                            </div>
                                        </>
                                    )}
                                </EditorSelectionContext.Provider>
                            </EditorActionsContext.Provider>
                        </EditorFillTargetsContext.Provider>
                    </EditorModelContext.Provider>
                    <datalist id={editorModel.coordinateListId}>{coordinateOptions}</datalist>

                    <div className="border-t border-border p-3">
                        <div role="alert" aria-live="polite">
                            {visibleIssues.length > 0 && (
                                <ul className="mb-3 max-h-24 space-y-1 overflow-y-auto text-xs text-error">
                                    {draftIssues.map(({ message, nodeId }, index) => (
                                        <li key={`draft-${index}`}>
                                            {nodeId ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMode('edit');
                                                        setArea('settings');
                                                        selectNode(nodeId, 'outline');
                                                    }}
                                                    className="text-left underline decoration-dotted"
                                                >
                                                    {message}
                                                </button>
                                            ) : (
                                                message
                                            )}
                                        </li>
                                    ))}
                                    {saveIssues.map((message, index) => (
                                        <li key={`save-${index}`}>{message}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <p className="sr-only" aria-live="polite" data-editor-announcer="">
                            {announcement}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={requestClose}
                                className="rounded border border-border bg-bgSurface px-4 py-2 text-sm font-medium text-textSecondary hover:bg-bgBase"
                            >
                                {t(editor.cancel)}
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={draftIssues.length > 0}
                                className="rounded border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40"
                            >
                                {t(editor.save)}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>

            <ConfirmDialog
                open={discardConfirmOpen}
                onOpenChange={setDiscardConfirmOpen}
                onConfirm={() => {
                    setDiscardConfirmOpen(false);
                    onClose();
                }}
                title={t(editor.removeConfirmTitle)}
                description={t(editor.removeConfirmDescription)}
                confirmLabel={t(editor.discard)}
                cancelLabel={t(editor.cancel)}
                variant="danger"
            />
        </Dialog.Root>
    );
}
