# Data Model: Rating element parity with trait rows

## Rating field (template node, `types/template.ts`)

| Property       | Type                                                    | Default  | Notes                                                                                                                                                                 |
| -------------- | ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `min`          | int ≥ 0                                                 | 0        | The floor. Unchanged.                                                                                                                                                 |
| `max`          | int 1..100                                              | required | The static maximum. It decides only when there is no `maxFrom` or `maxFrom` is degraded (R3).                                                                         |
| `maxFrom`      | formula                                                 | —        | The computed maximum. Once resolved, it decides up to 100.                                                                                                            |
| `presentation` | `'dots' \| 'number'`                                    | `'dots'` | `'boxes'` is read as `'dots'` (R2).                                                                                                                                   |
| `textInput`    | boolean?                                                | off      | **New.** Adds a free-text input between the label and the value.                                                                                                      |
| `showNumbers`  | boolean?                                                | off      | **New.** Adds a "current / maximum" display after the value.                                                                                                          |
| `dice`         | boolean?                                                | off      | **New.** Adds a die symbol that rolls the value through the system's `traitPool`.                                                                                     |
| `flags`        | `('specialization' \| 'practiced' \| 'experienced')[]`? | none     | **New.** The S/P/E toggles to show. The values must be unique. They are rendered on the dot style only, and kept on the number style so switching back restores them. |

Base field properties (`label`, `hideLabel`, `description`, `valueKey`, placement, `visibleWhen`)
are unchanged.

**Validation**:

- `min ≤ max`, as today.
- `flags` has no duplicates.
- Unknown `presentation` values fail as before. Only `'boxes'` is aliased.

## Rating value (document value bag, `types/templateValues.ts`)

| Key                 | Value                                                                                                       | Written when                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `<valueKey>`        | int, `min ≤ v ≤ 100` (R3)                                                                                   | The user sets a dot or types a number. |
| `<valueKey>#detail` | `{ text?: string ≤ 10 000, specialization?: boolean, practiced?: boolean, experienced?: boolean }` (strict) | The user types text or toggles a flag. |

**Rules**:

- Formulas, `maxFrom`, and `visibleWhen` read only `<valueKey>`.
- A missing or invalid `#detail` entry reads as `{}`: empty text, all flags off.
- Clearing the text stores `text: ''`. Entries are not deleted, which keeps writes symmetric.
- Bag key length limit: 64 → 72 (R1).
- Old documents parse unchanged: numbers above the static maximum are now kept rather than hidden.

## Derived at render time (not stored)

- `effectiveMax`:
    - `maxFrom` resolved: `clamp(floor(resolved), max(1, min), 100)`;
    - otherwise: `max`.
- `shown`: `min(stored, effectiveMax)`.
- `clamped`: `stored > effectiveMax`. The row then shows the clamp marker (R7).
- Roll: `traitPool(shown, { specialization, experienced, practiced })`, where a flag that is not
  enabled on the element is `false`.
