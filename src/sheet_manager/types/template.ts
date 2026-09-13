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

/**
 * Translation reference for a node's label/title (shipped templates): a UI message id
 * (`ttgamer.ui.…`) or a data-catalog entry name (`catalog:<catalogId>/<entryId>`). The stored
 * label is the untranslated fallback; editing the label in the editor drops the reference.
 */
export const LabelMessageSchema = z
    .string()
    .max(200)
    .regex(
        /^(ttgamer\.[A-Za-z0-9._-]+|catalog:[a-z0-9-]+\/[a-z0-9-]+)$/,
        'Expected a ttgamer.* message id or catalog:<catalog>/<entry>'
    );

const labelMessageShape = { labelMessage: LabelMessageSchema.optional() };

/**
 * Placement inside the parent's column layout (1-based). When any child of a multi-column
 * container sets a column, children stack vertically inside their column instead of flowing
 * through the grid row by row.
 */
const placementShape = {
    column: z.number().int().min(1).max(TEMPLATE_LIMITS.columnsMax).optional(),
};

const fieldBaseShape = {
    id: templateIdentifierSchema,
    label: z.string().min(1).max(120),
    ...labelMessageShape,
    ...placementShape,
    /** Keep the label for accessibility and the editor, but do not show it on the page. */
    hideLabel: z.boolean().optional(),
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

const hasValidBounds = (value: { min?: number; max?: number }) =>
    value.min === undefined || value.max === undefined || value.min <= value.max;

/**
 * Dynamic maximum (spec FR-12): a coordinate reference or arithmetic formula over the unified
 * coordinate space. A bare coordinate is a valid formula — one mechanism covers both.
 */
const maxFromShape = { maxFrom: z.string().min(1).max(500).optional() };

/**
 * Proportional column widths for a multi-column container (e.g. `[2, 1]`), applied from the
 * medium breakpoint up; narrow screens always stack in one column.
 */
const columnWidthsShape = {
    columnWidths: z
        .array(z.number().int().min(1).max(12))
        .min(2)
        .max(TEMPLATE_LIMITS.columnsMax)
        .optional(),
};

const TextFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('text'),
    multiline: z.boolean().default(false),
    placeholder: z.string().max(120).optional(),
    placeholderMessage: LabelMessageSchema.optional(),
});

const NumberFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('number'),
    ...boundedNumberShape,
    ...maxFromShape,
});

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
    /** Display decoration around the computed number (e.g. `×` for multipliers). */
    prefix: z.string().max(8).optional(),
    suffix: z.string().max(8).optional(),
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

const SelectFieldSchema = z.object({
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
});

const RatingFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('rating'),
    min: z.number().int().min(0).default(0),
    max: z.number().int().min(1).max(100),
    presentation: z.enum(['dots', 'boxes', 'number']).default('dots'),
    ...maxFromShape,
});

const ResourceFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('resource'),
    min: z.number().int().min(0).default(0),
    max: z.number().int().min(1).max(1_000_000),
});

const ReferenceFieldSchema = z.object({
    ...fieldBaseShape,
    type: z.literal('reference'),
    targetKinds: z.array(DocumentKindSchema).min(1).max(20),
    multiple: z.boolean().default(false),
});

/**
 * Field members stay plain objects so they can form a discriminated union (clear per-type
 * parse errors); cross-property rules live in `refineField`.
 */
const fieldObjectSchemas = [
    TextFieldSchema,
    NumberFieldSchema,
    ToggleFieldSchema,
    ImageFieldSchema,
    FormulaFieldSchema,
    SelectFieldSchema,
    RatingFieldSchema,
    ResourceFieldSchema,
    ReferenceFieldSchema,
] as const;

type TemplateFieldObject = z.infer<(typeof fieldObjectSchemas)[number]>;

function refineField(field: TemplateFieldObject, context: z.RefinementCtx): void {
    const issue = (message: string, path: string[]) =>
        context.addIssue({ code: z.ZodIssueCode.custom, message, path });
    switch (field.type) {
        case 'number':
        case 'rating':
        case 'resource':
            if (!hasValidBounds(field)) issue('Minimum cannot exceed maximum', ['min']);
            return;
        case 'select':
            if (!hasUniqueIds(field.options)) {
                issue('Option IDs must be unique within a field', ['options']);
            }
            if (field.binding && field.multiple) {
                issue('Catalog-backed fields are single-choice', ['binding']);
            }
            return;
        case 'reference':
            if (new Set(field.targetKinds).size !== field.targetKinds.length) {
                issue('Reference target kinds must be unique', ['targetKinds']);
            }
            return;
        case 'text':
        case 'toggle':
        case 'image':
        case 'formula':
            return;
    }
}

export const TemplateFieldSchema = z
    .discriminatedUnion('type', fieldObjectSchemas)
    .superRefine(refineField);

export type TemplateField = z.infer<typeof TemplateFieldSchema>;

/** Every leaf field type — the single list editors, pickers, and predicates derive from. */
export const TEMPLATE_FIELD_TYPES = [
    'text',
    'number',
    'toggle',
    'select',
    'rating',
    'resource',
    'reference',
    'image',
    'formula',
] as const satisfies readonly TemplateField['type'][];

export type TemplateFieldType = (typeof TEMPLATE_FIELD_TYPES)[number];

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type AssertTrue<T extends true> = T;
/** Compile-time guard: the list above must name every schema field type. */
export type TemplateFieldTypesAreComplete = AssertTrue<
    Exact<TemplateFieldType, TemplateField['type']>
>;

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
    ...labelMessageShape,
    ...placementShape,
    hideLabel: z.boolean().optional(),
    /** Pool resources: edit the current value (default) or the maximum. */
    part: z.enum(['current', 'max']).optional(),
    /** Dynamic minimum (formula): lower dots are locked and writes never go below it. */
    minFrom: z.string().min(1).max(500).optional(),
    compact: z.boolean().default(false),
    track: PrimitiveTrackOverrideSchema.optional(),
    ...maxFromShape,
});

/** Custom list (FR-17): own value coordinate OR a system-owned list — identical interface. */
const ListNodeSchema = z.object({
    id: templateIdentifierSchema,
    type: z.literal('list'),
    title: z.string().min(1).max(120).optional(),
    ...labelMessageShape,
    ...placementShape,
    valueKey: templateIdentifierSchema.optional(),
    bindingKey: z.string().min(1).max(120).optional(),
    columns: z.number().int().min(1).max(TEMPLATE_LIMITS.columnsMax).default(1),
    presets: z.array(PrimitivePresetSchema).max(TEMPLATE_LIMITS.presetsPerList).optional(),
    /** Show the list's own title (off: the enclosing group names it). */
    showTitle: z.boolean().optional(),
    /** Draw the list's own bordered card (off: entries sit directly in the parent). */
    framed: z.boolean().optional(),
});

const TableNodeSchema = z.object({
    id: templateIdentifierSchema,
    type: z.literal('table'),
    title: z.string().min(1).max(120).optional(),
    ...labelMessageShape,
    ...placementShape,
    valueKey: templateIdentifierSchema.optional(),
    minRows: z.number().int().min(0).max(1_000).default(0),
    maxRows: z.number().int().min(1).max(1_000).default(100),
    columns: z.array(TemplateFieldSchema).min(1).max(TEMPLATE_LIMITS.tableColumnsMax),
});

export interface SectionNode {
    id: string;
    type: 'section';
    title: string;
    labelMessage?: string;
    column?: number;
    /** Documentation link rendered as a help affordance in the section header (FR-9). */
    docsPath?: string;
    /** Column layout for direct children, 1–4 (FR-9); unset = single column stack. */
    columns?: number;
    columnWidths?: number[];
    children: TemplateNode[];
}

export interface GroupNode {
    id: string;
    type: 'group';
    title: string;
    labelMessage?: string;
    column?: number;
    /** Title kept for the editor and accessibility but not shown on the card. */
    hideTitle?: boolean;
    docsPath?: string;
    /** Opt-in collapsibility (FR-10); state is remembered per user via a storage key. */
    collapsible: boolean;
    columns?: number;
    columnWidths?: number[];
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

/** Container and leaf node types that are not fields. */
export const TEMPLATE_STRUCTURE_TYPES = ['section', 'group', 'table', 'list', 'primitive'] as const;

export type TemplateNodeType = (typeof TEMPLATE_STRUCTURE_TYPES)[number] | TemplateFieldType;

/** Compile-time guard: structure + field types must name every node type. */
export type TemplateNodeTypesAreComplete = AssertTrue<
    Exact<TemplateNodeType, TemplateNode['type']>
>;

const fieldTypeSet: ReadonlySet<string> = new Set(TEMPLATE_FIELD_TYPES);

/** True for leaf fields (values stored in the bag); false for containers, tables, lists, primitives. */
export function isTemplateField(node: TemplateNode): node is TemplateField {
    return fieldTypeSet.has(node.type);
}

function refineNode(node: TemplateNode, context: z.RefinementCtx): void {
    const issue = (message: string, path: string[] = []) =>
        context.addIssue({ code: z.ZodIssueCode.custom, message, path });
    if (isTemplateField(node)) {
        refineField(node, context);
        return;
    }
    switch (node.type) {
        case 'table':
            if (node.minRows > node.maxRows) {
                issue('Minimum rows cannot exceed maximum rows', ['minRows']);
            }
            if (!hasUniqueIds(node.columns)) {
                issue('Column IDs must be unique within a table', ['columns']);
            }
            return;
        case 'list':
            if ((node.valueKey === undefined) === (node.bindingKey === undefined)) {
                issue('A list must use exactly one storage mode: valueKey or bindingKey');
            }
            return;
        case 'section':
        case 'group':
        case 'primitive':
            return;
    }
}

/**
 * Recursive node schema: a discriminated union on `type` (unknown types and per-type property
 * errors report precisely), with cross-property rules applied by `refineNode`. `z.lazy` plus
 * the explicit `TemplateNode` annotation breaks the otherwise circular type inference.
 */
const templateNodeSchema: z.ZodType<TemplateNode> = z.lazy(() =>
    z
        .discriminatedUnion('type', [
            // Containers first: section/group render chrome; everything else is a leaf.
            z.object({
                id: templateIdentifierSchema,
                type: z.literal('section'),
                title: z.string().min(1).max(120),
                ...labelMessageShape,
                ...placementShape,
                docsPath: z.string().max(500).optional(),
                columns: z.number().int().min(1).max(TEMPLATE_LIMITS.columnsMax).optional(),
                ...columnWidthsShape,
                children: z.array(templateNodeSchema).max(TEMPLATE_LIMITS.nodesPerTemplate),
            }),
            z.object({
                id: templateIdentifierSchema,
                type: z.literal('group'),
                title: z.string().min(1).max(120),
                ...labelMessageShape,
                ...placementShape,
                hideTitle: z.boolean().optional(),
                docsPath: z.string().max(500).optional(),
                collapsible: z.boolean().default(false),
                columns: z.number().int().min(1).max(TEMPLATE_LIMITS.columnsMax).optional(),
                ...columnWidthsShape,
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
        .superRefine((node, context) => refineNode(node as TemplateNode, context))
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
        } else if (isTemplateField(node)) {
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
        if (node.type === 'primitive' && node.minFrom) {
            const parsed = parseFormulaSafe(node.minFrom);
            if (parsed) sources.push({ id: node.id, reads: parsed });
        }
    });
    return sources;
}

function parseFormulaSafe(source: string): string[] | undefined {
    // Local import would create a cycle (formula module imports nothing from template);
    // the dependency extraction is duplicated deliberately as a tiny regex walk.
    // Whole identifiers only; an identifier followed by "(" is a function call (min/max).
    return (
        source.match(
            /[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.(?:current|max))?(?![a-z0-9.-])(?!\s*\()/g
        ) ?? []
    );
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
