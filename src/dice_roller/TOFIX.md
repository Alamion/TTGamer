# TOFIX — Dice Roller Module

**Version:** 3.8.0
**Last updated:** September 2026

## Legend

| Icon        | Meaning                                     |
| ----------- | ------------------------------------------- |
| 🟠 Critical | Data corruption, crash, or major UX failure |
| 🟡 High     | Significant code smell, refactor needed     |
| 🟢 Medium   | Minor code quality issue                    |
| ⬜ Low      | Nitpick / nice-to-have                      |
| ✅ DONE     | fully implemented                           |

---

## 🟡 High

### Discord webhook sends from client (tracked as root TOFIX F-001)

See root `TOFIX.md` — cross-cutting issue, severity owned there. Dice roller owns the UI components (`DiscordWebhookSubscription`, `DiceRollerSettingsModal`, `sessionStorage`) but the fix requires a backend proxy.

### Three.js resource ownership and disposal

`ResourceTracker` does not consistently attach a single geometry/material child to its parent ownership map, and scene removal paths do not always dispose owned GPU resources. Repeated rolls and resizes can therefore retain buffers, materials, or textures.

**Files:** `dice-logic/renderer/resource.ts`, `scene.ts`, and `renderer.ts`

**Fix prerequisites:** define shared-resource ownership/reference counting, route removal through one release operation, add fake disposable-resource tests, then run a manual repeated-roll/resize stress check. Do not blindly dispose shared materials while live dice still reference them.

## 🟢 Medium

### 3D physics artifacts (tracked as root TOFIX F-004 and F-005)

See root `TOFIX.md`. F-004: dice spawn inside each other and scatter at high speed. F-005: show/fade phases are frame-counted, so roll timing depends on the display refresh rate (supersedes the former "High-refresh-rate settling" entry). Both are reproduced first by the display-condition tests (root T-066).

---

## ✅ Done

- `buildDiscordHistoryMessage` type hack (`undefined as unknown as string`) — FIXED: `details`/`formatted` made optional
- `sessionStorage.ts` — empty catch blocks now log warnings
- `Root.tsx` inline roll toast — extracted to `RollToastContent` component
- Nested-parenthesis notation merge — FIXED: groups are matched by bracket depth, nested groups stay balanced and keep enclosing modifiers
- `mergeDiceNotation` edge cases not tested — DONE: added tests for `d%`, fudge dice, custom faces, and new-die-modifier-wins behavior in `tests/dice_roller/logic/notation-utils.test.ts`
