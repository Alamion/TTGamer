import { NumberInput } from '@site/src/shared/components/NumberInput';
import { clsx } from 'clsx';

import type { ConditionMark } from '../../types/character';
import { TermLabel } from '../terms/TermLabel';
import type { TermLink } from '../terms/termLink';

interface CompactFieldProps {
    disabled: boolean;
    label: string;
}

interface CompactTextFieldProps extends CompactFieldProps {
    value: string;
    onChange: (value: string) => void;
}

export function CompactTextField({ disabled, label, onChange, value }: CompactTextFieldProps) {
    return (
        <label className="grid min-w-0 grid-cols-[auto_1fr] items-end gap-2 text-xs text-textSecondary">
            <span className="pb-1 font-medium">{label}</span>
            <input
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="min-w-0 border-0 border-b border-border bg-transparent px-1 py-0.5 text-sm text-textPrimary outline-none focus:border-primary disabled:opacity-70"
            />
        </label>
    );
}

interface CompactRatingProps extends CompactFieldProps {
    /** Book term of the label (spec 009). */
    term?: TermLink;
    value: number;
    max?: number;
    onChange: (value: number) => void;
}

export function CompactRating({
    disabled,
    label,
    max = 5,
    onChange,
    term,
    value,
}: CompactRatingProps) {
    return (
        <label className="term-row term-row-compact flex min-w-0 items-center gap-1.5 text-xs">
            <span className="min-w-0 flex-1 truncate text-textSecondary" title={label}>
                <TermLabel text={label} {...term} />
            </span>
            <NumberInput
                min={0}
                max={max}
                step={1}
                optional={false}
                value={value}
                disabled={disabled}
                onChange={(next) => onChange(next ?? value)}
                label={label}
                className="h-7 w-11 rounded border border-border bg-bgBase px-1 text-center text-sm font-semibold text-textPrimary outline-none focus:border-primary disabled:opacity-70"
            />
        </label>
    );
}

interface CompactResourceProps extends CompactFieldProps {
    current: number;
    maximum: number;
    currentLabel: string;
    maximumLabel: string;
    limit?: number;
    onChange: (current: number, maximum: number) => void;
}

export function CompactResource({
    current,
    currentLabel,
    disabled,
    label,
    limit = 10,
    maximum,
    maximumLabel,
    onChange,
}: CompactResourceProps) {
    return (
        <div className="flex items-center gap-1.5 text-xs">
            <span className="min-w-0 flex-1 truncate text-textSecondary">{label}</span>
            <NumberInput
                min={0}
                max={maximum}
                step={1}
                optional={false}
                value={current}
                disabled={disabled}
                onChange={(next) => onChange(next ?? current, maximum)}
                label={`${label}: ${currentLabel}`}
                className="h-7 w-10 rounded border border-border bg-bgBase px-1 text-center text-sm text-textPrimary disabled:opacity-70"
            />
            <span className="text-textSecondary">/</span>
            <NumberInput
                min={0}
                max={limit}
                step={1}
                optional={false}
                value={maximum}
                disabled={disabled}
                onChange={(next) => {
                    const nextMaximum = next ?? maximum;
                    onChange(Math.min(current, nextMaximum), nextMaximum);
                }}
                label={`${label}: ${maximumLabel}`}
                className="h-7 w-10 rounded border border-border bg-bgBase px-1 text-center text-sm text-textPrimary disabled:opacity-70"
            />
        </div>
    );
}

interface CompactConditionLevel {
    id: string;
    label: string;
    penalty?: number | null;
}

interface CompactConditionTrackProps {
    disabled: boolean;
    levels: readonly CompactConditionLevel[];
    marks: ConditionMark[];
    onChange: (marks: ConditionMark[]) => void;
}

const nextConditionMark: Record<ConditionMark, ConditionMark> = {
    empty: 'slash',
    slash: 'cross',
    cross: 'empty',
};

export function CompactConditionTrack({
    disabled,
    levels,
    marks,
    onChange,
}: CompactConditionTrackProps) {
    return (
        <div className="grid gap-1">
            {levels.map((level, index) => {
                const mark = marks[index] ?? 'empty';
                return (
                    <div
                        key={level.id}
                        className="grid grid-cols-[1fr_2rem_2rem] items-center gap-2 text-xs"
                    >
                        <span
                            className={clsx(
                                'text-textSecondary',
                                mark === 'cross' && 'font-semibold text-error'
                            )}
                        >
                            {level.label}
                        </span>
                        <span className="text-center text-textSecondary">
                            {level.penalty || '—'}
                        </span>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                                const nextMarks = [...marks];
                                nextMarks[index] = nextConditionMark[mark];
                                onChange(nextMarks);
                            }}
                            aria-label={`${level.label}: ${mark}`}
                            className={clsx(
                                'grid h-7 w-7 place-items-center rounded border-2 font-mono text-sm font-bold transition-colors disabled:opacity-70',
                                mark === 'cross'
                                    ? 'border-error bg-error text-white'
                                    : mark === 'slash'
                                      ? 'border-secondary bg-secondary text-white'
                                      : 'border-border bg-bgBase hover:border-primary'
                            )}
                        >
                            {mark === 'cross' ? '×' : mark === 'slash' ? '╱' : ''}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
