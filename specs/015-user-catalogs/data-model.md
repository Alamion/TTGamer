# Data Model: User-created catalogs

> **Change record.** Partly superseded by 016 (list entries keep the item field's value; `valueFrom` copies any column that fits the entry type). Current behavior: `.agents/skills/sheet-templates/SKILL.md`.

## UserCatalog (`systems/userCatalogs.ts`, stored in `documentTypeStore.catalogs`)

| Field         | Type                                                            | Rules                                         |
| ------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `id`          | `user-catalog-[a-z0-9]{8}`                                      | Unique. It never equals a shipped catalog id. |
| `name`        | string, 1–80, trimmed                                           |                                               |
| `description` | string ≤ 500?                                                   |                                               |
| `owner`       | `{ settingId }` \| `{ systemId, moduleId? }` \| `{ rulesetId }` | R2. `rulesetId` names a ruleset system.       |
| `columns`     | `CatalogColumn[]`, ≤ 20                                         | Column ids are unique.                        |
| `entries`     | `CatalogEntry[]`, ≤ 1000                                        | Entry ids are unique.                         |
| `createdAt`   | ISO string                                                      |                                               |
| `updatedAt`   | ISO string                                                      | Ignored when import compares catalogs.        |

## CatalogColumn

| Field  | Type                             | Rules                |
| ------ | -------------------------------- | -------------------- |
| `id`   | `c-[a-z0-9]{8}`                  | Stable across edits. |
| `name` | string, 1–60                     |                      |
| `type` | `'text' \| 'number' \| 'toggle'` |                      |

## CatalogEntry

| Field    | Type                                                          | Rules                                                                                                                   |
| -------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`     | `e-[a-z0-9]{8}`                                               | Stable. It is stored by documents.                                                                                      |
| `name`   | string, 1–120, trimmed                                        | Duplicates are allowed and flagged in the UI.                                                                           |
| `values` | `Record<columnId, string ≤ 2000 \| finite number \| boolean>` | Sparse: a missing key is empty. A value must match its column's type, and keys of unknown columns are dropped on parse. |

## Store (`documentTypeStore` v3)

The store adds `catalogs: Record<id, UserCatalog>`, with `saveCatalog`, `removeCatalog`, and
`replaceCatalogs` (the library's bulk writes).

**Migration from v2**: `catalogs: {}`. Every catalog is parsed, and a catalog that fails moves to
the quarantine and is reported with `template-quarantined`.

## Template schema additions (`types/template.ts`)

- **`ListNode.catalog?`**: `{ catalogId, valueFrom?: string }`. It needs `valueKey`, and
  `valueFrom` must name a number column. The reference checks enforce this when the catalog is
  known.
- **Table `select` columns**: they may carry `binding`. Their `fills[*].targetFieldId` must be a
  column id of the same table (R10).
- **`TEMPLATE_LIMITS`**: gains `catalogEntriesMax: 1000`, `catalogColumnsMax: 20`, and
  `catalogsPerOwner: 50`.

## Value bag additions (`types/templateValues.ts`)

| Key                                         | Value                      | Written when                                                           |
| ------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| `<valueKey>`                                | entry id (unchanged shape) | A choice field picks an entry.                                         |
| `<valueKey>#label`                          | picked name, string ≤ 120  | The same pick, for user catalogs only.                                 |
| table row `<columnId>` / `<columnId>#label` | entry id / picked name     | A choice column picks an entry. The row key limit rises 64 → 72.       |
| list entry `{ id, label, value }`           | unchanged                  | A catalog suggestion is picked: `label` = name, `value` = `valueFrom`. |

## Library file (`ttgamer-library` v2)

The file adds `catalogs: UserCatalog[]`, and `included[catalogId]` is `'picked'` or `'auto'`.
Addresses cover the shipped owners of catalogs. Version 1 files still import.

## Library node (`libraryTree.ts`)

`CatalogNode { level: 'catalog', key, name, ownership, ref, entryCount, columnCount, owner }`.
`RulesetNode.catalogs` and `SettingNode.catalogs` are listed before settings and types.

## State transitions

- **Create**: the catalog gets `owner = selected node`, empty columns, and empty entries.
- **Move**: `owner` changes. Setting moves carry the setting's catalogs, and user-setting deletes
  remove them.
- **Delete**: the catalog is removed from the store. Templates keep their binding, which degrades
  to `catalog-unavailable`. Documents keep entry ids plus `#label`.
