# Tasks: V5 dice pools and precise notation errors

**Input**: Design documents from `specs/011-v5-dice-pools/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: included. Constitution V requires exhaustive unit tests for `dice-logic`,
contract tests for `integrations/`, and store/component tests for user-visible flows;
the spec's success criteria (SC-001, SC-003, SC-004, SC-005) are test-defined.

**Organization**: grouped by user story (US1–US4 from spec.md). Paths are repo-relative.
Load `.agents/skills/dice-logic/SKILL.md` before any `dice-logic` task, `.agents/skills/sheet-manager/SKILL.md`
and `.agents/skills/sheet-templates/SKILL.md` before sheet tasks, `.agents/skills/ui-i18n/SKILL.md`
before translation tasks, and `.agents/skills/typescript/SKILL.md` before writing `.ts`/`.tsx`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 for story phases; none for setup, foundational, and polish

---

## Phase 1: Setup

**Purpose**: backlog status and a shared test helper the dice tests will reuse.

- [x] T001 Mark T-045 as in progress (`[ ] 🟡`) in `TODO.md` and rows #3 and #15 as 🟡 in `src/dice_roller/TODO.md`; run `yarn validate:backlog`
- [x] T002 [P] Create `tests/dice_roller/helpers.ts` exporting `mockRandom(...values)` (d-face values → `Math.random` sequence, as in `tests/dice_roller/evaluator/reroll.test.ts`) and `evaluateWithValues(notation, groups)` (pre-generated rolls keyed with `buildGroupKey` from `src/dice_roller/dice-logic/utils.ts`, replacing the hand-written key format in `tests/dice_roller/evaluator/modifiers.test.ts`); do not change existing tests' expectations

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: structured errors, the roll-origin/reader hook, persisted settings, and the
plugin dice contract. Every story depends on this phase.

**⚠️ No user-story work starts before this phase is complete.**

### Structured notation errors (contracts/notation-diagnostics.md)

- [x] T003 Add `NotationErrorKind`, `LimitName`, `NotationDiagnostic`, and `class NotationError extends Error { diagnostic }` to `src/dice_roller/dice-logic/errors.ts` (kinds and fields exactly as in `contracts/notation-diagnostics.md`)
- [x] T004 Keep moo's `offset` on `LexerToken` and set the synthetic END token's offset to `input.length` in `src/dice_roller/dice-logic/dice-lexer.ts`; throw `NotationError` (`unknown-character`, `limit-exceeded` with `custom-faces`) instead of `SyntaxError`/`RangeError`
- [x] T005 Convert every throw in `src/dice_roller/dice-logic/dice-parser.ts` to `NotationError`: `TokenStream.error()` builds `{ kind, offset, length, found, expected }` from the token (no line/column text in the message); map `Expected …`→`unexpected-token`, `Unexpected end of input`→`unexpected-end`, comparison without number→`missing-compare-value`, missing `)`→`unclosed-group` spanning the `(`, trailing tokens→`trailing-input`, and all limits (`MAX_NOTATION_LENGTH`, `MAX_NUMERIC_LITERAL`, `parseModifierValue`, per-group count/sides, `MAX_AST_NODES`, total dice) → `limit-exceeded` with `limit: { name, max }`; `validateNotation` keeps returning a boolean
- [x] T006 [P] Update message-regex assertions in `tests/dice_roller/parser/limits.test.ts` and `tests/dice_roller/logic/errors.test.ts` to assert `diagnostic.kind` and `diagnostic.limit` instead of English message text; all other existing tests pass unchanged (`yarn test tests/dice_roller`)

### Roll origin and reader hook (contracts/roll-reading.md)

- [x] T007 [P] Create `src/dice_roller/utils/rollReader.ts` with `RollSource`, `RollOrigin`, `RollOutcome`, `RollReadingSummary`, `RollReader` (`prepare`, `interpret`), and `registerRollReader(reader) → unregister` / `getRollReader()` (single slot; registering replaces), shapes per `data-model.md`
- [x] T008 Add `origin?: RollOrigin` to `RollOptions` in `src/dice_roller/utils/events.ts`, and `origin?`, `reading?: RollReadingSummary` to `RollResult` in `src/dice_roller/dice-logic/types.ts` (optional, additive); `handleRollEvent` copies `origin` onto the result before `notifyRollResult`

### Persisted settings and panel tab (research R9)

- [x] T009 Add `specialDiceColor`, `wodMode`, `v5Line`, `v5CriticalPairs`, `v5SpecialOutcomes`, `v5Difficulty` with the defaults from `data-model.md` to `DEFAULT_SETTINGS` and `SETTINGS_METADATA` in `src/dice_roller/utils/constants.ts`, and to `DiceRollerSettings` in `src/dice_roller/store/diceRollerStore.ts`
- [x] T010 In `src/dice_roller/store/diceRollerStore.ts`: add persisted `panelTab: 'standard' | 'dnd' | 'wod' | ''` (default `''`) with `setPanelTab`, set `persist` `version: 1` with a `migrate` and a `merge` that spreads stored `settings` over `DEFAULT_SETTINGS` (missing keys → defaults, unknown keys dropped), and add `panelTab` to `partialize`
- [x] T011 In `roll()` of `src/dice_roller/store/diceRollerStore.ts`: when `rollOptions.origin` is set and a reader is registered, call `reader.prepare(notation, origin, settings)` before rolling and `reader.interpret(result, context)` after, attaching `reading` to the result before it is emitted; any reader exception is logged through `src/shared/utils/logging` and the roll proceeds unread (no reader → unchanged behaviour)
- [x] T012 Replace the local `useState('standard')` tab in `src/dice_roller/components/dice_pool/DicePool.tsx` with the store's `panelTab`/`setPanelTab` (clicking the active tab still selects `''`)
- [x] T013 [P] Create `tests/dice_roller/store/dice-roller-store.test.ts`: settings merge (stored v0 settings without the new keys get defaults; unknown keys dropped), `panelTab` defaults to `''` and persists, reader `prepare`/`interpret` called with the origin, reader throw → roll still emitted without `reading`, no reader → identical result
- [x] T014 [P] Extend `tests/dice_roller/utils/constants.test.ts` for the new settings keys and metadata types

### Plugin dice contract (data-model: SystemDiceRules)

- [x] T015 Add `SystemDiceRules`, `RollReadingRules`, and optional `dice?: SystemDiceRules` on `SystemPlugin` in `src/sheet_manager/systems/types.ts`; outcome/line descriptors use `UiMessageDescriptor`; `interpret` takes a neutral result shape (`diceGroups`, `total`, `setBonus`) imported as a type from `src/dice_roller/dice-logic` (public barrel) so systems depend only on the dice public API

**Checkpoint**: `yarn verify:fast` and `yarn test tests/dice_roller` green; no behaviour change visible to users yet.

---

## Phase 3: User Story 1 — Criticals are counted for me (Priority: P1) 🎯 MVP

**Goal**: the set bonus exists in the notation, and a roll from the WoD tab in V5 mode
counts pairs of 10s as criticals when the setting is on.

**Independent test**: WoD tab in V5 mode, `6d10@6,7,10,10,4,2>=6` → 6 successes with the
pair marked; setting off → 4; `6d10@6,7,10,10,4,2>=6x2=10` typed in the Standard tab → 6
(quickstart scenarios 1–3).

### Tests for User Story 1

- [x] T016 [P] [US1] Create `tests/dice_roller/parser/set-bonus.test.ts`: `x2=10`, `x3.1>=5`, term scope (`6d10>=6x2=10`) and group scope (`(4d10+2d10)>=6x2=10` stored on the group, not distributed), compare point never becomes a target, second `x` in one scope → `unexpected-token`, `3d6x3=6` → `set-bonus-needs-target`, `x1=10` and `x2.0=10` → `invalid-set-size`
- [x] T017 [P] [US1] Create `tests/dice_roller/evaluator/set-bonus.test.ts` (using `tests/dice_roller/helpers.ts`): every row of the examples table in `contracts/notation-grammar.md`, 0–4 tens, dropped dice never form sets, interaction with `f=1`, with keep/drop, with explosions, with pre-generated 3D values, `setIndex` marks and `RollResult.setBonus`, `formatted`/`details` show the trailing `x`

### Implementation for User Story 1

- [x] T018 [US1] Add a `MOD_SET` token `/x\d+(?:\.\d+)?/` to `src/dice_roller/dice-logic/dice-lexer.ts` and `SetBonus`, `DiceModifiers.setBonus`, `ParenthesizedNode.poolModifiers`, `DiceRoll.setIndex`, `FullRollResult.setBonus` to `src/dice_roller/dice-logic/types.ts`
- [x] T019 [US1] Parse the set bonus in `src/dice_roller/dice-logic/dice-parser.ts`: in `tryParseOneModifier` read N/K and its own compare point (like `cs`); in `parseGroupModifiers` keep it in `poolModifiers` and exclude it from `distributeModifiersToDiceGroups`/`mergeModifiers`; post-parse check `set-bonus-needs-target` (term's own target, or the group's distributed target) with the modifier's span
- [x] T020 [US1] Evaluate the set bonus in `src/dice_roller/dice-logic/dice-evaluator.ts`: a shared `applySetBonus(keptRolls, bonus)` pass (roll order, `floor(matches / N)` sets, mark `setIndex`, return added successes); term scope after criticalFailure and before sort; pool scope in the `Parenthesized` branch over all inner kept dice, added to the group value; collect `setBonus` entries on the full result
- [x] T021 [US1] Emit `xN[.K]cp` in `formatModifiers` and the trailing `x` marker for set members in `formatRollValues` (both modes) in `src/dice_roller/dice-logic/utils.ts`, including pool-scope modifiers in `formatASTWithValues`
- [x] T022 [P] [US1] Create `src/sheet_manager/systems/v5/ruleset/dice.ts` with the V5 reading's `id: 'v5'`, `lines` (hunger, desperation with `uiMessages.sheet.v5.dice.lines.*`), and `prepare(notation, { criticalPairs })`: for a success-count pool add `x2=10` at pool scope (single term → term scope; several terms → wrap in parentheses and move the shared target onto the group); non-success-count notation returned unchanged with a flag that no reading applies; idempotent — a pool that already carries a set bonus is returned unchanged; declare `dice: { reading }` in `src/sheet_manager/systems/v5/index.ts` (trait pool comes in US3)
- [x] T023 [US1] Create `src/integrations/roll-reading/index.ts` with `createRollReader()` implementing `RollReader` for the panel origin `tab === 'wod' && wod.mode === 'v5'` only (finds the reading as the registered plugin whose `dice.reading.id === 'v5'` in `systemRegistry` from `src/sheet_manager/systems` — no system id hard-coded, calls `prepare` with `settings.v5CriticalPairs`, records `reading` with the tab's line; `interpret` returns no outcomes yet); register it in `src/theme/Root.tsx` next to `DiscordWebhookSubscription` (register on mount, unregister on unmount)
- [x] T024 [US1] Pass `origin: { kind: 'panel', control, tab: panelTab, wod }` from `src/dice_roller/components/dice_pool/RollControls.tsx` (`'roll-button'`), `src/dice_roller/components/dice_pool/NotationInput.tsx` (`'enter'`), `src/components/NavbarDiceRoller.tsx` (`'header'`), and the right-click re-roll in `src/dice_roller/components/RollHistory.tsx` (`'history'`); build `wod` from settings via one helper `buildPanelOrigin(control)` in `src/dice_roller/utils/rollReader.ts`
- [x] T025 [US1] Add the Classic / V5 mode switch to `src/dice_roller/components/dice_pool/DiceTabWod.tsx` (radio group bound to `settings.wodMode`): Classic keeps today's difficulty, d10, botch, and d6 buttons unchanged; V5 shows a V5 die button (`d10>=6`) and a "critical pairs" checkbox bound to `v5CriticalPairs` (checkbox markup as in `DiceRollerSettingsModal.tsx`)
- [x] T026 [P] [US1] Add en/ru strings: WoD mode labels and critical pairs in `translations/source/{en,ru}/ui/dice/pool.yaml`; V5 line names in `translations/source/{en,ru}/ui/sheet/v5.yaml` (Desperation reuses the glossary's «Безысходность»; add Hunger to `translations/glossary/v5.yaml` and «critical» wording consistent with `translations/glossary/v5.yaml`); run `yarn build:translations`
- [x] T027 [P] [US1] Create `tests/dice_roller/components/dice-tab-wod.test.tsx`: Classic mode renders today's controls and builds the same notations; V5 mode renders the V5 die and the critical-pairs toggle; the mode persists through the store
- [x] T028 [US1] Create `tests/integrations/roll-reading.test.ts` (first cases): WoD V5 panel roll gets `x2=10` added and `reading` recorded; re-rolling a recorded `…x2=10` notation in V5 mode rolls without error and adds no second bonus; critical pairs off → notation unchanged, reading recorded without bonus; WoD Classic, Standard, D&D → no reading

**Checkpoint**: US1 independently testable (quickstart 1–3).

---

## Phase 4: User Story 2 — Hunger and Desperation dice (Priority: P1)

**Goal**: labelled dice, their colour and text marker, the V5 outcomes, and the WoD tab
controls for them.

**Independent test**: quickstart scenarios 4–6 (Desperation price of a 1, Hunger messy
critical / bestial failure with and without Difficulty, special colour in 3D and history,
Discord text).

### Tests for User Story 2

- [x] T029 [P] [US2] Create `tests/dice_roller/parser/label.test.ts`: `2d10:h`, `2d10:h@10,4>=6`, `d10:hk`, `2d10:hd1`, `(3d10+2d10:h)>=6f=1` parse with `label: 'h'`; `2d10>=6:h`, `(2d10):h`, `5:h` → `label-position` with the `:h` span
- [x] T030 [P] [US2] Create `tests/dice_roller/evaluator/label.test.ts` (and add one case to `tests/dice_roller/components/inline-roll.test.tsx` rolling `(2d10@10,3+1d10:h@10)>=6x2=10` to cover FR-003 for docs inline rolls): label copied to every `DiceRoll` incl. explosions/rerolls and pre-generated values, `DiceGroupResult.label`, `formatted` re-emits `:h`, values unchanged by the label
- [x] T031 [P] [US2] Extend `tests/dice_roller/logic/notation-utils.test.ts`: `handleDiceNotation`/`mergeDiceNotation` keep `d10` and `d10:h` as separate parts, never drop a labelled part, and `rewriteWodDifficulty` rewrites `d10:h>=N`; existing cases unchanged
- [x] T032 [P] [US2] Create `tests/sheet_manager/systems/v5-dice-reading.test.ts`: `interpret` over fixed results for every row of the V5 outcome table in `data-model.md` (both lines, known and unknown Difficulty, outcomes off → none), matching SC-001's 0–4 tens × 0–3 special dice matrix
- [x] T033 [P] [US2] Extend `tests/dice_roller/integration/roll-orchestrator.test.ts`: labelled groups get `specialDiceColor` geometries, explosions of labelled dice keep it, unlabelled keep the primary colour

### Implementation for User Story 2

- [x] T034 [US2] Add the `LABEL` token `':h'` to `src/dice_roller/dice-logic/dice-lexer.ts` and `label?: 'h'` to `DiceGroupNode`, `DiceRoll`, `DiceGroupResult` in `src/dice_roller/dice-logic/types.ts`
- [x] T035 [US2] Accept `LABEL` in `parseDiceGroup` of `src/dice_roller/dice-logic/dice-parser.ts` only directly after the DICE token; anywhere else (after modifiers, after `)`, after a number) throw `label-position`
- [x] T036 [US2] Propagate the label in `src/dice_roller/dice-logic/dice-evaluator.ts` to every die of the term (initial, exploded, rerolled, pre-generated) and to `DiceGroupResult`; emit `:h` in `formatModifiers` in `src/dice_roller/dice-logic/utils.ts`
- [x] T037 [US2] Update `src/dice_roller/dice-logic/notation-utils.ts`: part key = sides + label in `findLastMatch`, `handleDiceNotation`, `mergeIntoGroup`, `mergeDiceNotation`; `rewriteWodDifficulty` accepts `d10:h>=N`; a V5 pool with two terms is kept as `(Nd10+Md10:h)>=6`
- [x] T038 [US2] Per-group colour in 3D: optional `diceColor` on `DiceGroup` in `src/dice_roller/dice-logic/types.ts`, read in the loop of `prepareDiceGeometries` in `src/dice_roller/dice-logic/renderer/factory.ts`; in `src/dice_roller/dice-logic/roll-orchestrator.ts` set it for labelled `flatGroups` from a new `MixedRollConfig.specialDiceColor` (`src/dice_roller/utils/types-ext.ts`) and pass the group colour into `processExplosionLoop`; the store passes `settings.specialDiceColor`
- [x] T039 [US2] Implement `interpret(result, { line, outcomes, difficulty })` in `src/sheet_manager/systems/v5/ruleset/dice.ts` per the outcome table in `data-model.md` (price of a 1 for Desperation; messy critical and bestial failure for Hunger; conditional forms when Difficulty is `null`); outcome titles/details as `uiMessages.sheet.v5.dice.outcomes.*` descriptors, written in our own words
- [x] T040 [US2] Extend `src/integrations/roll-reading/index.ts`: pass `v5SpecialOutcomes` and `v5Difficulty` (tab origin) into `interpret`, fill `RollReadingSummary` (`readingId`, `line`, `lineLabel`, `difficulty`, `outcomes`)
- [x] T041 [US2] Extend `src/dice_roller/components/dice_pool/DiceTabWod.tsx` V5 mode: special-die button (`d10:h`, drawn in `specialDiceColor`, add on click / remove on right-click via `handleDiceNotation`), line choice (Hunger — VtM 5e / Desperation — H:tR 5e, labels from `uiMessages.sheet.v5.dice.lines.*`) bound to `v5Line`, optional Difficulty stepper with a "not set" state bound to `v5Difficulty`, and a "special-dice outcomes" checkbox bound to `v5SpecialOutcomes`
- [x] T042 [US2] Add a `specialDiceColor` colour input next to the existing two in `src/dice_roller/components/DiceRollerSettingsModal.tsx`; default `#8B0000` (T009) — assert in `tests/dice_roller/utils/constants.test.ts` that it gives ≥ 4.5:1 with the default text colour and ≥ 3:1 against the default primary colour (FR-006)
- [x] T043 [US2] Render readings and labels in `src/dice_roller/components/RollHistory.tsx`: labelled values in `details` shown in `specialDiceColor` with the `:h` marker and a visually hidden "special dice" label; an outcome block (line name, each outcome title and detail, conditional wording) under the roll; no outcome block when `reading` is absent or has no outcomes
- [x] T044 [P] [US2] Show the first outcome title under `notation = total` in `src/dice_roller/components/RollToastContent.tsx`
- [x] T045 [US2] Discord text: extend `buildDiscordHistoryMessage` in `src/integrations/discord/webhook.ts` to accept optional translated labels (line name, outcome lines) and prefix labelled values with the line name (or "special"); pass translated strings from `src/dice_roller/components/DiscordWebhookSubscription.tsx`; when `includeRollContext` is off (details and formatted blanked) still add one text line listing the labelled values with the line name, and the outcome lines; extend `tests/integrations/discord-webhook.test.ts` (outcome lines, escaping, context off still names the special dice, no reading → unchanged message)
- [x] T046 [P] [US2] Add en/ru strings: special die, the "Line" label, Difficulty (not set), outcomes toggle in `translations/source/{en,ru}/ui/dice/pool.yaml` (line names themselves come only from `ui/sheet/v5.yaml`, added in T026, and the tab shows them through the same descriptors); special dice colour in `translations/source/{en,ru}/ui/dice/settings.yaml`; outcome block and "special dice" label in `translations/source/{en,ru}/ui/dice/history.yaml`; outcome titles/details in `translations/source/{en,ru}/ui/sheet/v5.yaml`; add Hunger, messy critical, bestial failure to `translations/glossary/v5.yaml` and Overreach/Despair choice wording to `translations/glossary/v5-hunter.yaml`; run `yarn build:translations`
- [x] T047 [P] [US2] Create `tests/dice_roller/components/roll-history.test.tsx`: labelled values rendered with the marker and accessible label, outcome block for each outcome kind, conditional wording, no block without a reading

**Checkpoint**: US1 + US2 testable from the WoD tab (quickstart 1–6).

---

## Phase 5: User Story 3 — The settings apply only where V5 applies (Priority: P2)

**Goal**: sheets build their own pools, rolls carry their source, and the reading applies
in exactly the three contexts of FR-013.

**Independent test**: the ten contexts of quickstart scenario 7, plus scenarios 8–9.

### Tests for User Story 3

- [x] T048 [P] [US3] Create `tests/sheet_manager/systems/dice-rules.test.ts`: classic pool (`systems/wod-like/dicePool.ts`) reproduces today's `buildDiceNotation` outputs for every flag combination; V5 `traitPool` gives `Nd10>=6` (no `f=1`, no `!`, no specialty die) and `undefined` for 0; Star Wars and V5 plugins declare them
- [x] T049 [P] [US3] Create `tests/integrations/sheet-dice.test.ts`: `queueNotation` stores the roll source next to the character name; `rollImmediately` passes `origin: { kind: 'sheet', source }`; clear button, history re-seed, and erasing the input by hand clear the source (queue a hunter stat, erase, type `3d10>=6` with no tab → no reading); the shown-document store is set on publish and `null` after unmount

### Implementation for User Story 3

- [x] T050 [P] [US3] Move `buildDiceNotation` from `src/shared/utils/diceNotation.ts` to `src/sheet_manager/systems/wod-like/dicePool.ts` (export `classicWodTraitPool`), re-export from `src/sheet_manager/systems/wod-like/index.ts`, declare `dice: { traitPool: classicWodTraitPool }` in `src/sheet_manager/systems/star-wars-wod/index.ts`, and delete `src/shared/utils/diceNotation.ts`
- [x] T051 [US3] Add `traitPool` (`${value}d10>=6`, `undefined` when value ≤ 0) and `lineFor(definitionId)` (`hunter` → `desperation`) to `src/sheet_manager/systems/v5/ruleset/dice.ts` and declare it on the V5 plugin
- [x] T052 [US3] In `src/sheet_manager/features/sheet/declarative/primitives.tsx`, replace the three `buildDiceNotation` uses (lines ~236, ~677, ~709) with the plugin's `dice?.traitPool`, resolved once per render through `useDocumentSource().document.systemId` and `systemRegistry.getSystem`; no `dice` → no `onDiceRoll` (no dice button); pass `rollSource: { systemId, definitionId }` down to `StatDot` through `TraitRow`/`TraitRowWithInput` (`src/sheet_manager/components/stat-fields/`)
- [x] T053 [US3] Add `dice_roller_roll_source` get/set/clear to `src/dice_roller/utils/sessionStorage.ts`; clear it wherever the character name is cleared (`RollControls.clearNotation`, `RollHistory` re-seed paths) and also whenever `setNotationInput` in `src/dice_roller/store/diceRollerStore.ts` sets an empty input (manual erase, header right-click in `src/components/NavbarDiceRoller.tsx`, after a roll); consume it in the store's `roll()` into `origin.source` for panel origins. Stat labels keep their current behaviour (F-006 stays a separate defect)
- [x] T054 [US3] Extend `src/integrations/sheet-dice/useSheetDiceActions.ts` with `rollSource`: `queueNotation` stores it in session storage; `rollImmediately` passes `origin: { kind: 'sheet', source }`; update `src/sheet_manager/components/stat-fields/StatDot.tsx` to pass it through
- [x] T055 [US3] Create `src/integrations/sheet-dice/shownDocument.ts` (non-persisted Zustand store `{ source: RollSource | null }` with `useShownDocumentPublisher(source)` that sets on mount/change and clears on unmount); call the publisher in `src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx` with the current document's `systemId`/`definitionId`
- [x] T056 [US3] Complete the applicability table in `src/integrations/roll-reading/index.ts` per `contracts/roll-reading.md`: `sheet` origins by the source's plugin `dice.reading` and `lineFor`; panel origins with `tab === ''` by `origin.source`, else the shown document; unknown systems → no source; Difficulty `null` for sheet and no-tab origins
- [x] T057 [US3] Extend `tests/integrations/roll-reading.test.ts` to all ten contexts of spec US3 (SC-003: reading in exactly three), including the header-button path and the history re-roll, plus reader failure → unread roll
- [x] T058 [P] [US3] Create `tests/dice_roller/components/dice-pool.test.tsx`: first render has no tab selected; selecting WoD, switching to V5, and changing the line survive a store rehydrate

**Checkpoint**: US1–US3 complete; quickstart 1–9 pass.

---

## Phase 6: User Story 4 — Notation errors point at the mistake (Priority: P3)

**Goal**: `diagnoseNotation` and a precise, translated, accessible error in the input.

**Independent test**: quickstart scenario 10; SC-005 with ≥ 20 invalid notations.

### Tests for User Story 4

- [x] T059 [P] [US4] Create `tests/dice_roller/logic/diagnostics.test.ts`: at least 20 invalid notations covering every kind in `contracts/notation-diagnostics.md` with exact `offset`/`length`/`expected`/`limit`, including end-of-input, `2d10@1` (`forced-values-count`), label and set-bonus kinds; `diagnoseNotation` returns `null` for every valid notation used in existing tests
- [x] T060 [P] [US4] Create `tests/dice_roller/components/notation-input.test.tsx`: debounced diagnostic message per kind, span highlight position, `aria-invalid`/`aria-describedby`, live region text changes only when the diagnostic changes

### Implementation for User Story 4

- [x] T061 [US4] Validate forced-value counts at parse time in `src/dice_roller/dice-logic/dice-parser.ts` (`forced-values-count` spanning the `@…` list; the evaluator's runtime check stays as a guard)
- [x] T062 [US4] Add `diagnoseNotation(notation): NotationDiagnostic | null` to `src/dice_roller/dice-logic/dice-parser.ts` and export it with `NotationDiagnostic`/`NotationErrorKind` types from `src/dice_roller/dice-logic/index.ts` (deliberate barrel widening, noted in `src/dice_roller/AGENTS.md` in T066)
- [x] T063 [US4] Update `src/dice_roller/components/dice_pool/NotationInput.tsx`: use `diagnoseNotation` on the debounced input, show the translated message for the kind, overlay-highlight `offset..offset+length` aligned with the input text, set `aria-invalid` and `aria-describedby`, put the message in a polite live region updated only when the diagnostic changes (keep the existing ✓/✗ glyph and docs link)
- [x] T064 [P] [US4] Add `dice.pool.notation.errors.<kind>` messages with `{found}`, `{expected}`, `{max}` placeholders and limit names in `translations/source/{en,ru}/ui/dice/pool.yaml`; run `yarn build:translations` and `yarn i18n:verify`

**Checkpoint**: all four stories complete.

---

## Phase 7: Polish & cross-cutting

- [x] T065 [P] Update `docs/wod-v5/rules/dice-pools.mdx` and `i18n/ru/docusaurus-plugin-content-docs/current/wod-v5/rules/dice-pools.mdx`: replace the "counted by hand for now" note with the automatic counting (critical pairs, Desperation/Hunger dice via `:h`, the WoD tab's V5 mode and settings), keep the example roll; update `docs/wod-v5/hunter/reference/desperation-danger-despair.mdx` and its ru mirror to mention rolling Desperation dice from the panel; run `yarn validate:i18n`
- [x] T066 [P] Update current-state docs: `.agents/skills/dice-logic/SKILL.md` (modifier order with the set pass, label, diagnostics, public API), `.agents/skills/dice-logic/references/modifiers.md` (label, set bonus sections), `src/dice_roller/AGENTS.md` (runtime flow with origin → reader, persisted `panelTab`, store version, widened barrel), `src/dice_roller/utils` limits note if changed
- [x] T067 [P] Update `.agents/skills/sheet-manager/SKILL.md` and `src/sheet_manager/AGENTS.md` with `SystemPlugin.dice` (traitPool, reading), the shown-document publisher, and the removal of `shared/utils/diceNotation.ts`; add `src/integrations/roll-reading/` to the project structure in `AGENTS.md` §6
- [x] T068 [P] Search `specs/*/` for descriptions this feature supersedes (`buildDiceNotation`, `shared/utils/diceNotation.ts`, the WoD tab's controls, "criticals counted by hand") and add a historical banner pointing at `src/dice_roller/AGENTS.md` to each superseded spec; leave unaffected specs untouched
- [x] T069 Bump `package.json` to 3.9.0 and add the `## v3.9.0` entry at the top of `CHANGELOG.md` (V5 dice pools, set bonus and label notation, notation diagnostics, V5 sheet pools, persisted dice tab); run `yarn check:version`
- [x] T070 Update backlog: T-045 `[x] ✅` with a dated note in `TODO.md`; rows #3 and #15 ✅ in `src/dice_roller/TODO.md`; run `yarn validate:backlog`
- [x] T071 Run `yarn verify:full` (docs paths and dependencies of the build change) and fix findings; knip must report no unused exports from the new files
- [x] T072 Walk `specs/011-v5-dice-pools/quickstart.md` scenarios 1–10 (time scenario 4's pool build and roll for SC-002: under 10 s without typing) on the running dev server (`http://localhost:3000/`, check it is up before starting one) and record results in the spec checklist notes

---

## Dependencies & execution order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after Setup; blocks all stories.
- **US1 (Phase 3)**: after Foundational.
- **US2 (Phase 4)**: after Foundational. Its reading tasks (T039–T040) extend files created in US1 (T022, T023); the label work (T034–T038) is independent of US1.
- **US3 (Phase 5)**: after US1 (T022, T023 exist) and US2's `interpret` (T039) for the outcome parts of the ten-context test; the sheet pool work (T048, T050–T052) can start right after Foundational.
- **US4 (Phase 6)**: after Foundational (T003–T006); independent of US1–US3 except that its test matrix includes the label and set-bonus kinds (after T019, T035).
- **Polish (Phase 7)**: after the stories it documents.

### Within stories

- Tests are written first and fail before implementation.
- `dice-logic` order: lexer → types → parser → evaluator → formatting → notation helpers.
- Rules (`systems/v5/ruleset/dice.ts`) before the integration that calls them; the integration before the UI that exposes its settings.

### Parallel opportunities

- T002 with T001; T006, T007 with the parser conversion once T003 exists; T013, T014 together.
- US1: T016, T017 together; T022, T026, T027 in parallel with the dice-logic tasks T018–T021.
- US2: T029–T033 together; T042, T044, T046, T047 in parallel after T034–T036.
- US3: T048, T049, T050 together; T058 anytime after T012.
- US4: T059, T060, T064 together.
- Polish: T065–T068 together.

## Parallel example: User Story 1

```text
Task: "T016 [US1] parser tests in tests/dice_roller/parser/set-bonus.test.ts"
Task: "T017 [US1] evaluator tests in tests/dice_roller/evaluator/set-bonus.test.ts"
Task: "T022 [US1] V5 prepare in src/sheet_manager/systems/v5/ruleset/dice.ts"
Task: "T026 [US1] mode and critical-pairs strings in translations/source/{en,ru}/ui/dice/pool.yaml"
```

## Parallel example: User Story 2

```text
Task: "T029 [US2] label parser tests"
Task: "T030 [US2] label evaluator tests"
Task: "T032 [US2] V5 interpret tests in tests/sheet_manager/systems/v5-dice-reading.test.ts"
Task: "T033 [US2] per-group 3D colour tests"
```

## Implementation strategy

### MVP (User Story 1)

1. Phases 1–2.
2. Phase 3: set bonus + WoD tab V5 mode with critical pairs.
3. Validate quickstart 1–3; the V5 table already stops counting pairs by hand.

### Incremental delivery

1. US1 → criticals from the panel.
2. US2 → Hunger/Desperation dice and outcomes from the panel.
3. US3 → correct pools and readings from sheets and the header button; other contexts untouched.
4. US4 → precise notation errors.
5. Polish → docs, skills, version, backlog, full verification.
