// @vitest-environment jsdom

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { JAX_VORN_PRESET, PRESET_CHARACTERS } from '@site/src/sheet_manager/data/presets';
import {
    exampleDocument,
    healthPreviewDocument,
    presetCharacterDocument,
    resolveDocsFragment,
    TemplateFragment,
    TemplatePreview,
    vehicleDamagePreviewDocument,
} from '@site/src/sheet_manager/docsEmbeds';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { STAR_WARS_EXAMPLE_IDS } from '@site/src/sheet_manager/systems/star-wars-wod/examples';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

const ROOT = path.resolve(__dirname, '../..');
const DOC_ROOTS = [
    path.join(ROOT, 'docs'),
    path.join(ROOT, 'i18n/ru/docusaurus-plugin-content-docs/current'),
];

function mdxFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) return mdxFiles(full);
        return full.endsWith('.mdx') ? [full] : [];
    });
}

const EMBED_PATTERN = /<Template(?:Fragment|Preview)\b([^>]*)\/?>/g;
const attribute = (source: string, name: string) =>
    new RegExp(`\\b${name}="([^"]+)"`).exec(source)?.[1];

describe('documentation template embeds', () => {
    afterEach(cleanup);

    it('references only template parts that exist in the shipped defaults (en + ru)', () => {
        for (const file of DOC_ROOTS.flatMap(mdxFiles)) {
            for (const match of readFileSync(file, 'utf8').matchAll(EMBED_PATTERN)) {
                const props = match[1] ?? '';
                const target = {
                    template: attribute(props, 'template'),
                    node: attribute(props, 'node'),
                    systemId: attribute(props, 'systemId'),
                };
                expect(
                    resolveDocsFragment(target),
                    `${path.relative(ROOT, file)}: ${match[0]}`
                ).toBeDefined();
            }
        }
    });

    it('references only example documents that exist (en + ru)', () => {
        for (const file of DOC_ROOTS.flatMap(mdxFiles)) {
            for (const match of readFileSync(file, 'utf8').matchAll(
                /exampleDocument\('([^']+)'\)/g
            )) {
                expect(
                    STAR_WARS_EXAMPLE_IDS,
                    `${path.relative(ROOT, file)}: ${match[0]}`
                ).toContain(match[1]);
            }
        }
    });

    it('imports sheet content only through the documentation entry point', () => {
        const banned =
            /from '[^']*(features\/sheet\/blocks|components\/viewer|sheet_manager\/data\/presets)[^']*'/;
        for (const file of DOC_ROOTS.flatMap(mdxFiles)) {
            expect(readFileSync(file, 'utf8'), path.relative(ROOT, file)).not.toMatch(banned);
        }
    });

    it.each(
        STAR_WARS_EXAMPLE_IDS.flatMap((id) => {
            const document = exampleDocument(id)!;
            const views =
                systemRegistry.getDocumentDefinition('star-wars-wod', document.definitionId)
                    ?.views ?? [];
            return views.map((view) => [id, view.id] as const);
        })
    )(
        'example %s renders the %s page read-only without degradation',
        (id, template) => {
            const document = exampleDocument(id)!;
            const definition = systemRegistry.getDocumentDefinition(
                'star-wars-wod',
                document.definitionId
            )!;
            expect(definition.schema.safeParse(document.data).success).toBe(true);
            expect(document.id.endsWith('::preset')).toBe(true);
            render(createElement(TemplatePreview, { document, template }));
            expect(screen.queryAllByRole('alert')).toHaveLength(0);
            expect(takeSheetIssues().filter(({ code }) => code === 'binding-unresolved')).toEqual(
                []
            );
        },
        20_000
    );

    it('builds vehicle damage previews and reports unknown example ids', () => {
        const preview = vehicleDamagePreviewDocument([
            'slash',
            'slash',
            'empty',
            'empty',
            'empty',
            'empty',
            'empty',
        ]);
        render(
            createElement(TemplatePreview, {
                document: preview,
                template: 'vehicle-sheet',
                node: 'damage-track',
            })
        );
        expect(screen.getAllByText('Light').length).toBeGreaterThan(0);
        expect(exampleDocument('no-such::preset')).toBeUndefined();
        expect(takeSheetIssues().map(({ code }) => code)).toContain('template-reference-invalid');
    });

    it('every bundled preset converts into a valid character document', () => {
        for (const [key, preset] of Object.entries(PRESET_CHARACTERS)) {
            expect(() => presetCharacterDocument(preset), key).not.toThrow();
        }
    });

    it('renders a preset preview read-only without touching the store', () => {
        useDocumentStore.setState({ documents: [], currentDocumentId: null });
        render(
            createElement(TemplatePreview, {
                document: presetCharacterDocument(JAX_VORN_PRESET),
                node: 'base',
            })
        );
        const name = screen.getByLabelText('Name') as HTMLInputElement;
        expect(name.value).toBe('Jax Vorn');
        expect(name.disabled).toBe(true);
        expect(useDocumentStore.getState().documents).toHaveLength(0);
        takeSheetIssues(); // body sections degrade without the sheet's body handlers
    });

    it('prompts to create a character without a current document and never seeds presets', () => {
        useDocumentStore.setState({ documents: [], currentDocumentId: null });
        render(createElement(TemplateFragment, { node: 'attributes' }));
        expect(screen.getByText(/Create or open a character/)).toBeTruthy();
        cleanup();

        useDocumentStore.setState({
            documents: [
                {
                    id: 'reader-doc',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Reader', tags: [] },
                    templateValues: {},
                    data: createDefaultStarWarsCharacterData(),
                } as never,
            ],
            currentDocumentId: 'reader-doc',
        });
        render(createElement(TemplateFragment, { node: 'attributes' }));
        expect(screen.getAllByText('Strength').length).toBeGreaterThan(0);
        expect(useDocumentStore.getState().documents[0]!.metadata.seededPresets).toBeUndefined();
    });

    it('reports an embed that points at a missing node', () => {
        render(createElement(TemplateFragment, { node: 'no-such-node' }));
        expect(takeSheetIssues().map(({ code }) => code)).toContain('template-reference-invalid');
    });
});

describe('health preview documents', () => {
    afterEach(cleanup);

    it('build a valid character document and render the health track', () => {
        const preview = healthPreviewDocument([
            'slash',
            'cross',
            'empty',
            'empty',
            'empty',
            'empty',
            'empty',
        ]);
        render(createElement(TemplatePreview, { document: preview, node: 'track-health' }));
        expect(screen.getAllByText('Bruised').length).toBeGreaterThan(0);
        takeSheetIssues();
    });
});
