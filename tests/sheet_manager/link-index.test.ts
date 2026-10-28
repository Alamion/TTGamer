import {
    configureLinkStorage,
    createMemoryLinkStorage,
    LINK_RECORD_VERSION,
} from '@site/src/sheet_manager/persistence/linkStorage';
import { purgeDeleted } from '@site/src/sheet_manager/store/documentBoot';
import { recordWriter } from '@site/src/sheet_manager/store/documentContent';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import {
    documentLinkRows,
    linksOf,
    loadLinkIndex,
    resetLinkIndex,
    sourcesNaming,
    useLinkIndex,
} from '@site/src/sheet_manager/store/linkIndexStore';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
import { beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** The link index: saved with each document, read at start-up, rebuilt when missing (spec 044). */

let storage: ReturnType<typeof createMemoryLinkStorage>;

beforeEach(() => {
    storage = createMemoryLinkStorage();
    configureLinkStorage(storage);
    resetLinkIndex();
});

describe('documentLinkRows', () => {
    it('reads links from markdown values only', () => {
        const note = noteEnvelope('n1', 'Session', 'See [[Ines Ruiz|her]] and ![[Docks#History]]');
        note.templateValues = {
            ...note.templateValues,
            'rating#detail': { text: '[[Not a link source]]' },
            plain: '[[Plain text]]',
        };
        expect(documentLinkRows(note)).toEqual([
            {
                reference: 'Ines Ruiz',
                alias: 'her',
                embed: false,
                key: 'body',
                line: 0,
                context: 'See [[Ines Ruiz|her]] and ![[Docks#History]]',
            },
            {
                reference: 'Docks',
                section: 'History',
                embed: true,
                key: 'body',
                line: 0,
                context: 'See [[Ines Ruiz|her]] and ![[Docks#History]]',
            },
        ]);
    });
});

describe('the link record', () => {
    it('is written with the document, an empty one too, and read back by name', async () => {
        const note = noteEnvelope('n1', 'Session', 'Meet [[Ines Ruiz]]');
        const plain = noteEnvelope('n2', 'Empty', 'no links');
        useDocumentStore.setState({ documents: [note, plain] });
        recordWriter.schedule(note);
        recordWriter.schedule(plain);
        await recordWriter.flush();
        expect(storage.dump().get('n1')).toEqual({
            v: LINK_RECORD_VERSION,
            links: [expect.objectContaining({ reference: 'Ines Ruiz' })],
        });
        expect(storage.dump().get('n2')).toEqual({ v: LINK_RECORD_VERSION, links: [] });
        expect(sourcesNaming('ines ruiz')).toEqual(['n1']);
        expect(linksOf('n1')).toHaveLength(1);
    });

    it('is removed with a purged document', async () => {
        const note = noteEnvelope('n1', 'Session', 'Meet [[Ines Ruiz]]');
        useDocumentStore.setState({ documents: [note] });
        recordWriter.schedule(note);
        await recordWriter.flush();
        useDocumentStore.setState({ documents: [], entries: [], pendingPurge: ['n1'] });
        await purgeDeleted({
            getState: useDocumentStore.getState,
            setState: useDocumentStore.setState,
            openDocument: async () => true,
        });
        expect(storage.dump().has('n1')).toBe(false);
        expect(sourcesNaming('Ines Ruiz')).toEqual([]);
    });
});

describe('loadLinkIndex', () => {
    it('reads stored records and reads again documents without a valid one', async () => {
        await storage.set('n1', {
            v: LINK_RECORD_VERSION,
            links: [
                { reference: 'Docks', embed: false, key: 'body', line: 0, context: '[[Docks]]' },
            ],
        });
        storage.dump().set('n2', { v: 99, links: 'broken' });
        const documents = new Map([
            ['n2', noteEnvelope('n2', 'B', '[[Ines]]')],
            ['n3', noteEnvelope('n3', 'C', '[[Ines]] and [[Docks]]')],
        ]);
        const read: string[] = [];
        await loadLinkIndex(['n1', 'n2', 'n3', 'gone'], async (id) => {
            read.push(id);
            return documents.get(id) ?? null;
        });
        expect(useLinkIndex.getState().ready).toBe(true);
        expect(read.sort()).toEqual(['gone', 'n2', 'n3']);
        expect(sourcesNaming('Docks').sort()).toEqual(['n1', 'n3']);
        expect(sourcesNaming('Ines').sort()).toEqual(['n2', 'n3']);
        expect(storage.dump().get('n2')).toEqual(expect.objectContaining({ v: 1 }));
        expect(takeSheetIssues()).toEqual([
            expect.objectContaining({
                code: 'link-index-rebuilt',
                details: { missing: 3, invalid: 1 },
            }),
        ]);
    });
});
