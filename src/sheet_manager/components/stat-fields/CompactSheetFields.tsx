import { NumberInput } from '@site/src/shared/components/NumberInput';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import { BRIEF } from '../../features/sheet/declarative/briefRhythm';
import type { ConditionMark } from '../../types/condition';
import { resolveTerm } from '../terms/resolveTerm';
import { useTermHintSettings } from '../terms/TermHintContext';
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

/** A text field in a brief: a small label over an underlined value, sharing a row with its kin. */
export function CompactTextField({ disabled, label, onChange, value }: CompactTextFieldProps) {
    return (
        <label className="grid min-w-24 flex-1 basis-24 gap-0">
            <span className={BRIEF.caption}>{label}</span>
            <input
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="min-w-0 border-0 border-b border-border bg-transparent px-0.5 py-0 text-sm font-semibold text-textPrimary outline-hidden focus:border-primary disabled:opacity-70"
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
    /** Brief look (spec 033): this short form stands for the label; the full name stays its name. */
    shortLabel?: string;
    /** After the value (a pool's die). */
    trailing?: ReactNode;
}

/**
 * A rating drawn from its short label: a row (label, value) while the sheet area is narrow, a
 * chip (label cell, value cell) from the `md` area width up. The input keeps the full name, and
 * the hint popover of the term labels shows it on hover, focus, and tap.
 */
function ShortRating({
    disabled,
    label,
    max = 5,
    onChange,
    shortLabel,
    term,
    value,
}: CompactRatingProps & { shortLabel: string }) {
    const settings = useTermHintSettings();
    const resolved = settings
        ? resolveTerm({ text: label, ...term }, settings.locale, settings.mode)
        : null;
    const full = resolved?.display ?? label;
    const hint = settings
        ? {
              'data-term-ref': term?.termRef ?? 'short-label',
              'data-term-hint': resolved?.hint ?? full,
              ...(resolved?.hint ? { 'data-term-detail': full } : {}),
          }
        : { title: full };
    return (
        <label
            {...hint}
            className={clsx(
                'term-label relative flex min-w-0 items-center gap-1.5 rounded-sm px-1 text-xs text-textSecondary',
                BRIEF.cellHeight,
                'hover:bg-bgBase focus-within:outline-2 focus-within:outline-primary',
                '@md/brief:h-[26px] @md/brief:w-fit @md/brief:gap-0 @md/brief:overflow-hidden @md/brief:bg-border/30 @md/brief:px-0',
                // A finger needs 32 px: the row itself grows on touch screens, so no target
                // overlaps its neighbour's.
                '[@media(pointer:coarse)]:h-8 @md/brief:[@media(pointer:coarse)]:h-8'
            )}
        >
            <span className="shrink-0 text-[11px] font-semibold tracking-wider @md/brief:grid @md/brief:h-full @md/brief:place-items-center @md/brief:bg-border/70 @md/brief:px-1 @md/brief:text-[10.5px]">
                {shortLabel}
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
                className="h-full w-6 min-w-0 border-0 bg-transparent p-0 text-left text-[15px] font-bold text-textPrimary outline-hidden disabled:opacity-70 @md/brief:w-6 @md/brief:text-center"
            />
        </label>
    );
}

export function CompactRating({ trailing, ...props }: CompactRatingProps) {
    const rating = <CompactRatingBody {...props} />;
    return trailing ? (
        <div className="flex min-w-0 items-center">
            {rating}
            {trailing}
        </div>
    ) : (
        rating
    );
}

function CompactRatingBody(props: Omit<CompactRatingProps, 'trailing'>) {
    const { disabled, label, max = 5, onChange, shortLabel, term, value } = props;
    if (shortLabel) return <ShortRating {...props} shortLabel={shortLabel} />;
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
                className="h-7 w-11 rounded-sm border border-border bg-bgBase px-1 text-center text-sm font-semibold text-textPrimary outline-hidden focus:border-primary disabled:opacity-70"
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
        <div className={clsx('flex items-center text-xs', BRIEF.cellGap)}>
            <span className="min-w-0 truncate text-textSecondary">{label}</span>
            <NumberInput
                min={0}
                max={maximum}
                step={1}
                optional={false}
                value={current}
                disabled={disabled}
                onChange={(next) => onChange(next ?? current, maximum)}
                label={`${label}: ${currentLabel}`}
                className="h-6 w-7 min-w-0 rounded-sm border border-border bg-bgBase px-0.5 text-center text-sm font-semibold text-textPrimary disabled:opacity-70"
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
                className="h-6 w-7 min-w-0 rounded-sm border border-border bg-bgBase px-0.5 text-center text-sm font-semibold text-textPrimary disabled:opacity-70"
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
                                'grid h-7 w-7 place-items-center rounded-sm border-2 font-mono text-sm font-bold transition-colors disabled:opacity-70',
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
