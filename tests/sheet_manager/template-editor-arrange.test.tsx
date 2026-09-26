// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dragNode, pressShortcut, resetEditorStores } from './helpers/editor';

// Full editor renders (outline, live page, settings) are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

const text = (id: string, column?: number) => ({
    id,
    type: 'text',
    label: id.toUpperCase(),
    ...(column ? { column } : {}),
});

const template = () =>
    CustomTemplateSchema.parse({
        id: 'arrange-kit',
        name: 'Arrange Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'page',
                type: 'section',
                title: 'Page',
                columns: 3,
                children: [
                    {
                        id: 'box',
                        type: 'group',
                        title: 'Box',
                        column: 1,
                        children: [text('inner', undefined)],
                    },
                    text('a', 1),
                    text('b', 2),
                ],
            },
        ],
    });

const outlineRow = (nodeId: string) =>
    document.querySelector(`[data-outline-row="${nodeId}"]`) as HTMLElement;
const selectInOutline = (nodeId: string) =>
    fireEvent.click([...outlineRow(nodeId).querySelectorAll('button')].find((b) => !b.draggable)!);
const dialog = () => screen.getByRole('dialog');
const announcer = () => document.querySelector('[data-editor-announcer]')!.textContent;

function draftNode(id: string): TemplateNode | undefined {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    let found: TemplateNode | undefined;
    const walk = (nodes: readonly TemplateNode[]) => {
        for (const node of nodes) {
            if (node.id === id) found = node;
            if (node.type === 'section' || node.type === 'group') walk(node.children);
        }
    };
    walk(useTemplateStore.getState().templates[0]!.children);
    return found;
}

function childIds(parentId: string): string[] {
    return [
        ...document.querySelectorAll(`[data-children-of="${parentId}"] > li > [data-outline-row]`),
    ].map((row) => row.getAttribute('data-outline-row')!);
}

function openEditor() {
    render(
        createElement(TemplateEditorDialog, {
            base: { kind: 'edit', template: template() },
            onClose: () => {},
        })
    );
}

describe('arranging elements on the page (spec 012, US2)', () => {
    beforeEach(() => resetEditorStores());
    afterEach(cleanup);

    it('moves a dropped element into the slot column in one step', () => {
        openEditor();
        const slotBeforeB = document.querySelector('[data-insert-slot="page:2:2"]')!;
        dragNode('a', slotBeforeB);
        expect(childIds('page')).toEqual(['box', 'a', 'b']);
        expect(announcer()).toContain('column 2');
        expect(draftNode('a')?.column).toBe(2);
    });

    it('drops into an empty column', () => {
        openEditor();
        const zone = document.querySelector('[data-drop-zone="page:3"]')!;
        dragNode('a', zone);
        expect(draftNode('a')?.column).toBe(3);
    });

    it('inserts a chosen element exactly at the slot and selects it', () => {
        openEditor();
        fireEvent.click(document.querySelector('[data-insert-slot="page:2:2"]')!);
        fireEvent.click(document.querySelector('[data-palette-option="field"]')!);
        const ids = childIds('page');
        expect(ids).toHaveLength(4);
        const added = ids[2]!;
        expect(outlineRow(added).getAttribute('aria-current')).toBe('true');
        expect(draftNode(added)?.column).toBe(2);
    });

    it('moves with physical-key shortcuts on a Russian layout and announces it', () => {
        openEditor();
        selectInOutline('b');
        pressShortcut(dialog(), 'ArrowRight', { alt: true, shift: true, key: 'ArrowRight' });
        expect(announcer()).toContain('column 3');

        selectInOutline('inner');
        pressShortcut(dialog(), 'ArrowLeft', { alt: true, key: 'ArrowLeft' });
        expect(childIds('page')).toEqual(['box', 'inner', 'a', 'b']);

        pressShortcut(dialog(), 'ArrowRight', { alt: true, key: 'ArrowRight' });
        expect(childIds('box')).toEqual(['inner']);
        expect(draftNode('b')?.column).toBe(3);
    });

    it('refuses to move a container into itself and leaves the draft unchanged', () => {
        openEditor();
        const slotInsideBox = document.querySelector('[data-insert-slot="box:0:-"]')!;
        dragNode('box', slotInsideBox);
        expect(childIds('page')).toEqual(['box', 'a', 'b']);
        expect(screen.getByRole('alert').textContent).toContain(
            'An element cannot be moved inside itself.'
        );
    });

    it('changes real columns and moves orphaned children into the last one', () => {
        openEditor();
        selectInOutline('page');
        const settings = document.querySelector('[data-settings-for="page"]') as HTMLElement;
        fireEvent.change(within(settings).getByLabelText('Columns'), { target: { value: '2' } });
        expect(document.querySelector('[data-drop-zone="page:3"]')).toBeNull();
        expect(document.querySelectorAll('[data-editor-page] [data-column]').length).toBe(2);
        expect(draftNode('b')?.column).toBe(2);
    });
});
