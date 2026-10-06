import type { EditorDraft } from '@site/src/sheet_manager/features/template-editor/draft';
import { findNode } from '@site/src/sheet_manager/features/template-editor/draft';
import {
    duplicateNodes,
    insertNodesAt,
    moveEachByCommand,
    placeNodes,
    removeNodes,
} from '@site/src/sheet_manager/features/template-editor/multiOps';
import {
    CustomTemplateSchema,
    TEMPLATE_LIMITS,
    type TemplateNode,
} from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const text = (id: string) => ({ id, type: 'text', label: id.toUpperCase() });

const draft = (): EditorDraft =>
    CustomTemplateSchema.parse({
        id: 'multi',
        name: 'Multi',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'a',
                type: 'section',
                title: 'A',
                children: [text('a1'), text('a2'), text('a3')],
            },
            { id: 'b', type: 'section', title: 'B', children: [text('b1'), text('b2')] },
            text('r1'),
        ],
    });

const ids = (current: EditorDraft, parentId: string | null) =>
    (parentId === null
        ? current.children
        : (findNode(current, parentId) as { children: TemplateNode[] }).children
    ).map(({ id }) => id);

const ok = <T extends { ok: boolean }>(result: T) => {
    expect(result.ok).toBe(true);
    return result as Extract<T, { ok: true }>;
};

describe('multi-element operations (spec 023)', () => {
    it('removes a set and picks the element after the last one', () => {
        const result = removeNodes(draft(), ['a3', 'a1']);
        expect(ids(result.draft, 'a')).toEqual(['a2']);
        expect(result.count).toBe(2);
        expect(result.next).toBe('a2');
        expect(removeNodes(draft(), ['a1', 'a2']).next).toBe('a3');
        expect(removeNodes(draft(), ['b1', 'b2']).next).toBe('b');
        expect(removeNodes(draft(), ['a', 'a1']).count).toBe(1);
    });

    it('duplicates each element after its original', () => {
        const result = ok(duplicateNodes(draft(), ['b1', 'a1']));
        expect(ids(result.draft, 'a')).toEqual(['a1', result.ids[0], 'a2', 'a3']);
        expect(ids(result.draft, 'b')).toEqual(['b1', result.ids[1], 'b2']);
    });

    it('inserts nodes as a block and respects the element limit', () => {
        const nodes = [text('n1'), text('n2')] as TemplateNode[];
        const result = ok(insertNodesAt(draft(), { parentId: 'b', index: 1, column: null }, nodes));
        expect(ids(result.draft, 'b')).toEqual(['b1', 'n1', 'n2', 'b2']);
        const many = Array.from({ length: TEMPLATE_LIMITS.nodesPerTemplate }, (_, index) =>
            text(`x${index}`)
        ) as TemplateNode[];
        const refused = insertNodesAt(draft(), { parentId: null, index: 0, column: null }, many);
        expect(refused).toMatchObject({ ok: false, error: 'count' });
    });

    it('places a set in page order and refuses a place inside it', () => {
        const forward = ok(
            placeNodes(draft(), ['b2', 'a1'], { parentId: 'b', index: 1, column: null })
        );
        expect(ids(forward.draft, 'a')).toEqual(['a2', 'a3']);
        expect(ids(forward.draft, 'b')).toEqual(['b1', 'a1', 'b2']);
        const within = ok(
            placeNodes(draft(), ['a1', 'a2'], { parentId: 'a', index: 3, column: null })
        );
        expect(ids(within.draft, 'a')).toEqual(['a3', 'a1', 'a2']);
        expect(placeNodes(draft(), ['a'], { parentId: 'a', index: 0, column: null })).toMatchObject(
            {
                ok: false,
            }
        );
    });

    it('moves neighbours down as a block and leaves edge elements in place', () => {
        const block = ok(moveEachByCommand(draft(), ['a1', 'a2'], 'move-down'));
        expect(ids(block.draft, 'a')).toEqual(['a3', 'a1', 'a2']);
        const twoGroups = ok(moveEachByCommand(draft(), ['a1', 'b1'], 'move-down'));
        expect(ids(twoGroups.draft, 'a')).toEqual(['a2', 'a1', 'a3']);
        expect(ids(twoGroups.draft, 'b')).toEqual(['b2', 'b1']);
        const edge = ok(moveEachByCommand(draft(), ['a1', 'b2'], 'move-down'));
        expect(edge.moved).toBe(1);
        expect(ids(edge.draft, 'b')).toEqual(['b1', 'b2']);
        const none = ok(moveEachByCommand(draft(), ['a1', 'b1'], 'move-up'));
        expect(none.moved).toBe(0);
    });

    it('moves out of groups all or nothing, keeping order', () => {
        const out = ok(moveEachByCommand(draft(), ['a1', 'a2'], 'move-out'));
        expect(ids(out.draft, null)).toEqual(['a', 'a1', 'a2', 'b', 'r1']);
        const mixed = ok(moveEachByCommand(draft(), ['a1', 'r1'], 'move-out'));
        expect(mixed.moved).toBe(0);
        expect(ids(mixed.draft, 'a')).toEqual(['a1', 'a2', 'a3']);
    });
});
