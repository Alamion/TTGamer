import type { TemplateNode } from '../../types/template';
import type { EditorDraft } from './draft';

/** The editor's selected elements (spec 023, data-model "Editor selection"). */
export interface EditorSelectionState {
    /** Selected node ids in click order, without duplicates. */
    ids: readonly string[];
    /** Last element clicked without Shift: the start of a Shift range and the paste place. */
    anchor: string | null;
}

export const EMPTY_SELECTION: EditorSelectionState = { ids: [], anchor: null };

export function selectOnly(nodeId: string | null): EditorSelectionState {
    return nodeId === null ? EMPTY_SELECTION : { ids: [nodeId], anchor: nodeId };
}

export function toggleInSelection(
    state: EditorSelectionState,
    nodeId: string
): EditorSelectionState {
    if (!state.ids.includes(nodeId)) return { ids: [...state.ids, nodeId], anchor: nodeId };
    const ids = state.ids.filter((id) => id !== nodeId);
    return {
        ids,
        anchor: state.anchor === nodeId ? (ids[ids.length - 1] ?? null) : state.anchor,
    };
}

interface Siblings {
    parentId: string | null;
    ids: string[];
}

function siblingsOf(draft: EditorDraft, nodeId: string): Siblings | undefined {
    let found: Siblings | undefined;
    const search = (children: readonly TemplateNode[], parentId: string | null): boolean => {
        if (children.some((child) => child.id === nodeId)) {
            found = { parentId, ids: children.map((child) => child.id) };
            return true;
        }
        return children.some(
            (child) =>
                (child.type === 'section' || child.type === 'group') &&
                search(child.children, child.id)
        );
    };
    search(draft.children, null);
    return found;
}

/** Shift+click: the anchor's siblings up to the clicked one, or just the two across parents. */
export function rangeSelection(
    draft: EditorDraft,
    state: EditorSelectionState,
    nodeId: string
): EditorSelectionState {
    const anchor = state.anchor;
    if (anchor === null || anchor === nodeId) return selectOnly(nodeId);
    const around = siblingsOf(draft, anchor);
    const from = around?.ids.indexOf(anchor) ?? -1;
    const to = around?.ids.indexOf(nodeId) ?? -1;
    if (!around || from < 0 || to < 0) {
        return { ids: [...new Set([...state.ids, anchor, nodeId])], anchor };
    }
    const range = around.ids.slice(Math.min(from, to), Math.max(from, to) + 1);
    return { ids: [...new Set([...state.ids, ...range])], anchor };
}

/** Every node id in page order (depth first), with the id of its parent container. */
function pageOrder(draft: EditorDraft): Map<string, { order: number; parentId: string | null }> {
    const order = new Map<string, { order: number; parentId: string | null }>();
    const walk = (children: readonly TemplateNode[], parentId: string | null) => {
        for (const child of children) {
            order.set(child.id, { order: order.size, parentId });
            if (child.type === 'section' || child.type === 'group') walk(child.children, child.id);
        }
    };
    walk(draft.children, null);
    return order;
}

/**
 * The ids every command acts on: existing ones, without those inside another selected element
 * (the ancestor carries them along), in page order.
 */
export function normalizeSelection(draft: EditorDraft, ids: readonly string[]): string[] {
    const order = pageOrder(draft);
    const selected = new Set(ids.filter((id) => order.has(id)));
    const insideSelected = (id: string): boolean => {
        for (let parent = order.get(id)?.parentId; parent; parent = order.get(parent)?.parentId) {
            if (selected.has(parent)) return true;
        }
        return false;
    };
    return [...selected]
        .filter((id) => !insideSelected(id))
        .sort((a, b) => order.get(a)!.order - order.get(b)!.order);
}

/** The one selected element, or null when none or several are selected. */
export function primaryId(state: EditorSelectionState): string | null {
    return state.ids.length === 1 ? state.ids[0]! : null;
}

export function sameSelection(a: EditorSelectionState, b: EditorSelectionState): boolean {
    return (
        a.anchor === b.anchor &&
        a.ids.length === b.ids.length &&
        a.ids.every((id, index) => id === b.ids[index])
    );
}
