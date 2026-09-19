import { describe, expect, it } from 'vitest';

import { resolveTerm } from '../../src/sheet_manager/components/terms/resolveTerm';

const terms = {
    'ttgamer.ui.sheet.v5.skills.larceny': { en: 'Larceny' },
    'ttgamer.ui.sheet.v5.skills.animalKen': { en: 'Animal Ken', ruShort: 'Животные' },
};
const larceny = { text: 'Воровство', termRef: 'ttgamer.ui.sheet.v5.skills.larceny' };
const animalKen = {
    text: 'Обращение с животными',
    termRef: 'ttgamer.ui.sheet.v5.skills.animalKen',
};

describe('resolveTerm', () => {
    it('ru: Russian label with the English hint', () => {
        expect(resolveTerm(larceny, 'ru', 'ru', terms)).toEqual({
            ref: larceny.termRef,
            display: 'Воровство',
            hint: 'Larceny',
        });
    });

    it('ru: short form on narrow rows, the full name joins the hint', () => {
        expect(resolveTerm(animalKen, 'ru', 'ru', terms)).toEqual({
            ref: animalKen.termRef,
            display: 'Обращение с животными',
            short: 'Животные',
            hint: 'Animal Ken',
            detail: 'Обращение с животными',
        });
    });

    it('ru: the author turned the hint off', () => {
        expect(resolveTerm({ ...larceny, termHint: false }, 'ru', 'ru', terms)).toEqual({
            ref: larceny.termRef,
            display: 'Воровство',
        });
    });

    it('ru-plain: no hints at all', () => {
        expect(resolveTerm(larceny, 'ru', 'ru-plain', terms)?.hint).toBeUndefined();
        expect(resolveTerm(animalKen, 'ru', 'ru-plain', terms)?.short).toBe('Животные');
    });

    it('en: English book names with the Russian name in the hint', () => {
        expect(resolveTerm(larceny, 'ru', 'en', terms)).toEqual({
            ref: larceny.termRef,
            display: 'Larceny',
            hint: 'Воровство',
        });
        expect(resolveTerm({ ...larceny, termHint: false }, 'ru', 'en', terms)).toEqual({
            ref: larceny.termRef,
            display: 'Larceny',
        });
    });

    it('keeps a renamed label and still hints the book name', () => {
        const renamed = { ...larceny, text: 'Карманничество', renamed: true };
        expect(resolveTerm(renamed, 'ru', 'ru', terms)).toEqual({
            ref: larceny.termRef,
            display: 'Карманничество',
            hint: 'Larceny',
        });
        expect(resolveTerm(renamed, 'ru', 'en', terms)?.display).toBe('Карманничество');
    });

    it('returns null for English, custom traits, and unknown refs', () => {
        expect(resolveTerm(larceny, 'en', 'ru', terms)).toBeNull();
        expect(resolveTerm({ text: 'Кулинария' }, 'ru', 'ru', terms)).toBeNull();
        expect(
            resolveTerm({ text: 'X', termRef: 'ttgamer.ui.nope' }, 'ru', 'ru', terms)
        ).toBeNull();
    });
});
