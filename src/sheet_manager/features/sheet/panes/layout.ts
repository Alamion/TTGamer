import { MAX_PANES } from './types';

/** The narrowest a pane may be drawn side by side with another (spec 034, FR-005). */
export const MIN_PANE_WIDTH = 320;
export const DIVIDER_WIDTH = 6;
/** Below this width (the `md` breakpoint) one pane shows at a time, the tabs switching it. */
export const SIDE_BY_SIDE_WIDTH = 768;

/** How many panes fit side by side in an area `width` px wide; one while unknown or narrow. */
export function visibleCount(width: number | undefined): number {
    if (!width || width < SIDE_BY_SIDE_WIDTH) return 1;
    const fit = Math.floor((width + DIVIDER_WIDTH) / (MIN_PANE_WIDTH + DIVIDER_WIDTH));
    return Math.max(1, Math.min(MAX_PANES, fit));
}

/**
 * The panes to draw: the `count` most recently focused ones (the current pane leads `recent`), in
 * pane order. Panes that do not fit stay as tabs.
 */
export function visibleIds(
    ids: readonly string[],
    recent: readonly string[],
    count: number
): string[] {
    const chosen = new Set(recent.filter((id) => ids.includes(id)));
    for (const id of ids) chosen.add(id);
    const shown = new Set([...chosen].slice(0, count));
    return ids.filter((id) => shown.has(id));
}

/**
 * Pixel widths for panes with these weights in `width` px (dividers taken out): proportional to
 * the weights, none under the minimum, whole pixels adding up to the room.
 */
export function paneWidths(weights: readonly number[], width: number): number[] {
    const count = weights.length;
    if (count === 0) return [];
    const room = Math.max(0, width - (count - 1) * DIVIDER_WIDTH);
    const total = weights.reduce((sum, weight) => sum + weight, 0) || count;
    let widths = weights.map((weight) => (room * (weight || 1)) / total);
    if (room >= count * MIN_PANE_WIDTH) {
        const low = widths.map((value) => value < MIN_PANE_WIDTH);
        const deficit = widths.reduce(
            (sum, value, index) => sum + (low[index] ? MIN_PANE_WIDTH - value : 0),
            0
        );
        const spare = widths.reduce(
            (sum, value, index) => sum + (low[index] ? 0 : value - MIN_PANE_WIDTH),
            0
        );
        if (deficit > 0 && spare > 0) {
            widths = widths.map((value, index) =>
                low[index] ? MIN_PANE_WIDTH : value - ((value - MIN_PANE_WIDTH) * deficit) / spare
            );
        }
    }
    const whole = widths.map(Math.floor);
    whole[count - 1] = Math.max(0, whole[count - 1]! + room - whole.reduce((a, b) => a + b, 0));
    return whole;
}

/** Weights with an average of 1 for these widths (what the arrangement stores). */
export function weightsOf(widths: readonly number[]): number[] {
    const mean = widths.reduce((sum, value) => sum + value, 0) / (widths.length || 1) || 1;
    return widths.map((value) => Math.round((value / mean) * 1000) / 1000);
}

/** The widths after the divider after pane `index` moved so that pane is `left` px wide. */
export function moveDivider(widths: readonly number[], index: number, left: number): number[] {
    const pair = widths[index]! + widths[index + 1]!;
    const bounded = Math.round(Math.min(pair - MIN_PANE_WIDTH, Math.max(MIN_PANE_WIDTH, left)));
    return widths.map((value, position) =>
        position === index ? bounded : position === index + 1 ? pair - bounded : value
    );
}
