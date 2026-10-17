// @vitest-environment happy-dom
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../../setup/sheetIssues';
import { renderEditor, resetEditorStores } from '../helpers/editor';
import { selectInOutline, settings } from '../helpers/templateEditor';

/** A rating drawn as a tracker with marks of another value from the end (spec 038, US4). */

vi.setConfig({ testTimeout: 30_000 });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'marks-kit',
        name: 'Marks Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            { id: 'stains', type: 'number', label: 'Stains', min: 0, max: 10 },
            { id: 'humanity', type: 'rating', label: 'Humanity', min: 0, max: 10 },
        ],
    });

describe('marks from the end in the editor', () => {
    beforeEach(() => resetEditorStores());
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    it('turns a rating into a tracker with marks of another value and saves it', () => {
        useTemplateStore.setState({ templates: [template()], quarantine: [] });
        renderEditor(template());
        selectInOutline('humanity');
        const panel = settings('humanity');
        fireEvent.change(within(panel).getByLabelText('Presentation'), {
            target: { value: 'tracker' },
        });
        fireEvent.click(within(panel).getByLabelText('Marks of another value from the end'));
        fireEvent.change(within(panel).getByLabelText('Value of the marks'), {
            target: { value: 'stains' },
        });
        fireEvent.change(within(panel).getByLabelText('Mark name'), {
            target: { value: 'Stain' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(useTemplateStore.getState().templates[0]!.children[1]).toMatchObject({
            presentation: 'tracker',
            poolTracker: { marksFromEnd: { coordinate: 'stains', mark: { name: 'Stain' } } },
        });
    });
});
