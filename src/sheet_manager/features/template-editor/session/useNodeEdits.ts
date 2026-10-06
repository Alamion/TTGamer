import { createContext, useContext } from 'react';

import type { TemplateField, TemplateNode } from '../../../types/template';
import { isTemplateField } from '../../../types/template';
import {
    addOption,
    addTableColumn,
    attachCatalog,
    changeFieldType,
    detachCatalog,
    type EditorDraft,
    findNode,
    findNodePosition,
    moveTableColumn,
    type NodeUpdates,
    removeOption,
    removeTableColumn,
    replaceNode,
    updateField,
    updateFill,
    updateNode,
    updateOption,
} from '../draft';
import type { GroupKind, ListKind } from '../elementKinds';
import type { ElementActions } from '../ElementSettings';
import { duplicateSelection, moveSelection, removeSelection } from '../operations/selection';
import { switchKind, switchSource } from '../operations/switches';
import { normalizeSelection } from '../selection';
import type { SeveralFieldCallbacks, SharedValue } from '../sharedSettings';
import { useEditorSession, useEditorState } from './context';
import type { EditorSession } from './store';

/** The edits a settings panel makes to one element (spec 025, D4). Stable for the session. */
export interface NodeEdits {
    onUpdate: (nodeId: string, updates: NodeUpdates) => void;
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
    onMoveTableColumn: (tableId: string, from: number, to: number) => void;
    /** Swaps a node for the one a new value source builds, keeping its id. */
    onReplace: (nodeId: string, next: TemplateNode) => void;
    /** Shows a group or list as another kind (spec 022, US6); the stored type changes. */
    onSwitchKind: (nodeId: string, kind: GroupKind | ListKind) => void;
}

/** A table about to drop its other columns, waiting for the author (spec 022, US6). */
export interface DropColumnsRequest {
    nodeId: string;
    kind: ListKind;
    columns: readonly string[];
}

export function createNodeEdits(
    session: EditorSession,
    confirmDropColumns: (request: DropColumnsRequest) => void
): NodeEdits {
    const edit = (update: (draft: EditorDraft) => EditorDraft, coalesceKey?: string) =>
        session.change(update, coalesceKey ? { coalesceKey } : undefined);
    return {
        onUpdate: (nodeId, updates) =>
            edit(
                (draft) => updateNode(draft, nodeId, updates),
                `${nodeId}:${Object.keys(updates).join(',')}`
            ),
        onFieldUpdate: (fieldId, updates) =>
            edit(
                (draft) => updateField(draft, fieldId, updates),
                `${fieldId}:${Object.keys(updates).join(',')}`
            ),
        onFieldTypeChange: (fieldId, type) =>
            edit((draft) => changeFieldType(draft, fieldId, type)),
        onAddOption: (fieldId) => edit((draft) => addOption(draft, fieldId)),
        onUpdateOption: (fieldId, optionId, label) =>
            edit(
                (draft) => updateOption(draft, fieldId, optionId, label),
                `${fieldId}:option:${optionId}`
            ),
        onRemoveOption: (fieldId, optionId) =>
            edit((draft) => removeOption(draft, fieldId, optionId)),
        onAttachCatalog: (fieldId, catalogId) =>
            edit((draft) => attachCatalog(draft, fieldId, catalogId)),
        onDetachCatalog: (fieldId) => edit((draft) => detachCatalog(draft, fieldId)),
        onUpdateFill: (fieldId, detailKey, rule) =>
            edit((draft) => updateFill(draft, fieldId, detailKey, rule)),
        onAddTableColumn: (tableId) => edit((draft) => addTableColumn(draft, tableId)),
        onRemoveTableColumn: (tableId, columnId) =>
            edit((draft) => removeTableColumn(draft, tableId, columnId)),
        onMoveTableColumn: (tableId, from, to) =>
            edit((draft) => moveTableColumn(draft, tableId, from, to)),
        onReplace: (nodeId, next) => session.run(switchSource(nodeId, next, session.stash)),
        onSwitchKind: (nodeId, kind) => {
            const node = findNode(session.draft(), nodeId);
            if (node?.type === 'table' && kind === 'entries' && node.columns.length > 1) {
                confirmDropColumns({
                    nodeId,
                    kind,
                    columns: node.columns.slice(1).map(({ label }) => label),
                });
            } else session.run(switchKind(nodeId, kind, session.stash));
        },
    };
}

export const NodeEditsContext = createContext<NodeEdits | null>(null);

export function useNodeEdits(): NodeEdits {
    const edits = useContext(NodeEditsContext);
    if (!edits) throw new Error('Settings panels must render inside NodeEditsContext');
    return edits;
}

/** The edits of the panel for several elements: shared settings and fields of one type. */
export interface SelectionEdits {
    fields: SeveralFieldCallbacks;
    /** A shared setting written to every selected element as one step (spec 023, US3). */
    onShared(key: string, value: SharedValue): void;
}

function writeShared(node: TemplateNode, key: string, value: SharedValue): TemplateNode {
    const next = { ...node } as Record<string, unknown>;
    if (value === undefined) delete next[key];
    else next[key] = value;
    return next as unknown as TemplateNode;
}

export function createSelectionEdits(session: EditorSession): SelectionEdits {
    const selected = () => normalizeSelection(session.draft(), session.selection().ids);
    const eachField = (
        update: (draft: EditorDraft, field: TemplateField) => EditorDraft,
        coalesce?: string
    ) => {
        const ids = selected();
        session.change(
            (current) =>
                ids.reduce((next, id) => {
                    const node = findNode(next, id);
                    return node && isTemplateField(node) ? update(next, node) : next;
                }, current),
            coalesce ? { coalesceKey: `multi:${ids.join(',')}:${coalesce}` } : undefined
        );
    };
    return {
        fields: {
            onUpdate: (updates) =>
                eachField(
                    (next, field) => updateField(next, field.id, updates),
                    Object.keys(updates).join(',')
                ),
            onChangeType: (type) =>
                eachField((next, field) => changeFieldType(next, field.id, type)),
            onUpdateEach: (update) =>
                eachField((next, field) => updateField(next, field.id, update(field))),
        },
        onShared: (key, value) => {
            const ids = selected();
            session.change(
                (current) =>
                    ids.reduce((next, id) => {
                        const node = findNode(next, id);
                        return node ? replaceNode(next, id, writeShared(node, key, value)) : next;
                    }, current),
                { coalesceKey: `multi:${ids.join(',')}:${key}` }
            );
        },
    };
}

export const SelectionEditsContext = createContext<SelectionEdits | null>(null);

export function useSelectionEdits(): SelectionEdits {
    const edits = useContext(SelectionEditsContext);
    if (!edits) throw new Error('Settings panels must render inside SelectionEditsContext');
    return edits;
}

/**
 * Move up, move down, duplicate, and remove on the selection. With one element (`soleId`), the
 * moves its place does not allow are left out, so their buttons are disabled.
 */
export function useSelectionActions(soleId: string | null): ElementActions {
    const session = useEditorSession();
    const place = useEditorState((state) => {
        if (!soleId) return 'many';
        const position = findNodePosition(state.history.present.draft, soleId);
        if (!position) return 'none';
        const first = position.index === 0;
        const last = position.index === position.siblings.length - 1;
        return first && last ? 'none' : first ? 'first' : last ? 'last' : 'middle';
    });
    const up = place === 'many' || place === 'middle' || place === 'last';
    const down = place === 'many' || place === 'middle' || place === 'first';
    return {
        onMoveUp: up ? () => session.run(moveSelection('move-up')) : undefined,
        onMoveDown: down ? () => session.run(moveSelection('move-down')) : undefined,
        onDuplicate: () => session.run(duplicateSelection),
        onRemove: () => session.run(removeSelection),
    };
}
