import clsx from 'clsx';
import { Check, Minus } from 'lucide-react';

export type TickValue = 'checked' | 'unchecked' | 'partial';

/**
 * A tri-state box in the export and import trees. Parts ticked automatically for the user are the
 * library's one tertiary mark (FR-023); everything else uses primary.
 */
export function TickBox({
    value,
    auto = false,
    disabled = false,
    label,
    onToggle,
}: {
    value: TickValue;
    auto?: boolean;
    disabled?: boolean;
    label: string;
    onToggle: () => void;
}) {
    const on = value !== 'unchecked' || auto;
    return (
        <button
            type="button"
            role="checkbox"
            tabIndex={-1}
            aria-checked={auto ? true : value === 'partial' ? 'mixed' : value === 'checked'}
            aria-label={label}
            disabled={disabled}
            data-auto={auto ? 'true' : undefined}
            onClick={(event) => {
                event.stopPropagation();
                onToggle();
            }}
            className={clsx(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-40',
                auto
                    ? 'border-tertiary bg-tertiary text-white'
                    : on
                      ? 'border-primary-muted bg-primary-muted text-white'
                      : 'border-borderMoreContrast bg-bgSurface'
            )}
        >
            {value === 'partial' && !auto ? (
                <Minus className="h-3 w-3" aria-hidden="true" />
            ) : on ? (
                <Check className="h-3 w-3" aria-hidden="true" />
            ) : null}
        </button>
    );
}
