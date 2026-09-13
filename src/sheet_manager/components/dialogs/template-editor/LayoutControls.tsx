import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';

import { TEMPLATE_LIMITS } from '../../../types/template';

const editor = uiMessages.sheet.templates.editor;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

/** Checkbox with its label and an optional explanatory hint underneath. */
export function ToggleRow({
    checked,
    disabled = false,
    hint,
    label,
    onChange,
}: {
    checked: boolean;
    disabled?: boolean;
    hint?: string;
    label: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="grid gap-0.5">
            <label
                className={clsx(
                    'flex items-center gap-2 text-xs text-textSecondary',
                    disabled && 'opacity-60'
                )}
            >
                <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.checked)}
                    className="h-3.5 w-3.5"
                />
                {label}
            </label>
            {hint && <p className="pl-5 text-[11px] text-textSecondary">{hint}</p>}
        </div>
    );
}

/**
 * Which column of the parent this element sits in. Shown only when the parent is split into
 * columns; "Auto" lets elements flow through the columns in order.
 */
export function ColumnPlacementControl({
    onChange,
    parentColumns,
    value,
}: {
    onChange: (column: number | undefined) => void;
    parentColumns: number;
    value: number | undefined;
}) {
    const options: Array<{ value: number | undefined; label: string }> = [
        { value: undefined, label: t(editor.columnAuto) },
        ...Array.from({ length: parentColumns }, (_, index) => ({
            value: index + 1,
            label: String(index + 1),
        })),
    ];
    return (
        <div className="grid gap-1 text-xs text-textSecondary">
            <span>{t(editor.columnPlacement)}</span>
            <div role="radiogroup" aria-label={t(editor.columnPlacement)} className="flex gap-1">
                {options.map((option) => {
                    const selected = option.value === value;
                    return (
                        <button
                            key={option.label}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(option.value)}
                            className={clsx(
                                'min-w-8 rounded border px-2 py-1 text-xs transition-colors',
                                selected
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-border bg-bgSurface text-textPrimary hover:border-primary'
                            )}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Column count plus optional proportional widths, with a live preview bar so the author sees
 * the split before saving.
 */
export function ColumnLayoutControl({
    columnWidths,
    columns,
    onChange,
}: {
    columnWidths: readonly number[] | undefined;
    columns: number | undefined;
    onChange: (updates: { columns?: number; columnWidths?: number[] }) => void;
}) {
    const count = columns ?? 1;
    const widths =
        columnWidths && columnWidths.length === count ? columnWidths : Array(count).fill(1);
    const equal = !columnWidths || columnWidths.length !== count;
    const setWidth = (index: number, width: number) => {
        const next = [...widths];
        next[index] = Math.min(12, Math.max(1, Math.trunc(width) || 1));
        onChange({ columns: count, columnWidths: next });
    };

    return (
        <div className="grid gap-2">
            <select
                value={count}
                onChange={(event) => {
                    const next = Number(event.target.value);
                    // Widths belong to a specific column count; changing it resets them.
                    onChange({ columns: next === 1 ? undefined : next, columnWidths: undefined });
                }}
                aria-label={t(editor.columns)}
                className={inputClasses}
            >
                {Array.from({ length: TEMPLATE_LIMITS.columnsMax }, (_, index) => index + 1).map(
                    (option) => (
                        <option key={option} value={option}>
                            {t(editor.columns)}: {option}
                        </option>
                    )
                )}
            </select>
            {count > 1 && (
                <>
                    <ToggleRow
                        checked={equal}
                        label={t(editor.equalWidths)}
                        onChange={(checked) =>
                            onChange({
                                columns: count,
                                columnWidths: checked ? undefined : Array(count).fill(1),
                            })
                        }
                    />
                    {!equal && (
                        <div className="grid gap-1">
                            <div className="flex flex-wrap gap-2">
                                {widths.map((width, index) => (
                                    <input
                                        key={index}
                                        type="number"
                                        min={1}
                                        max={12}
                                        value={width}
                                        onChange={(event) =>
                                            setWidth(index, Number(event.target.value))
                                        }
                                        aria-label={t(editor.columnWidth, { index: index + 1 })}
                                        className={`${inputClasses} w-16`}
                                    />
                                ))}
                            </div>
                            <p className="text-[11px] text-textSecondary">
                                {t(editor.columnWidthsHint)}
                            </p>
                        </div>
                    )}
                    <div className="flex h-3 gap-1" aria-hidden="true" data-testid="column-preview">
                        {widths.map((width, index) => (
                            <div
                                key={index}
                                className="rounded-sm bg-primary/40"
                                style={{ flexGrow: width, flexBasis: 0 }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
