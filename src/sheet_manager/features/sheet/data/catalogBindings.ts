import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type {
    CatalogBindingEntry,
    CatalogDetailValue,
    CatalogFillKind,
    CatalogLike,
    SystemPlugin,
} from '../../../systems';
import { systemRegistry } from '../../../systems';
import {
    catalogOwnerKey,
    catalogScopeOf,
    isInCatalogScope,
    type UserCatalog,
    userCatalogBinding,
} from '../../../systems/userCatalogs';

/**
 * Catalog lookup for declarative templates. Plugins own their catalogs
 * (`SystemPlugin.catalogs`, declared with `systems/catalogs.ts`); this module only aggregates
 * them, so generic template code never imports a system's data.
 */

export type {
    CatalogBindingEntry,
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

/** Shipped catalogs only; template code looks catalogs up with `getCatalogBinding`. */
export const CATALOG_BINDINGS: ReadonlyMap<string, CatalogBindingEntry> = collectPluginCatalogs(
    systemRegistry.getSystems()
);

const asBinding = (catalog: UserCatalog) =>
    userCatalogBinding(catalog) as unknown as CatalogBindingEntry;

/**
 * One lookup for shipped and user catalogs (spec 015, R4): shipped ids win. React code passes the
 * store's `catalogs` so a catalog edit re-resolves what depends on it; other code reads the
 * registry overlay.
 */
export function getCatalogBinding(
    catalogId: string,
    userCatalogs?: Readonly<Record<string, UserCatalog>>
): CatalogBindingEntry | undefined {
    const shipped = CATALOG_BINDINGS.get(catalogId);
    if (shipped) return shipped;
    // The store's catalogs first (React callers pass them); the overlay also has storybook samples.
    const user = userCatalogs?.[catalogId] ?? systemRegistry.getUserCatalog(catalogId);
    return user ? asBinding(user) : undefined;
}

const shippedNames = uiMessages.sheet.catalogNames as Readonly<
    Record<string, { id: string; message: string }>
>;

/** A catalog's display name: the user's own name, a shipped catalog's translated name, or its id. */
export function catalogDisplayName(catalogId: string): string {
    const user = systemRegistry.getUserCatalog(catalogId);
    if (user) return user.name;
    const shipped = shippedNames[catalogId];
    return shipped ? translate(shipped) : catalogId;
}

/** `getCatalogBinding` shaped like a map lookup, for helpers that take a catalog source. */
export const CATALOG_LOOKUP: Pick<ReadonlyMap<string, CatalogBindingEntry>, 'get'> = {
    get: (catalogId) => getCatalogBinding(catalogId),
};

interface CatalogTemplateRef {
    systemId: string;
    documentKind: string;
    settingId?: string;
}

/** The catalogs a template may bind, grouped the way the editor's picker lists them. */
export interface ScopedCatalogs {
    /** User catalogs of the template's setting. */
    setting: CatalogBindingEntry[];
    /** User catalogs of the setting's ruleset. */
    ruleset: CatalogBindingEntry[];
    /** Catalogs the template's system ships. */
    shipped: CatalogBindingEntry[];
    rulesetId: string | undefined;
}

export function listCatalogBindingsFor(template: CatalogTemplateRef): ScopedCatalogs {
    const scope = catalogScopeOf(systemRegistry, template);
    const settingKey = catalogOwnerKey(scope.setting);
    const user = [...systemRegistry.listUserCatalogs()].sort((a, b) =>
        a.name.localeCompare(b.name)
    );
    return {
        setting: user.filter(({ owner }) => catalogOwnerKey(owner) === settingKey).map(asBinding),
        ruleset: user
            .filter(({ owner }) => 'rulesetId' in owner && owner.rulesetId === scope.rulesetId)
            .map(asBinding),
        shipped: (systemRegistry.getSystem(template.systemId)?.catalogs ?? []).map(
            ({ catalogId }) => CATALOG_BINDINGS.get(catalogId)!
        ),
        rulesetId: scope.rulesetId,
    };
}

/**
 * Whether a template may bind a catalog: shipped catalogs stay globally valid (as before), user
 * catalogs only within the template's setting and its ruleset.
 */
export function isCatalogInScope(catalogId: string, template: CatalogTemplateRef): boolean {
    if (CATALOG_BINDINGS.has(catalogId)) return true;
    const user = systemRegistry.getUserCatalog(catalogId);
    return !!user && isInCatalogScope(user.owner, catalogScopeOf(systemRegistry, template));
}

/** Every fillable detail of one catalog entry, converted by the catalog's resolver when set. */
export function readCatalogDetails(
    catalogId: string,
    entryId: string
): Readonly<Record<string, CatalogDetailValue | undefined>> | undefined {
    const binding = getCatalogBinding(catalogId);
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
    const binding = getCatalogBinding(catalogId);
    if (!binding) return { ok: false, unknownKeys: Object.keys(fills) };
    const allowed = new Set(binding.fillableDetails.map((detail) => detail.key));
    const unknownKeys = Object.keys(fills).filter((key) => !allowed.has(key));
    return unknownKeys.length === 0 ? { ok: true } : { ok: false, unknownKeys };
}

/**
 * A catalog detail a list's "value from" may copy into an entry of this type (spec 016, R8):
 * numbers into numbers, ratings, and a resource's current value; text into text; toggles.
 */
export function catalogKindFitsListItem(kind: CatalogFillKind, itemType: string): boolean {
    switch (kind) {
        case 'number':
            return itemType === 'number' || itemType === 'rating' || itemType === 'resource';
        case 'text':
            return itemType === 'text';
        case 'boolean':
            return itemType === 'toggle';
        case 'rows':
            return false;
    }
}
