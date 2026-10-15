import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Splitter } from '@site/src/shared/components/Splitter';
import { useMeasuredElement } from '@site/src/shared/hooks/usePaneSizes';
import { type CSSProperties, Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';

import { useDocumentStore } from '../../../store/documentStore';
import { documentLabeler } from '../../documents/labeler';
import {
    DIVIDER_WIDTH,
    MIN_PANE_WIDTH,
    moveDivider,
    paneWidths,
    SIDE_BY_SIDE_WIDTH,
    visibleCount,
    visibleIds,
    weightsOf,
} from './layout';
import { Pane } from './Pane';
import { PaneSourceProvider } from './PaneSourceProvider';
import {
    closePane,
    focusPane,
    reconcilePanes,
    setPaneView,
    setPaneWeights,
    toggleMaximized,
    usePaneStore,
} from './paneStore';
import { PaneTabs } from './PaneTabs';

const labels = uiMessages.sheet.documents.panes;

const tracks = (widths: readonly number[]) =>
    widths.map((width) => `${width}px`).join(` ${DIVIDER_WIDTH}px `);

/**
 * Where the shown documents are drawn. One document is drawn exactly as the page always drew it:
 * no strip, divider, or wrapper (spec 034, FR-014); two or more get a tab strip and panes side by
 * side as far as they fit (at least 320 px each), the rest staying as tabs.
 */
export function PaneArea({
    documentId,
    renderDocument,
}: {
    documentId: string;
    renderDocument: (documentId: string, viewId?: string) => ReactNode;
}) {
    const arrangement = usePaneStore();
    const entries = useDocumentStore((state) => state.entries);
    const pinDocuments = useDocumentStore((state) => state.pinDocuments);
    const loadIntoCache = useDocumentStore((state) => state.loadIntoCache);
    const [unreadable, setUnreadable] = useState<ReadonlySet<string>>(new Set());
    const { ref: gridRef, node: grid, width } = useMeasuredElement<HTMLDivElement>();

    const entryIds = useMemo(() => new Set(entries.map(({ id }) => id)), [entries]);
    const panes = useMemo(
        () => reconcilePanes(arrangement, documentId, entryIds),
        [arrangement, documentId, entryIds]
    );
    useEffect(() => {
        if (panes !== arrangement) usePaneStore.setState(panes);
    }, [arrangement, panes]);

    const idsKey = panes.ids.join('\u0000');
    useEffect(() => {
        const ids = idsKey ? idsKey.split('\u0000') : [];
        pinDocuments(ids);
        let cancelled = false;
        void loadIntoCache(ids).then(() => {
            if (cancelled) return;
            const loaded = new Set(useDocumentStore.getState().documents.map(({ id }) => id));
            const missing = ids.filter((id) => !loaded.has(id));
            setUnreadable((previous) =>
                missing.length === previous.size && missing.every((id) => previous.has(id))
                    ? previous
                    : new Set(missing)
            );
        });
        return () => {
            cancelled = true;
        };
    }, [idsKey, pinDocuments, loadIntoCache]);

    const sideBySide = width !== undefined && width >= SIDE_BY_SIDE_WIDTH;
    const shown = useMemo(
        () =>
            sideBySide && panes.maximized
                ? [panes.maximized]
                : visibleIds(panes.ids, panes.recent, visibleCount(width)),
        [panes.ids, panes.maximized, panes.recent, sideBySide, width]
    );
    const widths = useMemo(
        () =>
            width === undefined
                ? shown.map(() => 0)
                : paneWidths(
                      shown.map((id) => panes.weights[id] ?? 1),
                      width
                  ),
        [panes.weights, shown, width]
    );

    if (panes.ids.length < 2) {
        return (
            <PaneSourceProvider documentId={documentId}>
                {renderDocument(documentId)}
            </PaneSourceProvider>
        );
    }

    const nameOf = (id: string) => {
        const entry = entries.find((candidate) => candidate.id === id);
        return entry ? documentLabeler.title(entry) : id;
    };
    const tabs = panes.ids.map((id) => ({ id, name: nameOf(id) }));
    const gridStyle: CSSProperties =
        shown.length > 1 && width !== undefined
            ? { gridTemplateColumns: tracks(widths) }
            : { gridTemplateColumns: 'minmax(0, 1fr)' };
    const previewDivider = (index: number, left: number) => {
        grid?.style.setProperty('grid-template-columns', tracks(moveDivider(widths, index, left)));
    };
    const commitDivider = (index: number, left: number) =>
        setPaneWeights(shown, weightsOf(moveDivider(widths, index, left)));

    return (
        <div className="space-y-2 px-4 pb-4 pt-3" data-panes="">
            <PaneTabs
                tabs={tabs}
                focusedId={documentId}
                onFocus={focusPane}
                onClose={closePane}
                onMaximize={sideBySide ? toggleMaximized : undefined}
            />
            <div ref={gridRef} style={gridStyle} className="grid gap-y-4">
                {shown.map((id, index) => (
                    <Fragment key={id}>
                        {index > 0 && (
                            <Splitter
                                bare
                                label={translate(labels.resize, {
                                    left: nameOf(shown[index - 1]!),
                                    right: nameOf(id),
                                })}
                                min={MIN_PANE_WIDTH}
                                max={widths[index - 1]! + widths[index]! - MIN_PANE_WIDTH}
                                value={widths[index - 1]!}
                                clamp={(left) => moveDivider(widths, index - 1, left)[index - 1]!}
                                onPreview={(left) => previewDivider(index - 1, left)}
                                onChange={(left) => commitDivider(index - 1, left)}
                                onReset={() =>
                                    setPaneWeights(
                                        shown,
                                        shown.map(() => 1)
                                    )
                                }
                            />
                        )}
                        <Pane
                            documentId={id}
                            name={nameOf(id)}
                            focused={id === documentId}
                            maximized={sideBySide ? panes.maximized === id : undefined}
                            onFocus={() => focusPane(id)}
                            onToggleMaximized={() => toggleMaximized(id)}
                            onClose={() => closePane(id)}
                            onView={(view) => setPaneView(id, view)}
                            view={panes.views[id]}
                            render={renderDocument}
                            unreadable={unreadable.has(id)}
                        />
                    </Fragment>
                ))}
            </div>
        </div>
    );
}
