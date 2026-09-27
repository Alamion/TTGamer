# Implementation Plan: User-created catalogs

**Branch**: `testing` (spec directory `015-user-catalogs`) | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-user-catalogs/spec.md`

## Summary

Authors create their own catalogs in the library, on a setting or on a whole ruleset. A catalog
has typed columns and named entries, edited in a table in the details pane, with a paste from a
spreadsheet. Authors use catalogs wherever shipped catalogs work today (choice fields), plus
custom-list name suggestions and choice columns of template tables that fill their own row.

**Storage and lookup**: catalogs live in `documentTypeStore` (v3). They reach generic code
through the registry overlay (`setUserCatalogs`), and one adapter makes them `CatalogBindingEntry`
objects. So copy-on-select, the searchable pick, reference validation, and the binding editor
work unchanged, behind one `getCatalogBinding(id)` lookup that replaces the direct reads of
`CATALOG_BINDINGS`.

**Documents**: they store the entry id and a `#label` companion. Renames reach documents, and
deletions keep the last name.

**Library**: the tree gains catalog leaves under rulesets and settings, with shipped catalogs
shown read-only. Library actions, moves, and the `ttgamer-library` file (v2) carry catalogs like
types.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5 (persist), Zod 3, Radix Dialog and Popover,
Tailwind 3 + clsx, and Lucide. No new dependency.

**Storage**: IndexedDB via localForage. `documentTypeStore` goes v2 → v3 and adds `catalogs`.
The template value bag and table row keys take `#label` companions; the row key limit rises from
64 to 72, which only widens what parses. `templateStore` and `documentStore` versions are
unchanged.

**Testing**: Vitest + Testing Library (pure model tests, component tests), `yarn verify:full`

**Target Platform**: Browser, desktop and phone widths

**Project Type**: Web application (the sheet manager module of the Docusaurus site)

**Performance Goals**:

- The library still opens in under 1 s with 300 pages plus 50 catalogs.
- A 1000-entry catalog table renders and scrolls smoothly, with rows memoized and one store write
  per edit.
- A pick fills its targets in one write.

**Constraints**:

- No system conditionals.
- User catalogs are single-language.
- Shipped catalogs are never serialized or edited.
- Older files import unchanged (SC-005).
- English code and docs, with ru mirrors for the UI and the guide.

**Scale/Scope**: up to 50 catalogs per owner, 1000 entries × 20 columns per catalog, and 30
call sites of `CATALOG_BINDINGS` migrated. There is about 1 new pure module per concern (scope,
edit, adapter) plus the details-pane table component.

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Modular Semi-Autonomy                     | **Pass.** User catalogs reach generic code only through the registry overlay (`systems/userCatalogs.ts`, `setUserCatalogs`), as user types do. Scope is computed from registry declarations (`ruleset`, definition `module`), never from system names. `shared/` is untouched.                                                                                     |
| II. Explicit Contracts at Boundaries         | **Pass.** A Zod schema covers catalogs, columns, and entries, and the store v3 has a migration and quarantine. The library file v2 still reads v1. Companion `#label` values are validated on write. The contracts are `contracts/catalog-ui.md` and `data-model.md`.                                                                                              |
| III. Pleasurable Cross-Module Interactions   | **Pass.** Nothing a user picked is lost: `#label` survives deletes. Moves and deletes name the affected templates before anything changes. A missing catalog degrades to manual choice with `catalog-unavailable`, as today.                                                                                                                                       |
| IV. Fit-for-Purpose Code Quality             | **Pass.** One adapter turns a user catalog into the existing binding shape, so no parallel code path exists. Catalog editing is a pure module with tests. The table editor is one component. `CATALOG_BINDINGS` direct reads are replaced by one lookup.                                                                                                           |
| V. Risk-Proportional Testing                 | **Pass.** Persistence: the v2 → v3 migration. Data movement: move and delete plans, including ruleset scope loss. File: the v2 round trip, the v1 import, and Keep both rebinding. Use sites: the fill tests for field, list, and table row, and `#label` after delete. UI: tree rows, the details table, paste, and the confirmations. Tier 3 `yarn verify:full`. |
| VI. Consistent, Accessible Experience        | **Pass.** Existing atoms are reused: `NumberInput`, the `Checkbox` dot, `CatalogSuggest`, and `ConfirmDialog`. Table headers get `scope="col"`, and move buttons are labelled. en and ru strings go through YAML. The storybook shows the three use sites, required by its guard. The guide has a section in en and ru, linked with "?".                           |
| VII. Performance as a Shared Budget          | **Pass.** No new dependency. The adapters are memoized per catalog object. The tree stays derived (catalog nodes are leaves). The sheet subscribes only to `catalogs`.                                                                                                                                                                                             |
| VIII. Respectful Use of Third-Party Material | **Pass.** User catalogs are user content. Shipped catalogs are only listed, never exported, and exports keep the existing `notices` rule.                                                                                                                                                                                                                          |

**Deviations**: none.

**Post-Phase-1 re-check**: unchanged. The design adds:

- one store version;
- one registry overlay;
- one tree level (a leaf);
- one file version;
- two template schema options (list `catalog`, table column fills).

## Project Structure

### Documentation (this feature)

```text
specs/015-user-catalogs/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── catalog-ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/sheet_manager/
├── systems/
│   ├── userCatalogs.ts             # NEW: schemas, ids, owner, catalogScopeOf, userCatalogBinding adapter
│   ├── registry.ts                 # setUserCatalogs / getUserCatalog / listUserCatalogs
│   └── index.ts                    # sync catalogs from the type store
├── store/documentTypeStore.ts      # v3: catalogs + actions + migration
├── types/
│   ├── templateLimits.ts           # catalog limits
│   ├── template.ts                 # ListNode.catalog; column binding rule
│   └── templateValues.ts           # #label companion helpers; row key 72
├── features/sheet/
│   ├── data/
│   │   ├── catalogBindings.ts      # getCatalogBinding, listCatalogBindingsFor (replaces CATALOG_BINDINGS reads)
│   │   ├── catalogEdit.ts          # NEW: column/entry ops, retype, paste
│   │   ├── templateReferences.ts   # list catalog + table column fill targets
│   │   ├── templateValueWrites.ts  # #label validation
│   │   ├── libraryTree.ts          # CatalogNode, placement
│   │   ├── libraryActions.ts       # createCatalog, rename, delete plans (+ setting delete)
│   │   └── libraryMoves.ts         # catalog targets, scope-loss consequences, setting moves
│   ├── shell/
│   │   ├── libraryFile.ts          # v2 payload, closure (catalogs auto), v1 read
│   │   └── libraryImport.ts        # catalog states, Replace / Keep both + rebinding
│   └── declarative/
│       ├── hooks.ts                # subscribe to catalogs; list/table resolvers; setRowValues
│       ├── fieldControls.tsx       # #label display fallback
│       ├── DeclarativeSheetView.tsx# table choice-column fills
│       └── primitives.tsx          # custom list catalog suggestions
├── components/dialogs/
│   ├── library/
│   │   ├── TreeRow.tsx, LibraryTree.tsx, actions.ts, ContextMenu.tsx, CreateForm.tsx, DetailsPane.tsx, MovePanel.tsx
│   │   └── CatalogTable.tsx        # NEW: entries/columns editor, paste dialog
│   └── template-editor/
│       ├── CatalogBindingEditor.tsx# grouped picker (setting / ruleset / shipped), sibling-column targets
│       └── ElementSettings.tsx     # list settings: catalog + valueFrom
└── storybook/stories.ts            # sample user catalog + three use sites

translations/source/{en,ru}/ui/sheet/library.yaml, templates.yaml
docs/template-editor/values.mdx, library.mdx (+ ru mirrors)
tests/sheet_manager/
├── user-catalogs.test.ts          # NEW: schema, scope, adapter, overlay
├── catalog-edit.test.ts           # NEW
├── catalog-use-sites.test.tsx     # NEW: field, list, table row, #label
└── library-*.test.ts(x), document-type-store.test.ts, storybook.test.tsx, template-editor.test.tsx (extended)
```

Housekeeping when the work is done:

- the sheet-templates skill ("Catalogs", "Library");
- `src/sheet_manager/AGENTS.md` (overlay line);
- `CHANGELOG.md` 3.13.0;
- `TODO.md` T-074 ✅.

**Structure Decision**: this is the existing single-project layout. Catalog data rules sit with
the other sheet data helpers. The only new UI component is the details-pane table.

## Complexity Tracking

No constitution violations to justify.
