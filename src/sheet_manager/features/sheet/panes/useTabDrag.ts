import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react';

import { documentIn, type DropTarget, TAB_MIME } from './dropTargets';
import { docKey, type TabKey } from './tabKeys';

const same = (a: DropTarget | null, b: DropTarget | null) =>
    JSON.stringify(a) === JSON.stringify(b);

const carriesTab = (event: { dataTransfer: DataTransfer | null }) =>
    Array.from(event.dataTransfer?.types ?? []).includes(TAB_MIME);

/**
 * Dragging tabs with the browser's drag and drop (spec 036, D8): the key of the dragged tab stays
 * in the page, the event carries only its type, so `dragover` can tell a tab from anything else.
 * Dropped outside every group, the tab floats there (`onFloat`); a drag that ends without a drop
 * (Escape) changes nothing. A single document row of the documents window lands the same way
 * (`apply` is told it came from a row), but never floats (US4).
 */
export function useTabDrag(
    onFloat: (key: string, at: { x: number; y: number }) => void,
    apply: (key: string, target: DropTarget, fromRow: boolean) => void
) {
    const dragged = useRef<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [target, setTarget] = useState<DropTarget | null>(null);
    const floatRef = useRef(onFloat);
    useEffect(() => {
        floatRef.current = onFloat;
    });
    /** The tab a drag carries: a tab of the layout, or a document row as its document's tab. */
    const keyOf = (event: DragEvent): TabKey | null => {
        if (dragged.current !== null) return carriesTab(event) ? dragged.current : null;
        const row = documentIn(event);
        return row === null ? null : docKey(row);
    };

    // A row's drag ends in the documents window, which this hook never hears from otherwise.
    useEffect(() => {
        const clear = () => setTarget(null);
        document.addEventListener('dragend', clear);
        return () => document.removeEventListener('dragend', clear);
    }, []);

    const start = useCallback((key: string, event: DragEvent) => {
        dragged.current = key;
        event.dataTransfer.setData(TAB_MIME, key);
        event.dataTransfer.effectAllowed = 'move';
        setDragging(true);
    }, []);
    const end = useCallback(() => {
        dragged.current = null;
        setDragging(false);
        setTarget(null);
    }, []);

    // The page outside the groups is the float zone: a group's own handlers take the event first.
    useEffect(() => {
        if (!dragging) return;
        const over = (event: globalThis.DragEvent) => {
            if (dragged.current && !event.defaultPrevented && carriesTab(event)) {
                event.preventDefault();
            }
        };
        const drop = (event: globalThis.DragEvent) => {
            const key = dragged.current;
            if (!key || event.defaultPrevented || !carriesTab(event)) return;
            event.preventDefault();
            end();
            floatRef.current(key, { x: event.clientX, y: event.clientY });
        };
        document.addEventListener('dragover', over);
        document.addEventListener('drop', drop);
        return () => {
            document.removeEventListener('dragover', over);
            document.removeEventListener('drop', drop);
        };
    }, [dragging, end]);

    /** A dragged tab is over a place: `next` is where it would land there, or nothing. */
    const over = (next: DropTarget | null, event: DragEvent) => {
        if (keyOf(event) === null) return;
        if (next) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        }
        setTarget((previous) => (same(previous, next) ? previous : next));
    };
    const drop = (next: DropTarget | null, event: DragEvent) => {
        const key = keyOf(event);
        if (key === null || !next || event.defaultPrevented) return;
        event.preventDefault();
        const fromRow = dragged.current === null;
        end();
        apply(key, next, fromRow);
    };
    return { keyOf, target, start, end, over, drop, clear: () => setTarget(null) };
}
