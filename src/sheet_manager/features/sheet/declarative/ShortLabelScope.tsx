import { type ReactNode, useMemo } from 'react';

import { useTermHintSettings } from '../../../components/terms/TermHintContext';
import type { TemplateNode } from '../../../types/template';
import { useBriefPage } from './areaLayout';
import { ShortLabelContext, type ShortLabelNode, shortLabelsFor } from './shortLabels';

/** Ratings and pools that draw a short label on a brief (spec 041). */
const isRating = (node: TemplateNode): node is TemplateNode & ShortLabelNode =>
    (node.type === 'rating' ||
        (node.type === 'primitive' &&
            /^(trait|resource):/.test(node.bindingKey) &&
            node.poolTracker === undefined)) &&
    node.fullLabel !== true;

/** Resolves the short labels of one group's ratings together, so no two share their letters. */
export function ShortLabelScope({
    nodes,
    children,
}: {
    nodes: readonly TemplateNode[];
    children: ReactNode;
}) {
    const settings = useTermHintSettings();
    const brief = useBriefPage();
    const locale = settings?.locale ?? 'en';
    const mode = settings?.mode ?? 'ru';
    const labels = useMemo(() => {
        const ratings = brief ? nodes.filter(isRating) : [];
        return ratings.length > 0 ? shortLabelsFor(ratings, locale, mode) : null;
    }, [nodes, locale, mode, brief]);
    return labels ? (
        <ShortLabelContext.Provider value={labels}>{children}</ShortLabelContext.Provider>
    ) : (
        <>{children}</>
    );
}
