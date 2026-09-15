import { clsx } from 'clsx';
import { Minus, Plus } from 'lucide-react';

import type { ConditionMark } from '../../types/character';

export interface ConditionTrackLevel {
    id: string;
    label: string;
    penalty?: number | null;
}

/** Optional length regulator: shorten/extend the track (a missing handler disables the side). */
export interface ConditionTrackLengthControl {
    onDecrease?: () => void;
    onIncrease?: () => void;
    decreaseLabel: string;
    increaseLabel: string;
}

interface ConditionTrackProps {
    disabled: boolean;
    levels: readonly ConditionTrackLevel[];
    marks: readonly ConditionMark[];
    onChange: (marks: ConditionMark[]) => void;
    lengthControl?: ConditionTrackLengthControl;
}

/** The −/+ pair of a length regulator, for layouts that are not a condition track molecule. */
export function ConditionTrackLengthButtons({
    control,
    disabled,
}: {
    control: ConditionTrackLengthControl;
    disabled: boolean;
}) {
    const button =
        'grid h-6 w-6 place-items-center rounded text-textSecondary hover:bg-bgBase hover:text-primary disabled:opacity-30';
    return (
        <span className="inline-flex items-center gap-0.5">
            <button
                type="button"
                disabled={disabled || !control.onDecrease}
                onClick={control.onDecrease}
                aria-label={control.decreaseLabel}
                title={control.decreaseLabel}
                className={button}
            >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
                type="button"
                disabled={disabled || !control.onIncrease}
                onClick={control.onIncrease}
                aria-label={control.increaseLabel}
                title={control.increaseLabel}
                className={button}
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
        </span>
    );
}

const nextMark: Record<ConditionMark, ConditionMark> = {
    empty: 'slash',
    slash: 'cross',
    cross: 'empty',
};

function MarkButton({
    disabled,
    label,
    mark,
    onToggle,
    size = 'md',
}: {
    disabled: boolean;
    label: string;
    mark: ConditionMark;
    onToggle: () => void;
    size?: 'sm' | 'md';
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onToggle}
            aria-label={`${label}: ${mark}`}
            title={label}
            className={clsx(
                'grid shrink-0 place-items-center rounded border-2 font-mono font-bold transition-colors disabled:opacity-70',
                size === 'sm' ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm',
                mark === 'cross'
                    ? 'border-error bg-error text-white'
                    : mark === 'slash'
                      ? 'border-secondary bg-secondary text-white'
                      : 'border-border bg-bgBase hover:border-primary'
            )}
        >
            {mark === 'cross' ? '×' : mark === 'slash' ? '╱' : ''}
        </button>
    );
}

function toggleAt(marks: readonly ConditionMark[], index: number): ConditionMark[] {
    const next = [...marks];
    next[index] = nextMark[marks[index] ?? 'empty'];
    return next;
}

/**
 * Full condition track: one row per level with pronounced Level / Penalty / Damage columns.
 * Built from grid rows with ARIA table roles (the site's global `table` styles do not apply).
 */
export function ConditionTrackTable({
    disabled,
    levels,
    marks,
    onChange,
    columnLabels,
    lengthControl,
}: ConditionTrackProps & { columnLabels: { level: string; penalty: string; mark: string } }) {
    const row = 'grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-2';
    return (
        <div role="table" className="w-full text-sm">
            <div
                role="row"
                className={clsx(
                    row,
                    'pb-2 text-xs font-semibold uppercase tracking-wider text-textSecondary'
                )}
            >
                <span role="columnheader">{columnLabels.level}</span>
                <span role="columnheader" className="text-center">
                    {columnLabels.penalty}
                </span>
                <span role="columnheader" className="text-center">
                    {columnLabels.mark}
                </span>
            </div>
            {levels.map((level, index) => {
                const mark = marks[index] ?? 'empty';
                return (
                    <div
                        key={level.id}
                        role="row"
                        className={clsx(row, 'border-t border-border/60 py-1.5')}
                    >
                        <span
                            role="rowheader"
                            className={clsx(
                                'font-medium',
                                mark === 'empty' ? 'text-textPrimary' : 'text-error'
                            )}
                        >
                            {level.label}
                        </span>
                        <span role="cell" className="text-center font-mono text-textSecondary">
                            {level.penalty || '—'}
                        </span>
                        <span role="cell" className="flex justify-center">
                            <MarkButton
                                disabled={disabled}
                                label={level.label}
                                mark={mark}
                                onToggle={() => onChange(toggleAt(marks, index))}
                            />
                        </span>
                    </div>
                );
            })}
            {lengthControl && !disabled && (
                <div className="flex justify-end border-t border-border/60 pt-1">
                    <ConditionTrackLengthButtons control={lengthControl} disabled={disabled} />
                </div>
            )}
        </div>
    );
}

/**
 * One-line condition track: the label followed by a square per level. `hideLabel` keeps the
 * label for assistive technology only; `size="md"` suits a full page.
 */
export function ConditionTrackStrip({
    disabled,
    label,
    levels,
    marks,
    onChange,
    lengthControl,
    hideLabel = false,
    size = 'sm',
}: ConditionTrackProps & { label: string; hideLabel?: boolean; size?: 'sm' | 'md' }) {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span
                className={clsx(
                    'font-semibold uppercase tracking-wider text-textSecondary',
                    hideLabel && 'sr-only'
                )}
            >
                {label}
            </span>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
                {levels.map((level, index) => (
                    <MarkButton
                        key={level.id}
                        disabled={disabled}
                        label={level.penalty ? `${level.label} (${level.penalty})` : level.label}
                        mark={marks[index] ?? 'empty'}
                        onToggle={() => onChange(toggleAt(marks, index))}
                        size={size}
                    />
                ))}
                {lengthControl && !disabled && (
                    <ConditionTrackLengthButtons control={lengthControl} disabled={disabled} />
                )}
            </div>
        </div>
    );
}
