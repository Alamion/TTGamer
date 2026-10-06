import { createContext, useContext } from 'react';

import type { TemplateNode } from '../../types/template';
import type { OverlayPlacement } from '../sheet/declarative/editorOverlay';

/**
 * What the outline, the page frames, and the insertion slots may ask of the dialog. The value
 * is stable for the dialog's lifetime (callbacks read the latest draft from a ref), so frames
 * never re-render because an action changed.
 */
/** A plain click, Ctrl/⌘+click, or Shift+click (spec 023). */
export type SelectMode = 'only' | 'toggle' | 'range';

export interface EditorActions {
    /** `origin` decides which area scrolls to reveal the selection (the other one). */
    select(nodeId: string | null, origin?: 'page' | 'outline', mode?: SelectMode): void;
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
    selected: ReadonlySet<string>;
    /** The element a Shift range starts from and a paste goes after. */
    anchor: string | null;
    /** Nodes with at least one draft issue (marked in the outline and on the page). */
    issueNodeIds: ReadonlySet<string>;
}

export const EditorSelectionContext = createContext<EditorSelection>({
    selected: new Set(),
    anchor: null,
    issueNodeIds: new Set(),
});

export function useEditorSelection(): EditorSelection {
    return useContext(EditorSelectionContext);
}
