import type {
    CatalogBindingEntry,
    CatalogDetailValue,
    CatalogLike,
    SystemPlugin,
} from '../../../systems';
import { systemRegistry } from '../../../systems';

/**
 * Catalog lookup for declarative templates. Plugins own their catalogs
 * (`SystemPlugin.catalogs`, declared with `systems/catalogs.ts`); this module only aggregates
 * them, so generic template code never imports a system's data.
 */

export type {
    CatalogBindingEntry,
    CatalogDetailRow,
    CatalogDetailValue,
    CatalogFillableDetail,
    CatalogFillKind,
} from '../../../systems';

/** Every catalog declared by the given plugins; a catalog id declared twice is a build error. */
export function collectPluginCatalogs(
    plugins: readonly Pick<SystemPlugin, 'id' | 'catalogs'>[]
): ReadonlyMap<string, CatalogBindingEntry> {
    const catalogs = new Map<string, CatalogBindingEntry>();
    const owners = new Map<string, string>();
    for (const plugin of plugins) {
        for (const catalog of plugin.catalogs ?? []) {
            const owner = owners.get(catalog.catalogId);
            if (owner) {
                throw new Error(
                    `Duplicate catalog ID "${catalog.catalogId}" declared by ${owner} and ${plugin.id}`
                );
            }
            owners.set(catalog.catalogId, plugin.id);
            catalogs.set(catalog.catalogId, catalog);
        }
    }
    return catalogs;
}

export const CATALOG_BINDINGS: ReadonlyMap<string, CatalogBindingEntry> = collectPluginCatalogs(
    systemRegistry.getSystems()
);

/** Every fillable detail of one catalog entry, converted by the catalog's resolver when set. */
export function readCatalogDetails(
    catalogId: string,
    entryId: string
): Readonly<Record<string, CatalogDetailValue | undefined>> | undefined {
    const binding = CATALOG_BINDINGS.get(catalogId);
    const entry = binding?.entries.find((candidate) => candidate.id === entryId);
    if (!binding || !entry) return undefined;
    if (binding.resolveDetails) return binding.resolveDetails(entry);
    return Object.fromEntries(
        binding.fillableDetails.map((detail) => [detail.key, readDetailValue(entry, detail.key)])
    );
}

/** Stable detail extraction used by the copy-on-select runtime. */
export function readDetailValue(entry: CatalogLike, key: string): string | number | undefined {
    const value = (entry as unknown as Record<string, unknown>)[key];
    if (typeof value === 'string' || typeof value === 'number') return value;
    return undefined;
}

/** Closed-set validation for fill mappings (used by editor and import paths). */
export function validateBindingFills(
    catalogId: string,
    fills: Record<string, unknown>
): { ok: true } | { ok: false; unknownKeys: string[] } {
    const binding = CATALOG_BINDINGS.get(catalogId);
    if (!binding) return { ok: false, unknownKeys: Object.keys(fills) };
    const allowed = new Set(binding.fillableDetails.map((detail) => detail.key));
    const unknownKeys = Object.keys(fills).filter((key) => !allowed.has(key));
    return unknownKeys.length === 0 ? { ok: true } : { ok: false, unknownKeys };
}
