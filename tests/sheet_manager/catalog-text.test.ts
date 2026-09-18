import { describe, expect, it, vi } from 'vitest';

vi.mock('@site/src/i18n/generated/catalogTranslations', () => ({
    catalogTranslations: {
        en: {},
        ru: {
            abilities: {
                blaster: { name: 'Бластер', specialties: ['Пистолет', 'Винтовка'] },
                dodge: { specialties: ['Только одна'] },
                _labels: { category: { Combat: 'Боевые' } },
            },
        },
    },
}));

import {
    catalogEntryText,
    defineCatalog,
    entryEnumLabel,
} from '../../src/sheet_manager/systems/catalogs';

const entries = [
    { id: 'blaster', name: 'Blaster', specialties: ['Pistol', 'Rifle'], category: 'Combat' },
    { id: 'dodge', name: 'Dodge', specialties: ['Melee', 'Ranged'], category: 'Combat' },
];
const catalog = defineCatalog('abilities', entries, []);

describe('catalog text helpers', () => {
    it('localizes string lists and falls back on missing or mismatched lists', () => {
        expect(catalog.entryList(entries[0], 'specialties', 'ru')).toEqual([
            'Пистолет',
            'Винтовка',
        ]);
        expect(catalog.entryList(entries[1], 'specialties', 'ru')).toEqual(['Melee', 'Ranged']);
        expect(catalog.entryList(entries[0], 'specialties', 'en')).toEqual(['Pistol', 'Rifle']);
    });

    it('labels enumerated values and falls back to the raw value', () => {
        expect(entryEnumLabel('abilities', 'category', 'Combat', 'ru')).toBe('Боевые');
        expect(entryEnumLabel('abilities', 'category', 'Social', 'ru')).toBe('Social');
        expect(entryEnumLabel('abilities', 'category', 'Combat', 'en')).toBe('Combat');
    });

    it('searches by both the localized and the English name', () => {
        expect(catalog.pickSearchText(entries[0], 'ru')).toBe('Бластер Blaster');
        expect(catalog.pickSearchText(entries[1], 'ru')).toBe('Dodge Dodge');
    });

    it('localizes text of unregistered catalogs through catalogEntryText', () => {
        expect(catalogEntryText('abilities', entries[0], 'name', 'ru')).toBe('Бластер');
        expect(catalogEntryText('abilities', entries[1], 'name', 'ru')).toBe('Dodge');
    });
});
