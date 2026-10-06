import type { TemplateNode } from '../../../types/template';
import { CustomTemplateSchema, isContainerNode, walkTemplateNodes } from '../../../types/template';
import { insertNodesAt, type MultiOpResult } from '../operations/multi';
import { cloneWithFreshIds } from './clone';
import { normalizeSelection } from './selection';
import { findNode, findNodePosition, type NodePlacement } from './tree';
import { type EditorDraft } from './types';

/**
 * Copied template elements as clipboard text (spec 023, contracts/editor-ui.md). The text is
 * untrusted on paste: it may come from another tab, browser, or author (clarification Q1).
 */
export const COPIED_ELEMENTS_FORMAT = 'ttgamer-template-elements';
export const COPIED_ELEMENTS_VERSION = 1;

export interface CopiedElements {
    format: typeof COPIED_ELEMENTS_FORMAT;
    formatVersion: number;
    source: { templateId: string; systemId?: string; documentKind: string };
    nodes: TemplateNode[];
}

export type ParsedCopied =
    | { ok: true; copied: CopiedElements }
    | { ok: false; stage: 'ignored' | 'version' | 'schema'; error?: string };

export function copySelection(draft: EditorDraft, ids: readonly string[]): CopiedElements | null {
    const nodes = normalizeSelection(draft, ids).map((id) => findNode(draft, id)!);
    if (nodes.length === 0) return null;
    return {
        format: COPIED_ELEMENTS_FORMAT,
        formatVersion: COPIED_ELEMENTS_VERSION,
        source: {
            templateId: draft.id,
            systemId: draft.systemId,
            documentKind: draft.documentKind,
        },
        nodes: structuredClone(nodes),
    };
}

export function serializeCopied(copied: CopiedElements): string {
    return JSON.stringify(copied);
}

/**
 * Reads clipboard text for the target draft. Text that is not a copy of elements is `ignored`
 * (the page leaves it alone); the nodes pass the template schema, with the target's system and
 * kind, before anything uses them.
 */
export function parseCopied(text: string, target: EditorDraft): ParsedCopied {
    let payload: unknown;
    try {
        payload = JSON.parse(text);
    } catch {
        return { ok: false, stage: 'ignored' };
    }
    if (
        typeof payload !== 'object' ||
        payload === null ||
        (payload as { format?: unknown }).format !== COPIED_ELEMENTS_FORMAT
    ) {
        return { ok: false, stage: 'ignored' };
    }
    const { formatVersion, nodes, source } = payload as Record<string, unknown>;
    if (
        typeof formatVersion !== 'number' ||
        !Number.isInteger(formatVersion) ||
        formatVersion < 1
    ) {
        return { ok: false, stage: 'schema', error: 'formatVersion' };
    }
    if (formatVersion > COPIED_ELEMENTS_VERSION) return { ok: false, stage: 'version' };
    const parsed = CustomTemplateSchema.safeParse({
        id: 'clipboard',
        name: 'Clipboard',
        systemId: target.systemId,
        documentKind: target.documentKind,
        schemaVersion: target.schemaVersion,
        children: nodes,
    });
    if (!parsed.success) {
        return { ok: false, stage: 'schema', error: parsed.error.issues[0]?.message };
    }
    const from = (typeof source === 'object' && source !== null ? source : {}) as Record<
        string,
        unknown
    >;
    return {
        ok: true,
        copied: {
            format: COPIED_ELEMENTS_FORMAT,
            formatVersion,
            source: {
                templateId: typeof from.templateId === 'string' ? from.templateId : '',
                ...(typeof from.systemId === 'string' ? { systemId: from.systemId } : {}),
                documentKind: typeof from.documentKind === 'string' ? from.documentKind : '',
            },
            nodes: parsed.data.children,
        },
    };
}

let lastCopied: CopiedElements | undefined;

/** The editor's own copy for this tab: the menu's Paste and browsers that block clipboard events. */
export function rememberCopied(copied: CopiedElements): void {
    lastCopied = structuredClone(copied);
}

export function rememberedCopy(): CopiedElements | undefined {
    return lastCopied;
}

function usedCoordinates(draft: EditorDraft): Set<string> {
    const used = new Set<string>();
    walkTemplateNodes(draft.children, (node) => {
        used.add(node.id);
        const keyed = node as { valueKey?: string };
        if (keyed.valueKey) used.add(keyed.valueKey);
        if (node.type === 'table') for (const column of node.columns) used.add(column.id);
        if (node.type === 'list' && node.item) used.add(node.item.id);
    });
    return used;
}

/** Where a paste lands: after the last selected element, inside a selected group, or at the end. */
function pastePlacements(draft: EditorDraft, ids: readonly string[]): NodePlacement[] {
    const end: NodePlacement = { parentId: null, index: draft.children.length, column: null };
    const selected = normalizeSelection(draft, ids);
    const last = selected[selected.length - 1];
    if (!last) return [end];
    const node = findNode(draft, last)!;
    const after = (id: string): NodePlacement | undefined => {
        const position = findNodePosition(draft, id);
        if (!position) return undefined;
        const at = findNode(draft, id)!;
        return {
            parentId: position.parentId,
            index: position.index + 1,
            column: at.column ?? null,
        };
    };
    const candidates: Array<NodePlacement | undefined> = isContainerNode(node)
        ? [{ parentId: node.id, index: node.children.length, column: null }, after(node.id)]
        : [after(node.id)];
    // When the depth limit refuses, the copy goes after the enclosing group, then to the end.
    let parentId = findNodePosition(draft, node.id)?.parentId ?? null;
    while (parentId !== null) {
        candidates.push(after(parentId));
        parentId = findNodePosition(draft, parentId)?.parentId ?? null;
    }
    candidates.push(end);
    return candidates.filter((candidate): candidate is NodePlacement => candidate !== undefined);
}

/** Pastes copied elements with fresh identities as one change; they become the selection. */
export function pasteCopied(
    draft: EditorDraft,
    copied: CopiedElements,
    ids: readonly string[]
): MultiOpResult {
    const samePage = copied.source.templateId === draft.id;
    const targetCoordinates = usedCoordinates(draft);
    const nodes = copied.nodes.map((node) =>
        cloneWithFreshIds(draft, node, { samePage, targetCoordinates })
    );
    let result: MultiOpResult = { ok: false, error: 'self-move' };
    for (const placement of pastePlacements(draft, ids)) {
        result = insertNodesAt(draft, placement, nodes);
        if (result.ok || result.error !== 'depth') return result;
    }
    return result;
}
