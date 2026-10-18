import {
    CustomTemplateSchema,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateNode,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import { upgradeTemplate } from '@site/src/sheet_manager/types/templateUpgrade';
import { describe, expect, it } from 'vitest';

/** Schema 3 → 4: page kinds and brief blocks (spec 041, design D4). */

const text = (id: string, extra: object = {}) => ({
    id,
    type: 'text',
    label: id,
    multiline: false,
    required: false,
    compact: false,
    ...extra,
});
const rating = (id: string, extra: object = {}) => ({
    id,
    type: 'rating',
    label: id,
    min: 0,
    max: 5,
    presentation: 'dots',
    required: false,
    compact: true,
    ...extra,
});
const trait = (id: string, extra: object = {}) => ({
    id,
    type: 'primitive',
    bindingKey: `trait:attributes:${id}`,
    compact: true,
    ...extra,
});
const area = (id: string, children: object[], extra: object = {}) => ({
    id,
    type: 'group',
    title: id,
    collapsible: false,
    layout: 'area',
    children,
    ...extra,
});
const card = (id: string, children: object[], extra: object = {}) => ({
    id,
    type: 'group',
    title: id,
    collapsible: false,
    children,
    ...extra,
});
const section = (id: string, children: object[]) => ({
    id,
    type: 'section',
    title: id,
    children,
});
const page = (id: string, children: object[]) => ({
    id,
    name: id,
    systemId: 'wod-v5',
    documentKind: 'character',
    schemaVersion: 3,
    children,
});

const ids = (children: readonly TemplateNode[]) => {
    const found: string[] = [];
    walkTemplateNodes(children, (node) => found.push(`${node.type}:${node.id}`));
    return found;
};
const leafIds = (children: readonly TemplateNode[]) =>
    ids(children)
        .filter((entry) => !/^(section|group|brief):/.test(entry))
        .map((entry) => entry.split(':')[1]);

const notShipped = () => undefined;

describe('upgrading a schema 3 template', () => {
    it('turns a shipped brief into a brief of blocks, quietly', () => {
        const raw = page('v5-core-brief', [
            area('attributes', [trait('strength', { shortForm: true }), trait('wits')], {
                columns: 3,
                collapsible: true,
                defaultCollapsed: true,
                docsPath: '/docs/x',
            }),
            area('notes-block', [text('notes', { multiline: true })]),
        ]);
        const { template, summary } = upgradeTemplate(raw, () => 'brief');
        expect(template.schemaVersion).toBe(TEMPLATE_SCHEMA_VERSION);
        expect(template.pageKind).toBe('brief');
        expect(template.children.map((node) => node.type)).toEqual(['brief', 'brief']);
        const block = template.children[0] as Extract<TemplateNode, { type: 'brief' }>;
        expect(block).toMatchObject({
            id: 'attributes',
            title: 'attributes',
            columns: 3,
            collapsible: true,
            defaultCollapsed: true,
            docsPath: '/docs/x',
        });
        expect(block).not.toHaveProperty('layout');
        // A rating that showed its name keeps it; one with a short form needs no flag.
        expect(block.children[0]).not.toHaveProperty('fullLabel');
        expect(block.children[1]).toMatchObject({ fullLabel: true });
        for (const child of block.children) {
            expect(child).not.toHaveProperty('compact');
            expect(child).not.toHaveProperty('shortForm');
        }
        expect(summary.notable).toBe(false);
        expect(CustomTemplateSchema.parse(raw)).toEqual(template);
    });

    it('keeps an edited shipped brief a brief, converting its cards and sections', () => {
        const raw = page('v5-vampire-brief', [
            area('attributes', [trait('strength', { shortForm: true })]),
            card('extra', [text('a'), card('inner', [text('b')])]),
            section('more', [text('c'), card('weapons', [text('d')]), text('e')]),
        ]);
        const { template, summary } = upgradeTemplate(raw, () => 'brief');
        expect(template.pageKind).toBe('brief');
        expect(template.children.map((node) => `${node.type}:${node.id}`)).toEqual([
            'brief:attributes',
            'brief:extra',
            'brief:more',
            'brief:weapons',
            'brief:more-2',
        ]);
        expect(leafIds(template.children)).toEqual(['strength', 'a', 'b', 'c', 'd', 'e']);
        expect(summary).toMatchObject({ kind: 'brief', notable: true, flattened: 1 });
        expect(summary.blocks).toBe(4);
    });

    it('makes a user page of brief-look cards only a brief', () => {
        const raw = page('tpl-mine', [area('one', [text('a')]), text('loose')]);
        const { template, summary } = upgradeTemplate(raw, notShipped);
        expect(template.pageKind).toBe('brief');
        expect(template.children.map((node) => node.type)).toEqual(['brief', 'text']);
        expect(summary.notable).toBe(false);
    });

    it('makes a mixed user page a full page whose brief-look cards become cards', () => {
        const raw = page('tpl-mixed', [
            area('one', [text('a')]),
            section('sec', [card('c', [text('b')])]),
        ]);
        const { template, summary } = upgradeTemplate(raw, notShipped);
        expect(template.pageKind).toBeUndefined();
        expect(template.children[0]).toMatchObject({ type: 'group', id: 'one' });
        expect(template.children[0]).not.toHaveProperty('layout');
        expect(leafIds(template.children)).toEqual(['a', 'b']);
        expect(summary).toMatchObject({ kind: 'full', notable: true });
    });

    it('drops the compact look of a full page and says so', () => {
        const raw = page('tpl-full', [
            section('sec', [
                card('c', [
                    { id: 'f', type: 'formula', label: 'f', formula: '1', compact: true },
                    rating('r', { compact: false }),
                ]),
            ]),
        ]);
        const { template, summary } = upgradeTemplate(raw, notShipped);
        expect(template.pageKind).toBeUndefined();
        const fields = (template.children[0] as Extract<TemplateNode, { type: 'section' }>)
            .children[0] as Extract<TemplateNode, { type: 'group' }>;
        for (const child of fields.children) expect(child).not.toHaveProperty('compact');
        expect(fields.children[1]).not.toHaveProperty('fullLabel');
        expect(summary).toMatchObject({ kind: 'full', lookDropped: 1, notable: true });
    });

    it('leaves a schema 4 page as it is', () => {
        const current = {
            ...page('tpl-new', [{ ...area('b', [text('a')]), type: 'brief' }]),
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            pageKind: 'brief',
        };
        const parsed = CustomTemplateSchema.parse(current);
        expect(parsed.children[0]).toMatchObject({ type: 'brief', id: 'b' });
        expect(upgradeTemplate(current, notShipped).summary.notable).toBe(false);
    });

    it('refuses a card on a brief and a block on a full page', () => {
        const brief = {
            ...page('tpl-a', [card('c', [text('a')])]),
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            pageKind: 'brief',
        };
        expect(CustomTemplateSchema.safeParse(brief).success).toBe(false);
        const full = {
            ...page('tpl-b', [{ ...area('b', [text('a')]), type: 'brief' }]),
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
        };
        expect(CustomTemplateSchema.safeParse(full).success).toBe(false);
        const nested = {
            ...page('tpl-c', [
                { ...area('b', [{ ...area('c', [text('a')]), type: 'brief' }]), type: 'brief' },
            ]),
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            pageKind: 'brief',
        };
        expect(CustomTemplateSchema.safeParse(nested).success).toBe(false);
    });
});
