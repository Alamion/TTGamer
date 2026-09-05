// @vitest-environment jsdom

import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { countUnfilledRequired } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function buildTemplate() {
    return CustomTemplateSchema.parse({
        id: 'render-kit',
        name: 'Render Kit',
        documentKind: 'character',
        schemaVersion: 1,
        sections: [
            {
                id: 'identity',
                title: 'Identity',
                blocks: [
                    {
                        id: 'identity-fields',
                        type: 'fields',
                        columns: 2,
                        fields: [
                            { id: 'origin', label: 'Origin', type: 'text', required: true },
                            { id: 'charge', label: 'Charge', type: 'number', min: 0, max: 10 },
                            { id: 'trained', label: 'Trained', type: 'toggle' },
                            {
                                id: 'rank',
                                label: 'Rank',
                                type: 'select',
                                options: [
                                    { id: 'rookie', label: 'Rookie' },
                                    { id: 'veteran', label: 'Veteran' },
                                ],
                            },
                            { id: 'force-rating', label: 'Force rating', type: 'rating', max: 5 },
                            { id: 'credits', label: 'Credits', type: 'resource', max: 1000 },
                        ],
                    },
                    {
                        id: 'gear-table',
                        type: 'table',
                        title: 'Gear',
                        minRows: 0,
                        maxRows: 5,
                        columns: [{ id: 'gear-name', label: 'Item', type: 'text' }],
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

function buildCatalogTemplate(catalogId = 'melee-weapons') {
    return CustomTemplateSchema.parse({
        id: 'catalog-kit',
        name: 'Catalog Kit',
        documentKind: 'character',
        schemaVersion: 1,
        sections: [
            {
                id: 'kit',
                title: 'Kit',
                blocks: [
                    {
                        id: 'kit-fields',
                        type: 'fields',
                        columns: 1,
                        fields: [
                            {
                                id: 'weapon-pick',
                                label: 'Weapon',
                                type: 'select',
                                options: [{ id: 'placeholder', label: 'Placeholder' }],
                                binding: {
                                    catalogId,
                                    fills: {
                                        name: { targetFieldId: 'weapon-name' },
                                        damage: { targetFieldId: 'weapon-damage' },
                                    },
                                },
                            },
                            { id: 'weapon-name', label: 'Weapon name', type: 'text' },
                            { id: 'weapon-damage', label: 'Weapon damage', type: 'text' },
                        ],
                    },
                ],
            },
        ],
    });
}

describe('DeclarativeSheetView', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [buildTemplate()], quarantine: [] });
        seedDocument();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders sections, blocks, and fields in template order', () => {
        render(createElement(DeclarativeSheetView, { template: buildTemplate() }));

        expect(screen.getByText('Identity')).not.toBeNull();
        expect(screen.getByText('Origin')).not.toBeNull();
        expect(screen.getByText('Item')).not.toBeNull();
        // Soft-required marker present for the required field.
        expect(screen.getByLabelText('Required (advisory marker)')).not.toBeNull();
    });

    it('alternates section accent colors (primary → secondary → primary)', () => {
        const manySections = CustomTemplateSchema.parse({
            ...buildTemplate(),
            sections: [0, 1, 2].map((index) => ({
                id: `section-${index}`,
                title: `Section ${index}`,
                blocks: [
                    {
                        id: `block-${index}`,
                        type: 'fields',
                        fields: [{ id: `field-${index}`, label: `Field ${index}`, type: 'text' }],
                    },
                ],
            })),
        });
        const { container } = render(
            createElement(DeclarativeSheetView, { template: manySections })
        );

        const stripes = container.querySelectorAll('span[class*="h-6"]');
        const accents = Array.from(stripes).map((stripe) =>
            stripe.className.includes('bg-primary') ? 'primary' : 'secondary'
        );
        expect(accents).toEqual(['primary', 'secondary', 'primary']);
    });

    it('writes text values into the document value bag', () => {
        render(createElement(DeclarativeSheetView, { template: buildTemplate() }));

        fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'Corellia' } });

        const document = useDocumentStore.getState().documents[0]!;
        expect(document.templateValues?.origin).toBe('Corellia');
    });

    it('supports number, toggle, select, rating, and resource controls', () => {
        render(createElement(DeclarativeSheetView, { template: buildTemplate() }));

        fireEvent.change(screen.getByLabelText('Charge'), { target: { value: '6' } });
        fireEvent.click(screen.getByLabelText('Trained'));
        fireEvent.change(screen.getByLabelText('Rank'), { target: { value: 'veteran' } });

        const values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.charge).toBe(6);
        expect(values?.trained).toBe(true);
        expect(values?.rank).toBe('veteran');
    });

    it('adds table rows and fills cells', () => {
        render(createElement(DeclarativeSheetView, { template: buildTemplate() }));

        fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
        fireEvent.change(screen.getAllByLabelText('Item')[0]!, {
            target: { value: 'Vibroblade' },
        });

        const values = useDocumentStore.getState().documents[0]!.templateValues;
        expect(values?.['gear-table']).toEqual({ '0': { 'gear-name': 'Vibroblade' } });
    });

    it('keeps orphaned values in the bag when absent from the template', () => {
        seedDocument({ removedField: 'legacy-data' });
        render(createElement(DeclarativeSheetView, { template: buildTemplate() }));

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
        const template = CustomTemplateSchema.parse({
            id: 'catalog-kit',
            name: 'Catalog Kit',
            documentKind: 'character',
            schemaVersion: 1,
            sections: [
                {
                    id: 'kit',
                    title: 'Kit',
                    blocks: [
                        {
                            id: 'kit-fields',
                            type: 'fields',
                            columns: 1,
                            fields: [
                                {
                                    id: 'weapon-pick',
                                    label: 'Weapon',
                                    type: 'select',
                                    options: [{ id: 'placeholder', label: 'Placeholder' }],
                                    binding: {
                                        catalogId: 'melee-weapons',
                                        fills: {
                                            name: { targetFieldId: 'weapon-name' },
                                            damage: { targetFieldId: 'weapon-damage' },
                                        },
                                    },
                                },
                                { id: 'weapon-name', label: 'Weapon name', type: 'text' },
                                { id: 'weapon-damage', label: 'Weapon damage', type: 'text' },
                            ],
                        },
                    ],
                },
            ],
        });
        useTemplateStore.setState({ templates: [template], quarantine: [] });
        render(createElement(DeclarativeSheetView, { template }));

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
        useTemplateStore.setState({ templates: [template], quarantine: [] });
        render(createElement(DeclarativeSheetView, { template }));
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
        useTemplateStore.setState({ templates: [template], quarantine: [] });
        render(createElement(DeclarativeSheetView, { template }));

        expect(screen.getByRole('alert').textContent).toContain('unavailable on this device');
        // Manual fallback keeps the static options.
        const picker = screen.getByLabelText('Weapon') as HTMLSelectElement;
        expect(Array.from(picker.options).map((option) => option.text)).toContain('Placeholder');
    });
});
