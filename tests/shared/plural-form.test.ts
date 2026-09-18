import { describe, expect, it } from 'vitest';

import { selectPluralForm } from '../../src/shared/hooks/usePluralMessage';

describe('selectPluralForm', () => {
    const ru = '{count} документ|{count} документа|{count} документов';
    it.each([
        [1, '{count} документ'],
        [3, '{count} документа'],
        [5, '{count} документов'],
        [21, '{count} документ'],
        [1.5, '{count} документов'],
    ])('selects the Russian form for %s', (count, expected) => {
        expect(selectPluralForm(ru, count, 'ru')).toBe(expected);
    });

    it('selects English one/other and passes single-form messages through', () => {
        expect(selectPluralForm('1 item|{count} items', 1, 'en')).toBe('1 item');
        expect(selectPluralForm('1 item|{count} items', 2, 'en')).toBe('{count} items');
        expect(selectPluralForm('Items', 2, 'en')).toBe('Items');
    });
});
