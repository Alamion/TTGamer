import {
    shortLabelFor,
    shortLabelsFor,
} from '@site/src/sheet_manager/features/sheet/declarative/shortLabels';
import { describe, expect, it } from 'vitest';

const terms = {
    'catalog:abilities/alertness': { en: 'Alertness', abbr: 'ALR', ruAbbr: 'БДИ' },
    'catalog:attributes/strength': { en: 'Strength', abbr: 'STR', ruAbbr: 'МОЩ' },
};
const alertness = { labelMessage: 'catalog:abilities/alertness' };

describe('shortLabelFor', () => {
    it('prefers the author’s own label, in capitals up to four letters', () => {
        expect(
            shortLabelFor({ ...alertness, shortLabel: 'ALRT' }, 'Alertness', 'en', 'ru', terms)
        ).toBe('ALRT');
    });

    it('takes the glossary abbreviation of the language the label is shown in', () => {
        expect(shortLabelFor(alertness, 'Alertness', 'en', 'ru', terms)).toBe('ALR');
        expect(shortLabelFor(alertness, 'Бдительность', 'ru', 'ru', terms)).toBe('БДИ');
        expect(shortLabelFor(alertness, 'Бдительность', 'ru', 'ru-plain', terms)).toBe('БДИ');
    });

    it('uses the English abbreviation while the English book names are shown', () => {
        expect(shortLabelFor(alertness, 'Alertness', 'ru', 'en', terms)).toBe('ALR');
    });

    it('derives three capital letters from a label with no glossary term', () => {
        expect(shortLabelFor({}, 'Luck', 'en', 'ru', terms)).toBe('LUC');
        expect(shortLabelFor({}, 'Self Control', 'en', 'ru', terms)).toBe('SEL');
        expect(shortLabelFor({}, 'Удача', 'ru', 'ru', terms)).toBe('УДА');
    });

    it('keeps a label of fewer than three letters whole', () => {
        expect(shortLabelFor({}, 'Ki', 'en', 'ru', terms)).toBe('Ki');
    });

    it('derives from a renamed label instead of the term it once was', () => {
        expect(
            shortLabelFor(
                { termRef: 'catalog:abilities/alertness' },
                'Watchfulness',
                'en',
                'ru',
                terms
            )
        ).toBe('WAT');
    });
});

describe('shortLabelsFor', () => {
    const node = (id: string, label: string, extra: object = {}) => ({
        id,
        label,
        shortForm: true,
        ...extra,
    });

    it('maps every short-form node of a group by id', () => {
        const map = shortLabelsFor(
            [
                node('a', 'Alertness', alertness),
                node('b', 'Strength', { labelMessage: 'catalog:attributes/strength' }),
            ],
            'en',
            'ru',
            terms
        );
        expect([...map]).toEqual([
            ['a', 'ALR'],
            ['b', 'STR'],
        ]);
    });

    it('gives the later of two clashing labels its full label', () => {
        const map = shortLabelsFor([node('a', 'Brawl'), node('b', 'Brace')], 'en', 'ru', terms);
        expect(map.get('a')).toBe('BRA');
        expect(map.get('b')).toBe('Brace');
    });

    it('skips nodes that are not in short form', () => {
        const map = shortLabelsFor([node('a', 'Brawl', { shortForm: false })], 'en', 'ru', terms);
        expect(map.size).toBe(0);
    });
});
