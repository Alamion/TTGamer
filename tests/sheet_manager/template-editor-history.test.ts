import { createEmptyDraft } from '@site/src/sheet_manager/features/template-editor/model/factories';
import {
    EMPTY_SELECTION,
    selectOnly,
} from '@site/src/sheet_manager/features/template-editor/model/selection';
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
} from '@site/src/sheet_manager/features/template-editor/session/history';
import { describe, expect, it } from 'vitest';

const named = (name: string) => ({ ...createEmptyDraft('character'), name });

describe('template editor history', () => {
    it('undoes and redoes with the recorded selection', () => {
        let history = createHistory(named('a'));
        history = applyChange(history, named('b'), { selection: selectOnly('x') });
        history = applyChange(history, named('c'), { selection: selectOnly('y') });

        history = undo(history);
        expect(history.present.draft.name).toBe('b');
        expect(history.present.selection).toEqual(selectOnly('x'));
        history = undo(history);
        expect(history.present.draft.name).toBe('a');
        expect(history.present.selection).toEqual(EMPTY_SELECTION);
        expect(canUndo(history)).toBe(false);

        history = redo(history);
        expect(history.present.draft.name).toBe('b');
        expect(history.present.selection).toEqual(selectOnly('x'));
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

    it('restores a multi-selection on undo', () => {
        const several = { ids: ['x', 'y'], anchor: 'y' };
        let history = select(createHistory(named('a')), several);
        history = applyChange(history, named('b'), { selection: EMPTY_SELECTION });
        history = undo(history);
        expect(history.present.selection).toEqual(several);
    });

    it('changes the selection without adding an undo step', () => {
        let history = createHistory(named('a'));
        history = select(history, selectOnly('node'));
        expect(history.present.selection).toEqual(selectOnly('node'));
        expect(canUndo(history)).toBe(false);
    });
});
