import type { RollSource } from '@site/src/dice_roller/utils/rollReader';
import { useEffect } from 'react';
import { create } from 'zustand';

interface ShownDocumentState {
    source: RollSource | null;
}

/**
 * The document the sheet workspace is showing right now. Deliberately not persisted: the
 * store's `currentDocumentId` survives on every page, while this is set only while the
 * workspace is mounted.
 */
const useShownDocumentStore = create<ShownDocumentState>(() => ({ source: null }));

export function getShownDocument(): RollSource | null {
    return useShownDocumentStore.getState().source;
}

/** Publishes `source` as the shown document while the calling component is mounted. */
export function useShownDocumentPublisher(source: RollSource | null): void {
    const systemId = source?.systemId;
    const definitionId = source?.definitionId;
    useEffect(() => {
        useShownDocumentStore.setState({
            source: systemId && definitionId ? { systemId, definitionId } : null,
        });
        return () => useShownDocumentStore.setState({ source: null });
    }, [systemId, definitionId]);
}
