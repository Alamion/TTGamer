import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Maximize2, Minimize2, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { useDocumentStore } from '../../../store/documentStore';
import { AreaLayoutContext } from '../declarative/areaLayout';
import { tabId } from './paneIds';
import { PaneSourceProvider } from './PaneSourceProvider';
import { PaneViewSelect } from './PaneViewSelect';

const labels = uiMessages.sheet.documents.panes;
const buttonClass =
    'rounded-sm p-1 text-textSecondary hover:text-textPrimary pointer-coarse:min-h-8 pointer-coarse:min-w-8';

/** One open document: a labelled region with its title, a close button, and its page. */
export function Pane({
    documentId,
    fill,
    focused,
    framed,
    maximized,
    name,
    onClose,
    onFocus,
    onToggleMaximized,
    onView,
    render,
    unreadable,
    view,
}: {
    documentId: string;
    /** The pane fills a group of the layout: its page scrolls inside it, under its header. */
    fill: boolean;
    focused: boolean;
    /** Several panes are drawn, so each is framed and the focused one marked; alone it is neither. */
    framed: boolean;
    /** Whether the pane has the whole area; `undefined` where it cannot (a phone). */
    maximized: boolean | undefined;
    name: string;
    onClose: () => void;
    onFocus: () => void;
    onToggleMaximized: () => void;
    onView: (view: string) => void;
    render: (documentId: string, viewId?: string) => ReactNode;
    unreadable: boolean;
    /** The pane's own view; none shows what the document prefers. */
    view: string | undefined;
}) {
    const loaded = useDocumentStore((state) =>
        state.documents.some((document) => document.id === documentId)
    );
    return (
        <section
            aria-labelledby={tabId(documentId)}
            data-pane={documentId}
            onFocusCapture={onFocus}
            onPointerDownCapture={onFocus}
            className={clsx(
                'min-w-0',
                fill && 'flex min-h-0 flex-1 flex-col',
                framed &&
                    clsx(
                        'rounded-lg border-2',
                        focused ? 'border-primary' : 'border-borderMoreContrast'
                    )
            )}
        >
            <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
                <h2 className="truncate text-sm font-semibold text-textPrimary">{name}</h2>
                <div className="flex shrink-0 items-center gap-1">
                    {loaded && !unreadable && (
                        <PaneViewSelect documentId={documentId} view={view} onChange={onView} />
                    )}
                    {maximized !== undefined && (
                        <button
                            type="button"
                            aria-label={
                                maximized
                                    ? translate(labels.restore)
                                    : translate(labels.maximize, { name })
                            }
                            aria-pressed={maximized}
                            onClick={onToggleMaximized}
                            className={buttonClass}
                        >
                            {maximized ? (
                                <Minimize2 className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Maximize2 className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        aria-label={translate(labels.close, { name })}
                        onClick={onClose}
                        className={buttonClass}
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </header>
            <div className={clsx(fill && 'min-h-0 flex-1 overflow-auto')}>
                {unreadable ? (
                    <p role="alert" className="p-4 text-sm text-error">
                        {translate(labels.unreadable)}
                    </p>
                ) : loaded ? (
                    <AreaLayoutContext.Provider value={true}>
                        <PaneSourceProvider documentId={documentId}>
                            {render(documentId, view)}
                        </PaneSourceProvider>
                    </AreaLayoutContext.Provider>
                ) : (
                    <p role="status" className="p-4 text-sm text-textSecondary">
                        {translate(uiMessages.sheet.documents.toolbar.openingDocument)}
                    </p>
                )}
            </div>
        </section>
    );
}
