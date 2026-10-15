// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { openBeside, usePaneStore } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';

vi.setConfig({ testTimeout: 30_000 });

const NAMES = ['Ana', 'Bruno', 'Cleo', 'Dora'];
const current = () => useDocumentStore.getState().currentDocumentId;
const regions = () => screen.queryAllByRole('region').map((region) => region.dataset.pane);

/** happy-dom lays nothing out: the area is as wide as the test says. */
async function openAll(width: number) {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
    usePaneStore.setState({ ids: [], recent: [], weights: {}, views: {}, maximized: null });
    seedDocuments(NAMES, { current: 'Ana' });
    render(createElement(CharacterSheet));
    act(() => {
        for (const name of NAMES.slice(1)) openBeside(name);
    });
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(4));
}

afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
});

describe('panes side by side (spec 034, US2)', () => {
    describe('on a desktop window', () => {
        beforeEach(() => openAll(1280));

        it('frames every pane and marks the focused one', () => {
            const frames = screen.getAllByRole('region').map((pane) => pane.className);
            expect(frames.every((name) => name.includes('border-2'))).toBe(true);
            expect(frames.filter((name) => name.includes('border-primary'))).toHaveLength(1);
        });

        it('shows as many panes as fit at 320 px and keeps the rest as tabs', () => {
            expect(regions()).toEqual(['Bruno', 'Cleo', 'Dora']);
            expect(screen.getAllByRole('tab')).toHaveLength(4);
            expect(screen.getAllByRole('separator')).toHaveLength(2);
        });

        it('shows a hidden pane in place of the least recently focused one when its tab is chosen', () => {
            fireEvent.click(screen.getByRole('tab', { name: 'Ana' }));
            expect(current()).toBe('Ana');
            expect(regions()).toEqual(['Ana', 'Cleo', 'Dora']);
        });

        it('gives a pane the whole area and gives it back, from the tab and from the button', async () => {
            fireEvent.doubleClick(screen.getByRole('tab', { name: 'Cleo' }));
            expect(regions()).toEqual(['Cleo']);
            expect(screen.queryAllByRole('separator')).toHaveLength(0);
            fireEvent.doubleClick(screen.getByRole('tab', { name: 'Cleo' }));
            expect(regions()).toEqual(['Bruno', 'Cleo', 'Dora']);

            const region = screen.getByRole('region', { name: 'Dora' });
            fireEvent.click(within(region).getByRole('button', { name: 'Show only Dora' }));
            expect(regions()).toEqual(['Dora']);
            fireEvent.click(screen.getByRole('button', { name: 'Show all open documents again' }));
            expect(regions()).toEqual(['Bruno', 'Cleo', 'Dora']);
        });

        it('keeps the pane widths a divider was moved to, and every pane at 320 px or more', () => {
            const divider = screen.getAllByRole('separator')[0]!;
            expect(Number(divider.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(320);
            fireEvent.keyDown(divider, { key: 'ArrowRight', shiftKey: true });
            expect(Number(screen.getAllByRole('separator')[0]!.getAttribute('aria-valuenow'))).toBe(
                Number(divider.getAttribute('aria-valuenow'))
            );
            const weights = usePaneStore.getState().weights;
            expect(Object.keys(weights).sort()).toEqual(['Bruno', 'Cleo', 'Dora']);
            expect(weights.Bruno).toBeGreaterThan(weights.Cleo!);
        });
    });

    describe('on a phone', () => {
        beforeEach(() => openAll(343));

        it('draws the one pane without a frame or a focus mark', () => {
            const [pane] = screen.getAllByRole('region');
            expect(pane!.className).not.toContain('border');
        });

        it('shows one pane and the tabs, with no divider and no maximize', () => {
            expect(regions()).toEqual(['Dora']);
            expect(screen.getAllByRole('tab')).toHaveLength(4);
            expect(screen.queryAllByRole('separator')).toHaveLength(0);
            expect(screen.queryByRole('button', { name: /Show only/ })).toBeNull();
            fireEvent.click(screen.getByRole('tab', { name: 'Bruno' }));
            expect(regions()).toEqual(['Bruno']);
        });
    });
});
