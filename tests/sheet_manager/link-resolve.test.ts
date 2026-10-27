import { linkName } from '@site/src/shared/markdown/links';
import {
    folderPathOf,
    linkBuckets,
    linkReferenceFor,
    resolveLink,
} from '@site/src/sheet_manager/features/documents/linkResolve';
import type { DocumentIndexEntry, Folder } from '@site/src/sheet_manager/store/documentIndex';
import { describe, expect, it } from 'vitest';

/** Which document a link means: nearest by folders, then earliest created (spec 044, D1). */

const folder = (id: string, name: string, parentId: string | null): Folder => ({
    id,
    name,
    parentId,
    rank: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    changedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: 0,
});

const entry = (
    id: string,
    name: string,
    parentId: string | null,
    createdAt?: string
): DocumentIndexEntry => ({
    id,
    name,
    kind: 'note',
    systemId: 'general',
    definitionId: 'note',
    parentId,
    rank: 0,
    ...(createdAt ? { createdAt } : {}),
    updatedAt: 0,
});

// World/Characters, World/Items, World 2/Items
const folders = [
    folder('w', 'World', null),
    folder('wc', 'Characters', 'w'),
    folder('wi', 'Items', 'w'),
    folder('w2', 'World 2', null),
    folder('w2i', 'Items', 'w2'),
];

describe('resolveLink', () => {
    it('matches names without case, extra spaces, or a trailing .md', () => {
        const buckets = linkBuckets([entry('a', 'Ines  Ruiz', null)], folders);
        expect(linkName(' INES Ruiz.md ')).toBe('ines ruiz');
        expect(resolveLink({ name: 'ines ruiz.md' }, null, buckets)?.id).toBe('a');
        expect(resolveLink({ name: 'Nobody' }, null, buckets)).toBeUndefined();
    });

    it('prefers the document sharing the most folders with the link, then the earliest', () => {
        const buckets = linkBuckets(
            [
                entry('far', 'Sword', 'w2i', '2026-01-01T00:00:00.000Z'),
                entry('near', 'Sword', 'wi', '2026-02-01T00:00:00.000Z'),
                entry('top', 'Sword', null, '2025-01-01T00:00:00.000Z'),
            ],
            folders
        );
        expect(resolveLink({ name: 'Sword' }, 'wc', buckets)?.id).toBe('near');
        expect(resolveLink({ name: 'Sword' }, 'w2', buckets)?.id).toBe('far');
        // At the top every candidate shares nothing: the earliest created wins.
        expect(resolveLink({ name: 'Sword' }, null, buckets)?.id).toBe('top');
    });

    it('breaks ties by creation time, unknown times last, then id', () => {
        const buckets = linkBuckets(
            [
                entry('b', 'Copy', 'wi'),
                entry('c', 'Copy', 'wi', '2026-03-01T00:00:00.000Z'),
                entry('a', 'Copy', 'wi'),
            ],
            folders
        );
        expect(resolveLink({ name: 'Copy' }, 'wc', buckets)?.id).toBe('c');
        const unknown = linkBuckets([entry('b', 'X', null), entry('a', 'X', null)], folders);
        expect(resolveLink({ name: 'X' }, null, unknown)?.id).toBe('a');
    });

    it('narrows by a written folder path, matched from its end', () => {
        const buckets = linkBuckets(
            [entry('near', 'Sword', 'wi'), entry('far', 'Sword', 'w2i')],
            folders
        );
        expect(resolveLink({ name: 'Sword', path: 'World 2/Items' }, 'wc', buckets)?.id).toBe(
            'far'
        );
        expect(resolveLink({ name: 'Sword', path: 'items' }, 'w2', buckets)?.id).toBe('far');
        expect(resolveLink({ name: 'Sword', path: 'Elsewhere' }, 'wc', buckets)).toBeUndefined();
    });
});

describe('linkReferenceFor', () => {
    it('writes the name when it finds the target, else its full folder path', () => {
        const near = entry('near', 'Sword', 'wi');
        const far = entry('far', 'Sword', 'w2i');
        const buckets = linkBuckets([near, far], folders);
        expect(linkReferenceFor(near, 'wc', buckets)).toBe('Sword');
        expect(linkReferenceFor(far, 'wc', buckets)).toBe('World 2/Items/Sword');
        expect(folderPathOf(far, buckets)).toBe('World 2/Items');
    });
});
