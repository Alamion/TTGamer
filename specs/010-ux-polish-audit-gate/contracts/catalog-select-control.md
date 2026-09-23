# Contract: catalog-bound select control

**Location**: `src/sheet_manager/features/sheet/declarative/fieldControls.tsx`
**Reused component**: `src/sheet_manager/components/controls/CatalogSuggest.tsx` (unchanged)

## Selection rule

| Field                         | Options               | Control                                     |
| ----------------------------- | --------------------- | ------------------------------------------- |
| bound single-select           | > 12 resolved options | searchable (`CatalogSuggest` wrapper)       |
| bound single-select           | ≤ 12 resolved options | plain `<select>` (today's control)          |
| bound multi-select            | any                   | plain `<select multiple>` (today's control) |
| static options (no `binding`) | any                   | plain `<select>` (today's control)          |

## Value contract

- The value written through `onChange` is the option's `value` — identical to what the
  plain `<select>` writes for the same entry. Catalog fills in
  `DeclarativeSheetView.handleChange` therefore continue to fire unchanged.
- An empty query clears the field to `undefined`, matching the plain select's `—` option.
- A stored value with no matching option is preserved and displayed as its raw stored
  text; the control must never silently clear it.
- Search matches the entry's label and its id, case-insensitively and insensitively to
  `ё`/`е` and diacritics (`matchesSearch`), so bilingual "Localized (English)" labels
  match in either language.

## Accessibility contract

- The control carries `field.label` as its accessible name.
- Fully operable by keyboard: focus the input, type, move through results, choose, and
  leave — no pointer required.
- At phone width the suggestion popover must not cover the input it belongs to.

## Test hooks

- Threshold unit test: 12 options → plain, 13 → searchable, multiple → plain.
- Component test: typing a Russian fragment narrows the list; choosing an entry writes
  the option value and triggers the bound catalog fills.
- Component test: a stored value absent from the catalog renders and survives a render
  pass without being cleared.
