import { forwardRef, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface EntityCardProps {
    name: string;
    description: string;
    tags: string[];
    expanded: boolean;
    onToggle: () => void;
    renderDetail: () => ReactNode;
}

export const EntityCard = forwardRef<HTMLDivElement, EntityCardProps>(function EntityCard(
    { name, description, tags, expanded, onToggle, renderDetail },
    ref
) {
    const contentId = useId();

    return (
        <div
            ref={ref}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={onToggle}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle();
                }
            }}
            className={clsx(
                'rounded-lg border border-border bg-bgSurface p-3 cursor-pointer transition-all duration-200',
                'sm:hover:scale-[1.02] sm:hover:shadow-md sm:hover:bg-bgBase/50',
                expanded && 'sm:scale-[1.02] sm:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
            )}
        >
            <div className="text-sm font-semibold text-textPrimary">{name}</div>
            <div className={clsx('text-xs text-textSecondary mt-0.5', !expanded && 'line-clamp-2')}>
                {description}
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {(expanded ? tags : tags.slice(0, 3)).map((tag) => (
                        <span
                            key={tag}
                            className="px-1.5 py-0.5 text-[10px] rounded-full bg-bgBase text-textSecondary border border-border whitespace-nowrap"
                        >
                            {tag}
                        </span>
                    ))}
                    {!expanded && tags.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-bgBase text-textSecondary border border-border">
                            +{tags.length - 3}
                        </span>
                    )}
                </div>
            )}

            <div
                id={contentId}
                className={clsx(
                    'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out overflow-hidden',
                    expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )}
            >
                <div className="min-h-0">
                    <div className="pt-3 border-t border-border mt-3">{renderDetail()}</div>
                </div>
            </div>
        </div>
    );
});

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
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef(new Map<string, HTMLDivElement | null>());
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

    useEffect(() => {
        if (!expandedKey) return;

        const handler = (e: MouseEvent) => {
            const cardEl = cardRefs.current.get(expandedKey);
            if (cardEl && !cardEl.contains(e.target as Node)) {
                setExpandedKey(null);
            }
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [expandedKey]);

    useEffect(() => {
        if (!expandedKey || !isSmallScreen) return;
        const cardEl = cardRefs.current.get(expandedKey);
        if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [expandedKey, isSmallScreen]);

    return (
        <div
            ref={gridRef}
            className="grid gap-3"
            style={{
                gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
            }}
        >
            {entities.map((entity) => {
                const key = getKey(entity);
                const isExpanded = expandedKey === key;

                return (
                    <EntityCard
                        key={key}
                        ref={(el) => {
                            cardRefs.current.set(key, el);
                        }}
                        name={getName(entity)}
                        description={getDescription(entity)}
                        tags={getTags(entity)}
                        expanded={isExpanded}
                        onToggle={() => setExpandedKey(isExpanded ? null : key)}
                        renderDetail={() => renderDetail(entity)}
                    />
                );
            })}
        </div>
    );
}
