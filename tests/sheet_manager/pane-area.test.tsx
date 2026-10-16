// @vitest-environment happy-dom
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import {
    groupsInOrder,
    type SplitNode,
} from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import {
    openBeside,
    openTool,
    usePaneStore,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { resetLayout, windowWidth } from './helpers/panes';

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
    // An open dice panel would open its tab again on the next sheet.
    useDiceRollerStore.setState({ panelOpen: false });
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

    it('keeps a docked tool in the strip when the layout does not fit a wide window', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500);
        resetLayout();
        seedDocuments(['Ana', 'Bruno'], { current: 'Ana' });
        usePaneStore.setState({
            root: {
                type: 'split',
                direction: 'row',
                children: ['t:library', 'd:Ana', 'd:Bruno'].map((key) => ({
                    type: 'group' as const,
                    id: key,
                    tabs: [key],
                    shown: key,
                })),
                weights: [1, 1, 1],
            },
            recent: ['d:Ana'],
        });
        render(createElement(CharacterSheet));
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(3));
        expect(regions()).toEqual(['Ana']);
        fireEvent.click(screen.getByRole('tab', { name: 'Library' }));
        expect(screen.getByRole('region', { name: 'Library' })).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'Ana' })).toBeNull();
        fireEvent.click(screen.getByRole('tab', { name: 'Bruno' }));
        expect(regions()).toEqual(['Bruno']);
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

describe('collapsing a group (spec 036, US5)', () => {
    const collapsed = () =>
        groupsInOrder(usePaneStore.getState().root)
            .filter((group) => group.collapsed)
            .map((group) => group.shown);
    const stripOf = (name: string) =>
        screen.getByRole('button', { name: `Open the group of ${name}` });

    it('collapses the group a divider is dragged far past, and opens it from its strip', async () => {
        await open(['Ana', 'Bruno'], 1280);
        const divider = screen.getByRole('separator');
        const size = Number(divider.getAttribute('aria-valuenow'));
        const to = 1000 - (size - 320 + 81);
        fireEvent.pointerDown(divider, { button: 0, pointerId: 1, clientX: 1000 });
        fireEvent.pointerMove(divider, { pointerId: 1, clientX: to });
        fireEvent.pointerUp(divider, { pointerId: 1, clientX: to });
        expect(collapsed()).toEqual(['d:Ana']);
        expect(stripOf('Ana').getAttribute('aria-expanded')).toBe('false');
        expect(regions()).toEqual(['Bruno']);
        expect(screen.queryAllByRole('separator')).toHaveLength(0);
        const { weights } = usePaneStore.getState().root as SplitNode;

        fireEvent.click(stripOf('Ana'));
        expect(collapsed()).toEqual([]);
        expect(regions()).toEqual(['Ana', 'Bruno']);
        expect((usePaneStore.getState().root as SplitNode).weights).toEqual(weights);
    });

    it('collapses with Enter on the divider, and stays collapsed after a remount', async () => {
        await open(['Ana', 'Bruno'], 1280);
        fireEvent.keyDown(screen.getByRole('separator'), { key: 'Enter' });
        expect(collapsed()).toHaveLength(1);
        cleanup();
        render(createElement(CharacterSheet));
        await waitFor(() =>
            expect(screen.getAllByRole('button', { name: /^Open the group/ })).toHaveLength(1)
        );
        fireEvent.keyDown(screen.getByRole('button', { name: /^Open the group/ }), {
            key: 'Enter',
        });
        fireEvent.click(screen.getByRole('button', { name: /^Open the group/ }));
        expect(collapsed()).toEqual([]);
    });

    it('draws groups of tools as strips when the layout does not fit, the least used first', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(900);
        resetLayout();
        seedDocuments(['Ana'], { current: 'Ana' });
        usePaneStore.setState({
            root: {
                type: 'split',
                direction: 'row',
                children: ['t:library', 'd:Ana', 't:dice'].map((key) => ({
                    type: 'group' as const,
                    id: key,
                    tabs: [key],
                    shown: key,
                })),
                weights: [1, 1, 1],
            },
            recent: ['d:Ana'],
        });
        render(createElement(CharacterSheet));
        await waitFor(() => expect(stripOf('Library')).toBeTruthy());
        // Only the drawing gives way: the stored layout keeps every group open.
        expect(collapsed()).toEqual([]);
        expect(screen.queryByRole('region', { name: 'Library' })).toBeNull();
        expect(screen.getByRole('region', { name: 'Dice Roller' })).toBeTruthy();

        fireEvent.click(stripOf('Library'));
        expect(screen.getByRole('region', { name: 'Library' })).toBeTruthy();
        expect(stripOf('Dice Roller')).toBeTruthy();
    });
});

describe('phones and narrow windows (spec 036, US6)', () => {
    const tabNames = () => screen.getAllByRole('tab').map((tab) => tab.textContent);
    const stored = {
        root: {
            type: 'split' as const,
            direction: 'row' as const,
            children: [
                { type: 'group' as const, id: 'A', tabs: ['d:Ana', 'd:Dora'], shown: 'd:Ana' },
                { type: 'group' as const, id: 'B', tabs: ['d:Bruno'], shown: 'd:Bruno' },
                { type: 'group' as const, id: 'T', tabs: ['t:dice'], shown: 't:dice' },
            ],
            weights: [2, 1, 1],
        },
        recent: ['d:Bruno', 'd:Ana'],
        floating: [{ key: 'd:Cleo', rect: { x: 40, y: 40, width: 500, height: 400 } }],
    };
    let width: ReturnType<typeof windowWidth>;
    afterEach(() => {
        width.restore();
        vi.unstubAllGlobals();
    });

    async function openAt(pixels: number) {
        width = windowWidth(pixels);
        // happy-dom never reports a resize to an observer: the area is measured on window resizes.
        vi.stubGlobal('ResizeObserver', undefined);
        const area = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get');
        area.mockReturnValue(pixels - 32);
        resetLayout();
        seedDocuments(['Ana', 'Bruno', 'Cleo', 'Dora'], { current: 'Bruno' });
        usePaneStore.setState(stored);
        render(createElement(CharacterSheet));
        return area;
    }

    it('shows one unframed document and a strip of every open document on a phone', async () => {
        await openAt(375);
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(4));
        expect(tabNames()).toEqual(['Ana', 'Dora', 'Bruno', 'Cleo']);
        expect(regions()).toEqual(['Bruno']);
        expect(document.querySelector('[data-group-frame]')).toBeNull();
        expect(screen.queryByRole('dialog')).toBeNull();

        fireEvent.click(screen.getByRole('tab', { name: 'Cleo' }));
        expect(regions()).toEqual(['Cleo']);
        expect(current()).toBe('Cleo');
    });

    it('opens a tool over the page and keeps its place when it is put away', async () => {
        await openAt(375);
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(4));
        act(() => openTool('dice'));
        const tool = screen.getByRole('dialog', { name: 'Dice Roller' });
        fireEvent.click(within(tool).getByRole('button', { name: /close/i }));
        expect(screen.queryByRole('dialog', { name: 'Dice Roller' })).toBeNull();
        expect(usePaneStore.getState().root).toEqual(stored.root);
    });

    it('gives the layout back as it was when the window is widened', async () => {
        const area = await openAt(375);
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(4));
        fireEvent.click(screen.getByRole('tab', { name: 'Dora' }));
        area.mockReturnValue(1248);
        act(() => {
            width.set(1280);
            window.dispatchEvent(new Event('resize'));
        });
        await waitFor(() => expect(screen.getAllByRole('tablist')).toHaveLength(3));
        // Dora, Bruno, the dice (a tool region), and Cleo floating again.
        expect(regions()).toEqual(['Dora', 'Bruno', undefined, 'Cleo']);
        expect(screen.getByRole('region', { name: 'Dice Roller' })).toBeTruthy();
        expect(screen.getByRole('dialog', { name: 'Cleo' })).toBeTruthy();
        const { root } = usePaneStore.getState();
        expect((root as SplitNode).weights).toEqual([2, 1, 1]);
    });
});

describe('where the publisher badge goes (constitution VIII, spec 036)', () => {
    const badges = () =>
        screen
            .queryAllByRole('complementary', { name: 'Publisher notice' })
            .map((badge) => badge.dataset.badgePlace);

    it('under the one document, as before', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
        resetLayout();
        seedDocuments(['Ana'], { current: 'Ana' });
        render(createElement(CharacterSheet));
        expect(badges()).toEqual(['page']);
    });

    it('once at the end of the toolbar over groups that fill the window', async () => {
        await open(['Ana', 'Bruno'], 1280);
        expect(badges()).toEqual(['toolbar']);
    });

    it('at the foot of a floating document, not under a tool shown in the page', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
        resetLayout();
        seedDocuments(['Ana'], { current: 'Ana' });
        usePaneStore.setState({
            root: { type: 'group', id: 'T', tabs: ['t:dice'], shown: 't:dice' },
            recent: ['d:Ana'],
            floating: [{ key: 'd:Ana', rect: { x: 40, y: 40, width: 600, height: 500 } }],
        });
        render(createElement(CharacterSheet));
        const window = await screen.findByRole('dialog', { name: 'Ana' });
        expect(badges()).toEqual(['window']);
        expect(
            within(window).getByRole('complementary', { name: 'Publisher notice' })
        ).toBeTruthy();
    });
});
