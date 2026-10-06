// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { matchEditorShortcut } from '@site/src/sheet_manager/features/template-editor/commands/keys';
import { formatKeys } from '@site/src/sheet_manager/features/template-editor/commands/list';
import { listedCommands } from '@site/src/sheet_manager/features/template-editor/ShortcutList';
import { TemplateEditorDialog } from '@site/src/sheet_manager/features/template-editor/TemplateEditorDialog';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEditorStores } from './helpers/editor';

vi.setConfig({ testTimeout: 20_000 });

/** The key column of the guide's shortcut table (`#arranging`). */
function guideKeys(path: string): string[] {
    const source = readFileSync(resolve(__dirname, '../..', path), 'utf8');
    const rows = source
        .split('\n')
        .filter((line) => /^\| `/.test(line))
        .map((line) => line.split('|')[1]!.trim());
    return rows.map((cell) =>
        [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]).join(' / ')
    );
}

const registryKeys = (clickWord: string) =>
    listedCommands().map((command) => formatKeys(command, { apple: false, clickWord }).join(' / '));

describe('the shortcut list matches the editor (spec 023, US5)', () => {
    it('lists the same keys in the guide, in English and Russian', () => {
        expect(guideKeys('docs/template-editor/index.mdx')).toEqual(registryKeys('click'));
        expect(
            guideKeys('i18n/ru/docusaurus-plugin-content-docs/current/template-editor/index.mdx')
        ).toEqual(registryKeys('клик'));
    });

    it('opens the list with "?" on any layout, never while typing', () => {
        const press = (event: Partial<KeyboardEvent>, typing = false) =>
            matchEditorShortcut(
                {
                    code: '',
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                    altKey: false,
                    ...event,
                },
                { typing }
            );
        expect(press({ key: '?', code: 'Slash', shiftKey: true })).toBe('shortcuts');
        // Shift+7 on a Russian layout.
        expect(press({ key: '?', code: 'Digit7', shiftKey: true })).toBe('shortcuts');
        expect(press({ key: ',', code: 'Slash', shiftKey: true })).toBe('shortcuts');
        expect(press({ key: '?', code: 'Slash', shiftKey: true }, true)).toBeNull();
    });
});

describe('the shortcut list dialog', () => {
    beforeAll(() => {
        Element.prototype.scrollIntoView ??= () => undefined;
    });
    beforeEach(() => resetEditorStores());
    afterEach(cleanup);

    it('opens from the toolbar and "?", groups the rows, and closes with Escape', async () => {
        render(
            createElement(TemplateEditorDialog, {
                base: {
                    kind: 'edit',
                    template: CustomTemplateSchema.parse({
                        id: 'keys-kit',
                        name: 'Keys Kit',
                        documentKind: 'character',
                        schemaVersion: 3,
                        children: [{ id: 'f1', type: 'text', label: 'F1' }],
                    }),
                },
                onClose: () => {},
            })
        );
        const button = screen.getByRole('button', { name: 'Keyboard shortcuts' });
        expect(button.getAttribute('aria-keyshortcuts')).toBe('?');
        fireEvent.click(button);
        const list = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
        expect(
            within(list)
                .getAllByRole('table')
                .map((table) => table.querySelector('caption')!.textContent)
        ).toEqual(['Edit', 'Selection', 'Arrange', 'History']);
        expect(list.querySelectorAll('tr[data-command]')).toHaveLength(listedCommands().length);
        expect(within(list).getAllByRole('columnheader')[0]!.getAttribute('scope')).toBe('col');
        expect(list.querySelector('tr[data-command="copy"]')!.textContent).toContain('Ctrl+C');
        fireEvent.keyDown(list, { key: 'Escape' });
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).toBeNull()
        );

        const page = document.querySelector('[data-editor-page]')!;
        fireEvent.keyDown(page, { key: '?', code: 'Slash', shiftKey: true });
        expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeNull();
    });
});
