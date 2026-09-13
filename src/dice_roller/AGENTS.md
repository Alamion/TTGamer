# Dice Roller Module

## Scope

This module owns notation editing, parsing/evaluation, roll history, 2D/3D presentation, and roll-result events. Discord delivery is a consumer in `src/integrations/discord`; it is not part of the dice engine.

## Structure

```text
src/dice_roller/
├── dice-logic/
│   ├── dice-lexer.ts         # moo tokenizer
│   ├── dice-parser.ts        # strict recursive-descent AST parser
│   ├── dice-evaluator.ts     # 2D/random evaluation and modifiers
│   ├── dice-roller.ts        # public roll/result-event functions
│   ├── roll-orchestrator.ts  # physics-backed roll coordination
│   ├── notation-utils.ts     # UI notation rewrites
│   ├── renderer/             # Three.js + cannon-es physics
│   ├── types.ts              # AST/result types
│   └── index.ts              # deliberately small public API
├── components/               # panel, tabs, history, inline rolls, settings
├── store/diceRollerStore.ts  # Zustand persistence and roll action
└── utils/                    # limits, event adapter, session context, UI types
```

## Runtime Flow

```text
notation → tokenize → strict AST parse
                     ├─ 2D: evaluator generates values and applies modifiers
                     └─ 3D: physics generates supported die values
                            → orchestrator handles physical rerolls/explosions
                            → evaluator applies remaining result semantics
                     → RollResult event → history/toast/Discord subscribers
```

The current 3D path is physics-authoritative for supported dice. It passes those values back into the evaluator as pre-generated rolls. Unsupported dice, excessive physical dice, renderer failure, and invalid physics output fall back to a normal 2D evaluation of the entire roll.

All live 3D rolls share one physics field and can physically collide, but their logical lifecycle is isolated by renderer session ID. A handle may only lock, reroll, add, settle, inspect, arrange, or dismiss its own session. Initial and explosion dice share one `MAX_PHYSICAL_3D_DICE` budget per logical roll.

Do not describe the renderer as presentation-only or claim that `swapFace()` forces evaluator-generated results; that is not the current implementation.

## Public and Internal Imports

The public barrel exports only:

- `rollDices`
- `onRollResult`
- `validateNotation`
- `RollResult` and `FullRollResult` types

UI outside this module may use that barrel. Dice internals and their unit tests should import the owning file directly, so widening the public API is an explicit decision.

## Invariants

- Parsing rejects lexer errors, missing operands/parentheses/comparison values, and trailing tokens.
- Limits live in `utils/constants.ts`: notation length, AST size, numeric magnitude, logical dice, sides, custom faces, recursive modifiers, physical 3D dice, and roll duration.
- Exponentiation is currently left-associative; changing that is a notation compatibility decision.
- Modifier order is defined in `dice-evaluator.ts` and documented in `.agents/skills/dice-logic/references/modifiers.md`.
- A logical d100 consumes two physical d10 values in 3D.
- Forced `@` values are deterministic in 2D. The 3D path currently warns and uses physics values.
- Roll context stored in session storage must be consumed or explicitly cleared when recalling context-free history entries.
- WoD difficulty controls rewrite both per-die and parenthesized group success thresholds already present in the editor.

## Testing

Run `yarn test` for parser/evaluator/notation changes and `yarn verify` before handoff. Tests using a mock random function consume all initial dice first, then values required by modifiers.

Load `.agents/skills/dice-logic/SKILL.md` before changing lexer, parser, evaluator, or 3D orchestration behavior.
