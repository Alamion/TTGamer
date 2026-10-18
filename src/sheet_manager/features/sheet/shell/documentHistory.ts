import { useHistory, useLocation } from '@docusaurus/router';
import { useCallback, useEffect, useRef } from 'react';

import { useDocumentStore } from '../../../store/documentStore';

/**
 * Browser history between linked documents (T-057). The sheet is one page, so following a link
 * names the document in the address (`?doc=<id>`) as a new history entry; Back and Forward show
 * the document their entry names. A query change does not scroll the page (Docusaurus).
 */

const PARAM = 'doc';

const named = (search: string) => new URLSearchParams(search).get(PARAM);

function withDocument(search: string, id: string): string {
    const params = new URLSearchParams(search);
    params.set(PARAM, id);
    return `?${params.toString()}`;
}

/** The link handler of the workspace; mount once, where the sheet's documents are shown. */
export function useDocumentHistory(): (documentId: string) => void {
    const history = useHistory();
    const location = useLocation();
    const currentId = useDocumentStore((state) => state.currentDocumentId);
    const entryId = named(location.search);
    const entryKnown = useDocumentStore((state) =>
        entryId ? state.entries.some((entry) => entry.id === entryId) : false
    );

    // Back, Forward, or an address naming a document: show it once it is in the collection.
    useEffect(() => {
        if (!entryId || !entryKnown) return;
        const { currentDocumentId, setCurrentDocument } = useDocumentStore.getState();
        if (entryId !== currentDocumentId) setCurrentDocument(entryId);
    }, [entryId, entryKnown]);

    // A document opened another way (the tree, a tab) takes over the entry's name, so a reload
    // or a later Back never shows a document the reader already left.
    const previous = useRef(currentId);
    useEffect(() => {
        const before = previous.current;
        previous.current = currentId;
        // The first document shown after loading is not a choice; the address may name another.
        if (before === currentId || before === null) return;
        const live = history.location;
        const shown = named(live.search);
        if (currentId && shown && shown !== currentId) {
            history.replace({ ...live, search: withDocument(live.search, currentId) });
        }
    }, [currentId, history]);

    return useCallback(
        (documentId: string) => {
            const { currentDocumentId, setCurrentDocument } = useDocumentStore.getState();
            if (documentId === currentDocumentId) return;
            const live = history.location;
            // The entry left behind names the document the link was in.
            if (currentDocumentId && named(live.search) !== currentDocumentId) {
                history.replace({ ...live, search: withDocument(live.search, currentDocumentId) });
            }
            const from = history.location;
            history.push({ ...from, search: withDocument(from.search, documentId) });
            setCurrentDocument(documentId);
        },
        [history]
    );
}
