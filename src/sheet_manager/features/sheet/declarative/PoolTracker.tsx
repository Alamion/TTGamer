import { useMemo } from 'react';

import { Tracker } from '../../../components/stat-fields/Tracker';
import type { PoolTrackerOverride } from '../../../types/template';
import {
    markPool,
    poolBoxIndex,
    poolMarkLayer,
    type PoolPair,
    type PoolRules,
    poolTrackerModel,
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
