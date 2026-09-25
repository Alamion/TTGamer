// @vitest-environment jsdom

import { TemplateImportDialog } from '@site/src/sheet_manager/components/dialogs/TemplateImportDialog';
import { serializeTemplateFile } from '@site/src/sheet_manager/features/sheet/shell/templateFile';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('template import', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
    });
    afterEach(cleanup);

    it('gives a template named like a shipped view a fresh id instead of shadowing it', async () => {
        const template = CustomTemplateSchema.parse({
            id: 'full-sheet',
            name: 'Look-alike',
            documentKind: 'character',
            schemaVersion: 3,
            children: [{ id: 'notes', type: 'text', label: 'Notes' }],
        });
        const { container } = render(
            createElement(TemplateImportDialog, { open: true, onClose: () => undefined })
        );
        const input = document.body.querySelector('input[type="file"]') ?? container;
        const content = serializeTemplateFile(template);
        // jsdom's File has no text(); the dialog reads files through it.
        const file = Object.assign(
            new File([content], 'look-alike.json', { type: 'application/json' }),
            { text: async () => content }
        );
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(useTemplateStore.getState().templates).toHaveLength(1));
        const imported = useTemplateStore.getState().templates[0]!;
        expect(imported.name).toBe('Look-alike');
        expect(imported.id).not.toBe('full-sheet');
        expect(imported.id).toMatch(/^tpl-/);
    });
});
