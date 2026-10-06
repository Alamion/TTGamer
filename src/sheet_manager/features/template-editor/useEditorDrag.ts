import {
    createContext,
    type PointerEvent as ReactPointerEvent,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type { OverlayPlacement } from '../sheet/declarative/editorOverlay';
import { type EditorDraft, findNodePosition, placeNode } from './draft';
import { placeNodes } from './multiOps';

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** A legal-looking insertion point on screen: its key, placement, and rectangle. */
export interface DropSlot {
    key: string;
    placement: OverlayPlacement;
    rect: Rect;
}

/** Pointer travel before a press becomes a drag. */
export const DRAG_THRESHOLD_PX = 5;
/** How long the pointer rests on one target before the page shows the move. */
export const PREVIEW_DWELL_MS = 320;
/** While previewing, the target changes only after the pointer travels this far. */
export const PREVIEW_HYSTERESIS_PX = 8;
const AUTOSCROLL_EDGE_PX = 48;
const AUTOSCROLL_STEP_PX = 12;
/** A click this soon after a drag ends belongs to the drag's release, not to the page. */
const RELEASE_CLICK_MS = 50;

let lastDragEnd = 0;

/** True for the click a browser sends right after a drag ends (it must not select anything). */
export function isReleaseClick(): boolean {
    return Date.now() - lastDragEnd < RELEASE_CLICK_MS;
}

/** The slot key format of `InsertSlot`: `<parent|root>:<index>:<column|->`. */
export function slotKey({ parentId, index, column }: OverlayPlacement): string {
    return `${parentId ?? 'root'}:${index}:${column ?? '-'}`;
}

export function parseSlotKey(key: string): OverlayPlacement | undefined {
    const match = /^(.+):(\d+):(\d+|-)$/.exec(key);
    if (!match) return undefined;
    const [, parent, index, column] = match;
    return {
        parentId: parent === 'root' ? null : parent!,
        index: Number(index),
        column: column === '-' ? null : Number(column),
    };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function distanceToRect(point: Point, rect: Rect): number {
    const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
    return Math.hypot(dx, dy);
}

const contains = (rect: Rect, point: Point) =>
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;

const area = (rect: Rect) => (rect.right - rect.left) * (rect.bottom - rect.top);

/**
 * The slot a drop at `point` goes to (spec 022, R5): the nearest accepted slot of the innermost
 * container under the pointer, else of the next container out, else the nearest of all.
 * `containers` maps a parent id (`root` for the page) to its rectangle; `accept` refuses slots
 * inside the dragged subtree, past the depth limit, or where nothing would move.
 */
export function nearestPlacement(
    slots: readonly DropSlot[],
    point: Point,
    containers: ReadonlyMap<string, Rect>,
    accept: (slot: DropSlot) => boolean = () => true
): DropSlot | undefined {
    const byDistance = (candidates: readonly DropSlot[]) =>
        [...candidates].sort(
            (a, b) => distanceToRect(point, a.rect) - distanceToRect(point, b.rect)
        );
    const under = [...containers]
        .filter(([, rect]) => contains(rect, point))
        .sort(([, a], [, b]) => area(a) - area(b))
        .map(([id]) => id);
    for (const parent of under) {
        const found = byDistance(
            slots.filter(({ placement }) => (placement.parentId ?? 'root') === parent)
        ).find(accept);
        if (found) return found;
    }
    return byDistance(slots).find(accept);
}

export type DragPhase<Target> =
    | { phase: 'idle' }
    | { phase: 'pending'; nodeId: string; start: Point }
    | { phase: 'dragging'; nodeId: string; target?: Target; since: number; at: Point }
    | { phase: 'previewing'; nodeId: string; target: Target; at: Point };

export type DragEvent<Target> =
    | { type: 'down'; nodeId: string; point: Point }
    | { type: 'move'; point: Point; now: number; target?: Target }
    | { type: 'tick'; now: number }
    | { type: 'cancel' };

const IDLE = { phase: 'idle' } as const;

/**
 * The drag state machine (data-model.md, DragState): pending until the pointer travels 5 px,
 * dragging while the target changes, previewing after 320 ms on one target, and back to dragging
 * only when another target is nearest and the pointer moved 8 px since the preview.
 */
export function dragTransition<Target extends { key: string }>(
    state: DragPhase<Target>,
    event: DragEvent<Target>
): DragPhase<Target> {
    if (event.type === 'cancel') return IDLE;
    switch (state.phase) {
        case 'idle':
            return event.type === 'down'
                ? { phase: 'pending', nodeId: event.nodeId, start: event.point }
                : state;
        case 'pending':
            if (event.type !== 'move') return state;
            return distance(state.start, event.point) > DRAG_THRESHOLD_PX
                ? {
                      phase: 'dragging',
                      nodeId: state.nodeId,
                      target: event.target,
                      since: event.now,
                      at: event.point,
                  }
                : state;
        case 'dragging':
            if (event.type === 'tick') {
                return state.target && event.now - state.since >= PREVIEW_DWELL_MS
                    ? {
                          phase: 'previewing',
                          nodeId: state.nodeId,
                          target: state.target,
                          at: state.at,
                      }
                    : state;
            }
            if (event.type !== 'move') return state;
            return event.target?.key === state.target?.key
                ? { ...state, at: event.point }
                : { ...state, target: event.target, since: event.now, at: event.point };
        case 'previewing':
            if (event.type !== 'move') return state;
            if (
                !event.target ||
                event.target.key === state.target.key ||
                distance(state.at, event.point) <= PREVIEW_HYSTERESIS_PX
            ) {
                return state;
            }
            return {
                phase: 'dragging',
                nodeId: state.nodeId,
                target: event.target,
                since: event.now,
                at: event.point,
            };
    }
}

/** A computed drop: the slot it marks and the draft the page would show. */
interface DropTarget {
    key: string;
    draft: EditorDraft;
}

export type DragSurface = 'page' | 'outline';

const rectOf = (element: Element): Rect => {
    const { left, top, right, bottom } = element.getBoundingClientRect();
    return { left, top, right, bottom };
};

/** The insertion points and containers a surface shows now. */
function surfaceSlots(surface: DragSurface): {
    slots: DropSlot[];
    containers: Map<string, Rect>;
} {
    const slots: DropSlot[] = [];
    const containers = new Map<string, Rect>();
    if (surface === 'page') {
        const page = document.querySelector('[data-editor-page]');
        if (!page) return { slots, containers };
        containers.set('root', rectOf(page));
        for (const element of page.querySelectorAll('[data-insert-slot]')) {
            const key = element.getAttribute('data-insert-slot')!;
            const placement = parseSlotKey(key);
            if (placement) slots.push({ key, placement, rect: rectOf(element) });
        }
        for (const frame of page.querySelectorAll('[data-editor-frame][data-node-id]')) {
            containers.set(frame.getAttribute('data-node-id')!, rectOf(frame));
        }
    } else {
        for (const list of document.querySelectorAll('[data-outline] ul[data-children-of]')) {
            containers.set(list.getAttribute('data-children-of')!, rectOf(list));
        }
        for (const element of document.querySelectorAll('[data-outline] [data-outline-slot]')) {
            const key = element.getAttribute('data-outline-slot')!;
            const placement = parseSlotKey(key);
            if (!placement) continue;
            // A row stands for "before this element": its insertion line is its top edge.
            const rect = rectOf(element);
            slots.push({ key, placement, rect: { ...rect, bottom: rect.top + 2 } });
        }
    }
    return { slots, containers };
}

/** The node's place, so a slot that leaves it there can be refused. */
function sameSpot(before: EditorDraft, after: EditorDraft, nodeId: string): boolean {
    const was = findNodePosition(before, nodeId);
    const now = findNodePosition(after, nodeId);
    return (
        was !== undefined &&
        now !== undefined &&
        was.parentId === now.parentId &&
        was.index === now.index &&
        was.siblings[was.index]?.column === now.siblings[now.index]?.column
    );
}

function setMarker(attribute: string, selector: string | undefined) {
    for (const element of document.querySelectorAll(`[${attribute}]`)) {
        if (!selector || !element.matches(selector)) element.removeAttribute(attribute);
    }
    if (selector) {
        for (const element of document.querySelectorAll(selector)) {
            element.setAttribute(attribute, '');
        }
    }
}

/** Where the dragged element stood, as a slot key of the preview draft (its dashed place). */
function originKey(original: EditorDraft, preview: EditorDraft, nodeId: string) {
    const position = findNodePosition(original, nodeId);
    if (!position) return undefined;
    const { parentId } = position;
    const shown =
        parentId === null
            ? preview.children
            : (
                  findNodePosition(preview, parentId)?.siblings.find(
                      ({ id }) => id === parentId
                  ) as { children?: readonly { id: string; column?: number }[] } | undefined
              )?.children;
    if (!shown) return undefined;
    // Stacked columns: the slot sits before the next element of the same column, or ends it.
    const column = position.siblings[position.index]?.column ?? null;
    const inColumn = (node: { column?: number }) =>
        column === null || (node.column ?? 1) === column;
    const next = position.siblings.slice(position.index + 1).find(inColumn);
    const nextIndex = next ? shown.findIndex(({ id }) => id === next.id) : -1;
    const lastIndex = shown.map(inColumn).lastIndexOf(true);
    const index =
        nextIndex >= 0
            ? nextIndex
            : column === null || lastIndex < 0
              ? shown.length
              : lastIndex + 1;
    return slotKey({ parentId, index, column });
}

interface DragMarks {
    target?: string;
    origin?: string;
    previewing?: string;
}

/** Puts the marker, the dashed origin, and the preview mark on whatever the DOM shows now. */
function applyMarks(marks: DragMarks) {
    setMarker('data-drop-target', marks.target);
    setMarker('data-origin-slot', marks.origin);
    setMarker('data-previewing', marks.previewing);
}

export interface EditorDragView {
    nodeId: string;
    /** Every dragged element: the selection when the grip belongs to it (spec 023). */
    nodeIds: readonly string[];
    /** The uncommitted draft the page and outline show once previewing (never in history). */
    preview?: EditorDraft;
}

/** What grips and surfaces use; stable for the dialog's lifetime. */
export interface EditorDrag {
    start(nodeId: string, event: ReactPointerEvent, surface: DragSurface): void;
    /** The page reports each draft it renders (it follows the draft deferred). */
    pageRendered(draft: EditorDraft): void;
    /** Re-applies the drag marks after a surface re-rendered. */
    refreshMarks(): void;
}

export const EditorDragContext = createContext<EditorDrag | null>(null);

export function useEditorDragContext(): EditorDrag | null {
    return useContext(EditorDragContext);
}

/**
 * Pointer-driven drag of template elements (spec 022, US2): mouse and pen only (touch keeps the
 * move buttons). The marker and the origin slot are set on the DOM directly, so pointer moves
 * re-render nothing; only a preview re-renders the page.
 */
export function useEditorDrag({
    getDraft,
    draggedWith,
    nameOf,
    onCommit,
}: {
    getDraft: () => EditorDraft;
    /** The elements a grip drags: the selection when it holds the grip's element, else that one. */
    draggedWith: (nodeId: string) => readonly string[];
    nameOf: (nodeIds: readonly string[]) => string;
    onCommit: (nodeIds: readonly string[], draft: EditorDraft) => void;
}): { view: EditorDragView | null; drag: EditorDrag } {
    const [view, setView] = useState<EditorDragView | null>(null);
    const pageDraft = useRef<EditorDraft | undefined>(undefined);
    const session = useRef<(() => void) | null>(null);
    const marks = useRef<DragMarks>({});
    const refreshMarks = useCallback(() => {
        if (session.current) applyMarks(marks.current);
    }, []);
    const pageRendered = useCallback(
        (draft: EditorDraft) => {
            pageDraft.current = draft;
            refreshMarks();
        },
        [refreshMarks]
    );

    const start = useCallback(
        (nodeId: string, event: ReactPointerEvent, surface: DragSurface) => {
            if (event.button !== 0 || event.pointerType === 'touch') return;
            event.preventDefault();
            session.current?.();
            let state: DragPhase<DropTarget> = dragTransition<DropTarget>(
                { phase: 'idle' },
                { type: 'down', nodeId, point: { x: event.clientX, y: event.clientY } }
            );
            const nodeIds = draggedWith(nodeId);
            let preview: EditorDraft | undefined;
            let last: Point = { x: event.clientX, y: event.clientY };
            let dwell: ReturnType<typeof setTimeout> | undefined;
            let frame = 0;
            let ghost: HTMLElement | undefined;
            const scroller = document.querySelector<HTMLElement>(
                surface === 'page'
                    ? '[data-editor-scroll="page"]'
                    : '[data-editor-scroll="outline"]'
            );

            // Slot keys mean positions in the draft the surface shows: the page follows the
            // draft deferred, the outline at once.
            const base = () =>
                surface === 'page' ? (pageDraft.current ?? getDraft()) : (preview ?? getDraft());

            const findTarget = (point: Point): DropTarget | undefined => {
                const current = base();
                const { slots, containers } = surfaceSlots(surface);
                let result: DropTarget | undefined;
                nearestPlacement(slots, point, containers, (slot) => {
                    const placed =
                        nodeIds.length === 1
                            ? placeNode(current, nodeId, slot.placement)
                            : placeNodes(current, nodeIds, slot.placement);
                    if (!placed.ok || nodeIds.every((id) => sameSpot(current, placed.draft, id))) {
                        return false;
                    }
                    result = { key: slot.key, draft: placed.draft };
                    return true;
                });
                return result;
            };

            const markTarget = () => {
                const target =
                    state.phase === 'dragging' || state.phase === 'previewing'
                        ? state.target
                        : undefined;
                const attribute = surface === 'page' ? 'data-insert-slot' : 'data-outline-slot';
                marks.current.target = target ? `[${attribute}="${target.key}"]` : undefined;
                applyMarks(marks.current);
            };

            const apply = (next: DragPhase<DropTarget>) => {
                const previous = state;
                state = next;
                if (next.phase === 'previewing' && previous.phase !== 'previewing') {
                    preview = next.target.draft;
                    const origin = originKey(getDraft(), preview, nodeIds[0] ?? nodeId);
                    marks.current.origin = origin
                        ? `[data-insert-slot="${origin}"], [data-outline-slot="${origin}"]`
                        : undefined;
                    marks.current.previewing = nodeIds
                        .map((id) => `[data-editor-frame][data-node-id="${id}"]`)
                        .join(', ');
                    setView({ nodeId, nodeIds, preview });
                }
                if (next.phase === 'dragging' && previous.phase === 'pending') {
                    setView({ nodeId, nodeIds });
                    ghost = document.createElement('div');
                    ghost.setAttribute('data-drag-ghost', '');
                    ghost.textContent = nameOf(nodeIds);
                    ghost.className =
                        'pointer-events-none fixed z-[10001] rounded bg-primary-muted px-2 py-0.5 text-xs text-white shadow';
                    document.body.appendChild(ghost);
                }
                if (
                    next.phase === 'dragging' &&
                    (previous.phase !== 'dragging' || previous.since !== next.since)
                ) {
                    clearTimeout(dwell);
                    dwell = setTimeout(
                        () => apply(dragTransition(state, { type: 'tick', now: Date.now() })),
                        PREVIEW_DWELL_MS
                    );
                }
                markTarget();
            };

            const move = (point: Point) => {
                last = point;
                if (ghost) {
                    ghost.style.left = `${point.x + 12}px`;
                    ghost.style.top = `${point.y + 12}px`;
                }
                const target =
                    state.phase === 'pending' && distance(state.start, point) <= DRAG_THRESHOLD_PX
                        ? undefined
                        : findTarget(point);
                apply(dragTransition(state, { type: 'move', point, now: Date.now(), target }));
            };

            const autoscroll = () => {
                frame = 0;
                if (!scroller || state.phase === 'idle' || state.phase === 'pending') return;
                const { top, bottom } = scroller.getBoundingClientRect();
                const step =
                    last.y < top + AUTOSCROLL_EDGE_PX
                        ? -AUTOSCROLL_STEP_PX
                        : last.y > bottom - AUTOSCROLL_EDGE_PX
                          ? AUTOSCROLL_STEP_PX
                          : 0;
                if (step === 0 || bottom - top <= AUTOSCROLL_EDGE_PX * 2) return;
                scroller.scrollTop += step;
                move(last);
                frame = window.requestAnimationFrame(autoscroll);
            };

            const end = (commit: boolean) => {
                const target =
                    state.phase === 'dragging' || state.phase === 'previewing'
                        ? state.target
                        : undefined;
                const dragged = state.phase !== 'pending';
                cleanup();
                if (commit && target) onCommit(nodeIds, target.draft);
                if (dragged) lastDragEnd = Date.now();
            };

            const onMove = (moveEvent: PointerEvent) => {
                move({ x: moveEvent.clientX, y: moveEvent.clientY });
                if (!frame) frame = window.requestAnimationFrame(autoscroll);
            };
            const onUp = () => end(true);
            const onCancel = () => end(false);
            const onKey = (key: KeyboardEvent) => {
                if (key.key !== 'Escape') return;
                // Escape cancels the drag, not the dialog.
                key.stopPropagation();
                key.preventDefault();
                end(false);
            };

            const cleanup = () => {
                clearTimeout(dwell);
                if (frame) window.cancelAnimationFrame(frame);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onCancel);
                window.removeEventListener('blur', onCancel);
                window.removeEventListener('keydown', onKey, true);
                ghost?.remove();
                marks.current = {};
                applyMarks(marks.current);
                state = { phase: 'idle' };
                preview = undefined;
                session.current = null;
                setView(null);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onCancel);
            window.addEventListener('blur', onCancel);
            window.addEventListener('keydown', onKey, true);
            session.current = cleanup;
        },
        [draggedWith, getDraft, nameOf, onCommit]
    );

    useEffect(() => () => session.current?.(), []);

    useEffect(() => {
        if (view) refreshMarks();
    }, [view, refreshMarks]);

    const drag = useMemo(
        () => ({ start, pageRendered, refreshMarks }),
        [start, pageRendered, refreshMarks]
    );
    return { view, drag };
}
