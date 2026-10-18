import {
    CustomTemplateSchema,
    TEMPLATE_SCHEMA_VERSION,
} from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const template = (children: unknown[]) => ({
    id: 'page',
    name: 'Page',
    systemId: 'star-wars-wod',
    documentKind: 'character',
    schemaVersion: 3,
    children,
});

const rating = (extra: Record<string, unknown> = {}) => ({
    id: 'strength',
    type: 'primitive',
    bindingKey: 'trait:attributes:strength',
    compact: true,
    ...extra,
});

const ratingField = (extra: Record<string, unknown> = {}) => ({
    id: 'luck',
    type: 'rating',
    label: 'Luck',
    max: 5,
    required: false,
    compact: true,
    ...extra,
});

const group = (extra: Record<string, unknown> = {}) => ({
    id: 'attributes',
    type: 'group',
    title: 'Attributes',
    collapsible: false,
    children: [rating()],
    ...extra,
});

describe('short labels on a brief (spec 033, 041)', () => {
    it('leaves a page saved before the change exactly as it was', () => {
        const saved = template([group()]);
        const parsed = CustomTemplateSchema.parse(saved);
        const [node] = parsed.children;
        expect(node).toMatchObject({ type: 'group' });
        expect(node).not.toHaveProperty('layout');
        const [child] = (node as { children: unknown[] }).children;
        expect(child).not.toHaveProperty('shortForm');
        expect(child).not.toHaveProperty('shortLabel');
    });

    it('keeps the short label and the full name setting on a brief (spec 041)', () => {
        const parsed = CustomTemplateSchema.parse({
            ...template([
                {
                    ...group({ children: [rating({ shortLabel: 'STR' })] }),
                    type: 'brief',
                },
                ratingField({ fullLabel: true }),
            ]),
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            pageKind: 'brief',
        });
        const [first, second] = parsed.children as unknown as Array<Record<string, unknown>>;
        expect(first).toMatchObject({ type: 'brief' });
        expect((first?.children as unknown[])[0]).toMatchObject({ shortLabel: 'STR' });
        expect(second).toMatchObject({ fullLabel: true });
    });

    it('refuses a short label of over four characters, an empty one, and a false full name', () => {
        for (const bad of [
            template([group({ children: [rating({ shortLabel: 'TOOLONG' })] })]),
            template([group({ children: [rating({ shortLabel: '' })] })]),
            {
                ...template([group({ children: [rating({ fullLabel: false })] })]),
                schemaVersion: TEMPLATE_SCHEMA_VERSION,
            },
        ]) {
            expect(CustomTemplateSchema.safeParse(bad).success).toBe(false);
        }
    });
});
