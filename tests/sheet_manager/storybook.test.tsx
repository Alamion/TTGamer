// @vitest-environment jsdom

import { tailwindColors } from '@site/src/shared/components/Palette';
import { ElementStorybook, LibraryStorybook } from '@site/src/sheet_manager/docsEmbeds';
import { validateTemplateReferences } from '@site/src/sheet_manager/features/sheet/data/templateReferences';
import {
    bindingSignature,
    HANDWRITTEN_STORIES,
    listElementStories,
} from '@site/src/sheet_manager/storybook/stories';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { listDocumentBindings } from '@site/src/sheet_manager/systems/templateBindings';
import {
    TEMPLATE_FIELD_TYPES,
    type TemplateNode,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

// Every story renders a full sandbox sheet.
vi.setConfig({ testTimeout: 60_000 });

/** The variant tags a node shows; the storybook must show each required tag at least once. */
function variantsOf(node: TemplateNode): string[] {
    const record = node as unknown as Record<string, unknown>;
    const tags: string[] = [node.type];
    const flag = (key: string, tag = key) => {
        if (record[key] !== undefined && record[key] !== false) tags.push(`${node.type}:${tag}`);
    };
    flag('visibleWhen');
    if ((record.visibleWhen as { not?: boolean } | undefined)?.not) tags.push('visibleWhen:not');
    flag('column');
    flag('span');
    switch (node.type) {
        case 'section':
        case 'group': {
            flag('defaultCollapsed');
            flag('columnWidths');
            if (node.type === 'group') {
                flag('hideTitle');
                flag('collapsible');
            }
            if (node.docsPath) {
                tags.push(
                    `${node.type}:docs:${node.docsPath.startsWith('https://') ? 'external' : 'site'}`
                );
            }
            if ((node.columns ?? 1) > 1) tags.push(`${node.type}:columns:${node.columns}`);
            break;
        }
        case 'text':
            flag('multiline');
            flag('placeholder');
            flag('hideLabel');
            flag('required');
            flag('description');
            break;
        case 'number':
            flag('step');
            flag('maxFrom');
            if (node.min !== undefined && node.max !== undefined) tags.push('number:bounds');
            break;
        case 'select':
            flag('multiple');
            flag('hideUnselected');
            flag('binding');
            if (node.options.length > 12) tags.push('select:searchable');
            break;
        case 'rating':
            tags.push(`rating:${node.presentation}`);
            flag('maxFrom');
            if (node.min > 0) tags.push('rating:min');
            break;
        case 'formula':
            flag('prefix');
            flag('suffix');
            break;
        case 'reference':
            flag('multiple');
            break;
        case 'list':
            tags.push(`list:${node.bindingKey ? 'bound' : 'custom'}`);
            flag('showTitle');
            flag('framed');
            flag('presets');
            if (node.columns > 1) tags.push('list:columns');
            break;
        case 'table':
            for (const column of node.columns) tags.push(...variantsOf(column));
            break;
        case 'primitive':
            flag('compact');
            flag('part');
            flag('trackLayout', `trackLayout:${String(record.trackLayout)}`);
            break;
    }
    return tags;
}

const REQUIRED_VARIANTS = [
    ...TEMPLATE_FIELD_TYPES,
    'section',
    'group',
    'table',
    'list',
    'primitive',
    'section:docs:site',
    'section:docs:external',
    'group:docs:site',
    'section:defaultCollapsed',
    'section:columnWidths',
    'section:columns:2',
    'section:columns:3',
    'section:columns:4',
    'text:column',
    'text:span',
    'group:hideTitle',
    'group:collapsible',
    'group:defaultCollapsed',
    'group:visibleWhen',
    'section:visibleWhen',
    'text:visibleWhen',
    'visibleWhen:not',
    'text:multiline',
    'text:placeholder',
    'text:hideLabel',
    'text:required',
    'text:description',
    'number:bounds',
    'number:step',
    'number:maxFrom',
    'select:multiple',
    'select:hideUnselected',
    'select:binding',
    'select:searchable',
    'rating:dots',
    'rating:boxes',
    'rating:number',
    'rating:min',
    'rating:maxFrom',
    'formula:prefix',
    'formula:suffix',
    'reference:multiple',
    'list:custom',
    'list:bound',
    'list:showTitle',
    'list:framed',
    'list:presets',
    'list:columns',
    'primitive:compact',
    'primitive:part',
    'primitive:trackLayout:table',
    'primitive:trackLayout:strip',
];

describe('element storybook (constitution VI, T-069)', () => {
    afterEach(cleanup);

    it('shows every template element variant at least once', () => {
        const shown = new Set<string>();
        for (const { template } of listElementStories()) {
            walkTemplateNodes(template.children, (node) => {
                for (const tag of variantsOf(node)) shown.add(tag);
            });
        }
        expect(REQUIRED_VARIANTS.filter((tag) => !shown.has(tag))).toEqual([]);
    });

    it('shows every binding shape of every system', () => {
        const missing: string[] = [];
        for (const system of systemRegistry.getSystems()) {
            const shown = new Set<string>();
            for (const { template } of listElementStories()) {
                if (template.systemId !== system.id) continue;
                const bindings = listDocumentBindings(system.id, template.documentKind);
                walkTemplateNodes(template.children, (node) => {
                    const key = 'bindingKey' in node ? node.bindingKey : undefined;
                    const binding = bindings.find((candidate) => candidate.key === key);
                    if (binding) shown.add(bindingSignature(binding));
                });
            }
            for (const kind of new Set(system.documents.map(({ kind }) => String(kind)))) {
                for (const binding of listDocumentBindings(system.id, kind)) {
                    const signature = bindingSignature(binding);
                    if (!shown.has(signature)) missing.push(`${system.id}: ${signature}`);
                }
            }
        }
        expect([...new Set(missing)]).toEqual([]);
    });

    it('keeps stories valid: only the deliberate formula error references a missing value', () => {
        const issues = listElementStories().flatMap(({ id, template }) =>
            validateTemplateReferences(template).map((issue) => `${id}: ${issue.code} ${issue.key}`)
        );
        expect(issues).toEqual(['fields: unknown-coordinate missing-value']);
        expect(HANDWRITTEN_STORIES.map(({ id }) => id)).toEqual([
            'containers',
            'fields',
            'catalog-fields',
            'collections',
        ]);
    });

    it('renders every story on its own sandbox document', () => {
        render(createElement(ElementStorybook));
        for (const { id, title } of listElementStories()) {
            expect(screen.getByRole('heading', { name: title }), id).toBeTruthy();
        }
        // The deliberate formula errors report; nothing else may.
        const unexpected = takeSheetIssues().filter(({ code }) => code !== 'formula-error');
        expect(unexpected).toEqual([]);
    });
});

describe('palette accent roles (spec 013, T-081)', () => {
    it('lists the violet as the tertiary color and no editor color', () => {
        const names = tailwindColors().map(({ name }) => name);
        expect(names).toContain('tertiary');
        expect(names).not.toContain('editor');
    });
});

describe('library storybook (spec 013)', () => {
    afterEach(cleanup);

    it('shows every row level and state and every tick state', () => {
        render(createElement(LibraryStorybook));
        for (const title of ['levels', 'states', 'ticks']) {
            expect(document.querySelector(`[data-library-story="${title}"]`)).not.toBeNull();
        }
        const levels = [...document.querySelectorAll('[data-library-row]')].map((row) =>
            row.getAttribute('aria-level')
        );
        expect(new Set(levels)).toEqual(new Set(['1', '2', '3', '4']));
        const ticks = [...document.querySelectorAll('[role="checkbox"]')];
        expect(ticks.map((box) => box.getAttribute('aria-checked'))).toEqual([
            'false',
            'true',
            'mixed',
            'true',
            'false',
        ]);
        expect(ticks[3]!.getAttribute('data-auto')).toBe('true');
        expect(screen.getByText('Edited full sheet')).toBeTruthy();
        expect(screen.getByText('unavailable')).toBeTruthy();
        expect(takeSheetIssues()).toEqual([]);
    });
});
