// @vitest-environment jsdom

import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { pressShortcut, renderEditor, resetEditorStores } from './helpers/editor';

vi.setConfig({ testTimeout: 20_000 });

const template = (id = 'clip-kit', systemId = 'wod-v5') =>
    CustomTemplateSchema.parse({
        id,
        name: id,
        systemId,
        documentKind: 'mortal',
        schemaVersion: 3,
        children: [
            {
                id: 'stats',
                type: 'section',
                title: 'Stats',
                children: [
                    { id: 'might', type: 'number', label: 'Might' },
                    { id: 'grace', type: 'number', label: 'Grace' },
                ],
            },
        ],
    });

let unmount: () => void = () => {};
function openEditor(page = template()) {
    unmount = renderEditor(page).unmount;
}

const outlineRow = (nodeId: string) =>
    document.querySelector(`[data-outline-row="${nodeId}"]`) as HTMLElement;
const selectInOutline = (nodeId: string) =>
    fireEvent.click(
        [...outlineRow(nodeId).querySelectorAll('button')].find(
            (button) => !button.hasAttribute('data-drag-handle')
        )!
    );
const childIds = (parentId: string) =>
    [
        ...document.querySelectorAll(`[data-children-of="${parentId}"] > li > [data-outline-row]`),
    ].map((row) => row.getAttribute('data-outline-row')!);
const rootIds = () => childIds('root');
const announcer = () => document.querySelector('[data-editor-announcer]')!.textContent;
const page = () => document.querySelector('[data-editor-page]') as HTMLElement;

/** A clipboard event with a stub `clipboardData`, as browsers send for Ctrl+C/X/V. */
function fireClipboard(type: 'copy' | 'cut' | 'paste', target: Element, text?: string) {
    const store = new Map<string, string>(text === undefined ? [] : [['text/plain', text]]);
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
        value: {
            getData: (format: string) => store.get(format) ?? '',
            setData: (format: string, value: string) => store.set(format, value),
        },
    });
    act(() => {
        target.dispatchEvent(event);
    });
    return { prevented: event.defaultPrevented, text: store.get('text/plain') };
}

const undo = () => fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
});

describe('copy and paste in the editor (spec 023, US1)', () => {
    beforeEach(() => resetEditorStores());
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('copies the selection as text and pastes a copy after the selected element', () => {
        openEditor();
        selectInOutline('might');
        const copied = fireClipboard('copy', outlineRow('might'));
        expect(copied.prevented).toBe(true);
        expect(JSON.parse(copied.text!)).toMatchObject({
            format: 'ttgamer-template-elements',
            nodes: [{ id: 'might' }],
        });
        selectInOutline('grace');
        fireClipboard('paste', outlineRow('grace'), copied.text);
        const ids = childIds('stats');
        expect(ids).toHaveLength(3);
        expect(ids.slice(0, 2)).toEqual(['might', 'grace']);
        const pasted = ids[2]!;
        expect(outlineRow(pasted).getAttribute('aria-current')).toBe('true');
        expect(outlineRow(pasted).textContent).toMatch(/Might/);
        expect(outlineRow(pasted).textContent).not.toBe(outlineRow('might').textContent);
        expect(announcer()).toBe('Pasted 1 element.');
        undo();
        expect(childIds('stats')).toEqual(['might', 'grace']);
    });

    it('cuts as one step', () => {
        openEditor();
        selectInOutline('might');
        fireClipboard('cut', outlineRow('might'));
        expect(childIds('stats')).toEqual(['grace']);
        expect(announcer()).toBe('Cut 1 element.');
        undo();
        expect(childIds('stats')).toEqual(['might', 'grace']);
    });

    it('pastes the remembered copy on another page with the original name', () => {
        openEditor();
        selectInOutline('stats');
        fireClipboard('copy', outlineRow('stats'));
        unmount();
        openEditor(template('other-kit'));
        // No text in the event: the editor's own copy (another browser blocked the clipboard).
        fireClipboard('paste', page());
        const roots = rootIds();
        expect(roots).toHaveLength(2);
        expect(outlineRow(roots[1]!).textContent).toContain('Stats');
        expect(outlineRow(roots[1]!).textContent).not.toMatch(/copy/i);
    });

    it('keeps a pasted element of another system and lists its issues', () => {
        const foreign = CustomTemplateSchema.parse({
            ...template('foreign', 'star-wars-wod'),
            documentKind: 'character',
            children: [{ id: 'merits', type: 'list', bindingKey: 'list:merits', title: 'Merits' }],
        });
        openEditor(foreign);
        selectInOutline('merits');
        const copied = fireClipboard('copy', outlineRow('merits'));
        unmount();
        openEditor();
        fireClipboard('paste', page(), copied.text);
        expect(rootIds()).toHaveLength(2);
        expect(document.querySelector('[role="alert"]')?.textContent).toMatch(/list:merits/);
        // The page shows the unresolved binding as it does for any template.
        takeSheetIssues();
    });

    it('refuses damaged and newer text without changing the page, and reports it', () => {
        openEditor();
        const base = { format: 'ttgamer-template-elements', source: {} };
        fireClipboard('paste', page(), JSON.stringify({ ...base, formatVersion: 99, nodes: [] }));
        expect(screen.getAllByText(/copied from a newer version/).length).toBeGreaterThan(0);
        fireClipboard(
            'paste',
            page(),
            JSON.stringify({ ...base, formatVersion: 1, nodes: [{ id: 'x', type: 'nope' }] })
        );
        expect(screen.getAllByText(/could not be read/).length).toBeGreaterThan(0);
        expect(childIds('stats')).toEqual(['might', 'grace']);
        expect(rootIds()).toEqual(['stats']);
        const plain = fireClipboard('paste', page(), 'just words');
        expect(plain.prevented).toBe(false);
        expect(takeSheetIssues().map(({ code, details }) => [code, details?.stage])).toEqual([
            ['template-clipboard-invalid', 'version'],
            ['template-clipboard-invalid', 'schema'],
        ]);
    });

    it('leaves clipboard events in text boxes to the browser', () => {
        openEditor();
        selectInOutline('might');
        const box = document.querySelector<HTMLInputElement>('[data-settings-for="might"] input')!;
        expect(fireClipboard('copy', box).prevented).toBe(false);
        expect(fireClipboard('paste', box, 'text').prevented).toBe(false);
    });

    it('acts on the keys alone when the browser sends no clipboard event (WebKit)', () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const writeText = vi.fn(() => Promise.resolve());
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });
        openEditor();
        selectInOutline('might');
        pressShortcut(outlineRow('might'), 'KeyC', { meta: true });
        act(() => vi.runAllTimers());
        expect(writeText).toHaveBeenCalledTimes(1);
        selectInOutline('grace');
        pressShortcut(outlineRow('grace'), 'KeyV', { meta: true });
        act(() => vi.runAllTimers());
        expect(childIds('stats')).toHaveLength(3);
        // With the event following the key, the paste happens once.
        pressShortcut(outlineRow('grace'), 'KeyV', { ctrl: true });
        fireClipboard('paste', outlineRow('grace'));
        act(() => vi.runAllTimers());
        expect(childIds('stats')).toHaveLength(4);
    });

    it('opens a folded section to show what was pasted into it', async () => {
        const folded = CustomTemplateSchema.parse({
            ...template('folded-kit'),
            children: [
                { id: 'loose', type: 'number', label: 'Loose' },
                {
                    id: 'stats',
                    type: 'section',
                    title: 'Stats',
                    defaultCollapsed: true,
                    children: [{ id: 'might', type: 'number', label: 'Might' }],
                },
            ],
        });
        openEditor(folded);
        selectInOutline('loose');
        const copied = fireClipboard('copy', outlineRow('loose'));
        selectInOutline('stats');
        fireClipboard('paste', outlineRow('stats'), copied.text);
        const pasted = childIds('stats')[1]!;
        await waitFor(() =>
            expect(
                document.querySelector(`[data-editor-frame][data-node-id="${pasted}"]`)
            ).not.toBeNull()
        );
        expect(document.querySelectorAll('[data-palette-option]')).toHaveLength(0);
        expect(outlineRow(pasted).getAttribute('aria-current')).toBe('true');
    });

    it('keeps the template valid after copy, cut, and paste (SC-006)', () => {
        openEditor();
        selectInOutline('stats');
        const copied = fireClipboard('copy', outlineRow('stats'));
        fireClipboard('paste', page(), copied.text);
        selectInOutline('grace');
        fireClipboard('cut', outlineRow('grace'));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const { templates } = useTemplateStore.getState();
        expect(CustomTemplateSchema.safeParse(templates[0]).success).toBe(true);
    });
});
