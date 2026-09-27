/** Template authoring limits; a leaf module so value schemas can share them without a cycle. */
export const TEMPLATE_LIMITS = {
    /** Nesting guardrail (spec A2): root children are depth 1. */
    maxDepth: 10,
    /** Total nodes across the whole tree (spec FR-3 authoring-time rejection). */
    nodesPerTemplate: 200,
    optionsPerField: 100,
    fillMappingsPerField: 100,
    presetsPerList: 30,
    columnsMax: 4,
    tableColumnsMax: 60,
    listEntriesMax: 1_000,
    ratingMax: 100,
    resourceMax: 1_000_000,
    /** User catalogs (spec 015): per catalog, and per owner (a setting or a ruleset). */
    catalogEntriesMax: 1_000,
    catalogColumnsMax: 20,
    catalogsPerOwner: 50,
} as const;
