# Code Review: `src/data/` & `src/shared/components/`

## ✅ Fixed (2026-06-12)

| ID  | File(s)                       | What was done                                                                                                                                                   |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `DataCatalog/types.ts`        | Deleted orphaned file (type was duplicated in `DataCatalog.tsx`, barrel already re-exported from there)                                                         |
| H2  | `DataCatalog/DataCatalog.tsx` | Relaxed generic from `T extends { id: string; name: string }` to `T extends { id: string }`; detail panel falls back to `selectedItem.id` when `name` is absent |
| H3  | `TWWrapper.tsx`               | Changed `import React` → `import type { ReactNode }`; `React.ReactNode` → `ReactNode`                                                                           |
| M1  | `EntityCard.tsx`              | Replaced `aria-describedby={undefined}` with a proper `useId()`-generated reference pointing to a visually-hidden description inside the popover                |
| M2  | `attributeConfig.tsx`         | Added `enableSorting: true` to category column (was missing vs `ABILITY_COLUMNS`)                                                                               |
| M3  | `DataCatalog/DataCatalog.tsx` | Removed unnecessary `defaultGetRowId` wrapper + cast; inlined `(item: T) => item.id`                                                                            |
| M5  | `DocCharData.tsx`             | Added `: ReactNode` return type                                                                                                                                 |
| —   | `EntityCard.tsx` (EntityGrid) | Replaced `useState`/`useEffect` media query with `useSyncExternalStore` to fix pre-existing `react-hooks/set-state-in-effect` lint error                        |

## 🟢 Remaining (Low Priority)

### L1 — `DataCatalog` debounce only applies to URL sync, not filtering

**File:** `DataCatalog/DataCatalog.tsx`

Every keystroke immediately updates `globalFilter`, causing `@tanstack/react-table` to re-filter. Only the URL `history.replace` is debounced. For large datasets (1000+ rows) this can cause jank. Consider debouncing the filter state itself and/or virtualizing the table rows.

### L2 — Inconsistent scale dot rendering uses string concatenation

**Files:** `abilityConfig.tsx`, `attributeConfig.tsx`

```tsx
{
    '\u2022'.repeat(i + 1);
}
{
    s;
}
```

Works fine, but fragile if the dots ever need separate styling. Not urgent.

## ℹ️ Pre-existing Notes

### TanStack Table React Compiler warning

**File:** `DataCatalog/DataCatalog.tsx:52`

ESLint warns `react-hooks/incompatible-library` about `useReactTable()`. This is a known false-positive from React Compiler's static analysis — `useReactTable` is stable and widely used. No action needed.

### M4 — `gridAutoFlow: 'column'` in `EntityGrid`

**File:** `EntityCard.tsx` _(confirmed correct — see review discussion)_

The column-first layout is intentional to support attribute categories (Physical → Social → Mental) maintaining their grouping across responsive breakpoints. Not a bug.
