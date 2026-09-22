---
description: 'Task list for V5 ruleset and Hunter: the Reckoning 5e player character'
---

# Tasks: V5 Ruleset and Hunter: the Reckoning 5e Player Character

**Input**: Design documents from `/specs/008-hunter-v5-character/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: included. Constitution Principle V requires schema/persistence, store, UI-flow, and docs
tests for this kind of change; `tests/setup/sheetIssues.ts` fails tests on unexpected diagnostics.

**Organization**: grouped by user story (spec priorities: US1 P1, US2 P1, US3 P2, US4 P2, US6 P2,
US5 P3). Before any template or binding task, load `.agents/skills/sheet-templates/SKILL.md`; before
schema/store tasks, `.agents/skills/sheet-manager/SKILL.md`; before docs tasks,
`.agents/skills/mdx-documentation/SKILL.md` and `.agents/skills/ui-i18n/SKILL.md`.

**Scaling rules for every task** (the product will host many TTRPGs):

- Generic code (`systems/*.ts`, `components/`, `features/`, `store/`, `types/`) carries no V5 or
  Hunter vocabulary: severities, labels, catalogs, and limits come from bindings and plugins.
- Every plugin — Star Wars included — declares catalogs, policies, templates, and bindings the same
  way; no special cases for the first system.
- System-specific code lives only under `src/sheet_manager/systems/<system>/`; system-specific tests
  under `tests/sheet_manager/systems/<system>/`; system-specific strings in their own YAML files.

**UI composition** (`src/sheet_manager/AGENTS.md` "Composition Scale"): new generic **atoms** in
`components/controls/` — `SeverityBox` (one box with an ordered severity level), `TrackActionButton`
(one labelled track action), `TagListInput` (short string list with suggestions) — and one molecule,
`components/sections/SeverityTrack.tsx`. Atoms receive values and callbacks only; they never read
document context, stores, systems, or persistence.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: user story from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: skeleton folders, translation files, and validators that later tasks write into

- [x] T001 Create the plugin skeleton `src/sheet_manager/systems/v5/index.ts` (header comment: ruleset owns mechanics, modules add supernatural types, research D1), empty folders `src/sheet_manager/systems/v5/ruleset/`, `src/sheet_manager/systems/v5/modules/hunter/templates/`, and `tests/sheet_manager/systems/v5/`
- [x] T002 [P] Create layered translation sources, en and ru each, with empty top-level maps: `translations/source/{en,ru}/ui/sheet/policies.yaml` (generic), `translations/source/{en,ru}/ui/sheet/tracks.yaml` (generic severity-track and tag-input chrome: "Box {n} of {total}: {state}", "+{count} over", "Remove {tag}", "Move up", "Move down"), `translations/source/{en,ru}/ui/sheet/v5.yaml` (ruleset: `attributes`, `skills`, `sections`, `severities`), `translations/source/{en,ru}/ui/sheet/v5-hunter.yaml` (module: `fields`, `sections`, `views`, `types`, `summaries`); run `yarn build:translations`
- [x] T003 [P] Create catalog-name sources `translations/source/en/data/v5-hunter.yaml` and `translations/source/ru/data/v5-hunter.yaml` following the layout of `translations/source/en/data/attributes.yaml` (groups `creeds`, `drives`, `edges`, `perks`)
- [x] T004 [P] Generalise `scripts/validate-i18n.ts` from one `sourceRoot`/`translationRoot` pair to a list of doc roots `['star-wars-wod-2e', 'v5']`, skipping a root whose English folder does not exist yet; keep all existing checks per root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: generic, system-neutral capabilities every story depends on: plugin metadata, labels as
descriptors, policies, plugin-declared catalogs, system-aware template matching, registry-driven
creation, new diagnostics code, V5 core schema

**⚠️ CRITICAL**: no user story work before this phase is complete

### Tests for Foundation

- [x] T005 [P] Add registry tests to `tests/sheet_manager/document-system.test.ts`: two plugins register side by side; duplicate view ids across plugins throw; unknown policy id in `SystemPlugin.policies` or `DocumentDefinition.module.policies` throws; `resolveDocumentPolicies` returns the deduplicated union in stable order and `[]` for Star Wars; `listDefinitions()` returns plugin + definition pairs in registration order (use an in-test fake plugin, not the real V5 one)
- [x] T006 [P] Add matching tests to `tests/sheet_manager/view-resolution.test.ts`: a custom template with `systemId: 'star-wars-wod'` is not resolved for a document of another system with the same `kind` and reports `template-incompatible`; a shipped default is looked up only inside the document's own plugin
- [x] T007 [P] Create `tests/sheet_manager/catalog-registry.test.ts`: catalogs aggregated from registered plugins include every existing Star Wars catalog id (snapshot of the id list before the move) and catalogs of an in-test fake plugin; duplicate catalog id across plugins throws; `src/sheet_manager/features/sheet/data/catalogBindings.ts` has no import from `src/data/`
- [x] T008 [P] Create `tests/sheet_manager/systems/v5/core-schema.test.ts`: V5 core defaults (attributes 1, skills `{ value: 0, specialties: [] }`, tracks `{ superficial: 0, aggravated: 0, bonus: 0 }`), limits from data-model.md (attribute 0 and 6 rejected, skill 6 rejected, 11 specialties or a 61-char specialty rejected, severity count 16 rejected, bonus −6/11 rejected, text over limit rejected), unknown keys stripped, round-trip parse of a filled object

### Implementation for Foundation

- [x] T009 Create `src/sheet_manager/systems/catalogs.ts` by moving `defineCatalog`, `CatalogBindingEntry`, `CatalogFillableDetail`, and related pure helpers out of `src/sheet_manager/features/sheet/data/catalogBindings.ts` (no behaviour change; `localizeCatalogEntry` import stays via `@site/src/data/localizeCatalogEntry`); update imports across `src/sheet_manager` and tests
- [x] T010 Extend `src/sheet_manager/systems/types.ts`: `SystemPlugin.policies?: PolicyId[]`, `SystemPlugin.catalogs?: readonly CatalogBindingEntry[]` (type from `systems/catalogs.ts`), `DocumentDefinition.module?: { id: string; policies?: PolicyId[] }`, and change `DocumentDefinition.label` and `SystemPlugin.label` to translation descriptors `{ id, message }` (depends on T009)
- [x] T011 Create `src/sheet_manager/systems/policies.ts`: `PublisherPolicy` interface and `PolicyId` type per data-model.md; `PUBLISHER_POLICIES` with `dark-pack` (`officialNotice`: the two verbatim sentences from contracts/hunter-document.md, `url` of the Dark Pack Agreement, `nonCommercial: true`, `explanation` descriptor from `ui/sheet/policies.yaml`); `resolveDocumentPolicies(registry, { systemId, definitionId })` and `resolveSystemPolicies(registry, systemId)`; add en/ru label and own-words explanation (fan-made, free, not official, used under Paradox's community policy) to `translations/source/{en,ru}/ui/sheet/policies.yaml`
- [x] T012 Extend `src/sheet_manager/systems/registry.ts`: reject view ids duplicated across plugins and unknown policy ids at construction; add `getPlugin(systemId)` and `listDefinitions()` (depends on T010, T011; makes T005 pass)
- [x] T013 Create `src/sheet_manager/systems/star-wars-wod/catalogs.ts` declaring every Star Wars catalog currently built in `features/sheet/data/catalogBindings.ts` (same ids, entries, fillable details) and set `catalogs` on the plugin in `src/sheet_manager/systems/star-wars-wod/index.ts`; then reduce `src/sheet_manager/features/sheet/data/catalogBindings.ts` to aggregation from `systemRegistry` (duplicate ids throw) with the existing lookup API unchanged (depends on T009, T012; makes T007 pass)
- [x] T014 Add diagnostics code `template-incompatible` to `SheetIssueCode` in `src/sheet_manager/diagnostics.ts` and a localized user message "This template does not fit this document" to `translations/source/{en,ru}/ui/sheet/templates.yaml`
- [x] T015 Make template matching system-aware in `src/sheet_manager/systems/view.ts`: custom template lookup requires `template.systemId === document.systemId` and matching `documentKind`; shipped defaults resolved from `registry.getPlugin(document.systemId).defaultTemplates` only; a mismatch falls back to the definition's default view and reports `template-incompatible` (depends on T012, T014; makes T006 pass)
- [x] T016 Make `src/sheet_manager/components/dialogs/DocumentCreateDialog.tsx` registry-driven: list `systemRegistry.listDefinitions()` grouped under a heading per plugin `label`, option labels from each definition's `label` descriptor; delete the hardcoded `definitionMessages` map by moving its message ids onto the Star Wars definitions and plugin in `src/sheet_manager/systems/star-wars-wod/index.ts`; update `documentTypeLabel` in `src/sheet_manager/components/dialogs/DocumentManagerDialog.tsx` to use the descriptor; radio group stays keyboard reachable and labelled (depends on T010, T012)
- [x] T017 [P] Add optional `systemId` and `definitionId` props (defaults: current Star Wars character) to `src/sheet_manager/features/sheet/shell/CreateCharacterButton.tsx`; the created document uses that definition's `createDefault` and default view
- [x] T018 [P] Replace the Star Wars-only `no-restricted-imports` pattern in `eslint.config.mjs` with one generic pattern forbidding generic sheet code from importing any concrete system (`**/systems/star-wars-wod/**`, `**/systems/v5/**`, and future `**/systems/<system>/**` via a pattern that excludes the neutral files `systems/*.ts` and `systems/wod-like/**`); allow-list `src/sheet_manager/systems/index.ts`, `src/sheet_manager/docsEmbeds.tsx`, and tests
- [x] T019 [P] Create `src/sheet_manager/systems/v5/ruleset/profile.ts`: ordered attribute keys in three groups (physical/social/mental) and 27 skill keys in three columns exactly as data-model.md, each with a label descriptor id; add all 36 labels to `translations/source/{en,ru}/ui/sheet/v5.yaml` (Russian: established V5 community terms, e.g. Сила, Ловкость, Выносливость, Обаяние, Манипулирование, Самообладание, Интеллект, Смекалка, Решительность)
- [x] T020 Create `src/sheet_manager/systems/v5/ruleset/schema.ts`: exported limits constants; Zod pieces `V5AttributeSchema`, `V5SkillSchema` (`value`, `specialties` string[] ≤ 10 × ≤ 60), `V5SeverityTrackSchema` (`superficial`, `aggravated` 0–15, `bonus` −5…10, finite integers), `V5AdvantageRowSchema`, `V5TouchstoneRowSchema`, `V5ExperienceSchema`, `V5BiographySchema`; exported `V5CoreShape` and `V5CoreSchema = z.object(V5CoreShape)`; `createV5CoreDefault()`; attribute/skill records built from `profile.ts` keys (depends on T019; makes T008 pass)
- [x] T021 Run `yarn build:translations`, `yarn lint`, and `yarn test tests/sheet_manager` — Star Wars behaviour unchanged, T005–T008 pass

**Checkpoint**: generic layer ready; a second plugin can be registered without touching generic code

---

## Phase 3: User Story 1 — Create and play a hunter (Priority: P1) 🎯 MVP

**Goal**: create a hunter from the create dialog, fill the full sheet, track Health/Willpower/Despair,
persist, with the Dark Pack notice under the sheet

**Independent Test**: quickstart.md Scenario 1 steps 1–10 and 12

### Tests for User Story 1

- [x] T022 [P] [US1] Create `tests/sheet_manager/severity-track.test.ts` for the pure module `src/sheet_manager/components/sections/severityTrack.ts` using generic fixtures (1, 2, and 3 severities; `upgrade-lowest` and `none`): every row of data-model.md "Severity track state transitions", V5 check (full + add lightest → one lightest upgraded; full of heaviest → no change), 3-severity check (full with bashing/lethal → lightest upgraded one step), heals clamp at 0, `resolveTrackLength` clamps to 1…max and returns 1 for NaN, `toBoxes` order (heaviest first), `overflow` after shrink, `cycleBox` renormalization
- [x] T023 [P] [US1] Create `tests/sheet_manager/severity-track.test.tsx`: `SeverityBox` renders empty and each level with `aria-label` from props and a distinct visual per level; `SeverityTrack` renders `length` boxes, one button per severity for add and heal (labels from props), each press fires exactly one transition, bonus input changes length through `onBonusChange`, `+N over` and full label render, compact mode keeps `aria-label`s; Tab reaches every control, Enter/Space activates
- [x] T024 [P] [US1] Create `tests/sheet_manager/tags-column.test.tsx`: `TagListInput` adds on Enter, removes with its labelled button, enforces `maxItems`/`maxLength`, shows passed suggestions, accepts free text; rows `tags` column in a fake plugin filters suggestions by the sibling `entryId` (entry A → only A's tags; renaming the row's `name` text keeps suggestions; empty `entryId` → none, free text accepted); rows reorder move up/down is keyboard reachable and persists order
- [x] T025 [P] [US1] Create `tests/sheet_manager/trait-specialties.test.tsx`: a trait binding with `specialties: 'list'` renders `TagListInput` and writes `specialties: string[]`; a trait without it still renders the single specialization text input (Star Wars regression)
- [x] T026 [P] [US1] Create `tests/sheet_manager/systems/v5/hunter-schema.test.ts`: `hunter` definition `createDefault` parses; defaults per data-model.md; `desperation`/`danger` 6 rejected; `edges` perks > 10 rejected; `entryId` optional; Creed/Drive custom text accepted; a full Lena-like document round-trips through `systemRegistry.parseDocument`; a document with `definitionId: 'vampire'` goes to recovery via the store migrate path; an out-of-range write through `updateDocumentData` is rejected and the previous value stays
- [x] T027 [P] [US1] Create `tests/sheet_manager/policy-notice.test.tsx`: `PolicyNotice` renders nothing for `[]`; renders both verbatim Dark Pack sentences, localized explanation, and link with `rel="noopener noreferrer"` inside `aside[aria-label]`; `SheetWorkspace` with a hunter shows the notice under the shipped `v5-hunter-sheet` view and under a user copy; with a Star Wars character shows none
- [x] T028 [P] [US1] Create `tests/sheet_manager/systems/v5/sheet-coverage.test.ts` (SC-002): a list of every field of the printed sheet pp. 282–283 (Name, Concept, Creed, Cell (as desperation/danger group), Ambition, Desire, Drive, Redemption, 9 attributes, Health, Willpower, Despair, 27 skills, Edges and Perks, Total/Spent Experience, Chronicle Tenets, Touchstones, Creed Fields, Advantages & Flaws, Equipment, Notes, Age, Date of birth, Appearance, Distinguishing features, History) mapped to binding keys; assert each binding is used by a node in `v5-hunter-sheet`

### Implementation for User Story 1 — generic atoms, molecule, logic

- [x] T029 [P] [US1] Create pure module `src/sheet_manager/components/sections/severityTrack.ts`: types `SeverityTrackState` (`counts: Record<string, number>`, `bonus`), `SeverityLevel` index, `Escalation`; functions `add(state, level, length, severityIds, escalation)`, `heal`, `cycleBox`, `toBoxes`, `overflow`, `resolveTrackLength(raw, max)`; no React, no system names (makes T022 pass)
- [x] T030 [P] [US1] Create atom `src/sheet_manager/components/controls/SeverityBox.tsx`: `<button type="button">` with props `level: number | null`, `levelCount`, `label`, `onActivate`, `disabled`, `compact`; visuals scale with level (empty outline → single slash → cross → filled for the heaviest when `levelCount ≥ 3`) using Tailwind palette variables and dark-mode classes; visible focus ring (makes part of T023 pass)
- [x] T031 [P] [US1] Create atom `src/sheet_manager/components/controls/TrackActionButton.tsx`: small button with Lucide `Plus`/`Minus` icon, props `label`, `intent: 'add' | 'heal'`, `tone` (severity index for color), `onClick`, `disabled`, `iconOnly` (then `aria-label` required)
- [x] T032 [P] [US1] Create atom `src/sheet_manager/components/controls/TagListInput.tsx`: controlled `string[]`, `maxItems`, `maxLength`, `suggestions: { id, label }[]`, `placeholder`, `onChange`, `readOnly`; chips with icon-only remove buttons (`aria-label` from `tracks.yaml`), input reusing `CatalogSuggest.tsx` suggestion behaviour (extract a shared internal list helper only if needed, `CatalogSuggest` API unchanged)
- [x] T033 [US1] Create molecule `src/sheet_manager/components/sections/SeverityTrack.tsx`: props `state`, `length`, `severities: { id, label, addLabel, healLabel }[]`, `escalation`, `bonus?` + `onBonusChange?`, `fullLabel?`, `onChange(next)`, `readOnly`, `compact`; renders `SeverityBox` × `length` via `toBoxes`, add/heal `TrackActionButton`s per severity, `+N over`, full badge; composes only atoms + `severityTrack.ts` (depends on T029–T031; makes T023 pass)

### Implementation for User Story 1 — generic template capabilities

- [x] T034 [US1] Add the `severity` binding kind to `src/sheet_manager/systems/templateBindings.ts` per contracts/template-bindings.md (`dataKey`, `severities`, `escalation`, `lengthFrom`, `maxLength ≤ 30`, `bonusKey?`, `fullLabel?`); make `<dataKey>.<bonusKey>` addressable as a formula coordinate; accept `severity:<id>` in primitive `bindingKey` validation in `src/sheet_manager/types/template.ts`
- [x] T035 [US1] Render `severity:` primitives in `src/sheet_manager/features/sheet/declarative/primitives.tsx`: read the bound object via `useBoundDocument`, evaluate `lengthFrom` with `features/sheet/declarative/formula.ts` (memoized on referenced values), clamp with `resolveTrackLength`, render `SeverityTrack` (`compact` from the node) wiring `onChange` and `onBonusChange` (writes `bonusKey`) through the bound update path; a broken formula reports `formula-error` once and uses length 1 (depends on T033, T034)
- [x] T036 [US1] Add trait `specialties: 'list'` mode (`maxItems`, `maxLength`) to trait bindings in `src/sheet_manager/systems/templateBindings.ts` and render it in the trait row path of `src/sheet_manager/features/sheet/declarative/primitives.tsx` with `TagListInput`; default single-text mode unchanged (depends on T032; makes T025 pass)
- [x] T037 [US1] Add the `tags` rows column type to `src/sheet_manager/types/template.ts` (`type: 'tags'`, `key`, `maxItems ≤ 20`, optional `catalog { catalogId, filterByColumn?, filterKey? }`) and to rows binding columns in `src/sheet_manager/systems/templateBindings.ts`; render it in the rows table in `src/sheet_manager/features/sheet/declarative/primitives.tsx` with `TagListInput`, filtering the catalog by `filterKey === row[filterByColumn]` (entry id written by the name column's catalog `fills`); unresolved catalog → `catalog-unavailable` (depends on T013, T032)
- [x] T038 [US1] Ensure rows primitives support reordering: if `src/sheet_manager/features/sheet/declarative/primitives.tsx` rows lack it, add labelled move up/down buttons per row (strings from `tracks.yaml`), writing the reordered array through the bound update path; keyboard reachable (makes T024 pass together with T037)

### Implementation for User Story 1 — V5 ruleset and Hunter module

- [x] T039 [P] [US1] Create `src/sheet_manager/systems/v5/modules/hunter/catalogs.ts` with `defineCatalog` from `systems/catalogs.ts`: `v5-hunter-creeds` (Entrepreneurial, Faithful, Inquisitive, Martial, Underground), `v5-hunter-drives` (Curiosity, Vengeance, Oath, Greed, Pride, Envy, Atonement), `v5-hunter-edges` (12, `category`: assets — Arsenal, Fleet, Ordnance, Library; aptitudes — Improvised Gear, Global Access, Drone Jockey, Beast Whisperer; endowments — Sense the Unnatural, Repel the Unnatural, Thwart the Unnatural, Artifact), `v5-hunter-perks` (49, id `<edge>-<perk>`, `edge` id): Arsenal: Team Requisition, Special Features, Exotics, Untraceable; Fleet: Armor, Performance, Surveillance, Untraceable; Ordnance: Multiple Payloads, Non-Lethal Munitions, Exotics, Disguised Delivery; Library: Where They Hide, Who They Are, How to Halt Them, How to Harm Them; Improvised Gear: Frugal, Mass Production, Specialization, Speed Crafting; Global Access: Watching Big Brother, All-Access Pass, Money Tap, The Letter of the Law; Drone Jockey: Autonomous, Variants, Specialist Skill, Armaments, Payload; Beast Whisperer: Incorruptible, Menagerie, Complex Commands, Incognito; Sense the Unnatural: Creature Specialization, Range, Precision, Handsfree; Repel the Unnatural: Ward, Damage, Creature Specialization, Handsfree; Thwart the Unnatural: Creature Specialization, Ward, Recognition, Handsfree; Artifact: Empower, Attraction, Detection, Shield. Each creed, drive, and edge gets a one-line `summary` written in the project's own words (no book sentences). The name column mapping fills `entryId` from the entry id
- [x] T040 [P] [US1] Add en/ru names for all catalog entries to `translations/source/{en,ru}/data/v5-hunter.yaml` and summaries to `translations/source/{en,ru}/ui/sheet/v5-hunter.yaml` `summaries`; run `yarn build:translations`
- [x] T041 [US1] Create `src/sheet_manager/systems/v5/modules/hunter/schema.ts`: `HunterModuleShape` (concept, creed, drive, ambition, desire, redemption, creedFields, edges rows `{ id, name, entryId?, perks ≤ 10, note }` ≤ 20, despair, desperation 0–5, danger 0–5) with limits from data-model.md; `HunterSchema = z.object({ ...V5CoreShape, ...HunterModuleShape })`; `createHunterDefault()` built on `createV5CoreDefault()`; export `HunterData` (depends on T020; makes T026 schema cases pass)
- [x] T042 [P] [US1] Create `src/sheet_manager/systems/v5/ruleset/bindings.ts`: builders for core bindings per contracts/template-bindings.md — attributes (1–5, coordinate `<key>`), skills (0–5, `specialties: 'list'`, 10 × 60), `severity:health` and `severity:willpower` (severities `superficial`/`aggravated` with labels from `v5.yaml` `severities`, `escalation: 'upgrade-lowest'`, `lengthFrom` formulas, `maxLength: 15`, `bonusKey: 'bonus'`, `fullLabel` "Impaired"), `rows:advantages`, `rows:touchstones`, experience, `chronicleTenets`, `equipment`, `notes`, `biography.*`, `name`; reuse `wod-like/templateBindings.ts` helpers where the shape matches (depends on T034, T036)
- [x] T043 [US1] Create `src/sheet_manager/systems/v5/modules/hunter/bindings.ts`: `field:concept|ambition|desire|redemption|creedFields`, `field:creed`/`field:drive` with catalog suggestions (custom allowed), `rows:edges` (name column → `v5-hunter-edges` with `fills: { entryId: 'id' }`, hidden `entryId` column, `perks` tags column with `v5-hunter-perks`, `filterByColumn: 'entryId'`, `filterKey: 'edge'`), `field:despair`, `field:desperation|danger` (0–5); export `hunterTemplateBindings = [...v5CoreBindings, ...hunterBindings]` (depends on T037, T039, T042)
- [x] T044 [P] [US1] Create `src/sheet_manager/systems/v5/ruleset/templateParts.ts`: setting-neutral builders using `src/sheet_manager/templates/builders.ts` — `attributesSection()`, `skillsSection()` (3 columns, specialties as tags), `severityTracksGroup({ compact })`, `advantagesSection()`, `touchstonesSection()`, `experienceGroup()` (total, spent, formula "left"), `biographySection()`, `notesSection()`, `equipmentSection()`; stable node ids `attributes`, `skills`, `health`, `willpower`, `advantages`, `touchstones`, `experience`, `biography`, `notes`, `equipment` (docs embed them); labels from `v5.yaml`
- [x] T045 [US1] Create full view template `src/sheet_manager/systems/v5/modules/hunter/templates/sheet.ts` (`id: 'v5-hunter-sheet'`, `systemId: 'v5'`, `documentKind: 'character'`) in printed pp. 282–283 order: `identity` (name, concept, creed, drive, ambition, desire, redemption) → `attributes` → `trackers` (`health`, `willpower`, `despair`, `desperation`, `danger` with an own-words hint that the last two are cell values) → `skills` → `edges` → `advantages` → `touchstones` (+ `chronicleTenets`, `creedFields`) → `experience` → `equipment` → `notes` → `biography` (collapsed); hunter labels in `translations/source/{en,ru}/ui/sheet/v5-hunter.yaml` (depends on T043, T044; makes T028 pass)
- [x] T046 [US1] Create `src/sheet_manager/systems/v5/modules/hunter/definition.ts`: `DocumentDefinition` `hunter` (kind `character`, label descriptor "Hunter: the Reckoning 5e — Hunter", `schemaVersion: 1`, `schema: HunterSchema`, `createDefault`, identity `migrate`, `defaultViewId: 'v5-hunter-sheet'`, view `v5-hunter-sheet` "Full sheet" (brief added in T055), `module: { id: 'hunter', policies: ['dark-pack'] }`); blank name displays "New Hunter" (depends on T041)
- [x] T047 [US1] Fill `src/sheet_manager/systems/v5/index.ts`: `v5System: SystemPlugin` (`id: 'v5'`, label descriptor "World of Darkness 5th Edition", `policies: ['dark-pack']`, `documents: [hunterDefinition]`, `defaultTemplates` with `v5-hunter-sheet`, `templateBindings`, `catalogs` from hunter catalogs); register it in `src/sheet_manager/systems/index.ts` after Star Wars (depends on T045, T046)
- [x] T048 [US1] Create `src/sheet_manager/features/sheet/shell/PolicyNotice.tsx` per contracts/policy-notice.md and render it in `src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx` below the active view using `resolveDocumentPolicies`, outside the template renderer (depends on T011; makes T027 pass)
- [x] T049 [US1] Run `yarn build:translations`, `yarn lint`, `yarn test tests/sheet_manager`, then quickstart.md Scenario 1 steps 1–10 and 12 in `yarn start`; confirm `built-in-templates.test.ts` and `template-references.test.ts` cover `v5-hunter-sheet`

**Checkpoint**: MVP — a player can build and play a hunter on the full sheet

---

## Phase 4: User Story 2 — Brief hunter view for the table (Priority: P1)

**Goal**: compact at-the-table view sharing the same values

**Independent Test**: quickstart.md Scenario 1 step 11

### Tests for User Story 2

- [x] T050 [P] [US2] Create `tests/sheet_manager/systems/v5/brief-template.test.tsx`: `v5-hunter-brief` renders name, concept, creed, drive, 9 attributes, skills with value > 0 and their specialties, edges with perks, compact Health/Willpower, despair, desperation, danger; does not render biography, notes, experience
- [x] T051 [P] [US2] Add a shared-state case to `tests/sheet_manager/systems/v5/brief-template.test.tsx`: an add action in the brief's compact track updates the document so the full view renders the same box states
- [x] T052 [P] [US2] Extend `tests/sheet_manager/docs-embeds.test.tsx`: `TemplatePreview` with `hunterExampleDocument` renders the brief read-only (no enabled inputs or track buttons) and renders no `PolicyNotice` of its own

### Implementation for User Story 2

- [x] T053 [US2] Create `src/sheet_manager/systems/v5/modules/hunter/example.ts`: `LENA_VARGA_EXAMPLE` hunter document (night-shift paramedic, Faithful, Drive Atonement, attributes spread 4/3/3/3/2/2/2/2/1, Balanced skills with 2 specialties total, Edges Sense the Unnatural (Range) and Library (Where They Hide) with `entryId`s, 7 advantage points and 2 flaw points with own-invented notes, two touchstones)
- [x] T054 [US2] Extend `src/sheet_manager/docsEmbeds.tsx`: export `PolicyNotice` and `hunterExampleDocument`; pass `systemId` through `TemplatePreview`; keep existing Star Wars helpers and defaults unchanged (depends on T048, T053; makes T052 pass)
- [x] T055 [US2] Create `src/sheet_manager/systems/v5/modules/hunter/templates/brief.ts` (`id: 'v5-hunter-brief'`): header line (name, concept, creed, drive), compact attributes, compact skills with specialties, `severityTracksGroup({ compact: true })` + despair + desperation/danger, compact edges with perks; add to `defaultTemplates` in `src/sheet_manager/systems/v5/index.ts` and register view `v5-hunter-brief` "Brief" in `src/sheet_manager/systems/v5/modules/hunter/definition.ts` (depends on T047; makes T050, T051 pass)
- [x] T056 [US2] Run `yarn test tests/sheet_manager` and quickstart.md Scenario 1 step 11 manually

**Checkpoint**: US1 + US2 — table-ready sheet (slice 1 target 2026-09-20)

---

## Phase 5: User Story 3 — Export and import a hunter (Priority: P2)

**Goal**: hunter files round-trip with notices, collisions, and recovery

**Independent Test**: quickstart.md Scenario 2

### Tests for User Story 3

- [x] T057 [P] [US3] Extend `tests/sheet_manager/import-export.test.ts`: exported hunter JSON has `systemId: 'v5'`, `definitionId: 'hunter'`, file name `ttgamer_<title>.json` (blank title → `ttgamer_hunter.json`), top-level `notices` with the Dark Pack entry; re-import yields an identical document and no `notices` in the store; Star Wars export has no `notices` and still round-trips; out-of-range `strength` import fails with a user-visible alert and lands in recovery with a reported issue; id collision offers Replace/Duplicate/Cancel

### Implementation for User Story 3

- [x] T058 [US3] Extract the export object builder from `src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx` into pure `buildDocumentExport(document)` and `exportFileName(document)` in `src/sheet_manager/features/sheet/shell/documentFile.ts` (same portrait replacer), adding `notices` (`{ policy, text: officialNotice, url }`) only when `resolveDocumentPolicies` is non-empty (depends on T011)
- [x] T059 [US3] Verify `parseImportedDocument` in `src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx` ignores `notices` and shows the existing `importError` alert for hunter validation failures; fix and report through `reportSheetIssue` only if behaviour differs
- [x] T060 [US3] Run `yarn test tests/sheet_manager/import-export.test.ts` and quickstart.md Scenario 2 manually

**Checkpoint**: players can bring hunters prepared on their own devices

---

## Phase 6: User Story 4 — Re-skin the hunter sheet for a homebrew setting (Priority: P2)

**Goal**: GM copies, relabels, exports, and shares a hunter template that keeps bindings and notice

**Independent Test**: quickstart.md Scenario 3

### Tests for User Story 4

- [x] T061 [P] [US4] Extend `tests/sheet_manager/template-file.test.ts`: serializing a `systemId: 'v5'` template adds wrapper `notices`; a Star Wars template has none; import ignores `notices`; import of a template with an unregistered `systemId` is rejected with a clear error
- [x] T062 [P] [US4] Create `tests/sheet_manager/systems/v5/reskin.test.tsx`: copy `v5-hunter-sheet` via `template-editor/draft.ts`, relabel 10 nodes (Firearms → Archery, Technology → Alchemy, Creed → Oath, a severity label, …), remove `chronicleTenets`, save; applied to a hunter it shows new labels, editing "Archery" writes `skills.firearms.value`, switching back shows the same dots, perk suggestions still work after renaming an Edge label, `PolicyNotice` still renders; applying it to a Star Wars character reports `template-incompatible` and shows the localized message
- [x] T063 [P] [US4] Add to `tests/sheet_manager/default-templates.test.ts`: no shipped template id or name contains `fantasy`/`homebrew`; every shipped template's `systemId` equals its plugin id

### Implementation for User Story 4

- [x] T064 [US4] Add wrapper-level `notices` in `serializeTemplateFile` and reject unregistered `systemId` on parse in `src/sheet_manager/features/sheet/shell/templateFile.ts` using `resolveSystemPolicies` (depends on T011)
- [x] T065 [US4] Make `src/sheet_manager/features/sheet/shell/TemplateLibraryDialog.tsx` system-aware: group by plugin label + document kind, `isDefaultTemplateId` checks within the template's system, copying a shipped template keeps its `systemId`, applying an incompatible template shows the `template-incompatible` message
- [x] T066 [P] [US4] Make `createEmptyDraft` in `src/sheet_manager/components/dialogs/template-editor/draft.ts` and `src/sheet_manager/features/sheet/data/templateSkeletons.ts` take `systemId` from the current document; in `src/sheet_manager/types/template.ts` keep `star-wars-wod` as the parse default for old templates without `systemId`, but stop using it for new drafts
- [x] T067 [US4] Ensure the template editor in `src/sheet_manager/components/dialogs/template-editor/` can relabel, move, hide, and delete `severity` primitives (including severity labels), `tags` columns, and list-mode traits; option fields it cannot edit yet are shown read-only instead of failing
- [x] T068 [US4] Run `yarn test tests/sheet_manager` and quickstart.md Scenario 3 manually (including import on a fresh browser profile)

**Checkpoint**: the homebrew game can run on a re-skinned template

---

## Phase 7: User Story 6 — Learn the game and build a first hunter from the docs (Priority: P2)

**Goal**: V5 docs section with shared rules, Hunter entry page, quickstart, newcomer path, reference,
Russian mirror — page format per contracts/docs-structure.md, own words only

**Independent Test**: quickstart.md Scenario 5

**Writing rules for every task in this phase**: follow contracts/docs-structure.md "Page anatomy";
front matter `title`, `sidebar_label`, `sidebar_position`, `description`; imports only via `@site/`;
no copied book prose, tables, or art; `InlineRoll` with fixed results only; the final element is
`<PolicyNotice policy="dark-pack" />` from `@site/src/sheet_manager/docsEmbeds` (exactly one per
page; embeds add none); Lena Varga values from `example.ts`.

### Tests for User Story 6

- [x] T069 [P] [US6] Create `tests/docs/wod-v5-docs.test.ts`: for every `.mdx` under `docs/wod-v5` and `i18n/ru/docusaurus-plugin-content-docs/current/wod-v5` — non-empty `description`; contains `:::tip[In short]`; exactly one `<PolicyNotice` and it is the last JSX element; every `first-hunter` step 02–09 has a `TemplateFragment` with `systemId="v5"`; RU file set equals EN file set
- [x] T070 [P] [US6] Extend `tests/sheet_manager/docs-embeds.test.tsx` MDX scan so `TemplateFragment` `node` ids used under `docs/wod-v5` resolve in `v5-hunter-sheet`

### Implementation for User Story 6 — structure and entry

- [x] T071 [US6] Create `docs/wod-v5/index.mdx` (sidebar_position 3; what V5 is in 2 paragraphs; lines: Hunter now, Vampire later; links to `rules/` and `hunter/`) and folder index pages `docs/wod-v5/rules/index.mdx`, `docs/wod-v5/hunter/first-hunter/index.mdx` (placeholder body filled in T077), `docs/wod-v5/hunter/reference/index.mdx` with `slug: ./` and `DocCardList`; the sidebar is autogenerated, `docusaurus.config.ts` unchanged
- [x] T072 [US6] Write `docs/wod-v5/hunter/index.mdx` (START HERE): 3 short paragraphs (who hunters are, what a session looks like, what is different), three door cards (never played → `first-hunter/`, know TTRPGs → `quick-start`, running the game → `reference/` + `../rules/`), `<CreateCharacterButton systemId="v5" definitionId="hunter" />` (depends on T017)

### Implementation for User Story 6 — shared V5 rules

- [x] T073 [P] [US6] Write `docs/wod-v5/rules/dice-pools.mdx`: pools (attribute + skill), difficulty, 6+ successes, pairs of 10s as criticals, margins, Willpower rerolls, "counted by hand for now"; 2 fixed `InlineRoll` examples with Lena counted in words
- [x] T074 [P] [US6] Write `docs/wod-v5/rules/attributes-skills.mdx`: 9 attributes by what they do in play, 27 skills grouped with one-line own-words meanings, specialties (added as separate tags on the sheet), rolling without a skill; `TemplateFragment` nodes `attributes`, `skills`
- [x] T075 [P] [US6] Write `docs/wod-v5/rules/damage-willpower.mdx`: Health and Willpower length and bonus, superficial vs aggravated, how the track buttons behave when full, "+N over", impairment, recovery basics in own words; `TemplatePreview` of Lena's brief with marked damage

### Implementation for User Story 6 — quickstart and newcomer path

- [x] T076 [US6] Write `docs/wod-v5/hunter/quick-start.mdx` per contracts/docs-structure.md "Quickstart anatomy" (8 sections, 10-minute creation checklist with an own compact budget table, `TemplateFragment node="identity"`, links to each first-hunter step, dice pools, reading the sheet) (depends on T073–T075)
- [x] T077 [P] [US6] Write `docs/wod-v5/hunter/first-hunter/index.mdx` (what you'll do, ~45 min, what you need, create-hunter button) and `docs/wod-v5/hunter/first-hunter/01-what-is-a-hunter.mdx` (premise, cells, the hunt, tone; no sheet fragment; ends with a "meet Lena" teaser)
- [x] T078 [P] [US6] Write `docs/wod-v5/hunter/first-hunter/02-concept-ambition-desire.mdx` and `docs/wod-v5/hunter/first-hunter/03-creed-drive.mdx` with the newcomer step anatomy (Progress, In short, Why it matters at the table, Decide, Options at a glance from catalog names + own summaries, On your sheet `node="identity"`, Lena's choice, Common questions, Checkpoint, Next)
- [x] T079 [P] [US6] Write `docs/wod-v5/hunter/first-hunter/04-attributes.mdx` and `docs/wod-v5/hunter/first-hunter/05-skills-specialties.mdx` (own-format budget tables: attributes 4/3/3/3/2/2/2/2/1; skill spreads Jack of all trades / Balanced / Specialist; one free specialty plus automatic ones for Academics, Craft, Performance, Science; nodes `attributes`, `skills`)
- [x] T080 [P] [US6] Write `docs/wod-v5/hunter/first-hunter/06-edges-perks.mdx` and `docs/wod-v5/hunter/first-hunter/07-advantages-flaws.mdx` (2 Edges + 1 Perk or 1 Edge + 2 Perks; 7 advantage / 2 flaw points; Edge categories explained by play style; nodes `edges`, `advantages`)
- [x] T081 [P] [US6] Write `docs/wod-v5/hunter/first-hunter/08-touchstones.mdx` and `docs/wod-v5/hunter/first-hunter/09-finishing-touches.mdx` (touchstones and convictions; tracks size themselves; Desperation, Danger, Despair as cell/table values; experience, equipment, notes; nodes `touchstones`, `trackers`, `equipment`)
- [x] T082 [US6] Write `docs/wod-v5/hunter/first-hunter/10-meet-lena.mdx`: `TemplatePreview` of `hunterExampleDocument` (full and brief), recap linking each step, "what now" list (depends on T053, T054)

### Implementation for User Story 6 — reference

- [x] T083 [P] [US6] Write `docs/wod-v5/hunter/reference/reading-the-sheet.mdx` (every sheet section → one-line meaning → link) and `docs/wod-v5/hunter/reference/desperation-danger-despair.mdx` (own words; per-hunter copies until cells exist)
- [x] T084 [P] [US6] Write `docs/wod-v5/hunter/reference/creeds-drives.mdx` and `docs/wod-v5/hunter/reference/edges-perks.mdx`: names and own-words one-liners rendered from the hunter catalogs through a small generic `CatalogSummaryTable` export in `src/sheet_manager/docsEmbeds.tsx` (props: `catalogId`, optional `groupBy`, optional child catalog + `filterKey` for perks); Edges grouped by category with perk lists
- [x] T085 [P] [US6] Write `docs/wod-v5/hunter/reference/glossary.mdx`: V5/H:tR terms en ↔ ru (Creed, Drive, Edge, Perk, Desperation, Danger, Despair, Touchstone, superficial/aggravated, critical, messy critical, cell, the Reckoning) with one-line own meanings

### Implementation for User Story 6 — Russian mirror and verification

- [x] T086 [US6] Create the Russian mirror of every page from T071–T085 under `i18n/ru/docusaurus-plugin-content-docs/current/wod-v5/` with identical paths, front-matter keys, and component imports; natural Russian with the same structure; add category labels for `v5`, `v5/rules`, `v5/hunter`, `v5/hunter/first-hunter`, `v5/hunter/reference` to `i18n/ru/docusaurus-plugin-content-docs/current.json` (depends on T071–T085)
- [x] T087 [US6] Run `yarn validate:i18n`, `yarn test tests/docs tests/sheet_manager/docs-embeds.test.tsx`, `yarn build`, then quickstart.md Scenario 5 steps 1–5 in both locales

**Checkpoint**: newcomers can learn and build a hunter from the site

---

## Phase 8: User Story 5 — Ruleset ready for Vampire 5e (Priority: P3)

**Goal**: enforce the ruleset/module and generic/system boundaries so T-039 and other systems add
code only in their own folders

**Independent Test**: quickstart.md Scenario 4

- [x] T088 [P] [US5] Create `tests/sheet_manager/systems/v5/boundaries.test.ts`: files under `src/sheet_manager/systems/v5/ruleset/` contain no `hunter`, `creed`, `drive`, `edge`, `perk`, `despair`, `desperation`, `danger` identifiers; generic code under `src/sheet_manager/{components,features,store,types}` and `src/sheet_manager/systems/*.ts` contains no `'v5'`, `'hunter'`, `'superficial'`, `'aggravated'` literals; `features/sheet/data/catalogBindings.ts` imports no system folder
- [x] T089 [US5] Add a module-extension smoke test to `tests/sheet_manager/systems/v5/boundaries.test.ts`: an in-test fake `vampire` definition (`z.object({ ...V5CoreShape, hunger: z.number().int().min(0).max(5) })`, `ruleset/bindings.ts`, `ruleset/templateParts.ts`) registers in a test registry next to `hunter` without modifying ruleset files, resolves `[dark-pack]`, and renders its template
- [x] T090 [US5] Run `yarn lint` (generic import rule from T018) and `yarn test tests/sheet_manager`; confirm pre-existing Star Wars tests pass unchanged (quickstart Scenario 4)

**Checkpoint**: structure verified for T-039 and later systems

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T091 [P] Update `.agents/skills/sheet-templates/SKILL.md`: `severity` binding, trait specialties list mode, `tags` column with id filtering, rows reordering, system-aware template matching and `template-incompatible`, plugin-declared catalogs in `systems/catalogs.ts`, `PolicyNotice` outside templates, "new system" recipe (ruleset/module folders, per-system YAML and test folders), terminology: _full_/_brief_ are views, _compact_ is a primitive display mode
- [x] T092 [P] Update `.agents/skills/sheet-manager/SKILL.md` and `src/sheet_manager/AGENTS.md`: V5 plugin layout, hunter schema and limits, `DocumentDefinition.module` and descriptor labels, policies metadata, `systemId` semantics until T-041 (research D1), view-id prefix convention until T-046, new atoms `SeverityBox`, `TrackActionButton`, `TagListInput` and molecule `SeverityTrack` in "Composition Scale"
- [x] T093 [P] Update root `AGENTS.md` (module boundaries section): generic ESLint rule against concrete system imports, plugin-declared catalogs and policies, notices rendered from policy metadata
- [x] T094 [P] Update `.agents/skills/mdx-documentation/SKILL.md` with the V5 docs page format (In short, newcomer step anatomy, one `PolicyNotice` footer, required `description`) marked as the candidate format for a future Star Wars docs rework
- [x] T095 [P] Add banners: at the top of `specs/003-custom-sheet-templates/spec.md` and `specs/007-entity-sheet-templates/spec.md` a "Partly superseded by 008 (system-aware template matching, registry-driven creation, plugin-declared catalogs); current behaviour: `.agents/skills/sheet-templates/SKILL.md`" note; at the top of `specs/008-hunter-v5-character/spec.md` the change-record banner in the style of spec 007 and `**Status**: Implemented (v3.6.0)`
- [x] T096 [P] Update `TODO.md`: T-038 status and sub-notes (remove "H:tR documentation pages" from its out-of-scope line); new entries T-046 "Composite template keys" (`systemId:viewId` for default overrides and default lookups with a `templateStore` migration; dependency none; roadmap path `multi-system-sheets`) and T-047 "Star Wars docs in the V5 page format" (dependency T-038); update `ROADMAP.md` `multi-system-sheets` scope (Hunter 5e usable); run `yarn validate:backlog`
- [x] T097 [P] Bump `package.json` version to 3.6.0 and add a `CHANGELOG.md` entry (V5 ruleset, Hunter 5e sheet, severity tracks, tags column, list specialties, plugin catalogs, publisher notices, V5/Hunter docs)
- [x] T098 Own-words audit: compare catalog summaries in `src/sheet_manager/systems/v5/modules/hunter/catalogs.ts`, strings in `translations/source/{en,ru}/ui/sheet/v5-hunter.yaml`, and every page under `docs/wod-v5/` with the book (sheet pp. 282–283, creation pp. 54–61, Edges pp. 90–100, cells pp. 125–127); rewrite any sentence that follows book wording
- [x] T099 Check whether the Dark Pack Agreement requires the Dark Pack logo on the site; if yes, add a note under T-037 in `TODO.md` (logo assets are T-037 scope)
- [x] T100 Run `yarn prettier --write` on changed files, `yarn validate:data`, `yarn validate:i18n`, `yarn audit:dead-code` (review only), and `yarn verify:full`
- [x] T101 Run the full quickstart.md (Scenarios 1–6), including the SC-009 hallway test when a newcomer is available, and record results at the bottom of `specs/008-hunter-v5-character/quickstart.md` — done 2026-09-23; the SC-009 hallway test moved to backlog T-053 (onboarding)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories
- **US1 (Phase 3)** depends on Phase 2 only — MVP
- **US2 (Phase 4)** depends on US1 (plugin, template parts, PolicyNotice)
- **US3 (Phase 5)** depends on Phase 2 (policies) and US1 (hunter definition); independent of US2
- **US4 (Phase 6)** depends on US1 (shipped template to copy); independent of US2/US3
- **US6 (Phase 7)** depends on US1 node ids and US2 example/`TemplatePreview`; T073–T075 can start after US1
- **US5 (Phase 8)** depends on US1; can run any time after it
- **Polish (Phase 9)** after the shipped stories

### Within Each User Story

- Tests first and failing, then pure logic, atoms, molecules, bindings, templates, registration
- `yarn build:translations` after each YAML change before running tests

### Parallel Opportunities

- Phase 1: T002, T003, T004
- Phase 2: tests T005–T008; T017, T018, T019 alongside T009–T016
- US1: tests T022–T028; logic and atoms T029–T032; module data and builders T039, T040, T042, T044
- US2: T050–T052
- US4: T061–T063; T066 alongside T064/T065
- US6: T073–T075, then T077–T081 and T083–T085
- Polish: T091–T097

---

## Parallel Example: User Story 1

```text
# Tests (fail first)
T022 severity-track.test.ts   T023 severity-track.test.tsx   T024 tags-column.test.tsx
T025 trait-specialties.test.tsx   T026 systems/v5/hunter-schema.test.ts
T027 policy-notice.test.tsx   T028 systems/v5/sheet-coverage.test.ts

# Generic logic and atoms
T029 severityTrack.ts   T030 SeverityBox.tsx   T031 TrackActionButton.tsx   T032 TagListInput.tsx

# Module data and builders
T039 hunter/catalogs.ts   T040 v5-hunter.yaml   T042 ruleset/bindings.ts   T044 ruleset/templateParts.ts
```

---

## Implementation Strategy

### MVP First (US1 + US2, slice 1 — target 2026-09-20)

1. Phase 1 + Phase 2
2. Phase 3 (US1) → validate Scenario 1
3. Phase 4 (US2) → validate the brief view
4. Deploy: the table can play

### Incremental Delivery

1. Slice 2: US3 (export) → US4 (re-skin) → US6 T071–T076 (entry, rules, quickstart in English)
2. Slice 3 (target 2026-09-29): US6 T077–T087 (newcomer path, reference, Russian mirror) → US5 → Polish
3. Each slice ends with `yarn verify` (Tier 2) and its quickstart scenarios; the last with `yarn verify:full`

---

## Notes

- [P] tasks touch different files and have no unfinished dependencies
- Commit after each task or logical group; no attribution lines in commits
- Never copy book text; names only (Principle VIII)
- Any fallback, rejected write, or unresolved reference must call `reportSheetIssue`
