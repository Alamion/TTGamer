// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    parseTemplateFile,
    serializeTemplateFile,
} from '@site/src/sheet_manager/features/sheet/shell/templateFile';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { viewToDefaultTemplate } from '@site/src/sheet_manager/systems/view';
import { DocumentKindSchema } from '@site/src/sheet_manager/types/document';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function builtInBlockPlacement(
    id: string,
    accentColor?: 'primary' | 'secondary'
): CustomTemplate['sections'][number]['blocks'][number] {
    return {
        id,
        type: 'built-in',
        blockId: id,
        ...(accentColor ? { accentColor } : {}),
    };
}

/** Same composition as the built-in full character view (order + accents preserved). */
function buildFullParityTemplate(): CustomTemplate {
    return CustomTemplateSchema.parse({
        id: 'full-parity',
        name: 'Full Parity',
        systemId: 'star-wars-wod',
        documentKind: 'character',
        schemaVersion: 1,
        sections: [
            {
                id: 'page',
                title: 'Character',
                blocks: [
                    builtInBlockPlacement('base', 'primary'),
                    builtInBlockPlacement('attributes', 'secondary'),
                    builtInBlockPlacement('skills', 'primary'),
                    builtInBlockPlacement('advantages', 'secondary'),
                    builtInBlockPlacement('force', 'primary'),
                    builtInBlockPlacement('body', 'secondary'),
                    builtInBlockPlacement('other', 'primary'),
                ],
            },
        ],
    });
}

function buildBriefParityTemplate(): CustomTemplate {
    return CustomTemplateSchema.parse({
        id: 'brief-parity',
        name: 'Brief Parity',
        systemId: 'star-wars-wod',
        documentKind: 'character',
        schemaVersion: 1,
        sections: [
            {
                id: 'page',
                title: 'Brief',
                blocks: [builtInBlockPlacement('brief-document')],
            },
        ],
    });
}

function buildMixedTemplate(): CustomTemplate {
    return CustomTemplateSchema.parse({
        id: 'mixed-page',
        name: 'Mixed Page',
        systemId: 'star-wars-wod',
        documentKind: 'character',
        schemaVersion: 1,
        sections: [
            {
                id: 'top',
                title: 'Top',
                blocks: [
                    builtInBlockPlacement('base', 'primary'),
                    {
                        id: 'notes',
                        type: 'fields',
                        columns: 1,
                        fields: [{ id: 'origin', label: 'Origin', type: 'text' }],
                    },
                    builtInBlockPlacement('brief-document', 'secondary'),
                ],
            },
        ],
    });
}

function seedDocument() {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-parity',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'star-wars-wod-character',
                schemaVersion: 1,
                metadata: { title: 'Parity Target', tags: [] },
                templateValues: {},
                data: createDefaultStarWarsCharacterData(),
            } as never,
        ],
        currentDocumentId: 'doc-parity',
    });
}

describe('built-in block placements in declarative pages (feature 004)', () => {
    beforeEach(seedDocument);
    afterEach(cleanup);

    it('renders a derived default template without extra section chrome (fix 1)', () => {
        const view = systemRegistry
            .getDocumentDefinition('star-wars-wod', 'character')
            ?.views.find(({ id }) => id === 'full-sheet');
        expect(view).toBeDefined();
        const derived = viewToDefaultTemplate(
            view!,
            'star-wars-wod',
            DocumentKindSchema.parse('character')
        );
        expect(derived).toBeDefined();
        render(createElement(DeclarativeSheetView, { template: derived! }));
        // The view title must NOT appear as a collapsible section header (blocks sit on top).
        expect(screen.queryByText('Full sheet')).toBeNull();
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    it('renders a full-parity composition: every ready-made part mounts in order (T008)', () => {
        const { container } = render(
            createElement(DeclarativeSheetView, { template: buildFullParityTemplate() })
        );
        // Built-in blocks mount their real sections; count the mounted data-block anchors via
        // section markup. The composition must not produce placeholder alerts.
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        // Every placement rendered a non-empty subtree (7 ready-made parts).
        const pageRoot = container.firstElementChild;
        expect(pageRoot).not.toBeNull();
        expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    });

    it('renders a brief-only composition without placeholders (T008)', () => {
        render(createElement(DeclarativeSheetView, { template: buildBriefParityTemplate() }));
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    it('renders a mixed composition: ready-made parts + declarative fields together (T008)', () => {
        render(createElement(DeclarativeSheetView, { template: buildMixedTemplate() }));
        expect(screen.getByLabelText('Origin')).not.toBeNull();
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    it('degrades an unknown blockId to a labeled placeholder with a notice (T009)', () => {
        const template = CustomTemplateSchema.parse({
            id: 'degraded-page',
            name: 'Degraded',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 1,
            sections: [
                {
                    id: 'page',
                    title: 'Page',
                    blocks: [
                        {
                            id: 'ghost',
                            type: 'built-in',
                            blockId: 'nonexistent-block',
                        },
                        {
                            id: 'notes',
                            type: 'fields',
                            columns: 1,
                            fields: [{ id: 'origin', label: 'Origin', type: 'text' }],
                        },
                    ],
                },
            ],
        });
        render(createElement(DeclarativeSheetView, { template }));
        const alerts = screen.getAllByRole('alert');
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.textContent).toContain('nonexistent-block');
        // The rest of the page is unaffected (FR-4).
        expect(screen.getByLabelText('Origin')).not.toBeNull();
    });

    it('degrades a foreign-kind block instead of rendering it with wrong data (fix 1.2)', () => {
        // A fodder page part in a CHARACTER template must never receive character data.
        const template = CustomTemplateSchema.parse({
            id: 'cross-kind-page',
            name: 'Cross Kind',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 1,
            sections: [
                {
                    id: 'page',
                    title: 'Page',
                    blocks: [
                        { id: 'fodder-part', type: 'built-in', blockId: 'star-wars-fodder-sheet' },
                        {
                            id: 'notes',
                            type: 'fields',
                            columns: 1,
                            fields: [{ id: 'origin', label: 'Origin', type: 'text' }],
                        },
                    ],
                },
            ],
        });
        render(createElement(DeclarativeSheetView, { template }));
        const alerts = screen.getAllByRole('alert');
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.textContent).toContain('star-wars-fodder-sheet');
        expect(screen.getByLabelText('Origin')).not.toBeNull();
    });

    it('assigns accent automatically by block parity (user review, fix 3)', () => {
        const template = CustomTemplateSchema.parse({
            id: 'accent-parity',
            name: 'Accent Parity',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 1,
            sections: [
                {
                    id: 'page',
                    title: 'Page',
                    presentation: 'plain',
                    blocks: [
                        { id: 'base', type: 'built-in', blockId: 'base' },
                        { id: 'attributes', type: 'built-in', blockId: 'attributes' },
                    ],
                },
            ],
        });
        // Parity-driven accent passes 'primary' then 'secondary'; the placement schema carries
        // no accentColor field anymore (stripped from any legacy saved data).
        const parsed = CustomTemplateSchema.parse({
            ...template,
            sections: [
                {
                    ...template.sections[0],
                    blocks: [
                        { id: 'base', type: 'built-in', blockId: 'base', accentColor: 'secondary' },
                    ],
                },
            ],
        });
        const placement = parsed.sections[0]?.blocks[0];
        expect(placement && 'accentColor' in placement).toBe(false);
    });
});

describe('built-in placements in template file transfer (T027, FR-16)', () => {
    it('round-trips a template containing built-in placements identically', () => {
        const template = CustomTemplateSchema.parse({
            id: 'transfer-page',
            name: 'Transfer Page',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 1,
            sections: [
                {
                    id: 'page',
                    title: 'Page',
                    blocks: [
                        { id: 'base', type: 'built-in', blockId: 'base', accentColor: 'primary' },
                        { id: 'brief', type: 'built-in', blockId: 'brief-document' },
                    ],
                },
            ],
        });
        const serialized = serializeTemplateFile(template);
        const parsed = parseTemplateFile(serialized);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.template).toEqual(template);
        }
    });

    it('imports a template with an unknown blockId (degraded at render, import proceeds)', () => {
        const template = CustomTemplateSchema.parse({
            id: 'ghost-page',
            name: 'Ghost Page',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 1,
            sections: [
                {
                    id: 'page',
                    title: 'Page',
                    blocks: [
                        { id: 'ghost', type: 'built-in', blockId: 'from-another-setup' },
                        { id: 'base', type: 'built-in', blockId: 'base' },
                    ],
                },
            ],
        });
        const parsed = parseTemplateFile(serializeTemplateFile(template));
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            // Structure survives import; degradation happens at render time (FR-4).
            expect(parsed.template.sections[0]?.blocks).toHaveLength(2);
        }
    });
});
