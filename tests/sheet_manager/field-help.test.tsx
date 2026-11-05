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

import { setTestLocale } from '../stubs/testLocale';
import { mountSheet } from './helpers/sheet';

const ownPath = '/docs/guide/notes#syntax';
afterEach(() => {
    cleanup();
    localStorage.clear();
    setTestLocale('en');
});

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

const shippedBriefs = systemRegistry
    .getSystems()
    .flatMap((system) =>
        (system.defaultTemplates ?? [])
            .filter((template) => template.pageKind === 'brief')
            .map((template) => ({ system, template }))
    );

describe.each(['en', 'ru'] as const)('%s shipped brief help', (locale) => {
    it.each(shippedBriefs)(
        '$system.id / $template.id keeps every pill free of help',
        ({ system, template }) => {
            setTestLocale(locale);
            const definition = system.documents.find(({ kind }) => kind === template.documentKind)!;
            useDocumentStore.setState({
                documents: [
                    {
                        id: 'brief-help-document',
                        kind: definition.kind,
                        systemId: system.id,
                        definitionId: definition.id,
                        schemaVersion: definition.schemaVersion,
                        metadata: { title: 'Brief help', tags: [] },
                        data: definition.createDefault(),
                    } as never,
                ],
                currentDocumentId: 'brief-help-document',
            });
            const { container } = mountSheet(template);
            const pills = container.querySelectorAll('label.term-label.rounded-sm');
            const hasRatings =
                template.documentKind !== 'vehicle' && template.documentKind !== 'v5-group';
            if (hasRatings) expect(pills.length).toBeGreaterThan(0);
            for (const pill of pills) {
                expect(
                    pill.querySelector('a, button, .lucide-circle-help'),
                    pill.textContent ?? ''
                ).toBeNull();
            }
            if (template.id === 'brief') {
                expect(
                    screen.getByRole('link', {
                        name:
                            locale === 'ru' ? 'Документация: Воля' : 'Documentation for Willpower',
                    })
                ).toBeTruthy();
            }
        }
    );
});

it('omits explicit help only for an abbreviated rating on a custom brief', () => {
    const { container } = mountSheet(
        CustomTemplateSchema.parse({
            id: 'custom-brief-help',
            name: 'Brief help',
            systemId: 'general',
            documentKind: 'note',
            schemaVersion: 4,
            pageKind: 'brief',
            children: [
                { id: 'short', type: 'rating', label: 'Luck', max: 5, docsPath: ownPath },
                {
                    id: 'full',
                    type: 'rating',
                    label: 'Grit',
                    max: 5,
                    docsPath: ownPath,
                    fullLabel: true,
                },
            ],
        })
    );
    expect(container.querySelector('label.term-label.rounded-sm a')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Documentation for Luck' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Documentation for Grit' })).toBeTruthy();
});

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
    it('keeps hidden image help beside the upload control', () => {
        mount({ type: 'image', hideLabel: true, docsPath: ownPath });
        const upload = screen.getByLabelText('Upload image');
        expect(help()?.parentElement?.previousElementSibling).toBe(upload.parentElement);
        expect(help()?.closest('.sr-only')).toBeNull();
    });
    it('gives primitives no automatic help', () => {
        const node = { id: 'p', type: 'primitive', bindingKey: 'track:health' } as const;
        expect(elementHelpFor(node)).toBeUndefined();
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
    expect(help()?.parentElement?.classList.contains('ms-1.5')).toBe(true);
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
        if (kind === 'trait') {
            const mark = link.parentElement!;
            expect(mark.previousElementSibling?.textContent).toContain(descriptor.label);
            expect(mark.previousSibling?.textContent).toBe('\u2060');
            expect(mark.parentElement?.classList.contains('flex')).toBe(false);
        }
    }
);

const approvedTargets = {
    markdown: '/docs/guide/template-editor/elements#markdown',
    mentions: '/docs/guide/template-editor/elements#mentions',
} as const;
type ApprovedType = keyof typeof approvedTargets;

function mountApproved(type: ApprovedType, extra: Record<string, unknown> = {}, brief = false) {
    return mount({ type, ...extra }, brief);
}

describe('approved element defaults', () => {
    it('contains exactly the reviewed control targets', () => {
        expect(ELEMENT_HELP).toEqual(approvedTargets);
    });
    it.each(Object.keys(approvedTargets) as ApprovedType[])(
        '%s gives user pages one default mark and briefs none',
        (type) => {
            mountApproved(type);
            expect(screen.getAllByRole('link', { name: 'Documentation for Journal' })).toHaveLength(
                1
            );
            expect(help()?.getAttribute('href')).toBe(approvedTargets[type]);
            expect(help()?.parentElement?.parentElement?.textContent).toContain('Journal');
            cleanup();
            mountApproved(type, {}, true);
            expect(help()).toBeNull();
        }
    );
    it.each(Object.keys(approvedTargets) as ApprovedType[])(
        '%s hides only its default and preserves explicit help on full and brief pages',
        (type) => {
            mountApproved(type, { hideHelp: true });
            expect(help()).toBeNull();
            for (const brief of [false, true]) {
                cleanup();
                mountApproved(type, { hideHelp: true, docsPath: ownPath }, brief);
                expect(
                    screen.getAllByRole('link', { name: 'Documentation for Journal' })
                ).toHaveLength(1);
                expect(help()?.getAttribute('href')).toBe(ownPath);
            }
        }
    );
    it.each(TEMPLATE_FIELD_TYPES.filter((type) => type !== 'markdown' && type !== 'mentions'))(
        '%s has no default for an ordinary input',
        (type) => {
            expect(elementHelpFor({ ...samples.get(type), type } as never)).toBeUndefined();
        }
    );
});

it('gives every bound primitive no default help, including configured tracker presentations', () => {
    for (const system of systemRegistry.getSystems()) {
        for (const definition of system.documents) {
            for (const binding of listDocumentBindings(system.id, definition.kind)) {
                expect(
                    elementHelpFor({
                        id: 'bound',
                        type: 'primitive',
                        bindingKey: binding.key,
                        poolTracker: { display: 'row', legend: false, total: false },
                    })
                ).toBeUndefined();
            }
        }
    }
});
