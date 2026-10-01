# UI Contract: Tracker brush and two layers

Changes to `specs/018-configurable-trackers/contracts/tracker-ui.md`. The prototype
(`../prototype.html`, look "Ring outside") is the visual reference.

## Sheet: legend as a brush

- Shown only when the tracker's legend is on and the display is a table or strip.
- **Editable sheet**: each item is a `<button type="button">` with `aria-pressed`. Its content is
  the swatch (as the mark looks in a box), the mark name, and, when the tracker has marks on both
  layers, the layer word ("fill" / "outline").
    - Title: "Mark boxes with {mark}" / "Stop marking with {mark}".
    - Pressed: `border-warning` plus a 1px `warning` ring; at most one pressed item per tracker.
    - Clicking the pressed item ends the brush; clicking another moves it.
- **Read-only sheet**: items are plain labels (no buttons), as in spec 018.
- **Status**: a `role="status"` line under the legend: "Marking with {mark}: a click puts it on a
  box or takes it off. Click it again or press Escape to stop." Empty without a brush.
- **Escape** while focus is inside the tracker ends the brush.

## Sheet: boxes

- Sizes: table and strip 26px, one line 20px; strip gap 12px; table rows 8px vertical padding.
- Fill: as spec 018 (mark color background and border, symbol in white, ink inverted).
- Outline: `outline` in the mark's color, offset outward with a transparent gap (md 2.5px wide,
  1.5px gap; sm 2px, 1px). Its symbol shows in the mark's color only when the box has no fill.
- Focus: a visible `focus-visible` ring that does not reuse `outline`.
- Accessible name: "{level}: {fill name}, {outline name}", "{level}: {name}", or "{level}: empty"
  (repeated columns keep "{level} ({letter})").
- Click without a brush cycles the reading layer; with a brush, sets or clears the brush mark's
  layer only (see `data-model.md`, state transitions).

## Editor: marks

- Each mark row gains **Layer**: a two-button switch "Fill" / "Outline" (`aria-pressed`), labelled
  "Mark {n} layer".
- With a built-in tracker (`game` set) the switch shows Fill, disabled, and the group hint reads
  "The game keeps one mark per box: names, symbols, and colors only."
- "Start from…" adds "Points: current and maximum (fill + outline)".
- The marks group hint for own trackers: "Up to five. Fill marks color the box and are what a click
  cycles through; outline marks frame it. A box holds one of each."
- The "Name the marks under the tracker" toggle gains a hint: "Readers can pick a mark in the
  legend and put it on boxes directly."

## Editor: save confirmation

- The existing "Hide stored tracker values?" dialog counts outlines with marks ("{n} marks").
- No new dialog.

## Storybook

- Own trackers: a two-layer Force Points strip with the legend on; a table with two fills and two
  outlines.
- Built-in: the page-settings variant keeps the legend on, so its brush is visible.
- Guard tags added: `tracker:layer:outline`.
