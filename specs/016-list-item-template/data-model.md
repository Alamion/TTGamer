# Data Model: Custom list item template

## ListNode (template schema, `types/template.ts`)

This feature adds two properties to a list. Both are optional, so no store or file version
changes.

| Property | Type                      | Rule                                                                                                                  |
| -------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `item`   | `ListItemField`, optional | Custom lists only. The schema refine rejects it on a list with `bindingKey`. When absent, `LEGACY_LIST_ITEM` is used. |
| `named`  | `boolean`, optional       | Custom lists only. When absent, the list is named. `false` means the entries have no name.                            |

Properties that already exist and are unchanged: `title`, `valueKey`, `columns`, `presets`,
`showTitle`, `framed`, and `catalog` (spec 015).

New rules:

- `catalog` requires a named list. The editor prevents a catalog on an unnamed list. If one
  arrives anyway (a hand-edited or imported file), the reference check reports
  `list-catalog-unnamed`, and the sheet ignores the catalog.
- `catalog.valueFrom` must fit the item type (see the table below). A mismatch is reported as
  `unknown-fill-detail`.
- `presets` apply only to named lists.

Readers never touch the two optional properties directly. They use these helpers:

- `listItemField(list): ListItemField` returns `list.item ?? legacyListItem(list)`.
- `listIsNamed(list): boolean` returns `list.named !== false`.

## ListItemField

`ListItemField` is a `TemplateField` whose `type` is not `'formula'`. It is validated by the same
field schema and refinements.

Rules specific to an item:

- `id` is a template identifier, unique within the template like any field id. The editor
  generates it.
- These properties are ignored and hidden in the editor: `valueKey`, `visibleWhen`,
  `required`, and span or placement.
- `binding.fills` of a choice item is ignored, because an entry has no sibling fields to fill.
- A rating's `maxFrom` may reference page coordinates, as for a field.

`LEGACY_LIST_ITEM` is the item used when a list has none:

| Setting         | Value                                            |
| --------------- | ------------------------------------------------ |
| `id`            | `<list id>-item`                                 |
| `type`          | `rating`                                         |
| `label`         | the list title, or its id                        |
| `presentation`  | `dots`                                           |
| `min` / `max`   | 0 / 5                                            |
| `flags`         | `['specialization', 'practiced', 'experienced']` |
| `dice`          | `true`                                           |
| `labelPosition` | `left`                                           |

## TemplateListEntry (document value, `types/templateValues.ts`)

Stored under `listValueKey(list)` as an array of at most 1000 entries.

| Property    | Type                     | Rule                                                                                                                |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `id`        | string, 1–64             | Unique within the list.                                                                                             |
| `label`     | string, 0–120, optional  | The typed name. Kept only for named lists. It may be empty while the user types (this widens the old minimum of 1). |
| `value`     | cell value, optional     | Primitive, `{current, max}`, or an image value. The write path validates it against `listItemField(list)`.          |
| `detail`    | `RatingDetail`, optional | Rating items only: the text and the S/P/E flags.                                                                    |
| `pickLabel` | string, 0–120, optional  | Catalog-bound choice items only: the picked name.                                                                   |

The envelope schema accepts any of these shapes. The write path is strict for changed entries
only (research R3).

Old entries (`{id, label, value: 0–20}`) are valid legacy rating entries as they are.

## New entry

The add button stores `{ id }` plus an empty `label` on named lists, and no `value`. Each control
shows its own empty state: an empty text, an unchecked toggle, no pick, an empty rating, and a
resource with no current value and the field's maximum. The first edit stores a value in the
item's shape. A resource's first edit stores `{current, max: field max}`.

## Value coercion when reading (`coerceListValue`)

A stored value is converted to what the current item can show. A value that cannot be converted
reads as `undefined` and is shown empty; it is not rewritten.

| Stored value     | number  | rating    | resource                   | text | toggle | choice          | reference | image |
| ---------------- | ------- | --------- | -------------------------- | ---- | ------ | --------------- | --------- | ----- |
| number           | ✓       | ✓ clamped | `{current: n, max: field}` | —    | —      | —               | —         | —     |
| `{current, max}` | current | current   | ✓                          | —    | —      | —               | —         | —     |
| string           | —       | —         | —                          | ✓    | —      | valid option id | ✓         | —     |
| string[]         | —       | —         | —                          | —    | —      | multiple choice | multiple  | —     |
| boolean          | —       | —         | —                          | —    | ✓      | —               | —         | —     |
| image value      | —       | —         | —                          | —    | —      | —               | —         | ✓     |

## Catalog "value from" fit

| Catalog column or detail | Item types it can fill                   |
| ------------------------ | ---------------------------------------- |
| number                   | number, rating, resource (current value) |
| text                     | text                                     |
| toggle                   | toggle                                   |

## ListItemChangeReport (editor, pure)

`listItemChangeReport(before, after, documents)` returns one row per list id present in both
template versions:

```text
{
  listId,
  title,
  documents: number,
  lostValues: number,
  hiddenNames: number
}[]
```

- `documents` counts only the documents of this template that have affected entries.
- `lostValues` counts entries whose stored value is set but coerces to `undefined` under the new
  item.
- `hiddenNames` counts entries with a non-empty name, when the list turns from named to unnamed.

An empty array means the change applies without a confirmation.

## State transitions

- **The author changes the item type, or turns names off, then saves.** The report runs. If it is
  empty, the template saves. Otherwise the confirmation opens; confirming saves, and cancelling
  returns to the editor with the draft intact.
- **The sheet user edits an entry.** The entry is replaced by a validated copy, and the others
  keep their identity. An unreadable stored value is overwritten only by that entry's edit.
