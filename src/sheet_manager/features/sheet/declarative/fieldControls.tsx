import { clsx } from 'clsx';

import type { TemplateField } from '../../../types/template';

/**
 * Per-type controls are rendered only after the dispatcher narrowed `field.type`; the
 * contained cast keeps their props honest without leaking `any`.
 */
type FieldType<K extends TemplateField['type']> = Extract<TemplateField, { type: K }>;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-2 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50';

export interface CatalogOption {
    value: string;
    label: string;
}

export interface DocumentOption {
    value: string;
    label: string;
}

export interface TemplateFieldControlProps {
    disabled: boolean;
    field: TemplateField;
    onChange: (value: unknown) => void;
    value: unknown;
    /** Resolved catalog options for a catalog-backed select (US3); absent → static options. */
    catalogOptions?: ReadonlyArray<CatalogOption>;
    /** Documents available for a reference control (provided by the hook layer). */
    documentOptions?: ReadonlyArray<DocumentOption>;
}

function toDisplay(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

export function TextFieldControl(props: TemplateFieldControlProps) {
    const { field, ...rest } = props;
    return TextFieldControlRender({ field: field as FieldType<'text'>, ...rest });
}

function TextFieldControlRender({
    disabled,
    field,
    onChange,
    value,
}: Omit<TemplateFieldControlProps, 'field'> & { field: FieldType<'text'> }) {
    if (field.multiline) {
        return (
            <textarea
                value={toDisplay(value)}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                aria-label={field.label}
                className={`${inputClasses} min-h-20 w-full`}
            />
        );
    }
    return (
        <input
            type="text"
            value={toDisplay(value)}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            aria-label={field.label}
            className={`${inputClasses} w-full`}
        />
    );
}

export function NumberFieldControl(props: TemplateFieldControlProps) {
    const { field, ...rest } = props;
    return NumberFieldControlRender({ field: field as FieldType<'number'>, ...rest });
}

function NumberFieldControlRender({
    disabled,
    field,
    onChange,
    value,
}: Omit<TemplateFieldControlProps, 'field'> & { field: FieldType<'number'> }) {
    return (
        <input
            type="number"
            value={typeof value === 'number' ? value : ''}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(event) =>
                onChange(event.target.value === '' ? undefined : Number(event.target.value))
            }
            disabled={disabled}
            aria-label={field.label}
            className={`${inputClasses} w-full`}
        />
    );
}

export function ToggleFieldControl({
    disabled,
    field,
    onChange,
    value,
}: TemplateFieldControlProps) {
    return (
        <input
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
            disabled={disabled}
            aria-label={field.label}
            className="h-4 w-4"
        />
    );
}

export function SelectFieldControl(props: TemplateFieldControlProps) {
    const { field, ...rest } = props;
    return SelectFieldControlRender({ field: field as FieldType<'select'>, ...rest });
}

function SelectFieldControlRender({
    catalogOptions,
    disabled,
    field,
    onChange,
    value,
}: Omit<TemplateFieldControlProps, 'field'> & { field: FieldType<'select'> }) {
    const options =
        field.binding && catalogOptions && catalogOptions.length > 0
            ? catalogOptions
            : field.options.map((option) => ({ value: option.id, label: option.label }));

    if (field.multiple) {
        const selected = Array.isArray(value) ? value : [];
        return (
            <select
                multiple
                value={selected}
                onChange={(event) =>
                    onChange(Array.from(event.target.selectedOptions, (option) => option.value))
                }
                disabled={disabled}
                className={`${inputClasses} w-full`}
                size={Math.min(4, Math.max(2, options.length))}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        );
    }

    return (
        <select
            value={typeof value === 'string' ? value : ''}
            onChange={(event) =>
                onChange(event.target.value === '' ? undefined : event.target.value)
            }
            disabled={disabled}
            aria-label={field.label}
            className={`${inputClasses} w-full`}
        >
            <option value="">—</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

export function RatingFieldControl(props: TemplateFieldControlProps) {
    const { field, ...rest } = props;
    return RatingFieldControlRender({ field: field as FieldType<'rating'>, ...rest });
}

function RatingFieldControlRender({
    disabled,
    field,
    onChange,
    value,
}: Omit<TemplateFieldControlProps, 'field'> & { field: FieldType<'rating'> }) {
    const current = typeof value === 'number' ? value : undefined;

    if (field.presentation === 'number') {
        return (
            <input
                type="number"
                value={current ?? ''}
                min={field.min}
                max={field.max}
                onChange={(event) =>
                    onChange(event.target.value === '' ? undefined : Number(event.target.value))
                }
                disabled={disabled}
                aria-label={field.label}
                className={`${inputClasses} w-20`}
            />
        );
    }

    const levels = Array.from(
        { length: field.max - field.min + 1 },
        (_, index) => field.min + index
    );

    return (
        <div className="flex items-center gap-1" role="group" aria-label={field.label}>
            {levels.map((level) => {
                const active = current !== undefined && level <= current;
                const shape =
                    field.presentation === 'dots'
                        ? active
                            ? 'bg-primary border-primary'
                            : 'bg-bgSurface border-border'
                        : active
                          ? 'bg-primary/30 border-primary'
                          : 'bg-bgSurface border-border';
                return (
                    <button
                        key={level}
                        type="button"
                        disabled={disabled}
                        aria-label={`${field.label}: ${level}`}
                        aria-pressed={active}
                        onClick={() =>
                            onChange(
                                current === level
                                    ? level - 1 < field.min
                                        ? undefined
                                        : level - 1
                                    : level
                            )
                        }
                        className={clsx(
                            'h-4 w-4 rounded-full border transition-colors',
                            shape,
                            'hover:border-primary'
                        )}
                    />
                );
            })}
            <span className="ml-2 text-xs text-textSecondary">
                {current ?? '—'}/{field.max}
            </span>
        </div>
    );
}

export function ResourceFieldControl(props: TemplateFieldControlProps) {
    const { field, ...rest } = props;
    return ResourceFieldControlRender({ field: field as FieldType<'resource'>, ...rest });
}

function ResourceFieldControlRender({
    disabled,
    field,
    onChange,
    value,
}: Omit<TemplateFieldControlProps, 'field'> & { field: FieldType<'resource'> }) {
    const resource =
        typeof value === 'object' && value !== null && 'current' in value && 'max' in value
            ? (value as { current: number; max: number })
            : { current: field.min, max: field.max };

    return (
        <div className="flex items-center gap-2">
            <input
                type="number"
                value={resource.current}
                min={field.min}
                max={field.max}
                onChange={(event) => onChange({ ...resource, current: Number(event.target.value) })}
                disabled={disabled}
                aria-label={`${field.label} — current`}
                className={`${inputClasses} w-20`}
            />
            <span className="text-xs text-textSecondary">/</span>
            <input
                type="number"
                value={resource.max}
                min={field.min}
                max={field.max}
                onChange={(event) => onChange({ ...resource, max: Number(event.target.value) })}
                disabled={disabled}
                aria-label={`${field.label} — max`}
                className={`${inputClasses} w-20`}
            />
        </div>
    );
}

export function ReferenceFieldControl(props: TemplateFieldControlProps) {
    const { field, ...rest } = props;
    return ReferenceFieldControlRender({ field: field as FieldType<'reference'>, ...rest });
}

function ReferenceFieldControlRender({
    disabled,
    field,
    documentOptions,
    onChange,
    value,
}: Omit<TemplateFieldControlProps, 'field'> & { field: FieldType<'reference'> }) {
    const docs = documentOptions ?? [];

    if (field.multiple) {
        const selected = Array.isArray(value) ? value : [];
        return (
            <select
                multiple
                value={selected}
                onChange={(event) =>
                    onChange(Array.from(event.target.selectedOptions, (option) => option.value))
                }
                disabled={disabled}
                aria-label={field.label}
                className={`${inputClasses} w-full`}
                size={Math.min(4, Math.max(2, docs.length))}
            >
                {docs.map((doc) => (
                    <option key={doc.value} value={doc.value}>
                        {doc.label}
                    </option>
                ))}
            </select>
        );
    }

    return (
        <select
            value={typeof value === 'string' ? value : ''}
            onChange={(event) =>
                onChange(event.target.value === '' ? undefined : event.target.value)
            }
            disabled={disabled}
            aria-label={field.label}
            className={`${inputClasses} w-full`}
        >
            <option value="">—</option>
            {docs.map((doc) => (
                <option key={doc.value} value={doc.value}>
                    {doc.label}
                </option>
            ))}
        </select>
    );
}

export function TemplateFieldControl(props: TemplateFieldControlProps) {
    switch (props.field.type) {
        case 'text':
            return <TextFieldControl {...props} />;
        case 'number':
            return <NumberFieldControl {...props} />;
        case 'toggle':
            return <ToggleFieldControl {...props} />;
        case 'select':
            return <SelectFieldControl {...props} />;
        case 'rating':
            return <RatingFieldControl {...props} />;
        case 'resource':
            return <ResourceFieldControl {...props} />;
        case 'reference':
            return <ReferenceFieldControl {...props} />;
    }
}
