import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useSheetDiceActions } from '@site/src/integrations/sheet-dice/useSheetDiceActions';
import { clsx } from 'clsx';
import { Dices, X } from 'lucide-react';
import { useCallback } from 'react';

import { useDocumentRollSource } from '../../hooks/useDocumentSource';

interface StatDotProps {
    value: number;
    maxValue?: number;
    onChange?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    minimal?: number;
    showFlags?: boolean;
    specialization?: boolean | null;
    experienced?: boolean | null;
    practiced?: boolean | null;
    activeColor?: { bg?: string; border?: string };
    onRemove?: () => void;
    onDiceRoll?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => string | undefined;
    statLabel?: string;
    characterName?: string;
}

export function StatDot({
    value,
    maxValue = 5,
    onChange,
    disabled = false,
    size = 'md',
    minimal,
    showFlags = false,
    specialization = null,
    experienced = null,
    practiced = null,
    activeColor,
    onRemove,
    onDiceRoll,
    statLabel,
    characterName,
}: StatDotProps) {
    const rollSource = useDocumentRollSource();
    const { queueNotation, rollImmediately } = useSheetDiceActions({
        characterName,
        statLabel,
        rollSource,
    });

    const handleDiceLeftClick = useCallback(() => {
        if (disabled || !onDiceRoll) return;
        const notation = onDiceRoll(value, specialization, experienced, practiced);
        if (notation) queueNotation(notation);
    }, [disabled, onDiceRoll, value, specialization, experienced, practiced, queueNotation]);

    const handleDiceRightClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            if (disabled || !onDiceRoll) return;
            const notation = onDiceRoll(value, specialization, experienced, practiced);
            if (notation) {
                void rollImmediately(notation);
            }
        },
        [disabled, onDiceRoll, value, specialization, experienced, practiced, rollImmediately]
    );
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
        (flag: 'specialization' | 'experienced' | 'practiced') => {
            if (disabled) return;
            const currentValue =
                flag === 'specialization'
                    ? specialization
                    : flag === 'experienced'
                      ? experienced
                      : practiced;
            const newValue = !currentValue;
            if (flag === 'specialization') {
                onChange?.(value, newValue, experienced, practiced);
            } else if (flag === 'experienced') {
                onChange?.(value, specialization, newValue, practiced);
            } else {
                onChange?.(value, specialization, experienced, newValue);
            }
        },
        [disabled, onChange, value, specialization, experienced, practiced]
    );

    const sizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    const flagSizeClasses = {
        sm: 'w-3 h-3 text-[8px]',
        md: 'w-4 h-4 text-[10px]',
        lg: 'w-5 h-5 text-xs',
    };

    const dotPixel = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;

    return (
        <div
            className="flex flex-col items-center gap-1"
            role="radiogroup"
            aria-label={translate(uiMessages.sheet.controls.statDot.group)}
        >
            {(showFlags || onRemove || onDiceRoll) && (
                <div className="flex w-full">
                    {onDiceRoll ? (
                        <button
                            type="button"
                            onClick={handleDiceLeftClick}
                            onContextMenu={handleDiceRightClick}
                            disabled={disabled}
                            className={clsx(
                                'rounded font-bold transition-all duration-200 flex items-center justify-center',
                                flagSizeClasses[size],
                                'text-textSecondary opacity-40 hover:opacity-70',
                                disabled && 'cursor-not-allowed'
                            )}
                            title={translate(uiMessages.sheet.controls.statDot.diceTitle)}
                        >
                            <Dices size={dotPixel - 2} />
                        </button>
                    ) : showFlags && onRemove ? (
                        <div className={clsx('invisible', flagSizeClasses[size])} />
                    ) : null}
                    {showFlags && (
                        <div className="flex gap-1 mx-auto">
                            <button
                                type="button"
                                onClick={() => handleFlagToggle('specialization')}
                                disabled={disabled}
                                className={clsx(
                                    'rounded font-bold transition-all duration-200',
                                    flagSizeClasses[size],
                                    specialization
                                        ? 'text-jediBlue opacity-100'
                                        : 'text-textSecondary opacity-40 hover:opacity-70',
                                    disabled && 'cursor-not-allowed'
                                )}
                                title={translate(uiMessages.sheet.controls.statDot.specialization)}
                            >
                                S
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFlagToggle('practiced')}
                                disabled={disabled}
                                className={clsx(
                                    'rounded font-bold transition-all duration-200',
                                    flagSizeClasses[size],
                                    practiced
                                        ? 'text-droidGold opacity-100'
                                        : 'text-textSecondary opacity-40 hover:opacity-70',
                                    disabled && 'cursor-not-allowed'
                                )}
                                title={translate(uiMessages.sheet.controls.statDot.practiced)}
                            >
                                P
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFlagToggle('experienced')}
                                disabled={disabled}
                                className={clsx(
                                    'rounded font-bold transition-all duration-200',
                                    flagSizeClasses[size],
                                    experienced
                                        ? 'text-jediRed opacity-100'
                                        : 'text-textSecondary opacity-40 hover:opacity-70',
                                    disabled && 'cursor-not-allowed'
                                )}
                                title={translate(uiMessages.sheet.controls.statDot.experienced)}
                            >
                                E
                            </button>
                        </div>
                    )}
                    {onRemove ? (
                        <button
                            type="button"
                            onClick={onRemove}
                            disabled={disabled}
                            className={clsx(
                                'ml-auto rounded font-bold transition-all duration-200 flex items-center justify-center',
                                flagSizeClasses[size],
                                // Destructive at rest, unmistakable under pointer or keyboard focus.
                                'text-error opacity-50 hover:opacity-100 focus-visible:opacity-100',
                                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-error',
                                disabled && 'cursor-not-allowed'
                            )}
                            aria-label={translate(uiMessages.sheet.controls.statDot.remove)}
                            title={translate(uiMessages.sheet.controls.statDot.remove)}
                        >
                            <X size={dotPixel - 2} />
                        </button>
                    ) : showFlags && onDiceRoll ? (
                        <div className={clsx('invisible', flagSizeClasses[size])} />
                    ) : null}
                </div>
            )}
            <div className="flex gap-1">
                {Array.from({ length: maxValue }, (_, i) => {
                    const isActive = i + 1 <= value;
                    const isMinimal = minimal !== undefined && i + 1 <= minimal;
                    return (
                        <button
                            key={i}
                            type="button"
                            role="radio"
                            aria-checked={i + 1 === value}
                            disabled={disabled}
                            onClick={() => handleClick(i)}
                            className={clsx(
                                'rounded-full transition-all duration-200 border-2',
                                sizeClasses[size],
                                isActive
                                    ? isMinimal
                                        ? 'bg-primary-darker border-primary-darker'
                                        : activeColor
                                          ? `${activeColor.bg} ${activeColor.border}`
                                          : 'bg-primary border-primary'
                                    : 'bg-transparent hover:border-primary/80',
                                disabled && 'opacity-50 cursor-not-allowed'
                            )}
                        />
                    );
                })}
            </div>
        </div>
    );
}
