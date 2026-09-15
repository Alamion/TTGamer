// @vitest-environment jsdom

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import {
    resolveDocumentPolicies,
    starWarsWodSystem,
    type SystemPlugin,
    SystemRegistry,
} from '@site/src/sheet_manager/systems';
import { v5System } from '@site/src/sheet_manager/systems/v5';
import { buildV5CoreBindings } from '@site/src/sheet_manager/systems/v5/ruleset/bindings';
import {
    createV5CoreDefault,
    V5CoreShape,
} from '@site/src/sheet_manager/systems/v5/ruleset/schema';
import {
    attributesSection,
    trackGroup,
} from '@site/src/sheet_manager/systems/v5/ruleset/templateParts';
import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
    SystemIdSchema,
} from '@site/src/sheet_manager/types/document';
import { TEMPLATE_SCHEMA_VERSION } from '@site/src/sheet_manager/types/template';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

afterEach(cleanup);

const ROOT = path.resolve('src/sheet_manager');

function sourceFiles(directory: string): string[] {
    return readdirSync(directory).flatMap((entry) => {
        const full = path.join(directory, entry);
        if (statSync(full).isDirectory()) return sourceFiles(full);
        return /\.tsx?$/.test(entry) ? [full] : [];
    });
}

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('V5 ruleset and module boundaries (US5)', () => {
    it('keeps hunter vocabulary out of the ruleset', () => {
        for (const file of sourceFiles(path.join(ROOT, 'systems/v5/ruleset'))) {
            const code = strip(readFileSync(file, 'utf8'));
            expect(code, file).not.toMatch(
                /hunter|creed|\bdrive\b|\bedges?\b|perk|despair|desperation|danger/i
            );
        }
    });

    it('keeps system and module literals out of generic sheet code', () => {
        const generic = [
            ...['components', 'features', 'store', 'types', 'hooks', 'templates'].flatMap((dir) =>
                sourceFiles(path.join(ROOT, dir))
            ),
            ...readdirSync(path.join(ROOT, 'systems'))
                .filter((entry) => /\.ts$/.test(entry) && entry !== 'index.ts')
                .map((entry) => path.join(ROOT, 'systems', entry)),
        ];
        for (const file of generic) {
            const code = strip(readFileSync(file, 'utf8'));
            expect(code, file).not.toMatch(/['"](v5|hunter|superficial|aggravated)['"]/);
            expect(code, file).not.toMatch(/systems\/v5/);
        }
    });

    it('lets a second V5 module register beside hunter without touching the ruleset', () => {
        const kinds: ReadonlySet<string> = new Set(['character']);
        const VampireSchema = z.object({
            ...V5CoreShape,
            hunger: z.number().int().min(0).max(5).default(1),
        });
        const vampireSheet = {
            id: 'v5-vampire-sheet',
            name: 'Vampire',
            systemId: SystemIdSchema.parse('v5'),
            documentKind: DocumentKindSchema.parse('character'),
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            children: [attributesSection(), trackGroup('health'), trackGroup('willpower')],
        };
        const plugin: SystemPlugin = {
            ...v5System,
            documents: [
                ...v5System.documents,
                {
                    id: DocumentDefinitionIdSchema.parse('vampire'),
                    kind: DocumentKindSchema.parse('character'),
                    label: { id: 'test.vampire', message: 'Vampire' },
                    schemaVersion: 1,
                    schema: VampireSchema,
                    createDefault: () => VampireSchema.parse({}),
                    defaultViewId: DocumentViewIdSchema.parse('v5-vampire-sheet'),
                    views: [
                        {
                            id: DocumentViewIdSchema.parse('v5-vampire-sheet'),
                            label: { id: 'test.vampire.sheet', message: 'Sheet' },
                            layout: { type: 'declarative', templateId: 'v5-vampire-sheet' },
                        },
                    ],
                    module: {
                        id: 'vampire',
                        label: { id: 'test.vampire.module', message: 'Vampire' },
                        policies: ['dark-pack'],
                    },
                },
            ],
            defaultTemplates: [...(v5System.defaultTemplates ?? []), vampireSheet],
        };
        const registry = new SystemRegistry([starWarsWodSystem, plugin]);
        expect(
            resolveDocumentPolicies(registry, { systemId: 'v5', definitionId: 'vampire' }).map(
                ({ id }) => id
            )
        ).toEqual(['dark-pack']);
        expect(buildV5CoreBindings(kinds).length).toBeGreaterThan(40);
        expect(
            registry.parseDocument({
                id: 'vamp',
                kind: 'character',
                systemId: 'v5',
                definitionId: 'vampire',
                schemaVersion: 1,
                metadata: {},
                data: { ...createV5CoreDefault(), hunger: 2 },
            }).envelope.data
        ).toMatchObject({ hunger: 2 });

        // The shared page parts render against a vampire-shaped document with V5 bindings.
        useDocumentStore.setState({
            documents: [
                {
                    id: 'vamp',
                    kind: 'character',
                    systemId: 'v5',
                    definitionId: 'hunter',
                    schemaVersion: 1,
                    metadata: { title: 'Vamp', tags: [] },
                    templateValues: {},
                    data: { ...createV5CoreDefault(), hunger: 2 },
                } as never,
            ],
            currentDocumentId: 'vamp',
        });
        render(createElement(DeclarativeSheetView, { template: vampireSheet }));
        expect(screen.getByRole('group', { name: 'Willpower' })).toBeTruthy();
    }, 20_000);
});
