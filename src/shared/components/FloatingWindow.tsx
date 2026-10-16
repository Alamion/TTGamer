import clsx from 'clsx';
import { X } from 'lucide-react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
    defaultLayout,
    fitLayout,
    readLayout,
    type ResizeEdge,
    resizeLayout,
    type Viewport,
    type WindowLayout,
    type WindowLimits,
} from '../utils/windowLayout';

export interface FloatingWindowProps {
    open: boolean;
    onClose: () => void;
    title: string;
    closeLabel: string;
    /** Names the stored layout; one window per id. */
    id: string;
    /** Tells the owner this window was pressed, for stacking several windows (T-113). */
    onFocus?: () => void;
    children: ReactNode;
    /** Controls shown in the title bar, left of the close button. */
    actions?: ReactNode;
    minWidth?: number;
    minHeight?: number;
    initialWidth?: number;
    initialHeight?: number;
    /**
     * The owner keeps the place (spec 036): with `onLayoutChange` the window shows `layout`
     * (`null`: the default place) and reports changes instead of storing them itself.
     */
    layout?: WindowLayout | null;
    onLayoutChange?: (layout: WindowLayout | null) => void;
    /** The window's place in a stack of windows; the owner raises it on `onFocus`. */
    zIndex?: number;
    /**
     * Names the title bar as a handle the keyboard can move (arrows) and resize (Shift and
     * arrows); Home puts the window back to its default place. Without it the title bar is not
     * focusable.
     */
    moveLabel?: string;
    /** The title bar is being dragged to this point (the pointer). */
    onDragMove?: (point: { x: number; y: number }) => void;
    /** The title bar was let go here; `true` when the owner took the window (it is not stored). */
    onDragEnd?: (point: { x: number; y: number }) => boolean;
    /** Takes focus when it opens (default); off for a window restored with the page. */
    focusOnOpen?: boolean;
}

const KEY_STEP = 10;

const NAVBAR = 72;
const EDGES: readonly ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const EDGE_CLASS: Record<ResizeEdge, string> = {
    n: 'left-2 right-2 top-0 h-1.5 cursor-ns-resize',
    s: 'bottom-0 left-2 right-2 h-1.5 cursor-ns-resize',
    e: 'bottom-2 right-0 top-2 w-1.5 cursor-ew-resize',
    w: 'bottom-2 left-0 top-2 w-1.5 cursor-ew-resize',
    ne: 'right-0 top-0 h-3 w-3 cursor-nesw-resize',
    nw: 'left-0 top-0 h-3 w-3 cursor-nwse-resize',
    se: 'bottom-0 right-0 h-3 w-3 cursor-nwse-resize',
    sw: 'bottom-0 left-0 h-3 w-3 cursor-nesw-resize',
};

function currentViewport(): Viewport {
    return typeof window === 'undefined'
        ? { width: 1280, height: 800 }
        : { width: window.innerWidth, height: window.innerHeight };
}

const apply = (element: HTMLElement | null, layout: WindowLayout) => {
    if (!element) return;
    element.style.left = `${layout.x}px`;
    element.style.top = `${layout.y}px`;
    element.style.width = `${layout.width}px`;
    element.style.height = `${layout.height}px`;
};

/**
 * A window over the page that does not block it (spec 032, D9): moved by its title bar, resized
 * by its edges and corners, kept on screen, and remembered. Below `md` it fills the screen. It is
 * a non-modal dialog: no overlay, no focus trap, and Escape closes it while focus is inside.
 */
export function FloatingWindow({
    open,
    onClose,
    title,
    closeLabel,
    id,
    onFocus,
    children,
    actions,
    minWidth = 480,
    minHeight = 320,
    initialWidth = 720,
    initialHeight = 560,
    layout: ownLayout,
    onLayoutChange,
    zIndex,
    moveLabel,
    onDragMove,
    onDragEnd,
    focusOnOpen = true,
}: FloatingWindowProps) {
    const titleId = useId();
    const narrow = useMediaQuery('(max-width: 767px)');
    const frame = useRef<HTMLDivElement>(null);
    const limits = useMemo<WindowLimits>(
        () => ({ minWidth, minHeight, top: NAVBAR }),
        [minWidth, minHeight]
    );
    const [viewport, setViewport] = useState<Viewport>(currentViewport);
    const [kept, setKept] = useLocalStorageState<unknown>(`window-layout:${id}`, null);
    const controlled = onLayoutChange !== undefined;
    const stored = controlled ? (ownLayout ?? null) : kept;
    const setStored = (next: WindowLayout | null) =>
        controlled ? onLayoutChange(next) : setKept(next);
    const initial = useMemo(
        () => defaultLayout(viewport, limits, { width: initialWidth, height: initialHeight }),
        [viewport, limits, initialWidth, initialHeight]
    );
    // A remembered layout that no longer fits the screen is repaired for display only.
    const layout = useMemo(
        () => fitLayout(readLayout(stored, initial), viewport, limits),
        [stored, initial, viewport, limits]
    );
    const gesture = useRef<{
        kind: 'move' | ResizeEdge;
        startX: number;
        startY: number;
        start: WindowLayout;
        latest: WindowLayout;
    } | null>(null);

    useEffect(() => {
        const onResize = () => setViewport(currentViewport());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (open && focusOnOpen) frame.current?.focus({ preventScroll: true });
        // Only opening moves focus, not a later change of the option.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // On a phone the window is a modal sheet: the page behind it must not scroll.
    useEffect(() => {
        if (!open || !narrow) return;
        const { body, documentElement } = document;
        const before = [body.style.overflow, documentElement.style.overflow];
        body.style.overflow = 'hidden';
        documentElement.style.overflow = 'hidden';
        return () => {
            body.style.overflow = before[0]!;
            documentElement.style.overflow = before[1]!;
        };
    }, [open, narrow]);

    const begin = (event: PointerEvent<HTMLElement>) => {
        if (narrow || event.button !== 0) return;
        if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        gesture.current = {
            kind: event.currentTarget.dataset.gesture as 'move' | ResizeEdge,
            startX: event.clientX,
            startY: event.clientY,
            start: layout,
            latest: layout,
        };
    };

    const move = (event: PointerEvent<HTMLElement>) => {
        const active = gesture.current;
        if (!active) return;
        const dx = event.clientX - active.startX;
        const dy = event.clientY - active.startY;
        if (active.kind === 'move') onDragMove?.({ x: event.clientX, y: event.clientY });
        const next =
            active.kind === 'move'
                ? { ...active.start, x: active.start.x + dx, y: active.start.y + dy }
                : resizeLayout(active.start, active.kind, dx, dy, limits);
        active.latest = fitLayout(next, viewport, limits);
        apply(frame.current, active.latest);
    };

    const release = (event: PointerEvent<HTMLElement>) => {
        const active = gesture.current;
        gesture.current = null;
        if (!active) return;
        const taken =
            active.kind === 'move' && onDragEnd?.({ x: event.clientX, y: event.clientY }) === true;
        if (!taken) setStored(active.latest);
    };

    /** Arrows move the window, Shift and arrows resize it, Home puts it back (spec 036). */
    const onHandleKey = (event: KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Home') {
            event.preventDefault();
            setStored(null);
            return;
        }
        const step = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
        }[event.key];
        if (!step) return;
        event.preventDefault();
        const [dx, dy] = [step[0]! * KEY_STEP, step[1]! * KEY_STEP];
        const next = event.shiftKey
            ? resizeLayout(layout, 'se', dx, dy, limits)
            : { ...layout, x: layout.x + dx, y: layout.y + dy };
        setStored(fitLayout(next, viewport, limits));
    };

    const cancel = () => {
        if (!gesture.current) return;
        gesture.current = null;
        apply(frame.current, layout);
    };

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Escape' && !event.defaultPrevented) {
                event.stopPropagation();
                onClose();
            }
        },
        [onClose]
    );

    if (!open || typeof document === 'undefined') return null;

    // Tailwind utilities exist only under .tailwind-root; #modal-root (theme/Root) carries it.
    return createPortal(
        // A dialog takes Escape without being a widget itself.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
            ref={frame}
            role="dialog"
            aria-modal={narrow ? true : undefined}
            aria-labelledby={titleId}
            tabIndex={-1}
            data-floating-window={id}
            onKeyDown={onKeyDown}
            onPointerDownCapture={() => onFocus?.()}
            onFocusCapture={() => onFocus?.()}
            style={
                narrow
                    ? undefined
                    : {
                          left: layout.x,
                          top: layout.y,
                          width: layout.width,
                          height: layout.height,
                          zIndex,
                      }
            }
            className={clsx(
                'fixed z-[900] flex flex-col overflow-hidden border border-border bg-bgSurface text-textPrimary shadow-xl focus:outline-hidden',
                narrow ? 'inset-0 h-dvh w-screen' : 'rounded-lg'
            )}
        >
            {/* A focusable title bar is the keyboard's handle for moving the window. */}
            <div
                data-window-titlebar=""
                data-gesture="move"
                tabIndex={moveLabel && !narrow ? 0 : undefined}
                aria-label={moveLabel && !narrow ? moveLabel : undefined}
                onKeyDown={moveLabel && !narrow ? onHandleKey : undefined}
                onPointerDown={begin}
                onPointerMove={move}
                onPointerUp={release}
                onPointerCancel={cancel}
                onDoubleClick={() => setStored(null)}
                className={clsx(
                    'flex select-none items-center gap-2 border-b border-border bg-bgBase px-3 py-2',
                    !narrow && 'cursor-move touch-none'
                )}
            >
                <h2 id={titleId} className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {title}
                </h2>
                {actions}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={closeLabel}
                    className="rounded-sm p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary [@media(pointer:coarse)]:p-2.5"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            {!narrow &&
                EDGES.map((edge) => (
                    <div
                        key={edge}
                        data-window-edge={edge}
                        data-gesture={edge}
                        aria-hidden="true"
                        onPointerDown={begin}
                        onPointerMove={move}
                        onPointerUp={release}
                        onPointerCancel={cancel}
                        className={clsx('absolute touch-none', EDGE_CLASS[edge])}
                    />
                ))}
        </div>,
        document.getElementById('modal-root') ?? document.body
    );
}
