import {
    type EditorSelectionState,
    selectOnly,
} from '@site/src/sheet_manager/features/template-editor/model/selection';
import { findNode } from '@site/src/sheet_manager/features/template-editor/model/tree';
import { type EditorDraft } from '@site/src/sheet_manager/features/template-editor/model/types';
import {
    canMoveSelection,
    duplicateSelection,
    moveSelection,
    removeSelection,
} from '@site/src/sheet_manager/features/template-editor/operations/selection';
import {
    commitDrag,
    insertAt,
    placeAt,
} from '@site/src/sheet_manager/features/template-editor/operations/structure';
import {
    switchKind,
    switchSource,
} from '@site/src/sheet_manager/features/template-editor/operations/switches';
import type { OpResult } from '@site/src/sheet_manager/features/template-editor/operations/types';
import { CustomTemplateSchema, TEMPLATE_LIMITS } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const page = (): EditorDraft =>
    CustomTemplateSchema.parse({
        id: 'tpl-ops',
        name: 'Ops',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'stats',
                type: 'section',
                title: 'Stats',
                columns: 2,
                children: [
                    { id: 'a', type: 'number', label: 'Alpha' },
                    { id: 'b', type: 'number', label: 'Beta' },
                    { id: 'c', type: 'number', label: 'Gamma' },
                ],
            },
            { id: 'notes', type: 'text', label: 'Notes' },
        ],
    });

const ids = (draft: EditorDraft, parentId: string) => {
    const parent = findNode(draft, parentId);
    return parent && 'children' in parent ? parent.children.map(({ id }) => id) : [];
};

const several = (...nodeIds: string[]): EditorSelectionState => ({
    ids: nodeIds,
    anchor: nodeIds[nodeIds.length - 1]!,
});

function applied(result: OpResult) {
    if (!result.ok) throw new Error(`refused: ${result.error}`);
    return result;
}

describe('selection operations: one element is a selection of one (spec 025, US2)', () => {
    it('removes one element, selects its next sibling, and names it', () => {
        const result = applied(removeSelection(page(), selectOnly('b')));
        expect(ids(result.draft, 'stats')).toEqual(['a', 'c']);
        expect(result.selection).toEqual(selectOnly('c'));
        expect(result.announce).toMatchObject({ values: { label: 'Beta' } });
        expect(result.announce?.count).toBeUndefined();
    });

    it('removes several as one change and counts them', () => {
        const result = applied(removeSelection(page(), several('a', 'b')));
        expect(ids(result.draft, 'stats')).toEqual(['c']);
        expect(result.selection).toEqual(selectOnly('c'));
        expect(result.announce).toMatchObject({ count: 2 });
    });

    it('selects the parent when the last child goes', () => {
        const result = applied(removeSelection(page(), several('a', 'b', 'c')));
        expect(result.selection).toEqual(selectOnly('stats'));
    });

    it('duplicates one element and selects the copy', () => {
        const result = applied(duplicateSelection(page(), selectOnly('a')));
        const [, copy] = ids(result.draft, 'stats');
        expect(copy).not.toBe('a');
        expect(result.selection).toEqual(selectOnly(copy!));
        expect(result.announce).toMatchObject({ values: { label: 'Alpha' } });
    });

    it('duplicates several and selects every copy', () => {
        const result = applied(duplicateSelection(page(), several('a', 'c')));
        expect(ids(result.draft, 'stats')).toHaveLength(5);
        expect(result.selection?.ids).toHaveLength(2);
        expect(result.announce).toMatchObject({ count: 2 });
    });

    it('refuses a duplicate past the element limit', () => {
        const draft = page();
        const many = {
            ...draft,
            children: [
                ...draft.children,
                ...Array.from({ length: TEMPLATE_LIMITS.nodesPerTemplate - 5 }, (_, index) => ({
                    id: `x${index}`,
                    type: 'toggle' as const,
                    label: 'X',
                    required: false,
                    compact: false,
                })),
            ],
        };
        const result = duplicateSelection(many, several('stats'));
        expect(result).toMatchObject({ ok: false, error: 'count' });
    });

    it('moves one element and names it; the first element cannot move up', () => {
        const result = applied(moveSelection('move-down')(page(), selectOnly('a')));
        expect(ids(result.draft, 'stats')).toEqual(['b', 'a', 'c']);
        expect(result.announce).toMatchObject({ values: { label: 'Alpha' } });
        const stuck = applied(moveSelection('move-up')(page(), selectOnly('a')));
        expect(stuck.draft).toEqual(page());
        expect(stuck.announce).toBeUndefined();
        expect(canMoveSelection(page(), ['a'], 'move-up')).toBe(false);
        expect(canMoveSelection(page(), ['a'], 'move-down')).toBe(true);
    });

    it('moves several as a block and counts them', () => {
        const result = applied(moveSelection('move-down')(page(), several('a', 'b')));
        expect(ids(result.draft, 'stats')).toEqual(['c', 'a', 'b']);
        expect(result.announce).toMatchObject({ count: 2 });
    });

    it('names the column a column move lands in', () => {
        const result = applied(moveSelection('column-next')(page(), selectOnly('a')));
        expect(findNode(result.draft, 'a')?.column).toBe(2);
        expect(result.announce).toMatchObject({ values: { label: 'Alpha', column: 2 } });
    });

    it('does nothing without a selection', () => {
        const draft = page();
        expect(applied(removeSelection(draft, selectOnly(null))).draft).toBe(draft);
    });
});

describe('structure operations', () => {
    it('inserts at a slot and selects the new element', () => {
        const node = {
            id: 'n',
            type: 'toggle' as const,
            label: 'New',
            required: false,
            compact: false,
        };
        const result = applied(
            insertAt({ parentId: 'stats', index: 0, column: null }, node)(page(), selectOnly(null))
        );
        expect(ids(result.draft, 'stats')[0]).toBe('n');
        expect(result.selection).toEqual(selectOnly('n'));
        expect(result.announce).toMatchObject({ values: { label: 'New' } });
    });

    it('refuses to place a group inside itself', () => {
        const result = placeAt('stats', { parentId: 'stats', index: 0, column: null })(
            page(),
            selectOnly('stats')
        );
        expect(result).toMatchObject({ ok: false, error: 'self-move' });
    });

    it('records a dragged page and counts several dragged elements', () => {
        const draft = page();
        const next = applied(moveSelection('move-down')(draft, several('a', 'b'))).draft;
        const result = applied(commitDrag(['a', 'b'], next)(draft, selectOnly(null)));
        expect(result.draft).toBe(next);
        expect(result.selection).toEqual(several('a', 'b'));
        expect(result.announce).toMatchObject({ count: 2 });
    });
});

describe('switch operations (spec 025, US1)', () => {
    it('switches a section to a card in one change', () => {
        const result = applied(switchKind('stats', 'card', new Map())(page(), selectOnly(null)));
        expect(findNode(result.draft, 'stats')?.type).toBe('group');
        expect(result.announce).toBeUndefined();
    });

    it('announces the settings a source switch drops', () => {
        const draft = page();
        const built = {
            id: 'notes',
            type: 'list' as const,
            title: 'Notes',
            valueKey: 'notes',
            columns: 1,
        };
        const withLook = {
            ...draft,
            children: draft.children.map((node) =>
                node.id === 'notes' ? { ...node, labelPosition: 'left' as const } : node
            ),
        };
        const result = applied(switchSource('notes', built, new Map())(withLook, selectOnly(null)));
        expect(findNode(result.draft, 'notes')?.type).toBe('list');
        expect(result.announce?.values?.settings).toHaveLength(1);
    });
});
