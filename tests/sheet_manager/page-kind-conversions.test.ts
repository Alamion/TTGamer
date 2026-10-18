import {
    copySelection,
    pasteCopied,
} from '@site/src/sheet_manager/features/template-editor/model/clipboard';
import {
    switchPageKind,
    toBriefNodes,
    toFullNodes,
} from '@site/src/sheet_manager/features/template-editor/model/pageKind';
import { moveNode } from '@site/src/sheet_manager/features/template-editor/model/tree';
import {
    CustomTemplateSchema,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateNode,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

/** Containers follow the page kind; fields never change (spec 041, US3). */

const text = (id: string) => ({ id, type: 'text', label: id, required: false, multiline: false });
const card = (id: string, children: object[], extra: object = {}) => ({
    id,
    type: 'group',
    title: id,
    collapsible: false,
    children,
    ...extra,
});
const block = (id: string, children: object[]) => ({ ...card(id, children), type: 'brief' });

function page(id: string, children: object[], brief = false) {
    return CustomTemplateSchema.parse({
        id,
        name: id,
        documentKind: 'character',
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        ...(brief ? { pageKind: 'brief' } : {}),
        children,
    });
}

const leaves = (nodes: readonly TemplateNode[]) => {
    const found: string[] = [];
    walkTemplateNodes(nodes, (node) => {
        if (!['section', 'group', 'brief'].includes(node.type)) found.push(node.id);
    });
    return found;
};
const shape = (nodes: readonly TemplateNode[]) => nodes.map((node) => `${node.type}:${node.id}`);

const full = () =>
    page('tpl-full', [
        {
            id: 'sec',
            type: 'section',
            title: 'Sec',
            children: [
                text('a'),
                card('one', [text('b'), card('inner', [text('c')])], {
                    collapsible: true,
                    defaultCollapsed: true,
                    columns: 2,
                }),
                text('d'),
            ],
        },
    ]);

describe('converting containers', () => {
    it('makes a full page’s section blocks: one per card and one per run of loose fields', () => {
        const { nodes, converted } = toBriefNodes(full().children, new Set(['sec', 'one']));
        expect(shape(nodes)).toEqual(['brief:sec', 'brief:one', 'brief:sec-2']);
        expect(leaves(nodes)).toEqual(['a', 'b', 'c', 'd']);
        expect(nodes[1]).toMatchObject({ collapsible: true, defaultCollapsed: true, columns: 2 });
        expect(converted).toBe(1);
    });

    it('makes a brief’s blocks cards', () => {
        const { nodes, converted } = toFullNodes([
            block('x', [text('a')]) as TemplateNode,
            text('b') as TemplateNode,
        ]);
        expect(shape(nodes)).toEqual(['group:x', 'text:b']);
        expect(converted).toBe(1);
    });

    it('switches a page both ways, every field in reading order', () => {
        const brief = switchPageKind(full(), 'Page');
        expect(brief.nodes.pageKind).toBe('brief');
        expect(CustomTemplateSchema.safeParse(brief.nodes).success).toBe(true);
        expect(leaves(brief.nodes.children)).toEqual(['a', 'b', 'c', 'd']);
        const back = switchPageKind(brief.nodes, 'Page');
        expect(back.nodes.pageKind).toBeUndefined();
        expect(back.nodes.children).toHaveLength(1);
        expect(back.nodes.children[0]).toMatchObject({ type: 'section', title: 'Page' });
        expect(CustomTemplateSchema.safeParse(back.nodes).success).toBe(true);
        expect(leaves(back.nodes.children)).toEqual(['a', 'b', 'c', 'd']);
    });
});

describe('pasting across page kinds', () => {
    it('makes a pasted card a block on a brief', () => {
        const source = page('tpl-src', [{ ...full().children[0]! }]);
        const copied = copySelection(source, ['one'])!;
        const target = page('tpl-brief', [block('home', [text('z')])], true);
        const result = pasteCopied(target, copied, []);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.converted).toBe(1);
        expect(result.draft.children.map(({ type }) => type)).toEqual(['brief', 'brief']);
        expect(CustomTemplateSchema.safeParse(result.draft).success).toBe(true);
    });

    it('makes a pasted block a card on a full page', () => {
        const source = page('tpl-src', [block('x', [text('a')])], true);
        const copied = copySelection(source, ['x'])!;
        const result = pasteCopied(full(), copied, ['sec']);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.converted).toBe(1);
        expect(CustomTemplateSchema.safeParse(result.draft).success).toBe(true);
    });

    it('flattens a block pasted inside a block into its place', () => {
        const source = page('tpl-src', [block('x', [text('a'), text('b')])], true);
        const copied = copySelection(source, ['x'])!;
        const target = page('tpl-brief', [block('home', [text('z')])], true);
        const result = pasteCopied(target, copied, ['z']);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(shape(result.draft.children)).toEqual(['brief:home']);
        expect(leaves(result.draft.children)).toHaveLength(3);
    });

    it('refuses to drag a block into a block or a card onto a brief', () => {
        const target = page(
            'tpl-brief',
            [block('home', [text('z')]), block('other', [text('y')])],
            true
        );
        expect(moveNode(target, 'other', 'home', 0)).toMatchObject({
            ok: false,
            error: 'nesting',
        });
        expect(moveNode(target, 'y', 'home', 0).ok).toBe(true);
    });
});
