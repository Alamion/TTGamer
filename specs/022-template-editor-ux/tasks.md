---
description: 'Task list for feature 022: template editor usability from player feedback'
---

# Tasks: Template editor usability from player feedback

**Input**: Design documents from `specs/022-template-editor-ux/`:

- [plan.md](./plan.md), [spec.md](./spec.md), approved [prototype.html](./prototype.html) rev. 2;
- [research.md](./research.md) (decisions R1–R9);
- [data-model.md](./data-model.md);
- [contracts/editor-ui.md](./contracts/editor-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: included. Constitution V asks for unit tests of pure helpers, component tests for
user-visible flows, and proof that stored shapes do not change (SC-005).

Paths are relative to the repository root. TE = `src/sheet_manager/components/dialogs/template-editor`,
Dialog = `src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx`,
SHEET = `src/sheet_manager/features/sheet/declarative`. Every task that adds UI text adds it to
`translations/source/{en,ru}/ui/sheet/*.yaml` and runs `yarn build:translations`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no unfinished dependencies).
- **[Story]**: US1–US6 from spec.md. Order of phases follows priority: US1, US4, US2 (P1), then
  US3, US5, US6 (P2).

---

## Phase 1: Setup

- [x] T001 Add the strings of the whole feature to `translations/source/{en,ru}/ui/sheet/templates.yaml`
      (group `editor.*`): - settings groups `groupContent` "Content", `groupValue` "Value", `groupLimits` "Limits and
      formulas", `groupLook` "Look", `groupVisibility` "Visibility and help", `groupIssues`
      "{count} issue(s)" (plural forms); - setting names `label` "Label", `helpText` "Help text", `title` "Title", `valueKey` "Value
      key", `valueKeyHint` "A name for the value. Fields with the same key share one value.",
      `maxFromShort` "Maximum from", `minFromShort` "Minimum from", `entryLabel` "Entry field label",
      `entryLabelHint`; - formula checks `formulaNoParse` "This formula does not parse.", `formulaUnknown` "No value
      named “{name}”.", `formulaReads` "Reads {names}."; - issues `issueEntryLabel` "The entry field of list “{list}” has no label.", `issueColumn`
      "{table}, column “{column}”: {problem}", `issueNotAllowed` "{setting} has a value that is not
      allowed.", `issueOptionEmpty`, `issuePresetEmpty`, `issueTrackerNameEmpty`,
      `issuePoolTooLong`, `issueFormulaEmpty`, `issueListSource`; - areas `resizeOutline` "Resize outline", `resizeSettings` "Resize settings"; - kinds `elementGroup` "Group", `elementList` "List", `kindSection` "Section", `kindCard` "Card",
      `kindEntries` "Entries", `kindTable` "Table", `kind` "Kind", hints for each, `tableUnavailable`
      "Not for game lists or lists with catalog suggestions.", `dropColumnsConfirm` "Entries keep one
      value per entry. Remove the columns {columns}?", `kindChangeSaveWarning`; - column order `moveColumnUp` "Move {label} up", `moveColumnDown` "Move {label} down"; - add menu hints for Group and List.
      Add `rows.moveUp` "Move {name} up" / `rows.moveDown` "Move {name} down" / `rows.reorder`
      "Drag to reorder" to `translations/source/{en,ru}/ui/sheet/documents.yaml`. Russian per research
      R8 (Группа, Раздел, Карточка, Список, Записи, Таблица). Run `yarn build:translations` and
      `yarn i18n:verify`.

---

## Phase 2: Foundational (blocks all stories)

- [x] T002 [P] Create `TE/settings/` building blocks: `inputClasses.ts` (the shared class string
      from research R1), `SettingField.tsx` (visible `<label>` above the control as its accessible
      name, optional help link beside it outside the label, optional hint, optional error with
      `aria-invalid`, `data-setting` on the control via a render prop or cloneElement),
      `KeyField.tsx` (`#` prefix), `SettingsGroup.tsx` (`button[aria-expanded]` + body, count or issue
      badge), `groupedSettings.ts` (`SettingsGroupId`, `GroupedSettings`, `mergeGroups(parts)` in the
      fixed order, `SETTINGS_GROUP_ORDER`), and `groupState.ts` (a small React context with the
      session open/closed record, defaults content/value/limits open).
- [x] T003 [P] Create `src/sheet_manager/features/sheet/data/formulaCheck.ts`:
      `checkFormulaInput(source, coordinates)` → `{ kind: 'empty' } | { kind: 'ok', reads } |
{ kind: 'error', code: 'parse' | 'unknown', name?, position? }` using `parseFormula`
      (`SHEET/formula.ts`) and the coordinate test extracted from
      `src/sheet_manager/features/sheet/data/templateReferences.ts` (`checkCoordinates` now calls the
      shared test). Unit tests in `tests/sheet_manager/formula-check.test.ts` (empty, ok with reads,
      parse error with position, unknown name, dotted coordinates like `willpower.max`).
- [x] T004 Create `TE/settings/FormulaField.tsx` on top of `SettingField`: fx mark, `font-mono`,
      the shared coordinate datalist id from `TE/EditorModel.tsx`, inline message from
      `checkFormulaInput` with the T001 strings (error red, ok muted green, empty nothing).
- [x] T005 Extend `DraftIssue` in `TE/draft.ts` with `setting?: SettingRef` (`{group, key}` per
      data-model.md) and export the type; existing issues get their setting (label → content/`label`,
      formulas → limits/`formula|maxFrom|minFrom|maxMinFrom`, keys → value/`valueKey`, docs link →
      visibility/`docsPath`, display condition → visibility/`visibleWhen`, tracker issues →
      look/`tracker`), with formula issues using `checkFormulaInput` wording. Add
      `'template-draft-invalid'` to `SheetIssueCode` in `src/sheet_manager/diagnostics.ts`. Keep
      `tests/sheet_manager/template-editor.test.tsx` issue assertions green (messages may change only
      where the formula wording is now specific — update those expectations).

**Checkpoint**: building blocks exist; nothing visible changes yet; commit.

---

## Phase 3: User Story 1 — Readable settings panel (P1) 🎯 MVP

**Goal**: every setting has a visible name, groups in a fixed order, formula fields look like
formulas, actions above the kind and name.

**Independent test**: select Willpower on the full Star Wars sheet; key and Maximum from are named,
in Value and Limits and formulas; a bad formula shows its message under the box.

### Tests

- [x] T006 [P] [US1] Create `tests/sheet_manager/template-editor-settings.test.tsx`: for a rating, a
      formula field, a table, a list, a section, a group, a primitive (trait and pool), and a tracker,
      the group headers appear in order Content → Visibility and help and only non-empty ones; every
      text input inside `[data-settings-for]` has a visible label (no input named only by aria-label
      or placeholder); the value key and Maximum from are in different groups; a bad formula shows its
      message under the box and the collapsed group shows an issue badge; group open state survives
      selecting another element; the header buttons come before the kind and name in DOM order.

### Implementation

- [x] T007 [US1] Rewrite the header in `TE/ElementSettings.tsx`: action row (Move up, Move down,
      Duplicate, spacer, Remove; same accessible names) above a line with the kind chip
      (`nodeKindLabel`) and the full name (`nodeDisplayName`, wrapping); `ElementSettings` now renders
      `mergeGroups` of the parts inside `SettingsGroup`s, reading open state from the T002 context
      provided in Dialog.
- [x] T008 [P] [US1] Convert `TE/LayoutControls.tsx` to grouped parts: column placement and span →
      look; `ColumnLayoutControl` → look; `VisibilityControl` → visibility (coordinate input via
      `KeyField`, `data-setting="visibleWhen"`); `ToggleRow` keeps its look; use the shared
      `inputClasses`.
- [x] T009 [P] [US1] Convert `SectionConfig`, `GroupConfig`, `TableConfig`, `ListConfig`,
      `ListPresetsEditor` in `TE/ElementSettings.tsx` into hooks returning `GroupedSettings` per
      data-model.md (titles via `SettingField` "Title" `data-setting="title"`; docs link → visibility
      `docsPath`; collapsible / starts collapsed → visibility (as in the prototype: "Readers can fold
      it", "Starts folded"); show title → look; table rows → limits; table/list value key → value via `KeyField`; table column rows
      and list entry field → content; presets → content `preset:<i>`).
- [x] T010 [P] [US1] Convert `TE/FieldEditor.tsx` into a hook returning `GroupedSettings`: label,
      help text, show label, label position, placeholder, options (`option:<i>`) → content; source,
      value key (`KeyField`), catalog binding, reference kinds, multiple → value; min/max/step, formula
      (`FormulaField`, key `formula`), maxFrom (`FormulaField`, key `maxFrom`) → limits;
      presentation, rating switches and flags, multiline, prefix/suffix, resource display → look;
      required, term hint (`TE/TermHintControl.tsx`) → visibility (help text stays in content, as in
      the prototype). For table columns
      and list entries the keys are prefixed `column:<id>.` / `entry.` and the part renders inside the
      parent's content group.
- [x] T011 [P] [US1] Convert `TE/PrimitiveConfig.tsx` (source and edits → value; label override →
      content with an accessible name; display, compact, show label, pool and built-in tracker
      settings → look; minFrom/maxMinFrom/maxFrom as `FormulaField` → limits; term hint →
      visibility) and wrap `TE/TrackerSettings.tsx` and `TE/PoolTrackerSettings.tsx` output in the
      look group; `TE/SourceControls.tsx` and `TE/CatalogBindingEditor.tsx` use `SettingField` and
      the shared `inputClasses` (help links moved out of `<label>`s).
- [x] T012 [US1] Provide the group state context in Dialog around the settings area and update the
      existing editor tests to the new names (contract table "Names that change"):
      `tests/sheet_manager/template-editor.test.tsx`, `template-editor-help.test.tsx`,
      `template-editor-page.test.tsx`, `template-editor-preview.test.tsx`,
      `template-editor.perf.test.tsx`, `user-document-types.test.tsx`, `entity-templates.test.tsx`
      (open a collapsed group first where a test reaches a Look/Visibility setting). Run them.

**Checkpoint**: US1 complete; commit.

---

## Phase 4: User Story 4 — Every save problem points at its element (P1)

**Goal**: all problems that block a save are listed before Save, in plain words, and lead to the
setting.

**Independent test**: clear a list's entry field label: the issue names the list; clicking it focuses
the entry label box.

### Tests

- [ ] T013 [P] [US4] Create `tests/sheet_manager/draft-issues-coverage.test.ts`: one draft per rule in
      the research gap list (entry field label, column label, column option label, preset label,
      tracker mark/level name, pool resource max > 20, empty formula field, table title "", list
      source combinations, select with no options, bad column widths, bad identifier) → exactly one
      issue with the expected `nodeId` and `setting`, no message containing `"code"` or `path`; and a
      fuzz-style check: for each shipped template (via the system registry) and the storybook
      templates, `collectDraftIssues` is empty and `CustomTemplateSchema.safeParse` succeeds.
- [ ] T014 [P] [US4] Create `tests/sheet_manager/issue-location.test.ts` for `issueLocation`: paths into
      `children`, table `columns`, list `item`, select `options`, presets, tracker arrays map to the
      nearest node and setting key; unknown paths return `{}`.

### Implementation

- [ ] T015 [US4] In `TE/draft.ts` walk table columns and the list `item` with the field checks (label,
      options, bounds, formula, key rules where they apply), naming the table/list and the column or
      entry field in the message (T001 strings) and pointing `setting` at `column:<id>.<key>` or
      `entry.<key>`; add the remaining gap checks from research R4 step 1.
- [ ] T016 [US4] Create `TE/issues.ts`: `issueLocation(draft, path)` per data-model.md and
      `schemaIssues(draft, messages, known)` that runs `CustomTemplateSchema.safeParse(draft)`, drops
      Zod issues already covered by a specific issue on the same node and setting, maps the rest to
      `issueNotAllowed` with a translated setting name where known, and returns them without reporting.
      Append its result in `collectDraftIssues` (deferred with the draft in Dialog, `useDeferredValue`).
      Export `reportUncoveredIssues(draft)` that reports each uncovered raw issue once through
      `reportSheetIssue({ code: 'template-draft-invalid', … })`; only the save handler calls it
      (research R4 step 3).
- [ ] T017 [US4] In Dialog: the save `catch` maps a Zod error through `issueLocation` and the same
      messages (never `error.message`); issue buttons call a new `goToIssue(issue)`: select the node,
      open `issue.setting.group` in the group context, open a closed column `<details>` when the key
      starts with `column:`, then in the next animation frame focus
      `[data-settings-for="<id>"] [data-setting="<key>"]` and scroll the page frame and outline row
      into view; issues without a node stay plain text. Add a test to
      `tests/sheet_manager/template-editor.test.tsx`: clicking the entry-label issue focuses that input;
      a forced schema failure on save shows a plain message (no `"code"`) and reports
      `template-draft-invalid` (consumed with `takeSheetIssues()`); editing an invalid draft reports
      nothing. In Dialog's save handler call `reportUncoveredIssues` before refusing the save.

**Checkpoint**: US4 complete; commit.

---

## Phase 5: User Story 2 — Drag with live placement (P1)

**Goal**: drag finds the nearest legal place, previews after a dwell, commits as one undo step.

**Independent test**: drag a field into a group in another column, hold, release where the preview
showed; one undo puts it back.

### Tests

- [ ] T018 [P] [US2] Create `tests/sheet_manager/editor-drag.test.ts` for the pure parts:
      `nearestPlacement(slots, point, excluded)` with fake rectangles (inside a container, between
      containers, empty column zones, excluded own subtree and no-op neighbours) and the drag state
      machine (pending → dragging after 5 px, previewing after 320 ms on the same target, hysteresis
      8 px, Escape/blur/pointercancel → idle).

### Implementation

- [ ] T019 [US2] Create `TE/useEditorDrag.ts`: pointer controller per data-model.md `DragState`
      (mouse and pen only; pointer capture on the grip; ghost label; timers; Escape, blur,
      pointercancel), `nearestPlacement` reading `[data-insert-slot]` and `[data-drop-zone]`
      rectangles inside the container under the pointer (parsing the existing slot keys), exclusion of
      the dragged subtree via `data-node-id` ancestry and of no-op slots, a dry-run `placeNode` for the
      depth rule, and autoscroll of the page area within 48 px of its edges.
- [ ] T020 [US2] Wire it in Dialog and `TE/EditorPage.tsx`: while dragging, pass
      `placeNode(draft, id, target)` as the page and outline draft once previewing (never committed),
      `originPlacement` for the old place, `dropTarget` for the marker; on release call
      `actions.moveTo`; announce through the existing live region.
- [ ] T021 [P] [US2] In `TE/EditorNodeFrame.tsx` replace the native `draggable` grip with a pointer
      handle (`data-drag-handle`, keep `page-grip-<id>`), render the marker line on the target slot
      (`data-drop-target`), the dashed origin slot (`data-origin-slot`), and `data-previewing` on the
      moved frame; remove the HTML5 `onDragOver`/`onDrop` handlers. Extend
      `SHEET/editorOverlay.tsx` with `originPlacement` so the renderer asks for the origin slot.
- [ ] T022 [P] [US2] In `TE/OutlineTree.tsx` replace HTML5 drag with the same controller (grip
      `grip-<id>` as handle; outline rows as targets mapped to placements; insertion row while
      dragging).
- [ ] T023 [US2] Update `tests/sheet_manager/helpers/editor.ts` (`dragNode` drives pointer events with
      stubbed rectangles and fake timers instead of HTML5 events; grips found by `data-drag-handle`)
      and the drag tests in `template-editor-arrange.test.tsx`, `template-editor.test.tsx`,
      `template-editor-page.test.tsx`, `template-editor.perf.test.tsx` (select buttons identified
      without `draggable`); add cases: preview then release equals preview; Escape leaves the draft
      unchanged; one undo restores; a drag over a collapsed section offers no position inside it.
      Add a perf case: a previewed move on the full Star Wars sheet
      stays within the editor budget.

**Checkpoint**: US2 complete; commit.

---

## Phase 6: User Story 3 — Resizable editor areas (P2)

**Goal**: both dividers resize the side areas; widths are remembered.

**Independent test**: widen settings, reopen on another template: same width; double click: default.

- [ ] T024 [P] [US3] Create `TE/usePaneWidths.ts` (localStorage `template-editor-panes` through
      `useLocalStorageState`, limits and defaults per data-model.md, `fit(dialogWidth)` keeping the
      page ≥ 360 px) and `TE/PaneDivider.tsx` (`role="separator"`, `aria-orientation`, value
      attributes, pointer capture with CSS-variable-only updates during the drag and one commit on
      release, arrows ±10 / Shift ±40, Home and double click reset).
- [ ] T025 [US3] Replace the fixed grid in Dialog (`md:grid-cols-[15rem_minmax(0,1fr)_20rem]`) with
      `md:grid-cols-[var(--outline)_6px_minmax(22.5rem,1fr)_6px_var(--settings)]` and the two
      dividers (desktop only; phones keep the tabs); refit on window resize.
- [ ] T026 [P] [US3] Create `tests/sheet_manager/template-editor-panes.test.tsx`: arrows move and clamp,
      Home and double click reset, widths stored and read back after remount, broken stored JSON
      falls back to defaults, dividers have the separator role and names.

**Checkpoint**: US3 complete; commit.

---

## Phase 7: User Story 5 — Reorder table columns, rows, and list entries (P2)

**Goal**: authors reorder columns; players reorder rows and entries.

**Independent test**: move a table's third column first in the editor; on a sheet move a row up and
reload: order kept.

### Tests

- [ ] T027 [P] [US5] Create `tests/sheet_manager/table-list-order.test.tsx`: `moveTableRow` compacts
      keys and keeps cells; `moveItem` for arrays; on a rendered sheet, table rows, own-value list
      entries, and a system list (merits) move with the buttons and Alt+↑/↓, first/last controls are
      absent, focus stays on the moved row, read-only sources show no controls; in the editor,
      `moveTableColumn` reorders the page columns as one undo step and filled values stay with their
      column. Unit-test the grip's pure part `rowIndexAt(rects, y)` with fake rectangles; in
      `tests/sheet_manager/storybook.test.tsx` assert that the storybook's editable table shows move
      controls (constitution VI).

### Implementation

- [ ] T028 [P] [US5] Create `SHEET/rowOrder.ts` (`moveTableRow`, `moveItem`) and
      `SHEET/RowMoveControls.tsx` (grip with a small pointer reorder hook `useRowReorder` built on a
      pure `rowIndexAt(rects, y)`, up/down
      buttons named from `rows.moveUp/moveDown`, Alt+↑/↓ handler for the row).
- [ ] T029 [US5] Use them in `SHEET/DeclarativeSheetView.tsx` (`TableBlock`, through a new `moveRow`
      in `SHEET/hooks.ts`), `SHEET/listEntries.tsx` (`updateList` move), and `SHEET/primitives.tsx`
      (`SystemListBody`, bound data array move); switch `SHEET/RowsBody.tsx` to the shared controls;
      hide controls when `pageApi.disabled`.
- [ ] T030 [US5] Add `moveTableColumn(draft, tableId, from, to)` to `TE/draft.ts` and a grip plus Move
      up/Move down per column row in the table settings (`TE/ElementSettings.tsx`, names from
      `moveColumnUp/Down`).

**Checkpoint**: US5 complete; the storybook's editable tables and lists show the controls; commit.

---

## Phase 8: User Story 6 — Fewer element kinds (P2)

**Goal**: Group (Section, Card) and List (Entries, Table) with kind switches.

**Independent test**: switch a Group to Card and back (title and contents stay); switch a List to
Table (entry field becomes first column).

### Tests

- [ ] T031 [P] [US6] Create `tests/sheet_manager/element-kinds.test.ts`: `elementKind` for each stored
      type; section↔group and list↔table conversions per research R8 (kept settings, stash restore,
      entry field ↔ first column, non-list types become text, extra columns dropped); Table refused
      for `bindingKey` and catalog lists; converted drafts pass `CustomTemplateSchema`; a template
      saved without switches is byte-identical (SC-005 over shipped templates).

### Implementation

- [ ] T032 [US6] Create `TE/elementKinds.ts`: `elementKind(node)`, `switchGroupKind(node, kind,
stash)`, `switchListKind(node, kind, stash)` returning `{ node, dropped }`, `tableKindBlocked(node)`,
      and the per-dialog `KindStash`.
- [ ] T033 [US6] Kind choice in settings (content group): a "Kind" radio group in the Group and List
      parts (`TE/ElementSettings.tsx`) applying the switch through `applyOp` (one undo step); dropping
      columns asks first with `dropColumnsConfirm` in a small confirmation dialog added to Dialog
      (Radix Dialog like the existing save confirmation; `window.confirm` is not used);
      Table disabled with `tableUnavailable`.
- [ ] T034 [P] [US6] Names everywhere: `nodeKindLabel` returns "{Element} · {Kind}" for containers,
      lists, and tables (outline rows, frame chips, settings header); `TE/AddElementMenu.tsx` offers
      Group, Field, List, Tracker (Group builds a section at the page root and a card inside a
      container; List builds entries).
- [ ] T035 [US6] Save warning in Dialog: a list or table whose stored type differs from the saved
      template and has values in any document joins the existing save confirmation with
      `kindChangeSaveWarning`; test in `tests/sheet_manager/template-editor.test.tsx`.

**Checkpoint**: US6 complete; commit.

---

## Phase 9: Polish & cross-cutting

- [ ] T036 [P] Guide: update `docs/template-editor/index.mdx` (areas and widths, dragging with the
      preview, the issue list) and `docs/template-editor/elements.mdx` (Group and List kinds and
      switching, settings groups, formula fields, column order, row order on the sheet) and their
      Russian mirrors under `i18n/ru/docusaurus-plugin-content-docs/current/template-editor/`, keeping
      the anchors `#sections`, `#groups`, `#tables`, `#lists`; `yarn validate:i18n`.
- [ ] T037 [P] Notes: `src/sheet_manager/AGENTS.md` (settings parts and groups, issues with settings
      and the schema backstop, pointer drag, element kinds as presentation) and
      `.agents/skills/sheet-templates/SKILL.md`; add historical notes where spec 012/014 describe the
      old drag or panel.
- [ ] T038 [P] Backlog: close F-007 and F-008 in `TOFIX.md` (remove entries), mark T-091, T-092, T-094,
      T-095 ✅ in `TODO.md` with a dated note; `yarn validate:backlog`.
- [ ] T039 `CHANGELOG.md` v3.20.0 (minor feat entries per story) and `package.json` 3.20.0;
      `yarn check:version`.
- [ ] T040 Run `yarn verify:full`; fix findings (knip: removed HTML5 helpers and old exports).
- [ ] T041 Walk `quickstart.md` §2–§7 on the dev server with `playwright-cli` (reuse the running
      server); record results and refinements in `research.md`; leave SC-001/SC-002/SC-008 people
      checks for the maintainer's review.

---

## Dependencies & execution order

- Phase 1 → Phase 2 → stories. US1 (T007–T012) before US4's focus work (T017 needs `data-setting`
  and groups) and before US5's column controls (T030) and US6's kind choice (T033), which live in the
  new grouped settings.
- US2 (drag) depends only on Phase 2; it can run in parallel with US1 if a second worker is
  available, but both touch Dialog: merge in order US1 → US2.
- US3 is independent of the others except Dialog layout edits (after US2).
- US5 sheet parts (T028–T029) are independent of the editor work.
- Polish last.

## Parallel examples

- Phase 2: T002 ‖ T003 ‖ T004 (T004 after T002's `SettingField` exists — same worker).
- US1: T008 ‖ T009 ‖ T010 ‖ T011 after T007.
- US4: T013 ‖ T014 before T015–T017.
- US2: T018 first; T021 ‖ T022 after T019.
- US5: T027 ‖ T028; T029, T030 after.
- Polish: T036 ‖ T037 ‖ T038.

## Implementation strategy

1. MVP = Phases 1–3 (readable panel) — the reported mix-up is fixed.
2. Then US4 (no save dead ends) and US2 (drag) to finish P1; commit after each.
3. P2 stories US3, US5, US6, each a separate commit.
4. Each phase ends with targeted tests and `yarn verify:fast` (pre-commit); `yarn verify:full` in
   Polish.
