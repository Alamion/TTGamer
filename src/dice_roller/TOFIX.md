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

## ✅ Done

- `buildDiscordHistoryMessage` type hack (`undefined as unknown as string`) — FIXED: `details`/`formatted` made optional
- `sessionStorage.ts` — empty catch blocks now log warnings
- `Root.tsx` inline roll toast — extracted to `RollToastContent` component
- `mergeDiceNotation` edge cases not tested — DONE: added tests for `d%`, fudge dice, custom faces, and new-die-modifier-wins behavior in `tests/dice_roller/logic/notation-utils.test.ts`

---

## ℹ️ Pre-existing

- 3D dice disappearing before all stop on high-refresh displays — partially mitigated, CCD threshold commented out
- `mergeDiceNotation` merges into the _first_ nested-paren group via a regex that stops at the first `)`, so deeply nested groups (e.g. `((3d10+1d10)>=6)`) can produce unbalanced output. Only reachable via manually typed notation; the dice UI generates single-level groups.
