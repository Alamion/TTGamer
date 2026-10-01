# Quickstart: Point trackers and Force Points

Manual walk-through on the dev server, after `yarn verify:full` passes.

## Prerequisites

- `yarn start` (or the running server at http://localhost:3000).
- A document with an own tracker, a Star Wars character with the Force section, and a WoD 2e
  character.

## Scenarios

1. **Fill from the start** (US1): add a tracker, "Start from… → Points", ten levels, strip,
   legend on. Click box 4: boxes 1–4 filled, the count reads "4". Click box 2: 1–2 stay. Click
   box 2 again: only box 1.
2. **Right click** (US1, FR-005a): right-click box 5: boxes 1–5 framed, the fills stay; the count
   reads "1 / 5". Right-click on a health tracker (no outlines): the browser menu opens.
   Tab to box 6 and press Shift+Enter: boxes 1–6 framed. In the browser's phone emulation (or on a
   phone), long-press box 3: boxes 1–3 framed, no tap and no menu follow.
3. **Brush runs** (US1): add a second fill "Spent"; brush it on box 3: boxes 1–3 show "Spent",
   the first fill is gone after them.
4. **Fills inside** (US1): turn on "Fills stay inside the outline"; with boxes 1–5 framed, click
   box 8: boxes 1–5 filled.
5. **Count vs deepest** (US2): switch the total to "Deepest level": the strip shows the level
   value as before; back to "Count". In a table with copies each copy counts its own boxes.
6. **Old trackers** (SC-003): a tracker saved before this feature behaves as before (box-by-box,
   deepest level).
7. **Star Wars Force Points** (US3, FR-014): on the full sheet the Force resources show one Force
   Points row with dot-sized red boxes next to Willpower and Dark Side Resistance dots. Set Self-
   Control 3: framed boxes 1–3 are darker and cannot be removed. Fill box 2 → "2 / 3"; fill box
   5 → stays "3 / 3"; right-click box 5 → "3 / 5".
8. **Same values elsewhere** (SC-004): open the brief sheet: Force Points shows 3 of 5.
9. **Willpower minimum on current** (US3): in the editor set a Star Wars Willpower node to the
   tracker display. With Passion 2 and Self-Control 2, filled boxes 1–4 are darker and stay; fill
   box 9 → "9 / 9".
10. **WoD 2e Willpower** (US3): show Willpower as a tracker; lowering the maximum below the
    current lowers the current.
11. **Read-only** (US3): a viewer cannot change the boxes; no legend buttons.
12. **Editor** (US4): tracker settings show the new toggles and the total choice in "Reading the
    marks"; a pool resource offers "Display: Tracker", a rating resource does not.
13. **Storybook**: `docs/dev/storybook/template-elements` shows the point trackers and the pool
    row next to a rating row.
