import {
    itemState,
    switchItem,
} from '@site/src/sheet_manager/features/template-editor/merge/items';
import { mergePages } from '@site/src/sheet_manager/features/template-editor/merge/merge';
import { findNode, updateNode } from '@site/src/sheet_manager/features/template-editor/model/tree';
import type { CustomTemplate, TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const field = (id: string, label = id): TemplateNode => ({
    id,
    type: 'text',
    label,
    required: false,
    multiline: false,
});
const group = (id: string, children: TemplateNode[]): TemplateNode => ({
    id,
    type: 'section',
    title: id,
    children,
});
const page = (children: TemplateNode[]): CustomTemplate =>
    CustomTemplateSchema.parse({
        id: 'page',
        name: 'Page',
        systemId: 'general',
        documentKind: 'note',
        schemaVersion: 4,
        children,
    });
function review(base: CustomTemplate, shipped: CustomTemplate, copy: CustomTemplate) {
    const result = mergePages(base, shipped, copy);
    if ('error' in result) throw new Error(result.error);
    return result;
}

describe('review items as ordinary draft changes', () => {
    it('reads current properties, switches a conflict back and forth, and reuses no-op drafts', () => {
        const base = page([field('a'), field('b')]);
        const shipped = page([field('a', 'Shipped'), field('b')]);
        const copy = page([field('a', 'Copy'), field('b')]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, copy);
        expect(itemState(draft, item!)).toBe('copy');
        expect(switchItem(draft, item!, 'copy')).toBe(draft);
        const taken = switchItem(draft, item!, 'shipped');
        expect(taken).not.toBe(draft);
        expect(taken).toEqual(shipped);
        expect(itemState(taken, item!)).toBe('shipped');
        expect(switchItem(taken, item!, 'shipped')).toBe(taken);
        const restored = switchItem(taken, item!, 'copy');
        expect(restored).not.toBe(taken);
        expect(restored).toEqual(draft);
        expect(restored.children[1]).toBe(draft.children[1]);
        expect(itemState(updateNode(draft, 'a', { label: 'Later' }), item!)).toBe('other');
    });

    it('preserves unrelated edits made after opening, even on the same node', () => {
        const base = page([group('g', [field('a')]), field('b')]);
        const shipped = page([group('g', [field('a', 'Shipped')]), field('b')]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, base);
        const edited = updateNode(updateNode(draft, 'b', { label: 'Later' }), 'a', {
            docsPath: '/later',
        });
        const switched = switchItem(edited, item!, 'copy');
        expect(findNode(switched, 'a')).toMatchObject({ label: 'a', docsPath: '/later' });
        expect(findNode(switched, 'b')).toBe(findNode(edited, 'b'));
        expect(findNode(switched, 'b')).toMatchObject({ label: 'Later' });
    });

    it('removes exactly one added subtree and restores its placement', () => {
        const base = page([field('a'), field('b')]);
        const shipped = page([field('a'), group('new', [field('nested')]), field('b')]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, base);
        expect(itemState(draft, item!)).toBe('shipped');
        const kept = switchItem(draft, item!, 'copy');
        expect(kept).toEqual(base);
        expect(kept.children[0]).toBe(draft.children[0]);
        expect(kept.children[1]).toBe(draft.children[2]);
        expect(itemState(kept, item!)).toBe('copy');
        expect(switchItem(kept, item!, 'copy')).toBe(kept);
        expect(switchItem(kept, item!, 'shipped')).toEqual(draft);
    });

    it.each([false, true])('switches removals with a copy change: %s', (changed) => {
        const base = page([field('a'), field('b')]);
        const shipped = page([field('b')]);
        const copy = page([field('a', changed ? 'Mine' : 'a'), field('b')]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, copy);
        expect(itemState(draft, item!)).toBe(changed ? 'copy' : 'shipped');
        const taken = switchItem(draft, item!, 'shipped');
        expect(taken).toEqual(shipped);
        expect(switchItem(taken, item!, 'copy')).toEqual(copy);
    });

    it('takes an added item moved elsewhere after opening without replacing its later edits', () => {
        const base = page([field('a'), field('b')]);
        const shipped = page([field('a'), field('new'), field('b')]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, base);
        const edited = page([field('new', 'Later label'), field('a'), field('b')]);
        expect(itemState(edited, item!)).toBe('other');
        const taken = switchItem(edited, item!, 'shipped');
        expect(taken.children.map((node) => node.id)).toEqual(['a', 'new', 'b']);
        expect(findNode(taken, 'new')).toBe(findNode(edited, 'new'));
        expect(itemState(taken, item!)).toBe('shipped');
        expect(draft).toEqual(shipped);
    });

    it('restores a removed container without duplicating a descendant moved out by shipped', () => {
        const base = page([group('old', [field('a'), field('b')]), field('tail')]);
        const shipped = page([field('b'), field('tail')]);
        const { draft, items } = review(base, shipped, base);
        const item = items.find((candidate) => candidate.kind === 'removed')!;
        const restored = switchItem(draft, item, 'copy');
        expect(restored).toEqual(page([group('old', [field('a')]), field('b'), field('tail')]));
        expect(findNode(restored, 'b')).toBe(findNode(draft, 'b'));
    });

    it('restores a node removed by the copy to the shipped value', () => {
        const base = page([field('a'), field('b')]);
        const shipped = page([field('a', 'New'), field('b')]);
        const copy = page([field('b')]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, copy);
        expect(itemState(draft, item!)).toBe('copy');
        const taken = switchItem(draft, item!, 'shipped');
        expect(taken).toEqual(shipped);
        expect(itemState(taken, item!)).toBe('shipped');
        expect(switchItem(taken, item!, 'copy')).toEqual(copy);
    });

    it('switches colliding new ids without removing their copy version', () => {
        const base = page([field('a')]);
        const shipped = page([field('a'), field('new', 'Shipped')]);
        const copy = page([field('a'), field('new', 'Mine')]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, copy);
        expect(itemState(draft, item!)).toBe('copy');
        const taken = switchItem(draft, item!, 'shipped');
        expect(taken).toEqual(shipped);
        expect(itemState(taken, item!)).toBe('shipped');
        expect(switchItem(taken, item!, 'copy')).toEqual(copy);
    });

    it('switches parent moves and reports an independently moved node as other', () => {
        const base = page([group('one', [field('a')]), group('two', []), group('three', [])]);
        const shipped = page([group('one', []), group('two', [field('a')]), group('three', [])]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, base);
        expect(itemState(draft, item!)).toBe('shipped');
        expect(switchItem(draft, item!, 'copy')).toEqual(base);
        const other = page([group('one', []), group('two', []), group('three', [field('a')])]);
        expect(itemState(other, item!)).toBe('other');
    });

    it('switches order while preserving later additions and their slots', () => {
        const base = page([field('a'), field('b'), field('c')]);
        const shipped = page([field('c'), field('b'), field('a')]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, base);
        expect(itemState(draft, item!)).toBe('shipped');
        expect(switchItem(draft, item!, 'copy')).toEqual(base);
        const edited = {
            ...draft,
            children: [draft.children[0]!, field('later'), ...draft.children.slice(1)],
        };
        expect(itemState(edited, item!)).toBe('other');
        const switched = switchItem(edited, item!, 'copy');
        expect(switched.children.map((node) => node.id)).toEqual(['a', 'later', 'b', 'c']);
    });

    it('switches page properties including deletion', () => {
        const base = { ...page([field('a')]), description: 'Old' };
        const shipped = page([field('a')]);
        const {
            draft,
            items: [item],
        } = review(base, shipped, base);
        expect(itemState(draft, item!)).toBe('shipped');
        expect(switchItem(draft, item!, 'copy')).toEqual(base);
        expect(switchItem(base, item!, 'shipped')).toEqual(shipped);
    });
});
