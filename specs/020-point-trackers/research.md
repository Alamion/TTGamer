# Research: Point trackers and Force Points

Decisions build on specs 018 and 019 as built (their `research.md` files, including the
"Implementation notes"). The approved prototype is [prototype.html](./prototype.html). No open
clarifications remain.

## R1 — Settings on own trackers

**Decision**: `TrackerFieldSchema` gains three fields with defaults:

- `fromStart: boolean` (default `false`), "Marks fill from the start";
- `fillInside: boolean` (default `false`), "Fills stay inside the outline", read only when
  `fromStart` is on;
- `totalReads: 'deepest' | 'count'` (default `'deepest'`), the total row's reading. The existing
  `total: boolean` still turns the row on and off.

**Rationale**: additive fields with defaults parse every stored template unchanged (SC-003). A
separate enum keeps `total` meaning "show the row", so no stored value changes meaning.

**Alternatives considered**: widening `total` to `false | 'deepest' | 'count'` (changes a stored
field's type); one `mode: 'track' | 'pool'` switch (couples three independent choices).

## R2 — One click rule for both buttons

**Decision**: the molecule's `onMark` gets a click description instead of a bare brush id:

```ts
type TrackerClick = { brush: string } | { layer: TrackerLayer };
onMark(columnId, copyId, levelId, click: TrackerClick)
```

- Left click with a brush → `{ brush }`; left click without one → `{ layer: model.readingLayer }`.
- The outline action → `{ layer: 'outline' }`, only when the tracker has outline marks and is
  enabled. Each box takes it three ways:
    - right click (`contextmenu`, also fired by the Menu key and Shift+F10): `preventDefault()`;
    - Shift+Enter or Shift+Space (`keydown` on the box button): `preventDefault()`, so the
      button's own click does not follow;
    - touch long press: `pointerdown` with `pointerType === 'touch'` starts a 500 ms timer;
      moving more than 10 px, `pointerup`, or `pointercancel` cancels it; when it fires, the
      outline action runs and the `click` and `contextmenu` of that press are swallowed. Boxes
      get `select-none` and `-webkit-touch-callout: none`.
- Otherwise every event is left alone (browser menu, normal click).
- One pure write per kind of tracker resolves the click:
    - a brush → that mark on its layer;
    - a layer → its first mark when the tracker fills from the start, else the next mark of that
      layer's cycle (spec 019 `toggleTrackerMark`, now taking the layer).

**Rationale**: FR-005a puts the right click on every tracker by the left click's rules; one
description keeps own, built-in, and pool trackers on the same molecule contract. A right click
on a built-in tracker never reaches it: built-in marks are fills only, so the native menu stays.

**Alternatives considered**: a separate `onOutline` callback (duplicates the brush/cycle branch in
every bound element); relying on the browser's `contextmenu` for a long press (Android fires
it, iOS Safari does not); Shift+F10 alone (not discoverable, and jsdom cannot prove it).

## R3 — Filling from the start

**Decision**: a pure `runTrackerMark(field, value, columnId, copyId, levelId, markId)` in
`trackerModel.ts`, used when `field.fromStart`:

1. The run order is the column's covered levels at the current length.
2. `end` is the last index whose box shows a mark on that layer (resolved through
   `layerMarks`); gaps before it are tolerated in stored data.
3. Target `n` (inclusive index): `i - 1` when `i === end` and the box already shows this mark,
   else `i`. With `fillInside` on a fill write, `n = min(n, last framed index)`.
4. Boxes `0…n` get the mark on that layer (through `writeLayer`, so the other layer never
   moves); boxes after `n` are cleared on that layer. Levels outside the shown length keep their
   stored entries (hidden and counted, as in spec 018).

**Rationale**: the rule matches the rating dots (`index + 1 === value ? index : index + 1`) and
the prototype. Reusing `writeLayer` keeps spec 019's slot rules in one place.

**Notes**:

- A brush with another mark of the same layer repaints the whole run with that mark (prototype
  "Two fills, two outlines").
- Without `fromStart`, every click keeps spec 019 behavior (SC-003).
- Shortening with lengths folds into the last level (`remapMarks`), so a run stays contiguous.

## R4 — Count total

**Decision**: `ownTrackerModel` computes `copy.total` from `totalReads`:

- `'deepest'`: unchanged (value of the deepest marked level of the reading layer).
- `'count'`: `filled` = covered boxes with a fill; `framed` = covered boxes with an outline.
  Text is `"{filled} / {framed}"` when the tracker has outline marks and `framed > 0`, else
  `"{filled}"`. Zero filled with no frame shows `"0"` (a pool reads 0, not a dash).

The strip and one-line displays print `copy.total` after the boxes already; the table prints it in
the total row. No molecule change for counting.

## R5 — Pool resources drawn as trackers

**Decision**: a display option on the existing `primitive` node, not a new element:

- `PrimitiveNodeSchema` gains `poolTracker?: PoolTrackerOverride` (presence = tracker look) and
  `maxMinFrom?: string` (formula: the maximum's minimum while drawn as a tracker; `minFrom` stays
  the minimum of the current value).
- `PoolTrackerOverride`: `display: 'row' | 'strip' | 'line'` (default `'row'`), `marks?` with
  optional `current` and `max` look overrides (`name`, `symbol`, `fill`), `legend` (default
  `false`), `total` (default `true`).
- Only `resource` bindings in `pool` mode honor it; on others it is ignored (the editor never
  offers it there). `part` and `compact` are ignored while it is set.

**Rationale**: FR-010 asks for a display option of the resource element; the values stay in the
document's own pool (FR-012). A second formula is needed because one node now edits both values
(Max Force Points ≥ Self-Control on the maximum; Star Wars Willpower ≥ Passion + Self-Control on
the current value).

**Alternatives considered**: a `track` binding for pools (would add a second write path for the
same data); reusing `TrackerOverrideSchema` (its levels, columns, and value key mean nothing for a
pool, and its display set has no `row`).

## R6 — Pool rules

**Decision**: a pure module `features/sheet/data/poolTracker.ts`:

- `poolTrackerModel(input) → TrackerModel`: one marks column, one copy, `limit` numbered levels
  (`limit = min(resolvedMax ?? maximum, maximum)`), fills `1…current`, outlines `1…max`, marks
  `current` (fill) and `max` (outline) with the page's look, `fromStart` behavior, count total,
  and per-copy locked counts.
- `markPool(pair, rules, index, layer) → { current, max }`, with
  `rules = { limit, minCurrent, minMax, raisesMax }`:
    - fill: `c = index + 1 === current ? index : index + 1`; `c = max(c, minCurrent)`; with
      `raisesMax` the maximum rises to `c`, else `c = min(c, max)` (the fill stops at the last
      framed box);
    - outline: `m = index + 1 === max ? index : index + 1`; `m = clamp(m, floor, limit)` with
      `floor = max(minMax, raisesMax ? minCurrent : 0)`; `current = min(current, m)`.
- `PoolTracker` (in `declarative/`) wires `bound.update({ [dataKey]: next })`; the brush and the
  right click map to the layer of the mark.

**Rationale**: mirrors the dots' clamps in `PrimitiveResourceBody` (`writeValue`), so a pool reads
and writes the same on a dots page and a tracker page (SC-004). The maximum's floor keeps current
≥ its minimum when lowering the maximum would otherwise force it lower; with no minimum the
maximum can reach 0, as with the dots.

**Edge**: stored data above the maximum shows as stored (fills past the frame); the next write
clamps (spec edge case).

## R7 — Locked boxes and the Row look

**Decision**:

- `TrackerModelCopy` gains optional `locked: { fill: number; outline: number }`: boxes with index
  below the count are locked on that layer. Only pool models set it.
- A locked box is drawn in the darker shade of its mark's color: palette fills use
  `color-mix(in srgb, <color>, black 35%)` through a CSS variable, hex fills the same mix inline;
  its accessible name adds "locked", its `title` names the minimum.
- A click that would only clear locked boxes changes nothing (the write clamps anyway).
- Display `row` (model only; own trackers never store it): label left, boxes right with the
  count after them, box size `dot` = 16px (the rating dot size), outline 2px with 1px gap. The
  legend, when on, sits under the row.
- `TRACKER_PALETTE_FILLS` gains `primary` ("Accent"), the rating dots' color; the pool's default
  marks use it.

**Rationale**: FR-011 and FR-011a, as the prototype review fixed them (locked cells darken in the
mark's own color; the pool row sits with rating rows).

## R8 — Editor

**Decision**:

- `TrackerSettings` ("Reading the marks"): "Marks fill from the start" toggle, "Fills stay inside
  the outline" toggle (shown when the first is on), and a "Total" choice Deepest level / Count.
  "Start from… → Points" sets `fromStart: true` and `totalReads: 'count'`. Built-in trackers
  (`game` set) do not show them.
- `PrimitiveConfig` for pool resources: a "Display" choice Dots / Tracker. With Tracker it shows
  a small `PoolTrackerSettings` (display Row / Strip / One line, the two marks' name, symbol, and
  color, legend, total) and the "Maximum at least" formula (`maxMinFrom`); the "Part" select and
  "Compact" are hidden.
- Switching a node with `part: 'max'` to Tracker moves its `minFrom` to `maxMinFrom` (it limited
  the maximum) and drops `part`; switching a tracker back to Dots moves `maxMinFrom` to `minFrom`
  with `part: 'max'` when the node has no `minFrom`, else drops `maxMinFrom`. No formula changes
  meaning silently.
- Formula checks (`draft.ts`, `template.ts` refine, `templateReferences.ts`) treat `maxMinFrom`
  as they treat `minFrom`; `hooks.ts` resolves it into the page's formula state next to `minima`.

## R9 — Shipped Star Wars sheet

**Decision**: `resourcesGroup` in `systems/star-wars-wod/templates/character.ts` replaces
`resource-max-force-points` and `resource-force-points` with one node `resource-force-points`
(binding `resource:force-points`, `poolTracker: {}`, `maxMinFrom: MINIMUMS.maxForcePoints`). The
brief sheet keeps its compact node. Willpower and Dark Side stay dots.

**Rationale**: FR-014. Keeping the id `resource-force-points` keeps any template that references
the node by id stable; the dropped `resource-max-force-points` node holds no values (bound data
lives in the document).

**Check during implementation**: how saved copies of a shipped template follow a shipped change
(the same path every earlier shipped-template change took); no stored document value changes.

## R10 — Storybook, docs, records

- Storybook: an own point tracker (fill from the start, count, two layers, legend), the "fills
  stay inside" variant, and a pool resource as a tracker (Row) next to a rating row. Guard tags
  `tracker:from-start`, `tracker:count`, `primitive:resource:tracker`.
- Guide `docs/template-editor/elements.mdx` (+ ru): the new tracker settings, the right click,
  the pool display.
- Skill `sheet-templates` and `src/sheet_manager/AGENTS.md`: click rules, pool tracker module.
- `CHANGELOG.md` and `package.json` minor bump; `TODO.md` T-085 ✅.

## Implementation notes (2026-10-02)

Where the built code refines the decisions above:

- **One write per own-tracker press**: `markTracker` routes a `TrackerClick`; without
  `fromStart` it keeps spec 019 (`paintTrackerMark` for a brush, `toggleTrackerMark` now taking
  the layer). `runTrackerMark` rewrites the layer box by box through `writeLayer`, so slot rules
  stay in one place. With `fillInside` and no framed box, a fill run places nothing.
- **Outline action in the molecule**: `MarkBox` takes `onOutline` only when the model has
  outline kinds and the tracker is enabled. A small `useLongPress` (500 ms, 10 px slop, touch
  pointers only) swallows the click that ends the press and the phone's own `contextmenu` for
  a short window after a touch. Shift+Space also prevents its key-up so the button's click does
  not follow.
- **Total row label**: own trackers show "Show the total row" plus the "The total reads" choice;
  built-in trackers keep the old "deepest marked level" label (they have no count).
- **Pool trackers**: `poolTrackerModel` builds the shared `TrackerModel` (level ids `p1…pN`,
  marks `current`/`max`); `PoolTracker` maps a press, a brush, or the outline action to
  `markPool`. Rules come from `PrimitiveResourceBody` (`limit` = resolved `maxFrom` capped by
  the binding maximum; `minFrom` → current, `maxMinFrom` → maximum, resolved into
  `formulaState.maxMinima`).
- **Editor**: the mark color group became `MarkColorPicker` (shared by `TrackerSettings` and
  the new `PoolTrackerSettings`); the minimum fields share a `FormulaInput`.
- **Shipped template copies (R9 check)**: shipped pages are built in code, so every reader gets
  the single Force Points row; a reader who edited the shipped page has a saved full copy in
  `defaultOverrides`, which keeps its two rows until they restore the page. No stored document
  value changes. Two template snapshots (`star-wars-parity.json`,
  `character-templates.pre-007.json`) were refreshed for exactly this node change.
