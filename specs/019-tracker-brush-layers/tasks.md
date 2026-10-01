---
description: 'Task list for feature 019: tracker brush and two layers'
---

# Tasks: Tracker brush and two layers

**Input**: Design documents from `specs/019-tracker-brush-layers/`:

- [plan.md](./plan.md), [spec.md](./spec.md), and the approved [prototype.html](./prototype.html)
  (outline look "Ring outside");
- [research.md](./research.md), whose decisions are cited as R1–R9;
- [data-model.md](./data-model.md) (resolver, reading layer, box state transitions);
- the contract [contracts/tracker-ui.md](./contracts/tracker-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: included. Constitution V asks for schema tests on persisted shapes, exhaustive tests of
pure rules, and component tests of sheet and editor flows. Existing tracker tests stay green,
changed only where box sizes or accessible names change.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no unfinished dependencies).
- **[Story]**: US1–US4 from spec.md.

---

## Phase 1: Setup

- [x] T001 Add the strings to `translations/source/{en,ru}/ui/sheet/templates.yaml` (group
      `tracker.*`: `layer` "Layer", `layerFill` "Fill", `layerOutline` "Outline", `markLayer`
      "Mark {n} layer", `layerLocked` hint, `setPoints` "Points: current and maximum (fill +
      outline)", `pointName` "Point", `maximumName` "Maximum", the new own-tracker marks hint,
      `legendHint`) and to `translations/source/{en,ru}/ui/sheet/tracks.yaml` (group `tracker.*`:
      `brushOn` "Mark boxes with {mark}", `brushOff` "Stop marking with {mark}", `brushStatus`,
      `layerFill`/`layerOutline` legend words, `boxBoth` "{level}: {fill}, {outline}"). Russian
      wording per contract. Run `yarn build:translations`.

---

## Phase 2: Foundational (blocks every story)

- [x] T002 Add `TRACKER_LAYERS = ['fill', 'outline'] as const`, the `TrackerLayer` type, and
      `layer: z.enum(TRACKER_LAYERS).default('fill')` on `TrackerMarkKindSchema` in
      `src/sheet_manager/types/template.ts`. Keep `TrackerOverrideSchema` marks unchanged (R3, R8).
- [x] T003 [P] Add the optional `outlines` record to `TrackerCopyValueSchema` in
      `src/sheet_manager/types/templateValues.ts`, with the same id validation and entry bound as
      `marks` (R4).
- [x] T004 Fix every compile error from T002–T003: mark literals in
      `src/sheet_manager/features/sheet/data/trackerDefaults.ts` (`markSet` returns
      `layer: 'fill'`), `src/sheet_manager/storybook/stories.ts`, `builtInTrackerSettings.ts`
      (`layer: 'fill'` in reported marks), tests' fixtures. Run `yarn typecheck`.
- [x] T005 [P] Schema tests in `tests/sheet_manager/tracker-schema.test.ts`: a spec 018 field
      without `layer` parses with every mark a fill; a stored value without `outlines` parses; a
      value with `outlines` parses; `outlines` rejects bad ids and oversize records; an override
      with a `layer` key strips it.
- [x] T006 Add to `src/sheet_manager/features/sheet/data/tracker.ts` (R3, R5, data-model
      "Resolved layer"): `readingLayer(kinds)`, `kindsOfLayer(kinds, layer)`, and
      `layerMarks(kinds, copy, layer)` resolving each level from the layer's own slot, else the
      other slot, by the kind's current layer. Keep `nextMarkId`, `deepestMarked`, `isCopyOut`,
      `remapMarks` single-layer (callers pass one layer's kinds and resolved record).
- [x] T007 [P] Rule tests in `tests/sheet_manager/tracker-rules.test.ts`: resolver cases (own
      slot, other slot after a layer change, collision keeps the own-slot mark, removed kind
      hidden), `readingLayer` with fills, outlines only, and mixed.

**Checkpoint**: schemas and the resolver exist; nothing visible changed; `yarn test` green.

---

## Phase 3: User Story 1 — Brush from the legend (P1) 🎯 MVP

**Goal**: legend items are brush buttons on own and built-in trackers (FR-001–FR-006).

**Independent test**: quickstart scenarios 1–4.

### Tests

- [x] T008 [P] [US1] Create `tests/sheet_manager/tracker-brush.test.tsx` (pattern of
      `tracker-field.test.tsx`): pressing a legend item sets `aria-pressed` and the status line;
      a brush click on empty and lighter boxes sets the mark in one write; on the same mark
      clears it; pressing the item again or another item ends or moves the brush; Escape on a
      focused box ends it; read-only, legend off, and `display: 'line'` render no legend buttons;
      removing the brush's mark from the field (rerender) or changing its layer ends the brush;
      two trackers on one page keep separate brushes; a one-mark tracker's single item is a brush.
- [x] T009 [P] [US1] Extend `tests/sheet_manager/tracker-builtin.test.tsx`: with
      `tracker: { legend: true }` on Star Wars health, the brush writes `cross` into
      `document.data` health levels and clears it on a second click; on a creature member track
      it marks members A and B independently.

### Implementation

- [x] T010 [US1] Add `paintTrackerMark(field, value, columnId, copyId, levelId, markId)` to
      `src/sheet_manager/features/sheet/data/trackerModel.ts` (R2; fill-slot only at this point,
      layers come in US2), next to `toggleTrackerMark`, reusing `withCopy`/`setOptional`.
- [x] T011 [P] [US1] Add `paintMark(marks, index, mark)` to
      `src/sheet_manager/features/sheet/declarative/cohort.ts`: sets `marks[index]` to `mark`,
      or to `'empty'` when equal; unit cases in `tests/sheet_manager/tracker-rules.test.ts`.
- [x] T012 [US1] In `src/sheet_manager/components/stat-fields/Tracker.tsx` (R1, contract
      "legend as a brush"): `brush` state; `TrackerProps.onMark` gains an optional fourth
      `brush?: string`; the legend renders `<button aria-pressed>` items when `!disabled`
      (plain items otherwise) with the yellow `border-warning` + 1px warning ring when pressed,
      inner padding, titles from `brushOn`/`brushOff`; a `role="status"` line; `onKeyDown`
      Escape on the root; the brush keeps the mark id and its layer, and is ignored and reset when
      invalid (mark gone, its layer changed, legend off, line display, disabled).
- [x] T013 [US1] Wire the brush in `src/sheet_manager/features/sheet/declarative/TrackerFieldControl.tsx`:
      `onMark(…, brush)` writes `paintTrackerMark` with a brush, `toggleTrackerMark` without.
- [x] T014 [US1] Wire the brush in `src/sheet_manager/features/sheet/declarative/BuiltInTracker.tsx`:
      the game column uses `paintMark` (plain track, computed track via `mergeVisibleMarks`,
      members), extra marks columns use `paintTrackerMark`.
- [x] T015 [US1] Extend `tests/sheet_manager/tracker-parity.test.tsx`: after folding, brush
      "Lethal" on the same box of both trackers and compare `read()` results; brush it again
      (clears) and compare.

**Checkpoint**: the brush works everywhere; `yarn test tests/sheet_manager/tracker-*` green.
Commit.

---

## Phase 4: User Story 2 — Marks on two layers (P1)

**Goal**: own trackers have fill and outline marks; boxes show both (FR-007–FR-015).

**Independent test**: quickstart scenarios 5–7.

### Tests

- [x] T016 [P] [US2] Extend `tests/sheet_manager/tracker-rules.test.ts` (or a model block in
      it) with the data-model transition table: cycling keeps the outline; outline-only
      trackers cycle outlines; brush on a fill or outline changes only its layer; a brush on a
      shown other-slot mark replaces it and clears the other slot.
- [x] T017 [P] [US2] Extend `tests/sheet_manager/tracker-field.test.tsx`: a Force Points field
      (fill "Point", outline "Maximum") — brush outlines on boxes 1–5 and fills on 1–2; stored
      value has `marks` and `outlines`; box names read "1: Point, Maximum" / "3: Maximum"; the
      outlined box carries the outline color style; the legend names layers when both exist.

### Implementation

- [x] T018 [US2] In `src/sheet_manager/features/sheet/data/trackerModel.ts`: `TrackerModel.marks`
      gains `layer`; `TrackerModelCopy` gains `outlines`; `ownTrackerModel` builds `marks`
      (reading layer) and `outlines` through `layerMarks`; `hasValues` counts both slots;
      `toggleTrackerMark` cycles the reading layer's kinds and writes its slot;
      `paintTrackerMark` writes the brush mark's layer slot and removes a replaced other-slot mark
      (R3). `builtInTrackerModel` sets `layer: 'fill'` and empty `outlines`.
- [x] T019 [US2] In `src/sheet_manager/components/stat-fields/Tracker.tsx` (R7, contract
      "boxes"): `MarkBox` takes `fill` and `outline` marks; sizes md `h-[26px] w-[26px]`, sm
      `h-5 w-5`; strip gap 12px, table rows `py-2`; outline via `outline` + `outline-offset`
      (md 2.5px/1.5px, sm 2px/1px; palette colors through classes or `outlineColor` style, own
      hex through style); outline symbol in its color only without a fill; `focus-visible` ring
      instead of the default outline; accessible name with both marks (`boxBoth`); `MarkSwatch`
      draws outline marks as an outlined empty box; legend shows the layer word when both layers
      exist. Update the one-line size check (`h-6` → `h-5`) in
      `tests/sheet_manager/tracker-builtin.test.tsx`.
- [x] T020 [P] [US2] In `src/sheet_manager/features/sheet/data/trackerDefaults.ts`: `markSet`
      gains `'points'` (fill "Point" amber "●", outline "Maximum" amber no symbol) and the
      `MarkSetId` union.
- [x] T021 [US2] In `src/sheet_manager/components/dialogs/template-editor/TrackerSettings.tsx`
      (R8, contract "Editor: marks"): a Fill/Outline switch per mark (`aria-pressed`, label
      `markLayer`), disabled with `game` and the `layerLocked` hint; "Start from…" option
      `points`; the new marks hint; the legend toggle hint; new marks default to fill.
- [x] T022 [US2] Extend `tests/sheet_manager/template-editor.test.tsx` (tracker settings block):
      switching mark 2 to Outline saves `layer: 'outline'`; "Start from… Points" gives one fill
      and one outline; a built-in tracker shows the layer disabled.

**Checkpoint**: two-layer trackers work end to end. Commit.

---

## Phase 5: User Story 3 — Totals, lengths, copies, changes (P2)

**Goal**: every spec 018 behavior handles both layers (FR-016–FR-021).

**Independent test**: quickstart scenarios 8–11.

### Tests

- [x] T023 [P] [US3] Extend `tests/sheet_manager/tracker-rules.test.ts`: per-layer fold on
      shortening (heaviest per layer, layers independent); `lengthChangeHidesMarks` true for an
      outline past the end; total and out ignore outlines on a fill tracker and read outlines on
      an outline-only tracker.
- [x] T024 [P] [US3] Extend `tests/sheet_manager/tracker-changes.test.ts`: removing the outline
      mark, removing a level holding an outline, and switching a mark's layer onto taken boxes
      are counted in `lostMarks`; switching back counts nothing.
- [x] T025 [P] [US3] Extend `tests/sheet_manager/tracker-field.test.tsx`: `template-value-hidden`
      counts hidden outlines; removing a copy holding only outlines asks first; a spec 018 value
      renders the same names and totals as before.

### Implementation

- [x] T026 [US3] In `src/sheet_manager/features/sheet/data/trackerModel.ts`: `stepTrackerLength`
      remaps each layer on resolved records with that layer's kinds and writes `marks` and
      `outlines`; `trackerLengthHidesMarks` checks both; `countHiddenTrackerValues` counts entries
      of both slots not shown by the resolver; totals/out/marked level use the reading layer
      (R5, R6).
- [x] T027 [US3] In `src/sheet_manager/features/sheet/data/trackerChanges.ts`: `TrackerShape`
      keeps the own tracker's marks with layers; `shownValues` counts resolved fills and outlines
      per copy instead of raw `marks` entries.
- [x] T028 [US3] In `src/sheet_manager/components/stat-fields/Tracker.tsx`: the marked level name
      in a single-copy table reads the reading layer only (unchanged for fill trackers).

**Checkpoint**: totals, lengths, hidden counts, and the save report are layer-aware. Commit.

---

## Phase 6: User Story 4 — Built-in trackers stay fill-only (P3)

**Goal**: FR-022–FR-024.

**Independent test**: quickstart scenarios 4 and 12; the parity widget.

- [x] T029 [US4] In `src/sheet_manager/components/dialogs/template-editor/sourceNodes.ts`:
      built-in → own produces marks with `layer: 'fill'`; own → built-in unchanged. Test in
      `tests/sheet_manager/template-editor.test.tsx` (source switch block).
- [x] T030 [P] [US4] Confirm `builtInSettingsUpdate` in
      `src/sheet_manager/components/dialogs/template-editor/builtInTrackerSettings.ts` never writes
      a layer into the override; cover it in the existing built-in rename test.

**Checkpoint**: built-in trackers unchanged apart from the brush; parity green.

---

## Phase 7: Polish & Cross-Cutting

- [x] T031 [P] Storybook in `src/sheet_manager/storybook/stories.ts` (`trackers` story): a
      "Force Points (fill + outline, legend)" strip and a "Wounds and conditions (two outlines)"
      table, both `legend: true`; add the `tracker:layer:outline` tag in
      `tests/sheet_manager/storybook.test.tsx` (tag when any mark has `layer: 'outline'`) and to
      `REQUIRED_VARIANTS`.
- [x] T032 [P] Guide: `docs/template-editor/elements.mdx` and
      `i18n/ru/docusaurus-plugin-content-docs/current/template-editor/elements.mdx` — marks get
      Layer, the points set, a "Marking with the legend" paragraph; built-in trackers keep fills.
- [x] T033 [P] Skill `.agents/skills/sheet-templates/SKILL.md` (tracker section: layers, resolver,
      reading layer, brush) and `src/sheet_manager/AGENTS.md` (tracker molecule line).
- [x] T034 [P] Spec 018 banner in `specs/018-configurable-trackers/spec.md`: the legend and the
      one-mark-per-box rule are changed by spec 019.
- [x] T035 `CHANGELOG.md` v3.17.0 (brush, layers, smaller boxes) and `package.json` 3.17.0; mark
      T-086 ✅ in `TODO.md`; run `yarn check:version` and `yarn validate:backlog`.
- [x] T036 Record deviations, if any, under "Implementation notes" in
      `specs/019-tracker-brush-layers/research.md`.
- [x] T037 Run `yarn verify:full`; fix findings.
- [x] T038 Walk through `specs/019-tracker-brush-layers/quickstart.md` with the maintainer on the
      dev server.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. US1 needs only T002–T007 (it writes the fill slot). US2 builds on
  US1's `paintTrackerMark` and molecule changes (T010, T012). US3 needs US2's model. US4 is
  independent after Phase 2 but is easiest after US2 (locked switch exists).
- Within a story: tests first (they fail), then implementation, then the checkpoint commit.
- `Tracker.tsx` is touched by T012, T019, T028 in order; `trackerModel.ts` by T010, T018, T026.

## Parallel Examples

- Phase 2: T003 and T005 beside T002; T007 after T006.
- US1: T008, T009, T011 together; then T010 → T012 → T013/T014.
- US2: T016, T017, T020 together; T018 → T019; T021 → T022.
- US3: T023, T024, T025 together; then T026 → T027 → T028.
- Polish: T031–T034 together.

## Implementation Strategy

1. **MVP**: Phases 1–3 deliver the brush, the most requested part, with no data change.
2. **Layers**: Phase 4 adds the second layer; Phase 5 makes every existing rule layer-aware before
   release (do not ship US2 without US3).
3. **Close**: Phase 6 and Phase 7, then the maintainer walk-through (T038).

Commit after each checkpoint, as in spec 018.
