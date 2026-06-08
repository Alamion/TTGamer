---
name: dice-logic
description: Deep reference for dice notation lexer/parser architecture (22 token types, moo rules, DICE-to-DROP fallback), modifier evaluation order (1-11), MockRandom consumption order for tests, and Roll Engine vs Render Engine separation.
license: AGPL-3.0
compatibility: opencode
metadata:
    domain: dice-logic
    audience: developers
---

# Dice Logic Architecture

When working with the dice parser, evaluator, lexer, or orchestrator, load this skill for reference.

## Modifier Evaluation Order

Modifiers are evaluated in a fixed order (1–11) regardless of notation position:

1. **Min** — raise low values to minimum
2. **Max** — cap high values to maximum
3. **Explode** — roll additional dice on condition (penetrating, compound variants)
4. **Reroll** — re-roll on condition (once variant)
5. **Unique** — ensure no duplicate values
6. **Keep/Drop** — keep or drop highest/lowest N dice
7. **Target success** — mark successes based on compare point
8. **Target failure** — mark failures based on compare point
9. **Critical success** — mark natural max (or compare point match) as crit
10. **Critical failure** — mark natural min (or compare point match) as crit fail
11. **Sort** — sort kept dice ascending/descending

Min/Max always apply (including pre-generated values). Explode/Reroll/Unique only apply for non-pre-gen (handled by the 3D orchestrator).

## Lexer/Parser Architecture

### Token Types (Generalized)

22 token types replace 39+ specific types:

- `DICE`, `NUMBER`, `PLUS`, `MINUS`, `MULTIPLY`, `DIVIDE`, `MODULO`, `POW`, `LPAREN`, `RPAREN`, `END`
- Modifier tokens: `MOD_EXPLODE` (`!`, `!!`, `!p`, `!!p`), `MOD_REROLL` (`r`, `ro`, `r1`, etc.), `MOD_KEEP` (`kh`, `kl`, `k`), `MOD_DROP` (`dh`, `dl`, `d`), `MOD_SORT` (`s`, `sa`, `sd`), `MOD_UNIQUE` (`u`, `uo`), `MOD_MIN`, `MOD_MAX`, `MOD_CS`, `MOD_CF`, `MOD_FAILURE`
- Compare operators: `GT`, `GTE`, `LT`, `LTE`, `EQ`, `NEQ` (`<>` only)

### Key Rules

- **No NOT_EQ token**: `!=` is decomposed as `MOD_EXPLODE` + `EQ` (explosion with compare `=`). Users needing not-equal must use `<>`.
- **Lexer ordering**: DICE → Modifier tokens → Compare operators. Moo's longest-match + first-defined resolves ties (e.g., `4d6` then `d2` as DICE, not MOD_DROP).
- **DICE-to-DROP fallback**: A DICE token matching `/^d\d+$/` in the modifier loop is converted to MOD_DROP (handles `4d6d2`).
- **Modifier token text** carries variant info (e.g., `!!p` → `{ compounding: true, penetrating: true }`).

### MockRandom Consumption Order

When testing with `evaluate('2d6r1', 0.1, 0.5, 0.8)`:

1. ALL dice are initialized first: die0=0.1→1, die1=0.5→4
2. THEN modifiers run: reroll die0→0.8→5
3. Final: die0=5, die1=4. Array: `[5, 4]`, total=9

This order matters because `Math.floor(0.5*6)+1 = 4` (not 3).

## Architecture: Roll Engine vs Render Engine

The project follows a clean separation between the **Roll Engine** (logic) and **Render Engine** (visualization):

**Roll Engine** (`dice-evaluator.ts`):

- Parses dice notation to AST via `parseToAST()`
- Evaluates AST to produce final `RollResult` with all modifiers applied
- Handles modifiers: reroll, explode, keep/drop, sort, conditions
- Provides raw dice values via `extractRawValuesFromAST()` for 3D visualization
- Shared explosion counter (`{count: number}`) prevents infinite recursion when `<>` matches most faces
- Pre-generated values (3D path) skip explode/reroll/unique but still apply min, max, keep/drop, target, critical, and sort

**Render Engine** (`renderer/`):

- Pure visualization layer - no roll logic
- Animates dice physics via Three.js + Cannon-es
- Supports forced rolls via `swapFace()` method that rotates dice to show target values
- Returns target values from physics simulation for verification

**Orchestration** (`roll-orchestrator.ts`):

1. Parse notation to AST
2. Evaluate AST via Roll Engine to get final result (source of truth)
3. Extract raw values from AST for 3D dice
4. Pass raw values as target values to factory for 3D animation
5. 3D dice animate and use `swapFace()` to display target values
6. Final result returned from Roll Engine, not from renderer

**Complete modifiers reference**:

- can be found in `.opencode/skills/dice-logic/references/modifiers.md`
