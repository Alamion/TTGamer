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

| #   | Status | Task                      | Description                                                                    | Priority |
| --- | ------ | ------------------------- | ------------------------------------------------------------------------------ | -------- |
| 2   | ✅     | **Nested group notation** | Support `(3d10+1d10)>=6f=1` — first separate roll groups, then apply modifiers | Medium   |

## 3D Renderer

| #   | Status | Task                               | Description                                                                                                          | Priority |
| --- | ------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| 3   | ⬜     | **Lazy load Three.js / cannon-es** | Dynamic imports for 3D packages to reduce initial bundle size                                                        | Medium   |
| 4   | 🟡     | **High-refresh-rate monitor fix**  | CCD threshold/radius commented out in `shapes.ts`; dice still sometimes disappear before stopping on 165hz+ displays | Low      |

## UI

| #   | Status | Task                                            | Description                                                                                                                                                             | Priority |
| --- | ------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 5   | ⬜     | **Multi-system dice pool tabs**                 | Add tabs for D&D, Pathfinder, Cthulhu with favorites                                                                                                                    | Low      |
| 6   | ⬜     | **RollHistory body click for favorites/recent** | Favorites & Recent items have no `onBodyClick` (clicking the body does nothing). Decide what a click should do (e.g. set notation, expand). Design pending — not a bug. | Low      |
