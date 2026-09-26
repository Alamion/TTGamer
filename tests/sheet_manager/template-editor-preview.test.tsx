// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pressShortcut, resetEditorStores } from './helpers/editor';

// Full editor renders (outline, live page, settings) are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'preview-kit',
        name: 'Preview Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'main',
                type: 'section',
                title: 'Main',
                children: [
                    {
                        id: 'details',
                        type: 'group',
                        title: 'Details',
                        children: [
                            { id: 'origin', type: 'text', label: 'Origin' },
                            { id: 'gifted', type: 'toggle', label: 'Gifted' },
                        ],
                    },
                    {
                        id: 'powers',
                        type: 'group',
                        title: 'Powers',
                        visibleWhen: { coordinate: 'gifted', equals: true },
                        children: [{ id: 'spark', type: 'text', label: 'Spark' }],
                    },
                ],
            },
        ],
    });

function openDocument(): UnknownDocumentEnvelope {
    const data = createDefaultStarWarsCharacterData();
    return {
        id: 'open-doc',
        kind: 'character',
        systemId: 'star-wars-wod',
        definitionId: 'character',
        schemaVersion: 1,
        metadata: { title: 'Kira Dune', tags: [] },
        templateValues: { origin: 'Corellia', gifted: true },
        data,
    } as unknown as UnknownDocumentEnvelope;
}

const outlineRow = (nodeId: string) =>
    document.querySelector(`[data-outline-row="${nodeId}"]`) as HTMLElement;
const selectInOutline = (nodeId: string) =>
    fireEvent.click([...outlineRow(nodeId).querySelectorAll('button')].find((b) => !b.draggable)!);
const dialog = () => screen.getByRole('dialog');
const outlineIds = (parentId: string) =>
    [
        ...document.querySelectorAll(`[data-children-of="${parentId}"] > li > [data-outline-row]`),
    ].map((row) => row.getAttribute('data-outline-row'));

function openEditor() {
    render(
        createElement(TemplateEditorDialog, {
            base: { kind: 'edit', template: template() },
            onClose: () => {},
        })
    );
}

function savedChildren(): readonly TemplateNode[] {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    return useTemplateStore.getState().templates[0]!.children;
}

describe('quick preview and edit history (spec 012, US3)', () => {
    beforeEach(() => resetEditorStores());
    afterEach(cleanup);

    it('previews the page without editor marks on a chosen document', () => {
        useDocumentStore.setState({ documents: [openDocument()], currentDocumentId: 'open-doc' });
        openEditor();
        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

        const preview = document.querySelector('[data-editor-preview]') as HTMLElement;
        expect(preview.querySelector('[data-insert-slot]')).toBeNull();
        expect(preview.querySelector('[data-editor-frame]')).toBeNull();
        const picker = within(preview).getByLabelText('Preview data') as HTMLSelectElement;
        const options = [...picker.options].map((option) => option.textContent);
        expect(options[0]).toBe('Open document: Kira Dune');
        expect(options).toContain('Jax Vorn (example)');
        expect(options.at(-1)).toBe('Blank document');
        // Conditions apply: the open document is gifted, so Powers shows.
        expect(within(preview).getByText('Powers')).not.toBeNull();
        expect((within(preview).getByLabelText('Origin') as HTMLInputElement).value).toBe(
            'Corellia'
        );

        fireEvent.change(picker, { target: { value: 'blank' } });
        expect(within(preview).queryByText('Powers')).toBeNull();
    });

    it('drops the open document from the choices when it disappears', async () => {
        useDocumentStore.setState({ documents: [openDocument()], currentDocumentId: 'open-doc' });
        openEditor();
        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
        await act(async () => {
            useDocumentStore.setState({ documents: [], currentDocumentId: null });
        });
        const preview = document.querySelector('[data-editor-preview]') as HTMLElement;
        const picker = within(preview).getByLabelText('Preview data') as HTMLSelectElement;
        expect([...picker.options].map((o) => o.textContent)).not.toContain(
            'Open document: Kira Dune'
        );
    });

    it('undoes and redoes with physical keys on a Russian layout, restoring selection', () => {
        openEditor();
        selectInOutline('powers');
        pressShortcut(dialog(), 'Delete', { key: 'Delete' });
        expect(outlineIds('main')).toEqual(['details']);

        pressShortcut(dialog(), 'KeyZ', { ctrl: true, key: 'я' });
        expect(outlineIds('main')).toEqual(['details', 'powers']);
        expect(outlineRow('powers').getAttribute('aria-current')).toBe('true');

        pressShortcut(dialog(), 'KeyZ', { ctrl: true, shift: true, key: 'Я' });
        expect(outlineIds('main')).toEqual(['details']);
        pressShortcut(dialog(), 'KeyY', { ctrl: true, key: 'н' });
        expect(outlineIds('main')).toEqual(['details']);
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(outlineIds('main')).toEqual(['details', 'powers']);
    });

    it('duplicates with Ctrl+D into an independent copy', () => {
        openEditor();
        selectInOutline('details');
        pressShortcut(dialog(), 'KeyD', { ctrl: true, key: 'в' });
        const ids = outlineIds('main');
        expect(ids).toHaveLength(3);
        const copyId = ids[1]!;
        expect(copyId).not.toBe('details');
        expect(outlineRow(copyId).getAttribute('aria-current')).toBe('true');

        const [main] = savedChildren();
        const copy = (main as { children: TemplateNode[] }).children[1] as {
            children: Array<{ id: string; valueKey?: string }>;
        };
        expect(copy.children.map(({ id }) => id)).not.toContain('origin');
        expect(copy.children.every(({ valueKey }) => valueKey === undefined)).toBe(true);
    });

    it('leaves text editing keys to a focused field', () => {
        openEditor();
        selectInOutline('origin');
        const label = within(
            document.querySelector('[data-settings-for="origin"]') as HTMLElement
        ).getByLabelText('Field label');
        pressShortcut(label, 'Delete', { key: 'Delete' });
        expect(outlineRow('origin')).not.toBeNull();
    });

    it('coalesces typing into one undo step', () => {
        openEditor();
        selectInOutline('origin');
        const label = within(
            document.querySelector('[data-settings-for="origin"]') as HTMLElement
        ).getByLabelText('Field label');
        for (const value of ['H', 'Ho', 'Hom', 'Home']) {
            fireEvent.change(label, { target: { value } });
        }
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(within(outlineRow('origin')).getByText('Origin')).not.toBeNull();
    });
});
