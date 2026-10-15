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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { groupFrameOf, resetLayout, roomyArea } from './helpers/panes';
import { draggableOf, dragTab, fireDrag, stubBoxes, transfer } from './helpers/tabDrag';

vi.setConfig({ testTimeout: 30_000 });

const current = () => useDocumentStore.getState().currentDocumentId;
const tabsByGroup = () => groupsInOrder(usePaneStore.getState().root).map(({ tabs }) => tabs);
const tab = (name: string) => screen.getByRole('tab', { name });
const stripOf = (name: string) => within(groupFrameOf(name)).getByRole('tablist').parentElement!;
/** The page part of a group, where tabs are dropped to move in or split. */
const pageOf = (name: string) => screen.getByRole('region', { name }).parentElement!;

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
    stubBoxes();
    resetLayout();
    seedDocuments(['Ana', 'Bruno', 'Cleo'], { current: 'Ana' });
    render(createElement(CharacterSheet));
});
afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
});

describe('dragging tabs (spec 036, US2)', () => {
    it('reorders a strip: C dropped before A gives C, A, B', async () => {
        act(() => {
            openInNewTab('Bruno');
            openInNewTab('Cleo');
        });
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(3));
        dragTab(tab('Cleo'), stripOf('Cleo'), { clientX: 10, clientY: 10 });
        expect(tabsByGroup()).toEqual([['d:Cleo', 'd:Ana', 'd:Bruno']]);
    });

    it('moves a tab to another strip, shown and current, out of its old group', async () => {
        act(() => {
            openInNewTab('Bruno');
            openBeside('Cleo');
        });
        await waitFor(() => expect(screen.getAllByRole('tablist')).toHaveLength(2));
        fireEvent.click(tab('Bruno'));
        dragTab(tab('Bruno'), stripOf('Cleo'), { clientX: 10, clientY: 10 });
        expect(tabsByGroup()).toEqual([['d:Ana'], ['d:Bruno', 'd:Cleo']]);
        expect(current()).toBe('Bruno');
        expect(screen.getByRole('region', { name: 'Bruno' })).toBeTruthy();
    });

    it('moves a tab into the middle of another group, removing its emptied group', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(screen.getAllByRole('tablist')).toHaveLength(2));
        dragTab(tab('Bruno'), pageOf('Ana'), { clientX: 200, clientY: 200 });
        expect(tabsByGroup()).toEqual([['d:Ana', 'd:Bruno']]);
        expect(current()).toBe('Bruno');
    });

    it('splits a group on the edge a tab is dropped on', async () => {
        act(() => {
            openInNewTab('Bruno');
            openInNewTab('Cleo');
        });
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(3));
        dragTab(tab('Bruno'), pageOf('Cleo'), { clientX: 390, clientY: 200 });
        expect(tabsByGroup()).toEqual([['d:Ana', 'd:Cleo'], ['d:Bruno']]);

        dragTab(tab('Ana'), pageOf('Cleo'), { clientX: 200, clientY: 390 });
        const root = usePaneStore.getState().root as SplitNode;
        expect(root.direction).toBe('row');
        expect(root.children[0]).toMatchObject({ type: 'split', direction: 'column' });
        expect(tabsByGroup()).toEqual([['d:Cleo'], ['d:Ana'], ['d:Bruno']]);
        expect(screen.getAllByRole('separator', { name: /^Resize/ })).toHaveLength(2);
    });

    it('shows where the tab would land while dragging, and changes nothing without a drop', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(screen.getAllByRole('tablist')).toHaveLength(2));
        const dataTransfer = transfer();
        fireEvent.dragStart(draggableOf(tab('Bruno')), { dataTransfer });
        fireDrag('dragOver', pageOf('Ana'), dataTransfer, { clientX: 390, clientY: 200 });
        expect(
            groupFrameOf('Ana').querySelector<HTMLElement>('[data-drop-overlay]')?.dataset
                .dropOverlay
        ).toBe('right');
        fireDrag('dragOver', stripOf('Ana'), dataTransfer, { clientX: 10, clientY: 10 });
        expect(groupFrameOf('Ana').querySelector('[data-drop-gap]')).toBeTruthy();

        fireEvent.dragEnd(draggableOf(tab('Bruno')), { dataTransfer });
        expect(document.querySelector('[data-drop-overlay], [data-drop-gap]')).toBeNull();
        expect(tabsByGroup()).toEqual([['d:Ana'], ['d:Bruno']]);
    });

    it('offers nothing for a group’s only tab over its own page', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(screen.getAllByRole('tablist')).toHaveLength(2));
        const dataTransfer = transfer();
        fireEvent.dragStart(draggableOf(tab('Bruno')), { dataTransfer });
        fireDrag('dragOver', pageOf('Bruno'), dataTransfer, { clientX: 390, clientY: 200 });
        fireDrag('dragOver', pageOf('Bruno'), dataTransfer, { clientX: 200, clientY: 200 });
        expect(document.querySelector('[data-drop-overlay]')).toBeNull();
        fireEvent.dragEnd(draggableOf(tab('Bruno')), { dataTransfer });
    });

    it('offers no edge at six groups, only the middle', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(2400);
        cleanup();
        seedDocuments(['Ana', 'Bruno', 'Cleo', 'Dora', 'Emil', 'Fay', 'Gus'], { current: 'Ana' });
        render(createElement(CharacterSheet));
        roomyArea();
        act(() => {
            for (const name of ['Bruno', 'Cleo', 'Dora', 'Emil', 'Fay']) openBeside(name);
            openInNewTab('Gus');
        });
        await waitFor(() => expect(screen.getAllByRole('tablist')).toHaveLength(6));
        const dataTransfer = transfer();
        fireEvent.dragStart(draggableOf(tab('Gus')), { dataTransfer });
        fireDrag('dragOver', pageOf('Ana'), dataTransfer, { clientX: 390, clientY: 200 });
        expect(
            groupFrameOf('Ana').querySelector<HTMLElement>('[data-drop-overlay]')?.dataset
                .dropOverlay
        ).toBe('middle');
        fireEvent.dragEnd(draggableOf(tab('Gus')), { dataTransfer });
    });
});
