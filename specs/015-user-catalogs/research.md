# Research: User-created catalogs

No NEEDS CLARIFICATION items remain. The maintainer settled the owner, the entry shape, where
catalogs are edited, the use sites, and the ruleset scope. The decisions below cover how the
feature is built. They are cited as R1–R12 in the plan and tasks.

## R1. Storage: the type store, version 3

**Decision**: `documentTypeStore` goes v2 → v3 and gains `catalogs: Record<string, UserCatalog>`,
with `saveCatalog`, `removeCatalog`, and a bulk `replaceCatalogs`. The v3 migration parses each
catalog, and a catalog that fails to parse goes to the same bounded quarantine. Older stores load
with `catalogs: {}`.

**Rationale**:

- Catalogs are library items, like types and settings. They share its lifecycle: the library
  writes (`applyLibraryWrites`), export, import, and the quarantine rules. They also move and
  delete together with settings.
- One store keeps a library action to one write per store.

**Alternatives considered**:

- _A separate catalog store._ It would add a third store to every library write and need its
  own persist wiring. Rejected.
- _Catalogs inside templates._ Rejected by the maintainer's decision on ownership.

## R2. Owner shape and scope

**Decision**:

```ts
owner:
  | { settingId }              // a user setting
  | { systemId, moduleId? }    // a shipped setting: "Rules only" (ruleset system), a line module, or a setting system
  | { rulesetId }              // the ruleset itself: shared by every setting on it
```

A pure helper in `systems/userCatalogs.ts`, `catalogScopeOf(registry, template)`, returns the two owners a template can see:

- its setting:
    - `{ settingId }` from `template.settingId`, or from a user type's `{ settingId }` owner;
    - otherwise `{ systemId, moduleId? }` from the template's system and the module of its document
      definition (or of a user type's owner);
- its ruleset: the user setting's `systemId`, the setting system's `ruleset`, or the ruleset
  system itself.

`catalogsVisibleTo(registry, template)` = the user catalogs whose owner equals one of these two, plus the
shipped catalogs of the template's system (unchanged).

**Rationale**:

- The first two owner shapes mirror `UserTypeOwnerSchema`. The library already places user types
  with them, so catalogs follow the same placement code.
- The ruleset owner is the maintainer's addition. It is a separate shape, not
  `{ systemId: <ruleset> }`, because that shape already means "Rules only".

**Alternatives considered**:

- _Inherit Rules-only catalogs into every setting of the ruleset._ This would make "Rules only"
  two things at once. Rejected in favor of an explicit ruleset owner.

## R3. Ids and the companion label

**Decision**:

- **Ids**:
    - catalog: `user-catalog-<8>`;
    - column: `c-<8>`;
    - entry: `e-<8>`.

    All are kebab identifiers, so they fit `templateIdentifierSchema` and the stored option values.
    The `user-catalog-` prefix never collides with shipped ids, which are plain words.

- **What a pick stores**: picking an entry of a user catalog stores the entry id, as shipped
  picks do. It also stores the picked name in a companion `<valueKey>#label` (bag), or
  `<columnId>#label` inside a table row.
- **What is shown**: the renderer shows the live entry name when the entry exists, and the
  companion label otherwise (FR-013).
- **Limits**: the table row key limit rises from 64 to 72, which only widens what parses. The
  bag key limit is already 72 (spec 014).
- **Validation**: the value-bag write path validates `#label` entries as bounded strings when the
  base key is a catalog-bound choice field.

**Rationale**:

- Renames reach documents through the id.
- The last name survives a deleted entry or catalog.
- The pattern matches spec 014's `#detail` companion.

**Alternatives considered**:

- _Store the name._ Renames would not reach documents. Rejected.
- _Keep deleted entries as tombstones._ This grows the catalog forever and still loses on catalog
  delete. Rejected.

## R4. One catalog lookup for shipped and user catalogs

**Decision**:

- `systems/userCatalogs.ts` holds the schemas and `userCatalogBinding(catalog)`, which adapts a
  `UserCatalog` to the existing `CatalogBindingEntry` shape:
    - entries become `{ id, name, …column values keyed by column id }`;
    - `fillableDetails` comes from the columns (`text`, `number`, or `boolean` kind);
    - `pickLabel`, `entryLabel`, `entryText`, and `pickSearchText` return the typed name;
    - there is no `resolveDetails`.

    The adapters are memoized per catalog object in a `WeakMap`.

- `SystemRegistry` gains `setUserCatalogs(catalogs)` and `getUserCatalog(id)`. `systems/index.ts`
  syncs them from the type store, alongside user types.
- `catalogBindings.ts` replaces the direct `CATALOG_BINDINGS.get(id)` reads (30 call sites) with
  `getCatalogBinding(id)`. It checks shipped catalogs first, then user catalogs. It also adds
  `listCatalogBindingsFor(template)` (R2) for the editor picker.

**Rationale**:

- Every consumer keeps working unchanged, because it already speaks `CatalogBindingEntry`:
  select options, searchable pick, copy-on-select fills, reference validation, the binding
  editor, and `CatalogSuggest`.
- User data reaches generic code only through the registry overlay (constitution I, spec 012
  pattern).

## R5. Re-rendering when catalogs change

**Decision**: `useTemplatePage` subscribes to `useDocumentTypeStore((s) => s.catalogs)` and
includes it in the dependencies of `resolveCatalogField` and the list and table catalog
resolvers. The editor's catalog picker does the same. A sheet open next to the library therefore
shows edits at once.

## R6. Library tree

**Decision**:

- A new node level, `catalog`, with ref `{ kind: 'user', catalogId } | { kind: 'shipped',
systemId, catalogId }` and key `c:user:<id>` or `c:<systemId>:<catalogId>`.
- `RulesetNode` gains `catalogs: CatalogNode[]`, listed before its settings, and `SettingNode`
  gains `catalogs`, listed before its types. `childrenOf` returns catalogs first.
- **Shipped catalogs** are listed read-only, placed by the plugin that declares them:
    - a ruleset plugin's catalogs go under the ruleset, since every V5 template sees V5 catalogs
      today;
    - a setting system's catalogs go under that setting (Star Wars).
- **Unavailable owners**: user catalogs whose owner is unknown land in the existing "Unavailable"
  group.
- **Counts**: the row badge counts entries, not documents.

**Rationale**:

- The fixed levels stay unchanged. A catalog is a leaf sibling (spec assumption).
- Placing shipped catalogs by their declaring plugin matches where templates can already bind
  them.

## R7. Library actions, moves, delete

**Decision**:

- `libraryActions.ts` gains `createCatalog(owner, name)`, `renameItem` for catalogs, and
  `deletePlan` for catalogs.
    - The catalog delete plan lists the templates bound to it, through fields, lists, and table
      columns.
    - A setting's delete plan also deletes the setting's catalogs.
- `libraryMoves.ts` defines where a user catalog can go:
    - targets: any ruleset node, or any setting node except "Unavailable";
    - `crossesSystem`: true when some template that sees the catalog now would not see it after
      the move;
    - the consequences name those templates;
    - a setting move carries its catalogs.

## R8. Catalog editing model

**Decision**: `features/sheet/data/catalogEdit.ts` holds pure operations:

- `addColumn`, `renameColumn`, `retypeColumn` (with `retypeLosses`, which counts the values that
  will empty), `moveColumn`, and `removeColumn` (with `columnMappings`, the template mappings that
  use it);
- `addEntry`, `updateEntry`, `moveEntry`, and `removeEntry`;
- `parsePastedEntries(text, columns)`, which splits on `\n` and `\t`, the name first, and returns
  `{ entries, rejected: [{ line, reason }] }`.
- `catalogUsage(catalogId, templates)`, which returns the templates that bind the catalog and the
  mappings of each column. The details pane, the column delete, and the library move and delete
  plans share it.

Conversions:

| From → to       | Rule                                                                  |
| --------------- | --------------------------------------------------------------------- |
| number → text   | The digits as text.                                                   |
| text → number   | Numeric text only (`,` or `.` decimals); anything else becomes empty. |
| toggle ↔ text   | `yes`/`no`, plus `да`/`нет` accepted on input.                        |
| toggle ↔ number | 1/0.                                                                  |

The details pane edits through these, then writes the whole catalog with one `saveCatalog`.

## R9. Custom lists

**Decision**: `ListNodeSchema` gains `catalog?: { catalogId, valueFrom?: columnId }`, valid only
with `valueKey`. The value-bag list body passes the catalog entries to `CustomTraitList`, which
already supports `catalog` and `onCatalogSelect` through `CatalogSuggest`. A pick sets the entry
label to the name and, when `valueFrom` is set, the value to that number column, clamped to the
list value range 0–20. Only numeric columns can be `valueFrom`. Shipped catalogs may be bound the
same way.

## R10. Table choice columns

**Decision**:

- A `select` column with a `binding` fills targets that are column ids of the same table.
- `DeclarativeSheetView`'s table cell change for such a column calls `pageApi.setRowValues(blockId,
rowIndex, cells)`, one write that applies the pick and every fill to that row only.
- `templateReferences.ts` validates column fill targets against the table's own columns, with a
  new issue code `unknown-fill-target` in context.
- The binding editor offers only sibling columns when the field is a column.

## R11. Library file v2

**Decision**:

- `ttgamer-library` goes to version 2 and gains `catalogs: UserCatalog[]`. `included` records them
  as picked or auto.
- **Export closure**:
    - it adds the catalogs that picked templates bind as `auto`;
    - it adds a catalog's user setting as `auto`;
    - a ruleset-owned or shipped-setting-owned catalog adds an address.
- **Import**:
    - it reads v1 (no catalogs) and v2;
    - catalogs get the same `new`/`same`/`conflict`/`unavailable` states, where the conflict
      comparison ignores `updatedAt`;
    - they get the same Replace or Keep both choices;
    - Keep both issues a new catalog id and rewrites the bindings of the picked templates in the
      same file that referenced the old id.
- Older builds reject v2 with the existing "newer version" message, and never silently drop
  catalogs.

## R12. Limits

**Decision**: `TEMPLATE_LIMITS` gains:

- `catalogEntriesMax: 1000`;
- `catalogColumnsMax: 20`;
- `catalogsPerOwner: 50`.

The schemas enforce entries and columns. The per-owner count is enforced by the library actions
and the import, since it spans records. An import that would exceed it marks the extra catalogs
`unavailable`, with the reason "limit". `TEMPLATE_LIMITS.optionsPerField` does not apply to
catalog-bound fields, as it does not today.
