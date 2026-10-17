// @vitest-environment happy-dom
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { listElementStories } from '@site/src/sheet_manager/storybook/stories';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../../setup/sheetIssues';
import { renderEditor, resetEditorStores } from '../helpers/editor';
import { selectInOutline, settings } from '../helpers/templateEditor';

/** "Limit by parent" on a catalog choice in the editor (spec 038, US5). */

vi.setConfig({ testTimeout: 30_000 });

describe('limit by parent in the editor', () => {
    beforeEach(() => {
        resetEditorStores();
        listElementStories(); // registers the sample catalogs
    });
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    it('limits a catalog choice by a parent list and saves it', () => {
        const template = CustomTemplateSchema.parse({
            id: 'parent-editor-kit',
            name: 'Parent Editor Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'relics',
                    type: 'list',
                    title: 'Relics',
                    valueKey: 'relics',
                    catalog: { catalogId: 'user-catalog-storybk1' },
                },
                {
                    id: 'rite',
                    type: 'select',
                    label: 'Rite',
                    options: [{ id: 'placeholder', label: 'Placeholder' }],
                    binding: { catalogId: 'user-catalog-storybk2' },
                },
            ],
        });
        useTemplateStore.setState({ templates: [template], quarantine: [] });
        renderEditor(template);
        selectInOutline('rite');
        const panel = settings('rite');
        fireEvent.click(within(panel).getByLabelText('Limit by parent'));
        fireEvent.change(within(panel).getByLabelText('Parent list (value key)'), {
            target: { value: 'nowhere' },
        });
        expect(screen.getAllByText(/nowhere/).length).toBeGreaterThan(0);
        fireEvent.change(within(panel).getByLabelText('Parent list (value key)'), {
            target: { value: 'relics' },
        });
        fireEvent.change(within(panel).getByLabelText('Detail with the level'), {
            target: { value: 'c-level001' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(useTemplateStore.getState().templates[0]!.children[1]).toMatchObject({
            binding: {
                catalogId: 'user-catalog-storybk2',
                parent: { list: 'relics', via: 'c-relic001', level: 'c-level001' },
            },
        });
    });
});
