import { z } from 'zod';

import type { TemplateField } from './template';

/**
 * Envelope-layer limits for the per-document template value bag. The bag is intentionally
 * permissive (it cannot resolve which template owns a key); strict shape validation happens
 * on the write path where the owning template is available.
 */
export const TEMPLATE_VALUES_LIMITS = {
    templatesPerDocument: 100,
    entriesPerTemplate: 2_000,
    stringMaxLength: 10_000,
    listEntriesMax: 1_000,
} as const;

const boundedString = z.string().max(TEMPLATE_VALUES_LIMITS.stringMaxLength);

/** Scalars plus bounded id lists (multi-select / multi-reference values). */
const PrimitiveValueSchema = z.union([
    boundedString,
    z.number().finite(),
    z.boolean(),
    z.array(boundedString),
]);

export const TemplateResourceValueSchema = z
    .object({
        current: z.number().finite().int(),
        max: z.number().finite().int(),
    })
    .strict();

export type TemplateResourceValue = z.infer<typeof TemplateResourceValueSchema>;

/** One custom-list entry (feature 006): stable id, name, optional rating. */
export const TemplateListEntrySchema = z.object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(120),
    value: z.number().int().min(0).max(20).optional(),
});

export const TemplateListValueSchema = z
    .array(TemplateListEntrySchema)
    .max(TEMPLATE_VALUES_LIMITS.listEntriesMax);

export type TemplateListValue = z.infer<typeof TemplateListValueSchema>;

/**
 * Per-document image value (feature 006): device-local blob reference (IndexedDB, excluded
 * from JSON exports) or a secure remote URL. Envelope layer is permissive; strict source
 * rules (HTTPS-only URLs) apply at the write path and render.
 */
export const TemplateImageValueSchema = z.union([
    z.object({ source: z.literal('device'), blobId: z.string().min(1).max(128) }).strict(),
    // URL sources must be HTTPS (site-relative resources stay portrait-owned, not template data).
    z.object({ source: z.literal('url'), url: z.string().url().startsWith('https://') }).strict(),
]);

export type TemplateImageValue = z.infer<typeof TemplateImageValueSchema>;

/** One table cell: a primitive or a resource value. */
export const TemplateTableCellSchema = z.union([PrimitiveValueSchema, TemplateResourceValueSchema]);

/** One table row: column id → cell. */
export const TemplateTableRowSchema = z.record(z.string().min(1).max(64), TemplateTableCellSchema);

/** Table block value stored under the block id: row index → row. */
export const TemplateTableRowsSchema = z.record(z.string().min(1).max(64), TemplateTableRowSchema);

export type TemplateTableRows = z.infer<typeof TemplateTableRowsSchema>;

/** One template's page values: field/block id → value (sparse; only filled entries exist). */
export const TemplatePageValuesSchema = z
    .record(
        z.string().min(1).max(64),
        z.union([
            PrimitiveValueSchema,
            TemplateResourceValueSchema,
            TemplateTableRowsSchema,
            TemplateListValueSchema,
            TemplateImageValueSchema,
        ])
    )
    .refine((values) => Object.keys(values).length <= TEMPLATE_VALUES_LIMITS.entriesPerTemplate, {
        message: `At most ${TEMPLATE_VALUES_LIMITS.entriesPerTemplate} stored entries per template`,
    });

export type TemplatePageValues = z.infer<typeof TemplatePageValuesSchema>;

export type TemplateFieldValue =
    | string
    | number
    | boolean
    | string[]
    | TemplateResourceValue
    | TemplateTableRows
    | TemplateListValue
    | TemplateImageValue;

export type ValidateValueResult =
    | { ok: true; value: TemplateFieldValue }
    | { ok: false; reason: 'type' | 'bounds' | 'options' };

function isResourceCandidate(value: unknown): value is { current: unknown; max: unknown } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'current' in value &&
        'max' in value &&
        Object.keys(value as Record<string, unknown>).every(
            (key) => key === 'current' || key === 'max'
        )
    );
}

function validateText(value: unknown): ValidateValueResult {
    return typeof value === 'string' ? { ok: true, value } : { ok: false, reason: 'type' };
}

function validateNumber(
    field: Extract<TemplateField, { type: 'number' }>,
    value: unknown
): ValidateValueResult {
    if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, reason: 'type' };
    if (field.min !== undefined && value < field.min) return { ok: false, reason: 'bounds' };
    if (field.max !== undefined && value > field.max) return { ok: false, reason: 'bounds' };
    return { ok: true, value };
}

function validateToggle(value: unknown): ValidateValueResult {
    return typeof value === 'boolean' ? { ok: true, value } : { ok: false, reason: 'type' };
}

function validateSelect(
    field: Extract<TemplateField, { type: 'select' }>,
    value: unknown
): ValidateValueResult {
    const allowed = new Set(field.options.map((option) => option.id));
    const isCatalogBacked = field.binding !== undefined;

    if (field.multiple) {
        if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
            return { ok: false, reason: 'type' };
        }
        const ids = value as string[];
        if (new Set(ids).size !== ids.length) return { ok: false, reason: 'options' };
        if (!isCatalogBacked && ids.some((id) => !allowed.has(id))) {
            return { ok: false, reason: 'options' };
        }
        return { ok: true, value: ids };
    }

    if (typeof value !== 'string') return { ok: false, reason: 'type' };
    // Catalog-backed selections are validated against live catalog entries at render time.
    if (!isCatalogBacked && !allowed.has(value)) return { ok: false, reason: 'options' };
    return { ok: true, value };
}

function validateRating(
    field: Extract<TemplateField, { type: 'rating' }>,
    value: unknown
): ValidateValueResult {
    if (typeof value !== 'number' || !Number.isInteger(value)) return { ok: false, reason: 'type' };
    if (value < field.min || value > field.max) return { ok: false, reason: 'bounds' };
    return { ok: true, value };
}

function validateResource(
    field: Extract<TemplateField, { type: 'resource' }>,
    value: unknown
): ValidateValueResult {
    if (!isResourceCandidate(value)) return { ok: false, reason: 'type' };
    const { current, max } = value;
    if (typeof current !== 'number' || typeof max !== 'number')
        return { ok: false, reason: 'type' };
    if (!Number.isInteger(current) || !Number.isInteger(max)) return { ok: false, reason: 'type' };
    if (current < field.min || current > field.max || max < field.min || max > field.max) {
        return { ok: false, reason: 'bounds' };
    }
    return { ok: true, value: { current, max } };
}

function validateReference(
    field: Extract<TemplateField, { type: 'reference' }>,
    value: unknown
): ValidateValueResult {
    if (field.multiple) {
        if (
            !Array.isArray(value) ||
            value.some((entry) => typeof entry !== 'string' || entry.length === 0)
        ) {
            return { ok: false, reason: 'type' };
        }
        const ids = value as string[];
        if (new Set(ids).size !== ids.length) return { ok: false, reason: 'options' };
        return { ok: true, value: ids };
    }
    return typeof value === 'string' && value.length > 0
        ? { ok: true, value }
        : { ok: false, reason: 'type' };
}

/** Strict write-path validation for a stored custom-list value (feature 006, FR-17). */
export function validateListValue(value: unknown): ValidateValueResult {
    const result = TemplateListValueSchema.safeParse(value);
    return result.success
        ? { ok: true, value: result.data }
        : { ok: false, reason: Array.isArray(value) ? 'bounds' : 'type' };
}

/** Strict write-path validation for a stored image value (feature 006, FR-16). */
export function validateImageValue(value: unknown): ValidateValueResult {
    const result = TemplateImageValueSchema.safeParse(value);
    return result.success ? { ok: true, value: result.data } : { ok: false, reason: 'type' };
}

/** Strict write-path validation for one stored value against its template field definition. */
export function validateTemplateValue(field: TemplateField, value: unknown): ValidateValueResult {
    switch (field.type) {
        case 'text':
            return validateText(value);
        case 'number':
            return validateNumber(field, value);
        case 'toggle':
            return validateToggle(value);
        case 'select':
            return validateSelect(field, value);
        case 'rating':
            return validateRating(field, value);
        case 'resource':
            return validateResource(field, value);
        case 'reference':
            return validateReference(field, value);
        case 'image':
            return validateImageValue(value);
        case 'formula':
            // Formula results are computed, never stored (spec A4).
            return { ok: false, reason: 'type' };
    }
}

/**
 * Read-layer coercion for values stored before a template edit (type changes, legacy data).
 * Keeps compatible values, applies a safe conversion where possible, otherwise yields
 * `undefined` — stored data is never mutated or deleted by the renderer.
 */
export function coerceStoredValue(
    field: TemplateField,
    value: unknown
): TemplateFieldValue | undefined {
    const result = validateTemplateValue(field, value);
    if (result.ok) return result.value;

    switch (field.type) {
        case 'text':
            if (typeof value === 'number' || typeof value === 'boolean') {
                return String(value);
            }
            if (isResourceCandidate(value)) {
                return `${value.current}/${value.max}`;
            }
            return undefined;
        case 'number': {
            if (typeof value === 'string') {
                const parsed = Number(value);
                if (Number.isFinite(parsed))
                    return validateNumber(field, parsed).ok ? parsed : undefined;
            }
            if (typeof value === 'boolean') return value ? 1 : 0;
            return undefined;
        }
        case 'toggle':
            if (value === 'true') return true;
            if (value === 'false') return false;
            if (typeof value === 'number') return value !== 0;
            return undefined;
        case 'rating':
        case 'resource':
        case 'image':
        case 'formula':
            return undefined;
        case 'select':
            if (field.multiple && typeof value === 'string') return [value];
            if (!field.multiple && Array.isArray(value) && typeof value[0] === 'string') {
                return value[0];
            }
            return undefined;
        case 'reference':
            if (field.multiple && typeof value === 'string') return [value];
            if (!field.multiple && Array.isArray(value) && typeof value[0] === 'string') {
                return value[0];
            }
            return undefined;
    }
}
