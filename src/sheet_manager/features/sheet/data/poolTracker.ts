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
