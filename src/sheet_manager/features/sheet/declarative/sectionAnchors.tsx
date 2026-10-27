import { createContext, type ReactNode, useContext } from 'react';

import type { TemplateNode } from '../../../types/template';

/**
 * Section anchors (spec 044, D7): every titled or labelled node of a page is wrapped in a box-less
 * element naming it, so `[[Document#Section]]` scrolls there. Shipped labels are translated, so the
 * anchor carries the shown name and the source (English) name.
 */

/** The name a node is linked by: a container's title or a field's label. */
export function anchorName(node: TemplateNode): string | undefined {
    if ('title' in node && typeof node.title === 'string' && node.title.trim()) return node.title;
    if ('label' in node && typeof node.label === 'string' && node.label.trim()) return node.label;
    return undefined;
}

/** Source names of a page's nodes by id, before translation. */
export function sourceAnchorNames(nodes: readonly TemplateNode[]): Map<string, string> {
    const names = new Map<string, string>();
    const visit = (list: readonly TemplateNode[]) => {
        for (const node of list) {
            const name = anchorName(node);
            if (name) names.set(node.id, name);
            if ('children' in node && Array.isArray(node.children)) {
                visit(node.children as readonly TemplateNode[]);
            }
        }
    };
    visit(nodes);
    return names;
}

export const SourceAnchorNamesContext = createContext<ReadonlyMap<string, string>>(new Map());

/** Wraps a node in its anchor; nodes without a name are returned as they are. */
export function SectionAnchor({ node, children }: { node: TemplateNode; children: ReactNode }) {
    const sources = useContext(SourceAnchorNamesContext);
    const name = anchorName(node);
    if (!name) return children;
    return (
        <div
            className="contents"
            data-node-id={node.id}
            data-section={name}
            data-section-source={sources.get(node.id) ?? name}
        >
            {children}
        </div>
    );
}
