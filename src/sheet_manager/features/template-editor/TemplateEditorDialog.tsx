import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { clsx } from 'clsx';
import { Keyboard, Redo2, Undo2 } from 'lucide-react';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ZodError } from 'zod';

import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { describeError, reportSheetIssue } from '../../diagnostics';
import { useDocumentStore } from '../../store/documentStore';
import { useDocumentTypeStore } from '../../store/documentTypeStore';
import { useTemplateStore } from '../../store/templateStore';
import { listDocumentBindings } from '../../systems/templateBindings';
import { isDefaultTemplateId } from '../../systems/view';
import {
    collectTemplateFields,
    collectTemplateNodes,
    type CustomTemplate,
    CustomTemplateSchema,
    isContainerNode,
    isTemplateField,
    TEMPLATE_LIMITS,
    type TemplateField,
    type TemplateNode,
} from '../../types/template';
import {
    listTemplateTargetGroups,
    parseTemplateTargetValue,
    templateTargetValue,
} from '../sheet/data/documentLabels';
import { type ListItemChange, listItemChangeReport } from '../sheet/data/listItemChanges';
import { listTemplateNumericCoordinates } from '../sheet/data/templateReferences';
import { planTemplateRetarget, type RetargetPlan } from '../sheet/data/templateRetarget';
import { type TrackerChange, trackerChangeReport } from '../sheet/data/trackerChanges';
import type { OverlayPlacement } from '../sheet/declarative/editorOverlay';
import {
    copySelection,
    parseCopied,
    pasteCopied,
    rememberCopied,
    rememberedCopy,
    serializeCopied,
} from './clipboard';
import {
    clipboardKey,
    commandById,
    type EditorCommandId,
    formatKeys,
    isApplePlatform,
} from './commands';
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
    type DraftIssue,
    type DraftIssueMessages,
    type DraftOpResult,
    duplicateNode,
    type EditorDraft,
    findNode,
    findNodePosition,
    insertAtPlacement,
    materializeColumns,
    moveNode,
    moveTableColumn,
    placeNode,
    removeNode,
    removeOption,
    removeTableColumn,
    replaceNode,
    setDraftTarget,
    updateField,
    updateFill,
    updateNode,
    updateOption,
} from './draft';
import {
    type EditorActions,
    EditorActionsContext,
    type EditorSelection,
    EditorSelectionContext,
    type SelectMode,
} from './editorActions';
import {
    EditorContextMenu,
    EditorMenuContext,
    type EditorMenuSource,
    type MenuCommand,
} from './EditorContextMenu';
import { EditorHelp } from './EditorHelp';
import {
    EditorCoordinatesContext,
    EditorFillTargetsContext,
    type EditorModel,
    EditorModelContext,
    type FillTarget,
} from './EditorModel';
import { EditorPage } from './EditorPage';
import { EditorPreview } from './EditorPreview';
import {
    type GroupKind,
    type KindChange,
    kindChangeReport,
    type KindStash,
    type ListKind,
    switchGroupKind,
    switchListKind,
} from './elementKinds';
import { type ElementEditorCallbacks, ElementSettings, nodeDisplayName } from './ElementSettings';
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
} from './history';
import {
    describeLocation,
    issueLocation,
    reportUncoveredIssues,
    useSchemaBackstop,
} from './issues';
import { generateDraftId } from './model/ids';
import { type MoveCommand, resolveMoveTarget } from './moveTargets';
import { duplicateNodes, moveEachByCommand, removeNodes } from './multiOps';
import { OutlineTree } from './OutlineTree';
import { PaneDivider } from './PaneDivider';
import {
    EMPTY_SELECTION,
    normalizeSelection,
    rangeSelection,
    selectOnly,
    toggleInSelection,
} from './selection';
import type { SettingsGroupId } from './settings/groupedSettings';
import {
    IssueGroupCountsContext,
    SettingsGroupStateContext,
    useSettingsGroupSession,
} from './settings/groupState';
import { inputClasses } from './settings/inputClasses';
import { droppedSettings, switchElement } from './settings/keepSettings';
import { settingDescription } from './settings/registry';
import { MultiSettings, type SeveralFieldCallbacks, writeShared } from './sharedSettings';
import { ShortcutList } from './ShortcutList';
import { type EditorShortcutHandlers, isTypingTarget, useEditorShortcuts } from './shortcuts';
import { EditorDragContext, useEditorDrag } from './useEditorDrag';
import { type Pane, PANE_LIMITS, usePaneWidths } from './usePaneWidths';

const editor = uiMessages.sheet.templates.editor;
const library = uiMessages.sheet.templates.library;

type EditorArea = 'page' | 'outline' | 'settings';
type EditorMode = 'edit' | 'preview';

export interface TemplateEditorDialogProps {
    base:
        | {
              kind: 'empty';
              documentKind?: string;
              systemId?: string;
              settingId?: string;
              name?: string;
          }
        | { kind: 'skeleton'; documentKind: string; template: CustomTemplate }
        | { kind: 'duplicate' | 'edit'; template: CustomTemplate };
    onClose: () => void;
    /** Called with the saved template (user templates only; e.g. to create a user type). */
    onSaved?: (template: CustomTemplate) => void;
    /** The caller owns the page's place (a new type's first page, a setting's page). */
    lockTarget?: boolean;
}

function initialDraft(base: TemplateEditorDialogProps['base']): EditorDraft {
    if (base.kind === 'empty') {
        const draft = createEmptyDraft(base.documentKind ?? 'character', base.systemId);
        return {
            ...draft,
            ...(base.name ? { name: base.name } : {}),
            ...(base.settingId ? { settingId: base.settingId } : {}),
        };
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

/** Whether an element of the node's container is pinned to a column (spans stop applying). */
function hasPinnedSiblings(draft: EditorDraft, nodeId: string): boolean {
    return (
        findNodePosition(draft, nodeId)?.siblings.some((node) => node.column !== undefined) ?? false
    );
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

export function TemplateEditorDialog({
    base,
    lockTarget = false,
    onClose,
    onSaved,
}: TemplateEditorDialogProps) {
    const { saveTemplate, setDefaultOverride } = useTemplateStore();
    const t = useCallback((descriptor: { message: string }) => translate(descriptor), []);
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    // Feature 004: editing a default template targets its override, never the custom library.
    const editingDefault =
        base.kind === 'edit' && isDefaultTemplateId(base.template.id, base.template.systemId);

    const [history, setHistory] = useState<EditorHistory>(() => createHistory(initialDraft(base)));
    const draft = history.present.draft;
    const selection = history.present.selection;
    const [mode, setMode] = useState<EditorMode>('edit');
    const [area, setArea] = useState<EditorArea>('page');
    const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    /** A save waiting for confirmation: a retarget (T-070) and/or list entry changes (spec 016). */
    const [pendingSave, setPendingSave] = useState<{
        template: CustomTemplate;
        plan?: RetargetPlan;
        lists: readonly ListItemChange[];
        trackers: readonly TrackerChange[];
        kinds: readonly KindChange[];
    } | null>(null);
    /** A switch from Table to Entries waiting for the author to drop the other columns. */
    const [pendingKind, setPendingKind] = useState<{
        nodeId: string;
        kind: ListKind;
        columns: readonly string[];
    } | null>(null);
    const kindStash = useRef<KindStash>(new Map());
    const plural = usePluralMessage();
    const [saveIssues, setSaveIssues] = useState<readonly DraftIssue[]>([]);
    const [announcement, setAnnouncement] = useState('');
    const [initialJson] = useState(() => JSON.stringify(draft));
    const isDirty = JSON.stringify(draft) !== initialJson;
    const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const [gridWidth, setGridWidth] = useState<number | undefined>(undefined);
    useEffect(() => {
        const measure = () => setGridWidth(gridRef.current?.clientWidth || undefined);
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [mode]);
    const {
        widths: paneWidths,
        setWidth: setPaneWidth,
        reset: resetPane,
        clamp: clampPane,
    } = usePaneWidths(gridWidth);
    // Only the CSS variable moves while a divider is dragged; the width is stored on release.
    const previewPane = useCallback(
        (pane: Pane, width: number) =>
            gridRef.current?.style.setProperty(`--${pane}`, `${width}px`),
        []
    );

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
                setSaveIssues([{ message }]);
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
        (nodeId: string | null, origin?: 'page' | 'outline', mode: SelectMode = 'only') => {
            const current = historyRef.current;
            const before = current.present.selection;
            const next =
                nodeId === null || mode === 'only'
                    ? selectOnly(nodeId)
                    : mode === 'toggle'
                      ? toggleInSelection(before, nodeId)
                      : rangeSelection(current.present.draft, before, nodeId);
            commit(select(current, next));
            if (mode !== 'only' && next.ids.length !== before.ids.length) {
                setAnnouncement(
                    plural(editor.selectedCount, next.ids.length, { count: next.ids.length })
                );
            }
            if (!nodeId || !next.ids.includes(nodeId)) return;
            if (origin === 'page') reveal(`[data-outline-row="${nodeId}"]`, 'nearest');
            if (origin === 'outline')
                reveal(`[data-editor-frame][data-node-id="${nodeId}"]`, 'center');
        },
        [commit, plural]
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
            change((draftNow) => removeNode(draftNow, nodeId), { selection: selectOnly(next) });
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
            if (copyId) commit(select(historyRef.current, selectOnly(copyId)));
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
                    selection: selectOnly(node.id),
                    announce: translate(editor.inserted, { label: nodeDisplayName(node) }),
                }),
            moveTo: (nodeId: string, placement: OverlayPlacement) =>
                applyOp((current) => placeNode(current, nodeId, placement), {
                    selection: selectOnly(nodeId),
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

    const getDraft = useCallback(() => historyRef.current.present.draft, []);
    const draggedWith = useCallback((nodeId: string) => {
        const { draft: current, selection: chosen } = historyRef.current.present;
        return chosen.ids.includes(nodeId) ? normalizeSelection(current, chosen.ids) : [nodeId];
    }, []);
    const nameOf = useCallback(
        (nodeIds: readonly string[]) =>
            nodeIds.length === 1
                ? labelIn(historyRef.current.present.draft, nodeIds[0]!)
                : plural(editor.dragCount, nodeIds.length, { count: nodeIds.length }),
        [plural]
    );
    const commitDrag = useCallback(
        (nodeIds: readonly string[], next: EditorDraft) => {
            const [first] = nodeIds;
            if (!first) return;
            const label = labelIn(historyRef.current.present.draft, first);
            commit(
                applyChange(historyRef.current, next, {
                    selection: { ids: [...nodeIds], anchor: nodeIds[nodeIds.length - 1]! },
                })
            );
            setSaveIssues([]);
            if (nodeIds.length > 1) {
                setAnnouncement(
                    plural(editor.movedMany, nodeIds.length, { count: nodeIds.length })
                );
                return;
            }
            const column = findNode(next, first)?.column;
            setAnnouncement(
                column
                    ? translate(editor.movedColumn, { label, column })
                    : translate(editor.moved, { label })
            );
        },
        [commit, plural]
    );
    const { view: dragView, drag } = useEditorDrag({
        getDraft,
        draggedWith,
        nameOf,
        onCommit: commitDrag,
    });
    const shownDraft = dragView?.preview ?? draft;

    /** Names the settings a switch dropped (spec 025, FR-002); switching back restores them. */
    const announceDropped = useCallback((dropped: readonly string[]) => {
        if (dropped.length === 0) return;
        const names = dropped.map((key) => {
            const label = settingDescription(key)?.label;
            return label ? translate(label) : key;
        });
        setAnnouncement(translate(editor.settingsDropped, { settings: names.join(', ') }));
    }, []);

    /** One undo step; settings the other kind lacks wait in the session stash. */
    const switchKind = useCallback(
        (nodeId: string, kind: GroupKind | ListKind) => {
            let dropped: readonly string[] = [];
            change((current) => {
                const node = findNode(current, nodeId);
                let next: TemplateNode | undefined;
                if (node?.type === 'section' || node?.type === 'group') {
                    next = switchGroupKind(node, kind as GroupKind, kindStash.current);
                } else if (node?.type === 'list' || node?.type === 'table') {
                    next = switchListKind(node, kind as ListKind, kindStash.current).node;
                }
                if (!node || !next) return current;
                dropped = droppedSettings(node, next);
                return replaceNode(current, nodeId, next);
            });
            announceDropped(dropped);
        },
        [announceDropped, change]
    );

    /** A source switch (spec 025, US1): carried settings stay, the others wait in the stash. */
    const replaceElement = useCallback(
        (nodeId: string, built: TemplateNode) => {
            let dropped: readonly string[] = [];
            change((current) => {
                const node = findNode(current, nodeId);
                if (!node) return current;
                const result = switchElement(node, built, kindStash.current);
                dropped = result.dropped;
                return replaceNode(current, nodeId, result.node);
            });
            announceDropped(dropped);
        },
        [announceDropped, change]
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
            onMoveTableColumn: (tableId, from, to) =>
                change((current) => moveTableColumn(current, tableId, from, to)),
            onReplace: replaceElement,
            onSwitchKind: (nodeId, kind) => {
                const node = findNode(historyRef.current.present.draft, nodeId);
                if (node?.type === 'table' && kind === 'entries' && node.columns.length > 1) {
                    setPendingKind({
                        nodeId,
                        kind,
                        columns: node.columns.slice(1).map(({ label }) => label),
                    });
                } else switchKind(nodeId, kind);
            },
        }),
        [applyOp, change, removeSelected, replaceElement, switchKind, setPendingKind]
    );

    /** A shared setting written to every selected element as one step (spec 023, US3). */
    const updateShared = useCallback(
        (key: string, value: Parameters<typeof writeShared>[2]) => {
            const ids = normalizeSelection(
                historyRef.current.present.draft,
                historyRef.current.present.selection.ids
            );
            change(
                (current) =>
                    ids.reduce((next, id) => {
                        const node = findNode(next, id);
                        return node ? replaceNode(next, id, writeShared(node, key, value)) : next;
                    }, current),
                { coalesceKey: `multi:${ids.join(',')}:${key}` }
            );
        },
        [change]
    );

    /** Settings of several fields of one type, written to each as one step (spec 023, US3). */
    const fieldCallbacks = useMemo<SeveralFieldCallbacks>(() => {
        const eachField = (
            update: (draftNow: EditorDraft, field: TemplateField) => EditorDraft,
            coalesce?: string
        ) => {
            const ids = normalizeSelection(
                historyRef.current.present.draft,
                historyRef.current.present.selection.ids
            );
            change(
                (current) =>
                    ids.reduce((next, id) => {
                        const node = findNode(next, id);
                        return node && isTemplateField(node) ? update(next, node) : next;
                    }, current),
                coalesce ? { coalesceKey: `multi:${ids.join(',')}:${coalesce}` } : undefined
            );
        };
        return {
            onUpdate: (updates) =>
                eachField(
                    (next, field) => updateField(next, field.id, updates),
                    Object.keys(updates).join(',')
                ),
            onChangeType: (type) =>
                eachField((next, field) => changeFieldType(next, field.id, type)),
            onUpdateEach: (update) =>
                eachField((next, field) => updateField(next, field.id, update(field))),
        };
    }, [change]);

    const undoChange = useCallback(() => commit(undo(historyRef.current)), [commit]);
    const redoChange = useCallback(() => commit(redo(historyRef.current)), [commit]);
    /**
     * Commands on the selection (spec 023): one element keeps today's single-element actions and
     * messages; several act together as one undo step.
     */
    const removeSelection = useCallback(() => {
        const current = historyRef.current;
        const { ids } = current.present.selection;
        if (ids.length <= 1) {
            if (ids[0]) removeSelected(ids[0]);
            return;
        }
        const removed = removeNodes(current.present.draft, ids);
        change(() => removed.draft, { selection: selectOnly(removed.next) });
        setAnnouncement(plural(editor.removedMany, removed.count, { count: removed.count }));
    }, [change, plural, removeSelected]);

    const duplicateSelection = useCallback(() => {
        const { ids } = historyRef.current.present.selection;
        if (ids.length <= 1) {
            if (ids[0]) duplicate(ids[0]);
            return;
        }
        let copies: string[] = [];
        const done = applyOp((current) => {
            const result = duplicateNodes(current, ids);
            if (result.ok) copies = result.ids;
            return result;
        });
        if (!done) return;
        commit(select(historyRef.current, { ids: copies, anchor: copies[copies.length - 1]! }));
        setAnnouncement(plural(editor.duplicatedMany, copies.length, { count: copies.length }));
    }, [applyOp, commit, duplicate, plural]);

    const moveSelection = useCallback(
        (command: MoveCommand) => {
            const { ids } = historyRef.current.present.selection;
            if (ids.length <= 1) {
                if (ids[0]) moveByCommand(ids[0], command);
                return;
            }
            let moved = 0;
            applyOp((current) => {
                const result = moveEachByCommand(current, ids, command);
                if (result.ok) moved = result.moved ?? 0;
                return result;
            });
            if (moved > 0) {
                setAnnouncement(plural(editor.movedMany, moved, { count: moved }));
            }
        },
        [applyOp, moveByCommand, plural]
    );

    const shortcutHandlers = useMemo<EditorShortcutHandlers>(() => {
        const move = (command: MoveCommand) => () => moveSelection(command);
        return {
            undo: undoChange,
            redo: redoChange,
            duplicate: duplicateSelection,
            delete: removeSelection,
            'move-up': move('move-up'),
            'move-down': move('move-down'),
            'move-out': move('move-out'),
            'move-in': move('move-in'),
            'column-prev': move('column-prev'),
            'column-next': move('column-next'),
            shortcuts: () => setShortcutsOpen(true),
        };
    }, [duplicateSelection, moveSelection, redoChange, removeSelection, undoChange]);
    useEditorShortcuts(contentElement, mode === 'edit' ? shortcutHandlers : {});

    /** Opens folded groups around a node, outermost first, then scrolls it into view. */
    const revealNode = useCallback((nodeId: string) => {
        const chain: string[] = [];
        const current = historyRef.current.present.draft;
        for (
            let parent = findNodePosition(current, nodeId)?.parentId ?? null;
            parent !== null;
            parent = findNodePosition(current, parent)?.parentId ?? null
        ) {
            chain.unshift(parent);
        }
        // The page renders the draft deferred: give it a moment before each level.
        const later = (run: () => void) => setTimeout(run, 16);
        const shown = () =>
            document.querySelector(`[data-editor-frame][data-node-id="${nodeId}"]`) !== null;
        const step = (index: number) => {
            if (index >= chain.length || shown()) {
                reveal(`[data-editor-frame][data-node-id="${nodeId}"]`, 'center');
                reveal(`[data-outline-row="${nodeId}"]`, 'nearest');
                return;
            }
            const frame = document.querySelector(
                `[data-editor-frame][data-node-id="${chain[index]}"]`
            );
            // A folded block's own header toggle, never a popup trigger (the "+" insert menus).
            const toggle = frame?.querySelector<HTMLElement>(
                'button[aria-expanded="false"]:not([aria-haspopup])'
            );
            if (toggle && toggle.closest('[data-editor-frame]') === frame) {
                // Opening the block must not select it: the page skips clicks while revealing.
                const page = toggle.closest('[data-editor-page]');
                page?.setAttribute('data-revealing', '');
                toggle.click();
                page?.removeAttribute('data-revealing');
            }
            later(() => step(index + 1));
        };
        later(() => step(0));
    }, []);

    /**
     * Copy, cut, and paste of elements (spec 023, research R2). Returns false when there is
     * nothing for the editor to do, so the browser keeps its own behavior.
     */
    const clipboardAction = useCallback(
        (action: 'copy' | 'cut' | 'paste', data: DataTransfer | null): boolean => {
            const current = historyRef.current;
            const { draft: present, selection: chosen } = current.present;
            if (action !== 'paste') {
                const copied = copySelection(present, chosen.ids);
                if (!copied) return false;
                rememberCopied(copied);
                const text = serializeCopied(copied);
                if (data) data.setData('text/plain', text);
                else void navigator.clipboard?.writeText(text).catch(() => undefined);
                if (action === 'cut') {
                    const removed = removeNodes(present, chosen.ids);
                    commit(
                        applyChange(current, removed.draft, {
                            selection: selectOnly(removed.next),
                        })
                    );
                    setSaveIssues([]);
                    setAnnouncement(
                        plural(editor.cutDone, removed.count, { count: removed.count })
                    );
                }
                return true;
            }
            const text = data?.getData('text/plain') ?? '';
            let copied = text ? undefined : rememberedCopy();
            if (text) {
                const parsed = parseCopied(text, present);
                if (!parsed.ok) {
                    if (parsed.stage === 'ignored') return false;
                    const message = t(
                        parsed.stage === 'version'
                            ? editor.clipboardNewer
                            : editor.clipboardUnreadable
                    );
                    reportSheetIssue({
                        code: 'template-clipboard-invalid',
                        message: 'Pasted elements were refused',
                        details: { stage: parsed.stage, error: parsed.error },
                    });
                    setSaveIssues([{ message }]);
                    setAnnouncement(message);
                    return true;
                }
                copied = parsed.copied;
            }
            if (!copied) return false;
            const result = pasteCopied(present, copied, chosen.ids);
            if (!result.ok) {
                const message = describeFailure(result);
                setSaveIssues([{ message }]);
                setAnnouncement(message);
                return true;
            }
            commit(
                applyChange(current, result.draft, {
                    selection: { ids: result.ids, anchor: result.ids[result.ids.length - 1]! },
                })
            );
            setSaveIssues([]);
            setAnnouncement(plural(editor.pasted, result.ids.length, { count: result.ids.length }));
            if (result.ids[0]) revealNode(result.ids[0]);
            return true;
        },
        [commit, describeFailure, plural, revealNode, t]
    );

    const draggingRef = useRef(false);
    useEffect(() => {
        draggingRef.current = dragView !== null;
    }, [dragView]);

    /** The element menu's entries for the current selection (spec 023, US4). */
    const menuSource = useMemo<EditorMenuSource>(() => {
        const apple = isApplePlatform();
        const keysOf = (id: EditorCommandId) =>
            formatKeys(commandById(id), { apple, clickWord: t(editor.keyClick) }).join(', ');
        const entry = (
            id: EditorCommandId,
            group: MenuCommand['group'],
            label: string,
            disabled: boolean,
            run: () => void
        ): MenuCommand => ({ id, group, label, keys: keysOf(id) || undefined, disabled, run });
        const canMove = (command: MoveCommand) => {
            const { draft: current, selection: chosen } = historyRef.current.present;
            if (chosen.ids.length === 0) return false;
            const result = moveEachByCommand(current, chosen.ids, command);
            return result.ok && (result.moved ?? 0) > 0;
        };
        return {
            prepare: (targetId, touch) => {
                const { selection: chosen } = historyRef.current.present;
                if (targetId === null) commit(select(historyRef.current, EMPTY_SELECTION));
                else if (!chosen.ids.includes(targetId) && !(touch && chosen.ids.length > 0)) {
                    commit(select(historyRef.current, selectOnly(targetId)));
                }
            },
            dragging: () => draggingRef.current,
            items: (targetId, touch) => {
                const hasCopy = rememberedCopy() !== undefined;
                const paste = () => clipboardAction('paste', null);
                if (targetId === null) {
                    return [entry('paste', 'edit', t(editor.cmdPasteAtEnd), !hasCopy, paste)];
                }
                const { selection: chosen } = historyRef.current.present;
                const inSelection = chosen.ids.includes(targetId);
                // A touch menu on an element outside the kept selection acts on that element.
                const focused = (run: () => void) =>
                    inSelection
                        ? run
                        : () => {
                              commit(select(historyRef.current, selectOnly(targetId)));
                              run();
                          };
                const canMoveHere = (command: MoveCommand) => {
                    if (inSelection) return canMove(command);
                    const result = moveEachByCommand(
                        historyRef.current.present.draft,
                        [targetId],
                        command
                    );
                    return result.ok && (result.moved ?? 0) > 0;
                };
                const move = (command: MoveCommand, label: string) =>
                    entry(
                        command,
                        'arrange',
                        label,
                        !canMoveHere(command),
                        focused(() => moveSelection(command))
                    );
                return [
                    entry(
                        'cut',
                        'edit',
                        t(editor.cmdCut),
                        false,
                        focused(() => clipboardAction('cut', null))
                    ),
                    entry(
                        'copy',
                        'edit',
                        t(editor.cmdCopy),
                        false,
                        focused(() => clipboardAction('copy', null))
                    ),
                    entry('paste', 'edit', t(editor.cmdPaste), !hasCopy, focused(paste)),
                    entry(
                        'duplicate',
                        'edit',
                        t(editor.duplicate),
                        false,
                        focused(duplicateSelection)
                    ),
                    ...(touch
                        ? [
                              entry(
                                  'add-to-selection',
                                  'selection',
                                  t(
                                      inSelection && chosen.ids.length > 1
                                          ? editor.cmdRemoveFromSelection
                                          : editor.cmdAddToSelection
                                  ),
                                  false,
                                  () => selectNode(targetId, undefined, 'toggle')
                              ),
                          ]
                        : []),
                    move('move-up', t(editor.moveUp)),
                    move('move-down', t(editor.moveDown)),
                    move('move-out', t(editor.moveOut)),
                    move('move-in', t(editor.moveIn)),
                    entry('delete', 'remove', t(editor.remove), false, focused(removeSelection)),
                ];
            },
        };
    }, [
        clipboardAction,
        commit,
        duplicateSelection,
        moveSelection,
        removeSelection,
        selectNode,
        t,
    ]);

    useEffect(() => {
        if (!contentElement || mode !== 'edit') return;
        const textSelected = () => {
            const selected = window.getSelection?.();
            return Boolean(selected && !selected.isCollapsed && selected.toString());
        };
        // Safari sends no clipboard events without a text selection: the key acts instead.
        let pending: 'copy' | 'cut' | 'paste' | null = null;
        const onKeyDown = (event: KeyboardEvent) => {
            const action = clipboardKey(event);
            if (!action || isTypingTarget(event.target) || textSelected()) return;
            pending = action;
            setTimeout(() => {
                if (pending !== action) return;
                pending = null;
                clipboardAction(action, null);
            }, 0);
        };
        const onClipboard = (event: ClipboardEvent) => {
            pending = null;
            if (isTypingTarget(event.target) || textSelected()) return;
            const action = event.type as 'copy' | 'cut' | 'paste';
            if (clipboardAction(action, event.clipboardData)) event.preventDefault();
        };
        contentElement.addEventListener('keydown', onKeyDown);
        for (const type of ['copy', 'cut', 'paste']) {
            contentElement.addEventListener(type, onClipboard as EventListener);
        }
        return () => {
            contentElement.removeEventListener('keydown', onKeyDown);
            for (const type of ['copy', 'cut', 'paste']) {
                contentElement.removeEventListener(type, onClipboard as EventListener);
            }
        };
    }, [clipboardAction, contentElement, mode]);

    const issueMessages = useMemo<DraftIssueMessages>(
        () => ({
            emptyName: t(editor.emptyName),
            emptyLabel: t(editor.emptyLabel),
            duplicateId: t(editor.duplicateId),
            invalidKey: t(editor.invalidKey),
            limitReached: t(editor.limitReached),
            invalidBounds: t(editor.invalidBounds),
            unknownCoordinate: t(editor.unknownCoordinate),
            circularDependency: t(editor.circularDependency),
            unknownBinding: t(editor.unknownBinding),
            unknownCatalog: t(editor.unknownCatalog),
            unknownFillTarget: t(editor.unknownFillTarget),
            listCatalogUnnamed: t(editor.listCatalogNeedsNames),
            unknownLabelMessage: t(editor.unknownLabelMessage),
            invalidDocsLink: t(editor.invalidDocsLink),
            referenceTargetUnavailable: t(editor.referenceTargetUnavailable),
            trackerLengthEmpty: t(uiMessages.sheet.templates.tracker.issueLengthEmpty),
            trackerCovers: t(uiMessages.sheet.templates.tracker.issueCovers),
        }),
        [t]
    );
    const specificIssues = useMemo(
        () => collectDraftIssues(draft, issueMessages),
        [draft, issueMessages]
    );
    const backstopIssues = useSchemaBackstop(draft, specificIssues);
    const draftIssues = useMemo(
        () => [...specificIssues, ...backstopIssues],
        [specificIssues, backstopIssues]
    );
    const issueGroupsKey = draftIssues
        .filter(({ nodeId, setting }) => nodeId && setting)
        .map(({ nodeId, setting }) => `${nodeId}\u0000${setting!.group}`)
        .join('\u0001');
    const issueGroupCounts = useMemo(() => {
        const counts = new Map<string, Partial<Record<SettingsGroupId, number>>>();
        for (const entry of issueGroupsKey ? issueGroupsKey.split('\u0001') : []) {
            const [nodeId, group] = entry.split('\u0000') as [string, SettingsGroupId];
            const current = counts.get(nodeId) ?? {};
            current[group] = (current[group] ?? 0) + 1;
            counts.set(nodeId, current);
        }
        return counts;
    }, [issueGroupsKey]);
    const groupSession = useSettingsGroupSession();
    const { setOpen: openGroup } = groupSession;

    /** Selects the issue's element, opens its group, and focuses the setting (spec 022, R3). */
    const goToIssue = useCallback(
        (issue: DraftIssue) => {
            const { nodeId, setting } = issue;
            if (!nodeId) return;
            setMode('edit');
            setArea('settings');
            selectNode(nodeId, 'outline');
            reveal(`[data-outline-row="${nodeId}"]`, 'nearest');
            if (!setting) return;
            openGroup(setting.group, true);
            const focus = () => {
                const target = document.querySelector<HTMLElement>(
                    `[data-settings-for="${nodeId}"] [data-setting="${setting.key}"]`
                );
                if (!target) return;
                for (let details = target.closest('details'); details;) {
                    details.open = true;
                    details = details.parentElement?.closest('details') ?? null;
                }
                target.focus();
                target.scrollIntoView?.({ block: 'nearest' });
            };
            // The settings remount for the new selection first.
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(focus);
            } else setTimeout(focus, 0);
        },
        [openGroup, selectNode]
    );
    const issueNodeKey = draftIssues
        .map(({ nodeId }) => nodeId)
        .filter(Boolean)
        .join('|');
    const selectedKey = selection.ids.join('|');
    const selectionAnchor = selection.anchor;
    const selectionContext = useMemo<EditorSelection>(
        () => ({
            selected: new Set(selectedKey ? selectedKey.split('|') : []),
            anchor: selectionAnchor,
            issueNodeIds: new Set(issueNodeKey ? issueNodeKey.split('|') : []),
        }),
        [selectedKey, selectionAnchor, issueNodeKey]
    );

    const saveUserTemplate = (template: CustomTemplate, plan: RetargetPlan) => {
        saveTemplate(template);
        const types = useDocumentTypeStore.getState();
        for (const setting of plan.settings) types.saveSetting(setting);
        for (const type of plan.types) types.saveType(type);
        const { updateDocumentMetadata } = useDocumentStore.getState();
        for (const id of plan.documentIds) updateDocumentMetadata(id, { templateId: undefined });
        onSaved?.(template);
        onClose();
    };

    const saveDefault = (template: CustomTemplate) => {
        // Draft-until-save (FR-9): the override lands only on explicit save; assigned
        // documents then render the saved version (live propagation, clarification Q2).
        setDefaultOverride(template);
        onClose();
    };

    const handleSave = () => {
        try {
            const parsed = CustomTemplateSchema.parse(draft);
            // Entries a changed list stops showing are confirmed first; nothing is deleted.
            const lists = listItemChangeReport(
                base.kind === 'edit' ? base.template : undefined,
                parsed,
                useDocumentStore.getState().documents
            );
            // Tracker marks, notes, and copies a save stops showing (spec 018, FR-026).
            const trackers = trackerChangeReport(
                base.kind === 'edit' ? base.template : undefined,
                parsed,
                useDocumentStore.getState().documents
            );
            // Lists and tables switched to the other kind stop showing stored values (spec 022).
            const kinds = kindChangeReport(
                base.kind === 'edit' ? base.template : undefined,
                parsed,
                useDocumentStore.getState().documents
            );
            const asks = lists.length > 0 || trackers.length > 0 || kinds.length > 0;
            if (editingDefault) {
                if (asks) setPendingSave({ template: parsed, lists, trackers, kinds });
                else saveDefault(parsed);
                return;
            }
            // A page moved to another type or setting (T-070) takes its assignments along.
            const { settings, types } = useDocumentTypeStore.getState();
            const plan = planTemplateRetarget(parsed, {
                documents: useDocumentStore.getState().documents,
                settings,
                types,
                templates: useTemplateStore.getState().templates,
            });
            if (plan.documentIds.length > 0 || asks) {
                setPendingSave({ template: parsed, plan, lists, trackers, kinds });
            } else saveUserTemplate(parsed, plan);
        } catch (error) {
            // Raw schema text never reaches the author (spec 022, FR-019): each problem is
            // mapped to its element and setting, and rules no check covers are reported.
            if (error instanceof ZodError) {
                reportUncoveredIssues(draft, specificIssues);
                const mapped = error.issues.map((issue) =>
                    describeLocation(draft, issueLocation(draft, issue.path))
                );
                setSaveIssues(
                    mapped.filter(
                        (issue, index) =>
                            mapped.findIndex(({ message }) => message === issue.message) === index
                    )
                );
            } else {
                reportSheetIssue({
                    code: 'template-draft-invalid',
                    message: 'Saving the template failed',
                    details: { error: describeError(error) },
                });
                setSaveIssues([describeLocation(draft, {})]);
            }
        }
    };

    const trackerText = uiMessages.sheet.templates.tracker;
    const pendingSaveDescription = ({
        plan,
        lists,
        trackers,
        kinds,
    }: {
        plan?: RetargetPlan;
        lists: readonly ListItemChange[];
        trackers: readonly TrackerChange[];
        kinds: readonly KindChange[];
    }): string =>
        [
            ...kinds.map(({ title, kind }) =>
                translate(editor.kindChangeSaveWarning, {
                    title,
                    kind: t(kind === 'table' ? editor.kindTable : editor.kindEntries),
                })
            ),
            ...lists.flatMap(({ title, documents, lostValues, hiddenNames }) => [
                ...(lostValues > 0
                    ? [
                          plural(editor.listChangeValues, lostValues, {
                              title,
                              documents: plural(editor.listChangeSheets, documents),
                          }),
                      ]
                    : []),
                ...(hiddenNames > 0
                    ? [plural(editor.listChangeNames, hiddenNames, { title })]
                    : []),
            ]),
            ...(lists.length > 0 ? [t(editor.listChangeNote)] : []),
            ...trackers.flatMap(({ title, documents, lostMarks, lostTexts, lostCopies }) => {
                const where = { title, documents: plural(editor.listChangeSheets, documents) };
                return [
                    ...(lostMarks > 0 ? [plural(trackerText.changeMarks, lostMarks, where)] : []),
                    ...(lostTexts > 0 ? [plural(trackerText.changeTexts, lostTexts, where)] : []),
                    ...(lostCopies > 0
                        ? [plural(trackerText.changeCopies, lostCopies, where)]
                        : []),
                ];
            }),
            ...(trackers.length > 0 ? [t(trackerText.changeNote)] : []),
            ...(plan && plan.documentIds.length > 0
                ? [plural(editor.retargetDescription, plan.documentIds.length)]
                : []),
        ].join('\n');

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
            settingId: draft.settingId,
            bindings: listDocumentBindings(draft.systemId, draft.documentKind),
            coordinateListId: `template-coordinates-${draft.id}`,
            atNodeLimit,
        }),
        [draft.id, draft.systemId, draft.documentKind, draft.settingId, atNodeLimit]
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
    const coordinateSet = useMemo(
        () =>
            new Set(
                (JSON.parse(coordinatesKey) as Array<[string, string]>).map(
                    ([coordinate]) => coordinate
                )
            ),
        [coordinatesKey]
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

    const targetGroups = listTemplateTargetGroups();
    const targetValue = templateTargetValue(draft);
    const targetKnown = targetGroups.some(({ options }) =>
        options.some(({ value }) => value === targetValue)
    );
    const targetFixed = editingDefault || lockTarget;

    // A group selected with its own element counts once (the group carries it).
    const effectiveIds =
        selection.ids.length > 1 ? normalizeSelection(draft, selection.ids) : selection.ids;
    const soleId = effectiveIds.length === 1 ? effectiveIds[0]! : null;
    const selectedNode = soleId ? findNode(draft, soleId) : undefined;
    const selectedNodes =
        effectiveIds.length > 1 ? effectiveIds.map((id) => findNode(draft, id)!) : [];
    const selectedPosition = soleId ? findNodePosition(draft, soleId) : undefined;
    const canMoveUp = selectedPosition !== undefined && selectedPosition.index > 0;
    const canMoveDown =
        selectedPosition !== undefined &&
        selectedPosition.index < selectedPosition.siblings.length - 1;

    const paneStyle = {
        '--outline': `${paneWidths.outline}px`,
        '--settings': `${paneWidths.settings}px`,
    } as CSSProperties;
    const dividerProps = (pane: Pane) => ({
        value: paneWidths[pane],
        min: PANE_LIMITS[pane].min,
        max: PANE_LIMITS[pane].max,
        clamp: (width: number) => clampPane(pane, width),
        onPreview: (width: number) => previewPane(pane, width),
        onChange: (width: number) => setPaneWidth(pane, width),
        onReset: () => resetPane(pane),
    });

    const areas: ReadonlyArray<{ id: EditorArea; label: string }> = [
        { id: 'page', label: t(editor.areaPage) },
        { id: 'outline', label: t(editor.areaOutline) },
        { id: 'settings', label: t(editor.areaSettings) },
    ];
    const paneClasses = (id: EditorArea) =>
        clsx('min-h-0 overflow-y-auto', area === id ? 'block' : 'hidden', 'md:block');
    const visibleIssues = [...draftIssues, ...saveIssues];
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
                    onEscapeKeyDown={(event) => {
                        // Escape clears a selection first; with none it closes (research R9).
                        const current = historyRef.current;
                        if (
                            mode !== 'edit' ||
                            current.present.selection.ids.length === 0 ||
                            isTypingTarget(event.target)
                        ) {
                            return;
                        }
                        event.preventDefault();
                        commit(select(current, EMPTY_SELECTION));
                    }}
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
                                            ? 'bg-primary-muted text-white'
                                            : 'text-textSecondary hover:bg-bgBase'
                                    )}
                                >
                                    {value === 'edit' ? t(editor.modeEdit) : t(editor.modePreview)}
                                </button>
                            ))}
                        </div>
                        <EditorHelp topic="overview" about={t(editor.guide)} />
                        <button
                            type="button"
                            onClick={() => setShortcutsOpen(true)}
                            aria-label={t(editor.cmdShortcuts)}
                            aria-keyshortcuts="?"
                            title={t(editor.cmdShortcuts)}
                            className={toolbarButton}
                        >
                            <Keyboard className="h-4 w-4" aria-hidden="true" />
                        </button>
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
                                    value={targetValue}
                                    onChange={(event) => {
                                        const target = parseTemplateTargetValue(event.target.value);
                                        if (target) {
                                            change((current) => setDraftTarget(current, target));
                                        }
                                    }}
                                    disabled={targetFixed}
                                    title={targetFixed ? t(editor.targetLocked) : undefined}
                                    aria-label={t(editor.target)}
                                    className={`${inputClasses} max-w-full`}
                                >
                                    {!targetKnown && (
                                        <option value={targetValue}>{draft.documentKind}</option>
                                    )}
                                    {targetGroups.map((group) => (
                                        <optgroup key={group.key} label={group.label}>
                                            {group.options.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <EditorHelp topic="movingPage" about={t(editor.target)} />
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

                    <EditorDragContext.Provider value={drag}>
                        <EditorModelContext.Provider value={editorModel}>
                            <EditorCoordinatesContext.Provider value={coordinateSet}>
                                <SettingsGroupStateContext.Provider value={groupSession}>
                                    <IssueGroupCountsContext.Provider value={issueGroupCounts}>
                                        <EditorFillTargetsContext.Provider value={fillTargets}>
                                            <EditorActionsContext.Provider value={actions}>
                                                <EditorSelectionContext.Provider
                                                    value={selectionContext}
                                                >
                                                    <EditorMenuContext.Provider value={menuSource}>
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
                                                                            aria-selected={
                                                                                area === id
                                                                            }
                                                                            onClick={() =>
                                                                                setArea(id)
                                                                            }
                                                                            className={clsx(
                                                                                'flex-1 px-3 py-2 text-sm',
                                                                                area === id
                                                                                    ? 'border-b-2 border-primary font-medium text-textPrimary'
                                                                                    : 'text-textSecondary'
                                                                            )}
                                                                        >
                                                                            {label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div
                                                                    ref={gridRef}
                                                                    style={paneStyle}
                                                                    className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[var(--outline)_6px_minmax(22.5rem,1fr)_6px_var(--settings)]"
                                                                >
                                                                    <section
                                                                        aria-label={t(
                                                                            editor.areaOutline
                                                                        )}
                                                                        data-editor-scroll="outline"
                                                                        className={clsx(
                                                                            paneClasses('outline'),
                                                                            // Deep rows truncate their names; a drag must not scroll sideways.
                                                                            'overflow-x-hidden p-2'
                                                                        )}
                                                                    >
                                                                        <h3 className="mb-1 hidden px-1 text-[11px] font-semibold uppercase tracking-wider text-textSecondary md:block">
                                                                            {t(editor.areaOutline)}
                                                                        </h3>
                                                                        <EditorContextMenu surface="outline">
                                                                            <OutlineTree
                                                                                nodes={
                                                                                    shownDraft.children
                                                                                }
                                                                            />
                                                                        </EditorContextMenu>
                                                                    </section>
                                                                    <PaneDivider
                                                                        label={t(
                                                                            editor.resizeOutline
                                                                        )}
                                                                        {...dividerProps('outline')}
                                                                    />
                                                                    <section
                                                                        aria-label={t(
                                                                            editor.areaPage
                                                                        )}
                                                                        data-editor-scroll="page"
                                                                        className={clsx(
                                                                            paneClasses('page'),
                                                                            'bg-bgBase'
                                                                        )}
                                                                    >
                                                                        <EditorContextMenu surface="page">
                                                                            <EditorPage
                                                                                draft={shownDraft}
                                                                            />
                                                                        </EditorContextMenu>
                                                                    </section>
                                                                    <PaneDivider
                                                                        label={t(
                                                                            editor.resizeSettings
                                                                        )}
                                                                        invert
                                                                        {...dividerProps(
                                                                            'settings'
                                                                        )}
                                                                    />
                                                                    <section
                                                                        aria-label={t(
                                                                            editor.areaSettings
                                                                        )}
                                                                        className={clsx(
                                                                            paneClasses('settings'),
                                                                            'space-y-4 p-3'
                                                                        )}
                                                                    >
                                                                        <h3 className="hidden text-[11px] font-semibold uppercase tracking-wider text-textSecondary md:block">
                                                                            {t(editor.areaSettings)}
                                                                        </h3>
                                                                        {selectedNodes.length >
                                                                        1 ? (
                                                                            <MultiSettings
                                                                                actions={{
                                                                                    onMoveUp: () =>
                                                                                        moveSelection(
                                                                                            'move-up'
                                                                                        ),
                                                                                    onMoveDown:
                                                                                        () =>
                                                                                            moveSelection(
                                                                                                'move-down'
                                                                                            ),
                                                                                    onDuplicate:
                                                                                        duplicateSelection,
                                                                                    onRemove:
                                                                                        removeSelection,
                                                                                }}
                                                                                nodes={
                                                                                    selectedNodes
                                                                                }
                                                                                fieldCallbacks={
                                                                                    fieldCallbacks
                                                                                }
                                                                                onShared={
                                                                                    updateShared
                                                                                }
                                                                                onOpen={(nodeId) =>
                                                                                    selectNode(
                                                                                        nodeId,
                                                                                        'outline'
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : selectedNode ? (
                                                                            <ElementSettings
                                                                                key={
                                                                                    selectedNode.id
                                                                                }
                                                                                actions={{
                                                                                    onMoveUp:
                                                                                        canMoveUp
                                                                                            ? () =>
                                                                                                  moveByCommand(
                                                                                                      selectedNode.id,
                                                                                                      'move-up'
                                                                                                  )
                                                                                            : undefined,
                                                                                    onMoveDown:
                                                                                        canMoveDown
                                                                                            ? () =>
                                                                                                  moveByCommand(
                                                                                                      selectedNode.id,
                                                                                                      'move-down'
                                                                                                  )
                                                                                            : undefined,
                                                                                    onDuplicate:
                                                                                        () =>
                                                                                            duplicate(
                                                                                                selectedNode.id
                                                                                            ),
                                                                                    onRemove: () =>
                                                                                        removeSelected(
                                                                                            selectedNode.id
                                                                                        ),
                                                                                }}
                                                                                callbacks={
                                                                                    callbacks
                                                                                }
                                                                                node={selectedNode}
                                                                                parentColumns={parentColumnsOf(
                                                                                    draft,
                                                                                    selectedNode.id
                                                                                )}
                                                                                pinnedSiblings={hasPinnedSiblings(
                                                                                    draft,
                                                                                    selectedNode.id
                                                                                )}
                                                                            />
                                                                        ) : (
                                                                            <p className="text-sm text-textSecondary">
                                                                                {t(
                                                                                    editor.selectPrompt
                                                                                )}
                                                                            </p>
                                                                        )}
                                                                    </section>
                                                                </div>
                                                            </>
                                                        )}
                                                    </EditorMenuContext.Provider>
                                                </EditorSelectionContext.Provider>
                                            </EditorActionsContext.Provider>
                                        </EditorFillTargetsContext.Provider>
                                    </IssueGroupCountsContext.Provider>
                                </SettingsGroupStateContext.Provider>
                            </EditorCoordinatesContext.Provider>
                        </EditorModelContext.Provider>
                    </EditorDragContext.Provider>
                    <datalist id={editorModel.coordinateListId}>{coordinateOptions}</datalist>

                    <div className="border-t border-border p-3">
                        <div role="alert" aria-live="polite">
                            {visibleIssues.length > 0 && (
                                <ul className="mb-3 max-h-24 space-y-1 overflow-y-auto text-xs text-error">
                                    {visibleIssues.map((issue, index) => (
                                        <li key={index}>
                                            {issue.nodeId ? (
                                                <button
                                                    type="button"
                                                    onClick={() => goToIssue(issue)}
                                                    className="text-left underline decoration-dotted"
                                                >
                                                    {issue.message}
                                                </button>
                                            ) : (
                                                issue.message
                                            )}
                                        </li>
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
                                disabled={specificIssues.length > 0}
                                className="rounded border border-transparent bg-primary-muted px-4 py-2 text-sm font-medium text-white hover:bg-primary disabled:opacity-40"
                            >
                                {t(editor.save)}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>

            <ShortcutList open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
            <ConfirmDialog
                open={pendingSave !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingSave(null);
                }}
                onConfirm={() => {
                    if (pendingSave?.plan) saveUserTemplate(pendingSave.template, pendingSave.plan);
                    else if (pendingSave) saveDefault(pendingSave.template);
                    setPendingSave(null);
                }}
                title={t(
                    pendingSave?.kinds.length
                        ? editor.kindChangeTitle
                        : pendingSave?.lists.length
                          ? editor.listChangeTitle
                          : pendingSave?.trackers.length
                            ? trackerText.changeTitle
                            : editor.retargetTitle
                )}
                description={pendingSave ? pendingSaveDescription(pendingSave) : ''}
                confirmLabel={t(
                    pendingSave?.lists.length ||
                        pendingSave?.trackers.length ||
                        pendingSave?.kinds.length
                        ? editor.listChangeConfirm
                        : editor.retargetConfirm
                )}
                cancelLabel={t(editor.cancel)}
            />
            <ConfirmDialog
                open={pendingKind !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingKind(null);
                }}
                onConfirm={() => {
                    if (pendingKind) switchKind(pendingKind.nodeId, pendingKind.kind);
                    setPendingKind(null);
                }}
                title={t(editor.dropColumnsTitle)}
                description={translate(editor.dropColumnsConfirm, {
                    columns: (pendingKind?.columns ?? []).map((label) => `“${label}”`).join(', '),
                })}
                confirmLabel={t(editor.dropColumnsButton)}
                cancelLabel={t(editor.cancel)}
                variant="danger"
            />
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
