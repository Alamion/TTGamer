// @vitest-environment happy-dom
import { highlightSegments } from '@site/src/sheet_manager/features/documents/highlight';
import {
    applyQuery,
    buildQueryIndex,
    type DocumentLabeler,
    type DocumentsQuery,
    EMPTY_QUERY,
    orderFor,
    readQuery,
    timePreset,
} from '@site/src/sheet_manager/features/documents/query';
import { buildRows } from '@site/src/sheet_manager/features/documents/rows';
import type { DocumentIndexEntry, Folder } from '@site/src/sheet_manager/store/documentIndex';
import { describe, expect, it } from 'vitest';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const ago = (days: number) => new Date(NOW - days * 24 * 3600 * 1000).toISOString();

const labeler: DocumentLabeler = {
    kind: (_system, kind) => ({ character: 'Character', droid: 'Droid' })[kind] ?? kind,
    system: (system) => ({ 'wod-v5': 'V5', 'star-wars-wod': 'Star Wars' })[system] ?? system,
    setting: (system) => (system === 'wod-v5' ? 'Hunter' : 'Star Wars'),
    title: (entry) => entry.name || entry.kind,
};

const doc = (
    id: string,
    name: string,
    over: Partial<DocumentIndexEntry> = {}
): DocumentIndexEntry => ({
    id,
    name,
    kind: 'character',
    systemId: 'wod-v5',
    definitionId: 'hunter',
    parentId: null,
    rank: 1,
    updatedAt: 1,
    ...over,
});
const folder = (id: string, name: string, parentId: string | null = null, rank = 1): Folder => ({
    id,
    name,
    parentId,
    rank,
    createdAt: ago(100),
    changedAt: ago(100),
    updatedAt: 1,
});

const entries = [
    doc('a', 'Éowyn Ёлка', { rank: 1, createdAt: ago(0.5), changedAt: ago(0.2) }),
    doc('b', 'Bruno', { rank: 2, createdAt: ago(3), changedAt: ago(2), parentId: 'f1' }),
    doc('c', 'Cleo droid', {
        kind: 'droid',
        systemId: 'star-wars-wod',
        rank: 3,
        createdAt: ago(20),
        changedAt: ago(10),
        parentId: 'f2',
    }),
    doc('d', 'Old one', { rank: 4 }),
    doc('e', 'Zed', { rank: 5, createdAt: ago(60), changedAt: ago(40), parentId: 'f2' }),
];
const folders = [folder('f1', 'Campaign'), folder('f2', 'Archive', 'f1', 2)];
const index = buildQueryIndex(entries, labeler);

const run = (over: Partial<DocumentsQuery>) =>
    applyQuery(entries, folders, { ...EMPTY_QUERY, ...over }, index, NOW);
const ids = (result: ReturnType<typeof run>) => result.entries.map(({ id }) => id).sort();

describe('searching the documents tree (spec 032, FR-013)', () => {
    it('keeps everything when nothing narrows the list', () => {
        const all = run({});
        expect(all.entries).toHaveLength(5);
        expect(all.folders).toHaveLength(2);
        expect(all.open.size).toBe(0);
    });

    it('matches names ignoring case, ё, and accents, every part of the text', () => {
        expect(ids(run({ text: 'EOWYN' }))).toEqual(['a']);
        expect(ids(run({ text: 'елка' }))).toEqual(['a']);
        expect(ids(run({ text: 'cleo DROID' }))).toEqual(['c']);
        expect(ids(run({ text: 'zzz' }))).toEqual([]);
    });

    it('keeps the folders above a match and opens them', () => {
        const found = run({ text: 'zed' });
        expect(found.folders.map(({ id }) => id).sort()).toEqual(['f1', 'f2']);
        expect([...found.open].sort()).toEqual(['f1', 'f2']);
        expect(found.matches).toBe(1);
    });

    it('keeps a folder whose name matches, and what is inside it', () => {
        const found = run({ text: 'archive' });
        expect(ids(found)).toEqual(['c', 'e']);
        expect(found.folders.map(({ id }) => id).sort()).toEqual(['f1', 'f2']);
    });

    it('marks the matches in a name', () => {
        expect(highlightSegments('Éowyn Ёлка', 'eowyn елка')).toEqual([
            { text: 'Éowyn', match: true },
            { text: ' ', match: false },
            { text: 'Ёлка', match: true },
        ]);
        expect(highlightSegments('Bruno', 'un')).toEqual([
            { text: 'Br', match: false },
            { text: 'un', match: true },
            { text: 'o', match: false },
        ]);
        expect(highlightSegments('Bruno', '')).toEqual([{ text: 'Bruno', match: false }]);
    });
});

describe('filtering (FR-014)', () => {
    it('filters by type, system, and setting, and the filters combine', () => {
        expect(ids(run({ kind: 'droid' }))).toEqual(['c']);
        expect(ids(run({ system: 'wod-v5' }))).toEqual(['a', 'b', 'd', 'e']);
        expect(ids(run({ setting: 'Star Wars' }))).toEqual(['c']);
        expect(ids(run({ system: 'wod-v5', text: 'o' }))).toEqual(['a', 'b', 'd']);
        expect(ids(run({ system: 'star-wars-wod', kind: 'character' }))).toEqual([]);
    });

    it('filters by created and changed presets, with unknown kept apart', () => {
        expect(ids(run({ created: 'day' }))).toEqual(['a']);
        expect(ids(run({ created: 'week' }))).toEqual(['b']);
        expect(ids(run({ created: 'month' }))).toEqual(['c']);
        expect(ids(run({ created: 'older' }))).toEqual(['e']);
        expect(ids(run({ created: 'unknown' }))).toEqual(['d']);
        expect(ids(run({ changed: 'month', created: 'month' }))).toEqual(['c']);
        expect(timePreset(undefined, NOW)).toBe('unknown');
        expect(timePreset('not a date', NOW)).toBe('unknown');
    });

    it('offers the values that exist as facets, by label', () => {
        expect(index.kinds.map(({ label }) => label)).toEqual(['Character', 'Droid']);
        expect(index.systems.map(({ label }) => label)).toEqual(['Star Wars', 'V5']);
        expect(index.settings.map(({ value }) => value)).toEqual(['Hunter', 'Star Wars']);
    });
});

describe('sorting (FR-015)', () => {
    const order = (over: Partial<DocumentsQuery>) => {
        const query = { ...EMPTY_QUERY, ...over };
        return buildRows(
            entries,
            folders,
            new Set(['folder:f1', 'folder:f2']),
            orderFor(query, index)
        )
            .filter(({ node }) => node.type === 'document')
            .map(({ key }) => key.slice(4));
    };

    it('keeps the arranged order for manual', () => {
        expect(order({})).toEqual(['c', 'e', 'b', 'a', 'd']);
    });

    it('sorts by name in both directions, within each folder, folders first', () => {
        expect(order({ sort: 'name' })).toEqual(['c', 'e', 'b', 'a', 'd']);
        expect(order({ sort: 'name', descending: true })).toEqual(['e', 'c', 'b', 'd', 'a']);
    });

    it('sorts by type and system', () => {
        expect(order({ sort: 'kind' })).toEqual(['e', 'c', 'b', 'a', 'd']);
        expect(order({ sort: 'system', descending: true })).toEqual(['e', 'c', 'b', 'a', 'd']);
    });

    it('sorts by time with unknown times last in either direction', () => {
        expect(order({ sort: 'created' })).toEqual(['e', 'c', 'b', 'a', 'd']);
        expect(order({ sort: 'created', descending: true })).toEqual(['c', 'e', 'b', 'a', 'd']);
        const unsortedTop = buildRows(
            entries.filter(({ parentId }) => parentId === null),
            [],
            new Set(),
            orderFor({ ...EMPTY_QUERY, sort: 'changed' }, index)
        ).map(({ key }) => key.slice(4));
        expect(unsortedTop).toEqual(['a', 'd']);
    });
});

describe('a kept query', () => {
    it('reads a stored value safely', () => {
        expect(readQuery(null)).toEqual(EMPTY_QUERY);
        expect(readQuery({ text: 5, sort: 'zigzag', created: 'x', descending: 'yes' })).toEqual(
            EMPTY_QUERY
        );
        expect(readQuery({ text: 'a', kind: 'droid', sort: 'name', descending: true })).toEqual({
            ...EMPTY_QUERY,
            text: 'a',
            kind: 'droid',
            sort: 'name',
            descending: true,
        });
    });
});
