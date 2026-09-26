import { useState } from 'react';

interface NumberBounds {
    min?: number;
    max?: number;
    step?: number;
}

/** Clamps to the bounds and snaps to the step grid anchored at the minimum (or zero). */
export function boundNumber(value: number, { min, max, step }: NumberBounds): number {
    let next = value;
    if (step !== undefined && step > 0) {
        const origin = min ?? 0;
        // Round away float noise (0.1 steps) before comparing against the bounds.
        next = Number((origin + Math.round((next - origin) / step) * step).toFixed(10));
    }
    if (max !== undefined && next > max) next = max;
    if (min !== undefined && next < min) next = min;
    return next;
}

const parse = (text: string) => Number(text.replace(',', '.'));

interface NumberInputProps extends NumberBounds {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    label: string;
    className: string;
    disabled?: boolean;
    placeholder?: string;
    /** Clearing the input stores `undefined`; otherwise an emptied input restores the value. */
    optional?: boolean;
}

/**
 * A numeric text input. Browsers let any text into `type="number"` (Firefox) and bound only
 * the spinner, so this input accepts digits, one sign, and one decimal separator; in-range
 * values are written at once, anything else is bounded on blur or Enter; arrows step.
 */
export function NumberInput({
    className,
    disabled,
    label,
    max,
    min,
    onChange,
    optional = true,
    placeholder,
    step,
    value,
}: NumberInputProps) {
    const shown = value === undefined ? '' : String(value);
    const [draft, setDraft] = useState(shown);
    const [lastShown, setLastShown] = useState(shown);
    if (shown !== lastShown) {
        setLastShown(shown);
        setDraft(shown);
    }
    const bounds = { min, max, step };
    const integer = step !== undefined && Number.isInteger(step);
    const signed = min === undefined || min < 0;
    const accepted = new RegExp(`^${signed ? '-?' : ''}\\d*${integer ? '' : '([.,]\\d*)?'}$`);

    const write = (next: number | undefined) => {
        setDraft(next === undefined ? '' : String(next));
        if (next !== value) onChange(next);
    };

    const commit = () => {
        if (draft === '' || draft === '-') {
            write(optional ? undefined : value);
            return;
        }
        const parsed = parse(draft);
        write(Number.isFinite(parsed) ? boundNumber(parsed, bounds) : value);
    };

    const stepBy = (direction: 1 | -1) => {
        const base = draft === '' ? (value ?? min ?? 0) : parse(draft);
        if (!Number.isFinite(base)) return;
        write(boundNumber(base + direction * (step ?? 1), bounds));
    };

    return (
        <input
            type="text"
            role="spinbutton"
            inputMode={integer ? 'numeric' : 'decimal'}
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            value={draft}
            onChange={(event) => {
                const text = event.target.value.trim();
                if (!accepted.test(text)) return;
                setDraft(text);
                if (text === '' || text === '-') {
                    if (text === '' && optional) onChange(undefined);
                    return;
                }
                const parsed = parse(text);
                if (Number.isFinite(parsed) && boundNumber(parsed, bounds) === parsed) {
                    onChange(parsed);
                }
            }}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === 'Enter') commit();
                else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    stepBy(event.key === 'ArrowUp' ? 1 : -1);
                }
            }}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={label}
            className={className}
        />
    );
}
