import { type RefObject, useCallback, useEffect, useLayoutEffect, useState } from 'react';

/** The gap between rows (`gap-0.5`). */
const GAP = 2;
const OVERSCAN = 8;
const FIRST_RENDER = 60;
const ESTIMATED_ROW = 32;

export interface RowWindow {
    start: number;
    end: number;
}

/**
 * The slice of a long list that is in view, for rows of one height (measured from the first row
 * drawn). Below `threshold` rows nothing is windowed. Rows outside the slice are not in the DOM;
 * the caller pads the list by `start * stride` above and `(count - end) * stride` below.
 */
export function useRowWindow({
    count,
    threshold,
    scrollRef,
    containerRef,
}: {
    count: number;
    threshold: number;
    scrollRef: RefObject<HTMLElement | null> | undefined;
    containerRef: RefObject<HTMLElement | null>;
}) {
    const windowed = scrollRef !== undefined && count > threshold;
    const [rowHeight, setRowHeight] = useState(ESTIMATED_ROW);
    const [range, setRange] = useState<RowWindow>({ start: 0, end: FIRST_RENDER });

    const compute = useCallback(() => {
        const scroller = scrollRef?.current;
        const container = containerRef.current;
        if (!windowed || !scroller || !container) return;
        const stride = rowHeight + GAP;
        const viewport = scroller.clientHeight || 600;
        const offset =
            container.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top +
            scroller.scrollTop;
        const top = scroller.scrollTop - offset;
        const start = Math.max(0, Math.floor(top / stride) - OVERSCAN);
        const end = Math.min(count, Math.ceil((top + viewport) / stride) + OVERSCAN);
        setRange((previous) =>
            previous.start === start && previous.end === end ? previous : { start, end }
        );
    }, [containerRef, count, rowHeight, scrollRef, windowed]);

    useLayoutEffect(() => {
        if (!windowed) return;
        const row = containerRef.current?.querySelector<HTMLElement>('[data-tree-row]');
        if (row && row.offsetHeight > 0 && row.offsetHeight !== rowHeight) {
            setRowHeight(row.offsetHeight);
        }
        compute();
    }, [compute, containerRef, rowHeight, windowed]);

    useEffect(() => {
        const scroller = scrollRef?.current;
        if (!windowed || !scroller) return;
        scroller.addEventListener('scroll', compute, { passive: true });
        const observer =
            typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(compute);
        observer?.observe(scroller);
        return () => {
            scroller.removeEventListener('scroll', compute);
            observer?.disconnect();
        };
    }, [compute, scrollRef, windowed]);

    /** Scrolls so the row at `index` is in view and draws its neighbourhood. */
    const scrollToIndex = useCallback(
        (index: number) => {
            const scroller = scrollRef?.current;
            const container = containerRef.current;
            if (!windowed || !scroller || !container) return;
            const stride = rowHeight + GAP;
            const viewport = scroller.clientHeight || 600;
            const offset =
                container.getBoundingClientRect().top -
                scroller.getBoundingClientRect().top +
                scroller.scrollTop;
            const rowTop = offset + index * stride;
            if (rowTop < scroller.scrollTop) scroller.scrollTo({ top: rowTop });
            else if (rowTop + stride > scroller.scrollTop + viewport) {
                scroller.scrollTo({ top: rowTop + stride - viewport });
            }
            compute();
        },
        [compute, containerRef, rowHeight, scrollRef, windowed]
    );

    return {
        windowed,
        range: windowed
            ? { start: Math.min(range.start, count), end: Math.min(range.end, count) }
            : { start: 0, end: count },
        stride: rowHeight + GAP,
        scrollToIndex,
    };
}
