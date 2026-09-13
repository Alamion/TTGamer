# TOFIX — Dice Roller Module

**Version:** 3.0.0
**Last updated:** June 2026

## Legend

| Icon        | Meaning                                     |
| ----------- | ------------------------------------------- |
| 🟠 Critical | Data corruption, crash, or major UX failure |
| 🟡 High     | Significant code smell, refactor needed     |
| 🟢 Medium   | Minor code quality issue                    |
| ⬜ Low      | Nitpick / nice-to-have                      |
| ✅ DONE     | fully implemented                           |

---

## 🟠 Critical

### Discord webhook sends from client (tracks in root TOFIX.md)

See root `TOFIX.md` — cross-cutting issue. Dice roller owns the UI components (`DiscordWebhookSubscription`, `DiceRollerSettingsModal`, `sessionStorage`) but the fix requires a backend proxy.

---

## 🟡 High

### Three.js resource ownership and disposal

`ResourceTracker` does not consistently attach a single geometry/material child to its parent ownership map, and scene removal paths do not always dispose owned GPU resources. Repeated rolls and resizes can therefore retain buffers, materials, or textures.

**Files:** `dice-logic/renderer/resource.ts`, `scene.ts`, and `renderer.ts`

**Fix prerequisites:** define shared-resource ownership/reference counting, route removal through one release operation, add fake disposable-resource tests, then run a manual repeated-roll/resize stress check. Do not blindly dispose shared materials while live dice still reference them.

## 🟢 Medium

### Nested-parenthesis notation merge

`mergeDiceNotation` merges into the first nested-parenthesis group via a regex that stops at the first `)`. Deeply nested input such as `((3d10+1d10)>=6)` can become unbalanced. The dice UI currently generates single-level groups, so this is limited to manually typed notation.

## ⬜ Low

### High-refresh-rate settling

Dice can still disappear before settling on 165 Hz+ displays. CCD threshold/radius remains commented out in `shapes.ts`; reproduce and profile before changing physics parameters.

---

## ✅ Done

- `buildDiscordHistoryMessage` type hack (`undefined as unknown as string`) — FIXED: `details`/`formatted` made optional
- `sessionStorage.ts` — empty catch blocks now log warnings
- `Root.tsx` inline roll toast — extracted to `RollToastContent` component
- `mergeDiceNotation` edge cases not tested — DONE: added tests for `d%`, fudge dice, custom faces, and new-die-modifier-wins behavior in `tests/dice_roller/logic/notation-utils.test.ts`
