import { linkBuckets } from '@site/src/sheet_manager/features/documents/linkResolve';
import { suggestDocuments } from '@site/src/sheet_manager/features/documents/linkSuggestions';
import type { DocumentIndexEntry, Folder } from '@site/src/sheet_manager/store/documentIndex';
import { describe, expect, it } from 'vitest';

/** Suggestions over 3,000 documents keep up with typing (spec 044, SC-001). */

const FOLDERS: Folder[] = Array.from({ length: 60 }, (_, index) => ({
    id: `f${String(index)}`,
    name: `Folder ${String(index)}`,
    parentId: index < 10 ? null : `f${String(index % 10)}`,
    rank: index,
    createdAt: '2026-01-01T00:00:00.000Z',
    changedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: 0,
}));

const ENTRIES: DocumentIndexEntry[] = Array.from({ length: 3000 }, (_, index) => ({
    id: `d${String(index)}`,
    name: `${['Ines', 'Bruno', 'Docks', 'Sword', 'Lantern'][index % 5]} ${String(index)}`,
    kind: 'note',
    systemId: 'general',
    definitionId: 'note',
    parentId: `f${String(index % 60)}`,
    rank: index,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    updatedAt: 0,
}));

/** The best of several runs of one keystroke's suggestions, after a warm-up. */
function bestMs(typed: string): number {
    const buckets = linkBuckets(ENTRIES, FOLDERS);
    suggestDocuments(typed, 'f13', buckets);
    let best = Number.POSITIVE_INFINITY;
    for (let run = 0; run < 5; run += 1) {
        const started = performance.now();
        suggestDocuments(typed, 'f13', buckets);
        best = Math.min(best, performance.now() - started);
    }
    return best;
}

describe('link suggestions over 3,000 documents', () => {
    it('answer each keystroke within 100 ms', () => {
        for (const typed of ['', 'i', 'in', 'ines 1', 'zzz']) {
            expect(bestMs(typed)).toBeLessThan(100);
        }
    });
});
