# Contract: Rating row on the sheet and rating settings in the editor

## Sheet row (`RatingRow`)

Order, left to right:

```text
[label] [text input?] [die? + S/P/E?  over dots] [current / max?] [(clamped)?]
[label] [text input?] [die?] [number input]      [current / max?] [(clamped)?]
```

**Label**:

- `StatLabel` with the field's term link.
- With `hideLabel`, it is `sr-only`, and the dots group and the number input still take the label
  as their accessible name.
- The `required` asterisk follows the label, as on other fields.

**Text input**:

- The same classes as `TraitRowWithInput`: underline, `min-w-[8ch]`, grows to fill the row.
- On narrow rows it wraps to its own line through the `term-row-specialty` container query.
- Its accessible name is "<label>: text".
- Enter blurs it.

**Dots**:

- The `StatDot` atom, one per point from 1 to `effectiveMax`.
- A click sets the value, and clicking the current value lowers it by one.
- A value never goes below `min`.
- Dots up to the floor use the darker floor shade.

**Number input**:

- `NumberInput`, with `min` = the field's floor, `max` = `effectiveMax`, and step 1.

**Die** (both styles):

- A left click queues the roll, and the other mouse button rolls it at once.
- The die is hidden when the system has no `traitPool`.
- Nothing is queued when the value is 0.
- The die is disabled when the document is read-only.

**Flags** (dot style only):

- Only the flags listed in `field.flags` appear, in the order S, P, E, with the same colors and
  titles as trait rows.

**Numbers**: `shown / effectiveMax` in `text-xs text-textSecondary`, shown only when
`showNumbers` is set.

**Clamp marker**: `(stored)` in `text-error`, with the `formulaClamped` title. It is shown when
`stored > effectiveMax`, regardless of `showNumbers`.

**Degraded `maxFrom`**: the existing `role="alert"` notice under the row.

**Description**: under the row, in `text-xs text-textSecondary`, as for other fields.

## Dot hitboxes (`StatDot`, every caller)

- Each dot button is a cell that covers its visible dot and half of the gap on each side. There
  is no gap between cells, and the outer width is unchanged.
- The visible dot keeps its size (`sm` 12 px, `md` 16 px, `lg` 20 px) and a 4 px visual gap.
- When the row is too narrow, the visible dots narrow into pills at full height. The row never
  wraps or overflows.
- Roles are unchanged: `radiogroup` with `radio` buttons.

## Editor (`FieldEditor`, rating with a custom value source)

| Control                        | Shown when    | Writes                          | Help anchor |
| ------------------------------ | ------------- | ------------------------------- | ----------- |
| Minimum, maximum               | always        | `min`, `max`                    | existing    |
| Style: Dots / Number           | always        | `presentation`                  | `rating`    |
| Text input                     | always        | `textInput`                     | `rating`    |
| Show current / maximum         | always        | `showNumbers`                   | `rating`    |
| Die                            | always        | `dice`                          | `rating`    |
| Flags: S, P, E (three toggles) | style is Dots | `flags` (kept in S, P, E order) | `rating`    |

Ratings whose value source is a system trait keep today's editor. They render the system's trait
row (T-058).

## Guide

`docs/template-editor/elements.mdx` (en) and its ru mirror:

- The elements table row for Rating reads "Dots or a number".
- A new `### Rating {#rating}` section describes:
    - the floor;
    - the static and computed maximum;
    - each switch;
    - that S/P/E affect the pool only where the system's dice rule uses them (Star Wars: yes; V5:
      no);
    - that templates saved with "boxes" open as dots.
