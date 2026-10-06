import { createContext, useContext } from 'react';
import { useStore } from 'zustand';

import type { TemplateNode } from '../../../types/template';
import type { OverlayPlacement } from '../../sheet/declarative/editorOverlay';
import type { EditorSession, EditorSessionState } from './store';

export const EditorSessionContext = createContext<EditorSession | null>(null);

/** The editing session of the dialog around the caller (spec 025, US2). */
export function useEditorSession(): EditorSession {
    const session = useContext(EditorSessionContext);
    if (!session) throw new Error('Template editor parts must render inside EditorSessionContext');
    return session;
}

/** A slice of the session state; the caller re-renders only when the slice changes. */
export function useEditorState<T>(selector: (state: EditorSessionState) => T): T {
    return useStore(useEditorSession().store, selector);
}

/** Nodes with at least one draft issue (marked in the outline and on the page). */
export const EditorIssueNodesContext = createContext<ReadonlySet<string>>(new Set());

/** One element's selection marks: selected, the anchor, and whether it has an issue. */
export function useNodeSelection(nodeId: string) {
    // One subscription per element: 0 not selected, 1 selected, 2 selected and the anchor.
    const mark = useEditorState(({ history: { present } }) =>
        present.selection.ids.includes(nodeId) ? (present.selection.anchor === nodeId ? 2 : 1) : 0
    );
    const hasIssue = useContext(EditorIssueNodesContext).has(nodeId);
    return { selected: mark > 0, anchor: mark === 2, hasIssue };
}

/** A plain click, Ctrl/⌘+click, or Shift+click (spec 023). */
export type SelectMode = 'only' | 'toggle' | 'range';

/**
 * What the outline, the page frames, and the insertion slots may ask of the editor. Stable for the
 * dialog's lifetime, so frames never re-render because an action changed.
 */
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
