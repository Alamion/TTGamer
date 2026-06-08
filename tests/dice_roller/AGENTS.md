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
│   └── basic.test.ts                     # Lexer/parser tokenization + AST
├── evaluator/
│   ├── basic-rolls.test.ts               # Simple rolls (2d6, 1d20+5)
│   ├── modifiers.test.ts                 # Keep/drop, target, crit, sort
│   ├── explosion.test.ts                 # Explode (!, !!, !p, !!p)
│   ├── reroll.test.ts                    # Reroll (r, ro, r<condition>)
│   └── combined.test.ts                  # Multiple modifiers together
└── integration/
    └── full-pipeline.test.ts             # Tokenize → Parse → Evaluate → Format
```

## Key Testing Patterns

- **`evaluate(notation, ...mockValues)`** — pass fractional values (0.0–1.0) for deterministic `Math.random()` mocking
- **MockRandom consumption order:** ALL dice initialized first, THEN modifiers run (see dice-logic skill for exact order)
- **Use `parseToAST()` + `evaluateDiceAST()`** for unit-level parser/evaluator tests
- **Use `rollDices()`** for full pipeline tests (includes `onRollResult` formatting)
- **No SillyTavern mocks needed** — dice-logic is pure TS with no external dependencies
