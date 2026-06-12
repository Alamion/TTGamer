import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';

export interface EntityCardProps {
    name: string;
    description: string;
    tags: string[];
    renderDetail: () => ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function EntityCard({
    name,
    description,
    tags,
    renderDetail,
    open,
    onOpenChange,
}: EntityCardProps) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const descId = useId();
    const [triggerWidth, setTriggerWidth] = useState(0);

    useEffect(() => {
        const el = triggerRef.current;
        if (!el) return;
        const updateWidth = () => setTriggerWidth(el.offsetWidth * 1.02);
        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <Popover.Root open={open} onOpenChange={onOpenChange}>
            <Popover.Trigger asChild>
                <button
                    ref={triggerRef}
                    className="w-full text-left p-3 rounded-lg border border-border bg-bgSurface hover:scale-[1.02] hover:shadow-md hover:bg-bgBase/50 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                    <div className="text-sm font-semibold text-textPrimary">{name}</div>
                    <div className="text-xs text-textSecondary mt-0.5">{description}</div>
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {tags.slice(0, 3).map((tag) => (
                                <span
                                    key={tag}
                                    className="px-1.5 py-0.5 text-[10px] rounded-full bg-bgBase text-textSecondary border border-border whitespace-nowrap"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </button>
            </Popover.Trigger>
            <Popover.Content
                aria-describedby={descId}
                className="z-50 bg-bgSurface border border-border rounded-lg shadow-xl p-5 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 focus:outline-none"
                style={{ width: triggerWidth > 0 ? triggerWidth : undefined }}
                sideOffset={8}
                align="start"
            >
                <p id={descId} className="sr-only">
                    {description}
                </p>
                {renderDetail()}
            </Popover.Content>
        </Popover.Root>
    );
}

export interface EntityGridProps<T> {
    entities: T[];
    renderDetail: (entity: T) => ReactNode;
    getName: (entity: T) => string;
    getDescription: (entity: T) => string;
    getTags: (entity: T) => string[];
    getKey: (entity: T) => string;
    cols?: number;
}

export function EntityGrid<T>({
    entities,
    renderDetail,
    getName,
    getDescription,
    getTags,
    getKey,
    cols = 3,
}: EntityGridProps<T>) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const isSmallScreen = useSyncExternalStore(
        (callback) => {
            const mql = window.matchMedia('(max-width: 640px)');
            mql.addEventListener('change', callback);
            return () => mql.removeEventListener('change', callback);
        },
        () => window.matchMedia('(max-width: 640px)').matches,
        () => false
    );

    const effectiveCols = isSmallScreen ? 1 : cols;

    const rows = useMemo(
        () => Math.max(1, Math.ceil(entities.length / effectiveCols)),
        [entities, effectiveCols]
    );

    return (
        <div
            className="grid gap-3"
            style={{
                gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, auto)`,
                gridAutoFlow: 'column',
            }}
        >
            {entities.map((entity) => {
                const key = getKey(entity);
                return (
                    <EntityCard
                        key={key}
                        name={getName(entity)}
                        description={getDescription(entity)}
                        tags={getTags(entity)}
                        renderDetail={() => renderDetail(entity)}
                        open={selectedId === key}
                        onOpenChange={(open) => setSelectedId(open ? key : null)}
                    />
                );
            })}
        </div>
    );
}
