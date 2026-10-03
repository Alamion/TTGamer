# Research: Template editor usability from player feedback

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-02

Paths are relative to `src/sheet_manager/` unless they start with `tests/`, `docs/`, or
`translations/`. TE = `components/dialogs/template-editor/`, Dialog =
`components/dialogs/TemplateEditorDialog.tsx`.

## Findings that shape the design

- **Settings labels.** Most settings are named only by `aria-label` + placeholder (TE/ElementSettings,
  FieldEditor, LayoutControls, SourceControls, CatalogBindingEditor); a few use a visible wrapping
  `<label>`. `inputClasses` is copied in 6 files. No test queries settings by placeholder; ~65 label
  queries in `tests/sheet_manager/template-editor.test.tsx` use the accessible names.
- **Formulas.** Five formula inputs: field `formula`, field `maxFrom`, primitive `minFrom`,
  `maxMinFrom`, `maxFrom`; the primitive ones are not monospace. One shared coordinate datalist
  (Dialog:578-607). Errors are computed only in `collectDraftIssues` with one generic
  `invalidFormula` message; `parseFormula` (`features/sheet/declarative/formula.ts:253`) returns the
  error and position; unknown coordinates come from `templateReferences.ts:checkCoordinates`.
- **Save.** `handleSave` runs `CustomTemplateSchema.parse(draft)`; the catch puts `error.message`
  (raw Zod JSON) into `saveIssues` (Dialog:517-521). `collectDraftIssues` walks only the `children`
  tree: table columns and the list entry field (`item`) are never checked, and many schema rules have
  no draft check (gap table in the research notes of 2026-10-02: empty option labels, preset labels,
  tracker names, table title `""`, resource pool max > 20, empty formula, list source rules…).
  Issues are `{message, nodeId?}`; clicking selects the node but focuses nothing; issues on column or
  entry ids select nothing (they are not tree nodes).
- **Drag.** Native HTML5 DnD; no drag state; drop targets are thin `InsertSlot`s
  (`data-insert-slot="<parent|root>:<index>:<column|->"`) plus empty-column zones
  (`data-drop-zone`); the outline uses per-row drop targets. Moves go through
  `placeNode(draft, id, placement)` (TE/draft.ts:420), one undo step via `applyOp`; the only illegal
  moves are into the own subtree and beyond max depth. The page is the real `DeclarativeSheetView`
  with memoized frames (`EditorNodeFrame` `sameFrame`); `EditorPage` takes a plain `draft` prop.
- **Areas.** Fixed grid `md:grid-cols-[15rem_minmax(0,1fr)_20rem]` (Dialog:787); nothing in the
  editor persists UI state; `useLocalStorageState` exists (`shared/hooks`).
- **Tables and lists.** Table rows are `Record<rowIndex, Record<columnId, cell>>`, sorted
  numerically; add uses the lowest free index, remove leaves gaps (`features/sheet/declarative/
hooks.ts:228-275`). Own-value list entries are an array of `{id, …}` (`updateList`). System lists
  write `bound.data[dataKey]` arrays. Only `RowsBody` (system `rows` bindings) has move up/down.
  Table cells are keyed by column id, so reordering `columns` keeps values.
- **Section vs group.** Same children/columns/docs/collapse-key model; section is always collapsible
  with the accent bar (`CollapsibleBlock`), group has `hideTitle` and opt-in `collapsible`
  (`SectionCard`). Only `NodeView` (DeclarativeSheetView.tsx:511) branches on `section`; any
  container nests in any other.
- **List vs table.** List `item` is a `TemplateField` without formula/tracker; table columns are any
  field but tracker. Stored values are incompatible (array vs index map). System lists (`bindingKey`)
  and catalog lists have no table equivalent. `retypeField` resets type-specific settings; no
  "keep aside" precedent; `listItemChangeReport` already warns on save about list item changes.

## Decisions

### R1. Settings panel built from grouped parts

- **Decision**: New editor-only building blocks in `TE/settings/`:
  `SettingField` (visible label above the control, optional help link, hint, inline error, and a
  `data-setting` id on the control), `FormulaField` (fx mark, monospace, datalist, inline check),
  `KeyField` (`#` prefix), `SettingsGroup` (collapsible, issue badge), and one exported
  `inputClasses`. Every settings part becomes a hook returning
  `GroupedSettings = Partial<Record<SettingsGroupId, ReactNode>>`; `ElementSettings` merges the
  parts in the fixed order Content → Value → Limits and formulas → Look → Visibility and help and
  skips empty groups. `TrackerSettings` and `PoolTrackerSettings` stay one block inside Look (they
  already have their own fieldsets).
- **Rationale**: a fixed order across element kinds (FR-002) needs one owner of the group layout;
  returning grouped nodes keeps each part's hooks and state and avoids portals whose order would
  depend on mount order.
- **Alternatives**: portals into group bodies (order unstable when parts mount late); a declarative
  settings schema (large rewrite of 4 000 lines of controls).
- **Names**: the visible label is the control's accessible name. Where the prototype shortens a name
  ("Shared value key (fields with …)" → "Value key" + hint), the tests are updated with it.

### R2. Inline formula check

- **Decision**: `checkFormulaInput(source, coordinates)` in `features/sheet/data/formulaCheck.ts`:
  empty → no message; `parseFormula` error → "does not parse" with position; unknown coordinate →
  "No value named …" (shared with `templateReferences` by extracting the coordinate test).
  `collectDraftIssues` uses the same function, so the panel and the issue list say the same thing
  (FR-003).
- **Rationale**: one wording source; the coordinate set is already built for the datalist.

### R3. Issues carry their setting

- **Decision**: `DraftIssue` becomes `{ message; nodeId?; setting?: SettingRef }` where
  `SettingRef = { group: SettingsGroupId; key: string }` and `key` matches the control's
  `data-setting` (`label`, `maxFrom`, `entry.label`, `column:<id>.label`, `option:<index>`, …).
  Issues inside a table column or the list entry field use the table or list as `nodeId`.
- **Click**: select the node (existing `selectNode`), open its group (session group state), open a
  closed column `<details>` if needed, then focus `[data-settings-for=<id>] [data-setting=<key>]`
  after the settings remount (one animation frame).

### R4. No problem reaches Save unseen

- **Decision**:
    1. Extend `collectDraftIssues` to walk table columns and the list entry field with the same field
       checks (label, options, bounds, formula), and add checks for the remaining reachable gaps (empty
       option, preset, tracker mark/level names; pool resource max > 20; empty formula; table title
       set to empty; list source combinations).
    2. Backstop: after the specific checks, run `CustomTemplateSchema.safeParse(draft)` (deferred
       with the draft) and map every remaining Zod issue with `issueLocation(draft, path)`, which walks
       `children`, table `columns`, list `item`, select `options`, presets, and tracker arrays to the
       nearest named node and the setting key; the message is general ("{setting} has a value that is
       not allowed") with a translated setting name where known.
    3. While the author edits, mapped issues are only shown. When a save is attempted, every schema
       issue the specific checks did not cover is reported once through `reportSheetIssue` with a new
       code `template-draft-invalid` (developer diagnostics, constitution III): it marks a rule the
       checks miss. Reporting on every change would fail the test setup on each transiently invalid
       draft (`tests/setup/sheetIssues.ts`) and flood the console. The save catch uses the same
       mapping and never shows raw text.
- **Rationale**: specific checks give the best wording; the backstop guarantees FR-019 for rules
  added later.
- **Cost**: one schema parse takes about 20 ms on the full Star Wars sheet (jsdom). Run on every
  deferred render it doubled the editor's keystroke median (26 → 65 ms), so the editor parses
  when the dialog opens and again 300 ms after typing pauses (`useSchemaBackstop`). Save always
  parses in full. The Save button is disabled by the specific checks only, so a backstop-only
  problem still reaches the save handler, which refuses it plainly and reports the rule.

### R5. Pointer-driven drag with live placement

- **Decision**: Replace native HTML5 drag with a pointer-event controller `useEditorDrag` in TE:
    - Start: pointer down on a page grip or outline grip (mouse or pen; touch keeps today's buttons),
      5 px threshold, pointer capture, Escape / blur / pointercancel cancel.
    - Target: the existing insertion slots are the legal positions. On each move, take the container
      under the pointer and pick the nearest slot of that container (distance from the pointer to the
      slot's rectangle); if the pointer is between containers, the nearest slot of the nearest
      container. Slots inside the dragged subtree and the no-op slots around the node are excluded;
      the depth rule is checked with `placeNode` on a dry run.
    - Mark at once; after 320 ms at the same placement, preview: `EditorPage` and the outline render
      `placeNode(draft, id, placement)` without committing; the moved frame gets a preview style and
      the slot at the old place renders as a thin dashed line (overlay `originPlacement`).
    - Hysteresis: while previewing, the target changes only when the nearest slot differs and the
      pointer moved more than 8 px since the preview, so the reflow does not flip the target.
    - Release: `actions.moveTo(id, placement)` (one undo step). Autoscroll near the page area's top
      and bottom edges.
    - Pure parts (`nearestPlacement`, `excludedPlacements`) are unit-tested with fake rectangles;
      jsdom has no layout.
- **Rationale**: native drag gives no reliable pointer position for "nearest", no dwell control,
  and fights a reflowing preview; pointer events give full control and match the prototype.
- **Alternatives**: a DnD library (dnd-kit) — a new dependency for one surface, and its sortable
  model does not know our column placements.

### R6. Resizable areas

- **Decision**: `usePaneWidths` (localStorage key `template-editor-panes`, JSON `{outline,
settings}` in px, try/catch) and a `PaneDivider` (`role="separator"`, `aria-orientation`,
  `aria-valuenow/min/max`, arrows ±10 px / Shift ±40, Home resets, double click resets; pointer
  capture; during the drag only a CSS variable on the grid changes, one state commit on release).
  Limits: outline 160–420 px (default 240), settings 260–560 px (default 320), page ≥ 360 px; on
  window resize the side areas shrink to keep the page minimum. Phones keep the tabs.
- **Rationale**: the maintainer's reference splitter (`src/ui/Splitter.tsx` in the SillyTavern
  WorldInfo Workspace extension) proved this model smooth on slow machines.

### R7. Reordering

- **Decision**:
    - Editor: `moveTableColumn(draft, tableId, from, to)` in TE/draft.ts; column rows in the table
      settings get a grip and move up/down buttons; one undo step per move.
    - Sheet: `moveTableRow(rows, from, to)` rewrites the row map with compact keys `0…n-1` in the new
      order (closing gaps); own-value lists move array items; system lists move their bound data
      array. A shared `RowMoveControls` (grip + up/down, names from `sheet.rows.moveUp/moveDown`
      "Move {name} up/down") and a small `useRowReorder` pointer hook serve tables, lists, and the
      existing `RowsBody`. Hidden when the document is read-only; keyboard: the buttons, plus Alt+↑/↓
      on a focused row.
- **Rationale**: table cells are keyed by column id, so column order is free; rows need key rewriting
  because order is the numeric key order.
- **Refinement (implementation)**: `RowMoveControls` lives in `components/controls/`, not in the
  declarative renderer: the game lists render through molecules (`CustomTraitList`,
  `MeritFlawList`) that may not import sheet features, so they take an optional `onMove`. The
  editor's column rows reuse the same control, whose names ("Move {name} up/down") match the
  column names of the contract.

### R8. Group and List kinds

- **Decision**: Presentation only. `elementKind(node)` maps `section → Group/Section`,
  `group → Group/Card`, `table → List/Table`, `list → List/Entries`; the add menu offers Group,
  Field, List, Tracker (Group adds a Section at the page root and a Card inside a container; List
  adds Entries). Kind switch:
    - Group: `section → group` sets `collapsible: true` (it stays foldable) and keeps title, children,
      columns, widths, docs link, starts-collapsed; `group → section` drops `hideTitle`/`collapsible`.
    - List: `list(entries) → table`: the entry field becomes the first column (same id), title and
      valueKey kept; `table → list`: the first column becomes the entry field (types outside
      `LIST_ITEM_TYPES` become text), extra columns dropped after a confirmation naming them. Table is
      unavailable for `bindingKey` lists and catalog lists, with a reason.
    - Settings one kind lacks are kept aside in a per-dialog `Map<nodeId, KindStash>` and restored when
      switching back in the session.
    - Before saving, a List whose kind differs from the saved template and that has stored values in
      documents is listed in the existing save confirmation.
- **Names (en / ru)**: Group / Группа, Section / Раздел, Card / Карточка, List / Список,
  Entries / Записи, Table / Таблица.
- **Rationale**: no schema or document migration (FR-027); shipped templates and builders are
  untouched.

### R9. Guide and storybook

- **Decision**: `docs/template-editor/index.mdx` (areas, widths, drag, issues) and `elements.mdx`
  (Group and List kinds, column order, row order) in English and Russian, keeping the anchors
  `#sections`, `#groups`, `#tables`, `#lists`. The storybook needs no new element variants (node
  types are unchanged); its editable tables and lists show the new move controls, and its tags stay.

## Implementation results (2026-10-02)

Quickstart walk on the dev server (Chromium through `playwright-cli`, 1600×1000 and 420×900),
full Star Wars sheet:

- **§2 Settings panel**: actions above "Built-in page part · Willpower"; groups in order; Look and
  Visibility start folded; Minimum from shows the fx box and "Reads passion, self-control.";
  `curage + 2` in Maximum from shows "No value named “curage”." under the box, and the folded
  Limits group reads "1 issue". Found and fixed: a folded group's body stayed visible (`hidden`
  lost to the grid display class); the outline's kind column truncated "Group · …" (it now shows
  the kind, with the full name for screen readers).
- **§3 Save problems**: clicking the issue opened Limits and focused the Maximum from box.
- **§4 Dragging** (real mouse): Strength dragged from Physical over Social marked the slot at
  once, previewed after the pause with a dashed place in Physical, committed on release
  ("Strength moved."), and one Undo restored it; Escape during a drag cancelled it without
  asking to discard the editor.
- **§5 Areas**: dragging the settings divider 120 px stored `{"outline":240,"settings":440}`;
  at 420 px the tabs show and both dividers are hidden.
- **§6 Order**: row controls show on the sample sheet's game lists; found and fixed: arrows did
  not line up between the first, middle, and last rows (an absent button now keeps its place).
  A list switched to Table shows column grips and arrows.
- **§7 Kinds**: the add menu lists Group, Field, List, Tracker; a new list switched to Table
  made its entry field the first column; the Merits game list shows Table disabled with its
  reason.
- **Timings**: a previewed move costs about what the same committed move costs (jsdom, full
  sheet, best of two). Before the drag context was made stable, every frame re-rendered on a
  preview and it cost twice as much.

Maintainer's review of the quickstart scenarios passed on 2026-10-03, including SC-001 (Maximum
from), SC-002 (drags), and SC-008 (the reported rating mix-up).
