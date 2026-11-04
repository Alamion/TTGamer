import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { DocsPreviewLink } from '@site/src/shared/components/DocsFragmentCard';
import { useLocalStorageState } from '@site/src/shared/hooks/useLocalStorageState';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

import { BRIEF } from '../../features/sheet/declarative/briefRhythm';
import { documentationFor } from '../controls/documentationFor';

interface SectionCardProps {
    title?: string;
    storageKey?: string;
    defaultExpanded?: boolean;
    children: React.ReactNode;
    docsPath?: string;
    /** Brief look (spec 033): no box, a small heading over a hairline, rhythm gaps. */
    dense?: boolean;
}

export function SectionCard({
    title,
    storageKey,
    defaultExpanded = true,
    children,
    docsPath,
    dense = false,
}: SectionCardProps) {
    const [_storedExpanded, _setStoredExpanded] = useLocalStorageState(
        storageKey ?? '__section_card_never__',
        defaultExpanded
    );
    const isExpanded = storageKey ? _storedExpanded : true;
    const setIsExpanded = storageKey ? _setStoredExpanded : () => {};

    const renderDocsIcon = () =>
        docsPath ? (
            <DocsPreviewLink
                docsPath={docsPath}
                label={documentationFor(title ?? '')}
                title={title ?? ''}
            />
        ) : null;

    const storageHeader = (
        <div className="flex items-center gap-2 p-4">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex min-w-0 flex-1 items-center justify-between text-left hover:bg-bgBase/30 transition-colors"
                aria-expanded={isExpanded}
                aria-label={translate(uiMessages.sheet.controls.toggleSection, {
                    title: title ?? '',
                })}
            >
                <h3 className="text-textSecondary text-sm font-semibold uppercase tracking-wider">
                    {title}
                </h3>
                <ChevronDown
                    className={clsx(
                        'w-5 h-5 shrink-0 text-textSecondary transition-transform duration-200 ease-linear motion-reduce:transition-none',
                        isExpanded && 'rotate-180'
                    )}
                    aria-hidden="true"
                />
            </button>
            {renderDocsIcon()}
        </div>
    );

    const header = (
        <h3 className="text-textSecondary text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
            {title}
            {renderDocsIcon()}
        </h3>
    );

    if (dense) {
        return (
            <section className="min-w-0">
                {title &&
                    (storageKey ? (
                        <div className={clsx('mb-0.5 flex items-center gap-2', BRIEF.heading)}>
                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex min-w-0 flex-1 items-center justify-between text-left"
                                aria-expanded={isExpanded}
                                aria-label={translate(uiMessages.sheet.controls.toggleSection, {
                                    title: title ?? '',
                                })}
                            >
                                <h3 className="flex items-center gap-2">{title}</h3>
                                <ChevronDown
                                    className={clsx(
                                        'h-4 w-4 shrink-0 transition-transform duration-200 ease-linear motion-reduce:transition-none',
                                        isExpanded && 'rotate-180'
                                    )}
                                    aria-hidden="true"
                                />
                            </button>
                            {renderDocsIcon()}
                        </div>
                    ) : (
                        <h3 className={clsx('mb-0.5 flex items-center gap-2', BRIEF.heading)}>
                            {title}
                            {renderDocsIcon()}
                        </h3>
                    ))}
                {(!storageKey || isExpanded) && <div>{children}</div>}
            </section>
        );
    }

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
