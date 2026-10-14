import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { useDocumentStore } from '../../../store/documentStore';
import { documentLabeler } from '../../documents/labeler';
import { Pane } from './Pane';
import { PaneSourceProvider } from './PaneSourceProvider';
import { closePane, focusPane, reconcilePanes, usePaneStore } from './paneStore';
import { PaneTabs } from './PaneTabs';

/**
 * Where the shown documents are drawn. One document is drawn exactly as the page always drew it:
 * no strip, divider, or wrapper (spec 034, FR-014); two or more get a tab strip and one pane each.
 */
export function PaneArea({
    documentId,
    renderDocument,
}: {
    documentId: string;
    renderDocument: (documentId: string) => ReactNode;
}) {
    const arrangement = usePaneStore();
    const entries = useDocumentStore((state) => state.entries);
    const pinDocuments = useDocumentStore((state) => state.pinDocuments);
    const loadIntoCache = useDocumentStore((state) => state.loadIntoCache);
    const [unreadable, setUnreadable] = useState<ReadonlySet<string>>(new Set());

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
    return (
        <div className="space-y-2 px-4 pb-4" data-panes="">
            <PaneTabs tabs={tabs} focusedId={documentId} onFocus={focusPane} onClose={closePane} />
            <div className="space-y-4">
                {tabs.map(({ id, name }) => (
                    <Pane
                        key={id}
                        documentId={id}
                        name={name}
                        focused={id === documentId}
                        onFocus={() => focusPane(id)}
                        onClose={() => closePane(id)}
                        render={renderDocument}
                        unreadable={unreadable.has(id)}
                    />
                ))}
            </div>
        </div>
    );
}
