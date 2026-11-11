// @vitest-environment happy-dom
import { collectDraftIssues } from '@site/src/sheet_manager/features/template-editor/issues/draftIssues';
import { createDraftFromTemplate } from '@site/src/sheet_manager/features/template-editor/model/factories';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../../setup/sheetIssues';
import { renderEditor, resetEditorStores } from '../helpers/editor';
import {
    ISSUE_MESSAGES,
    outlineChildIds,
    outlineRow,
    pageFrame,
    selectInOutline,
    settings,
} from '../helpers/templateEditor';

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

const actionPage = () =>
    CustomTemplateSchema.parse({
        ...template(),
        children: [
            ...template().children,
            { id: 'action', type: 'button', label: 'Act', docsPath: 'https://example.org/action' },
            {
                id: 'rows',
                type: 'table',
                title: 'Rows',
                columns: [{ id: 'name', type: 'text', label: 'Name' }],
                rowButtons: [{ id: 'pay', label: 'Pay' }],
            },
        ],
    });

describe('button documentation settings (spec 049)', () => {
    beforeEach(resetEditorStores);
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    it('edits and saves page and row links through their own visibility settings', () => {
        const page = actionPage();
        useTemplateStore.setState({ templates: [page], quarantine: [] });
        renderEditor(page);
        selectInOutline('action');
        const link = within(settings('action')).getByLabelText(/^Documentation link/);
        expect(link.closest('[data-settings-group]')?.getAttribute('data-settings-group')).toBe(
            'visibility'
        );
        fireEvent.change(link, {
            target: { value: '/docs/guide/template-editor/elements#buttons' },
        });
        selectInOutline('rows');
        fireEvent.click(within(settings('rows')).getByText('Pay', { selector: 'summary' }));
        const rowDetails = within(settings('rows'))
            .getByText('Pay', { selector: 'summary' })
            .closest('details')!;
        const rowLink = within(rowDetails).getByLabelText(/^Documentation link/);
        expect(rowLink.closest('[data-setting]')?.getAttribute('data-setting')).toBe(
            'rowButton:pay.docsPath'
        );
        fireEvent.change(rowLink, { target: { value: 'docs/wrong' } });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.change(rowLink, { target: { value: 'https://example.org/pay' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates[0]!;
        expect(saved.children[1]).toMatchObject({
            docsPath: '/docs/guide/template-editor/elements#buttons',
        });
        expect(saved.children[2]).toMatchObject({
            rowButtons: [{ id: 'pay', docsPath: 'https://example.org/pay' }],
        });
    });

    it('points a malformed row link at that action rather than a parent documentation field', () => {
        const page = actionPage();
        const rows = page.children[2]!;
        if (rows.type !== 'table') throw new Error('Expected test table');
        rows.rowButtons![0]!.docsPath = 'javascript:alert(1)';
        const issues = collectDraftIssues(createDraftFromTemplate(page), ISSUE_MESSAGES);
        expect(issues.filter((issue) => issue.message.includes('Invalid docs link'))).toEqual([
            {
                nodeId: 'rows',
                message: 'Invalid docs link "javascript:alert(1)".',
                setting: { group: 'value', key: 'rowButton:pay.docsPath' },
            },
        ]);
    });

    it('opens the containing Value group and the row details when following a link issue', async () => {
        renderEditor(actionPage());
        selectInOutline('rows');
        const panel = settings('rows');
        fireEvent.click(within(panel).getByText('Pay', { selector: 'summary' }));
        const rowDetails = within(panel)
            .getByText('Pay', { selector: 'summary' })
            .closest('details')!;
        fireEvent.change(within(rowDetails).getByLabelText(/^Documentation link/), {
            target: { value: 'docs/wrong' },
        });
        const value = panel.querySelector('[data-settings-group="value"] > button')!;
        fireEvent.click(value);
        fireEvent.click(screen.getByRole('button', { name: /Documentation link "docs\/wrong"/ }));
        await waitFor(() =>
            expect(document.activeElement?.getAttribute('data-setting')).toBe(
                'rowButton:pay.docsPath'
            )
        );
        expect(document.activeElement?.closest('details')).toHaveProperty('open', true);
        expect(value.getAttribute('aria-expanded')).toBe('true');
    });

    it('opens a page action link without selecting the action in the editor', () => {
        renderEditor(actionPage());
        selectInOutline('strain');
        fireEvent.click(
            within(pageFrame('action')).getByRole('link', { name: 'Documentation for Act' }),
            { ctrlKey: true }
        );
        expect(pageFrame('strain').hasAttribute('data-selected')).toBe(true);
        expect(pageFrame('action').hasAttribute('data-selected')).toBe(false);
    });
});
