// @vitest-environment happy-dom
import { recordWriter, writeRecord } from '@site/src/sheet_manager/store/documentContent';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { beforeEach, describe, expect, it } from 'vitest';

import { libraryDocument } from './helpers/library';

const ids = Array.from({ length: 10 }, (_, index) => `doc-${index}`);
const documents = ids.map((id) =>
    libraryDocument(id, { systemId: 'wod-v5', definitionId: 'hunter' })
);
const allEntries = () => useDocumentStore.getState().entries;
/** Loads the first `count` documents; their saves are flushed so none counts as unsaved. */
const load = async (count: number, currentDocumentId: string) => {
    useDocumentStore.setState({
        documents: documents.slice(0, count),
        entries: allEntries(),
        currentDocumentId,
    });
    await recordWriter.flush();
};
const loadedIds = () => useDocumentStore.getState().documents.map(({ id }) => id);

beforeEach(async () => {
    await Promise.all(documents.map((document) => writeRecord(document.id, document)));
    useDocumentStore.setState({ documents, currentDocumentId: null });
    useDocumentStore.setState({
        documents: [],
        entries: allEntries(),
        currentDocumentId: null,
        pinnedIds: [],
    });
});

describe('the pinned part of the loaded cache (spec 034)', () => {
    it('keeps every pinned document when a read pushes the cache over its cap', async () => {
        await load(9, 'doc-0');
        const pinned = ids.slice(1, 7);
        useDocumentStore.getState().pinDocuments(pinned);

        expect(await useDocumentStore.getState().openDocument('doc-9')).toBe(true);

        const loaded = loadedIds();
        for (const id of [...pinned, 'doc-9']) expect(loaded).toContain(id);
        expect(loaded.length).toBeLessThanOrEqual(8);
    });

    it('pins at most six ids', () => {
        useDocumentStore.getState().pinDocuments(ids);
        expect(useDocumentStore.getState().pinnedIds).toEqual(ids.slice(0, 6));
    });

    it('reads entries into the cache without changing the current document', async () => {
        await load(1, 'doc-0');
        await useDocumentStore.getState().loadIntoCache(['doc-1', 'doc-2']);

        expect(loadedIds().sort()).toEqual(['doc-0', 'doc-1', 'doc-2']);
        expect(useDocumentStore.getState().currentDocumentId).toBe('doc-0');
    });

    it('skips ids that are not in the collection or already loaded', async () => {
        await load(1, 'doc-0');
        await useDocumentStore.getState().loadIntoCache(['doc-0', 'nothing-here']);
        expect(loadedIds()).toEqual(['doc-0']);
    });
});
