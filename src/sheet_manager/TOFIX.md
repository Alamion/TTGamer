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

---

## 🟢 Medium

### F-001 — DataCatalog dropdown opens via a separate "View" button instead of the row

**Area:** `src/sheet_manager` — data catalog UI (documentation data catalogs)

**Evidence:** In the DataCatalog the dropdown/list opens by clicking a dedicated "View" button
rather than the row itself. The change was made for accessibility (Tab-selectable control), but
in practice it works poorly: the primary interaction (open a row) is no longer on the row, which
breaks the expected catalog browsing pattern.

**Recommendation:** Rework the interaction together with the product owner (user review
2026-09-05): make the whole row the accessible, keyboard-selectable trigger (e.g. row-level
button or `role="button"` with proper focus/Enter handling) and remove the separate "View"
button, or find an a11y-clean pattern that restores row-click opening.

### F-002 — Bottom sheet shows cursor-grab on the left instead of centered

**Area:** `src/sheet_manager` — bottom sheet component (data catalog / sheets UI)

**Evidence:** The bottom sheet's drag affordance (`cursor: grab`) appears when hovering the left
part of the sheet header area instead of being centered on the drag handle, so the grab cursor
cue is misleading about where dragging starts.

**Recommendation:** Audit the drag-handle hit area and cursor styling: the `cursor-grab` region
should match the visible centered handle (and ideally cover the full header width if the whole
header is draggable). Fix together with F-001 in the same UI pass with user participation.
