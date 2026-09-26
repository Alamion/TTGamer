# Research: Rating element parity with trait rows

No item in the Technical Context was left as NEEDS CLARIFICATION. The spec had one open product
decision: the "boxes" style is removed. The decisions below settle how the feature is built.

## R1. Where the text and flags are stored

**Decision**: The rating's number stays where it is: a plain number under the field's value key
in the document's value bag. The text and flags go into one companion entry, stored under the key
`<valueKey>#detail` with the shape `{ text?, specialization?, practiced?, experienced? }`. The
companion is written only once the user types text or toggles a flag. A missing or invalid
companion reads as empty text with all flags off.

**Rationale**:

- Nothing that reads a rating's number changes: formulas and `maxFrom` (`bagNumber`), display
  conditions, shared value keys, copy-on-select fills, document export, and the preview sample
  values.
- The companion key derives from the value key. Ratings that share a value key therefore share
  the text and flags as well (FR-017), with no extra wiring.
- `#` cannot appear in a template identifier, so the companion key can never collide with a
  field's value key or a table block key.
- Old documents have no companion and read as empty and off (FR-016).

**Changes it needs**:

- The bag's key length limit (`TemplatePageValuesSchema`, currently 64, the same as the
  identifier maximum) rises to 72, so that `<64-char key>#detail` fits. This only widens what
  parses, so every stored document still loads.
- The bag's value union gains a strict `RatingDetailSchema`. It goes after the table-rows member
  so that table values keep parsing as before.
- `validateTemplatePageValues` validates a changed `…#detail` key against `RatingDetailSchema`
  when its base key belongs to a rating field. Otherwise it passes the key through unchanged, as
  it does today for orphans.

**Alternatives considered**:

- _Store the rating as an object `{ value, text, flags }`._ This would touch every numeric
  reader: the formula resolver, `visibleWhen`, `maxFrom`, `coerceStoredValue`, sample data, and
  fields of other types that share the key. Stored numbers would also need migrating. Rejected.
- _One companion key per part (`#text`, `#s`, `#p`, `#e`)._ This means four entries per rating
  and uses up the per-template entry limit faster. Rejected.

## R2. Removing the "boxes" style

**Decision**: `RatingFieldSchema.presentation` becomes `z.enum(['dots', 'number'])`, wrapped in a
`z.preprocess` that maps `'boxes'` to `'dots'`. `TEMPLATE_SCHEMA_VERSION` stays 3. The editor
drops the option, and the `ratingBoxes` message is removed from the YAML.

**Rationale**:

- Stored, imported, and shipped templates normalize when they are parsed. Values are untouched,
  since they never depended on the style.
- Parsing never fails and raises no editor issue (FR-006, SC-005).
- A preprocess on one property keeps the member a `ZodObject`, which the discriminated union
  requires.

**Alternatives considered**:

- _A template schema version bump with a migration step._ This is heavier than needed for a
  one-value alias. Rejected.
- _Keep "boxes" and hide it in the editor._ This leaves a dead style in the renderer. Rejected.

## R3. Which maximum decides

**Decision**: The effective maximum is computed as follows:

- When `maxFrom` resolves: the resolved value, rounded down and clamped to
  `[max(1, min), TEMPLATE_LIMITS.ratingMax]`.
- When there is no `maxFrom`, or its source is unavailable (the degraded state): the static
  `max`.

The same effective maximum drives the number of dots, the number input's maximum, and the write
clamp.

`validateRating` bounds the value by `field.min` and `TEMPLATE_LIMITS.ratingMax`, no longer by
`field.max`. The static maximum is a display and default setting, not a storage limit.

**Rationale**:

- The write refusal comes from two places: `validateRating` rejects anything above the static
  `max`, and `coerceStoredValue` then hides the stored value altogether. Moving the storage bound
  to the schema limit fixes both at once.
- The value is still bounded, by the same limit the editor enforces on `max`.
- A value above the current maximum is kept and shown with the clamp marker (FR-012).

**Alternatives considered**:

- _Pass the resolved maximum into the write validation._ The write layer has no formula state,
  so this would thread render-time state into persistence. Rejected.

## R4. Rendering: one row for both styles

**Decision**: A new stat-field atom, `RatingRow` (`components/stat-fields/RatingRow.tsx`), lays
the rating out like `TraitRow` and `TraitRowWithInput`, reusing their `term-row` classes:

- the label (`StatLabel`, with the term link);
- the optional text input, which wraps to its own line through the existing
  `term-row-specialty` container query;
- the value: `StatDot` for the dot style, or `NumberInput` together with the die for the number
  style;
- the optional numbers and the clamp marker.

`RatingFieldControl` renders `RatingRow`. `FieldCell` returns the rating control without its
stacked label span, as it already does for formulas. The label stays the accessible name, and
`hideLabel` makes it `sr-only`. The description line stays under the row.

**Rationale**:

- SC-001 asks for no visible difference from the shipped rows. Composing the same atoms and
  classes is the only way to keep that true over time.
- `TraitRow` itself cannot hold a number input or the numbers display without growing props it
  does not need.

**Alternatives considered**:

- _Render `TraitRowWithInput` directly._ It has no number style and no numbers display, and it
  always shows the input. Rejected.

## R5. Per-flag options and the die on the number style

**Decision**:

- `StatDot` gains `flags?: readonly TraitFlag[]`, the subset of S/P/E to show.
  `showFlags={true}` keeps meaning all three, so existing callers are unchanged.
- The die button moves out of `StatDot` into `StatDiceButton` (same file folder). `StatDot` uses
  it as before, and `RatingRow` uses it next to the number input.
- Rolls go through `useDocumentTraitDiceRoll()` (the system's `dice.traitPool`). A flag that is
  not enabled is passed as `false`.
- The roll label is the rating's displayed label. The character name comes from the document
  title, which `StatDot` already passes to `useSheetDiceActions`.

**Rationale**:

- Rolls use one code path for trait rows and ratings, so SC-002 holds by construction.
- The rating adds no system conditionals. V5 ignores the flags because its `traitPool` does.

## R6. Hitboxes and the compressed look

**Decision**: `StatDot`'s dot list is restructured:

- The container drops `gap-1` and gains `-mx-0.5`.
- Each button becomes a transparent cell (`min-w-0 shrink px-0.5`) that holds the visible dot as
  a span: `block h-4 w-4 max-w-full rounded-full border-2` (with the size variants).

The 2 px padding on each side reproduces the old 4 px gap, and the negative margin keeps the
row's outer width. When the row is too narrow, the cells shrink and the spans narrow into pills
at full height, as the buttons do today. The change applies to every `StatDot`, so trait rows get
the same hitboxes.

**Rationale**:

- It fixes FR-014 without changing the look.
- The shared atom keeps ratings and trait rows identical (SC-001).

**Alternatives considered**:

- _Pseudo-element hit areas (`::before` with negative inset)._ Overlapping pseudo-elements fight
  over the gap, and pointer targeting depends on stacking order. Rejected.

## R7. Clamp marker when the numbers are off

**Decision**: When the stored value is above the effective maximum, the row shows the stored
value in parentheses in the error color. It carries the existing `formulaClamped` title and an
`aria-label`. It appears whether or not the "current / maximum" numbers are on. When they are
on, it follows them, as today.

## R8. Editor, guide, storybook

**Decision**:

- **Editor**: the `FieldEditor` rating block keeps min, max, and style. It adds switches for:
    - the text input;
    - the numbers;
    - the die;
    - on the dot style only, S, P, and E.

    Each switch has a hint and a guide link, following the existing `EDITOR_GUIDE` help mechanism.
    A new anchor, `rating`, goes in `docs/template-editor/elements.mdx` and its ru mirror. The
    elements table entry for Rating drops "boxes".

- **Storybook**: the "Numbers, toggles, ratings, resources" section of `stories.ts` gets a
  rating per option. It swaps the old `rating-boxes` story for these, and the maxFrom story
  shows 30 of 30 selectable. `tests/sheet_manager/storybook.test.tsx` requires each rating
  option.

## R9. T-058 dependency

**Decision**: T-058 stays open. Ratings whose value source is a system trait already render
through the system trait row (`isTraitSource` in `FieldEditor`). They keep their current
settings. This feature makes the custom rating match those rows and does not change them.
