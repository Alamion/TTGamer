import {
    EMPTY_SELECTION,
    normalizeSelection,
    primaryId,
    rangeSelection,
    selectOnly,
    toggleInSelection,
} from '@site/src/sheet_manager/features/template-editor/model/selection';
import type { EditorDraft } from '@site/src/sheet_manager/features/template-editor/model/types';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const draft: EditorDraft = CustomTemplateSchema.parse({
    id: 'sel',
    name: 'Selection',
    documentKind: 'character',
    schemaVersion: 3,
    children: [
        {
            id: 'a',
            type: 'section',
            title: 'A',
            children: [
                { id: 'a1', type: 'text', label: 'A1' },
                { id: 'a2', type: 'text', label: 'A2' },
                { id: 'a3', type: 'text', label: 'A3' },
                {
                    id: 'card',
                    type: 'group',
                    title: 'Card',
                    children: [{ id: 'c1', type: 'text', label: 'C1' }],
                },
            ],
        },
        {
            id: 'b',
            type: 'section',
            title: 'B',
            children: [{ id: 'b1', type: 'text', label: 'B1' }],
        },
    ],
});

describe('editor selection (spec 023)', () => {
    it('toggles elements in and out and moves the anchor', () => {
        let state = toggleInSelection(selectOnly('a1'), 'b1');
        expect(state).toEqual({ ids: ['a1', 'b1'], anchor: 'b1' });
        state = toggleInSelection(state, 'b1');
        expect(state).toEqual({ ids: ['a1'], anchor: 'a1' });
        state = toggleInSelection(state, 'a1');
        expect(state).toEqual(EMPTY_SELECTION);
    });

    it('selects a range among siblings in both directions', () => {
        expect(rangeSelection(draft, selectOnly('a1'), 'a3').ids).toEqual(['a1', 'a2', 'a3']);
        expect(rangeSelection(draft, selectOnly('a3'), 'a1')).toEqual({
            ids: ['a3', 'a1', 'a2'],
            anchor: 'a3',
        });
    });

    it('selects just the two across parents', () => {
        expect(rangeSelection(draft, selectOnly('a2'), 'b1')).toEqual({
            ids: ['a2', 'b1'],
            anchor: 'a2',
        });
        expect(rangeSelection(draft, EMPTY_SELECTION, 'b1')).toEqual(selectOnly('b1'));
    });

    it('normalizes: drops missing ids and descendants of selected groups, page order', () => {
        expect(normalizeSelection(draft, ['b1', 'gone', 'c1', 'a1'])).toEqual(['a1', 'c1', 'b1']);
        expect(normalizeSelection(draft, ['c1', 'a', 'b1'])).toEqual(['a', 'b1']);
        expect(normalizeSelection(draft, ['card', 'c1'])).toEqual(['card']);
    });

    it('has a primary element only when exactly one is selected', () => {
        expect(primaryId(selectOnly('a1'))).toBe('a1');
        expect(primaryId(EMPTY_SELECTION)).toBeNull();
        expect(primaryId({ ids: ['a1', 'a2'], anchor: 'a2' })).toBeNull();
    });
});
