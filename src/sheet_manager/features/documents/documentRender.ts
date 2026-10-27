import { createContext, type ReactNode } from 'react';

/**
 * How the workspace draws a document in a view (spec 044): preview cards and embeds draw a
 * document's brief through it. Without a provider (tests, docs pages) they show its text only.
 */
export const DocumentRenderContext = createContext<
    ((documentId: string, viewId?: string) => ReactNode) | null
>(null);

/** How many preview cards or embeds a document is drawn inside (0 on the page itself). */
export const PreviewDepthContext = createContext(0);
