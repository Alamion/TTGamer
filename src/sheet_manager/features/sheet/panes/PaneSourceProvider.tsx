import type { ReactNode } from 'react';

import { DocumentSourceContext, useStoreDocumentSource } from '../../../hooks/useDocumentSource';

/** Gives everything inside one pane that pane's document, whichever is current (spec 034, D1). */
export function PaneSourceProvider({
    children,
    documentId,
}: {
    children: ReactNode;
    documentId: string;
}) {
    const source = useStoreDocumentSource(documentId);
    return (
        <DocumentSourceContext.Provider value={source}>{children}</DocumentSourceContext.Provider>
    );
}
