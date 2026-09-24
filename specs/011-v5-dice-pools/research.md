# Research: V5 dice pools and precise notation errors

Findings come from reading the current code (dice-logic, dice UI/store, sheet systems)
and the upstream notation library in `context/dice-roller/`. Each decision lists what was
chosen, why, and what was rejected.

## R1 — Label token `:h`

**Decision**: add a literal lexer token `LABEL` matching `:h` and accept it in
`parseDiceGroup` only directly after the dice token, before any forced values or
modifiers (`2d10:h@10,4>=6`). The label is stored on `DiceGroupNode.label`, copied to every `DiceRoll` of
that term (including explosions and rerolls), and re-emitted by `formatModifiers`, so
`formatted` shows `2d10:h`. A label after a parenthesized group or a number is a
`label-position` diagnostic.

**Rationale**: `:` is unused by our lexer and by rpg-dice-roller, so no existing notation
changes meaning. A literal (not `/:[a-z]+/`) cannot swallow following modifiers — a
greedy pattern would eat `:hk`, `:hd1`, `:hs`, `:hf`. Checked by running the lexer rules:
today `2d10:h` lexes to `DICE` + `ERROR ":h"`; with the literal token it lexes to
`DICE, LABEL` and `2d10:h>=6`, `d10:hk`, `2d10:hd1`, `(3d10+2d10:h)>=6f=1` all lex cleanly.

**Alternatives rejected**: rpg-dice-roller descriptions (`2d10 [Hunger]`, `# text`) —
`[...]` collides with our custom faces `d[1,2,3]`, and descriptions are comments that
carry no logic. Free-form labels (`:hunger`) — one special subset is all the spec needs,
and a closed set keeps lexing unambiguous.

## R2 — Set bonus spelling and scope

**Decision**: `x{N}[.{K}]{cp}`: for every complete set of N dice matching the compare
point, add K successes (K defaults to N). V5 criticals are `x2=10`: each pair of 10s,
already worth 2, gains 2 more, 4 in total. The modifier is valid in two places:

- on a single dice term (`6d10>=6x2=10`), where the set covers that term's kept dice;
- after a parenthesized pool (`(4d10+2d10:h)>=6x2=10`), where it covers the kept dice of
  every term inside. It is **not** distributed to the inner terms the way other group
  modifiers are (T-019); it is stored on `ParenthesizedNode.poolModifiers`.

It needs a success target in the same scope (the term's or the group's `>=`); without
one it is a `set-bonus-needs-target` diagnostic. Its compare point is parsed by the
modifier itself (like `cs`), so `x2=10` never becomes a target. Set members get
`DiceRoll.setIndex`; the formatter prints them with a trailing `x` (`10**x`).

**Rationale**: `x` is unused in our lexer and upstream, and needs no lexer-order tricks
(a word such as `set` would collide with `MOD_SORT` `s`). Keeping it off the distributed
group modifiers is required: pairs span terms (a regular 10 and a Hunger 10 form one
critical), and today each term counts successes on its own and `BinaryOp` adds the sums,
so a distributed modifier would find pairs only within each term.

**Alternatives rejected**: `pair{cp}` (one set size only; a word token); `t{N}+{K}` (a
`+` inside a modifier reads as arithmetic); counting criticals in the V5 reading instead
of the notation — the recorded notation would then not reproduce the total when
re-rolled from history or favourites.

## R3 — Evaluating a pool across terms

**Decision**: `evaluateAST`'s `Parenthesized` branch, when `poolModifiers.setBonus` is
present, evaluates the inner expression as today, then runs one pass over the kept dice of
all inner `DiceGroupResult`s: counts matching dice, forms `floor(count / N)` sets in roll
order, marks members, and adds `sets × K` to the group value. A term-level set bonus runs
the same pass at the end of `evaluateDiceGroup`, after `criticalFailure` and before
`sort`. The modifier order reference gains the step.

**Rationale**: the evaluator already exposes the inner `diceGroups` at that point, so no
new traversal is needed; the value added is an integer, so `BinaryOp` arithmetic around
the pool stays correct. Deterministic random consumption does not change (no dice are
added).

## R4 — Structured diagnostics

**Decision**: keep `offset` on `LexerToken`; replace ad-hoc `SyntaxError`/`RangeError`
throws in the lexer, parser, and post-parse checks with a `NotationError` carrying a
`NotationDiagnostic` (`kind`, `offset`, `length`, optional `expected`, optional
`limit`). `validateNotation` keeps its boolean contract; a new `diagnoseNotation` is
added to the public barrel — a deliberate widening of `dice-logic/index.ts`. Forced
values (`@`) are counted at parse time, so `2d10@1` stops validating as correct (today it
fails only when rolled). End-of-input errors point at `offset = notation.length`. The UI
maps `kind` to a translated message (`dice.pool.notation.errors.*`) and highlights the
span in `NotationInput`; the live region announces a changed message once after the
existing 300 ms debounce.

**Rationale**: every error site already knows the token; only the offset was being
thrown away (`TokenStream.error()` bakes line/column into the message, with END reported
as column 1). A structured object lets the UI translate messages instead of showing
English parser text.

**Alternatives rejected**: parsing positions out of message strings; returning the
diagnostic from `validateNotation` (breaks its boolean callers in `RollControls`).

## R5 — Where the V5 reading lives

**Decision**: three layers, so that `dice-logic` stays system-neutral and the dice
roller never imports `sheet_manager`:

1. **Mechanics in the ruleset.** `SystemPlugin` gains an optional `dice` field
   (`SystemDiceRules`): `traitPool(value, flags)` builds a sheet stat's notation, and an
   optional `reading` (`RollReadingRules`) has `prepare(notation, ctx)` (adds `x2=10` to
   the pool when critical pairs are on) and `interpret(result, ctx)` (outcomes from the
   labelled dice, the success total, the set members, and the optional Difficulty). V5
   declares both in `systems/v5/ruleset/dice.ts`; the lines (Hunger, Desperation) are
   data on the reading, and the hunter module names its line.
2. **Decision and wiring in an integration.** `src/integrations/roll-reading/`
   implements FR-013/FR-014: from the roll origin and the settings it decides whether a
   reading applies, finds the rules through `systemRegistry`, and runs them.
3. **A neutral hook in the dice roller.** The store's `roll()` accepts a `RollOrigin` and
   calls a registered `RollReader` (a two-function interface defined by `dice_roller`)
   before and after the roll; the result carries `reading?: RollReadingSummary`. The
   integration registers the reader from `src/theme/Root.tsx`, next to the Discord
   subscription.

**Rationale**: Principle I says a ruleset owns its dice mechanics, and generic code must
not import concrete systems — the integration reaches the rules only through the
registry. Rolls with no reader registered (tests, docs) behave exactly as today.

**Alternatives rejected**: putting V5 logic in `dice-logic` (binds a system into the
notation core, the problem the user raised); putting it in the dice-roller store (a
system conditional inside another module).

## R6 — Roll origin and the "character currently shown"

**Decision**: `RollOptions` gains `origin: RollOrigin`:

- `{ kind: 'sheet', source }` — a sheet's immediate roll (StatDot right-click);
- `{ kind: 'panel', control: 'roll-button' | 'enter' | 'header' | 'history', tab, wod? }`
  — rolls through the panel's controls, the header's pending-roll button, or a history
  right-click re-roll, with the selected tab and, for WoD, the mode, line, and Difficulty.

`source` is `{ systemId, definitionId }`. A queued stat stores its source next to the
character name in session storage (`dice_roller_roll_source`), cleared by the same paths.
For hand-typed notation with no tab selected, the integration reads the **shown**
document from a small non-persisted store in `src/integrations/sheet-dice/`, set by
`SheetWorkspace` while it is mounted and cleared on unmount.

**Rationale**: `currentDocumentId` in `documentStore` is persisted and stays set on every
page (the dice panel is mounted globally), so it cannot mean "shown". Documentation
inline rolls call `rollDices()` directly and never reach the store, so they never get a
reading without any extra code (FR-014).

## R7 — V5 trait pools from the sheet

**Decision**: primitives take `onDiceRoll` from the document's plugin
(`useDocumentSource().document` → `systemRegistry.getSystem(systemId).dice?.traitPool`)
instead of `shared/utils/diceNotation.ts`. The current builder moves to
`systems/wod-like/dicePool.ts` (the classic WoD pool: `f=1` unless experienced, `!` with
a specialty), which Star Wars WoD declares; `shared/utils/diceNotation.ts` is removed
(Star Wars-specific logic sitting in `shared/`). V5 declares `Nd10>=6` and never adds a
specialty die, because a V5 specialty is free text (no boolean flag exists) and applies
only when it fits the action. A plugin without `dice` shows no dice button.
`docs-character-rolls/CharRoll.tsx` keeps its own Star Wars notation (unchanged scope).

## R8 — Special dice colour in 3D and text

**Decision**: add `specialDiceColor` (default `#8B0000`: 10:1 with the white default
text colour and 4.0:1 against the default orange `#ff8040`; the botch button's crimson
`#DC143C` reaches only 2.0:1 against that orange) to the settings. The orchestrator passes a colour per flat dice group:
`DiceGroup` gains optional `diceColor`, the factory's loop reads it, and
`processExplosionLoop` receives the group's colour so explosions of labelled dice keep
it. The history's roll details render labelled groups in that colour plus the `:h`
marker text and an accessible "special dice" label; Discord text prefixes labelled
values with the line name (or "special" when no reading applied).

**Rationale**: colour is baked into each die's textures at creation and the texture
cache key already includes colours, so a per-group colour needs no renderer change.
Result views are text today (toast shows notation and total; history shows details and
formatted), so no 2D die graphics are added.

## R9 — Persisting new settings and the tab

**Decision**: add `version: 1` and a `merge` to the dice store's `persist` options that
deep-merges stored `settings` over `DEFAULT_SETTINGS`, and persist the new
`panelTab` (`'standard' | 'dnd' | 'wod' | ''`, default `''`). New settings keys:
`specialDiceColor`, `wodMode` (`'classic' | 'v5'`, default `'classic'`), `v5Line`
(`'hunger' | 'desperation'`, default `'desperation'`), `v5CriticalPairs` (default
`true`), `v5SpecialOutcomes` (default `true`), `v5Difficulty` (`number | null`, default
`null`). The classic target-number difficulty stays local as today.

**Rationale**: today `persist` has no version or merge, so a stored `settings` object
replaces the defaults wholesale and new keys load as `undefined`. `SETTINGS_METADATA` is
a `Record` over every settings key, so each new key also needs a metadata entry.

## R10 — Notation helpers and the WoD tab

**Decision**: `handleDiceNotation` and `mergeDiceNotation` key parts by sides **and**
label, so the special-die button adds to `d10:h` and never merges into the regular d10
part. When a pool has more than one term, the V5 tab keeps it parenthesized with the
target and set bonus on the group: `(3d10+2d10:h)>=6x2=10`. `rewriteWodDifficulty`
accepts `d10:h>=N`. Existing merges (without labels) are unchanged.

**Rationale**: today both helpers merge by sides only, and `mergeDiceNotation` drops
later same-face parts, which would lose a `2d10:h` term.

## R11 — Publisher policy (Principle VIII)

**Decision**: no Dark Pack badge or notice anywhere in the dice roller, toasts, history,
or Discord messages. Outcome names (Hunger, Desperation, messy critical, bestial failure,
Overreach/Despair) and the dice procedure are game mechanics, not publisher material;
explanations are written in our own words. The badge stays where it already is — once, on
the V5 character sheet.

**Rationale**: the badge confirms that the project accepts the Dark Pack terms; one
prominent placement is enough, and repeating it on every surface that touches V5 adds
noise without adding compliance. Constitution 1.4.1 states this explicitly (the earlier
wording did not say how often the badge appears).

**Alternatives rejected**: a badge link in the V5 tab and on history outcome lines (the
first plan draft) — rejected by the maintainer as redundant.

## R12 — Testing approach

- `dice-logic`: exhaustive unit tests for the label (lexing, parsing, propagation,
  formatting), the set bonus (term and pool scope, 0–4 tens, mixed labels, explosions,
  keep/drop interaction, pre-generated 3D values), and every diagnostic kind with offsets
  (≥ 20 invalid notations, SC-005). The full existing suite must pass unchanged (SC-004).
- V5 rules: pure tests of `traitPool`, `prepare`, and `interpret` over fixed results
  (SC-001 matrix).
- Integration: contract tests for the ten roll contexts (SC-003) against the store's
  `roll()` with a mocked renderer, and for session-source clearing.
- UI: component tests for the WoD tab modes, tab persistence, the diagnostics display,
  and history rendering of labelled dice and outcomes; store tests for the settings
  merge.
