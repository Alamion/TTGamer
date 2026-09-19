import { CATALOG_BINDINGS } from '@site/src/sheet_manager/features/sheet/data/catalogBindings';
import {
    parentName,
    rowSuggestions,
    suggestionsForRow,
} from '@site/src/sheet_manager/features/sheet/declarative/rowsCatalog';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { RowsBinding } from '@site/src/sheet_manager/systems/templateBindings';
import { describe, expect, it } from 'vitest';

const perksBinding = systemRegistry
    .getSystem('wod-v5')!
    .templateBindings!.find(({ key }) => key === 'rows:perks') as RowsBinding;
const catalog = perksBinding.catalog!;

function suggest(locale: string, row: Record<string, unknown>, edges: string[]) {
    const all = rowSuggestions(CATALOG_BINDINGS, catalog, locale);
    const data = { edges: edges.map((name, index) => ({ id: `e${index}`, name })) };
    return suggestionsForRow(CATALOG_BINDINGS, catalog, all, row, data, locale);
}

describe('perk suggestions follow the hunter’s Edges', () => {
    it('offers only the Perks of the Edges on the sheet', () => {
        const names = suggest('en', { edge: '' }, ['Sense the Unnatural']).map(({ name }) => name);
        expect(names).toEqual(['Creature Specialization', 'Range', 'Precision', 'Handsfree']);
    });

    it('prefers the Edge named in the row itself', () => {
        const offered = suggest('en', { edge: 'Arsenal' }, ['Sense the Unnatural']);
        expect(offered.length).toBeGreaterThan(0);
        expect(offered.every(({ parentId }) => parentId === 'arsenal')).toBe(true);
    });

    it('matches Edge names in the reader’s language', () => {
        const ruEdge = parentName(CATALOG_BINDINGS, catalog.parent!, 'sense-the-unnatural', 'ru');
        expect(ruEdge).not.toBe('Sense the Unnatural');
        const offered = suggest('ru', { edge: '' }, [ruEdge]);
        expect(offered).toHaveLength(4);
        expect(offered.every(({ subtitle }) => subtitle === ruEdge)).toBe(true);
    });

    it('names picks in the reader’s language with the book name in parentheses', () => {
        const ruEdge = parentName(CATALOG_BINDINGS, catalog.parent!, 'arsenal', 'ru');
        expect(ruEdge).toMatch(/^\S.* \(Arsenal\)$/);
        expect(parentName(CATALOG_BINDINGS, catalog.parent!, 'arsenal', 'en')).toBe('Arsenal');
        const perk = rowSuggestions(CATALOG_BINDINGS, catalog, 'ru').find(({ id }) =>
            id.endsWith('/sense-the-unnatural-range')
        )!;
        expect(perk.name).toMatch(/ \(Range\)$/);
    });

    it('finds the Edge by the book name in parentheses', () => {
        const offered = suggest('ru', { edge: '' }, ['Мой личный арсенал (Arsenal)']);
        expect(offered.length).toBeGreaterThan(0);
        expect(offered.every(({ parentId }) => parentId === 'arsenal')).toBe(true);
    });

    it('offers every Perk when no Edge on the sheet is a book Edge', () => {
        const all = rowSuggestions(CATALOG_BINDINGS, catalog, 'en');
        expect(suggest('en', { edge: '' }, [])).toHaveLength(all.length);
        expect(suggest('en', { edge: '' }, ['Second Sight'])).toHaveLength(all.length);
    });
});
