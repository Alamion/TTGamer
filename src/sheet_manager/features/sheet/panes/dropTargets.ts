import { useSyncExternalStore } from 'react';

import type { SplitSide } from './layoutTree';

/** Where a dragged tab would land (spec 036, D7). */
export type DropTarget =
    | { kind: 'strip'; groupId: string; gap: number }
    | { kind: 'middle'; groupId: string }
    | { kind: 'edge'; groupId: string; side: SplitSide };

/** The type a dragged tab carries; its key travels in the page, not in the data. */
export const TAB_MIME = 'application/x-ttg-tab';

/**
 * The type a document row of the documents window carries when it is the only row dragged (spec
 * 036, US4); its id also travels in the page, since a drag's data cannot be read until the drop.
 */
export const DOCUMENT_MIME = 'application/x-ttg-document';

let draggedDocument: string | null = null;
const rowDragListeners = new Set<() => void>();

/** A single document row is picked up (`null`: the drag is over). */
export function setDraggedDocument(id: string | null): void {
    if (draggedDocument === id) return;
    draggedDocument = id;
    for (const listener of rowDragListeners) listener();
}

/** Whether a single document row is being dragged now. */
export const useRowDragging = () =>
    useSyncExternalStore(
        (listener) => {
            rowDragListeners.add(listener);
            return () => rowDragListeners.delete(listener);
        },
        () => draggedDocument !== null,
        () => false
    );

/** The document row being dragged, if the event carries one. */
export function documentIn(event: { dataTransfer: DataTransfer | null }): string | null {
    return Array.from(event.dataTransfer?.types ?? []).includes(DOCUMENT_MIME)
        ? draggedDocument
        : null;
}

/** The share of a group's width or height, from each side, that splits it. */
const EDGE_SHARE = 0.25;

interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** The edge of the box the point is nearest to, if it is in that edge's outer quarter. */
export function edgeAt(box: Box, x: number, y: number): SplitSide | null {
    if (box.width <= 0 || box.height <= 0) return null;
    const across = (x - box.left) / box.width;
    const down = (y - box.top) / box.height;
    const distances: [SplitSide, number][] = [
        ['left', across],
        ['right', 1 - across],
        ['top', down],
        ['bottom', 1 - down],
    ];
    const [side, distance] = distances.reduce((nearest, candidate) =>
        candidate[1] < nearest[1] ? candidate : nearest
    );
    return distance < EDGE_SHARE ? side : null;
}

/** The gap of a strip a point falls in: before every tab whose middle is right of it. */
export function gapAt(tabs: readonly Pick<Box, 'left' | 'width'>[], x: number): number {
    const index = tabs.findIndex((tab) => x < tab.left + tab.width / 2);
    return index === -1 ? tabs.length : index;
}

/** The side a body drop takes: an edge when splitting there is allowed, else the middle. */
export function bodyTarget(
    groupId: string,
    side: SplitSide | null,
    canSplit: (side: SplitSide) => boolean
): DropTarget {
    return side && canSplit(side) ? { kind: 'edge', groupId, side } : { kind: 'middle', groupId };
}
