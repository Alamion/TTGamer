import { isTemplateCompatible } from '../../systems/view';
import type {
    CustomTemplate,
    GroupNode,
    ListItemField,
    ListNode,
    SectionNode,
    TableNode,
    TemplateField,
    TemplateNode,
} from '../../types/template';
import {
    LIST_ITEM_TYPES,
    listItemField,
    listValueKey,
    tableValueKey,
    walkTemplateNodes,
} from '../../types/template';
import { switchElement, type SwitchStash } from './settings/keepSettings';

/** How the editor names container and list elements (spec 022, R8); stored types are kept. */
export type ElementKind =
    { element: 'group'; kind: 'section' | 'card' } | { element: 'list'; kind: 'entries' | 'table' };

export type GroupKind = Extract<ElementKind, { element: 'group' }>['kind'];
export type ListKind = Extract<ElementKind, { element: 'list' }>['kind'];

export function elementKind(node: TemplateNode): ElementKind | undefined {
    switch (node.type) {
        case 'section':
            return { element: 'group', kind: 'section' };
        case 'group':
            return { element: 'group', kind: 'card' };
        case 'list':
            return { element: 'list', kind: 'entries' };
        case 'table':
            return { element: 'list', kind: 'table' };
        default:
            return undefined;
    }
}

/** Settings one kind has and the other lacks, kept for the session (`SwitchStash`). */
export type KindStash = SwitchStash;

function stashOf(stash: KindStash, nodeId: string): Record<string, unknown> {
    return stash.get(nodeId) ?? {};
}

function keep(stash: KindStash, nodeId: string, values: Record<string, unknown>) {
    const defined = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined)
    );
    stash.set(nodeId, { ...stashOf(stash, nodeId), ...defined });
}

function take<T>(stash: KindStash, nodeId: string, key: string): T | undefined {
    return stashOf(stash, nodeId)[key] as T | undefined;
}

/**
 * Section ↔ card. A card made from a section stays foldable; a section made from a card drops
 * the card's title switch and opt-in folding, kept aside for switching back.
 */
export function switchGroupKind(
    node: SectionNode | GroupNode,
    kind: GroupKind,
    stash: KindStash
): SectionNode | GroupNode {
    if (kind === 'card') {
        if (node.type === 'group') return node;
        const { type: _type, ...shared } = node;
        void _type;
        const hideTitle = take<boolean>(stash, node.id, 'hideTitle');
        return {
            ...shared,
            type: 'group',
            collapsible: take<boolean>(stash, node.id, 'collapsible') ?? true,
            ...(hideTitle ? { hideTitle } : {}),
        };
    }
    if (node.type === 'section') return node;
    const { type: _type, hideTitle, collapsible, ...shared } = node;
    void _type;
    keep(stash, node.id, { hideTitle, collapsible });
    return { ...shared, type: 'section' };
}

/** Lists without a table equivalent: game lists and lists suggesting catalog entries. */
export function tableKindBlocked(node: ListNode | TableNode): boolean {
    return node.type === 'list' && (node.bindingKey !== undefined || node.catalog !== undefined);
}

/** A column as the entry field of a list: entry types only, other types become text. */
function entryFromColumn(column: TemplateField): ListItemField {
    if ((LIST_ITEM_TYPES as readonly string[]).includes(column.type)) {
        return column as ListItemField;
    }
    return {
        id: column.id,
        type: 'text',
        label: column.label,
        required: false,
        compact: false,
        multiline: false,
    };
}

/**
 * Entries ↔ table (spec 022, R8). The entry field becomes the first column (same id) and back;
 * a table's other columns are dropped (returned so the author can confirm) and, like the
 * list-only settings, kept aside for the session. The value key is kept: stored values of the
 * other shape are not shown, and the save asks first.
 */
export function switchListKind(
    node: ListNode | TableNode,
    kind: ListKind,
    stash: KindStash
): { node: ListNode | TableNode; dropped: readonly TemplateField[] } {
    if (kind === 'table') {
        if (node.type === 'table' || tableKindBlocked(node)) return { node, dropped: [] };
        const item = listItemField(node);
        keep(stash, node.id, { listColumns: node.columns });
        const extra = take<TemplateField[]>(stash, node.id, 'extraColumns') ?? [];
        const table: TableNode = {
            id: node.id,
            type: 'table',
            ...(node.title !== undefined ? { title: node.title } : {}),
            ...(node.labelMessage !== undefined ? { labelMessage: node.labelMessage } : {}),
            ...(node.valueKey !== undefined ? { valueKey: node.valueKey } : {}),
            minRows: take<number>(stash, node.id, 'minRows') ?? 0,
            maxRows: take<number>(stash, node.id, 'maxRows') ?? 100,
            columns: [item as TemplateField, ...extra.filter(({ id }) => id !== item.id)],
        };
        return { node: switchElement(node, table, stash).node as TableNode, dropped: [] };
    }
    if (node.type === 'list') return { node, dropped: [] };
    const [first, ...rest] = node.columns;
    keep(stash, node.id, { minRows: node.minRows, maxRows: node.maxRows, extraColumns: rest });
    const list: ListNode = {
        id: node.id,
        type: 'list',
        ...(node.title !== undefined ? { title: node.title } : {}),
        ...(node.labelMessage !== undefined ? { labelMessage: node.labelMessage } : {}),
        valueKey: node.valueKey ?? node.id,
        columns: take<number>(stash, node.id, 'listColumns') ?? 1,
        ...(first ? { item: entryFromColumn(first) } : {}),
    };
    return { node: switchElement(node, list, stash).node as ListNode, dropped: rest };
}

/** A list or table whose kind a save changes while documents hold values of the old kind. */
export interface KindChange {
    nodeId: string;
    title: string;
    kind: ListKind;
}

interface StoredDocument {
    systemId: string;
    kind: string;
    templateValues?: Readonly<Record<string, unknown>>;
}

function hasValues(stored: unknown): boolean {
    if (Array.isArray(stored)) return stored.length > 0;
    return typeof stored === 'object' && stored !== null && Object.keys(stored).length > 0;
}

/**
 * Lists and tables saved as the other kind (spec 022, US6): entries and table rows are stored in
 * different shapes, so values of the old kind stop showing. Nothing is deleted; the save asks.
 */
export function kindChangeReport(
    before: CustomTemplate | undefined,
    after: CustomTemplate,
    documents: readonly StoredDocument[]
): KindChange[] {
    if (!before) return [];
    const previous = new Map<string, ListNode | TableNode>();
    walkTemplateNodes(before.children, (node) => {
        if (node.type === 'list' || node.type === 'table') previous.set(node.id, node);
    });
    const changes: KindChange[] = [];
    walkTemplateNodes(after.children, (node) => {
        if (node.type !== 'list' && node.type !== 'table') return;
        const old = previous.get(node.id);
        if (!old || old.type === node.type) return;
        const key = old.type === 'table' ? tableValueKey(old) : listValueKey(old);
        const stored = documents.some(
            (document) =>
                isTemplateCompatible(after, document) && hasValues(document.templateValues?.[key])
        );
        if (!stored) return;
        changes.push({
            nodeId: node.id,
            title: node.title ?? node.id,
            kind: node.type === 'table' ? 'table' : 'entries',
        });
    });
    return changes;
}
