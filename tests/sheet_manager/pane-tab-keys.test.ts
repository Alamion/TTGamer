import {
    docKey,
    documentIdOf,
    parseTabKey,
    registerTabKind,
    tabKindOf,
    toolKey,
} from '@site/src/sheet_manager/features/sheet/panes/tabKeys';
import { afterEach, describe, expect, it } from 'vitest';

describe('tab keys (spec 036, D1)', () => {
    let release: (() => void) | undefined;
    afterEach(() => release?.());

    it('name a document or a tool and read back', () => {
        expect(docKey('abc')).toBe('d:abc');
        expect(toolKey('dice')).toBe('t:dice');
        expect(parseTabKey('d:abc')).toEqual({ kind: 'document', id: 'abc' });
        expect(parseTabKey('t:library')).toEqual({ kind: 'tool', id: 'library' });
        expect(documentIdOf('d:abc')).toBe('abc');
        expect(documentIdOf('t:dice')).toBeNull();
    });

    it('reject what is not a key', () => {
        expect(parseTabKey('x:abc')).toBeNull();
        expect(parseTabKey('t:hammer')).toBeNull();
        expect(parseTabKey('d:')).toBeNull();
        expect(parseTabKey('abc')).toBeNull();
    });

    it('find the kind registered for a tool', () => {
        expect(tabKindOf('t:dice')).toBeUndefined();
        const kind = { title: () => 'Dice', closeLabel: () => 'Close', render: () => null };
        release = registerTabKind('dice', kind);
        expect(tabKindOf('t:dice')).toBe(kind);
        expect(tabKindOf('d:abc')).toBeUndefined();
        release();
        release = undefined;
        expect(tabKindOf('t:dice')).toBeUndefined();
    });
});
