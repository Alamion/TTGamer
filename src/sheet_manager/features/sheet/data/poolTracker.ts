import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { PoolTrackerOverride, TrackerLayer, TrackerMarkKind } from '../../../types/template';
import { countText, type TrackerModel } from './trackerModel';

/**
 * A pool resource drawn as a tracker (spec 020, R6): the current value fills boxes from the start,
 * the maximum frames them. Clicks follow the dot rows' clamps, so a pool reads and writes the same
 * on a dots page and a tracker page.
 */
export interface PoolPair {
    current: number;
    max: number;
}

export interface PoolRules {
    /** Boxes drawn: the game's maximum, or a lower `maxFrom`. */
    limit: number;
    /** The current value's minimum (`minFrom`). */
    minCurrent: number;
    /** The maximum's minimum (`maxMinFrom`). */
    minMax: number;
    /** Raising the current value above the maximum raises the maximum (Star Wars Willpower). */
    raisesMax: boolean;
}

const POOL_COLUMN_ID = 'pool';
const CURRENT_MARK_ID = 'current';
const MAX_MARK_ID = 'max';

/** A press on box `index`: a fill sets the current value, an outline the maximum. */
export function markPool(
    pair: PoolPair,
    rules: PoolRules,
    index: number,
    layer: TrackerLayer
): PoolPair {
    if (layer === 'fill') {
        let current = index + 1 === pair.current ? index : index + 1;
        current = Math.min(Math.max(current, rules.minCurrent), rules.limit);
        if (rules.raisesMax) return { current, max: Math.max(pair.max, current) };
        return { current: Math.min(current, pair.max), max: pair.max };
    }
    // The maximum never forces the current value under its own minimum.
    const floor = Math.max(rules.minMax, rules.raisesMax ? rules.minCurrent : 0);
    let max = index + 1 === pair.max ? index : index + 1;
    max = Math.min(Math.max(max, floor), rules.limit);
    return { current: Math.min(pair.current, max), max };
}

/** The box index a level id stands for, or -1. */
export function poolBoxIndex(levelId: string): number {
    const match = /^p(\d+)$/.exec(levelId);
    return match ? Number(match[1]) - 1 : -1;
}

/** The mark layer a pool mark id writes. */
export function poolMarkLayer(markId: string): TrackerLayer {
    return markId === MAX_MARK_ID ? 'outline' : 'fill';
}

function poolMarks(
    override: PoolTrackerOverride | undefined
): Pick<TrackerMarkKind, 'id' | 'name' | 'symbol' | 'fill' | 'layer'>[] {
    const text = uiMessages.sheet.tracks.tracker;
    const current = override?.marks?.current;
    const max = override?.marks?.max;
    return [
        {
            id: CURRENT_MARK_ID,
            name: current?.name || translate(text.poolPoint),
            symbol: current?.symbol ?? '',
            fill: current?.fill ?? 'primary',
            layer: 'fill',
        },
        {
            id: MAX_MARK_ID,
            name: max?.name || translate(text.poolMaximum),
            symbol: max?.symbol ?? '',
            fill: max?.fill ?? 'primary',
            layer: 'outline',
        },
    ];
}

export function poolTrackerModel(input: {
    label: string;
    hideLabel: boolean;
    pair: PoolPair;
    rules: PoolRules;
    override: PoolTrackerOverride | undefined;
}): TrackerModel {
    const { pair, rules, override } = input;
    const levels = Array.from({ length: Math.max(0, rules.limit) }, (_, index) => ({
        id: `p${index + 1}`,
        name: String(index + 1),
        value: '',
    }));
    const ids = levels.map(({ id }) => id);
    // Stored data above the maximum shows as stored; the next write clamps it.
    const marks = Object.fromEntries(ids.slice(0, pair.current).map((id) => [id, CURRENT_MARK_ID]));
    const outlines = Object.fromEntries(ids.slice(0, pair.max).map((id) => [id, MAX_MARK_ID]));
    return {
        label: input.label,
        hideLabel: input.hideLabel,
        display: override?.display ?? 'row',
        marks: poolMarks(override),
        levels,
        valueColumn: { title: '', show: false },
        columns: [
            {
                id: POOL_COLUMN_ID,
                kind: 'marks',
                title: '',
                covered: ids,
                repeatable: false,
                canAdd: false,
                canRemove: false,
                copies: [
                    {
                        id: POOL_COLUMN_ID,
                        label: '',
                        marks,
                        outlines,
                        texts: {},
                        out: false,
                        total: countText(ids, marks, outlines, true),
                        hasValues: pair.current > 0 || pair.max > 0,
                        locked: {
                            fill: Math.min(rules.minCurrent, pair.current),
                            outline: Math.min(rules.minMax, pair.max),
                        },
                    },
                ],
            },
        ],
        total: override?.total ?? true,
        legend: override?.legend ?? false,
        readingLayer: 'fill',
        hasOutlines: true,
        hidden: 0,
    };
}

/** A single value drawn as boxes with a second value's marks from the end (spec 038 D10). */
export interface ScoreState {
    value: number;
    marks: number;
}

const SCORE_MARK_ID = 'score-mark';

/**
 * A press on box `index` of a score: a fill sets the value (the last filled box lowers it), an
 * outline marks from the end up to that box or clears marks down to it. `refused` when a mark
 * would land on a filled box; the value never covers a mark.
 */
export function markScore(
    state: ScoreState,
    length: number,
    index: number,
    layer: TrackerLayer
): ScoreState | 'refused' {
    const box = index + 1;
    if (layer === 'fill') {
        const wanted = box === state.value ? box - 1 : box;
        return { value: Math.max(0, Math.min(wanted, length - state.marks)), marks: state.marks };
    }
    if (box <= state.value) return 'refused';
    const firstMarked = length - state.marks + 1;
    return { value: state.value, marks: box >= firstMarked ? length - box : length - box + 1 };
}

/** Marks that no longer fit beside a raised value shrink (stains, spec 037 D7). */
export function fitScore(state: ScoreState, length: number): ScoreState {
    const value = Math.max(0, Math.min(state.value, length));
    return { value, marks: Math.max(0, Math.min(state.marks, length - value)) };
}

export function scoreTrackerModel(input: {
    label: string;
    hideLabel: boolean;
    state: ScoreState;
    length: number;
    override: PoolTrackerOverride | undefined;
}): TrackerModel {
    const { state, length, override } = input;
    const text = uiMessages.sheet.tracks.tracker;
    const current = override?.marks?.current;
    const mark = override?.marksFromEnd?.mark;
    const levels = Array.from({ length: Math.max(0, length) }, (_, index) => ({
        id: `p${index + 1}`,
        name: String(index + 1),
        value: '',
    }));
    const ids = levels.map(({ id }) => id);
    const marks = Object.fromEntries(ids.slice(0, state.value).map((id) => [id, CURRENT_MARK_ID]));
    const outlines = Object.fromEntries(
        ids.slice(Math.max(0, length - state.marks)).map((id) => [id, SCORE_MARK_ID])
    );
    return {
        label: input.label,
        hideLabel: input.hideLabel,
        display: override?.display ?? 'row',
        marks: [
            {
                id: CURRENT_MARK_ID,
                name: current?.name || input.label,
                symbol: current?.symbol ?? '',
                fill: current?.fill ?? 'primary',
                layer: 'fill',
            },
            {
                id: SCORE_MARK_ID,
                name: mark?.nameMessage
                    ? translate({ id: mark.nameMessage, message: mark.name ?? '' })
                    : mark?.name || translate(text.scoreMark),
                symbol: mark?.symbol ?? '╱',
                fill: mark?.fill ?? 'error',
                layer: 'outline',
            },
        ],
        levels,
        valueColumn: { title: '', show: false },
        columns: [
            {
                id: POOL_COLUMN_ID,
                kind: 'marks',
                title: '',
                covered: ids,
                repeatable: false,
                canAdd: false,
                canRemove: false,
                copies: [
                    {
                        id: POOL_COLUMN_ID,
                        label: '',
                        marks,
                        outlines,
                        texts: {},
                        out: false,
                        total:
                            state.marks > 0
                                ? `${state.value} · ${state.marks}`
                                : String(state.value),
                        hasValues: state.value > 0 || state.marks > 0,
                    },
                ],
            },
        ],
        total: override?.total ?? true,
        legend: override?.legend ?? false,
        readingLayer: 'fill',
        hasOutlines: true,
        hidden: 0,
    };
}
