import { useCallback, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { X } from 'lucide-react';

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
}: SlidePanelProps) {
    const widthRef = useRef(width ?? 380);

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

    if (!open) return null;

    return (
        <>
            {showBackdrop && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
            <div
                className={`fixed top-0 right-0 bottom-0 z-50 bg-bgSurface border-l border-border shadow-xl flex flex-col overflow-hidden ${className ?? ''}`}
                style={{ width: width ?? undefined, ...style }}
            >
                {onWidthChange && (
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize group z-10"
                        onMouseDown={handleResizeStart}
                    >
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-border group-hover:bg-primary/50 transition-colors" />
                    </div>
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
