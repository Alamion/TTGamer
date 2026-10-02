import { useLocalStorageState } from '@site/src/shared/hooks/useLocalStorageState';
import { useCallback, useMemo } from 'react';

export type Pane = 'outline' | 'settings';

export interface PaneWidths {
    outline: number;
    settings: number;
}

export const PANE_STORAGE_KEY = 'template-editor-panes';

export const PANE_LIMITS: Record<Pane, { min: number; max: number; initial: number }> = {
    outline: { min: 160, max: 420, initial: 240 },
    settings: { min: 260, max: 560, initial: 320 },
};

/** The page area never gets narrower than this (data-model.md, PaneWidths). */
export const PAGE_MIN_WIDTH = 360;
/** Both dividers together. */
const DIVIDERS_WIDTH = 12;

const DEFAULT_WIDTHS: PaneWidths = {
    outline: PANE_LIMITS.outline.initial,
    settings: PANE_LIMITS.settings.initial,
};

const clampPane = (pane: Pane, width: number) =>
    Math.round(Math.min(PANE_LIMITS[pane].max, Math.max(PANE_LIMITS[pane].min, width)));

/** Stored widths, or the defaults for anything missing or broken. */
export function readPaneWidths(stored: unknown): PaneWidths {
    const record = typeof stored === 'object' && stored !== null ? stored : {};
    const width = (pane: Pane) => {
        const value = (record as Record<string, unknown>)[pane];
        return typeof value === 'number' && Number.isFinite(value)
            ? clampPane(pane, value)
            : DEFAULT_WIDTHS[pane];
    };
    return { outline: width('outline'), settings: width('settings') };
}

/**
 * The widths that fit a dialog this wide: the side areas give up space (down to their minimums)
 * so the page keeps at least `PAGE_MIN_WIDTH`. Stored widths are not changed by fitting.
 */
export function fitPaneWidths(widths: PaneWidths, dialogWidth: number | undefined): PaneWidths {
    if (!dialogWidth) return widths;
    const room = dialogWidth - DIVIDERS_WIDTH - PAGE_MIN_WIDTH;
    const excess = widths.outline + widths.settings - room;
    if (excess <= 0) return widths;
    const spare = {
        outline: widths.outline - PANE_LIMITS.outline.min,
        settings: widths.settings - PANE_LIMITS.settings.min,
    };
    const total = spare.outline + spare.settings;
    if (total <= 0) return widths;
    const share = Math.min(1, excess / total);
    return {
        outline: Math.round(widths.outline - spare.outline * share),
        settings: Math.round(widths.settings - spare.settings * share),
    };
}

/** The editor's area widths (spec 022, US3), remembered across dialogs and reloads. */
export function usePaneWidths(dialogWidth: number | undefined) {
    const [stored, setStored] = useLocalStorageState<unknown>(PANE_STORAGE_KEY, DEFAULT_WIDTHS);
    const widths = useMemo(() => readPaneWidths(stored), [stored]);
    const setWidth = useCallback(
        (pane: Pane, width: number) =>
            setStored((current: unknown) => ({
                ...readPaneWidths(current),
                [pane]: clampPane(pane, width),
            })),
        [setStored]
    );
    const reset = useCallback(
        (pane: Pane) => setWidth(pane, PANE_LIMITS[pane].initial),
        [setWidth]
    );
    const fitted = useMemo(() => fitPaneWidths(widths, dialogWidth), [widths, dialogWidth]);
    return { widths: fitted, setWidth, reset, clamp: clampPane };
}
