import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useExpandedState } from '../hooks';

export type AccentColor = 'primary' | 'secondary';

interface CollapsibleBlockProps {
    title: string;
    accentColor?: AccentColor;
    storageKey: string;
    defaultExpanded?: boolean;
    children: React.ReactNode;
    docsPath?: string;
}

const accentColorClasses: Record<AccentColor, string> = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
};

export function CollapsibleBlock({
    title,
    accentColor = 'primary',
    storageKey,
    defaultExpanded = true,
    children,
    docsPath,
}: CollapsibleBlockProps) {
    const [isExpanded, toggleExpanded] = useExpandedState(storageKey, defaultExpanded);

    return (
        <div className="space-y-4">
            <button onClick={toggleExpanded} className="w-full flex items-center justify-between">
                <h2 className="text-lg font-semibold text-textPrimary flex items-center gap-2">
                    <span className={`w-1 h-6 ${accentColorClasses[accentColor]} rounded-full`} />
                    {title}
                    {docsPath && (
                        <a
                            href={docsPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-textSecondary hover:text-textPrimary transition-colors"
                            aria-label={`Documentation for ${title}`}
                        >
                            <HelpCircle className="w-4 h-4" />
                        </a>
                    )}
                </h2>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-textSecondary" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-textSecondary" />
                )}
            </button>

            {isExpanded && children}
        </div>
    );
}
