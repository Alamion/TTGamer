import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { clsx } from 'clsx';

import type { VisibleWhen } from '../../../types/template';
import { TEMPLATE_LIMITS } from '../../../types/template';
import { EditorHelp } from './EditorHelp';

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
 * How many columns of the parent this element spans. Spans apply in flowing layouts only: once
 * an element of the container is pinned to a column, every element stacks in one column.
 */
export function ColumnSpanControl({
    onChange,
    parentColumns,
    pinnedSiblings,
    value,
}: {
    onChange: (span: number | undefined) => void;
    parentColumns: number;
    pinnedSiblings: boolean;
    value: number | undefined;
}) {
    const current = value ?? 1;
    return (
        <div className="grid gap-1 text-xs text-textSecondary">
            <span>{t(editor.columnSpan)}</span>
            <div role="radiogroup" aria-label={t(editor.columnSpan)} className="flex gap-1">
                {Array.from({ length: parentColumns }, (_, index) => index + 1).map((span) => {
                    const selected = span === current;
                    return (
                        <button
                            key={span}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(span === 1 ? undefined : span)}
                            className={clsx(
                                'min-w-8 rounded border px-2 py-1 text-xs transition-colors',
                                selected
                                    ? 'border-primary-muted bg-primary-muted text-white'
                                    : 'border-border bg-bgSurface text-textPrimary hover:border-primary'
                            )}
                        >
                            {span}
                        </button>
                    );
                })}
            </div>
            {pinnedSiblings && current > 1 && (
                <p className="text-[11px]">{t(editor.columnSpanPinnedHint)}</p>
            )}
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
                                    ? 'border-primary-muted bg-primary-muted text-white'
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
            <div className="flex items-center gap-2">
                <select
                    value={count}
                    onChange={(event) => {
                        const next = Number(event.target.value);
                        // Widths belong to a specific column count; changing it resets them.
                        onChange({
                            columns: next === 1 ? undefined : next,
                            columnWidths: undefined,
                        });
                    }}
                    aria-label={t(editor.columns)}
                    className={inputClasses}
                >
                    {Array.from(
                        { length: TEMPLATE_LIMITS.columnsMax },
                        (_, index) => index + 1
                    ).map((option) => (
                        <option key={option} value={option}>
                            {t(editor.columns)}: {option}
                        </option>
                    ))}
                </select>
                <EditorHelp topic="columns" about={t(editor.columns)} />
            </div>
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
                                    <NumberInput
                                        key={index}
                                        min={1}
                                        max={12}
                                        step={1}
                                        optional={false}
                                        value={width}
                                        onChange={(value) => setWidth(index, value ?? width)}
                                        label={t(editor.columnWidth, { index: index + 1 })}
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

/**
 * Render condition: the element shows only while a stored value equals (or differs from) the
 * given value. Numbers and true/false are stored typed; everything else as text.
 */
export function VisibilityControl({
    onChange,
    value,
}: {
    onChange: (next: VisibleWhen | undefined) => void;
    value: VisibleWhen | undefined;
}) {
    const typed = (raw: string): VisibleWhen['equals'] =>
        raw === 'true'
            ? true
            : raw === 'false'
              ? false
              : /^-?\d+(\.\d+)?$/.test(raw)
                ? Number(raw)
                : raw;
    return (
        <div className="grid gap-1">
            <div className="flex items-center gap-1">
                <ToggleRow
                    checked={value !== undefined}
                    label={t(editor.visibleWhen)}
                    onChange={(checked) =>
                        onChange(checked ? { coordinate: 'value', equals: '' } : undefined)
                    }
                />
                <EditorHelp topic="displayConditions" about={t(editor.visibleWhen)} />
            </div>
            {value && (
                <div className="flex flex-wrap items-center gap-2 pl-5">
                    <input
                        value={value.coordinate}
                        onChange={(event) => onChange({ ...value, coordinate: event.target.value })}
                        aria-label={t(editor.visibleWhenCoordinate)}
                        placeholder={t(editor.visibleWhenCoordinate)}
                        className={`${inputClasses} w-40`}
                    />
                    <select
                        value={value.not ? 'not' : 'equals'}
                        onChange={(event) =>
                            onChange({ ...value, not: event.target.value === 'not' || undefined })
                        }
                        aria-label={t(editor.visibleWhenOperator)}
                        className={inputClasses}
                    >
                        <option value="equals">=</option>
                        <option value="not">≠</option>
                    </select>
                    <input
                        value={String(value.equals)}
                        onChange={(event) =>
                            onChange({ ...value, equals: typed(event.target.value) })
                        }
                        aria-label={t(editor.visibleWhenValue)}
                        placeholder={t(editor.visibleWhenValue)}
                        className={`${inputClasses} w-32`}
                    />
                </div>
            )}
        </div>
    );
}
