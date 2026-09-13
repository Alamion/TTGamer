# Contract: Template Formula Grammar (arithmetic only)

**Feature**: 006-template-composition-usability | **Status**: Draft (Phase 1)
**Owner**: `src/sheet_manager/features/sheet/declarative/formula.ts`

Pure module: no UI, store, or system imports. Deterministic; errors are values, never throws.

## 1. Grammar

```ebnf
expression := term { ("+" | "-") term } ;
term       := factor { ("*" | "/") factor } ;
factor     := "-" factor | primary ;
primary    := number | coordinate | "(" expression ")" ;
number     := digit+ [ "." digit+ ] ;
coordinate := kebab-ident [ "." ("current" | "max") ] ;
kebab-ident := lower-alpha { [lower-alpha | digit | "-"] } ;   // value-key / binding-coordinate form
```

- Whitespace is insignificant. Numeric literals are finite decimals.
- **A bare coordinate is a valid formula** — one mechanism covers "max linked to a value"
  and "max computed by a formula" (`maxFrom: 'willpower.max'` vs `maxFrom: 'passion + self-control'`).
- Unicode minus/multiplication signs are **not** accepted (ASCII operators only) — editor
  validation normalizes nothing silently.

## 2. Coordinate resolution (unified, undifferentiated space)

`resolve(path) → number | undefined`. The resolver (in `hooks.ts`) unions, with no visible
distinction:

| Source                  | Coordinate form                         | Numeric meaning                   |
| ----------------------- | --------------------------------------- | --------------------------------- |
| Template numeric field  | `<valueKey>`                            | stored number                     |
| Template rating field   | `<valueKey>`                            | stored dots value                 |
| Template resource field | `<valueKey>.current` / `<valueKey>.max` | pool parts                        |
| System trait binding    | `<trait-coordinate>` (kebab trait key)  | trait value                       |
| System resource binding | `<resourceId>.current` / `.max`         | pool parts (e.g. `willpower.max`) |

Non-numeric coordinates (text, toggles, lists, images, tracks, identity string fields) are
**not offered** to formulas and resolve as unknown. The authoring picker lists every valid
numeric coordinate with its human label (system labels from the profile; custom labels from
the template) — the system/custom split stays invisible.

## 3. Evaluation and error states

- Evaluation resolves coordinates to numbers; any unknown coordinate →
  `{ ok: false, error: 'unknown-coordinate' }` (render: labeled degraded state naming the
  coordinate; authoring: flagged with the same name).
- Division by zero and non-numeric sources surface as explicit error states — the field shows
  an error, never a silent fallback number.
- Results are numbers (integers are not forced; rating clamping compares and clamps, display
  rounds per the control's presentation).

## 4. Dependencies and cycles

- `collectDependencies(expr)` extracts every coordinate path — used for the authoring picker
  pre-fill and the dependency graph.
- At template save, the graph over all `formula` fields and `maxFrom` values is checked:
  a cycle is rejected with the named path (`a → b → a`). Chains through coordinates that
  alias document data (system traits) cannot cycle and are exempt.
- At render, resolution is memoized per pass and guarded by a visited set; a cycle that
  somehow appears at render (template edited elsewhere) yields the labeled `circular` error
  state — defense in depth, never a hang.

## 5. Storage rules (A4)

- Formula results are never persisted — recomputed each render; memoized within a pass.
- `maxFrom` clamping: display shows `min(stored, resolvedMax)`; the write path clamps only
  when the bounded value itself is edited. Cap changes never rewrite stored history.
- System-derived minimums keep their existing ownership (e.g. Willpower's virtue-derived
  minimum remains system-owned; `maxFrom` may further bound the editable ceiling).
