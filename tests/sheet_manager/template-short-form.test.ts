import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
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

describe('short form and area layout (spec 033)', () => {
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

    it('keeps the short form and its label on a primitive and on a rating field', () => {
        const parsed = CustomTemplateSchema.parse(
            template([
                group({
                    layout: 'area',
                    children: [rating({ shortForm: true, shortLabel: 'STR' })],
                }),
                ratingField({ shortForm: true, shortLabel: 'LCK' }),
            ])
        );
        const [first, second] = parsed.children as unknown as Array<Record<string, unknown>>;
        expect(first).toMatchObject({ layout: 'area' });
        expect((first?.children as unknown[])[0]).toMatchObject({
            shortForm: true,
            shortLabel: 'STR',
        });
        expect(second).toMatchObject({ shortForm: true, shortLabel: 'LCK' });
    });

    it('refuses a short label of over four characters, an empty one, and an unknown layout', () => {
        for (const bad of [
            template([group({ children: [rating({ shortLabel: 'TOOLONG' })] })]),
            template([group({ children: [rating({ shortLabel: '' })] })]),
            template([group({ layout: 'cards' })]),
        ]) {
            expect(CustomTemplateSchema.safeParse(bad).success).toBe(false);
        }
    });
});
