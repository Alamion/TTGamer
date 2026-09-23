---
description: 'Task list for feature 010 — small UX polish and dead-code gate'
---

# Tasks: Small UX polish and dead-code gate

**Input**: Design documents from `specs/010-ux-polish-audit-gate/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: included. Not a user preference — Principle V (risk-proportional testing) requires them for a `dice-logic` change and for user-visible sheet controls, and the spec's acceptance scenarios are written as test cases.

**Organization**: one phase per user story. The four stories are fully independent — they touch different files and can be implemented, tested, and committed in any order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 = on-demand 3D renderer, US2 = searchable catalog selects, US3 = clear control, US4 = dead-code gate

## Path Conventions

Single project: `src/` and `tests/` at the repository root, per [plan.md](plan.md).

---

## Phase 1: Setup (baselines)

**Purpose**: capture the "before" numbers the success criteria compare against. Nothing here changes behavior.

- [ ] T001 Run `yarn build` on the clean tree and record the sheet-route JS asset names and sizes into `specs/010-ux-polish-audit-gate/baseline.md` (SC-002)
- [ ] T002 [P] Run `yarn audit:dead-code` on the clean tree and append its exact output (1 duplicate export, 1 configuration hint) to `specs/010-ux-polish-audit-gate/baseline.md`
- [ ] T003 [P] Run `yarn test tests/dice_roller` and `yarn test tests/sheet_manager` to confirm a green starting point

**Checkpoint**: baselines recorded; every story below can start.

---

## Phase 2: Foundational

**No foundational work is required.** The four stories share no new module, type, or configuration. This phase exists only to state that explicitly, so no one waits for it.

---

## Phase 3: User Story 1 — The page loads without the 3D engine (Priority: P1) 🎯 MVP

**Goal**: `three` and `cannon-es` leave the initial download of every route and arrive on the first 3D roll; a failed load still yields a correct roll plus a visible message.

**Independent Test**: load every route with no 3D roll requested and confirm no 3D chunk is fetched; then roll in 3D and confirm the roll plays out; then block the chunk and confirm a 2D result with a message.

**Contract**: [contracts/lazy-renderer.md](contracts/lazy-renderer.md)

### Tests for User Story 1

- [ ] T004 [US1] In `tests/dice_roller/integration/roll-orchestrator.test.ts`, add a case asserting that a 2D-only roll (3D disabled, unsupported sides, and over-`MAX_PHYSICAL_3D_DICE`) never loads `./renderer`
- [ ] T005 [US1] In `tests/dice_roller/integration/roll-orchestrator.test.ts`, add a case asserting the renderer module is loaded exactly once across two consecutive 3D rolls, including two rolls started concurrently (FR-004)
- [ ] T006 [US1] In `tests/dice_roller/integration/roll-orchestrator.test.ts`, add a case where the dynamic import rejects and assert the roll returns a correct 2D result carrying `renderer3dUnavailable: true` (FR-003), and that a later roll retries the load (FR-004)
- [ ] T041 [US1] In `tests/dice_roller/integration/roll-orchestrator.test.ts`, add a case for a 3D roll requested while the previous roll is still animating: both resolve with correct results and the renderer is loaded once (spec edge case)

### Implementation for User Story 1

- [ ] T007 [US1] Add the optional `renderer3dUnavailable?: true` field to the roll result types in `src/dice_roller/dice-logic/types.ts`, documented as a transient presentation flag (see [data-model.md](data-model.md))
- [ ] T008 [US1] In `src/dice_roller/dice-logic/roll-orchestrator.ts`, replace the value imports from `./renderer` with a module-scope memoized `loadRenderer()` returning `import('./renderer')`; keep `DiceGeometryData` and `PhysicsRollHandle` as `import type`
- [ ] T009 [US1] In `src/dice_roller/dice-logic/roll-orchestrator.ts`, call `loadRenderer()` only after the existing 2D decisions (3D disabled, no supported sides, dice-count limit) and thread the loaded `prepareDiceGeometries` into `processExplosionLoop` instead of the module-level import
- [ ] T010 [US1] In `src/dice_roller/dice-logic/roll-orchestrator.ts`, handle a rejected load: `warn(..., '3DDiceRolls')`, evaluate through the existing 2D path, and return the result with `renderer3dUnavailable: true`; do not cache the rejection permanently
- [ ] T011 [US1] Add `src/dice_roller/components/Renderer3DFallbackNotice.tsx`: an `onRollResult` subscriber that shows a translated `toast.error` at most once per session when a result carries `renderer3dUnavailable`, modelled on `src/dice_roller/components/DiscordWebhookSubscription.tsx`, and mount it in `src/theme/Root.tsx` beside `DiscordWebhookSubscription` (not in the store — Principle IV store discipline)
- [ ] T012 [US1] Add the toast message to `translations/source/en/ui/dice/panel.yaml` and its Russian mirror `translations/source/ru/ui/dice/panel.yaml`, then run `yarn build:translations` and `yarn validate:i18n`
- [ ] T013 [US1] Verify `src/dice_roller/dice-logic/index.ts` is unchanged and that no file outside `dice-logic/renderer/` statically imports `three` or `cannon-es` (`grep -rn "from 'three'\|cannon-es" src`)
- [ ] T014 [US1] Run `yarn build` and record the new sheet-route asset sizes beside the baseline in `specs/010-ux-polish-audit-gate/baseline.md`; confirm the 3D packages moved into an on-demand chunk (SC-001, SC-002)
- [ ] T015 [US1] Run `yarn verify` (Tier 2 — this is a `dice-logic` change) and walk steps 1–4 of [quickstart.md](quickstart.md) §2 in the browser with the Network panel open

**Checkpoint**: US1 is complete and demonstrable on its own.

---

## Phase 4: User Story 2 — Picking from a long catalog list (Priority: P2)

**Goal**: a bound single-select with more than 12 options becomes a searchable, bilingual picker that writes the same stored value as today.

**Independent Test**: open a long bound select and search in either language; open a short one and a multi-select and confirm they are unchanged.

**Contract**: [contracts/catalog-select-control.md](contracts/catalog-select-control.md)

### Tests for User Story 2

- [ ] T016 [US2] Create `tests/sheet_manager/declarative-catalog-select.test.tsx` with the control-selection rule cases: 12 options → plain select, 13 → searchable, `multiple` → plain, static options → plain
- [ ] T017 [US2] In `tests/sheet_manager/declarative-catalog-select.test.tsx`, assert that typing a Russian fragment (case- and `ё`-insensitive) narrows the list and that choosing an entry writes the option's **value**, not its label
- [ ] T018 [US2] In `tests/sheet_manager/declarative-catalog-select.test.tsx`, assert that a stored value absent from the catalog is displayed and survives a re-render without being cleared (FR-008), and that an emptied input writes `undefined`
- [ ] T019 [US2] In `tests/sheet_manager/declarative-catalog-select.test.tsx`, assert that catalog fills still fire when an entry is chosen through the searchable control (the `DeclarativeSheetView` write path)
- [ ] T042 [US2] In `tests/sheet_manager/declarative-catalog-select.test.tsx`, assert that a field whose option list grows past the threshold between renders keeps the control the user is interacting with (spec edge case, research R4)

### Implementation for User Story 2

- [ ] T020 [US2] In `src/sheet_manager/features/sheet/declarative/fieldControls.tsx`, extract the resolved-options computation of `SelectFieldControlRender` and add the pure threshold predicate (bound + single + `options.length > 12`)
- [ ] T021 [US2] In `src/sheet_manager/features/sheet/declarative/fieldControls.tsx`, add the searchable wrapper: local query state seeded from the current value's label (or the raw stored value), `CatalogSuggest` over `{id: option.value, name: option.label}`, `onSelect` writing `entry.id` through the field's `onChange`, empty query writing `undefined`, and `ariaLabel={field.label}` (FR-009)
- [ ] T022 [US2] Route `SelectFieldControlRender` through the predicate so the plain `<select>` stays for short lists, multi-select, and static options; leave `CatalogSuggest.tsx` untouched
- [ ] T023 [US2] Run `yarn verify:fast` and `yarn test tests/sheet_manager`, then check [quickstart.md](quickstart.md) §3 in the browser, including the 360 px popover position and one timed keyboard-only selection in the largest catalog (record the seconds, SC-003)

**Checkpoint**: US2 is complete; US1 and US2 both work independently.

---

## Phase 5: User Story 3 — Noticing the clear control on a rating (Priority: P3)

**Goal**: the rating clear cross reads as destructive at rest, strengthens on hover and keyboard focus, and announces itself to assistive technology.

**Independent Test**: view a removable rating row in both themes at rest, on hover, and on keyboard focus; check the accessible name.

### Tests for User Story 3

- [ ] T024 [US3] Create `tests/sheet_manager/stat-dot-clear.test.tsx` asserting the remove button exposes the accessible name from `uiMessages.sheet.controls.statDot.remove` and that no such button renders when `onRemove` is absent

### Implementation for User Story 3

- [ ] T025 [US3] In `src/sheet_manager/components/stat-fields/StatDot.tsx`, add `aria-label` from the existing `statDot.remove` message to the remove button, keeping the `title` (Principle VI floor, no new translation key)
- [ ] T026 [US3] In `src/sheet_manager/components/stat-fields/StatDot.tsx`, restyle the remove button to the error color at reduced opacity at rest, rising on hover and `focus-visible`, with the project's visible focus ring; keep `flagSizeClasses[size]` and the `ml-auto` placement so row widths do not shift (FR-013)
- [ ] T027 [US3] Run `yarn verify:fast` and `yarn test tests/sheet_manager`, then check [quickstart.md](quickstart.md) §4 in both themes, including a narrow brief layout

**Checkpoint**: US3 complete.

---

## Phase 6: User Story 4 — The dead-code audit stops being advisory (Priority: P3)

**Goal**: knip exits clean on the current tree and fails `yarn verify` on any new unused file, export, or dependency.

**Independent Test**: `yarn verify` passes on a clean tree; adding an unused export makes it fail naming that export.

**Contract**: [contracts/verification-tiers.md](contracts/verification-tiers.md)

> Recommended to implement **after** US1–US3, so the gate closes over the tree those stories leave behind rather than over work in progress.

### Implementation for User Story 4

- [ ] T028 [US4] Remove the `TemplateValuesBagSchema` alias from `src/sheet_manager/types/templateValues.ts` and move its explanatory comment to the `templateValues` field in `src/sheet_manager/types/document.ts`, which now uses `TemplatePageValuesSchema` directly
- [ ] T029 [P] [US4] Remove `src/i18n/generated/**` from the `ignore` list in `knip.json`, keeping `src/@types/**` and the `tags: ["-knipignore"]` exemption mechanism
- [ ] T030 [US4] Run `yarn audit:dead-code` and confirm it exits 0 with no findings and no configuration hints
- [ ] T031 [US4] Add `yarn audit:dead-code` to the `verify` script in `package.json` (Tier 2), leaving `verify:fast` untouched; confirm `verify:full` inherits it
- [ ] T032 [US4] Run the negative check from [quickstart.md](quickstart.md) §1: append a throwaway unused export, confirm the gate fails naming file and symbol, then revert it
- [ ] T033 [US4] Amend `.specify/memory/constitution.md`: replace the advisory-audit bullet in "Verification Workflow" with the Tier 2 gate, bump the version MINOR, and update the Sync Impact Report header
- [ ] T034 [P] [US4] Update `AGENTS.md` §3 (command table) and §10 (Verification Scope) to match the amended tiers
- [ ] T035 [US4] Run `yarn verify` end to end and confirm the added audit step passes and that `yarn verify:fast` timing is unchanged

**Checkpoint**: all four stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T036 [P] Mark T-013, T-030, T-055, and T-064 done in `TODO.md`, with the T-030 entry naming the resolution of both remaining findings and the new gate tier (FR-019)
- [ ] T037 [P] Add the release entry to `CHANGELOG.md` and check `yarn check:version` still passes
- [ ] T038 Record the before/after sheet-route asset figures from `specs/010-ux-polish-audit-gate/baseline.md` in the T-013 entry of `TODO.md` (the project's convention for outcomes, AGENTS.md §9), leaving the spec as the change record (SC-002)
- [ ] T039 Run `yarn verify:full` (this change touches `package.json`, `knip.json`, and a route's bundle composition — Tier 3 is required)
- [ ] T040 Walk [quickstart.md](quickstart.md) end to end as the final acceptance pass and record any defect found as a task here rather than in `TOFIX.md` (defects found inside a feature cycle belong to the cycle)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T001 must precede T014 (it is the baseline T014 compares against)
- **Foundational (Phase 2)**: empty — blocks nothing
- **User stories (Phases 3–6)**: mutually independent; any order, any subset
- **Polish (Phase 7)**: after the stories that are being shipped

### Within each story

- Tests are written before or alongside the implementation of the same story; they must fail before it and pass after
- US1: T007 (type) → T008 → T009 → T010 → T011 → T012, then T013–T015 verify; T004–T006 and T041 all edit `roll-orchestrator.test.ts`, so they are sequential
- US2: T020 (predicate) → T021 (wrapper) → T022 (routing) → T023 verify; T016–T019 and T042 all edit `declarative-catalog-select.test.tsx`, so they are sequential
- US3: T025 and T026 touch the same file — sequential, not parallel
- US4: T028 and T029 → T030 (clean) → T031 (gate) → T032 (negative check) → T033/T034 (documents) → T035

### Parallel Opportunities

- T002 and T003 in Setup
- Test tasks inside a story share one file (`roll-orchestrator.test.ts` for US1, `declarative-catalog-select.test.tsx` for US2), so they run sequentially; `stat-dot-clear.test.tsx` (T024) is independent of both
- Whole stories in parallel: US1 (`dice_roller`), US2 and US3 (`sheet_manager`, different files), US4 (config and types)
- T029 in parallel with T028; T034 in parallel with T033; T036 and T037 in Polish

## Parallel Example: across stories

```bash
# Different modules and different files — safe to run at the same time:
Task: "US1 — lazy renderer in src/dice_roller/dice-logic/roll-orchestrator.ts"
Task: "US2 — searchable select in src/sheet_manager/features/sheet/declarative/fieldControls.tsx"
Task: "US3 — clear control in src/sheet_manager/components/stat-fields/StatDot.tsx"
Task: "US4 — knip findings in knip.json and src/sheet_manager/types/"
```

## Implementation Strategy

### MVP first

1. Phase 1 (baselines) → Phase 3 (US1)
2. **Stop and validate**: no 3D chunk on load, one fetch on the first 3D roll, correct 2D result with a message when the chunk cannot be fetched
3. US1 alone is shippable and is the only entry in this batch with a product-wide effect

### Incremental delivery

1. Setup → US1 → commit (T-013 done)
2. US2 → commit (T-064 done)
3. US3 → commit (T-055 done)
4. US4 → commit (T-030 done, constitution amended)
5. Polish → `yarn verify:full` → release entry

## Notes

- `dice-logic` stays free of UI and store imports: the orchestrator sets a flag, and `Renderer3DFallbackNotice` (an `onRollResult` subscriber) raises the toast
- No persisted shape changes, so no store migration and no envelope version bump
- The `@knipignore` tag at a declaration is the only permitted exemption; broad ignore patterns are not added to silence a finding
- No dependency is removed to satisfy the gate without human review
- T041 (US1) and T042 (US2) were added after the consistency analysis, so their ids sit out of numeric order inside their phases; ids are never renumbered
