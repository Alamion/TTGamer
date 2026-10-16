import {
    COLLAPSED_SIZE,
    fitByCollapsing,
    type GroupNode,
    groupOf,
    groupsInOrder,
    type LayoutNode,
    makeGroup,
    minSizeOf,
    normalize,
    placeTab,
    rectsOf,
    removeTab,
    setCollapsed,
    setWeightsAt,
    splitGroup,
    type SplitNode,
} from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import { describe, expect, it } from 'vitest';

const g = (id: string, tabs: string[], shown = tabs[0]!): GroupNode => ({
    type: 'group',
    id,
    tabs,
    shown,
});
const row = (children: LayoutNode[], weights = children.map(() => 1)): SplitNode => ({
    type: 'split',
    direction: 'row',
    children,
    weights,
});
const column = (children: LayoutNode[], weights = children.map(() => 1)): SplitNode => ({
    type: 'split',
    direction: 'column',
    children,
    weights,
});
const order = (node: LayoutNode | null) => groupsInOrder(node).map(({ id }) => id);

describe('the normal form of a layout (spec 035 D2)', () => {
    it('removes emptied groups and replaces a split of one child by the child', () => {
        const a = g('A', ['d:a']);
        expect(normalize(row([a, g('B', [])]))).toBe(a);
        expect(normalize(row([g('A', []), g('B', [])]))).toBeNull();
    });

    it('merges a split into its parent of the same direction, keeping the share of each child', () => {
        const tree = row(
            [g('A', ['d:a']), row([g('B', ['d:b']), g('C', ['d:c'])], [3, 1])],
            [1, 2]
        );
        const flat = normalize(tree) as SplitNode;
        expect(order(flat)).toEqual(['A', 'B', 'C']);
        expect(flat.weights).toEqual([1, 1.5, 0.5]);
    });

    it('shows a tab the group has and fixes unusable weights', () => {
        expect((normalize(g('A', ['d:a', 'd:b'], 'd:x')) as GroupNode).shown).toBe('d:a');
        expect(
            (normalize(row([g('A', ['d:a']), g('B', ['d:b'])], [0, -1])) as SplitNode).weights
        ).toEqual([1, 1]);
    });

    it('returns the same object when nothing changes', () => {
        const tree = row([g('A', ['d:a']), column([g('B', ['d:b']), g('C', ['d:c'])])]);
        expect(normalize(tree)).toBe(tree);
    });
});

describe('reading order and lookups', () => {
    const tree = row([g('A', ['d:a']), column([g('B', ['d:b', 't:dice']), g('C', ['d:c'])])]);

    it('goes depth first, left to right, top to bottom', () => {
        expect(order(tree)).toEqual(['A', 'B', 'C']);
    });

    it('finds the group of a tab', () => {
        expect(groupOf(tree, 't:dice')?.id).toBe('B');
        expect(groupOf(tree, 'd:zzz')).toBeUndefined();
    });
});

describe('tabs', () => {
    it('close to the neighbour on the right, else the left; the last tab takes its group away', () => {
        const tree = row([g('A', ['d:a', 'd:b', 'd:c'], 'd:b'), g('B', ['d:x'])]);
        expect(groupOf(removeTab(tree, 'd:b'), 'd:a')).toMatchObject({ shown: 'd:c' });
        expect(groupOf(removeTab(tree, 'd:c'), 'd:a')).toMatchObject({ shown: 'd:b' });
        expect(groupOf(removeTab(g('A', ['d:a', 'd:b'], 'd:b'), 'd:b'), 'd:a')).toMatchObject({
            shown: 'd:a',
        });
        expect(removeTab(tree, 'd:x')).toEqual(g('A', ['d:a', 'd:b', 'd:c'], 'd:b'));
    });

    it('are added after the shown tab and shown', () => {
        const next = placeTab(g('A', ['d:a', 'd:b'], 'd:a'), 'd:c', 'A');
        expect(next).toEqual(g('A', ['d:a', 'd:c', 'd:b'], 'd:c'));
    });

    it('reorder within a strip by the gap they are dropped in', () => {
        const strip = g('A', ['d:a', 'd:b', 'd:c']);
        expect((placeTab(strip, 'd:c', 'A', 0) as GroupNode).tabs).toEqual(['d:c', 'd:a', 'd:b']);
        expect((placeTab(strip, 'd:a', 'A', 3) as GroupNode).tabs).toEqual(['d:b', 'd:c', 'd:a']);
        expect((placeTab(strip, 'd:a', 'A', 1) as GroupNode).tabs).toEqual(['d:a', 'd:b', 'd:c']);
    });

    it('move to another group, which removes an emptied source group', () => {
        const tree = row([g('A', ['d:a']), g('B', ['d:b'])]);
        expect(placeTab(tree, 'd:a', 'B', 0)).toEqual(g('B', ['d:a', 'd:b'], 'd:a'));
    });
});

describe('splitting a group', () => {
    const tree = row([g('A', ['d:a', 'd:x']), g('B', ['d:b'])]);

    it('beside it inside a row of the same direction, halving its share', () => {
        const next = splitGroup(tree, 'A', 'right', 'd:x', 'N') as SplitNode;
        expect(order(next)).toEqual(['A', 'N', 'B']);
        expect(next.weights).toEqual([0.5, 0.5, 1]);
        expect(groupOf(next, 'd:a')?.tabs).toEqual(['d:a']);
        const left = splitGroup(tree, 'A', 'left', 'd:x', 'N') as SplitNode;
        expect(order(left)).toEqual(['N', 'A', 'B']);
    });

    it('wraps it in a column when the side crosses the row', () => {
        const next = splitGroup(tree, 'B', 'bottom', 'd:x', 'N') as SplitNode;
        expect(next.children[1]).toMatchObject({ type: 'split', direction: 'column' });
        expect(order(next)).toEqual(['A', 'B', 'N']);
        const top = splitGroup(tree, 'B', 'top', 'd:x', 'N') as SplitNode;
        expect(order(top)).toEqual(['A', 'N', 'B']);
    });

    it('builds three groups over three more', () => {
        let tree: LayoutNode | null = row([g('A', ['d:a']), g('B', ['d:b']), g('C', ['d:c'])]);
        for (const [id, below] of [
            ['A', 'd:d'],
            ['B', 'd:e'],
            ['C', 'd:f'],
        ] as const) {
            tree = splitGroup(tree, id, 'bottom', below, `${id}2`);
        }
        expect(order(tree)).toEqual(['A', 'A2', 'B', 'B2', 'C', 'C2']);
        expect(minSizeOf(tree)).toEqual({ width: 3 * 320 + 2 * 6, height: 2 * 200 + 6 });
        const { groups } = rectsOf(tree, { width: 1920, height: 880 });
        expect(groups.map(({ id }) => id)).toEqual(['A', 'A2', 'B', 'B2', 'C', 'C2']);
        for (const { rect } of groups) {
            expect(rect.width).toBeGreaterThanOrEqual(320);
            expect(rect.height).toBeGreaterThanOrEqual(200);
            expect(Number.isInteger(rect.width) && Number.isInteger(rect.height)).toBe(true);
        }
        const right = groups.at(-1)!.rect;
        expect(right.left + right.width).toBe(1920);
        expect(right.top + right.height).toBe(880);
    });

    it('does nothing for a group whose only tab is dropped on its own edge', () => {
        const single = row([g('A', ['d:a']), g('B', ['d:b'])]);
        expect(splitGroup(single, 'A', 'right', 'd:a')).toBe(single);
    });

    it('takes the tab out of another group first', () => {
        const next = splitGroup(tree, 'B', 'right', 'd:a', 'N');
        expect(order(next)).toEqual(['A', 'B', 'N']);
        expect(groupOf(next, 'd:x')?.id).toBe('A');
        expect(makeGroup(['d:q'], 'Q')).toEqual(g('Q', ['d:q']));
    });
});

describe('sizes and places', () => {
    it('counts a collapsed group as a strip', () => {
        const tree = row([{ ...g('A', ['d:a']), collapsed: true }, g('B', ['d:b'])]);
        expect(minSizeOf(tree).width).toBe(COLLAPSED_SIZE + 6 + 320);
        const { groups, dividers } = rectsOf(tree, { width: 1000, height: 500 });
        expect(groups[0]!.rect.width).toBe(COLLAPSED_SIZE);
        expect(groups[1]!.rect.width).toBe(1000 - COLLAPSED_SIZE - 6);
        expect(dividers).toHaveLength(1);
    });

    it('places dividers between children and follows a previewed set of weights', () => {
        const tree = row([g('A', ['d:a']), column([g('B', ['d:b']), g('C', ['d:c'])])]);
        const { dividers } = rectsOf(tree, { width: 1006, height: 606 });
        expect(dividers.map(({ path, direction }) => [path.join('.'), direction])).toEqual([
            ['', 'row'],
            ['1', 'column'],
        ]);
        expect(dividers[1]!.rect).toEqual({ left: 506, top: 300, width: 500, height: 6 });
        const preview = rectsOf(tree, { width: 1006, height: 606 }, { path: [], weights: [3, 1] });
        expect(preview.groups[0]!.rect.width).toBe(680);
    });

    it('stores weights at a path', () => {
        const tree = row([g('A', ['d:a']), column([g('B', ['d:b']), g('C', ['d:c'])])]);
        const next = setWeightsAt(tree, [1], [2, 1]) as SplitNode;
        expect((next.children[1] as SplitNode).weights).toEqual([2, 1]);
        expect(next.children[0]).toBe(tree.children[0]);
        expect(setWeightsAt(tree, [1], [1])).toBe(tree);
    });
});

describe('collapsed groups (spec 036, US5)', () => {
    const collapsedIds = (node: LayoutNode | null) =>
        groupsInOrder(node)
            .filter((group) => group.collapsed)
            .map(({ id }) => id);

    it('collapse and expand, keeping the weight; a split keeps one open child', () => {
        const tree = row([g('A', ['d:a']), column([g('B', ['d:b']), g('C', ['d:c'])])], [2, 1]);
        const once = setCollapsed(tree, 'B', true)!;
        expect(collapsedIds(once)).toEqual(['B']);
        expect((once as SplitNode).weights).toEqual([2, 1]);
        expect(setCollapsed(once, 'C', true)).toBe(once);
        expect(setCollapsed(g('A', ['d:a']), 'A', true)).toEqual(g('A', ['d:a']));
        expect(collapsedIds(setCollapsed(once, 'B', false))).toEqual([]);
    });

    it('opens a group a tab is placed or shown in', () => {
        const tree = setCollapsed(row([g('A', ['d:a', 'd:x']), g('B', ['d:b'])]), 'A', true);
        expect(collapsedIds(placeTab(tree, 'd:x', 'A'))).toEqual([]);
        expect(collapsedIds(placeTab(tree, 'd:b', 'A'))).toEqual([]);
    });

    it('fits a layout that does not fit by collapsing tool groups, least recently used first', () => {
        const tree = row([g('L', ['t:library']), g('A', ['d:a']), g('D', ['t:dice'])]);
        const area = { width: 800, height: 600 };
        expect(fitByCollapsing(tree, { width: 1200, height: 600 }, [])).toBe(tree);
        expect(collapsedIds(fitByCollapsing(tree, area, ['t:dice', 'd:a', 't:library']))).toEqual([
            'L',
        ]);
        expect(collapsedIds(fitByCollapsing(tree, area, ['t:library', 'd:a']))).toEqual(['D']);
        // Never the tab used last, and never a group with a document.
        expect(fitByCollapsing(tree, { width: 500, height: 600 }, ['t:dice'])).toBeNull();
        const documents = row([g('A', ['d:a']), g('B', ['d:b']), g('C', ['d:c'])]);
        expect(fitByCollapsing(documents, area, [])).toBeNull();
    });
});
