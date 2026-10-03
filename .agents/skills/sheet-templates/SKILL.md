---
name: sheet-templates
description: Current-state reference for sheet_manager page templates — node tree, value storage and coordinates, bindings, formulas, page resolution, editor, import/export, diagnostics, extension checklists, and known debts. Load before touching anything template-related.
---

# Sheet Templates — Current State

This file is the **single current-state description** of the template system. Specs 003–007
are change history: read them only for the rationale behind a decision, never to learn how
the system works today. When code and this file disagree, the code wins — fix this file in the
same change.

## Mental model

A **template** is a declarative page: a recursive tree of nodes rendered by
`DeclarativeSheetView` against the current document. Templates never contain executable code.
Every rendered value lives in exactly one of two places:

| Storage                   | What goes there                                                 | Written by                                |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| `document.templateValues` | Custom values: flat bag keyed by **coordinate** (valueKey)      | `documentStore.updateTemplateValues`      |
| `document.data`           | System data (traits, pools, identity, lists, equipment, health) | `updateDocumentData` / `useBoundDocument` |

The template itself lives in one of three places, and **the renderer does not care which**:

| Source          | Location                                                           | Identity                                     |
| --------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| User template   | `templateStore.templates` (`universal-template-storage`, v3)       | user id                                      |
| Shipped default | `SystemPlugin.defaultTemplates` (`systems/<system>/…/templates/*`) | view id (`full-sheet`, `v5-hunter-sheet`, …) |
| Edited default  | `templateStore.defaultOverrides[overrideKey(systemId, viewId)]`    | system + view id                             |

Always pass the **resolved template object** around (the store write path takes it); never
re-look a template up by id — `getTemplate(id)` only sees user templates.

## Node tree (`types/template.ts`, schema v3)

- Containers: `section` (CollapsibleBlock, no background, `docsPath`, `columns` 1–4) and `group`
  (SectionCard surface, opt-in `collapsible`). Accents alternate by sibling parity, never stored.
- Leaf fields (`TemplateField`): `text`, `number`, `toggle`, `image`, `formula`, `select`,
  `rating`, `resource`, `reference`, `tracker` (see "Trackers" below).
    - Controls: `toggle` is the round `Checkbox` dot; multiple `select` is a row of pressable words
      (thin primary border when chosen) in option order (`hideUnselected` shows only chosen ones until the reader expands it);
      `rating` is a trait row (`components/stat-fields/RatingRow`, the same atoms as `TraitRow`):
      `presentation` `dots` (1..max, `min` a filled floor) or `number` (`'boxes'` parses as dots);
      optional `textInput`, `showNumbers`, `dice` (the system's `traitPool` through
      `StatDiceButton`), and `flags` (S/P/E subset, dots only). Text and flags live beside the
      number under `ratingDetailKey(valueKey)` (`<key>#detail`, `RatingDetailSchema`), so
      formulas, conditions, and shared keys keep reading a number. Stored ratings are bounded by
      `min` and `TEMPLATE_LIMITS.ratingMax` (100), not the static `max`: a resolved `maxFrom`
      decides the range (`ratingEffectiveMax`). In table cells the column header names the
      rating; a number rating with `showNumbers` frames a read-only "/ max" like a resource.
      Every field has `labelPosition` (`top` caption or `left` trait-row label, `FieldLabel`);
      unset uses `fieldLabelPosition` (rating and formula: left, others: top). Every numeric input (fields,
      resource, editor settings) is `shared/components/NumberInput`: numeric text only,
      bounded to min/max/step on blur or Enter, arrow keys step.
- Other leaves: `table` (columns are fields; rows stored under `tableValueKey`), `list`
  (exactly one of `valueKey` or `bindingKey`), `primitive` (`bindingKey` into system data).
- Custom lists (`valueKey`, spec 016): `item` is the entry template — any field except a
  formula (`ListItemFieldSchema`, `LIST_ITEM_TYPES`) — and `named: false` drops the typed entry
  name. Read both only through `listItemField(list)` (unset = `legacyListItem`: named dot rating
  0–5 with S/P/E and the die, the look of every list saved before 016) and `listIsNamed`. The
  item id shares the template's identifier namespace (`collectTreeIssues`) but is not a page
  field (`collectTemplateFields` skips it; draft `mapFieldItems` reaches it, so the field editor
  callbacks work by id; `FieldEditor itemOfList` hides storage, required, and formula). Entries
  are `TemplateListEntry` `{ id, label?, value?, detail?, pickLabel? }` under `listValueKey`:
  `value` has the item field's own shape, `detail` is a rating's text and flags, `pickLabel` a
  user-catalog pick's name. The write path validates changed entries only (by reference) against
  the item; `coerceListValue(item, value)` shows stored values under a changed item (numbers move
  between number, rating, and resource current) and anything else reads empty and reports
  `list-entry-unreadable`. Rendering: `features/sheet/declarative/listEntries.tsx`
  (`CustomListView`, memoized `ListEntryRow`, `pageApi.updateList` for stable callbacks); every
  control takes `nameSlot`, `rollLabel`, and `removeSlot` and places the remove button by
  `listEntryShape` (row: end of row; block: `LabeledField` trailing). Saving a template whose
  list item or naming changed runs `listItemChangeReport` (compatible documents' stored
  entries) and asks first; stored values are never rewritten by the change.
- Trackers (specs 018–020): one configuration drawn by one molecule for own and built-in trackers. - **Own tracker** (`tracker` field): `display` (`table` | `strip` | `line`), `marks` (1–5
  kinds: id, name, 1–2 code-point symbol, `fill` = palette key `secondary|error|tertiary|
success|text|primary` (accent) or `#rrggbb`, `layer` = `fill` (default) | `outline`; order = click order and
  weight within a layer; the 5-mark cap counts both layers), `levels` (1–20: id, name,
  short text `value`), `valueColumn` (title, show), `columns` (1–6, `marks` | `text`,
  `covers` first N shown levels, `copies: { max 1–24 }`, at least one marks column), `total`,
  `totalReads` (`deepest` default | `count`), `fromStart` and `fillInside` (spec 020, off),
  `lengths` (0–6 lists of level ids), `out`. Not a list item type, rejected as a table column.
  Value (`TrackerValueSchema`, `templateValues[valueKey]`): `{ tracker: 1, length?, columns:
{ [columnId]: [{ id, marks?: { levelId: markId }, outlines?: { levelId: markId }, texts?:
{ levelId: text } }] } }` — `marks` is the fill slot, `outlines` the outline slot. Display
  reads a slot by the kind's current layer (`tracker.ts` `layerSource`/`layerMarks`: own slot,
  else the other slot), so a layer change in the editor rewrites no document; a collision
  leaves one entry hidden and counted (`hiddenSlotEntries`); ids
  keep marks on their level and kind when either moves, copy letters come from position, a
  missing column list reads as one copy `a`. The write path checks the shape and copy caps
  only (unknown ids pass, so hidden values survive the next write). - **Built-in tracker** (`primitive` on a `track` binding): optional `tracker` override
  (`display`, `marks[slash|cross]` name/symbol/fill, `levels[]` per index name/value or
  `null`, `valueColumn`, extra `columns`, `total`, `valueKey` for the extras). The game keeps
  level count/order, a computed length (V5), the two marks (`TrackBinding.marks` names them:
  WoD health bashing/lethal, V5 superficial/aggravated, else generic Slash/Cross), and
  members; marks stay in `document.data`, extra columns store a `TrackerValue` under
  `tracker.valueKey ?? node.id` (validated at the write path; member tracks key repeated
  extra copies by member id). A level override keeps the game's other values; a legacy
  `track { levels, names }` with another count still sets the levels (editor offers "Use
  the game's levels"). Display without `tracker.display` (`trackerDisplayOf`): `compact` →
  `line`, else `trackLayout`, else `table` for named levels / `strip` for a computed length;
  the editor writes `tracker.display` and clears both. Total defaults: on for member tracks
  with 2+ members, off otherwise; the shipped Star Wars character/droid page sets it on. - Rules (`features/sheet/data/tracker.ts`): the reading layer is `fill`, or `outline` when the
  tracker has no fill kinds (`readingLayer`); a click cycles its kinds empty → kinds… → empty and
  keeps the other layer; with `fromStart`, a press runs that layer like rating dots (boxes 1…N
  get the mark, the rest of the layer clears, pressing the last box of a run of that mark
  shortens it; `fillInside` caps a fill run at the last framed box; `trackerModel.ts`
  `markTracker`/`runTrackerMark`); total = value of the deepest shown level marked on the reading layer,
  or with `totalReads: 'count'` the filled covered boxes and, when the tracker has outline kinds
  and frames any box, "filled / framed" (`countText`);
  out = last shown level marked there; switching the length keeps each mark's shown position
  and folds the tail into the new last level (heaviest wins), each layer on its own, the
  same as `cohort.ts` `shortenMarks` for stored fodder members (proven by
  `tracker-parity.test.tsx`). - Rendering: `trackerModel.ts` (`ownTrackerModel`, `builtInTrackerModel`) → molecule
  `components/stat-fields/Tracker.tsx` (grid table with ARIA roles, strips, one line,
  legend only when `legend` is on (field or override; off by default, built-in too), copy add/remove with confirm, length −/+ with a danger confirm).
  Boxes 26px (20px on one line); an outline is CSS `outline` + `outline-offset` in the mark's
  color (see-through gap), its symbol shows only without a fill. Brush (spec 019): on an
  editable sheet with the legend shown (not one line), legend items are `aria-pressed`
  buttons; the molecule keeps one `{ id, layer }` brush (reset when the mark goes or changes
  layer); Escape inside the tracker ends it; a `role="status"` line says what it marks.
  Clicks reach bound elements as `onMark(…, click: TrackerClick)` = `{ brush }` or `{ layer }`:
  a left click sends the brush or the reading layer; the outline action (right click,
  Shift+Enter/Shift+Space, a 500 ms touch long press that swallows its click) sends
  `{ layer: 'outline' }` only when `model.hasOutlines` and enabled, else the browser keeps the
  event. Own trackers write through `markTracker`; built-in game columns `cohort.ts`
  `paintMark`/`toggleMark`. Built-in marks are always fills (`hasOutlines: false`).
  Own values: `declarative/TrackerFieldControl.tsx`; built-in: `declarative/BuiltInTracker.tsx`
  (replaces `CohortTrack`; page values reach it through `PrimitiveNodeView`'s `page`). - Editor: `TrackerSettings.tsx` serves both (game-fixed parts disabled, game text as
  placeholders; `builtInTrackerSettings.ts` maps the panel onto the override); the Source
  select (`TrackerSourceSelect`, `trackerFromSource`) switches own ↔ built-in keeping id,
  label, display, value column, extra columns, total. Draft issues: a length with no known
  level, covers ≥ level count, an extras key colliding with a value key. Saving runs
  `trackerChangeReport` (marks, notes, copies a change stops showing) with the list report. - Diagnostics: `template-value-unreadable` (value of another shape, reads empty) and
  `template-value-hidden` (count of stored values under removed parts), both skipped in the
  editor preview.
- Any node may carry `visibleWhen: { coordinate, equals, not? }`: rendered only while the value
  at the coordinate (bag value or bound document data) equals `equals` (`not` inverts). Never
  affects storage; the editor always shows the node (condition control on every panel). An
  unknown coordinate hides the node and reports `binding-unresolved`; `validateTemplateReferences`
  flags it as `unknown-coordinate`.
- `docsPath` (sections, groups) is `/docs/<path>[#anchor]` or an `https://` address
  (`shared/utils/docsLink.ts`); site paths render under the reader's locale base URL
  (`useSitePath`) through the `DocsHelpLink` atom. Anything else is an `invalid-docs-link`
  reference issue (editor issue, import report) and renders no link (`template-reference-invalid`
  at render outside the editor). The schema stays lenient so old templates never quarantine.
- Placement: `column` pins a node to a parent column (then every sibling stacks per column,
  unpinned ones in column 1); `span` (2–4) stretches a node over columns in flowing layouts only,
  with per-breakpoint classes (`spanClass`: 3/4-column grids have two columns at `md`).
- Sections and collapsible groups may set `defaultCollapsed` (collapsed until opened, then
  remembered). Select options may carry their own `labelMessage`.
- Guardrails (`TEMPLATE_LIMITS`, `collectTreeIssues`): depth 10, 200 nodes, one id namespace
  across the whole tree; identifiers are lowercase kebab-case.
- Node and field schemas are a `z.discriminatedUnion('type', …)` of plain objects;
  cross-property rules (bounds, unique option/column ids, list storage mode) run in
  `refineField` / `refineNode`. Unknown types yield one `invalid_union_discriminator` issue.
- `TEMPLATE_FIELD_TYPES` and `TEMPLATE_STRUCTURE_TYPES` are the canonical type lists;
  `isTemplateField` / `isContainerNode` are the only leaf/container predicates. Type-level
  guards (`TemplateFieldTypesAreComplete`, `TemplateNodeTypesAreComplete`) fail typecheck when a
  list and the schema disagree.
- `systemId` defaults to `star-wars-wod` when parsing old templates; new drafts take the
  current system. Compatibility is always `systemId` + `documentKind` (`isTemplateCompatible`):
  custom lookups, `resolveEffectiveTemplate`, the library, and the page selector check both.
  An assigned template of another system/kind renders the default page and reports
  `template-incompatible`.
- Layout and presentation:
    - `column` (1–4) on any node places it in its parent's column layout; when any child of a
      multi-column container sets it, children stack inside their column instead of flowing
      row by row (unplaced children go to column 1). Renderer grids use `grid-cols-1`
      (`minmax(0,1fr)`) tracks so wide rows shrink instead of clipping.
    - Containers: `columnWidths` (e.g. `[2, 1]`) sets proportional columns from the md
      breakpoint via the `--template-columns` CSS variable.
    - Groups: `hideTitle` (no header, never collapsible), `docsPath` (help link), opt-in
      `collapsible`.
    - Lists: own title (`showTitle`) and bordered card (`framed`) are off by default — the
      enclosing group names the list.
    - Fields: `hideLabel` (kept for screen readers); text fields `placeholder` +
      `placeholderMessage`; formula fields `prefix`/`suffix`, rendered as "label … value" rows.
    - Primitives: `hideLabel`; pool resources `part: 'max'` edits the maximum (current is capped
      to it); `minFrom` (formula) locks dots below a dynamic minimum and clamps writes to it;
      member tracks take `cohort: { maxMembers }`.
    - Pool trackers (spec 020): a pool `resource` primitive with `poolTracker` (`display`
      `row` default | `strip` | `line`, `marks.current/max` look overrides, `legend`, `total`)
      draws one tracker (`declarative/PoolTracker.tsx`, rules in `data/poolTracker.ts`:
      `poolTrackerModel`, `markPool`): fills = current, outlines = maximum, boxes up to the
      binding maximum or `maxFrom`; `minFrom` then bounds the current value and `maxMinFrom`
      the maximum (resolved into `formulaState.maxMinima`); locked boxes (`copy.locked`) draw
      in a darker mix of their mark's color; `currentRaisesMax` raises the maximum from a fill.
      `part` and `compact` are ignored with it. An own `resource` field takes the same
      `poolTracker` (max ≤ `trackerLevelsMax`, schema refine; `fieldControls.tsx`): `min` holds
      both values, the page label stays outside (`hideLabel`). The `row` display (label left, 16px boxes,
      count) exists only in pool models. The editor's Display choice moves `minFrom` of a
      `part: 'max'` node to `maxMinFrom` and back. The shipped Star Wars full sheet draws
      Force Points this way; edited copies of a shipped page (`defaultOverrides`) keep their
      own nodes.
      Tracks render through the tracker (see "Trackers"). Compact pools render `current / max` boxes, compact ratings number boxes.
- Labels: every labelled node may carry `labelMessage` — a UI message id (`ttgamer.ui.…`) or a
  catalog entry (`catalog:<catalogId>/<entryId>`, e.g. attribute names). `DeclarativeSheetView`
  renders `localizeTemplate(template, locale)` (`features/sheet/declarative/localizeTemplate.ts`);
  the stored `label`/`title` is the fallback. Editing a label or title in the editor drops the
  reference; on fields and primitives it is kept as `termRef` (spec 009) so the book-term hint
  survives renaming (`keepTermOnRename` in `template-editor/draft.ts`); switching a field to a
  custom source clears both. `termHint: false` turns the hint off (editor: "Show book name
  hint" via `TermHintControl`). Character/droid defaults attach references in one pass
  (`withLabelMessages` in `templates/character.ts`: attributes, abilities, Force skills, and
  virtues point at their data catalogs); entity templates pass `labelMessage` explicitly through
  the builders (keys under `ui.sheet.templates.entities` / `defaults`). Unknown references are
  `unknown-label-message` reference issues.
- Book terms (spec 009): a label is a book term when its effective ref (`termRef ??
labelMessage`) is listed in `translations/glossary/*.yaml` (generated `bookTerms`). Trait rows,
  compact ratings, and field labels render through `components/terms/TermLabel`; each
  `DeclarativeSheetView` wraps its tree in one `TermHintProvider` (delegated listeners, one
  popover). The reader's "Game terms" preference (`src/shared/store/readerPrefsStore.ts`) and
  `resolveTerm` decide label and hint. Trait row layout is classified by
  `declarative/rowKind.ts` (`traitRowKind`), shared with the verifier's overflow budgets.
- Authoring: `src/sheet_manager/templates/builders.ts` holds setting-neutral node builders
  (`text`, `number`, `toggle`, `formula`, `select`, `reference`, `primitive`, `list`, `table`,
  `group`, `section`); WoD-family helpers (`dotsTrait`, `traitCoordinate`) live in
  `systems/wod-like/templateBuilders.ts`; each Star Wars page family has its own module under
  `systems/star-wars-wod/templates/` (`character`, `creature`, `vehicle`, `fodder`, `docs` for
  rules links). `defaultTemplates.ts` only aggregates. The character trees are guarded by
  `tests/sheet_manager/fixtures/character-templates.pre-007.json`.

## Coordinates and value storage

- A field's coordinate is `valueKey ?? id` (`fieldValueKey`, `tableValueKey`, `listValueKey`).
  Equal coordinates in different templates **share one value** (document-global bag).
- **Bridging**: `resolveDataBindingByCoordinate` — if a field's coordinate equals a system data
  address (kebab trait key like `strength`/`self-control`, resource id, identity field key),
  the field renders as the matching primitive and reads/writes `document.data`, ignoring the
  field's own type. Default templates rely on this; a custom field named `name` is bridged too.
- Write path (`documentStore.updateTemplateValues(documentId, template, updater)`):
    - validates only **changed** keys that match a field/table coordinate of the given template
      (`validateTemplateValue`); unchanged stale values never block writes to other keys;
    - keys the template does not declare (orphans) pass through untouched — never deleted;
    - `undefined` from the updater clears a key;
    - rejections report `template-value-write-rejected` with `key` and `reason`.
- Read path: `coerceStoredValue` converts values stored before a field type change; the store
  data is never mutated by rendering.
- Images: `{source:'device', blobId}` (IndexedDB via `persistence/portraitStorage.ts`) or
  `{source:'url', url}` (HTTPS only). Device values are stripped from JSON exports.

## Bindings and the system boundary

Contract: `systems/templateBindings.ts` (system-independent). Each plugin declares
`SystemPlugin.templateBindings`; generic code queries them with `listDocumentBindings`,
`resolveDocumentBinding`, `resolveDataBindingByCoordinate`, `resolveWritableBinding`,
`boundWriteUpdate`, `listNumericCoordinates`, `readBoundNumber`, `trackLevelsFor`, and
`createListEntry`. Descriptors carry every data path (`map`, `dataKey`,
`coordinate`, `defaultValue`, `entryShape`, track `levels` with translation descriptors), so
generic code never computes a system's data shape. An ESLint `no-restricted-imports` rule
fails any import of `systems/star-wars-wod` from declarative, editor, hooks, types, or
`wod-like` code.

WoD-family systems build trait/resource/track bindings from their profile with
`systems/wod-like/templateBindings.ts` (`buildWodTraitBindings`, `buildWodResourceBindings`,
`buildWodTrackBindings`, `toCoordinate`). Star Wars declarations:
`systems/star-wars-wod/documentBindings.ts` (character/droid) and `entityBindings.ts`
(creature, vehicle, fodder group — kind `group`). Binding keys repeat across kinds; resolution
always filters by `documentKind`.

**Data access is kind-independent**: bound elements read and write through `useBoundDocument()`
(`features/sheet/declarative/boundDocument.ts`). Documents with a `character` capability go
through it (droids map damage/built-in equipment); every other kind reads `document.data`
directly. Writes merge top-level keys and re-parse with the kind schema; a rejection reports
`template-value-write-rejected` instead of throwing. Equipment bindings without `dataKey` still need the
character capability (`useBodyHandlers`, Star Wars catalogs); with `dataKey` they edit a plain
item array through the same molecules (V5 `weapons`, `inventory`).

| Kind        | Key shape                                                | Star Wars data                                                                                                |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `trait`     | `trait:<groupId>:<TraitKey>`                             | `attributes`/`skills`/`virtues`/`forceSkills`                                                                 |
| `resource`  | `resource:willpower\|force-points\|dark-side-resistance` | `willpower`/`forcePoints` pools, rating number                                                                |
| `track`     | `track:health`, `track:droid-damage`, `track:members-*`  | `health`; member arrays (`members[].health`/`.damage`); V5 `track:health`/`track:willpower` (computed length) |
| `field`     | `field:<key>`                                            | any data path (`path`, `valueType`, optional `constrain` / `adapter`)                                         |
| `list`      | `list:<listId>`                                          | `dataKey` (`forcePowers` → `forcePowerItems`)                                                                 |
| `equipment` | `equipment:inventory\|armor\|weapons\|implants`          | body sections via `useBodyHandlers`, or a `dataKey` item array                                                |
| `rows`      | `rows:<dataKey>`                                         | arrays of string records (`attacks`, `weapons`, `configuration`)                                              |

- Field bindings: `path` + `valueType` (`string`/`number`/`image`/`enum` with `options`);
  `numeric` gives text a formula reading (`'+3D'` → 3, empty → 0); `syncsTitle` renames the
  document when written (entity name/concept).
- Member tracks: a track binding with `members: { trackKey, maxMembers }` renders `CohortTrack`
  (`features/sheet/declarative/CohortTrack.tsx`, pure rules in `cohort.ts`): letters A, B, C…
  (none for a single member), bounded add, confirmation before removing a member with marks,
  "out of the fight" once the last visible level is marked, per-member penalty. `variants`
  (`lengthPath` + `levelsByLength`) shows a subset of the 7 stored slots (visible level i =
  slot i); the track's own −/+ regulator steps through the lengths, and shortening past marks asks first and
  collapses hidden marks into the last visible level. Fodder `trackLength` (3/5/7) parses as 7
  for pre-feature groups and is created as 3.
- Computed-length tracks: `length: { from, adjustmentKey, adjustmentRange, maxLength }` on a
  track binding (V5 Health = `stamina + 3`). The record stores `{ levels, [adjustmentKey] }`;
  the primitive evaluates `from` itself (a re-skinned template cannot break it) and shows
  `from + adjustment` unlabeled boxes with a −/+ regulator (`resolveComputedTrackLength` in
  `declarative/trackLength.ts`); marks past the length are kept. Node `trackLayout`
  (`table` | `strip`) picks the `ConditionTrack` molecule; default `strip` for compact nodes and
  computed tracks.
- Reuse before adding: new systems extend the existing elements with optional, system-neutral
  features (layout, regulator, row options) instead of shipping new look-alike atoms.
- Trait bindings may declare `row: { specialization?, flags? }` (default both true): hide the
  specialization text input or the specialization/experienced/practiced flags (V5 attributes
  hide both, V5 skills hide the flags).
- A catalog-bound single-select field with more than `SEARCHABLE_SELECT_THRESHOLD` (12) resolved
  options renders the searchable `CatalogSuggest` instead of a `<select>` (`fieldControls.tsx`,
  `usesSearchableSelect`). It stores the option's value exactly as the drop-down did, so catalog
  fills are unaffected, and a stored value the catalog no longer offers keeps its text. Shorter
  lists and static options keep the plain select; a bound multi-select cannot exist (the schema
  rejects it).
- Field bindings: `valueType` also `boolean` (toggle fields); `range` clamps numbers on write;
  `suggestions: { catalogId }` turns a bridged text field into free text with catalog
  suggestions (`useCatalogSuggestions`, localized names).
- List bindings may set `polarity` (`positive`/`negative`) for merit/flaw lists without a
  catalog filter, and `translation` for the title.
- Rows bindings render `RowsBody` (a table over a data array; `enum` columns keep unknown
  stored text visible; `hidden` columns are stored but not shown; rows reorder with labelled move
  buttons). `catalog: { catalogIds, column, fills }` turns the name column into a
  catalog suggestion that overwrites the row's mapped columns. Bridged fields keep their own
  control (textarea, placeholder, number input); `constrain` keeps the top-level record valid
  (experience: spent ≤ total) and `adapter` maps split values (portrait ↔
  `metadata.portraitId`/`imageUrl`). Numeric field bindings are formula coordinates
  (`experience-total - experience-spent`). Pool resources may set `currentRaisesMax` (Willpower).
- `track:droid-damage` reads droid damage (exposed as `health` by the droid capability) with the
  damage chart's level names and penalties. The shipped `droid-sheet` is the `droid` variant of
  the full sheet: no Force skills/powers or Force Points, per-group free-point fields
  (`droid-free-<group>` bag values), Built-in equipment, and the damage chart.
- Views resolve through the document's own definition (`resolveDocumentView` →
  `resolveEffectiveTemplate`): character and droid share the `character` kind, so the droid
  definition registers its own `droid-brief` view (aliases `brief`, `npc-card`) whose shipped
  template drops Force content and uses the damage strip.
- List entry shapes: `trait` `{id,label,value}`, `named-trait` `{id,name,value}`, `merit-flaw`
  `{id,label,points}`. Preset seeding and the list molecules both follow `entryShape`.
- Keys are persisted as plain strings, checked by `validateTemplateReferences`
  (`features/sheet/data/templateReferences.ts`) wherever templates enter the system: editor
  draft issues, file import (reports `template-reference-invalid`), and a test over every
  shipped default. It checks binding keys and list binding kinds, catalog ids, fill details and
  fill targets, formula/`maxFrom` coordinates against `listTemplateNumericCoordinates`, and
  reference targets against the template's setting (`reference-target-unavailable`, with the
  field label). `{ referenceScope: false }` skips only that last check: library file parsing
  passes it because the file's own types and settings are not installed yet.
- An unknown key, wrong kind, missing character, or missing body handlers renders the labeled
  `DegradedBinding` notice and reports `binding-unresolved` with a `reason`.
- Catalogs are declared by plugins (`SystemPlugin.catalogs`, built with `defineCatalog` from
  `systems/catalogs.ts`; Star Wars in `systems/star-wars-wod/catalogs.ts`, Hunter in
  `systems/v5/modules/hunter/catalogs.ts`). `features/sheet/data/catalogBindings.ts`
  (`CATALOG_BINDINGS`) only aggregates them from the registry (a duplicate id throws); entry
  names localize from `translations/source/<locale>/data/<catalogId>.yaml`, catalog names from
  `ui/sheet/catalogNames.yaml` (`catalogDisplayName`). They are the only path from system data
  into templates: select fields persist `catalogId` + fill mappings and system lists resolve
  `binding.catalog.catalogId` from the same registry. Unknown catalogs degrade to manual choice
  and report `catalog-unavailable`.
- User catalogs (spec 015, `systems/userCatalogs.ts`): `user-catalog-<8>` ids, typed columns
  (`c-<8>`: text / number / toggle) and entries (`e-<8>`, a name plus values by column id; values
  of unknown columns or the wrong type are dropped on parse). The owner is a user setting
  (`{ settingId }`), a shipped setting (`{ systemId, moduleId? }`: Rules only, a line, a setting
  system), or a ruleset (`{ rulesetId }`, shared by every setting on it). They reach generic code
  through the registry overlay (`setUserCatalogs`, synced in `systems/index.ts`; the storybook
  adds `registerSampleCatalogs`) adapted by `userCatalogBinding` to `CatalogBindingEntry`, so
  every consumer goes through **`getCatalogBinding(id, storeCatalogs?)`** (shipped first) — never
  `CATALOG_BINDINGS.get` outside docs embeds. React callers pass the store's `catalogs` so edits
  re-resolve. Scope: `catalogScopeOf(registry, template)` → the template's setting and its
  ruleset; `listCatalogBindingsFor` groups the editor picker (setting / ruleset / shipped),
  `isCatalogInScope` makes an out-of-scope user catalog an `unknown-catalog` reference issue.
  Limits: `TEMPLATE_LIMITS.catalogEntriesMax` 1000, `catalogColumnsMax` 20, `catalogsPerOwner` 50. Editing is pure (`features/sheet/data/catalogEdit.ts`: columns, entries, `convertValue`,
  `parsePastedEntries`, `catalogUsage`, `boundCatalogIds`).
- A pick from a user catalog stores the entry id and the name in `<valueKey>#label` (in a table
  row: `<columnId>#label`; `pickLabelKey`); the select shows the live name, or `#label` once the
  entry or catalog is gone. Other use sites: a value-bag list's `catalog: { catalogId, valueFrom? }`
  (named lists only: names suggest entries; `valueFrom` copies a column that fits the item type
  — `catalogKindFitsListItem` — into the entry value; a mismatch reports `unknown-fill-detail`,
  a catalog on an unnamed list `list-catalog-unnamed`), and a table
  `select` column's `binding`, whose fills target sibling column ids and write only that row
  (`pageApi.setRowValues`). Template import keeps user catalog bindings (they may arrive later).
- Fill semantics (`readCatalogDetails` + `pageApi.applyWrites`): picking an entry **overwrites**
  every mapped target in one change — a detail the entry lacks (`undefined`) leaves its target
  untouched, `null`/`''` clears it; clearing the select writes nothing. Fill targets may be
  field ids, value keys, value-key lists, or writable binding coordinates (bridged data:
  traits, resources, fields, rows, lists with a `coordinate`); row-valued details replace the
  whole list/rows. A catalog may declare `resolveDetails` (system-owned adapters, e.g.
  `systems/star-wars-wod/catalogAdapters.ts`: dice → dots with `catalog-detail-out-of-range`
  clamping, scale name → enum, armor label split, arc names). Detail kinds: `text`, `number`,
  `boolean`, `rows`.
- Reference fields belong to the template's setting (spec 017,
  `features/sheet/data/referenceScope.ts`). The setting is `catalogScopeOf`'s (user setting,
  shipped line = system + module, or system). `referenceTargetsOf` lists its kinds once each:
    - user setting: the ruleset's `coreDefinitions` kinds + user types owned by the setting;
    - shipped line: the module's kinds + `coreDefinitions` kinds + user types owned by the module
      or by the system without a module;
    - system without a module: its module-less kinds + user types owned by the system without a
      module; an unregistered system: none.

    Equal labels gain the setting (`targetLabel`); the user's own type of the same name in the same
    setting gets "(yours)". The editor's kind picker lists these, then stored targets outside them
    as "(unavailable)" (`referenceKindName`), kept until unchecked. On the sheet, `useTemplatePage`
    flags each `DocumentOption.inScope` (`isDocumentInReferenceScope`: same system — the user
    setting's ruleset for a user setting —, same `metadata.settingId` or none, a scope kind); the
    search offers in-scope options of the target kinds. A selected id whose document exists but is
    out of scope or not a target kind shows its title, an "outside this setting" note, open and
    remove, and reports `reference-target-out-of-scope` once; a stale id shows the "missing
    document" placeholder and reports `reference-target-missing` once (value kept). Neither is
    reported in previews; an absent `inScope` (story/preview options) reads as in scope. Reference
    list entries (spec 016) render the same control.

## Document source

Renderers never read the store directly: `useTemplatePage` and `useBoundDocument` read
`useDocumentSource()` (`hooks/useDocumentSource.ts`). Default = the editable store's current
document. Wrap a subtree in `DocumentSourceContext.Provider` with:

- `createStaticDocumentSource(envelope)`: read-only (no writes, no preset seeding) — documentation
  previews and the editor's quick preview;
- `createScratchDocumentSource(envelope, definition)`: writable in memory with the store's write
  rules (data re-parsed, template values through `applyTemplateValueWrites` in
  `features/sheet/data/templateValueWrites.ts`) — the editor's sample data. It never reaches the
  store; `scratch.useSource()` subscribes a component to it.

`DocumentSource.preview` (static and scratch sources) disables reference "open document" and the
`reference-target-missing` report; `readOnly` only disables writes.

## Formulas (`features/sheet/declarative/formula.ts`)

- Grammar: numbers, coordinates (`kebab` or `kebab.current` / `kebab.max`), `+ - * /`, parentheses,
  unary minus, and `min(a, b, …)` / `max(a, b, …)`. Pure tokenizer → parser → evaluator.
- One coordinate space: bag numbers plus system traits/pools (`readBoundNumber`, called from
  `resolveBase` in `hooks.ts`).
- `formula` fields are read-only and never stored. `maxFrom` (rating/number/primitive) clamps
  the display; stored values are clamped only when the bounded value itself is edited. For a
  rating the resolved maximum also raises the range above the static `max`, up to 100.
- Errors are labeled in the UI (`unknown-coordinate` names the coordinate, `circular` for a
  real cycle or a formula reading itself, `division-by-zero`, `non-numeric` for a stored value
  that is not a number, `parse` for a formula that does not parse, which also reports
  `formula-error`). A missing value is final for the render pass, never a cycle. Behavior tests:
  `template-formulas.test.ts` (grammar), `derived-values.test.tsx` (sheet), the "derived values"
  block of `template-editor.test.tsx` (draft issues and live preview).
- Cycles are rejected at authoring (`collectDraftIssues`); at render the evaluator in
  `useTemplatePage` re-orders by dependency with its own cycle guard.
- `collectFormulaDependencies` in `types/template.ts` uses a regex, not the parser (import
  cycle workaround) — it can disagree with `parseFormula` on odd input.

## Documentation embeds (`src/sheet_manager/docsEmbeds.tsx`)

The only entry point docs import. Embeds render the **shipped** default template (never an
edited override) so prose and page stay in sync:

- `<TemplateFragment template="full-sheet" node="attributes" />` — a subtree against the
  reader's current document (editable). Other systems pass `systemId` and their template id
  (`systemId="wod-v5" template="v5-hunter-sheet"`). Without a document of the same system and kind
  it shows a short prompt plus a create button for the definition owning that view.
- `<TemplatePreview document={presetCharacterDocument(JAX_VORN_PRESET)} node="base" />` — a
  fixed document, read-only. Helpers: `healthPreviewDocument(levels)`,
  `vehicleDamagePreviewDocument(levels)`, `exampleDocument('<id>::preset')` (examples in
  `systems/star-wars-wod/examples.ts`, values taken from page prose: `wampa`,
  `stormtrooper-squad`, `red-five`, `lukes-landspeeder`, `millennium-falcon`), and the
  `JAX_VORN_PRESET` re-export, `hunterExampleDocument()` (Lena Varga), `PolicyStatement`
  (full policy statement, used only on the policy's own docs page; embeds show no notice), `CatalogSummaryTable` (catalog names
  with `summary` descriptors, optional `groupBy` and child catalog), and
  `CreateCharacterButton`. MDX imports sheet content only from `docsEmbeds.tsx`.
- Embeds use `DeclarativeSheetView embedded` (no page chrome, no preset seeding — a partial
  render must not mark the template as seeded).
- `tests/sheet_manager/docs-embeds.test.tsx` scans en + ru MDX and fails on any embed whose
  template/node/systemId or `exampleDocument` id does not exist, and on any MDX import of
  retired sheet modules; every example renders each of its kind's views without degradation.

## Page resolution (`features/sheet/CharacterSheet.tsx`, `systems/view.ts`)

1. `assignedTemplateId(document, settings)` (`systems/userTypes.ts`): `metadata.templateId`,
   else the user setting's page for the definition (`setting.pages[definitionId]`) →
   `resolveCustomTemplate` against user templates. Found and kind matches → render it.
   Missing/foreign → remember a fallback notice.
2. Otherwise the view id (`metadata.preferredViewId`, aliases via `legacyIds`) →
   `resolveEffectiveTemplate`: user template with that id, else the system's shipped default
   (override applied when present, `modified: true`).
   Overrides are keyed by the canonical view id, so a shared alias (`brief`) never picks up
   another kind's override; user templates must match the document kind.
3. Every view is `{ type: 'declarative', templateId }` with a shipped default of the same id
   and kind (asserted for every system by `built-in-templates.test.ts`). If that template is
   missing anyway, a fallback notice renders — never a throw.

Each fallback (`missing` / `kind-mismatch` custom template, `unknown-view`, `no-default`,
`type-missing`) reports `template-fallback` once with `documentId`, `reason`, and `requested`.
A user-type document whose type is not installed renders the stored-values page
(`buildOrphanPage` in `features/sheet/data/orphanPage.ts`: one text field per stored key) under a
"type not installed" notice; before `documentTypeStore` hydrates it renders a loading line and
reports nothing (`useDocumentTypesHydrated`).

Per-kind views (Star Wars): character `full-sheet` + `brief` (alias `npc-card`); droid
`droid-sheet` + `droid-brief`; creature `creature-sheet` + `creature-brief`; vehicle
`vehicle-sheet` + `vehicle-brief`; fodder group `fodder-sheet` + `fodder-brief`. Entity and
droid briefs alias `brief` and `npc-card`.

The selector (`ViewModeSelect`) encodes custom templates as `tpl:<id>`; view ids are plain. It
offers only templates whose `settingId` equals the document's `metadata.settingId` (both absent
counts as equal; `templateMatchesSetting`).

## Stores and persistence

- `templateStore` v5: `templates`, `quarantine` (max 100), `defaultOverrides` keyed by
  `overrideKey(systemId, viewId)` (T-046; v4 bare view-id keys are re-keyed from each override's
  own `systemId` on load). `setDefaultOverride(template)` keys by the template's system and id;
  `clearDefaultOverride(systemId, viewId)`. Entries failing the parse (including all pre-006
  shapes) move to quarantine and report `template-quarantined` with the Zod summary.
- `documentTypeStore` v3 (`universal-document-type-storage`): user document types (their
  `defaultTemplateId` is optional: a type may have no page), user settings, `defaultPages`
  (`systemId:definitionId` → the view or user template new documents of a shipped type open on;
  `setDefaultPage`, `dropDefaultPagesFor`), user catalogs (spec 015; `saveCatalog`,
  `removeCatalog`, `replaceCatalogs`), and a bounded quarantine shared by all of them.
- `documentStore` v4: flat `templateValues`; v2 nested bags are flattened on load
  (`flattenLegacyTemplateValues`). Unparseable documents go to `recoveryEntries` (max 100) and
  report `document-recovered`. `createDocument(systemId, definitionId, { settingId, templateId,
preferredViewId })`; creation flows ask `newDocumentPage` (`features/sheet/data/libraryPages.ts`)
  for a shipped type's chosen default. `relocateDocuments(changes)` applies the document side of a
  library move in one write (`null` clears; only user-type documents change `systemId`).
- `metadata.seededPresets`: list presets are copied once per document × template
  (copy-on-assign); custom lists seed only when named, through `presetListEntry(item, …)`. The seeding effect in `useTemplatePage` writes bag, data, and metadata.

## Editor (`components/dialogs/template-editor/`)

Three areas (spec 012): **Outline** (`OutlineTree.tsx`), **Page** (`EditorPage.tsx`), and
**Settings** (`ElementSettings.tsx`, the selected element only); below `md` they are tabs. On
desktop two `PaneDivider`s (`role="separator"`, arrows / Shift / Home / double click) resize the
side areas; `usePaneWidths` keeps them in localStorage `template-editor-panes` (outline 160–420,
settings 260–560, page ≥ 360; only a CSS variable moves while dragging). The toolbar switches
Edit / Preview (`EditorPreview.tsx`) and has Undo / Redo and the shortcut list.

- `draft.ts`: `EditorDraft = CustomTemplate`; pure tree ops with structural sharing (`insertNode`,
  `moveNode`, `updateNode`, `removeNode`, `duplicateNode`, placement helpers `placeNode` /
  `insertAtPlacement` / `materializeColumns`), node factories, `moveTableColumn`, and
  `collectDraftIssues` (spec 022): issues carry `nodeId` and `setting: { group, key }`, where
  `key` is the control's `data-setting` (`label`, `maxFrom`, `entry.label`,
  `column:<id>.<key>`, `option:<i>`, `preset:<i>`, `tracker`, …). `checkFieldSettings` runs the
  same field checks on page fields, table columns, and list entry fields; column and entry
  issues select their table or list. Formula wording comes from `checkFormulaInput`
  (`features/sheet/data/formulaCheck.ts`), shared with the inline message under formula boxes.
  Two elements on one bridged system coordinate are not duplicates.
- `issues.ts`: `issueLocation(draft, zodPath)` maps a schema path to the nearest node and
  setting; `useSchemaBackstop` parses the draft with `CustomTemplateSchema` on open and 300 ms
  after typing pauses (~20 ms on the full sheet) and lists every rule the specific checks miss as
  "{Setting} has a value that is not allowed". Save is disabled by specific issues only; a refused
  save maps the Zod error the same way (raw schema text never reaches the author) and
  `reportUncoveredIssues` reports `template-draft-invalid` — add a specific check for it. Issue
  buttons call `goToIssue`: select, open the group, open `<details>`, focus `[data-setting]`.
  `cloneWithFreshIds` (Duplicate and paste) re-issues ids for nodes, table columns, entry fields,
  and options, keeps bridged coordinates, drops custom value keys on the same page (keeps them on
  another page unless taken there), and remaps the copy's formulas and display conditions to the
  copy's own coordinates (`renameFormulaCoordinates` in `declarative/formula.ts`, token-based).
- `history.ts`: every change goes through the dialog's `change` / `applyOp` into a bounded (100)
  history of `{ draft, selection }`; edits with the same `coalesceKey` (`<nodeId>:<props>`)
  within 800 ms are one step.
- **Selection** (`selection.ts`, spec 023): `{ ids, anchor }` in each snapshot (undo restores it).
  Click selects one, Ctrl/⌘+click toggles, Shift+click adds the anchor's sibling range (across
  parents just the two). Every command uses `normalizeSelection` (existing ids, ancestors win,
  page order). `multiOps.ts` has the one-step set operations: `removeNodes`, `duplicateNodes`,
  `insertNodesAt`, `placeNodes` (drag of a set), `moveEachByCommand` (Alt+↑/↓ move each within
  its parent from the edge inwards, edge elements stay; out / in / columns all or nothing).
  Escape clears a selection through `Dialog.Content onEscapeKeyDown` before it closes the editor.
  With 2+ selected the settings area is `MultiSettings` (`sharedSettings.tsx`): names, actions,
  and the `SHARED_SETTINGS` descriptors every selected node supports (Mixed = indeterminate /
  placeholder); a change writes every node in one coalesced step. Identity settings (value key,
  options, columns, entry field, type, kind) never get a descriptor. Fields all of one type
  (`sameTypeFields`) instead get `fieldSettings` in its `several` mode: every setting of the type
  (type included) except name, source, value key, options, catalog, and term hint, written to each
  field; `MixedSettingsContext` makes `SettingField`/`ToggleRow` show "Mixed".
- **Clipboard** (`clipboard.ts`, spec 023): `CopiedElements` JSON (format
  `ttgamer-template-elements`, `formatVersion` 1, `source`, `nodes`) through the browser's
  `copy` / `cut` / `paste` events on the dialog content (not in text boxes or over a text
  selection), plus a per-tab memory slot (`rememberCopied`). A keydown fallback runs the action
  when no clipboard event follows (WebKit without a text selection). Pasted text is untrusted:
  `parseCopied` ignores other text, refuses newer versions and nodes the template schema rejects
  (`template-clipboard-invalid`), and `pasteCopied` inserts with fresh ids after the last
  selected element, at the end of a selected group, or at the page end, falling back outward when
  the depth limit refuses. Paste reveals the copy, opening folded ancestors (header toggles only,
  never `aria-haspopup` triggers).
- `commands.ts` (spec 023): the one registry of editor commands — keys, clipboard bindings,
  clicks, the "?" character, label, group, menu flags. `matchEditorShortcut` (`shortcuts.ts`),
  the element menu, the shortcut list (`ShortcutList.tsx`), and the guide's `#arranging` table
  (checked by `editor-commands.test.tsx`) all read it; add a command there first.
  `matchEditorShortcut` matches **`KeyboardEvent.code`** (layout-independent: a Russian layout
  sends `я` with `KeyZ`); "?" matches the character. Text-editing keys stay with a focused
  field; Apple platforms also remove with Backspace. `useEditorShortcuts(element, handlers)` listens on the dialog content
  (a callback ref: portalled content mounts after the first render).
- `moveTargets.ts`: keyboard move targets (`resolveMoveTarget`); column moves in a flowing
  container call `materializeColumns` first so siblings keep their visible columns.
- **Page overlay**: `EditorPage` renders the real `DeclarativeSheetView` (deferred draft) on a
  scratch sample document (open document copy → first `definition.examples` entry → blank) inside
  `TemplateEditorOverlayContext` (`features/sheet/declarative/editorOverlay.ts`). The renderer
  wraps each node via `renderFrame` in `ChildrenGrid.renderNode`, renders condition-hidden nodes
  marked instead of dropping them, uses `editor-`-prefixed collapse keys, and asks the overlay for
  end-of-list slots and empty-column zones. `EditorNodeFrame` (chip, grip, insertion slot) skips
  re-rendering when its node, placement, and `version` (sample values + formula results) are
  unchanged — this keeps a keystroke on the full sheet ~40 ms in jsdom. One delegated click
  listener selects the innermost frame (value controls edit the sample); hover is one delegated
  `pointerover` setting `data-hover`.
- `editorActions.ts`: stable `select(id, origin, mode)` / `insertAt` / `moveTo` actions and the
  selection context (`selected` set, `anchor`, issue node ids).
- **Element menu** (`EditorContextMenu.tsx`, spec 023): one Radix Context Menu per surface (page,
  outline), opened by right click, touch long press, the menu key, or Shift+F10; the dialog's
  `EditorMenuSource` selects the target (a touch menu keeps the selection for Add to selection)
  and builds the items with disabled states from dry runs; focus returns to the grip or row.
- **Drag** (`useEditorDrag.ts`, spec 022): pointer events, mouse and pen only (touch uses the move
  buttons). A grip of a selected element drags the whole normalized selection (`draggedWith`,
  `placeNodes`; spec 023). Grips (`data-drag-handle`, test ids `page-grip-<id>` / `grip-<id>`) start it; past
  5 px `nearestPlacement` picks the nearest accepted slot of the innermost container under the
  pointer (page: `[data-insert-slot]` keys `<parent|root>:<index>:<column|->` and frame
  rectangles; outline: `[data-outline-slot]` rows); `placeNode` on the draft the surface shows
  refuses own-subtree, depth, and no-op slots. After 320 ms on one target the page and outline
  render the uncommitted result (`view.preview`; 8 px hysteresis); release commits it as one
  history step, Escape / blur / pointercancel drop it. Marks are DOM attributes re-applied after
  renders (`data-drop-target`, `data-origin-slot`, `data-previewing`); the context value is
  stable so frames never re-render for a pointer move. `dragTransition` and `nearestPlacement`
  are pure and unit-tested.
- **Kinds** (`elementKinds.ts`, spec 022): presentation only — `section`/`group` are Group ·
  Section / Card, `list`/`table` are List · Entries / Table (`nodeKindLabel`). `switchGroupKind`
  and `switchListKind` convert (entry field ↔ first column; other column types become text) and
  keep the other kind's settings in a per-dialog `KindStash`; `tableKindBlocked` refuses game and
  catalog lists; dropping columns asks first; `kindChangeReport` joins the save confirmation
  when documents hold values of the earlier kind.
- `AddElementMenu.tsx`: Radix popover of Group (a section at the root, a card inside a
  container), Field, List (entries), Tracker; items are built only while open.
- `ElementSettings.tsx` (spec 022): the actions row above the kind chip and the full name, then
  `mergeGroups` of settings parts in `SettingsGroup`s in the fixed order Content, Value, Limits
  and formulas, Look, Visibility and help (empty groups skipped; open state per dialog session
  through `SettingsGroupStateContext`; closed groups show issue counts from
  `IssueGroupCountsContext`). Parts are plain functions returning `GroupedSettings`
  (`fieldSettings` in `FieldEditor.tsx`, `primitiveSettings` in `PrimitiveConfig.tsx`, section,
  group, table, list, and placement parts) — no hooks in them; the components they return may
  use hooks. A fragment whose children are all nothing counts as empty, so a part must not return
  a component that renders `null` (check first, as with `hasTermHint`). Building blocks in
  `settings/`: `SettingField` (visible `<label htmlFor>` = accessible name, help link outside the
  label, hint, message, `data-setting`), `FormulaField` (fx, monospace, coordinate datalist,
  inline `checkFormulaInput` message), `KeyField` (`#`), one `inputClasses`. Row editors
  (options, presets, columns, tracker marks) sit in `[data-setting-list]` and may name inputs by
  `aria-label`. Table columns render a nested `FieldEditor` with keys prefixed
  `column:<id>.`, the list entry field with `entry.`. The catalog picker lists the draft system's
  catalogs only (validation stays global).
- Editor performance rules: tree ops keep untouched nodes' identity; `localizeTemplate` caches
  localized nodes per locale by identity; `useTemplatePage` returns one memoized object; panels
  read draft-derived data from `EditorModelContext` / `EditorFillTargetsContext`; the coordinate
  `<datalist>` is rendered once by the dialog.
- `TemplateEditorDialog`: explicit save/discard; editing a default id saves through
  `setDefaultOverride`, everything else through `saveTemplate` then `onSaved` (user types and
  settings record their pages). Library: reset clears the override; defaults cannot be deleted.
- Retarget (T-070): the header's "Type and setting" select (`listTemplateTargetGroups`, value
  `system/kind[/settingId]`, `setDraftTarget`) moves a page to any system kind, user type, or a
  user setting's core definition; bindings the target lacks become draft issues (save blocked).
  On save `planTemplateRetarget` (`features/sheet/data/templateRetarget.ts`) releases documents
  the page can no longer render (after a confirmation), moves user setting pages (a core
  definition without a page adopts it), and repoints a type's `defaultTemplateId` to another of
  its pages. Shipped overrides and caller-owned flows (`lockTarget`: a new type's first page, a
  setting page) keep their target.
- In-editor help (T-068): `EditorHelp` puts a "?" next to non-obvious settings, linking the
  guide `docs/template-editor/` (en + ru, explicit `\{#anchor}` heading ids) through
  `EDITOR_GUIDE`; `tests/docs/template-editor-guide.test.ts` fails when an anchor disappears
  from either locale. A new or renamed setting worth explaining gets a guide section and a topic.
- Test helpers: `tests/sheet_manager/helpers/editor.ts` (`resetEditorStores`, `pressShortcut`
  with `code` + layout `key`, `openSettingsGroups`, and pointer drags `startDrag` / `dragOver`
  / `releaseDrag` / `dragNode`, which polyfill `PointerEvent` and stub slot rectangles).
- **Row order on the sheet** (spec 022): `components/controls/RowMoveControls.tsx` (grip,
  "Move {name} up/down", Alt+↑/↓ through `rowMoveKeys`, focus kept; rows `[data-reorder-row]`
  inside `[data-reorder-list]`) serves template tables (`moveRow` rewrites row keys `0…n-1` with
  `moveTableRow`), own lists (`moveItem` on `updateList`), game lists (`CustomTraitList` /
  `MeritFlawList` `onMove`), system `RowsBody`, and the editor's table columns. Hidden when the
  document is read-only.

## User document types and settings (spec 012)

- Identity: a user type's id (`user-` + 8) is its document kind **and** definition id; shipped
  ids and kinds may not use the prefix (registry invariant). User settings are `user-setting-` + 8.
- Data: every `user-` document has empty `data` (`UserTypeDataSchema`); all values live in
  `templateValues`. `SystemRegistry.parseDocument` parses them without the type, so load order
  and deleted types never hide documents.
- Registry overlay: `systems/index.ts` feeds `setUserDocumentTypes({ types, settings, templates })`
  from `documentTypeStore` + `templateStore`. `getDocumentDefinition` / `listDefinitions` answer
  for user types with synthesized definitions (`systems/userTypes.ts`: pages = views, default
  first; a type owned by a module carries that module) and an orphan definition (the
  stored-values view) for unknown `user-` ids. `resolveDocumentPolicies` goes through the
  registry, so types inherit system + module policies. Components that list types subscribe to
  `useDocumentTypeStore` to re-render.
- User settings: `{ id, name, systemId, pages }` on a system with `coreDefinitions` (`wod-2e`,
  `wod-v5`); documents record `metadata.settingId`, templates `settingId`; the create dialog lists
  each setting with its ruleset's core definitions and its own types.
- Files: `features/sheet/shell/typeFile.ts` — `ttgamer-document-type` v1 (`type`, `setting?`,
  `templates`, `notices`), validated before any change; `typeInstallState` (new / same /
  conflict), `rewriteTypeIdentity` (keep both), `installTypePayload` (re-ids colliding templates).
  Document exports of user types embed `documentType`; imports install it first
  (`SheetWorkspace`); the library import reads type files too (see "Library").
- The library (spec 013) manages both; see "Library".

## Library (spec 013, `components/dialogs/LibraryDialog.tsx` + `library/`)

One tree replaces the page-template list: **ruleset → setting → document type → page**, derived
on every change by `buildLibraryTree` (`features/sheet/data/libraryTree.ts`) from the registry,
the type and template stores, and one-pass document counts (`countDocuments`). Nothing about the
tree is stored.

- Rulesets are plugins without `SystemPlugin.ruleset`; a setting system declares its ruleset
  (Star Wars: `ruleset: 'wod-2e'`). Under a ruleset: "Rules only" (its definitions without a
  module), one setting per module (Hunter), each setting system, then user settings. A user
  setting lists the ruleset's core definitions (`t:core:<setting>:<definition>`, pages = templates
  with that `settingId`, default = `setting.pages`) and its own types. A user template of a kind
  shared by several definitions (droid and character) is listed once, under the first.
  Unplaceable items go to a read-only "Unavailable" group (`r:unavailable`) and report
  `library-placement`; they are never dropped.
- Node keys (`libraryPages.ts`): `r:`, `s:rules|module|system|user:…`, `t:…`, `p:…`. Default
  pages: user type `defaultTemplateId` (else its first page, else stored values), core type
  `setting.pages`, shipped type `defaultPages` (else `defaultViewId`); `setDefaultWrites` picks
  the right store.
- Actions are pure plans returning `LibraryWrites` (`libraryActions.ts`: create setting/type —
  never a page —, rename, `deletePlan` with document counts, `pageDepartureWrites`) committed by
  `applyLibraryWrites` (one update per store). `availableActions` (`library/actions.ts`) feeds the
  details pane and the context menu alike.
- Moves (`libraryMoves.ts`): user pages → types (T-070 `planTemplateRetarget`), user types →
  settings (owner, template `systemId`/`settingId`, documents follow), user settings → rulesets
  (own types follow; the old core character's documents and pages stay on the old ruleset without
  `settingId`, documents pinned to the page they used). `crossesSystem` (the item's `systemId`
  changes, including Star Wars ↔ WoD 2e) requires the MovePanel confirmation; drag and drop
  (MIME `application/x-ttgamer-library-node`) applies other moves at once.
- Tree UI: flat WAI-ARIA `tree` of expanded rows (`LibraryTree`, `TreeRow`), roving tabindex,
  arrows/Home/End/type-ahead, Enter opens a page, Shift+F10 / Menu opens `ContextMenu` (a Popover
  rendered inside the dialog content so the focus trap keeps it), Delete deletes. Below `md` the
  tree and details are tabs.
- Files (`features/sheet/shell/libraryFile.ts`, `libraryImport.ts`): `ttgamer-library` v2 (v1
  still reads) — flat `settings`, `types`, `templates`, `overrides` (edited shipped pages),
  `catalogs` (a picked page auto-adds the user catalogs it binds; Keep both rebinds the file's
  pages to the copy; beyond the owner limit an entry is unavailable, reason `limit`), `included`
  (`picked`/`auto`), informative `addresses`, `notices`. Export: tri-state ticks
  (`tickState`/`toggleTick`), `exportClosure` adds the user parents a pick needs (tertiary in the
  tree) and turns shipped ancestors into addresses; shipped content is never serialized. Import:
  `parseLibraryFile` also reads `ttgamer-document-type` v1 and `ttgamer-template` v3; the preview
  marks entries new / same / conflict / unavailable; Replace overwrites by id (a replaced type
  keeps installed pages missing from the file), Keep both re-ids the entry and its picked
  descendants with an "(imported)" suffix; templates colliding with shipped view ids or unrelated
  templates get fresh ids. Nothing is written before `installImport`.
- Catalogs (spec 015) are leaves: `RulesetNode.catalogs` (the ruleset's own, then the ruleset
  plugin's shipped catalogs) before its settings, `SettingNode.catalogs` (then a setting system's
  shipped catalogs) before its types; key `c:user:<id>` or `c:<systemId>:<catalogId>`. Shipped
  ones are read-only. `catalogOwnerFor(node)`, `createCatalog` (per-owner limit), rename,
  `deletePlan` (catalogs of a deleted setting go with it; a catalog delete names its bound
  templates), moves to any ruleset or setting (`lostBy`: templates that would no longer see it;
  a setting moved to other rules loses the old ruleset's catalogs). The details pane edits a
  catalog with `library/CatalogTable.tsx` (memoized rows keyed by entry id).
- Help anchors: `EDITOR_GUIDE.library*` → `docs/template-editor/library.mdx`; user catalogs →
  `values.mdx#your-catalogs`. Storybook: the "Library" page
  (`features/docs/LibraryStorybook.tsx`) and the "Your own catalog" element story.

## Import / export (`features/sheet/shell/templateFile.ts`)

`ttgamer-template` wrapper, format version 3 exactly (older and newer are rejected with the
version error). Full validation before any state change; a template of an unregistered system is
rejected (`system` error); unavailable catalogs are stripped to manual choice and listed in the
degradation report (`resolveImportedTemplate`, shared with type files). An imported template
whose id equals a shipped view id gets a fresh `tpl-` id instead of shadowing that page. Files of systems with publisher policies carry a wrapper-level `notices`
array (ignored on import). Filenames: `ttgamer_template_<id>.json`.

## Diagnostics (debug here first)

`src/sheet_manager/diagnostics.ts` is the single channel for degradation paths:

- `reportSheetIssue({ code, message, details })` — codes: `template-value-write-rejected`,
  `template-value-write-skipped`, `template-quarantined`, `document-recovered`,
  `binding-unresolved`, `catalog-unavailable`, `formula-error`, `template-reference-invalid`,
  `template-fallback`, `reference-target-missing`, `reference-target-out-of-scope`,
  `catalog-detail-out-of-range`, `list-entry-unreadable`, `template-value-unreadable`,
  `template-value-hidden`,
  `template-incompatible`, `library-placement`, `template-draft-invalid` (a save found a schema
  rule no editor check covers).
- In development each distinct issue is logged once as `[sheet_manager] <code>: …` in the
  browser console. **A silently ignored edit, an empty section, or a "degraded" card → check
  the console first.**
- Tests: `tests/setup/sheetIssues.ts` fails any test that produces an unexpected issue.
  Tests that exercise degradation on purpose call `takeSheetIssues()` and assert on the result.
- New graceful-degradation code (`return`, `catch`, fallback render) must report through this
  channel; a silent fallback is a bug.

## Extension checklists

Every checklist below ends with the element storybook (constitution VI): the new or changed
element and each of its variants appear in the draft-only docs storybook `docs/dev/storybook/`.
Handwritten stories live in `src/sheet_manager/storybook/stories.ts` (containers, fields,
catalog choice, collections, on sandbox documents); built-in parts are generated per system from
`bindingSignature` (a new binding shape needs a case there when it renders differently). A new
option or presentation also gets a tag in `REQUIRED_VARIANTS` of
`tests/sheet_manager/storybook.test.tsx`. A new docs widget gets an example on
`docs/dev/storybook/docs-widgets.mdx`; colors come from `tailwind.config.cjs` automatically.
States that depend on the reader's own documents get a fixed-sample widget next to the stories
(`ReferenceEntryVariants` in `features/docs/ElementStorybook.tsx`, on `template-elements.mdx`). A
setting's missing element is added as an editor-configurable template element, preferably as an
option on an existing field or primitive rather than a similar new one.

**New field type** (e.g. `date`): object schema, `fieldObjectSchemas`, the node
discriminated union, `TEMPLATE_FIELD_TYPES`, and `refineField` in `types/template.ts`; the
value switches in `types/templateValues.ts`; a control in `fieldControls.tsx` + the entry in
`registry/declarativeFieldRegistry.ts`; the `baseField` factory in `draft.ts`; a config branch
in `FieldEditor.tsx`; the `fieldTypes.<type>` label in en/ru YAML + `yarn build:translations`;
tests. The compiler flags every missing piece except the `FieldEditor` branch and tests
(exhaustive switches and `Record<TemplateField['type'], …>` maps; the editor type picker and
all leaf predicates derive from the canonical list).

**New binding kind**: descriptor interface + union in `systems/templateBindings.ts` (plus
`resolveDataBindingByCoordinate` / `listNumericCoordinates` / `readBoundNumber` if it is
bridgeable or numeric); declarations in the system's bindings file; `PrimitiveNodeView` switch
(`primitives.tsx`); editor sources (`sourceNodes.ts` conversions, `SourceControls.tsx` groups)
and `PrimitiveConfig`.

**New system**: a folder `systems/<system>/` with a `SystemPlugin` (translated `label`,
`documents`, `defaultTemplates`, `templateBindings`, `catalogs`, `policies`, optional
`coreDefinitions` for user settings) registered in `systems/index.ts`. Definitions may declare
`examples` (preview data in the editor). Engines shared by several lines use `ruleset/` (schema shape, bindings
builder, page parts) plus `modules/<line>/` (schema extension, bindings, catalogs, templates,
definition with `module`). Prefix view ids with the system (`v5-hunter-sheet`). Strings go to
per-layer YAML (`ui/sheet/<system>.yaml`, `ui/sheet/<system><Line>.yaml`,
`data/<catalogId>.yaml`); tests to `tests/sheet_manager/systems/<system>/`. No generic file
changes are needed for data addressing.

**Terminology**: _full_ and _brief_ are views (shipped templates); _compact_ is a primitive
display mode used inside brief views (for trackers it reads as the `line` display).

**New catalog**: `defineCatalog` in the owning system's `catalogs.ts`, listed on
`SystemPlugin.catalogs` (closed fillable-detail set, optional system-owned `resolveDetails`);
lists, rows, and field suggestions reference it by catalog id.

**New document kind page**: bindings for the kind (reuse field/trait/resource/rows/track
shapes), a template module under the system's `templates/` built with the neutral builders,
views declared with `templateView(id, label, legacyIds)`, labels in YAML, and a row in the
settings table below.

## Entity pages and other settings (feature 007)

What a future setting (D&D, cyberpunk, …) reuses versus supplies for the same page kinds:

| Kind         | Star Wars–specific (setting supplies)                                                                 | Reusable as-is                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Creature     | combat scales + scale enum, WoD physical/mental traits, tier soak rule, bestiary adapter, rules links | identity/description/source layout, member health track, attacks rows, merits/flaws lists, `visibleWhen` tier switch     |
| Vehicle      | scale enum, vehicle-damage level names, system ratings, hyperdrive/nav fields, arcs, vehicle adapter  | identification/capacity layout, weapons rows, crew-station references, systems/modifications tables, member damage track |
| Fodder group | WoD attributes, quick-pool table, lethal-soak reminder, 3/5/7 health variants                         | member cohort (count, length variants, defeated state), leader reference, shared-stat block                              |

Setting-neutral layers (no system identifiers; guarded by `entity-templates.test.tsx`):
`templates/builders.ts`, `systems/templateBindings.ts`, `features/sheet/declarative/**`.

## Known debts (as of 2026-09-13)

- Primitive molecules (trait rows, merit/flaw lists, equipment sections) are WoD-family UI; a
  non-WoD system will need its own molecules behind the same binding kinds. Star Wars equipment still
  goes through the `character` capability (catalog fills); other systems bind `dataKey` arrays.
  Item rules (new items, counter clamps) live in `features/sheet/body/equipmentItems.ts`; the
  section molecules take their name suggestions as a `catalog` prop.
  `dataKey` equipment bindings may declare `catalog: { catalogIds, fills }` (detail key → item
  field; `name` and string details are written localized).
- Catalogs may declare `browse` (columns with header descriptors, `labels`, `filter`, optional
  `children`) for the docs `CatalogBrowser`; `entryText(entry, key, lang)` localizes any string
  property from `translations/source/<locale>/data/<catalogId>.yaml`.
- Vehicle system slots are a bag table capped at 10 rows (not pre-seeded slots); crew-station
  references render placeholders in previews (static sources hold one document).
- Binding keys are not literal types (bindings are built at runtime per system); integrity
  relies on `validateTemplateReferences` rather than the compiler.
- `useTemplatePage` (`hooks.ts`) mixes store wiring, formula evaluation, list/catalog runtime,
  and preset seeding; `draft.ts` is similarly overloaded.
- `NodeView` is memoized, but a template change still re-renders every node of the real sheet
  (the page API changes with the template); only the editor frames skip unchanged nodes.
- Retired pre-template blocks, viewers, views, and `DocumentSheetSections` are archived
  (reference only) in `context/sheet-manager/legacy-sheet-components/`.

## Tests map (`tests/sheet_manager/`)

| Concern                           | File                                                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema, tree guardrails           | `template-schema.test.ts`                                                                                                                                  |
| Value write path, validation      | `template-value-writes.test.ts`, `document-template-values.test.ts`                                                                                        |
| Renderer, bridging, catalogs      | `declarative-sheet.test.tsx`, `shared-values.test.tsx`                                                                                                     |
| Primitives, default renders       | `primitives.test.ts`, `primitive-parity.test.tsx`, `primitive-seeding.test.ts`                                                                             |
| Entity bindings, catalog adapters | `entity-bindings.test.ts`                                                                                                                                  |
| Entity pages, fills, neutrality   | `entity-templates.test.tsx`, `cohort-track.test.tsx`, `reference-controls.test.tsx`                                                                        |
| Documentation embeds, examples    | `docs-embeds.test.tsx`                                                                                                                                     |
| Bindings, document source         | `document-bindings.test.ts`, `document-source.test.ts`                                                                                                     |
| Lists, images                     | `template-lists-images.test.ts`                                                                                                                            |
| Formulas                          | `template-formulas.test.ts`                                                                                                                                |
| Defaults, overrides, resolution   | `default-templates.test.ts`, `built-in-templates.test.ts` (views = templates), `view-resolution.test.ts`                                                   |
| Stores, quarantine                | `template-store.test.ts`, `template-store-migration.test.ts`                                                                                               |
| Editor                            | `template-editor.test.tsx`, `template-editor-{page,arrange,preview,history,shortcuts,move-targets,settings,panes}.test.*`, `template-editor.perf.test.tsx` |
| Editor issues, drag, kinds        | `draft-issues-coverage.test.ts`, `issue-location.test.ts`, `formula-check.test.ts`, `editor-drag.test.ts`, `element-kinds.test.ts`                         |
| Row and column order              | `table-list-order.test.tsx`                                                                                                                                |
| User types, settings, files       | `user-document-types.test.{ts,tsx}`, `user-settings.test.tsx`, `type-file.test.ts`, `document-type-store.test.ts`                                          |
| Library tree, moves, files, UI    | `library-{tree,moves,file,import}.test.ts`, `library-dialog.test.tsx`, `document-store-relocate.test.ts`, `systems/registry-rulesets.test.ts`              |
| User catalogs                     | `user-catalogs.test.ts`, `catalog-edit.test.ts`, `catalog-use-sites.test.tsx`                                                                              |
| WoD 2e ruleset, Star Wars parity  | `systems/wod2e/{star-wars-parity.test.ts,engine.test.tsx}` (fixture `fixtures/star-wars-parity.json`)                                                      |
| Trackers                          | `tracker-{schema,rules,changes}.test.ts`, `tracker-{field,builtin,parity,brush,from-start}.test.tsx`, `pool-tracker.test.ts(x)`, `cohort-track.test.tsx`   |
| References                        | `template-references.test.ts`, `reference-scope.test.{ts,tsx}` (setting scope, stale targets, imports)                                                     |
| File format                       | `template-file.test.ts`, `catalog-bindings.test.ts`                                                                                                        |

## History (read for rationale only)

| Spec | What it introduced                                                                                                                      | Superseded parts                                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 003  | Section → block → field templates, catalog bindings, file format v1                                                                     | Fixed hierarchy, file v1 (→ 006)                      |
| 004  | Views as default templates, overrides, `built-in` block placements                                                                      | View-derived defaults, placements (→ 005/006)         |
| 005  | Binding registry, primitives, preset seeding, hybrid defaults                                                                           | Hybrid defaults, placement path (→ 006)               |
| 006  | Recursive tree v3, formulas, lists/images, pure defaults, quarantine                                                                    | Built-in layout path (→ 007)                          |
| 007  | Entity templates, kind-independent bindings, member tracks, fills, `visibleWhen`, docs embeds, legacy retirement                        | Kind-only matching, SW-owned catalogs (→ 008)         |
| 008  | V5 ruleset + Hunter module, computed-length tracks, trait row options, plugin catalogs, policies/badges                                 | —                                                     |
| 012  | Visual editor (outline/page/settings, history, shortcuts), user types and settings, type files, composite override keys, WoD 2e ruleset | Recursive panel editor, view-id override keys         |
| 013  | Library tree (rules → settings → types → pages), moves, library files, default-page choice, tertiary accent                             | Page-template list, type-file export (→ library file) |
| 022  | Grouped settings panel, issues with settings and schema backstop, pointer drag with preview, resizable areas, row/column order, kinds   | HTML5 drag, flat settings panel, six-item add menu    |
