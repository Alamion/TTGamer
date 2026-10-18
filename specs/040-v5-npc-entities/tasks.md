# Tasks: V5 Storyteller Characters and Groups

**Input**: [spec.md](spec.md), [design.md](design.md)

## Foundation

- [x] T001 Add the Storyteller and group strings (fields, types, sections, views, tracking switch,
      member-of, difficulty roll) to `translations/source/en/ui/sheet/v5.yaml` and
      `translations/source/ru/ui/sheet/v5.yaml`, the example labels to `ui/sheet/documents.yaml`
      (en + ru), and run `yarn build:translations`
- [x] T002 Extend `ListBinding` with `maximum?` (default 5) and `ListCatalogSupport` with
      `catalogIds?` in `src/sheet_manager/systems/templateBindings.ts`, honored by the trait list in
      `src/sheet_manager/features/sheet/declarative/primitives.tsx`; tests in
      `tests/sheet_manager/system-list-options.test.tsx` (a 0–15 list, suggestions from two
      catalogs, a custom name kept) and a storybook variant in
      `docs/dev/storybook/built-in-parts.mdx`

## User Story 1 - A Storyteller character on one compact sheet (P1)

**Check**: create "Detective Ruiz" (3/5/4, Health 5, Willpower 5, Investigation 7, Firearms 5) and
open its brief beside a vampire at 400 px with no sideways scrolling.

- [x] T003 [US1] Write `tests/sheet_manager/systems/v5/storyteller.test.ts`: schema defaults,
      clamped pools (0–15), track lengths 1–15, type enum, difficulty 0–5, bindings resolve,
      `v5-skills` catalog names in en and ru
- [x] T004 [US1] Add `V5StorytellerSchema` and its default in
      `src/sheet_manager/systems/v5/core/storyteller.ts` and the `v5-skills` catalog from
      `V5_SKILL_GROUPS` in `src/sheet_manager/systems/v5/ruleset/catalogs.ts` (D3)
- [x] T005 [US1] Add the Storyteller bindings in `src/sheet_manager/systems/v5/core/bindings.ts`:
      pool traits (map `pools`, 0–15, D2), `health-max`/`willpower-max` fields and tracks with that
      length (D4), `difficulty`, `exceptional` (maximum 15, `v5-skills`) and `powers` (catalogs
      `v5-vampire-disciplines`, `v5-hunter-edges`) lists (D3), identity fields with `syncsTitle` on
      the name, portrait, notes
- [x] T006 [US1] Write the full page and brief in `src/sheet_manager/systems/v5/core/templates.ts`
      from `ruleset/templateParts.ts`; pools as number ratings over the bridged coordinates (extend
      the trait primitive with `presentation` if it ignores it, D2, then also offer it in the
      template editor and add a storybook variant in `docs/dev/storybook/template-elements.mdx`)
- [x] T007 [US1] Register `v5StorytellerDefinition` (kind `storyteller`, no module, in
      `coreDefinitions`) in `src/sheet_manager/systems/v5/core/definition.ts` and
      `src/sheet_manager/systems/v5/index.ts` (D1)
- [x] T008 [US1] Write `tests/sheet_manager/systems/v5/storyteller-sheet.test.tsx`: both pages
      render with the Dark Pack badge, the kind is offered by the create dialog under V5 and in a
      user setting on V5, found by «рассказчик»; extend `tests-e2e/smoke/brief-layout.spec.ts` with
      the Storyteller brief at 400 px and 360 px
- [x] T009 [US1] Run `yarn verify` (new schema) and commit the story

## User Story 2 - Roll an NPC's pools from its sheet (P1)

**Check**: on "Detective Ruiz" click Firearms 5; five V5 dice roll and the result names him.

- [x] T010 [US2] Extend `storyteller-sheet.test.tsx`: standard and exceptional pools roll that many
      dice and name the document, no Hunger or Desperation dice, the difficulty button rolls 2 ×
      difficulty and is hidden at 0
- [x] T011 [US2] Add the "Roll 2×N" button (spec 038 button, notation built from `difficulty`,
      `availableWhen` difficulty > 0) to the Storyteller pages in `core/templates.ts`; wire any
      missing roll path the test finds (D5)
- [x] T012 [US2] Run the targeted tests and commit the story

## User Story 3 - Groups and who belongs to them (P2)

**Check**: group "Church of the Red Dawn" with two Storyteller characters and a vampire; each
member's brief lists the church; following a link opens the member.

- [ ] T013 [US3] Extend `tests/sheet_manager/reference-scope.test.ts`: a ruleset-level V5 page
      offers mortal, storyteller, group, hunter, and vampire; Hunter and Vampire pages and user
      settings keep today's targets
- [ ] T014 [US3] Change `scopedKinds` in `src/sheet_manager/features/sheet/data/referenceScope.ts`
      so a ruleset-level page (no module, no user setting) offers every kind of the ruleset (D6)
- [ ] T015 [US3] Write `tests/sheet_manager/linked-from.test.ts`: documents of the given kinds found
      through index entries and loaded by id, same system and setting only, a link under a renamed
      key still found, bound of 200 with `linked-from-truncated`; and
      `tests/sheet_manager/linked-from.perf.test.ts`: 50 groups, 30 members, under 200 ms (SC-004)
- [ ] T016 [US3] Implement `src/sheet_manager/features/documents/linkedFrom.ts` and the report code
      in `src/sheet_manager/diagnostics.ts` (D7)
- [ ] T017 [US3] Add `V5GroupSchema`, `v5GroupDefinition` (kind and id `v5-group`, in
      `coreDefinitions`), and its full page and brief (kind of group, description, goals, resources,
      threat 1–5, notes, `members` reference field over every V5 kind, the group itself left out of
      its choices) in `src/sheet_manager/systems/v5/core/group.ts` and `core/templates.ts` (D1, D6)
- [ ] T018 [US3] Add `incoming` to `ReferenceFieldSchema` in `src/sheet_manager/types/template.ts`,
      render it read-only through `linkedFrom` in
      `src/sheet_manager/features/sheet/declarative/fieldControls.tsx`, offer it in the reference
      field's editor settings, add a storybook variant in
      `docs/dev/storybook/template-elements.mdx`, and place a "Member of" incoming field (target
      `v5-group`) on the Storyteller, mortal, hunter, and vampire briefs and full pages (D7)
- [ ] T019 [US3] Write `tests/sheet_manager/systems/v5/group.test.tsx`: members across kinds, the
      group not offered as its own member, a deleted member shows as gone and is removable, two
      groups listed on one member, a group inside a group, an incoming reference field built in the
      template editor works; add the group brief at 400 px to the brief smoke test
- [ ] T020 [US3] Run `yarn verify` and commit the story

## User Story 4 - Vampires and hunters met as antagonists (P2)

**Check**: vampire "The Sheriff" with Hunger 3: tracking off hides Hunger and Willpower and rolls
have no Hunger dice; on again shows Hunger 3.

- [ ] T021 [US4] Write `tests/sheet_manager/systems/v5/tracking-switch.test.tsx`: Hunger dice 0 when
      off, trackers hidden on both pages, stored values kept; hunter Willpower hidden and
      Desperation unaffected; old documents read with tracking on
- [ ] T022 [US4] Add one `trackResources` (default true) to
      `src/sheet_manager/systems/v5/modules/vampire/schema.ts` and `modules/hunter/schema.ts`, read
      it in `modules/vampire/dice.ts`, a toggle binding "Track Hunger and Willpower", and `showWhen`
      on the Hunger, Rouse, and Willpower blocks (hunter: Willpower) of the four pages (D8)
- [ ] T023 [US4] Run `yarn verify` (schema change) and commit the story

## User Story 5 - Examples and documentation for Storytellers (P3)

**Check**: on the Storyteller page copy the example cult; the cult and its members appear and link
to each other.

- [ ] T024 [US5] Extend `tests/sheet_manager/create-from-choice.test.ts`: a group example copies its
      member examples and points the copy's `members` at the new ids; the copies export and import
      back without errors (FR-010); extend the docs create-button guard
- [ ] T025 [US5] Add `DocumentExample.companions?` in `src/sheet_manager/systems/types.ts` and the
      companion copy in `src/sheet_manager/features/documents/createFromChoice.ts` (D9)
- [ ] T026 [US5] Write the own-words examples (detective, ghoul retainer, guard dogs, wolf-thing,
      Sheriff vampire, cult) in `src/sheet_manager/systems/v5/core/examples.ts` and attach them to
      the definitions; examples parse in `storyteller.test.ts`
- [ ] T027 [US5] Write `docs/wod-v5/rules/storyteller-characters.mdx` and
      `docs/wod-v5/rules/groups.mdx` with embeds and copy buttons, link them from the Hunter and
      Vampire indexes, mirror them under `i18n/ru/docusaurus-plugin-content-docs/current/wod-v5/`,
      and add the glossary terms to `translations/glossary/v5.yaml` (D10)
- [ ] T028 [US5] Run the targeted tests, `yarn validate:i18n`, and `yarn verify:full` (new docs
      paths), and commit the story

## Finish

- [ ] T029 Update `src/sheet_manager/AGENTS.md` (V5 core kinds, linked-from, tracking switch), the
      `sheet-templates` skill (`references/bindings.md`: list `maximum`, `catalogIds`;
      `references/node-tree.md`: incoming references; reference scope of ruleset-level pages), and
      the `mdx-documentation` skill (Storyteller pages); update the template editor guide's
      `docs/guide/template-editor/elements.mdx` "Document references" (incoming references;
      ruleset-level pages reach module kinds) and `docs/guide/sheet.mdx`, with their Russian
      mirrors; mark T-040 done in `TODO.md` and add the crowd document as a new backlog entry
- [ ] T030 Run `yarn verify:full`; measure the sheet page bundle against `testing` (SC-005, ≤ 10 KB
      gzip); walk the steps in design.md "Manual walk" (SC-001); record the results in design.md

## Coverage

| Requirement                  | Tasks                  |
| ---------------------------- | ---------------------- |
| FR-001 Storyteller character | T003–T007              |
| FR-002 Group                 | T017, T019             |
| FR-003 full page and brief   | T006, T017             |
| FR-004 rolls, difficulty     | T010, T011             |
| FR-005 no Hunger/Desperation | T010                   |
| FR-006 member-of, gone rows  | T015–T019              |
| FR-007 tracking switch       | T021, T022             |
| FR-008 create dialog, search | T007, T008, T017       |
| FR-009 examples, companions  | T024–T026              |
| FR-010 validation, clamping  | T003, T004, T022, T024 |
| FR-011 en + ru               | T001, T027, T028       |
| FR-012 own words             | T026, T027             |
| FR-013 Dark Pack badge       | T008                   |
| FR-014 suggestions + text    | T002, T005             |
| SC-001 two minutes           | T030 (walk)            |
| SC-002 one-click rolls       | T010                   |
| SC-003 briefs at 400/360 px  | T008, T019             |
| SC-004 30 members < 200 ms   | T015                   |
| SC-005 bundle                | T030                   |
