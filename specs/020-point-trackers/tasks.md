---
description: 'Task list for feature 020: point trackers and Force Points'
---

# Tasks: Point trackers and Force Points

**Input**: Design documents from `specs/020-point-trackers/`:

- [plan.md](./plan.md), [spec.md](./spec.md), and the approved [prototype.html](./prototype.html);
- [research.md](./research.md), whose decisions are cited as R1–R10;
- [data-model.md](./data-model.md) (settings, pool override, click description, state transitions);
- the contract [contracts/tracker-ui.md](./contracts/tracker-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: included. Constitution V asks for schema tests on persisted shapes, exhaustive tests of
pure rules, and component tests of sheet and editor flows. Existing tracker tests stay green,
changed only where the `onMark` signature changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no unfinished dependencies).
- **[Story]**: US1–US4 from spec.md.

---

## Phase 1: Setup

- [ ] T001 Add the strings to `translations/source/{en,ru}/ui/sheet/templates.yaml` (group
      `tracker.*`: `fromStart` "Marks fill from the start", `fromStartHint`, `fillInside` "Fills
      stay inside the outline", `fillInsideHint`, `totalReads` "Total", `totalDeepest` "Deepest
      level", `totalCount` "Count", `totalCountHint`, `fillPrimary` "Accent"; group `editor.*`:
      `primitiveDisplay` "Display", `displayDots` "Dots", `displayTracker` "Tracker",
      `poolLook` "Look", `poolRow` "Row", `poolCurrentMark` "Current", `poolMaxMark` "Maximum",
      `poolLayerFixed` hint, `poolCount` "Show the count", `maxMinFrom` "Maximum at least",
      `minFromCurrent` "At least (current)") and to `translations/source/{en,ru}/ui/sheet/tracks.yaml`
      (group `tracker.*`: `boxLocked` "{level}: {mark}, locked", `lockedTitle` "{level} — cannot go
      below {n}", `poolPoint` "Point", `poolMaximum` "Maximum"). Wording per
      `contracts/tracker-ui.md`; Russian mirrors. Run `yarn build:translations`.

---

## Phase 2: Foundational (blocks every story)

- [ ] T002 In `src/sheet_manager/types/template.ts` add to `TrackerFieldSchema`:
      `fromStart: z.boolean().default(false)`, `fillInside: z.boolean().default(false)`,
      `totalReads: z.enum(TRACKER_TOTAL_READS).default('deepest')` with
      `TRACKER_TOTAL_READS = ['deepest', 'count'] as const` and its type; add `'primary'` to
      `TRACKER_PALETTE_FILLS` (R1, R7).
- [ ] T003 In `src/sheet_manager/types/template.ts` add `POOL_TRACKER_DISPLAYS = ['row', 'strip',
'line'] as const`, `PoolTrackerOverrideSchema` (`display` default `'row'`, optional `marks`
      `{ current?, max? }` of `TrackerMarkOverrideSchema`, `legend` default `false`, `total`
      default `true`), and on `PrimitiveNodeSchema` optional `poolTracker` and `maxMinFrom`
      (`z.string().min(1).max(500)`); extend the formula refine near the `minFrom` check (≈ line 951) to parse `maxMinFrom` the same way (R5, data-model "PrimitiveNode").
- [ ] T004 Add `primary` everywhere a palette fill is mapped: `OUTLINE_CLASSES`, `SYMBOL_CLASSES`,
      and the fill look in `src/sheet_manager/components/stat-fields/Tracker.tsx`; the color list
      in `src/sheet_manager/components/dialogs/template-editor/TrackerSettings.tsx` (label
      `fillPrimary`). Fix compile errors from T002–T003 (fixtures in
      `src/sheet_manager/storybook/stories.ts`, `trackerDefaults.ts`, tests). Run `yarn typecheck`.
- [ ] T005 [P] Schema tests in `tests/sheet_manager/tracker-schema.test.ts`: a spec 019 tracker
      parses with `fromStart: false`, `fillInside: false`, `totalReads: 'deepest'`; `primary`
      parses as a fill; a primitive with `poolTracker: {}` parses with `display: 'row'`,
      `legend: false`, `total: true`; a bad `maxMinFrom` formula is rejected; an older primitive
      without the new keys parses unchanged.
- [ ] T006 Define the click description in `src/sheet_manager/features/sheet/data/trackerModel.ts`:
      `export type TrackerClick = { brush: string } | { layer: TrackerLayer }`; add to
      `TrackerModel` the fields `hasOutlines: boolean` and, on `TrackerModelCopy`, optional
      `locked?: { fill: number; outline: number }`; widen `TrackerModel.display` to
      `TrackerDisplay | 'row'`. Set `hasOutlines` in `ownTrackerModel` and
      `builtInTrackerModel` (data-model "TrackerModel", R2).
- [ ] T007 Change the molecule contract in `src/sheet_manager/components/stat-fields/Tracker.tsx`:
      `onMark(columnId, copyId, levelId, click: TrackerClick)`; a left click sends
      `{ brush: id }` with an active brush, else `{ layer: model.readingLayer }`. Update callers
      without changing behavior: `TrackerFieldControl.tsx` (`brush` → `paintTrackerMark`, layer →
      `toggleTrackerMark`) and `BuiltInTracker.tsx` (brush → `paintMark`/`paintTrackerMark`, layer
      → toggles as today). Update test call sites in `tests/sheet_manager/tracker-*.test.tsx`.
      All existing tracker tests stay green (R2).

**Checkpoint**: schemas parse old data; the click description is in place with no behavior change.

---

## Phase 3: User Story 1 — Boxes that fill from the start (P1) 🎯 MVP

**Goal**: an own tracker with "Marks fill from the start" marks runs per layer; right click puts
the first outline on every tracker; "Fills stay inside the outline".

**Independent Test**: spec US1 Independent Test; quickstart scenarios 1–4, 6.

### Tests for User Story 1

- [ ] T008 [P] [US1] Rule tests in `tests/sheet_manager/tracker-rules.test.ts` for
      `markTracker` (T010): run from empty (box 4 → 1–4); shorter (box 2 after 1–4 → 1–2); last
      box shortens by one; the other layer never changes; a brush with a second fill repaints the
      run; `fillInside` stops at the last framed box and is ignored without `fromStart` or on
      outline writes; stored gaps become contiguous up to the click; levels outside the shown
      length keep their entries; without `fromStart` a layer click cycles that layer (outline
      cycle included) and a brush paints as in spec 019.
- [ ] T009 [P] [US1] Component tests in `tests/sheet_manager/tracker-brush.test.tsx` (or a new
      `tracker-from-start.test.tsx`): right click on an own tracker with outlines puts the first
      outline run and calls `preventDefault`; right click without outline marks, on a read-only
      sheet, and on a built-in tracker is not prevented and writes nothing; the brush does not
      apply to right clicks.

### Implementation for User Story 1

- [ ] T010 [US1] In `src/sheet_manager/features/sheet/data/trackerModel.ts` add
      `markTracker(field, value, columnId, copyId, levelId, click)`: resolve the mark (brush id,
      or the layer's first kind with `fromStart`, else delegate to the layer cycle); with
      `field.fromStart` call a new `runTrackerMark` implementing R3 over the column's covered
      levels at the current length (via `coveredLevelIds`/`visibleLevelIds`) and `writeLayer`;
      generalize `toggleTrackerMark` to take a layer. Keep `paintTrackerMark` for the non-run
      brush.
- [ ] T011 [US1] In `src/sheet_manager/features/sheet/declarative/TrackerFieldControl.tsx` route
      every `onMark` click through `markTracker`.
- [ ] T012 [US1] In `src/sheet_manager/components/stat-fields/Tracker.tsx` give `MarkBox` an
      `onContextMenu`: when `model.hasOutlines` and not disabled, `preventDefault()` and call
      `onMark(…, { layer: 'outline' })`; otherwise do nothing (browser menu). Pass it from the
      `box` helper (R2).
- [ ] T013 [US1] Editor: in `src/sheet_manager/components/dialogs/template-editor/TrackerSettings.tsx`
      "Reading the marks" add the "Marks fill from the start" toggle and, when on, the "Fills stay
      inside the outline" toggle, with hints; hidden for built-in trackers (`game` set). Make
      `src/sheet_manager/features/sheet/data/trackerDefaults.ts` set `fromStart: true` for the
      `points` set.
- [ ] T014 [US1] Editor tests in `tests/sheet_manager/template-editor.test.tsx`: the toggles show
      for own trackers only, the second only with the first; "Start from… → Points" turns on
      fill from the start.

**Checkpoint**: US1 works on own trackers; quickstart 1–4, 6 pass.

---

## Phase 4: User Story 2 — Count the marked boxes (P1)

**Goal**: the total row reads Deepest level or Count ("filled / framed").

**Independent Test**: spec US2 Independent Test; quickstart scenario 5.

- [ ] T015 [P] [US2] Rule tests in `tests/sheet_manager/tracker-rules.test.ts` for the count total
      in `ownTrackerModel`: "2 / 5"; "2" without outline marks; "2" with outline marks and no
      framed box; "0" when empty; only covered boxes counted; per-copy counts in a table;
      `deepest` unchanged.
- [ ] T016 [US2] In `ownTrackerModel` (`src/sheet_manager/features/sheet/data/trackerModel.ts`)
      compute `copy.total` from `field.totalReads` per R4 (marks columns only).
- [ ] T017 [US2] Editor: the "Total" choice Deepest level / Count in "Reading the marks" of
      `TrackerSettings.tsx` (shown with the total row on, own trackers only); the `points` set in
      `trackerDefaults.ts` sets `totalReads: 'count'`. Extend the editor test from T014.
- [ ] T018 [P] [US2] Component test in `tests/sheet_manager/tracker-field.test.tsx`: a strip and a
      one-line tracker with Count print the count after the boxes; a table prints it per copy.

**Checkpoint**: US1 + US2 make own point trackers complete (MVP).

---

## Phase 5: User Story 3 — Built-in pools drawn as trackers (P2)

**Goal**: a pool resource primitive with `poolTracker` draws one tracker over the document's
`{ current, max }`; the Star Wars full sheet uses it for Force Points.

**Independent Test**: spec US3 Independent Test; quickstart scenarios 7–11.

### Tests for User Story 3

- [ ] T019 [P] [US3] Rule tests in new `tests/sheet_manager/pool-tracker.test.ts` for `markPool`
      and `poolTrackerModel` (data-model "Pool"): fill run up and down; last box shortens; fill
      past the maximum stops at it; with `raisesMax` it raises the maximum; `minCurrent` floor;
      outline up/down; outline floor `max(minMax, raisesMax ? minCurrent : 0, 1)`; lowering the
      maximum lowers current; `limit` cap; stored current above max shown as stored; model levels
      = limit, fills/outlines, locked counts, count total text, `hasOutlines: true`.
- [ ] T020 [P] [US3] Component tests in new `tests/sheet_manager/pool-tracker.test.tsx` rendering
      a page with a pool primitive and `poolTracker`: Row look (label, 16px boxes, count "2 / 3");
      left click writes current, right click and the outline brush write the maximum; locked boxes
      from `minFrom`/`maxMinFrom` say "locked" and do not lower the value; read-only disables the
      boxes; a dots node of the same binding on the same page shows the same values; a degraded
      `maxFrom` shows the clamp notice.

### Implementation for User Story 3

- [ ] T021 [US3] Create `src/sheet_manager/features/sheet/data/poolTracker.ts` with `PoolRules`,
      `markPool(pair, rules, index, layer)`, and `poolTrackerModel({ label, hideLabel, pair,
rules, override, readOnly })` returning a `TrackerModel` (one marks column, one copy,
      numbered levels up to `limit`, marks `current`/`max` with default names from
      `tracks.yaml`, fill `primary`, override looks, `fromStart` semantics, Count total,
      `locked` counts, display from the override) per R6.
- [ ] T022 [US3] Resolve `maxMinFrom` in `src/sheet_manager/features/sheet/declarative/hooks.ts`
      next to `minFrom` (a `maxMinima` map, `formula-error` report on bad formulas) and pass it as
      `resolvedMaxMin` on `PrimitiveMaxState` from
      `src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx`; add `maxMinFrom`
      coordinates to `src/sheet_manager/features/sheet/data/templateReferences.ts`.
- [ ] T023 [US3] In `src/sheet_manager/components/stat-fields/Tracker.tsx`: a `dot` box size (16px,
      outline 2px offset 1px); the `row` display (label left with rating-row typography, boxes and
      count right, legend under it); locked boxes (index below `copy.locked.fill`/`.outline`)
      drawn in the darker mix of their mark's color (palette through a CSS variable, hex inline),
      named with `boxLocked`, titled with `lockedTitle` (R7, contract "pool resource").
- [ ] T024 [US3] Create `src/sheet_manager/features/sheet/declarative/PoolTracker.tsx`: reads the
      pair from `useBoundDocument()`, builds rules from the descriptor (`maximum`,
      `currentRaisesMax`) and `maxState` (`resolvedMax`, `resolvedMin`, `resolvedMaxMin`), renders
      `Tracker` and writes `bound.update({ [dataKey]: markPool(…) })`; a brush maps to its mark's
      layer.
- [ ] T025 [US3] In `PrimitiveResourceBody` (`src/sheet_manager/features/sheet/declarative/primitives.tsx`)
      render `PoolTracker` when `node.poolTracker` is set and `descriptor.mode === 'pool'`
      (ignoring `part` and `compact`), with the clamp notice as for the dots.
- [ ] T026 [US3] Star Wars full sheet in `src/sheet_manager/systems/star-wars-wod/templates/character.ts`
      `resourcesGroup`: replace `resource-max-force-points` and `resource-force-points` with one
      `resource-force-points` node (`poolTracker: {}`, `maxMinFrom: MINIMUMS.maxForcePoints`);
      extend the `resource` builder options in `src/sheet_manager/templates/builders.ts` (and
      `systems/wod2e/ruleset/templateParts.ts` if it wraps it) for `poolTracker`/`maxMinFrom`.
      The brief sheet stays. Check how saved copies of shipped templates follow a shipped change
      and record it in research.md "Implementation notes" (R9).
- [ ] T027 [US3] Update `tests/sheet_manager/fixtures/star-wars-parity.json` / the parity test in
      `tests/sheet_manager/systems/wod2e/star-wars-parity.test.ts` for the single Force Points node
      and add an assertion that the full character sheet has one `resource:force-points` node
      with `poolTracker` and `maxMinFrom`, and the brief sheet keeps its compact node.

**Checkpoint**: Force Points show as one tracker; dots and tracker pages agree.

---

## Phase 6: User Story 4 — Editor and storybook (P3)

**Goal**: authors find the pool display; the storybook shows every new look.

**Independent Test**: spec US4 Independent Test; quickstart scenarios 12–13.

- [ ] T028 [US4] Create `src/sheet_manager/components/dialogs/template-editor/PoolTrackerSettings.tsx`
      (look Row / Strip / One line; Current and Maximum mark rows with name, symbol, color and the
      fixed layer as text, reusing `MarkSwatch` and the color list of `TrackerSettings.tsx`;
      legend and count toggles).
- [ ] T029 [US4] In `src/sheet_manager/components/dialogs/template-editor/PrimitiveConfig.tsx` for
      pool resources: the "Display" choice Dots / Tracker (`poolTracker: {}` or `undefined`); with
      Tracker hide "Part" and "Compact", show `PoolTrackerSettings`, relabel `minFrom` as "At least
      (current)", and add the "Maximum at least" field (`maxMinFrom`) with the
      `limitsFromValues` help. Add `maxMinFrom` and `poolTracker` to the optional keys and the
      formula check in `src/sheet_manager/components/dialogs/template-editor/draft.ts`.
- [ ] T030 [P] [US4] Editor tests in `tests/sheet_manager/template-editor.test.tsx`: a pool
      resource offers Display, a rating resource does not; choosing Tracker shows the panel and
      hides Part/Compact; a bad "Maximum at least" formula blocks saving like `minFrom`.
- [ ] T031 [US4] Storybook in `src/sheet_manager/storybook/stories.ts`: an own point tracker
      (fill from the start, Count, legend); a "two fills, two outlines" tracker with fills inside
      the outline; a pool resource as Row next to a rating row, and one with a locked minimum.
      Add guard tags `tracker:from-start`, `tracker:count`, `primitive:resource:tracker` in
      `tests/sheet_manager/storybook.test.tsx`.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T032 [P] Guide `docs/template-editor/elements.mdx` (Trackers: fill from the start, fills
      inside, Count, right click; Built-in page parts: pool display) and the Russian mirror under
      `i18n/ru/docusaurus-plugin-content-docs/current/template-editor/elements.mdx`.
- [ ] T033 [P] Update `.agents/skills/sheet-templates/SKILL.md` (tracker click rules, run writes,
      count, pool tracker module and `maxMinFrom`) and `src/sheet_manager/AGENTS.md`.
- [ ] T034 `CHANGELOG.md` new minor entry, `package.json` version, `TODO.md` T-085 ✅; run
      `yarn check:version`.
- [ ] T035 Run `yarn verify:full`; fix findings (knip: new exports must have importers).
- [ ] T036 Walk `quickstart.md` on the dev server; record results and refinements in research.md
      "Implementation notes".

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T007) → stories.
- US1 (T008–T014) and US2 (T015–T018) both touch `trackerModel.ts` and `TrackerSettings.tsx`: run
  US1 first, then US2.
- US3 (T019–T027) needs T006–T007 (click description, `locked`, `row` in the model type) and T012
  (right click); it does not need US2's own-tracker count (the pool model builds its own total).
- US4 (T028–T031) needs US3's schema and component (T003, T024).
- Polish after all stories.

### Parallel opportunities

- T005 alongside T006–T007.
- T008 and T009 together; T015 and T018 together; T019 and T020 together (test files).
- T030 alongside T031 once T029 is done; T032 and T033 together.

## Implementation Strategy

1. **MVP**: Phases 1–4 (own point trackers with right click and Count). Commit after each phase.
2. **Pools**: Phase 5, then the Star Wars sheet.
3. **Editor and storybook**: Phase 6.
4. **Polish**: docs, records, `verify:full`, quickstart.
