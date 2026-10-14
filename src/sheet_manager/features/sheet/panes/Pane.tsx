import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { useDocumentStore } from '../../../store/documentStore';
import { tabId } from './paneIds';
import { PaneSourceProvider } from './PaneSourceProvider';

const labels = uiMessages.sheet.documents.panes;

/** One open document: a labelled region with its title, a close button, and its page. */
export function Pane({
    documentId,
    focused,
    name,
    onClose,
    onFocus,
    render,
    unreadable,
}: {
    documentId: string;
    focused: boolean;
    name: string;
    onClose: () => void;
    onFocus: () => void;
    render: (documentId: string) => ReactNode;
    unreadable: boolean;
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
                'min-w-0 rounded-lg border bg-bgSurface',
                focused ? 'border-primary' : 'border-border'
            )}
        >
            <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
                <h2 className="truncate text-sm font-semibold text-textPrimary">{name}</h2>
                <button
                    type="button"
                    aria-label={translate(labels.close, { name })}
                    onClick={onClose}
                    className="rounded-sm p-1 text-textSecondary hover:text-textPrimary pointer-coarse:min-h-8 pointer-coarse:min-w-8"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            </header>
            {unreadable ? (
                <p role="alert" className="p-4 text-sm text-error">
                    {translate(labels.unreadable)}
                </p>
            ) : loaded ? (
                <PaneSourceProvider documentId={documentId}>
                    {render(documentId)}
                </PaneSourceProvider>
            ) : (
                <p role="status" className="p-4 text-sm text-textSecondary">
                    {translate(uiMessages.sheet.documents.toolbar.openingDocument)}
                </p>
            )}
        </section>
    );
}
