import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import { useDocumentStore } from '../../../store/documentStore';
import { AreaLayoutContext } from '../declarative/areaLayout';
import { tabId } from './paneIds';
import { PaneSourceProvider } from './PaneSourceProvider';
import { docKey } from './tabKeys';

const labels = uiMessages.sheet.documents.panes;

/** One open document's page: a region named by its tab, with the document as its source. */
export function Pane({
    documentId,
    fill,
    render,
    unreadable,
    view,
}: {
    documentId: string;
    /** The pane fills a group of the layout: its page scrolls inside it, under the strip. */
    fill: boolean;
    render: (documentId: string, viewId?: string) => ReactNode;
    unreadable: boolean;
    /** The tab's own view; none shows what the document prefers. */
    view: string | undefined;
}) {
    const loaded = useDocumentStore((state) =>
        state.documents.some((document) => document.id === documentId)
    );
    return (
        <section
            aria-labelledby={tabId(docKey(documentId))}
            data-pane={documentId}
            className={clsx('min-w-0', fill && 'min-h-0 flex-1 overflow-auto')}
        >
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
        </section>
    );
}
