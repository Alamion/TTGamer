import { useCallback, useEffect, useMemo, useState } from 'react';

import { useLocalStorageState } from './useLocalStorageState';

export interface PaneLimits {
    min: number;
    max: number;
    initial: number;
}

export type PaneSizes<K extends string> = Record<K, number>;

/** What a container must keep for the rest of its layout beside the resizable panes. */
export interface PaneRoom {
    /** Width left for the pane no divider controls (the page, the details). */
    restMin: number;
    /** All dividers together. */
    dividers: number;
}

const clampTo = (limits: PaneLimits, size: number) =>
    Math.round(Math.min(limits.max, Math.max(limits.min, size)));

/** Stored sizes, or the defaults for anything missing or broken. */
export function readPaneSizes<K extends string>(
    stored: unknown,
    limits: Record<K, PaneLimits>
): PaneSizes<K> {
    const record = typeof stored === 'object' && stored !== null ? stored : {};
    const sizes = {} as PaneSizes<K>;
    for (const pane of Object.keys(limits) as K[]) {
        const value = (record as Record<string, unknown>)[pane];
        sizes[pane] =
            typeof value === 'number' && Number.isFinite(value)
                ? clampTo(limits[pane], value)
                : limits[pane].initial;
    }
    return sizes;
}

/**
 * The sizes that fit a container this wide: the panes give up space (down to their minimums,
 * in proportion to what they can spare) so the rest keeps its minimum. Stored sizes are not
 * changed by fitting.
 */
export function fitPaneSizes<K extends string>(
    sizes: PaneSizes<K>,
    limits: Record<K, PaneLimits>,
    containerWidth: number | undefined,
    { restMin, dividers }: PaneRoom
): PaneSizes<K> {
    if (!containerWidth) return sizes;
    const panes = Object.keys(limits) as K[];
    const room = containerWidth - dividers - restMin;
    const excess = panes.reduce((sum, pane) => sum + sizes[pane], 0) - room;
    if (excess <= 0) return sizes;
    const spare = (pane: K) => sizes[pane] - limits[pane].min;
    const total = panes.reduce((sum, pane) => sum + spare(pane), 0);
    if (total <= 0) return sizes;
    const share = Math.min(1, excess / total);
    const fitted = {} as PaneSizes<K>;
    for (const pane of panes) fitted[pane] = Math.round(sizes[pane] - spare(pane) * share);
    return fitted;
}

/**
 * An element and its width, kept current as it or the window resizes. The ref is a callback so an
 * element that mounts later (a dialog's body) is measured when it appears.
 */
export function useMeasuredElement<T extends HTMLElement>(): {
    ref: (node: T | null) => void;
    node: T | null;
    width: number | undefined;
} {
    const [node, ref] = useState<T | null>(null);
    const [width, setWidth] = useState<number | undefined>(undefined);
    useEffect(() => {
        const measure = () => setWidth(node?.clientWidth || undefined);
        measure();
        if (node && typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(measure);
            observer.observe(node);
            return () => observer.disconnect();
        }
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [node]);
    return { ref, node, width };
}

/**
 * The remembered sizes of the panes a splitter separates, per place (`storageKey`): read with
 * defaults, clamped to their limits, and fitted to the container without being overwritten.
 */
export function usePaneSizes<K extends string>(
    storageKey: string,
    limits: Record<K, PaneLimits>,
    containerWidth: number | undefined,
    room: PaneRoom
) {
    const defaults = useMemo(() => readPaneSizes(undefined, limits), [limits]);
    const [stored, setStored] = useLocalStorageState<unknown>(storageKey, defaults);
    const sizes = useMemo(() => readPaneSizes(stored, limits), [stored, limits]);
    const setSize = useCallback(
        (pane: K, size: number) =>
            setStored((current: unknown) => ({
                ...readPaneSizes(current, limits),
                [pane]: clampTo(limits[pane], size),
            })),
        [limits, setStored]
    );
    const reset = useCallback((pane: K) => setSize(pane, limits[pane].initial), [limits, setSize]);
    const clamp = useCallback((pane: K, size: number) => clampTo(limits[pane], size), [limits]);
    const fitted = useMemo(
        () => fitPaneSizes(sizes, limits, containerWidth, room),
        [sizes, limits, containerWidth, room]
    );
    return { sizes: fitted, setSize, reset, clamp };
}
