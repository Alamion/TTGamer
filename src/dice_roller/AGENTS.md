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

The 3D renderer (`three` + `cannon-es`) is loaded on demand: `roll-orchestrator.ts` holds a
memoized `import('./renderer')` performed only after a roll is known to be a 3D roll, so no page
load pulls the engine in. A rejected load clears the memo (the next roll may retry), rolls in 2D,
and returns `renderer3dUnavailable: true` on the result; `components/Renderer3DFallbackNotice.tsx`
turns that flag into one toast per session, because `dice-logic` may not import UI or stores.

The current 3D path is physics-authoritative for supported dice. It passes those values back into the evaluator as pre-generated rolls. Unsupported dice, excessive physical dice, renderer failure, and invalid physics output fall back to a normal 2D evaluation of the entire roll.

All live 3D rolls share one physics field and can physically collide, but their logical lifecycle is isolated by renderer session ID. A handle may only lock, reroll, add, settle, inspect, arrange, or dismiss its own session. Initial and explosion dice share one `MAX_PHYSICAL_3D_DICE` budget per logical roll.

Do not describe the renderer as presentation-only or claim that `swapFace()` forces evaluator-generated results; that is not the current implementation.

## Roll Origin and System Readings

The dice roller knows no game systems. Every roll through the store may carry a `RollOrigin`
(`utils/rollReader.ts`): `{ kind: 'sheet', source }` for a sheet's immediate roll, or
`{ kind: 'panel', control, tab, wod?, source? }` for the panel's roll button, Enter, the
header's pending-roll button, and history re-rolls (`currentPanelOrigin(control)`). `tab` is the
persisted `panelTab` (`''` = none, the default) and is read even while the panel is closed.
A queued sheet stat stores its `RollSource` in session storage (`dice_roller_roll_source`); the
store attaches it to panel origins. It and the queued stat labels (`dice_roller_stat_labels`)
are dropped whenever the input becomes empty, however it was emptied.

Rolls made from a character (a sheet's immediate roll, the header's pending-roll button with a
queued or shown V5 character) follow that character's system and line whatever tab is
selected; rolls made in the panel follow the panel's tab and its settings.

`store.roll()` hands origin-carrying rolls to the one registered `RollReader`:
`prepare` may rewrite the notation (e.g. add `x2=10`), `interpret` returns a
`RollReadingSummary` stored on `RollResult.reading` (history, toast, Discord). No reader, or a
throwing reader, means an unread roll and a logged warning. The reader lives in
`src/integrations/roll-reading/` and is registered lazily from `src/theme/Root.tsx`, so the
system registry never joins the shared bundle. Documentation inline rolls call `rollDices()`
directly and are never read.

Labelled (`:h`) dice use `settings.specialDiceColor` in 3D (per flat group in the orchestrator,
kept by explosions) and are listed as special dice in history and Discord. The WoD tab has a
persisted Classic / V5 mode (`settings.wodMode`); V5 mode holds the line, the optional
Difficulty in successes, and the `v5CriticalPairs` / `v5SpecialOutcomes` switches. Classic
mode holds an optional success threshold (`wodThreshold`, default 6; unset adds plain `d10` and
`d10f=1`, which only sum, and leaves the notation alone; setting it also gives plain or
botch-only top-level d10 terms the threshold via `addWodThreshold`) and optional successes needed
(`wodSuccesses`).

The successes needed of the current mode travel in the panel origin (`wod.difficulty`). When it
is set and the rolled notation is a success pool, the store attaches a neutral
`RollResult.verdict` (`rollVerdict` in `utils/rollReader.ts`: succeeded, margin), shown in the
toast, history, and Discord. Sheet rolls and other tabs get none; an unset value changes nothing.

The dice store persists with `version: 1`; its `merge` lays stored settings over
`DEFAULT_SETTINGS`, so a new settings key needs only a default and a `SETTINGS_METADATA` entry.

## Public and Internal Imports

The public barrel exports only:

- `rollDices`
- `onRollResult`
- `validateNotation` and `diagnoseNotation` (structured `NotationDiagnostic`; spec 011)
- `isSuccessPool` and `withPoolSetBonus` (neutral pool helpers for system readings)
- `RollResult`, `FullRollResult`, `NotationDiagnostic`, `NotationErrorKind`, and `LimitName` types

UI outside this module may use that barrel. Dice internals and their unit tests should import the owning file directly, so widening the public API is an explicit decision.

## Invariants

- Parsing rejects lexer errors, missing operands/parentheses/comparison values, and trailing tokens.
- Limits live in `utils/constants.ts`: notation length, AST size, numeric magnitude, logical dice, sides, custom faces, recursive modifiers, physical 3D dice, and roll duration.
- Exponentiation is currently left-associative; changing that is a notation compatibility decision.
- Modifier order is defined in `dice-evaluator.ts` and documented in `.agents/skills/dice-logic/references/modifiers.md`.
- A logical d100 consumes two physical d10 values in 3D.
- 3D timing runs on simulated time (the physics step count), never on frames or the wall clock: rest before read-out (`REST_SECONDS` below `VELOCITY_THRESHOLD` and a tipping spin below `ANGULAR_VELOCITY_THRESHOLD`), the `MAX_ROLL_SECONDS` limit, time to react, and show/fade (`SHOW_SECONDS`, `FADE_SECONDS`). A frame advances at most ten 1/60 s steps, so a hidden tab pauses the roll instead of ending it.
- Dice feel is one setting, `diceLiveliness` (0 heavy – 100 lively, default 100 = the original physics bit for bit). `renderer/liveliness.ts` turns it into a `PhysicsProfile` (gravity, contact friction/restitution, damping, launch strength, sleep threshold); the world applies gravity and contacts, and `DiceRenderer.launch()` applies the per-die part at every throw, rethrow, explosion, and manual reroll. Heavy dice sleep when they creep, so pile-ups end instead of reaching the time limit.
- Large pools (dice #12): a throw of more than `FULL_SIZE_DICE_POOL` physical dice uses smaller dice (`diceScaleFor` in `roll-orchestrator.ts`, applied to the throw and its explosions), its dice sleep as soon as they are still, and they meet each other as spheres while their hulls meet only the table and walls (`applyCrowdCollisions` in `renderer/crowd.ts`; hull-to-hull tests dominated a pile's frame time). A die that has come to rest counts as moving again only above `WAKE_FACTOR` × the rest thresholds, so pile jitter cannot hold a roll open. `MAX_PHYSICAL_3D_DICE` is 200.
- Dice are cloned from per-look templates in `factory.ts` (type, fudge, colours, scale): the mesh geometry and atlas are shared and never disposed by a roll; each die owns its body, hull, and material, and only the material is disposed when the die leaves.
- Meshes follow the bodies' interpolated pose (smooth at any refresh rate); `DiceShape.create()` resets the interpolation state because a spawn is a teleport. Hover highlighting raycasts once per frame, not per pointer event.
- Each die draws with one `MeshPhongMaterial` whose map is a per-type/colour face atlas (`faceAtlas` in `geometries.ts`); the triangle groups and their material indices stay on the geometry because result reading finds faces by them. Never go back to a material per face: three.js issues a draw call per group.
- Start orientations are uniform random quaternions (`randomOrientation` in `shapes.ts`); an axis-angle draw is skewed, which shows when dice barely tumble.
- New dice enter the physics field through `separateSpawns` (`renderer/spawn.ts`): no two bounding spheres of airborne dice may intersect at spawn.
- Forced `@` values are the result in 2D and 3D. In 3D the orchestrator passes per-die targets (`physicalTargets`; a d100 aims its tens and ones d10) to `startRoll`; the renderer replays the throw in a copy of the world (`predictRestingFaces`, `PhysicsWorld.cloneForPrediction`) and turns each aimed die's mesh by a symmetry of the die (`faceTurn`, `DiceShape.faceOffset`) so the forced face ends up where the body lands. The flight is untouched; a throw disturbed from outside (a click, another roll) still reports the forced values. Prediction needs exact replay: `PhysicsWorld.step` takes fixed 1/60 s steps itself (cannon-es's own accumulator advances sleep time by wall time), and clones copy inertia (cannon-es derives it from the world-space box at the moment shapes were added).
- Roll context stored in session storage must be consumed or explicitly cleared when recalling context-free history entries.
- WoD threshold controls rewrite both per-die and parenthesized group success thresholds already present in the editor; clearing the threshold rewrites nothing.

## Testing

Run `yarn test` for parser/evaluator/notation changes and `yarn verify` before handoff. Renderer changes must keep `tests/dice_roller/renderer/display-conditions.test.ts` green: its harness runs the real renderer headless under simulated refresh rates, stutter, and hidden tabs. Tests using a mock random function consume all initial dice first, then values required by modifiers.

Load `.agents/skills/dice-logic/SKILL.md` before changing lexer, parser, evaluator, or 3D orchestration behavior.
