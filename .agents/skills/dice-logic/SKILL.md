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

The whole roll falls back to 2D when 3D is disabled, no supported geometry exists, the physical-dice limit is exceeded, renderer orchestration fails, or physics returns a non-finite value. Never replace an invalid physics value with a random d20 value.

## Tests

- Parser changes: valid notation, invalid/trailing syntax, locations, and limits.
- Evaluator changes: deterministic mock-random consumption and modifier order.
- Orchestrator changes: d100 multiplier, mixed supported/unsupported groups, fallback, reroll/explosion index mapping, cancellation, and session ownership.
- Notation UI changes: test concrete rewrites such as direct and parenthesized WoD thresholds.
