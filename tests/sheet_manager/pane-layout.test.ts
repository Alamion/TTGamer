import {
    moveDivider,
    paneWidths,
    visibleCount,
    visibleIds,
    weightsOf,
} from '@site/src/sheet_manager/features/sheet/panes/layout';
import { describe, expect, it } from 'vitest';

describe('how many panes fit (spec 034, FR-005, FR-006)', () => {
    it.each([
        [375, 1],
        [767, 1],
        [768, 2],
        [1280, 3],
        [1920, 5],
        [4000, 6],
    ])('%i px shows %i', (width, count) => {
        expect(visibleCount(width)).toBe(count);
    });

    it('shows one pane until the width is known', () => {
        expect(visibleCount(undefined)).toBe(1);
        expect(visibleCount(0)).toBe(1);
    });

    it('never leaves a pane under 320 px', () => {
        for (let width = 768; width <= 2400; width += 7) {
            const count = visibleCount(width);
            const widths = paneWidths(Array<number>(count).fill(1), width);
            expect(Math.min(...widths), `${width} px`).toBeGreaterThanOrEqual(320);
            expect(widths.reduce((a, b) => a + b, 0) + (count - 1) * 6).toBe(width);
        }
    });
});

describe('which panes are drawn', () => {
    const ids = ['a', 'b', 'c', 'd'];

    it('takes the most recently focused, in pane order', () => {
        expect(visibleIds(ids, ['c', 'a', 'd', 'b'], 2)).toEqual(['a', 'c']);
        expect(visibleIds(ids, ['b'], 3)).toEqual(['a', 'b', 'c']);
    });

    it('a hidden pane that is focused replaces the least recently focused visible one', () => {
        expect(visibleIds(ids, ['c', 'a', 'b', 'd'], 2)).toEqual(['a', 'c']);
        expect(visibleIds(ids, ['d', 'c', 'a', 'b'], 2)).toEqual(['c', 'd']);
    });
});

describe('widths', () => {
    it('are equal for equal weights and follow the weights otherwise', () => {
        expect(paneWidths([1, 1], 1000)).toEqual([497, 497]);
        expect(paneWidths([3, 1], 1006)).toEqual([680, 320]);
        const [left, right] = paneWidths([2, 1], 1006);
        expect(left! / right!).toBeGreaterThan(1.99);
    });

    it('lift a narrow pane to the minimum and take the difference from the others', () => {
        const widths = paneWidths([0.1, 1, 1], 1000);
        expect(widths[0]).toBe(320);
        expect(widths.reduce((a, b) => a + b, 0) + 12).toBe(1000);
        expect(Math.min(...widths)).toBeGreaterThanOrEqual(320);
    });

    it('keep a divider drag between the neighbours and above the minimum', () => {
        expect(moveDivider([400, 400, 400], 0, 440)).toEqual([440, 360, 400]);
        expect(moveDivider([400, 400, 400], 0, 900)).toEqual([480, 320, 400]);
        expect(moveDivider([400, 400, 400], 1, 100)).toEqual([400, 320, 480]);
    });

    it('average one when stored', () => {
        const weights = weightsOf([500, 250, 250]);
        expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(3, 2);
    });
});
