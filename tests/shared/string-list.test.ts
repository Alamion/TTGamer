import { deserializeStringList, serializeStringList } from '@site/src/shared/utils/stringList';
import { describe, expect, it } from 'vitest';

describe('string-list URL serialization', () => {
    it('round-trips values containing commas', () => {
        const values = ['Old Republic', 'Trade, Commerce'];
        expect(deserializeStringList(serializeStringList(values))).toEqual(values);
    });

    it('reads legacy comma-separated links', () => {
        expect(deserializeStringList('one,two')).toEqual(['one', 'two']);
    });
});
