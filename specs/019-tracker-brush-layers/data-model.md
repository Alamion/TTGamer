# Data Model: Tracker brush and two layers

Changes to the spec 018 model (`specs/018-configurable-trackers/data-model.md`). Everything not
listed here is unchanged.

## Template (stored with the page)

### TrackerMarkKind (own tracker field)

| Field    | Type                   | Rules                                                      |
| -------- | ---------------------- | ---------------------------------------------------------- |
| `id`     | identifier             | unchanged                                                  |
| `name`   | string 1–N             | unchanged                                                  |
| `symbol` | 0–2 code points        | unchanged (an outline may have none)                       |
| `fill`   | palette fill or `#hex` | unchanged; the color of the fill or of the outline         |
| `layer`  | `'fill' \| 'outline'`  | **new**; default `'fill'`, so stored templates parse as is |

- The five-mark limit (`trackerMarksMax`) counts marks of both layers.
- Order still means weight, compared within one layer.

### TrackerOverride (built-in track primitive)

Unchanged. Built-in marks are always fills; the override never stores a layer.

## Page values (`templateValues`)

### TrackerCopyValue

| Field      | Type                     | Rules                                                 |
| ---------- | ------------------------ | ----------------------------------------------------- |
| `id`       | identifier               | unchanged                                             |
| `marks`    | `levelId → markId`, opt. | unchanged shape; now the **fill slot**                |
| `outlines` | `levelId → markId`, opt. | **new**; the **outline slot**; same bounds as `marks` |
| `texts`    | `levelId → string`, opt. | unchanged                                             |

`TrackerValue` (`{ tracker: 1, length?, columns }`) is unchanged; the tag stays `1` because the
change is additive.

## Derived (never stored)

### Resolved layer

`layerMarks(kinds, copy, layer) → levelId → markId`, per level:

1. the layer's own slot, when its mark kind exists and has that layer;
2. else the other slot, when its mark kind exists and has that layer;
3. else none.

Stored entries that resolve to neither layer of their box are **hidden** (kind removed, level
gone, or a collision after a layer change) and counted, never deleted.

### Reading layer

`fill` if the tracker has a fill mark, else `outline`. It drives the click cycle, the total, the
marked level name, and "out".

### TrackerModel (molecule input)

| Field                | Change                                                      |
| -------------------- | ----------------------------------------------------------- |
| `marks[]`            | gains `layer`                                               |
| `copies[].marks`     | now the resolved fill layer (reading layer on outline-only) |
| `copies[].outlines`  | **new**: the resolved outline layer                         |
| `copies[].hasValues` | true when either layer or texts hold something              |
| `hidden`             | counts both slots                                           |

### Brush (molecule state)

`string | undefined`: a mark id of this tracker. Valid only while the legend is shown, the display
is not a line, the tracker is enabled, and the id is one of `model.marks`; otherwise it is reset.

## State transitions of one box

Notation: `(fill, outline)`, `F1…Fn` fills in order, `O1…On` outlines in order.

| Action                    | From          | To                                  |
| ------------------------- | ------------- | ----------------------------------- |
| click, no brush           | `(—, o)`      | `(F1, o)`                           |
| click, no brush           | `(Fi, o)`     | `(Fi+1, o)`, or `(—, o)` after `Fn` |
| click, no brush, no fills | `(—, Oi)`     | `(—, Oi+1)`, or `(—, —)` after `On` |
| click, brush `Fk`         | `(Fk, o)`     | `(—, o)`                            |
| click, brush `Fk`         | `(x ≠ Fk, o)` | `(Fk, o)`                           |
| click, brush `Ok`         | `(f, Ok)`     | `(f, —)`                            |
| click, brush `Ok`         | `(f, y ≠ Ok)` | `(f, Ok)`                           |

Built-in game column: fills only (`slash`, `cross`); the same table without outlines.
