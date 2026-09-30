import { Minus, Plus } from 'lucide-react';

/** Optional length regulator: shorten/extend the track (a missing handler disables the side). */
export interface ConditionTrackLengthControl {
    onDecrease?: () => void;
    onIncrease?: () => void;
    decreaseLabel: string;
    increaseLabel: string;
}

/** The −/+ pair of a tracker's length regulator. */
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
