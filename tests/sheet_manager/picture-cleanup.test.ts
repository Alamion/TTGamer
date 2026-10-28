// @vitest-environment happy-dom
import { sweepPictures } from '@site/src/sheet_manager/store/documentBoot';
import { writeRecord } from '@site/src/sheet_manager/store/documentContent';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Pictures no note or document names free their space (spec 045, US5, F-010). */

const stored = vi.hoisted(() => new Map<string, number>());
const deleted = vi.hoisted(() => [] as string[]);
vi.mock('@site/src/sheet_manager/persistence/portraitStorage', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    deletePortrait: vi.fn((id?: string) => {
        if (id) {
            deleted.push(id);
            stored.delete(id);
        }
        return Promise.resolve();
    }),
    listStoredPictures: vi.fn(() =>
        Promise.resolve([...stored].map(([id, createdAt]) => ({ id, createdAt })))
    ),
}));

const NOW = Date.UTC(2026, 9, 28);
const DAY = 24 * 60 * 60 * 1000;

const picture = (blobId: string) => ({ source: 'device', blobId });

function note(id: string, text: string, images: Record<string, unknown>) {
    const envelope = noteEnvelope(id, id, text);
    return { ...envelope, templateValues: { ...envelope.templateValues, body: { text, images } } };
}

beforeEach(() => {
    stored.clear();
    deleted.length = 0;
});

afterEach(() => {
    takeSheetIssues();
});

describe('opening a document', () => {
    it('drops pictures its text no longer names and deletes their files', async () => {
        const saved = note('plan', 'Map: ![[map.png]]', {
            'map.png': picture('blob-map'),
            'old.png': picture('blob-old'),
        });
        await writeRecord('plan', saved);
        useDocumentStore.setState({ documents: [saved], currentDocumentId: null });
        // Only the entry stays: the next open reads the stored record.
        useDocumentStore.setState((state) => ({ documents: [], entries: state.entries }));
        expect(await useDocumentStore.getState().openDocument('plan')).toBe(true);
        const opened = useDocumentStore.getState().documents.find(({ id }) => id === 'plan')!;
        const body = opened.templateValues.body as { images?: Record<string, unknown> };
        expect(Object.keys(body.images ?? {})).toEqual(['map.png']);
        await vi.waitFor(() => expect(deleted).toEqual(['blob-old']));
        expect(takeSheetIssues().map(({ code }) => code)).toContain('pictures-pruned');
    });
});

describe('the picture sweep', () => {
    const api = () =>
        ({
            getState: useDocumentStore.getState,
            setState: useDocumentStore.setState,
            openDocument: useDocumentStore.getState().openDocument,
        }) as never;

    it('deletes stored pictures no document names, keeping live, pending, and recent ones', async () => {
        const live = note('live', '![[a.png]]', { 'a.png': picture('blob-live') });
        const gone = note('gone', '![[b.png]]', { 'b.png': picture('blob-pending') });
        await writeRecord('live', live);
        await writeRecord('gone', gone);
        useDocumentStore.setState({ documents: [live], pendingPurge: ['gone'] });
        for (const id of ['blob-live', 'blob-pending', 'blob-orphan']) {
            stored.set(id, NOW - 2 * DAY);
        }
        stored.set('blob-new', NOW - 60_000);
        expect(await sweepPictures(api(), NOW)).toBe(1);
        expect(deleted).toEqual(['blob-orphan']);
        expect(takeSheetIssues().map(({ code }) => code)).toContain('pictures-swept');
    });

    it('deletes nothing when a document record cannot be read', async () => {
        useDocumentStore.setState({ documents: [note('lost', '', {})], pendingPurge: [] });
        stored.set('blob-orphan', NOW - 2 * DAY);
        expect(await sweepPictures(api(), NOW)).toBeUndefined();
        expect(deleted).toEqual([]);
    });
});
