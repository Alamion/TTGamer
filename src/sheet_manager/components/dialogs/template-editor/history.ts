import type { EditorDraft } from './draft';

export interface EditorSnapshot {
    draft: EditorDraft;
    selectedId: string | null;
}

export interface EditorHistory {
    past: readonly EditorSnapshot[];
    present: EditorSnapshot;
    future: readonly EditorSnapshot[];
    /** The last change's coalesce key and time; a same-key change inside the window merges. */
    lastCoalesce?: { key: string; at: number };
}

export interface DraftChangeMeta {
    /** `<nodeId>:<property>` — consecutive edits of one property become one undo step. */
    coalesceKey?: string;
    /** Selection to record with the new state; defaults to the current selection. */
    selectedId?: string | null;
}

export const HISTORY_LIMIT = 100;
export const COALESCE_WINDOW_MS = 800;

export function createHistory(draft: EditorDraft, selectedId: string | null = null): EditorHistory {
    return { past: [], present: { draft, selectedId }, future: [] };
}

/**
 * Records a new draft. Snapshots share untouched nodes with their neighbours (the tree ops use
 * structural sharing), so keeping a hundred of them costs only the changed paths.
 */
export function applyChange(
    history: EditorHistory,
    draft: EditorDraft,
    meta: DraftChangeMeta = {},
    now: number = Date.now()
): EditorHistory {
    const selectedId = meta.selectedId === undefined ? history.present.selectedId : meta.selectedId;
    if (draft === history.present.draft && selectedId === history.present.selectedId) {
        return history;
    }
    const next: EditorSnapshot = { draft, selectedId };
    const coalesce =
        meta.coalesceKey !== undefined &&
        history.lastCoalesce?.key === meta.coalesceKey &&
        now - history.lastCoalesce.at <= COALESCE_WINDOW_MS;
    const lastCoalesce = meta.coalesceKey ? { key: meta.coalesceKey, at: now } : undefined;
    if (coalesce) return { ...history, present: next, future: [], lastCoalesce };
    const past = [...history.past, history.present];
    if (past.length > HISTORY_LIMIT) past.splice(0, past.length - HISTORY_LIMIT);
    return { past, present: next, future: [], lastCoalesce };
}

/** Changes the selection without adding an undo step. */
export function select(history: EditorHistory, selectedId: string | null): EditorHistory {
    if (history.present.selectedId === selectedId) return history;
    return { ...history, present: { ...history.present, selectedId }, lastCoalesce: undefined };
}

export function canUndo(history: EditorHistory): boolean {
    return history.past.length > 0;
}

export function canRedo(history: EditorHistory): boolean {
    return history.future.length > 0;
}

export function undo(history: EditorHistory): EditorHistory {
    const previous = history.past[history.past.length - 1];
    if (!previous) return history;
    return {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
    };
}

export function redo(history: EditorHistory): EditorHistory {
    const [next, ...rest] = history.future;
    if (!next) return history;
    return { past: [...history.past, history.present], present: next, future: rest };
}
