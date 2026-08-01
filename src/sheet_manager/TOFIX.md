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

## 🟢 Medium

### Multi-file import toast order

`SheetLayout.tsx` uses `Array.from(files).forEach()` with async `FileReader` callbacks. When importing multiple files simultaneously, toast notifications may not appear in file-visit order.

**File:** `src/sheet_manager/features/sheet/components/SheetLayout.tsx:60-78`

---

## ✅ Done

- `mergeDiceNotation`/`splitTopLevel` moved from `StatDot.tsx` to `src/dice_roller/dice-logic/notation-utils.ts`
- `DEFAULT_TRAIT_VALUE` renamed to `DEFAULT_ATTRIBUTE_VALUE` (M5)
