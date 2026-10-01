import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    CustomTemplateSchema,
    LIST_ITEM_TYPES,
    TEMPLATE_FIELD_TYPES,
    TemplateFieldSchema,
} from '@site/src/sheet_manager/types/template';
import {
    coerceStoredValue,
    TemplatePageValuesSchema,
    validateTemplateValue,
} from '@site/src/sheet_manager/types/templateValues';
import { describe, expect, it } from 'vitest';

/** Tracker schemas: the field, the built-in override, and the stored value (spec 018). */

const level = (index: number) => ({ id: `l${index}`, name: `Level ${index}`, value: '' });
const mark = (id: string, fill = 'error') => ({ id, name: id, symbol: '×', fill });

function tracker(overrides: Record<string, unknown> = {}) {
    return {
        id: 'stress',
        type: 'tracker',
        label: 'Stress',
        marks: [mark('m1')],
        levels: [level(1), level(2), level(3)],
        columns: [{ id: 'c1', kind: 'marks' }],
        ...overrides,
    };
}

const parses = (value: unknown) => TemplateFieldSchema.safeParse(value).success;

const nodeParses = (node: unknown) =>
    CustomTemplateSchema.safeParse({
        id: 'tpl-tracker',
        name: 'Trackers',
        systemId: 'wod-2e',
        documentKind: 'character',
        schemaVersion: 3,
        children: [node],
    }).success;

describe('the tracker field', () => {
    it('is a field type but not a list item type', () => {
        expect(TEMPLATE_FIELD_TYPES).toContain('tracker');
        expect(LIST_ITEM_TYPES).not.toContain('tracker');
    });

    it('fills its defaults', () => {
        const parsed = TemplateFieldSchema.parse(tracker());
        expect(parsed).toMatchObject({
            display: 'table',
            total: true,
            out: false,
            lengths: [],
            valueColumn: { show: true },
        });
    });

    it('bounds levels, marks, columns, copies, and lengths', () => {
        expect(parses(tracker({ levels: Array.from({ length: 20 }, (_, i) => level(i)) }))).toBe(
            true
        );
        expect(parses(tracker({ levels: Array.from({ length: 21 }, (_, i) => level(i)) }))).toBe(
            false
        );
        expect(
            parses(tracker({ marks: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => mark(id)) }))
        ).toBe(false);
        const columns = (count: number) =>
            Array.from({ length: count }, (_, i) => ({ id: `c${i}`, kind: 'marks' }));
        expect(parses(tracker({ columns: columns(6) }))).toBe(true);
        expect(parses(tracker({ columns: columns(7) }))).toBe(false);
        expect(
            parses(tracker({ columns: [{ id: 'c1', kind: 'marks', copies: { max: 25 } }] }))
        ).toBe(false);
        const lengths = (count: number) =>
            Array.from({ length: count }, () => ({ levels: ['l1'] }));
        expect(parses(tracker({ lengths: lengths(6) }))).toBe(true);
        expect(parses(tracker({ lengths: lengths(7) }))).toBe(false);
    });

    it('counts symbols in characters and takes palette or own fills', () => {
        expect(parses(tracker({ marks: [{ ...mark('m1'), symbol: '✱' }] }))).toBe(true);
        expect(parses(tracker({ marks: [{ ...mark('m1'), symbol: '✱✱' }] }))).toBe(true);
        expect(parses(tracker({ marks: [{ ...mark('m1'), symbol: 'abc' }] }))).toBe(false);
        expect(parses(tracker({ marks: [mark('m1', 'tertiary')] }))).toBe(true);
        expect(parses(tracker({ marks: [mark('m1', '#0e7490')] }))).toBe(true);
        expect(parses(tracker({ marks: [mark('m1', 'blue')] }))).toBe(false);
    });

    it('needs unique ids and a marks column', () => {
        expect(parses(tracker({ levels: [level(1), level(1)] }))).toBe(false);
        expect(parses(tracker({ marks: [mark('m1'), mark('m1')] }))).toBe(false);
        expect(parses(tracker({ columns: [{ id: 'c1', kind: 'text' }] }))).toBe(false);
    });

    it('is rejected as a table column', () => {
        const table = {
            id: 'crew',
            type: 'table',
            columns: [tracker({ id: 'wounds' })],
        };
        expect(nodeParses(table)).toBe(false);
    });
});

describe('the built-in tracker override', () => {
    const primitive = (extra: Record<string, unknown>) => ({
        id: 'health',
        type: 'primitive',
        bindingKey: 'track:health',
        ...extra,
    });

    it('keeps legacy options readable and takes the new settings', () => {
        for (const extra of [
            { compact: true },
            { trackLayout: 'table' },
            { track: { levels: 2, names: ['A', 'B'] } },
            {
                tracker: {
                    display: 'line',
                    marks: { cross: { name: 'Lethal', fill: '#aa0000' } },
                    levels: [null, { name: 'Hurt badly', value: '-2' }],
                    columns: [{ id: 'source', kind: 'text', title: 'Source' }],
                    total: true,
                },
            },
        ]) {
            expect(nodeParses(primitive(extra)), JSON.stringify(extra)).toBe(true);
        }
    });

    it('parses every shipped template', () => {
        for (const system of systemRegistry.getSystems()) {
            for (const template of system.defaultTemplates ?? []) {
                expect(CustomTemplateSchema.safeParse(template).success, template.id).toBe(true);
            }
        }
    });
});

describe('the stored tracker value', () => {
    const field = TemplateFieldSchema.parse(
        tracker({ columns: [{ id: 'c1', kind: 'marks', copies: { max: 2 } }] })
    );
    const value = (copies: number) => ({
        tracker: 1,
        columns: {
            c1: Array.from({ length: copies }, (_, i) => ({ id: `k${i}`, marks: { l1: 'm1' } })),
        },
    });

    it('is a page value of its own shape', () => {
        expect(TemplatePageValuesSchema.safeParse({ stress: value(1) }).success).toBe(true);
        expect(TemplatePageValuesSchema.parse({ stress: value(1) }).stress).toEqual(value(1));
    });

    it('validates the shape and the copy maximum at the write path', () => {
        expect(validateTemplateValue(field, value(2)).ok).toBe(true);
        expect(validateTemplateValue(field, value(3))).toEqual({ ok: false, reason: 'bounds' });
        expect(validateTemplateValue(field, { columns: {} })).toEqual({
            ok: false,
            reason: 'type',
        });
        const longText = {
            tracker: 1,
            columns: { c1: [{ id: 'k', texts: { l1: 'x'.repeat(201) } }] },
        };
        expect(validateTemplateValue(field, longText).ok).toBe(false);
    });

    it('keeps unknown ids and extra copies readable', () => {
        const stale = { tracker: 1, columns: { gone: [{ id: 'k', marks: { l9: 'm9' } }] } };
        expect(validateTemplateValue(field, stale).ok).toBe(true);
        expect(coerceStoredValue(field, value(3))).toEqual(value(3));
        expect(coerceStoredValue(field, 'broken')).toBeUndefined();
    });
});

describe('mark layers and the outline slot (spec 019)', () => {
    it('reads marks saved before layers as fills and takes outlines', () => {
        const parsed = TemplateFieldSchema.parse(tracker()) as { marks: { layer: string }[] };
        expect(parsed.marks.map(({ layer }) => layer)).toEqual(['fill']);
        const outlined = TemplateFieldSchema.parse(
            tracker({ marks: [mark('m1'), { ...mark('m2'), symbol: '', layer: 'outline' }] })
        ) as { marks: { layer: string }[] };
        expect(outlined.marks.map(({ layer }) => layer)).toEqual(['fill', 'outline']);
        expect(parses(tracker({ marks: [{ ...mark('m1'), layer: 'ring' }] }))).toBe(false);
    });

    it('counts marks of both layers against the five-mark limit', () => {
        const marks = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, index) => ({
            ...mark(id),
            layer: index % 2 ? 'outline' : 'fill',
        }));
        expect(parses(tracker({ marks }))).toBe(false);
        expect(parses(tracker({ marks: marks.slice(0, 5) }))).toBe(true);
    });

    it('keeps the built-in override fill-only', () => {
        const node = CustomTemplateSchema.parse({
            id: 'tpl-tracker',
            name: 'Trackers',
            systemId: 'wod-2e',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'health',
                    type: 'primitive',
                    bindingKey: 'track:health',
                    tracker: { marks: { cross: { name: 'Lethal', layer: 'outline' } } },
                },
            ],
        }).children[0] as { tracker: { marks: Record<string, object> } };
        expect(node.tracker.marks.cross).toEqual({ name: 'Lethal' });
    });

    it('stores outlines next to fills, bounded the same way', () => {
        const both = {
            tracker: 1,
            columns: { c1: [{ id: 'a', marks: { l1: 'm1' }, outlines: { l1: 'm2', l2: 'm2' } }] },
        };
        expect(TemplatePageValuesSchema.parse({ stress: both }).stress).toEqual(both);
        const oldValue = { tracker: 1, columns: { c1: [{ id: 'a', marks: { l1: 'm1' } }] } };
        expect(TemplatePageValuesSchema.parse({ stress: oldValue }).stress).toEqual(oldValue);
        const badId = {
            tracker: 1,
            columns: { c1: [{ id: 'a', outlines: { l1: 'm'.repeat(65) } }] },
        };
        expect(TemplatePageValuesSchema.safeParse({ stress: badId }).success).toBe(false);
        const huge = {
            tracker: 1,
            columns: {
                c1: [
                    {
                        id: 'a',
                        outlines: Object.fromEntries(
                            Array.from({ length: 41 }, (_, i) => [`l${i}`, 'm2'])
                        ),
                    },
                ],
            },
        };
        expect(TemplatePageValuesSchema.safeParse({ stress: huge }).success).toBe(false);
    });
});
