// @vitest-environment happy-dom
import {
    bootDocuments,
    purgeDeleted,
    reconcileIndex,
} from '@site/src/sheet_manager/store/documentBoot';
import {
    BACKUP_CLEAN_LAUNCHES,
    configureRecordStorage,
    countCleanLaunch,
    createMemoryRecordStorage,
    purgedIds,
    readRecord,
    recordWriter,
    writeRecord,
} from '@site/src/sheet_manager/store/documentContent';
import { BACKUP_KEY, LAUNCHES_KEY, recordKey } from '@site/src/sheet_manager/store/documentIndex';
import {
    type DocumentStoreState,
    migrateToIndexedState,
    useDocumentStore,
} from '@site/src/sheet_manager/store/documentStore';
import { beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { libraryDocument } from './helpers/library';

const hunter = (id: string, title = id) => {
    const document = libraryDocument(id, { systemId: 'wod-v5', definitionId: 'hunter' });
    return { ...document, metadata: { ...document.metadata, title } };
};

const api = () => ({
    getState: () => useDocumentStore.getState(),
    setState: (partial: Partial<DocumentStoreState>) => useDocumentStore.setState(partial),
    openDocument: (id: string) => useDocumentStore.getState().openDocument(id),
});

let storage: ReturnType<typeof createMemoryRecordStorage>;

beforeEach(() => {
    storage = createMemoryRecordStorage();
    configureRecordStorage(storage);
    purgedIds.clear();
    useDocumentStore.setState({
        documents: [],
        entries: [],
        pendingPurge: [],
        currentDocumentId: null,
        recoveryEntries: [],
    });
});

describe('migration of the version 4 value (spec 032, D4)', () => {
    const v4 = () => ({
        documents: [hunter('one', 'One'), hunter('two', 'Two')],
        currentDocumentId: 'two',
        recoveryEntries: ['kept earlier'],
    });

    it('makes a record and an entry per document and keeps the open one', async () => {
        const state = await migrateToIndexedState(v4());
        expect(state.entries.map(({ id, name, rank }) => [id, name, rank])).toEqual([
            ['one', 'One', 1],
            ['two', 'Two', 2],
        ]);
        expect(state.entries[0]).toMatchObject({
            kind: 'character',
            systemId: 'wod-v5',
            parentId: null,
        });
        expect(state.entries[0]!.createdAt).toBeUndefined();
        expect(state.currentDocumentId).toBe('two');
        expect(state.recoveryEntries).toEqual(['kept earlier']);
        expect(await readRecord('one')).toMatchObject({ id: 'one', kind: 'character' });
    });

    it('writes the backup of the raw value before any record', async () => {
        const order: string[] = [];
        const set = storage.set.bind(storage);
        storage.set = async (key, value) => {
            order.push(key);
            await set(key, value);
        };
        await migrateToIndexedState(v4());
        expect(order[0]).toBe(BACKUP_KEY);
        expect(order).toContain(recordKey('one'));
        expect(JSON.parse(storage.dump().get(BACKUP_KEY) as string)).toMatchObject({
            currentDocumentId: 'two',
        });
        expect(storage.dump().get(LAUNCHES_KEY)).toBe(0);
    });

    it('gives the same result when it runs again after an interruption', async () => {
        const first = await migrateToIndexedState(v4());
        const second = await migrateToIndexedState(v4());
        const strip = (entries: typeof first.entries) =>
            entries.map((entry) => ({ ...entry, updatedAt: 0 }));
        expect(strip(second.entries)).toEqual(strip(first.entries));
        expect((await storage.keys()).filter((key) => key.startsWith('doc:'))).toHaveLength(2);
    });

    it('keeps an invalid entry as a recovery entry and migrates the rest', async () => {
        const state = await migrateToIndexedState({
            documents: [hunter('good'), { id: 'bad', kind: 'nonsense' }],
            currentDocumentId: null,
            recoveryEntries: [],
        });
        expect(state.entries.map(({ id }) => id)).toEqual(['good']);
        expect(state.recoveryEntries).toHaveLength(1);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['document-recovered']);
    });

    it('turns the pre-document shape into entries too', async () => {
        const state = await migrateToIndexedState({ characters: [], currentCharacter: null });
        expect(state.entries).toEqual([]);
    });
});

describe('the backup countdown', () => {
    it('deletes the backup after the second clean launch and not before', async () => {
        await migrateToIndexedState({
            documents: [hunter('one')],
            currentDocumentId: null,
            recoveryEntries: [],
        });
        for (let launch = 1; launch < BACKUP_CLEAN_LAUNCHES; launch++) {
            expect(await countCleanLaunch()).toBe(false);
            expect(storage.dump().has(BACKUP_KEY)).toBe(true);
        }
        expect(await countCleanLaunch()).toBe(true);
        expect(storage.dump().has(BACKUP_KEY)).toBe(false);
        expect(storage.dump().has(LAUNCHES_KEY)).toBe(false);
    });

    it('has nothing to count when no backup exists', async () => {
        expect(await countCleanLaunch()).toBe(false);
    });
});

describe('opening documents from records', () => {
    it('reads only the opened record and applies what a library move wrote on the entry', async () => {
        const state = await migrateToIndexedState({
            documents: [
                {
                    ...hunter('one'),
                    metadata: { title: 'one', tags: [], templateId: 'tpl-before1' },
                },
                hunter('two'),
            ],
            currentDocumentId: null,
            recoveryEntries: [],
        });
        useDocumentStore.setState({ entries: state.entries });
        useDocumentStore.getState().relocateDocuments([{ id: 'one', templateId: null }]);
        const reads: string[] = [];
        const get = storage.get.bind(storage);
        storage.get = async (key) => {
            reads.push(key);
            return get(key);
        };

        expect(await useDocumentStore.getState().openDocument('one')).toBe(true);
        const { documents, currentDocumentId } = useDocumentStore.getState();
        expect(currentDocumentId).toBe('one');
        expect(documents.map(({ id }) => id)).toEqual(['one']);
        expect(documents[0]!.metadata.templateId).toBeUndefined();
        expect(reads).toEqual([recordKey('one')]);
    });

    it('is refused, and reported, when the record is gone', async () => {
        useDocumentStore.setState({
            entries: (
                await migrateToIndexedState({
                    documents: [hunter('one')],
                    currentDocumentId: null,
                    recoveryEntries: [],
                })
            ).entries,
        });
        await storage.remove(recordKey('one'));
        expect(await useDocumentStore.getState().openDocument('one')).toBe(false);
        expect(useDocumentStore.getState().opening).toBeNull();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['document-record-missing']);
    });

    it('opens a document by setCurrentDocument when only its entry is held', async () => {
        useDocumentStore.setState({
            entries: (
                await migrateToIndexedState({
                    documents: [hunter('one')],
                    currentDocumentId: null,
                    recoveryEntries: [],
                })
            ).entries,
        });
        useDocumentStore.getState().setCurrentDocument('one');
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(useDocumentStore.getState().currentDocumentId).toBe('one');
    });

    it('boots by reading the open document and no other record', async () => {
        const state = await migrateToIndexedState({
            documents: [hunter('one'), hunter('two'), hunter('three')],
            currentDocumentId: 'two',
            recoveryEntries: [],
        });
        useDocumentStore.setState({
            entries: state.entries,
            currentDocumentId: state.currentDocumentId,
        });
        const reads: string[] = [];
        const get = storage.get.bind(storage);
        storage.get = async (key) => {
            reads.push(key);
            return get(key);
        };
        await bootDocuments(api());
        expect(reads.filter((key) => key.startsWith('doc:'))).toEqual([recordKey('two')]);
        expect(useDocumentStore.getState().documents.map(({ id }) => id)).toEqual(['two']);
    });
});

describe('the index and the purge never delete a document by mistake (D5)', () => {
    it('rebuilds the entry of a record that has none and reports it', async () => {
        await writeRecord('lost', hunter('lost', 'Lost row'));
        await writeRecord('gone', hunter('gone'));
        useDocumentStore.setState({ pendingPurge: ['gone'] });
        expect(await reconcileIndex(api())).toBe(1);
        expect(useDocumentStore.getState().entries.map(({ id, name }) => [id, name])).toEqual([
            ['lost', 'Lost row'],
        ]);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['document-index-rebuilt']);
    });

    it('removes only listed records, and not one whose entry came back', async () => {
        await writeRecord('deleted', hunter('deleted'));
        await writeRecord('restored', hunter('restored'));
        await writeRecord('unlisted', hunter('unlisted'));
        useDocumentStore.setState({
            entries: (
                await migrateToIndexedState({
                    documents: [hunter('restored')],
                    currentDocumentId: null,
                    recoveryEntries: [],
                })
            ).entries,
            pendingPurge: ['deleted', 'restored'],
        });
        await purgeDeleted(api());
        const keys = await storage.keys();
        expect(keys).toContain(recordKey('restored'));
        expect(keys).toContain(recordKey('unlisted'));
        expect(keys).not.toContain(recordKey('deleted'));
        expect(useDocumentStore.getState().pendingPurge).toEqual([]);
        expect(purgedIds.has('deleted')).toBe(true);
    });

    it('deleting a document keeps its record until the next start', async () => {
        const document = hunter('one');
        await writeRecord('one', document);
        useDocumentStore.setState({ documents: [document], currentDocumentId: 'one' });
        useDocumentStore.getState().deleteDocument('one');
        const state = useDocumentStore.getState();
        expect(state.entries).toEqual([]);
        expect(state.pendingPurge).toEqual(['one']);
        expect(state.currentDocumentId).toBeNull();
        expect(await storage.keys()).toContain(recordKey('one'));
    });

    it('importing an id that waits for its purge cancels the purge', () => {
        useDocumentStore.setState({ pendingPurge: ['one'] });
        useDocumentStore.getState().importDocument(hunter('one'));
        expect(useDocumentStore.getState().pendingPurge).toEqual([]);
    });
});

describe('saving changed documents', () => {
    it('writes a changed document as its own record after a pause', async () => {
        const document = hunter('one');
        useDocumentStore.setState({ documents: [document], currentDocumentId: 'one' });
        useDocumentStore.getState().updateDocumentMetadata('one', { title: 'Renamed' });
        await recordWriter.flush();
        expect(await readRecord('one')).toMatchObject({ metadata: { title: 'Renamed' } });
    });
});
