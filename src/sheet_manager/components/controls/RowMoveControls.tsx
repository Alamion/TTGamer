import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { type KeyboardEvent, type PointerEvent, useRef } from 'react';

const rows = uiMessages.sheet.documents.rows;

interface RowBounds {
    top: number;
    bottom: number;
}

/** The row a pointer at `y` points to: the row it is over, else the nearest end. */
export function rowIndexAt(rects: readonly RowBounds[], y: number): number {
    if (rects.length === 0) return 0;
    const over = rects.findIndex(({ top, bottom }) => y >= top && y <= bottom);
    if (over >= 0) return over;
    let nearest = 0;
    let best = Infinity;
    rects.forEach(({ top, bottom }, index) => {
        const distance = Math.min(Math.abs(y - top), Math.abs(y - bottom));
        if (distance < best) {
            best = distance;
            nearest = index;
        }
    });
    return nearest;
}

/** The rows of the reorderable list a control sits in (nested lists excluded). */
function rowsOf(list: Element): HTMLElement[] {
    return [...list.querySelectorAll<HTMLElement>('[data-reorder-row]')].filter(
        (row) => row.closest('[data-reorder-list]') === list
    );
}

/** Focuses the same control on the row at its new position, after the list re-renders. */
function focusMoved(list: Element | null, to: number, which: string) {
    const focus = () => {
        const row = list ? rowsOf(list)[to] : undefined;
        const target =
            row?.querySelector<HTMLElement>(`[data-move="${which}"]`) ??
            row?.querySelector<HTMLElement>('[data-move]');
        target?.focus();
    };
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(focus);
    else setTimeout(focus, 0);
}

/**
 * Alt+↑/↓ on a row moves it (spec 022, US5). Attach to the row element (`data-reorder-row`) of
 * a list marked `data-reorder-list`.
 */
export function rowMoveKeys(index: number, count: number, onMove: (to: number) => void) {
    return (event: KeyboardEvent<HTMLElement>) => {
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
        const to = index + (event.key === 'ArrowUp' ? -1 : 1);
        if (to < 0 || to >= count) return;
        event.preventDefault();
        event.stopPropagation();
        const list = event.currentTarget.closest('[data-reorder-list]');
        onMove(to);
        focusMoved(list, to, event.key === 'ArrowUp' ? 'up' : 'down');
    };
}

const button =
    'flex h-5 w-5 items-center justify-center rounded text-textSecondary hover:bg-bgBase hover:text-textPrimary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary';

/**
 * A row's order controls: a grip to drag it (mouse and pen), Move up, and Move down. The first
 * row has no up control and the last no down control.
 */
export function RowMoveControls({
    count,
    index,
    name,
    onMove,
}: {
    count: number;
    index: number;
    /** What the row is called in the buttons' names. */
    name: string;
    onMove: (to: number) => void;
}) {
    const drag = useRef<{ list: Element; target: number } | null>(null);
    if (count < 2) return null;

    const mark = (list: Element, target: number | undefined) => {
        rowsOf(list).forEach((row, position) =>
            position === target
                ? row.setAttribute('data-reorder-target', '')
                : row.removeAttribute('data-reorder-target')
        );
    };
    const move = (to: number, which: string, list: Element | null) => {
        onMove(to);
        focusMoved(list, to, which);
    };

    return (
        <span className="flex shrink-0 items-center" data-row-move="">
            <button
                type="button"
                data-move="grip"
                aria-label={translate(rows.reorder)}
                title={translate(rows.reorder)}
                tabIndex={-1}
                onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
                    if (event.button !== 0 || event.pointerType === 'touch') return;
                    const list = event.currentTarget.closest('[data-reorder-list]');
                    if (!list) return;
                    event.preventDefault();
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    drag.current = { list, target: index };
                }}
                onPointerMove={(event) => {
                    if (!drag.current) return;
                    const rects = rowsOf(drag.current.list).map((row) =>
                        row.getBoundingClientRect()
                    );
                    drag.current.target = rowIndexAt(rects, event.clientY);
                    mark(drag.current.list, drag.current.target);
                }}
                onPointerUp={() => {
                    const current = drag.current;
                    drag.current = null;
                    if (!current) return;
                    mark(current.list, undefined);
                    if (current.target !== index) move(current.target, 'grip', current.list);
                }}
                onPointerCancel={() => {
                    if (drag.current) mark(drag.current.list, undefined);
                    drag.current = null;
                }}
                className={`${button} cursor-grab touch-none active:cursor-grabbing`}
            >
                <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {/* An absent button keeps its place, so arrows line up across rows. */}
            <span className="grid grid-rows-2">
                {index === 0 && <span aria-hidden="true" />}
                {index > 0 && (
                    <button
                        type="button"
                        data-move="up"
                        aria-label={translate(rows.moveUp, { name })}
                        onClick={(event) =>
                            move(
                                index - 1,
                                'up',
                                event.currentTarget.closest('[data-reorder-list]')
                            )
                        }
                        className={`${button} h-3`}
                    >
                        <ChevronUp className="h-3 w-3" aria-hidden="true" />
                    </button>
                )}
                {index < count - 1 && (
                    <button
                        type="button"
                        data-move="down"
                        aria-label={translate(rows.moveDown, { name })}
                        onClick={(event) =>
                            move(
                                index + 1,
                                'down',
                                event.currentTarget.closest('[data-reorder-list]')
                            )
                        }
                        className={`${button} h-3`}
                    >
                        <ChevronDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                )}
                {index === count - 1 && <span aria-hidden="true" />}
            </span>
        </span>
    );
}

/** The name of a row without a name of its own: "row 3". */
export function fallbackRowName(index: number): string {
    return translate(rows.fallbackName, { index: index + 1 });
}
