---
description: Task list for 007-entity-sheet-templates implementation
---

# Tasks: Entity Sheet Templates and Docs Embed Migration

**Input**: Design documents from `/specs/007-entity-sheet-templates/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included — spec A8 and Constitution V mandate the schema/persistence tier (`yarn verify`) for template, binding, persistence, and rendering changes; each phase pairs implementation with its tests.

**Organization**: Tasks grouped by user story (spec priorities P1–P3). All paths are repository-relative; the runtime module is `src/sheet_manager/`. R# = decision in research.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: user story label ([US1]…[US7]) from spec.md
- Verification: `yarn verify` at every checkpoint; `yarn verify:full` at the US5 and US6 checkpoints and in Polish
- Strings: add UI/label strings only in `translations/source/*.yaml` (en + ru), then `yarn build:translations`; never hand-edit generated `ttgamer.*` entries

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Green baseline and archive-safe tooling before any change

- [x] T001 Run `yarn verify` and `yarn validate:data && yarn validate:i18n`; record the passing baseline (no code edits)
- [x] T002 [P] Exclude `context/**` from tooling: add it to `exclude` in tsconfig.json, to the ignores in eslint.config.mjs, and to .prettierignore (create if missing); confirm `vitest.config.ts` include (`tests/**`) and the Docusaurus build do not pick up `context/` (R11)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Setting-neutral capabilities every entity page needs — data-lens bindings, cohort tracks, `visibleWhen`, fill semantics, reference upgrades, fallback diagnostics, template builders

**⚠️ CRITICAL**: No user story work until this phase is complete

- [x] T003 Add diagnostic codes `template-fallback`, `reference-target-missing`, `catalog-detail-out-of-range` (with typed `details`) in src/sheet_manager/diagnostics.ts per data-model.md §8
- [x] T004 Extend the template schema in src/sheet_manager/types/template.ts per data-model.md §4: optional `visibleWhen: { coordinate, equals: string|number|boolean }` on every node kind; optional `cohort: { maxMembers 1–24, lengthFrom?: coordinate }` on `primitive`; allow `select.binding.fills[*].targetFieldId` to name a sibling column id when the select is a `table` column (validate sibling existence in the table superRefine). Keep `schemaVersion` 3; existing templates must still parse
- [x] T005 [P] Extend schema tests in tests/sheet_manager/template-schema.test.ts: `visibleWhen` round-trip on section/group/field/table/list/primitive; `cohort` bounds; in-row fill target accepted for sibling column and rejected for unknown ids; a pre-feature v3 template parses unchanged (depends on T004)
- [x] T006 Add the data-lens binding descriptor kind to src/sheet_manager/systems/templateBindings.ts per data-model.md §3 (`DataLensBinding` with `path`, `shape` text|number|dots|pair|enum|list|rows|cohort-track, `options`, `numeric` reader, `cohort { membersPath, trackKey, trackId, lengthPath? }`, `rows { columns }`); pure helpers `readLens(data, binding)` and `writeLens(data, binding, value)` returning a new data object (no mutation); include lens bindings in numeric-coordinate enumeration used by formulas (`numeric` reader applied); keep existing character binding kinds untouched (R1)
- [x] T007 Route lens-bound coordinates through the document source in src/sheet_manager/features/sheet/declarative/hooks.ts: resolve binding by coordinate + `documentKind`; reads via `readLens(document.data)`; writes via `updateDocumentData(id, data => writeLens(...))` (schema re-parse; rejected writes report `template-value-write-rejected`); add a batched `applyWrites([{coordinate, value}])` that performs one data update and one templateValues update for multi-target operations (depends on T006)
- [x] T008 Render lens-bound primitives without `useCharacter()` in src/sheet_manager/features/sheet/declarative/primitives.tsx: text/number field, enum select (options with `labelMessage`), dots trait row (reuse `TraitRow`), pair resource, bound custom-ability list (reuse `CustomTraitList`), bound rows table (reuse the declarative table renderer with the binding's columns); unknown/kind-mismatched keys keep the existing `binding-unresolved` placeholder (depends on T007)
- [x] T009 Implement the cohort track primitive in src/sheet_manager/features/sheet/declarative/CohortTrack.tsx plus pure state helpers in src/sheet_manager/features/sheet/declarative/cohort.ts per data-model.md §5: letter labels (hidden for a single member), add within `maxMembers` (blocked with a translated `role="alert"` message beyond), remove with confirmation when any mark exists (existing confirmation dialog pattern), defeated state when the last visible level is marked, visible length from `lengthFrom` resolved against track variants, length shortening with confirmation + collapse rule, compact presentation reusing `CompactConditionTrack`; keyboard-operable marks with `aria-label`s; wire the `cohort-track` shape in primitives.tsx (depends on T008)
- [x] T010 [P] Write cohort tests in tests/sheet_manager/cohort-track.test.tsx: pure transitions (add/remove bounds, next letter, penalty per member, defeated, shorten collapse 7→3 keeps Incapacitated marked, lengthen keeps marks) and component behavior (confirmation on damaged removal, no letter for one member, blocked 13th member at maxMembers 12, compact rendering) (depends on T009)
- [x] T011 Implement `visibleWhen` in src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx (evaluate per node against the resolved coordinate value, memoized per render; unknown coordinate → hidden + `binding-unresolved`; never affects storage) and show a condition badge + editor for it in src/sheet_manager/components/dialogs/template-editor/ElementEditor.tsx (all nodes always visible in the editor) (depends on T004, T007)
- [x] T012 Rework catalog fill semantics per contracts/catalog-fill.md in src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx and src/sheet_manager/features/sheet/data/catalogBindings.ts: adapter hook `CatalogDetailAdapter` (registered per catalog by the owning system), detail values incl. `boolean`, `null`, row arrays; `undefined` → untouched, `null`/`''` → cleared, else overwrite; row details replace table/list entries with fresh ids; in-row sibling fills write only that row; all writes of one pick through `applyWrites` (one update) (depends on T007)
- [x] T013 [P] Extend tests in tests/sheet_manager/catalog-bindings.test.ts for the new fill semantics: untouched/cleared/overwrite, bridged data target written via lens, bag target, row replacement, in-row fill isolation, single batched update, clearing the select writes nothing (depends on T012)
- [x] T014 Upgrade reference controls in src/sheet_manager/features/sheet/declarative/fieldControls.tsx and src/sheet_manager/features/sheet/declarative/hooks.ts: filter `documentOptions` by `targetKinds`; "open" icon button (`aria-label`) that calls `setCurrentDocument(id)`; stored id with no matching document → labeled "missing document" placeholder (value retained) + `reference-target-missing` report; preview (static) sources show the placeholder without reporting; also make `select` display a stored value that is not an option id as raw text (kept until changed)
- [x] T015 [P] Extend tests in tests/sheet_manager/template-references.test.ts: kind filtering, open action switches current document, missing target placeholder + single report, multiple references with one missing, unknown select value displayed and preserved (depends on T014)
- [x] T016 Make resolution observable and non-throwing in src/sheet_manager/features/sheet/view.ts and src/sheet_manager/features/sheet/CharacterSheet.tsx per contracts/view-resolution-and-retirement.md: user template must match document kind; report `template-fallback` with `reason` (`missing`, `kind-mismatch`, `unknown-view`, `no-default`) alongside `FallbackNotice`; replace the unknown-built-in-block `throw` with a notice + report (depends on T003)
- [x] T017 [P] Extend tests in tests/sheet_manager/view-resolution.test.ts: each fallback reason reports exactly once, kind-mismatched user template falls back, unknown stored view id falls back to default, no throw path, document data and templateValues untouched (depends on T016)
- [x] T018 Split template authoring per R9: first write the current `full-sheet`, `droid-sheet`, `brief`, `droid-brief` outputs to a JSON fixture at tests/sheet_manager/fixtures/character-templates.pre-007.json (used by T019); then move setting-neutral builders (`text`, `number`, `formula`, `select`, `reference`, `table`, `list`, `group`, `section`, `primitive`, `when` for `visibleWhen`) to src/sheet_manager/templates/builders.ts with explicit `labelMessage` parameters; move WoD-family helpers (dots `trait`, attribute groups, cohort track helper) to src/sheet_manager/systems/wod-like/templateBuilders.ts; move character/droid pages to src/sheet_manager/systems/star-wars-wod/templates/character.ts and `DOCS` paths to src/sheet_manager/systems/star-wars-wod/templates/docs.ts; src/sheet_manager/systems/star-wars-wod/defaultTemplates.ts only aggregates exports
- [x] T019 Guard the refactor in tests/sheet_manager/default-templates.test.ts: the four character/droid templates are deep-equal to tests/sheet_manager/fixtures/character-templates.pre-007.json except for added `labelMessage` values and every node carries a resolvable `labelMessage`; run tests/sheet_manager/template-labels.test.ts unchanged (depends on T018)
- [x] T020 Add track variants to src/sheet_manager/systems/star-wars-wod/profile.ts (fodder 3 = Hurt −1, Injured −2, Incapacitated; 5 = Bruised, Hurt −1, Injured −2, Wounded −3, Incapacitated; 7 = full health) and the vehicle arc enum (`front`, `rear`, `left`, `right`, `turret`, `all`) with translation keys in translations/source/\*.yaml; expose variant lookup through the WoD profile helpers in src/sheet_manager/systems/wod-like/profile.ts (R3)

**Checkpoint**: `yarn verify` green — lens bindings, cohort tracks, `visibleWhen`, fill semantics, references, fallback diagnostics, and builders in place; character pages unchanged

---

## Phase 3: User Story 1 — Creature sheet as a template (Priority: P1) 🎯 MVP

**Goal**: Creature documents render the shipped `creature-sheet` template covering the conversion sheet plus the FR-004 creature additions, with bestiary fill

**Independent Test**: quickstart manual scenario 1 — create a creature, fill from Wampa, overwrite with Rancor, set tier, add members and damage one, reload; a pre-feature creature shows all values

- [x] T021 [US1] Declare creature lens bindings in src/sheet_manager/systems/star-wars-wod/entityBindings.ts (kind `creature`): `field:name|species|type|size|owner|notes`, `field:scale` (enum from profile scales), `trait:strength|dexterity|stamina|perception|intelligence|wits` (dots, `numeric`), `list:abilities`, `resource:willpower` (pair), `field:armor.name|armor.armorRating|armor.dexterityModifier` (armorRating with leading-signed-integer `numeric` reader), `table:attacks` (name, type enum L/B, damage, range), `track:members-health` (cohort over `members[].health`, health track); register them in src/sheet_manager/systems/star-wars-wod/documentBindings.ts
- [x] T022 [P] [US1] Write tests in tests/sheet_manager/entity-bindings.test.ts for creature lenses: read/write round-trip for every key on a default creature, schema-rejected write leaves data unchanged and reports, `stamina`/`armor-rating` numeric reads (`'+1D'` → 1, `'hide'` → formula error), bindings absent for other kinds (depends on T021)
- [x] T023 [US1] Implement the Star Wars catalog adapters module src/sheet_manager/systems/star-wars-wod/catalogAdapters.ts with pure converters per contracts/catalog-fill.md (dice→dots with pips ignored and clamping + `catalog-detail-out-of-range`, scale name→enum, willpower dice→pair, armor split, weapon arc→enum or raw) and the `creatures` adapter (all details listed in contracts/entity-templates.md "Catalog fill mappings"); register the `creatures` catalog (from src/data/creatureData.ts, existing lazy catalog path) in src/sheet_manager/features/sheet/data/catalogBindings.ts
- [x] T024 [P] [US1] Write adapter tests in tests/sheet_manager/catalog-bindings.test.ts (creatures section): every converter's normal/edge/out-of-range cases; Wampa and Rancor produce schema-valid values for all mapped targets; merits/flaws rows (depends on T023)
- [x] T025 [US1] Build `creature-sheet` in src/sheet_manager/systems/star-wars-wod/templates/creature.ts exactly per contracts/entity-templates.md (sections `identity`, `attributes`, `abilities`, `advantages`, `combat`, `health`, `details` collapsed; bag coordinates from data-model.md §2; `threat-tier` select default `named`; two `soak` formula rows with `visibleWhen`; `scale-reference` collapsed group; docs links from templates/docs.ts; cohort `maxMembers` 24) and export it via defaultTemplates.ts
- [x] T026 [US1] Switch the creature definition's full view to the template-backed `creature-sheet` in src/sheet_manager/systems/star-wars-wod/index.ts (brief stays on the existing brief view until US4)
- [x] T027 [US1] Add creature labels, section titles, threat-tier options, soak reminders, and descriptions (en + ru) to translations/source/\*.yaml and run `yarn build:translations`
- [x] T028 [US1] Write tests in tests/sheet_manager/entity-templates.test.ts (creature section): template parses; every `bindingKey` resolves for kind `creature` (no `binding-unresolved` when rendering a default creature); coverage list of every conversion creature-sheet field (SC-001) and FR-004 creature additions present; `details` collapsed; tier switch toggles the soak rows; a pre-feature creature fixture renders all stored values (SC-002); picking Wampa then Rancor overwrites mapped targets and leaves `field:name`/`field:notes`/members untouched

**Checkpoint**: `yarn verify` green; creature documents fully usable on the template page (MVP)

---

## Phase 4: User Story 2 — Vehicle sheet as a template (Priority: P1)

**Goal**: Vehicle documents render `vehicle-sheet` with catalog model fill, arcs, systems damage, crew stations, modifications, and cohort damage tracks

**Independent Test**: quickstart manual scenario 2 — X-wing fill, weapon arc, modification, second member damage, pilot link/open/delete, reload

- [x] T029 [US2] Declare vehicle lens bindings in src/sheet_manager/systems/star-wars-wod/entityBindings.ts (kind `vehicle`): `field:name|model|owner|crew|length|cargoCapacity|passengers|consumables|speed|altitude|sensorRange|navigationComputer|notes`, `field:scale` (enum), `trait:durability|maneuverability|communicationsSensors|hyperdrive|shields|frontShields|rearShields` (dots), `list:configuration`, `table:weapons` (name, arc enum with raw-text tolerance, range, damage), `track:members-damage` (cohort over `members[].damage`, vehicle-damage track); remove the broken top-level `track:vehicle-damage` vehicle binding in src/sheet_manager/systems/star-wars-wod/documentBindings.ts
- [x] T030 [P] [US2] Add vehicle lens tests to tests/sheet_manager/entity-bindings.test.ts: round-trip every key, free-text legacy arc preserved on read and replaced on select, damage cohort writes the right member (depends on T029)
- [x] T031 [US2] Add the `vehicles` adapter (all mappings in contracts/entity-templates.md incl. `hyperdrive: null` → 0, arc conversion, `durabilityReroll`, `category`, `description`) to src/sheet_manager/systems/star-wars-wod/catalogAdapters.ts and register the `vehicles` catalog (src/data/vehicleData.ts) in src/sheet_manager/features/sheet/data/catalogBindings.ts
- [x] T032 [P] [US2] Add vehicles adapter tests to tests/sheet_manager/catalog-bindings.test.ts: X-wing and Millennium Falcon produce schema-valid values; out-of-range dots clamp and report; unknown arc kept as raw text (depends on T031)
- [x] T033 [US2] Build `vehicle-sheet` in src/sheet_manager/systems/star-wars-wod/templates/vehicle.ts per contracts/entity-templates.md (sections `identity`, `capacity`, `systems` incl. 10-row `vehicle-systems` table and collapsed configuration, `weapons`, `crew-stations` reference group with `targetKinds: ['character']`, `damage` with cohort primitive id `damage-track` + collapsed `scale-reference`, `modifications` collapsed, `details` collapsed); export via defaultTemplates.ts
- [x] T034 [US2] Switch the vehicle definition's full view to `vehicle-sheet` in src/sheet_manager/systems/star-wars-wod/index.ts
- [x] T035 [US2] Add vehicle labels, crew station names, arc names, systems/modification column labels (en + ru) to translations/source/\*.yaml; run `yarn build:translations`
- [x] T036 [US2] Add vehicle cases to tests/sheet_manager/entity-templates.test.ts: parse; all bindings resolve for kind `vehicle`; conversion vehicle-sheet coverage list and FR-004 vehicle additions; systems table fixed at 10 rows; crew references filtered to characters; pre-feature vehicle fixture renders all values; catalog pick leaves name/owner/crew stations/modifications/systems damage untouched

**Checkpoint**: `yarn verify` green; vehicles fully usable on the template page

---

## Phase 5: User Story 3 — Fodder group sheet as a template (Priority: P1)

**Goal**: Fodder groups render `fodder-sheet` with selectable track length (default 3 for new groups, 7 for existing), up to 12 lettered members, soak reminder, quick pools, leader link, armor/weapon catalog fills

**Independent Test**: quickstart manual scenario 3 — six troopers, catalog armor/weapon, damage B and E, E defeated, remove E with confirmation, 3↔7 length changes, 13th member blocked

- [x] T037 [US3] Add `trackLength: z.union([z.literal(3), z.literal(5), z.literal(7)]).default(7)` to the fodder schema and set `trackLength: 3` in its `createDefault` in src/sheet_manager/systems/star-wars-wod/schema.ts (no schemaVersion bump, no migrate) (R3)
- [x] T038 [US3] Declare fodder lens bindings in src/sheet_manager/systems/star-wars-wod/entityBindings.ts (kind `group`): `field:concept|notes`, `trait:` all nine attributes (dots, `numeric` for stamina), `list:abilities`, `field:willpower` (number 0–10), `field:armor.name|armor.armorRating|armor.dexterityModifier` (numeric armorRating), `table:weapons` (name, damage, range), `field:trackLength` (enum 3/5/7), `track:members-health` (cohort over `members[].health`, `lengthPath: ['trackLength']`, fodder variants)
- [x] T039 [P] [US3] Add fodder tests to tests/sheet_manager/entity-bindings.test.ts: stored v1 group without `trackLength` parses to 7 and keeps all marks; new group via `createDocument` has 3; lens round-trips; trackLength write rejected for 4 (depends on T037, T038)
- [x] T040 [US3] Register sheet adapters for the existing `armor`, `ranged-weapons`, `melee-weapons` catalogs to fill fodder armor fields and in-row weapon `name`/`damage`/`range` in src/sheet_manager/systems/star-wars-wod/catalogAdapters.ts (stormtrooper armor → `+3D` / `-2D`; blaster rifle → 9D / 200)
- [x] T041 [US3] Build `fodder-sheet` in src/sheet_manager/systems/star-wars-wod/templates/fodder.ts per contracts/entity-templates.md (sections `identity` with `leader` reference, `traits`, `combat` with armor catalog select + `soak` formula + unconditional "cannot soak lethal" reminder + weapons table with in-row catalog select, `members` with `field:trackLength` select and cohort `maxMembers` 12 `lengthFrom: field:trackLength`, `quick-pools` collapsed, `details` collapsed); export via defaultTemplates.ts
- [x] T042 [US3] Switch the fodder-group definition's full view to `fodder-sheet` in src/sheet_manager/systems/star-wars-wod/index.ts
- [x] T043 [US3] Add fodder labels, track-length options, quick pool labels, member count/defeated/confirmation strings (en + ru) to translations/source/\*.yaml; run `yarn build:translations`
- [x] T044 [US3] Add fodder cases to tests/sheet_manager/entity-templates.test.ts: parse; bindings resolve for kind `group`; conversion fodder-sheet coverage and FR-004 fodder additions; new group renders 3-level tracks; pre-feature group fixture renders 7 levels with marks intact; 12-member cap; armor and in-row weapon fills isolate to their targets/row

**Checkpoint**: `yarn verify` green; all three full pages template-backed

---

## Phase 6: User Story 4 — Brief versions for encounter use (Priority: P2)

**Goal**: Kind-specific brief templates sharing values with full pages; stored `brief`/`npc-card` view ids keep working

**Independent Test**: quickstart manual scenario 4 — switch each kind to brief, run a round, edit in brief and see it in full

- [x] T045 [P] [US4] Build `creature-brief` (groups `brief-identity`, `brief-pools`, `brief-attacks`, `brief-health`) in src/sheet_manager/systems/star-wars-wod/templates/creature.ts per contracts/entity-templates.md (compact traits, soak rows with the same `visibleWhen`, compact cohort track)
- [x] T046 [P] [US4] Build `vehicle-brief` (groups `brief-identity`, `brief-systems`, `brief-weapons`, `brief-crew`, `brief-damage`) in src/sheet_manager/systems/star-wars-wod/templates/vehicle.ts
- [x] T047 [P] [US4] Build `fodder-brief` (groups `brief-identity`, `brief-pools`, `brief-weapons`, `brief-members` with length selector hidden) in src/sheet_manager/systems/star-wars-wod/templates/fodder.ts
- [x] T048 [US4] Replace the shared `BRIEF_VIEW` for creature, vehicle, and fodder-group definitions with per-kind `creature-brief`, `vehicle-brief`, `fodder-brief` views carrying `legacyIds: ['brief', 'npc-card']` in src/sheet_manager/systems/star-wars-wod/index.ts; export the briefs via defaultTemplates.ts (depends on T045–T047)
- [x] T049 [US4] Add brief group titles (en + ru) to translations/source/\*.yaml; run `yarn build:translations`
- [x] T050 [US4] Add brief cases to tests/sheet_manager/entity-templates.test.ts and tests/sheet_manager/view-resolution.test.ts: each brief parses and resolves for its kind; a document with stored `preferredViewId: 'brief'` or `'npc-card'` resolves to its kind's brief without `template-fallback`; a value edited through the brief is read by the full template; `defaultOverrides` for `creature-brief` does not affect `vehicle-brief`; template library can copy each brief default (depends on T048)

**Checkpoint**: `yarn verify` green; no creature/vehicle/fodder view uses the built-in path

---

## Phase 7: User Story 5 — Documentation embeds use template fragments (Priority: P2)

**Goal**: All legacy MDX embeds replaced with `TemplateFragment`/`TemplatePreview`; creature and vehicle pages show read-only previews instead of static example tables (en + ru)

**Independent Test**: quickstart manual scenario 6 in both locales; `docs-embeds.test.tsx` green

- [x] T051 [US5] Create example documents in src/sheet_manager/systems/star-wars-wod/examples.ts per data-model.md §7 with values taken from the page prose: `wampa::preset` (creatures/mechanics "Creature Example: Wampa": Willpower 6, abilities, armor "Tough hide" +1D, claw/teeth attacks, merits, notes, tier named, 1 member), `stormtrooper-squad::preset` (stat block: attributes/abilities per table, stormtrooper armor, blaster rifle, willpower 4, trackLength 3, 4 members with mixed marks, one defeated), `red-five::preset`, `lukes-landspeeder::preset`, `millennium-falcon::preset` (traits-systems example tables incl. weapons with arcs and reroll marker), and `vehicleDamagePreviewDocument(levels)`; all envelopes parse with their kind schema
- [x] T052 [US5] Extend src/sheet_manager/docsEmbeds.tsx per contracts/docs-embeds.md: `TemplateFragment` without a matching current document renders an actionable create prompt (reuse `CreateCharacterButton` for kind `character`; translated message) instead of null; export `exampleDocument(id)` (unknown id → `template-reference-invalid` + undefined), `vehicleDamagePreviewDocument`, and re-export `JAX_VORN_PRESET` (depends on T051)
- [x] T053 [US5] Extend tests/sheet_manager/docs-embeds.test.tsx per contracts/docs-embeds.md "Verification": parse `template`/`node`/`systemId` including multi-line JSX; validate `exampleDocument('<id>')` ids; ban MDX imports from `features/sheet/blocks`, `components/viewer`, `data/presets`; each example parses and renders its target template (full and brief) without `binding-unresolved`; fragment prompt renders when no document (depends on T052)
- [x] T054 [P] [US5] Replace legacy blocks in docs/star-wars-wod-2e/quick-start.mdx and i18n/ru/docusaurus-plugin-content-docs/current/star-wars-wod-2e/quick-start.mdx with `<TemplateFragment node="base|attributes|skills|advantages|force" />` (one per former block, inside the existing `TWWrapper`s; drop `accentColor`); imports only from `/src/sheet_manager/docsEmbeds` (keep `CreateCharacterButton` import); identical import sets in both locales
- [x] T055 [P] [US5] Replace legacy blocks in docs/star-wars-wod-2e/character/creation-steps/step-1-concept-species.mdx, step-2-attributes.mdx, step-3-abilities.mdx, step-4-backgrounds.mdx, step-5-virtues.mdx and their ru mirrors under i18n/ru/docusaurus-plugin-content-docs/current/star-wars-wod-2e/character/creation-steps/ with `TemplateFragment` nodes `base`, `attributes`, `skills`, `advantages`, `force`
- [x] T056 [P] [US5] Replace `AttributeBlock`/`SkillBlock` in docs/star-wars-wod-2e/core-rules/attributes-abilities.mdx (fix its relative `../../../src` imports) and `ForceBlock` in docs/star-wars-wod-2e/character/force.mdx, plus ru mirrors, with `TemplateFragment` nodes `attributes`, `skills`, `force`
- [x] T057 [P] [US5] Replace `CharacterViewer character={JAX_VORN_PRESET}` in docs/star-wars-wod-2e/character/creation-steps/worked-example.mdx and docs/star-wars-wod-2e/example-of-play.mdx, plus ru mirrors, with `<TemplatePreview document={presetCharacterDocument(JAX_VORN_PRESET)} />` wrapped in `TWWrapper`
- [x] T058 [P] [US5] Replace the six `HealthViewer levels={[…]}` uses in docs/star-wars-wod-2e/combat/health-damage-heal.mdx and its ru mirror with `<TemplatePreview node="track-health" document={healthPreviewDocument([…])} />` using the same level arrays
- [x] T059 [P] [US5] In docs/star-wars-wod-2e/creatures/mechanics.mdx and its ru mirror: replace the "Creature Example: Wampa" table with `TemplatePreview template="creature-sheet" document={exampleDocument('wampa::preset')}` and the "Fodder Stat Block Example: Stormtrooper" table with `TemplatePreview template="fodder-brief" document={exampleDocument('stormtrooper-squad::preset')}` (keep the armor/weapon/soak summary line) (depends on T052)
- [x] T060 [P] [US5] In docs/star-wars-wod-2e/vehicles-mechanisms/traits-systems.mdx and its ru mirror: replace the X-wing table with `template="vehicle-sheet"` + `red-five::preset`, Luke's Landspeeder and Millennium Falcon tables with `template="vehicle-brief"` previews; in docs/star-wars-wod-2e/vehicles-mechanisms/durability-damage-repair.mdx and its ru mirror add under "Vehicle Damage Track" three `TemplatePreview template="vehicle-sheet" node="damage-track"` embeds with `vehicleDamagePreviewDocument` (empty, 2 marks, 5 marks) (depends on T052)
- [x] T061 [US5] Run `yarn validate:i18n`, `yarn test tests/sheet_manager/docs-embeds.test.tsx`, and `yarn verify:full`; open every migrated page in `en` and `ru` on the running dev server (check `http://localhost:3000/` first) and confirm editable/preview behavior and prose-value agreement (depends on T053–T060)

**Checkpoint**: `yarn verify:full` green; 0 MDX references to legacy components (SC-005 docs half, SC-006)

---

## Phase 8: User Story 7 — Pages ready for other settings (Priority: P3)

**Goal**: Documented and test-guarded separation of setting-specific vs reusable parts

**Independent Test**: review the skill doc table and the neutrality test

- [x] T062 [P] [US7] Add a neutrality test in tests/sheet_manager/entity-templates.test.ts: src/sheet_manager/templates/builders.ts, src/sheet_manager/systems/templateBindings.ts, and src/sheet_manager/features/sheet/declarative/\*\* contain no Star Wars identifiers (`star-wars`, `vehicle-damage`, `creature`, `fodder`, scale ids, arc ids) and no imports from `systems/star-wars-wod`
- [x] T063 [US7] Update .agents/skills/sheet-templates/SKILL.md: data-lens bindings, cohort track, `visibleWhen`, catalog fill semantics and adapters, reference behavior, per-kind views, fallback diagnostics, example documents, and the per-kind "setting-specific vs reusable" table from contracts/entity-templates.md (FR-012)

**Checkpoint**: settings-expansion seam documented and guarded

---

## Phase 9: User Story 6 — Legacy component retirement and archive (Priority: P3)

**Goal**: Legacy blocks, viewers, views, registry, and the `built-in` layout type archived to `context/` and removed from the product

**Independent Test**: quickstart manual scenario 7; grep finds no legacy references outside `context/`; `yarn verify:full` green

**Gate**: start only after the US1–US5 checkpoints are green

- [x] T064 [US6] Archive per contracts/view-resolution-and-retirement.md: copy src/sheet_manager/features/sheet/blocks/\*, src/sheet_manager/components/viewer/CharacterViewer.tsx, src/sheet_manager/features/sheet/registry/builtInBlockRegistry.ts, src/sheet_manager/features/sheet/views/{CreatureSheet,VehicleSheet,FodderSheet,BriefDocumentSheet,BriefCharacterSheet,StarWarsSheetSupport}.tsx and tests/sheet_manager/brief-character-sheet.test.tsx into context/legacy-sheet-components/ mirroring their repository paths; write context/legacy-sheet-components/README.md (source commit hash, date, "reference only — not built, linted, or tested", file list); add the entry to context/AGENTS.md
- [x] T065 [US6] Move the member add/label/remove logic still needed from `ConditionTrackBlock` into the cohort primitive if not already covered, then remove `ConditionTrackBlock` and other now-unused exports from src/sheet_manager/components/sections/DocumentSheetSections.tsx and src/sheet_manager/components/index.ts (keep everything the declarative renderer imports)
- [x] T066 [US6] Delete the archived source files from src/ (T064 list), remove the `CharacterViewer` export from src/sheet_manager/components/index.ts, and delete tests/sheet_manager/brief-character-sheet.test.tsx (depends on T064, T065)
- [x] T067 [US6] Remove the `built-in` layout: delete `BuiltInDocumentLayout` from src/sheet_manager/systems/types.ts, `builtInView()` and all built-in view constants from src/sheet_manager/systems/star-wars-wod/index.ts (character/droid views become template-backed declarations with unchanged ids and legacy ids), and the built-in branch from src/sheet_manager/features/sheet/CharacterSheet.tsx (missing shipped template → notice + `template-fallback` `no-default`) (depends on T066)
- [x] T068 [US6] Remove `sheet.templates.builtInBlocks.*` strings from translations/source/\*.yaml, re-homing `other` under the template label messages used by src/sheet_manager/systems/star-wars-wod/templates/character.ts; run `yarn build:translations`
- [x] T069 [US6] Update tests: rewrite tests/sheet_manager/built-in-templates.test.ts to assert every view of every registered system has a shipped template with the same id and kind; update tests/sheet_manager/primitive-parity.test.tsx and tests/sheet_manager/document-system.test.ts for the removed layout type; add a stale `metadata.templateId` → fallback + `template-fallback` case to tests/sheet_manager/view-resolution.test.ts (depends on T067)
- [x] T070 [US6] Update current-state docs: .agents/skills/sheet-templates/SKILL.md (resolution steps, known debt, unused exports, tests map), .agents/skills/sheet-manager/SKILL.md (registry, blocks, formula-location references), src/sheet_manager/AGENTS.md (tree, composition layers, `brief` view rule, built-in layouts rule), src/sheet_manager/TODO.md (close the legacy retirement record)
- [x] T071 [US6] Verify retirement: `grep -rn "features/sheet/blocks\|components/viewer\|builtInBlockRegistry\|BuiltInDocumentLayout\|builtInView" src docs i18n tests` returns nothing; run `yarn verify:full` (depends on T066–T070)

**Checkpoint**: `yarn verify:full` green; SC-005 fully met

---

## Phase 10: Polish & Cross-Cutting Concerns

- [x] T072 [P] Accessibility pass on cohort tracks, reference open/missing placeholder, `visibleWhen` badge, collapsed sections, and docs create prompt (keyboard reachability, `aria-label`, `aria-expanded`, `role="alert"`) in src/sheet_manager/features/sheet/declarative/CohortTrack.tsx, fieldControls.tsx, and src/sheet_manager/docsEmbeds.tsx
- [x] T073 [P] Performance check: render a vehicle with 24 members and a fodder group with 12 members in tests/sheet_manager/cohort-track.test.tsx (render + single mark update within the existing test time budget) and confirm one store update per catalog pick
- [x] T074 Add a CHANGELOG.md entry for the feature (entity templates, docs embeds migration, legacy retirement) and bump the version in package.json per project convention; run `yarn check:version`
- [x] T075 Run all quickstart.md automated gates and manual scenarios 1–7; then `yarn verify:full`, `yarn validate:data`, `yarn validate:i18n`

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T020) → US1 (T021–T028) → US2 (T029–T036) → US3 (T037–T044) → US4 (T045–T050) → US5 (T051–T061) → US7 (T062–T063) → US6 (T064–T071) → Polish (T072–T075)

### User Story Dependencies

- **US1 (P1)**: Foundational only
- **US2 (P1)**: Foundational only (independent of US1; shares entityBindings.ts/catalogAdapters.ts files, so sequence edits or coordinate)
- **US3 (P1)**: Foundational only (same shared-file note)
- **US4 (P2)**: the full template of each kind (US1–US3) for shared coordinates
- **US5 (P2)**: character legacy replacements need only Foundational (T054–T058); entity previews need US1–US4 templates (T059–T060)
- **US7 (P3)**: US1–US4 templates exist
- **US6 (P3)**: gate — US1–US5 complete

### Parallel Opportunities

- Foundational: T005, T010, T013, T015, T017 (tests) run parallel to later implementation tasks in other files; T020 is independent of T006–T019
- US1–US3 implementation can proceed in parallel by different agents if edits to entityBindings.ts, catalogAdapters.ts, index.ts, and translation YAML are serialized
- US4: T045, T046, T047 in parallel
- US5: T054–T058 in parallel (disjoint MDX files) as soon as Foundational is done; T059–T060 in parallel after T052
- Polish: T072, T073 in parallel

---

## Parallel Example: US5

```bash
Task: "T054 quick-start.mdx (en + ru) legacy blocks → TemplateFragment"
Task: "T055 creation steps 1–5 (en + ru) → TemplateFragment"
Task: "T056 attributes-abilities.mdx + force.mdx (en + ru) → TemplateFragment"
Task: "T057 worked-example.mdx + example-of-play.mdx (en + ru) → TemplatePreview"
Task: "T058 health-damage-heal.mdx (en + ru) → TemplatePreview track-health"
```

## Parallel Example: US4

```bash
Task: "T045 creature-brief in src/sheet_manager/systems/star-wars-wod/templates/creature.ts"
Task: "T046 vehicle-brief in src/sheet_manager/systems/star-wars-wod/templates/vehicle.ts"
Task: "T047 fodder-brief in src/sheet_manager/systems/star-wars-wod/templates/fodder.ts"
```

---

## Implementation Strategy

- **MVP**: Phases 1–3 — foundations + creature template page (usable end-to-end, legacy brief still present)
- **+US2/US3**: all three full pages template-backed
- **+US4**: per-kind briefs; built-in path unused by any view
- **+US5**: docs migrated and entity previews live (both locales)
- **+US7**: seam documented and guarded for the settings-expansion spec
- **+US6**: archive and delete legacy code and the `built-in` layout
- `yarn verify` at every checkpoint; `yarn verify:full` at US5, US6, and Polish

## Notes

- No existing document value changes; the only data addition is fodder `trackLength` (spec A2, R3)
- Template `schemaVersion` stays 3; all schema additions are optional
- Example documents use `::preset` ids (store refuses writes)
- Never hand-edit generated `ttgamer.*` entries in `i18n/*/code.json` or `src/i18n/generated/`
- en and ru MDX pages must keep identical import sets (`validate:i18n`)
