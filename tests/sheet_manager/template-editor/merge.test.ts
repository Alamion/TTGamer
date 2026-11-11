import { mergePages } from '@site/src/sheet_manager/features/template-editor/merge/merge';
import { systemRegistry } from '@site/src/sheet_manager/systems/index';
import type { CustomTemplate, TemplateNode } from '@site/src/sheet_manager/types/template';
import {
    CustomTemplateSchema,
    isContainerNode,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
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

function merged(base: CustomTemplate, shipped: CustomTemplate, copy: CustomTemplate) {
    const result = mergePages(base, shipped, copy);
    if ('error' in result) throw new Error(result.error);
    return result;
}

describe('three-way page merge', () => {
    it.each(['shipped', 'copy', 'same', 'conflict'] as const)(
        'merges property edits: %s',
        (side) => {
            const base = page([field('a')]);
            const shipped = page([field('a', side === 'copy' ? 'a' : 'Shipped')]);
            const copy = page([
                field('a', side === 'shipped' ? 'a' : side === 'same' ? 'Shipped' : 'Copy'),
            ]);
            const result = merged(base, shipped, copy);
            expect(result.draft).toEqual(side === 'shipped' ? shipped : copy);
            expect(result.items).toEqual(
                side === 'copy' || side === 'same'
                    ? []
                    : [
                          expect.objectContaining({
                              key: 'a:label',
                              nodeId: 'a',
                              path: ['a'],
                              kind: 'changed',
                              prop: 'label',
                              origin: side,
                              userValue: side === 'shipped' ? 'a' : 'Copy',
                              shippedValue: 'Shipped',
                          }),
                      ]
            );
        }
    );

    it('deletes absent properties, compares nested objects without key order, and sorts items', () => {
        const base = page([field('a')]);
        base.description = 'Old';
        const shipped = page([field('a', 'New')]);
        shipped.name = 'New page';
        const result = merged(base, shipped, base);
        expect(result.draft).toEqual(shipped);
        expect(result.items.map((item) => item.key)).toEqual([
            '$page:description',
            '$page:name',
            'a:label',
        ]);
        const b = page([
            {
                id: 'a',
                type: 'select',
                label: 'A',
                required: false,
                multiple: false,
                options: [{ id: 'x', label: 'X' }],
            },
        ]);
        const s = structuredClone(b);
        const select = s.children[0]!;
        if (select.type !== 'select') throw new Error('Expected select fixture');
        s.children[0] = { ...select, options: [{ label: 'X', id: 'x' }] };
        expect(merged(b, s, b).items).toEqual([]);
    });

    it('takes one new shipped subtree and keeps copy-only additions', () => {
        const base = page([field('a')]);
        const shipped = page([field('a'), group('new', [field('nested')])]);
        const copy = page([field('mine'), field('a')]);
        const result = merged(base, shipped, copy);
        expect(result.draft.children.map((node) => node.id)).toEqual(['mine', 'a', 'new']);
        expect(result.items).toEqual([
            expect.objectContaining({
                key: 'new:$added',
                kind: 'added',
                origin: 'shipped',
                path: ['new'],
                userValue: undefined,
                shippedValue: { node: shipped.children[1], parentId: null, afterId: 'a' },
            }),
        ]);
    });

    it('keeps identical independent additions and conflicts on different props of the same new id', () => {
        const base = page([field('a')]);
        const shipped = page([field('a'), field('new', 'Shipped')]);
        expect(merged(base, shipped, shipped).items).toEqual([]);
        const copy = page([field('a'), field('new', 'Copy')]);
        const result = merged(base, shipped, copy);
        expect(result.draft).toEqual(copy);
        expect(result.items).toEqual([
            expect.objectContaining({ kind: 'added', origin: 'conflict', nodeId: 'new' }),
        ]);
    });

    it('removes an untouched shipped subtree once and preserves descendants moved out by shipped', () => {
        const base = page([group('old', [field('a'), field('b')]), field('tail')]);
        const shipped = page([field('b'), field('tail')]);
        const result = merged(base, shipped, base);
        expect(result.draft).toEqual(shipped);
        expect(result.items.filter((item) => item.kind === 'removed')).toEqual([
            expect.objectContaining({
                nodeId: 'old',
                origin: 'shipped',
                path: ['old'],
                userValue: { node: base.children[0], parentId: null, afterId: null },
                shippedValue: undefined,
            }),
        ]);
    });

    it('keeps a removed node changed by the copy as a conflict', () => {
        const base = page([field('a'), field('b')]);
        const shipped = page([field('b')]);
        const copy = page([field('a', 'Mine'), field('b')]);
        const result = merged(base, shipped, copy);
        expect(result.draft).toEqual(copy);
        expect(result.items).toEqual([
            expect.objectContaining({ nodeId: 'a', kind: 'removed', origin: 'conflict' }),
        ]);
    });

    it('keeps removed containers with copy-only descendants while taking unchanged child removals', () => {
        const base = page([group('old', [field('a')]), field('tail')]);
        const shipped = page([field('tail')]);
        const copy = page([group('old', [field('a'), field('mine')]), field('tail')]);
        const result = merged(base, shipped, copy);
        expect(result.draft).toEqual(page([group('old', [field('mine')]), field('tail')]));
        expect(result.items).toEqual([
            expect.objectContaining({ nodeId: 'a', kind: 'removed', origin: 'shipped' }),
            expect.objectContaining({ nodeId: 'old', kind: 'removed', origin: 'conflict' }),
        ]);
    });

    it('keeps copy removals, reports shipped edits to missing nodes, and ignores joint removals', () => {
        const base = page([field('a'), field('b')]);
        const copy = page([field('b')]);
        expect(merged(base, base, copy)).toEqual({ draft: copy, items: [] });
        expect(merged(base, copy, copy)).toEqual({ draft: copy, items: [] });
        const shipped = page([field('a', 'Changed'), field('b')]);
        const result = merged(base, shipped, copy);
        expect(result.draft).toEqual(copy);
        expect(result.items).toEqual([
            expect.objectContaining({
                nodeId: 'a',
                kind: 'removed',
                origin: 'conflict',
                path: ['a'],
                userValue: undefined,
                shippedValue: { node: shipped.children[0], parentId: null, afterId: null },
            }),
        ]);
    });

    it.each(['shipped', 'copy', 'same', 'conflict'] as const)('merges parent moves: %s', (side) => {
        const base = page([group('one', [field('a')]), group('two', []), group('three', [])]);
        const shipped = page([
            group('one', side === 'copy' ? [field('a')] : []),
            group('two', side === 'copy' ? [] : [field('a')]),
            group('three', []),
        ]);
        const copy =
            side === 'shipped'
                ? base
                : side === 'same'
                  ? shipped
                  : page([group('one', []), group('two', []), group('three', [field('a')])]);
        const result = merged(base, shipped, copy);
        expect(result.draft).toEqual(side === 'shipped' ? shipped : copy);
        expect(result.items).toEqual(
            side === 'copy' || side === 'same'
                ? []
                : [
                      expect.objectContaining({
                          nodeId: 'a',
                          kind: 'moved',
                          prop: '$moved',
                          origin: side,
                          path: [side === 'shipped' ? 'two' : 'three', 'a'],
                      }),
                  ]
        );
    });

    it('places shipped additions after the nearest surviving shipped predecessor', () => {
        const base = page([field('a'), field('b'), field('c')]);
        const shipped = page([field('first'), field('a'), field('b'), field('new'), field('c')]);
        const copy = page([field('a'), field('mine'), field('c')]);
        const result = merged(base, shipped, copy);
        expect(result.draft.children.map((node) => node.id)).toEqual([
            'first',
            'a',
            'new',
            'mine',
            'c',
        ]);
    });

    it.each([true, false])(
        'rescues additions from a removed parent (ancestor remains: %s)',
        (keep) => {
            const base = page([group('outer', [group('inner', [field('old')])]), field('tail')]);
            const shipped = page([
                group('outer', [group('inner', [field('old'), group('new', [field('nested')])])]),
                field('tail'),
            ]);
            const copy = page(
                keep ? [group('outer', [field('mine')]), field('tail')] : [field('tail')]
            );
            const result = merged(base, shipped, copy);
            expect(result.draft).toEqual(
                page(
                    keep
                        ? [
                              group('outer', [field('mine'), group('new', [field('nested')])]),
                              field('tail'),
                          ]
                        : [field('tail'), group('new', [field('nested')])]
                )
            );
            expect(result.items.find((item) => item.nodeId === 'new')?.path).toEqual(
                keep ? ['outer', 'new'] : ['new']
            );
        }
    );

    it('takes shipped sibling order while copy-only nodes keep their slots', () => {
        const base = page([field('a'), field('b'), field('c')]);
        const shipped = page([field('c'), field('b'), field('a')]);
        const copy = page([field('a'), field('mine'), field('b'), field('c')]);
        const result = merged(base, shipped, copy);
        expect(result.draft.children.map((node) => node.id)).toEqual(['c', 'mine', 'b', 'a']);
        expect(result.items).toEqual([
            expect.objectContaining({
                key: 'root:$order',
                prop: '$order',
                kind: 'moved',
                origin: 'shipped',
                userValue: ['a', 'mine', 'b', 'c'],
                shippedValue: ['c', 'b', 'a'],
            }),
        ]);
    });

    it('places moved-in shipped nodes after their nearest surviving predecessor', () => {
        const base = page([group('one', [field('moved')]), group('two', [field('a'), field('b')])]);
        const shipped = page([
            group('one', []),
            group('two', [field('a'), field('moved'), field('b')]),
        ]);
        const copy = page([
            group('one', [field('moved')]),
            group('two', [field('a'), field('mine'), field('b')]),
        ]);
        const result = merged(base, shipped, copy);
        expect(result.draft).toEqual(
            page([
                group('one', []),
                group('two', [field('a'), field('moved'), field('mine'), field('b')]),
            ])
        );
        expect(result.items).toEqual([
            expect.objectContaining({ nodeId: 'moved', prop: '$moved', origin: 'shipped' }),
        ]);
    });

    it('falls back to a surviving shipped ancestor when a move destination was removed', () => {
        const base = page([field('moved'), group('outer', [group('inner', [])]), field('tail')]);
        const shipped = page([group('outer', [group('inner', [field('moved')])]), field('tail')]);
        const copy = page([field('moved'), group('outer', [field('mine')]), field('tail')]);
        expect(merged(base, shipped, copy).draft).toEqual(
            page([group('outer', [field('mine'), field('moved')]), field('tail')])
        );
    });

    it('appends a shipped move at page end when no destination ancestor remains', () => {
        const base = page([field('moved'), group('gone', []), field('tail')]);
        const shipped = page([group('gone', [field('moved')]), field('tail')]);
        const copy = page([field('moved'), field('tail')]);
        expect(merged(base, shipped, copy).draft).toEqual(page([field('tail'), field('moved')]));
    });

    it('keeps conflicting order and emits nothing for copy-only or identical reorders', () => {
        const base = page([group('g', [field('a'), field('b'), field('c')])]);
        const shipped = page([group('g', [field('b'), field('a'), field('c')])]);
        const copy = page([group('g', [field('c'), field('b'), field('a')])]);
        expect(merged(base, base, copy).items).toEqual([]);
        expect(merged(base, shipped, shipped).items).toEqual([]);
        const result = merged(base, shipped, copy);
        expect(result.draft).toEqual(copy);
        expect(result.items).toEqual([
            expect.objectContaining({ key: 'g:$order', origin: 'conflict', path: ['g'] }),
        ]);
    });

    it('merges page properties and takes shipped identity with the copy setting', () => {
        const base = page([field('a')]);
        const shipped = {
            ...base,
            id: 'shipped',
            name: 'Shipped',
            description: 'New',
            pageKind: 'brief' as const,
            systemId: 'v5' as CustomTemplate['systemId'],
            documentKind: 'character' as CustomTemplate['documentKind'],
            schemaVersion: 5,
            settingId: 'shipped-setting',
        };
        const copy = { ...base, name: 'Mine', settingId: 'my-setting' };
        const result = merged(base, shipped, copy);
        expect(result.draft).toEqual({ ...shipped, name: 'Mine', settingId: 'my-setting' });
        expect(result.items.map((item) => item.key)).toEqual([
            '$page:description',
            '$page:name',
            '$page:pageKind',
        ]);
    });

    it('compares labelMessage as one stored value, without translating any locale', () => {
        const base = page([{ ...field('a'), labelMessage: 'ttgamer.label.old' }]);
        const shipped = page([{ ...field('a'), labelMessage: 'ttgamer.label.new' }]);
        const result = merged(base, shipped, base);
        expect(result.items).toEqual([
            expect.objectContaining({ key: 'a:labelMessage', shippedValue: 'ttgamer.label.new' }),
        ]);
        expect(merged(base, structuredClone(base), structuredClone(base)).items).toEqual([]);
    });

    it('does not mutate inputs and shares untouched nodes', () => {
        const base = page([group('g', [field('a')]), field('b')]);
        const before = structuredClone(base);
        const shipped = { ...base, name: 'Changed' };
        const result = merged(base, shipped, base);
        expect(base).toEqual(before);
        expect(result.draft.children).toBe(base.children);
        expect(result.draft.children[0]).toBe(base.children[0]);
    });

    it('never throws for duplicate ids, cycles, or malformed children', () => {
        const valid = page([field('a')]);
        const cycle = group('cycle', []);
        if (isContainerNode(cycle)) cycle.children.push(cycle);
        const bad = [
            { ...valid, children: [field('a'), field('a')] },
            { ...valid, children: [cycle] },
            { ...valid, children: 'bad' },
            { ...valid, children: [{ id: 'bad', type: 'section', children: {} }] },
            { ...valid, children: [{ id: 'bad', type: 'unknown' }] },
            { ...valid, children: [{ ...field('bad'), children: [] }] },
            { ...valid, children: [null] },
        ];
        for (const tree of bad) {
            for (const inputs of [
                [tree, valid, valid],
                [valid, tree, valid],
                [valid, valid, tree],
            ]) {
                let result;
                expect(() => {
                    result = mergePages(
                        ...(inputs as [CustomTemplate, CustomTemplate, CustomTemplate])
                    );
                }).not.toThrow();
                expect(result).toEqual({ error: expect.any(String) });
            }
        }
    });

    for (const system of systemRegistry.getSystems()) {
        for (const original of system.defaultTemplates ?? []) {
            it(`satisfies SC-002 for ${system.id}:${original.id}`, () => {
                const base = structuredClone(original);
                let labeled = false;
                let swapped = false;
                let lastLeaf: TemplateNode | undefined;
                walkTemplateNodes(base.children, (node) => {
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
                const perturbChildren = (nodes: TemplateNode[]): TemplateNode[] => {
                    for (const node of nodes) {
                        if (!isContainerNode(node)) continue;
                        if (!swapped && node.children.length >= 2) {
                            [node.children[0], node.children[1]] = [
                                node.children[1]!,
                                node.children[0]!,
                            ];
                            swapped = true;
                        }
                        node.children = perturbChildren(node.children);
                    }
                    return nodes.filter((node) => node !== lastLeaf);
                };
                base.children = perturbChildren(base.children);
                for (const result of [merged(base, original, base), merged(base, base, original)]) {
                    expect(result.draft).toEqual(original);
                    expect(result.items.some((item) => item.origin === 'conflict')).toBe(false);
                }
            });
        }
    }
});
