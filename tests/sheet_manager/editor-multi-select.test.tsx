// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { dragNode, pressShortcut, resetEditorStores } from './helpers/editor';

vi.setConfig({ testTimeout: 20_000 });

const text = (id: string) => ({ id, type: 'text', label: id.toUpperCase() });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'multi-kit',
        name: 'Multi Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'a',
                type: 'section',
                title: 'A',
                children: [text('a1'), text('a2'), text('a3')],
            },
            { id: 'b', type: 'section', title: 'B', children: [text('b1'), text('b2')] },
        ],
    });

const onClose = vi.fn();
function openEditor() {
    render(
        createElement(TemplateEditorDialog, {
            base: { kind: 'edit', template: template() },
            onClose,
        })
    );
}

const outlineRow = (nodeId: string) =>
    document.querySelector(`[data-outline-row="${nodeId}"]`) as HTMLElement;
const selectButton = (nodeId: string) =>
    [...outlineRow(nodeId).querySelectorAll('button')].find(
        (button) => !button.hasAttribute('data-drag-handle')
    )!;
const frame = (nodeId: string) =>
    document.querySelector(`[data-editor-frame][data-node-id="${nodeId}"]`) as HTMLElement;
const clickRow = (nodeId: string, modifiers: Record<string, boolean> = {}) =>
    fireEvent.click(selectButton(nodeId), modifiers);
const childIds = (parentId: string) =>
    [
        ...document.querySelectorAll(`[data-children-of="${parentId}"] > li > [data-outline-row]`),
    ].map((row) => row.getAttribute('data-outline-row')!);
const selected = () =>
    [...document.querySelectorAll('[data-editor-frame][data-selected]')].map((element) =>
        element.getAttribute('data-node-id')
    );
const announcer = () => document.querySelector('[data-editor-announcer]')!.textContent;
const undo = () => fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
const dialog = () => screen.getByRole('dialog');

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
});

describe('selecting several elements (spec 023, US2)', () => {
    beforeEach(() => {
        resetEditorStores();
        onClose.mockClear();
    });
    afterEach(cleanup);

    it('toggles with Ctrl or ⌘ on the page and in the outline, marked in both', () => {
        openEditor();
        clickRow('a1');
        fireEvent.click(frame('b1'), { ctrlKey: true });
        clickRow('a3', { metaKey: true });
        expect(selected()).toEqual(['a1', 'a3', 'b1']);
        expect(selectButton('b1').getAttribute('aria-pressed')).toBe('true');
        expect(selectButton('a2').getAttribute('aria-pressed')).toBe('false');
        expect(announcer()).toBe('3 elements selected');
        expect(screen.getByText('3 elements selected', { selector: 'h4' })).not.toBeNull();
        clickRow('a1', { ctrlKey: true });
        expect(selected()).toEqual(['a3', 'b1']);
        clickRow('a2');
        expect(selected()).toEqual(['a2']);
    });

    it('selects a range among siblings with Shift', () => {
        openEditor();
        clickRow('a1');
        fireEvent.click(frame('a3'), { shiftKey: true });
        expect(selected()).toEqual(['a1', 'a2', 'a3']);
    });

    it('clears the selection with Escape before closing the editor', () => {
        openEditor();
        clickRow('a1');
        clickRow('b1', { ctrlKey: true });
        fireEvent.keyDown(dialog(), { key: 'Escape', code: 'Escape' });
        expect(selected()).toEqual([]);
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.keyDown(dialog(), { key: 'Escape', code: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('removes, duplicates, and moves the selection as one step each', () => {
        openEditor();
        clickRow('a1');
        clickRow('b1', { ctrlKey: true });
        pressShortcut(outlineRow('b1'), 'Delete');
        expect(childIds('a')).toEqual(['a2', 'a3']);
        expect(childIds('b')).toEqual(['b2']);
        expect(announcer()).toBe('2 elements removed. Press Ctrl+Z to undo.');
        undo();
        expect(childIds('a')).toEqual(['a1', 'a2', 'a3']);
        expect(selected()).toEqual(['a1', 'b1']);

        pressShortcut(outlineRow('b1'), 'KeyD', { ctrl: true });
        expect(childIds('a')).toHaveLength(4);
        expect(childIds('b')).toHaveLength(3);
        undo();

        pressShortcut(outlineRow('b1'), 'ArrowDown', { alt: true });
        expect(childIds('a')).toEqual(['a2', 'a1', 'a3']);
        expect(childIds('b')).toEqual(['b2', 'b1']);
        undo();
        expect(childIds('a')).toEqual(['a1', 'a2', 'a3']);
    });

    it('duplicates a group selected with its own element once', () => {
        openEditor();
        clickRow('b');
        clickRow('b1', { ctrlKey: true });
        pressShortcut(outlineRow('b'), 'KeyD', { ctrl: true });
        expect(childIds('root')).toHaveLength(3);
        expect(childIds('b')).toEqual(['b1', 'b2']);
    });

    it('drags every selected element to the drop place in page order', () => {
        openEditor();
        clickRow('b1');
        clickRow('a1', { ctrlKey: true });
        dragNode('b1', document.querySelector('[data-insert-slot="a:3:-"]')!);
        expect(childIds('a')).toEqual(['a2', 'a3', 'a1', 'b1']);
        expect(childIds('b')).toEqual(['b2']);
        expect(announcer()).toBe('2 elements moved.');
        undo();
        expect(childIds('a')).toEqual(['a1', 'a2', 'a3']);
        expect(childIds('b')).toEqual(['b1', 'b2']);
    });

    it('drags only the pressed element when it is not selected', () => {
        openEditor();
        clickRow('a1');
        clickRow('a2', { ctrlKey: true });
        dragNode('b1', document.querySelector('[data-insert-slot="a:0:-"]')!);
        expect(childIds('a')).toEqual(['b1', 'a1', 'a2', 'a3']);
    });

    it('keeps the saved template valid after multi-element actions (SC-006)', () => {
        openEditor();
        clickRow('a1');
        clickRow('b2', { ctrlKey: true });
        pressShortcut(outlineRow('a1'), 'KeyD', { ctrl: true });
        pressShortcut(outlineRow('a1'), 'ArrowUp', { alt: true });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates[0];
        expect(CustomTemplateSchema.safeParse(saved).success).toBe(true);
    });
});
