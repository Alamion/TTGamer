# Sheet Templates — Node Tree

Reference for the `sheet-templates` skill: every node type, its fields, and its limits. The
invariants are in the skill index.

## Node tree (`types/template.ts`, schema v3)

- Containers: `section` (CollapsibleBlock, no background, `docsPath`, `columns` 1–4) and `group`
  (SectionCard surface, opt-in `collapsible`). Accents alternate by sibling parity, never stored.
- Leaf fields (`TemplateField`): `text`, `number`, `toggle`, `image`, `formula`, `select`, `rating`,
  `resource`, `reference`, `tracker` (see "Trackers" below).
    - Controls: `toggle` is the round `Checkbox` dot; multiple `select` is a row of pressable words
      (thin primary border when chosen) in option order (`hideUnselected` shows only chosen ones
      until the reader expands it); `rating` is a trait row (`components/stat-fields/RatingRow`, the
      same atoms as `TraitRow`): `presentation` `dots` (1..max, `min` a filled floor) or `number`
      (`'boxes'` parses as dots); optional `textInput`, `showNumbers`, `dice` (the system's
      `traitPool` through `StatDiceButton`), and `flags` (S/P/E subset, dots only). Text and flags
      live beside the number under `ratingDetailKey(valueKey)` (`<key>#detail`,
      `RatingDetailSchema`), so formulas, conditions, and shared keys keep reading a number. Stored
      ratings are bounded by `min` and `TEMPLATE_LIMITS.ratingMax` (100), not the static `max`: a
      resolved `maxFrom` decides the range (`ratingEffectiveMax`). In table cells the column header
      names the rating; a number rating with `showNumbers` frames a read-only "/ max" like a
      resource. Every field has `labelPosition` (`top` caption or `left` trait-row label,
      `FieldLabel`); unset uses `fieldLabelPosition` (rating and formula: left, others: top). Every
      numeric input (fields, resource, editor settings) is `shared/components/NumberInput`: numeric
      text only, bounded to min/max/step on blur or Enter, arrow keys step.
- Other leaves: `table` (columns are fields; rows stored under `tableValueKey`), `list` (exactly one
  of `valueKey` or `bindingKey`), `primitive` (`bindingKey` into system data).
- Custom lists (`valueKey`, spec 016): `item` is the entry template — any field except a formula
  (`ListItemFieldSchema`, `LIST_ITEM_TYPES`) — and `named: false` drops the typed entry name. Read
  both only through `listItemField(list)` (unset = `legacyListItem`: named dot rating 0–5 with S/P/E
  and the die, the look of every list saved before 016) and `listIsNamed`. The item id shares the
  template's identifier namespace (`collectTreeIssues`) but is not a page field
  (`collectTemplateFields` skips it; draft `mapFieldItems` reaches it, so the field editor callbacks
  work by id; `FieldEditor itemOfList` hides storage, required, and formula). Entries are
  `TemplateListEntry` `{ id, label?, value?, detail?, pickLabel? }` under `listValueKey`: `value`
  has the item field's own shape, `detail` is a rating's text and flags, `pickLabel` a user-catalog
  pick's name. The write path validates changed entries only (by reference) against the item;
  `coerceListValue(item, value)` shows stored values under a changed item (numbers move between
  number, rating, and resource current) and anything else reads empty and reports
  `list-entry-unreadable`. Rendering: `features/sheet/declarative/listEntries.tsx`
  (`CustomListView`, memoized `ListEntryRow`, `pageApi.updateList` for stable callbacks); every
  control takes `nameSlot`, `rollLabel`, and `removeSlot` and places the remove button by
  `listEntryShape` (row: end of row; block: `LabeledField` trailing). Saving a template whose list
  item or naming changed runs `listItemChangeReport` (compatible documents' stored entries) and asks
  first; stored values are never rewritten by the change.
- Trackers (specs 018–020): one configuration drawn by one molecule for own and built-in trackers. -
  **Own tracker** (`tracker` field): `display` (`table` | `strip` | `line`), `marks` (1–5 kinds: id,
  name, 1–2 code-point symbol, `fill` = palette key `secondary|error|tertiary| success|text|primary`
  (accent) or `#rrggbb`, `layer` = `fill` (default) | `outline`; order = click order and weight
  within a layer; the 5-mark cap counts both layers), `levels` (1–20: id, name, short text `value`),
  `valueColumn` (title, show), `columns` (1–6, `marks` | `text`, `covers` first N shown levels,
  `copies: { max 1–24 }`, at least one marks column), `total`, `totalReads` (`deepest` default |
  `count`), `fromStart` and `fillInside` (spec 020, off), `lengths` (0–6 lists of level ids), `out`.
  Not a list item type, rejected as a table column. Value (`TrackerValueSchema`,
  `templateValues[valueKey]`):
  `{ tracker: 1, length?, columns: { [columnId]: [{ id, marks?: { levelId: markId }, outlines?: { levelId: markId }, texts?: { levelId: text } }] } }`
  — `marks` is the fill slot, `outlines` the outline slot. Display reads a slot by the kind's
  current layer (`tracker.ts` `layerSource`/`layerMarks`: own slot, else the other slot), so a layer
  change in the editor rewrites no document; a collision leaves one entry hidden and counted
  (`hiddenSlotEntries`); ids keep marks on their level and kind when either moves, copy letters come
  from position, a missing column list reads as one copy `a`. The write path checks the shape and
  copy caps only (unknown ids pass, so hidden values survive the next write). - **Built-in tracker**
  (`primitive` on a `track` binding): optional `tracker` override (`display`, `marks[slash|cross]`
  name/symbol/fill, `levels[]` per index name/value or `null`, `valueColumn`, extra `columns`,
  `total`, `valueKey` for the extras). The game keeps level count/order, a computed length (V5), the
  two marks (`TrackBinding.marks` names them: WoD health bashing/lethal, V5 superficial/aggravated,
  else generic Slash/Cross), and members; marks stay in `document.data`, extra columns store a
  `TrackerValue` under `tracker.valueKey ?? node.id` (validated at the write path; member tracks key
  repeated extra copies by member id). A level override keeps the game's other values; a legacy
  `track { levels, names }` with another count still sets the levels (editor offers "Use the game's
  levels"). Display without `tracker.display` (`trackerDisplayOf`): `compact` → `line`, else
  `trackLayout`, else `table` for named levels / `strip` for a computed length; the editor writes
  `tracker.display` and clears both. Total defaults: on for member tracks with 2+ members, off
  otherwise; the shipped Star Wars character/droid page sets it on. - Rules
  (`features/sheet/data/tracker.ts`): the reading layer is `fill`, or `outline` when the tracker has
  no fill kinds (`readingLayer`); a click cycles its kinds empty → kinds… → empty and keeps the
  other layer; with `fromStart`, a press runs that layer like rating dots (boxes 1…N get the mark,
  the rest of the layer clears, pressing the last box of a run of that mark shortens it;
  `fillInside` caps a fill run at the last framed box; `trackerModel.ts`
  `markTracker`/`runTrackerMark`); total = value of the deepest shown level marked on the reading
  layer, or with `totalReads: 'count'` the filled covered boxes and, when the tracker has outline
  kinds and frames any box, "filled / framed" (`countText`); out = last shown level marked there;
  switching the length keeps each mark's shown position and folds the tail into the new last level
  (heaviest wins), each layer on its own, the same as `cohort.ts` `shortenMarks` for stored fodder
  members (proven by `tracker-parity.test.tsx`). - Rendering: `trackerModel.ts` (`ownTrackerModel`,
  `builtInTrackerModel`) → molecule `components/stat-fields/Tracker.tsx` (grid table with ARIA
  roles, strips, one line, legend only when `legend` is on (field or override; off by default,
  built-in too), copy add/remove with confirm, length −/+ with a danger confirm). Boxes 26px (20px
  on one line); an outline is CSS `outline` + `outline-offset` in the mark's color (see-through
  gap), its symbol shows only without a fill. Brush (spec 019): on an editable sheet with the legend
  shown (not one line), legend items are `aria-pressed` buttons; the molecule keeps one
  `{ id, layer }` brush (reset when the mark goes or changes layer); Escape inside the tracker ends
  it; a `role="status"` line says what it marks. Clicks reach bound elements as
  `onMark(…, click: TrackerClick)` = `{ brush }` or `{ layer }`: a left click sends the brush or the
  reading layer; the outline action (right click, Shift+Enter/Shift+Space, a 500 ms touch long press
  that swallows its click) sends `{ layer: 'outline' }` only when `model.hasOutlines` and enabled,
  else the browser keeps the event. Own trackers write through `markTracker`; built-in game columns
  `cohort.ts` `paintMark`/`toggleMark`. Built-in marks are always fills (`hasOutlines: false`). Own
  values: `declarative/TrackerFieldControl.tsx`; built-in: `declarative/BuiltInTracker.tsx`
  (replaces `CohortTrack`; page values reach it through `PrimitiveNodeView`'s `page`). - Editor:
  `TrackerSettings.tsx` serves both (game-fixed parts disabled, game text as placeholders;
  `builtInTrackerSettings.ts` maps the panel onto the override); the Source select
  (`TrackerSourceSelect`, `trackerFromSource`) switches own ↔ built-in keeping id, label, display,
  value column, extra columns, total. Draft issues: a length with no known level, covers ≥ level
  count, an extras key colliding with a value key. Saving runs `trackerChangeReport` (marks, notes,
  copies a change stops showing) with the list report. - Diagnostics: `template-value-unreadable`
  (value of another shape, reads empty) and `template-value-hidden` (count of stored values under
  removed parts), both skipped in the editor preview.
- Any node may carry `visibleWhen: { coordinate, equals, not? }`: rendered only while the value at
  the coordinate (bag value or bound document data) equals `equals` (`not` inverts). Never affects
  storage; the editor always shows the node (condition control on every panel). An unknown
  coordinate hides the node and reports `binding-unresolved`; `validateTemplateReferences` flags it
  as `unknown-coordinate`.
- `docsPath` (sections, groups) is `/docs/<path>[#anchor]` or an `https://` address
  (`shared/utils/docsLink.ts`); site paths render under the reader's locale base URL (`useSitePath`)
  through the `DocsHelpLink` atom. Anything else is an `invalid-docs-link` reference issue (editor
  issue, import report) and renders no link (`template-reference-invalid` at render outside the
  editor). The schema stays lenient so old templates never quarantine.
- Placement: `column` pins a node to a parent column (then every sibling stacks per column, unpinned
  ones in column 1); `span` (2–4) stretches a node over columns in flowing layouts only, with
  per-breakpoint classes (`spanClass`: 3/4-column grids have two columns at `md`).
- Sections and collapsible groups may set `defaultCollapsed` (collapsed until opened, then
  remembered). Select options may carry their own `labelMessage`.
- Guardrails (`TEMPLATE_LIMITS`, `collectTreeIssues`): depth 10, 200 nodes, one id namespace across
  the whole tree; identifiers are lowercase kebab-case.
- Node and field schemas are a `z.discriminatedUnion('type', …)` of plain objects; cross-property
  rules (bounds, unique option/column ids, list storage mode) run in `refineField` / `refineNode`.
  Unknown types yield one `invalid_union_discriminator` issue.
- `TEMPLATE_FIELD_TYPES` and `TEMPLATE_STRUCTURE_TYPES` are the canonical type lists;
  `isTemplateField` / `isContainerNode` are the only leaf/container predicates. Type-level guards
  (`TemplateFieldTypesAreComplete`, `TemplateNodeTypesAreComplete`) fail typecheck when a list and
  the schema disagree.
- `systemId` defaults to `star-wars-wod` when parsing old templates; new drafts take the current
  system. Compatibility is always `systemId` + `documentKind` (`isTemplateCompatible`): custom
  lookups, `resolveEffectiveTemplate`, the library, and the page selector check both. An assigned
  template of another system/kind renders the default page and reports `template-incompatible`.
- Layout and presentation:
    - `column` (1–4) on any node places it in its parent's column layout; when any child of a
      multi-column container sets it, children stack inside their column instead of flowing row by
      row (unplaced children go to column 1). Renderer grids use `grid-cols-1` (`minmax(0,1fr)`)
      tracks so wide rows shrink instead of clipping.
    - Containers: `columnWidths` (e.g. `[2, 1]`) sets proportional columns from the md breakpoint
      via the `--template-columns` CSS variable.
    - Groups: `hideTitle` (no header, never collapsible), `docsPath` (help link), opt-in
      `collapsible`.
    - Lists: own title (`showTitle`) and bordered card (`framed`) are off by default — the enclosing
      group names the list.
    - Fields: `hideLabel` (kept for screen readers); text fields `placeholder` +
      `placeholderMessage`; formula fields `prefix`/`suffix`, rendered as "label … value" rows.
    - Primitives: `hideLabel`; pool resources `part: 'max'` edits the maximum (current is capped to
      it); `minFrom` (formula) locks dots below a dynamic minimum and clamps writes to it; member
      tracks take `cohort: { maxMembers }`.
    - Pool trackers (spec 020): a pool `resource` primitive with `poolTracker` (`display` `row`
      default | `strip` | `line`, `marks.current/max` look overrides, `legend`, `total`) draws one
      tracker (`declarative/PoolTracker.tsx`, rules in `data/poolTracker.ts`: `poolTrackerModel`,
      `markPool`): fills = current, outlines = maximum, boxes up to the binding maximum or
      `maxFrom`; `minFrom` then bounds the current value and `maxMinFrom` the maximum (resolved into
      `formulaState.maxMinima`); locked boxes (`copy.locked`) draw in a darker mix of their mark's
      color; `currentRaisesMax` raises the maximum from a fill. `part` and `compact` are ignored
      with it. An own `resource` field takes the same `poolTracker` (max ≤ `trackerLevelsMax`,
      schema refine; `fieldControls.tsx`): `min` holds both values, the page label stays outside
      (`hideLabel`). The `row` display (label left, 16px boxes, count) exists only in pool models.
      The editor's Display choice moves `minFrom` of a `part: 'max'` node to `maxMinFrom` and back.
      The shipped Star Wars full sheet draws Force Points this way; edited copies of a shipped page
      (`defaultOverrides`) keep their own nodes. Tracks render through the tracker (see "Trackers").
      Compact pools render `current / max` boxes, compact ratings number boxes.
- Labels: every labelled node may carry `labelMessage` — a UI message id (`ttgamer.ui.…`) or a
  catalog entry (`catalog:<catalogId>/<entryId>`, e.g. attribute names). `DeclarativeSheetView`
  renders `localizeTemplate(template, locale)` (`features/sheet/declarative/localizeTemplate.ts`);
  the stored `label`/`title` is the fallback. Editing a label or title in the editor drops the
  reference; on fields and primitives it is kept as `termRef` (spec 009) so the book-term hint
  survives renaming (`keepTermOnRename` in `template-editor/model/tree.ts`); switching a field to a
  custom source clears both. `termHint: false` turns the hint off (editor: "Show book name hint" via
  `TermHintControl`). Character/droid defaults attach references in one pass (`withLabelMessages` in
  `templates/character.ts`: attributes, abilities, Force skills, and virtues point at their data
  catalogs); entity templates pass `labelMessage` explicitly through the builders (keys under
  `ui.sheet.templates.entities` / `defaults`). Unknown references are `unknown-label-message`
  reference issues.
- Book terms (spec 009): a label is a book term when its effective ref (`termRef ?? labelMessage`)
  is listed in `translations/glossary/*.yaml` (generated `bookTerms`). Trait rows, compact ratings,
  and field labels render through `components/terms/TermLabel`; each `DeclarativeSheetView` wraps
  its tree in one `TermHintProvider` (delegated listeners, one popover). The reader's "Game terms"
  preference (`src/shared/store/readerPrefsStore.ts`) and `resolveTerm` decide label and hint. Trait
  row layout is classified by `declarative/rowKind.ts` (`traitRowKind`), shared with the verifier's
  overflow budgets.
- Authoring: `src/sheet_manager/templates/builders.ts` holds setting-neutral node builders (`text`,
  `number`, `toggle`, `formula`, `select`, `reference`, `primitive`, `list`, `table`, `group`,
  `section`); WoD-family helpers (`dotsTrait`, `traitCoordinate`) live in
  `systems/wod-like/templateBuilders.ts`; each Star Wars page family has its own module under
  `systems/star-wars-wod/templates/` (`character`, `creature`, `vehicle`, `fodder`, `docs` for rules
  links). `defaultTemplates.ts` only aggregates. The character trees are guarded by
  `tests/sheet_manager/fixtures/character-templates.pre-007.json`.
