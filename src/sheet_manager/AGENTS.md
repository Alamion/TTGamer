# Sheet Manager Module

## Scope

The universal sheet implementation supports Star Wars WEG/WoD characters, droids, creatures,
vehicles, and fodder groups, Hunter: the Reckoning 5e and Vampire: the Masquerade 5e characters,
engine-only WoD 2e and V5 characters, V5 Storyteller characters and groups (spec 040), and
user-defined document types and settings (spec 012). Definitions own their schemas and named views;
do not fold kind-specific state into the shared document envelope.

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

Brief look (spec 033, 041): every template is a full page or a brief (`pageKind: 'brief'`). A brief
is built from brief blocks (node type `brief`, its only container; a block holds no container, and a
full page holds none) and fields; `DeclarativeSheetView` publishes the kind (`PageKindContext`,
`useBriefPage()` in `areaLayout.ts`) and every field reads it: on a brief fields draw compact and
ratings and pools show their short labels, on a full page everything draws full size (there is no
per-field `compact` or `shortForm`). The sheet root is the named size container `brief`
(`@container/brief`), and brief layout reads its width, never the window's. A brief block draws with
no box, a heading over a hairline (`SectionCard dense`), three columns (one under 260 px), and cells
that are rows in a narrow area and wrapping chips from the `md` container width; children without a
`column` flow by natural width; its fold state is stored under the same key a card's is. Shipped
briefs go through `dense()` / `denseBrief()` (`templates/builders.ts`, which also set `pageKind`);
their weapons list starts collapsed. Spacing and heading classes come from
`features/sheet/declarative/briefRhythm.ts`; add a compact form there, not a private gap. On a brief
a rating draws a short label (the author's `shortLabel`, else the glossary's `abbr`/`ruAbbr`, else
the first three letters; `shortLabels.ts`) unless it sets `fullLabel`; the full name stays the
input's name and the hint of the cell; a clash inside one block takes a fourth derived letter, else
a number (never the full look). A pool drawn as a tracker shows no short label. Templates of schema
3 are upgraded as they are parsed (`types/templateUpgrade.ts`, inside `CustomTemplateSchema`): an
edited shipped page keeps its page's kind (a frozen list of the schema 3 shipped ids), a user's page
is a brief only when its top-level containers are all brief-look groups; the template store (v6)
lists notable conversions in `conversions` and the sheet tells the author once. Inside a brief block
(`BriefGroupContext`, `areaLayout.ts`) trait lists draw tight rows without order controls, one-line
text and enum fields share the caption-over-underline look of `CompactTextField`, compact reference
fields list one link per line and keep their search behind an Add button, and a trait shown as a
number (a whole dice pool) keeps its die beside the short chip. A compact rating or tracker field
takes at least 12rem among flowing cells (its row is an inline-size container with no width of its
own). Do not use `.term-row` for a cell that must size by its content (it is an inline-size
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
  `notices`. The full text lives on one docs page. The layout places the badge once per surface for
  the documents it shows (`PaneArea`'s `notices`): under the page while one document scrolls with
  it, at the end of the toolbar over groups that fill the window, at the foot of a floating
  document's window.
- Dice mechanics belong to the ruleset (`SystemPlugin.dice`): `traitPool` builds a stat's notation
  (a plugin without it shows no stat dice button; Star Wars declares the classic
  `systems/wod-like/dicePool.ts`, V5 its own 6+ pool), and an optional `reading` (V5:
  `systems/v5/ruleset/dice.ts`) adds critical pairs and reads special-dice outcomes. Each V5 module
  contributes its dice line (`modules/hunter/dice.ts` Desperation, `modules/vampire/dice.ts`
  Hunger). A line with `replaces` turns pool dice into its special dice when the pool is rolled
  (Hunger: as many as the vampire's Hunger, spec 037): the roll source carries `specialDice`
  (`RollReadingRules.specialDice`, read by `useDocumentRollSource()` and the shown document) and the
  reading's `prepare` splits the merged pool with `withSpecialDice`. Primitives resolve the builder
  with `useDocumentTraitDiceRoll()`, and so do template ratings with a die; the die is
  `StatDiceButton` (used by `StatDot` and `RatingRow`), which sends the document as the roll source
  (`useDocumentRollSource()`), and `SheetWorkspace` publishes the shown document
  (`integrations/sheet-dice/shownDocument.ts`). Publisher badges never appear on dice surfaces.
- V5 core kinds (spec 040, `systems/v5/core/`): the mortal, the **Storyteller character**
  (`v5-storyteller`, kind `storyteller`: pools as traits shown as numbers, Health/Willpower of 4 ±
  the track's own adjustment, exceptional pools and powers as `named-trait` lists with catalog
  suggestions, a simple-foe Difficulty with a roll of twice it), and the **Group** (`v5-group`: name
  and emblem in data, everything else page fields, members a `reference` field). All three are
  `coreDefinitions`, so user settings on V5 offer them. Every V5 character page shows "Member of"
  (in the identity card of a full sheet, a folded group at the end of a brief), an incoming
  reference field read through `features/documents/linkedFrom.ts` (index entries of the target kinds
  in the same system and setting, loaded by id, at most 200, `linked-from-truncated`). Vampire and
  hunter data carry `trackResources` (default on): off hides Hunger, Rouse, and Willpower (hunter:
  Willpower) by `visibleWhen` and the Hunger line adds no dice. Group examples name their member
  examples as `companions`; `createFromChoice` copies those first and relinks the group's values.
- Bindings say where a document keeps its data; everything a page computes, shows, or does lives in
  the template as elements an author can configure (constitution VI, spec 038). A system never adds
  a behavior only its own code can produce: `tests/sheet_manager/shipped-parity.test.tsx` fails when
  a shipped element uses a property the editor shows no setting for.
- Buttons (`type: 'button'`, and `rowButtons` on tables and built-in rows) roll and write:
  `runButton.ts` is the pure press (availability, `{formula}` notation segments, count, re-roll,
  success at a total, changes within bounds, `always`); `SheetButton.tsx` rolls through
  `useSheetDiceActions` (special dice only with `roll.gameDice`), writes through `applyWrites`, and
  offers Undo for 8 s. `diceRollerStore.roll` resolves `null` for a cancelled 3D roll, and the press
  stops there. Built-in rows and values reach the page through `PageScopeContext`.
- The vampire (`modules/vampire/`, kind `vampire` so its bindings never collide with the hunter's
  `character`): its mechanics are template elements in `templates/mechanics.ts` — Rouse and Remorse
  buttons and a power's Rouse row button, Blood Potency effects as formula fields (texts translated
  through `textMessages`), bane, compulsion, and predator grants as From catalog texts, Humanity as
  a rating-mode value drawn as a tracker with stains from the end, powers and rituals limited by
  their discipline (`limitByParent`) and shown by a `rating()` formula. Its five catalogs keep names
  in code and long texts in `catalogText/` (loaded on demand); they declare the texts From catalog
  fields can show (`withTexts`).
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
- The **General** system (`systems/general/`, spec 043) holds documents for any game: a ruleset with
  no dice, policies, or catalogs whose core definition is the **Note** (kind `note`: `name` bound
  with `syncsTitle`, an optional raw-YAML `frontMatter`, the text in the page's markdown field
  `body`; one full page `general-note`, no brief). Its `library` texts replace the rules wording
  ("Any game" instead of "Rules only"). A kind may declare `files` (`DocumentFileFormat`): the
  toolbar exports such a document in it and turns its files into envelopes before the import batch
  (`features/sheet/shell/kindFiles.ts`); the Note's format is markdown, or a zip with `images/` when
  it has stored pictures (`noteFiles.ts`, `yaml` and `fflate` loaded on use). An empty markdown
  field claims the focus of a just-created document (`features/documents/newDocumentFocus.ts`),
  which the create dialog hands over on close. Example documents take a `localize` function for text
  in the interface language (system code cannot import `translate`).
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
  changed records at once, coalesced within a task, and flushes on `pagehide`. One write runs at a
  time and the next takes the latest versions when it starts (`createRecordWriter`, spec 043), so
  fast typing never queues stale snapshots ahead of the newest. `changedAt` moves at most once per 5
  s per document. Two tabs merge the index by id (newer `updatedAt` wins).
- **Delete is a tombstone.** Deleting removes the entry and lists the id in `pendingPurge`; the next
  start's sweep removes exactly those records (and their device images). A record with no entry and
  no tombstone gets its entry rebuilt, never deleted. Folders use the same list.
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
- **The documents window** (`components/documents/DocumentsPanel.tsx`) is a tool of the workspace
  layout (below) over the shared `TreeView`; its list and details become tabs by the width of its
  container (`@container/documents`), not of the screen. Phone: full screen, drag replaced by "Move
  to…". Names are typed in place (`InlineName`); the create dialog is the one place that takes a
  name before the document exists. A click only selects a row and shows its details (T-116); a
  document opens by double click, `Enter`, or the Open actions (**Open**, **Open in new tab**,
  **Open beside**). On a phone a tap selects and switches to the details tab. A single dragged
  document row also carries `application/x-ttg-document`, so the layout takes it like a tab.

- **Creating documents (spec 039).** Every create path calls `createFromChoice`
  (`features/documents/createFromChoice.ts`): the page the library chose (`newDocumentPage`, a user
  setting's own page), the typed name written to the title and to where the kind keeps its name (the
  character capability's `metadata.name`, else its `syncsTitle` field bindings), an example's copy
  (`definition.examples`: migrated, parsed, its template values and portrait, a new id), the folder,
  and the kind recorded as recent. `createDocument` takes `title`, `data`, and `templateValues`; a
  folder deleted meanwhile sends the document to the top level and reports
  `document-folder-missing`. The **New** dialog (`components/dialogs/DocumentCreateDialog.tsx`)
  lists `createChoices(tree, registry)` (`features/documents/createChoices.ts`) over the library
  tree: rulesets, then settings with more than one kind (a one-kind setting shows its kind with the
  setting's name beside it; a **Recent** kind shows its ruleset and setting path beside it),
  searched with `matchesSearch` over both languages' names and user type descriptions. The search is
  a combobox over one listbox (`data-kind="system/definition[/setting]"` on options); from 640 px
  the details pane (start, name, folder through `MoveToPicker`, **Create**) sits beside the list,
  below it the two are steps with **Back**. Device key `ttgamer:create-dialog:v1` holds
  `{ recent (≤ 5), toggled }`: headings turned from their default (rulesets open, the settings
  inside them folded); unreadable values and recent kinds that are gone are dropped and reported
  (`create-preferences-invalid`, `create-recent-missing`). `onCreated(id, { named, parentId })` lets
  the documents window skip its rename in place for a named document. Docs buttons
  (`CreateCharacterButton`) use the same path and report a missing kind or example as
  `create-kind-unavailable` with an error message.

Following a link (T-057): a page's `openDocument` (reference chips, "Member of") goes through
`DocumentLinkContext` (`features/sheet/declarative/documentLinks.ts`), which `SheetWorkspace`
provides from `useDocumentHistory()` (`features/sheet/shell/documentHistory.ts`). The link pushes a
history entry naming the document in the address (`?doc=<id>`, a query change, so Docusaurus does
not scroll); Back and Forward show the document their entry names once it is in the index, a
document opened another way replaces the current entry's name, and the first document shown after
loading never overwrites an address that names another. Without the provider a link only sets the
current document.

### Workspace layout (spec 036)

- **Tree** (`features/sheet/panes/layoutTree.ts`, pure): groups (`GroupNode`: tabs, the shown one,
  `collapsed`) in nested row/column splits with weights (average 1, fitted to the area, never px).
  `normalize` keeps one shape; `groupsInOrder` is the reading order; `rectsOf` places groups and
  dividers; `minSizeOf` is 320 × 200 a group, 28 px a collapsed one. Every change is a function of
  the tree (`placeTab`, `removeTab`, `splitGroup`, `setCollapsed`, `setWeightsAt`).
- **Tab keys** (`tabKeys.ts`): `d:<documentId>` and `t:<tool>` (`documents`, `library`, `dice`).
  Tools register a kind (`registerTabKind`: title, close label, `render`); `sheetTools.tsx`
  registers the documents window and the library, `integrations/sheet-dice/diceTab.tsx` the dice.
  Documents are drawn by the sheet's `renderDocument`.
- **Store** (`paneStore.ts`): the tree plus `recent` (order of use), `views`, `maximized`,
  `floating` (at most `MAX_FLOATING` = 4 windows, the front one last), and each tab's `lastRect` and
  `lastSide`; not persisted: `shownTool` (a phone's full-screen tool), drag hints, and `freshWindow`
  (the one window that takes focus as it opens). All changes go through its actions (`openBeside`,
  `openInNewTab`, `openTool`, `focusTab`, `closeTab`, `moveTab`, `splitWith`, `dropDocument`,
  `floatTab`, `dockFloating`, `raise`, `collapseGroup`, `expandGroup`, ...).
- **Current = used last.** `currentDocumentId` stays the one "current" fact; `reconcileLayout`
  derives the layout from it: **Open** puts the document in place of the shown document of the group
  used last (`documentGroup`, never a tool's group or a floating window), deleted documents drop
  out, a tool the reader switched to stays shown. At most `MAX_DOCUMENTS` = 12 documents (the least
  recently used hidden one gives way, with a notice) and `MAX_GROUPS` = 6 groups.
- **Room.** A split, **Open beside**, or a docked tool needs every group at its minimum once groups
  of tools only give way to 28 px strips (`fitByCollapsing`, least recently used first, never the
  group used last); otherwise it becomes a tab with a notice. When the drawn layout does not fit,
  `PaneArea` shows one tab at a time with a strip.
- **Drawing** (`PaneArea.tsx`): one group with one document draws the page exactly as before (no
  frame or wrapper; a drop layer appears over it only while a row or window is dragged). Several
  groups fill the window below the toolbar, leaving room for what the page lays out below, each
  scrolling on its own. A phone (window below 768 px) floats nothing: its strip lists the grouped
  then the floating documents, and tools show full screen over the page. A wider window too narrow
  for the layout keeps its windows and lists grouped documents and tools. The publisher badge goes
  once per surface (Systems, above).
- **Dragging** (`useTabDrag`, `dropTargets.ts`): tabs and single document rows land on a strip (a
  gap), a group's middle, or an edge quarter (split); a tab dropped outside every group floats. A
  floating window docks only on a strip or a square of the dock compass in a group's middle; it
  moves freely anywhere else. Every action is also in the tab's keyboard menu (Shift+F10).
- **Dividers** use the shared `Splitter` (vertical or horizontal); dragging 80 px past a neighbour's
  minimum or Enter collapses it to a strip that opens with a click or Enter.
- **Source per document.** A document region wraps its page in `PaneSourceProvider`, a
  `DocumentSourceContext` value from `useStoreDocumentSource(documentId)`, so every bound element,
  roll, and write reads that document. `AreaLayoutContext` (`declarative/areaLayout.ts`) makes the
  sheet's columns follow the group width. The loaded cache keeps `pinnedIds` (the open documents)
  beside the current one; `loadIntoCache(ids)` reads documents without making them current.
- **Views.** A document's view in the layout is `views[id]` (a view id or `tpl:<page>`): one opened
  beside starts in its brief, the document's preferred view is never written, and with two or more
  documents the toolbar's view selector gives way to one per group.
- **Persistence.** The layout is the device's (`ttgamer:panes:v2` in localStorage); `readLayout`
  sanitizes it and reports dropped parts once (`pane-arrangement-invalid`). A spec 034 value
  (`ttgamer:panes:v1`) becomes one row of one-tab groups once and is removed. It is not exported,
  synced, or undoable.

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
  (`max(0, min(5 + conscience - passion, 10))`) as the lower bounds (`minFrom`) of the editable
  resources, which sit with Health and Initiative in the Condition section's Health and Willpower
  card (spec 042). Merits/flaws may raise the stored values.
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
- Character pages (every shipped character and Storyteller character, not the V5 group's emblem)
  show the portrait card only while `field:show-portrait` is on (`PORTRAIT_SHOWN`,
  `systems/portraitBinding.ts`): `metadata.showPortrait`, read as "has a portrait" while unset so
  older documents keep theirs; taking an image sets it. The switch sits in Appearance (WoD 2e
  engine), the biography (V5), or the identity card (Storyteller character).
- Portrait URLs accept only HTTPS or site-relative resources and must use
  `referrerPolicy="no-referrer"`. Local portraits are resized, quota-bounded IndexedDB blobs; never
  put image data URLs or blob contents in Zustand/localStorage JSON.

## Testing

Run schema/import/derived-stat tests for changes to `types/`, persistence, or import/export, then
the checks for the change size (`AGENTS.md` §11). Load `.agents/skills/sheet-manager/SKILL.md` for
schema, store, or derived-stat changes and `.agents/skills/sheet-templates/SKILL.md` for pages,
bindings, or docs embeds.
