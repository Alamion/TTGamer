import { clsx } from 'clsx';
import { type KeyboardEvent, useState } from 'react';

interface ScoreTrackProps {
    label: string;
    value: number;
    /** Boxes marked from the end (V5 stains). */
    marks: number;
    length: number;
    markName: string;
    /** Said when a mark would land on a filled box. */
    refusedMessage: string;
    /** Accessible name of the group (e.g. "Humanity 7 of 10"), already translated. */
    groupLabel: string;
    disabled: boolean;
    onChange: (next: { value: number; marks: number }) => void;
}

/**
 * A score with marks from the other end (V5 Humanity and stains, spec 037 D7): boxes `1..value`
 * filled, the last `marks` boxes marked, never both. A click sets the score (the last filled
 * box lowers it), `S` marks or clears from the end, the arrows move the score.
 */
export function ScoreTrack({
    label,
    value,
    marks,
    length,
    markName,
    refusedMessage,
    groupLabel,
    disabled,
    onChange,
}: ScoreTrackProps) {
    const [refused, setRefused] = useState(false);
    const firstMarked = length - marks + 1;
    const setValue = (next: number) => {
        const bounded = Math.max(0, Math.min(next, length - marks));
        if (bounded !== value) onChange({ value: bounded, marks });
    };
    const toggleMark = (index: number) => {
        if (index <= value) {
            setRefused(true);
            return;
        }
        setRefused(false);
        onChange({ value, marks: index >= firstMarked ? length - index : length - index + 1 });
    };
    const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (event.key === 's' || event.key === 'S') {
            event.preventDefault();
            toggleMark(index);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            setValue(value + 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            setValue(value - 1);
        }
    };
    return (
        <div className="grid gap-1">
            <div role="group" aria-label={groupLabel} className="flex flex-wrap gap-1">
                {Array.from({ length }, (_, offset) => {
                    const index = offset + 1;
                    const state =
                        index <= value ? 'filled' : index >= firstMarked ? 'marked' : 'empty';
                    return (
                        <button
                            key={index}
                            type="button"
                            data-state={state}
                            disabled={disabled}
                            aria-label={`${label} ${index}${state === 'marked' ? `, ${markName}` : ''}`}
                            aria-pressed={state === 'filled'}
                            onClick={() => setValue(index === value ? index - 1 : index)}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                if (!disabled) toggleMark(index);
                            }}
                            onKeyDown={onKeyDown(index)}
                            className={clsx(
                                'flex h-5 w-5 items-center justify-center rounded-sm border text-xs leading-none disabled:cursor-not-allowed',
                                state === 'filled'
                                    ? 'border-primary bg-primary'
                                    : 'border-border bg-bgSurface',
                                state === 'marked' && 'text-error'
                            )}
                        >
                            {state === 'marked' ? '/' : ''}
                        </button>
                    );
                })}
            </div>
            {refused && (
                <p role="alert" className="text-xs text-error">
                    {refusedMessage}
                </p>
            )}
        </div>
    );
}
