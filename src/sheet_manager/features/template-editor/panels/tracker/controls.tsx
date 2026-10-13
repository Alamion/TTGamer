import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';

export const text = uiMessages.sheet.templates.tracker;
export const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

export const inputClasses =
    'rounded-sm border border-border bg-bgSurface px-2 py-1 text-sm text-textPrimary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-60';
export const iconButton =
    'grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-border text-textSecondary hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-border disabled:hover:text-textSecondary';

export function move<T>(list: readonly T[], index: number, step: -1 | 1): T[] {
    const next = [...list];
    const target = index + step;
    if (target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next;
}

export function Group({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 border-0 border-t border-border p-0 pt-3">
            <legend className="text-xs font-semibold text-textPrimary">{title}</legend>
            {hint && <p className="m-0 text-[11px] text-textSecondary">{hint}</p>}
            {children}
        </fieldset>
    );
}

export function RowButtons({
    index,
    count,
    locked,
    labels,
    onMove,
    onRemove,
}: {
    index: number;
    count: number;
    locked: boolean;
    labels: { up: string; down: string; remove: string };
    onMove: (step: -1 | 1) => void;
    onRemove: () => void;
}) {
    return (
        <span className="flex items-center gap-0.5">
            <button
                type="button"
                aria-label={labels.up}
                title={labels.up}
                disabled={locked || index === 0}
                onClick={() => onMove(-1)}
                className={iconButton}
            >
                <ArrowUp className="h-3 w-3" aria-hidden="true" />
            </button>
            <button
                type="button"
                aria-label={labels.down}
                title={labels.down}
                disabled={locked || index === count - 1}
                onClick={() => onMove(1)}
                className={iconButton}
            >
                <ArrowDown className="h-3 w-3" aria-hidden="true" />
            </button>
            <button
                type="button"
                aria-label={labels.remove}
                title={labels.remove}
                disabled={locked || count === 1}
                onClick={onRemove}
                className={iconButton}
            >
                <X className="h-3 w-3" aria-hidden="true" />
            </button>
        </span>
    );
}

export function AddButton({
    label,
    disabled,
    onClick,
}: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="flex items-center gap-1 justify-self-start rounded-sm px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
        >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
        </button>
    );
}
