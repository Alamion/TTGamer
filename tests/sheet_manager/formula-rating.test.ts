import { getCatalogBinding } from '@site/src/sheet_manager/features/sheet/data/catalogBindings';
import {
    listRating,
    ratedEntries,
} from '@site/src/sheet_manager/features/sheet/declarative/listRating';
import { describe, expect, it } from 'vitest';

/** `rating(list, "Name")` reads a list entry's rating by any of its names (spec 038, US2). */

const disciplines = getCatalogBinding('v5-vampire-disciplines');

describe('list rating', () => {
    it('finds an entry by its name in either language or with the book name', () => {
        const entries = ratedEntries([
            { id: 'a', name: 'Кровавая магия', value: 2 },
            { id: 'b', name: 'Auspex', value: 1 },
        ]);
        expect(listRating(entries, 'Blood Sorcery', disciplines)).toBe(2);
        expect(listRating(entries, 'Ясновидение', disciplines)).toBe(1);
        expect(
            listRating(
                ratedEntries([{ name: 'Кровавая магия (Blood Sorcery)', value: 3 }]),
                'Blood Sorcery',
                disciplines
            )
        ).toBe(3);
    });

    it('is 0 when the list has no such entry, and the highest when it has two', () => {
        const entries = ratedEntries([
            { label: 'Oblivion', value: 1 },
            { label: 'oblivion', value: 3 },
        ]);
        expect(listRating(entries, 'Oblivion')).toBe(3);
        expect(listRating(entries, 'Blood Sorcery', disciplines)).toBe(0);
        expect(listRating([], 'Oblivion')).toBe(0);
    });

    it('reads merits by points and skips entries without a name or a number', () => {
        expect(
            ratedEntries([{ label: 'Haven', points: 2 }, { name: 'x' }, { value: 1 }, 'text'])
        ).toEqual([{ name: 'Haven', value: 2 }]);
    });
});
