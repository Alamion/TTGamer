# Contract: on-demand 3D renderer

**Producer**: `src/dice_roller/dice-logic/roll-orchestrator.ts`
**Consumer of the module**: `src/dice_roller/dice-logic/renderer/index.ts` (unchanged)
**Consumer of the outcome**: `src/dice_roller/utils/events.ts` → `onRollResult` subscribers → `src/dice_roller/components/Renderer3DFallbackNotice.tsx`

## Guarantees

1. No module reachable from a page's initial import graph references `three` or
   `cannon-es`. The only runtime edge into `renderer/` is a dynamic `import()` inside the
   orchestrator.
2. The import is attempted **after** all existing 2D decisions: 3D disabled, no supported
   sides, or more than `MAX_PHYSICAL_3D_DICE` physical dice each return before it.
3. The import promise is memoized at module scope: concurrent and repeated 3D rolls in one
   session share one download, and after a successful load nothing is fetched again. A
   rejected attempt clears the memo, so a later roll may retry (FR-004).
4. `executeUnifiedRoll`'s signature, its return type, and `dice-logic/index.ts` are
   unchanged (FR-005).
5. Type-only references (`DiceGeometryData`, `PhysicsRollHandle`) remain `import type`.

## Failure contract

| Situation                                            | Behavior                                                                                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dynamic import rejects (offline, blocked, chunk 404) | Evaluate the roll through the existing 2D path, return the normal result with `renderer3dUnavailable: true`, and report through `warn(..., '3DDiceRolls')`. |
| Import succeeds but geometry creation yields nothing | Existing behavior, unchanged (2D fallback with its current warning, no flag).                                                                               |
| Roll cancelled mid-flight                            | Existing `RollCancelledError` behavior, unchanged.                                                                                                          |

The orchestrator MUST NOT import UI, store, or toast code: the message is raised by
`Renderer3DFallbackNotice`, an `onRollResult` subscriber mounted in `src/theme/Root.tsx`,
which shows it at most once per session. A silent fallback is a defect (Principle III).

## Test hooks

- `tests/dice_roller/integration/roll-orchestrator.test.ts`: a 2D-only roll performs no
  import of `./renderer`; a 3D roll imports it exactly once across two rolls; a rejected
  import yields a correct 2D result carrying the flag.
- `tests/dice_roller/integration/renderer-sessions.test.ts` keeps mocking
  `dice-logic/renderer/renderer` and must stay green unchanged.
