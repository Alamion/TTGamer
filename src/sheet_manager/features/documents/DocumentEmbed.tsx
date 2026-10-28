import { InertLink, type MarkdownEmbed } from '@site/src/shared/components/markdown/MarkdownView';
import { createContext, useContext } from 'react';

import { useDocumentSource } from '../../hooks/useDocumentSource';
import { DocumentLink, useLinkTarget } from './DocumentLink';
import { DocumentPreviewContent } from './DocumentPreviewCard';
import { PreviewDepthContext } from './documentRender';

/**
 * `![[Name]]` and `![[Name#Section]]` in markdown (spec 044, US6, design D10): the document's
 * preview content in place, read-only. Embeds go at most `EMBED_DEPTH_MAX` deep, and a document
 * already on the way to this embed shows as a link, so two notes that embed each other end.
 */

export const EMBED_DEPTH_MAX = 2;

/** A picture file's name: a missing one stays a picture reference, never a note to create. */
const PICTURE_NAME = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;

/** The documents an embed is drawn inside of, outermost first. */
const EmbedPathContext = createContext<readonly string[]>([]);

export function DocumentEmbed({ node }: { node: MarkdownEmbed }) {
    const { document: source } = useDocumentSource();
    const outer = useContext(EmbedPathContext);
    const depth = useContext(PreviewDepthContext);
    const { target, entry } = useLinkTarget(node.name);
    const path = outer.length > 0 || !source ? outer : [source.id];
    const link = (
        <DocumentLink
            node={{ type: 'wikilink', target: node.name, ...(node.alt ? { alias: node.alt } : {}) }}
        />
    );
    if (!entry && PICTURE_NAME.test(target.name)) {
        return <InertLink text={`![[${node.name}${node.alt ? `|${node.alt}` : ''}]]`} />;
    }
    if (!entry || path.includes(entry.id) || depth >= EMBED_DEPTH_MAX) return link;
    return (
        <span
            data-embed={entry.id}
            className="my-1 block rounded-md border border-border bg-bgBase/40 p-2"
        >
            <EmbedPathContext.Provider value={[...path, entry.id]}>
                <DocumentPreviewContent
                    documentId={entry.id}
                    whole
                    {...(target.section ? { section: target.section } : {})}
                />
            </EmbedPathContext.Provider>
        </span>
    );
}
