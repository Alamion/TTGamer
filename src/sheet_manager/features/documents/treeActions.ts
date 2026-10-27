import { useSyncExternalStore } from 'react';

import { useDocumentStore } from '../../store/documentStore';
import { useLinkIndex } from '../../store/linkIndexStore';
import { type HistoryStep, OperationHistory } from './history';
import { applyLinkEdits, planLinkEdits } from './linkKeeper';
import { announceLinksKept, withoutKeeper } from './linkKeeperRuntime';
import type { TreeOperation, TreeResult } from './operations';

/** The undo history of the documents window; it lives until the page is reloaded (spec 032, Q2). */
export const documentsHistory = new OperationHistory();

const shape = () => {
    const { entries, folders } = useDocumentStore.getState();
    return { entries, folders };
};

const runOnStore = (operations: readonly TreeOperation[]): TreeResult =>
    withoutKeeper(() => useDocumentStore.getState().applyTreeOperations(operations));

/**
 * Applies a named change to the tree and remembers how to undo it. Links in other documents that
 * the change would send elsewhere are rewritten and join the same step (spec 044, D6).
 */
export function runTreeChange(label: string, operations: readonly TreeOperation[]): TreeResult {
    const before = shape();
    const result = runOnStore(operations);
    const step: HistoryStep = { label, operations: result.inverse };
    const edits = useLinkIndex.getState().ready ? planLinkEdits(before, shape()) : [];
    if (edits.length > 0) step.links = { edits, applied: true };
    documentsHistory.push(step);
    if (edits.length > 0) void applyLinkEdits(edits).then((kept) => announceLinksKept(kept));
    return result;
}

/** Undo and redo put the step's links back or write them again; they never plan anew. */
const runStep = (operations: readonly TreeOperation[], step: HistoryStep): TreeResult => {
    const result = runOnStore(operations);
    const { links } = step;
    if (links) {
        void applyLinkEdits(links.edits, links.applied).then((kept) =>
            announceLinksKept(kept, links.applied)
        );
    }
    return result;
};

export const undoTreeChange = () => documentsHistory.undo(runStep);
export const redoTreeChange = () => documentsHistory.redo(runStep);

export function useDocumentsHistory() {
    return useSyncExternalStore(
        documentsHistory.subscribe,
        documentsHistory.getSnapshot,
        documentsHistory.getSnapshot
    );
}
