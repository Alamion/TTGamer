// @vitest-environment happy-dom
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../../setup/sheetIssues';
import { renderEditor, resetEditorStores } from '../helpers/editor';
import { outlineChildIds, outlineRow, selectInOutline, settings } from '../helpers/templateEditor';

/** The Button element in the editor (spec 038, US1). */

vi.setConfig({ testTimeout: 30_000 });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'button-editor-kit',
        name: 'Button Editor Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [{ id: 'strain', type: 'number', label: 'Strain', min: 0, max: 5 }],
    });

describe('the Button element in the editor', () => {
    beforeEach(() => resetEditorStores());
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    it('is added from the menu, configured, checked, and saved', () => {
        useTemplateStore.setState({ templates: [template()], quarantine: [] });
        renderEditor(template());
        const slots = document.querySelectorAll('[data-insert-slot^="root:"]');
        fireEvent.click(slots[slots.length - 1]!);
        fireEvent.click(document.querySelector('[data-palette-option="button"]')!);
        const ids = outlineChildIds('root');
        const id = ids[ids.length - 1]!;
        expect(outlineRow(id).getAttribute('data-node-type')).toBe('button');
        selectInOutline(id);
        const panel = settings(id);
        fireEvent.change(within(panel).getByLabelText('Label'), {
            target: { value: 'Strain check' },
        });
        fireEvent.click(within(panel).getByRole('button', { name: 'Add a change: On a failure' }));
        fireEvent.change(within(panel).getByLabelText('Value'), { target: { value: 'missing' } });
        expect(screen.getAllByText(/missing/).length).toBeGreaterThan(0);
        fireEvent.change(within(panel).getByLabelText('Value'), { target: { value: 'strain' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates[0]!;
        expect(saved.children[1]).toMatchObject({
            type: 'button',
            label: 'Strain check',
            roll: { notation: '1d10>=6' },
            onFailure: [{ target: 'strain', op: 'add', amount: '1' }],
        });
    });
});
