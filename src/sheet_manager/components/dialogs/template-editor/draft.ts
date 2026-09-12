import { generateId } from '../../../../shared/utils/random';
import {
    listTemplateNumericCoordinates,
    type TemplateReferenceIssue,
    validateTemplateReferences,
} from '../../../features/sheet/data/templateReferences';
import {
    detectDependencyCycles,
    type FormulaDependencyEntry,
    parseFormula,
} from '../../../features/sheet/declarative/formula';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import type {
    CustomTemplate,
    GroupNode,
    ListNode,
    PrimitivePreset,
    PrimitiveTrackOverride,
    SectionNode,
    TableNode,
    TemplateField,
    TemplateNode,
} from '../../../types/template';
import {
    collectFormulaDependencies,
    collectTemplateNodes,
    collectTreeIssues,
    isContainerNode,
    isTemplateField,
    TEMPLATE_LIMITS,
    TEMPLATE_SCHEMA_VERSION,
    walkTemplateNodes,
} from '../../../types/template';

/** Type-safe structural updates for a node (type/id/children are managed separately). */
export type NodeUpdates = {
    title?: string;
    columns?: number;
    collapsible?: boolean;
    docsPath?: string;
    minRows?: number;
    maxRows?: number;
    valueKey?: string;
    bindingKey?: string;
    formula?: string;
    maxFrom?: string;
    label?: string;
    compact?: boolean;
    multiline?: boolean;
    track?: PrimitiveTrackOverride;
    presets?: PrimitivePreset[];
};

/** Kebab-safe identifier for a new draft node; the prefix guarantees a letter start. */
function newId(prefix: string): string {
    const token =
        generateId()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 8) || 'node';
    return `${prefix}-${token}`;
}

/** Public id generator for callers that seed drafts outside this module. */
export function newNodeId(prefix: Parameters<typeof generateDraftId>[0]): string {
    return generateDraftId(prefix);
}

export function generateDraftId(
    prefix: 'tpl' | 'sec' | 'grp' | 'blk' | 'lst' | 'f' | 'opt'
): string {
    return newId(prefix);
}

export type EditorDraft = CustomTemplate;

export type DraftOpResult =
    | { ok: true; draft: EditorDraft }
    | { ok: false; error: 'depth' | 'count' | 'self-move'; limit?: number; actual?: number };

function ok(draft: EditorDraft): DraftOpResult {
    return { ok: true, draft };
}

function fail(
    error: 'depth' | 'count' | 'self-move',
    limit?: number,
    actual?: number
): DraftOpResult {
    return { ok: false, error, limit, actual };
}

function countSubtree(node: TemplateNode): number {
    let count = 1;
    if (isContainerNode(node)) for (const child of node.children) count += countSubtree(child);
    return count;
}

function subtreeHeight(node: TemplateNode): number {
    if (!isContainerNode(node)) return 1;
    return 1 + Math.max(0, ...node.children.map(subtreeHeight));
}

interface NodeLocation {
    parent: TemplateNode[] | undefined; // undefined = page root
    parentId: string | null;
    index: number;
    depth: number; // depth of the node itself (root children are 1)
}

function locate(draft: EditorDraft, nodeId: string): NodeLocation | undefined {
    let found: NodeLocation | undefined;
    const search = (children: TemplateNode[], parentId: string | null, depth: number): boolean => {
        for (let index = 0; index < children.length; index += 1) {
            const node = children[index]!;
            if (node.id === nodeId) {
                found = { parent: children, parentId, index, depth };
                return true;
            }
            if (isContainerNode(node) && search(node.children, node.id, depth + 1)) return true;
        }
        return false;
    };
    search(draft.children, null, 1);
    return found;
}

function containsNode(node: TemplateNode, nodeId: string): boolean {
    if (node.id === nodeId) return true;
    if (!isContainerNode(node)) return false;
    return node.children.some((child) => containsNode(child, nodeId));
}

function replaceAt(
    children: TemplateNode[],
    parentId: string | null,
    nodeId: string,
    next: TemplateNode | undefined
): TemplateNode[] {
    if (parentId === null) {
        return next === undefined
            ? children.filter((node) => node.id !== nodeId)
            : children.map((node) => (node.id === nodeId ? next : node));
    }
    return children.map((node) => {
        if (!isContainerNode(node)) return node;
        if (node.id === parentId) {
            return {
                ...node,
                children:
                    next === undefined
                        ? node.children.filter((child) => child.id !== nodeId)
                        : node.children.map((child) => (child.id === nodeId ? next : child)),
            };
        }
        return { ...node, children: replaceAt(node.children, parentId, nodeId, next) };
    });
}

function insertInto(draft: EditorDraft, index: number, node: TemplateNode): EditorDraft {
    const children = [...draft.children];
    children.splice(Math.min(Math.max(index, 0), children.length), 0, node);
    return { ...draft, children };
}

function insertIntoContainer(
    draft: EditorDraft,
    parentId: string,
    index: number,
    node: TemplateNode
): EditorDraft {
    const insert = (children: TemplateNode[]): TemplateNode[] =>
        children.map((child) => {
            if (!isContainerNode(child)) return child;
            if (child.id === parentId) {
                const next = [...child.children];
                next.splice(Math.min(Math.max(index, 0), next.length), 0, node);
                return { ...child, children: next };
            }
            return { ...child, children: insert(child.children) };
        });
    return { ...draft, children: insert(draft.children) };
}

export function insertNode(
    draft: EditorDraft,
    parentId: string | null,
    index: number,
    node: TemplateNode
): DraftOpResult {
    const parentDepth = parentId === null ? 0 : locate(draft, parentId)?.depth;
    if (parentDepth === undefined) return fail('self-move');
    const height = subtreeHeight(node);
    if (parentDepth + height > TEMPLATE_LIMITS.maxDepth) {
        return fail('depth', TEMPLATE_LIMITS.maxDepth, parentDepth + height);
    }
    const total = collectTemplateNodes(draft).length + countSubtree(node);
    if (total > TEMPLATE_LIMITS.nodesPerTemplate) {
        return fail('count', TEMPLATE_LIMITS.nodesPerTemplate, total);
    }
    return ok(
        parentId === null
            ? insertInto(draft, index, node)
            : insertIntoContainer(draft, parentId, index, node)
    );
}

export function removeNode(draft: EditorDraft, nodeId: string): EditorDraft {
    const location = locate(draft, nodeId);
    if (!location) return draft;
    return {
        ...draft,
        children: replaceAt(draft.children, location.parentId, nodeId, undefined),
    };
}

/** Moves the whole subtree (ids and children intact); rejects self-subtree targets. */
export function moveNode(
    draft: EditorDraft,
    nodeId: string,
    targetParentId: string | null,
    targetIndex: number
): DraftOpResult {
    const location = locate(draft, nodeId);
    if (!location) return fail('self-move');
    if (targetParentId !== null) {
        const node = location.parent![location.index]!;
        if (containsNode(node, targetParentId)) return fail('self-move');
    }
    const node = location.parent![location.index]!;
    const parentDepth = targetParentId === null ? 0 : locate(draft, targetParentId)?.depth;
    if (parentDepth === undefined) return fail('self-move');
    if (parentDepth + 1 + subtreeHeight(node) - 1 > TEMPLATE_LIMITS.maxDepth) {
        return fail('depth', TEMPLATE_LIMITS.maxDepth, parentDepth + subtreeHeight(node));
    }
    const detached = {
        ...draft,
        children: replaceAt(draft.children, location.parentId, nodeId, undefined),
    };
    return ok(
        targetParentId === null
            ? insertInto(detached, targetIndex, node)
            : insertIntoContainer(detached, targetParentId, targetIndex, node)
    );
}

export function updateNode(draft: EditorDraft, nodeId: string, updates: NodeUpdates): EditorDraft {
    const apply = (node: TemplateNode): TemplateNode => {
        if (node.id !== nodeId) {
            return isContainerNode(node) ? { ...node, children: node.children.map(apply) } : node;
        }
        const merged = { ...node, ...updates } as TemplateNode;
        // An author-edited label replaces the shipped translation reference.
        if ('label' in updates || 'title' in updates) {
            delete (merged as { labelMessage?: string }).labelMessage;
        }
        // Clearing optional strings normalizes to absent instead of empty strings.
        for (const key of ['docsPath', 'valueKey', 'bindingKey', 'label', 'maxFrom'] as const) {
            if (key in updates && (merged as Record<string, unknown>)[key] === '') {
                delete (merged as Record<string, unknown>)[key];
            }
        }
        return merged;
    };
    return { ...draft, children: draft.children.map(apply) };
}

// ---------------------------------------------------------------------------
// Field factories and field-scoped helpers (fields live anywhere in the tree).
// ---------------------------------------------------------------------------

function baseField(type: TemplateField['type'], label: string): TemplateField {
    const base = {
        id: newId('f'),
        // Draft-safe: transient empty labels are allowed in the draft and flagged live.
        label,
        required: false,
        compact: false,
    };
    switch (type) {
        case 'text':
            return { ...base, type: 'text', multiline: false };
        case 'number':
            return { ...base, type: 'number' };
        case 'toggle':
            return { ...base, type: 'toggle' };
        case 'image':
            return { ...base, type: 'image' };
        case 'formula':
            return { ...base, type: 'formula', formula: '' };
        case 'select':
            return {
                ...base,
                type: 'select',
                multiple: false,
                options: [{ id: newId('opt'), label: 'Option 1' }],
            };
        case 'rating':
            return { ...base, type: 'rating', min: 0, max: 5, presentation: 'dots' };
        case 'resource':
            return { ...base, type: 'resource', min: 0, max: 100 };
        case 'reference':
            return {
                ...base,
                type: 'reference',
                targetKinds: [DocumentKindSchema.parse('character')],
                multiple: false,
            };
    }
}

export function newField(type: TemplateField['type'], label?: string): TemplateField {
    return baseField(type, label ?? '');
}

export function newSectionNode(): SectionNode {
    return { id: newId('sec'), type: 'section', title: 'New section', children: [] };
}

export function newGroupNode(): GroupNode {
    return {
        id: newId('grp'),
        type: 'group',
        title: 'New group',
        collapsible: false,
        children: [],
    };
}

export function newTableNode(): TableNode {
    return {
        id: newId('blk'),
        type: 'table',
        minRows: 0,
        maxRows: 100,
        columns: [newField('text', 'Column 1')],
    };
}

export function newListNode(storage: { valueKey?: string; bindingKey?: string }): ListNode {
    return {
        id: newId('lst'),
        type: 'list',
        columns: 1,
        ...(storage.valueKey ? { valueKey: storage.valueKey } : {}),
        ...(storage.bindingKey ? { bindingKey: storage.bindingKey } : {}),
    };
}

export function newPrimitiveNode(
    bindingKey: string,
    defaults?: { label?: string; compact?: boolean }
): TemplateNode {
    return {
        id: newId('blk'),
        type: 'primitive',
        bindingKey,
        compact: defaults?.compact ?? false,
        ...(defaults?.label ? { label: defaults.label } : {}),
    };
}

export function createEmptyDraft(documentKind: string): EditorDraft {
    const section = newSectionNode();
    section.children.push(newField('text', 'New field'));
    return {
        id: newId('tpl'),
        name: '',
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind: documentKind as EditorDraft['documentKind'],
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [section],
    };
}

export function createDraftFromTemplate(
    source: EditorDraft,
    overrides: Partial<Pick<EditorDraft, 'id' | 'name'>> = {}
): EditorDraft {
    return structuredClone({ ...source, ...overrides });
}

// ---------------------------------------------------------------------------
// Live draft integrity feedback.
// ---------------------------------------------------------------------------

export interface DraftIssue {
    message: string;
}

export interface DraftIssueMessages {
    emptyName: string;
    emptyLabel: string;
    duplicateId: string;
    invalidKey: string;
    limitReached: string;
    invalidBounds: string;
    invalidFormula: string;
    unknownCoordinate: string;
    circularDependency: string;
    unknownBinding: string;
    unknownCatalog: string;
    unknownFillTarget: string;
    unknownLabelMessage: string;
}

function referenceIssueMessage(
    issue: TemplateReferenceIssue,
    messages: DraftIssueMessages
): string {
    switch (issue.code) {
        case 'unknown-binding':
        case 'binding-kind-mismatch':
            return interpolate(messages.unknownBinding, { id: issue.key });
        case 'unknown-catalog':
        case 'unknown-fill-detail':
            return interpolate(messages.unknownCatalog, { id: issue.key });
        case 'unknown-fill-target':
            return interpolate(messages.unknownFillTarget, { id: issue.key });
        case 'unknown-coordinate':
            return interpolate(messages.unknownCoordinate, { id: issue.key });
        case 'unknown-label-message':
            return interpolate(messages.unknownLabelMessage, { id: issue.key });
    }
}

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const MAX_KEY_LENGTH = 64;

function isValidKey(key: string): boolean {
    return key.length > 0 && key.length <= MAX_KEY_LENGTH && IDENTIFIER_PATTERN.test(key);
}

function interpolate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

/**
 * Live draft integrity feedback. Structural identifiers are generated, but the checks stay
 * defensive (imports/edits could introduce collisions) alongside limits, bounds, and formula
 * validation (parse errors, unknown coordinates, cycles — FR-14).
 */
export function collectDraftIssues(draft: EditorDraft, messages: DraftIssueMessages): DraftIssue[] {
    const issues: DraftIssue[] = [];
    if (draft.name.trim().length === 0) {
        issues.push({ message: messages.emptyName });
    }

    for (const issue of collectTreeIssues(draft)) {
        if (issue.code === 'depth') {
            issues.push({
                message: interpolate(messages.limitReached, {
                    limit: issue.limit ?? 0,
                    subject: 'nesting levels',
                }),
            });
        } else if (issue.code === 'count') {
            issues.push({
                message: interpolate(messages.limitReached, {
                    limit: issue.limit ?? 0,
                    subject: 'elements',
                }),
            });
        } else {
            issues.push({ message: interpolate(messages.duplicateId, { id: issue.nodeId ?? '' }) });
        }
    }

    const seenEffectiveKeys = new Set<string>();
    const checkEffectiveKey = (key: string) => {
        if (!isValidKey(key)) {
            issues.push({ message: interpolate(messages.invalidKey, { id: key }) });
            return;
        }
        if (seenEffectiveKeys.has(key)) {
            issues.push({ message: interpolate(messages.duplicateId, { id: key }) });
        }
        seenEffectiveKeys.add(key);
    };

    const seenNodeIds = new Set<string>();
    walkTemplateNodes(draft.children, (node) => {
        if (seenNodeIds.has(node.id)) return;
        seenNodeIds.add(node.id);
        if (node.type === 'section' || node.type === 'group') {
            if (node.title.trim().length === 0) issues.push({ message: messages.emptyLabel });
        }
        if (node.type === 'table') {
            checkEffectiveKey(node.valueKey ?? node.id);
            if (node.minRows > node.maxRows) issues.push({ message: messages.invalidBounds });
        }
        if (isTemplateField(node)) {
            if (node.label.trim().length === 0) issues.push({ message: messages.emptyLabel });
            checkEffectiveKey(node.valueKey ?? node.id);
            if (node.type === 'formula' && node.formula.trim().length > 0) {
                if (!parseFormula(node.formula).ok) {
                    issues.push({
                        message: interpolate(messages.invalidFormula, { id: node.label }),
                    });
                }
            }
        }
        if (node.type === 'select') {
            const seenOptions = new Set<string>();
            for (const option of node.options) {
                if (seenOptions.has(option.id)) {
                    issues.push({ message: interpolate(messages.duplicateId, { id: option.id }) });
                }
                seenOptions.add(option.id);
            }
        }
        if (node.type === 'number' || node.type === 'rating' || node.type === 'resource') {
            if (node.min !== undefined && node.max !== undefined && node.min > node.max) {
                issues.push({ message: messages.invalidBounds });
            }
        }
        if (
            (node.type === 'rating' || node.type === 'number' || node.type === 'primitive') &&
            node.maxFrom
        ) {
            if (!parseFormula(node.maxFrom).ok) {
                issues.push({
                    message: interpolate(messages.invalidFormula, { id: node.label ?? node.id }),
                });
            }
        }
        if (node.type === 'list' && node.valueKey !== undefined) {
            checkEffectiveKey(node.valueKey);
        }
    });

    // Cycle detection across formula writers (FR-14; defense in depth at render separately).
    const dependencies: FormulaDependencyEntry[] = collectFormulaDependencies(draft).map(
        (source) => ({ id: source.id, writes: source.writes, reads: source.reads })
    );
    for (const cycle of detectDependencyCycles(dependencies)) {
        issues.push({
            message: interpolate(messages.circularDependency, { id: cycle.join(' → ') }),
        });
    }
    for (const issue of validateTemplateReferences(draft)) {
        issues.push({ message: referenceIssueMessage(issue, messages) });
    }
    return issues;
}

// ---------------------------------------------------------------------------
// Field-scoped tree operations (a field may live anywhere; table columns likewise).
// ---------------------------------------------------------------------------

function mapTableColumns(
    draft: EditorDraft,
    tableId: string,
    map: (columns: TemplateField[]) => TemplateField[]
): EditorDraft {
    const apply = (node: TemplateNode): TemplateNode => {
        if (isContainerNode(node)) return { ...node, children: node.children.map(apply) };
        if (node.type === 'table' && node.id === tableId) {
            return { ...node, columns: map([...node.columns]) };
        }
        return node;
    };
    return { ...draft, children: draft.children.map(apply) };
}

export function addTableColumn(draft: EditorDraft, tableId: string): EditorDraft {
    return mapTableColumns(draft, tableId, (columns) =>
        columns.length >= TEMPLATE_LIMITS.tableColumnsMax
            ? columns
            : [...columns, newField('text', `Column ${columns.length + 1}`)]
    );
}

export function removeTableColumn(
    draft: EditorDraft,
    tableId: string,
    columnId: string
): EditorDraft {
    return mapTableColumns(draft, tableId, (columns) =>
        columns.length <= 1 ? columns : columns.filter((column) => column.id !== columnId)
    );
}

function mapFieldItems(
    draft: EditorDraft,
    fieldId: string,
    map: (field: TemplateField) => TemplateField
): EditorDraft {
    const apply = (node: TemplateNode): TemplateNode => {
        if (isContainerNode(node)) return { ...node, children: node.children.map(apply) };
        if (node.type === 'table') {
            return {
                ...node,
                columns: node.columns.map((column) =>
                    column.id === fieldId ? map(column) : column
                ),
            };
        }
        if (isTemplateField(node)) {
            return node.id === fieldId ? map(node) : node;
        }
        return node;
    };
    return { ...draft, children: draft.children.map(apply) };
}

export function addFieldToContainer(
    draft: EditorDraft,
    parentId: string | null,
    type: TemplateField['type'],
    label?: string
): DraftOpResult {
    return insertNode(draft, parentId, Number.MAX_SAFE_INTEGER, newField(type, label));
}

export function removeFieldNode(draft: EditorDraft, fieldId: string): EditorDraft {
    return removeNode(draft, fieldId);
}

/** Changing the type resets type-specific settings so the field stays valid. */
function retypeField(field: TemplateField, type: TemplateField['type']): TemplateField {
    const next = baseField(type, field.label);
    return {
        ...next,
        id: field.id,
        required: field.required,
        ...(field.valueKey !== undefined ? { valueKey: field.valueKey } : {}),
    };
}

export function changeFieldType(
    draft: EditorDraft,
    fieldId: string,
    type: TemplateField['type']
): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => retypeField(field, type));
}

export function updateField(
    draft: EditorDraft,
    fieldId: string,
    updates: Partial<TemplateField>
): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        const next = { ...field, ...updates } as TemplateField;
        // An author-edited label replaces the shipped translation reference.
        if ('label' in updates) delete next.labelMessage;
        return next;
    });
}

export function addOption(draft: EditorDraft, fieldId: string): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select' || field.options.length >= TEMPLATE_LIMITS.optionsPerField) {
            return field;
        }
        return {
            ...field,
            options: [
                ...field.options,
                { id: newId('opt'), label: `Option ${field.options.length + 1}` },
            ],
        };
    });
}

export function updateOption(
    draft: EditorDraft,
    fieldId: string,
    optionId: string,
    label: string
): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select') return field;
        return {
            ...field,
            options: field.options.map((option) =>
                option.id === optionId ? { ...option, label } : option
            ),
        };
    });
}

export function removeOption(draft: EditorDraft, fieldId: string, optionId: string): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select' || field.options.length <= 1) return field;
        return { ...field, options: field.options.filter((option) => option.id !== optionId) };
    });
}

export function renameDraft(draft: EditorDraft, name: string): EditorDraft {
    return { ...draft, name };
}

export function describeDraft(draft: EditorDraft, description: string): EditorDraft {
    return { ...draft, description: description.length > 0 ? description : undefined };
}

export function setDraftKind(draft: EditorDraft, documentKind: string): EditorDraft {
    return { ...draft, documentKind: documentKind as EditorDraft['documentKind'] };
}

/** The unified numeric coordinate space for formula/maxFrom pickers (system + template). */
export const listNumericCoordinateOptions = listTemplateNumericCoordinates;

/** Attaches (or re-points) a catalog binding on a select field; enforces single choice. */
export function attachCatalog(draft: EditorDraft, fieldId: string, catalogId: string): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select') return field;
        return {
            ...field,
            multiple: false,
            binding: { catalogId, fills: field.binding?.fills ?? {} },
        } as TemplateField;
    });
}

export function detachCatalog(draft: EditorDraft, fieldId: string): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select') return field;
        const { binding: _removed, ...withoutBinding } = field;
        void _removed;
        return withoutBinding as TemplateField;
    });
}

export function updateFill(
    draft: EditorDraft,
    fieldId: string,
    detailKey: string,
    rule: { targetFieldId: string; disabled?: boolean } | undefined
): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        if (field.type !== 'select' || !field.binding) return field;
        const fills = { ...field.binding.fills };
        if (rule) fills[detailKey] = rule;
        else delete fills[detailKey];
        return { ...field, binding: { ...field.binding, fills } } as TemplateField;
    });
}
