// @vitest-environment happy-dom
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../../setup/sheetIssues';
import { renderEditor, resetEditorStores } from '../helpers/editor';
import { selectInOutline, settings } from '../helpers/templateEditor';

/** "From catalog" on a text field in the editor (spec 038, US3). */

vi.setConfig({ testTimeout: 30_000 });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'from-editor-kit',
        name: 'From Editor Kit',
        systemId: 'wod-v5',
        documentKind: 'vampire',
        schemaVersion: 3,
        children: [
            { id: 'clan-name', type: 'text', label: 'Clan name' },
            { id: 'bane-note', type: 'text', label: 'Bane note' },
        ],
    });

describe('From catalog in the editor', () => {
    beforeEach(() => resetEditorStores());
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    it('binds a text field to a catalog text and saves it', () => {
        useTemplateStore.setState({ templates: [template()], quarantine: [] });
        renderEditor(template());
        selectInOutline('bane-note');
        const panel = settings('bane-note');
        fireEvent.click(within(panel).getByLabelText('From catalog'));
        fireEvent.change(within(panel).getByLabelText('Catalog'), {
            target: { value: 'v5-vampire-clans' },
        });
        fireEvent.change(within(panel).getByLabelText('Entry named by'), {
            target: { value: 'nowhere' },
        });
        expect(screen.getAllByText(/nowhere/).length).toBeGreaterThan(0);
        fireEvent.change(within(panel).getByLabelText('Entry named by'), {
            target: { value: 'clan-name' },
        });
        fireEvent.change(within(panel).getByLabelText('Text'), { target: { value: 'compulsion' } });
        fireEvent.change(within(panel).getByLabelText('Shows'), { target: { value: 'show' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(useTemplateStore.getState().templates[0]!.children[1]).toMatchObject({
            fromCatalog: {
                catalogId: 'v5-vampire-clans',
                entryFrom: 'clan-name',
                text: 'compulsion',
                mode: 'show',
            },
        });
    });
});
