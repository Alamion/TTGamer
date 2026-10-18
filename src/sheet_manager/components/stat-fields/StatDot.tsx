import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { type ReactNode, useCallback } from 'react';

import { RATING_FLAGS, type RatingFlag } from '../../types/template';
import {
    StatDiceButton,
    statDotPixels,
    statFlagSizeClasses,
    type TraitDiceRoll,
} from './StatDiceButton';

interface StatDotProps {
    value: number;
    maxValue?: number;
    /** `number`: a number field in place of the dots, for values too large for a row of dots. */
    presentation?: 'dots' | 'number';
    onChange?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    minimal?: number;
    /** All three S/P/E flags; `flags` picks a subset instead. */
    showFlags?: boolean;
    flags?: readonly RatingFlag[];
    specialization?: boolean | null;
    experienced?: boolean | null;
    practiced?: boolean | null;
    activeColor?: { bg?: string; border?: string };
    onRemove?: () => void;
    /** A caller's own remove control, in the place of the built-in one (list entries). */
    removeSlot?: ReactNode;
    onDiceRoll?: TraitDiceRoll;
    statLabel?: string;
    characterName?: string;
    /** Accessible name of each dot, by its value (for example "Renown: 3"). */
    dotLabel?: (level: number) => string;
}

const FLAG_UI: Record<RatingFlag, { letter: string; activeClass: string }> = {
    specialization: { letter: 'S', activeClass: 'text-jediBlue' },
    practiced: { letter: 'P', activeClass: 'text-droidGold' },
    experienced: { letter: 'E', activeClass: 'text-jediRed' },
};

const flagTitles = {
    specialization: uiMessages.sheet.controls.statDot.specialization,
    practiced: uiMessages.sheet.controls.statDot.practiced,
    experienced: uiMessages.sheet.controls.statDot.experienced,
};

const dotSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
};

export function StatDot({
    value,
    maxValue = 5,
    onChange,
    disabled = false,
    size = 'md',
    minimal,
    showFlags = false,
    flags,
    specialization = null,
    experienced = null,
    practiced = null,
    activeColor,
    onRemove,
    removeSlot,
    onDiceRoll,
    statLabel,
    characterName,
    dotLabel,
    presentation = 'dots',
}: StatDotProps) {
    const visibleFlags = flags
        ? RATING_FLAGS.filter((flag) => flags.includes(flag))
        : showFlags
          ? RATING_FLAGS
          : [];
    const hasFlags = visibleFlags.length > 0;
    const flagValues = { specialization, experienced, practiced };
    const removable = Boolean(onRemove || removeSlot);
    const number = presentation === 'number';

    const handleClick = useCallback(
        (index: number) => {
            if (disabled) return;
            let newValue = index + 1 === value ? index : index + 1;
            if (minimal !== undefined && newValue < minimal) {
                newValue = minimal;
            }
            onChange?.(newValue, specialization, experienced, practiced);
        },
        [disabled, onChange, value, minimal, specialization, experienced, practiced]
    );

    const handleFlagToggle = useCallback(
        (flag: RatingFlag) => {
            if (disabled) return;
            onChange?.(
                value,
                flag === 'specialization' ? !specialization : specialization,
                flag === 'experienced' ? !experienced : experienced,
                flag === 'practiced' ? !practiced : practiced
            );
        },
        [disabled, onChange, value, specialization, experienced, practiced]
    );

    return (
        <div
            className={clsx(
                'flex min-w-0 items-center gap-1',
                // A number sits in one line with its die and remove control; dots get a row above.
                number ? 'flex-row' : 'flex-col'
            )}
            role={number ? 'group' : 'radiogroup'}
            aria-label={translate(uiMessages.sheet.controls.statDot.group)}
        >
            {(hasFlags || removable || onDiceRoll) && (
                <div className={number ? 'contents' : 'flex w-full'}>
                    {onDiceRoll ? (
                        <StatDiceButton
                            onDiceRoll={onDiceRoll}
                            value={value}
                            specialization={specialization}
                            experienced={experienced}
                            practiced={practiced}
                            disabled={disabled}
                            size={size}
                            statLabel={statLabel}
                            characterName={characterName}
                        />
                    ) : hasFlags && removable ? (
                        <div className={clsx('invisible', statFlagSizeClasses[size])} />
                    ) : null}
                    {hasFlags && (
                        <div className="flex gap-1 mx-auto">
                            {visibleFlags.map((flag) => (
                                <button
                                    key={flag}
                                    type="button"
                                    onClick={() => handleFlagToggle(flag)}
                                    disabled={disabled}
                                    aria-pressed={Boolean(flagValues[flag])}
                                    className={clsx(
                                        'rounded-sm font-bold transition-all duration-200',
                                        statFlagSizeClasses[size],
                                        flagValues[flag]
                                            ? `${FLAG_UI[flag].activeClass} opacity-100`
                                            : 'text-textSecondary opacity-40 hover:opacity-70',
                                        disabled && 'cursor-not-allowed'
                                    )}
                                    title={translate(flagTitles[flag])}
                                >
                                    {FLAG_UI[flag].letter}
                                </button>
                            ))}
                        </div>
                    )}
                    {removeSlot ? (
                        <div className={clsx('ml-auto flex', number && 'order-last')}>
                            {removeSlot}
                        </div>
                    ) : onRemove ? (
                        <button
                            type="button"
                            onClick={onRemove}
                            disabled={disabled}
                            className={clsx(
                                'ml-auto rounded-sm font-bold transition-all duration-200 flex items-center justify-center',
                                number && 'order-last',
                                statFlagSizeClasses[size],
                                // Destructive at rest, unmistakable under pointer or keyboard focus.
                                'text-error opacity-50 hover:opacity-100 focus-visible:opacity-100',
                                'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-error',
                                disabled && 'cursor-not-allowed'
                            )}
                            aria-label={translate(uiMessages.sheet.controls.statDot.remove)}
                            title={translate(uiMessages.sheet.controls.statDot.remove)}
                        >
                            <X size={statDotPixels[size] - 2} />
                        </button>
                    ) : hasFlags && onDiceRoll ? (
                        <div className={clsx('invisible', statFlagSizeClasses[size])} />
                    ) : null}
                </div>
            )}
            {number ? (
                <NumberInput
                    value={value}
                    min={minimal ?? 0}
                    max={maxValue}
                    step={1}
                    label={statLabel ?? translate(uiMessages.sheet.controls.statDot.group)}
                    disabled={disabled}
                    onChange={(next) =>
                        onChange?.(next ?? minimal ?? 0, specialization, experienced, practiced)
                    }
                    className="w-14 rounded-sm border border-border bg-bgSurface px-2 py-1 text-center text-sm tabular-nums text-textPrimary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
            ) : null}
            {/* Each dot's button spans its half of the gaps on both sides, so the row has no
                dead space; the negative margin keeps the old outer width. Too many dots for
                the row narrow into pills instead of wrapping. */}
            {!number && (
                <div className="flex max-w-full -mx-0.5">
                    {Array.from({ length: maxValue }, (_, i) => {
                        const isActive = i + 1 <= value;
                        const isMinimal = minimal !== undefined && i + 1 <= minimal;
                        return (
                            <button
                                key={i}
                                type="button"
                                role="radio"
                                aria-checked={i + 1 === value}
                                aria-label={dotLabel?.(i + 1)}
                                disabled={disabled}
                                onClick={() => handleClick(i)}
                                className={clsx(
                                    'group/dot flex min-w-0 shrink items-center px-0.5',
                                    disabled && 'cursor-not-allowed'
                                )}
                            >
                                <span
                                    className={clsx(
                                        'block max-w-full rounded-full transition-all duration-200 border-2',
                                        dotSizeClasses[size],
                                        isActive
                                            ? isMinimal
                                                ? 'bg-primary-darker border-primary-darker'
                                                : activeColor
                                                  ? `${activeColor.bg} ${activeColor.border}`
                                                  : 'bg-primary border-primary'
                                            : 'bg-transparent border-border group-hover/dot:border-primary/80',
                                        disabled && 'opacity-50'
                                    )}
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
