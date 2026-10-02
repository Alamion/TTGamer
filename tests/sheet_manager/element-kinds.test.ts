import {
    elementKind,
    type KindStash,
    switchGroupKind,
    switchListKind,
    tableKindBlocked,
} from '@site/src/sheet_manager/components/dialogs/template-editor/elementKinds';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    CustomTemplateSchema,
    type GroupNode,
    type ListNode,
    type SectionNode,
    type TableNode,
    type TemplateNode,
} from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const parse = (node: unknown): TemplateNode =>
    CustomTemplateSchema.parse({
        id: 'kinds-kit',
        name: 'Kinds Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [node],
    }).children[0]!;

/** The node is valid inside a template (no schema migration, FR-027). */
const valid = (node: TemplateNode) =>
    CustomTemplateSchema.safeParse({
        id: 'kinds-kit',
        name: 'Kinds Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [node],
    }).success;

const section = () =>
    parse({
        id: 'adv',
        type: 'section',
        title: 'Advantages',
        columns: 2,
        docsPath: '/docs/wod-v5',
        defaultCollapsed: true,
        children: [{ id: 'luck', type: 'number', label: 'Luck' }],
    }) as SectionNode;

const entries = () =>
    parse({
        id: 'skills',
        type: 'list',
        title: 'Skills',
        valueKey: 'skills',
        named: false,
        columns: 2,
        presets: [{ key: 'p1', label: 'Melee' }],
        item: { id: 'skill', type: 'rating', label: 'Skill', max: 5 },
    }) as ListNode;

const table = () =>
    parse({
        id: 'gear',
        type: 'table',
        title: 'Gear',
        valueKey: 'gear',
        minRows: 1,
        columns: [
            { id: 'total', type: 'formula', label: 'Total', formula: '1' },
            { id: 'qty', type: 'number', label: 'Qty' },
        ],
    }) as TableNode;

describe('element kinds (spec 022, US6)', () => {
    it('names every container and list kind', () => {
        expect(elementKind(section())).toEqual({ element: 'group', kind: 'section' });
        expect(elementKind(switchGroupKind(section(), 'card', new Map()))).toEqual({
            element: 'group',
            kind: 'card',
        });
        expect(elementKind(entries())).toEqual({ element: 'list', kind: 'entries' });
        expect(elementKind(table())).toEqual({ element: 'list', kind: 'table' });
        expect(elementKind(parse({ id: 'x', type: 'text', label: 'X' }))).toBeUndefined();
    });

    it('turns a section into a foldable card and back, keeping title, contents, and columns', () => {
        const stash: KindStash = new Map();
        const original = section();
        const card = switchGroupKind(original, 'card', stash) as GroupNode;
        expect(card).toMatchObject({
            type: 'group',
            title: 'Advantages',
            columns: 2,
            collapsible: true,
            defaultCollapsed: true,
            docsPath: '/docs/wod-v5',
        });
        expect(card.children).toBe(original.children);
        expect(valid(card)).toBe(true);

        const hidden = { ...card, hideTitle: true, collapsible: false };
        const back = switchGroupKind(hidden, 'section', stash);
        expect(back).toEqual(original);
        // The card's own settings return when switching to a card again.
        expect(switchGroupKind(back, 'card', stash)).toMatchObject({
            hideTitle: true,
            collapsible: false,
        });
    });

    it('makes the entry field the first column, and restores entry settings on the way back', () => {
        const stash: KindStash = new Map();
        const original = entries();
        const { node: asTable, dropped } = switchListKind(original, 'table', stash);
        expect(dropped).toEqual([]);
        expect(asTable).toMatchObject({ type: 'table', title: 'Skills', valueKey: 'skills' });
        expect(asTable.type === 'table' && asTable.columns.map(({ id }) => id)).toEqual(['skill']);
        expect(valid(asTable)).toBe(true);

        const { node: back } = switchListKind(asTable, 'entries', stash);
        expect(back).toEqual(original);
    });

    it('drops extra columns and turns other types into text when a table becomes entries', () => {
        const stash: KindStash = new Map();
        const { node, dropped } = switchListKind(table(), 'entries', stash);
        expect(dropped.map(({ id }) => id)).toEqual(['qty']);
        expect(node).toMatchObject({
            type: 'list',
            valueKey: 'gear',
            item: { id: 'total', type: 'text', label: 'Total' },
        });
        expect(valid(node)).toBe(true);
        // Switching back in the session brings the dropped column and row limits back.
        const { node: again } = switchListKind(node, 'table', stash);
        expect(again).toMatchObject({ minRows: 1 });
        expect(again.type === 'table' && again.columns.map(({ id }) => id)).toEqual([
            'total',
            'qty',
        ]);
    });

    it('offers no table for game lists and catalog lists', () => {
        const game = parse({ id: 'merits', type: 'list', bindingKey: 'list:merits' }) as ListNode;
        const suggesting = { ...entries(), catalog: { catalogId: 'merits' } };
        expect(tableKindBlocked(game)).toBe(true);
        expect(tableKindBlocked(suggesting)).toBe(true);
        expect(tableKindBlocked(entries())).toBe(false);
        expect(switchListKind(game, 'table', new Map()).node).toBe(game);
    });

    it('leaves shipped templates byte-identical when nothing is switched (SC-005)', () => {
        for (const system of systemRegistry.getSystems()) {
            for (const template of system.defaultTemplates ?? []) {
                const saved = CustomTemplateSchema.parse(structuredClone(template));
                expect(saved, template.id).toEqual(template);
                const again = CustomTemplateSchema.parse(structuredClone(saved));
                expect(JSON.stringify(again), template.id).toBe(JSON.stringify(saved));
            }
        }
    });
});
