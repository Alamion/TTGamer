# TODO

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.

---

## Legend

- ✅ **DONE**
- 🟡 **IN PROGRESS**
- ⬜ **NOT DONE**

---

## Discord Webhook

| #   | Status | Task                                  | Description                                                                                                                      | Priority |
| --- | ------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | 🟡     | **Backend proxy for Discord webhook** | Replace client-side `fetch()` to Discord API with a backend proxy endpoint (`/api/discord/roll`) to keep webhook URL server-side | High     |

## Dice Parser

| #   | Status | Task                              | Description                                                                                                                                                | Priority |
| --- | ------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 2   | ✅     | **Nested group notation**         | Support `(3d10+1d10)>=6f=1` — first separate roll groups, then apply modifiers                                                                             | Medium   |
| 3   | ⬜     | **Structured parser diagnostics** | Return an error code, token span, and expected-token details so the notation UI can highlight the exact failure instead of only showing “Invalid notation” | Medium   |

## 3D Renderer

| #   | Status | Task                               | Description                                                                                                                                                                     | Priority |
| --- | ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 4   | ✅     | **Roll-session ownership**         | One shared physical field with session-bound lock/reroll/add/settle/manual/arrange/dismiss operations and per-roll physical budgets                                             | High     |
| 5   | 🟡     | **Orchestrator integration tests** | Compound/penetrating explosions, caps, and concurrent handle ownership are covered; add mixed supported/unsupported groups, d100 rerolls/explosions, fallback, and cancellation | High     |
| 6   | ⬜     | **Lazy load Three.js / cannon-es** | Dynamic imports for 3D packages to reduce initial bundle size                                                                                                                   | Medium   |

## UI

| #   | Status | Task                                            | Description                                                                                                                                                             | Priority |
| --- | ------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 8   | ⬜     | **Multi-system dice pool tabs**                 | Add tabs for D&D, Pathfinder, Cthulhu with favorites after renderer session ownership and orchestrator tests (#4–5)                                                     | Low      |
| 9   | ⬜     | **RollHistory body click for favorites/recent** | Favorites & Recent items have no `onBodyClick` (clicking the body does nothing). Decide what a click should do (e.g. set notation, expand). Design pending — not a bug. | Low      |
| 10  | ⬜     | **Touch alternatives for secondary actions**    | Add visible or long-press-safe alternatives for right-click reroll/anonymize actions without removing desktop shortcuts                                                 | Medium   |
| 11  | ✅     | **InlineRoll transition contract**              | Prop changes cancel transitions and reset unless `preroll` recalculates; animation duration, rapid changes, and unmount cleanup have fake-timer coverage                | Medium   |
