import { z } from 'zod';

import { DocumentKindSchema, SystemIdSchema } from './document';

export const TEMPLATE_LIMITS = {
    sections: 40,
    blocksPerSection: 50,
    fieldsPerBlock: 60,
    optionsPerField: 100,
    fillMappingsPerField: 100,
    presetsPerPrimitive: 30,
} as const;

const templateIdentifierSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'Expected a lowercase kebab-case identifier');

const fieldBaseShape = {
    id: templateIdentifierSchema,
    label: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    required: z.boolean().default(false),
    /**
     * Storage coordinate in the document's shared value bag (clarification D1/D2).
     * Defaults to the field id at render time; fields in different templates with an equal
     * valueKey read and write the same document-scoped value.
     * Feature 005 review: when the coordinate matches a document data address (binding
     * registry), the field operates on the document data — uniform interface for both worlds.
     */
    valueKey: templateIdentifierSchema.optional(),
    /** Brief-format rendering when the field is bridged to document data (feature 005). */
    compact: z.boolean().default(false),
};

const boundedNumberShape = {
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    step: z.number().finite().positive().optional(),
};

const validateNumberBounds = (value: { min?: number; max?: number }) =>
    value.min === undefined || value.max === undefined || value.min <= value.max;

const TextFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('text'),
    multiline: z.boolean().default(false),
});

const NumberFieldSchema = z
    .object({
        ...fieldBaseShape,
        type: z.literal('number'),
        ...boundedNumberShape,
    })
    .refine(validateNumberBounds, { message: 'Minimum cannot exceed maximum', path: ['min'] });

const ToggleFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('toggle'),
});

function hasUniqueIds(values: readonly { id: string }[]) {
    return new Set(values.map(({ id }) => id)).size === values.length;
}

export const CatalogFillRuleSchema = z.object({
    targetFieldId: templateIdentifierSchema,
    disabled: z.boolean().optional(),
});

export const CatalogBindingSchema = z.object({
    catalogId: templateIdentifierSchema,
    fills: z
        .record(z.string().min(1).max(64), CatalogFillRuleSchema)
        .refine((fills) => Object.keys(fills).length <= TEMPLATE_LIMITS.fillMappingsPerField, {
            message: `At most ${TEMPLATE_LIMITS.fillMappingsPerField} fill mappings`,
        })
        .default({}),
});

export type CatalogFillRule = z.infer<typeof CatalogFillRuleSchema>;
export type CatalogBinding = z.infer<typeof CatalogBindingSchema>;

const SelectFieldSchema = z
    .object({
        ...fieldBaseShape,
        type: z.literal('select'),
        multiple: z.boolean().default(false),
        options: z
            .array(
                z.object({
                    id: templateIdentifierSchema,
                    label: z.string().min(1).max(120),
                })
            )
            .min(1)
            .max(TEMPLATE_LIMITS.optionsPerField),
        binding: CatalogBindingSchema.optional(),
    })
    .refine(({ options }) => hasUniqueIds(options), {
        message: 'Option IDs must be unique within a field',
        path: ['options'],
    })
    .refine(({ binding, multiple }) => !binding || !multiple, {
        message: 'Catalog-backed fields are single-choice',
        path: ['binding'],
    });

const RatingFieldSchema = z
    .object({
        ...fieldBaseShape,
        type: z.literal('rating'),
        min: z.number().int().min(0).default(0),
        max: z.number().int().min(1).max(100),
        presentation: z.enum(['dots', 'boxes', 'number']).default('dots'),
    })
    .refine(validateNumberBounds, { message: 'Minimum cannot exceed maximum', path: ['min'] });

const ResourceFieldSchema = z
    .object({
        ...fieldBaseShape,
        type: z.literal('resource'),
        min: z.number().int().min(0).default(0),
        max: z.number().int().min(1).max(1_000_000),
    })
    .refine(validateNumberBounds, { message: 'Minimum cannot exceed maximum', path: ['min'] });

const ReferenceFieldSchema = z
    .object({
        ...fieldBaseShape,
        type: z.literal('reference'),
        targetKinds: z.array(DocumentKindSchema).min(1).max(20),
        multiple: z.boolean().default(false),
    })
    .refine(({ targetKinds }) => new Set(targetKinds).size === targetKinds.length, {
        message: 'Reference target kinds must be unique',
        path: ['targetKinds'],
    });

export const TemplateFieldSchema = z.union([
    TextFieldSchema,
    NumberFieldSchema,
    ToggleFieldSchema,
    SelectFieldSchema,
    RatingFieldSchema,
    ResourceFieldSchema,
    ReferenceFieldSchema,
]);

const FieldsBlockSchema = z
    .object({
        id: templateIdentifierSchema,
        type: z.literal('fields'),
        title: z.string().min(1).max(120).optional(),
        columns: z.number().int().min(1).max(4).default(1),
        fields: z.array(TemplateFieldSchema).min(1).max(TEMPLATE_LIMITS.fieldsPerBlock),
    })
    .refine(({ fields }) => hasUniqueIds(fields), {
        message: 'Field IDs must be unique within a block',
        path: ['fields'],
    });

const TableBlockSchema = z
    .object({
        id: templateIdentifierSchema,
        type: z.literal('table'),
        title: z.string().min(1).max(120).optional(),
        valueKey: templateIdentifierSchema.optional(),
        minRows: z.number().int().min(0).max(1_000).default(0),
        maxRows: z.number().int().min(1).max(1_000).default(100),
        columns: z.array(TemplateFieldSchema).min(1).max(TEMPLATE_LIMITS.fieldsPerBlock),
    })
    .refine(({ maxRows, minRows }) => minRows <= maxRows, {
        message: 'Minimum rows cannot exceed maximum rows',
        path: ['minRows'],
    })
    .refine(({ columns }) => hasUniqueIds(columns), {
        message: 'Column IDs must be unique within a table',
        path: ['columns'],
    });

/**
 * Ready-made interactive page part placement (feature 004): references a registered built-in
 * block by id. `blockId` availability is a runtime registry query (system- AND kind-scoped),
 * never validated inside this system-agnostic schema — render degrades unavailable ids to a
 * placeholder. Accent color is automatic (parity), not stored per placement.
 */
export const BuiltInBlockPlacementSchema = z.object({
    id: templateIdentifierSchema,
    type: z.literal('built-in'),
    blockId: z.string().min(1).max(80),
});

export type BuiltInBlockPlacement = z.infer<typeof BuiltInBlockPlacementSchema>;

/**
 * Author-defined starting entries for a custom-list primitive (FR-16). Seeded into the bound
 * list as ordinary entries with deterministic ids (`preset-<templateId>-<key>`) on first use.
 */
export const PrimitivePresetSchema = z.object({
    key: templateIdentifierSchema,
    label: z.string().min(1).max(120),
    value: z.number().int().min(0).max(20).optional(),
});

export type PrimitivePreset = z.infer<typeof PrimitivePresetSchema>;

/** Condition-track presentation override (FR-6): level count + per-level names. */
export const PrimitiveTrackOverrideSchema = z
    .object({
        levels: z.number().int().min(1).max(20),
        names: z.array(z.string().min(1).max(40)).min(1).max(20),
    })
    .refine(({ levels, names }) => names.length === levels, {
        message: 'Track names must match level count',
        path: ['names'],
    });

export type PrimitiveTrackOverride = z.infer<typeof PrimitiveTrackOverrideSchema>;

/**
 * Document-bound primitive (feature 005): references one binding key of the owning system's
 * document binding registry. `bindingKey` resolution is a runtime registry query — never
 * validated inside this system-agnostic schema; unavailable bindings degrade at render (FR-3).
 * `label` is a presentation-only override; `compact` selects the brief-format rendering (FR-7).
 */
export const PrimitiveBlockSchema = z.object({
    id: templateIdentifierSchema,
    type: z.literal('primitive'),
    bindingKey: z.string().min(1).max(120),
    label: z.string().min(1).max(120).optional(),
    compact: z.boolean().default(false),
    track: PrimitiveTrackOverrideSchema.optional(),
    presets: z.array(PrimitivePresetSchema).max(TEMPLATE_LIMITS.presetsPerPrimitive).optional(),
});

export type PrimitiveBlock = z.infer<typeof PrimitiveBlockSchema>;

export const TemplateBlockSchema = z.union([
    FieldsBlockSchema,
    TableBlockSchema,
    BuiltInBlockPlacementSchema,
    PrimitiveBlockSchema,
]);

export const TemplateSectionSchema = z
    .object({
        id: templateIdentifierSchema,
        title: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        /**
         * 'card' (default): collapsible titled section. 'plain': blocks render directly on the
         * page with no section chrome — the presentation built-in views use (feature 004),
         * so a default template reproduces its original page exactly.
         */
        presentation: z.enum(['card', 'plain']).default('card'),
        blocks: z.array(TemplateBlockSchema).min(1).max(TEMPLATE_LIMITS.blocksPerSection),
    })
    .refine(({ blocks }) => hasUniqueIds(blocks), {
        message: 'Block IDs must be unique within a section',
        path: ['blocks'],
    });

export const CustomTemplateSchema = z
    .object({
        id: templateIdentifierSchema,
        name: z.string().min(1).max(120),
        description: z.string().max(1_000).optional(),
        /** Owning system: page assignment and library listing match system + kind (D4). */
        systemId: SystemIdSchema.optional().default(SystemIdSchema.parse('star-wars-wod')),
        documentKind: DocumentKindSchema,
        schemaVersion: z.number().int().positive().max(1_000_000),
        sections: z.array(TemplateSectionSchema).min(1).max(TEMPLATE_LIMITS.sections),
    })
    .refine(({ sections }) => hasUniqueIds(sections), {
        message: 'Section IDs must be unique within a template',
        path: ['sections'],
    });

export type TemplateField = z.infer<typeof TemplateFieldSchema>;
export type TemplateBlock = z.infer<typeof TemplateBlockSchema>;
export type TemplateSection = z.infer<typeof TemplateSectionSchema>;
export type CustomTemplate = z.infer<typeof CustomTemplateSchema>;

/** Storage coordinate for a field's value: explicit valueKey or the field id. */
export function fieldValueKey(field: TemplateField): string {
    return field.valueKey ?? field.id;
}

/** Table rows are stored under the block's valueKey (default = block id). */
export function tableValueKey(
    block: Extract<CustomTemplate['sections'][number]['blocks'][number], { type: 'table' }>
): string {
    return block.valueKey ?? block.id;
}

/** Every fillable input definition in a template, keyed by its identifier (fields and table columns). */
export function collectTemplateFields(template: CustomTemplate): Map<string, TemplateField> {
    const fields = new Map<string, TemplateField>();
    for (const section of template.sections) {
        for (const block of section.blocks) {
            if (block.type === 'fields') {
                for (const field of block.fields) fields.set(field.id, field);
            } else if (block.type === 'table') {
                for (const column of block.columns) fields.set(column.id, column);
            }
        }
    }
    return fields;
}
