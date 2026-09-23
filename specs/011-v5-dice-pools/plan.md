# Implementation Plan: V5 dice pools and precise notation errors

**Branch**: `testing` (spec directory `011-v5-dice-pools`) | **Date**: 2026-09-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-v5-dice-pools/spec.md`

## Summary

V5 players get criticals, Hunger/Desperation dice, and their outcomes counted by the site
instead of by hand (T-045), and everyone gets notation errors that point at the mistake
(module TODO #3).

Technical approach, from [research.md](research.md):

- **Notation (system-neutral)**: a literal `:h` label on a dice term and a set-bonus
  modifier `x{N}[.{K}]{cp}` that works on a term or on a parenthesized pool without
  being distributed to inner terms ([contracts/notation-grammar.md](contracts/notation-grammar.md)).
- **Diagnostics**: `NotationError` with a structured `NotationDiagnostic` and a new
  `diagnoseNotation` export ([contracts/notation-diagnostics.md](contracts/notation-diagnostics.md)).
- **V5 reading**: mechanics are declared by the V5 ruleset on `SystemPlugin.dice`; an
  integration decides from the roll origin whether the reading applies and registers a
  neutral `RollReader` hook with the dice store ([contracts/roll-reading.md](contracts/roll-reading.md)).
- **Panel**: the WoD tab gains Classic / V5 modes. The selected tab and the new settings
  persist, with a store `version`/`merge` so new keys get defaults.
- **Sheets**: stat dice buttons take their pool builder from the document's plugin, so
  V5 sheets build `Nd10>=6` and Star Wars keeps its pool.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5 (persist), moo lexer + hand-written
parser, three + cannon-es (lazy 3D, per-group colour only), react-hot-toast; no new
dependencies

**Storage**: dice store in `localStorage` via Zustand `persist` (gains `version: 1`, a
settings merge, `panelTab`); session storage for the queued roll source; no change to
sheet documents or their schemas

**Testing**: Vitest (`tests/dice_roller`, `tests/integrations`, `tests/sheet_manager`),
jsdom component tests

**Target Platform**: static site (Vercel), modern browsers, phone width supported

**Project Type**: single frontend project (Docusaurus site + React modules)

**Performance Goals**: notation evaluation stays sub-millisecond for pools up to the
existing 200-dice limit (the set pass is one linear scan); no new code on the page-load
path — the 3D engine stays lazy

**Constraints**: `dice-logic` stays pure and system-neutral; `dice_roller` never imports
`sheet_manager`; generic sheet code reaches concrete systems only through the registry;
existing notation results unchanged (SC-004); all new UI text through the YAML sources
in both locales

**Scale/Scope**: 4 modules (`dice_roller`, `sheet_manager` systems + primitives,
`integrations` roll-reading + sheet-dice, docs en/ru) plus `src/theme/Root.tsx`; roughly
25 source files and their tests

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | Pass. V5 mechanics live in the V5 ruleset (`systems/v5/ruleset/dice.ts`), the classic pool moves from `shared/` to `systems/wod-like/` (repairing Star Wars logic in `shared/`), the decision logic lives in `integrations/roll-reading`, and `dice_roller` exposes only a neutral reader hook. No system conditional enters shared or dice code. |
| II. Explicit Contracts at Boundaries         | Pass. Three contracts are written down (grammar, diagnostics, roll reading). The public dice barrel widens deliberately by `diagnoseNotation` and its types. `SystemPlugin` gains an optional field. The persisted dice store gains a version and a merge; persisted `RollResult` fields are additive and optional.                               |
| III. Pleasurable Cross-Module Interactions   | Pass. The sheet → dice handoff carries the roll source the same way it carries the character name. A missing or failing reader degrades to an unread roll and a logged report, never a blocked roll.                                                                                                                                              |
| IV. Fit-for-Purpose Code Quality             | Pass. The label and set bonus are pure evaluator features with the modifier order documented; the reader interface is two functions; the WoD tab reuses the existing button and checkbox patterns.                                                                                                                                                |
| V. Risk-Proportional Testing                 | Pass. Dice-logic changes → exhaustive unit tests and Tier 2 (`yarn verify`). Integrations → contract tests for all ten roll contexts. Stores and UI → first store tests and component tests for the WoD tab, input diagnostics, and history. Docs → `validate:i18n`.                                                                              |
| VI. Consistent, Accessible Experience        | Pass. Special dice are marked by text as well as colour, the diagnostic uses `aria-invalid`/`aria-describedby` and a polite live region, and every new string goes through YAML in en and ru.                                                                                                                                                     |
| VII. Performance as a Shared Budget          | Pass. No new dependency or route; the 3D change is a per-group colour on an already-lazy chunk; the set pass is linear.                                                                                                                                                                                                                           |
| VIII. Respectful Use of Third-Party Material | Pass. Outcome names and the dice procedure are mechanics, written in our own words; no badge is added to dice surfaces — it stays once on the V5 sheet. Constitution 1.4.1 (PATCH) makes badge placement explicit at the maintainer's request (R11).                                                                                              |

**Deviations**: none.

**Post-Phase-1 re-check**: unchanged. The design adds one integration folder
(`roll-reading`) and one optional plugin field. The ESLint system-import pattern needs
no change: the new sheet-side file sits in `systems/wod-like/`, which is already
allowed, and integrations are outside the rule's scope.

## Project Structure

### Documentation (this feature)

```text
specs/011-v5-dice-pools/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── notation-grammar.md
│   ├── notation-diagnostics.md
│   └── roll-reading.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/dice_roller/
├── dice-logic/
│   ├── dice-lexer.ts          # LABEL and set-bonus tokens; keep offsets
│   ├── dice-parser.ts         # label position, set bonus scope, NotationError throws
│   ├── dice-evaluator.ts      # label propagation, set pass (term + pool scope)
│   ├── errors.ts              # NotationError, NotationDiagnostic, kinds
│   ├── types.ts               # AST/result fields (label, setIndex, setBonus, poolModifiers)
│   ├── utils.ts               # formatting of :h and set members
│   ├── notation-utils.ts      # sides+label merge key, rewriteWodDifficulty for :h
│   ├── roll-orchestrator.ts   # per-group dice colour, explosions keep it
│   ├── renderer/factory.ts    # read per-group colour
│   └── index.ts               # + diagnoseNotation and diagnostic types
├── components/
│   ├── dice_pool/DicePool.tsx          # persisted panelTab
│   ├── dice_pool/DiceTabWod.tsx        # Classic / V5 modes
│   ├── dice_pool/NotationInput.tsx     # diagnostic message, span highlight, origin on Enter
│   ├── dice_pool/RollControls.tsx      # origin on roll
│   ├── RollHistory.tsx                 # labelled dice, outcomes, policy link, origin on re-roll
│   ├── RollToastContent.tsx            # first outcome line
│   └── DiceRollerSettingsModal.tsx     # special dice colour
├── store/diceRollerStore.ts   # version + merge, panelTab, reader hook in roll()
└── utils/
    ├── constants.ts           # new settings + metadata
    ├── events.ts              # RollOptions.origin
    ├── rollReader.ts          # RollOrigin, RollReader, registerRollReader (new)
    └── sessionStorage.ts      # roll source key

src/components/NavbarDiceRoller.tsx      # origin 'header'

src/integrations/
├── roll-reading/              # new: applicability (FR-013/014), prepare/interpret via registry
├── sheet-dice/                # roll source on queue/immediate; shown-document store
└── discord/webhook.ts         # outcome lines, labelled values in text

src/sheet_manager/
├── systems/types.ts           # SystemPlugin.dice, SystemDiceRules, RollReadingRules
├── systems/wod-like/dicePool.ts        # classic pool (moved from shared/utils/diceNotation.ts)
├── systems/star-wars-wod/index.ts      # declares the classic pool
├── systems/v5/ruleset/dice.ts          # V5 traitPool + reading (lines, prepare, interpret)
├── systems/v5/index.ts                 # declares dice
├── features/sheet/declarative/primitives.tsx  # onDiceRoll from the plugin
└── features/sheet/shell/SheetWorkspace.tsx    # publishes the shown document

src/shared/utils/diceNotation.ts         # removed
src/theme/Root.tsx                       # registers the roll reader

translations/source/{en,ru}/ui/dice/{pool,settings,history}.yaml   # modes, settings, errors, outcomes
translations/source/{en,ru}/ui/sheet/…                             # V5 line and outcome names
docs/wod-v5/rules/dice-pools.mdx (+ i18n/ru mirror)                # automatic counting
.agents/skills/dice-logic/ (SKILL.md, references/modifiers.md)     # label, set bonus, diagnostics
src/dice_roller/AGENTS.md                                          # reader hook, origin, runtime flow

tests/dice_roller/{parser,evaluator,logic,components,utils,store}/  # new and extended
tests/integrations/{roll-reading,sheet-dice,discord-webhook}.test.ts
tests/sheet_manager/systems/dice-rules.test.ts
```

**Structure Decision**: single project, existing module folders. The one new folder is
`src/integrations/roll-reading/`, because it connects two modules (Principle III).

## Delivery order

1. Diagnostics foundation (errors, offsets) — every later parser change reports through it.
2. Label and set bonus in dice-logic, with formatting and notation helpers (US1/US2 core).
3. System dice rules: classic pool move, V5 `traitPool` and reading (FR-015, outcomes).
4. Store: version/merge, settings, `panelTab`, reader hook, origins at every call site.
5. Integration: roll-reading applicability, sheet sources, shown document; register in Root.
6. UI: WoD tab modes, special colour in 3D and history, toast and Discord lines, diagnostics display.
7. Docs, translations, dice-logic skill, module AGENTS; backlog statuses.

## Complexity Tracking

No constitution violations to justify.
