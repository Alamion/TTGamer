// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/features/template-editor/TemplateEditorDialog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { renderEditor } from './helpers/editor';
import { outlineChildIds, outlineRow, selectInOutline, settings } from './helpers/templateEditor';

// Full editor renders are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

describe('save problems lead to their setting (spec 022, US4)', () => {
    afterEach(cleanup);

    const open = (children: unknown[]) =>
        render(
            createElement(TemplateEditorDialog, {
                base: {
                    kind: 'edit',
                    // Drafts may hold what the schema refuses; the editor must name it plainly.
                    template: {
                        id: 'save-kit',
                        name: 'Save Kit',
                        systemId: 'star-wars-wod',
                        documentKind: 'character',
                        schemaVersion: 3,
                        children,
                    } as unknown as ReturnType<typeof CustomTemplateSchema.parse>,
                },
                onClose: () => {},
            })
        );

    it('focuses the entry label of a list from its issue', async () => {
        open([
            {
                id: 'notes',
                type: 'list',
                title: 'Notes',
                valueKey: 'notes',
                columns: 1,
                item: { id: 'note', type: 'text', label: '', required: false, compact: false },
            },
        ]);
        const alert = screen.getByRole('alert');
        const issue = within(alert).getByRole('button', {
            name: 'The entry field of list “Notes” has no label.',
        });
        fireEvent.click(issue);
        await waitFor(() =>
            expect(document.activeElement?.getAttribute('data-setting')).toBe('entry.label')
        );
        expect(
            document.activeElement
                ?.closest('[data-settings-for]')
                ?.getAttribute('data-settings-for')
        ).toBe('notes');
        expect(takeSheetIssues()).toEqual([]);
    });

    it('refuses a save the checks missed in plain words and reports the rule', () => {
        open([
            {
                id: 'stats',
                type: 'section',
                title: 'Stats',
                columns: 2,
                columnWidths: [0, 1],
                children: [
                    { id: 'luck', type: 'number', label: 'Luck', required: false, compact: false },
                ],
            },
        ]);
        const alert = screen.getByRole('alert');
        expect(alert.textContent).toContain('Stats: Columns has a value that is not allowed.');
        // Editing reports nothing: only a refused save does.
        expect(takeSheetIssues()).toEqual([]);

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(alert.textContent).not.toMatch(/"code"|too_small|"path"/);
        const reported = takeSheetIssues();
        expect(reported.map(({ code }) => code)).toEqual(['template-draft-invalid']);
        expect(reported[0]?.details).toMatchObject({ nodeId: 'stats', setting: 'columnWidths' });
    });
});

describe('group and list kinds (spec 022, US6)', () => {
    afterEach(cleanup);
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
        useDocumentStore.setState({ documents: [], currentDocumentId: null });
    });

    const kindsKit = () =>
        CustomTemplateSchema.parse({
            id: 'kinds-kit',
            name: 'Kinds Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'adv',
                    type: 'section',
                    title: 'Advantages',
                    children: [{ id: 'luck', type: 'number', label: 'Luck' }],
                },
                {
                    id: 'gear',
                    type: 'table',
                    title: 'Gear',
                    columns: [
                        { id: 'item', type: 'text', label: 'Item' },
                        { id: 'qty', type: 'number', label: 'Qty' },
                    ],
                },
            ],
        });

    /** The confirmation opens over the editor dialog. */
    const confirmDialog = () =>
        screen.getAllByRole('dialog').find((dialog) => !dialog.querySelector('[data-outline]'))!;

    const open = () => renderEditor(kindsKit());

    it('names kinds in the outline and switches a section to a card and back', () => {
        open();
        expect(outlineRow('adv').textContent).toContain('Group · Section');
        expect(outlineRow('gear').textContent).toContain('List · Table');
        selectInOutline('adv');
        fireEvent.click(within(settings('adv')).getByRole('radio', { name: /^Card/ }));
        expect(outlineRow('adv').getAttribute('data-node-type')).toBe('group');
        expect(outlineChildIds('adv')).toEqual(['luck']);
        fireEvent.click(within(settings('adv')).getByRole('radio', { name: /^Section/ }));
        expect(outlineRow('adv').getAttribute('data-node-type')).toBe('section');
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(outlineRow('adv').getAttribute('data-node-type')).toBe('group');
    });

    it('asks before a table drops its other columns, naming them', () => {
        open();
        selectInOutline('gear');
        fireEvent.click(within(settings('gear')).getByRole('radio', { name: /^Entries/ }));
        const confirm = confirmDialog();
        expect(confirm.textContent).toContain('“Qty”');
        fireEvent.click(within(confirm).getAllByRole('button', { name: 'Cancel' })[0]!);
        expect(outlineRow('gear').getAttribute('data-node-type')).toBe('table');

        fireEvent.click(within(settings('gear')).getByRole('radio', { name: /^Entries/ }));
        fireEvent.click(within(confirmDialog()).getByRole('button', { name: 'Remove columns' }));
        expect(outlineRow('gear').getAttribute('data-node-type')).toBe('list');
    });

    it('warns on save when documents hold values of the earlier kind', () => {
        const template = kindsKit();
        useTemplateStore.setState({ templates: [template], quarantine: [], defaultOverrides: {} });
        useDocumentStore.setState({
            documents: [
                {
                    id: 'doc-kinds',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'sentient',
                    schemaVersion: 1,
                    metadata: { title: 'Mara', tags: [], templateId: 'kinds-kit' },
                    templateValues: { gear: { '0': { item: 'Rope' } } },
                    data: {},
                } as never,
            ],
            currentDocumentId: 'doc-kinds',
        });
        open();
        selectInOutline('gear');
        fireEvent.click(within(settings('gear')).getByRole('radio', { name: /^Entries/ }));
        fireEvent.click(within(confirmDialog()).getByRole('button', { name: 'Remove columns' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const confirm = confirmDialog();
        expect(confirm.textContent).toContain('Gear is now shown as Entries');
        fireEvent.click(within(confirm).getByRole('button', { name: 'Save anyway' }));
        expect(useTemplateStore.getState().templates[0]?.children[1]?.type).toBe('list');
    });
});
