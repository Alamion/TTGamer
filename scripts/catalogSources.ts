import { ABILITIES } from '../src/data/abilities';
import { ATTRIBUTES } from '../src/data/attributes';
import { CONSUMABLE_WEAPONS } from '../src/data/consumableWeaponsData';
import { TERMINOLOGY } from '../src/data/terminologyData';
import { systemRegistry } from '../src/sheet_manager/systems/index';

export interface CodeCatalogEntry {
    id: string;
}

/**
 * Catalog id → code-owned entries: every catalog declared by a system plugin plus the data
 * lists that docs pages and templates localize without a plugin declaration.
 */
export function codeCatalogs(): Map<string, readonly CodeCatalogEntry[]> {
    const catalogs = new Map<string, readonly CodeCatalogEntry[]>([
        ['attributes', ATTRIBUTES],
        ['abilities', ABILITIES],
        ['consumable-weapons', CONSUMABLE_WEAPONS],
        ['terminology', TERMINOLOGY],
    ]);
    for (const system of systemRegistry.getSystems()) {
        for (const catalog of system.catalogs ?? []) {
            catalogs.set(catalog.catalogId, catalog.entries);
        }
    }
    return catalogs;
}
