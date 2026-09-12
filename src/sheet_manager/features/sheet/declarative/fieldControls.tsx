import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
    getSafePortraitUrl,
    loadPortrait,
    savePortrait,
} from '../../../persistence/portraitStorage';
import type { TemplateField } from '../../../types/template';
import type { TemplateImageValue } from '../../../types/templateValues';

const page = uiMessages.sheet.templates.page;

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
    /**
     * Computed maximum for rating/number fields with `maxFrom` (FR-12): display clamps to it;
     * absent when no cap or the source is unavailable (labeled degraded state instead).
     */
    resolvedMax?: number;
    /** True when a `maxFrom` source is unavailable — the control shows the degraded state. */
    maxDegraded?: boolean;
    /** Read-only formula result for formula fields (computed by the hook layer, never stored). */
    formulaResult?: { state: 'ok'; value: number } | { state: 'error'; message: string };
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
    maxDegraded,
    onChange,
    resolvedMax,
    value,
}: Omit<TemplateFieldControlProps, 'field'> & { field: FieldType<'number'> }) {
    const effectiveMax = resolvedMax ?? field.max;
    const current = typeof value === 'number' ? value : undefined;
    return (
        <div>
            <input
                type="number"
                value={current === undefined ? '' : Math.min(current, effectiveMax ?? Infinity)}
                min={field.min}
                max={effectiveMax}
                step={field.step}
                onChange={(event) =>
                    onChange(event.target.value === '' ? undefined : Number(event.target.value))
                }
                disabled={disabled}
                aria-label={field.label}
                className={`${inputClasses} w-full`}
            />
            {maxDegraded && (
                <p role="alert" className="text-xs text-error">
                    {translate(page.formulaDegraded, {
                        field: field.label,
                        reason: translate(page.formulaReasonUnknown).replace('{coordinate}', ''),
                    })}
                </p>
            )}
        </div>
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
    maxDegraded,
    onChange,
    resolvedMax,
    value,
}: Omit<TemplateFieldControlProps, 'field'> & { field: FieldType<'rating'> }) {
    const effectiveMax = resolvedMax ?? field.max;
    const stored = typeof value === 'number' ? value : undefined;
    // Display clamp (A4): a lowered computed maximum hides the excess without rewriting
    // the stored value; raising the maximum re-exposes the full range.
    const current = stored === undefined ? undefined : Math.min(stored, effectiveMax);

    if (field.presentation === 'number') {
        return (
            <div>
                <input
                    type="number"
                    value={current ?? ''}
                    min={field.min}
                    max={effectiveMax}
                    onChange={(event) =>
                        onChange(event.target.value === '' ? undefined : Number(event.target.value))
                    }
                    disabled={disabled}
                    aria-label={field.label}
                    className={`${inputClasses} w-20`}
                />
                {maxDegraded && (
                    <p role="alert" className="text-xs text-error">
                        {translate(page.formulaDegraded, {
                            field: field.label,
                            reason: translate(page.formulaReasonUnknown).replace(
                                '{coordinate}',
                                ''
                            ),
                        })}
                    </p>
                )}
            </div>
        );
    }

    const levels = Array.from(
        { length: Math.max(0, effectiveMax - field.min + 1) },
        (_, index) => field.min + index
    );

    return (
        <div>
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
                    {current ?? '—'}/{effectiveMax}
                    {stored !== undefined && stored > current! && (
                        <span className="ml-1 text-error" title={translate(page.formulaClamped)}>
                            ({stored})
                        </span>
                    )}
                </span>
            </div>
            {maxDegraded && (
                <p role="alert" className="text-xs text-error">
                    {translate(page.formulaDegraded, {
                        field: field.label,
                        reason: translate(page.formulaReasonUnknown).replace('{coordinate}', ''),
                    })}
                </p>
            )}
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

export function ImageFieldControl({ disabled, onChange, value }: TemplateFieldControlProps) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const image =
        typeof value === 'object' &&
        value !== null &&
        'source' in value &&
        ((value as TemplateImageValue).source === 'device' ||
            (value as TemplateImageValue).source === 'url')
            ? (value as TemplateImageValue)
            : undefined;
    const [deviceImage, setDeviceImage] = useState<{ blobId: string; url: string } | undefined>();
    const [urlDraft, setUrlDraft] = useState('');
    const [error, setError] = useState<string | undefined>();

    useEffect(() => {
        if (image?.source !== 'device') return;
        let cancelled = false;
        void (async () => {
            const blob = await loadPortrait(image.blobId);
            if (cancelled) return;
            if (blob) setDeviceImage({ blobId: image.blobId, url: URL.createObjectURL(blob) });
        })();
        return () => {
            cancelled = true;
        };
    }, [image]);

    // Only the blob matching the current value resolves to a URL — stale loads stay inert.
    const deviceUrl =
        image?.source === 'device' && deviceImage?.blobId === image.blobId
            ? deviceImage.url
            : undefined;

    const src =
        image?.source === 'url'
            ? getSafePortraitUrl(image.url)
            : image?.source === 'device'
              ? deviceUrl
              : undefined;

    const handleUpload = async (file: File | undefined) => {
        if (!file) return;
        try {
            const blobId = await savePortrait(file);
            setError(undefined);
            onChange({ source: 'device', blobId });
        } catch {
            setError(t(page.imageInvalid));
        }
    };

    const commitUrl = () => {
        const safe = getSafePortraitUrl(urlDraft.trim());
        if (urlDraft.trim().length === 0) return;
        if (!safe) {
            setError(t(page.imageInvalid));
            return;
        }
        setError(undefined);
        onChange({ source: 'url', url: safe });
    };

    return (
        <div className="grid gap-2">
            {src && (
                <img
                    src={src}
                    alt={t(page.imageAlt)}
                    referrerPolicy="no-referrer"
                    className="max-h-64 w-auto rounded border border-border"
                />
            )}
            {image && !src && (
                <p role="alert" className="text-xs text-error">
                    {t(page.imageInvalid)}
                </p>
            )}
            {error && (
                <p role="alert" className="text-xs text-error">
                    {error}
                </p>
            )}
            {!disabled && (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface">
                        {t(page.imageUpload)}
                        <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            aria-label={t(page.imageUpload)}
                            onChange={(event) => void handleUpload(event.target.files?.[0])}
                        />
                    </label>
                    <input
                        type="url"
                        value={urlDraft}
                        onChange={(event) => setUrlDraft(event.target.value)}
                        onBlur={commitUrl}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                commitUrl();
                            }
                        }}
                        placeholder={t(uiMessages.sheet.base.portrait.urlPlaceholder)}
                        aria-label={t(page.imageUrl)}
                        disabled={disabled}
                        className={`${inputClasses} w-64`}
                    />
                    {image && (
                        <button
                            type="button"
                            onClick={() => onChange(undefined)}
                            aria-label={t(page.imageRemove)}
                            className="rounded p-1 text-textSecondary hover:text-error"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function FormulaFieldControlRender({
    field,
    formulaResult,
}: Omit<TemplateFieldControlProps, 'field'> & { field: FieldType<'formula'> }) {
    // Read-only computed value (FR-13): never stored, always recomputed by the hook layer;
    // failures surface as explicit labeled error states, never a silently wrong number.
    return (
        <div className="rounded border border-border bg-bgBase px-2 py-2 text-sm text-textPrimary">
            {formulaResult?.state === 'ok' ? (
                <span>{formulaResult.value}</span>
            ) : formulaResult?.state === 'error' ? (
                <span role="alert" className="text-xs text-error">
                    {formulaResult.message}
                </span>
            ) : (
                <span className="text-xs text-textSecondary">—</span>
            )}
            <span className="ml-2 text-xs text-textSecondary">{field.label}</span>
        </div>
    );
}

export function FormulaFieldControl(props: TemplateFieldControlProps) {
    const { field, ...rest } = props;
    return FormulaFieldControlRender({ field: field as FieldType<'formula'>, ...rest });
}
