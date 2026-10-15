import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { reportSheetIssue } from '../../../diagnostics';
import { useDocumentStore } from '../../../store/documentStore';
import { MAX_PANES, PANES_STORAGE_KEY, readArrangement } from './types';
import { defaultPaneView } from './views';

export interface PaneArrangement {
    /** The open documents in pane order; empty means only the current document is shown. */
    ids: string[];
    /** Focus history, the most recently focused first. */
    recent: string[];
    /** Relative widths of panes the reader has resized (average 1); a missing one is 1. */
    weights: Record<string, number>;
    /** A pane's own view (a view id or `tpl:<template id>`); a missing one shows the preferred. */
    views: Record<string, string>;
    /** The pane that has the whole area while the others are hidden. */
    maximized: string | null;
}

const EMPTY: PaneArrangement = { ids: [], recent: [], weights: {}, views: {}, maximized: null };

/** The device's storage when it works; the arrangement is a convenience, losing it is fine. */
const safeStorage = {
    getItem: (name: string) => {
        try {
            return globalThis.localStorage?.getItem(name) ?? null;
        } catch {
            return null;
        }
    },
    setItem: (name: string, value: string) => {
        try {
            globalThis.localStorage?.setItem(name, value);
        } catch {
            // See above.
        }
    },
    removeItem: (name: string) => {
        try {
            globalThis.localStorage?.removeItem(name);
        } catch {
            // See above.
        }
    },
};

/**
 * The panes of this device (spec 034, FR-012): kept in localStorage, not in the documents' storage,
 * because they are a reading preference that is neither exported nor synced. They are read when the
 * module loads; the sheet draws them only after the documents are loaded, so the server render,
 * which has no documents, never differs from the first browser render.
 */
export const usePaneStore = create<PaneArrangement>()(
    persist(() => EMPTY, {
        name: PANES_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => safeStorage),
        partialize: ({ ids, recent, weights, views, maximized }) => ({
            ids,
            recent,
            weights,
            views,
            maximized,
        }),
        merge: (persisted, current) => {
            if (persisted === undefined || persisted === null) return current;
            const stored = readArrangement(persisted);
            if (!stored) {
                reportSheetIssue({
                    code: 'pane-arrangement-invalid',
                    message:
                        'The stored arrangement of panes could not be read; one document shows',
                });
                return current;
            }
            return { ...current, ...stored };
        },
    })
);

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

/** The record without the entries of ids that are not panes; the same object when none go. */
function keepOnly<T>(record: Record<string, T>, ids: readonly string[]): Record<string, T> {
    return Object.keys(record).every((id) => ids.includes(id))
        ? record
        : Object.fromEntries(Object.entries(record).filter(([id]) => ids.includes(id)));
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
    const weights = keepOnly(state.weights, ids);
    const views = keepOnly(state.views, ids);
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
        views === state.views &&
        maximized === state.maximized
        ? state
        : { ids, recent, weights, views, maximized };
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
    const entry = documents.entries.find((candidate) => candidate.id === id);
    const brief = !state.ids.includes(id) && entry ? defaultPaneView(entry) : undefined;
    usePaneStore.setState({
        ids,
        recent: state.recent,
        weights: state.weights,
        views: brief ? { ...keepOnly(state.views, ids), [id]: brief } : state.views,
        maximized: null,
    });
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

/** Sets a pane's own view; `undefined` goes back to the document's preferred one. */
export function setPaneView(id: string, view: string | undefined): void {
    usePaneStore.setState((state) => {
        const rest = Object.fromEntries(Object.entries(state.views).filter(([key]) => key !== id));
        return { views: view === undefined ? rest : { ...rest, [id]: view } };
    });
}
