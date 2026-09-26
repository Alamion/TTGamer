// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEditorStores } from './helpers/editor';

// Full editor renders are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'tpl-help',
        name: 'Help Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'intro',
                type: 'section',
                title: 'Intro',
                children: [{ id: 'motto', type: 'text', label: 'Motto' }],
            },
        ],
    });

const selectInOutline = (nodeId: string) =>
    fireEvent.click(
        [
            ...document.querySelector(`[data-outline-row="${nodeId}"]`)!.querySelectorAll('button'),
        ].find((button) => !button.draggable)!
    );
const settingsOf = (nodeId: string) =>
    document.querySelector(`[data-settings-for="${nodeId}"]`) as HTMLElement;

describe('template editor help and documentation links (T-068)', () => {
    beforeEach(() => {
        resetEditorStores();
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: template() },
                onClose: () => {},
            })
        );
    });
    afterEach(cleanup);

    it('links the guide from the header and explains settings in place', () => {
        expect(
            screen.getByRole('link', { name: 'Help: Template editor guide' }).getAttribute('href')
        ).toBe('/docs/template-editor');

        selectInOutline('motto');
        const help = within(settingsOf('motto')).getByRole('link', {
            name: /^Help: Shared value key/,
        });
        expect(help.getAttribute('href')).toBe('/docs/template-editor/values#shared-value-key');
        expect(help.getAttribute('target')).toBe('_blank');
    });

    it('flags a documentation link in the wrong format and blocks the save', () => {
        selectInOutline('intro');
        const input = within(settingsOf('intro')).getByLabelText(/^Documentation link/);
        fireEvent.change(input, { target: { value: 'docs/wod-v5' } });
        expect(
            screen.getByText(/Documentation link "docs\/wod-v5" is not a site docs path/)
        ).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);

        fireEvent.change(input, { target: { value: 'https://example.org/wiki' } });
        expect(screen.queryByText(/is not a site docs path/)).toBeNull();

        // Clearing the input removes the link instead of storing an empty one.
        fireEvent.change(input, { target: { value: '' } });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false);
    });
});
