// @vitest-environment happy-dom
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../../setup/sheetIssues';
import { openSettingsGroups, renderEditor, resetEditorStores } from '../helpers/editor';
import { selectInOutline, settings } from '../helpers/templateEditor';

/** "Show only when a condition holds" with a formula (spec 038, US2). */

vi.setConfig({ testTimeout: 20_000 });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'condition-kit',
        name: 'Condition Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            { id: 'potency', type: 'number', label: 'Potency' },
            { id: 'note', type: 'text', label: 'Note' },
        ],
    });

describe('display condition by formula in the editor', () => {
    beforeEach(() => resetEditorStores());
    afterEach(cleanup);

    it('switches the condition to a formula, checks it, and saves it', () => {
        useTemplateStore.setState({ templates: [template()], quarantine: [] });
        renderEditor(template());
        selectInOutline('note');
        openSettingsGroups();
        const panel = settings('note');
        fireEvent.click(within(panel).getByLabelText('Show only when a condition holds'));
        fireEvent.change(within(panel).getByLabelText('Condition'), {
            target: { value: 'formula' },
        });
        const formula = within(panel).getByLabelText('Formula');
        fireEvent.change(formula, { target: { value: 'missing > 1' } });
        expect(within(panel).getByText(/missing/)).not.toBeNull();
        // The live page hides the element and reports the formula it cannot compute.
        expect(takeSheetIssues().map(({ code }) => code)).toContain('formula-error');
        fireEvent.change(formula, { target: { value: 'potency >= 3' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates[0]!;
        expect(saved.children[1]).toMatchObject({ visibleWhen: { formula: 'potency >= 3' } });
        // Renders before the fix repeat the report; the empty Potency is never reported.
        expect(
            takeSheetIssues().every(({ details }) => JSON.stringify(details).includes('missing'))
        ).toBe(true);
    });
});
