---
description: 'Task list for feature 014: rating element parity with trait rows'
---

# Tasks: Rating element parity with trait rows

**Input**: Design documents from `specs/014-rating-trait-parity/`:

- [plan.md](./plan.md) and [spec.md](./spec.md);
- [research.md](./research.md), whose decisions are cited as R1–R9;
- [data-model.md](./data-model.md);
- [contracts/rating-ui.md](./contracts/rating-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: Tests are included. Constitution V requires them for schema and persistence changes
(the `'boxes'` alias, the `#detail` value, and the storage bound). SC-002 needs roll parity tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: The task can run in parallel, because it touches different files and has no
  unfinished dependencies.
- **[Story]**: US1–US5 from spec.md.

---

## Phase 1: Setup

- [x] T001 Mark T-073 as in progress (`[ ] 🟡`) in `TODO.md` and run `yarn validate:backlog`.
- [x] T002 [P] Add the rating keys to `translations/source/en/ui/sheet/templates.yaml` and `translations/source/ru/ui/sheet/templates.yaml`:
    - under the editor keys, the labels `ratingTextInput`, `ratingShowNumbers`, `ratingDice`, `ratingFlags`, and `ratingFlagsHint` (S/P/E affect the pool only where the system's dice rule uses them);
    - under the page keys, `ratingText` (the accessible name "{label}: text") and `ratingClamped` (the clamp marker's accessible name);
    - remove `ratingBoxes`.

    Nested keys must not be named `message`, `description`, or `plural`. Run `yarn build:translations`.

---

## Phase 2: Foundational (blocks all stories)

- [x] T003 Change `RatingFieldSchema` in `src/sheet_manager/types/template.ts` (R2, data-model):
    - `presentation` becomes `z.preprocess((v) => (v === 'boxes' ? 'dots' : v), z.enum(['dots', 'number']))` with default `'dots'`;
    - add the optional booleans `textInput`, `showNumbers`, and `dice`;
    - add the optional `flags`, an array of `'specialization' | 'practiced' | 'experienced'` (max 3);
    - in `refineField`, add a uniqueness check for `flags` to the rating case.

    Export the `RatingFlag` type and the ordered constant `RATING_FLAGS`. Fix type errors where `'boxes'` was referenced: `FieldEditor.tsx`, and any `draft.ts` or `sourceNodes.ts` usage.

- [x] T004 Update `src/sheet_manager/types/templateValues.ts` (R1, R3):
    - add the strict `RatingDetailSchema` (`text?` a bounded string; `specialization?`, `practiced?`, `experienced?` booleans) and export the `RatingDetail` type;
    - add `ratingDetailKey(valueKey)`, which returns `${valueKey}#detail`, and `readRatingDetail(value)`, which safe-parses and returns `{}` on failure;
    - add `RatingDetailSchema` to the `TemplatePageValuesSchema` union, after the table-rows member;
    - raise the bag key maximum from 64 to 72;
    - `validateRating` now bounds by `field.min` and `TEMPLATE_LIMITS.ratingMax` instead of `field.max`.

- [x] T005 In `validateTemplatePageValues` in `src/sheet_manager/features/sheet/data/templateValueWrites.ts`, a changed key ending in `#detail` is validated against `RatingDetailSchema` (reason `'type'` on failure) when its base key belongs to a rating field. Otherwise it passes through as before.
- [x] T006 [P] Add schema tests to `tests/sheet_manager/template-schema.test.ts`:
    - a rating with `presentation: 'boxes'` parses as `'dots'`;
    - an unknown presentation still fails;
    - duplicate `flags` fail;
    - the new booleans round-trip.
- [x] T007 [P] Add value tests to `tests/sheet_manager/document-template-values.test.ts`:
    - a rating value above the static `max` and at most 100 validates, and 101 fails;
    - the value is not below `min`;
    - `coerceStoredValue` keeps 25 for a static-max-10 rating;
    - a `#detail` write for a rating validates, a bad shape is rejected, and a key with no rating passes through;
    - a document bag with a `#detail` entry parses through `TemplatePageValuesSchema`;
    - a 64-character value key plus `#detail` fits.

**Checkpoint**: The schema and storage accept the new shapes. Existing tests still pass (`yarn vitest run tests/sheet_manager`).

---

## Phase 3: User Story 1 - A rating reads like a trait row (P1) 🎯 MVP

**Goal**: The rating shows its label on the left and its dots or number on the right, with an optional text input and an optional current/maximum display.

**Independent test**: `tests/sheet_manager/rating-row.test.tsx` layout cases, plus the storybook next to a Star Wars attribute row.

- [x] T008 [P] [US1] Extract the die button from `src/sheet_manager/components/stat-fields/StatDot.tsx` into `src/sheet_manager/components/stat-fields/StatDiceButton.tsx` (R5):
    - props: `onDiceRoll`, `value`, the flags, `disabled`, `size`, `statLabel`, and `characterName`;
    - it owns `useSheetDiceActions` and `useDocumentRollSource`;
    - left click queues the roll and the context menu rolls at once;
    - `aria-label` is the existing dice title.

    `StatDot` renders it where it rendered the die before. Behavior is unchanged.

- [x] T009 [US1] Create `src/sheet_manager/components/stat-fields/RatingRow.tsx` following contracts/rating-ui.md "Sheet row":
    - props: `label`, `term`, `hideLabel`, `required`, `presentation`, `value`, `stored`, `min`, `max` (effective), `disabled`, `onChange`, `text?` with `onTextChange?`, `showNumbers`, `onDiceRoll?`, `flags?` (the enabled subset) with `flagValues` and `onFlagsChange`, `characterName`, and `degraded` notice content;
    - it uses the `term-row` classes, and adds `term-row-specialty`/`term-row-inner` when a text input is present;
    - `StatLabel` becomes `sr-only` when `hideLabel` is set;
    - the dot style renders `StatDot`: with `minimal={min > 0 ? min : undefined}`, and without `showFlags` or the die until US2;
    - the number style renders `NumberInput` with `min`/`max`;
    - numbers appear when `showNumbers` is set; the clamp marker appears when `stored > max` (R7).
- [x] T010 [US1] Rewrite `RatingFieldControl` in `src/sheet_manager/features/sheet/declarative/fieldControls.tsx` to render `RatingRow`, and delete the hand-made dot buttons:
    - compute `effectiveMax` per R3: `resolvedMax` clamped to `[max(1, min), TEMPLATE_LIMITS.ratingMax]`, otherwise `field.max`;
    - writes clamp to `[field.min, effectiveMax]`;
    - add `ratingDetail?: RatingDetail` and `onDetailChange?: (next: RatingDetail) => void` to `TemplateFieldControlProps`.
- [x] T011 [US1] Update `FieldCell` in `src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx`:
    - for `field.type === 'rating'`, return the control plus the description line, without the stacked label span (as for formulas);
    - pass `ratingDetail = readRatingDetail(pageApi.values[ratingDetailKey(fieldValueKey(field))])`;
    - pass `onDetailChange`, which writes that key through `pageApi.setValue`.
- [x] T012 [US1] Create the layout tests in `tests/sheet_manager/rating-row.test.tsx`, rendering through the declarative sheet (see `declarative-sheet.test.tsx` helpers):
    - the label and dots are in one `term-row`;
    - `hideLabel` makes the label `sr-only` while the radiogroup keeps its name;
    - the text input stores into `#detail` and keeps the value;
    - numbers show only with `showNumbers`;
    - the number style renders a spinbutton bounded by the effective max.
- [x] T013 [US1] Update existing rating expectations in `tests/sheet_manager/declarative-sheet.test.tsx` and `tests/sheet_manager/template-layout.test.tsx`: the label is no longer above the control, and "current/max" is no longer shown by default.

**Checkpoint**: US1 is testable on its own. Ratings look like trait rows.

---

## Phase 4: User Story 2 - Roll a rating (P1)

**Goal**: A die on either style and S/P/E flags on the dot style roll through the system's `traitPool`.

**Independent test**: the roll-parity cases in `rating-row.test.tsx`.

- [x] T014 [US2] Add `flags?: readonly RatingFlag[]` to `StatDot` in `src/sheet_manager/components/stat-fields/StatDot.tsx`:
    - it renders only the listed flags, in S, P, E order;
    - `showFlags` without `flags` still means all three;
    - the header's placeholder spacing adapts when some flags are absent.
- [x] T015 [US2] Wire rolling in `RatingRow.tsx` and `fieldControls.tsx`:
    - when `field.dice` is set, pass `useDocumentTraitDiceRoll()` as `onDiceRoll`;
    - pass the document title (from `useDocumentSource().document?.metadata.title`) as `characterName`, and the displayed label as `statLabel`;
    - on the dot style, pass `flags={field.flags}` with the values from `ratingDetail`, where a flag that is not enabled is `false`;
    - flag toggles write `#detail` through `onDetailChange`;
    - on the number style, render `StatDiceButton` before the `NumberInput`;
    - the die is hidden when the hook returns `undefined`, and disabled on read-only documents.
- [x] T016 [US2] Add roll tests to `tests/sheet_manager/rating-row.test.tsx`. Mock `useSheetDiceActions` to capture the queued notation, as existing StatDot and dice tests do:
    - for Star Wars and V5 documents, values 0–10 × flag combinations, the queued notation equals the system's `traitPool(value, flags)` (SC-002), and value 0 queues nothing;
    - the number style rolls the typed value;
    - only the enabled flags render;
    - the roll carries the rating's label;
    - a system without `dice.traitPool` shows no die.

**Checkpoint**: US1 and US2 work together. This is the MVP for play.

---

## Phase 5: User Story 3 - A computed maximum decides the range (P2)

**Goal**: A `maxFrom` above the static maximum makes every shown dot selectable, up to 100. A lower one clamps the display and marks the hidden part.

**Independent test**: the storybook story "Rating, maximum from 'Number'" with Number = 30.

- [x] T017 [US3] Add tests to `tests/sheet_manager/rating-row.test.tsx`:
    - static max 10 with a `maxFrom` source of 30: clicking dot 25 stores 25;
    - the source drops to 12: 12 dots show, 12 are filled, and the clamp marker "(25)" shows with numbers off;
    - a source of 250 gives 100 dots;
    - an unavailable source falls back to the static max with the `role="alert"` notice.

    Fix any gaps in the `effectiveMax` code from T010 that the tests reveal.

**Checkpoint**: SC-003 holds.

---

## Phase 6: User Story 4 - Many dots stay compact and easy to hit (P2)

**Goal**: Gapless dot cells with unchanged visuals, and compression into pills on narrow rows.

**Independent test**: the structure tests below, and a manual check on the 30-dot story (quickstart step 5).

- [x] T018 [US4] Restructure the dot list in `src/sheet_manager/components/stat-fields/StatDot.tsx` (R6):
    - the container is `flex -mx-0.5` without `gap-1`;
    - each `radio` button is `min-w-0 shrink px-0.5` with no border or background, and holds a `span` of `block h-4 w-4 max-w-full rounded-full border-2` (size variants: `sm` h-3/w-3, `lg` h-5/w-5) that carries the active, floor, and hover classes (`group-hover` on the button);
    - `disabled` opacity moves to the span.
- [x] T019 [US4] Add structure tests to `tests/sheet_manager/rating-row.test.tsx`:
    - a 30-dot rating renders 30 radios in one flex row with no `gap-*` class;
    - every radio has `min-w-0` and the padding class, and holds one dot span;
    - clicking a radio (the cell, not the span) sets its value.

    Run the existing StatDot and trait tests (`yarn vitest run tests/sheet_manager`) to confirm that trait rows are unaffected.

**Checkpoint**: FR-013 and FR-014 hold for ratings and trait rows alike.

---

## Phase 7: User Story 5 - Authors configure all of this in the editor (P2)

**Goal**: Editor switches, help, storybook stories, and the guide.

**Independent test**: the editor tests below, and a storybook review.

- [x] T020 [US5] Update the rating block of `src/sheet_manager/components/dialogs/template-editor/FieldEditor.tsx` per contracts/rating-ui.md "Editor":
    - the style select offers only Dots and Number;
    - add `Checkbox` switches for text input, show numbers, and die;
    - on the Dots style, add three toggles S, P, E that write `flags` in `RATING_FLAGS` order, with the `ratingFlagsHint`;
    - each switch has a help link to `EDITOR_GUIDE.rating`.
- [x] T021 [P] [US5] Add the `rating` entry to `EDITOR_GUIDE` in `src/sheet_manager/components/dialogs/template-editor/EditorHelp.tsx`, pointing at `/docs/template-editor/elements#rating`.
- [x] T022 [P] [US5] Update the guide: in `docs/template-editor/elements.mdx` and `i18n/ru/docusaurus-plugin-content-docs/current/template-editor/elements.mdx`:
    - the elements-table Rating row reads "Dots or a number";
    - add a `### Rating {#rating}` section covering the floor, the static and computed maximum, the text input, the numbers, the die, S/P/E and which systems use them, and "boxes" opening as dots.

    Run `yarn validate:i18n`.

- [x] T023 [P] [US5] Update the ratings section of `src/sheet_manager/storybook/stories.ts`:
    - replace `rating-boxes` with stories `rating-hidden-label`, `rating-text`, `rating-numbers`, `rating-dice` (die on, dots), `rating-dice-number`, `rating-flags` (S, P, E), and a 30-dot `rating-many`;
    - give `rating-capped` a static max of 10 with `maxFrom: 'number-plain'` (keep it);
    - make sure the story sandbox's `number-plain` sample can reach 30.
- [x] T024 [US5] Extend `tests/sheet_manager/storybook.test.tsx` so the guard requires a rating story for each of `textInput`, `showNumbers`, `dice`, `flags`, `hideLabel`, `presentation: 'number'`, and `maxFrom`.
- [x] T025 [US5] Extend `tests/sheet_manager/template-editor.test.tsx`:
    - toggling each switch updates the draft field;
    - S/P/E are hidden on the Number style;
    - the style select has no "boxes" option;
    - importing or loading a template with a `'boxes'` rating opens as Dots with no draft issues (SC-005).

**Checkpoint**: All stories are complete.

---

## Phase 8: Polish & Cross-Cutting

- [x] T026 [P] Update `.agents/skills/sheet-templates/SKILL.md`: the rating options, the `#detail` companion (R1), the storage bound (R3), and that `RatingRow` and `StatDiceButton` are shared with trait rows. Update `src/sheet_manager/AGENTS.md` if it describes rating presentation.
- [x] T027 [P] Add a v3.12.0 entry to `CHANGELOG.md` and set `package.json` to 3.12.0. Run `yarn check:version`.
- [x] T028 Mark T-073 done (`[x] ✅`) in `TODO.md`, with a dated note on what shipped and that T-058 stays open. Run `yarn validate:backlog`.
- [x] T029 Run `yarn verify:full` and fix every failure: lint, typecheck, knip, i18n coverage, tests, and the en and ru build.
- [x] T030 Walk through the quickstart manually (the maintainer, on the dev server).

---

## Phase 9: Review additions (2026-09-27)

- [x] T031 Key the editor's end insert slot in `ChildrenGrid` (`src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx`), and give the empty dot span the theme border (`StatDot.tsx`).
- [x] T032 In `RatingRow.tsx`, a number rating with `showNumbers` frames a read-only "/ max" like a resource, with no numbers written after it.
- [x] T033 Add `labelPosition` (`top`/`left`) to every field (`types/template.ts`, `fieldLabelPosition`), the `FieldLabel` atom, `LabeledField` in `DeclarativeSheetView.tsx`, top/left in `RatingRow` and the formula control, the editor select, storybook stories and tags, guide text in en and ru, and tests in `rating-row.test.tsx`.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** comes first.
- **Foundational (T003–T007)** blocks every story. T006 and T007 can run in parallel after T003 and T004.
- **US1 (T008–T013)** needs Foundational. T008 can run in parallel with T009's start.
- **US2 (T014–T016)** needs US1, because it builds on `RatingRow` and `StatDiceButton`.
- **US3 (T017)** needs T010.
- **US4 (T018–T019)** needs only T008, since it touches `StatDot`. It may run alongside US2, but T014 and T018 edit the same file, so do them in sequence.
- **US5 (T020–T025)** needs Foundational for the schema. The editor switches work without the renderer, but its tests assume US1 and US2.
- **Polish (T026–T030)** comes after all stories.

## Parallel Examples

- After T004: T006 ∥ T007.
- In US5: T021 ∥ T022 ∥ T023. Then T024 and T025.
- In Polish: T026 ∥ T027.

## Implementation Strategy

1. Build Setup and Foundational, then US1. This is the MVP: ratings look right.
2. Add US2 (rolling). This makes ratings usable in play.
3. US3 and US4 are small, independent fixes.
4. US5 comes last, because it covers the editor surface, the storybook, and the guide. Then Polish and `verify:full`.
