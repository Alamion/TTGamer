import type { ReactNode } from 'react';

import { PaneSourceProvider } from './PaneSourceProvider';

/**
 * Where the shown documents are drawn. One document is drawn exactly as the page always drew it:
 * no strip, divider, or wrapper (spec 034, FR-014).
 */
export function PaneArea({
    documentId,
    renderDocument,
}: {
    documentId: string;
    renderDocument: (documentId: string) => ReactNode;
}) {
    return (
        <PaneSourceProvider documentId={documentId}>
            {renderDocument(documentId)}
        </PaneSourceProvider>
    );
}
