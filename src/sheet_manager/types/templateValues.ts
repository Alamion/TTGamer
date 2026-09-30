import { z } from 'zod';

import type { ListItemField, TemplateField, TrackerColumn } from './template';
import { TEMPLATE_LIMITS } from './templateLimits';

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
// A 64-character column id plus the picked-name suffix (`#label`, spec 015).
export const TemplateTableRowSchema = z.record(z.string().min(1).max(72), TemplateTableCellSchema);

/** Table block value stored under the block id: row index → row. */
export const TemplateTableRowsSchema = z.record(z.string().min(1).max(64), TemplateTableRowSchema);

export type TemplateTableRows = z.infer<typeof TemplateTableRowsSchema>;

/**
 * A rating's text and trait flags (spec 014, R1). Stored beside the rating's number under
 * `ratingDetailKey(valueKey)`, so formulas, conditions, and shared keys keep reading a number.
 */
export const RatingDetailSchema = z
    .object({
        text: boundedString.optional(),
        specialization: z.boolean().optional(),
        practiced: z.boolean().optional(),
        experienced: z.boolean().optional(),
    })
    .strict();

export type RatingDetail = z.infer<typeof RatingDetailSchema>;

const RATING_DETAIL_SUFFIX = '#detail';

/** `#` never occurs in a template identifier, so the key cannot collide with a value key. */
export function ratingDetailKey(valueKey: string): string {
    return `${valueKey}${RATING_DETAIL_SUFFIX}`;
}

/** The rating's value key for a detail key, or `undefined` for any other key. */
export function ratingDetailBase(key: string): string | undefined {
    return key.endsWith(RATING_DETAIL_SUFFIX)
        ? key.slice(0, -RATING_DETAIL_SUFFIX.length)
        : undefined;
}

const PICK_LABEL_SUFFIX = '#label';

/**
 * Where a pick from a user catalog keeps the entry's name (spec 015, R3): beside the stored entry
 * id, so a document still shows what it picked after the entry or catalog is deleted.
 */
export function pickLabelKey(key: string): string {
    return `${key}${PICK_LABEL_SUFFIX}`;
}

/** The value key (or column id) of a picked-name key, or `undefined` for any other key. */
export function pickLabelBase(key: string): string | undefined {
    return key.endsWith(PICK_LABEL_SUFFIX) ? key.slice(0, -PICK_LABEL_SUFFIX.length) : undefined;
}

export const PickLabelSchema = z.string().max(120);

/**
 * One custom-list entry (spec 016): stable id, the typed name (named lists), and one value of
 * the list's entry template, with the companions a page field keeps under `#detail` / `#label`.
 * Entries saved before spec 016 (`{id, label, value: 0–20}`) are legacy rating entries as is.
 */
export const TemplateListEntrySchema = z.object({
    id: z.string().min(1).max(64),
    label: z.string().max(120).optional(),
    value: z.union([TemplateTableCellSchema, TemplateImageValueSchema]).optional(),
    detail: RatingDetailSchema.optional(),
    pickLabel: PickLabelSchema.optional(),
});

export type TemplateListEntry = z.infer<typeof TemplateListEntrySchema>;

export const TemplateListValueSchema = z
    .array(TemplateListEntrySchema)
    .max(TEMPLATE_VALUES_LIMITS.listEntriesMax);

export type TemplateListValue = z.infer<typeof TemplateListValueSchema>;

const trackerIdSchema = z.string().min(1).max(64);

/**
 * One copy of a tracker column (spec 018): marks by level id → mark kind id, notes by level id.
 * Ids of levels, kinds, or columns the tracker no longer has stay stored and are not shown; the
 * record bounds leave room for them without letting the value grow without end.
 */
export const TrackerCopyValueSchema = z
    .object({
        id: trackerIdSchema,
        marks: z
            .record(trackerIdSchema, trackerIdSchema)
            .refine((marks) => Object.keys(marks).length <= TEMPLATE_LIMITS.trackerLevelsMax * 2)
            .optional(),
        texts: z
            .record(trackerIdSchema, z.string().max(TEMPLATE_LIMITS.trackerTextMax))
            .refine((texts) => Object.keys(texts).length <= TEMPLATE_LIMITS.trackerLevelsMax * 2)
            .optional(),
    })
    .strict();

export type TrackerCopyValue = z.infer<typeof TrackerCopyValueSchema>;

/** An own tracker's value, or a built-in tracker's extra columns (spec 018, R3). */
export const TrackerValueSchema = z
    .object({
        /** Shape tag and version: tells the value apart from every other page value. */
        tracker: z.literal(1),
        /** Index into the tracker's lengths. */
        length: z
            .number()
            .int()
            .min(0)
            .max(TEMPLATE_LIMITS.trackerLengthsMax - 1)
            .optional(),
        columns: z
            .record(
                trackerIdSchema,
                z.array(TrackerCopyValueSchema).max(TEMPLATE_LIMITS.trackerCopiesMax)
            )
            .refine(
                (columns) => Object.keys(columns).length <= TEMPLATE_LIMITS.trackerColumnsMax * 4
            ),
    })
    .strict();

export type TrackerValue = z.infer<typeof TrackerValueSchema>;

/**
 * Write-path validation of a tracker value against its columns: the shape, and no more copies
 * than a column allows. Unknown ids pass, so hidden values survive the next write.
 */
export function validateTrackerValue(
    columns: readonly TrackerColumn[],
    value: unknown
): ValidateValueResult {
    const parsed = TrackerValueSchema.safeParse(value);
    if (!parsed.success) return { ok: false, reason: 'type' };
    for (const column of columns) {
        const copies = parsed.data.columns[column.id];
        if (copies && copies.length > (column.copies?.max ?? 1)) {
            return { ok: false, reason: 'bounds' };
        }
    }
    return { ok: true, value: parsed.data };
}

/** Stored detail, or empty text with all flags off when missing or malformed. */
export function readRatingDetail(value: unknown): RatingDetail {
    const parsed = RatingDetailSchema.safeParse(value);
    return parsed.success ? parsed.data : {};
}

/** One template's page values: field/block id → value (sparse; only filled entries exist). */
export const TemplatePageValuesSchema = z
    .record(
        // A 64-character value key plus the rating detail suffix.
        z.string().min(1).max(72),
        z.union([
            PrimitiveValueSchema,
            TemplateResourceValueSchema,
            TrackerValueSchema,
            TemplateTableRowsSchema,
            RatingDetailSchema,
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
    | TemplateImageValue
    | TrackerValue;

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
    // The static maximum is not a storage bound: a computed maximum may exceed it (spec 014, R3).
    if (value < field.min || value > TEMPLATE_LIMITS.ratingMax) {
        return { ok: false, reason: 'bounds' };
    }
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
        case 'tracker':
            return validateTrackerValue(field.columns, value);
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
        case 'tracker': {
            // Copies beyond a lowered maximum stay stored and are hidden, not a broken value.
            const parsed = TrackerValueSchema.safeParse(value);
            return parsed.success ? parsed.data : undefined;
        }
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

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * A stored list entry value as the list's current entry template can show it (spec 016, R6):
 * numbers move between number, rating, and a resource's current value; anything the template
 * cannot show reads as `undefined` and stays stored until the entry is edited.
 */
export function coerceListValue(item: ListItemField, value: unknown): unknown {
    if (value === undefined || value === null) return undefined;
    const resource = isResourceCandidate(value) ? value : undefined;
    const number =
        typeof value === 'number' && Number.isFinite(value)
            ? value
            : typeof resource?.current === 'number'
              ? resource.current
              : undefined;
    switch (item.type) {
        case 'number':
            if (number === undefined) return undefined;
            return clamp(number, item.min ?? -Infinity, item.max ?? Infinity);
        case 'rating':
            // The static maximum is not a storage bound (a computed maximum may exceed it).
            return number === undefined
                ? undefined
                : clamp(Math.round(number), item.min, TEMPLATE_LIMITS.ratingMax);
        case 'resource': {
            if (number === undefined) return undefined;
            const max =
                typeof resource?.max === 'number'
                    ? clamp(resource.max, item.min, item.max)
                    : item.max;
            return { current: clamp(Math.round(number), item.min, max), max };
        }
        case 'text':
            return typeof value === 'string' ? value : undefined;
        case 'toggle':
            return typeof value === 'boolean' ? value : undefined;
        case 'select':
        case 'reference':
            return validateTemplateValue(item, value).ok ? value : undefined;
        case 'image':
            return TemplateImageValueSchema.safeParse(value).success ? value : undefined;
    }
}

/**
 * A list preset as a starting entry (spec 016, R11): its name, and its number where the entry
 * holds one (a resource starts at that current value under its field maximum).
 */
export function presetListEntry(
    item: ListItemField,
    preset: { label: string; value?: number },
    id: string
): TemplateListEntry {
    const value = preset.value ?? 0;
    switch (item.type) {
        case 'number':
        case 'rating':
            return { id, label: preset.label, value: coerceListValue(item, value) as number };
        case 'resource':
            return {
                id,
                label: preset.label,
                value: coerceListValue(item, value) as TemplateResourceValue,
            };
        default:
            return { id, label: preset.label };
    }
}
