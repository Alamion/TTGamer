import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { systemRegistry } from '../../systems';
import { resolveDataBindingByCoordinate } from '../../systems/templateBindings';
import { DocumentKindSchema, SystemIdSchema } from '../../types/document';
import type {
    CustomTemplate,
    GroupNode,
    ListItemField,
    PoolTrackerOverride,
    PrimitivePreset,
    PrimitiveTrackOverride,
    SectionNode,
    TableNode,
    TemplateField,
    TemplateNode,
    TrackerOverride,
    VisibleWhen,
} from '../../types/template';
import {
    collectFormulaDependencies,
    collectTemplateNodes,
    collectTreeIssues,
    isContainerNode,
    isTemplateField,
    listItemField,
    TEMPLATE_LIMITS,
    TEMPLATE_SCHEMA_VERSION,
    walkTemplateNodes,
} from '../../types/template';
import { checkFormulaInput } from '../sheet/data/formulaCheck';
import { referenceKindName } from '../sheet/data/referenceScope';
import {
    type CoordinateSetting,
    type TemplateReferenceIssue,
    validateTemplateReferences,
} from '../sheet/data/templateReferences';
import { defaultTrackerSettings } from '../sheet/data/trackerDefaults';
import {
    detectDependencyCycles,
    type FormulaDependencyEntry,
    renameFormulaCoordinates,
} from '../sheet/declarative/formula';
import { moveItem } from '../sheet/declarative/rowOrder';
import { type DraftIdPrefix, generateDraftId } from './model/ids';
import { formulaCheckMessage } from './settings/formulaMessage';
import type { SettingRef, SettingsGroupId } from './settings/groupedSettings';

/** Type-safe structural updates for a node (type/id/children are managed separately). */
export type NodeUpdates = {
    title?: string;
    visibleWhen?: VisibleWhen;
    defaultCollapsed?: boolean;
    columns?: number;
    columnWidths?: number[];
    column?: number;
    span?: number;
    hideTitle?: boolean;
    hideLabel?: boolean;
    /** `false` turns the book-term hint off (spec 009); `undefined` restores it. */
    termHint?: false;
    part?: 'current' | 'max';
    minFrom?: string;
    /** Pool resources drawn as a tracker (spec 020). */
    poolTracker?: PoolTrackerOverride;
    maxMinFrom?: string;
    showTitle?: boolean;
    framed?: boolean;
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
    trackLayout?: 'table' | 'strip';
    tracker?: TrackerOverride;
    presets?: PrimitivePreset[];
};

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

/**
 * Structural-sharing tree map: `visit` returns the same node when nothing changes, and only the
 * containers (and arrays) on the path to a changed node are rebuilt. Untouched subtrees keep
 * their identity, so memoized editor panels skip re-rendering.
 */
function mapNodes(
    children: TemplateNode[],
    visit: (node: TemplateNode) => TemplateNode
): TemplateNode[] {
    let changed = false;
    const next = children.map((node) => {
        let result = visit(node);
        if (result === node && isContainerNode(node)) {
            const mappedChildren = mapNodes(node.children, visit);
            if (mappedChildren !== node.children) result = { ...node, children: mappedChildren };
        }
        if (result !== node) changed = true;
        return result;
    });
    return changed ? next : children;
}

function withChildren(draft: EditorDraft, children: TemplateNode[]): EditorDraft {
    return children === draft.children ? draft : { ...draft, children };
}

function replaceAt(
    children: TemplateNode[],
    parentId: string | null,
    nodeId: string,
    next: TemplateNode | undefined
): TemplateNode[] {
    const replaceIn = (siblings: TemplateNode[]) =>
        next === undefined
            ? siblings.filter((node) => node.id !== nodeId)
            : siblings.map((node) => (node.id === nodeId ? next : node));
    if (parentId === null) return replaceIn(children);
    return mapNodes(children, (node) =>
        isContainerNode(node) && node.id === parentId
            ? { ...node, children: replaceIn(node.children) }
            : node
    );
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
    return withChildren(
        draft,
        mapNodes(draft.children, (child) => {
            if (!isContainerNode(child) || child.id !== parentId) return child;
            const next = [...child.children];
            next.splice(Math.min(Math.max(index, 0), next.length), 0, node);
            return { ...child, children: next };
        })
    );
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
    // `targetIndex` is the node's final position among its new siblings.
    return ok(
        targetParentId === null
            ? insertInto(detached, targetIndex, node)
            : insertIntoContainer(detached, targetParentId, targetIndex, node)
    );
}

function idPrefixFor(node: TemplateNode): DraftIdPrefix {
    switch (node.type) {
        case 'section':
            return 'sec';
        case 'group':
            return 'grp';
        case 'table':
            return 'blk';
        case 'list':
            return 'lst';
        default:
            return 'f';
    }
}

export interface CloneOptions {
    /** The copy lands on the page it came from (Duplicate, or a paste there). */
    samePage: boolean;
    /** Coordinates the target page already uses; a kept value key must not collide. */
    targetCoordinates?: ReadonlySet<string>;
}

const FORMULA_SETTINGS = ['formula', 'maxFrom', 'minFrom', 'maxMinFrom'] as const;

/** Points the formulas and display conditions of a copy at the copy's own coordinates. */
function remapCoordinates(node: TemplateNode, renamed: ReadonlyMap<string, string>) {
    const rename = (coordinate: string) => renamed.get(coordinate);
    const remap = (carrier: Record<string, unknown>) => {
        for (const key of FORMULA_SETTINGS) {
            const formula = carrier[key];
            if (typeof formula === 'string') {
                carrier[key] = renameFormulaCoordinates(formula, rename);
            }
        }
        const condition = carrier.visibleWhen as { coordinate?: string } | undefined;
        if (condition?.coordinate) {
            const [base, ...part] = condition.coordinate.split('.');
            const next = rename(base!);
            if (next) condition.coordinate = [next, ...part].join('.');
        }
    };
    const walk = (current: TemplateNode) => {
        remap(current as unknown as Record<string, unknown>);
        if (current.type === 'table') {
            current.columns.forEach((column) =>
                remap(column as unknown as Record<string, unknown>)
            );
        }
        if (current.type === 'list' && current.item) {
            remap(current.item as unknown as Record<string, unknown>);
        }
        if (isContainerNode(current)) current.children.forEach(walk);
    };
    walk(node);
}

/**
 * A copy of a subtree with fresh identifiers for every node, table column, and select option.
 * On the same page custom values are not shared with the original: an explicit custom `valueKey`
 * is dropped so the copy's coordinate becomes its new id. On another page (a paste, spec 023) a
 * custom key is kept unless that page already uses it. A coordinate that addresses system data
 * is always kept, so a copied trait row still shows the same trait. Formulas and display
 * conditions inside the copy are pointed at the copy's own coordinates.
 */
export function cloneWithFreshIds(
    draft: EditorDraft,
    original: TemplateNode,
    { samePage, targetCoordinates }: CloneOptions = { samePage: true }
): TemplateNode {
    const copy = structuredClone(original);
    const renamed = new Map<string, string>();
    const keepCoordinate = (node: { id: string; valueKey?: string }) => {
        const coordinate = node.valueKey ?? node.id;
        if (resolveDataBindingByCoordinate(draft.systemId, draft.documentKind, coordinate)) {
            node.valueKey = coordinate;
        } else if (!samePage && node.valueKey && !targetCoordinates?.has(node.valueKey)) {
            // The author's own name for the value, shared by pages of one type.
        } else {
            delete node.valueKey;
        }
    };
    const renewKeyed = <T extends { id: string; valueKey?: string }>(
        node: T,
        prefix: DraftIdPrefix
    ) => {
        const before = node.valueKey ?? node.id;
        keepCoordinate(node);
        node.id = generateDraftId(prefix);
        const after = node.valueKey ?? node.id;
        if (after !== before) renamed.set(before, after);
    };
    const renew = (node: TemplateNode) => {
        if (isTemplateField(node) || node.type === 'table' || node.type === 'list') {
            renewKeyed(node as { id: string; valueKey?: string }, idPrefixFor(node));
        } else {
            node.id = generateDraftId(idPrefixFor(node));
        }
        if (node.type === 'select') {
            node.options = node.options.map((option) => ({
                ...option,
                id: generateDraftId('opt'),
            }));
        }
        if (node.type === 'list' && node.item) {
            const item = {
                ...node.item,
                ...(node.item.type === 'select'
                    ? {
                          options: node.item.options.map((option) => ({
                              ...option,
                              id: generateDraftId('opt'),
                          })),
                      }
                    : {}),
            } as ListItemField;
            renamed.set(item.id, (item.id = generateDraftId('f')));
            node.item = item;
        }
        if (node.type === 'table') {
            node.columns = node.columns.map((column) => {
                const renewed = { ...column, id: generateDraftId('f') };
                renamed.set(column.valueKey ?? column.id, renewed.id);
                delete renewed.valueKey;
                return renewed;
            });
        }
        if (isContainerNode(node)) node.children.forEach(renew);
    };
    renew(copy);
    remapCoordinates(copy, renamed);

    if (samePage) {
        const labelled = copy as TermCarrier & { title?: string; label?: string };
        const suffixed = (label: string) =>
            translate(uiMessages.sheet.templates.editor.copySuffix, { label });
        if (typeof labelled.title === 'string') labelled.title = suffixed(labelled.title);
        else if (typeof labelled.label === 'string') labelled.label = suffixed(labelled.label);
        keepTermOnRename(labelled);
    }
    return copy;
}

/** Inserts a copy of the node (fresh identities, see `cloneWithFreshIds`) right after it. */
export function duplicateNode(
    draft: EditorDraft,
    nodeId: string
): DraftOpResult & {
    copyId?: string;
} {
    const location = locate(draft, nodeId);
    if (!location) return fail('self-move');
    const copy = cloneWithFreshIds(draft, location.parent![location.index]!);
    const result = insertNode(draft, location.parentId, location.index + 1, copy);
    return result.ok ? { ...result, copyId: copy.id } : result;
}

/** Where a node sits: its parent (null = page root) and its index among the siblings. */
export function findNodePosition(
    draft: EditorDraft,
    nodeId: string
): { parentId: string | null; index: number; siblings: readonly TemplateNode[] } | undefined {
    const location = locate(draft, nodeId);
    if (!location) return undefined;
    return { parentId: location.parentId, index: location.index, siblings: location.parent! };
}

export function findNode(draft: EditorDraft, nodeId: string): TemplateNode | undefined {
    const location = locate(draft, nodeId);
    return location ? location.parent![location.index] : undefined;
}

/**
 * A multi-column container whose children set no `column` flows them row by row. Before one
 * child is placed in a column, every sibling gets the column it currently shows in, so placing
 * one element never reshuffles the others (the renderer stacks all children once any is placed).
 */
export function materializeColumns(draft: EditorDraft, parentId: string | null): EditorDraft {
    if (parentId === null) return draft;
    const parent = findNode(draft, parentId);
    if (!parent || !isContainerNode(parent)) return draft;
    const columns = parent.columns ?? 1;
    if (columns <= 1 || parent.children.some((child) => child.column !== undefined)) return draft;
    const children = parent.children.map((child, index) => ({
        ...child,
        column: (index % columns) + 1,
    }));
    return replaceNode(draft, parentId, { ...parent, children } as TemplateNode);
}

export interface NodePlacement {
    parentId: string | null;
    /** Insertion index: the node lands before the sibling currently at this index. */
    index: number;
    /** The column to stack into, or `null` for flowing/single-column parents. */
    column: number | null;
}

function withColumn(draft: EditorDraft, nodeId: string, column: number | null): EditorDraft {
    return updateNode(draft, nodeId, { column: column ?? undefined });
}

/** Moves a node to a slot on the page or in the outline (one undo step, column included). */
export function placeNode(
    draft: EditorDraft,
    nodeId: string,
    placement: NodePlacement
): DraftOpResult {
    const prepared =
        placement.column === null ? draft : materializeColumns(draft, placement.parentId);
    const current = findNodePosition(prepared, nodeId);
    if (!current) return fail('self-move');
    const sameParent = current.parentId === placement.parentId;
    const finalIndex =
        sameParent && current.index < placement.index ? placement.index - 1 : placement.index;
    const moved = moveNode(prepared, nodeId, placement.parentId, finalIndex);
    if (!moved.ok) return moved;
    return ok(withColumn(moved.draft, nodeId, placement.column));
}

/** Inserts a new node at a slot, in the slot's column. */
export function insertAtPlacement(
    draft: EditorDraft,
    placement: NodePlacement,
    node: TemplateNode
): DraftOpResult {
    const prepared =
        placement.column === null ? draft : materializeColumns(draft, placement.parentId);
    const placed = placement.column === null ? node : { ...node, column: placement.column };
    return insertNode(prepared, placement.parentId, placement.index, placed);
}

/** Swaps a node for another (e.g. a field switching to a system resource); ids stay stable. */
export function replaceNode(draft: EditorDraft, nodeId: string, next: TemplateNode): EditorDraft {
    return withChildren(
        draft,
        mapNodes(draft.children, (node) => (node.id === nodeId ? next : node))
    );
}

interface TermCarrier {
    type?: string;
    labelMessage?: string;
    termRef?: string;
}

/** Containers carry titles, not book terms (only fields and primitives accept `termRef`). */
const NO_TERM_TYPES = new Set(['section', 'group', 'list', 'table']);

/** Drops the label translation of a renamed node but keeps its book term as `termRef`. */
function keepTermOnRename(node: TermCarrier): void {
    if (node.labelMessage && !node.termRef && !NO_TERM_TYPES.has(node.type ?? '')) {
        node.termRef = node.labelMessage;
    }
    delete node.labelMessage;
}

export function updateNode(draft: EditorDraft, nodeId: string, updates: NodeUpdates): EditorDraft {
    const apply = (node: TemplateNode): TemplateNode => {
        if (node.id !== nodeId) return node;
        const merged = { ...node, ...updates } as TemplateNode;
        // An author-edited label replaces the shipped translation reference; the book term it
        // stood for is kept as termRef (spec 009) so the English-name hint survives renaming.
        if ('label' in updates || 'title' in updates) {
            keepTermOnRename(merged as TermCarrier);
        }
        // Clearing optional strings normalizes to absent instead of empty strings.
        for (const key of [
            'docsPath',
            'valueKey',
            'bindingKey',
            'label',
            'maxFrom',
            'minFrom',
            'maxMinFrom',
        ] as const) {
            if (key in updates && (merged as Record<string, unknown>)[key] === '') {
                delete (merged as Record<string, unknown>)[key];
            }
        }
        for (const key of ['visibleWhen', 'defaultCollapsed', 'span'] as const) {
            if (key in updates && !updates[key]) delete (merged as Record<string, unknown>)[key];
        }
        // Fewer columns: children placed past the new last column move into it.
        if ('columns' in updates && isContainerNode(merged)) {
            const columns = merged.columns ?? 1;
            merged.children = merged.children.map((child) =>
                child.column !== undefined && child.column > columns
                    ? { ...child, column: columns > 1 ? columns : undefined }
                    : child
            );
        }
        return merged;
    };
    return withChildren(draft, mapNodes(draft.children, apply));
}

// ---------------------------------------------------------------------------
// Field factories and field-scoped helpers (fields live anywhere in the tree).
// ---------------------------------------------------------------------------

function baseField(type: TemplateField['type'], label: string): TemplateField {
    const base = {
        id: generateDraftId('f'),
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
                options: [
                    {
                        id: generateDraftId('opt'),
                        label: translate(uiMessages.sheet.templates.editor.newOption, { index: 1 }),
                    },
                ],
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
        case 'tracker':
            return { ...base, type: 'tracker', ...defaultTrackerSettings() };
    }
}

export function newField(type: TemplateField['type'], label?: string): TemplateField {
    return baseField(type, label ?? '');
}

export function newSectionNode(): SectionNode {
    return {
        id: generateDraftId('sec'),
        type: 'section',
        title: translate(uiMessages.sheet.templates.editor.newSection),
        children: [],
    };
}

export function newGroupNode(): GroupNode {
    return {
        id: generateDraftId('grp'),
        type: 'group',
        title: translate(uiMessages.sheet.templates.editor.newGroup),
        collapsible: false,
        children: [],
    };
}

export function newTableNode(): TableNode {
    return {
        id: generateDraftId('blk'),
        type: 'table',
        minRows: 0,
        maxRows: 100,
        columns: [newField('text', 'Column 1')],
    };
}

export function createEmptyDraft(documentKind: string, systemId = 'star-wars-wod'): EditorDraft {
    const section = newSectionNode();
    section.children.push(newField('text', 'New field'));
    return {
        id: generateDraftId('tpl'),
        name: '',
        systemId: SystemIdSchema.parse(systemId),
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
    /** The element the issue belongs to, so the editor can mark and select it. */
    nodeId?: string;
    /** The setting to open and focus (spec 022, R3); table columns and list entries included. */
    setting?: SettingRef;
}

export interface DraftIssueMessages {
    emptyName: string;
    emptyLabel: string;
    duplicateId: string;
    invalidKey: string;
    limitReached: string;
    invalidBounds: string;
    unknownCoordinate: string;
    circularDependency: string;
    unknownBinding: string;
    unknownCatalog: string;
    unknownFillTarget: string;
    listCatalogUnnamed: string;
    unknownLabelMessage: string;
    invalidDocsLink: string;
    referenceTargetUnavailable: string;
    trackerLengthEmpty: string;
    trackerCovers: string;
}

const at = (group: SettingsGroupId, key: string): SettingRef => ({ group, key });

const COORDINATE_SETTING: Record<CoordinateSetting, SettingRef> = {
    formula: at('limits', 'formula'),
    maxFrom: at('limits', 'maxFrom'),
    minFrom: at('limits', 'minFrom'),
    maxMinFrom: at('limits', 'maxMinFrom'),
    visibleWhen: at('visibility', 'visibleWhen'),
};

/** The message and setting of a reference problem (the element is named by the caller). */
function referenceIssue(
    issue: TemplateReferenceIssue,
    messages: DraftIssueMessages
): { message: string; setting?: SettingRef; formula?: true } {
    switch (issue.code) {
        case 'unknown-binding':
        case 'binding-kind-mismatch':
            return {
                message: interpolate(messages.unknownBinding, { id: issue.key }),
                setting: at('value', 'source'),
            };
        case 'unknown-catalog':
        case 'unknown-fill-detail':
            return {
                message: interpolate(messages.unknownCatalog, { id: issue.key }),
                setting: at('value', 'catalog'),
            };
        case 'unknown-fill-target':
            return {
                message: interpolate(messages.unknownFillTarget, { id: issue.key }),
                setting: at('value', 'catalog'),
            };
        case 'list-catalog-unnamed':
            return { message: messages.listCatalogUnnamed, setting: at('value', 'catalog') };
        case 'unknown-coordinate':
            return issue.setting === 'visibleWhen'
                ? {
                      message: interpolate(messages.unknownCoordinate, { id: issue.key }),
                      setting: COORDINATE_SETTING.visibleWhen,
                  }
                : {
                      message: formulaCheckMessage({
                          kind: 'error',
                          code: 'unknown',
                          name: issue.key,
                      })!.text,
                      setting: COORDINATE_SETTING[issue.setting],
                      formula: true,
                  };
        case 'unknown-label-message':
            return {
                message: interpolate(messages.unknownLabelMessage, { id: issue.key }),
                setting: at('content', 'label'),
            };
        case 'invalid-docs-link':
            return {
                message: interpolate(messages.invalidDocsLink, { id: issue.key }),
                setting: at('visibility', 'docsPath'),
            };
        case 'reference-target-unavailable':
            return {
                message: interpolate(messages.referenceTargetUnavailable, {
                    field: issue.label,
                    type: referenceKindName(systemRegistry, issue.key),
                }),
                setting: at('value', 'targetKinds'),
            };
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

/** The name an issue uses for an element (what the outline shows, or its id). */
function issueName(node: { id: string; label?: string; title?: string; bindingKey?: string }) {
    return node.label || node.title || node.bindingKey || node.id;
}

const inElement = (element: string, problem: string) =>
    translate(uiMessages.sheet.templates.editor.issueIn, { element, problem });

/** A formula setting that does not parse, worded as under its box. */
function formulaSyntaxProblem(source: string | undefined): string | undefined {
    const check = checkFormulaInput(source);
    return check.kind === 'error' ? formulaCheckMessage(check)?.text : undefined;
}

/**
 * The checks of one field's own settings, shared by page fields, table columns, and list entry
 * fields (spec 022, R4): label, options, bounds, formulas, pool tracker length, tracker names.
 * `report` receives the problem and the setting inside the field.
 */
function checkFieldSettings(
    field: TemplateField,
    messages: DraftIssueMessages,
    /** `named`: the message already names the element (or needs no name, like empty labels). */
    report: (problem: string, setting: SettingRef, named?: true) => void
): void {
    const text = uiMessages.sheet.templates.editor;
    if (field.label.trim().length === 0) report(messages.emptyLabel, at('content', 'label'), true);
    if (field.type === 'formula') {
        if (field.formula.trim().length === 0) {
            report(translate(text.issueFormulaEmpty), at('limits', 'formula'));
        } else {
            const problem = formulaSyntaxProblem(field.formula);
            if (problem) report(problem, at('limits', 'formula'));
        }
    }
    if (field.type === 'rating' || field.type === 'number') {
        const problem = formulaSyntaxProblem(field.maxFrom);
        if (problem) report(problem, at('limits', 'maxFrom'));
    }
    if (field.type === 'select') {
        const seenOptions = new Set<string>();
        field.options.forEach((option, index) => {
            if (seenOptions.has(option.id)) {
                report(
                    interpolate(messages.duplicateId, { id: option.id }),
                    at('content', `option:${index}`)
                );
            }
            seenOptions.add(option.id);
            if (option.label.trim().length === 0) {
                report(translate(text.issueOptionEmpty), at('content', `option:${index}`));
            }
        });
    }
    if (field.type === 'number' || field.type === 'rating' || field.type === 'resource') {
        if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
            report(messages.invalidBounds, at('limits', 'min'));
        }
    }
    if (
        field.type === 'resource' &&
        field.poolTracker &&
        field.max > TEMPLATE_LIMITS.trackerLevelsMax
    ) {
        report(
            translate(text.issuePoolTooLong, { max: TEMPLATE_LIMITS.trackerLevelsMax }),
            at('limits', 'max')
        );
    }
    if (field.type === 'tracker') {
        const tracker = at('look', 'tracker');
        if ([...field.marks, ...field.levels].some(({ name }) => name.trim().length === 0)) {
            report(translate(text.issueTrackerNameEmpty), tracker);
        }
        const levelIds = new Set(field.levels.map(({ id }) => id));
        field.lengths.forEach((length, index) => {
            if (!length.levels.some((id) => levelIds.has(id))) {
                report(
                    interpolate(messages.trackerLengthEmpty, { id: field.label, n: index + 1 }),
                    tracker,
                    true
                );
            }
        });
        if (
            field.columns.some(
                ({ covers }) => covers !== undefined && covers >= field.levels.length
            )
        ) {
            report(interpolate(messages.trackerCovers, { id: field.label }), tracker, true);
        }
    }
}

/**
 * Live draft integrity feedback. Structural identifiers are generated, but the checks stay
 * defensive (imports/edits could introduce collisions) alongside limits, bounds, and formula
 * validation (parse errors, unknown coordinates, cycles — FR-14). Each issue names its element
 * and, where one exists, the setting that fixes it (spec 022).
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
            issues.push({
                message: interpolate(messages.duplicateId, { id: issue.nodeId ?? '' }),
                nodeId: issue.nodeId,
            });
        }
    }

    const names = new Map<string, string>();
    const seenEffectiveKeys = new Set<string>();
    const checkEffectiveKey = (key: string, nodeId: string, setting: SettingRef) => {
        if (!isValidKey(key)) {
            issues.push({
                message: interpolate(messages.invalidKey, { id: key }),
                nodeId,
                setting,
            });
            return;
        }
        // Two elements showing the same system datum (a copied trait row) are two views of
        // one value, not a collision.
        const bridged = resolveDataBindingByCoordinate(draft.systemId, draft.documentKind, key);
        if (seenEffectiveKeys.has(key) && !bridged) {
            issues.push({
                message: interpolate(messages.duplicateId, { id: key }),
                nodeId,
                setting,
            });
        }
        seenEffectiveKeys.add(key);
    };

    const seenNodeIds = new Set<string>();
    walkTemplateNodes(draft.children, (node) => {
        if (seenNodeIds.has(node.id)) return;
        seenNodeIds.add(node.id);
        const name = issueName(node);
        names.set(node.id, name);
        const issue = (message: string, setting?: SettingRef) =>
            issues.push({ message, nodeId: node.id, ...(setting ? { setting } : {}) });
        const formulaIssue = (source: string | undefined, setting: SettingRef) => {
            const problem = formulaSyntaxProblem(source);
            if (problem) issue(inElement(name, problem), setting);
        };
        if (node.type === 'section' || node.type === 'group') {
            if (node.title.trim().length === 0) issue(messages.emptyLabel, at('content', 'title'));
        }
        if ((node.type === 'table' || node.type === 'list') && node.title?.trim() === '') {
            issue(messages.emptyLabel, at('content', 'title'));
        }
        if (node.type === 'table') {
            checkEffectiveKey(node.valueKey ?? node.id, node.id, at('value', 'valueKey'));
            if (node.minRows > node.maxRows) issue(messages.invalidBounds, at('limits', 'minRows'));
            node.columns.forEach((column, index) => {
                const columnName = column.label.trim() || `#${index + 1}`;
                checkFieldSettings(column, messages, (problem, setting) =>
                    issue(
                        translate(uiMessages.sheet.templates.editor.issueColumn, {
                            table: name,
                            column: columnName,
                            problem,
                        }),
                        at('content', `column:${column.id}.${setting.key}`)
                    )
                );
            });
        }
        if (isTemplateField(node)) {
            checkEffectiveKey(node.valueKey ?? node.id, node.id, at('value', 'valueKey'));
            checkFieldSettings(node, messages, (problem, setting, named) =>
                issue(named ? problem : inElement(name, problem), setting)
            );
        }
        if (node.type === 'primitive') {
            formulaIssue(node.minFrom, at('limits', 'minFrom'));
            formulaIssue(node.maxMinFrom, at('limits', 'maxMinFrom'));
            formulaIssue(node.maxFrom, at('limits', 'maxFrom'));
        }
        if (node.type === 'list') {
            if ((node.valueKey === undefined) === (node.bindingKey === undefined)) {
                issue(
                    inElement(name, translate(uiMessages.sheet.templates.editor.issueListSource)),
                    at('value', 'source')
                );
            }
            if (node.valueKey !== undefined) {
                checkEffectiveKey(node.valueKey, node.id, at('value', 'valueKey'));
                const item = listItemField(node);
                checkFieldSettings(item, messages, (problem, setting) =>
                    issue(
                        setting.key === 'label'
                            ? translate(uiMessages.sheet.templates.editor.issueEntryLabel, {
                                  list: name,
                              })
                            : inElement(name, problem),
                        at('content', `entry.${setting.key}`)
                    )
                );
            }
            (node.presets ?? []).forEach((preset, index) => {
                if (preset.label.trim().length === 0) {
                    issue(
                        inElement(
                            name,
                            translate(uiMessages.sheet.templates.editor.issuePresetEmpty)
                        ),
                        at('content', `preset:${index}`)
                    );
                }
            });
        }
        // A built-in tracker's extra columns keep their values under their own key.
        if (node.type === 'primitive' && (node.tracker?.columns ?? []).length > 0) {
            checkEffectiveKey(node.tracker?.valueKey ?? node.id, node.id, at('look', 'tracker'));
        }
    });

    // Cycle detection across formula writers (FR-14; defense in depth at render separately).
    const dependencies: FormulaDependencyEntry[] = collectFormulaDependencies(draft).map(
        (source) => ({ id: source.id, writes: source.writes, reads: source.reads })
    );
    for (const cycle of detectDependencyCycles(dependencies)) {
        issues.push({
            message: interpolate(messages.circularDependency, { id: cycle.join(' → ') }),
            nodeId: cycle[0],
        });
    }
    for (const reference of validateTemplateReferences(draft)) {
        const { message, setting, formula } = referenceIssue(reference, messages);
        const element = names.get(reference.nodeId);
        issues.push({
            message: formula && element ? inElement(element, message) : message,
            nodeId: reference.nodeId,
            ...(setting ? { setting } : {}),
        });
    }
    return issues.map((issue) => ownedByContainer(draft, issue));
}

/**
 * Table columns and list entry fields are not tree nodes: their issues select the table or list
 * and point at the column's or entry's setting inside its Content group (spec 022, R3).
 */
function ownedByContainer(draft: EditorDraft, issue: DraftIssue): DraftIssue {
    if (!issue.nodeId || findNode(draft, issue.nodeId)) return issue;
    let owner: { nodeId: string; prefix: string } | undefined;
    walkTemplateNodes(draft.children, (node) => {
        if (owner) return;
        if (node.type === 'table' && node.columns.some(({ id }) => id === issue.nodeId)) {
            owner = { nodeId: node.id, prefix: `column:${issue.nodeId}.` };
        }
        if (node.type === 'list' && node.item?.id === issue.nodeId) {
            owner = { nodeId: node.id, prefix: 'entry.' };
        }
    });
    if (!owner) return issue;
    return {
        ...issue,
        nodeId: owner.nodeId,
        setting: at('content', `${owner.prefix}${issue.setting?.key ?? 'label'}`),
    };
}

// ---------------------------------------------------------------------------
// Field-scoped tree operations (a field may live anywhere; table columns likewise).
// ---------------------------------------------------------------------------

function mapTableColumns(
    draft: EditorDraft,
    tableId: string,
    map: (columns: TemplateField[]) => TemplateField[]
): EditorDraft {
    return withChildren(
        draft,
        mapNodes(draft.children, (node) =>
            node.type === 'table' && node.id === tableId
                ? { ...node, columns: map([...node.columns]) }
                : node
        )
    );
}

export function addTableColumn(draft: EditorDraft, tableId: string): EditorDraft {
    return mapTableColumns(draft, tableId, (columns) =>
        columns.length >= TEMPLATE_LIMITS.tableColumnsMax
            ? columns
            : [...columns, newField('text', `Column ${columns.length + 1}`)]
    );
}

/** Moves a table column (spec 022, US5): cells are keyed by column id, so values stay put. */
export function moveTableColumn(
    draft: EditorDraft,
    tableId: string,
    from: number,
    to: number
): EditorDraft {
    return mapTableColumns(draft, tableId, (columns) => moveItem(columns, from, to));
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
    return withChildren(
        draft,
        mapNodes(draft.children, (node) => {
            if (node.type === 'table' && node.columns.some((column) => column.id === fieldId)) {
                return {
                    ...node,
                    columns: node.columns.map((column) =>
                        column.id === fieldId ? map(column) : column
                    ),
                };
            }
            // A custom list's entry template (spec 016); a legacy list gets its item on first edit.
            if (node.type === 'list' && node.valueKey !== undefined) {
                const item = listItemField(node);
                if (item.id !== fieldId) return node;
                const next = map(item);
                return next.type === 'formula' || next.type === 'tracker'
                    ? node
                    : { ...node, item: next };
            }
            return isTemplateField(node) && node.id === fieldId ? map(node) : node;
        })
    );
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
    return mapFieldItems(draft, fieldId, (field) => {
        const retyped = retypeField(field, type);
        // A new reference points at documents of the template's own kind by default.
        return retyped.type === 'reference' && field.type !== 'reference'
            ? { ...retyped, targetKinds: [draft.documentKind] }
            : retyped;
    });
}

export function updateField(
    draft: EditorDraft,
    fieldId: string,
    updates: Partial<TemplateField>
): EditorDraft {
    return mapFieldItems(draft, fieldId, (field) => {
        const next = { ...field, ...updates } as TemplateField;
        // An author-edited label replaces the shipped translation reference (term kept, above).
        if ('label' in updates) keepTermOnRename(next as TermCarrier);
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
                {
                    id: generateDraftId('opt'),
                    label: translate(uiMessages.sheet.templates.editor.newOption, {
                        index: field.options.length + 1,
                    }),
                },
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

export function describeDraft(draft: EditorDraft, description: string): EditorDraft {
    return { ...draft, description: description.length > 0 ? description : undefined };
}

/**
 * Moves the draft to another system, document kind, or user setting (T-070). The tree is kept:
 * bindings the new target lacks surface as draft issues on their elements, never dropped.
 */
export function setDraftTarget(
    draft: EditorDraft,
    target: { systemId: string; documentKind: string; settingId?: string }
): EditorDraft {
    const { settingId: _previous, ...rest } = draft;
    void _previous;
    return {
        ...rest,
        systemId: SystemIdSchema.parse(target.systemId),
        documentKind: target.documentKind as EditorDraft['documentKind'],
        ...(target.settingId ? { settingId: target.settingId } : {}),
    };
}

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
