# Tasks: Template-Editor Parity for the Vampire Mechanics

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order follows design "Approach": formulas first (every later story uses them), then the
button, From catalog, marks from the end, parents, and the vampire rebuild that retires the
code-only mechanics. Paths are relative to the repository root; `decl/` stands for
`src/sheet_manager/features/sheet/declarative/`, `editor/` for
`src/sheet_manager/features/template-editor/`.

## User Story 2 - Formulas with rounding, comparisons, conditions, and text (P1)

**Check**: a user template with derived values for each new function, a text result, a list lookup,
and a card shown by a formula condition (spec US2).

- [x] T001 [US2] Tests first in `tests/sheet_manager/formula-functions.test.ts`: `ceil`, `floor`,
      `round`, `abs`; `< <= > >= = !=` giving 1/0; `and`, `or`, `not`; `if`; string literals and
      `&`; arithmetic on text → `non-numeric`; `row.<column>` with a row scope; parse errors with
      positions; every formula of the existing formula tests keeps its result
- [x] T002 [US2] Extend the tokenizer, parser, `Expr`, `collectDependencies`, and `evaluateFormula`
      in `decl/formula.ts` (results `number | string`; `row.*` resolved through an optional row
      resolver; `rating` as a call whose first argument is a coordinate)
- [x] T003 [US2] Tests first in `tests/sheet_manager/formula-rating.test.ts`: `rating()` over a
      template list and a built-in list, matching any catalog name (en, ru, book name), 0 when
      absent, the highest of duplicates
- [x] T004 [US2] Implement `rating()` resolution in `decl/hooks.ts` (formula pass), generalizing the
      name matching of `src/sheet_manager/systems/v5/modules/vampire/disciplineDots.ts` into
      `decl/listRating.ts` (system-free: catalog names through `getCatalogBinding`)
- [x] T005 [US2] Formula field text results: `FormulaResolution` carries strings; formula fields
      render text; add `textMessages` (literal → message) to the formula schema in
      `src/sheet_manager/types/template.ts` and translate in `decl/fieldControls.tsx`
- [x] T006 [US2] Tests first in `tests/sheet_manager/visible-when-formula.test.tsx`, then add the
      `{formula}` variant to `VisibleWhenSchema` (`src/sheet_manager/types/template.ts`) and to
      `isVisible` in `decl/hooks.ts` (shown while the result is non-zero / non-empty; errors hide
      the node and report to `diagnostics.ts`)
- [x] T007 [US2] Editor: formula help and checks for the new functions in `decl/formulaMessages.ts`
      and `src/sheet_manager/features/sheet/data/formulaCheck.ts`; "Show when" offers "Formula" in
      `editor/panels/LayoutControls.tsx`; text-result translations are not editable for user
      templates; editor tests in `tests/sheet_manager/template-editor/visible-when.test.tsx`
- [x] T008 [US2] Storybook: a derived-value story with a text result and a formula-conditioned card
      in `docs/dev/storybook/template-elements.mdx` (its story data under
      `src/sheet_manager/features/sheet/storybook/`); translations for new editor strings in
      `translations/source/{en,ru}/ui/sheet/templates.yaml`
- [ ] T009 [US2] Run `yarn verify` (schema change) and commit the story

## User Story 1 - A button that rolls and changes values (P1)

**Check**: a user template button rolling `1d10>=6` that adds 1 to a number field on a failure, with
Undo (spec US1).

- [x] T010 [US1] Schema: `ButtonSpec`, `ButtonNodeSchema` (`type: 'button'`), `Change`, and
      `rowButtons` on `TableNodeSchema` and `PrimitiveNodeSchema` in
      `src/sheet_manager/types/template.ts`; limits (changes per outcome, buttons per row) in
      `src/sheet_manager/types/templateLimits.ts`; zod baseline updated (additions only)
- [x] T011 [US1] Tests first in `tests/sheet_manager/button-run.test.ts`: success and failure
      changes; add clamped to bounds and the at-limit message; `set`; `always`; `count` with re-roll
      per failed roll while `rerollWhen` holds; cancel mid-way keeps finished writes; unavailable;
      notation or condition that does not evaluate; a target the document cannot store (skipped and
      reported); two changes to one value applied in order; no roll → success changes; `{formula}`
      notation segments; `row.*` values; `gameDice` on and off
- [x] T012 [US1] Implement `runButton` in `decl/button/runButton.ts` (pure: spec, values reader,
      bounds reader, roll function → writes, old values, message descriptor and values)
- [x] T013 [US1] Tests first in `tests/sheet_manager/button-ui.test.tsx`: a button node and row
      buttons render with labels ("<label> for <row name>" on rows); read-only disables with a
      reason; unavailable disables with a reason; Undo restores values and skips one edited by hand;
      a cancelled roll writes nothing
- [x] T014 [US1] Implement `decl/button/SheetButton.tsx` (rolls through `useSheetDiceActions` in
      `src/integrations/sheet-dice/`, special dice only with `gameDice`, writes through
      `applyWrites`, toast with Undo for 8 s), render `button` nodes in
      `decl/DeclarativeSheetView.tsx` and row buttons in `decl/RowsBody.tsx` and the table renderer
- [x] T015 [US1] Editor: `button` in `ELEMENT_EDITORS` and the "+" menu
      (`editor/elements/registry.tsx`); settings panel `editor/panels/ButtonSettings.tsx` (label,
      icon, availability, roll, count, re-roll, success at, game dice, the three change lists with a
      coordinate picker); row buttons settings on tables and rows primitives; draft issues for
      unknown targets and bad formulas in `editor/issues/draftIssues.ts`; editor tests in
      `tests/sheet_manager/template-editor/button-settings.test.tsx` (palette now group, field,
      list, button)
- [x] T016 [US1] Storybook stories (button with and without a roll, row buttons) in
      `docs/dev/storybook/template-elements.mdx`; translations in
      `translations/source/{en,ru}/ui/sheet/templates.yaml` and `documents.yaml` (messages, Undo)
- [ ] T017 [US1] Run `yarn verify` and commit the story

## User Story 3 - Text from a catalog entry (P2)

**Check**: a user catalog, a picker field, and text fields From catalog in both modes (spec US3).

- [x] T018 [US3] Tests first in `tests/sheet_manager/from-catalog.test.tsx`: show only (not
      typeable), suggest (typing replaces, clearing restores), alternative text by condition, no
      matching entry, lazy text without a flash, user catalog text columns
- [x] T019 [US3] Schema `fromCatalog` on text fields (`src/sheet_manager/types/template.ts`);
      `CatalogBindingEntry.texts` in `src/sheet_manager/systems/catalogs.ts` (vampire clans and
      predator types declare theirs in `src/sheet_manager/systems/v5/modules/vampire/catalogs.ts`;
      user catalogs derive them from text columns in `src/sheet_manager/systems/userCatalogs.ts`)
- [x] T020 [US3] Generalize `decl/fieldFallback.ts` to read a field's `fromCatalog` and render it in
      `decl/fieldControls.tsx` (show only as output, suggest as placeholder)
- [x] T021 [US3] Editor: "From catalog" settings in `editor/panels/field/ValueSettings.tsx`
      (catalog, picking field, text, alternative with condition, mode); editor tests in
      `tests/sheet_manager/template-editor/from-catalog-settings.test.tsx`
- [x] T022 [US3] Storybook story and translations; run `yarn verify` and commit the story

## User Story 4 - A tracker with marks from the other end (P2)

**Check**: a 10-box tracker with marks from the end, set by mouse and keyboard (spec US4).

- [x] T023 [US4] Tests first in `tests/sheet_manager/pool-tracker-marks-from-end.test.tsx` (moving
      `tests/sheet_manager/score-track.test.tsx` cases): fills from the start, marks from the end,
      refusal with a message on a filled box, right click / Shift+Enter / long press, arrows,
      accessible description, marks shrink when the value rises
- [x] T024 [US4] Schema: `marksFromEnd {coordinate, mark?}` on `PoolTrackerOverrideSchema`; rating
      presentation `tracker` with `poolTracker` (`src/sheet_manager/types/template.ts`)
- [x] T025 [US4] Single-value mode and marks from the end in
      `src/sheet_manager/features/sheet/data/poolTracker.ts` and `decl/PoolTracker.tsx`; use it for
      rating fields (`decl/fieldControls.tsx`) and rating-mode resource primitives
      (`decl/primitives.tsx`); clamp the marks on write
- [x] T026 [US4] Editor: Display "Tracker" for ratings and rating-mode built-in resources and the
      "Marks from the end" setting in `editor/panels/PrimitiveConfig.tsx` and
      `editor/panels/field/LookSettings.tsx`; editor tests
- [x] T027 [US4] Storybook story and translations; run `yarn verify` and commit the story

## User Story 5 - Rows limited by their parent row (P3)

**Check**: user catalogs of parents and children, Limit by parent in a user table (spec US5).

- [x] T028 [US5] Tests first in `tests/sheet_manager/catalog-parent.test.ts`: `entry` columns parse
      and validate, a broken parent link, picks filtered by the parent row's rating, the
      above-parent mark kept, built-in rows with `limitByParent` (from
      `tests/sheet_manager/rows-catalog-limit.test.ts`)
- [x] T029 [US5] Column type `entry` (`catalogId`) in `src/sheet_manager/systems/userCatalogs.ts`
      and the catalog editor (column type choice, entry picker, broken-link mark)
- [x] T030 [US5] `binding.parent {list, limit?}` on catalog-bound select columns
      (`src/sheet_manager/types/template.ts`) and `limitByParent` on rows primitives; move the
      filtering of `decl/rowsCatalog.ts` to read the template's limit
- [x] T031 [US5] Editor settings for both in `editor/panels/field/SelectOptions.tsx` and
      `editor/panels/PrimitiveConfig.tsx`; editor tests; storybook story; translations
- [x] T032 [US5] Run `yarn verify` and commit the story

## User Story 6 - The vampire sheet on configurable elements (P1)

**Check**: a user copy of the shipped vampire sheet shows every mechanic as an element or option;
037 behavior tests pass (spec US6, SC-001).

- [ ] T033 [US6] Tests first: `tests/sheet_manager/shipped-parity.test.ts` (SC-003: every shipped
      template opens in the editor model and saves unchanged; every key a node defines is in its
      type's `settingKeys`, a new list on each `ELEMENT_EDITORS` entry in
      `editor/elements/registry.tsx`); Remorse cases in
      `tests/sheet_manager/systems/v5/vampire-rouse.test.tsx`
- [ ] T034 [US6] Rebuild `src/sheet_manager/systems/v5/modules/vampire/templates/sheet.ts` and
      `brief.ts`: Rouse and Remorse buttons, a power row button (count `row.rouse`, re-roll while
      `row.level <= ceil(blood-potency / 2)`, available while `row.rouse > 0`), Blood Potency
      effects and potency range as formula fields with `textMessages`, grants/bane/compulsion via
      `fromCatalog`, Humanity with `marksFromEnd: 'stains'`, powers with `limitByParent`, rituals
      shown by a `rating()` formula
- [ ] T035 [US6] Retire the code-only mechanics: `ActionBinding` and its types,
      `RowsBinding.actions`, resource `mode: 'score'`, `FieldBinding.readOnly`/`fallback`,
      `BoundMessage`, `RowsCatalogParent.limit` in `src/sheet_manager/systems/templateBindings.ts`;
      delete `decl/ActionButton.tsx`, `src/sheet_manager/components/stat-fields/ScoreTrack.tsx`,
      `vampire/rouse.ts`, `vampire/disciplineDots.ts`, and the potency-effect and ritual-dots
      bindings in `vampire/bindings.ts`; keep `vampire/bloodPotency.ts` only as the oracle of
      `tests/sheet_manager/systems/v5/vampire-blood-potency.test.ts` if it stays imported, otherwise
      turn that test into formula-field checks; update `storybook/stories.ts` `bindingSignature`
- [ ] T036 [US6] Update the 037 tests to the rebuilt templates (`vampire-sheet`, `vampire-rouse`,
      `vampire-blood-potency`, `catalog-bindings`, `rows-catalog-limit`); vampire translations in
      `translations/source/{en,ru}/ui/sheet/v5Vampire.yaml` (button labels, Remorse, formula texts;
      drop unused rouse messages); the blood-cell check of `tests-e2e/smoke/vampire-brief.spec.ts`
      finds Humanity through the pool tracker instead of the retired score track
- [ ] T037 [US6] Run `yarn verify:full` (route-visible template change) and commit the story

## Finish

- [ ] T038 Update `src/sheet_manager/AGENTS.md`, `.agents/skills/sheet-templates/SKILL.md` and
      `references/bindings.md` (what bindings own vs what templates own), the formula reference, and
      `.agents/skills/sheet-manager/SKILL.md`; the template-editor guide en + ru
      (`docs/guide/template-editor/elements.mdx`, `values.mdx`, and their Russian mirrors) for the
      button, formulas, From catalog, marks from the end, and parents; `docs/guide/sheet.mdx` en +
      ru for Remorse and Undo; `specs/037-vampire-character/spec.md` gets a historical-record banner
      (as in spec 005) naming 038 and the current guidance
- [ ] T039 Backlog entry T-123 in `TODO.md` (spec 038, done with T-039), then measure the sheet page
      bundle against `037-vampire-character` (SC-005, +10 KB gzip) and record it in design.md
- [ ] T040 Run `yarn verify:full`; walk the steps in design.md "Manual walk" ; record results in
      design.md. SC-002 (an author rebuilds the buttons from the guide alone in ten minutes) is the
      maintainer's step: the walk only checks that the guide names every setting it needs

## Coverage

| Requirement | Tasks                                                      |
| ----------- | ---------------------------------------------------------- |
| FR-001      | T010, T015                                                 |
| FR-002      | T011, T014                                                 |
| FR-003      | T011, T012, T013, T014                                     |
| FR-004      | T011, T012                                                 |
| FR-005      | T011, T013                                                 |
| FR-006      | T001–T005                                                  |
| FR-007      | T006                                                       |
| FR-008      | T018–T021                                                  |
| FR-009      | T023–T026                                                  |
| FR-010      | T028–T031                                                  |
| FR-011      | T033, T034, T036                                           |
| FR-012      | T035                                                       |
| FR-013      | T007, T008, T015, T016, T021, T022, T026, T027, T031, T038 |
| FR-014      | T010 (zod baseline), T024, T029, T030                      |
| SC-001      | T033, T036                                                 |
| SC-002      | T040 (maintainer's check)                                  |
| SC-003      | T033                                                       |
| SC-004      | T011 (timing measured in the manual walk, T040)            |
| SC-005      | T039                                                       |
