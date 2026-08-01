import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

interface CollapsibleItemProps {
    title: React.ReactNode;
    badge?: React.ReactNode;
    defaultExpanded?: boolean;
    onRemove?: () => void;
    readOnly?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function CollapsibleItem({
    title,
    badge,
    defaultExpanded = false,
    onRemove,
    readOnly = false,
    children,
    className,
}: CollapsibleItemProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className={clsx('border border-border rounded-lg overflow-hidden', className)}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-bgBase/30 transition-colors"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse item details' : 'Expand item details'}
            >
                <span className="text-sm font-medium text-textPrimary truncate flex-1 min-w-0">
                    {title}
                </span>
                {badge && (
                    <span className="shrink-0 ml-2 text-xs font-normal text-textSecondary tabular-nums">
                        {badge}
                    </span>
                )}
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-textSecondary shrink-0" aria-hidden="true" />
                ) : (
                    <ChevronDown
                        className="w-4 h-4 text-textSecondary shrink-0"
                        aria-hidden="true"
                    />
                )}
            </button>
            {isExpanded && (
                <div
                    className="px-3 pb-3 space-y-2 border-t border-border pt-2 bg-bgBase"
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                    {!readOnly && onRemove && (
                        <div className="flex justify-end pt-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                className="flex items-center gap-1 text-xs text-textSecondary hover:text-error transition-colors px-1 py-1 rounded hover:bg-bgBase/20"
                                aria-label="Remove item"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
