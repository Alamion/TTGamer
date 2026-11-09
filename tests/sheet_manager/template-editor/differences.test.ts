import { differencesOf } from '@site/src/sheet_manager/features/template-editor/merge/differences';
import { flatten } from '@site/src/sheet_manager/features/template-editor/merge/flatten';
import {
    itemState,
    switchItem,
} from '@site/src/sheet_manager/features/template-editor/merge/items';
import { mergePages } from '@site/src/sheet_manager/features/template-editor/merge/merge';
import { systemRegistry } from '@site/src/sheet_manager/systems/index';
import type { CustomTemplate, TemplateNode } from '@site/src/sheet_manager/types/template';
import {
    CustomTemplateSchema,
    isContainerNode,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const field = (id: string, label = id): Extract<TemplateNode, { type: 'text' }> => ({
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

function differences(shipped: CustomTemplate, copy: CustomTemplate) {
    const result = differencesOf(shipped, copy);
    if ('error' in result) throw new Error(result.error);
    expect(result.draft).toBe(copy);
    for (const item of result.items) {
        expect(item.origin).toBe('difference');
        expect(itemState(copy, item), item.key).toBe('copy');
    }
    return result;
}

describe('differences without a recorded base', () => {
    it('keeps the exact copy and lists nothing for identical pages', () => {
        const copy = page([field('a')]);
        expect(differences(structuredClone(copy), copy)).toEqual({ draft: copy, items: [] });
    });

    it('lists each differing property, including page properties, with both values', () => {
        const copy: CustomTemplate = {
            ...page([field('a', 'Mine')]),
            description: 'My description',
        };
        const shipped = { ...page([{ ...field('a', 'Shipped'), required: true }]), name: 'New' };
        const result = differences(shipped, copy);
        expect(result.items.map((item) => item.key)).toEqual([
            '$page:description',
            '$page:name',
            'a:label',
            'a:required',
        ]);
        for (const item of result.items) {
            const taken = switchItem(copy, item, 'shipped');
            expect(itemState(taken, item)).toBe('shipped');
            expect(switchItem(taken, item, 'copy')).toEqual(copy);
        }
        expect(result.items.find((item) => item.key === 'a:label')).toMatchObject({
            userValue: 'Mine',
            shippedValue: 'Shipped',
        });
        expect(
            result.items.reduce((draft, item) => switchItem(draft, item, 'shipped'), copy)
        ).toEqual(shipped);
    });

    it('offers an added subtree once and inserts it when taken', () => {
        const copy = page([field('a')]);
        const shipped = page([field('a'), group('new', [field('nested')])]);
        const { items } = differences(shipped, copy);
        expect(items).toEqual([
            expect.objectContaining({
                kind: 'added',
                nodeId: 'new',
                userValue: undefined,
                shippedValue: { node: shipped.children[1], parentId: null, afterId: 'a' },
            }),
        ]);
        const taken = switchItem(copy, items[0]!, 'shipped');
        expect(taken).toEqual(shipped);
        expect(itemState(taken, items[0]!)).toBe('shipped');
        expect(switchItem(taken, items[0]!, 'copy')).toEqual(copy);
    });

    it('includes the player’s own additions as removals by shipped', () => {
        const shipped = page([field('a')]);
        const copy = page([field('a'), group('mine', [field('nested')])]);
        const { items } = differences(shipped, copy);
        expect(items).toEqual([
            expect.objectContaining({
                kind: 'removed',
                nodeId: 'mine',
                userValue: { node: copy.children[1], parentId: null, afterId: 'a' },
                shippedValue: undefined,
            }),
        ]);
        const taken = switchItem(copy, items[0]!, 'shipped');
        expect(taken).toEqual(shipped);
        expect(itemState(taken, items[0]!)).toBe('shipped');
        expect(switchItem(taken, items[0]!, 'copy')).toEqual(copy);
    });

    it('takes a move to the shipped parent and a sibling reorder independently', () => {
        const copy = page([
            group('one', [field('moving')]),
            group('two', [field('a'), field('b'), field('c')]),
        ]);
        const shipped = page([
            group('one', []),
            group('two', [field('c'), field('b'), field('a'), field('moving')]),
        ]);
        const { items } = differences(shipped, copy);
        expect(items.map((item) => item.key)).toEqual(['moving:$moved', 'two:$order']);
        const moved = switchItem(copy, items[0]!, 'shipped');
        expect(flatten(moved).nodes.get('moving')?.parentId).toBe('two');
        expect(itemState(moved, items[0]!)).toBe('shipped');
        const reordered = switchItem(copy, items[1]!, 'shipped');
        expect(flatten(reordered).orders.get('two')).toEqual(['c', 'b', 'a']);
        expect(items.reduce((draft, item) => switchItem(draft, item, 'shipped'), copy)).toEqual(
            shipped
        );
    });

    it('returns an error rather than throwing on malformed pages', () => {
        const valid = page([field('a')]);
        const invalid = { ...valid, children: [field('a'), field('a')] };
        for (const [shipped, copy] of [
            [invalid, valid],
            [valid, invalid],
        ] as const) {
            expect(differencesOf(shipped, copy)).toEqual({ error: expect.any(String) });
        }
    });

    it('uses the recorded shipped page as the base of a later merge', () => {
        const shipped = page([field('a', 'Shipped')]);
        const copy = page([field('a', 'Mine')]);
        const reviewed = differences(shipped, copy).draft;
        const nextShipped = { ...shipped, name: 'Next revision' };
        expect(mergePages(shipped, nextShipped, reviewed)).toMatchObject({
            draft: { ...copy, name: 'Next revision' },
            items: [expect.objectContaining({ key: '$page:name', origin: 'shipped' })],
        });
    });

    for (const system of systemRegistry.getSystems()) {
        for (const shipped of system.defaultTemplates ?? []) {
            it(`taking every difference restores ${system.id}:${shipped.id}`, () => {
                const copy = structuredClone(shipped);
                let labeled = false;
                let swapped = false;
                let lastLeaf: TemplateNode | undefined;
                walkTemplateNodes(copy.children, (node) => {
                    if (!labeled) {
                        for (const key of ['label', 'title', 'labelMessage'] as const) {
                            if (key in node && typeof node[key as keyof typeof node] === 'string') {
                                Object.assign(node, { [key]: 'Perturbed label' });
                                labeled = true;
                                break;
                            }
                        }
                    }
                    if (!isContainerNode(node)) lastLeaf = node;
                });
                const perturb = (nodes: TemplateNode[]): TemplateNode[] => {
                    for (const node of nodes) {
                        if (!isContainerNode(node)) continue;
                        if (!swapped && node.children.length >= 2) {
                            [node.children[0], node.children[1]] = [
                                node.children[1]!,
                                node.children[0]!,
                            ];
                            swapped = true;
                        }
                        node.children = perturb(node.children);
                    }
                    return nodes.filter((node) => node !== lastLeaf);
                };
                copy.children = perturb(copy.children);
                const before = structuredClone(copy);
                const { items } = differences(shipped, copy);
                const taken = items.reduce(
                    (draft, item) => switchItem(draft, item, 'shipped'),
                    copy
                );
                expect(taken).toEqual(shipped);
                expect(copy).toEqual(before);
            });
        }
    }
});
