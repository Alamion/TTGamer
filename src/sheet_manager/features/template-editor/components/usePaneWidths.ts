import {
    fitPaneSizes,
    type PaneLimits,
    type PaneSizes,
    readPaneSizes,
    usePaneSizes,
} from '@site/src/shared/hooks/usePaneSizes';

export type Pane = 'outline' | 'settings';

export type PaneWidths = PaneSizes<Pane>;

export const PANE_STORAGE_KEY = 'template-editor-panes';

export const PANE_LIMITS: Record<Pane, PaneLimits> = {
    outline: { min: 160, max: 420, initial: 240 },
    settings: { min: 260, max: 560, initial: 320 },
};

/** The page area never gets narrower than this (data-model.md, PaneWidths). */
export const PAGE_MIN_WIDTH = 360;
/** Both dividers together. */
const DIVIDERS_WIDTH = 12;
const ROOM = { restMin: PAGE_MIN_WIDTH, dividers: DIVIDERS_WIDTH };

/** Stored widths, or the defaults for anything missing or broken. */
export const readPaneWidths = (stored: unknown): PaneWidths => readPaneSizes(stored, PANE_LIMITS);

/** The widths that fit a dialog this wide; the page keeps at least `PAGE_MIN_WIDTH`. */
export const fitPaneWidths = (widths: PaneWidths, dialogWidth: number | undefined): PaneWidths =>
    fitPaneSizes(widths, PANE_LIMITS, dialogWidth, ROOM);

/** The editor's area widths (spec 022, US3), remembered across dialogs and reloads. */
export function usePaneWidths(dialogWidth: number | undefined) {
    const { sizes, setSize, reset, clamp } = usePaneSizes(
        PANE_STORAGE_KEY,
        PANE_LIMITS,
        dialogWidth,
        ROOM
    );
    return { widths: sizes, setWidth: setSize, reset, clamp };
}
