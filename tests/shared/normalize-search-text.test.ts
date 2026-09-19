import { describe, expect, it } from 'vitest';

import { matchesSearch, normalizeSearchText } from '../../src/shared/utils/normalizeSearchText';

describe('normalizeSearchText', () => {
    it('folds ё to е and ignores case', () => {
        expect(normalizeSearchText('Ёж')).toBe(normalizeSearchText('еж'));
        expect(normalizeSearchText('BLASTER')).toBe('blaster');
    });

    it('strips diacritics but keeps й distinct from и', () => {
        expect(normalizeSearchText("Twi'lék")).toBe("twi'lek");
        expect(normalizeSearchText('Бойня')).not.toBe(normalizeSearchText('Боиня'));
    });

    it('trims surrounding whitespace', () => {
        expect(normalizeSearchText('  Воровство ')).toBe('воровство');
    });
});

describe('matchesSearch', () => {
    it('matches any of the given names, every query part required', () => {
        expect(matchesSearch('larc', 'Воровство', 'Larceny')).toBe(true);
        expect(matchesSearch('воров', 'Воровство', 'Larceny')).toBe(true);
        expect(matchesSearch('тяжелый бластер', 'Тяжёлый бластер (Heavy Blaster)')).toBe(true);
        expect(matchesSearch('pistol', 'Воровство', 'Larceny')).toBe(false);
        expect(matchesSearch('  ', 'Anything')).toBe(true);
    });
});
