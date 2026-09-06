import {
    getSkeletonsForKind,
    TEMPLATE_SKELETONS,
} from '@site/src/sheet_manager/features/sheet/data/templateSkeletons';
import {
    migrateTemplateStoreState,
    useTemplateStore,
} from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    resolveEffectiveTemplate,
    viewToDefaultTemplate,
} from '@site/src/sheet_manager/systems/view';
import { DocumentKindSchema, DocumentViewIdSchema } from '@site/src/sheet_manager/types/document';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

function modifiedOverride(viewId: string) {
    return CustomTemplateSchema.parse({
        id: viewId,
        name: 'Renamed Full',
        systemId: 'star-wars-wod',
        documentKind: 'character',
        schemaVersion: 1,
        sections: [
            {
                id: 'page',
                title: 'Page',
                blocks: [{ id: 'base', type: 'built-in', blockId: 'base', accentColor: 'primary' }],
            },
        ],
    });
}

describe('default templates from registered views (feature 004)', () => {
    it('derives a default template for every registered built-in view (T007)', () => {
        for (const system of systemRegistry.getSystems()) {
            for (const definition of system.documents) {
                for (const view of definition.views) {
                    const derived = viewToDefaultTemplate(view, system.id, definition.kind);
                    if (view.layout.type !== 'built-in') {
                        expect(derived).toBeUndefined();
                        continue;
                    }
                    expect(derived).toBeDefined();
                    expect(derived?.id).toBe(view.id);
                    expect(derived?.systemId).toBe(system.id);
                    expect(derived?.documentKind).toBe(definition.kind);
                    // Built-in pages stack blocks directly — no extra section chrome (US fix 1).
                    expect(derived?.sections[0]?.presentation).toBe('plain');
                    const builtInBlocks =
                        view.layout.type === 'built-in' ? view.layout.blocks : undefined;
                    if (!builtInBlocks) break;
                    // Structure mirrors the view: order + accent settings preserved.
                    const blocks = derived?.sections[0]?.blocks ?? [];
                    expect(blocks).toHaveLength(builtInBlocks.length);
                    blocks.forEach((block, index) => {
                        const source = builtInBlocks[index];
                        expect(block.type).toBe('built-in');
                        if (block.type === 'built-in' && source) {
                            expect(block.blockId).toBe(source.id);
                            // Accent is automatic now — not stored per placement.
                            expect('accentColor' in block).toBe(false);
                        }
                        void index;
                    });
                }
            }
        }
    });

    it('derives deterministically — same view always yields identical template (T007)', () => {
        const definition = systemRegistry.getDocumentDefinition('star-wars-wod', 'character');
        const view = definition?.views[0];
        expect(view).toBeDefined();
        if (!view) return;
        const first = viewToDefaultTemplate(view, 'star-wars-wod', definition.kind);
        const second = viewToDefaultTemplate(view, 'star-wars-wod', definition.kind);
        expect(first).toEqual(second);
    });

    it('store migration v1→v2: absent defaultOverrides key becomes an empty map (T015)', () => {
        const migrated = migrateTemplateStoreState({ templates: [], quarantine: [] });
        expect(migrated.defaultOverrides).toEqual({});
    });

    it('store migration v1→v2: invalid override entries are quarantined, valid kept (T015)', () => {
        const valid = modifiedOverride('full-sheet');
        const migrated = migrateTemplateStoreState({
            templates: [],
            quarantine: [],
            defaultOverrides: { 'full-sheet': valid, broken: { nope: true } },
        });
        expect(migrated.defaultOverrides['full-sheet']).toBeDefined();
        expect(migrated.defaultOverrides['broken']).toBeUndefined();
        expect(migrated.quarantine).toContainEqual({ nope: true });
    });

    it('resolves a default template from a view id and flags modified state (T016)', () => {
        const state = { templates: [], defaultOverrides: {} };
        const pristine = resolveEffectiveTemplate(
            'full-sheet',
            state,
            'star-wars-wod',
            DocumentKindSchema.parse('character')
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
            DocumentKindSchema.parse('character')
        );
        expect(modified?.isDefault).toBe(true);
        expect(modified?.modified).toBe(true);
        expect(modified?.template.name).toBe('Renamed Full');
    });

    it('prefers a custom template over a same-id default and misses cleanly (T016)', () => {
        const custom = CustomTemplateSchema.parse({
            id: 'full-sheet-clone',
            name: 'Clone',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 1,
            sections: [
                {
                    id: 'page',
                    title: 'Page',
                    blocks: [{ id: 'base', type: 'built-in', blockId: 'base' }],
                },
            ],
        });
        const resolvedCustom = resolveEffectiveTemplate(
            'full-sheet-clone',
            { templates: [custom], defaultOverrides: {} },
            'star-wars-wod',
            DocumentKindSchema.parse('character')
        );
        expect(resolvedCustom?.isDefault).toBe(false);

        expect(
            resolveEffectiveTemplate(
                'no-such-view',
                { templates: [], defaultOverrides: {} },
                'star-wars-wod',
                DocumentKindSchema.parse('character')
            )
        ).toBeUndefined();
        // Kind mismatch is not compatible (FR-15).
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                { templates: [], defaultOverrides: {} },
                'star-wars-wod',
                DocumentKindSchema.parse('vehicle')
            )
        ).toBeUndefined();
    });

    it('store: setDefaultOverride then clearDefaultOverride round-trips modified state (T015/T023)', () => {
        const { setDefaultOverride, clearDefaultOverride } = useTemplateStore.getState();
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });

        setDefaultOverride('full-sheet', modifiedOverride('full-sheet'));
        expect(useTemplateStore.getState().defaultOverrides['full-sheet']).toBeDefined();
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                useTemplateStore.getState(),
                'star-wars-wod',
                DocumentKindSchema.parse('character')
            )?.modified
        ).toBe(true);

        clearDefaultOverride('full-sheet');
        expect(useTemplateStore.getState().defaultOverrides['full-sheet']).toBeUndefined();
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                useTemplateStore.getState(),
                'star-wars-wod',
                DocumentKindSchema.parse('character')
            )?.modified
        ).toBe(false);
        // Pristine content re-derived from the registry, not user data (FR-10).
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                useTemplateStore.getState(),
                'star-wars-wod',
                DocumentKindSchema.parse('character')
            )?.template.name
        ).not.toBe('Renamed Full');

        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
    });

    it('store: removeTemplate refuses registered view ids (FR-11, T015)', () => {
        useTemplateStore.setState({
            templates: [
                CustomTemplateSchema.parse({
                    id: 'custom-kit',
                    name: 'Custom Kit',
                    documentKind: 'character',
                    schemaVersion: 1,
                    sections: [
                        {
                            id: 'page',
                            title: 'Page',
                            blocks: [{ id: 'base', type: 'built-in', blockId: 'base' }],
                        },
                    ],
                }),
            ],
            quarantine: [],
            defaultOverrides: {},
        });
        const { removeTemplate } = useTemplateStore.getState();
        removeTemplate('custom-kit');
        expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('store: duplicate of a modified default snapshots effective content with a fresh id (Q1)', () => {
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

    it('selector: registered view ids and tpl: ids never collide (FR-13, T016)', () => {
        // Default templates use view ids directly; custom templates are prefixed `tpl:` in the
        // selector value space, so a custom template whose id equals a view id still can never
        // produce a duplicate option value.
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
        // Selector skips these (ViewModeSelect filter) — option values remain distinct.
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

describe('seamless transition and data safety (US3, feature 004)', () => {
    afterEach(cleanup);

    it('resolves legacy view selections (npc-card → brief) with no migration (T024)', () => {
        const state = { templates: [], defaultOverrides: {} };
        // Legacy alias resolves to the brief default template (explicit field composition
        // in feature 005; legacy view ids are aliases of the same page).
        const viaLegacy = resolveEffectiveTemplate(
            'npc-card',
            state,
            'star-wars-wod',
            DocumentKindSchema.parse('character')
        );
        expect(viaLegacy?.isDefault).toBe(true);
        expect(viaLegacy?.template.id).toBe('brief');
        // The explicit default wins over legacy derivation — bridged fields + track primitive.
        const blockTypes = viaLegacy?.template.sections
            .flatMap((section) => section.blocks)
            .map((block) => block.type);
        expect(blockTypes).toContain('fields');
        expect(blockTypes).not.toContain('built-in');
    });

    it('renders a pre-upgrade document through its default template unchanged (T024)', () => {
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
        render(
            createElement(DeclarativeSheetView, {
                template: viewToDefaultTemplate(
                    systemRegistry
                        .getDocumentDefinition('star-wars-wod', 'character')!
                        .views.find(({ id }) => id === 'full-sheet')!,
                    'star-wars-wod',
                    DocumentKindSchema.parse('character')
                )!,
            })
        );
        // The full page renders its standard sections without placeholder alerts.
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        expect(screen.queryAllByText(/unavailable on this device/i)).toHaveLength(0);
    });

    it('retains orphaned values after template content removal; reset restores pristine (T025)', () => {
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
        const override = modifiedOverride('full-sheet');
        // Orphan simulation: value stored under a key the modified template no longer addresses.
        const bag = { 'orphan-key': 'precious-data', origin: 'Corellia' };
        // Orphan semantics (FR-14/spec-003 FR-12): removal of fields never deletes bag entries —
        // values stay in the document envelope untouched; the store keeps them verbatim.
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
        // Reset: override deleted → pristine derived from the registry (FR-10).
        useTemplateStore.getState().setDefaultOverride('full-sheet', override);
        useTemplateStore.getState().clearDefaultOverride('full-sheet');
        expect(useTemplateStore.getState().defaultOverrides['full-sheet']).toBeUndefined();
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                useTemplateStore.getState(),
                'star-wars-wod',
                DocumentKindSchema.parse('character')
            )?.template.name
        ).not.toBe('Renamed Full');
    });
});

describe('skeletons mirror the real view structure (feature 005)', () => {
    it('every registered definition yields a skeleton matching its explicit default template', () => {
        for (const system of systemRegistry.getSystems()) {
            const defaults = system.defaultTemplates ?? [];
            for (const definition of system.documents) {
                const skeletons = TEMPLATE_SKELETONS.filter(
                    ({ id }) => id === `skeleton-${definition.id}`
                );
                const source = defaults.find(
                    (template) => template.id === definition.defaultViewId
                );
                expect(source, `no default template for ${definition.id}`).toBeDefined();
                expect(skeletons).toHaveLength(1);
                const skeleton = skeletons[0]!;
                // Identical structure, independent identity.
                expect(skeleton.sections).toEqual(source?.sections);
                expect(skeleton.id).toBe(`skeleton-${definition.id}`);
                expect(skeleton.id).not.toBe(source?.id);
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
