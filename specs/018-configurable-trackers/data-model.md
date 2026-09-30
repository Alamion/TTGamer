# Data model: Configurable trackers

The shapes below are schema-level (Zod in `src/sheet_manager/types/`). Limits come from
`TEMPLATE_LIMITS` (research R10). Ids are generated template identifiers, stable across edits.

## Template side

### TrackerConfig (own tracker, on the `tracker` field)

| Property      | Type                                | Rules                                                                                          |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `display`     | `'table'\|'strip'\|'line'`          | Default `table`.                                                                               |
| `marks`       | `TrackerMarkKind[]`                 | 1–5, unique ids. The order is the click order and the weight (later is heavier).               |
| `levels`      | `TrackerLevel[]`                    | 1–20, unique ids.                                                                              |
| `valueColumn` | `{ title?: string, show: boolean }` | The title is 1–40 characters; when it is empty, the UI shows "Value". `show` defaults to true. |
| `columns`     | `TrackerColumn[]`                   | 1–6, unique ids, with at least one `marks` column.                                             |
| `total`       | `boolean`                           | Default true for a new tracker.                                                                |
| `lengths`     | `TrackerLength[]`                   | 0–6. An empty list means no length control.                                                    |
| `out`         | `boolean`                           | Default false.                                                                                 |

The `tracker` field is `fieldBaseShape`, plus `type: 'tracker'`, plus `TrackerConfig`. It is
rejected in table columns and is not a list item type (research R2).

### TrackerMarkKind

| Property | Type                                                              | Rules                                                          |
| -------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `id`     | identifier                                                        | Unique within the tracker.                                     |
| `name`   | string                                                            | 1–40 characters.                                               |
| `symbol` | string                                                            | 0–2 code points. When empty, the box is filled with no symbol. |
| `fill`   | `'secondary'\|'error'\|'tertiary'\|'success'\|'text'\|` `#rrggbb` | A palette key or an own color (research R9).                   |

The ready sets are editor data, not stored:

- **One mark**: Marked × error.
- **Two marks**: Bashing ╱ secondary, Lethal × error.
- **Three marks (WoD 20th)**: the two marks above, plus Aggravated ✱ tertiary.

Names are inserted in the editor's language.

### TrackerLevel

| Property | Type       | Rules                                                           |
| -------- | ---------- | --------------------------------------------------------------- |
| `id`     | identifier | Unique within the tracker.                                      |
| `name`   | string     | 1–40 characters.                                                |
| `value`  | string     | 0–12 characters. It is free text, such as `-1`, `+2`, or `Out`. |

### TrackerColumn

| Property | Type                      | Rules                                                                                                                                |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `id`     | identifier                | Unique within the tracker.                                                                                                           |
| `kind`   | `'marks'\|'text'`         |                                                                                                                                      |
| `title`  | string                    | 0–40 characters.                                                                                                                     |
| `covers` | integer, optional         | 1 to (levels − 1): the first N levels. Absent means all levels. It counts visible levels in order, so it follows the current length. |
| `copies` | `{ max: 1–24 }`, optional | Present means the sheet's user adds copies A, B, C… up to `max`.                                                                     |

### TrackerLength

| Property | Type        | Rules                                                                                                |
| -------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `levels` | `levelId[]` | 1 or more ids from `levels`. They show in level order; unknown ids are ignored with an editor issue. |

### TrackerOverride (built-in, `PrimitiveNode.tracker`, optional)

| Property      | Type                                          | Rules                                                                                                       |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `display`     | as above, optional                            | Absent: resolved from the legacy `compact` and `trackLayout` (research R6).                                 |
| `marks`       | `{ [gameMarkId]: { name?, symbol?, fill? } }` | Keys are the binding's mark ids (`slash`, `cross`).                                                         |
| `levels`      | `({ name?, value? } \| null)[]`               | Indexed like the game's levels, at most the game's count. `null` or a missing entry keeps the game's level. |
| `valueColumn` | as above, optional                            | For V5 (no penalties) the default is `show: false`.                                                         |
| `columns`     | `TrackerColumn[]`                             | 0–5 extra columns. The built-in marks column is implicit and always first.                                  |
| `total`       | boolean, optional                             | The default depends on the binding (research R7).                                                           |
| `valueKey`    | identifier, optional                          | The key of the extra columns' values. The default is the node id.                                           |

Legacy `track { levels, names }` stays readable (research R4). `compact` and `trackLayout` stay
readable for trackers. The editor writes `tracker.display` and clears both.

### TrackBinding additions (system side)

| Property | Type                                                        | Rules                                                                                                                                                          |
| -------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `marks`  | `{ id: 'slash'\|'cross', label, translation? }[]`, optional | Game mark names: WoD-like health Bashing and Lethal, V5 Superficial and Aggravated. Absent (vehicle and droid damage) means the generic names Slash and Cross. |

## Document side

### TrackerValue (`templateValues[valueKey]`)

| Property  | Type                                 | Rules                                                                                                                             |
| --------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `tracker` | literal `1`                          | The shape tag and version. It tells the value apart from the other page values (research R3).                                     |
| `length`  | integer, optional                    | An index into `lengths`. When absent or out of range, the value uses the first length, like new fodder groups, which start short. |
| `columns` | `{ [columnId]: TrackerCopyValue[] }` | Each list has 0 to `copies.max` entries, 24 at most. A missing list reads as one empty copy.                                      |

### TrackerCopyValue

| Property | Type                        | Rules                                                                        |
| -------- | --------------------------- | ---------------------------------------------------------------------------- |
| `id`     | identifier                  | Stable. The label A, B, C… comes from the copy's position.                   |
| `marks`  | `{ [levelId]: markKindId }` | For marks columns. At most as many entries as levels, 20.                    |
| `texts`  | `{ [levelId]: string }`     | For text columns. Each text is 0–200 characters; an empty string is removed. |

For a built-in tracker's extra columns, the same `TrackerValue` is stored under the override's
`valueKey`. On member tracks, a repeatable extra column's copy ids are the member ids (research
R4).

Built-in marks are unchanged: `bound.data[dataKey].levels: ConditionMark[]`, members, and V5's
`bonus`.

## Derived (not stored)

### TrackerModel

`TrackerModel` is what the one renderer draws:

- `levels`: the visible levels, with name and value;
- `marks`: kinds with a resolved fill;
- `columns`: each with its visible copies (label, marks by level, texts by level, `out`, total);
- `display`, `legend`, and `lengthControl` (with shorter or longer actions and a confirm flag);
- `readOnly`.

Two adapters build it:

- `ownTrackerModel(field, value)`;
- `builtInTrackerModel(node, binding, data, pageValue)`. It covers three cases:
    - plain tracks;
    - computed-length tracks;
    - member tracks.

### TrackerChange (editor, before saving)

Each report, `{ nodeId, title, documents, lostMarks, lostTexts, lostCopies }`, is produced by
`trackerChangeReport(before, after, documents)` (research R8). A tracker whose config is unchanged,
or whose change drops nothing, adds no entry.

## State transitions

- **Box click**: empty → kinds[0] → kinds[1] → … → kinds[n−1] → empty. On read-only sheets, nothing
  changes.
- **Add copy**: appends `{ id }`. It is disabled at `max`.
- **Remove copy**: removes the entry. It asks first when the copy holds marks or texts; the same
  rule protects cohort members today. The last copy cannot be removed.
- **Change length**: longer writes `length`. Shorter first checks whether any copy has marks on the
  levels being hidden. If so, it confirms, then folds those marks into the new last visible level
  (the heaviest wins) and writes `length`, all in one write.
- **Editor save that drops values**: a confirmation lists `TrackerChange` entries. It saves on
  confirm and cancels otherwise. Stored values are never rewritten.

## Validation and reporting

- **Write path.** `validateTemplateValue` (`tracker` case) checks:
    - the shape;
    - the limits;
    - that each `columns` key is a known column;
    - that each mark kind id is known for the column's tracker;
    - that the copy count is within `max`.

    A rejection reports `template-value-write-rejected`.

- **Read path.** `coerceStoredValue` returns `undefined` for a value that fails the schema. The
  control then reports `template-value-unreadable` once (research R11) and shows an empty tracker.
- **Hidden values.** Marks and texts under ids the config no longer has, or in copies beyond
  `max`, are not shown; their count is reported once per render as `template-value-hidden`
  (FR-026a), except in the editor preview.
- **Template.** The config is validated by the schema. The editor issues cover:
    - a length with no known level;
    - `covers` at or beyond the level count;
    - the last marks column being removed. The editor already blocks this.
