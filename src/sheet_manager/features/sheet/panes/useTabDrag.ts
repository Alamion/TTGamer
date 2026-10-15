import { type DragEvent, useCallback, useRef, useState } from 'react';

import { type DropTarget, TAB_MIME } from './dropTargets';

const same = (a: DropTarget | null, b: DropTarget | null) =>
    JSON.stringify(a) === JSON.stringify(b);

/**
 * Dragging tabs with the browser's drag and drop (spec 036, D8): the key of the dragged tab stays
 * in the page, the event carries only its type, so `dragover` can tell a tab from anything else.
 * A drag that ends without a drop (Escape, a place that is not a target) changes nothing.
 */
export function useTabDrag(apply: (key: string, target: DropTarget) => void) {
    const dragged = useRef<string | null>(null);
    const [target, setTarget] = useState<DropTarget | null>(null);
    const carries = (event: DragEvent) =>
        dragged.current !== null && Array.from(event.dataTransfer.types).includes(TAB_MIME);

    const start = useCallback((key: string, event: DragEvent) => {
        dragged.current = key;
        event.dataTransfer.setData(TAB_MIME, key);
        event.dataTransfer.effectAllowed = 'move';
    }, []);
    const end = useCallback(() => {
        dragged.current = null;
        setTarget(null);
    }, []);
    /** A dragged tab is over a place: `next` is where it would land there, or nothing. */
    const over = (next: DropTarget | null, event: DragEvent) => {
        if (!carries(event)) return;
        if (next) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        }
        setTarget((previous) => (same(previous, next) ? previous : next));
    };
    const drop = (next: DropTarget | null, event: DragEvent) => {
        if (!carries(event) || !next) return;
        event.preventDefault();
        const key = dragged.current!;
        end();
        apply(key, next);
    };
    return { dragged, target, start, end, over, drop, clear: () => setTarget(null) };
}
