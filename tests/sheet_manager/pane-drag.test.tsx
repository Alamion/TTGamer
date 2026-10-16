// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import {
    groupsInOrder,
    type SplitNode,
} from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import {
    floatTab,
    openBeside,
    openInNewTab,
    openTool,
    usePaneStore,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { folder, resetDocuments, seedDocuments } from './helpers/documentsWindow';
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

describe('dragging document rows from the documents window (spec 036, US4)', () => {
    const row = (name: string) => screen.getByRole('treeitem', { name: new RegExp(`^${name}`) });
    const bodyOf =
        (groupIndex = 0) =>
        () =>
            document.querySelectorAll<HTMLElement>('[data-group-body]')[groupIndex]!;
    const floatingKeys = () => usePaneStore.getState().floating.map(({ key }) => key);
    /** Drags a row over a place of the layout and drops it there; returns whether it was taken. */
    const dragRow = (
        source: HTMLElement,
        to: HTMLElement | (() => HTMLElement),
        point: { clientX: number; clientY: number }
    ) => {
        const dataTransfer = transfer();
        fireEvent.dragStart(source, { dataTransfer });
        // The one document's drop layer exists only while a row is dragged.
        const target = typeof to === 'function' ? to() : to;
        fireDrag('dragOver', target, dataTransfer, point);
        const overlay = document.querySelector('[data-drop-overlay], [data-drop-gap]');
        fireDrag('drop', target, dataTransfer, point);
        fireEvent.dragEnd(source, { dataTransfer });
        return overlay !== null;
    };
    const floatDocuments = async () => {
        act(() => {
            openTool('documents');
            floatTab('t:documents');
        });
        await waitFor(() => expect(row('Bruno')).toBeTruthy());
    };

    it('opens a row dropped on an edge of the one document in a new group, current', async () => {
        await floatDocuments();
        expect(dragRow(row('Bruno'), bodyOf(), { clientX: 390, clientY: 200 })).toBe(true);
        expect(tabsByGroup()).toEqual([['d:Ana'], ['d:Bruno']]);
        expect(current()).toBe('Bruno');
        dragRow(row('Cleo'), bodyOf(1), { clientX: 200, clientY: 390 });
        expect(usePaneStore.getState().root).toMatchObject({
            direction: 'row',
            children: [{ tabs: ['d:Ana'] }, { direction: 'column' }],
        });
    });

    it('adds a row dropped on a strip or a middle as a tab there', async () => {
        act(() => void openInNewTab('Bruno'));
        await floatDocuments();
        dragRow(row('Cleo'), stripOf('Bruno'), { clientX: 10, clientY: 10 });
        expect(tabsByGroup()).toEqual([['d:Cleo', 'd:Ana', 'd:Bruno']]);
        expect(current()).toBe('Cleo');
    });

    it('moves the tab of a document that is already open', async () => {
        act(() => void openBeside('Bruno'));
        await floatDocuments();
        dragRow(row('Bruno'), pageOf('Ana'), { clientX: 200, clientY: 200 });
        expect(tabsByGroup()).toEqual([['d:Ana', 'd:Bruno']]);
    });

    it('offers nothing for a folder or several rows, and never floats a row', async () => {
        act(() => useDocumentStore.setState({ folders: [folder('f1', 'Campaign')] }));
        await floatDocuments();
        // No layer is laid over the page for them, so nothing there takes them.
        const page = () =>
            document.querySelector<HTMLElement>('[data-group-body]') ?? document.body;
        expect(dragRow(row('Campaign'), page, { clientX: 390, clientY: 200 })).toBe(false);
        fireEvent.click(row('Bruno'));
        fireEvent.click(row('Cleo'), { ctrlKey: true });
        expect(dragRow(row('Cleo'), page, { clientX: 390, clientY: 200 })).toBe(false);
        expect(document.querySelector('[data-group-body]')).toBeNull();
        fireEvent.click(row('Bruno'));
        dragRow(row('Bruno'), document.body, { clientX: 900, clientY: 500 });
        expect(tabsByGroup()).toEqual([['d:Ana']]);
        expect(floatingKeys()).toEqual(['t:documents']);
    });
});
