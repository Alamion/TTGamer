# Research: Tracker brush and two layers

All decisions below build on spec 018 as built (`specs/018-configurable-trackers/research.md`,
including its "Implementation notes"). No open clarifications remain.

## R1 — Where the brush lives

**Decision**: local state of the `Tracker` molecule (`useState<string | undefined>`), one per
rendered tracker. `onMark(columnId, copyId, levelId, brush?)` passes the brush mark id to the
bound element, which decides how to write.

**Rationale**: the brush is never stored (FR-005) and belongs to one tracker (spec assumption).
The molecule already owns transient UI state (pending confirmations). Each bound element keeps
owning its writes.

**Alternatives considered**: a sheet-wide store slice (would leak one tracker's brush into
another and survive page switches); a context provider (no consumer outside the molecule).

**Details**:

- The brush ends when its mark id leaves `model.marks`, the legend is off, the display is a line,
  or the tracker is disabled: an effect-free check at render (`brush` is ignored unless valid) plus
  a reset when it becomes invalid, so no stale brush comes back if the mark returns.
- Escape: a `keydown` handler on the tracker's root; it fires only while focus is inside the
  tracker, so it never competes with open dialogs (which take focus and Escape first).
- The status message is a `role="status"` paragraph under the legend, empty without a brush.

## R2 — Brush writes

**Decision**:

- Own trackers: `paintTrackerMark(field, value, columnId, copyId, levelId, markId)` sets the box's
  slot for the mark's layer to `markId`, or clears it if the box already shows that mark there.
- Built-in game column: `paintMark(marks, index, mark)` in `cohort.ts` sets one `ConditionMark`
  or sets it back to `empty` when equal. Built-in extra marks columns use `paintTrackerMark`.

**Rationale**: mirrors the existing toggle pair (`toggleTrackerMark` / `toggleMark`), so the
fodder-group parity stays provable with the same test (FR-024).

**Alternatives considered**: expressing the brush as repeated toggles (breaks on cycle order and
cannot clear in one click).

## R3 — How two layers are stored

**Decision**: keep a copy's `marks` record as the **fill slot** and add an optional `outlines`
record as the **outline slot**, both `levelId → markId`. Display never trusts the slot alone: a
pure resolver `layerMarks(kinds, copy, layer)` returns, per level, the mark shown on that layer:

1. the mark in the layer's own slot, if its kind exists and is on that layer;
2. else the mark in the other slot, if its kind exists and is on that layer;
3. else nothing.

Writes for a layer put the mark in that layer's slot and, if the shown mark of that layer came
from the other slot, remove it there (it is being replaced or cleared by the user).

**Rationale**:

- Values from spec 018 are fill-slot records whose kinds are fills: they read exactly as before
  with no conversion (FR-021, SC-003).
- Changing a mark's layer in the editor rewrites no document: boxes show the mark on its new
  layer when free; a collision leaves one hidden and counted (FR-020, FR-019).
- `TrackerCopyValueSchema` is `.strict()`, so the slot must be a declared key; an optional record
  keeps the shape bounded and diff-friendly.

**Alternatives considered**:

- One record with `[fill, outline]` tuples: changes the meaning of every stored value and needs a
  conversion.
- Slots keyed by layer only, ignoring the kind's current layer: a layer switch in the editor would
  hide every stored mark of that kind.
- Rewriting documents on save when a mark changes layer: violates "never delete, only report", and
  touches documents the author did not open.

## R4 — Bounds

**Decision**: `outlines` uses the same bounds as `marks` (at most `trackerLevelsMax * 2` entries,
ids validated). The five-mark limit counts both layers (FR-015); the mark schema bound stays.

**Rationale**: worst-case size doubles per copy and stays far under existing value limits; no new
`TEMPLATE_LIMITS` entry is needed.

## R5 — Reading layer and cycling

**Decision**: the **reading layer** of a tracker is `fill` when it has at least one fill mark,
else `outline`. Without a brush, a click cycles the reading layer's kinds in order
(`nextMarkId` over those kinds) and leaves the other layer. Total, the marked level name, and
"out" read the reading layer through the resolver (FR-012, FR-016).

**Rationale**: one rule covers normal trackers, two-layer trackers, and the outline-only edge
case, and keeps every existing call site single-layer.

## R6 — Lengths, copies, and hidden values

**Decision**:

- `remapMarks` runs once per layer on resolved records, with that layer's kinds for weights; the
  results are written back to their own slots (`marks`, `outlines`). Values that were hidden are
  dropped by the switch, exactly as spec 018 drops marks of hidden levels on a switch (the switch
  asks first when it folds or drops shown marks).
- `lengthChangeHidesMarks` checks both layers.
- `countHiddenTrackerValues` and `trackerChangeReport` count, per copy, stored entries in both
  slots minus the ones the resolver shows; the report's "marks" include outlines.
- A copy "has values" when either slot or texts is non-empty, so removing an outline-only copy
  asks first (FR-018).

## R7 — Look of boxes and outlines

**Decision**:

- Box sizes: `md` 26px (table, strip), `sm` 20px (one line), `xs` swatch unchanged. Gaps grow:
  strip boxes 12px apart, table rows 8px vertical padding.
- Outline: CSS `outline: <w> solid <mark color>; outline-offset: <gap>` — md 2.5px/1.5px, sm
  2px/1px, xs 1.5px/1px. Palette marks use theme tokens; own colors use the hex.
- An outline's symbol shows in the mark's color only when the box has no fill.
- Focus: boxes and legend buttons use a `focus-visible` ring (box-shadow) instead of the default
  focus outline, which the layer now owns.
- Legend buttons get inner padding so an outlined swatch never touches the yellow (`warning`)
  brush frame; the frame is `border-warning` plus a 1px `warning` ring.

**Rationale**: the approved prototype drew the gap with a box-shadow in the surface color, which
only works on one background; sheets put trackers on `bgSurface` and `bgBase`. `outline-offset`
leaves a transparent gap on any background and follows border radius in current browsers.

**Alternatives considered**: `ring` + `ring-offset` utilities (offset color must match the
background); a thicker border (rejected by the maintainer: hides same-colored outlines).

## R8 — Editor

**Decision**:

- `TrackerSettings` adds a Fill/Outline switch under each mark's name. With `game` set it renders
  locked to Fill with the hint "The game keeps one mark per box".
- "Start from…" adds `points`: "Point" (fill, amber, symbol ●) and "Maximum" (outline, amber, no
  symbol).
- `builtInSettings` reports game marks with `layer: 'fill'`; `builtInSettingsUpdate` never
  stores a layer in the override.
- `sourceNodes` built-in → own: taken-over marks are fills (schema default); own → built-in is
  unchanged (the game's marks apply).
- When the brush's mark changes layer or is removed in the editor preview, R1's validity check
  ends the brush.

## R9 — Storybook, docs, and records

**Decision**:

- `trackers` story: a Force Points tracker (fill + outline, legend on), a "Wounds and conditions"
  tracker (two fills, two outlines); the built-in variants keep `legend: true` on the
  page-settings variant. Guard tags: `tracker:layer:outline`, `tracker:legend` (exists),
  `primitive:tracker:legend` (exists).
- Guide (en/ru): marks get "Layer"; a "Marking with the legend" paragraph; the points set.
- Skill and `src/sheet_manager/AGENTS.md`: layers, resolver, brush.
- Spec 018 spec.md: a banner noting that spec 019 changes the legend and the one-mark-per-box
  rule.

## Implementation notes (2026-10-02)

Where the built code refines the decisions above:

- **One layer write** (`trackerModel.ts` `writeLayer`) serves both the click cycle and the brush.
  Besides clearing the replaced mark from wherever it was stored (R3), it first moves a mark of
  the other layer out of this layer's slot (a mark whose layer changed since it was stored), so
  writing one layer never loses the other.
- **Brush state** is `{ id, layer }`: a layer change in the editor ends the brush (FR-005), and it
  does not come back when the mark returns.
- **Escape** is a `keydown` listener on the tracker root, added while a brush is on (a JSX
  handler on the wrapping `div` fails the a11y lint for static elements).
- **Legend words**: the layer word ("fill" / "outline") follows the mark name only when the
  tracker uses both layers, so single-layer legends keep their names as accessible names.
- **Built-in trackers** needed no source-switch change: own marks taken over from a built-in
  track come from the default mark set, which is fills.
