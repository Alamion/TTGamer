import { clsx } from 'clsx';
import { type KeyboardEvent, type PointerEvent, useRef } from 'react';

const KEY_STEP = 10;
const KEY_STEP_LARGE = 40;

/**
 * A vertical divider between two side-by-side panes, the one behavior of every such place (the
 * template editor, the library dialog, the documents window; specs 022 and 032): drag it, use ←/→
 * (Shift for bigger steps), Home or a double click for the default. While dragging only
 * `onPreview` runs (a CSS variable), the size is stored once on release, and a cancelled drag
 * puts the preview back. It shows from the `md` breakpoint up; narrower layouts use tabs.
 */
export function Splitter({
    bare = false,
    clamp,
    invert = false,
    label,
    max,
    min,
    onChange,
    onPreview,
    onReset,
    value,
}: {
    /** No visible line at rest (the panes it separates have borders of their own). */
    bare?: boolean;
    /** Bounds a width the way the stored value will be bounded. */
    clamp: (width: number) => number;
    /** The pane lies right of the divider: moving it right makes the pane narrower. */
    invert?: boolean;
    label: string;
    max: number;
    min: number;
    onChange: (width: number) => void;
    onPreview: (width: number) => void;
    onReset: () => void;
    value: number;
}) {
    const drag = useRef<{ startX: number; startWidth: number; width: number } | null>(null);
    const widthAt = (clientX: number) => {
        const current = drag.current!;
        const delta = clientX - current.startX;
        return clamp(current.startWidth + (invert ? -delta : delta));
    };

    return (
        // A focusable separator is an interactive widget in ARIA (a window splitter).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label={label}
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
            tabIndex={0}
            data-pane-divider=""
            onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture?.(event.pointerId);
                drag.current = { startX: event.clientX, startWidth: value, width: value };
            }}
            onPointerMove={(event) => {
                if (!drag.current) return;
                drag.current.width = widthAt(event.clientX);
                onPreview(drag.current.width);
            }}
            onPointerUp={(event) => {
                if (!drag.current) return;
                const width = widthAt(event.clientX);
                drag.current = null;
                if (width !== value) onChange(width);
            }}
            onPointerCancel={() => {
                drag.current = null;
                onPreview(value);
            }}
            onDoubleClick={onReset}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Home') {
                    event.preventDefault();
                    onReset();
                    return;
                }
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
                const right = event.key === 'ArrowRight';
                onChange(clamp(value + (right !== invert ? step : -step)));
            }}
            className="group hidden cursor-col-resize touch-none select-none items-stretch justify-center focus:outline-hidden md:flex"
        >
            <span
                className={clsx(
                    'w-px transition-colors group-hover:w-0.5 group-hover:bg-primary group-focus-visible:w-0.5 group-focus-visible:bg-primary',
                    bare ? 'bg-transparent' : 'bg-border'
                )}
            />
        </div>
    );
}
