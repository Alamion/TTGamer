---
name: dice-logic
description: Dice lexer/parser/evaluator and 3D orchestration invariants, modifier order, limits, and test random-value consumption.
license: AGPL-3.0
metadata:
    domain: dice-logic
    audience: developers
---

# Dice Logic Architecture

Read `src/dice_roller/AGENTS.md` first. Use this reference when changing lexer, parser, evaluator, notation rewrites, or physics orchestration.

## Parsing

- `dice-lexer.ts` uses moo; `dice-parser.ts` is a hand-written recursive-descent parser.
- The parser is strict: lexer errors, trailing tokens, unmatched parentheses, missing operands, and missing comparison values throw.
- Lexer ordering and the DICE-to-DROP fallback are compatibility-sensitive. A `DICE` token matching `/^d\d+$/` inside a modifier loop represents drop-lowest.
- `!=` tokenizes as explode plus equality. Not-equal syntax is `<>`.
- Current complexity limits live in `utils/constants.ts`; parser and renderer code must use those constants instead of parallel literals.
- Every parse failure is a `NotationError` (`errors.ts`) carrying a `NotationDiagnostic`: `kind`, 0-based `offset`/`length` (END points at `input.length`), optional `found`, `expected` token classes, and `limit`. Messages stay English for logs (and keep their `at line/column` suffix); the UI translates by `kind` (`components/dice_pool/notationDiagnosticMessage.ts`). `validateNotation` stays boolean; `diagnoseNotation` returns the diagnostic.
- `:h` (lexer `LABEL`, a literal — never a greedy pattern) is accepted only directly after the dice token, before `@` values and modifiers; anywhere else it is `label-position`. It marks the term's dice as the pool's special subset (`DiceGroupNode.label`, `DiceRoll.label`, `DiceGroupResult.label`) and changes no value.
- `x{N}[.{K}]{cp}` (lexer `MOD_SET`) is a set bonus: it parses its own compare point, needs a success target in its scope (`set-bonus-needs-target`), and N ≥ 2, K ≥ 1 (`invalid-set-size`). On a term it is a normal modifier; after `)` it is kept on `ParenthesizedNode.poolModifiers` and is **not** distributed to inner terms.
- `f` must be followed by a compare point (`missing-compare-value`), and `@` must list exactly as many values as dice (`forced-values-count`), both checked while parsing.
- Exponentiation is intentionally left-associative for compatibility with the current notation engine.

## Modifier Evaluation Order

Modifiers run in this order regardless of their textual order:

1. minimum
2. maximum
3. explode (normal, compound, penetrating)
4. reroll
5. unique
6. keep/drop
7. target success
8. target failure
9. critical success
10. critical failure
11. sort
12. set bonus — term scope at the end of the term; pool scope after the whole parenthesized pool is evaluated, over the kept dice of every inner term in roll order. Members get `setIndex`; the first member of each set carries `setBonus = K` so `formatted` still sums to the total; `details` marks members with a trailing `x`; `FullRollResult.setBonus` lists `{ sets, added }` per scope.

See `references/modifiers.md` for notation details.

## Random Test Consumption

The evaluator generates every initial die before processing modifiers. For `2d6r1` with random values `0.1, 0.5, 0.8`, the initial dice are `1, 4`, then the first die rerolls to `5`; the result is `[5, 4]`.

## 2D and 3D Authority

The two paths share parsing and final evaluator semantics but obtain initial values differently:

- 2D: `evaluateDiceAST()` generates values.
- 3D: cannon-es physics generates values for supported shapes; the orchestrator performs physical rerolls/explosions and supplies pre-generated rolls to the evaluator.

Therefore the renderer is not currently presentation-only. Do not implement forced-face animation or evaluator-authoritative 3D results under the assumption that it already exists.

A d100 is one logical die represented by two physical d10s. Indexing, rerolls, explosions, and `groupSizes` must preserve that multiplier.

The renderer owns one shared physics world so simultaneous sessions' dice can collide. Every `startPhysicsRoll()` handle is nevertheless bound to one numeric session ID: lock, reroll, add/explode, settle, manual-reroll state, arrange, and dismiss operations must use that ID. Never recover a session by taking the last array element. The physical-dice cap covers the initial dice plus additions across every group in that logical session; the recursive-modifier cap covers physical reroll/explosion work.

The renderer module is imported dynamically and memoized in `roll-orchestrator.ts`, after the 2D decisions, so `three`/`cannon-es` never sit on a page's critical path. Keep type-only references to it as `import type`, never add a static value import, and pass the loaded `prepareDiceGeometries` into helpers instead of importing it at module scope. A failed load is a 2D fallback flagged with `renderer3dUnavailable` (presented by `Renderer3DFallbackNotice`), and the memo is cleared so a later roll can retry.

The whole roll falls back to 2D when 3D is disabled, no supported geometry exists, the physical-dice limit is exceeded, the renderer cannot be downloaded, renderer orchestration fails, or physics returns a non-finite value. Never replace an invalid physics value with a random d20 value.

## Notation helpers

`notation-utils.ts` keys parts by sides **and** label, so the panel's `d10` and `d10:h` buttons and `mergeDiceNotation` never merge labelled and plain dice. `isSuccessPool` and `withPoolSetBonus` (public barrel) let a system reading add a pool-wide set bonus once: appended to a single term or group, wrapped around several top-level terms, and left alone when any set bonus already exists (history re-rolls stay valid).

## Tests

- Parser changes: valid notation, invalid/trailing syntax, diagnostics (`tests/dice_roller/logic/diagnostics.test.ts`), and limits.
- Shared helpers for fixed dice live in `tests/dice_roller/helpers.ts` (`evaluate`, `evaluateWithValues`, `faceToRandom`).
- Evaluator changes: deterministic mock-random consumption and modifier order.
- Orchestrator changes: d100 multiplier, mixed supported/unsupported groups, fallback, reroll/explosion index mapping, cancellation, and session ownership.
- Notation UI changes: test concrete rewrites such as direct and parenthesized WoD thresholds.
