import { createContext } from 'react';

/**
 * How a followed link opens a document (T-057): the sheet workspace provides one that leaves a
 * browser history entry, so Back returns to the document the link was in. Without a provider
 * (previews, tests of one page) a link just shows the document.
 */
export const DocumentLinkContext = createContext<((documentId: string) => void) | null>(null);
