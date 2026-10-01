# UI Contract: Point trackers and Force Points

Changes to `specs/019-tracker-brush-layers/contracts/tracker-ui.md`. The prototype
(`../prototype.html`) is the visual reference.

## Sheet: clicks (every tracker)

- **Left click**: with a brush, the brush mark; else the reading layer (spec 019).
- **Right click** (`contextmenu`): the first outline mark, by the left click's rules (a run from
  the start, or the outline cycle). Taken (`preventDefault`) only when the tracker has outline
  marks and is enabled; otherwise the browser menu opens.
- Keyboard: Enter/Space act as a left click; outlines are reached through the legend brush.

## Sheet: own tracker that fills from the start

- A click on box N marks boxes 1…N of that layer and clears the layer after N; a click on the last
  marked box (showing that mark) shortens the run by one. The other layer stays.
- "Fills stay inside the outline": a fill run stops at the last framed box.

## Sheet: count total

- Text `"{filled} / {framed}"` when the tracker has outline marks and a box is framed, else
  `"{filled}"`. Table: in the total row per copy; strip and one line: after the boxes, with the
  value column's title before it when set.

## Sheet: pool resource as a tracker

- **Row** (default): one line, `justify-between`: the label (rating row typography) on the left;
  on the right the boxes (16px, 7px gap, outline 2px with a 1px gap) and the count. Sits aligned
  with rating rows in the same group.
- **Strip** and **One line**: the own tracker displays.
- Boxes run to the pool's limit; fills = current, outlines = maximum; marks in the accent color
  by default.
- **Locked boxes** (below a minimum): darker shade of the mark's own color; accessible name adds
  "locked"; title "{level} — cannot go below {n}". Clicking them never lowers the value below the
  minimum.
- Read-only: boxes disabled, no legend buttons.
- The formula clamp notice ("formulaClamped") shows under the tracker as under the dots.

## Editor: tracker settings ("Reading the marks")

- Toggle "Marks fill from the start" (off), hint: "Marking a box marks every box before it, like a
  rating's dots."
- Toggle "Fills stay inside the outline" (off), shown only with the first; hint: "A fill never
  goes past the last framed box."
- Choice "Total": "Deepest level" (default) / "Count", hint for Count: "How many boxes are filled,
  and how many are framed."
- Hidden on built-in trackers.
- "Start from… → Points" also sets fill from the start and Count.
- Mark color list gains "Accent".

## Editor: pool resource

- "Display": "Dots" (default) / "Tracker". With Tracker:
    - "Part" and "Compact" are hidden;
    - "Look": Row / Strip / One line;
    - the two marks (Current, Maximum): name, symbol, color; the layer is fixed and shown as text;
    - toggles "Name the marks under the tracker" and "Show the count";
    - "Maximum at least" formula field next to "At least" (`minFrom`, now labeled for the current
      value), both with the existing `limitsFromValues` help.
- Rating resources and other bindings never show "Display".

## Storybook

- Own: a point tracker (fill from the start, count, legend); "two fills, two outlines" with fills
  inside the outline.
- Pool: a pool resource as a Row next to a rating row; a pool with a locked minimum.
- Guard tags: `tracker:from-start`, `tracker:count`, `primitive:resource:tracker`.
