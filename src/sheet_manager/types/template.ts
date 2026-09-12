import { z } from 'zod';

import type { DocumentKind, SystemId } from './document';
import { DocumentKindSchema, SystemIdSchema } from './document';

export const TEMPLATE_LIMITS = {
    /** Nesting guardrail (spec A2): root children are depth 1. */
    maxDepth: 10,
    /** Total nodes across the whole tree (spec FR-3 authoring-time rejection). */
    nodesPerTemplate: 200,
    optionsPerField: 100,
    fillMappingsPerField: 100,
    presetsPerList: 30,
    columnsMax: 4,
    tableColumnsMax: 60,
    listEntriesMax: 1_000,
} as const;

/** Template file/schema generation authored by this build (contracts/template-node-model.md). */
export const TEMPLATE_SCHEMA_VERSION = 3;

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
     * Storage coordinate in the document's shared value bag. Defaults to the field id at
     * render time; fields in different templates with an equal valueKey read and write the
     * same document-scoped value.
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

/**
 * Dynamic maximum (spec FR-12): a coordinate reference or arithmetic formula over the unified
 * coordinate space. A bare coordinate is a valid formula — one mechanism covers both.
 */
const maxFromShape = { maxFrom: z.string().min(1).max(500).optional() };

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
        ...maxFromShape,
    })
    .refine(validateNumberBounds, { message: 'Minimum cannot exceed maximum', path: ['min'] });

const ToggleFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('toggle'),
});

const ImageFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('image'),
});

/**
 * Read-only computed field (spec FR-13): displays the formula result; never stores it (A4).
 */
const FormulaFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('formula'),
    formula: z.string().min(1).max(500),
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
        ...maxFromShape,
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
    ImageFieldSchema,
    FormulaFieldSchema,
    SelectFieldSchema,
    RatingFieldSchema,
    ResourceFieldSchema,
    ReferenceFieldSchema,
]);

export type TemplateField = z.infer<typeof TemplateFieldSchema>;

/** Author-defined starting entries for a list element (FR-19, 005 semantics carried over). */
export const PrimitivePresetSchema = z.object({
    key: templateIdentifierSchema,
    label: z.string().min(1).max(120),
    value: z.number().int().min(0).max(20).optional(),
});

export type PrimitivePreset = z.infer<typeof PrimitivePresetSchema>;

/** Condition-track presentation override (005 FR-6): level count + per-level names. */
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
 * registry. Resolution is a runtime registry query — unavailable bindings degrade at render.
 * `maxFrom` (feature 006) bounds system pools (Willpower/Force Points ceilings, FR-12).
 */
const PrimitiveNodeSchema = z.object({
    id: templateIdentifierSchema,
    type: z.literal('primitive'),
    bindingKey: z.string().min(1).max(120),
    label: z.string().min(1).max(120).optional(),
    compact: z.boolean().default(false),
    track: PrimitiveTrackOverrideSchema.optional(),
    ...maxFromShape,
});

/** Custom list (FR-17): own value coordinate OR a system-owned list — identical interface. */
const ListNodeSchema = z
    .object({
        id: templateIdentifierSchema,
        type: z.literal('list'),
        title: z.string().min(1).max(120).optional(),
        valueKey: templateIdentifierSchema.optional(),
        bindingKey: z.string().min(1).max(120).optional(),
        columns: z.number().int().min(1).max(TEMPLATE_LIMITS.columnsMax).default(1),
        presets: z.array(PrimitivePresetSchema).max(TEMPLATE_LIMITS.presetsPerList).optional(),
    })
    .refine(({ valueKey, bindingKey }) => (valueKey === undefined) !== (bindingKey === undefined), {
        message: 'A list must use exactly one storage mode: valueKey or bindingKey',
    });

const TableNodeSchema = z
    .object({
        id: templateIdentifierSchema,
        type: z.literal('table'),
        title: z.string().min(1).max(120).optional(),
        valueKey: templateIdentifierSchema.optional(),
        minRows: z.number().int().min(0).max(1_000).default(0),
        maxRows: z.number().int().min(1).max(1_000).default(100),
        columns: z.array(TemplateFieldSchema).min(1).max(TEMPLATE_LIMITS.tableColumnsMax),
    })
    .refine(({ maxRows, minRows }) => minRows <= maxRows, {
        message: 'Minimum rows cannot exceed maximum rows',
        path: ['minRows'],
    })
    .refine(({ columns }) => hasUniqueIds(columns), {
        message: 'Column IDs must be unique within a table',
        path: ['columns'],
    });

export interface SectionNode {
    id: string;
    type: 'section';
    title: string;
    /** Documentation link rendered as a help affordance in the section header (FR-9). */
    docsPath?: string;
    /** Column layout for direct children, 1–4 (FR-9); unset = single column stack. */
    columns?: number;
    children: TemplateNode[];
}

export interface GroupNode {
    id: string;
    type: 'group';
    title: string;
    /** Opt-in collapsibility (FR-10); state is remembered per user via a storage key. */
    collapsible: boolean;
    columns?: number;
    children: TemplateNode[];
}

export type TableNode = z.infer<typeof TableNodeSchema>;
export type ListNode = z.infer<typeof ListNodeSchema>;
export type PrimitiveNode = z.infer<typeof PrimitiveNodeSchema>;

/** Any node of the template tree — containers and leaves share one placement model (FR-1). */
export type TemplateNode =
    | SectionNode
    | GroupNode
    | TableNode
    | ListNode
    | PrimitiveNode
    | TemplateField;

/**
 * Recursive node schema. `z.lazy` plus the explicit `TemplateNode` annotation breaks the
 * otherwise circular type inference. `z.union` (not `z.discriminatedUnion`) because several
 * members carry `.refine()` bounds (ZodEffects) — the renderer switches on `type` anyway.
 */
const templateNodeSchema: z.ZodType<TemplateNode> = z.lazy(() =>
    z.union([
        // Containers first: section/group render chrome; everything else is a leaf.
        z.object({
            id: templateIdentifierSchema,
            type: z.literal('section'),
            title: z.string().min(1).max(120),
            docsPath: z.string().max(500).optional(),
            columns: z.number().int().min(1).max(TEMPLATE_LIMITS.columnsMax).optional(),
            children: z.array(templateNodeSchema).max(TEMPLATE_LIMITS.nodesPerTemplate),
        }),
        z.object({
            id: templateIdentifierSchema,
            type: z.literal('group'),
            title: z.string().min(1).max(120),
            collapsible: z.boolean().default(false),
            columns: z.number().int().min(1).max(TEMPLATE_LIMITS.columnsMax).optional(),
            children: z.array(templateNodeSchema).max(TEMPLATE_LIMITS.nodesPerTemplate),
        }),
        TableNodeSchema,
        ListNodeSchema,
        PrimitiveNodeSchema,
        TextFieldSchema,
        NumberFieldSchema,
        ToggleFieldSchema,
        ImageFieldSchema,
        FormulaFieldSchema,
        SelectFieldSchema,
        RatingFieldSchema,
        ResourceFieldSchema,
        ReferenceFieldSchema,
    ])
) as unknown as z.ZodType<TemplateNode>;

export interface CustomTemplate {
    id: string;
    name: string;
    description?: string;
    /** Owning system: page assignment and library listing match system + kind. */
    systemId: SystemId;
    documentKind: DocumentKind;
    schemaVersion: number;
    children: TemplateNode[];
}

export interface TemplateTreeIssue {
    code: 'depth' | 'count' | 'duplicate-id';
    nodeId?: string;
    actual?: number;
    limit?: number;
}

export function isContainerNode(node: TemplateNode): node is SectionNode | GroupNode {
    return node.type === 'section' || node.type === 'group';
}

/** Depth-first walk; root children are depth 1 (the guardrail counts from the page root). */
export function walkTemplateNodes(
    children: readonly TemplateNode[],
    visit: (node: TemplateNode, depth: number) => void
): void {
    const walk = (nodes: readonly TemplateNode[], depth: number): void => {
        for (const node of nodes) {
            visit(node, depth);
            if (node.type === 'section' || node.type === 'group') walk(node.children, depth + 1);
        }
    };
    walk(children, 1);
}

export function collectTemplateNodes(template: CustomTemplate): TemplateNode[] {
    const nodes: TemplateNode[] = [];
    walkTemplateNodes(template.children, (node) => nodes.push(node));
    return nodes;
}

/**
 * Tree integrity (FR-2/FR-3): depth guardrail, node budget, and one identifier namespace
 * across the whole tree. Structural shape is validated by the schema; these rules need a
 * walk, so they run alongside it wherever templates are saved or imported.
 */
export function collectTreeIssues(template: CustomTemplate): TemplateTreeIssue[] {
    const issues: TemplateTreeIssue[] = [];
    const seenIds = new Set<string>();
    let count = 0;
    walkTemplateNodes(template.children, (node, depth) => {
        count += 1;
        if (depth > TEMPLATE_LIMITS.maxDepth) {
            issues.push({
                code: 'depth',
                nodeId: node.id,
                actual: depth,
                limit: TEMPLATE_LIMITS.maxDepth,
            });
        }
        if (seenIds.has(node.id)) {
            issues.push({ code: 'duplicate-id', nodeId: node.id });
        }
        seenIds.add(node.id);
    });
    if (count > TEMPLATE_LIMITS.nodesPerTemplate) {
        issues.push({ code: 'count', actual: count, limit: TEMPLATE_LIMITS.nodesPerTemplate });
    }
    return issues;
}

/** Storage coordinate for a field's value: explicit valueKey or the field id. */
export function fieldValueKey(field: TemplateField): string {
    return field.valueKey ?? field.id;
}

/** Table rows are stored under the block's valueKey (default = block id). */
export function tableValueKey(block: TableNode): string {
    return block.valueKey ?? block.id;
}

/** List entries are stored under the list's valueKey (value-key storage mode). */
export function listValueKey(list: ListNode): string {
    return list.valueKey ?? list.id;
}

/** Every fillable input definition in a template (leaf fields and table columns). */
export function collectTemplateFields(template: CustomTemplate): Map<string, TemplateField> {
    const fields = new Map<string, TemplateField>();
    walkTemplateNodes(template.children, (node) => {
        if (node.type === 'table') {
            for (const column of node.columns) fields.set(column.id, column);
        } else if (
            node.type !== 'section' &&
            node.type !== 'group' &&
            node.type !== 'list' &&
            node.type !== 'primitive'
        ) {
            fields.set(node.id, node);
        }
    });
    return fields;
}

export function collectListNodes(template: CustomTemplate): ListNode[] {
    const lists: ListNode[] = [];
    walkTemplateNodes(template.children, (node) => {
        if (node.type === 'list') lists.push(node);
    });
    return lists;
}

export function collectPrimitiveNodes(template: CustomTemplate): PrimitiveNode[] {
    const primitives: PrimitiveNode[] = [];
    walkTemplateNodes(template.children, (node) => {
        if (node.type === 'primitive') primitives.push(node);
    });
    return primitives;
}

export interface FormulaDependencySource {
    /** Human-facing identifier for authoring messages (node id). */
    id: string;
    /** Coordinate the formula writes (formula fields); `maxFrom` bounds, never writes. */
    writes?: string;
    reads: string[];
}

/**
 * Formula dependency edges for authoring-time cycle detection (contracts/formula-grammar.md
 * §4). Unparseable formulas are skipped here — they are flagged separately as parse errors.
 */
export function collectFormulaDependencies(template: CustomTemplate): FormulaDependencySource[] {
    const sources: FormulaDependencySource[] = [];
    walkTemplateNodes(template.children, (node) => {
        if (node.type === 'formula') {
            const parsed = parseFormulaSafe(node.formula);
            if (parsed) sources.push({ id: node.id, writes: fieldValueKey(node), reads: parsed });
        }
        if (
            (node.type === 'rating' || node.type === 'number' || node.type === 'primitive') &&
            node.maxFrom
        ) {
            const parsed = parseFormulaSafe(node.maxFrom);
            if (parsed) sources.push({ id: node.id, reads: parsed });
        }
    });
    return sources;
}

function parseFormulaSafe(source: string): string[] | undefined {
    // Local import would create a cycle (formula module imports nothing from template);
    // the dependency extraction is duplicated deliberately as a tiny regex walk.
    return source.match(/[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.(?:current|max))?/g) ?? [];
}

export const CustomTemplateSchema = z
    .object({
        id: templateIdentifierSchema,
        name: z.string().min(1).max(120),
        description: z.string().max(1_000).optional(),
        systemId: SystemIdSchema.optional().default(SystemIdSchema.parse('star-wars-wod')),
        documentKind: DocumentKindSchema,
        schemaVersion: z.number().int().positive().max(1_000_000),
        children: z.array(templateNodeSchema).min(1).max(TEMPLATE_LIMITS.nodesPerTemplate),
    })
    .refine((template) => collectTreeIssues(template as CustomTemplate).length === 0, {
        message: 'Template tree violates depth, node-count, or unique-id rules',
    });
