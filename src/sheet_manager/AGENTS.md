# Sheet Manager Module

## Scope

The universal sheet implementation supports Star Wars WEG/WoD characters, droids, creatures,
vehicles, and fodder groups, Hunter: the Reckoning 5e characters, engine-only WoD 2e and V5
characters, and user-defined document types and settings (spec 012). Definitions own their schemas
and named views; do not fold kind-specific state into the shared document envelope.

## Structure

```text
src/sheet_manager/
├── components/               # reusable UI, grouped by visual responsibility
│   ├── controls/             # generic inputs: checkbox, textarea, catalog picker
│   ├── dialogs/              # create/confirm/import-conflict/library modal flows
│   │   └── library/          # library tree, details, move, export and import panels (spec 013)
│   ├── documents/            # the documents window: tree, details, toolbar, move picker (spec 032)
│   ├── sections/             # collapsible panels, cards, tables
│   └── stat-fields/          # atomic traits, dots, labels, Force and merit/flaw rows
├── context/                  # read-only CharacterContext
├── features/documents/       # the documents tree as data: rows, query, operations, history (spec 032)
├── features/template-editor/ # template editor (spec 025): session/, operations/, commands/,
│                             # model/, issues/, elements/, settings/, panels/, components/
├── features/sheet/           # the assembled interactive sheet
│   ├── shell/                # toolbar, view selector, workspace-level import/export state,
│   │                         # library entry, template/type/library file transfer modules
│   ├── body/                 # character equipment and implant editors
│   ├── declarative/          # template page renderer: fields, tables, primitives, member
│   │                         # tracks, bound document access, page hook
│   ├── registry/             # template field type → control mapping
│   ├── data/                 # sheet-local catalog adapters + catalog binding registry,
│   │                         # pure library tree, actions, moves, retarget planners
│   └── hooks/                # sheet-local behavior hooks
├── hooks/                    # useCharacter and update helpers
├── systems/                  # neutral contracts (registry, types, view, templateBindings,
│   │                         # catalogs, policies, userTypes, userCatalogs) + one folder per system plugin:
│   ├── wod2e/                # classic WoD 2e ruleset (`ruleset/`) + the engine plugin `wod-2e`
│   ├── star-wars-wod/        # Star Wars setting on the WoD 2e ruleset (identities frozen)
│   └── v5/                   # V5 ruleset (`ruleset/`), engine character (`core/`), modules (`modules/hunter/`)
├── templates/                # setting-neutral template node builders
├── store/                    # documentStore (v5: index + one record per document) + templateStore (library, v5) + documentTypeStore (user types/settings, default pages, catalogs, v3)
└── types/                    # generic contracts, template schema, templateValues bag
```

`components/` must never become a catch-all folder. Put a component in `stat-fields/` only when it
renders one concrete stat/trait value; put a complete document or a top-level section in
`features/sheet/`. Shell controls and their dialogs belong in `features/sheet/shell/` and
`components/dialogs/`, respectively.

## Composition Scale

Use dependency direction, not component size, to classify sheet UI:

1. **Atoms** (`components/controls`, `components/stat-fields`) render one input or value. They
   receive values and callbacks, and must not read document context, stores, systems, or
   persistence. Generic inputs live in `controls/` (e.g. `CatalogSuggest`, which owns its own
   keyboard navigation because its input sits outside the portalled list); `stat-fields/` renders
   one concrete stat. Extend an existing atom with an optional prop before adding a new one.
2. **Molecules** (`components/sections`) combine atoms into one reusable interaction such as a trait
   group, resource group, tracker (`stat-fields/Tracker.tsx`: table, strip, or one line, or a pool's
   rating-like row; copies, −/+ length, fill and outline layers, a legend brush, the outline action
   by right click, Shift+Enter, or long press; own, built-in, and pool trackers share it, specs
   018–020), or editable table. They may accept definition/profile data but must not select the
   current document.
3. **Bound elements** (`features/sheet/declarative`, `features/sheet/body`) adapt document data to
   molecules through bindings (`useBoundDocument`, `useBodyHandlers`). They must not decide which
   document view is active or render a workspace shell.
4. **Views** are shipped templates (`systems/<system>/templates/`): declarative trees composed from
   bound elements. There are no hand-written view components; a new page is a template.
5. **Shells** (`features/sheet/shell`) own collection, import/export, toolbar, and active-view
   concerns. They do not contain system mechanics.

Book-term labels (spec 009) live in `components/terms/`: `TermLabel` is an atom-level renderer with
no state or listeners of its own; `TermHintProvider` (one per sheet view) owns the delegated
listeners and the single hint popover. Whether a label is a book term is glossary data, never a
system conditional.

Document definitions own the available views, each backed by a shipped template of the same id and
kind. A brief is a representation, not a document kind: every definition registers its own brief
view (aliases `brief`/`npc-card` where older data may use them). Keep obsolete persisted view IDs as
definition-owned aliases until their data can no longer exist. View labels are definition-owned
translation descriptors; shells must not maintain view-ID label maps.

Brief look (spec 033): the sheet root is the named size container `brief` (`@container/brief`), and
brief layout reads its width, never the window's. A group with `layout: 'area'` is drawn in the
brief look: no box, a heading over a hairline (`SectionCard dense`), three columns (one under 260
px), and cells that are rows in a narrow area and wrapping chips from the `md` container width;
children without a `column` flow by natural width. Shipped briefs go through `dense()` /
`denseBrief()` (`templates/builders.ts`); their weapons list starts collapsed. Spacing and heading
classes come from `features/sheet/declarative/briefRhythm.ts`; add a compact form there, not a
private gap. A rating with `shortForm` draws a short label (the author's `shortLabel`, else the
glossary's `abbr`/`ruAbbr`, else the first three letters; `shortLabels.ts`) while the full name
stays the input's name and the hint of the cell; a clash inside one group falls back to the full
label. Do not use `.term-row` for a cell that must size by its content (it is an inline-size
container). Contrast of the brief's colours is computed from the palette in
`tests/sheet_manager/brief-contrast.test.ts`; measured heights are pinned by
`tests-e2e/smoke/brief-layout.spec.ts` against `brief-baseline.ts`.

Prefer capability adapters for related payloads. For example, sentient and droid documents share
character trait/equipment blocks; the droid adapter maps its mechanical `damage` track to the shared
condition capability without changing persisted field names. Labels and track profiles remain
definition-owned configuration. Shared views route by capability presence
(`capabilities.character`), never by `definitionId` string matching. Retired pre-template blocks and
views are archived for reference in `context/sheet-manager/legacy-sheet-components/`.

## Character Access

Bound template elements use `useBoundDocument()` (any kind, including `dataKey` equipment); Star
Wars equipment and legacy-shaped character helpers use `useCharacter()`:

- viewer context wins when present;
- otherwise the editable Zustand character is used;
- updates are ignored in read-only context.

Do not read `currentCharacter` directly inside a reusable sheet element. Direct store access is
appropriate for layout/manager operations that explicitly manage the collection.

## Systems, Modules, and Publisher Notices

- A new game system is a `SystemPlugin` folder under `systems/`; generic code must not import it
  (ESLint). Plugins declare catalogs, policies, templates, and bindings; nothing is special-cased
  for Star Wars.
- Rulesets shared by several lines keep shared mechanics in `ruleset/` and lines in
  `modules/<line>/` (see `.agents/skills/sheet-manager/SKILL.md`). A document carries one module.
- Publisher policies come from `systems/policies.ts` (the Dark Pack covers V5 material only; WoD 2e
  and Star Wars declare none); `SheetWorkspace` renders only the badge (`PolicyBadges`, linking to
  the policy's docs page) outside the template tree so no template can remove it, and exports carry
  `notices`. The full text lives on one docs page.
- Dice mechanics belong to the ruleset (`SystemPlugin.dice`): `traitPool` builds a stat's notation
  (a plugin without it shows no stat dice button; Star Wars declares the classic
  `systems/wod-like/dicePool.ts`, V5 its own 6+ pool), and an optional `reading` (V5:
  `systems/v5/ruleset/dice.ts`) adds critical pairs and reads special-dice outcomes. Each V5 module
  contributes its dice line (`modules/hunter/dice.ts` Desperation, `modules/vampire/dice.ts` Hunger,
  awaiting the vampire sheet). Primitives resolve the builder with `useDocumentTraitDiceRoll()`, and
  so do template ratings with a die; the die is `StatDiceButton` (used by `StatDot` and
  `RatingRow`), which sends the document as the roll source (`useDocumentRollSource()`), and
  `SheetWorkspace` publishes the shown document (`integrations/sheet-dice/shownDocument.ts`).
  Publisher badges never appear on dice surfaces.
- Shipped view ids are unique across systems (prefix them with the system, e.g. `v5-hunter-sheet`);
  edited defaults are keyed `systemId:viewId` (T-046, template store v5).
- The Star Wars system is a setting on the WoD 2e ruleset (`systems/wod2e/ruleset/`: engine schema
  shape, profile, bindings, page parts; spec 012). Its identities — system id, definition ids,
  kinds, views, coordinates, data fields — are frozen; `tests/sheet_manager/systems/wod2e/` guards
  parse, page, and dice parity. The engine plugin `wod-2e` ships an engine-only character.
- A setting system declares the ruleset it plays on (`SystemPlugin.ruleset`; Star Wars: `wod-2e`);
  plugins without it are rulesets. The library (spec 013) groups by it: ruleset → "Rules only",
  modules, setting systems, user settings. Current-state detail: the sheet-templates skill
  ("Library").
- User document types and settings (spec 012) reach generic code only through the registry overlay
  (`systems/userTypes.ts`, `SystemRegistry.setUserDocumentTypes`); `user-` documents keep every
  value in `templateValues`. User catalogs (spec 015) do the same through `setUserCatalogs` and are
  read with `getCatalogBinding`. Current-state detail: the sheet-templates skill.

## Documents: Storage, Tree, and Window

Spec 032 replaced the manager modal and the one-value document storage. Current rules:

- **Storage (v5).** The persisted store value is slim: `entries` (one light index entry per
  document: id, name, kind, system, definition, setting, template, `parentId`, `rank`, created and
  changed times, `updatedAt`), `folders`, `pendingPurge`, `currentDocumentId`, `recoveryEntries`.
  Each document is its own record `doc:<id>` (JSON text) in the same localForage database
  (`store/documentContent.ts`); `documents` in the store is only the loaded cache (the open one and
  up to eight others). Readers that need only identity, kind, setting, or name read `entries`
  (`DocumentRef`, `documentRefs`); anything that needs data loads by id (`openDocument`,
  `loadDocuments`). Place, order, and times live only in the index: the envelope, the export file,
  and the cloud contract are unchanged.
- **Writes.** A mutation updates the loaded envelope and its entry in one `set`; a subscriber saves
  changed records at once, coalesced within a task, and flushes on `pagehide`. `changedAt` moves at
  most once per 5 s per document. Two tabs merge the index by id (newer `updatedAt` wins).
- **Delete is a tombstone.** Deleting removes the entry and lists the id in `pendingPurge`; the next
  start's sweep removes exactly those records (and portraits). A record with no entry and no
  tombstone gets its entry rebuilt, never deleted. Folders use the same list.
- **Migration.** `migrateToIndexedState` writes `universal-character-storage:v4-backup` first, is
  idempotent, and a failure blocks saving until reload; the backup goes after two clean launches.
  T-114 removes it all (after 2027-04-13).
- **Tree operations** (`features/documents/operations.ts`) are the only way the tree changes:
  `createFolder`, `rename` (folders and documents), `move` (with `before` for order), `delete` (a
  folder takes its contents), and `restore` (the inverse of the others). `applyOperations` is pure,
  returns the inverse, and refuses with problems (cycle, depth 32, missing, not a folder) while the
  rest of the batch applies; `describeOperation` is the preview line. The window and a future AI
  role call the same functions through `store.applyTreeOperations` and `treeActions.ts` (undo and
  redo, 50 steps, in memory until reload). A document rename also writes the document's name value
  and title.
- **Query** (`features/documents/query.ts`) is pure and registry-free (labels come from a
  `DocumentLabeler`): normalized names built once per entries list, filters, sort, ancestors kept
  and opened; unknown times are never invented. The window keeps the query in session storage.
- **The window** (`components/documents/`) is a shared `FloatingWindow` over the shared `TreeView`;
  closed, it renders nothing. Phone: full screen, modal, page behind it locked, tree and details as
  tabs, drag replaced by "Move to…". Names are typed in place (`InlineName`), never in a dialog. A
  click only selects a row and shows its details (T-116); a document opens by double click, `Enter`,
  or the Open actions. On a phone a tap selects and switches to the details tab.

### Several documents on one screen (spec 034)

- **Panes** (`features/sheet/panes/`): `PaneArea` replaces the single page of `SheetWorkspace`
  (`renderDocument(documentId, viewId)`); with one document it renders exactly what the page always
  drew (no strip, divider, or wrapper). Two or more get `PaneTabs` and one `Pane` each.
- **Source per pane.** A pane wraps its page in `PaneSourceProvider`, a `DocumentSourceContext`
  value from `useStoreDocumentSource(documentId)` (selector subscriptions), so every bound element,
  roll, and write reads the pane's own document. `AreaLayoutContext` (`declarative/areaLayout.ts`)
  makes the sheet's group columns follow the pane width (`@3xl`/`@7xl` of the `brief` container at
  the window's `md`/`xl` widths) and drops the window-sized padding.
- **Current = focused.** `currentDocumentId` stays the one "current" fact: clicking or typing in a
  pane calls `setCurrentDocument`, and `reconcilePanes(state, currentId, entryIds)` derives the
  panes from it (**Open** takes the place of the pane focused last, deleted documents drop out).
  **Open beside** is `openBeside(id)` (at most `MAX_PANES` = 6; the least recently focused is
  replaced and reported). The documents window and the shown-document publisher need no pane code.
- **Cache.** The loaded cache keeps `pinnedIds` (the panes' documents) beside the current one;
  `loadIntoCache(ids)` reads documents without making them current.
- **Layout** (`layout.ts`): below 768 px one pane and the tabs; from 768 px as many panes as fit at
  320 px (`floor((width + 6) / 326)`, 6 px dividers), the most recently focused ones, drawn in pane
  order; widths are weights (average 1) fitted to the area, never stored in px. Double click on a
  tab or the pane's button maximizes it (desktop only).
- **Views.** A pane's view is `views[id]` (a view id or `tpl:<page>`): a document opened beside
  starts in its brief (`briefViewOf`: `brief` or `*-brief`), the document's own preferred view is
  never written, and with two or more panes the toolbar's view selector gives way to one per pane.
- **Persistence.** The arrangement is the device's (`ttgamer:panes:v1` in localStorage, read when
  the module loads, `readArrangement` sanitizes it); it is not exported, synced, or undoable.

## Schema and Import/Export

- `DocumentEnvelopeSchema` plus the registered definition schema are the runtime boundary for
  current JSON imports. The one legacy shape is the flat character the first versions exported
  (untagged JSON): `systems/star-wars-wod/legacyExport.ts` repairs and converts it (an armor item
  without a name takes its old `type`; a current value above its maximum raises the maximum),
  `store/documentStore.ts` (`readLegacyExport`) is the only door generic code uses, and support ends
  on `LEGACY_EXPORT_END` (2027-04-13): `tests/sheet_manager/legacy-export-end.test.ts` then fails
  and lists what to delete (module, fixture, tests, this paragraph).
- A character's shape belongs to its system: engine fields in `systems/wod2e/ruleset/schema.ts`,
  Star Wars additions and `createDefaultCharacter()` in `systems/star-wars-wod/schema.ts`. Generic
  code reads a character only through `CharacterView` (`systems/capabilities.ts`) and the neutral
  atoms in `types/` (`trait`, `condition`, `equipment`); `tests/sheet_manager/boundaries.test.ts`
  guards it.
- A batch import (`features/sheet/shell/importBatch.ts`) never stops at a bad file: invalid files
  are kept as recovery records (`store/recoveryRecord.ts`, bounded at 100), the batch ends with one
  summary, and a collision choice may be applied to the rest of the batch. The documents window
  downloads the records as a recovery file (`ttgamer_recovery_<date>.json`); importing that file
  retries each record, removes those that import, and updates those that still fail.
- Blank/missing character names normalize to `''`; the UI displays `New Character` where a label is
  required.
- IDs are opaque non-empty strings, not necessarily UUIDs, because presets and compatibility data
  may use stable textual IDs. New ones follow the device-id rule in the root `AGENTS.md` §8; user
  type, setting, and catalog schemas accept the old 8-character and the new 32-character tails.
- Numeric resource and dot values must be finite integers within their schema limits.
- `forcePowerItems` is the single Force-power representation. Retired `forcePowers` and
  `customForcePowers` keys are stripped as unknown input.
- Zod 4 object parsing strips unknown keys by default. Do not change schemas to `z.looseObject()`
  without a migration/security reason.
- A Zod 4 `.default(value)` returns the value without parsing it, so inner defaults do not apply.
  Use `.prefault(value)` where the default object must still pass through the schema (V5 blocks,
  `templateValues`, tracker `valueColumn`). Tests assert issue `path` and `code`, never message
  text, and code never branches on a Zod issue code.
- An import that collides with a stored ID must offer Replace, Duplicate (new ID), or Cancel.
- Export names start with `ttgamer_`; a blank title uses the document definition ID.

Persistence uses a Zustand version and migration strategy. Invalid legacy or current entries are
retained in the bounded recovery collection instead of being silently discarded.

Generic documents use validated open-ended kind identifiers so non-character records do not require
a core enum change. Built-in systems register code-owned shipped templates; user templates use the
bounded declarative schemas in `types/template.ts` and must never contain executable code.

## Custom Page Templates

The current-state reference is `.agents/skills/sheet-templates/SKILL.md` — load it before any
template change. Specs 003–006 are change history, not a description of today's system; do not
duplicate template facts here. Invariants that must never be broken:

- Templates are declarative trees and never contain executable code; they never enter document
  definition schemas.
- Custom values live in the flat `templateValues` bag keyed by coordinate (`valueKey ?? id`); system
  values live in `document.data`. Orphaned values are never deleted.
- Pass the resolved template object to the store write path; never look templates up by id
  (`getTemplate` sees only user templates, not shipped defaults or overrides).
- Every graceful-degradation path (rejected write, quarantine, unresolved binding, missing catalog,
  broken formula) reports through `diagnostics.ts` `reportSheetIssue`. Silent fallbacks are bugs.
- A template change is not done until the skill reflects it.
- Editor element kinds (Group · Section/Card, List · Entries/Table, spec 022) are presentation:
  stored node types stay `section`, `group`, `list`, `table`, and switching never migrates document
  values (the save asks when values of the earlier kind exist).
- Every editor setting has a visible label and a `data-setting` key; draft issues point at it. A
  schema rule a save finds without a specific check reports `template-draft-invalid`.
- The editor has one owner per extension point (spec 025): settings in
  `template-editor/settings/registry.ts`, element types in `elements/registry.tsx`, commands in
  `commands/list.ts` (keys, the element menu, the shortcut list, and the guide's table come from
  it), save warnings in `session/saveChecks.ts`. Every change goes through the editing session
  (`session/store.ts`); commands act on the normalized selection as one undo step. Copied elements
  are clipboard text other editors (and authors) paste: always parse them with the template schema
  before use (`template-clipboard-invalid`).

## Derived State

- `calculateHealthPenalty()` (`systems/wod2e/ruleset/schema.ts`) uses the deepest marked health
  level.
- Virtues define the minimum Willpower (`min(passion + self-control, 10)`) and Dark Side Resistance
  (`max(0, min(5 + conscience - passion, 10))`); the default template shows these minimums as
  read-only Derived Stats, while the editable resources live in the Force section's Resources group.
  Merits/flaws may raise the stored values.
- Current Force Points may legitimately be zero.
- Detailed formulas are in `.agents/skills/sheet-manager/SKILL.md`.

## UI Rules

- Reuse proven sheet primitives before creating type-specific equivalents. New definitions should
  compose existing collapsible sections, trait/dot controls, health/resource trackers, equipment
  editors, and documentation-link patterns. If a primitive is nearly reusable, extract or
  parameterize it at the narrowest system-independent boundary instead of cloning a weaker
  implementation.
- Model WoD-family differences as definition-owned configuration and block composition (trait
  groups, resource tracks, special-power blocks, labels, limits), not copied sheet pages. Reserve
  bespoke React blocks for genuinely different interaction models.
- An element a setting needs is built as a template element user templates can configure in the
  editor, preferably as an option on an existing element; it and its variants appear in the element
  storybook (constitution VI; how-to in the `sheet-templates` skill).
- `TraitRowWithInput` is controlled by `specializationText`; parent/store changes must appear
  immediately.
- Icon-only actions require accessible labels.
- Use Radix primitives for new modal behavior. A modal must label itself, trap focus, close on
  Escape, and restore focus to its trigger.
- Portrait URLs accept only HTTPS or site-relative resources and must use
  `referrerPolicy="no-referrer"`. Local portraits are resized, quota-bounded IndexedDB blobs; never
  put image data URLs or blob contents in Zustand/localStorage JSON.

## Testing

Run schema/import/derived-stat tests for changes to `types/`, persistence, or import/export, then
the checks for the change size (`AGENTS.md` §11). Load `.agents/skills/sheet-manager/SKILL.md` for
schema, store, or derived-stat changes and `.agents/skills/sheet-templates/SKILL.md` for pages,
bindings, or docs embeds.
