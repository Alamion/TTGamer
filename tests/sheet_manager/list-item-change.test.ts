import { listItemChangeReport } from '@site/src/sheet_manager/features/sheet/data/listItemChanges';
import { applyTemplateValueWrites } from '@site/src/sheet_manager/features/sheet/data/templateValueWrites';
import {
    collectTemplateFields,
    collectTreeIssues,
    CustomTemplateSchema,
    fieldLabelPosition,
    hasLabelPositionChoice,
    legacyListItem,
    LIST_ITEM_TYPES,
    listIsNamed,
    type ListItemField,
    listItemField,
    ListItemFieldSchema,
    type ListNode,
} from '@site/src/sheet_manager/types/template';
import {
    coerceListValue,
    TemplateListValueSchema,
    TemplatePageValuesSchema,
} from '@site/src/sheet_manager/types/templateValues';
import { describe, expect, it } from 'vitest';

function item(type: ListItemField['type'], extra: Record<string, unknown> = {}): ListItemField {
    const base = { id: 'entry', label: 'Entry', type, ...extra };
    switch (type) {
        case 'rating':
            return ListItemFieldSchema.parse({ max: 5, ...base });
        case 'resource':
            return ListItemFieldSchema.parse({ max: 10, ...base });
        case 'select':
            return ListItemFieldSchema.parse({
                options: [
                    { id: 'low', label: 'Low' },
                    { id: 'high', label: 'High' },
                ],
                ...base,
            });
        case 'reference':
            return ListItemFieldSchema.parse({ targetKinds: ['character'], ...base });
        default:
            return ListItemFieldSchema.parse(base);
    }
}

function template(list: Record<string, unknown>) {
    return CustomTemplateSchema.parse({
        id: 'tpl-listitem',
        name: 'Lists',
        systemId: 'wod-v5',
        documentKind: 'mortal',
        schemaVersion: 3,
        children: [{ id: 'bonds', type: 'list', valueKey: 'bonds', title: 'Bonds', ...list }],
    });
}

const listOf = (tpl: ReturnType<typeof template>) => tpl.children[0] as ListNode;

describe('list entry template schema (spec 016, T003)', () => {
    it('reads a list without an item as named legacy trait rows', () => {
        const list = listOf(template({}));
        expect(listIsNamed(list)).toBe(true);
        expect(listItemField(list)).toEqual(legacyListItem(list));
        expect(listItemField(list)).toMatchObject({
            id: 'bonds-item',
            type: 'rating',
            label: 'Bonds',
            presentation: 'dots',
            min: 0,
            max: 5,
            dice: true,
            flags: ['specialization', 'practiced', 'experienced'],
        });
    });

    it('offers every field type except formula and rejects a formula item', () => {
        expect(LIST_ITEM_TYPES).not.toContain('formula');
        expect(LIST_ITEM_TYPES).toHaveLength(8);
        expect(() =>
            template({ item: { id: 'calc', type: 'formula', label: 'Calc', formula: '1' } })
        ).toThrow();
    });

    it('keeps the item out of page fields and in the identifier namespace', () => {
        const tpl = template({ item: item('text'), named: false });
        expect(listIsNamed(listOf(tpl))).toBe(false);
        expect([...collectTemplateFields(tpl).keys()]).not.toContain('entry');
        const clash = {
            ...tpl,
            children: [...tpl.children, { id: 'entry', type: 'text', label: 'Clash' }],
        };
        expect(collectTreeIssues(clash as never)).toContainEqual({
            code: 'duplicate-id',
            nodeId: 'entry',
        });
        expect(CustomTemplateSchema.safeParse(clash).success).toBe(false);
    });

    it('rejects an entry template on a system-bound list', () => {
        expect(() =>
            CustomTemplateSchema.parse({
                ...template({}),
                children: [
                    { id: 'skills', type: 'list', bindingKey: 'skills', item: item('text') },
                ],
            })
        ).toThrow();
    });
});

describe('stored list entries (spec 016, T004)', () => {
    it('parses old entries unchanged and the new shapes, including an empty name', () => {
        const old = [{ id: 'e1', label: 'Firearms', value: 3 }];
        expect(TemplateListValueSchema.parse(old)).toEqual(old);
        const current = [
            { id: 'e1', label: '' },
            { id: 'e2', value: 'note' },
            { id: 'e3', value: { current: 2, max: 10 } },
            { id: 'e4', value: { source: 'url', url: 'https://example.com/a.png' } },
            { id: 'e5', label: 'Brawl', value: 2, detail: { specialization: true } },
            { id: 'e6', value: 'e-bone0001', pickLabel: 'Bone Flute' },
        ];
        expect(TemplateListValueSchema.parse(current)).toEqual(current);
        expect(TemplatePageValuesSchema.parse({ bonds: current })).toEqual({ bonds: current });
    });

    it.each([
        ['number', 4, 4],
        ['number', { current: 3, max: 9 }, 3],
        ['rating', 3.6, 4],
        ['rating', 8, 8],
        ['rating', 'text', undefined],
        ['resource', 4, { current: 4, max: 10 }],
        ['resource', { current: 12, max: 30 }, { current: 10, max: 10 }],
        ['text', 'hello', 'hello'],
        ['text', 3, undefined],
        ['toggle', true, true],
        ['toggle', 'yes', undefined],
        ['select', 'high', 'high'],
        ['select', 'missing', undefined],
        ['reference', 'doc-1', 'doc-1'],
        ['reference', 4, undefined],
        [
            'image',
            { source: 'url', url: 'https://example.com/a.png' },
            { source: 'url', url: 'https://example.com/a.png' },
        ],
        ['image', 'x', undefined],
    ] as const)('shows a stored value for a %s entry: %j → %j', (type, value, expected) => {
        expect(coerceListValue(item(type), value)).toEqual(expected);
    });

    it('holds a number entry to its bounds', () => {
        expect(coerceListValue(item('number', { min: 0, max: 10 }), 14)).toBe(10);
    });
});

describe('writing list entries (spec 016, T005)', () => {
    const tpl = template({ item: item('resource') });

    it('validates changed entries against the item', () => {
        const next = { bonds: [{ id: 'e1', label: 'Aunt Vera', value: { current: 3, max: 10 } }] };
        expect(applyTemplateValueWrites(tpl, {}, next)).toEqual({ ok: true, values: next });
        expect(
            applyTemplateValueWrites(tpl, {}, { bonds: [{ id: 'e1', value: 'wrong' }] } as never)
        ).toEqual({ ok: false, key: 'bonds[e1]', reason: 'type' });
        expect(
            applyTemplateValueWrites(tpl, {}, {
                bonds: [{ id: 'e1' }, { id: 'e1' }],
            } as never)
        ).toEqual({ ok: false, key: 'bonds[e1]', reason: 'duplicate-entry' });
        expect(applyTemplateValueWrites(tpl, {}, { bonds: 'x' } as never)).toMatchObject({
            ok: false,
            reason: 'list-not-array',
        });
    });

    it('passes an unchanged unreadable entry through while another entry changes', () => {
        const stale = { id: 'e1', label: 'Old', value: 'from a text item' };
        const previous = { bonds: [stale] } as never;
        const next = { bonds: [stale, { id: 'e2', label: 'New', value: { current: 1, max: 10 } }] };
        expect(applyTemplateValueWrites(tpl, previous, next as never)).toEqual({
            ok: true,
            values: next,
        });
    });

    it('drops companions the item has no use for from a changed entry', () => {
        const unnamed = template({ item: item('text'), named: false });
        const result = applyTemplateValueWrites(unnamed, {}, {
            bonds: [{ id: 'e1', label: 'Hidden', value: 'note', detail: { practiced: true } }],
        } as never);
        expect(result).toEqual({ ok: true, values: { bonds: [{ id: 'e1', value: 'note' }] } });
    });

    it('keeps rating flags on legacy entries', () => {
        const legacy = template({});
        const bonds = [{ id: 'e1', label: 'Brawl', value: 2, detail: { specialization: true } }];
        expect(applyTemplateValueWrites(legacy, {}, { bonds })).toEqual({
            ok: true,
            values: { bonds },
        });
    });
});

describe('the list change report (spec 016, T022)', () => {
    const doc = (entries: unknown[], kind = 'mortal') => ({
        systemId: 'wod-v5',
        kind,
        templateValues: { bonds: entries },
    });
    const legacy = template({});
    const ratingEntries = [
        { id: 'e1', label: 'Brawl', value: 2 },
        { id: 'e2', label: 'Guns', value: 3 },
    ];

    it('counts values the new entry type cannot show', () => {
        expect(
            listItemChangeReport(legacy, template({ item: item('image') }), [
                doc(ratingEntries),
                doc([{ id: 'x', label: 'Empty' }]),
                doc(ratingEntries, 'character'),
            ])
        ).toEqual([
            { listId: 'bonds', title: 'Bonds', documents: 1, lostValues: 2, hiddenNames: 0 },
        ]);
    });

    it('reports nothing for changes that keep every value', () => {
        expect(
            listItemChangeReport(legacy, template({ item: item('number') }), [doc(ratingEntries)])
        ).toEqual([]);
        expect(
            listItemChangeReport(
                template({ item: item('number') }),
                template({ item: item('resource') }),
                [doc(ratingEntries)]
            )
        ).toEqual([]);
        expect(listItemChangeReport(undefined, legacy, [doc(ratingEntries)])).toEqual([]);
    });

    it('counts names an unnamed list hides', () => {
        expect(
            listItemChangeReport(legacy, template({ named: false }), [doc(ratingEntries)])
        ).toEqual([
            { listId: 'bonds', title: 'Bonds', documents: 1, lostValues: 0, hiddenNames: 2 },
        ]);
    });
});

describe('image labels (spec 016 follow-up)', () => {
    it('keeps an image label above even when a template asks for beside', () => {
        expect(fieldLabelPosition({ type: 'image', labelPosition: 'left' })).toBe('top');
        expect(hasLabelPositionChoice('image')).toBe(false);
        expect(fieldLabelPosition({ type: 'text', labelPosition: 'left' })).toBe('left');
    });
});
