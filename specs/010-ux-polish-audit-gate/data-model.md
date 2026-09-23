# Phase 1 Data Model: Small UX polish and dead-code gate

No persisted shape changes. Character documents, template values, and the dice history
keep their current schemas, so no store migration and no envelope version bump.

## Changed in-memory shapes

### `RollResult` (`src/dice_roller/dice-logic/types.ts`)

| Field                    | Type                | Meaning                                                                                                                            |
| ------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| _(existing fields)_      | —                   | unchanged                                                                                                                          |
| `renderer3dUnavailable?` | `true \| undefined` | Set only when a 3D roll was requested and the renderer could not be loaded, so the result came from the 2D path. Absent otherwise. |

Rules:

- Additive and optional; every existing consumer keeps working without reading it.
- Set only by the orchestrator, only on the dynamic-import failure path — never on the
  other existing 2D fallbacks (3D disabled, unsupported sides, dice-count limit), which
  already have their own messages.
- Follows the `manuallyRerolled` precedent: produced in `dice-logic`, presented in UI.
- It is a transient presentation flag: it is not written to roll history storage and not
  included in shared (Discord) messages.

### `TemplateValuesBagSchema` (`src/sheet_manager/types/templateValues.ts`)

Removed as a name. `TemplatePageValuesSchema` is the single schema; `document.ts` uses
it directly for `templateValues`, carrying the comment that describes the document-global
bag keyed by `valueKey`. Validation behavior is byte-for-byte the same.

## Derived (not stored) values

### Control selection for a template select field

| Input                                                   | Source                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `field.type === 'select'` and `field.multiple !== true` | template definition                                                   |
| `field.binding` present                                 | template definition                                                   |
| resolved option list                                    | `CatalogFieldRuntime.options` (`features/sheet/declarative/hooks.ts`) |

Rule: searchable control when a bound single-select field's resolved list has **more than
12** entries; plain `<select>` otherwise, and always for `multiple` fields and for
static-option fields. The rule is a pure function of the inputs above and is unit-tested
independently of rendering.

### Query text of the searchable select wrapper

Local component state, never persisted: initialized from the label of the currently
stored value (or the raw stored value when no option matches it), replaced by the chosen
entry's label on select, and an empty query on blur/clear writes `undefined` to the field.
