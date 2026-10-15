import type { ReactNode } from 'react';

/** The tools that can be tabs of the layout or floating windows (spec 036). */
export const TOOL_IDS = ['documents', 'library', 'dice'] as const;
export type ToolId = (typeof TOOL_IDS)[number];

/**
 * A tab of the layout as a string: `d:<document id>` or `t:<tool id>`. Strings keep order, dedup,
 * and the stored layout simple; another kind of tab is another prefix.
 */
export type TabKey = string;

export type ParsedTabKey = { kind: 'document'; id: string } | { kind: 'tool'; id: ToolId };

export const docKey = (documentId: string): TabKey => `d:${documentId}`;
export const toolKey = (toolId: ToolId): TabKey => `t:${toolId}`;

const isTool = (value: string): value is ToolId => (TOOL_IDS as readonly string[]).includes(value);

export function parseTabKey(key: string): ParsedTabKey | null {
    const id = key.slice(2);
    if (id.length === 0) return null;
    if (key.startsWith('d:')) return { kind: 'document', id };
    if (key.startsWith('t:') && isTool(id)) return { kind: 'tool', id };
    return null;
}

export const documentIdOf = (key: TabKey): string | null =>
    key.startsWith('d:') && key.length > 2 ? key.slice(2) : null;

/** How a tool tab is drawn; documents are drawn by the sheet itself. */
export interface TabKind {
    title: () => string;
    render: () => ReactNode;
    /** The tab was closed (the tool closes with it). */
    onClose?: () => void;
}

const kinds = new Map<ToolId, TabKind>();

/** Registers how a tool is drawn; returns the release (for adapters mounted with a page). */
export function registerTabKind(toolId: ToolId, kind: TabKind): () => void {
    kinds.set(toolId, kind);
    return () => {
        if (kinds.get(toolId) === kind) kinds.delete(toolId);
    };
}

export function tabKindOf(key: TabKey): TabKind | undefined {
    const parsed = parseTabKey(key);
    return parsed?.kind === 'tool' ? kinds.get(parsed.id) : undefined;
}
