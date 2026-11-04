// @vitest-environment happy-dom
import {
    ELEMENT_HELP,
    elementHelpFor,
} from '@site/src/sheet_manager/features/sheet/declarative/elementHelp';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { HANDWRITTEN_STORIES } from '@site/src/sheet_manager/storybook/stories';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { listDocumentBindings } from '@site/src/sheet_manager/systems/templateBindings';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import {
    CustomTemplateSchema,
    TEMPLATE_FIELD_TYPES,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { mountSheet } from './helpers/sheet';

const ownPath = '/docs/guide/notes#syntax';
afterEach(cleanup);

function mount(extra: Record<string, unknown> = {}, brief = false) {
    return mountSheet(
        CustomTemplateSchema.parse({
            id: 'help-test',
            name: 'Help test',
            systemId: 'general',
            documentKind: 'note',
            schemaVersion: 4,
            ...(brief ? { pageKind: 'brief' } : {}),
            children: [{ id: 'custom-field', type: 'markdown', label: 'Journal', ...extra }],
        })
    );
}
const help = () => screen.queryByRole('link', { name: 'Documentation for Journal' });

describe('field help resolution', () => {
    it('adds optional schema properties without losing them', () => {
        const template = CustomTemplateSchema.parse({
            id: 'help-schema',
            name: 'Help',
            documentKind: 'character',
            schemaVersion: 4,
            children: [
                { id: 'f', type: 'text', label: 'Field', docsPath: ownPath, hideHelp: true },
                {
                    id: 'p',
                    type: 'primitive',
                    bindingKey: 'resource:hunger',
                    docsPath: ownPath,
                    hideHelp: true,
                },
            ],
        });
        for (const node of template.children)
            expect(node).toMatchObject({ docsPath: ownPath, hideHelp: true });
    });
    it('uses the element guide on a full page', () => {
        mount();
        expect(help()?.getAttribute('href')).toBe(ELEMENT_HELP.markdown);
    });
    it('prefers an explicit path over the element default', () => {
        const rules = '/docs/star-wars-wod-2e/core-rules/attributes-abilities#attributes';
        mount({ docsPath: rules });
        expect(help()?.getAttribute('href')).toBe(rules);
    });
    it('hides only the default help', () => {
        mount({ hideHelp: true });
        expect(help()).toBeNull();
        cleanup();
        mount({ hideHelp: true, docsPath: ownPath });
        expect(help()?.getAttribute('href')).toBe(ownPath);
    });
    it('shows only an explicit path on a brief', () => {
        mount({}, true);
        expect(help()).toBeNull();
        cleanup();
        mount({ docsPath: ownPath }, true);
        expect(help()?.getAttribute('href')).toBe(ownPath);
    });
    it('keeps help visible when the label is hidden', () => {
        mount({ hideLabel: true });
        expect(help()).toBeTruthy();
        expect(help()?.closest('.sr-only')).toBeNull();
    });
    it('classifies primitives by the control they draw', () => {
        const node = { id: 'p', type: 'primitive', bindingKey: 'track:health' } as const;
        const previous = ELEMENT_HELP.tracker;
        ELEMENT_HELP.tracker = '/docs/guide/notes#syntax';
        try {
            expect(elementHelpFor(node)).toBe(ELEMENT_HELP.tracker);
        } finally {
            if (previous === undefined) delete ELEMENT_HELP.tracker;
            else ELEMENT_HELP.tracker = previous;
        }
    });
});

// Use the storybook's valid configurations so every registered control is exercised as a sheet cell.
const samples = new Map<string, TemplateNode>();
for (const story of HANDWRITTEN_STORIES) {
    walkTemplateNodes(story.template.children, (node) => {
        if (!samples.has(node.type)) samples.set(node.type, node);
    });
}
it.each(TEMPLATE_FIELD_TYPES)('%s draws one help mark beside its label', (type) => {
    const sample = samples.get(type);
    expect(sample).toBeDefined();
    const field = {
        ...sample,
        id: 'own-field',
        valueKey: 'own-field',
        label: 'Journal',
        docsPath: ownPath,
    };
    mountSheet(
        CustomTemplateSchema.parse({
            id: 'help-control',
            name: 'Help',
            systemId: 'general',
            documentKind: 'note',
            schemaVersion: 4,
            children: [field],
        })
    );
    expect(screen.getAllByRole('link', { name: 'Documentation for Journal' })).toHaveLength(1);
    expect(help()?.parentElement?.parentElement?.textContent).toContain('Journal');
});

it.each(['trait', 'resource', 'track', 'field', 'rows'] as const)(
    'a %s primitive shows help beside its binding label',
    (kind) => {
        const definition = systemRegistry.getDocumentDefinition(
            'star-wars-wod',
            kind === 'rows' ? 'vehicle' : 'character'
        )!;
        const descriptor = listDocumentBindings('star-wars-wod', definition.kind).find(
            (binding) => binding.kind === kind
        )!;
        useDocumentStore.setState({
            documents: [
                {
                    id: 'help-document',
                    kind: definition.kind,
                    systemId: 'star-wars-wod',
                    definitionId: definition.id,
                    schemaVersion: definition.schemaVersion,
                    metadata: { title: 'Help test', tags: [] },
                    data: definition.createDefault(),
                } as never,
            ],
            currentDocumentId: 'help-document',
        });
        mountSheet(
            CustomTemplateSchema.parse({
                id: 'help-primitive',
                name: 'Help',
                systemId: 'star-wars-wod',
                documentKind: definition.kind,
                schemaVersion: 4,
                children: [
                    {
                        id: 'bound',
                        type: 'primitive',
                        bindingKey: descriptor.key,
                        docsPath: ownPath,
                    },
                ],
            })
        );
        const link = screen.getByRole('link', { name: `Documentation for ${descriptor.label}` });
        expect(link.parentElement?.parentElement?.textContent).toContain(descriptor.label);
    }
);
