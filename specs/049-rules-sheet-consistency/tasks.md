# Tasks: Rules and sheet consistency

**Input**: [spec.md](spec.md), [design.md](design.md)

## User Story 1 - Star Wars resources (P1)

- [ ] T001 [US1] Add resource regressions in `tests/sheet_manager/star-wars-resources.test.tsx`:
      droid full/brief resources without Force Skills, Willpower max rating, no Virtue minima, no
      opening writes, independent Force Point capacity.
- [ ] T002 [US1] Update `src/sheet_manager/systems/star-wars-wod/templates/character.ts` resource
      controls using existing max-part presentation; preserve ids and stored values.
- [ ] T003 [US1] Add `specs/049-rules-sheet-consistency/help-review.md` amendments for droid
      resources; extend `tests/docs/help-links-review.test.ts` to merge explicit amendments without
      weakening existing rules.
- [ ] T004 [US1] Update resource guidance in `.agents/skills/sheet-manager/SKILL.md`,
      `.agents/skills/sheet-templates/references/bindings.md`, `src/sheet_manager/AGENTS.md` and
      affected EN/RU Star Wars resource prose; refresh affected shipped template baselines.
- [ ] T005 [US1] Run targeted resource/help tests and `yarn verify:fast`; commit US1 and its checked
      tasks.

## User Story 2 - Classic injuries and migration (P1)

- [ ] T006 [US2] Add tests in `tests/sheet_manager/systems/wod2e/engine.test.tsx`, a new
      `wod2e-migration.test.ts`, and Star Wars parity tests: classic penalties/marks, specialty
      eligibility and unchanged conversion behavior.
- [ ] T007 [US2] Separate classic vs conversion rules in
      `src/sheet_manager/systems/wod2e/ruleset/schema.ts`, `profile.ts`, `bindings.ts` and
      `src/sheet_manager/systems/star-wars-wod/profile.ts`, `documentBindings.ts`,
      `entityBindings.ts`; add a setting-owned rules file if needed.
- [ ] T008 [US2] Implement engine-only v2 migration and bounded original mark backup in
      `src/sheet_manager/systems/wod2e/ruleset/schema.ts`, a dedicated `migration.ts`, and
      `src/sheet_manager/systems/wod2e/index.ts`; add classic trait dice rules at their engine
      owner.
- [ ] T009 [US2] Thread optional flag subsets through
      `src/sheet_manager/systems/templateBindings.ts`,
      `src/sheet_manager/components/stat-fields/TraitRow.tsx` and the existing declarative
      trait/list controls; classic bindings show only the supported flag, stored flags remain.
- [ ] T010 [US2] Test migrated-record persistence through
      `tests/sheet_manager/record-writer.test.ts`; update
      `src/sheet_manager/store/documentContent.ts` so version migrations reach the existing writer.
- [ ] T011 [US2] Add optional migration-notice metadata in `src/sheet_manager/systems/types.ts`, a
      neutral `features/sheet/shell/useMigrationNotice.ts`, and workspace wiring; add bounded
      acknowledgment/diagnostic tests and canonical EN/RU messages.
- [ ] T012 [US2] Correct classic rules prose in `docs/wod-2e/rules/condition.mdx`, `traits.mdx`,
      `equipment.mdx` and Russian mirrors; document recovery originals and the edition split in the
      owning skills/module guidance.
- [ ] T013 [US2] Run migration/engine/persistence/notice tests and `yarn verify`; commit US2 and its
      checked tasks.

## User Story 3 - Terminology and records (P2)

- [ ] T014 [US3] Reconcile complete droid memory categories in
      `docs/star-wars-wod-2e/character/droids-cyborgs.mdx` and its Russian mirror with
      `systems/star-wars-wod/profile.ts`; audit supported Force-derived examples in
      `character/force.mdx` and its mirror.
- [ ] T015 [US3] Correct per-member Health and shortened variants in
      `docs/star-wars-wod-2e/gm/building-encounters.mdx`, `creatures/mechanics.mdx` and Russian
      mirrors; retain the existing per-member model.
- [ ] T016 [US3] Align vehicle overview and independent system-list help in
      `docs/star-wars-wod-2e/vehicles-mechanisms/traits-systems.mdx`, `docs/guide/sheet.mdx` and
      Russian mirrors; preserve independent records.
- [ ] T017 [US3] Rename ambiguous WoD-family headings in `systems/wod2e/ruleset/templateParts.ts`,
      `systems/wod2e/templates.ts`, `systems/star-wars-wod/templates/character.ts` and canonical
      `translations/source/{en,ru}/ui/sheet/` files; preserve V5's single Skills group, node ids and
      coordinates.
- [ ] T018 [US3] Rename hunter Creed notes and its actual-content card in
      `translations/source/{en,ru}/ui/sheet/v5Hunter.yaml`, hunter full-sheet declarations and
      affected hunter tutorials/reference pages; preserve `creedFields` and stored text.
- [ ] T019 [US3] Validate mortal narrative scope and canonical glossary usage in
      `docs/wod-v5/rules/convictions-touchstones.mdx`, mortal pages and Russian mirrors; fix only
      actual inconsistencies.
- [ ] T020 [US3] Run `yarn validate:data`, `yarn validate:i18n`, targeted composition/layout/docs
      tests and `yarn verify:fast`; commit US3 and its checked tasks.

## User Story 4 - Action help and rendered verification (P2)

- [ ] T021 [US4] Add no-action, no-write, disabled and row-help regressions in
      `tests/sheet_manager/button-ui.test.tsx`, editor tests in
      `tests/sheet_manager/template-editor/button-settings.test.tsx` and a browser regression under
      `tests-e2e/smoke/`.
- [ ] T022 [US4] Add optional `docsPath` to the shared button shape in
      `src/sheet_manager/types/template.ts`; expose the existing Documentation link control for
      page/row actions in `features/template-editor/panels/ButtonSettings.tsx` and
      `settings/registry.ts`; include link validation in
      `features/sheet/data/templateReferences.ts`, correct draft-setting locations and schema round
      trips.
- [ ] T023 [US4] Render sibling `DocsPreviewLink` using the row-aware action name in
      `features/sheet/declarative/SheetButton.tsx`; keep help enabled independently of the action
      and avoid editor/row activation.
- [ ] T024 [US4] Add Rouse/Remorse help paths in `systems/v5/modules/vampire/templates/mechanics.ts`
      and paired explicit anchors in EN/RU `hunger-rouse.mdx`, `humanity-stains.mdx`; extend
      `help-review.md` and its contract test to inventory row actions.
- [ ] T025 [US4] Add page/row button-help examples in `src/sheet_manager/storybook/stories.ts`,
      required variants and editor parity coverage; update
      `.agents/skills/sheet-templates/references/node-tree.md`, `editor.md`, and EN/RU
      `docs/guide/template-editor/elements.mdx`.
- [ ] T026 [US4] Refresh affected template baselines, run targeted button/settings/help/storybook
      tests and `yarn verify:full`; commit US4 and its checked tasks.

## Finish

- [ ] T027 Confirm every FR/SC against delivered tests/walk evidence in
      `specs/049-rules-sheet-consistency/design.md`; update current guidance, mark superseded spec
      portions historically, and complete T-132 in `TODO.md` only when all eleven subjects are
      verified.
- [ ] T028 Run `yarn verify:full` after final edits and perform the manual walk from `design.md`;
      record exact commands, exit codes, browser matrix and any limitations in `design.md`. Do not
      bump versions, merge or push without a new release instruction for this work.
