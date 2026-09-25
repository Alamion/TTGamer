// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEditorStores } from './helpers/editor';

// Full editor renders (outline, live page, settings) are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'page-kit',
        name: 'Page Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'page',
                type: 'section',
                title: 'Page',
                columns: 2,
                children: [
                    {
                        id: 'identity',
                        type: 'group',
                        title: 'Identity',
                        column: 1,
                        children: [
                            { id: 'origin', type: 'text', label: 'Origin' },
                            { id: 'gifted', type: 'toggle', label: 'Gifted' },
                        ],
                    },
                    {
                        id: 'powers',
                        type: 'group',
                        title: 'Powers',
                        column: 2,
                        visibleWhen: { coordinate: 'gifted', equals: true },
                        children: [{ id: 'spark', type: 'text', label: 'Spark' }],
                    },
                ],
            },
        ],
    });

const frame = (nodeId: string) =>
    document.querySelector(`[data-editor-frame][data-node-id="${nodeId}"]`) as HTMLElement;
const outlineRow = (nodeId: string) =>
    document.querySelector(`[data-outline-row="${nodeId}"]`) as HTMLElement;
const settings = (nodeId: string) =>
    document.querySelector(`[data-settings-for="${nodeId}"]`) as HTMLElement;
const selectInOutline = (nodeId: string) =>
    fireEvent.click(
        [...outlineRow(nodeId).querySelectorAll('button')].find(
            (button) => !button.hasAttribute('draggable')
        )!
    );

function openEditor() {
    render(
        createElement(TemplateEditorDialog, {
            base: { kind: 'edit', template: template() },
            onClose: () => {},
        })
    );
}

describe('template editor page (spec 012, US1)', () => {
    beforeEach(() => {
        resetEditorStores();
        localStorage.clear();
    });
    afterEach(cleanup);

    it('shows every settings change on the page before saving', () => {
        openEditor();
        expect(within(frame('origin')).getByText('Origin')).not.toBeNull();

        selectInOutline('origin');
        fireEvent.change(within(settings('origin')).getByLabelText('Field label'), {
            target: { value: 'Homeworld' },
        });
        expect(within(frame('origin')).getByText('Homeworld')).not.toBeNull();

        selectInOutline('page');
        fireEvent.change(within(settings('page')).getByLabelText('Columns'), {
            target: { value: '3' },
        });
        expect(document.querySelector('[data-drop-zone="page:3"]')).not.toBeNull();
    });

    it('shares the selection between the page, the outline, and the settings', () => {
        openEditor();
        fireEvent.click(frame('identity'));
        expect(frame('identity').hasAttribute('data-selected')).toBe(true);
        expect(outlineRow('identity').getAttribute('aria-current')).toBe('true');
        expect(settings('identity')).not.toBeNull();

        selectInOutline('origin');
        expect(frame('origin').hasAttribute('data-selected')).toBe(true);
        expect(frame('identity').hasAttribute('data-selected')).toBe(false);

        // A click on empty page space clears the selection.
        fireEvent.click(document.querySelector('[data-editor-page]')!);
        expect(document.querySelector('[data-settings-for]')).toBeNull();
    });

    it('keeps condition-hidden elements visible, marked, and selectable', () => {
        openEditor();
        const hidden = frame('powers');
        expect(hidden.hasAttribute('data-condition-hidden')).toBe(true);
        expect(hidden.textContent).toContain('gifted');
        fireEvent.click(hidden);
        expect(settings('powers')).not.toBeNull();
    });

    it('writes page interactions to sample data only', () => {
        const before = useDocumentStore.getState().documents;
        openEditor();
        const origin = within(frame('origin')).getByLabelText('Origin') as HTMLInputElement;
        fireEvent.change(origin, { target: { value: 'Corellia' } });
        expect(origin.value).toBe('Corellia');
        // Clicking a value control edits the sample and never selects the element.
        expect(document.querySelector('[data-settings-for]')).toBeNull();
        expect(useDocumentStore.getState().documents).toBe(before);
    });

    it('keeps the editor collapse state apart from the real page', () => {
        openEditor();
        const toggle = within(frame('page')).getAllByRole('button', { expanded: true })[0]!;
        fireEvent.click(toggle);
        const keys = Object.keys(localStorage);
        expect(keys.some((key) => key.includes('editor-template-page-kit-page'))).toBe(true);
        expect(keys.some((key) => /^expanded_template-/.test(key))).toBe(false);
    });

    it('shows the page of an empty draft with an insertion point', () => {
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'empty' },
                onClose: () => {},
            })
        );
        expect(screen.getByText(/Sample data/)).not.toBeNull();
        expect(document.querySelectorAll('[data-editor-frame]').length).toBeGreaterThan(0);
    });
});
