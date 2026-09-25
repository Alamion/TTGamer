import { createContext, useContext } from 'react';

import type { OverlayPlacement } from '../../../features/sheet/declarative/editorOverlay';
import type { TemplateNode } from '../../../types/template';

export const NODE_MIME = 'application/x-ttgamer-template-node';

/**
 * What the outline, the page frames, and the insertion slots may ask of the dialog. The value
 * is stable for the dialog's lifetime (callbacks read the latest draft from a ref), so frames
 * never re-render because an action changed.
 */
export interface EditorActions {
    /** `origin` decides which area scrolls to reveal the selection (the other one). */
    select(nodeId: string | null, origin?: 'page' | 'outline'): void;
    /** Inserts a new node before `placement.index` (in `placement.column` when stacked). */
    insertAt(placement: OverlayPlacement, node: TemplateNode): void;
    /** Moves an existing node before `placement.index`; the column follows the placement. */
    moveTo(nodeId: string, placement: OverlayPlacement): void;
}

export const EditorActionsContext = createContext<EditorActions | null>(null);

export function useEditorActions(): EditorActions {
    const actions = useContext(EditorActionsContext);
    if (!actions) throw new Error('Template editor parts must render inside EditorActionsContext');
    return actions;
}

export interface EditorSelection {
    selectedId: string | null;
    /** Nodes with at least one draft issue (marked in the outline and on the page). */
    issueNodeIds: ReadonlySet<string>;
}

export const EditorSelectionContext = createContext<EditorSelection>({
    selectedId: null,
    issueNodeIds: new Set(),
});

export function useEditorSelection(): EditorSelection {
    return useContext(EditorSelectionContext);
}

/** Reads the dragged node id, or `undefined` when the drag carries no template node. */
export function draggedNodeId(event: { dataTransfer: DataTransfer | null }): string | undefined {
    const id = event.dataTransfer?.getData(NODE_MIME);
    return id ? id : undefined;
}

export function carriesNode(event: { dataTransfer: DataTransfer | null }): boolean {
    return event.dataTransfer?.types.includes(NODE_MIME) ?? false;
}
