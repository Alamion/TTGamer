import {
    rowAboveLimit,
    rowSuggestions,
    suggestionsForRow,
} from '@site/src/sheet_manager/features/sheet/declarative/rowsCatalog';
import { anyCatalog, defineCatalog, textDetail } from '@site/src/sheet_manager/systems/catalogs';
import type { RowsBinding } from '@site/src/sheet_manager/systems/templateBindings';
import { describe, expect, it } from 'vitest';

/** A parent's dots limit the levels offered and mark rows above them (spec 037 D3, spec 038). */

const schools = defineCatalog(
    'test-schools',
    [
        { id: 'fire', name: 'Fire' },
        { id: 'frost', name: 'Frost' },
    ],
    [textDetail('name', 'Name')]
);

const spells = defineCatalog(
    'test-spells',
    [
        { id: 'fire-spark', name: 'Spark', school: 'fire', level: 1 },
        { id: 'fire-blaze', name: 'Blaze', school: 'fire', level: 3 },
        { id: 'fire-inferno', name: 'Inferno', school: 'fire', level: 5 },
        { id: 'frost-chill', name: 'Chill', school: 'frost', level: 1 },
    ],
    [textDetail('name', 'Name'), textDetail('level', 'Level')]
);

const catalogs = new Map([
    ['test-schools', anyCatalog(schools)],
    ['test-spells', anyCatalog(spells)],
]);

const catalog: NonNullable<RowsBinding['catalog']> = {
    catalogIds: ['test-spells'],
    column: 'name',
    fills: { name: 'name', level: 'level' },
    parent: {
        entryKey: 'school',
        catalogId: 'test-schools',
        column: 'school',
        namedBy: { dataKey: 'schools', column: 'name' },
    },
};

/** The page's limit (spec 038): spells up to their school's dots. */
const limit = { entryKey: 'level', column: 'level', parentValue: 'value' };

const data = (dots: Record<string, number>) => ({
    schools: Object.entries(dots).map(([name, value], index) => ({ id: `s${index}`, name, value })),
});

function offered(row: Record<string, unknown>, dots: Record<string, number>) {
    const all = rowSuggestions(catalogs, catalog, 'en', limit);
    return suggestionsForRow(catalogs, catalog, limit, all, row, data(dots), 'en').map(
        ({ name }) => name
    );
}

describe('rows catalog parent limit', () => {
    it('offers entries up to the dots of each named parent', () => {
        expect(offered({ school: '' }, { Fire: 3, Frost: 1 })).toEqual(['Spark', 'Blaze', 'Chill']);
        expect(offered({ school: 'Fire' }, { Fire: 2, Frost: 1 })).toEqual(['Spark']);
    });

    it('does not narrow by a parent typed freely or without dots on the sheet', () => {
        expect(offered({ school: 'Shadow' }, { Fire: 1 })).toHaveLength(4);
        expect(offered({ school: 'Frost' }, { Fire: 1 })).toEqual(['Chill']);
    });

    it('marks a stored row above its parent and keeps it', () => {
        const rows = data({ Fire: 2 });
        expect(
            rowAboveLimit(
                catalogs,
                catalog,
                limit,
                { name: 'Blaze', school: 'Fire', level: '3' },
                rows,
                'en'
            )
        ).toEqual({ parent: 'Fire', dots: 2 });
        expect(
            rowAboveLimit(
                catalogs,
                catalog,
                limit,
                { name: 'Spark', school: 'Fire', level: '1' },
                rows,
                'en'
            )
        ).toBeNull();
        expect(
            rowAboveLimit(
                catalogs,
                catalog,
                limit,
                { name: 'Own', school: 'Shadow', level: '5' },
                rows,
                'en'
            )
        ).toBeNull();
    });

    it('limits nothing when the page sets no limit', () => {
        const all = rowSuggestions(catalogs, catalog, 'en');
        expect(
            suggestionsForRow(
                catalogs,
                catalog,
                undefined,
                all,
                { school: 'Fire' },
                data({ Fire: 1 }),
                'en'
            )
        ).toHaveLength(3);
        expect(
            rowAboveLimit(
                catalogs,
                catalog,
                undefined,
                { name: 'Blaze', school: 'Fire', level: '3' },
                data({ Fire: 1 }),
                'en'
            )
        ).toBeNull();
    });
});
