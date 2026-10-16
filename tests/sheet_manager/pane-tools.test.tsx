// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { groupsInOrder } from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import {
    moveTab,
    openInNewTab,
    openTool,
    raise,
    usePaneStore,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { Toaster } from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { groupFrameOf, resetLayout, roomyArea } from './helpers/panes';
import { draggableOf, fireDrag, stubBoxes, transfer } from './helpers/tabDrag';

vi.setConfig({ testTimeout: 30_000 });

const tabsByGroup = () => groupsInOrder(usePaneStore.getState().root).map(({ tabs }) => tabs);
const floatingKeys = () => usePaneStore.getState().floating.map(({ key }) => key);
/** A tab of a group's strip (a tool's own tabs, such as the documents' Details, are not). */
const tab = (name: string) =>
    [...document.querySelectorAll<HTMLElement>('[data-group-strip] [role="tab"]')].find(
        (candidate) => candidate.textContent === name
    )!;
const windowOf = (name: string) => screen.getByRole('dialog', { name });

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1600);
    stubBoxes();
    resetLayout();
    roomyArea(1600, 900);
    seedDocuments(['Ana', 'Bruno', 'Cleo'], { current: 'Ana' });
    render(createElement('div', null, createElement(CharacterSheet), createElement(Toaster)));
});
afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
});

describe('tools in the layout (spec 036, US3)', () => {
    it('opens the documents window as a group on the left, from the toolbar', async () => {
        fireEvent.click(screen.getByTitle('Manage documents'));
        await waitFor(() => expect(tab('Documents')).toBeTruthy());
        expect(tabsByGroup()).toEqual([['t:documents'], ['d:Ana']]);
        const frame = tab('Documents').closest<HTMLElement>('[data-group-frame]')!;
        expect(within(frame).getByRole('tree')).toBeTruthy();
        // A group as narrow as this one shows the list and the details as tabs.
        expect(within(frame).getByRole('tab', { name: 'Details' })).toBeTruthy();
    });

    it('switches between a tool and a document that share a group', async () => {
        act(() => openTool('library'));
        await waitFor(() => expect(tab('Library')).toBeTruthy());
        const anaGroup = groupsInOrder(usePaneStore.getState().root).find(({ tabs }) =>
            tabs.includes('d:Ana')
        )!;
        act(() => moveTab('t:library', anaGroup.id));
        fireEvent.click(tab('Ana'));
        expect(screen.getByRole('region', { name: 'Ana' })).toBeTruthy();
        fireEvent.click(tab('Library'));
        expect(screen.getByRole('region', { name: 'Library' })).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'Ana' })).toBeNull();
        fireEvent.click(tab('Ana'));
        expect(screen.getByRole('region', { name: 'Ana' })).toBeTruthy();
    });

    it('opens the library without blocking the page', async () => {
        fireEvent.click(screen.getByRole('button', { name: /library/i }));
        await waitFor(() => expect(tab('Library')).toBeTruthy());
        expect(document.querySelector('[data-radix-focus-guard]')).toBeNull();
        expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    });

    it('floats a tab dropped outside every group, and from its menu', async () => {
        act(() => {
            openTool('dice');
            openInNewTab('Bruno');
        });
        await waitFor(() => expect(tab('Dice Roller')).toBeTruthy());
        const dataTransfer = transfer();
        fireEvent.dragStart(draggableOf(tab('Dice Roller')), { dataTransfer });
        fireDrag('dragOver', document.body, dataTransfer, { clientX: 900, clientY: 500 });
        fireDrag('drop', document.body, dataTransfer, { clientX: 900, clientY: 500 });
        expect(floatingKeys()).toEqual(['t:dice']);
        expect(windowOf('Dice Roller')).toBeTruthy();

        fireEvent.keyDown(tab('Bruno'), { key: 'F10', shiftKey: true });
        fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Float' }));
        expect(floatingKeys()).toEqual(['t:dice', 'd:Bruno']);
        expect(windowOf('Bruno')).toBeTruthy();
    });

    it('refuses a fifth window and says why', async () => {
        act(() => {
            for (const id of ['Bruno', 'Cleo']) openInNewTab(id);
            openTool('dice');
            openTool('documents');
        });
        await waitFor(() => expect(tab('Dice Roller')).toBeTruthy());
        for (const name of ['Bruno', 'Cleo', 'Dice Roller', 'Documents']) {
            fireEvent.keyDown(tab(name), { key: 'F10', shiftKey: true });
            fireEvent.click(
                within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Float' })
            );
        }
        expect(floatingKeys()).toHaveLength(4);
        // With a floating document current, Ana's group shows its strip.
        act(() => raise('d:Cleo'));
        fireEvent.keyDown(tab('Ana'), { key: 'F10', shiftKey: true });
        const float = within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Float' });
        expect(float.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(float);
        expect(
            await screen.findByText('Four windows already float: dock or close one first.')
        ).toBeTruthy();
    });

    it('docks a window by its title bar on a group’s edge, and with its Dock button', async () => {
        act(() => {
            openTool('dice');
            openInNewTab('Bruno');
        });
        await waitFor(() => expect(tab('Dice Roller')).toBeTruthy());
        fireEvent.keyDown(tab('Dice Roller'), { key: 'F10', shiftKey: true });
        fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Float' }));

        const page = screen.getByRole('region', { name: 'Bruno' }).parentElement!;
        document.elementsFromPoint = () => [page];
        const bar = windowOf('Dice Roller').querySelector<HTMLElement>('[data-window-titlebar]')!;
        // Over a group's page the window only moves; the compass in its middle docks it.
        fireEvent.pointerDown(bar, { button: 0, pointerId: 1, clientX: 500, clientY: 100 });
        fireEvent.pointerMove(bar, { pointerId: 1, clientX: 10, clientY: 200 });
        expect(groupFrameOf('Bruno').querySelector('[data-dock-compass]')).toBeTruthy();
        expect(groupFrameOf('Bruno').querySelector('[data-drop-overlay]')).toBeNull();
        fireEvent.pointerUp(bar, { pointerId: 1, clientX: 10, clientY: 200 });
        expect(floatingKeys()).toEqual(['t:dice']);
        expect(document.querySelector('[data-dock-compass]')).toBeNull();

        // The page is a 400 px box: its compass is at 200, 200, the left square 40 px left.
        fireEvent.pointerDown(bar, { button: 0, pointerId: 1, clientX: 500, clientY: 100 });
        fireEvent.pointerMove(bar, { pointerId: 1, clientX: 160, clientY: 200 });
        expect(groupFrameOf('Bruno').querySelector('[data-drop-overlay="left"]')).toBeTruthy();
        fireEvent.pointerUp(bar, { pointerId: 1, clientX: 160, clientY: 200 });
        expect(floatingKeys()).toEqual([]);
        expect(tabsByGroup()).toEqual([['t:dice'], ['d:Ana', 'd:Bruno']]);

        fireEvent.keyDown(tab('Dice Roller'), { key: 'F10', shiftKey: true });
        fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Float' }));
        const dock = within(windowOf('Dice Roller')).getByRole('button', {
            name: 'Dock Dice Roller',
        });
        dock.focus();
        fireEvent.click(dock);
        expect(floatingKeys()).toEqual([]);
        expect(tabsByGroup().flat()).toContain('t:dice');
    });

    it('brings the window behind to the front when it is pressed or focused', async () => {
        act(() => {
            openInNewTab('Bruno');
            openInNewTab('Cleo');
        });
        await waitFor(() => expect(tab('Cleo')).toBeTruthy());
        for (const name of ['Bruno', 'Cleo']) {
            fireEvent.keyDown(tab(name), { key: 'F10', shiftKey: true });
            fireEvent.click(
                within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Float' })
            );
        }
        expect(floatingKeys()).toEqual(['d:Bruno', 'd:Cleo']);
        fireEvent.pointerDown(windowOf('Bruno'));
        expect(floatingKeys()).toEqual(['d:Cleo', 'd:Bruno']);
        expect(Number(windowOf('Bruno').style.zIndex)).toBeGreaterThan(
            Number(windowOf('Cleo').style.zIndex)
        );
    });
});
