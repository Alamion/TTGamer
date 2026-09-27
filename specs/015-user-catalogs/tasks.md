---
description: 'Task list for feature 015: user-created catalogs'
---

# Tasks: User-created catalogs

**Input**: Design documents from `specs/015-user-catalogs/`. These are:

- [plan.md](./plan.md) and [spec.md](./spec.md);
- [research.md](./research.md), whose decisions are cited as R1–R12;
- [data-model.md](./data-model.md);
- the contract [contracts/catalog-ui.md](./contracts/catalog-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: Tests are included. Constitution V requires them for the store migration, the library
file, moves and deletes, and the copy-on-select paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: The task can run in parallel, because it touches different files and has no
  unfinished dependencies.
- **[Story]**: US1–US5 from spec.md.

---

## Phase 1: Setup

- [ ] T001 Mark T-074 as in progress (`[ ] 🟡`) in `TODO.md`, then run `yarn validate:backlog`.
- [ ] T002 [P] Add the key skeletons to `translations/source/{en,ru}/ui/sheet/library.yaml`:
    - a `catalogs` group with create, rename, the details pane toolbar, the column types, the paste dialog, limits, confirmations, "used by", the counts plural, and the read-only note;
    - the owner path text.

    Add to `translations/source/{en,ru}/ui/sheet/templates.yaml`:
    - the picker group labels "This setting", "{ruleset}", and "{system} catalogs";
    - the list "Catalog" and "Value from" labels;
    - the "No entries yet" text.

    Nested keys must not be named `message`, `description`, or `plural`. Run `yarn build:translations`.

- [ ] T003 [P] Extend `tests/sheet_manager/helpers/library.ts`:
    - add `RELICS_ID` and a `userCatalog(overrides)` fixture: owned by Ashen Realms, with columns Power (number) and Cursed (toggle), and entries Bone Flute (2, off) and Black Mirror (4, on);
    - add `FIREARMS_ID`, a ruleset-owned `{ rulesetId: 'wod-v5' }` catalog;
    - seed both in `seedLibrary()`;
    - reset `catalogs` in `resetLibraryStores()`.

---

## Phase 2: Foundational (blocks all stories)

- [ ] T004 Add `catalogEntriesMax: 1000`, `catalogColumnsMax: 20`, and `catalogsPerOwner: 50` to `src/sheet_manager/types/templateLimits.ts` (R12).
- [ ] T005 Create `src/sheet_manager/systems/userCatalogs.ts` (R2–R4, data-model):
    - schemas: `CatalogColumnSchema`, `CatalogEntrySchema` (values must match column types; unknown column keys are dropped in a `superRefine`/transform against `columns`), `UserCatalogOwnerSchema` (three shapes), and `UserCatalogSchema`;
    - id generators: `newUserCatalogId`, `newCatalogColumnId`, and `newCatalogEntryId`;
    - `isUserCatalogId`;
    - `catalogOwnerKey(owner)`, a stable string used to compare and count owners;
    - `userCatalogBinding(catalog)`, which adapts a catalog to `CatalogBindingEntry` and is memoized in a `WeakMap`.
- [ ] T006 Add the catalog overlay to `src/sheet_manager/systems/registry.ts`: `setUserCatalogs(catalogs)`, `getUserCatalog(id)`, and `listUserCatalogs()`. Add `catalogScopeOf(registry, template)` to `src/sheet_manager/systems/userCatalogs.ts`: it returns `{ setting: owner, ruleset: rulesetId } | undefined` from the template's `settingId`, its user type's owner, or the module of its definition, using `rulesetOf` and `getDocumentDefinition`.

    In `src/sheet_manager/systems/index.ts`, sync the catalogs from `useDocumentTypeStore` in the existing subscription. Export the new types from `systems/index.ts`.

- [ ] T007 Bump `src/sheet_manager/store/documentTypeStore.ts` to v3 (R1):
    - add `catalogs`, plus `saveCatalog`, `removeCatalog`, and `replaceCatalogs(next)`;
    - the migration parses `catalogs` with quarantine and reports `template-quarantined`;
    - older states load with `catalogs: {}`.
- [ ] T008 Change `src/sheet_manager/features/sheet/data/catalogBindings.ts` (R4):
    - add `getCatalogBinding(id)`, which checks shipped catalogs first, then `userCatalogBinding(registry.getUserCatalog(id))`;
    - add `listCatalogBindingsFor(template)`, which returns `{ setting: [...user], ruleset: [...user], shipped: [...plugin catalogs of template.systemId] }`;
    - `readCatalogDetails` and `validateBindingFills` use the lookup.

    Replace every other `CATALOG_BINDINGS.get` and `CATALOG_BINDINGS` iteration outside docs embeds with the lookup: `hooks.ts`, `primitives.tsx`, `RowsBody.tsx`, `catalogSuggestions.ts`, `itemDisplay.ts`, `templateReferences.ts`, `templateFile.ts`, and `CatalogBindingEditor.tsx`. Docs embeds keep shipped-only iteration.

- [ ] T009 [P] Add the `#label` companion to `src/sheet_manager/types/templateValues.ts` (R3):
    - `pickLabelKey(key)` and `pickLabelBase(key)`;
    - raise the `TemplateTableRowSchema` key limit to 72.

    In `src/sheet_manager/features/sheet/data/templateValueWrites.ts`, validate `#label` bag writes as bounded strings when the base key is a catalog-bound select, and allow `<columnId>#label` cells in rows of a table whose column is a catalog-bound select.

- [ ] T010 In `useTemplatePage` (`src/sheet_manager/features/sheet/declarative/hooks.ts`), subscribe to `useDocumentTypeStore((s) => s.catalogs)` and add it to the dependencies of `resolveCatalogField` and every catalog resolver (R5).
- [ ] T011 [P] Create `tests/sheet_manager/user-catalogs.test.ts`:
    - schema: types, unknown columns dropped, limits;
    - owner shapes, `catalogOwnerKey`;
    - `catalogScopeOf` for a user setting page, a user type page in a user setting, a Rules only page, a Hunter page, a Star Wars page, and a user type owned by Star Wars;
    - the adapter's entries, `fillableDetails`, and labels;
    - the overlay lookup with `getCatalogBinding`: user and shipped ids, a missing id.
- [ ] T012 [P] Extend `tests/sheet_manager/document-type-store.test.ts`: the v2 → v3 migration, a malformed catalog quarantined, and save and remove.

**Checkpoint**: user catalogs exist in the store and resolve through `getCatalogBinding`. Existing tests pass (`yarn vitest run tests/sheet_manager`).

---

## Phase 3: User Story 1 - Create a catalog in a setting or ruleset (P1) 🎯 MVP

**Goal**: catalogs are listed, created, and edited in the library, on settings and on rulesets, with shipped catalogs read-only.

**Independent test**: `library-tree` catalog cases, `catalog-edit.test.ts`, and the library dialog create and edit flow.

- [ ] T013 [P] [US1] Create `src/sheet_manager/features/sheet/data/catalogEdit.ts` (R8):
    - `addColumn`, `renameColumn`, `retypeColumn` with `retypeLosses`, `moveColumn`, and `removeColumn`;
    - `addEntry`, `updateEntry`, `moveEntry`, `removeEntry`, and `duplicateNames`;
    - `parsePastedEntries(text, columns)`, which returns `{ entries, rejected }`;
    - `convertValue(value, from, to)`, following the R8 table;
    - `catalogUsage(catalogId, templates)`, which returns the templates that bind the catalog (fields, lists, table columns) and, per column id, the mappings that use it; the details pane, the column delete, and the library delete and move plans all read it;
    - every function is pure over `UserCatalog`, and the limits are checked through the `TEMPLATE_LIMITS` catalog constants.
- [ ] T014 [P] [US1] Create `tests/sheet_manager/catalog-edit.test.ts` with the operations and the limits:
    - every conversion path;
    - paste with tabs, CRLF, missing and extra cells, a non-numeric number, and an empty name;
    - duplicate detection;
    - `catalogUsage` finds a field, a list, and a table column binding, and the mappings of each column.
- [ ] T015 [US1] Extend `src/sheet_manager/features/sheet/data/libraryPages.ts` and `libraryTree.ts` (R6):
    - `CatalogRef` and `catalogNodeKey` (`c:user:<id>`, `c:<systemId>:<catalogId>`);
    - `CatalogNode` with `level: 'catalog'`;
    - `catalogs` on `RulesetNode` and `SettingNode`;
    - placement: user catalogs by owner, and shipped catalogs by their declaring plugin (a ruleset plugin under the ruleset, a setting system under its setting);
    - catalogs of an unknown owner go to "Unavailable";
    - `LibraryInput.catalogs`;
    - `childrenOf` lists catalogs first;
    - `filterTree`, `findNode`, `flattenVisible`, `hasUserContent`, and `containerKeys` handle the new level.
- [ ] T016 [US1] Extend `tests/sheet_manager/library-tree.test.ts`:
    - Relics under Ashen Realms and Firearms under WoD 5e, before the settings;
    - the shipped Star Wars catalogs under Star Wars, read-only, and the V5 catalogs under the ruleset;
    - the "Only yours" filter keeps user catalogs;
    - search finds a catalog by name;
    - an unknown owner is listed under "Unavailable".
- [ ] T017 [US1] Add `createCatalog(owner, name, state)` to `src/sheet_manager/features/sheet/data/libraryActions.ts`:
    - it returns `LibraryWrites` with `catalogs`;
    - it refuses when the owner already has 50 catalogs;
    - `renameItem` covers catalogs;
    - `LibraryWrites` and `applyLibraryWrites` carry catalog changes through `replaceCatalogs`;
    - `readLibraryState` includes `catalogs`.
- [ ] T018 [US1] Update the library UI for the catalog level:
    - `components/dialogs/library/TreeRow.tsx`: the `Table2` icon and the entries count plural;
    - `LibraryTree.tsx`;
    - `actions.ts` and `ContextMenu.tsx`: "New catalog" on rulesets and settings; Rename, Move…, Export, and Delete on user catalogs; nothing on shipped catalogs;
    - `CreateForm.tsx`: the catalog variant, name only;
    - `LibraryDialog.tsx`: wire the creation, reveal the new node, and include catalogs in the store selectors passed to `buildLibraryTree`.
- [ ] T019 [US1] Create `src/sheet_manager/components/dialogs/library/CatalogTable.tsx` following contracts/catalog-ui.md "Catalog details pane", and render it from `DetailsPane.tsx` for catalog nodes:
    - header, toolbar, and table;
    - column header controls, typed cells, row moves and delete, and the duplicate and empty-name marks;
    - the paste dialog with its preview;
    - the limit notes;
    - "Used by N templates" in the header and the `ConfirmDialog` for deleting a mapped column, both from `catalogUsage`; a `ConfirmDialog` for a retype with losses;
    - read-only mode for shipped catalogs;
    - every edit goes through `catalogEdit.ts` and one `saveCatalog`;
    - `th scope="col"` and labelled icon buttons;
    - rows are memoized components keyed by entry id, so editing one cell re-renders only its row (plan performance goal).
- [ ] T020 [US1] Extend `tests/sheet_manager/library-dialog.test.tsx`:
    - create "Relics" on Ashen Realms and "Common firearms" on the ruleset;
    - add a column and an entry;
    - paste two lines plus one rejected line;
    - retype with confirmation;
    - a shipped catalog shows no edit controls;
    - a 1000-entry catalog renders, and one cell edit re-renders only its row (a render counter on the row component).

**Checkpoint**: US1 can be tested on its own.

---

## Phase 4: User Story 2 - Pick from your catalog in a choice field (P1)

**Goal**: choice fields bind user catalogs (setting and ruleset scope) and fill their targets.
Documents store the entry id plus `#label`.

**Independent test**: the field cases of `catalog-use-sites.test.tsx` and the editor picker test.

- [ ] T021 [US2] Change `src/sheet_manager/components/dialogs/template-editor/CatalogBindingEditor.tsx`:
    - the picker uses `listCatalogBindingsFor(draft template)` with the option groups "This setting", "<ruleset>", and "<system> catalogs";
    - a "?" link goes to `EDITOR_GUIDE.catalogs`;
    - user catalog details are labelled by column name.

    Also make `validateTemplateReferences` in `src/sheet_manager/features/sheet/data/templateReferences.ts` resolve catalogs in the template's scope: a user catalog outside the scope becomes `unknown-catalog`.

- [ ] T022 [US2] Update `src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx` (`FieldCell.handleChange`) and `fieldControls.tsx`:
    - picking an entry of a user catalog also writes `pickLabelKey(valueKey)` with the entry name, in the same `applyWrites`;
    - the select and the searchable pick show the live entry name, or the `#label` text when the entry or catalog is missing (a disabled extra option or the suggest text);
    - `coerceStoredValue` keeps unknown ids for bound selects;
    - a catalog with no entries shows the "No entries yet" text instead of an empty choice.
- [ ] T023 [US2] Create `tests/sheet_manager/catalog-use-sites.test.tsx` (the field part):
    - picking Black Mirror writes the id, `#label`, 4, and on in one change;
    - a rename shows the new name;
    - deleting the catalog shows "Black Mirror" and reports `catalog-unavailable`;
    - a template of another setting cannot bind Relics (reference issue);
    - a Hunter page can bind the ruleset's Firearms;
    - above 12 entries the pick is searchable;
    - a catalog with no entries shows "No entries yet".
- [ ] T024 [US2] Extend `tests/sheet_manager/template-editor.test.tsx`: the picker groups for an Ashen Realms draft list Relics, Firearms, and the V5 shipped catalogs, and the Relics mapping editor lists Power and Cursed.

**Checkpoint**: US1 + US2 make up the MVP.

---

## Phase 5: User Story 3 - Suggestions in lists and table columns (P2)

**Goal**: custom lists suggest catalog entries and fill their value, and table choice columns
fill their own row.

**Independent test**: the list and table cases of `catalog-use-sites.test.tsx`.

- [ ] T025 [US3] Add `catalog?: { catalogId, valueFrom? }` to `ListNodeSchema` in `src/sheet_manager/types/template.ts`. A refine rejects it without `valueKey`. In `templateReferences.ts`, check that the catalog is known and in scope, and that `valueFrom` names a number column (or a number detail of a shipped catalog).
- [ ] T026 [US3] In the value-bag custom list body (`primitives.tsx`, the `CustomTraitList` call), pass `catalog` entries (id, name) and `onCatalogSelect`:
    - a pick sets `label` to the name;
    - with `valueFrom`, it also sets `value` to that column, clamped to 0–20;
    - free text stays allowed.

    Add the list catalog picker and the "Value from" select to the list settings in `src/sheet_manager/components/dialogs/template-editor/ElementSettings.tsx`, or its list section.

- [ ] T027 [US3] Table choice columns (R10):
    - add `setRowValues(blockId, rowIndex, cells)` to `useTemplatePage` (`hooks.ts`);
    - in the table cell `onChange` of `DeclarativeSheetView.tsx`, a bound select column writes its value, `#label` for user catalogs, and every fill whose target is a sibling column id, in one call;
    - `templateReferences.ts` validates column fill targets against the table's columns;
    - `CatalogBindingEditor.tsx` offers only sibling columns as targets when the field is a table column (pass the sibling columns in through the column editor).
- [ ] T028 [US3] Extend `tests/sheet_manager/catalog-use-sites.test.tsx`:
    - list: typing "Bo" suggests Bone Flute, and picking it sets the name and 2; free text is kept;
    - table: picking in row 2 fills only row 2; the value and `#label` are stored in the row;
    - a fill target outside the table is a reference issue.

---

## Phase 6: User Story 4 - Move, delete, export, and import catalogs (P2)

**Goal**: library parity for catalogs, including ruleset scope loss and the v2 library file.

**Independent test**: `library-moves`, `library-file`, and `library-import` catalog cases.

- [ ] T029 [US4] Extend `src/sheet_manager/features/sheet/data/libraryMoves.ts` (R7):
    - catalog targets are rulesets and settings;
    - `canMove` rejects the current owner and "Unavailable";
    - `planMove` for catalogs rewrites the owner and computes `lostBy` (the templates that bind the catalog and would lose it from their scope);
    - `crossesSystem` is true when `lostBy` is non-empty;
    - setting moves carry the setting's catalogs; a setting moved to another ruleset also computes `lostBy` for the old ruleset's catalogs that its templates bind (through `catalogUsage`), and the confirmation names them;
    - the move and delete confirmations of a setting list the catalogs that go with it.

    Extend `deletePlan` in `libraryActions.ts`:
    - deleting a catalog lists the bound templates (`catalogUsage`);
    - deleting a user setting deletes its catalogs.

    Surface the consequences in `MovePanel.tsx` (`MoveConsequences`) and the delete confirmation.

- [ ] T030 [US4] Extend `tests/sheet_manager/library-moves.test.ts`:
    - Relics to a Star Wars setting lists the Ashen Realms templates that bind it;
    - Firearms from the ruleset down to Ashen Realms lists a Hunter template;
    - Relics up to WoD 5e loses nothing;
    - moving Ashen Realms carries Relics, and moving it to WoD 2e lists its templates that bind the V5 ruleset's Firearms;
    - deleting Ashen Realms deletes Relics;
    - deleting Relics lists its templates.
- [ ] T031 [US4] Library file v2 (R11), in `src/sheet_manager/features/sheet/shell/libraryFile.ts`:
    - bump to version 2 and add `catalogs` to the payload and the schema;
    - the `exportableKeys` and `tickState` catalog nodes are pickable;
    - `exportClosure` adds catalogs bound by picked templates as `auto`, adds their user setting as `auto`, and turns a ruleset or shipped owner into an address;
    - `parseLibraryFile` accepts versions 1 and 2.

    In `libraryImport.ts`:
    - catalog preview states, comparing everything except `updatedAt`;
    - Replace and Keep both, where Keep both issues a new id, adds the "(imported)" suffix, and rewrites the bindings (field, list, table column) of the picked templates of the same file;
    - the per-owner limit becomes `unavailable` with the reason `limit`;
    - `installImport` writes the catalogs through `replaceCatalogs`.

    Show catalog rows in `ImportPreview.tsx` and `ExportPanel.tsx`.

- [ ] T032 [US4] Extend `tests/sheet_manager/library-file.test.ts` and `tests/sheet_manager/library-import.test.ts`:
    - the v2 round trip;
    - v1 still imports;
    - the closure adds Relics for a picked template bound to it, and Firearms as an address;
    - conflict, then Keep both, rebinds the imported template;
    - an import over the limit marks the extra catalogs unavailable;
    - an older template file (`ttgamer-template` v3) with a table choice column bound to a shipped catalog, and one without bindings, import with 0 new issues (SC-005).

---

## Phase 7: User Story 5 - Guide and storybook (P3)

**Goal**: authors learn catalogs from the guide, and the storybook shows the three use sites.

**Independent test**: the storybook guard, and `yarn validate:i18n`.

- [ ] T033 [P] [US5] Guide: in `docs/template-editor/values.mdx` (the Catalogs section, "Your own catalogs") and `docs/template-editor/library.mdx`, plus their mirrors under `i18n/ru/docusaurus-plugin-content-docs/current/template-editor/`, describe:
    - where catalogs live (a setting or a ruleset, and scope);
    - columns and entries, and pasting;
    - binding fields, lists, and table columns;
    - move and delete behavior;
    - read-only shipped catalogs.

    Run `yarn validate:i18n`.

- [ ] T034 [P] [US5] Storybook:
    - `src/sheet_manager/storybook/stories.ts` gets a sample user catalog, installed in the story sandbox through the registry overlay, with no store write in docs;
    - add a choice field, a custom list, and a table with a choice column, all bound to it;
    - `tests/sheet_manager/storybook.test.tsx` requires the tags `select:user-catalog`, `list:catalog`, and `table:catalog-column`.

    Show the details table on `docs/dev/storybook/library.mdx` if the library story renders catalogs.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T035 [P] Update the current-state docs:
    - `.agents/skills/sheet-templates/SKILL.md`: the Catalogs part (user catalogs, the owner and scope, `getCatalogBinding`, `#label`, list and table use) and the Library part (the catalog level, the file v2);
    - the overlay line in `src/sheet_manager/AGENTS.md`;
    - `AGENTS.md` section 8, if it names catalogs;
    - historical banners (constitution "Current-state documentation"): on `specs/013-library-tree-accents/contracts/library-file-format.md` and in `specs/013-library-tree-accents/spec.md`, saying the library file is now version 2 (spec 015, catalogs) and pointing at the sheet-templates skill.
- [ ] T036 [P] Add a v3.13.0 entry to `CHANGELOG.md` and bump the version in `package.json`, then run `yarn check:version`.
- [ ] T037 Mark T-074 done (`[x] ✅`) in `TODO.md` with a dated note, then run `yarn validate:backlog`.
- [ ] T038 Run `yarn verify:full` and fix everything it reports.
- [ ] T039 Walk through the quickstart manually (the maintainer).

---

## Dependencies & Execution Order

- **Setup (T001–T003)** comes first.
- **Foundational (T004–T012)** blocks every story. T005 comes before T006–T008. T009 is independent. T011 and T012 follow their code.
- **US1 (T013–T020)** needs Foundational. T013 and T014 run in parallel with T015–T016.
- **US2 (T021–T024)** needs Foundational. It can use the fixtures without the US1 UI, but the MVP demo needs both.
- **US3 (T025–T028)** needs US2's pick and `#label` path (T022).
- **US4 (T029–T032)** needs US1's tree and actions (T015, T017).
- **US5 (T033–T034)** needs US2 and US3 for the storybook.
- **Polish (T035–T039)** comes last.

## Parallel Examples

- After T005: T009 ∥ T011.
- US1: T013 + T014 ∥ T015 + T016.
- US5: T033 ∥ T034.
- Polish: T035 ∥ T036.

## Implementation Strategy

1. Build Foundational, then US1 (the library catalogs) and US2 (the choice fields). That is the MVP: an author makes a catalog and uses it.
2. US3 adds the two further use sites.
3. US4 brings library parity (move, delete, and file). It is needed before sharing settings that have catalogs.
4. Finish with US5 and Polish, then `verify:full`.
