import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { DocsHelpLink } from '@site/src/shared/components/DocsHelpLink';
import { useLocalStorageState } from '@site/src/shared/hooks/useLocalStorageState';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

import { documentationFor } from '../controls/documentationFor';

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
            <DocsHelpLink docsPath={docsPath} label={documentationFor(title ?? '')} />
        ) : null;

    const storageHeader = (
        <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-bgBase/30 transition-colors"
            aria-expanded={isExpanded}
            aria-label={translate(uiMessages.sheet.controls.toggleSection, { title: title ?? '' })}
        >
            <h3 className="text-textSecondary text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                {title}
                {renderDocsIcon()}
            </h3>
            <ChevronDown
                className={clsx(
                    'w-5 h-5 shrink-0 text-textSecondary transition-transform duration-200 ease-linear motion-reduce:transition-none',
                    isExpanded && 'rotate-180'
                )}
                aria-hidden="true"
            />
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
