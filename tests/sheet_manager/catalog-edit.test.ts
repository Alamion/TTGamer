import {
    addColumn,
    addEntry,
    appendEntries,
    catalogUsage,
    convertValue,
    duplicateNames,
    moveColumn,
    moveEntry,
    parsePastedEntries,
    removeColumn,
    removeEntries,
    retypeColumn,
    retypeLosses,
    updateEntry,
} from '@site/src/sheet_manager/features/sheet/data/catalogEdit';
import type { UserCatalog } from '@site/src/sheet_manager/systems/userCatalogs';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { TEMPLATE_LIMITS } from '@site/src/sheet_manager/types/templateLimits';
import { describe, expect, it } from 'vitest';

import {
    BLACK_MIRROR,
    BONE_FLUTE,
    CURSED_COLUMN,
    POWER_COLUMN,
    RELICS_ID,
    userCatalog,
} from './helpers/library';

const LATER = '2026-09-27T12:00:00.000Z';

function ok(result: ReturnType<typeof addEntry>): UserCatalog {
    if (!result.ok) throw new Error(`edit refused: ${result.reason}`);
    return result.catalog;
}

describe('catalog columns (spec 015, R8)', () => {
    it('adds, renames, moves, and removes columns', () => {
        let catalog = ok(addColumn(userCatalog(), 'Origin', 'text', LATER));
        const origin = catalog.columns[2]!;
        expect(origin).toMatchObject({ name: 'Origin', type: 'text' });
        expect(catalog.updatedAt).toBe(LATER);
        catalog = ok(moveColumn(catalog, origin.id, -1, LATER));
        expect(catalog.columns.map(({ name }) => name)).toEqual(['Power', 'Origin', 'Cursed']);
        catalog = ok(removeColumn(catalog, POWER_COLUMN, LATER));
        expect(catalog.columns.map(({ name }) => name)).toEqual(['Origin', 'Cursed']);
        expect(catalog.entries[0]!.values).toEqual({ [CURSED_COLUMN]: false });
        expect(addColumn(catalog, '  ', 'text', LATER)).toEqual({
            ok: false,
            reason: 'empty-name',
        });
    });

    it('stops at the column limit', () => {
        let catalog = userCatalog({ columns: [], entries: [] });
        for (let i = 0; i < TEMPLATE_LIMITS.catalogColumnsMax; i += 1) {
            catalog = ok(addColumn(catalog, `C${i}`, 'text', LATER));
        }
        expect(addColumn(catalog, 'One more', 'text', LATER)).toEqual({
            ok: false,
            reason: 'columns-limit',
        });
    });

    it('converts values between column types', () => {
        expect(convertValue(4, 'text')).toBe('4');
        expect(convertValue(true, 'text')).toBe('yes');
        expect(convertValue('2,5', 'number')).toBe(2.5);
        expect(convertValue('four', 'number')).toBeUndefined();
        expect(convertValue(false, 'number')).toBe(0);
        expect(convertValue('да', 'toggle')).toBe(true);
        expect(convertValue('no', 'toggle')).toBe(false);
        expect(convertValue(0, 'toggle')).toBe(false);
        expect(convertValue('maybe', 'toggle')).toBeUndefined();
    });

    it('counts and applies retype losses', () => {
        const catalog = ok(
            updateEntry(userCatalog(), BONE_FLUTE, { columnId: POWER_COLUMN, value: 2.5 }, LATER)
        );
        expect(retypeLosses(catalog, CURSED_COLUMN, 'number')).toBe(0);
        const texted = ok(retypeColumn(catalog, POWER_COLUMN, 'text', LATER));
        expect(texted.entries.map(({ values }) => values[POWER_COLUMN])).toEqual(['2.5', '4']);
        const withWord = ok(
            updateEntry(texted, BONE_FLUTE, { columnId: POWER_COLUMN, value: 'strong' }, LATER)
        );
        expect(retypeLosses(withWord, POWER_COLUMN, 'number')).toBe(1);
        const back = ok(retypeColumn(withWord, POWER_COLUMN, 'number', LATER));
        expect(back.entries.map(({ values }) => values[POWER_COLUMN])).toEqual([undefined, 4]);
    });
});

describe('catalog entries (spec 015, R8)', () => {
    it('adds, renames, sets cells, moves, and removes entries', () => {
        let catalog = ok(addEntry(userCatalog(), ' Skull Cup ', LATER, { [POWER_COLUMN]: 1 }));
        const skull = catalog.entries[2]!;
        expect(skull).toMatchObject({ name: 'Skull Cup', values: { [POWER_COLUMN]: 1 } });
        catalog = ok(updateEntry(catalog, skull.id, { name: 'Skull Chalice' }, LATER));
        catalog = ok(
            updateEntry(catalog, skull.id, { columnId: POWER_COLUMN, value: undefined }, LATER)
        );
        expect(catalog.entries[2]).toMatchObject({ name: 'Skull Chalice', values: {} });
        catalog = ok(moveEntry(catalog, skull.id, -1, LATER));
        expect(catalog.entries.map(({ id }) => id)).toEqual([BONE_FLUTE, skull.id, BLACK_MIRROR]);
        catalog = ok(removeEntries(catalog, new Set([BONE_FLUTE, BLACK_MIRROR]), LATER));
        expect(catalog.entries.map(({ id }) => id)).toEqual([skull.id]);
        expect(updateEntry(catalog, skull.id, { name: '' }, LATER)).toEqual({
            ok: false,
            reason: 'empty-name',
        });
    });

    it('keeps untouched entries as the same objects, so their table rows stay memoized', () => {
        const before = userCatalog();
        const after = ok(updateEntry(before, BONE_FLUTE, { name: 'Bone Pipe' }, LATER));
        expect(after.entries[0]).not.toBe(before.entries[0]);
        expect(after.entries[1]).toBe(before.entries[1]);
    });

    it('flags duplicate names', () => {
        const catalog = ok(addEntry(userCatalog(), 'black mirror ', LATER));
        expect(duplicateNames(catalog)).toEqual(new Set([BLACK_MIRROR, catalog.entries[2]!.id]));
    });

    it('stops at the entry limit', () => {
        const full = userCatalog({
            entries: Array.from({ length: TEMPLATE_LIMITS.catalogEntriesMax }, (_, i) => ({
                id: `e-${String(i).padStart(8, '0')}`,
                name: `Entry ${i}`,
                values: {},
            })),
        });
        expect(addEntry(full, 'One more', LATER)).toEqual({ ok: false, reason: 'entries-limit' });
        expect(appendEntries(full, [{ name: 'X', values: {} }], LATER)).toEqual({
            ok: false,
            reason: 'entries-limit',
        });
    });
});

describe('pasting rows (spec 015, FR-008)', () => {
    const { columns } = userCatalog();

    it('reads tab-separated lines, CRLF included, and reports the rest', () => {
        const pasted = parsePastedEntries(
            'Horn\t3\tyes\r\nBell\t\tno\n\nBroken\tx\n\t2\nToo\t1\tno\textra\nLast',
            columns
        );
        expect(pasted.entries).toEqual([
            { name: 'Horn', values: { [POWER_COLUMN]: 3, [CURSED_COLUMN]: true } },
            { name: 'Bell', values: { [CURSED_COLUMN]: false } },
            { name: 'Last', values: {} },
        ]);
        expect(pasted.rejected.map(({ line, reason }) => [line, reason])).toEqual([
            [4, 'bad-value'],
            [5, 'empty-name'],
            [6, 'extra-cells'],
        ]);
        const appended = ok(appendEntries(userCatalog(), pasted.entries, LATER));
        expect(appended.entries.map(({ name }) => name)).toEqual([
            'Bone Flute',
            'Black Mirror',
            'Horn',
            'Bell',
            'Last',
        ]);
    });

    it('rejects lines beyond the room left', () => {
        const pasted = parsePastedEntries('A\nB\nC', columns, 2);
        expect(pasted.entries.map(({ name }) => name)).toEqual(['A', 'B']);
        expect(pasted.rejected).toEqual([{ line: 3, text: 'C', reason: 'entries-limit' }]);
    });
});

describe('catalog usage (spec 015, R8)', () => {
    it('finds fields, table columns, and lists, with the columns each maps', () => {
        const template = CustomTemplateSchema.parse({
            id: 'tpl-relics01',
            name: 'Relic page',
            systemId: 'wod-v5',
            documentKind: 'mortal',
            schemaVersion: 3,
            children: [
                {
                    id: 'relic',
                    type: 'select',
                    label: 'Relic',
                    options: [{ id: 'none', label: 'None' }],
                    binding: {
                        catalogId: RELICS_ID,
                        fills: {
                            [POWER_COLUMN]: { targetFieldId: 'relic-power' },
                            [CURSED_COLUMN]: { targetFieldId: 'relic-cursed', disabled: true },
                        },
                    },
                },
                { id: 'relic-power', type: 'number', label: 'Power' },
                { id: 'relic-cursed', type: 'toggle', label: 'Cursed' },
                {
                    id: 'carried',
                    type: 'list',
                    valueKey: 'carried',
                    catalog: { catalogId: RELICS_ID, valueFrom: POWER_COLUMN },
                },
                {
                    id: 'inventory',
                    type: 'table',
                    columns: [
                        {
                            id: 'item',
                            type: 'select',
                            label: 'Item',
                            options: [{ id: 'none', label: 'None' }],
                            binding: {
                                catalogId: RELICS_ID,
                                fills: { [CURSED_COLUMN]: { targetFieldId: 'cursed' } },
                            },
                        },
                        { id: 'cursed', type: 'toggle', label: 'Cursed' },
                    ],
                },
            ],
        });
        const usage = catalogUsage(RELICS_ID, [template]);
        expect(usage.templates).toEqual([template]);
        expect(usage.sites.map(({ nodeId, kind }) => [nodeId, kind])).toEqual([
            ['relic', 'field'],
            ['carried', 'list'],
            ['item', 'column'],
        ]);
        expect(usage.columns.get(POWER_COLUMN)?.map(({ nodeId }) => nodeId)).toEqual([
            'relic',
            'carried',
        ]);
        expect(usage.columns.get(CURSED_COLUMN)?.map(({ nodeId }) => nodeId)).toEqual(['item']);
        expect(catalogUsage('user-catalog-other001', [template]).sites).toEqual([]);
    });
});
