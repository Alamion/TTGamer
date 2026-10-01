# Feature Specification: Tracker brush and two layers

**Feature Branch**: `testing`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Feedback on the trackers of spec 018. (1) With the legend on, its
items work as buttons: a pressed item gets a yellow frame, only one is active at a time, a second
click turns it off, and while one is active a click on any box puts that mark on it, with no
cycling; a click on a box that already holds it clears it. (2) A box can hold two values at once:
a fill and a thick outline, each optional. Marks get a layer, fill or outline. Example: Star Wars
Force Points, where the outline shows the maximum and the fill the current points. Clicks without
a brush cycle the fill marks only; built-in trackers stay fill-only; the total row and 'out' read
the fill. Approved prototype: `specs/019-tracker-brush-layers/prototype.html`, outline look
'Ring outside'."

## Scope

| Backlog | Entry                           | Role in this feature                      |
| ------- | ------------------------------- | ----------------------------------------- |
| T-086   | Tracker brush and two layers    | User Stories 1–4                          |
| T-085   | Point trackers and Force Points | Follow-up; this feature makes it possible |

Spec 018 built trackers: levels with boxes the sheet's user marks, the kinds of marks the author
chooses, columns and copies, lengths, a total row, and an optional legend naming the marks. Every
box holds one mark at most, and a click moves it to the next mark, then back to empty.

Two needs came up in use. Picking a heavy mark takes several clicks through the lighter ones, and
the legend, now opt-in, only names marks. And some trackers need two facts per box: Star Wars
Force Points have a maximum and a current number, which today take two separate resources.

This feature turns the legend into a brush and gives every box two layers. The prototype is the
approved reference for the sheet and the editor.

Maintainer decisions (2026-10-01 and 2026-10-02):

- The brush is a legend item the sheet's user presses. One item at a time per tracker; pressing
  it again turns it off. A brush click on a box that already holds that mark clears it.
- A mark is a **fill** (the colored box with its symbol, as today) or an **outline** (a thick frame
  in the mark's color). A box holds at most one of each.
- An outline's symbol shows only when the box has no fill; with a fill, the fill's symbol shows.
- Without a brush, a click cycles the fill marks only and leaves the outline as it is.
- The total row and "out" read the fill layer.
- Built-in trackers stay fill-only: the game keeps one mark per box. The brush works on them.
- The outline is a ring drawn outside the box with a small gap ("Ring outside"); boxes become
  smaller and sit further apart so neighboring rings and the brush's frame never touch.

Out of scope (recorded as T-085):

- A box filling every box before it, like a rating's dots, and a total row that counts filled
  boxes ("2 of 5").
- Star Wars Force Points as a built-in tracker; here they can only be rebuilt as an own tracker.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Mark boxes with a brush from the legend (Priority: P1)

A sheet's user has a tracker with its legend on. They press "Aggravated" in the legend; it gets a
yellow frame. Every box they click now gets aggravated directly, without passing through bashing
and lethal; clicking a box that is already aggravated clears it. Pressing "Aggravated" again, or
another item, ends or switches the brush.

**Why this priority**: it is the most frequent complaint and works on every tracker, built-in ones
included, without any change to stored data.

**Independent Test**: on a three-mark tracker with the legend on, press the third mark and click
empty, bashing, and aggravated boxes; each ends as aggravated, aggravated, and empty.

**Acceptance Scenarios**:

1. **Given** a tracker with its legend on and no brush, **When** the user presses a legend item,
   **Then** the item shows a yellow frame and is announced as pressed, and no other item of that
   tracker is pressed.
2. **Given** a brush on "Lethal", **When** the user clicks an empty box or a bashing box, **Then**
   the box becomes lethal in one click.
3. **Given** a brush on "Lethal", **When** the user clicks a lethal box, **Then** the box becomes
   empty.
4. **Given** a brush on "Lethal", **When** the user presses "Lethal" again or presses Escape,
   **Then** the brush ends and clicks cycle the marks again; **When** they press "Bashing"
   instead, **Then** the brush moves to bashing.
5. **Given** a built-in tracker (Star Wars health, a fodder group) with its legend on, **When** the
   user uses the brush, **Then** it marks the game's data the same way, in every member copy.
6. **Given** a read-only sheet, a tracker with its legend off, or a tracker drawn as one line,
   **Then** there is no brush: the legend, when shown, is plain labels.

---

### User Story 2 - Marks on two layers (Priority: P1)

A template author builds a Force Points tracker: ten levels, a fill mark "Point" and an outline
mark "Maximum", both amber. On the sheet, the user frames five boxes as the maximum and fills two
of them as current points; both show at once on the same boxes.

**Why this priority**: it is the architectural change the feedback asks for; the brush is the
natural way to place outline marks.

**Independent Test**: build that tracker in the editor, mark the outline on boxes 1–5 with the
brush, then fill boxes 1–2; boxes 1–2 show the fill inside the ring, boxes 3–5 only the ring, and
reloading the sheet shows the same.

**Acceptance Scenarios**:

1. **Given** the mark settings of an own tracker, **When** the author opens a mark, **Then** they
   can set its layer to Fill or Outline; new marks are fills.
2. **Given** "Start from…", **When** the author picks "Points: current and maximum", **Then** the
   tracker gets one fill mark and one outline mark.
3. **Given** a box with an outline, **When** the user clicks it without a brush, **Then** the fill
   cycles and the outline stays.
4. **Given** a box with a fill and an outline, **Then** it shows the fill's color and symbol inside
   a ring in the outline's color, and its accessible name lists both marks.
5. **Given** a brush on an outline mark, **When** the user clicks a box, **Then** only the outline
   changes; the fill stays.
6. **Given** a tracker whose marks are all outlines, **When** the user clicks without a brush,
   **Then** the click cycles the outline marks.
7. **Given** the legend of a tracker with both layers, **Then** each item shows its swatch as it
   appears in a box (filled square or ring) and names its layer.

---

### User Story 3 - Totals, lengths, copies, and changes with two layers (Priority: P2)

Everything spec 018 built keeps working with a second layer: the total row and "out" read the
fill, shortening folds each layer on its own, copies carry both layers, and the editor warns before
a save hides stored outlines just as it does for fills.

**Why this priority**: without it, two-layer trackers would give wrong totals or lose marks
silently.

**Independent Test**: on a tracker with lengths and both layers, mark both layers on the last
levels, shorten, and see each layer fold into the new last level; then remove the outline mark in
the editor and see the save warning count the outlines.

**Acceptance Scenarios**:

1. **Given** a box with only an outline at the deepest marked level, **Then** the total row ignores
   it and shows the value of the deepest filled level.
2. **Given** "Mark a copy as out", **Then** a copy is out only when its last level holds a fill.
3. **Given** a shorter length, **When** the tracker shortens, **Then** the fills fold into the new
   last level (the heaviest fill wins, as today) and the outlines fold the same way among
   outlines; neither layer overwrites the other.
4. **Given** a saved tracker whose stored values hold outlines, **When** the author removes the
   outline mark, removes levels, or shortens lengths, **Then** the save warning counts those
   outlines with the other hidden values, and nothing stored is deleted.
5. **Given** a mark whose layer the author changes, **Then** boxes that held it show it on its new
   layer; where that layer is already taken in a box, the moved mark is hidden and counted.
6. **Given** a sheet with values saved before this feature, **Then** every stored mark reads as a
   fill and looks exactly as before.

---

### User Story 4 - Built-in trackers stay fill-only (Priority: P3)

The author edits a built-in tracker's settings. Its marks show the layer as Fill, locked, with a
hint that the game keeps one mark per box. Everything else from spec 018 still applies.

**Why this priority**: it keeps the game's own data shape and the fodder-group parity intact.

**Independent Test**: open a built-in tracker in the editor and find the layer locked; the
fodder-group parity example still matches at every length.

**Acceptance Scenarios**:

1. **Given** a built-in tracker in the editor, **Then** each mark's layer shows Fill and cannot
   change.
2. **Given** the fodder-group parity example, **Then** the built-in and own trackers still show the
   same levels, marks, totals, and "out" at every length, and the brush marks both the same way.
3. **Given** a built-in tracker switched to own values, **Then** every mark it takes over is a
   fill.

### Edge Cases

- The author removes the brush's mark, moves it to another layer, or turns the legend off while a
  sheet shows that brush: the brush ends.
- A tracker with one mark and the legend on: the single item is still a brush (useful for marking
  without cycling back to empty).
- A brush on a tracker with several copies works in every copy; on a built-in member track it
  never adds or removes members.
- Two trackers on one page each have their own brush; pressing an item in one does not change the
  other.
- The brush is not saved: reloading the sheet, switching pages, or opening another document starts
  without one.
- A level not covered by a column has no box; the brush does nothing there.
- Outline and fill of the same color stay distinguishable: the ring sits outside the box with a gap
  in the surface color.
- On one line (the smallest boxes) outlines still show, as a thinner ring.
- A stored outline whose mark kind no longer exists, or whose mark is now a fill on a box that
  already holds another fill, is hidden and reported, never deleted.

## Requirements _(mandatory)_

### Functional Requirements

**Brush**

- **FR-001**: When a tracker's legend is shown on an editable sheet, each legend item MUST be a
  button the sheet's user can press; a pressed item MUST show a yellow (warning color) frame and
  be announced as pressed.
- **FR-002**: At most one legend item per tracker MUST be pressed at a time; pressing another item
  MUST move the brush to it; pressing the pressed item or pressing Escape MUST end the brush.
- **FR-003**: While a brush is on, a click on a box MUST put the brush's mark on the mark's layer
  of that box, replacing whatever that layer held, or clear that layer if it already holds the
  brush's mark; the other layer MUST NOT change, and no cycling MUST happen.
- **FR-004**: The brush MUST work on own and built-in trackers, in every copy, in table and strip
  displays; it MUST NOT exist on one line, with the legend off, or on a read-only sheet, where the
  legend (if shown) stays plain labels.
- **FR-005**: The brush MUST NOT be stored; it MUST end when its mark is removed, changes layer,
  or the legend is turned off, and MUST start off on every sheet load.
- **FR-006**: While a brush is on, the tracker MUST say which mark it places and how to stop, in a
  status message assistive technology announces.

**Layers**

- **FR-007**: Each mark of an own tracker MUST have a layer, Fill or Outline, set in the mark's
  settings; a mark without a stored layer MUST be a fill.
- **FR-008**: A box MUST hold at most one fill mark and one outline mark, each optional and
  independent.
- **FR-009**: A fill MUST look as today (the mark's color behind its symbol). An outline MUST be a
  ring in the mark's color drawn outside the box, separated from it by a thin gap in the surface
  color; its symbol MUST show, in the mark's color, only when the box has no fill.
- **FR-010**: Boxes MUST become smaller with more room between them than in spec 018, so that rings
  of neighboring boxes and the brush's frame around a legend swatch never touch (sizes as in the
  approved prototype).
- **FR-011**: A box's accessible name MUST list its level and each mark it holds, or say it is
  empty.
- **FR-012**: Without a brush, a click MUST cycle the fill marks (empty → first → … → last →
  empty) and keep the outline; a tracker with no fill marks MUST cycle its outline marks instead.
- **FR-013**: The legend MUST show each mark's swatch as it looks in a box and, when the tracker has
  marks on both layers, name each mark's layer.
- **FR-014**: "Start from…" MUST offer "Points: current and maximum": one fill mark and one outline
  mark of the same color.
- **FR-015**: The five-mark limit MUST count marks of both layers together.

**Reading and changes**

- **FR-016**: The total row, the marked level name, and "out" MUST read the fill layer (the outline
  layer on a tracker with no fill marks).
- **FR-017**: Shortening a tracker MUST fold each layer separately, the heaviest mark of that layer
  winning, as spec 018 folds marks; lengthening MUST NOT invent marks on either layer.
- **FR-018**: Copies MUST carry both layers; removing a copy that holds only outlines MUST ask first,
  as for marks.
- **FR-019**: Stored outlines the tracker no longer shows (removed mark, level, column, length, or a
  layer change that collides) MUST be counted with the other hidden values on the sheet and in the
  editor's save warning, and MUST NOT be deleted.
- **FR-020**: Changing a mark's layer MUST show every box that held it on its new layer when that
  layer is free in the box; otherwise that mark is hidden per FR-019.
- **FR-021**: Values stored before this feature MUST read as fills with no conversion and look as
  before.

**Built-in trackers and editor**

- **FR-022**: Built-in trackers MUST stay fill-only: the layer setting MUST be shown locked to Fill
  with a hint that the game keeps one mark per box.
- **FR-023**: Switching a built-in tracker to own values MUST give every mark it takes over the
  Fill layer; switching an own tracker to a built-in source takes the game's marks, as in spec 018.
- **FR-024**: The fodder-group parity of spec 018 MUST still hold, brush included.

**Quality and documentation**

- **FR-025**: The element storybook MUST show a tracker with both layers, a tracker whose legend is
  a brush, and a built-in tracker with a brush, guarded by the storybook test.
- **FR-026**: The template editor guide (English and Russian) MUST describe layers and the brush;
  the sheet-templates skill and the module notes MUST describe the current behavior; the spec 018
  record MUST point to this feature for the legend and one-mark-per-box parts it changes.

### Key Entities _(include if feature involves data)_

- **Mark kind**: as in spec 018 (name, symbol, fill color), plus its **layer**: fill or outline.
- **Box value**: per level and copy, an optional fill mark and an optional outline mark. Stored
  values of spec 018 are fill marks.
- **Brush**: a sheet-only choice of one mark kind per tracker; never stored.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Placing the heaviest of three marks on an empty box takes one click with a brush
  instead of three.
- **SC-002**: A Force Points tracker (ten levels, a maximum of five, two current points) can be
  built and filled in the editor and on the sheet in under 3 minutes without the guide.
- **SC-003**: Every sheet saved before this feature shows the same marks, totals, and "out" after
  it (0 visual or value differences in the existing tracker tests and the fodder-group parity).
- **SC-004**: In both themes, a box with a fill and an outline of the same color is told apart from
  a box with the fill alone at every display size.
- **SC-005**: No stored mark of either layer is deleted by any editor change; every hidden one is
  counted.

## Assumptions

- "One active pair at a time" applies per tracker; each tracker on a page has its own brush.
- Escape ending the brush is an addition from the prototype; it does not conflict with dialogs,
  which take Escape first while open.
- The smaller boxes apply to every tracker, with or without outlines, so trackers keep one size
  across a page.
- Mark names and colors of built-in trackers stay settable as in spec 018; only the layer is
  locked.
- Formulas reading trackers (T-083) will read the fill layer unless that task decides otherwise.
- Pools that fill every earlier box and count totals, and the Star Wars Force Points as a built-in
  tracker, are T-085.
