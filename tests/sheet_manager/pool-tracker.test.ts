import {
    markPool,
    type PoolRules,
    poolTrackerModel,
} from '@site/src/sheet_manager/features/sheet/data/poolTracker';
import { describe, expect, it } from 'vitest';

/** Pool resources drawn as trackers: clamps and the drawn model (spec 020, R6). */

const RULES: PoolRules = { limit: 10, minCurrent: 0, minMax: 0, raisesMax: false };
const rules = (patch: Partial<PoolRules> = {}) => ({ ...RULES, ...patch });

describe('pressing a pool box', () => {
    it('runs the current value up and down like a rating', () => {
        const pair = { current: 2, max: 5 };
        expect(markPool(pair, RULES, 3, 'fill')).toEqual({ current: 4, max: 5 });
        expect(markPool(pair, RULES, 0, 'fill')).toEqual({ current: 1, max: 5 });
        expect(markPool(pair, RULES, 1, 'fill')).toEqual({ current: 1, max: 5 });
        expect(markPool({ current: 1, max: 5 }, RULES, 0, 'fill')).toEqual({ current: 0, max: 5 });
    });

    it('stops the fill at the frame unless current raises the maximum', () => {
        expect(markPool({ current: 2, max: 3 }, RULES, 7, 'fill')).toEqual({ current: 3, max: 3 });
        expect(markPool({ current: 5, max: 6 }, rules({ raisesMax: true }), 8, 'fill')).toEqual({
            current: 9,
            max: 9,
        });
    });

    it('keeps the current value at its minimum', () => {
        const willpower = rules({ minCurrent: 4, raisesMax: true });
        expect(markPool({ current: 5, max: 6 }, willpower, 1, 'fill')).toEqual({
            current: 4,
            max: 6,
        });
    });

    it('runs the maximum and lowers the current value with it', () => {
        expect(markPool({ current: 4, max: 5 }, RULES, 7, 'outline')).toEqual({
            current: 4,
            max: 8,
        });
        expect(markPool({ current: 4, max: 5 }, RULES, 1, 'outline')).toEqual({
            current: 2,
            max: 2,
        });
        expect(markPool({ current: 4, max: 5 }, RULES, 4, 'outline')).toEqual({
            current: 4,
            max: 4,
        });
    });

    it('lets the maximum reach 0 with no minimum, as the dots do', () => {
        expect(markPool({ current: 1, max: 1 }, RULES, 0, 'outline')).toEqual({
            current: 0,
            max: 0,
        });
    });

    it('holds the maximum at its minimum, and at the current minimum when current raises it', () => {
        expect(markPool({ current: 1, max: 5 }, rules({ minMax: 3 }), 0, 'outline')).toEqual({
            current: 1,
            max: 3,
        });
        const willpower = rules({ minCurrent: 4, raisesMax: true });
        expect(markPool({ current: 5, max: 6 }, willpower, 1, 'outline')).toEqual({
            current: 4,
            max: 4,
        });
    });

    it('never goes past the limit', () => {
        const limited = rules({ limit: 6 });
        expect(markPool({ current: 2, max: 6 }, limited, 9, 'fill')).toEqual({
            current: 6,
            max: 6,
        });
        expect(markPool({ current: 2, max: 3 }, limited, 9, 'outline')).toEqual({
            current: 2,
            max: 6,
        });
    });
});

describe('the drawn pool', () => {
    const model = (pair: { current: number; max: number }, patch: Partial<PoolRules> = {}) =>
        poolTrackerModel({
            label: 'Force Points',
            hideLabel: false,
            pair,
            rules: rules(patch),
            override: undefined,
        });

    it('draws boxes up to the limit, fills the current value, and frames the maximum', () => {
        const drawn = model({ current: 2, max: 3 }, { limit: 10 });
        const copy = drawn.columns[0]!.copies[0]!;
        expect(drawn.levels).toHaveLength(10);
        expect(Object.keys(copy.marks)).toEqual(['p1', 'p2']);
        expect(Object.keys(copy.outlines)).toEqual(['p1', 'p2', 'p3']);
        expect(copy.total).toBe('2 / 3');
        expect(drawn).toMatchObject({ display: 'row', hasOutlines: true, total: true });
        expect(drawn.marks.map(({ layer, fill }) => [layer, fill])).toEqual([
            ['fill', 'primary'],
            ['outline', 'primary'],
        ]);
    });

    it('locks the boxes a minimum holds', () => {
        const copy = model({ current: 5, max: 6 }, { minCurrent: 4, minMax: 2 }).columns[0]!
            .copies[0]!;
        expect(copy.locked).toEqual({ fill: 4, outline: 2 });
        expect(
            model({ current: 1, max: 1 }, { minCurrent: 4, minMax: 3 }).columns[0]!.copies[0]!
                .locked
        ).toEqual({ fill: 1, outline: 1 });
    });

    it('shows a stored current value above the maximum as stored', () => {
        const copy = model({ current: 4, max: 2 }).columns[0]!.copies[0]!;
        expect(Object.keys(copy.marks)).toHaveLength(4);
        expect(copy.total).toBe('4 / 2');
    });

    it('takes the page look of its marks', () => {
        const drawn = poolTrackerModel({
            label: 'Force Points',
            hideLabel: false,
            pair: { current: 0, max: 0 },
            rules: RULES,
            override: {
                display: 'strip',
                legend: true,
                total: false,
                marks: { current: { name: 'Force', fill: 'secondary' }, max: { symbol: '○' } },
            },
        });
        expect(drawn).toMatchObject({ display: 'strip', legend: true, total: false });
        expect(drawn.marks[0]).toMatchObject({ name: 'Force', fill: 'secondary' });
        expect(drawn.marks[1]).toMatchObject({ name: 'Maximum', symbol: '○' });
        expect(drawn.columns[0]!.copies[0]!.total).toBe('0');
    });
});
