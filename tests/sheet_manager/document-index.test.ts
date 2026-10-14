// @vitest-environment happy-dom
import {
    type DocumentIndexEntry,
    documentRefs,
    entryOf,
    mergeById,
    mergeStoredValue,
} from '@site/src/sheet_manager/store/documentIndex';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { libraryDocument } from './helpers/library';

const entry = (id: string, updatedAt: number, name = id): DocumentIndexEntry => ({
    id,
    name,
    kind: 'character',
    systemId: 'wod-v5',
    definitionId: 'hunter',
    parentId: null,
    rank: 1,
    updatedAt,
});

beforeEach(() => {
    useDocumentStore.setState({
        documents: [],
        entries: [],
        pendingPurge: [],
        currentDocumentId: null,
    });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('entries follow their envelopes (spec 032, D3)', () => {
    it('is created with the document, with both times', () => {
        const document = useDocumentStore.getState().createDocument('wod-v5', 'hunter');
        const [created] = useDocumentStore.getState().entries;
        expect(created).toMatchObject({
            id: document.id,
            kind: 'character',
            systemId: 'wod-v5',
            parentId: null,
        });
        expect(created!.createdAt).toBe(created!.changedAt);
        expect(Date.parse(created!.createdAt!)).not.toBeNaN();
    });

    it('mirrors a name, template, and setting change in the same write', () => {
        const document = libraryDocument('one', { systemId: 'wod-v5', definitionId: 'hunter' });
        useDocumentStore.setState({ documents: [document], currentDocumentId: 'one' });
        let writes = 0;
        const stop = useDocumentStore.subscribe(() => writes++);
        useDocumentStore.getState().updateDocumentMetadata('one', {
            title: 'New name',
            templateId: 'tpl-page0001',
            settingId: 'user-setting-mist0001',
        });
        stop();
        expect(writes).toBe(1);
        expect(useDocumentStore.getState().entries[0]).toMatchObject({
            name: 'New name',
            templateId: 'tpl-page0001',
            settingId: 'user-setting-mist0001',
        });
    });

    it('moves the changed time at most once in the interval and keeps the created time', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-14T10:00:00Z'));
        const document = useDocumentStore.getState().createDocument('wod-v5', 'hunter');
        const created = useDocumentStore.getState().entries[0]!.createdAt;
        const rename = (title: string) =>
            useDocumentStore.getState().updateDocumentMetadata(document.id, { title });

        vi.setSystemTime(new Date('2026-10-14T10:00:02Z'));
        rename('Soon');
        expect(useDocumentStore.getState().entries[0]!.changedAt).toBe(created);

        vi.setSystemTime(new Date('2026-10-14T10:00:06Z'));
        rename('Later');
        const [later] = useDocumentStore.getState().entries;
        expect(later!.changedAt).toBe('2026-10-14T10:00:06.000Z');
        expect(later!.createdAt).toBe(created);
        expect(later!.name).toBe('Later');
    });

    it('keeps the entries list when a data edit changes nothing the entry says', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-14T10:00:00Z'));
        const document = useDocumentStore.getState().createDocument('wod-v5', 'hunter');
        const before = useDocumentStore.getState().entries;
        vi.setSystemTime(new Date('2026-10-14T10:00:01Z'));
        useDocumentStore.getState().updateDocumentData(document.id, (data) => data);
        expect(useDocumentStore.getState().entries).toBe(before);
    });

    it('applies a relocation to a document that is only an entry', () => {
        const document = libraryDocument(
            'unloaded',
            { systemId: 'wod-v5', definitionId: 'hunter' },
            { settingId: 'user-setting-mist0001', templateId: 'tpl-page0001' }
        );
        useDocumentStore.setState({ entries: [entryOf(document, undefined, {}, 1)] });
        useDocumentStore.getState().relocateDocuments([{ id: 'unloaded', templateId: null }]);
        const [moved] = useDocumentStore.getState().entries;
        expect(moved!.templateId).toBeUndefined();
        expect(moved!.settingId).toBe('user-setting-mist0001');
    });

    it('builds the refs again only when the entries list changes', () => {
        const entries = [entry('a', 1), entry('b', 1)];
        expect(documentRefs(entries)).toBe(documentRefs(entries));
        expect(documentRefs(entries)[0]).toMatchObject({ id: 'a', metadata: { title: 'a' } });
    });
});

describe('two tabs saving the index (spec 032, D13)', () => {
    const value = (entries: DocumentIndexEntry[], pendingPurge: string[] = []) =>
        JSON.stringify({ state: { entries, pendingPurge }, version: 5 });
    const entriesOf = (merged: string): string[] =>
        (JSON.parse(merged) as { state: { entries: DocumentIndexEntry[] } }).state.entries.map(
            ({ id }) => id
        );

    it('merges by id and loses no row a stale tab does not know', () => {
        const stored = value([entry('a', 1), entry('b', 1), entry('made-elsewhere', 5)]);
        const next = value([entry('a', 1), entry('b', 2, 'renamed here')]);
        const merged = mergeStoredValue(stored, next, new Set());
        expect(entriesOf(merged)).toEqual(['a', 'b', 'made-elsewhere']);
        const b = (
            JSON.parse(merged) as { state: { entries: DocumentIndexEntry[] } }
        ).state.entries.find(({ id }) => id === 'b');
        expect(b!.name).toBe('renamed here');
    });

    it('keeps a deletion made here, and lets an undo here win over an old tombstone', () => {
        const stored = value([entry('a', 1), entry('gone', 1)], ['gone', 'back']);
        const next = value([entry('a', 1), entry('back', 3)], ['gone2']);
        const merged = mergeStoredValue(stored, next, new Set());
        expect(entriesOf(merged)).toEqual(['a', 'back']);
        const pending = (JSON.parse(merged) as { state: { pendingPurge: string[] } }).state
            .pendingPurge;
        expect(pending).toEqual(['gone2', 'gone']);
    });

    it('does not bring back a tombstone already carried out', () => {
        const stored = value([], ['done']);
        const merged = mergeStoredValue(stored, value([]), new Set(['done']));
        expect(
            (JSON.parse(merged) as { state: { pendingPurge: string[] } }).state.pendingPurge
        ).toEqual([]);
    });

    it('takes the newer stamp when both tabs changed one row', () => {
        const merged = mergeById([entry('a', 1, 'old')], [entry('a', 2, 'new')]);
        expect(merged[0]!.name).toBe('new');
        expect(mergeById([entry('a', 2, 'left')], [entry('a', 2, 'right')])[0]!.name).toBe('left');
    });

    it('writes the new value when the stored one is another version or unreadable', () => {
        const next = value([entry('a', 1)]);
        expect(mergeStoredValue('not json', next, new Set())).toBe(next);
        expect(mergeStoredValue(JSON.stringify({ state: {}, version: 4 }), next, new Set())).toBe(
            next
        );
        expect(mergeStoredValue(null, next, new Set())).toBe(next);
    });
});
