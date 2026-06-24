import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useLocalStorageState } from '../hooks';
import { clsx } from 'clsx';

interface SectionCardProps {
    title?: string;
    storageKey?: string;
    defaultExpanded?: boolean;
    children: React.ReactNode;
    docsPath?: string;
}

export function SectionCard({
    title,
    storageKey,
    defaultExpanded = true,
    children,
    docsPath,
}: SectionCardProps) {
    const [_storedExpanded, _setStoredExpanded] = useLocalStorageState(
        storageKey ?? '__section_card_never__',
        defaultExpanded
    );
    const isExpanded = storageKey ? _storedExpanded : true;
    const setIsExpanded = storageKey ? _setStoredExpanded : () => {};

    const renderDocsIcon = () =>
        docsPath ? (
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
        ) : null;

    const storageHeader = (
        <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-bgBase/30 transition-colors"
            aria-expanded={isExpanded}
            aria-label={`Toggle ${title} section`}
        >
            <h3 className="text-textSecondary text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                {title}
                {renderDocsIcon()}
            </h3>
            {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-textSecondary" aria-hidden="true" />
            ) : (
                <ChevronDown className="w-5 h-5 text-textSecondary" aria-hidden="true" />
            )}
        </button>
    );

    const header = (
        <h3 className="text-textSecondary text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
            {title}
            {renderDocsIcon()}
        </h3>
    );

    return (
        <div
            className={clsx(
                'bg-bgSurface border rounded-lg overflow-hidden',
                !storageKey ? 'p-4' : ''
            )}
        >
            {title ? storageKey ? storageHeader : header : <></>}
            {(!storageKey || isExpanded) && (
                <div className={storageKey ? 'px-4 pb-4' : ''}>{children}</div>
            )}
        </div>
    );
}
