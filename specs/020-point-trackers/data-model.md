# Data Model: Point trackers and Force Points

Changes to the spec 018/019 model (`specs/019-tracker-brush-layers/data-model.md`). Everything not
listed here is unchanged. No stored document value changes shape.

## Template (stored with the page)

### TrackerField (own tracker)

| Field        | Type                   | Rules                                                     |
| ------------ | ---------------------- | --------------------------------------------------------- |
| `fromStart`  | boolean                | **new**; default `false`                                  |
| `fillInside` | boolean                | **new**; default `false`; read only when `fromStart`      |
| `totalReads` | `'deepest' \| 'count'` | **new**; default `'deepest'`; `total` still shows the row |

### TrackerMarkKind

`fill` palette gains `primary` (the accent, "like rating dots"). Hex fills unchanged.

### PrimitiveNode (bound primitive)

| Field         | Type                        | Rules                                                                 |
| ------------- | --------------------------- | --------------------------------------------------------------------- |
| `poolTracker` | `PoolTrackerOverride`, opt. | **new**; presence = tracker look; honored by pool `resource` bindings |
| `maxMinFrom`  | formula string 1–500, opt.  | **new**; the maximum's minimum while drawn as a tracker               |
| `minFrom`     | unchanged                   | with `poolTracker`: the current value's minimum                       |
| `part`        | unchanged                   | ignored with `poolTracker`                                            |
| `compact`     | unchanged                   | ignored with `poolTracker`                                            |

### PoolTrackerOverride

| Field     | Type                         | Rules                                            |
| --------- | ---------------------------- | ------------------------------------------------ |
| `display` | `'row' \| 'strip' \| 'line'` | default `'row'`                                  |
| `marks`   | `{ current?, max? }`, opt.   | each `{ name?, symbol?, fill? }` (mark override) |
| `legend`  | boolean                      | default `false`                                  |
| `total`   | boolean                      | default `true` (the count)                       |

Default marks: `current` "Point", no symbol, fill `primary`, fill layer; `max` "Maximum", no
symbol, fill `primary`, outline layer. Names come from translations unless overridden.

## Page values

Unchanged. Own trackers keep `TrackerValue`; pools keep `{ current, max }` in the document.

## Derived (never stored)

### TrackerModel

| Field             | Change                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| `display`         | `TrackerDisplay \| 'row'` (`row` only from pool models)                 |
| `fromStart`       | **new** boolean; the molecule does not need it, bound elements write it |
| `hasOutlines`     | **new** boolean; right click is taken only when true                    |
| `copies[].total`  | with `'count'`: `"{filled} / {framed}"` or `"{filled}"` (R4)            |
| `copies[].locked` | **new**, opt.: `{ fill, outline }` locked box counts (pools only)       |

### TrackerClick (molecule → bound element)

`{ brush: markId }` (left click with a brush) or `{ layer: 'fill' | 'outline' }` (left click
without a brush: the reading layer; right click: `outline`).

### PoolRules

`{ limit, minCurrent, minMax, raisesMax }`: `limit = min(resolved maxFrom ?? maximum, maximum)`,
`minCurrent` from `minFrom`, `minMax` from `maxMinFrom`, `raisesMax` from the binding's
`currentRaisesMax`.

## State transitions

### Own tracker with `fromStart` (one layer, boxes in shown order, `end` = last marked index)

| Click on box `i`                     | Result on that layer                         |
| ------------------------------------ | -------------------------------------------- |
| `i ≠ end` or box shows another mark  | boxes `0…i` get the mark, after `i` cleared  |
| `i = end` and box shows this mark    | boxes `0…i-1` keep it, `i` and after cleared |
| fill with `fillInside`, `i` > framed | run stops at the last framed box             |

The other layer never changes.

### Pool (fill = current, outline = maximum)

| Click on box `i` | Result                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| fill             | `current = i+1 === current ? i : i+1`, at least `minCurrent`; capped by `max`, or raises `max` with `raisesMax`            |
| outline          | `max = i+1 === max ? i : i+1`, within `[max(minMax, raisesMax ? minCurrent : 0, 1), limit]`; `current = min(current, max)` |
