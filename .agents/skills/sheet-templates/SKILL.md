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
  `rating`, `resource`, `reference`.
- Other leaves: `table` (columns are fields; rows stored under `tableValueKey`), `list`
  (exactly one of `valueKey` or `bindingKey`), `primitive` (`bindingKey` into system data).
- Any node may carry `visibleWhen: { coordinate, equals, not? }`: rendered only while the value
  at the coordinate (bag value or bound document data) equals `equals` (`not` inverts). Never
  affects storage; the editor always shows the node (condition control on every panel). An
  unknown coordinate hides the node and reports `binding-unresolved`; `validateTemplateReferences`
  flags it as `unknown-coordinate`.
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
      Tracks render as a Level / Penalty / Damage table, or a one-line strip when `compact`. Compact pools render `current / max` boxes, compact ratings number boxes.
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
  fill targets, and formula/`maxFrom` coordinates against `listTemplateNumericCoordinates`.
- An unknown key, wrong kind, missing character, or missing body handlers renders the labeled
  `DegradedBinding` notice and reports `binding-unresolved` with a `reason`.
- Catalogs are declared by plugins (`SystemPlugin.catalogs`, built with `defineCatalog` from
  `systems/catalogs.ts`; Star Wars in `systems/star-wars-wod/catalogs.ts`, Hunter in
  `systems/v5/modules/hunter/catalogs.ts`). `features/sheet/data/catalogBindings.ts`
  (`CATALOG_BINDINGS`) only aggregates them from the registry (a duplicate id throws); entry
  names localize from `translations/source/<locale>/data/<catalogId>.yaml`. They are the only path
  from system data into templates: select fields persist `catalogId` + fill mappings and system
  lists resolve `binding.catalog.catalogId` from the same registry. Unknown catalogs degrade to
  manual choice and report `catalog-unavailable`.
- Fill semantics (`readCatalogDetails` + `pageApi.applyWrites`): picking an entry **overwrites**
  every mapped target in one change — a detail the entry lacks (`undefined`) leaves its target
  untouched, `null`/`''` clears it; clearing the select writes nothing. Fill targets may be
  field ids, value keys, value-key lists, or writable binding coordinates (bridged data:
  traits, resources, fields, rows, lists with a `coordinate`); row-valued details replace the
  whole list/rows. A catalog may declare `resolveDetails` (system-owned adapters, e.g.
  `systems/star-wars-wod/catalogAdapters.ts`: dice → dots with `catalog-detail-out-of-range`
  clamping, scale name → enum, armor label split, arc names). Detail kinds: `text`, `number`,
  `boolean`, `rows`.
- Reference fields offer only `targetKinds`, show an "open" button (switches the workspace's
  current document; no-op in previews), and render a "missing document" placeholder for a
  stale id (value kept, `reference-target-missing` reported once; not reported in previews).

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
  the display; stored values are clamped only when the bounded value itself is edited.
- Errors are labeled in the UI (`unknown-coordinate` names the coordinate, `circular`,
  `division-by-zero`, `non-numeric`). Unparseable formulas also report `formula-error`.
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
- `documentTypeStore` v1 (`universal-document-type-storage`): user document types and user
  settings plus a bounded quarantine (see "User document types and settings").
- `documentStore` v4: flat `templateValues`; v2 nested bags are flattened on load
  (`flattenLegacyTemplateValues`). Unparseable documents go to `recoveryEntries` (max 100) and
  report `document-recovered`. `createDocument(systemId, definitionId, { settingId, templateId })`.
- `metadata.seededPresets`: list presets are copied once per document × template
  (copy-on-assign). The seeding effect in `useTemplatePage` writes bag, data, and metadata.

## Editor (`components/dialogs/template-editor/`)

Three areas (spec 012): **Outline** (`OutlineTree.tsx`), **Page** (`EditorPage.tsx`), and
**Settings** (`ElementSettings.tsx`, the selected element only); below `md` they are tabs. The
toolbar switches Edit / Preview (`EditorPreview.tsx`) and has Undo / Redo.

- `draft.ts`: `EditorDraft = CustomTemplate`; pure tree ops with structural sharing (`insertNode`,
  `moveNode`, `updateNode`, `removeNode`, `duplicateNode`, placement helpers `placeNode` /
  `insertAtPlacement` / `materializeColumns`), node factories, and `collectDraftIssues` (issues
  carry `nodeId`; two elements on one bridged system coordinate are not duplicates).
  `duplicateNode` re-issues ids for nodes, table columns, and options, drops custom value keys,
  and keeps bridged coordinates.
- `history.ts`: every change goes through the dialog's `change` / `applyOp` into a bounded (100)
  history of `{ draft, selectedId }`; edits with the same `coalesceKey` (`<nodeId>:<props>`)
  within 800 ms are one step.
- `shortcuts.ts`: `matchEditorShortcut` matches **`KeyboardEvent.code`** (layout-independent:
  a Russian layout sends `я` with `KeyZ`) — Ctrl/⌘+Z / Shift+Z / Y / D, Delete, Alt+arrows
  (move among siblings, out of / into a group), Alt+Shift+←/→ (column). Text-editing keys stay
  with a focused field. `useEditorShortcuts(element, handlers)` listens on the dialog content
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
- `editorActions.ts`: stable `select` / `insertAt` / `moveTo` actions and the selection context;
  the drag MIME type is `application/x-ttgamer-template-node`.
- `AddElementMenu.tsx`: Radix popover of Section, Field group, Field, Table, List, Tracker; items
  are built only while open (hundreds of slots).
- `ElementSettings.tsx`: move / duplicate / delete actions plus the per-element controls
  (`SourceControls.tsx`, `FieldEditor.tsx` incl. the reference kind picker,
  `PrimitiveConfig.tsx`, `LayoutControls.tsx`, `TermHintControl.tsx`). The catalog picker lists
  the draft system's catalogs only (validation stays global).
- Editor performance rules: tree ops keep untouched nodes' identity; `localizeTemplate` caches
  localized nodes per locale by identity; `useTemplatePage` returns one memoized object; panels
  read draft-derived data from `EditorModelContext` / `EditorFillTargetsContext`; the coordinate
  `<datalist>` is rendered once by the dialog.
- `TemplateEditorDialog`: explicit save/discard; editing a default id saves through
  `setDefaultOverride`, everything else through `saveTemplate` then `onSaved` (user types and
  settings record their pages). A user type's pages cannot change kind. Library: reset clears the
  override; defaults cannot be deleted.
- Test helpers: `tests/sheet_manager/helpers/editor.ts` (`resetEditorStores`, `pressShortcut`
  with `code` + layout `key`, `dragNode`).

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
  (`SheetWorkspace`), template imports accept type files (`TemplateImportDialog`).
- Library: "New document type" (owner = shipped setting or user setting), export / delete type
  (confirmation counts documents; documents stay), and `UserSettingsPanel` (new setting, setting
  page per core definition, delete setting).

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
  `template-fallback`, `reference-target-missing`, `catalog-detail-out-of-range`,
  `template-incompatible`.
- In development each distinct issue is logged once as `[sheet_manager] <code>: …` in the
  browser console. **A silently ignored edit, an empty section, or a "degraded" card → check
  the console first.**
- Tests: `tests/setup/sheetIssues.ts` fails any test that produces an unexpected issue.
  Tests that exercise degradation on purpose call `takeSheetIssues()` and assert on the result.
- New graceful-degradation code (`return`, `catch`, fallback render) must report through this
  channel; a silent fallback is a bug.

## Extension checklists

Every checklist below ends with the element storybook (constitution VI): the new or changed
element and each of its variants appear in the draft-only docs storybook (T-069 builds it). A
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
display mode used inside brief views.

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

| Concern                           | File                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema, tree guardrails           | `template-schema.test.ts`                                                                                                                   |
| Value write path, validation      | `template-value-writes.test.ts`, `document-template-values.test.ts`                                                                         |
| Renderer, bridging, catalogs      | `declarative-sheet.test.tsx`, `shared-values.test.tsx`                                                                                      |
| Primitives, default renders       | `primitives.test.ts`, `primitive-parity.test.tsx`, `primitive-seeding.test.ts`                                                              |
| Entity bindings, catalog adapters | `entity-bindings.test.ts`                                                                                                                   |
| Entity pages, fills, neutrality   | `entity-templates.test.tsx`, `cohort-track.test.tsx`, `reference-controls.test.tsx`                                                         |
| Documentation embeds, examples    | `docs-embeds.test.tsx`                                                                                                                      |
| Bindings, document source         | `document-bindings.test.ts`, `document-source.test.ts`                                                                                      |
| Lists, images                     | `template-lists-images.test.ts`                                                                                                             |
| Formulas                          | `template-formulas.test.ts`                                                                                                                 |
| Defaults, overrides, resolution   | `default-templates.test.ts`, `built-in-templates.test.ts` (views = templates), `view-resolution.test.ts`                                    |
| Stores, quarantine                | `template-store.test.ts`, `template-store-migration.test.ts`                                                                                |
| Editor                            | `template-editor.test.tsx`, `template-editor-{page,arrange,preview,history,shortcuts,move-targets}.test.*`, `template-editor.perf.test.tsx` |
| User types, settings, files       | `user-document-types.test.{ts,tsx}`, `user-settings.test.tsx`, `type-file.test.ts`, `template-import-dialog.test.tsx`                       |
| WoD 2e ruleset, Star Wars parity  | `systems/wod2e/{star-wars-parity.test.ts,engine.test.tsx}` (fixture `fixtures/star-wars-parity.json`)                                       |
| References                        | `template-references.test.ts`                                                                                                               |
| File format                       | `template-file.test.ts`, `catalog-bindings.test.ts`                                                                                         |

## History (read for rationale only)

| Spec | What it introduced                                                                                                                      | Superseded parts                              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 003  | Section → block → field templates, catalog bindings, file format v1                                                                     | Fixed hierarchy, file v1 (→ 006)              |
| 004  | Views as default templates, overrides, `built-in` block placements                                                                      | View-derived defaults, placements (→ 005/006) |
| 005  | Binding registry, primitives, preset seeding, hybrid defaults                                                                           | Hybrid defaults, placement path (→ 006)       |
| 006  | Recursive tree v3, formulas, lists/images, pure defaults, quarantine                                                                    | Built-in layout path (→ 007)                  |
| 007  | Entity templates, kind-independent bindings, member tracks, fills, `visibleWhen`, docs embeds, legacy retirement                        | Kind-only matching, SW-owned catalogs (→ 008) |
| 008  | V5 ruleset + Hunter module, computed-length tracks, trait row options, plugin catalogs, policies/badges                                 | —                                             |
| 012  | Visual editor (outline/page/settings, history, shortcuts), user types and settings, type files, composite override keys, WoD 2e ruleset | Recursive panel editor, view-id override keys |
