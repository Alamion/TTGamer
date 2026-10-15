// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import {
    groupsInOrder,
    type SplitNode,
} from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import {
    openBeside,
    openInNewTab,
    usePaneStore,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { Toaster } from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { groupFrameOf, resetLayout } from './helpers/panes';

vi.setConfig({ testTimeout: 30_000 });

const NAMES = ['Ana', 'Bruno', 'Cleo', 'Dora', 'Emil', 'Fay', 'Gus'];
const current = () => useDocumentStore.getState().currentDocumentId;
const tabsByGroup = () => groupsInOrder(usePaneStore.getState().root).map(({ tabs }) => tabs);
const tab = (name: string) => screen.getByRole('tab', { name });
const menu = () => screen.getByRole('menu');
const choose = (name: string) => fireEvent.click(within(menu()).getByRole('menuitem', { name }));
const announced = () => document.querySelector('[data-pane-announcer]')?.textContent;

async function open(setup: () => void, groups: number, width = 1280) {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
    act(setup);
    await waitFor(() => expect(screen.getAllByRole('tablist')).toHaveLength(groups));
}

beforeEach(() => {
    resetLayout();
    seedDocuments(NAMES, { current: 'Ana' });
    render(createElement('div', null, createElement(CharacterSheet), createElement(Toaster)));
});
afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
});

describe('a tab’s menu, for the keyboard (spec 036, FR-005)', () => {
    it('opens with Shift+F10, the ContextMenu key, a right click, and the strip’s button', async () => {
        await open(() => void openInNewTab('Bruno'), 1);
        fireEvent.keyDown(tab('Bruno'), { key: 'F10', shiftKey: true });
        expect(menu().getAttribute('aria-label')).toBe('Actions for Bruno');
        fireEvent.keyDown(menu(), { key: 'Tab' });
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

        fireEvent.keyDown(tab('Bruno'), { key: 'ContextMenu' });
        expect(menu()).toBeTruthy();
        fireEvent.keyDown(menu(), { key: 'Tab' });
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

        fireEvent.contextMenu(tab('Ana'));
        expect(menu().getAttribute('aria-label')).toBe('Actions for Ana');
        fireEvent.keyDown(menu(), { key: 'Tab' });
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

        fireEvent.click(screen.getByRole('button', { name: 'Actions for Bruno' }));
        expect(menu().getAttribute('aria-label')).toBe('Actions for Bruno');
    });

    it('moves a tab left and right in its strip', async () => {
        await open(() => {
            openInNewTab('Bruno');
            openInNewTab('Cleo');
        }, 1);
        fireEvent.keyDown(tab('Cleo'), { key: 'F10', shiftKey: true });
        choose('Move left');
        expect(tabsByGroup()).toEqual([['d:Ana', 'd:Cleo', 'd:Bruno']]);
        expect(announced()).toBe('"Cleo" moved to group 1.');
        fireEvent.keyDown(tab('Ana'), { key: 'F10', shiftKey: true });
        expect(
            within(menu())
                .getByRole('menuitem', { name: 'Move left' })
                .getAttribute('aria-disabled')
        ).toBe('true');
        choose('Move right');
        expect(tabsByGroup()).toEqual([['d:Cleo', 'd:Ana', 'd:Bruno']]);
    });

    it('moves a tab to the next group, the first after the last', async () => {
        await open(() => {
            openInNewTab('Bruno');
            openBeside('Cleo');
        }, 2);
        fireEvent.keyDown(tab('Bruno'), { key: 'F10', shiftKey: true });
        choose('Move to next group');
        expect(tabsByGroup()).toEqual([['d:Ana'], ['d:Cleo', 'd:Bruno']]);
        expect(current()).toBe('Bruno');
        expect(announced()).toBe('"Bruno" moved to group 2.');
        fireEvent.keyDown(tab('Bruno'), { key: 'F10', shiftKey: true });
        choose('Move to next group');
        expect(tabsByGroup()).toEqual([['d:Ana', 'd:Bruno'], ['d:Cleo']]);
    });

    it('splits right and down', async () => {
        await open(() => {
            openInNewTab('Bruno');
            openInNewTab('Cleo');
        }, 1);
        fireEvent.keyDown(tab('Cleo'), { key: 'F10', shiftKey: true });
        choose('Split right');
        expect(tabsByGroup()).toEqual([['d:Ana', 'd:Bruno'], ['d:Cleo']]);
        expect(announced()).toBe('"Cleo" opened in a new group.');
        await waitFor(() => expect(screen.getAllByRole('tablist')).toHaveLength(2));

        fireEvent.keyDown(tab('Bruno'), { key: 'F10', shiftKey: true });
        choose('Split down');
        const root = usePaneStore.getState().root as SplitNode;
        expect(root.children[0]).toMatchObject({ type: 'split', direction: 'column' });
        expect(tabsByGroup()).toEqual([['d:Ana'], ['d:Bruno'], ['d:Cleo']]);
    });

    it('keeps the splits listed but disabled at six groups, and says why', async () => {
        await open(
            () => {
                for (const name of NAMES.slice(1, 6)) openBeside(name);
                openInNewTab('Gus');
            },
            6,
            2400
        );
        fireEvent.keyDown(tab('Gus'), { key: 'F10', shiftKey: true });
        const split = within(menu()).getByRole('menuitem', { name: 'Split right' });
        expect(split.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(split);
        expect(groupsInOrder(usePaneStore.getState().root)).toHaveLength(6);
        expect(
            await screen.findByText(
                'There is no room for another group: at most six, each at least 320 × 200 px.'
            )
        ).toBeTruthy();
    });

    it('maximizes and closes from the menu', async () => {
        await open(() => void openBeside('Bruno'), 2);
        fireEvent.keyDown(tab('Bruno'), { key: 'F10', shiftKey: true });
        choose('Show only the group of Bruno');
        expect(screen.getAllByRole('region').map((region) => region.dataset.pane)).toEqual([
            'Bruno',
        ]);
        fireEvent.keyDown(tab('Bruno'), { key: 'F10', shiftKey: true });
        choose('Show all groups again');
        fireEvent.keyDown(tab('Bruno'), { key: 'F10', shiftKey: true });
        choose('Close Bruno');
        expect(tabsByGroup()).toEqual([['d:Ana']]);
    });
});

describe('dividers, for the keyboard (spec 036, FR-006)', () => {
    it('resizes side by side groups with ←/→ and groups one above the other with ↑/↓', async () => {
        await open(() => {
            openInNewTab('Bruno');
            openBeside('Cleo');
        }, 2);
        fireEvent.keyDown(tab('Bruno'), { key: 'F10', shiftKey: true });
        choose('Split down');
        await waitFor(() => expect(screen.getAllByRole('tablist')).toHaveLength(3));

        const columns = screen.getByRole('separator', { name: 'Resize Ana and Cleo' });
        expect(columns.getAttribute('aria-orientation')).toBe('vertical');
        fireEvent.keyDown(columns, { key: 'ArrowRight', shiftKey: true });
        const row = usePaneStore.getState().root as SplitNode;
        expect(row.weights[0]).toBeGreaterThan(row.weights[1]!);

        const rows = screen.getByRole('separator', { name: 'Resize Ana and Bruno' });
        expect(rows.getAttribute('aria-orientation')).toBe('horizontal');
        fireEvent.keyDown(rows, { key: 'ArrowDown', shiftKey: true });
        const column = (usePaneStore.getState().root as SplitNode).children[0] as SplitNode;
        expect(column.weights[0]).toBeGreaterThan(column.weights[1]!);
        expect(
            Number(
                screen
                    .getByRole('separator', { name: 'Resize Ana and Bruno' })
                    .getAttribute('aria-valuenow')
            )
        ).toBeGreaterThanOrEqual(200);
        expect(groupFrameOf('Bruno')).toBeTruthy();
    });
});
