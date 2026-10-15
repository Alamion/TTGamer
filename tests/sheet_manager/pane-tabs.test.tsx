// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import {
    type GroupNode,
    type LayoutNode,
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

import { takeSheetIssues } from '../setup/sheetIssues';
import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { groupFrameOf, openDocumentIds, resetLayout } from './helpers/panes';

vi.setConfig({ testTimeout: 30_000 });

const current = () => useDocumentStore.getState().currentDocumentId;
const strips = () => screen.queryAllByRole('tablist');
const tabsIn = (strip: HTMLElement) =>
    within(strip)
        .getAllByRole('tab')
        .map((tab) => tab.textContent);
const shown = () => screen.queryAllByRole('region').map((region) => region.dataset.pane);
const g = (id: string, tabs: string[]): GroupNode => ({ type: 'group', id, tabs, shown: tabs[0]! });

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
    resetLayout();
    seedDocuments(['Ana', 'Bruno', 'Cleo'], { current: 'Ana' });
    render(createElement(CharacterSheet));
});
afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
});

describe('each group has its own tabs (spec 036, US1)', () => {
    it('has no strip with one document', () => {
        expect(strips()).toHaveLength(0);
        expect(screen.queryByRole('region')).toBeNull();
    });

    it('opens in a new tab: one strip with both, the new one shown, no frame, page scroll', async () => {
        act(() => void openInNewTab('Bruno'));
        await waitFor(() => expect(strips()).toHaveLength(1));
        expect(tabsIn(strips()[0]!)).toEqual(['Ana', 'Bruno']);
        expect(strips()[0]!.getAttribute('aria-label')).toBe('Tabs of group 1');
        expect(shown()).toEqual(['Bruno']);
        expect(groupFrameOf('Bruno').className).not.toContain('border-2');
        expect(document.querySelector('[data-group]')).toBeNull();
        expect(screen.queryByRole('button', { name: /Show only/ })).toBeNull();
    });

    it('switches a tab in one group only, and makes its document current', async () => {
        act(() => {
            openInNewTab('Bruno');
            openBeside('Cleo');
        });
        await waitFor(() => expect(strips()).toHaveLength(2));
        expect(strips().map(tabsIn)).toEqual([['Ana', 'Bruno'], ['Cleo']]);
        expect(strips().map((strip) => strip.getAttribute('aria-label'))).toEqual([
            'Tabs of group 1',
            'Tabs of group 2',
        ]);

        fireEvent.click(within(strips()[0]!).getByRole('tab', { name: 'Ana' }));
        expect(current()).toBe('Ana');
        expect(shown()).toEqual(['Ana', 'Cleo']);
    });

    it('frames every group when there are several, the focused one marked', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(strips()).toHaveLength(2));
        const frames = [...document.querySelectorAll<HTMLElement>('[data-group-frame]')];
        expect(frames.every((frame) => frame.className.includes('border-2'))).toBe(true);
        expect(groupFrameOf('Bruno').className).toContain('border-primary');
        fireEvent.pointerDown(screen.getByRole('region', { name: 'Ana' }));
        expect(current()).toBe('Ana');
        expect(groupFrameOf('Ana').className).toContain('border-primary');
    });

    it('fills the window below the toolbar with several groups, each scrolling its page', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(strips()).toHaveLength(2));
        const area = document.querySelector<HTMLElement>('[data-group]')!.parentElement!;
        expect(area.style.height).toBe(`${window.innerHeight}px`);
        for (const region of screen.getAllByRole('region')) {
            expect(region.className).toContain('overflow-auto');
        }
    });

    it('moves between tabs with the arrow keys, Home, and End', async () => {
        act(() => {
            openInNewTab('Bruno');
            openInNewTab('Cleo');
        });
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(3));
        const tabs = () => screen.getAllByRole('tab');
        expect(tabs().map((tab) => tab.textContent)).toEqual(['Ana', 'Bruno', 'Cleo']);

        fireEvent.keyDown(tabs()[2]!, { key: 'ArrowLeft' });
        expect(current()).toBe('Bruno');
        fireEvent.keyDown(tabs()[1]!, { key: 'Home' });
        expect(current()).toBe('Ana');
        fireEvent.keyDown(tabs()[0]!, { key: 'End' });
        expect(current()).toBe('Cleo');
        fireEvent.keyDown(tabs()[2]!, { key: 'ArrowRight' });
        expect(current()).toBe('Ana');
        expect(document.activeElement).toBe(tabs()[0]);
    });

    it('closing the shown tab shows the neighbour; closing a group’s last tab removes the group', async () => {
        act(() => {
            openInNewTab('Bruno');
            openBeside('Cleo');
        });
        await waitFor(() => expect(strips()).toHaveLength(2));
        fireEvent.click(within(strips()[0]!).getByRole('tab', { name: 'Bruno' }));
        fireEvent.click(screen.getByRole('button', { name: 'Close Bruno' }));
        expect(shown()).toEqual(['Ana', 'Cleo']);
        expect(current()).toBe('Ana');

        fireEvent.click(screen.getByRole('button', { name: 'Close Cleo' }));
        await waitFor(() => expect(strips()).toHaveLength(0));
        expect(useDocumentStore.getState().entries.map(({ id }) => id)).toContain('Cleo');
    });

    it('gives a group the whole area by double click or its button, and gives it back', async () => {
        act(() => {
            openBeside('Bruno');
            openBeside('Cleo');
        });
        await waitFor(() => expect(strips()).toHaveLength(3));
        fireEvent.doubleClick(screen.getByRole('tab', { name: 'Bruno' }));
        expect(shown()).toEqual(['Bruno']);
        fireEvent.doubleClick(screen.getByRole('tab', { name: 'Bruno' }));
        expect(shown()).toEqual(['Ana', 'Bruno', 'Cleo']);

        fireEvent.click(screen.getByRole('button', { name: 'Show only the group of Cleo' }));
        expect(shown()).toEqual(['Cleo']);
        fireEvent.click(screen.getByRole('button', { name: 'Show all groups again' }));
        expect(shown()).toEqual(['Ana', 'Bruno', 'Cleo']);
    });

    it('draws the groups in reading order, so Tab follows the screen', async () => {
        const root: LayoutNode = {
            type: 'split',
            direction: 'row',
            children: [
                {
                    type: 'split',
                    direction: 'column',
                    children: [g('A', ['d:Cleo']), g('B', ['d:Ana'])],
                    weights: [1, 1],
                },
                g('C', ['d:Bruno']),
            ],
            weights: [1, 1],
        } satisfies SplitNode;
        act(() => usePaneStore.setState({ root, recent: ['d:Ana'] }));
        await waitFor(() => expect(strips()).toHaveLength(3));
        expect(shown()).toEqual(['Cleo', 'Ana', 'Bruno']);
    });

    it('removes the tab of a document that is deleted, and the strip when one is left', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(strips()).toHaveLength(2));
        act(() => useDocumentStore.getState().deleteDocument('Ana'));
        await waitFor(() => expect(strips()).toHaveLength(0));
        expect(openDocumentIds()).toEqual(['Bruno']);
    });

    it('shows a notice in the group of a document whose record cannot be read', async () => {
        useDocumentStore.setState((state) => ({
            entries: [...state.entries, { ...state.entries[0]!, id: 'Ghost', name: 'Ghost' }],
        }));
        act(() => void openBeside('Ghost'));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe('This document could not be read.');
        expect(takeSheetIssues().length).toBeGreaterThan(0);
        fireEvent.click(screen.getByRole('button', { name: 'Close Ghost' }));
        await waitFor(() => expect(strips()).toHaveLength(0));
    });
});
