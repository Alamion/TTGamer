/** Where a floating window sits and how big it is, in CSS pixels of the viewport. */
export interface WindowLayout {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WindowLimits {
    minWidth: number;
    minHeight: number;
    /** Room kept free at the top (the site's navigation bar). */
    top: number;
}

export interface Viewport {
    width: number;
    height: number;
}

/** How much of the title bar must stay on screen so the window can always be grabbed. */
const KEEP_X = 96;
const KEEP_Y = 40;

const isNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

/**
 * The layout brought inside the viewport: no smaller than the limits (unless the screen itself is
 * smaller), no larger than the screen, and with enough of its title bar in view to grab.
 */
export function fitLayout(
    layout: WindowLayout,
    viewport: Viewport,
    limits: WindowLimits
): WindowLayout {
    const width = Math.round(
        Math.min(viewport.width, Math.max(Math.min(limits.minWidth, viewport.width), layout.width))
    );
    const height = Math.round(
        Math.min(
            viewport.height,
            Math.max(Math.min(limits.minHeight, viewport.height), layout.height)
        )
    );
    const x = Math.round(
        Math.min(viewport.width - Math.min(KEEP_X, width), Math.max(KEEP_X - width, layout.x))
    );
    const y = Math.round(Math.min(viewport.height - KEEP_Y, Math.max(0, layout.y)));
    return { x, y, width, height };
}

/** A new window: on the right of the screen, below the navigation bar. */
export function defaultLayout(
    viewport: Viewport,
    limits: WindowLimits,
    size: { width: number; height: number }
): WindowLayout {
    const width = Math.min(size.width, viewport.width - 24);
    const height = Math.min(size.height, viewport.height - limits.top - 24);
    return fitLayout(
        { x: viewport.width - width - 24, y: limits.top, width, height },
        viewport,
        limits
    );
}

/** The stored layout, or `fallback` when it is missing or broken. */
export function readLayout(stored: unknown, fallback: WindowLayout): WindowLayout {
    if (typeof stored !== 'object' || stored === null) return fallback;
    const { x, y, width, height } = stored as Record<string, unknown>;
    return isNumber(x) && isNumber(y) && isNumber(width) && isNumber(height)
        ? { x, y, width, height }
        : fallback;
}

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** The layout after an edge or corner moved by (dx, dy), kept at or above the minimum size. */
export function resizeLayout(
    start: WindowLayout,
    edge: ResizeEdge,
    dx: number,
    dy: number,
    limits: WindowLimits
): WindowLayout {
    let { x, y, width, height } = start;
    if (edge.includes('e')) width = start.width + dx;
    if (edge.includes('s')) height = start.height + dy;
    if (edge.includes('w')) {
        width = start.width - dx;
        x = start.x + dx;
    }
    if (edge.includes('n')) {
        height = start.height - dy;
        y = start.y + dy;
    }
    if (width < limits.minWidth) {
        if (edge.includes('w')) x -= limits.minWidth - width;
        width = limits.minWidth;
    }
    if (height < limits.minHeight) {
        if (edge.includes('n')) y -= limits.minHeight - height;
        height = limits.minHeight;
    }
    return { x, y, width, height };
}
