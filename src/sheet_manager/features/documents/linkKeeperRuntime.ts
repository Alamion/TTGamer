import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { create } from 'zustand';

import type { DocumentStoreState } from '../../store/documentStore';
import { useDocumentStore } from '../../store/documentStore';
import { useLinkIndex } from '../../store/linkIndexStore';
import type { OperationHistory } from './history';
import { applyLinkEdits, type LinkEditResult, planLinkEdits, type TreeShape } from './linkKeeper';
import type { TreeOperation } from './operations';

/**
 * When links are kept (spec 044, design D6). Tree changes keep them themselves (`treeActions`),
 * inside `withoutKeeper`. Every other change to the index is watched here: a new, imported, or
 * copied document at once; a name typed on a sheet once it has been quiet for a moment, the field
 * is left, or the page is hidden, then as one undoable rename with its links.
 */

const messages = uiMessages.sheet.links.kept;

/** A typed name is taken after this much quiet. */
export const RENAME_SETTLE_MS = 1500;

/** The last message about kept links, shown for a moment by `LinksKeptStatus`. */
export const useLinksKeptMessage = create<{ message: string | null; at: number }>(() => ({
    message: null,
    at: 0,
}));

/** Says how many links a change kept or put back. */
export function announceLinksKept(result: LinkEditResult, reverse = false): void {
    if (result.links === 0 && result.skipped === 0) return;
    const values = { links: result.links, documents: result.documents, skipped: result.skipped };
    const message = [
        translate(reverse ? messages.restored : messages.status, values),
        ...(result.skipped > 0 ? [translate(messages.skipped, values)] : []),
    ].join(' ');
    useLinksKeptMessage.setState({ message, at: Date.now() });
}

const shapeOf = (state: Pick<DocumentStoreState, 'entries' | 'folders'>): TreeShape => ({
    entries: state.entries,
    folders: state.folders,
});

let baseline: TreeShape | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let suppressed = 0;
let history: OperationHistory | undefined;

const ready = () => useLinkIndex.getState().ready;

/** Keeps the links of everything changed since the last time, as one step. */
function flush(): void {
    clearTimeout(timer);
    timer = undefined;
    const before = baseline;
    const after = shapeOf(useDocumentStore.getState());
    baseline = after;
    if (!before || before === after || !ready()) return;
    const edits = planLinkEdits(before, after);
    if (edits.length === 0) return;
    const previous = new Map(before.entries.map((entry) => [entry.id, entry.name]));
    const renames: TreeOperation[] = after.entries.flatMap((entry) => {
        const name = previous.get(entry.id);
        return name !== undefined && name !== entry.name
            ? [{ op: 'rename', id: entry.id, name }]
            : [];
    });
    const renamed = after.entries.find((entry) => previous.get(entry.id) !== entry.name);
    if (renames.length > 0 && renamed) {
        history?.push({
            label: translate(messages.rename, { name: renamed.name }),
            operations: renames,
            links: { edits, applied: true },
        });
    }
    void applyLinkEdits(edits).then((result) => announceLinksKept(result));
}

/**
 * Runs a change whose links its caller keeps (tree operations, undo, redo): a name still waiting
 * is taken first, and the change itself is not taken again.
 */
export function withoutKeeper<T>(run: () => T): T {
    if (timer) flush();
    suppressed += 1;
    try {
        return run();
    } finally {
        suppressed -= 1;
        baseline = shapeOf(useDocumentStore.getState());
    }
}

/** What a change of the index did: nothing to keep, a typed name, or a document added or moved. */
function changeOf(previous: TreeShape, next: TreeShape): 'none' | 'rename' | 'structure' {
    if (previous.folders !== next.folders) return 'structure';
    const before = new Map(previous.entries.map((entry) => [entry.id, entry]));
    let rename = false;
    for (const entry of next.entries) {
        const old = before.get(entry.id);
        if (!old || old.parentId !== entry.parentId) return 'structure';
        if (old.name !== entry.name) rename = true;
    }
    return rename ? 'rename' : 'none';
}

/** Starts watching the index; returns the way to stop. */
export function startLinkKeeper(steps: OperationHistory): () => void {
    history = steps;
    baseline = shapeOf(useDocumentStore.getState());
    const flushWaiting = () => {
        if (timer) flush();
    };
    const unsubscribe = useDocumentStore.subscribe((state, previous) => {
        if (state.entries === previous.entries && state.folders === previous.folders) return;
        if (suppressed > 0) return;
        const change = changeOf(shapeOf(previous), shapeOf(state));
        if (change === 'structure') {
            flush();
        } else if (change === 'rename') {
            clearTimeout(timer);
            timer = setTimeout(flush, RENAME_SETTLE_MS);
        } else if (!timer) {
            baseline = shapeOf(state);
        }
    });
    document.addEventListener('focusout', flushWaiting);
    window.addEventListener('pagehide', flushWaiting);
    return () => {
        unsubscribe();
        document.removeEventListener('focusout', flushWaiting);
        window.removeEventListener('pagehide', flushWaiting);
        clearTimeout(timer);
        timer = undefined;
        history = undefined;
    };
}
