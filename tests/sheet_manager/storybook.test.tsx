// @vitest-environment jsdom

import { tailwindColors } from '@site/src/shared/components/Palette';
import {
    ElementStorybook,
    LibraryStorybook,
    ReferenceEntryVariants,
} from '@site/src/sheet_manager/docsEmbeds';
import { validateTemplateReferences } from '@site/src/sheet_manager/features/sheet/data/templateReferences';
import {
    bindingSignature,
    HANDWRITTEN_STORIES,
    listElementStories,
} from '@site/src/sheet_manager/storybook/stories';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { listDocumentBindings } from '@site/src/sheet_manager/systems/templateBindings';
import {
    LIST_ITEM_TYPES,
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
    if (typeof record.labelPosition === 'string') tags.push(`label-${record.labelPosition}`);
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
            if (node.binding?.catalogId.startsWith('user-catalog-')) {
                tags.push('select:user-catalog');
            }
            break;
        case 'rating':
            tags.push(`rating:${node.presentation}`);
            flag('maxFrom');
            flag('hideLabel');
            flag('textInput');
            flag('showNumbers');
            flag('dice');
            if (node.dice && node.presentation === 'number') tags.push('rating:dice-number');
            if (node.showNumbers && node.presentation === 'number') {
                tags.push('rating:number-framed');
            }
            for (const trait of node.flags ?? []) tags.push(`rating:flag-${trait}`);
            if (node.min > 0) tags.push('rating:min');
            if (node.max >= 30) tags.push('rating:many');
            break;
        case 'formula':
            flag('prefix');
            flag('suffix');
            break;
        case 'reference':
            flag('multiple');
            break;
        case 'tracker': {
            tags.push(`tracker:display:${node.display}`);
            tags.push(
                node.marks.some(({ fill }) => fill.startsWith('#'))
                    ? 'tracker:marks:own'
                    : `tracker:marks:${node.marks.length}`
            );
            if (node.columns.some(({ kind }) => kind === 'text')) tags.push('tracker:column:text');
            if (node.columns.some(({ covers }) => covers !== undefined))
                tags.push('tracker:covers');
            if (node.columns.some(({ copies }) => copies)) tags.push('tracker:copies');
            if (node.lengths.length > 1) tags.push('tracker:lengths');
            flag('out');
            flag('total');
            flag('legend');
            flag('hideLabel');
            if (!node.valueColumn.show) tags.push('tracker:value-hidden');
            break;
        }
        case 'list':
            tags.push(`list:${node.bindingKey ? 'bound' : 'custom'}`);
            flag('showTitle');
            flag('framed');
            flag('presets');
            if (node.columns > 1) tags.push('list:columns');
            flag('catalog');
            if (node.item) tags.push(`list:item:${node.item.type}`);
            if (node.named === false) tags.push('list:unnamed');
            break;
        case 'table':
            for (const column of node.columns) tags.push(...variantsOf(column));
            if (node.columns.some((column) => column.type === 'select' && column.binding)) {
                tags.push('table:catalog-column');
            }
            break;
        case 'primitive':
            flag('compact');
            flag('part');
            if (node.tracker?.display) tags.push(`primitive:tracker:${node.tracker.display}`);
            if (node.tracker?.columns?.length) tags.push('primitive:tracker:columns');
            if (node.tracker?.total) tags.push('primitive:tracker:total');
            if (node.tracker?.marks) tags.push('primitive:tracker:marks');
            if (node.tracker?.legend) tags.push('primitive:tracker:legend');
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
    'rating:number',
    'rating:hideLabel',
    'rating:textInput',
    'rating:showNumbers',
    'rating:dice',
    'rating:dice-number',
    'rating:flag-specialization',
    'rating:flag-practiced',
    'rating:flag-experienced',
    'rating:many',
    'rating:number-framed',
    'select:user-catalog',
    'list:catalog',
    'table:catalog-column',
    'label-left',
    'label-top',
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
    ...LIST_ITEM_TYPES.map((type) => `list:item:${type}`),
    'list:unnamed',
    'tracker:display:table',
    'tracker:display:strip',
    'tracker:display:line',
    'tracker:marks:1',
    'tracker:marks:2',
    'tracker:marks:3',
    'tracker:marks:own',
    'tracker:column:text',
    'tracker:covers',
    'tracker:copies',
    'tracker:lengths',
    'tracker:out',
    'tracker:total',
    'tracker:legend',
    'tracker:hideLabel',
    'tracker:value-hidden',
    'primitive:compact',
    'primitive:part',
    'primitive:tracker:table',
    'primitive:tracker:strip',
    'primitive:tracker:line',
    'primitive:tracker:columns',
    'primitive:tracker:total',
    'primitive:tracker:marks',
    'primitive:tracker:legend',
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
            'user-catalog',
            'collections',
            'list-entries',
            'trackers',
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

describe('reference entry states (spec 017)', () => {
    afterEach(cleanup);

    it('shows an in-scope, an out-of-scope, and a deleted entry without reports', () => {
        render(createElement(ReferenceEntryVariants));
        expect(screen.getByText('Mara Quill (this setting)')).toBeTruthy();
        expect(screen.getByText('Kira Dune (another setting)')).toBeTruthy();
        expect(screen.getByText('outside this setting')).toBeTruthy();
        expect(screen.getByRole('alert').textContent).toBe('Linked document no longer exists');
        expect(takeSheetIssues()).toEqual([]);
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
        for (const title of ['levels', 'catalogs', 'states', 'ticks']) {
            expect(document.querySelector(`[data-library-story="${title}"]`)).not.toBeNull();
        }
        // Spec 015: a user catalog row and a read-only shipped one.
        expect(document.querySelector('[data-library-row^="c:user:"]')).not.toBeNull();
        expect(
            document.querySelector('[data-library-row="c:star-wars-wod:melee-weapons"]')
        ).not.toBeNull();
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
