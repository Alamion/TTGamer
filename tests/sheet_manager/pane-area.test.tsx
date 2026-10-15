// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { type SplitNode } from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import { openBeside, usePaneStore } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { resetLayout } from './helpers/panes';

vi.setConfig({ testTimeout: 30_000 });

const current = () => useDocumentStore.getState().currentDocumentId;
const regions = () => screen.queryAllByRole('region').map((region) => region.dataset.pane);

/** happy-dom lays nothing out: the area is as wide as the test says. */
async function open(names: string[], width: number) {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
    resetLayout();
    seedDocuments(names, { current: names[0]! });
    render(createElement(CharacterSheet));
    act(() => {
        for (const name of names.slice(1)) openBeside(name);
    });
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(names.length));
}

afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
});

describe('groups side by side (spec 036, Foundation)', () => {
    it('frames every group, marks the focused one, and puts a divider between each pair', async () => {
        await open(['Ana', 'Bruno', 'Cleo'], 1280);
        expect(regions()).toEqual(['Ana', 'Bruno', 'Cleo']);
        const frames = [...document.querySelectorAll<HTMLElement>('[data-group-frame]')].map(
            (frame) => frame.className
        );
        expect(frames.every((name) => name.split(' ').includes('border'))).toBe(true);
        expect(frames.filter((name) => name.includes('border-primary-muted'))).toHaveLength(1);
        expect(screen.getAllByRole('separator')).toHaveLength(2);
    });

    it('places the groups by the layout, in reading order, each at least 320 px wide', async () => {
        await open(['Ana', 'Bruno', 'Cleo'], 1280);
        const groups = [...document.querySelectorAll<HTMLElement>('[data-group]')];
        expect(
            groups.map((group) => group.querySelector<HTMLElement>('[data-pane]')?.dataset.pane)
        ).toEqual(['Ana', 'Bruno', 'Cleo']);
        for (const group of groups) expect(parseInt(group.style.width)).toBeGreaterThanOrEqual(320);
    });

    it('opens beside as a tab when another group would not fit', async () => {
        await open(['Ana', 'Bruno', 'Cleo', 'Dora'], 1280);
        expect(regions()).toEqual(['Ana', 'Bruno', 'Dora']);
        expect(usePaneStore.getState().root).toMatchObject({ type: 'split' });
        expect(screen.getAllByRole('tablist')).toHaveLength(3);
    });

    it('shows one document and every tab when a stored layout does not fit', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
        resetLayout();
        seedDocuments(['Ana', 'Bruno', 'Cleo', 'Dora'], { current: 'Dora' });
        usePaneStore.setState({
            root: {
                type: 'split',
                direction: 'row',
                children: ['Ana', 'Bruno', 'Cleo', 'Dora'].map((name) => ({
                    type: 'group' as const,
                    id: name,
                    tabs: [`d:${name}`],
                    shown: `d:${name}`,
                })),
                weights: [1, 1, 1, 1],
            },
            recent: ['d:Dora'],
        });
        render(createElement(CharacterSheet));
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(4));
        expect(regions()).toEqual(['Dora']);
        expect(screen.getAllByRole('tab')).toHaveLength(4);
        fireEvent.click(screen.getByRole('tab', { name: 'Ana' }));
        expect(current()).toBe('Ana');
        expect(regions()).toEqual(['Ana']);
    });

    it('gives a group the whole area and gives it back, from the tab and from the button', async () => {
        await open(['Ana', 'Bruno', 'Cleo'], 1280);
        fireEvent.doubleClick(screen.getByRole('tab', { name: 'Bruno' }));
        expect(regions()).toEqual(['Bruno']);
        expect(screen.queryAllByRole('separator')).toHaveLength(0);
        fireEvent.doubleClick(screen.getByRole('tab', { name: 'Bruno' }));
        expect(regions()).toEqual(['Ana', 'Bruno', 'Cleo']);

        fireEvent.click(screen.getByRole('button', { name: 'Show only the group of Cleo' }));
        expect(regions()).toEqual(['Cleo']);
        fireEvent.click(screen.getByRole('button', { name: 'Show all groups again' }));
        expect(regions()).toEqual(['Ana', 'Bruno', 'Cleo']);
    });

    it('keeps the sizes a divider was moved to, and every group at 320 px or more', async () => {
        await open(['Ana', 'Bruno', 'Cleo'], 1280);
        const divider = screen.getAllByRole('separator')[0]!;
        expect(Number(divider.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(320);
        fireEvent.keyDown(divider, { key: 'ArrowRight', shiftKey: true });
        const { weights } = usePaneStore.getState().root as SplitNode;
        expect(weights[0]).toBeGreaterThan(weights[1]!);
        expect(Number(screen.getAllByRole('separator')[0]!.getAttribute('aria-valuenow'))).toBe(
            Number(divider.getAttribute('aria-valuenow'))
        );
    });

    describe('on a phone', () => {
        it('draws one document without a frame, with the tabs and no divider or maximize', async () => {
            await open(['Ana', 'Bruno', 'Cleo'], 343);
            expect(regions()).toEqual(['Cleo']);
            expect(screen.getAllByRole('region')[0]!.className).not.toContain('border');
            expect(screen.queryAllByRole('separator')).toHaveLength(0);
            expect(screen.queryByRole('button', { name: /Show only/ })).toBeNull();
            fireEvent.click(screen.getByRole('tab', { name: 'Bruno' }));
            expect(regions()).toEqual(['Bruno']);
        });
    });
});
