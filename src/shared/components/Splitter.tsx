import { clsx } from 'clsx';
import { type KeyboardEvent, type PointerEvent, useRef } from 'react';

const KEY_STEP = 10;
const KEY_STEP_LARGE = 40;

/**
 * A divider between two side-by-side panes (or, `horizontal`, between rows), the one behavior of
 * every such place (the template editor, the library dialog, the documents window, the sheet's
 * layout; specs 022, 032, 036): drag it, use ←/→ or ↑/↓ (Shift for bigger steps), Home or a double
 * click for the default. While dragging only
 * `onPreview` runs (a CSS variable), the size is stored once on release, and a cancelled drag
 * puts the preview back. It shows from the `md` breakpoint up; narrower layouts use tabs.
 *
 * With `onCollapse`, a drag that ends more than `collapseAfter` px past a pane's minimum collapses
 * that pane instead of clamping it, and Enter collapses the `primary` pane (the WAI-ARIA window
 * splitter). Sides are named by position: `start` is left of (or above) the divider.
 */
export function Splitter({
    bare = false,
    clamp,
    collapseAfter = 80,
    invert = false,
    label,
    max,
    min,
    onChange,
    onCollapse,
    onPreview,
    onReset,
    orientation = 'vertical',
    primary,
    value,
}: {
    /** No visible line at rest (the panes it separates have borders of their own). */
    bare?: boolean;
    /** Bounds a width the way the stored value will be bounded. */
    clamp: (width: number) => number;
    /** How far past a minimum a drag must end to collapse (with `onCollapse`). */
    collapseAfter?: number;
    /** The pane lies right of the divider: moving it right makes the pane narrower. */
    invert?: boolean;
    label: string;
    max: number;
    min: number;
    onChange: (width: number) => void;
    onCollapse?: (side: 'start' | 'end') => void;
    onPreview: (width: number) => void;
    onReset: () => void;
    /** `horizontal` lies between rows: dragged and moved with ↑/↓ (spec 036). */
    orientation?: 'vertical' | 'horizontal';
    /** The pane Enter collapses; the measured pane by default. */
    primary?: 'start' | 'end';
    value: number;
}) {
    const horizontal = orientation === 'horizontal';
    const drag = useRef<{ start: number; startWidth: number; width: number } | null>(null);
    const along = (event: { clientX: number; clientY: number }) =>
        horizontal ? event.clientY : event.clientX;
    const measured = invert ? 'end' : 'start';
    const rawAt = (position: number) => {
        const current = drag.current!;
        const delta = position - current.start;
        return current.startWidth + (invert ? -delta : delta);
    };
    const widthAt = (position: number) => clamp(rawAt(position));
    /** The pane a drag ending at `raw` collapses, if any. */
    const collapsing = (raw: number): 'start' | 'end' | null => {
        if (!onCollapse) return null;
        if (raw < min - collapseAfter) return measured;
        if (raw > max + collapseAfter) return measured === 'start' ? 'end' : 'start';
        return null;
    };

    return (
        // A focusable separator is an interactive widget in ARIA (a window splitter).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
            role="separator"
            aria-orientation={orientation}
            aria-label={label}
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-keyshortcuts={onCollapse ? 'Enter' : undefined}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
            tabIndex={0}
            data-pane-divider=""
            onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture?.(event.pointerId);
                drag.current = { start: along(event), startWidth: value, width: value };
            }}
            onPointerMove={(event) => {
                if (!drag.current) return;
                drag.current.width = widthAt(along(event));
                onPreview(drag.current.width);
            }}
            onPointerUp={(event) => {
                if (!drag.current) return;
                const raw = rawAt(along(event));
                drag.current = null;
                const side = collapsing(raw);
                if (side) {
                    onPreview(value);
                    onCollapse!(side);
                    return;
                }
                const width = clamp(raw);
                if (width !== value) onChange(width);
            }}
            onPointerCancel={() => {
                drag.current = null;
                onPreview(value);
            }}
            onDoubleClick={onReset}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' && onCollapse) {
                    event.preventDefault();
                    onCollapse(primary ?? measured);
                    return;
                }
                if (event.key === 'Home') {
                    event.preventDefault();
                    onReset();
                    return;
                }
                const [back, forward] = horizontal
                    ? ['ArrowUp', 'ArrowDown']
                    : ['ArrowLeft', 'ArrowRight'];
                if (event.key !== back && event.key !== forward) return;
                event.preventDefault();
                const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
                const right = event.key === forward;
                onChange(clamp(value + (right !== invert ? step : -step)));
            }}
            className={clsx(
                'group hidden touch-none select-none items-stretch justify-center focus:outline-hidden md:flex',
                horizontal ? 'cursor-row-resize flex-col' : 'cursor-col-resize'
            )}
        >
            <span
                className={clsx(
                    'transition-colors group-hover:bg-primary group-focus-visible:bg-primary',
                    horizontal
                        ? 'h-px group-hover:h-0.5 group-focus-visible:h-0.5'
                        : 'w-px group-hover:w-0.5 group-focus-visible:w-0.5',
                    bare ? 'bg-transparent' : 'bg-border'
                )}
            />
        </div>
    );
}
