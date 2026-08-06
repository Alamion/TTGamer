import { X } from 'lucide-react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';

interface SlidePanelProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    width?: number;
    onWidthChange?: (width: number) => void;
    minWidth?: number;
    maxWidth?: number;
    showBackdrop?: boolean;
    className?: string;
    style?: CSSProperties;
    closeAriaLabel?: string;
    ariaLabel?: string;
}

export function SlidePanel({
    open,
    onClose,
    title,
    children,
    width,
    onWidthChange,
    minWidth = 280,
    maxWidth = 800,
    showBackdrop = true,
    className,
    style,
    closeAriaLabel = 'Close panel',
    ariaLabel,
}: SlidePanelProps) {
    const widthRef = useRef(width ?? 380);

    useEffect(() => {
        if (width !== undefined) widthRef.current = width;
    }, [width]);

    const handleResizeStart = useCallback(
        (e: React.MouseEvent) => {
            if (!onWidthChange) return;
            e.preventDefault();
            const startX = e.clientX;
            const startW = widthRef.current;

            const onMove = (e: MouseEvent) => {
                const newW = startW - (e.clientX - startX);
                const clamped = Math.max(minWidth, Math.min(maxWidth, newW));
                widthRef.current = clamped;
                onWidthChange(clamped);
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        },
        [onWidthChange, minWidth, maxWidth]
    );

    const handleResizeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (!onWidthChange || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? 20 : -20;
        const nextWidth = Math.max(minWidth, Math.min(maxWidth, widthRef.current + delta));
        widthRef.current = nextWidth;
        onWidthChange(nextWidth);
    };

    if (!open) return null;

    return (
        <>
            {showBackdrop && (
                <button
                    type="button"
                    aria-label="Close panel"
                    className="fixed inset-0 bg-black/40 z-40"
                    onClick={onClose}
                />
            )}
            <div
                role="complementary"
                aria-label={ariaLabel ?? title ?? 'Side panel'}
                className={`fixed top-0 right-0 bottom-0 z-50 bg-bgSurface border-l border-border shadow-xl flex flex-col overflow-hidden ${className ?? ''}`}
                style={{ width: width ?? undefined, ...style }}
            >
                {onWidthChange && (
                    <button
                        type="button"
                        aria-label="Resize panel"
                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize group z-10"
                        onMouseDown={handleResizeStart}
                        onKeyDown={handleResizeKeyDown}
                    >
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-border group-hover:bg-primary/50 transition-colors" />
                    </button>
                )}
                {title && (
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                        <h2 className="text-sm font-bold tracking-wide uppercase text-textPrimary">
                            {title}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex items-center justify-center w-7 h-7 rounded hover:bg-bgBase/50 transition-colors text-textSecondary hover:text-textPrimary"
                            aria-label={closeAriaLabel}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
            </div>
        </>
    );
}
