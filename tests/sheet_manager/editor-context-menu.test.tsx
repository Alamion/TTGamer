// @vitest-environment happy-dom

import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderEditor, resetEditorStores, startDrag } from './helpers/editor';

vi.setConfig({ testTimeout: 20_000 });

const text = (id: string) => ({ id, type: 'text', label: id.toUpperCase() });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'menu-kit',
        name: 'Menu Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            { id: 'a', type: 'section', title: 'A', children: [text('a1'), text('a2')] },
            { id: 'b', type: 'section', title: 'B', children: [text('b1')] },
        ],
    });

function openEditor() {
    renderEditor(template());
}

const outlineRow = (nodeId: string) =>
    document.querySelector(`[data-outline-row="${nodeId}"]`) as HTMLElement;
const rowButton = (nodeId: string) =>
    [...outlineRow(nodeId).querySelectorAll('button')].find(
        (button) => !button.hasAttribute('data-drag-handle')
    )!;
const frame = (nodeId: string) =>
    document.querySelector(`[data-editor-frame][data-node-id="${nodeId}"]`) as HTMLElement;
const childIds = (parentId: string) =>
    [
        ...document.querySelectorAll(`[data-children-of="${parentId}"] > li > [data-outline-row]`),
    ].map((row) => row.getAttribute('data-outline-row')!);
const selected = () =>
    [...document.querySelectorAll('[data-editor-frame][data-selected]')].map((element) =>
        element.getAttribute('data-node-id')
    );

function openMenu(target: Element, init: MouseEventInit = {}) {
    act(() => {
        fireEvent.contextMenu(target, { clientX: 10, clientY: 10, ...init });
    });
    return screen.queryByRole('menu');
}
const items = (menu: HTMLElement) =>
    within(menu)
        .getAllByRole('menuitem')
        .map((item) => [
            item.querySelector('span')!.textContent,
            item.querySelector('kbd')?.textContent ?? '',
            item.hasAttribute('data-disabled'),
        ]);
const choose = (menu: HTMLElement, label: string) =>
    act(() => {
        fireEvent.click(within(menu).getByRole('menuitem', { name: new RegExp(`^${label}`) }));
    });

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    // jsdom has no PointerEvent: the menu reads `pointerType` to tell touch from mouse.
    if (typeof window.PointerEvent !== 'function') {
        class TestPointerEvent extends MouseEvent {
            pointerType: string;
            pointerId: number;
            constructor(type: string, init: PointerEventInit = {}) {
                super(type, init);
                this.pointerType = init.pointerType ?? 'mouse';
                this.pointerId = init.pointerId ?? 1;
            }
        }
        window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
    }
    Element.prototype.hasPointerCapture ??= () => false;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

describe('the element menu (spec 023, US4)', () => {
    beforeEach(() => resetEditorStores());
    // An open menu is a layer Radix tracks across renders: close it before unmounting.
    afterEach(() => {
        const menu = screen.queryByRole('menu');
        if (menu) act(() => void fireEvent.keyDown(menu, { key: 'Escape' }));
        cleanup();
    });

    it('selects the clicked element and lists the actions with their keys', () => {
        openEditor();
        const menu = openMenu(frame('a1'))!;
        expect(selected()).toEqual(['a1']);
        expect(items(menu)).toEqual([
            ['Cut', 'Ctrl+X', false],
            ['Copy', 'Ctrl+C', false],
            ['Paste', 'Ctrl+V', true],
            ['Duplicate', 'Ctrl+D', false],
            ['Move up', 'Alt+↑', true],
            ['Move down', 'Alt+↓', false],
            ['Move out of the group', 'Alt+←', false],
            ['Move into the previous group', 'Alt+→', true],
            ['Remove', 'Delete', false],
        ]);
    });

    it('copies and pastes into a group through the menu', () => {
        openEditor();
        choose(openMenu(frame('a1'))!, 'Copy');
        const menu = openMenu(rowButton('b'))!;
        expect(items(menu)[2]).toEqual(['Paste', 'Ctrl+V', false]);
        choose(menu, 'Paste');
        expect(childIds('b')).toHaveLength(2);
        expect(document.querySelectorAll('[data-palette-option]')).toHaveLength(0);
    });

    it('keeps a multi-selection when opened on one of its elements', () => {
        openEditor();
        fireEvent.click(rowButton('a1'));
        fireEvent.click(rowButton('b1'), { ctrlKey: true });
        choose(openMenu(frame('b1'))!, 'Remove');
        expect(childIds('a')).toEqual(['a2']);
        expect(childIds('b')).toEqual([]);
    });

    it('offers only Paste at the end on empty page space', () => {
        openEditor();
        const page = document.querySelector('[data-editor-page]')!;
        const menu = openMenu(page)!;
        expect(items(menu).map(([label]) => label)).toEqual(['Paste at the end of the page']);
        expect(selected()).toEqual([]);
    });

    it('offers Add to selection on touch screens', () => {
        openEditor();
        fireEvent.pointerDown(frame('a1'), { pointerType: 'touch' });
        choose(openMenu(frame('a1'))!, 'Duplicate');
        fireEvent.pointerDown(frame('b1'), { pointerType: 'touch' });
        const menu = openMenu(frame('b1'))!;
        choose(menu, 'Add to selection');
        expect(selected().length).toBe(2);
    });

    it('returns focus to the element when closed with Escape', async () => {
        openEditor();
        const menu = openMenu(rowButton('a2'))!;
        act(() => {
            fireEvent.keyDown(menu, { key: 'Escape' });
        });
        expect(screen.queryByRole('menu')).toBeNull();
        await waitFor(() => expect(document.activeElement).toBe(rowButton('a2')));
    });

    it('leaves the settings area to the browser and ignores right clicks during a drag', () => {
        openEditor();
        fireEvent.click(rowButton('a1'));
        const box = document.querySelector('[data-settings-for="a1"] input')!;
        expect(openMenu(box)).toBeNull();
        startDrag('a2');
        fireEvent.pointerMove(window, { clientX: 400, clientY: 400 });
        expect(openMenu(frame('b1'))).toBeNull();
    });
});
