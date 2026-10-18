# Tasks: Shipped Sheet Composition Fixes

**Input**: [spec.md](spec.md), [design.md](design.md)

## Foundation

- [ ] T001 Measure the full-sheet heights at 375 and 1280 px on the built site before any change
      (Star Wars character, droid, creature, vehicle, fodder group, WoD 2e character, V5 vampire);
      record them under "Implementation notes" in `specs/042-sheet-composition-fixes/design.md` (the
      reference of SC-003)
- [ ] T002 Capture, for each of the seven full sheets today, the value keys and bindings it binds
      plus every formula expression (`formula`, `minFrom`, `maxMinFrom`) and button roll by node id
      into `tests/sheet_manager/fixtures/sheet-bindings-042.json`, generated once from the current
      trees; it is the FR-002/SC-002 reference. Copy today's `full-sheet` tree into
      `tests/sheet_manager/fixtures/full-sheet-041.json` for the override test

## User Story 1 - Star Wars, droid, and WoD 2e characters share one layout (P1)

**Check**: the three full sheets pass the composition rule, list the same sections in the same order
apart from Force, and bind every value they bound before.

- [ ] T003 [US1] Tests first: `tests/sheet_manager/shipped-sheet-layout.test.ts` (new) — section
      titles of `full-sheet`, `droid-sheet`, and `wod2e-sheet` equal Base, Condition, Attributes,
      Skills, (Force), Advantages, Equipment, Experience and Notes; every sheet listed in the
      binding check binds exactly the value keys, bindings, formulas, and rolls of
      `sheet-bindings-042.json` (the check starts with the three sheets of this story; later stories
      add theirs); remove `droid-sheet` and `wod2e-sheet` from `KNOWN_EXCEPTIONS` in
      `tests/sheet_manager/page-composition.test.ts`
- [ ] T003a [US1] Test first: `tests/sheet_manager/shipped-sheet-overrides.test.ts` (new) — the
      saved `full-sheet-041.json` tree, stored as an edit of `full-sheet`, parses and renders every
      value of a filled character (FR-007)
- [ ] T004 [US1] Shared builders in `src/sheet_manager/systems/wod2e/ruleset/templateParts.ts`:
      `conditionSection` (card `condition-vitals` "Health and Willpower": health or damage track,
      Willpower, optional Initiative and extra resources; card Virtues), `equipmentSection` (id
      `body`, title Equipment, inventory title, implants optional, folding as today),
      `experienceNotesSection` (id `other`, Experience and Notes); options carry what differs by
      kind (track binding, title, tracker total, docs paths, Willpower pool tracker); existing parts
      the briefs call (`virtuesGroup`, `resourcesGroup`, …) keep their signatures (design D0)
- [ ] T005 [US1] Star Wars character and droid in
      `src/sheet_manager/systems/star-wars-wod/templates/character.ts`: order Base, Condition,
      Attributes, Skills, Force (SW only: Force Skills, Force Powers, Force-derived stats
      `derived-stats` with saber initiative, jumping, running), Advantages, Equipment, Experience
      and Notes; Initiative (Std), Force Points, and Dark Side Resistance in `condition-vitals`;
      remove the droid "Resources" section; brief builders untouched (keep `resourcesGroup` and
      `virtuesGroup` callers of the brief working)
- [ ] T006 [US1] WoD 2e character in `src/sheet_manager/systems/wod2e/templates.ts`: same shared
      sections, Initiative in `condition-vitals`, no Derived Stats card; brief untouched
- [ ] T007 [US1] Titles: `LABEL_MESSAGES` in `character.ts` and the WoD 2e title mapping for
      Condition, Health and Willpower, Force-derived stats, Equipment, Experience and Notes; keys in
      `translations/source/en/ui/sheet/templates.yaml` and
      `translations/source/ru/ui/sheet/templates.yaml` (`defaults`), reusing existing keys where the
      text exists
- [ ] T008 [US1] Fixtures: regenerate only the `templates` part of
      `tests/sheet_manager/fixtures/star-wars-parity.json` (documents, defaults, dice pools must
      stay byte-equal) and the zod-baseline snapshot
      `tests/sheet_manager/fixtures/zod-baseline/shipped-templates.json`; check its diff touches
      only `full-sheet`, `droid-sheet`, and `wod2e-sheet`; update tests that find moved cards by id
      (`default-templates`, `shipped-parity`, system tests) without weakening them
- [ ] T009 [US1] Run `yarn verify` and commit the story

## User Story 2 - Creatures, vehicles, and fodder groups are made of cards (P2)

**Check**: the three sheets pass the composition rule and bind every value they bound before.

- [ ] T010 [US2] Tests first: remove `creature-sheet`, `vehicle-sheet`, and `fodder-sheet` from
      `KNOWN_EXCEPTIONS` and add them to the binding check of
      `tests/sheet_manager/shipped-sheet-layout.test.ts`
- [ ] T011 [US2] Creature in `src/sheet_manager/systems/star-wars-wod/templates/creature.ts`:
      Identity → Condition (card `creature-resolve` "Health and Resolve": track, Willpower, both
      soaks) → Attributes → Abilities, Merits & Flaws (cards `creature-abilities`, Merits, Flaws) →
      Combat (Armor, Attacks) → Details (card `creature-details`: description, source, notes); brief
      untouched
- [ ] T012 [US2] Vehicle in `src/sheet_manager/systems/star-wars-wod/templates/vehicle.ts`:
      Modifications & quirks card (`vehicle-modifications-group`) in Systems; Combat section
      (`combat`) with Weapons (`vehicle-weapons`) and Damage (`vehicle-damage`) cards; Details card
      (`vehicle-details`); brief untouched
- [ ] T013 [US2] Fodder group in `src/sheet_manager/systems/star-wars-wod/templates/fodder.ts`:
      Group card (concept, leader, notes) → Members card (`fodder-members`: track, Willpower, both
      quick pools) → Attributes with the Abilities card → Combat; brief untouched
- [ ] T014 [US2] Titles for Health and Resolve, Abilities, Merits & Flaws, Combat, Details, Members,
      Modifications & quirks (mapping + `templates.yaml` en/ru); regenerate the zod-baseline
      snapshot and check its diff touches only the three full sheets
- [ ] T015 [US2] Run `yarn verify` and commit the story

## User Story 3 - The vampire's predator text has a proper home (P3)

**Check**: the vampire full sheet passes; the predator grants show under the predator type.

- [ ] T016 [US3] Tests first: remove `v5-vampire-sheet` from `KNOWN_EXCEPTIONS`; add the vampire to
      the binding check
- [ ] T017 [US3] `src/sheet_manager/systems/v5/modules/vampire/templates/sheet.ts`: the predator
      grants field joins the Identity card right after the predator type field; the `predator` card
      goes; regenerate the zod-baseline snapshot (diff: `v5-vampire-sheet` only)
- [ ] T018 [US3] Run the targeted tests (vampire, composition, zod-baseline) and commit the story

## User Story 4 - The rule holds for every shipped full sheet (P3)

- [ ] T019 [US4] `tests/sheet_manager/page-composition.test.ts`: delete `KNOWN_EXCEPTIONS` (now
      empty) so every shipped full sheet must pass outright (FR-008, SC-001)

## Finish

- [ ] T020 Heights: measure the seven full sheets after the change; check none is more than 10%
      taller than T001 (SC-003); add `SHEET_PINS` (all seven, the vampire included) to
      `tests-e2e/smoke/brief-baseline.ts` and make the "keeps its height" check of
      `tests-e2e/smoke/brief-layout.spec.ts` run over `SHEET_PINS` and the unchanged `BASELINE`
      kinds (FR-009); `BRIEF_PINS` unchanged (SC-004)
- [ ] T021 Docs: `docs/star-wars-wod-2e/character/reading-sheet.mdx` (layout map and section
      headings) and `docs/star-wars-wod-2e/equipment.mdx` ("Body section" → Equipment) with their ru
      mirrors under `i18n/ru/docusaurus-plugin-content-docs/current/`; the `sheet-templates` skill's
      composition section drops the known exceptions; `TODO.md` T-126 marked done
- [ ] T022 Commit T019–T021 with the design notes, run `yarn verify:full`, walk the steps in
      design.md "Manual walk" (FR-007 by step 4), record the results in design.md, and commit

## Coverage

| Requirement | Tasks                                       |
| ----------- | ------------------------------------------- |
| FR-001      | T003, T010, T016, T019                      |
| FR-002      | T002, T003, T010, T016                      |
| FR-003      | T005, T006, T011–T013, T017                 |
| FR-004      | T002 binding check (no new value key bound) |
| FR-005      | T008, T014, T017 (snapshot diff), T020      |
| FR-006      | T004, T011–T013 (fold settings), T022 walk  |
| FR-007      | T003a, T022 (manual walk step 4)            |
| FR-008      | T019, T021                                  |
| FR-009      | T020                                        |
| FR-010      | T007, T014                                  |
| FR-011      | T003, T004                                  |
| SC-001      | T019                                        |
| SC-002      | T002, T003, T010, T016                      |
| SC-003      | T001, T020                                  |
| SC-004      | T020 (`BRIEF_PINS` in the browser checks)   |
