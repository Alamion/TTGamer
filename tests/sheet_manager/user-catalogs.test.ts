import {
    getCatalogBinding,
    isCatalogInScope,
    listCatalogBindingsFor,
    readCatalogDetails,
} from '@site/src/sheet_manager/features/sheet/data/catalogBindings';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    catalogOwnerKey,
    catalogScopeOf,
    userCatalogBinding,
    UserCatalogSchema,
} from '@site/src/sheet_manager/systems/userCatalogs';
import { TEMPLATE_LIMITS } from '@site/src/sheet_manager/types/templateLimits';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    ASHEN_ID,
    BLACK_MIRROR,
    CULT_ID,
    CURSED_COLUMN,
    FIREARMS_ID,
    ORG_ID,
    POWER_COLUMN,
    RELICS_ID,
    resetLibraryStores,
    seedLibrary,
    userCatalog,
} from './helpers/library';

describe('user catalog schema (spec 015)', () => {
    it('drops values of unknown columns and of the wrong type', () => {
        const catalog = userCatalog({
            entries: [
                {
                    id: 'e-oddone01',
                    name: 'Odd',
                    values: { [POWER_COLUMN]: 'four', [CURSED_COLUMN]: true, 'c-gone0001': 1 },
                },
            ],
        });
        expect(catalog.entries[0]!.values).toEqual({ [CURSED_COLUMN]: true });
    });

    it('rejects duplicate ids, blank names, and catalogs over the limits', () => {
        const base = userCatalog();
        const parse = (patch: object) => UserCatalogSchema.safeParse({ ...base, ...patch }).success;
        expect(parse({ entries: [base.entries[0], base.entries[0]] })).toBe(false);
        expect(parse({ name: '  ' })).toBe(false);
        expect(parse({ id: 'relics' })).toBe(false);
        const columns = Array.from({ length: TEMPLATE_LIMITS.catalogColumnsMax + 1 }, (_, i) => ({
            id: `c-col${String(i).padStart(5, '0')}`,
            name: `Column ${i}`,
            type: 'text',
        }));
        expect(parse({ columns, entries: [] })).toBe(false);
    });

    it('keys owners stably', () => {
        expect(catalogOwnerKey({ settingId: ASHEN_ID })).toBe(`setting:${ASHEN_ID}`);
        expect(catalogOwnerKey({ systemId: 'wod-v5', moduleId: 'hunter' })).toBe(
            'system:wod-v5:hunter'
        );
        expect(catalogOwnerKey({ systemId: 'wod-v5' })).toBe('system:wod-v5');
        expect(catalogOwnerKey({ rulesetId: 'wod-v5' })).toBe('ruleset:wod-v5');
    });
});

describe('catalog scope and lookup (spec 015, R2 and R4)', () => {
    beforeEach(seedLibrary);
    afterEach(resetLibraryStores);

    it('scopes a template to its setting and that setting ruleset', () => {
        const scope = (template: { systemId: string; documentKind: string; settingId?: string }) =>
            catalogScopeOf(systemRegistry, template);
        expect(scope({ systemId: 'wod-v5', documentKind: 'mortal', settingId: ASHEN_ID })).toEqual({
            setting: { settingId: ASHEN_ID },
            rulesetId: 'wod-v5',
        });
        expect(scope({ systemId: 'wod-v5', documentKind: CULT_ID })).toEqual({
            setting: { settingId: ASHEN_ID },
            rulesetId: 'wod-v5',
        });
        expect(scope({ systemId: 'wod-v5', documentKind: 'mortal' })).toEqual({
            setting: { systemId: 'wod-v5' },
            rulesetId: 'wod-v5',
        });
        expect(scope({ systemId: 'wod-v5', documentKind: 'character' })).toEqual({
            setting: { systemId: 'wod-v5', moduleId: 'hunter' },
            rulesetId: 'wod-v5',
        });
        expect(scope({ systemId: 'star-wars-wod', documentKind: 'character' })).toEqual({
            setting: { systemId: 'star-wars-wod' },
            rulesetId: 'wod-2e',
        });
        expect(scope({ systemId: 'star-wars-wod', documentKind: ORG_ID })).toEqual({
            setting: { systemId: 'star-wars-wod' },
            rulesetId: 'wod-2e',
        });
    });

    it('lists the setting and ruleset catalogs a template may bind', () => {
        const ashen = listCatalogBindingsFor({
            systemId: 'wod-v5',
            documentKind: CULT_ID,
        });
        expect(ashen.setting.map(({ catalogId }) => catalogId)).toEqual([RELICS_ID]);
        expect(ashen.ruleset.map(({ catalogId }) => catalogId)).toEqual([FIREARMS_ID]);
        expect(ashen.shipped.length).toBeGreaterThan(0);

        const hunter = { systemId: 'wod-v5', documentKind: 'character' };
        expect(listCatalogBindingsFor(hunter).setting).toEqual([]);
        expect(isCatalogInScope(FIREARMS_ID, hunter)).toBe(true);
        expect(isCatalogInScope(RELICS_ID, hunter)).toBe(false);
        expect(
            isCatalogInScope(RELICS_ID, { systemId: 'star-wars-wod', documentKind: ORG_ID })
        ).toBe(false);
    });

    it('adapts a user catalog to the shipped binding shape', () => {
        const binding = getCatalogBinding(RELICS_ID)!;
        expect(binding).toBe(userCatalogBinding(systemRegistry.getUserCatalog(RELICS_ID)!));
        expect(binding.entries.map(({ name }) => name)).toEqual(['Bone Flute', 'Black Mirror']);
        expect(binding.fillableDetails).toEqual([
            { key: POWER_COLUMN, kind: 'number', label: 'Power' },
            { key: CURSED_COLUMN, kind: 'boolean', label: 'Cursed' },
        ]);
        expect(binding.pickLabel(binding.entries[1]!, 'ru')).toBe('Black Mirror');
        expect(readCatalogDetails(RELICS_ID, BLACK_MIRROR)).toEqual({
            [POWER_COLUMN]: 4,
            [CURSED_COLUMN]: true,
        });
    });

    it('answers shipped ids first and misses unknown ids', () => {
        expect(getCatalogBinding('melee-weapons')?.catalogId).toBe('melee-weapons');
        expect(getCatalogBinding('user-catalog-missing1')).toBeUndefined();
    });
});
