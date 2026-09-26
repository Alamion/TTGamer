import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import type { RatingFlag } from '../../types/template';
import type { RatingDetail } from '../../types/templateValues';
import { FieldLabel } from '../controls/FieldLabel';
import type { TermLink } from '../terms/termLink';
import { StatDiceButton, type TraitDiceRoll } from './StatDiceButton';
import { StatDot } from './StatDot';
import { StatLabel } from './StatLabel';

const page = uiMessages.sheet.templates.page;

type RatingFlags = Pick<RatingDetail, RatingFlag>;

interface RatingRowProps {
    label: string;
    term?: TermLink;
    hideLabel?: boolean;
    /** Beside the value like a trait row (default), or above it like a stacked field. */
    labelPosition?: 'left' | 'top';
    required?: boolean;
    presentation: 'dots' | 'number';
    /** The shown value, already clamped to `max`. */
    value: number | undefined;
    /** The stored value, when it is above `max` (shown as the clamp marker). */
    clampedFrom?: number;
    min: number;
    max: number;
    disabled: boolean;
    onChange: (value: number | undefined) => void;
    /** Renders the text input between the label and the value. */
    onTextChange?: (text: string) => void;
    text?: string;
    showNumbers?: boolean;
    onDiceRoll?: TraitDiceRoll;
    /** The S/P/E flags the dot style shows (none when empty). */
    flags?: readonly RatingFlag[];
    flagValues?: RatingFlags;
    onFlagsChange?: (flags: RatingFlags) => void;
    characterName?: string;
    /** Notices under the row (for example an unavailable computed maximum). */
    children?: ReactNode;
}

/**
 * A template rating laid out as a trait row (spec 014): label, optional text, then dots or a
 * number, with the same atoms and container rules as `TraitRow`/`TraitRowWithInput`.
 */
export function RatingRow({
    label,
    term,
    hideLabel = false,
    labelPosition = 'left',
    required = false,
    presentation,
    value,
    clampedFrom,
    min,
    max,
    disabled,
    onChange,
    onTextChange,
    text = '',
    showNumbers = false,
    onDiceRoll,
    flags = [],
    flagValues = {},
    onFlagsChange,
    characterName,
    children,
}: RatingRowProps) {
    const flagOf = (flag: RatingFlag) => (flags.includes(flag) ? Boolean(flagValues[flag]) : false);
    const specialization = flagOf('specialization');
    const practiced = flagOf('practiced');
    const experienced = flagOf('experienced');

    const valueControl =
        presentation === 'number' ? (
            <div className="flex shrink-0 items-center gap-1">
                {onDiceRoll && (
                    <StatDiceButton
                        onDiceRoll={onDiceRoll}
                        value={value ?? 0}
                        specialization={false}
                        experienced={false}
                        practiced={false}
                        disabled={disabled}
                        statLabel={label}
                        characterName={characterName}
                    />
                )}
                {showNumbers ? (
                    // Like a resource: one frame holding the value and a read-only maximum.
                    <div
                        className={clsx(
                            'inline-flex items-center rounded border border-border bg-bgSurface focus-within:ring-1 focus-within:ring-primary',
                            disabled && 'opacity-50'
                        )}
                    >
                        <NumberInput
                            value={value}
                            min={min}
                            max={max}
                            step={1}
                            onChange={onChange}
                            disabled={disabled}
                            label={label}
                            className="w-12 bg-transparent px-1 py-1 text-center text-sm tabular-nums text-textPrimary focus:outline-none"
                        />
                        <span
                            className="px-1 text-sm tabular-nums text-textSecondary"
                            aria-label={translate(page.ratingMaximum, { max })}
                        >
                            / {max}
                        </span>
                    </div>
                ) : (
                    <NumberInput
                        value={value}
                        min={min}
                        max={max}
                        step={1}
                        onChange={onChange}
                        disabled={disabled}
                        label={label}
                        className="w-16 rounded border border-border bg-bgSurface px-2 py-1 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                )}
            </div>
        ) : (
            <StatDot
                value={value ?? 0}
                maxValue={max}
                minimal={min > 0 ? min : undefined}
                disabled={disabled}
                flags={flags}
                specialization={specialization}
                practiced={practiced}
                experienced={experienced}
                onChange={(next, nextSpecialization, nextExperienced, nextPracticed) => {
                    if (next !== (value ?? 0)) onChange(Math.max(min, next));
                    const changed: RatingFlags = {
                        specialization: Boolean(nextSpecialization),
                        practiced: Boolean(nextPracticed),
                        experienced: Boolean(nextExperienced),
                    };
                    if (
                        changed.specialization !== specialization ||
                        changed.practiced !== practiced ||
                        changed.experienced !== experienced
                    ) {
                        onFlagsChange?.(changed);
                    }
                }}
                onDiceRoll={onDiceRoll}
                statLabel={label}
                characterName={characterName}
                dotLabel={(level) => `${label}: ${level}`}
            />
        );

    // The number style frames its own maximum; only dots need the numbers written after them.
    const numbersAfter = showNumbers && presentation === 'dots';
    const trailing = (numbersAfter || clampedFrom !== undefined) && (
        <span className="shrink-0 pb-0.5 text-xs tabular-nums text-textSecondary">
            {numbersAfter && `${value ?? '—'} / ${max}`}
            {clampedFrom !== undefined && (
                <span
                    className={clsx('text-error', numbersAfter && 'ml-1')}
                    title={translate(page.formulaClamped)}
                    aria-label={translate(page.ratingClamped, { value: clampedFrom })}
                >
                    ({clampedFrom})
                </span>
            )}
        </span>
    );

    const top = labelPosition === 'top';
    return (
        <div className={clsx('term-row py-1', onTextChange && 'term-row-specialty')}>
            {top && (
                <FieldLabel
                    label={label}
                    term={term}
                    required={required}
                    position="top"
                    hidden={hideLabel}
                    className="mb-1 block"
                />
            )}
            <div
                className={clsx(
                    'flex items-end gap-2',
                    onTextChange ? 'term-row-inner' : top ? 'justify-start' : 'justify-between'
                )}
            >
                {!top && (
                    <StatLabel
                        label={label}
                        term={term}
                        required={required}
                        className={clsx(hideLabel && 'sr-only')}
                    />
                )}
                {onTextChange && (
                    <input
                        type="text"
                        value={text}
                        onChange={(event) => onTextChange(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                        }}
                        disabled={disabled}
                        aria-label={translate(page.ratingText, { label })}
                        className={clsx(
                            'w-0 flex-1 bg-transparent border-b px-2 text-sm text-textPrimary transition-colors min-w-[8ch]',
                            disabled && 'opacity-50 cursor-not-allowed'
                        )}
                    />
                )}
                <div className="flex min-w-0 items-end gap-2">
                    {valueControl}
                    {trailing}
                </div>
            </div>
            {children}
        </div>
    );
}
