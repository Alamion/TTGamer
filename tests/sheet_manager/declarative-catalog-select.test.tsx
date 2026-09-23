// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/** `species` holds 32 entries (over the threshold); `melee-weapons` holds 9 (under it). */
function buildTemplate(catalogId: string, multiple = false) {
    return CustomTemplateSchema.parse({
        id: 'catalog-select-kit',
        name: 'Catalog Select Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'kit',
                type: 'section',
                title: 'Kit',
                children: [
                    {
                        id: 'pick',
                        label: 'Pick',
                        type: 'select',
                        required: false,
                        compact: false,
                        multiple,
                        options: [{ id: 'placeholder', label: 'Placeholder' }],
                        binding: { catalogId, fills: { name: { targetFieldId: 'pick-name' } } },
                    },
                    {
                        id: 'pick-name',
                        label: 'Picked name',
                        type: 'text',
                        required: false,
                        compact: false,
                    },
                ],
            },
        ],
    });
}

function seedDocument(templateValues?: unknown) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-catalog-select',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'star-wars-wod-character',
                schemaVersion: 1,
                metadata: { title: 'Catalog Select', tags: [] },
                templateValues,
                data: { metadata: { name: '', type: 'sentient' } },
            } as never,
        ],
        currentDocumentId: 'doc-catalog-select',
    });
}

function mount(template: ReturnType<typeof buildTemplate>) {
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    return render(createElement(DeclarativeSheetView, { template }));
}

function storedValues() {
    return useDocumentStore.getState().documents[0]!.templateValues;
}

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

beforeEach(() => seedDocument());
afterEach(() => cleanup());

describe('catalog-bound select control', () => {
    it('keeps the plain select for a catalog at or under the threshold', () => {
        mount(buildTemplate('melee-weapons'));

        expect((screen.getByLabelText('Pick') as HTMLElement).tagName).toBe('SELECT');
    });

    it('uses the searchable control for a catalog over the threshold', () => {
        mount(buildTemplate('species'));

        const control = screen.getByLabelText('Pick') as HTMLInputElement;
        expect(control.tagName).toBe('INPUT');
        expect(control.type).toBe('text');
    });

    it('cannot be reached by a multi-select field: the schema rejects a bound one', () => {
        expect(() => buildTemplate('species', true)).toThrow(/single-choice/);
    });

    it('narrows suggestions by typed text and stores the entry id, not its label', () => {
        mount(buildTemplate('species'));
        const control = screen.getByLabelText('Pick') as HTMLInputElement;

        fireEvent.change(control, { target: { value: 'wooki' } });
        // Radix renders the popover content in a portal and inline, so the label appears twice.
        fireEvent.click(screen.getAllByText('Wookiee', { exact: true })[0]);

        // Two species entries share the name "Wookiee"; the first match is the enslaved one.
        expect(storedValues()?.['pick']).toBe('wookiee-slavery');
        expect(storedValues()?.['pick-name']).toBe('Wookiee');
    });

    it('selects an entry with the keyboard alone', () => {
        mount(buildTemplate('species'));
        const control = screen.getByLabelText('Pick') as HTMLInputElement;

        control.focus();
        fireEvent.change(control, { target: { value: 'wooki' } });
        fireEvent.keyDown(control, { key: 'ArrowDown' });
        fireEvent.keyDown(control, { key: 'Enter' });

        // ArrowDown moves off the first suggestion, so Enter commits the second Wookiee entry.
        expect(storedValues()?.['pick']).toBe('wookiee-free');
    });

    it('keeps a stored value that the catalog no longer offers', () => {
        seedDocument({ pick: 'retired-species' });
        mount(buildTemplate('species'));

        expect((screen.getByLabelText('Pick') as HTMLInputElement).value).toBe('retired-species');
        expect(storedValues()?.['pick']).toBe('retired-species');
    });

    it('clears the field when the input is emptied', () => {
        seedDocument({ pick: 'wookiee-slavery' });
        mount(buildTemplate('species'));
        const control = screen.getByLabelText('Pick') as HTMLInputElement;

        fireEvent.change(control, { target: { value: '' } });

        expect(storedValues()?.['pick']).toBeUndefined();
    });

    it('does not swap the control when the option list changes under the user', () => {
        const view = mount(buildTemplate('species'));
        const control = screen.getByLabelText('Pick') as HTMLInputElement;
        fireEvent.change(control, { target: { value: 'wook' } });

        view.rerender(createElement(DeclarativeSheetView, { template: buildTemplate('species') }));

        const after = screen.getByLabelText('Pick') as HTMLInputElement;
        expect(after.tagName).toBe('INPUT');
        expect(after.value).toBe('wook');
    });
});
