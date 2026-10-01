# Quickstart: Tracker brush and two layers

Manual walk-through on the dev server, after `yarn verify:full` passes.

## Prerequisites

- `yarn start` (or the running server at http://localhost:3000).
- A document with an own tracker (spec 018 quickstart scenario 1) and a Star Wars character.

## Scenarios

1. **Brush on an own tracker** (US1): turn on "Name the marks under the tracker" on a three-mark
   tracker. On the sheet, press "Aggravated": it gets a yellow frame and the status line appears.
   Click an empty box and a bashing box: both become aggravated in one click. Click one again: it
   empties. Press "Aggravated" again: the frame goes and clicks cycle as before.
2. **Switch and stop** (US1): with a brush on, press another legend item (the brush moves); press
   Escape with focus on a box (the brush ends).
3. **No brush where it cannot work** (US1): a read-only viewer, the legend off, and the one-line
   display show no legend buttons.
4. **Built-in brush** (US1, US4): on the Star Wars character page turn the legend on in the
   editor; on the sheet, brush "Lethal" onto health boxes; the penalty row follows. On a fodder
   group, brush in members A and B.
5. **Force Points tracker** (US2, SC-002): add a tracker, "Start from… → Points: current and
   maximum", ten levels, strip display, legend on. Brush "Maximum" on boxes 1–5, then "Point" on
   1–2. Boxes 1–2 show a filled box inside a ring, 3–5 only rings. Reload: unchanged.
6. **Cycling keeps the outline** (US2): without a brush, click a ringed box: the fill cycles, the
   ring stays.
7. **Same color stays readable** (SC-004): in light and dark themes, boxes 1–2 of scenario 5 are
   told apart from a fill-only box at table, strip, and one-line sizes.
8. **Totals and out read fills** (US3): on a health tracker with an outline mark, put only an
   outline on the deepest level: the total row ignores it. With "out" on, an outline on the last
   level does not mark the copy out.
9. **Lengths fold per layer** (US3): on a tracker with lengths, mark fills and outlines on the last
   levels and shorten: each layer folds into the new last level, neither overwrites the other.
10. **Editor changes are reported** (US3): change a stored outline mark to Fill on boxes that
    already hold a fill, save: the confirmation counts the hidden marks; switch it back: they
    reappear. Remove the outline mark: counted again, nothing deleted.
11. **Old sheets look the same** (SC-003): a document saved before this feature shows the same
    marks, totals, and "out".
12. **Built-in layer locked** (US4): a built-in tracker's mark rows show Layer: Fill, disabled.
13. **Storybook**: `docs/dev/storybook/template-elements` shows the two-layer trackers and the
    brush legends; the fodder-group parity widget still matches.
