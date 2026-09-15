import { X } from 'lucide-react';
import type { PointerEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

interface BottomSheetProps {
    onClose: () => void;
    children: ReactNode;
}

const PEEK = 70;
const MID = 40;
const FULL = 8;
const CLOSED = 100;

export function BottomSheet({ onClose, children }: BottomSheetProps) {
    const [translateY, setTranslateY] = useState(CLOSED);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const dragBaseY = useRef(CLOSED);

    useEffect(() => {
        const timer = setTimeout(() => {
            setTranslateY(PEEK);
            dragBaseY.current = PEEK;
        }, 20);
        return () => clearTimeout(timer);
    }, []);

    const snapTo = (y: number) => {
        setTranslateY(y);
        dragBaseY.current = y;
    };

    const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStartY.current = e.clientY;
        dragBaseY.current = translateY;
        setIsDragging(true);
    };

    const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
        if (!isDragging) return;
        const deltaY = e.clientY - dragStartY.current;
        const vh = window.innerHeight;
        const deltaPercent = (deltaY / vh) * 100;
        const newY = Math.max(FULL, Math.min(CLOSED, dragBaseY.current + deltaPercent));
        setTranslateY(newY);
    };

    const handlePointerUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
        const current = translateY;
        if (current > 85) {
            onClose();
        } else if (current > 55) {
            snapTo(PEEK);
        } else if (current > 15) {
            snapTo(MID);
        } else {
            snapTo(FULL);
        }
    };

    const contentMaxHeight = Math.max(0, 100 - translateY - 3);

    return (
        <section
            role="complementary"
            aria-label="Catalog item details"
            className="fixed left-0 right-0 bottom-0 z-50 bg-bgSurface rounded-t-xl border-t border-border shadow-xl will-change-transform"
            style={{
                transform: `translateY(${translateY}%)`,
                transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                height: '100dvh',
            }}
        >
            <button
                type="button"
                aria-label="Close details"
                onClick={onClose}
                className="absolute right-3 top-2 z-10 rounded p-1 text-textSecondary hover:bg-bgBase hover:text-textPrimary"
            >
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
                type="button"
                aria-label="Resize details sheet"
                className="flex w-full justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div className="w-10 h-1 rounded-full bg-textSecondary/40" />
            </button>
            <div
                className="overflow-y-auto px-5 pb-6"
                style={{ maxHeight: `${contentMaxHeight}dvh` }}
            >
                {children}
            </div>
        </section>
    );
}
