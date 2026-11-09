import {
    pendingUpdate,
    revisionOf,
    shippedPageFor,
} from '@site/src/sheet_manager/features/sheet/data/shippedRevision';
import { systemRegistry } from '@site/src/sheet_manager/systems/index';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it, vi } from 'vitest';

const page = () =>
    CustomTemplateSchema.parse({
        id: 'test-page',
        name: 'Test page',
        systemId: 'general',
        documentKind: 'note',
        schemaVersion: 4,
        children: [
            { id: 'one', type: 'text', label: 'One' },
            { id: 'two', type: 'text', label: 'Two' },
        ],
    });

function reverseKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(reverseKeys);
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .reverse()
                .map(([key, entry]) => [key, reverseKeys(entry)])
        );
    }
    return value;
}

describe('shipped page revisions', () => {
    it('canonicalizes keys recursively while preserving array order', () => {
        const template = page();
        const reordered = reverseKeys(template) as typeof template;
        expect(revisionOf(reordered)).toBe(revisionOf(template));
        expect(revisionOf(template)).toMatch(/^[0-9a-f]+$/);
    });

    it('changes for labels, nodes, node order, and page properties', () => {
        const template = page();
        const changes = [
            {
                ...template,
                children: [{ ...template.children[0]!, label: 'Changed' }, template.children[1]!],
            },
            { ...template, children: template.children.slice(1) },
            { ...template, children: [...template.children].reverse() },
            { ...template, description: 'Changed description' },
        ];
        for (const changed of changes) expect(revisionOf(changed)).not.toBe(revisionOf(template));
    });

    it('builds every shipped page deterministically across fresh module evaluations', async () => {
        const first = systemRegistry.getSystems().flatMap((system) =>
            (system.defaultTemplates ?? []).map((template) => ({
                key: `${system.id}:${template.id}`,
                template,
                revision: revisionOf(template),
            }))
        );
        expect(first.length).toBeGreaterThan(0);
        vi.resetModules();
        const { systemRegistry: rebuilt } = await import('@site/src/sheet_manager/systems/index');
        const second = rebuilt.getSystems().flatMap((system) =>
            (system.defaultTemplates ?? []).map((template) => ({
                key: `${system.id}:${template.id}`,
                template,
                revision: revisionOf(template),
            }))
        );
        expect(second.map(({ key, revision }) => ({ key, revision }))).toEqual(
            first.map(({ key, revision }) => ({ key, revision }))
        );
        for (const [index, entry] of second.entries()) {
            expect(entry.template).not.toBe(first[index]!.template);
        }
    });

    it('returns the registry page, resolves legacy aliases, and rejects unknown ids', () => {
        for (const system of systemRegistry.getSystems()) {
            for (const template of system.defaultTemplates ?? []) {
                expect(shippedPageFor(system.id, template.id)).toBe(template);
            }
        }
        expect(shippedPageFor('star-wars-wod', 'npc-card')).toBe(
            shippedPageFor('star-wars-wod', 'brief')
        );
        expect(shippedPageFor('general', 'unknown')).toBeUndefined();
        expect(shippedPageFor('unknown', 'general-note')).toBeUndefined();
    });
});

describe('pending shipped updates', () => {
    const base = page();
    const copy = { ...base, name: 'My copy' };
    const shipped = { ...base, name: 'New shipped page' };
    const record = { base, revision: revisionOf(base) };

    it('has no update without both a shipped page and an edited copy', () => {
        expect(pendingUpdate({ shipped, copy: undefined, record })).toBe('none');
        expect(pendingUpdate({ shipped: undefined, copy, record })).toBe('none');
    });

    it('compares shipped against the recorded base rather than the copy', () => {
        expect(pendingUpdate({ shipped: base, copy, record })).toBe('base-equal');
        expect(pendingUpdate({ shipped, copy, record })).toBe('base-differs');
        expect(pendingUpdate({ shipped, copy: shipped, record })).toBe('base-differs');
    });

    it('compares against the copy when there is no base', () => {
        expect(pendingUpdate({ shipped, copy, record: undefined })).toBe('no-base-differs');
        expect(pendingUpdate({ shipped, copy: shipped, record: undefined })).toBe('none');
    });

    it('uses the no-base path for dismissal-only records', () => {
        expect(pendingUpdate({ shipped, copy, record: { dismissed: 'older' } })).toBe(
            'no-base-differs'
        );
        expect(pendingUpdate({ shipped, copy: shipped, record: { dismissed: 'older' } })).toBe(
            'none'
        );
        expect(pendingUpdate({ shipped, copy, record: { dismissed: revisionOf(shipped) } })).toBe(
            'dismissed'
        );
    });

    it('dismisses only the named shipped revision', () => {
        const dismissed = { ...record, dismissed: revisionOf(shipped) };
        expect(pendingUpdate({ shipped, copy, record: dismissed })).toBe('dismissed');
        expect(
            pendingUpdate({ shipped: { ...shipped, name: 'Newer' }, copy, record: dismissed })
        ).toBe('base-differs');
    });
});
