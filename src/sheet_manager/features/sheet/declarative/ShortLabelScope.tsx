import { type ReactNode, useMemo } from 'react';

import { useTermHintSettings } from '../../../components/terms/TermHintContext';
import type { TemplateNode } from '../../../types/template';
import { ShortLabelContext, type ShortLabelNode, shortLabelsFor } from './shortLabels';

const isRating = (node: TemplateNode): node is TemplateNode & ShortLabelNode =>
    (node.type === 'primitive' || node.type === 'rating') &&
    (node as ShortLabelNode).shortForm === true;

/** Resolves the short labels of one group's ratings together, so no two share their letters. */
export function ShortLabelScope({
    nodes,
    children,
}: {
    nodes: readonly TemplateNode[];
    children: ReactNode;
}) {
    const settings = useTermHintSettings();
    const locale = settings?.locale ?? 'en';
    const mode = settings?.mode ?? 'ru';
    const labels = useMemo(() => {
        const ratings = nodes.filter(isRating);
        return ratings.length > 0 ? shortLabelsFor(ratings, locale, mode) : null;
    }, [nodes, locale, mode]);
    return labels ? (
        <ShortLabelContext.Provider value={labels}>{children}</ShortLabelContext.Provider>
    ) : (
        <>{children}</>
    );
}
