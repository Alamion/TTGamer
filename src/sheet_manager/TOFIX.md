# TOFIX — Sheet Manager Module

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

## ✅ Done

- `mergeDiceNotation`/`splitTopLevel` moved from `StatDot.tsx` to `src/dice_roller/dice-logic/notation-utils.ts`
- `DEFAULT_TRAIT_VALUE` renamed to `DEFAULT_ATTRIBUTE_VALUE` (M5)
- Multi-file import order — DONE: files are awaited sequentially with `File.text()`, and ID collisions use an explicit Replace/Duplicate/Cancel flow
