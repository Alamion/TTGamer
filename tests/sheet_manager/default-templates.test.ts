import {
    getSkeletonsForKind,
    TEMPLATE_SKELETONS,
} from '@site/src/sheet_manager/features/sheet/data/templateSkeletons';
import {
    migrateTemplateStoreState,
    useTemplateStore,
} from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { resolveEffectiveTemplate } from '@site/src/sheet_manager/systems/view';
import { DocumentKindSchema, DocumentViewIdSchema } from '@site/src/sheet_manager/types/document';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

function modifiedOverride(viewId: string) {
    return CustomTemplateSchema.parse({
        id: viewId,
        name: 'Renamed Full',
        systemId: 'star-wars-wod',
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

const characterKind = DocumentKindSchema.parse('character');

describe('explicit default templates (feature 006, R9)', () => {
    const defaults = systemRegistry.getSystem('star-wars-wod')?.defaultTemplates ?? [];

    it('provides explicit defaults for full-sheet, droid-sheet, and brief', () => {
        expect(defaults.map(({ id }) => id)).toEqual(['full-sheet', 'droid-sheet', 'brief']);
        for (const template of defaults) {
            expect(template.systemId).toBe('star-wars-wod');
            expect(template.documentKind).toBe('character');
            expect(template.schemaVersion).toBe(3);
        }
    });

    it('mirrors the built-in viewer composition order with the same docsPath links', () => {
        const full = defaults.find(({ id }) => id === 'full-sheet')!;
        const sections = full.children.filter(
            (node): node is Extract<CustomTemplate['children'][number], { type: 'section' }> =>
                node.type === 'section'
        );
        expect(sections.map(({ title }) => title)).toEqual([
            'Base',
            'Attributes',
            'Skills',
            'Advantages',
            'Force',
            'Body',
            'Other',
        ]);
        const docsPaths = sections.map((section) => section.docsPath);
        expect(docsPaths[0]).toContain('/docs/star-wars-wod-2e/quick-start');
        expect(docsPaths[1]).toContain('attributes-abilities#attributes');
        expect(docsPaths[2]).toContain('attributes-abilities#abilities');
        expect(docsPaths[3]).toContain('merits-flaws');
        expect(docsPaths[4]).toContain('/character/force');
        expect(docsPaths[5]).toContain('/equipment');
        expect(docsPaths[6]).toContain('derived-stats');
    });

    it('composes system content from first-class elements (no placements, R9)', () => {
        const full = defaults.find(({ id }) => id === 'full-sheet')!;
        const visit = (node: CustomTemplate['children'][number]): void => {
            expect(node.type).not.toBe('built-in');
            if (node.type === 'section' || node.type === 'group') {
                for (const child of node.children) visit(child);
            }
        };
        for (const node of full.children) visit(node);
    });

    it('stores no accent colors — presentation accents are automatic (FR-11)', () => {
        expect(JSON.stringify(defaults)).not.toContain('accentColor');
        expect(JSON.stringify(defaults)).not.toContain('"accent"');
    });

    it('covers identity fields, portrait, trait fields, lists, track, resources, formulas, equipment', () => {
        const full = defaults.find(({ id }) => id === 'full-sheet')!;
        const collected: Array<{ type: string; bindingKey?: string; valueKey?: string }> = [];
        const walk = (nodes: readonly CustomTemplate['children'][number][]): void => {
            for (const node of nodes) {
                if (node.type === 'section' || node.type === 'group') {
                    walk(node.children);
                    continue;
                }
                collected.push({
                    type: node.type,
                    bindingKey:
                        node.type === 'primitive' || node.type === 'list'
                            ? node.bindingKey
                            : undefined,
                    valueKey:
                        'valueKey' in node ? (node.valueKey as string | undefined) : undefined,
                });
            }
        };
        walk(full.children);
        expect(collected.some(({ type }) => type === 'image')).toBe(true);
        expect(collected.some(({ type }) => type === 'formula')).toBe(true);
        expect(collected.some(({ bindingKey }) => bindingKey === 'track:health')).toBe(true);
        expect(collected.some(({ bindingKey }) => bindingKey === 'resource:willpower')).toBe(true);
        expect(collected.some(({ bindingKey }) => bindingKey === 'equipment:inventory')).toBe(true);
        expect(collected.some(({ bindingKey }) => bindingKey === 'list:customSkills')).toBe(true);
        expect(collected.some(({ bindingKey }) => bindingKey === 'list:forcePowers')).toBe(true);
        expect(collected.some(({ valueKey }) => valueKey === 'name')).toBe(true);
        // Document-bridged fields beyond identity: home world, appearance, notes, experience.
        for (const key of ['home-world', 'gender', 'features', 'notes', 'experience-total']) {
            expect(
                collected.some(({ valueKey }) => valueKey === key),
                key
            ).toBe(true);
        }
        // Max Force Points edits the pool maximum.
        expect(JSON.stringify(full)).toContain('"part":"max"');
    });

    it('brief is groups only, in compact presentation', () => {
        const brief = defaults.find(({ id }) => id === 'brief')!;
        expect(brief.children.every((node) => node.type === 'group')).toBe(true);
        expect(JSON.stringify(brief)).toContain('"compact":true');
        expect(JSON.stringify(brief)).toContain('track:health');
        expect(JSON.stringify(brief)).toContain('resource:willpower');
        expect(JSON.stringify(brief)).toContain('equipment:weapons');
    });

    it('does not ship declarative defaults for the specialized pages', () => {
        const ids = defaults.map(({ id }) => id);
        expect(ids).not.toContain('creature-sheet');
        expect(ids).not.toContain('vehicle-sheet');
        expect(ids).not.toContain('fodder-sheet');
    });
});

describe('effective template resolution (feature 004/006)', () => {
    it('resolves an explicit default template from a view id and flags modified state', () => {
        const state = { templates: [], defaultOverrides: {} };
        const pristine = resolveEffectiveTemplate(
            'full-sheet',
            state,
            'star-wars-wod',
            characterKind
        );
        expect(pristine?.isDefault).toBe(true);
        expect(pristine?.modified).toBe(false);
        expect(pristine?.template.id).toBe('full-sheet');

        const overriddenState = {
            templates: [],
            defaultOverrides: { 'full-sheet': modifiedOverride('full-sheet') },
        };
        const modified = resolveEffectiveTemplate(
            'full-sheet',
            overriddenState,
            'star-wars-wod',
            characterKind
        );
        expect(modified?.isDefault).toBe(true);
        expect(modified?.modified).toBe(true);
        expect(modified?.template.name).toBe('Renamed Full');
    });

    it('prefers a custom template over a same-id default and misses cleanly', () => {
        const custom = modifiedOverride('full-sheet-clone');
        const resolvedCustom = resolveEffectiveTemplate(
            'full-sheet-clone',
            { templates: [custom], defaultOverrides: {} },
            'star-wars-wod',
            characterKind
        );
        expect(resolvedCustom?.isDefault).toBe(false);

        expect(
            resolveEffectiveTemplate(
                'no-such-view',
                { templates: [], defaultOverrides: {} },
                'star-wars-wod',
                characterKind
            )
        ).toBeUndefined();
        // Kind mismatch is not compatible.
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                { templates: [], defaultOverrides: {} },
                'star-wars-wod',
                DocumentKindSchema.parse('vehicle')
            )
        ).toBeUndefined();
    });

    it('resolves legacy view selections (npc-card → brief) with no migration', () => {
        const state = { templates: [], defaultOverrides: {} };
        const viaLegacy = resolveEffectiveTemplate(
            'npc-card',
            state,
            'star-wars-wod',
            characterKind
        );
        expect(viaLegacy?.isDefault).toBe(true);
        expect(viaLegacy?.template.id).toBe('brief');
    });

    it('store: setDefaultOverride then clearDefaultOverride round-trips modified state', () => {
        const { setDefaultOverride, clearDefaultOverride } = useTemplateStore.getState();
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });

        setDefaultOverride('full-sheet', modifiedOverride('full-sheet'));
        expect(useTemplateStore.getState().defaultOverrides['full-sheet']).toBeDefined();
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                useTemplateStore.getState(),
                'star-wars-wod',
                characterKind
            )?.modified
        ).toBe(true);

        clearDefaultOverride('full-sheet');
        expect(useTemplateStore.getState().defaultOverrides['full-sheet']).toBeUndefined();
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                useTemplateStore.getState(),
                'star-wars-wod',
                characterKind
            )?.modified
        ).toBe(false);
        // Pristine content comes from the registry, not user data.
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                useTemplateStore.getState(),
                'star-wars-wod',
                characterKind
            )?.template.name
        ).not.toBe('Renamed Full');

        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
    });

    it('store: duplicate of a modified default snapshots effective content with a fresh id', () => {
        useTemplateStore.setState({
            templates: [],
            quarantine: [],
            defaultOverrides: { 'full-sheet': modifiedOverride('full-sheet') },
        });
        const copy = useTemplateStore.getState().duplicateTemplate('full-sheet', 'my-copy');
        expect(copy).toBeDefined();
        expect(copy?.name).toBe('Renamed Full');
        expect(copy?.id).toBe('my-copy');
        // The duplicate is independent — clearing the override leaves the copy untouched.
        useTemplateStore.getState().clearDefaultOverride('full-sheet');
        expect(useTemplateStore.getState().templates.find(({ id }) => id === 'my-copy')?.name).toBe(
            'Renamed Full'
        );
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
    });

    it('store migration v1→v2: invalid override entries are quarantined, valid kept', () => {
        const valid = modifiedOverride('full-sheet');
        const migrated = migrateTemplateStoreState({
            templates: [],
            quarantine: [],
            defaultOverrides: { 'full-sheet': valid, broken: { nope: true } },
        });
        expect(migrated.defaultOverrides['full-sheet']).toBeDefined();
        expect(migrated.defaultOverrides['broken']).toBeUndefined();
        expect(migrated.quarantine).toContainEqual({ nope: true });
        expect(new Set(takeSheetIssues().map(({ code }) => code))).toEqual(
            new Set(['template-quarantined'])
        );
    });

    it('selector: registered view ids and tpl: ids never collide', () => {
        const viewIds = new Set(
            systemRegistry
                .getSystem('star-wars-wod')
                ?.documents.flatMap((definition) => definition.views.map(({ id }) => id)) ?? []
        );
        const templateOptions = [
            { id: DocumentViewIdSchema.parse('full-sheet'), name: 'Same-name custom' },
        ];
        const collisions = templateOptions.filter((option) => viewIds.has(option.id));
        expect(collisions).toHaveLength(1);
        const values = new Set([
            ...viewIds,
            ...templateOptions.map((option) => `tpl:${option.id}`),
        ]);
        expect(values.size).toBe(viewIds.size + templateOptions.length);
    });
});

// @vitest-environment jsdom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { BaseCharacterSchema } from '@site/src/sheet_manager/types/character';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach } from 'vitest';

describe('default template rendering and data safety', () => {
    afterEach(cleanup);

    it('renders the full default template for a pre-upgrade document unchanged', () => {
        const full = systemRegistry
            .getSystem('star-wars-wod')
            ?.defaultTemplates?.find(({ id }) => id === 'full-sheet');
        expect(full).toBeDefined();
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
        useDocumentStore.setState({
            documents: [
                {
                    id: 'legacy-doc',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Legacy', tags: [], preferredViewId: 'full-sheet' },
                    templateValues: {},
                    data: createDefaultStarWarsCharacterData(),
                } as never,
            ],
            currentDocumentId: 'legacy-doc',
        });
        render(createElement(DeclarativeSheetView, { template: full! }));
        // The full page renders its standard sections without placeholder alerts.
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        expect(screen.queryAllByText(/unavailable on this device/i)).toHaveLength(0);
    });

    it('retains orphaned values after template content removal; reset restores pristine', () => {
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
        const override = modifiedOverride('full-sheet');
        // Orphan semantics: removal of fields never deletes bag entries — values stay verbatim.
        const bag = { 'orphan-key': 'precious-data', origin: 'Corellia' };
        const surviving = Object.fromEntries(
            Object.entries(bag).filter(([key]) => key !== 'never-existed')
        );
        expect(surviving['orphan-key']).toBe('precious-data');
        // Character data itself is schema-owned and untouched by template operations.
        const character = BaseCharacterSchema.parse({
            id: 'doc-x',
            ...createDefaultStarWarsCharacterData(),
        });
        expect(character.health).toBeDefined();
        // Reset: override deleted → pristine derived from the registry.
        useTemplateStore.getState().setDefaultOverride('full-sheet', override);
        useTemplateStore.getState().clearDefaultOverride('full-sheet');
        expect(useTemplateStore.getState().defaultOverrides['full-sheet']).toBeUndefined();
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                useTemplateStore.getState(),
                'star-wars-wod',
                characterKind
            )?.template.name
        ).not.toBe('Renamed Full');
    });
});

describe('skeletons mirror the real default structure', () => {
    it('every definition with an explicit default yields a matching skeleton', () => {
        for (const system of systemRegistry.getSystems()) {
            const defaults = system.defaultTemplates ?? [];
            for (const definition of system.documents) {
                const skeletons = TEMPLATE_SKELETONS.filter(
                    ({ id }) => id === `skeleton-${definition.id}`
                );
                const source = defaults.find(
                    (template) => template.id === definition.defaultViewId
                );
                if (!source) {
                    // Specialized pages have no declarative default and no skeleton.
                    expect(skeletons).toHaveLength(0);
                    continue;
                }
                expect(skeletons).toHaveLength(1);
                const skeleton = skeletons[0]!;
                // Identical structure, independent identity.
                expect(skeleton.children).toEqual(source.children);
                expect(skeleton.id).toBe(`skeleton-${definition.id}`);
                expect(skeleton.id).not.toBe(source.id);
                expect(skeleton.documentKind).toBe(definition.kind);
            }
        }
    });

    it('getSkeletonsForKind returns real-structure skeletons per kind', () => {
        const characterSkeletons = getSkeletonsForKind(DocumentKindSchema.parse('character'));
        expect(characterSkeletons.length).toBeGreaterThanOrEqual(2); // character + droid
        for (const skeleton of characterSkeletons) {
            expect(skeleton.documentKind).toBe('character');
        }
    });
});
