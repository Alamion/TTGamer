import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useMemo, useState } from 'react';

import { Tracker } from '../../../components/stat-fields/Tracker';
import type { PoolTrackerOverride } from '../../../types/template';
import {
    fitScore,
    markPool,
    markScore,
    poolBoxIndex,
    poolMarkLayer,
    type PoolPair,
    type PoolRules,
    poolTrackerModel,
    type ScoreState,
    scoreTrackerModel,
} from '../data/poolTracker';

/**
 * A pool resource drawn as one tracker (spec 020 US3): fills are the current value, outlines the
 * maximum. Every press writes the whole pair once, through the same clamps as the dot rows.
 */
export function PoolTracker({
    label,
    hideLabel,
    pair,
    rules,
    override,
    disabled,
    onChange,
}: {
    label: string;
    hideLabel: boolean;
    pair: PoolPair;
    rules: PoolRules;
    override: PoolTrackerOverride;
    disabled: boolean;
    onChange: (next: PoolPair) => void;
}) {
    const model = useMemo(
        () => poolTrackerModel({ label, hideLabel, pair, rules, override }),
        [label, hideLabel, pair, rules, override]
    );
    return (
        <Tracker
            model={model}
            disabled={disabled}
            onMark={(_columnId, _copyId, levelId, click) => {
                const index = poolBoxIndex(levelId);
                if (index < 0) return;
                const layer = 'brush' in click ? poolMarkLayer(click.brush) : click.layer;
                onChange(markPool(pair, rules, index, layer));
            }}
        />
    );
}

/**
 * A single value drawn as boxes with a second value's marks from the end (spec 038 D10, V5
 * Humanity and stains): a press fills or empties up to a box; the outline action (right click,
 * Shift+Enter, long press) marks or clears from the end and is refused on a filled box.
 */
export function ScoreTracker({
    label,
    hideLabel,
    state,
    length,
    override,
    disabled,
    onChange,
}: {
    label: string;
    hideLabel: boolean;
    state: ScoreState;
    length: number;
    override: PoolTrackerOverride;
    disabled: boolean;
    onChange: (next: ScoreState) => void;
}) {
    const [refused, setRefused] = useState(false);
    const shown = fitScore(state, length);
    // At most 20 boxes: built every render.
    const model = scoreTrackerModel({ label, hideLabel, state: shown, length, override });
    const markName = model.marks[1]!.name;
    const text = uiMessages.sheet.tracks.tracker;
    return (
        // Full width: in a brief column of chips the boxes keep one row.
        <div className="grid w-full min-w-0 gap-1">
            <span className="sr-only">
                {translate(text.scoreSummary, {
                    name: label,
                    value: shown.value,
                    length,
                    marks: shown.marks,
                })}
            </span>
            <Tracker
                model={model}
                disabled={disabled}
                onMark={(_columnId, _copyId, levelId, click) => {
                    const index = poolBoxIndex(levelId);
                    if (index < 0) return;
                    const layer =
                        'brush' in click
                            ? click.brush === 'current'
                                ? 'fill'
                                : 'outline'
                            : click.layer;
                    const next = markScore(shown, length, index, layer);
                    setRefused(next === 'refused');
                    if (next !== 'refused') onChange(next);
                }}
            />
            {refused && (
                <p role="alert" className="text-xs text-error">
                    {translate(text.scoreMarkRefused, { mark: markName })}
                </p>
            )}
        </div>
    );
}
