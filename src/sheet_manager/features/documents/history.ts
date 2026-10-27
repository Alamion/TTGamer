import type { LinkEdit } from './linkKeeper';
import type { TreeOperation, TreeResult } from './operations';

/** What one step of history holds: the operations that undo it, or redo it once undone. */
export interface HistoryStep {
    label: string;
    operations: TreeOperation[];
    /**
     * Links the change rewrote in other documents (spec 044): `applied` while the change is in
     * effect (undo puts them back), not after an undo (redo writes them again).
     */
    links?: { edits: LinkEdit[]; applied: boolean };
}

export interface HistorySnapshot {
    undoLabel: string | null;
    redoLabel: string | null;
}

export const HISTORY_LIMIT = 50;

type Run = (operations: readonly TreeOperation[], step: HistoryStep) => TreeResult;

/**
 * Undo and redo of tree changes, kept in memory until the page is reloaded (spec 032, Q2). A step
 * is the inverse of what ran; undoing it yields the inverse of that, which is the redo step.
 */
export class OperationHistory {
    private undoSteps: HistoryStep[] = [];
    private redoSteps: HistoryStep[] = [];
    private listeners = new Set<() => void>();
    private snapshot: HistorySnapshot = { undoLabel: null, redoLabel: null };

    private readonly limit: number;

    constructor(limit: number = HISTORY_LIMIT) {
        this.limit = limit;
    }

    readonly subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => void this.listeners.delete(listener);
    };

    readonly getSnapshot = (): HistorySnapshot => this.snapshot;

    /** The step a later undo takes, so work finished after the change can join it. */
    latest(): HistoryStep | undefined {
        return this.undoSteps.at(-1);
    }

    /** Remembers a change just made; a new change ends the redo line. */
    push(step: HistoryStep) {
        if (step.operations.length === 0) return;
        this.undoSteps.push(step);
        if (this.undoSteps.length > this.limit) this.undoSteps.shift();
        this.redoSteps = [];
        this.publish();
    }

    undo(run: Run): TreeResult | null {
        return this.travel(this.undoSteps, this.redoSteps, run);
    }

    redo(run: Run): TreeResult | null {
        return this.travel(this.redoSteps, this.undoSteps, run);
    }

    clear() {
        this.undoSteps = [];
        this.redoSteps = [];
        this.publish();
    }

    private travel(from: HistoryStep[], to: HistoryStep[], run: Run): TreeResult | null {
        const step = from.pop();
        if (!step) return null;
        const result = run(step.operations, step);
        if (result.inverse.length > 0) {
            to.push({
                label: step.label,
                operations: result.inverse,
                ...(step.links
                    ? { links: { edits: step.links.edits, applied: !step.links.applied } }
                    : {}),
            });
            if (to.length > this.limit) to.shift();
        }
        this.publish();
        return result;
    }

    private publish() {
        this.snapshot = {
            undoLabel: this.undoSteps.at(-1)?.label ?? null,
            redoLabel: this.redoSteps.at(-1)?.label ?? null,
        };
        this.listeners.forEach((listener) => listener());
    }
}
