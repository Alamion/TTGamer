# Feature Specification: Point trackers and Force Points

**Feature Branch**: `testing`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "T-085: template authors build point pools as trackers: a box can
fill every box before it as well, like a rating's dots, and the total row can count the filled
boxes ('2 of 5' with the outline layer as the maximum); the Star Wars Force Points and their
maximum become a built-in tracker on these terms."

## Scope

| Backlog | Entry                           | Role in this feature |
| ------- | ------------------------------- | -------------------- |
| T-085   | Point trackers and Force Points | User Stories 1–4     |

Spec 019 gave trackers two layers per box (a fill and an outline) and a legend brush. A Force
Points tracker can already be built, but it behaves like a wound track: each box is marked on its
own, and the total row shows the value of the deepest marked level. A pool of points needs two
other behaviors that ratings already have: marking box N marks every box before it, and the
reading is a count ("2 of 5"), not a level's value.

Today the Star Wars sheet shows Force Points as two rows of dots ("Max Force Points" with its
minimum from Self-Control, and "Force Points"), and the WoD 2e engine shows Willpower as one row
of dots plus the current value. Both are a current-and-maximum pool, the shape this feature
draws as one tracker.

Maintainer decisions (2026-10-02):

- A plain click on a tracker that fills from the start puts the first fill mark; other fills come
  from the legend brush.
- Every pool resource gets the tracker look as a display option of the resource element.
- The shipped Star Wars full sheet shows Force Points as one tracker; the brief sheet stays as is.
- A prototype is reviewed before the spec is committed.
- Prototype review (2026-10-02): the right mouse button puts the first outline mark by the same
  rules as the left button puts the first fill (on every tracker, not only on ones that fill from
  the start); "Fills stay inside the outline" is an option of trackers that fill from the start,
  off by default; a pool drawn as a tracker looks like a rating row (label left, dot-sized boxes
  right, the rating dots' accent color), and locked boxes darken in their own mark's color.

Out of scope:

- Formulas reading a tracker (T-083).
- New point pools in any game system; only pools the systems already store are drawn.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Boxes that fill from the start (Priority: P1)

A template author turns on "Marks fill from the start" on a tracker. On the sheet, marking box 4
marks boxes 1–4; marking box 2 afterwards leaves boxes 1–2; clicking the last marked box removes
just that one, as a rating's dots do. With two layers, each layer runs on its own: the outline
marks the maximum, the fill the current points.

**Why this priority**: it is what makes a tracker usable as a pool at all; everything else builds
on it.

**Independent Test**: an own tracker with ten boxes and "Marks fill from the start": brush the
outline onto box 5, then the fill onto box 2; boxes 1–5 are framed, boxes 1–2 filled; click box 2
with the fill brush and only box 1 stays filled.

**Acceptance Scenarios**:

1. **Given** a tracker with "Marks fill from the start" and no marks, **When** the user marks box
   4, **Then** boxes 1–4 hold the mark and boxes 5 and later are empty on that layer.
2. **Given** boxes 1–4 marked, **When** the user marks box 2, **Then** boxes 1–2 stay marked and
   3–4 are cleared on that layer.
3. **Given** boxes 1–4 marked, **When** the user clicks box 4, **Then** boxes 1–3 stay marked.
4. **Given** boxes 1–5 framed by the outline, **When** the user fills box 2, **Then** the outlines
   stay as they are.
5. **Given** a tracker without the setting, **Then** every box is still marked on its own (spec
   018/019 behavior).
6. **Given** any tracker with outline marks, **When** the user right-clicks a box, **Then** the
   first outline mark is put on (a run from the start, or the next outline in the cycle), and the
   fill stays.
7. **Given** "Fills stay inside the outline" with boxes 1–5 framed, **When** the user fills box 8,
   **Then** boxes 1–5 are filled.
8. **Given** a tracker with several kinds of fill marks and the setting on, **When** the user
   clicks without a brush, **Then** the run gets the first fill mark; other fills are put on with
   the legend brush.

---

### User Story 2 - Count the marked boxes (Priority: P1)

The author sets the total row to **Count**. A copy's total then shows how many boxes hold a fill
mark, and, when the tracker uses the outline layer, how many hold an outline: "2 / 5". In a strip,
the count follows the boxes.

**Why this priority**: a pool is read as a number; without it the reader counts boxes by eye.

**Independent Test**: on the tracker of US1, the strip reads "2 / 5"; clearing the outlines reads
"2"; switching the total back to **Deepest level** shows the level value as before.

**Acceptance Scenarios**:

1. **Given** the total set to **Count** and boxes 1–2 filled and 1–5 framed, **Then** the total
   reads "2 / 5".
2. **Given** a tracker with no outline marks, **Then** the count reads the number of filled boxes
   alone.
3. **Given** the total set to **Deepest level** (the default), **Then** the total shows the value
   of the deepest filled level, exactly as before.
4. **Given** a table display with copies, **Then** each copy shows its own count in the total row.

---

### User Story 3 - Built-in pools drawn as trackers (Priority: P2)

On a page, a pool the game keeps as current and maximum (Star Wars Force Points, WoD 2e and Star
Wars Willpower) can be drawn as one tracker: the maximum as outlined boxes, the current points as
filled boxes inside them, read as "2 / 5". The values stay the game's own: the same pool shown as
dots on another page shows the same numbers.

**Why this priority**: it is the motivating example and removes the two-row Force Points layout,
but it depends on US1 and US2.

**Independent Test**: on a Star Wars character, set Force Points to 2 of 3 with the dots, then show
the pool as a tracker: boxes 1–3 framed, 1–2 filled; fill box 3 and the dots page shows 3 of 3.

**Acceptance Scenarios**:

1. **Given** a pool resource placed on a page, **When** the author chooses the tracker look,
   **Then** the sheet draws one row of boxes up to the pool's largest possible maximum, the
   maximum framed and the current points filled.
2. **Given** the tracker look, **When** the user fills a box beyond the framed maximum, **Then**
   the current value does not exceed the maximum: the fill stops at the last framed box, as the dot
   rows cap it today.
3. **Given** a maximum with a minimum from a formula (Max Force Points ≥ Self-Control), **Then**
   framed boxes below that minimum are shown locked and cannot be removed; **given** a current
   value with a minimum (Star Wars Willpower ≥ Passion + Self-Control), filled boxes below it are
   locked the same way, and filling past the maximum raises it as the dot row does.
4. **Given** a lower maximum, **Then** the current points are lowered to it, as today.
5. **Given** a read-only sheet, **Then** the boxes do not change.
6. **Given** the shipped Star Wars full sheet, **Then** its "Max Force Points" and "Force Points"
   rows are one Force Points tracker; the brief sheet keeps its compact numbers.

---

### User Story 4 - Editor and storybook (Priority: P3)

The author finds the new settings where they expect them: "Marks fill from the start" and the
total's **Deepest level / Count** choice in the tracker's "Reading the marks" group, and the
tracker look among a pool resource's display choices. The storybook shows each.

**Why this priority**: discoverability and the constitution's storybook rule; no new behavior.

**Independent Test**: open a tracker and a pool resource in the editor and find each setting;
the storybook page shows a point tracker and a built-in pool as a tracker.

**Acceptance Scenarios**:

1. **Given** the tracker settings, **Then** "Marks fill from the start" and the total's
   **Deepest level / Count** choice are in "Reading the marks", off and **Deepest level** by
   default.
2. **Given** a pool resource's settings, **Then** the tracker look is offered next to the existing
   displays; rating resources and non-pool fields do not offer it.
3. **Given** "Start from… → Points: current and maximum", **Then** the new tracker also gets
   "Marks fill from the start" on and the total set to **Count**.

### Edge Cases

- Marks fill from the start on a tracker with copies: each copy runs on its own.
- Marks fill from the start with lengths: shortening keeps the run from the start (a run never
  gets a gap); lengthening adds empty boxes after it.
- Stored values saved before the setting was turned on may have gaps; they show as stored, and
  the next click makes the run contiguous up to the clicked box.
- A count on a tracker with outline marks but no framed box reads the filled count alone ("2"),
  never "2 / 0".
- A built-in pool whose current exceeds its maximum in stored data (imported data): shown as
  stored; the next write clamps as today.
- A pool's largest possible maximum is the game's limit (10 for Star Wars Force Points and
  Willpower); boxes beyond it never show.
- The legend brush on a built-in pool: the outline brush sets the maximum, the fill brush the
  current points.
- Text columns, copies, and lengths do not apply to a built-in pool (one row of boxes).

## Requirements _(mandatory)_

### Functional Requirements

**Filling from the start**

- **FR-001**: An own tracker MUST offer "Marks fill from the start", off by default.
- **FR-002**: With it on, marking box N on a layer MUST put the mark on boxes 1…N of that layer in
  shown order and clear that layer after N; clicking the last marked box of the run MUST shorten
  the run by one (as a rating's dots do).
- **FR-003**: Each layer MUST run on its own; marking one layer MUST NOT change the other.
- **FR-004**: The brush (spec 019) MUST work the same way: the brush mark fills from the start on
  its layer.
- **FR-005**: Without a brush, a left click MUST fill from the start with the first mark of the
  reading layer (spec 019); other marks are put on with the brush.
- **FR-005a**: On every tracker, a right click (the context-menu gesture) MUST act on the outline
  layer with its first mark, by the rules a left click follows on the fill layer: a run from the
  start on trackers that fill from the start, else the outline cycle. The brush applies to left
  clicks only. On a tracker without outline marks, the right click keeps the browser's own menu.
  Keyboard users reach outlines through the legend brush.
- **FR-005b**: A tracker that fills from the start MUST offer "Fills stay inside the outline", off
  by default: with it on, a fill run never passes the last framed box.
- **FR-006**: The setting MUST apply per copy and only to marks columns.

**Counting**

- **FR-007**: The total row MUST offer **Deepest level** (default, spec 018 behavior) or **Count**.
- **FR-008**: **Count** MUST show the number of boxes holding a fill mark; when the tracker has
  outline marks and at least one box is framed, it MUST show "filled / framed".
- **FR-009**: The count MUST show in the table's total row per copy and after the boxes in a
  strip; on one line it MUST show after the boxes as well.

**Built-in pools**

- **FR-010**: Any pool resource (current and maximum: Force Points, Willpower) placed on a page
  MUST offer a tracker look as a display option of the resource element, not a new element: one
  row of boxes up to the pool's game maximum, the maximum as outlines and the current value as
  fills, with fill-from-the-start behavior and a count total.
- **FR-011**: Writes MUST keep the pool's rules: the current value never exceeds the maximum
  unless the game lets it raise the maximum (Star Wars Willpower), and the current value and the
  maximum never go below their minimum formulas (current Willpower ≥ Passion + Self-Control, Max
  Force Points ≥ Self-Control); boxes below a minimum MUST show locked, in a darker shade of their
  own mark's color, and cannot be cleared.
- **FR-011a**: A pool drawn as a tracker MUST default to a **Row** display that sits with rating
  rows: the label left, boxes the size of rating dots on the right, the count after them, and
  marks in the rating dots' accent color; **Strip** and **One line** stay available. The accent
  color joins the tracker palette.
- **FR-012**: The pool's values MUST stay in the document's own data; other pages showing the same
  pool as dots or numbers MUST show the same values.
- **FR-013**: The tracker look MUST take the tracker's mark settings (names, symbols, colors) for
  the two marks and the legend brush; its layers are fixed (fill = current, outline = maximum).
- **FR-014**: The shipped Star Wars full sheet (characters with the Force section) MUST show Force
  Points as one tracker in place of the "Max Force Points" and "Force Points" rows, keeping the
  maximum's Self-Control minimum; the brief sheet MUST keep its compact numbers. No stored data
  changes.

**Quality and documentation**

- **FR-015**: The element storybook MUST show a point tracker (fill from the start, count) and a
  built-in pool as a tracker, guarded by the storybook test.
- **FR-016**: The template editor guide (English and Russian), the sheet-templates skill, and the
  module notes MUST describe the new settings; spec 019 needs no banner (nothing it built changes).

### Key Entities _(include if feature involves data)_

- **Tracker settings**: gain "marks fill from the start" (yes/no) and the total's reading
  (deepest level / count).
- **Pool resource on a page**: gains a tracker look; its values (current, maximum) are unchanged
  and stay in the document.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Setting a ten-point pool from 0 to 7 takes one click instead of seven.
- **SC-002**: A Star Wars Force Points pool reads as one row ("2 / 5") instead of two rows of dots.
- **SC-003**: Every tracker and pool saved before this feature looks and behaves the same until
  the author changes a setting (0 differences in existing tests).
- **SC-004**: The same Force Points values show identically on a dots page and a tracker page of
  one character.

## Assumptions

- "Fill from the start" follows the shown order of levels at the current length.
- The count ignores level values; levels may stay unnamed (numbered) for pools.
- Rating resources (single numbers such as Dark Side Resistance) keep their dots; only pools get
  the tracker look.
- A plain tracker built by "Start from… → Points" is the reference look for the built-in pool.
