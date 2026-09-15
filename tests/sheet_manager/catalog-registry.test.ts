import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
    CATALOG_BINDINGS,
    collectPluginCatalogs,
} from '@site/src/sheet_manager/features/sheet/data/catalogBindings';
import { anyCatalog, defineCatalog, starWarsWodSystem } from '@site/src/sheet_manager/systems';
import { SystemIdSchema } from '@site/src/sheet_manager/types/document';
import { describe, expect, it } from 'vitest';

const STAR_WARS_CATALOG_IDS = [
    'armor',
    'backgrounds',
    'creatures',
    'force-powers',
    'force-skills',
    'melee-weapons',
    'merits-flaws',
    'ranged-weapons',
    'species',
    'tools-gear',
    'vehicles',
];

const fakeCatalog = anyCatalog(defineCatalog('fake-omens', [{ id: 'raven', name: 'Raven' }], []));

describe('plugin-declared catalogs', () => {
    it('keeps every Star Wars catalog after moving them onto the plugin', () => {
        const ids = (starWarsWodSystem.catalogs ?? []).map(({ catalogId }) => catalogId).sort();
        expect(ids).toEqual(STAR_WARS_CATALOG_IDS);
        for (const id of STAR_WARS_CATALOG_IDS) expect(CATALOG_BINDINGS.has(id)).toBe(true);
    });

    it('aggregates catalogs of every plugin', () => {
        const catalogs = collectPluginCatalogs([
            starWarsWodSystem,
            { id: SystemIdSchema.parse('fake'), catalogs: [fakeCatalog] },
        ]);
        expect(catalogs.get('fake-omens')?.entries).toHaveLength(1);
        expect(catalogs.has('species')).toBe(true);
    });

    it('rejects a catalog id declared by two plugins', () => {
        expect(() =>
            collectPluginCatalogs([
                { id: SystemIdSchema.parse('one'), catalogs: [fakeCatalog] },
                { id: SystemIdSchema.parse('two'), catalogs: [fakeCatalog] },
            ])
        ).toThrow('Duplicate catalog ID "fake-omens"');
    });

    it('keeps generic catalog lookup free of system data imports', () => {
        const source = readFileSync(
            path.resolve('src/sheet_manager/features/sheet/data/catalogBindings.ts'),
            'utf8'
        );
        expect(source).not.toMatch(/from ['"][^'"]*\/data\//);
        expect(source).not.toMatch(/systems\/star-wars-wod|systems\/v5/);
    });
});
