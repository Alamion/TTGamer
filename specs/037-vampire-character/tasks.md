# Tasks: Vampire: the Masquerade 5e Player Character

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order follows design.md "Approach". Paths are under `src/sheet_manager/` unless they start
with `src/dice_roller/`, `src/integrations/`, `translations/`, `tests/`, `tests-e2e/`, or `docs/`;
the module is `systems/v5/modules/vampire/` (written `vampire/` below) and its tests
`tests/sheet_manager/systems/v5/`. Catalog names and summaries are written from the books in
`context/corebooks/wod/` (design "Approach" lists the pages) in the project's own words, English and
Russian together; Russian terms follow the glossary. Generic additions (design D2–D7) stay free of
system names and each gets a storybook story with a `REQUIRED_VARIANTS` tag.

## User Story 1 - Create and keep a vampire (P1)

**Check**: create a vampire, fill every section (clan, predator type, disciplines with powers,
rituals, Humanity with stains), reload, export, import on a clean profile; every value comes back,
the file carries the Dark Pack notice, hunters and mortals are unchanged.

- [ ] T001 [US1] Write `tests/sheet_manager/systems/v5/vampire-schema.test.ts`: defaults (Hunger 1,
      Humanity 7, Blood Potency 1, generation 13, no disciplines), every limit of design "Changed
      types", stains + Humanity never above 10, thin-blood values kept (D8), unknown keys stripped,
      round trip through `serializeDocumentExport` and `parseDocument`
- [ ] T002 [US1] Create `vampire/schema.ts` (`VampireModuleShape`, `VampireSchema` = `V5CoreShape` +
      module shape, `createVampireDefault`, `VAMPIRE_LIMITS`) and `vampire/definition.ts`
      (definition `vampire`, kind `character`, schema version 1, views `v5-vampire-sheet` and
      `v5-vampire-brief`, module `{ id: 'vampire', policies: ['dark-pack'] }`)
- [ ] T003 [US1] Add `translations/source/{en,ru}/ui/sheet/v5Vampire.yaml` (module, views, field and
      section labels, bane variant names, marks, messages) and
      `translations/glossary/v5-vampire.yaml` (clans, disciplines, Hunger, Rouse, Blood Potency,
      bane, compulsion, stains, predator type); run `yarn build:translations`
- [ ] T004 [US1] Write `vampire/catalogs.ts` with `defineCatalog` for `v5-vampire-clans` (summary,
      bane, variant bane, compulsion, in-clan disciplines), `v5-vampire-disciplines`,
      `v5-vampire-powers` (discipline parent, level, Rouse cost, amalgam, summary),
      `v5-vampire-rituals` (discipline parent: Blood Sorcery, Oblivion, Thin-Blood Alchemy; level,
      summary), `v5-vampire-predator-types` (summary, grants); add the catalog names to
      `translations/source/{en,ru}/ui/sheet/catalogNames.yaml`
- [ ] T005 [US1] Fill `vampire/catalogEntries.ts` and `translations/source/{en,ru}/data/` for clans
      (core + Players Guide + the free supplement: 16 with Caitiff and thin-bloods, both banes,
      compulsion), disciplines (12), and predator types (core + Players Guide: 16)
- [ ] T006 [US1] Fill the powers of Animalism, Auspex, Celerity, Dominate, Fortitude, and Obfuscate
      (core + Players Guide) in `vampire/catalogEntries.ts` and the `data/` YAML
- [ ] T007 [US1] Fill the powers of Potence, Presence, Protean, Blood Sorcery, Oblivion, and
      Thin-Blood Alchemy, then the rituals, ceremonies, and formulas (core, Players Guide, Cults of
      the Blood Gods); run `yarn validate:data` and `yarn i18n:status` (no missing entries)
- [ ] T008 [US1] Write `tests/sheet_manager/rows-catalog-limit.test.tsx`: with
      `RowsCatalogParent.limit`, suggestions stop at the parent entry's value, a stored row above it
      is kept and marked, a parent typed freely does not narrow (D3)
- [ ] T009 [US1] Add `limit` to `RowsCatalogParent` in `systems/templateBindings.ts`; filter
      suggestions and mark rows in `features/sheet/declarative/RowsBody.tsx` (and its suggestion
      helper); let `namedBy` read list entries (`name`) as well as rows
- [ ] T010 [US1] Write `tests/sheet_manager/field-binding-fallback.test.tsx`: `readOnly` renders no
      input and reaches formulas when numeric; `fallback` shows the muted catalog text while empty,
      typing stores own text, clearing returns to the fallback, the fallback follows the locale (D4,
      D5)
- [ ] T011 [US1] Add `readOnly` and `fallback(data, locale)` to `FieldBinding`; render them in
      `features/sheet/declarative/primitives.tsx` / `fieldControls.tsx`; formulas read the
      `adapter.read` value of numeric read-only fields
- [ ] T012 [US1] Write `tests/sheet_manager/score-track.test.tsx`: `TrackBinding.score` shows
      `value` filled boxes and `stains` slashed from the end, a click sets the score, a stain on a
      filled box is refused with a message, numeric coordinates `humanity` and `stains` (D7)
- [ ] T013 [US1] Add `score` to `TrackBinding`; render it with the `ConditionTrack` strip in
      `features/sheet/declarative/primitives.tsx`
- [ ] T014 [US1] Create `vampire/bindings.ts`: identity fields (clan, predator type with catalog
      suggestions; generation 4–16; sire, chronicle, concept, ambition, desire), Hunger and Blood
      Potency ratings, bane variant enum, bane and compulsion with `fallback` from the clan catalog,
      predator grants read-only with `fallback`, Humanity score track, `disciplines` list with
      catalog, `powers` and `rituals` rows with the disciplines parent and `limit`; ruleset bindings
      from `buildV5CoreBindings`
- [ ] T015 [US1] Write `vampire/templates/sheet.ts` (`v5-vampire-sheet`: vampire, beliefs with
      convictions and touchstones, condition with Hunger, Humanity, Health, Willpower, attributes,
      skills, disciplines with powers and rituals, advantages and flaws, equipment, experience,
      notes) from `systems/v5/ruleset/templateParts.ts`; rituals shown only with Blood Sorcery,
      Oblivion, or Thin-Blood Alchemy dots (`visibleWhen` on read-only dot coordinates)
- [ ] T016 [US1] Register the definition, template, bindings, and catalogs in `systems/v5/index.ts`;
      add a `vampire` row to the sheet coverage list
- [ ] T017 [US1] Write `tests/sheet_manager/systems/v5/vampire-sheet.test.tsx`: the full sheet
      renders without issues; clan → bane and compulsion; variant switch; own text survives a clan
      change; predator grants shown and nothing else changes; power suggestions follow the
      discipline and dots; the rituals block appears with Blood Sorcery; Dark Pack badge shown and
      exports carry the notice; `boundaries.test.tsx` and `document-system.test.ts` still pass
- [ ] T018 [US1] Run `yarn verify` (schema and store change, AGENTS.md §11) and commit the story

## User Story 2 - Roll with Hunger (P1)

**Check**: Hunger 2, roll a pool of 5 from the sheet → 3 regular and 2 Hunger dice, read as Hunger.

- [ ] T019 [US2] Write `tests/dice_roller/logic/notation-special-dice.test.ts`: `withSpecialDice`
      splits `5d10>=6` by 2, caps at the pool size, keeps a notation with labelled dice, returns
      `null` for a non-pool, leaves 0 untouched
- [ ] T020 [US2] Add `withSpecialDice` to `src/dice_roller/dice-logic/notation-utils.ts`
- [ ] T021 [US2] Extend `tests/integrations/roll-reading.test.ts`: a vampire source with
      `specialDice: 2` gets Hunger dice, hunters and mortals get none, a panel roll without a source
      is unchanged, the header's pending roll follows the shown vampire
- [ ] T022 [US2] Add `specialDice` to `RollSource` (`src/dice_roller/utils/rollReader.ts`),
      `RollReadingRules.specialDice` and the `prepare` option (`systems/types.ts`), `replaces` on
      `V5DiceLine` (`systems/v5/ruleset/dice.ts`), `hungerDiceLine` for `vampire`
      (`vampire/dice.ts`, moved from `modules/vampire/dice.ts`), and the call in
      `src/integrations/roll-reading/index.ts`
- [ ] T023 [US2] Read `specialDice` in `useDocumentRollSource` (`hooks/useDocumentSource.ts`) and
      `shownDocument` (`src/integrations/sheet-dice/shownDocument.ts`); add a sheet test to
      `vampire-sheet.test.tsx` (Hunger 2, roll Dexterity → notation with `:h` dice)
- [ ] T024 [US2] Run `yarn verify` (dice evaluator path, AGENTS.md §11) and commit the story

## User Story 3 - Rouse checks and Blood Potency at a glance (P2)

**Check**: at Hunger 3 a failed Rouse raises Hunger to 4; BP 1 → 3 changes the shown effects.

- [ ] T025 [US3] Write `tests/sheet_manager/systems/v5/vampire-blood-potency.test.ts`: effects for
      Blood Potency 0–10 and the Blood Potency range per generation (core pp. 214–221)
- [ ] T026 [US3] Create `vampire/bloodPotency.ts` and the read-only effect bindings; add a Blood
      Potency group to the full sheet
- [ ] T027 [US3] Write `tests/dice_roller/store/roll-result.test.ts`: `roll` resolves with the final
      `RollResult`, and with `null` when a 3D roll is cancelled
- [ ] T028 [US3] Make `diceRollerStore.roll` return `Promise<RollResult | null>`
      (`src/dice_roller/store/diceRollerStore.ts`); keep existing callers unchanged
- [ ] T029 [US3] Write `tests/sheet_manager/systems/v5/vampire-rouse.test.tsx`: Rouse raises Hunger
      on a failure, stops at 5 with the warning, a power costing 2 makes two checks, the Blood
      Potency re-roll applies only up to its level, a cancelled roll writes nothing, Rouse rolls
      carry no Hunger dice
- [ ] T030 [US3] Add `ActionBinding` and `RowsBinding.actions` to `systems/templateBindings.ts`;
      render the action button in `features/sheet/declarative/primitives.tsx` and on rows in
      `RowsBody.tsx`, rolling through `src/integrations/sheet-dice/useSheetDiceActions.ts`
      (`specialDice: 0`) and writing `apply` through `useBoundDocument`; editor sources list actions
      (`template-editor` source groups)
- [ ] T031 [US3] Declare the Rouse actions in `vampire/bindings.ts` (by Hunger, per power with
      `rouse` cost and the re-roll level) and place them on the full sheet; result messages in
      `v5Vampire.yaml`
- [ ] T032 [US3] Run `yarn verify` and commit the story

## User Story 4 - A brief for play and for the layout (P2)

**Check**: a filled vampire opened beside another document fits a 400 px pane and a 375 px phone.

- [ ] T033 [US4] Write `vampire/templates/brief.ts` (`v5-vampire-brief`: name, clan, generation,
      predator type, Hunger, Humanity, Blood Potency, Health, Willpower, attributes, skills,
      disciplines with dots; `layout: 'area'`, `shortForm`) and register it
- [ ] T034 [US4] Add the vampire to `tests/sheet_manager/systems/v5/brief-template.test.tsx` and to
      the kinds of `tests-e2e/smoke/brief-layout.spec.ts` (height limits of spec 033); check that a
      die in the brief rolls with Hunger
- [ ] T035 [US4] Run the targeted tests and `yarn ci:e2e` (route/template change, AGENTS.md §11) and
      commit the story

## User Story 5 - Library, editor, and catalogs (P3)

**Check**: copy the shipped vampire page, move the Hunger block, save; the sheet keeps every value
and still rolls Hunger; catalogs appear read-only in the library.

- [ ] T036 [US5] Write `vampire/example.ts` (an invented fledgling, our own name and story) and add
      it as the definition's example and to `docsEmbeds.tsx` (`vampireExampleDocument`)
- [ ] T037 [US5] Add storybook stories for the read-only and fallback fields, the rows limit, the
      action button, and the score track in `storybook/stories.ts`; tags in
      `tests/sheet_manager/storybook.test.tsx`
- [ ] T038 [US5] Extend `tests/sheet_manager/systems/v5/reskin.test.tsx` and the library tree tests:
      Vampire: the Masquerade 5e is a shipped setting with its character, pages, and five read-only
      catalogs; a copied page keeps values and Hunger rolls
- [ ] T039 [US5] Run `yarn verify` and commit the story

## Finish

- [ ] T040 Update `src/sheet_manager/AGENTS.md` (vampire module, Hunger replacement, actions),
      `.agents/skills/sheet-manager/SKILL.md` (vampire schema), `.agents/skills/sheet-templates/`
      (`references/bindings.md`: read-only, fallback, rows limit, actions, score track),
      `src/dice_roller/AGENTS.md` (special dice from the source, `roll` result)
- [ ] T041 Docs en + ru: the Dark Pack page lists vampire sheets (`docs/wod-v5/dark-pack.mdx` and
      its ru mirror); `docs/guide/sheet.mdx` and `docs/guide/template-editor/library.mdx` name the
      vampire; `docs/guide/dice-roller.mdx` says sheet rolls of a vampire add Hunger dice; run
      `yarn validate:i18n`
- [ ] T042 Mark T-039 done in `TODO.md` with the result note; add a historical banner to no earlier
      spec (none is superseded)
- [ ] T043 Run `yarn verify:full`; walk the steps in design.md "Manual walk"; record results in
      design.md

## Coverage

| Requirement | Tasks                 | Requirement | Tasks                 |
| ----------- | --------------------- | ----------- | --------------------- |
| FR-001      | T002, T016, T017      | FR-008      | T025–T026             |
| FR-002      | T002, T016, T017      | FR-009      | T001, T008–T009, T017 |
| FR-003      | T002, T014–T015       | FR-010      | T015, T033, T036–T038 |
| FR-004      | T008–T009, T014, T017 | FR-011      | T002, T017, T041      |
| FR-004a     | T004–T007             | FR-012      | T003, T005–T007, T041 |
| FR-004b     | T014–T015, T017       | FR-013      | T017, T043            |
| FR-005      | T010–T011, T014, T017 | SC-001      | T043 (manual walk)    |
| FR-005a     | T011, T014, T017      | SC-002      | T019–T023             |
| FR-006      | T019–T023             | SC-003      | T001                  |
| FR-007      | T027–T031             | SC-004      | T034                  |
|             |                       | SC-005      | T017, T043            |
