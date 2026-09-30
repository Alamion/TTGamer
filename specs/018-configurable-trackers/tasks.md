---
description: 'Task list for feature 018: configurable trackers'
---

# Tasks: Configurable trackers

**Input**: Design documents from `specs/018-configurable-trackers/`:

- [plan.md](./plan.md), [spec.md](./spec.md), and the approved [prototype.html](./prototype.html);
- [research.md](./research.md), whose decisions are cited as R1–R13;
- [data-model.md](./data-model.md);
- the contract [contracts/tracker-ui.md](./contracts/tracker-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: included. Constitution V asks for:

- schema and persistence tests;
- exhaustive tests of pure rules;
- component tests of sheet and editor flows.

The existing track tests must stay green, changed only where the markup changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no unfinished dependencies).
- **[Story]**: US1–US7 from spec.md.

---

## Phase 1: Setup

- [x] T001 Mark T-078 as in progress (`[ ] 🟡`) in `TODO.md`. Add two follow-up entries in the
      same roadmap path:
    - "Formulas read a tracker": the total value of a copy, per spec 018 FR-030;
    - "Square toggle look": a toggle drawn like a tracker mark box.

    Run `yarn validate:backlog`.

- [x] T002 [P] Add the tracker strings to `translations/source/{en,ru}/ui/sheet/templates.yaml`
      (key group `tracker.*`, next to `primitives.*`), then run `yarn build:translations`. The
      strings, from the contract:
    - `fieldTypes.tracker`;
    - the Source select ("Own values");
    - the Display choices;
    - the group titles and hints of the Marks, Levels, Columns, Lengths, and Reading the marks
      groups;
    - the ready sets and their default mark names (Marked; Bashing, Lethal, Aggravated);
    - the swatch color names;
    - the move up, move down, remove, and add labels, with a `{n}` placeholder;
    - "Set by an older page" and "Use the game's levels";
    - the built-in notes;
    - the problems-panel messages;
    - the pending-save lines for trackers (plurals, as `editor.listChange*`).
- [x] T003 [P] Add the sheet strings to `translations/source/{en,ru}/ui/sheet/tracks.yaml`, then run
      `yarn build:translations`:
    - "Level" and "Value";
    - "out";
    - "+ {title}" and "Remove {title} {letter}";
    - the box accessible name "{level}: {mark}", with "empty";
    - "Text columns show in the table";
    - the generic mark names "Slash" and "Cross";
    - the generalized shorten confirmation, with "copies" instead of "members".
- [x] T004 [P] Add the tracker limits of R10 to
      `src/sheet_manager/types/templateLimits.ts`.

---

## Phase 2: Foundational (blocks all stories)

- [x] T005 Add the tracker schemas to `src/sheet_manager/types/template.ts`, following
      data-model.md:
    - `TrackerFillSchema`: palette keys, or `#rrggbb`.
    - `TrackerMarkKindSchema`, `TrackerLevelSchema`, `TrackerColumnSchema`, and
      `TrackerLengthSchema`. Symbol length counts code points.
    - `TrackerConfigShape`, with refinements:
        - unique ids per list;
        - at least one `marks` column;
        - `covers` below the level count;
        - `copies.max` 1–24.
    - `TrackerFieldSchema`: `fieldBaseShape` plus `type: 'tracker'` plus the config. Add it to
      `fieldObjectSchemas`, `TEMPLATE_FIELD_TYPES`, and `refineField`. It is **not** added to
      `LIST_ITEM_TYPES` or `ListItemFieldSchema`.
    - A `TableNodeSchema` refinement that rejects a `tracker` column.
    - `TrackerOverrideSchema` (optional `PrimitiveNode.tracker`). Keep `compact`, `trackLayout`,
      and `track` readable, unchanged.
    - Exported inferred types.

    In `components/dialogs/template-editor/draft.ts` `collectDraftIssues`, pass a track
    primitive's extra-columns key (`tracker.valueKey ?? node.id`, only when it has extra columns)
    through `checkEffectiveKey`, so it cannot collide with a field's value key.

    Fix every exhaustive switch the compile-time guards now flag, for example
    `baseField` in `draft.ts` and the field control registry. A temporary stub is fine; the real
    cases come in US1.

- [x] T006 [P] Add `TrackerValueSchema` to `src/sheet_manager/types/templateValues.ts`
      (data-model "TrackerValue"): the `tracker: 1` tag, `length`, and
      `columns: {[id]: {id, marks?, texts?}[]}`. Add it to `TemplatePageValuesSchema`, placed so
      that no other union member swallows it.
- [x] T007 [P] Add `template-value-unreadable` and `template-value-hidden` to the `SheetIssueCode`
      union in `src/sheet_manager/diagnostics.ts` (R11, FR-026a).
- [x] T008 [P] Add the optional `marks` (`{id: 'slash' | 'cross', label, translation?}[]`) to
      `TrackBinding` in `src/sheet_manager/systems/templateBindings.ts` (R5).
    - Give the WoD-like `health` condition track the names Bashing and Lethal. The vehicle-damage
      track (vehicle members, droid damage) declares none and uses the generic Slash and Cross:
        - `systems/wod-like/templateBindings.ts`;
        - `systems/wod-like/profile.ts`, if the profile carries them;
        - the translation descriptors, through the system's YAML.
    - Give the V5 `track()` in `systems/v5/ruleset/bindings.ts` the names Superficial and
      Aggravated.
    - No generic code may import a system folder.
- [x] T009 Create `src/sheet_manager/features/sheet/data/tracker.ts`: pure rules over ids (R7).
    - `DEFAULT_TRACKER_CONFIG(messages)` and `MARK_SETS`: one, two, and three marks.
    - `nextMarkId(kinds, current)`: the cycle, ending in empty.
    - `markWeight(kinds, id)`.
    - `visibleLevelIds(config, lengthIndex)`.
    - `coveredLevelIds(column, visible)`.
    - `copyTotal(levels, visible, marks)`: the value of the deepest marked visible level, or
      `undefined`.
    - `isCopyOut(visible, marks)`.
    - `hidesMarks(visibleAfter, copies)`.
    - `foldMarks(kinds, visibleAfter, marks)`: the heaviest mark wins on the new last level, and
      hidden marks are cleared.
    - `copyLabel(index)`: A…X.
- [x] T010 [P] Write exhaustive tests in `tests/sheet_manager/tracker-rules.test.ts`:
    - the cycle with 1, 2, 3, and 5 kinds;
    - totals, including hidden levels, no marks, and empty values;
    - out;
    - folding at each fodder length (3/5/7), where the heaviest wins;
    - covers;
    - labels.

    Add one table-driven block that checks `foldMarks`, `copyTotal`, and `isCopyOut` against
    `cohort.ts` (`shortenMarks`, `memberPenalty`, `isDefeated`) on the same inputs mapped to ids.
    This block pins today's behavior before T040 rebuilds `cohort.ts` on these rules; after that,
    the end-to-end proof of parity is T050.

- [x] T011 [P] Write schema tests in `tests/sheet_manager/tracker-schema.test.ts`:
    - the config limits: 20 levels, 5 marks, 6 columns, 24 copies, 6 lengths, a 2-code-point
      symbol;
    - fills;
    - a tracker in a table column is rejected;
    - a tracker is not a list item type;
    - the `TrackerValue` limits and tag;
    - every shipped template still parses (`systemRegistry` default templates);
    - a legacy primitive with `compact`, `trackLayout`, or `track` still parses unchanged.
- [x] T012 Create `src/sheet_manager/features/sheet/data/trackerModel.ts` (R1, R6):
    - `TrackerModel` types.
    - `trackerDisplayOf(node, binding)`: the legacy mapping, FR-013.
    - `ownTrackerModel(field, value)`: resolves copies, where a missing list reads as one empty
      copy, then visible levels, totals, out, and the legend.
    - `builtInTrackerModel(node, binding, data, pageValue)`: stubbed for plain tracks for now;
      completed in US6.
- [x] T013 Create the molecule `src/sheet_manager/components/stat-fields/Tracker.tsx`, following
      the contract "Sheet: rendering". It takes a `TrackerModel` and callbacks (`onMark`,
      `onText`, `onAddCopy`, `onRemoveCopy`, `onLength`) and renders:
    - `MarkBox`: fills through Tailwind palette classes or an inline own color; the symbol is
      centered; text fill uses the `bgBase` ink; `aria-label` and title as in the contract; a
      read-only variant.
    - Table: headers with `scope="col"`, "·" for uncovered cells, and the total row (a 2 px
      `border-border` top border, no background). It scrolls inside its own frame.
    - Strip and One line.
    - The legend: with 2 or more kinds, and not on One line.
    - The copies controls, with confirmation before removing a copy that holds values.
    - The length control, reusing `ConditionTrackLengthButtons`, with the danger `ConfirmDialog`
      when shortening hides marks.

**Checkpoint**: schemas, rules, the model, and the molecule exist; typecheck passes.

---

## Phase 3: User Story 1 — Add an own tracker to any page (P1) 🎯 MVP

**Goal**: an author adds a Tracker to any page, and the sheet's user marks boxes that persist.

**Independent test**: quickstart scenario 1.

- [x] T014 [US1] Complete the `tracker` cases in `src/sheet_manager/types/templateValues.ts`:
    - `validateTemplateValue`: shape, limits, known column ids, known mark kind ids, copy count
      within `max`, and text length. Rejections use reason `type` or `bounds`.
    - `coerceStoredValue`: returns `undefined` for an invalid value.
- [x] T015 [US1] Add `TrackerFieldControl` to
      `src/sheet_manager/features/sheet/declarative/fieldControls.tsx`, and register it in
      `features/sheet/registry/declarativeFieldRegistry.ts`. It:
    - builds `ownTrackerModel`;
    - writes the whole `TrackerValue` through `onChange`, one write per action;
    - reports `template-value-unreadable` once when the stored value is invalid, and
      `template-value-hidden` with a count when stored marks or texts sit under ids the config no
      longer has (removed levels, kinds, columns, or copies beyond `max`), but neither in the
      editor preview (`pageApi.previewSource`, as `listEntries.tsx` does);
    - respects `disabled` (read-only).
- [x] T016 [US1] In `src/sheet_manager/components/dialogs/template-editor/draft.ts`, make
      `baseField('tracker')` return `DEFAULT_TRACKER_CONFIG` with fresh ids.
- [x] T017 [US1] In `src/sheet_manager/components/dialogs/template-editor/AddElementMenu.tsx`, make
      the "Tracker" palette item build an own `tracker` field, with a label from the translations.
      It is available on every page, including pages without track bindings.
- [x] T018 [US1] Create
      `src/sheet_manager/components/dialogs/template-editor/TrackerSettings.tsx` with the Label and
      Levels groups from the contract:
    - the value column title and Show;
    - level rows with name, value, move up, move down, and remove;
    - add level, disabled at 20.

    Delegate to it from `FieldEditor.tsx` for `tracker` fields, and exclude `tracker` from the
    table column type picker.

- [x] T019 [US1] Add a minimal `trackers` story to `src/sheet_manager/storybook/stories.ts`: one
      default own tracker. Register it in `HANDWRITTEN_STORIES`. In
      `tests/sheet_manager/storybook.test.tsx`, add:
    - a `tracker` case in `variantsOf`;
    - the tag in `REQUIRED_VARIANTS`;
    - the story id in the exact story list.
- [x] T020 [US1] Write component tests in `tests/sheet_manager/tracker-field.test.tsx`:
    - a user type page renders the default tracker;
    - two clicks give ╱ then ×, and a reload keeps them;
    - the total reads −1;
    - read-only shows the marks and has no active boxes;
    - an invalid stored value renders empty and reports `template-value-unreadable` once;
    - a value with marks on a level the template no longer has renders without them and reports
      `template-value-hidden` once, with the count; the editor preview reports nothing;
    - an over-limit write is rejected with `template-value-write-rejected`.
- [x] T021 [US1] Extend `tests/sheet_manager/template-editor.test.tsx`:
    - The palette "Tracker" adds an own tracker field. This replaces the old "defaults to
      `track:health`" expectation.
    - Levels move up and down, add, and remove.
    - The value column title and hide.

**Checkpoint**: US1 works end to end on its own.

---

## Phase 4: User Story 2 — Choose the kinds of marks (P1)

**Goal**: ready sets, own marks, fills, order, and the legend.

**Independent test**: quickstart scenarios 2–3.

- [x] T022 [US2] Add the Marks group to `TrackerSettings.tsx`:
    - the "Start from…" select with `MARK_SETS`, which replaces the kinds with fresh ids;
    - one row per kind: preview box (the `MarkBox`), name, symbol (max 2), five swatches with
      `aria-pressed`, an own color input, move up, move down, and remove;
    - add, disabled at 5, and remove, disabled at 1.
- [x] T023 [US2] Extend `tracker-field.test.tsx`:
    - the three-mark cycle ends in empty;
    - an own color renders an inline fill;
    - reordering kinds changes the click order and keeps the stored marks;
    - the legend lists each kind with its symbol inside a centered box. Check the classes
      `grid place-items-center` (or the equivalent) on the legend's boxes, as a guard against the
      prototype's legend bug.
- [x] T024 [US2] Extend the `trackers` story with one, two, three (WoD 20th), and own-color marks.
      Add the `tracker:marks:<1|2|3|own>` tags to `variantsOf` and `REQUIRED_VARIANTS`.

---

## Phase 5: User Story 3 — One display setting (P1)

**Goal**: Table, Strip, and One line for every tracker, and legacy templates look as before.

**Independent test**: quickstart scenario 5.

- [x] T025 [US3] Add the Display segmented control (`aria-pressed`) to `TrackerSettings.tsx`. For
      an own field it writes `display`. Wire all three displays in `Tracker.tsx`:
    - One line: small boxes, the label inline, no length control, no legend.
- [x] T026 [US3] Extend `tests/sheet_manager/tracker-schema.test.ts`, or add a pure block to
      `tracker-rules.test.ts`, covering `trackerDisplayOf` for:
    - `compact` → line;
    - `trackLayout` table and strip;
    - neither (named levels → table, computed → strip);
    - an explicit `tracker.display` wins.
- [x] T027 [US3] Extend the `trackers` story with each display. Add the `tracker:display:<d>` tags.

---

## Phase 6: User Story 4 — Columns and copies (P2)

**Goal**: marks and text columns, covers, and repeatable copies.

**Independent test**: quickstart scenario 6.

- [x] T028 [US4] Add the Columns group to `TrackerSettings.tsx`:
    - cards with kind, title, covers, "Readers add copies" with "up to" 1–24, and remove, which is
      disabled for the last marks column;
    - "+ Marks column" and "+ Text column", disabled at 6.
- [x] T029 [US4] Complete the copies in `ownTrackerModel` and `Tracker.tsx`:
    - add copies up to `max`;
    - remove a copy: confirm when it holds values; the last copy stays;
    - relabel by position;
    - text inputs, or plain text when read-only;
    - uncovered cells;
    - the strip note about text columns.
- [x] T030 [US4] Create `src/sheet_manager/features/sheet/data/trackerChanges.ts` with
      `trackerChangeReport(before, after, documents)` (R8, FR-026). For own trackers it counts:
    - marks on removed levels;
    - marks of removed kinds;
    - values of removed columns;
    - copies beyond a lower `max`, or beyond 1 when copies are turned off;
    - texts dropped with them.

    It skips unchanged configs and incompatible documents, as `listItemChangeReport` does. Wire it
    into `TemplateEditorDialog.tsx` `handleSave` and `pendingSaveDescription`, next to the list
    and retarget reports.

- [x] T031 [P] [US4] Write pure tests for `trackerChangeReport` in
      `tests/sheet_manager/tracker-changes.test.ts`:
    - reordering reports nothing;
    - each removal kind is counted;
    - several documents.
- [x] T032 [US4] Extend the tests:
    - `tracker-field.test.tsx`: add copies up to D, remove B and relabel, the add button disabled
      at `max`, text entry, uncovered cells.
    - `template-editor.test.tsx`: removing a used mark kind asks with counts, and cancel keeps the
      draft.
- [x] T033 [US4] Extend the `trackers` story with a text column covering 3 levels and a repeatable
      column. Add the `tracker:column:text` and `tracker:copies` tags.

---

## Phase 7: User Story 5 — Totals, lengths, and "out" (P2)

**Goal**: the total row, the reader-switched lengths with folding, and out.

**Independent test**: quickstart scenario 7.

- [x] T034 [US5] Add the Lengths group (own trackers only) and the Reading the marks group (Total
      row; out, own only) to `TrackerSettings.tsx`. The Lengths group has:
    - the checkbox;
    - the levels × lengths matrix, with the "Shows N" row;
    - "+ Length", disabled at 6;
    - "Remove length", disabled at 1.

    Add the problems-panel issues to `draft.ts` `collectDraftIssues`:
    - a length with no known level;
    - covers ≥ the level count;
    - a built-in tracker's extra-columns key colliding with another value key (the check added
      in T005).

- [x] T035 [US5] Wire lengths in `ownTrackerModel` and `TrackerFieldControl`. Shortening that hides
      marks confirms first, then writes the folded marks and `length` in one write. Also wire the
      total per copy and out (struck-through name, total "out").
- [x] T036 [US5] Extend `tracker-field.test.tsx`:
    - lengths 3/5/7 show the right levels;
    - shortening with hidden marks confirms, then folds the heaviest;
    - cancel changes nothing;
    - out strikes through and reads "out";
    - the total row has no background class.
- [x] T037 [US5] Extend the `trackers` story with lengths and out. Add the `tracker:lengths`,
      `tracker:out`, and `tracker:total` tags.

---

## Phase 8: User Story 6 — Built-in trackers get the same settings (P2)

**Goal**: every built-in tracker renders through the model with the page's overrides, and the Star
Wars character health shows its total row.

**Independent test**: quickstart scenarios 8–9.

- [x] T038 [US6] Complete `builtInTrackerModel` in `trackerModel.ts` (R4, R5, R7) for:
    - plain tracks: marks from `bound.data[dataKey].levels`, mapped to the ids `slash` and
      `cross`;
    - computed-length tracks (V5): `resolveComputedTrackLength`, `trackBoxes`, and the value
      column hidden by default;
    - member tracks: members as copies of the built-in column, with the variants.

    Level overrides merge per index and keep the game's other values (FR-021). Legacy
    `track {levels, names}` applies as in R4. Mark names come from `binding.marks` (fallback: the
    generic names) and the page's `tracker.marks`. The total default comes from R7. Extra columns
    read the page `TrackerValue` under `tracker.valueKey ?? node.id`; member-keyed copies apply to
    member tracks.

- [x] T039 [US6] Rewrite `PrimitiveTrackBody` in
      `src/sheet_manager/features/sheet/declarative/primitives.tsx` to render `Tracker` from
      `builtInTrackerModel`:
    - Marks are written through `bound.update` as today.
    - Extra column values are written through the page value.
    - Keep `DegradedBinding` and the formula-error behavior.
- [x] T040 [US6] Rework `src/sheet_manager/features/sheet/declarative/CohortTrack.tsx` onto the
      model and `Tracker`. It keeps:
    - the member cap, letters, and add and remove with confirmation;
    - the variant length with the shorten confirmation and `shortenMarks`;
    - one store update per mark.

    Display now follows `trackerDisplayOf`. Reimplement `cohort.ts` on the `tracker.ts` rules and
    keep its exported API.

- [x] T041 [US6] Make `PrimitiveConfig.tsx` delegate track bindings to `TrackerSettings.tsx`, with
      the game-fixed parts disabled and notes (contract "Built-in trackers" items):
    - marks: rename, symbol, and recolor only;
    - levels: name and value overrides, with the game text as the placeholder, plus the legacy
      count notice and "Use the game's levels";
    - the locked built-in marks column, plus extra columns;
    - the total row;
    - no Lengths or out.

    Remove the old compact, trackLayout, and track-override UI for tracks. The editor writes
    `tracker.display` and clears `compact` and `trackLayout`.

- [x] T042 [US6] Add the Source select to `TrackerSettings.tsx`, with conversion helpers in
      `draft.ts`:
    - own ↔ primitive bound to a chosen track binding;
    - keep the id, label, display, value column, extra columns, and total.

    Extend `trackerChangeReport` to built-in extra columns (removed columns and copies).

- [x] T043 [US6] Set `tracker: { total: true }` on the full health primitive in
      `src/sheet_manager/systems/star-wars-wod/templates/character.ts` (FR-023). The brief page
      stays as it is.
- [x] T044 [US6] Write component tests in `tests/sheet_manager/tracker-builtin.test.tsx`:
    - Renaming "Hurt" keeps the other penalties.
    - An extra text column "Source" stores in page values, and the marks stay in `health.levels`,
      shared with the brief page.
    - A recolored or renamed mark shows in the legend.
    - The SW character page shows the total penalty row.
    - A V5 Hunter sheet shows Superficial and Aggravated, and the −/+ length still works.
    - The droid damage chart and a vehicle's member damage use the generic Slash and Cross names.
    - The WoD 2e character health renders with Bashing and Lethal and no total row by default.
    - A single-member creature shows no total row; with two members, the total row appears.
    - Hidden built-in extra-column values report `template-value-hidden`.
    - Legacy templates, in the mapped display:
        - a compact brief;
        - a `trackLayout` page;
        - a legacy count override.
    - Member tracks: 24 members, one update per mark.
    - Read-only.
- [x] T045 [US6] Update the existing track tests where the markup changed, keeping their
      behavioral assertions:
    - `cohort-track.test.tsx`;
    - `template-layout.test.tsx`;
    - `primitives.test.ts`;
    - `primitive-parity.test.tsx`;
    - `entity-templates.test.tsx`;
    - `tests/sheet_manager/systems/v5/brief-template.test.tsx`, `sheet-coverage.test.tsx`, and
      `reskin.test.tsx`.
- [x] T046 [US6] Extend the storybook's bound-part stories in `stories.ts` with a built-in tracker
      that has an extra text column and the total row. Add the `primitive:tracker:columns` tag and
      update the `trackLayout:*` tags to `tracker:display:*` on primitives.
- [x] T047 [US6] Extend `template-editor.test.tsx`:
    - The Source switch in both directions keeps the shared settings.
    - Built-in marks can be renamed but not added.
    - Removing an extra column with stored values asks first.

---

## Phase 9: User Story 7 — Fodder-group parity (P3)

**Goal**: the own-tracker rebuild of the fodder group behaves like the shipped one.

**Independent test**: quickstart scenario 10.

- [ ] T048 [US7] Add `FODDER_PARITY_CONFIG`, the own-tracker rebuild, to the storybook, beside the
      stories in `src/sheet_manager/storybook/stories.ts`:
    - seven health levels with penalties;
    - two marks;
    - a repeatable "Health" column up to 12;
    - lengths with the level sets of `FODDER_TRACK_VARIANTS` for 3, 5, and 7;
    - total and out.

    The config reads the shipped levels through the registry, not a system import.

- [ ] T049 [US7] Add the `TrackerParity` widget to the element storybook component
      (`ElementStorybook.tsx`, beside `ReferenceEntryVariants`). It renders the shipped fodder
      group tracker and the rebuild side by side on the same sample marks, with a length switch.
      Place it on the storybook's template-elements page.
- [ ] T050 [US7] Write `tests/sheet_manager/tracker-parity.test.tsx`. For the same marks at each
      length (3/5/7), both trackers show:
    - the same visible level names;
    - the same totals and out states;
    - the same folded marks after shortening with hidden marks.

---

## Phase 10: Polish & cross-cutting

- [ ] T051 [P] Document the Tracker in `docs/template-editor/elements.mdx` and its ru mirror under
      `i18n/ru/docusaurus-plugin-content-docs/current/template-editor/`:
    - the settings groups;
    - marks and ready sets;
    - columns and copies;
    - lengths and out;
    - the total;
    - the Source select and what the game fixes on built-in trackers.

    Replace the old compact and view text. Update the `EDITOR_GUIDE` anchors if the headings
    change (`tests/docs/template-editor-guide.test.ts`).

- [ ] T052 [P] Update `.agents/skills/sheet-templates/SKILL.md`:
    - the tracker section: model, storage, overrides, display mapping;
    - the "New field type" checklist, where needed.

    Update `src/sheet_manager/AGENTS.md` where it describes tracks.

- [ ] T053 [P] Add a minor-version entry to `CHANGELOG.md` and bump `package.json` to match, then
      run `yarn check:version`.
- [ ] T054 Mark T-078 as done (✅) in `TODO.md`, with a note linking spec 018, then run
      `yarn validate:backlog`.
- [ ] T055 Run `yarn validate:i18n` and `yarn verify:full`. Fix everything they report, including
      knip: the old `ConditionTrackTable`/`ConditionTrackStrip` exports may become unused; remove
      them rather than add ignores. `CompactConditionTrack` stays out of scope unless knip flags it.
- [ ] T056 Walk through the manual scenarios in `specs/018-configurable-trackers/quickstart.md` on
      the dev server, together with the maintainer. Scenario 1 also checks SC-001 (a working
      tracker in under 3 minutes, without the guide).

---

## Dependencies

- **Setup (T001–T004)** → **Foundational (T005–T013)** → the stories.
- **US1** (T014–T021) is the MVP. It needs the foundational phase only.
- **US2, US3, US4, US5** each build on US1's `TrackerSettings` and field control. They touch the
  same files (`TrackerSettings.tsx`, `Tracker.tsx`, `tracker-field.test.tsx`, `stories.ts`), so
  they run in order: US2 → US3 → US4 → US5.
- **US6** needs US2–US5, because built-in trackers use every group. It is the largest phase.
- **US7** needs US4 and US5, which provide copies and lengths, and US6, whose shipped fodder group
  renders through the model.
- **Polish** comes after all stories.

## Parallel examples

- Setup: T002, T003, and T004 together.
- Foundational: after T005, run T006, T007, T008, T010, and T011 in parallel; T009 before T010's
  parity block.
- US4: T031 runs beside T029.
- Polish: T051, T052, and T053 together.

## Implementation strategy

1. **MVP**: Setup, Foundational, and US1. An own tracker works on any page, with the default
   health config.
2. **P1 stories.** US2 (marks) and US3 (display) complete the maintainer's key requests.
3. **P2 stories.** US4 and US5 bring own trackers up to the prototype. US6 brings built-in
   trackers to parity and adds the Star Wars total row.
4. **P3 story.** US7 proves the fodder-group parity.
5. **Polish.** Docs, skill, changelog, and the full verification.
6. Commit after each phase checkpoint.
