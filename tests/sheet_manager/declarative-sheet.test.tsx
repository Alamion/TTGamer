// @vitest-environment jsdom

import { boundNumber } from '@site/src/shared/components/NumberInput';
import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { countUnfilledRequired } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { setTestLocale } from '../stubs/testLocale';

function field(id: string, label: string, type: string, extra: Record<string, unknown> = {}) {
    return { id, label, type, required: false, compact: false, ...extra };
}

function buildTemplate() {
    return CustomTemplateSchema.parse({
        id: 'render-kit',
        name: 'Render Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'identity',
                type: 'section',
                title: 'Identity',
                columns: 2,
                children: [
                    field('origin', 'Origin', 'text', { required: true }),
                    field('charge', 'Charge', 'number', { min: 0, max: 10 }),
                    field('trained', 'Trained', 'toggle'),
                    field('rank', 'Rank', 'select', {
                        options: [
                            { id: 'rookie', label: 'Rookie' },
                            { id: 'veteran', label: 'Veteran' },
                        ],
                        multiple: false,
                    }),
                    field('force-rating', 'Force rating', 'rating', {
                        min: 0,
                        max: 5,
                        presentation: 'dots',
                    }),
                    field('credits', 'Credits', 'resource', { min: 0, max: 1000 }),
                    {
                        id: 'gear-table',
                        type: 'table',
                        title: 'Gear',
                        minRows: 0,
                        maxRows: 5,
                        columns: [field('gear-name', 'Item', 'text', { multiline: false })],
                    },
                ],
            },
        ],
    });
}

function seedDocument(templateValues?: unknown) {
    const character = {
        id: 'doc-render',
        kind: 'character',
        systemId: 'star-wars-wod',
        definitionId: 'star-wars-wod-character',
        schemaVersion: 1,
        metadata: { title: 'Render Target', tags: [] },
        templateValues,
        data: { metadata: { name: '', type: 'sentient' } },
    };
    // The store's non-browser instance accepts the envelope as-is (parsed on write).
    useDocumentStore.setState({
        documents: [character as never],
        currentDocumentId: 'doc-render',
    });
}

/**
 * Renders a template with the owning store seeded — the write path resolves the template
 * through the template library, so the store must know it before any interaction.
 */
function mount(template: ReturnType<typeof buildTemplate>) {
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    return render(createElement(DeclarativeSheetView, { template }));
}

function buildCatalogTemplate(catalogId = 'melee-weapons') {
    return CustomTemplateSchema.parse({
        id: 'catalog-kit',
        name: 'Catalog Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'kit',
                type: 'section',
                title: 'Kit',
                children: [
                    field('weapon-pick', 'Weapon', 'select', {
                        multiple: false,
                        options: [{ id: 'placeholder', label: 'Placeholder' }],
                        binding: {
                            catalogId,
                            fills: {
                                name: { targetFieldId: 'weapon-name' },
                                damage: { targetFieldId: 'weapon-damage' },
                            },
                        },
                    }),
                    field('weapon-name', 'Weapon name', 'text'),
                    field('weapon-damage', 'Weapon damage', 'text'),
                ],
            },
        ],
    });
}

describe('DeclarativeSheetView (recursive composition, US1)', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [buildTemplate()], quarantine: [] });
        seedDocument();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders sections, fields, and tables in template order', () => {
        mount(buildTemplate());

        expect(screen.getByText('Identity')).not.toBeNull();
        expect(screen.getByText('Origin')).not.toBeNull();
        expect(screen.getByText('Item')).not.toBeNull();
        // Soft-required marker present for the required field.
        expect(screen.getByLabelText('Required (advisory marker)')).not.toBeNull();
    });

    it('renders a bare root field without any container chrome', () => {
        const template = CustomTemplateSchema.parse({
            id: 'bare-kit',
            name: 'Bare Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [field('origin', 'Origin', 'text', { required: true })],
        });
        mount(template);
        fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'Corellia' } });
        expect(useDocumentStore.getState().documents[0]!.templateValues?.origin).toBe('Corellia');
    });

    it('renders three nesting levels with independent collapse state', () => {
        const template = CustomTemplateSchema.parse({
            id: 'nested-kit',
            name: 'Nested Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'outer',
                    type: 'section',
                    title: 'Outer',
                    children: [
                        {
                            id: 'inner',
                            type: 'group',
                            title: 'Inner',
                            collapsible: true,
                            children: [field('deep', 'Deep', 'text')],
                        },
                    ],
                },
            ],
        });
        mount(template);

        const outerToggle = screen.getByRole('button', { name: /Outer/ });
        const groupToggle = screen.getByRole('button', { name: /Toggle Inner/ });
        expect(outerToggle.getAttribute('aria-expanded')).toBe('true');
        expect(groupToggle.getAttribute('aria-expanded')).toBe('true');

        // Collapse only the group: the section stays expanded, the field hides.
        fireEvent.click(groupToggle);
        expect(groupToggle.getAttribute('aria-expanded')).toBe('false');
        expect(outerToggle.getAttribute('aria-expanded')).toBe('true');
        expect(screen.queryByLabelText('Deep')).toBeNull();

        // Re-expand the group independently.
        fireEvent.click(groupToggle);
        expect(screen.getByLabelText('Deep')).not.toBeNull();

        // Collapsing the section hides the whole subtree (independent mechanism).
        fireEvent.click(outerToggle);
        expect(outerToggle.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByLabelText('Deep')).toBeNull();
    });

    it('renders a table inside a nested section', () => {
        const template = CustomTemplateSchema.parse({
            id: 'nested-table-kit',
            name: 'Nested Table Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'outer',
                    type: 'section',
                    title: 'Outer',
                    children: [
                        {
                            id: 'inner',
                            type: 'section',
                            title: 'Inner',
                            children: [
                                {
                                    id: 'gear-table',
                                    type: 'table',
                                    minRows: 0,
                                    maxRows: 5,
                                    columns: [
                                        field('gear-name', 'Item', 'text', { multiline: false }),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        mount(template);
        fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
        fireEvent.change(screen.getAllByLabelText('Item')[0]!, { target: { value: 'Vibroblade' } });
        const values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.['gear-table']).toEqual({ '0': { 'gear-name': 'Vibroblade' } });
    });

    it('keeps bag and document-data writes independent', () => {
        const template = CustomTemplateSchema.parse({
            id: 'mixed-kit',
            name: 'Mixed Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                field('bag-note', 'Note', 'text'),
                field('strength', 'Strength', 'rating', {
                    min: 0,
                    max: 5,
                    presentation: 'dots',
                    valueKey: 'strength',
                }),
            ],
        });
        // Bridged coordinates need a real character document to render against.
        useDocumentStore.setState({
            documents: [
                {
                    id: 'doc-render',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Render Target', tags: [] },
                    templateValues: {},
                    data: createDefaultStarWarsCharacterData(),
                } as never,
            ],
            currentDocumentId: 'doc-render',
        });
        mount(template);

        fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'kept in bag' } });
        const document = useDocumentStore.getState().documents[0]!;
        expect(document.templateValues?.['bag-note']).toBe('kept in bag');
        // The strength coordinate is bridged to document data: it renders as the trait
        // primitive (no degraded notice) and the bag stays untouched.
        expect(screen.queryByRole('alert')).toBeNull();
        expect(document.templateValues?.strength).toBeUndefined();
    });

    it('does not crash on an unknown binding (graceful degradation)', () => {
        const template = CustomTemplateSchema.parse({
            id: 'ghost-kit',
            name: 'Ghost Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'ghost',
                    type: 'primitive',
                    bindingKey: 'trait:physical:Nope',
                    compact: false,
                },
            ],
        });
        mount(template);
        expect(screen.getAllByRole('alert').length).toBe(1);
        expect(takeSheetIssues()).toContainEqual(
            expect.objectContaining({
                code: 'binding-unresolved',
                details: { bindingKey: 'trait:physical:Nope', reason: 'unregistered-binding' },
            })
        );
    });

    it('writes text values into the document value bag', () => {
        mount(buildTemplate());

        fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'Corellia' } });

        const document = useDocumentStore.getState().documents[0]!;
        expect(document.templateValues?.origin).toBe('Corellia');
    });

    it('supports number, toggle, and select controls', () => {
        mount(buildTemplate());

        fireEvent.change(screen.getByLabelText('Charge'), { target: { value: '6' } });
        fireEvent.click(screen.getByLabelText('Trained'));
        fireEvent.change(screen.getByLabelText('Rank'), { target: { value: 'veteran' } });

        const values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.charge).toBe(6);
        expect(values?.trained).toBe(true);
        expect(values?.rank).toBe('veteran');
    });

    it('bounds a typed number to the field limits on blur, writing in-range values at once', () => {
        mount(buildTemplate());
        const charge = screen.getByLabelText('Charge') as HTMLInputElement;
        const stored = () => useDocumentStore.getState().documents[0]!.templateValues?.charge;

        fireEvent.change(charge, { target: { value: '7' } });
        expect(stored()).toBe(7);

        fireEvent.change(charge, { target: { value: '42' } });
        expect(stored()).toBe(7);
        fireEvent.blur(charge);
        expect(stored()).toBe(10);
        expect(charge.value).toBe('10');

        // A minimum of 0 leaves no room for a sign, so it cannot be typed at all.
        fireEvent.change(charge, { target: { value: '-3' } });
        expect(charge.value).toBe('10');
        fireEvent.change(charge, { target: { value: 'ten' } });
        expect(charge.value).toBe('10');
    });

    it('snaps numbers to the step grid anchored at the minimum', () => {
        expect(boundNumber(7, { min: 1, step: 2 })).toBe(7);
        expect(boundNumber(6.2, { min: 1, step: 2 })).toBe(7);
        expect(boundNumber(0.30000000000000004, { step: 0.1 })).toBe(0.3);
        expect(boundNumber(11, { min: 0, max: 10, step: 5 })).toBe(10);
    });

    it('draws one rating dot per point, so the first dot is 1', () => {
        mount(buildTemplate());
        const dots = screen.getAllByRole('button', { name: /^Force rating: / });
        expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual([
            'Force rating: 1',
            'Force rating: 2',
            'Force rating: 3',
            'Force rating: 4',
            'Force rating: 5',
        ]);
        const stored = () =>
            useDocumentStore.getState().documents[0]!.templateValues?.['force-rating'];

        fireEvent.click(dots[0]!);
        expect(stored()).toBe(1);
        // Clicking the top filled dot lowers the rating by one, down to the minimum.
        fireEvent.click(screen.getByRole('button', { name: 'Force rating: 1' }));
        expect(stored()).toBe(0);
    });

    it('holds a rating minimum: the first dots stay filled at the floor', () => {
        const template = buildTemplate();
        const identity = template.children[0] as { children: Array<Record<string, unknown>> };
        const rating = identity.children.find(({ id }) => id === 'force-rating')!;
        rating.min = 2;
        mount(template);
        fireEvent.click(screen.getByRole('button', { name: 'Force rating: 1' }));
        expect(useDocumentStore.getState().documents[0]!.templateValues?.['force-rating']).toBe(2);
    });

    it('shows a toggle as a dot switch', () => {
        mount(buildTemplate());
        const trained = screen.getByRole('checkbox', { name: 'Trained' });
        expect(trained.tagName).toBe('BUTTON');
        fireEvent.click(trained);
        expect(trained.getAttribute('aria-checked')).toBe('true');
    });

    it('lists multiple-choice options as pressable words and keeps the option order', () => {
        const template = CustomTemplateSchema.parse({
            id: 'choice-kit',
            name: 'Choice Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                field('langs', 'Languages', 'select', {
                    multiple: true,
                    options: [
                        { id: 'basic', label: 'Basic' },
                        { id: 'huttese', label: 'Huttese' },
                        { id: 'binary', label: 'Binary' },
                    ],
                }),
            ],
        });
        mount(template);
        fireEvent.click(screen.getByRole('button', { name: 'Binary' }));
        fireEvent.click(screen.getByRole('button', { name: 'Basic' }));
        expect(useDocumentStore.getState().documents[0]!.templateValues?.langs).toEqual([
            'basic',
            'binary',
        ]);
        expect(screen.getByRole('button', { name: 'Basic' }).getAttribute('aria-pressed')).toBe(
            'true'
        );
        expect(screen.getByRole('button', { name: 'Huttese' }).getAttribute('aria-pressed')).toBe(
            'false'
        );
    });

    it('hides unselected options until the reader expands the choice', () => {
        seedDocument({ langs: ['huttese'] });
        const template = CustomTemplateSchema.parse({
            id: 'choice-kit',
            name: 'Choice Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                field('langs', 'Languages', 'select', {
                    multiple: true,
                    hideUnselected: true,
                    options: [
                        { id: 'basic', label: 'Basic' },
                        { id: 'huttese', label: 'Huttese' },
                    ],
                }),
            ],
        });
        mount(template);
        expect(screen.queryByRole('button', { name: 'Basic' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Huttese' })).toBeTruthy();

        const expand = screen.getByRole('button', { name: 'Choose options' });
        expect(expand.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(expand);
        fireEvent.click(screen.getByRole('button', { name: 'Basic' }));
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(screen.getByRole('button', { name: 'Basic' })).toBeTruthy();
        expect(useDocumentStore.getState().documents[0]!.templateValues?.langs).toEqual([
            'basic',
            'huttese',
        ]);
    });

    it('adds table rows and fills cells', () => {
        mount(buildTemplate());

        fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
        fireEvent.change(screen.getAllByLabelText('Item')[0]!, {
            target: { value: 'Vibroblade' },
        });

        const values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.['gear-table']).toEqual({ '0': { 'gear-name': 'Vibroblade' } });
    });

    it('keeps orphaned values in the bag when absent from the template', () => {
        seedDocument({ removedField: 'legacy-data' });
        mount(buildTemplate());

        fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'Corellia' } });

        const values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.origin).toBe('Corellia');
        expect(values?.removedField).toBe('legacy-data');
    });

    it('disables every control when the context is read-only', () => {
        render(
            createElement(
                CharacterContext.Provider,
                { value: { character: null, readOnly: true } },
                createElement(DeclarativeSheetView, { template: buildTemplate() })
            )
        );

        const origin = screen.getByLabelText('Origin') as HTMLInputElement;
        expect(origin.disabled).toBe(true);
    });

    it('counts unfilled required fields for the export note', () => {
        const template = buildTemplate();
        expect(countUnfilledRequired(template, {})).toBe(1);
        expect(countUnfilledRequired(template, { origin: 'Corellia' })).toBe(0);
    });

    it('shows localized catalog options and copies fills on selection', () => {
        const template = buildCatalogTemplate();
        mount(template);

        const picker = screen.getByLabelText('Weapon') as HTMLSelectElement;
        const optionLabels = Array.from(picker.options).map((option) => option.text);
        expect(optionLabels).toContain('Knife');

        fireEvent.change(picker, { target: { value: 'knife' } });

        const values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.['weapon-pick']).toBe('knife');
        expect(values?.['weapon-name']).toBe('Knife');
        expect(values?.['weapon-damage']).toBe('Str +1');
    });

    it('re-copying on replace and leaving values on clear (copy-on-select semantics)', () => {
        const template = buildCatalogTemplate();
        mount(template);
        const picker = screen.getByLabelText('Weapon') as HTMLSelectElement;

        fireEvent.change(picker, { target: { value: 'knife' } });
        let values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.['weapon-name']).toBe('Knife');

        // Replace re-copies the new entry's data.
        fireEvent.change(picker, { target: { value: 'sword' } });
        values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.['weapon-name']).toBe('Sword');

        // Clearing the selection leaves the previously copied values untouched.
        fireEvent.change(picker, { target: { value: '' } });
        values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.['weapon-pick']).toBeUndefined();
        expect(values?.['weapon-name']).toBe('Sword');
    });

    it('degrades a catalog-backed field when the catalog is unavailable', () => {
        const template = buildCatalogTemplate('no-such-catalog');
        mount(template);

        expect(screen.getByRole('alert').textContent).toContain('unavailable on this device');
        // Manual fallback keeps the static options.
        const picker = screen.getByLabelText('Weapon') as HTMLSelectElement;
        expect(Array.from(picker.options).map((option) => option.text)).toContain('Placeholder');
        expect(new Set(takeSheetIssues().map(({ code }) => code))).toEqual(
            new Set(['catalog-unavailable'])
        );
    });
});

describe('presentation mapping (US3)', () => {
    beforeEach(() => {
        seedDocument();
    });

    afterEach(() => {
        cleanup();
    });

    function presentationTemplate() {
        return CustomTemplateSchema.parse({
            id: 'presentation-kit',
            name: 'Presentation Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'section-a',
                    type: 'section',
                    title: 'Section A',
                    docsPath: '/docs/star-wars-wod-2e/quick-start',
                    columns: 2,
                    children: [
                        field('f-a', 'Field A', 'text'),
                        field('f-b', 'Field B', 'text'),
                        field('f-c', 'Field C', 'text'),
                    ],
                },
                {
                    id: 'section-b',
                    type: 'section',
                    title: 'Section B',
                    children: [
                        {
                            id: 'group-plain',
                            type: 'group',
                            title: 'Plain Group',
                            collapsible: false,
                            children: [field('f-d', 'Field D', 'text')],
                        },
                        {
                            id: 'group-collapsible',
                            type: 'group',
                            title: 'Collapsible Group',
                            collapsible: true,
                            children: [field('f-e', 'Field E', 'text')],
                        },
                    ],
                },
            ],
        });
    }

    it('alternates section accents by sibling parity and never stores them', () => {
        const { container } = mount(presentationTemplate());
        const stripes = container.querySelectorAll('span[class*="h-6"]');
        const accents = Array.from(stripes).map((stripe) =>
            stripe.className.includes('bg-primary') ? 'primary' : 'secondary'
        );
        expect(accents).toEqual(['primary', 'secondary']);
        expect(JSON.stringify(presentationTemplate().children)).not.toContain('accent');
    });

    it('renders a docs link inside the section header that does not toggle the block', () => {
        mount(presentationTemplate());
        const toggle = screen.getByRole('button', { name: /Section A/ });
        const link = screen.getByLabelText('Documentation for Section A');
        expect(link).not.toBeNull();

        fireEvent.click(link);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });

    it("opens site docs in the reader's locale and external pages as written", () => {
        const withLinks = (docsPath: string) =>
            CustomTemplateSchema.parse({
                id: 'links-kit',
                name: 'Links Kit',
                documentKind: 'character',
                schemaVersion: 3,
                children: [
                    {
                        id: 'linked',
                        type: 'section',
                        title: 'Linked',
                        docsPath,
                        children: [field('f-a', 'Field A', 'text')],
                    },
                ],
            });
        const href = () => screen.getByLabelText('Documentation for Linked').getAttribute('href');

        mount(withLinks('/docs/wod-v5/rules/dice-pools#reading-the-dice'));
        expect(href()).toBe('/docs/wod-v5/rules/dice-pools#reading-the-dice');
        cleanup();

        setTestLocale('ru');
        try {
            mount(withLinks('/docs/wod-v5/rules/dice-pools#reading-the-dice'));
            expect(
                screen.getByLabelText('Документация: Linked', { exact: false }).getAttribute('href')
            ).toBe('/ru/docs/wod-v5/rules/dice-pools#reading-the-dice');
        } finally {
            cleanup();
            setTestLocale('en');
        }

        mount(withLinks('https://example.org/wiki/Hunter'));
        expect(href()).toBe('https://example.org/wiki/Hunter');
    });

    it('drops a documentation link that is not a docs path or https and reports it', () => {
        const template = CustomTemplateSchema.parse({
            id: 'bad-link-kit',
            name: 'Bad Link Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'unsafe',
                    type: 'section',
                    title: 'Unsafe',
                    docsPath: 'javascript:alert(1)',
                    children: [field('f-a', 'Field A', 'text')],
                },
            ],
        });
        mount(template);
        expect(screen.queryByLabelText('Documentation for Unsafe')).toBeNull();
        expect(takeSheetIssues()).toContainEqual(
            expect.objectContaining({
                code: 'template-reference-invalid',
                details: expect.objectContaining({ docsPath: 'javascript:alert(1)' }),
            })
        );
    });

    it('stretches a node over columns in a flowing layout, per breakpoint', () => {
        const template = CustomTemplateSchema.parse({
            id: 'span-kit',
            name: 'Span Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'three',
                    type: 'section',
                    title: 'Three',
                    columns: 3,
                    children: [
                        field('wide', 'Wide', 'text', { span: 2 }),
                        field('narrow', 'Narrow', 'text'),
                        field('full', 'Full', 'text', { span: 3 }),
                    ],
                },
            ],
        });
        mount(template);
        const cell = (label: string) => screen.getByLabelText(label).closest('.md\\:col-span-2');
        expect(cell('Wide')?.className).toBe('md:col-span-2');
        expect(cell('Full')?.className).toBe('md:col-span-2 xl:col-span-3');
        expect(cell('Narrow')).toBeNull();
    });

    it('lays out direct section children in a column grid', () => {
        const { container } = mount(presentationTemplate());
        expect(container.innerHTML).toContain('md:grid-cols-2');
    });

    it('renders groups as titled cards: always-visible title, opt-in collapse only', () => {
        mount(presentationTemplate());
        expect(screen.getByText('Plain Group')).not.toBeNull();
        expect(screen.getByText('Collapsible Group')).not.toBeNull();
        // Non-collapsible group: no toggle button of its own.
        expect(screen.queryByRole('button', { name: /Toggle Plain Group/ })).toBeNull();
        // Collapsible group: a toggle exists and collapsing hides only its children.
        const toggle = screen.getByRole('button', { name: /Toggle Collapsible Group/ });
        fireEvent.click(toggle);
        expect(screen.queryByLabelText('Field E')).toBeNull();
        fireEvent.click(toggle);
        expect(screen.getByLabelText('Field E')).not.toBeNull();
    });
});

describe('derived fields and clamps (US4)', () => {
    beforeEach(() => {
        seedDocument();
    });

    afterEach(() => {
        cleanup();
    });

    function formulaTemplate(children: unknown[]) {
        return CustomTemplateSchema.parse({
            id: 'formula-kit',
            name: 'Formula Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children,
        });
    }

    it('recomputes a formula within one interaction and never stores the result', () => {
        const template = formulaTemplate([
            field('base', 'Base', 'number'),
            field('derived', 'Derived', 'formula', { formula: 'base * 2' }),
        ]);
        mount(template);

        fireEvent.change(screen.getByLabelText('Base'), { target: { value: '21' } });
        expect(screen.getByText('42')).not.toBeNull();
        const values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.derived).toBeUndefined();
    });

    it('enforces read-only on formula fields', () => {
        const template = formulaTemplate([
            field('derived', 'Derived', 'formula', { formula: '1 + 1' }),
        ]);
        mount(template);
        expect(screen.queryByRole('textbox', { name: 'Derived' })).toBeNull();
        expect(screen.getByText('2')).not.toBeNull();
    });

    it('shows a division-by-zero error state instead of a silent value', () => {
        const template = formulaTemplate([
            field('divisor', 'Divisor', 'number'),
            field('derived', 'Derived', 'formula', { formula: '10 / divisor' }),
        ]);
        mount(template);
        fireEvent.change(screen.getByLabelText('Divisor'), { target: { value: '0' } });
        expect(screen.getByRole('alert').textContent).toContain('zero');
    });

    it('shows a labeled degraded state when a maxFrom source is unavailable', () => {
        const template = formulaTemplate([
            field('capped', 'Capped', 'rating', {
                min: 0,
                max: 5,
                presentation: 'number',
                maxFrom: 'no-such-value',
            }),
        ]);
        mount(template);
        expect(screen.getByRole('alert')).not.toBeNull();
    });

    it('clamps the display when a computed maximum lowers, without rewriting the stored value', () => {
        const template = formulaTemplate([
            field('cap', 'Cap', 'number'),
            field('capped', 'Capped', 'rating', {
                min: 0,
                max: 10,
                presentation: 'number',
                maxFrom: 'cap',
            }),
        ]);
        mount(template);

        // Raise the cap, store 8, then lower the cap to 3.
        fireEvent.change(screen.getByLabelText('Cap'), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText('Capped'), { target: { value: '8' } });
        let values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.capped).toBe(8);

        fireEvent.change(screen.getByLabelText('Cap'), { target: { value: '3' } });
        values = useDocumentStore.getState().documents[0]!.templateValues;
        // Stored value untouched (display clamp only, A4)…
        expect(values?.capped).toBe(8);
        // …but the visible input clamps to the cap.
        const capped = screen.getByLabelText('Capped') as HTMLInputElement;
        expect(Number(capped.value)).toBeLessThanOrEqual(3);
    });

    it('degrades a cycle between formula fields with a labeled error', () => {
        const template = formulaTemplate([
            field('left', 'Left', 'formula', { formula: 'derived-right + 1' }),
            field('right', 'Right', 'formula', { formula: 'derived-left + 1' }),
        ]);
        mount(template);
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBe(2);
    });
});
