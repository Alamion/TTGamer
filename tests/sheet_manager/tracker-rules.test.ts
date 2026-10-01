import {
    copyLabel,
    coveredLevelIds,
    deepestMarked,
    hiddenSlotEntries,
    isCopyOut,
    kindsOfLayer,
    layerMarks,
    lengthChangeHidesMarks,
    markWeight,
    nextMarkId,
    readingLayer,
    remapMarks,
    visibleLevelIds,
} from '@site/src/sheet_manager/features/sheet/data/tracker';
import {
    isDefeated,
    memberPenalty,
    paintMark,
    shortenMarks,
} from '@site/src/sheet_manager/features/sheet/declarative/cohort';
import type { ConditionMark } from '@site/src/sheet_manager/types/character';
import { describe, expect, it } from 'vitest';

/** Tracker rules over level and mark ids (spec 018, R7). */

const kinds = (...ids: string[]) => ids.map((id) => ({ id }));
const TWO = kinds('slash', 'cross');
const LEVELS = ['bruised', 'hurt', 'injured', 'wounded', 'mauled', 'crippled', 'down'];

describe('the click cycle', () => {
    it.each([
        [kinds('x'), [undefined, 'x', undefined]],
        [TWO, [undefined, 'slash', 'cross', undefined]],
        [kinds('b', 'l', 'a'), [undefined, 'b', 'l', 'a', undefined]],
        [kinds('a', 'b', 'c', 'd', 'e'), [undefined, 'a', 'b', 'c', 'd', 'e', undefined]],
    ])('steps through every kind and back to empty', (marks, cycle) => {
        for (let step = 0; step < cycle.length - 1; step += 1) {
            expect(nextMarkId(marks, cycle[step])).toBe(cycle[step + 1]);
        }
    });

    it('restarts a mark of a removed kind', () => {
        expect(nextMarkId(TWO, 'gone')).toBe('slash');
        expect(markWeight(TWO, 'gone')).toBe(-1);
        expect(markWeight(TWO, 'cross')).toBeGreaterThan(markWeight(TWO, 'slash'));
    });
});

describe('shown levels', () => {
    const lengths = [
        { levels: ['hurt', 'injured', 'down'] },
        { levels: ['down', 'bruised', 'hurt', 'injured', 'wounded'] },
    ];

    it('shows every level without lengths, and a length in level order', () => {
        expect(visibleLevelIds(LEVELS, [], undefined)).toEqual(LEVELS);
        expect(visibleLevelIds(LEVELS, lengths, 1)).toEqual([
            'bruised',
            'hurt',
            'injured',
            'wounded',
            'down',
        ]);
    });

    it('falls back to the first length and ignores unknown level ids', () => {
        expect(visibleLevelIds(LEVELS, lengths, undefined)).toEqual(['hurt', 'injured', 'down']);
        expect(visibleLevelIds(LEVELS, lengths, 5)).toEqual(['hurt', 'injured', 'down']);
        expect(visibleLevelIds(['hurt'], lengths, 0)).toEqual(['hurt']);
    });

    it('covers the first N shown levels', () => {
        expect(coveredLevelIds({ covers: 3 }, LEVELS)).toEqual(['bruised', 'hurt', 'injured']);
        expect(coveredLevelIds({}, LEVELS)).toEqual(LEVELS);
    });
});

describe('totals and out', () => {
    it('finds the deepest shown level with a known mark', () => {
        const marks = { hurt: 'slash', wounded: 'cross', down: 'gone' };
        expect(deepestMarked(TWO, LEVELS, marks)).toBe('wounded');
        expect(deepestMarked(TWO, ['bruised', 'hurt'], marks)).toBe('hurt');
        expect(deepestMarked(TWO, LEVELS, {})).toBeUndefined();
    });

    it('is out when the last shown level holds a known mark', () => {
        expect(isCopyOut(TWO, LEVELS, { down: 'slash' })).toBe(true);
        expect(isCopyOut(TWO, LEVELS, { down: 'gone' })).toBe(false);
        expect(isCopyOut(TWO, ['bruised', 'hurt'], { hurt: 'cross' })).toBe(true);
        expect(isCopyOut(TWO, [], {})).toBe(false);
    });

    it('labels copies A, B, C…', () => {
        expect([0, 1, 2, 23].map(copyLabel)).toEqual(['A', 'B', 'C', 'X']);
    });
});

describe('switching the length', () => {
    const seven = LEVELS;
    const five = ['bruised', 'hurt', 'injured', 'wounded', 'down'];
    const three = ['hurt', 'injured', 'down'];

    it('keeps each mark at its shown position and folds the tail, heaviest first', () => {
        const marks = { bruised: 'slash', hurt: 'slash', injured: 'slash', mauled: 'cross' };
        expect(remapMarks(TWO, seven, three, marks)).toEqual({
            hurt: 'slash',
            injured: 'slash',
            down: 'cross',
        });
        expect(lengthChangeHidesMarks(TWO, seven, three, marks)).toBe(true);
    });

    it('keeps positions when growing, and asks nothing', () => {
        const marks = { hurt: 'slash', injured: 'cross' };
        expect(remapMarks(TWO, three, five, marks)).toEqual({
            bruised: 'slash',
            hurt: 'cross',
        });
        expect(lengthChangeHidesMarks(TWO, three, five, marks)).toBe(false);
    });

    it('drops marks of unknown kinds and hidden levels', () => {
        expect(remapMarks(TWO, three, five, { hurt: 'gone', mauled: 'cross' })).toEqual({});
        expect(remapMarks(TWO, seven, [], { hurt: 'slash' })).toEqual({});
    });
});

/**
 * Pins today's member-track rules (`cohort.ts`, positional marks) against the id rules on the
 * same inputs. After `cohort.ts` delegates to these rules the block only guards the mapping;
 * `tracker-parity.test.tsx` is the end-to-end proof.
 */
describe('parity with member tracks', () => {
    const toIds = (marks: readonly ConditionMark[], levels: readonly string[]) =>
        Object.fromEntries(
            levels.flatMap((levelId, index) => {
                const mark = marks[index] ?? 'empty';
                return mark === 'empty' ? [] : [[levelId, mark]];
            })
        );
    const toMarks = (marks: Record<string, string>, levels: readonly string[], slots: number) =>
        Array.from({ length: slots }, (_, index) => {
            const levelId = levels[index];
            return (levelId === undefined ? undefined : marks[levelId]) ?? 'empty';
        });
    const penalties = [0, -1, -1, -2, -2, -5, null];
    const cases: ConditionMark[][] = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['slash', 'slash', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['slash', 'cross', 'slash', 'cross', 'empty', 'empty', 'empty'],
        ['cross', 'cross', 'cross', 'cross', 'slash', 'slash', 'slash'],
        ['slash', 'empty', 'empty', 'empty', 'empty', 'cross', 'empty'],
    ];

    it.each(cases)('folds, totals, and outs like shortenMarks/memberPenalty/isDefeated', (...m) => {
        const marks = m as ConditionMark[];
        const values = new Map(LEVELS.map((id, index) => [id, penalties[index]]));
        for (const length of [3, 5, 7]) {
            const after = LEVELS.slice(0, length);
            const folded = remapMarks(TWO, LEVELS, after, toIds(marks, LEVELS));
            expect(toMarks(folded, after, 7)).toEqual(shortenMarks(marks, length));

            const shown = toIds(shortenMarks(marks, length), after);
            const deepest = deepestMarked(TWO, after, shown);
            expect(deepest === undefined ? 0 : (values.get(deepest) ?? 0)).toBe(
                memberPenalty(shortenMarks(marks, length), penalties.slice(0, length))
            );
            expect(isCopyOut(TWO, after, shown)).toBe(
                isDefeated(shortenMarks(marks, length), length)
            );
        }
    });
});

describe('layers (spec 019)', () => {
    const POINT = { id: 'point', layer: 'fill' as const };
    const MAX = { id: 'max', layer: 'outline' as const };
    const BLEED = { id: 'bleed', layer: 'outline' as const };

    it('reads the fills, or the outlines of a tracker with no fills', () => {
        expect(readingLayer([POINT, MAX])).toBe('fill');
        expect(readingLayer([MAX, BLEED])).toBe('outline');
        expect(readingLayer(TWO)).toBe('fill');
        expect(kindsOfLayer([POINT, MAX, BLEED], 'outline').map(({ id }) => id)).toEqual([
            'max',
            'bleed',
        ]);
    });

    it('shows each slot on its kind layer', () => {
        const copy = { marks: { l1: 'point' }, outlines: { l1: 'max', l2: 'max' } };
        expect(layerMarks([POINT, MAX], copy, 'fill')).toEqual({ l1: 'point' });
        expect(layerMarks([POINT, MAX], copy, 'outline')).toEqual({ l1: 'max', l2: 'max' });
        expect(hiddenSlotEntries([POINT, MAX], copy)).toBe(0);
    });

    it('follows a mark whose layer changed without rewriting the value', () => {
        // "max" was stored as a fill, then the author made it an outline.
        const copy = { marks: { l1: 'max', l2: 'point' } };
        expect(layerMarks([POINT, MAX], copy, 'outline')).toEqual({ l1: 'max' });
        expect(layerMarks([POINT, MAX], copy, 'fill')).toEqual({ l2: 'point' });
        expect(hiddenSlotEntries([POINT, MAX], copy)).toBe(0);
    });

    it('keeps the own slot on a collision and counts the other as hidden', () => {
        // "bleed" became a fill on a box whose fill slot already holds "point".
        const fills = [POINT, { id: 'bleed', layer: 'fill' as const }];
        const copy = { marks: { l1: 'point' }, outlines: { l1: 'bleed' } };
        expect(layerMarks(fills, copy, 'fill')).toEqual({ l1: 'point' });
        expect(layerMarks(fills, copy, 'outline')).toEqual({});
        expect(hiddenSlotEntries(fills, copy)).toBe(1);
    });

    it('hides marks of removed kinds and of levels no longer shown', () => {
        const copy = { marks: { l1: 'gone' }, outlines: { l2: 'max', l3: 'max' } };
        expect(layerMarks([POINT, MAX], copy, 'fill')).toEqual({});
        expect(hiddenSlotEntries([POINT, MAX], copy, (levelId) => levelId !== 'l3')).toBe(2);
    });

    it('reads stored values of spec 018 as fills', () => {
        const copy = { marks: { hurt: 'slash', injured: 'cross' } };
        expect(layerMarks(TWO, copy, 'fill')).toEqual(copy.marks);
        expect(layerMarks(TWO, copy, 'outline')).toEqual({});
    });
});

describe('the brush on member tracks (spec 019)', () => {
    const marks: ConditionMark[] = ['slash', 'empty', 'cross'];

    it('puts the mark in one step and clears it when it is already there', () => {
        expect(paintMark(marks, 1, 'cross')).toEqual(['slash', 'cross', 'cross']);
        expect(paintMark(marks, 0, 'cross')).toEqual(['cross', 'empty', 'cross']);
        expect(paintMark(marks, 2, 'cross')).toEqual(['slash', 'empty', 'empty']);
        expect(marks).toEqual(['slash', 'empty', 'cross']);
    });
});
