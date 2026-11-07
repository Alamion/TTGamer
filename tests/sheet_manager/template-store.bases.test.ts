import { readFileSync } from 'node:fs';

import { revisionOf } from '@site/src/sheet_manager/features/sheet/data/shippedRevision';
import {
    migrateTemplateStoreState,
    overrideKey,
    useTemplateStore,
} from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems/index';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

const base = CustomTemplateSchema.parse({
    id: 'general-note',
    name: 'Note',
    systemId: 'general',
    documentKind: 'note',
    schemaVersion: 4,
    children: [{ id: 'body', type: 'text', label: 'Body' }],
});
const copy = { ...base, name: 'My note page' };
const key = overrideKey(base.systemId, base.id);

describe('edited shipped page bases', () => {
    beforeEach(() => {
        useTemplateStore.setState({
            templates: [],
            quarantine: [],
            defaultOverrides: {},
            overrideBases: {},
            conversions: [],
        });
    });

    it('records a supplied base and its content revision alongside the copy', () => {
        useTemplateStore.getState().setDefaultOverride(copy, { base });
        expect(useTemplateStore.getState().defaultOverrides[key]).toEqual(copy);
        expect(useTemplateStore.getState().overrideBases[key]).toEqual({
            base,
            revision: revisionOf(base),
        });
    });

    it('preserves every shipped page revision when storing and migrating its base', () => {
        for (const system of systemRegistry.getSystems()) {
            for (const shipped of system.defaultTemplates ?? []) {
                useTemplateStore.getState().setDefaultOverride(shipped, { base: shipped });
                const key = overrideKey(system.id, shipped.id);
                const stored = useTemplateStore.getState().overrideBases[key]!;
                expect(stored.revision, key).toBe(revisionOf(shipped));
                const migrated = migrateTemplateStoreState(
                    { templates: [], overrideBases: { [key]: stored } },
                    7
                );
                expect(migrated.overrideBases[key]?.revision, key).toBe(stored.revision);
            }
        }
    });

    it('keeps an existing base and dismissal on a plain save, or keeps no base', () => {
        const store = useTemplateStore.getState();
        store.setDefaultOverride(copy);
        expect(useTemplateStore.getState().overrideBases).toEqual({});
        store.setDefaultOverride(copy, { base });
        store.dismissUpdate(base.systemId, base.id, 'later-revision');
        const record = useTemplateStore.getState().overrideBases[key];
        store.setDefaultOverride({ ...copy, name: 'Edited again' });
        expect(useTemplateStore.getState().overrideBases[key]).toBe(record);
        expect(record?.dismissed).toBe('later-revision');
    });

    it('replaces a supplied base and clears its old dismissal', () => {
        const store = useTemplateStore.getState();
        store.setDefaultOverride(copy, { base });
        store.dismissUpdate(base.systemId, base.id, 'old-dismissal');
        const nextBase = { ...base, name: 'Updated shipped page' };
        store.setDefaultOverride(copy, { base: nextBase });
        expect(useTemplateStore.getState().overrideBases[key]).toEqual({
            base: nextBase,
            revision: revisionOf(nextBase),
        });
    });

    it('dismisses only existing records', () => {
        const store = useTemplateStore.getState();
        store.dismissUpdate(base.systemId, base.id, 'ignored');
        expect(useTemplateStore.getState().overrideBases).toEqual({});
        store.setDefaultOverride(copy, { base });
        store.dismissUpdate(base.systemId, base.id, 'dismissed');
        expect(useTemplateStore.getState().overrideBases[key]).toEqual({
            base,
            revision: revisionOf(base),
            dismissed: 'dismissed',
        });
    });

    it('removes the copy, base, and dismissal together without removing other pages', () => {
        const store = useTemplateStore.getState();
        store.setDefaultOverride(copy, { base });
        store.dismissUpdate(base.systemId, base.id, 'dismissed');
        const other = { ...base, id: 'other-page' };
        store.setDefaultOverride(other, { base: other });
        store.clearDefaultOverride(base.systemId, base.id);
        expect(useTemplateStore.getState().defaultOverrides[key]).toBeUndefined();
        expect(useTemplateStore.getState().overrideBases[key]).toBeUndefined();
        expect(
            useTemplateStore.getState().overrideBases[overrideKey(other.systemId, other.id)]
        ).toBeDefined();
    });

    it('does not import the system registry from the store', () => {
        const source = readFileSync('src/sheet_manager/store/templateStore.ts', 'utf8');
        expect(source).not.toMatch(/(?:from\s*|import\s*\()['"][^'"]*systems(?:\/index)?['"]/);
        expect(source).not.toContain('systemRegistry');
    });
});

describe('template store v7 base migration', () => {
    it('adds an empty base map to version 6 and empty state', () => {
        const migrated = migrateTemplateStoreState(
            { templates: [], defaultOverrides: { [key]: copy } },
            6
        );
        expect(migrated.overrideBases).toEqual({});
        expect(migrated.defaultOverrides[key]).toEqual(copy);
        expect(migrateTemplateStoreState(undefined, 6).overrideBases).toEqual({});
    });

    it('parses each base through the template schema and derives its revision', () => {
        const rawBase = { ...base, extra: 'stripped by schema' };
        const migrated = migrateTemplateStoreState(
            {
                templates: [],
                overrideBases: {
                    [key]: { base: rawBase, revision: 'stale', dismissed: 'dismissed' },
                },
            },
            6
        );
        expect(migrated.overrideBases[key]).toEqual({
            base,
            revision: revisionOf(base),
            dismissed: 'dismissed',
        });
    });

    it('drops unreadable bases, reports their keys, and keeps the copies', () => {
        const migrated = migrateTemplateStoreState(
            {
                templates: [],
                defaultOverrides: { [key]: copy },
                overrideBases: {
                    [key]: { base: { ...base, children: 'broken' }, revision: 'bad' },
                    'general:missing': null,
                    'general:valid': { base, revision: revisionOf(base), dismissed: 42 },
                },
            },
            6
        );
        expect(migrated.defaultOverrides[key]).toEqual(copy);
        expect(migrated.overrideBases).toEqual({
            'general:valid': { base, revision: revisionOf(base) },
        });
        expect(takeSheetIssues()).toEqual([
            expect.objectContaining({
                code: 'template-update-unreadable',
                details: expect.objectContaining({ key }),
            }),
            expect.objectContaining({
                code: 'template-update-unreadable',
                details: expect.objectContaining({ key: 'general:missing' }),
            }),
        ]);
    });
});
