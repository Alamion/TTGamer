# TODO

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.

---

## Legend

- ✅ **DONE**
- 🟡 **IN PROGRESS**
- ⬜ **NOT DONE**

---

## Discord Webhook

| #   | Status | Task                                  | Description                                                                                                                                             | Priority |
| --- | ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | 🟡     | **Backend proxy for Discord webhook** | Tracked as root T-016. Replace client-side `fetch()` to Discord API with a backend proxy endpoint (`/api/discord/roll`) to keep webhook URL server-side | High     |

## Dice Parser

| #   | Status | Task                                 | Description                                                                                                                                                                                                                                                                                                                                                                                      | Priority |
| --- | ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 2   | ✅     | **Nested group notation**            | Support `(3d10+1d10)>=6f=1` — first separate roll groups, then apply modifiers                                                                                                                                                                                                                                                                                                                   | Medium   |
| 3   | ✅     | **Structured parser diagnostics**    | Return an error code, token span, and expected-token details so the notation UI can highlight the exact failure instead of only showing “Invalid notation”                                                                                                                                                                                                                                       | Medium   |
| 15  | ✅     | **V5 dice pools (VtM 5e / H:tR 5e)** | Tracked as root T-045. Evaluate V5-engine pools: successes on 6+, each pair of 10s adds two extra successes (critical), a distinct die subset (Hunger dice in VtM 5e, Desperation dice in H:tR 5e) rendered in its own color, and the special outcomes that subset triggers (messy critical / bestial failure; Overreach / Despair). Manual counting is enough for now; implement in queue order | Medium   |

## 3D Renderer

| #   | Status | Task                               | Description                                                                                                                                                                                                                                                                                                                                                                                                    | Priority |
| --- | ------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 4   | ✅     | **Roll-session ownership**         | One shared physical field with session-bound lock/reroll/add/settle/manual/arrange/dismiss operations and per-roll physical budgets                                                                                                                                                                                                                                                                            | High     |
| 5   | 🟡     | **Orchestrator integration tests** | Compound/penetrating explosions, caps, and concurrent handle ownership are covered; add mixed supported/unsupported groups, d100 rerolls/explosions, fallback, and cancellation                                                                                                                                                                                                                                | High     |
| 6   | ✅     | **Lazy load Three.js / cannon-es** | Tracked as root T-013. Done in spec 010: the renderer chunk loads on the first 3D roll                                                                                                                                                                                                                                                                                                                         | Medium   |
| 12  | ✅     | **Large-roll 3D performance**      | Done: one material per die from a packed face atlas (was a draw call per triangle), pools above `FULL_SIZE_DICE_POOL` shrink (`diceScaleFor`), sleep once still, and collide die-to-die as spheres; interpolated rendering and shared templates keep frames even, resting dice ignore solver jitter; 3D limit 200 physical dice (the parser allows 200 dice per roll). 100 d20 ≈ 53 fps on integrated graphics | Low      |
| 13  | ✅     | **Simplified gravity setting**     | One user-facing control for how dice settle: the "Dice feel" slider (`diceLiveliness`) from heavy (dice grip and stop almost on landing) to lively (the original hop-and-tumble, default); `renderer/liveliness.ts`                                                                                                                                                                                            | Low      |
| 14  | ✅     | **Predetermined 3D rolls**         | Done for forced `@` values: the throw is replayed ahead of time (`predictRestingFaces`) and each aimed die's mesh is turned by a symmetry of the die (`faceTurn`) so the forced face lands up; no face weighting or nudging, the flight is the physical one. Replay costs ~0.1–0.2 s for ordinary pools, ~1 s for 200 dice                                                                                     | Low      |
| 16  | ✅     | **Display-condition tests**        | Tracked as root T-066. Headless renderer loop under a fake clock at 30–240 Hz and irregular frame times (`tests/dice_roller/renderer/`); reproduced and closed root F-004 (spawn overlap scatter) and F-005 (refresh-rate-dependent timing)                                                                                                                                                                    | High     |
| 17  | ⬜     | **Cocked dice**                    | A die that comes to rest leaning on another die is read by the face closest to up (about 1 in 7 six-dice throws in the T-066 harness). Nudge such dice until they lie flat if players find the reading surprising                                                                                                                                                                                              | Low      |

## UI

| #   | Status | Task                                            | Description                                                                                                                                              | Priority |
| --- | ------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 8   | ⬜     | **Multi-system dice pool tabs**                 | Tracked as root T-015. Add tabs for D&D, Pathfinder, Cthulhu with favorites after renderer session ownership and orchestrator tests (#4–5)               | Low      |
| 9   | ✅     | **RollHistory body click for favorites/recent** | Clicking a Favorites or Recent entry puts its notation into the input (same as the set-notation button); chat entries still expand.                      | Low      |
| 10  | ⬜     | **Touch alternatives for secondary actions**    | Add visible or long-press-safe alternatives for right-click reroll/anonymize actions without removing desktop shortcuts                                  | Medium   |
| 11  | ✅     | **InlineRoll transition contract**              | Prop changes cancel transitions and reset unless `preroll` recalculates; animation duration, rapid changes, and unmount cleanup have fake-timer coverage | Medium   |
