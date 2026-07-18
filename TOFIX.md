# Code Review: `src/data/` & `src/shared/components/`

## 🟢 (Low Priority)

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

### 3D dices somewhat disappear before all stop (165hz monitor?)

_Partially mitigated in v3.3.0 — CCD threshold/radius commented out in `shapes.ts`. Still observable on high-refresh-rate displays._
