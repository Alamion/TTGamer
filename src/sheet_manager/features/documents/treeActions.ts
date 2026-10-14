import { useSyncExternalStore } from 'react';

import { useDocumentStore } from '../../store/documentStore';
import { OperationHistory } from './history';
import type { TreeOperation, TreeResult } from './operations';

/** The undo history of the documents window; it lives until the page is reloaded (spec 032, Q2). */
export const documentsHistory = new OperationHistory();

const runOnStore = (operations: readonly TreeOperation[]): TreeResult =>
    useDocumentStore.getState().applyTreeOperations(operations);

/** Applies a named change to the tree and remembers how to undo it. */
export function runTreeChange(label: string, operations: readonly TreeOperation[]): TreeResult {
    const result = runOnStore(operations);
    documentsHistory.push({ label, operations: result.inverse });
    return result;
}

export const undoTreeChange = () => documentsHistory.undo(runOnStore);
export const redoTreeChange = () => documentsHistory.redo(runOnStore);

export function useDocumentsHistory() {
    return useSyncExternalStore(
        documentsHistory.subscribe,
        documentsHistory.getSnapshot,
        documentsHistory.getSnapshot
    );
}
