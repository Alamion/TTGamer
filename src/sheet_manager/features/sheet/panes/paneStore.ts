import { create } from 'zustand';

import { useDocumentStore } from '../../../store/documentStore';
import { MAX_PANES } from './types';

export interface PaneArrangement {
    /** The open documents in pane order; empty means only the current document is shown. */
    ids: string[];
    /** Focus history, the most recently focused first. */
    recent: string[];
    /** Relative widths of panes the reader has resized (average 1); a missing one is 1. */
    weights: Record<string, number>;
    /** The pane that has the whole area while the others are hidden. */
    maximized: string | null;
}

const EMPTY: PaneArrangement = { ids: [], recent: [], weights: {}, maximized: null };

export const usePaneStore = create<PaneArrangement>(() => EMPTY);

/** The pane to give up when the limit is reached: never the current one. */
function leastRecentlyFocused(ids: readonly string[], recent: readonly string[], keep: string) {
    const rank = (id: string) => {
        const position = recent.indexOf(id);
        return position === -1 ? Number.POSITIVE_INFINITY : position;
    };
    return ids
        .filter((id) => id !== keep)
        .reduce<string | undefined>(
            (victim, id) => (victim === undefined || rank(id) > rank(victim) ? id : victim),
            undefined
        );
}

function sameList(a: readonly string[], b: readonly string[]) {
    return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * The arrangement that is true now: documents that are gone are dropped, the current document is
 * a pane (a document opened with **Open** takes the place of the one last focused), and it leads
 * the focus history. Pure; the same object comes back when nothing changes.
 */
export function reconcilePanes(
    state: PaneArrangement,
    currentId: string | null,
    entryIds: ReadonlySet<string>
): PaneArrangement {
    let ids = state.ids.filter((id) => entryIds.has(id));
    if (currentId && !ids.includes(currentId)) {
        const last = state.recent[0];
        if (ids.length === 0) ids = [currentId];
        else if (last && ids.includes(last)) ids = ids.map((id) => (id === last ? currentId : id));
        else if (ids.length < MAX_PANES) ids = [...ids, currentId];
        else {
            const victim = leastRecentlyFocused(ids, state.recent, currentId);
            ids = ids.map((id) => (id === victim ? currentId : id));
        }
    }
    const recent = [
        ...(currentId && ids.includes(currentId) ? [currentId] : []),
        ...state.recent.filter((id) => id !== currentId && ids.includes(id)),
    ];
    const weightIds = Object.keys(state.weights);
    const weights = weightIds.every((id) => ids.includes(id))
        ? state.weights
        : Object.fromEntries(Object.entries(state.weights).filter(([id]) => ids.includes(id)));
    // The tab of another pane takes the whole area over; a pane that is gone gives it up.
    const maximized =
        state.maximized === null || ids.length < 2
            ? null
            : currentId && ids.includes(currentId)
              ? currentId
              : ids.includes(state.maximized)
                ? state.maximized
                : null;
    return sameList(ids, state.ids) &&
        sameList(recent, state.recent) &&
        weights === state.weights &&
        maximized === state.maximized
        ? state
        : { ids, recent, weights, maximized };
}

/**
 * Shows `id` beside the current document and makes it current; at the limit the least recently
 * focused pane is replaced. Returns the replaced id, if any.
 */
export function openBeside(id: string): string | null {
    const documents = useDocumentStore.getState();
    const current = documents.currentDocumentId;
    const state = reconcilePanes(
        usePaneStore.getState(),
        current,
        new Set(documents.entries.map((entry) => entry.id))
    );
    let ids = state.ids.length > 0 ? state.ids : current ? [current] : [];
    let replaced: string | null = null;
    if (!ids.includes(id)) {
        if (ids.length >= MAX_PANES) {
            replaced = leastRecentlyFocused(ids, state.recent, current ?? '') ?? null;
            ids = ids.map((candidate) => (candidate === replaced ? id : candidate));
        } else {
            const after = current ? ids.indexOf(current) : -1;
            ids = [...ids.slice(0, after + 1), id, ...ids.slice(after + 1)];
        }
    }
    usePaneStore.setState({ ids, recent: state.recent, weights: state.weights, maximized: null });
    documents.setCurrentDocument(id);
    return replaced;
}

/** Closes a pane (the document stays); the neighbouring pane takes the focus. */
export function closePane(id: string): void {
    const documents = useDocumentStore.getState();
    const { ids, recent } = usePaneStore.getState();
    const position = ids.indexOf(id);
    if (position === -1 || ids.length < 2) return;
    const remaining = ids.filter((candidate) => candidate !== id);
    usePaneStore.setState({
        ids: remaining,
        recent: recent.filter((candidate) => candidate !== id),
    });
    if (documents.currentDocumentId === id) {
        documents.setCurrentDocument(remaining[Math.min(position, remaining.length - 1)]!);
    }
}

/** Makes the pane's document the current one (the dice panel and the documents window follow). */
export function focusPane(id: string): void {
    const documents = useDocumentStore.getState();
    if (documents.currentDocumentId !== id) documents.setCurrentDocument(id);
}

/** Gives the pane the whole area, or gives it back when it already has it (spec 034, FR-018). */
export function toggleMaximized(id: string): void {
    const { ids, maximized } = usePaneStore.getState();
    if (!ids.includes(id) || ids.length < 2) return;
    usePaneStore.setState({ maximized: maximized === id ? null : id });
    focusPane(id);
}

/** Stores the widths of the panes shown (`ids`, in order) as weights. */
export function setPaneWeights(ids: readonly string[], weights: readonly number[]): void {
    usePaneStore.setState((state) => ({
        weights: { ...state.weights, ...Object.fromEntries(ids.map((id, i) => [id, weights[i]!])) },
    }));
}
