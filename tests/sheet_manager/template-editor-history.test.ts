import { createEmptyDraft } from '@site/src/sheet_manager/components/dialogs/template-editor/draft';
import {
    applyChange,
    canRedo,
    canUndo,
    COALESCE_WINDOW_MS,
    createHistory,
    HISTORY_LIMIT,
    redo,
    select,
    undo,
} from '@site/src/sheet_manager/components/dialogs/template-editor/history';
import { describe, expect, it } from 'vitest';

const named = (name: string) => ({ ...createEmptyDraft('character'), name });

describe('template editor history', () => {
    it('undoes and redoes with the recorded selection', () => {
        let history = createHistory(named('a'), null);
        history = applyChange(history, named('b'), { selectedId: 'x' });
        history = applyChange(history, named('c'), { selectedId: 'y' });

        history = undo(history);
        expect(history.present.draft.name).toBe('b');
        expect(history.present.selectedId).toBe('x');
        history = undo(history);
        expect(history.present.draft.name).toBe('a');
        expect(history.present.selectedId).toBeNull();
        expect(canUndo(history)).toBe(false);

        history = redo(history);
        expect(history.present.draft.name).toBe('b');
        expect(history.present.selectedId).toBe('x');
        expect(canRedo(history)).toBe(true);
    });

    it('clears the redo stack on a new change', () => {
        let history = applyChange(createHistory(named('a')), named('b'));
        history = undo(history);
        history = applyChange(history, named('c'));
        expect(canRedo(history)).toBe(false);
        expect(history.past.map(({ draft }) => draft.name)).toEqual(['a']);
    });

    it('caps the past at the history limit', () => {
        let history = createHistory(named('0'));
        for (let step = 1; step <= HISTORY_LIMIT + 5; step += 1) {
            history = applyChange(history, named(String(step)));
        }
        expect(history.past).toHaveLength(HISTORY_LIMIT);
        expect(history.past[0]!.draft.name).toBe('5');
    });

    it('coalesces edits of one property inside the window only', () => {
        const key = 'field-1:label';
        let history = createHistory(named(''));
        history = applyChange(history, named('S'), { coalesceKey: key }, 1_000);
        history = applyChange(history, named('St'), { coalesceKey: key }, 1_300);
        history = applyChange(history, named('Str'), { coalesceKey: key }, 1_600);
        expect(history.past).toHaveLength(1);
        expect(history.present.draft.name).toBe('Str');

        history = applyChange(
            history,
            named('Stre'),
            { coalesceKey: key },
            1_600 + COALESCE_WINDOW_MS + 1
        );
        expect(history.past).toHaveLength(2);

        history = applyChange(history, named('Stren'), { coalesceKey: 'other:label' }, 2_500);
        expect(history.past).toHaveLength(3);
    });

    it('changes the selection without adding an undo step', () => {
        let history = createHistory(named('a'), null);
        history = select(history, 'node');
        expect(history.present.selectedId).toBe('node');
        expect(canUndo(history)).toBe(false);
    });
});
