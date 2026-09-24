# Dice Roller — Tests

## Commands

```
yarn test          # Run all tests (Vitest)
yarn test --run    # Single run (no watch)
```

## Test Structure

```
tests/dice_roller/
├── setup.ts                              # Vitest setup (mocks, global config)
├── parser/
│   ├── basic.test.ts                     # Lexer/parser tokenization + AST
│   └── group-modifiers.test.ts           # Group notation (3d10+1d10)>=6
├── evaluator/
│   ├── basic-rolls.test.ts               # Simple rolls (2d6, 1d20+5)
│   ├── modifiers.test.ts                 # Keep/drop, target, crit, sort
│   ├── explosion.test.ts                 # Explode (!, !!, !p, !!p)
│   ├── reroll.test.ts                    # Reroll (r, ro, r<condition>)
│   ├── combined.test.ts                  # Multiple modifiers together
│   └── group-modifiers.test.ts           # Group notation evaluation
├── renderer/
│   ├── harness.ts                        # Headless 3D rolls: fake clock/frames, seeded random, stubbed WebGL
│   └── display-conditions.test.ts        # T-066: spawn, solver energy, rest at read-out, show/fade at 30–240 Hz
├── integration/
│   └── full-pipeline.test.ts             # Tokenize → Parse → Evaluate → Format
└── utils/
    └── constants.test.ts                 # Module constants (incl. Discord webhook settings)
```

## Key Testing Patterns

- **`evaluate(notation, ...mockValues)`** — pass fractional values (0.0–1.0) for deterministic `Math.random()` mocking
- **MockRandom consumption order:** ALL dice initialized first, THEN modifiers run (see dice-logic skill for exact order)
- **Use `parseToAST()` + `evaluateDiceAST()`** for unit-level parser/evaluator tests
- **Use `rollDices()`** for full pipeline tests (includes `onRollResult` formatting)
- **No SillyTavern mocks needed** — dice-logic is pure TS with no external dependencies
- **3D harness** — `installDisplay(seed)` then `traceRoll(sides, timing)`; the seed is re-applied after geometry creation because three.js consumes `Math.random` for texture UUIDs, so a seed names the same throw whatever ran before
