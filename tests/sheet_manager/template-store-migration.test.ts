import {
    migrateTemplateStoreState,
    overrideKey,
} from '@site/src/sheet_manager/store/templateStore';
import {
    resolveCustomTemplate,
    resolveEffectiveTemplate,
} from '@site/src/sheet_manager/systems/view';
import { DocumentKindSchema } from '@site/src/sheet_manager/types/document';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

function buildTemplate(id: string, name = 'Valid Kit') {
    return CustomTemplateSchema.parse({
        id,
        name,
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'identity',
                type: 'section',
                title: 'Identity',
                children: [
                    {
                        id: 'origin',
                        type: 'text',
                        label: 'Origin',
                        required: false,
                        compact: false,
                        multiline: false,
                    },
                ],
            },
        ],
    });
}

describe('template store retirement (v2→v3, feature 006 T008)', () => {
    it('retires v2-shape entries into the bounded quarantine', () => {
        const v2Shape = {
            id: 'legacy-kit',
            name: 'Legacy Kit',
            documentKind: 'character',
            schemaVersion: 2,
            sections: [
                {
                    id: 'identity',
                    title: 'Identity',
                    blocks: [],
                },
            ],
        };
        const migrated = migrateTemplateStoreState({
            templates: [buildTemplate('keeper'), v2Shape],
            quarantine: [],
            defaultOverrides: {},
        });
        expect(migrated.templates.map(({ id }) => id)).toEqual(['keeper']);
        expect(migrated.quarantine).toHaveLength(1);
        expect(migrated.quarantine[0]).toEqual(v2Shape);
        expect(takeSheetIssues()).toEqual([
            expect.objectContaining({
                code: 'template-quarantined',
                details: expect.objectContaining({ templateId: 'legacy-kit' }),
            }),
        ]);
    });

    it('respects the quarantine bound while retaining failures', () => {
        const broken = Array.from({ length: 150 }, (_, index) => ({
            id: `broken-${index}`,
            name: 'Broken',
        }));
        const migrated = migrateTemplateStoreState({ templates: broken, quarantine: [] });
        expect(migrated.templates).toHaveLength(0);
        expect(migrated.quarantine).toHaveLength(100);
        expect(migrated.quarantine[0]).toEqual({ id: 'broken-0', name: 'Broken' });
        const issues = takeSheetIssues();
        expect(issues).toHaveLength(150);
        expect(issues.at(-1)?.message).toContain('dropped');
    });

    it('retires incompatible default overrides too', () => {
        const migrated = migrateTemplateStoreState({
            templates: [],
            quarantine: [],
            defaultOverrides: {
                'full-sheet': buildTemplate('full-sheet', 'Override'),
                broken: { sections: 'nope' },
            },
        });
        expect(migrated.defaultOverrides['star-wars-wod:full-sheet']).toBeDefined();
        expect(migrated.defaultOverrides['broken']).toBeUndefined();
        expect(migrated.quarantine).toHaveLength(1);
        expect(new Set(takeSheetIssues().map(({ code }) => code))).toEqual(
            new Set(['template-quarantined'])
        );
    });

    it('falls back to the built-in page with a stale notice for retired ids', () => {
        // After migration the v2 template is gone from the library…
        const library = migrateTemplateStoreState({
            templates: [
                {
                    id: 'legacy-kit',
                    name: 'Legacy Kit',
                    documentKind: 'character',
                    schemaVersion: 2,
                    sections: [],
                },
            ],
            quarantine: [],
        }).templates;
        expect(library).toHaveLength(0);
        expect(new Set(takeSheetIssues().map(({ code }) => code))).toEqual(
            new Set(['template-quarantined'])
        );
        // …so a document still pointing at it resolves as missing (built-in page + notice).
        expect(
            resolveCustomTemplate('legacy-kit', library, DocumentKindSchema.parse('character'))
        ).toEqual({ reason: 'missing' });
    });

    it('keeps valid v3 templates and overrides intact', () => {
        const migrated = migrateTemplateStoreState({
            templates: [buildTemplate('a'), buildTemplate('b')],
            quarantine: [],
            defaultOverrides: { 'full-sheet': buildTemplate('full-sheet') },
        });
        expect(migrated.templates).toHaveLength(2);
        expect(migrated.quarantine).toHaveLength(0);
        expect(migrated.defaultOverrides['star-wars-wod:full-sheet']?.name).toBe('Valid Kit');
    });
});

describe('template store v5: composite override keys (spec 012, T-046)', () => {
    const hunterOverride = () =>
        CustomTemplateSchema.parse({
            id: 'v5-hunter-sheet',
            name: 'Edited Hunter',
            systemId: 'wod-v5',
            documentKind: 'character',
            schemaVersion: 3,
            children: [{ id: 'notes', type: 'text', label: 'Notes' }],
        });

    it('re-keys v4 overrides by their own system without changing content', () => {
        const starWars = buildTemplate('full-sheet', 'Edited Full');
        const hunter = hunterOverride();
        const migrated = migrateTemplateStoreState(
            {
                templates: [],
                quarantine: [],
                defaultOverrides: { 'full-sheet': starWars, 'v5-hunter-sheet': hunter },
            },
            4
        );
        expect(Object.keys(migrated.defaultOverrides).sort()).toEqual([
            'star-wars-wod:full-sheet',
            'wod-v5:v5-hunter-sheet',
        ]);
        expect(migrated.defaultOverrides['star-wars-wod:full-sheet']).toEqual(
            CustomTemplateSchema.parse(starWars)
        );
        expect(migrated.defaultOverrides['wod-v5:v5-hunter-sheet']).toEqual(hunter);
    });

    it('keeps v5 keys as they are', () => {
        const migrated = migrateTemplateStoreState(
            {
                templates: [],
                quarantine: [],
                defaultOverrides: { 'star-wars-wod:full-sheet': buildTemplate('full-sheet') },
            },
            5
        );
        expect(Object.keys(migrated.defaultOverrides)).toEqual(['star-wars-wod:full-sheet']);
    });

    it('applies an override only to its own system', () => {
        const edited = buildTemplate('full-sheet', 'Edited Full');
        const state = {
            templates: [],
            defaultOverrides: { [overrideKey('wod-v5', 'full-sheet')]: edited },
        };
        const resolved = resolveEffectiveTemplate(
            'full-sheet',
            state,
            'star-wars-wod',
            DocumentKindSchema.parse('character')
        );
        expect(resolved?.modified).toBe(false);
    });
});
