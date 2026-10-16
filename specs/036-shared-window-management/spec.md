# Feature Specification: Shared Window Management

**Branch**: `036-shared-window-management` | **Created**: 2026-10-15 | **Status**: Draft

**Input**: "T-113 Shared window management for editing: GMs and players move, resize, stack, and
dock the windows they edit documents in through one shared behavior, instead of each window handling
it alone. The library and the dice panel use the same window; side panels (left/right) are the
default look; the dice panel also works outside the sheet page; collapsing a pane by dragging its
divider below a threshold; dragging a document from the documents window onto the sheet's panes,
which spec 035 (T-117) waits for." Amended by the maintainer: "Dragging must work not only with
these three windows but with the tabs of the paused spec 035, so groups can be made and changed and
tabs dragged between them. The three windows follow the same principles as tabs: they become tabs of
a group when the reader puts them there. Docking left or right is done through such groups; the
reader decides what lies where, for example four windows: the first takes the left of the screen,
the second the right, the third and fourth share the middle, split by a horizontal line."

## Context

Since spec 034 the sheet page shows up to six documents side by side under one tab strip. Spec 035
(T-117) planned a code-editor layout for them (groups with their own tabs, dragging, splits in any
direction) and was paused because building it needed documents dragged from the documents window.
Meanwhile the three tools live in three kinds of container: the documents window floats (spec 032),
the library is a modal dialog, the dice panel slides in from the right. This spec makes **one
layout** for all of them: documents and tools are tabs of groups, groups split in any direction, and
any tab may also float above the page as a window. It absorbs spec 035, whose clarified answers
(scrolling, what **Open** does, limits) carry over. Backlog: T-113 and T-117 in `TODO.md`.

## Clarifications

### Session 2026-10-15

- Q: May a document float as a window, or only tools? → A: Any tab, a document or a tool, may float;
  the number of floating windows open at once is limited to avoid overload.
- Q: How many floating windows may be open at once, and what happens at the limit? → A: At most 4; a
  5th is refused: **Float** is disabled, a tab dragged out returns to its place, and a notice says
  four windows are open.
- Q: Where does the sheet toolbar go when tool groups stand at the edges? → A: Above the whole
  layout, as today; every group, at the edges too, starts below it.
- Q: With a floating document focused, what does **Open** replace? → A: The floating document
  becomes current (dice and rolls follow it), but **Open** always replaces the shown document of the
  last focused group and never touches a floating window.

## User Scenarios & Testing

### User Story 1 - Groups with their own tabs (Priority: P1)

The sheet area is divided into **groups**; each has a tab strip of its own documents, one shown.
**Open beside** creates a group next to the focused one; **Open in new tab** adds the document to
the focused group; **Open** replaces the focused group's shown document, as today.

**Why this priority**: tabs per group are the base every other story uses.

**Independent Test**: open three documents into two groups (two tabs and one), switch tabs in the
first group, check the second is unchanged.

**Acceptance Scenarios**:

1. **Given** one group with one document, **When** the reader chooses **Open in new tab** on
   another, **Then** the group shows a strip with both tabs and the new one is shown.
2. **Given** two groups, **When** the reader chooses a tab in the left group, **Then** only that
   group changes, and its document becomes the current one.
3. **Given** a group with two tabs, **When** the shown tab is closed, **Then** the neighbour tab is
   shown; closing a group's last tab removes the group and its neighbours take the room.
4. **Given** one group with one document and no tool in the layout, **When** the page is drawn,
   **Then** it looks exactly as the single-document page did before spec 034.

---

### User Story 2 - Drag tabs and split groups in any direction (Priority: P2)

The reader drags a tab along its strip to reorder it, onto another group's strip or middle to move
it there, or onto a group's left, right, top, or bottom edge to split that group and put the tab in
a new group on that side. Dividers between groups, vertical and horizontal, are dragged to resize.

**Why this priority**: arranging by hand, including rows below columns, is the point of the layout.

**Independent Test**: with two groups, reorder tabs in one, move a tab to the other, then drop a tab
on a group's bottom edge and drag the new horizontal divider.

**Acceptance Scenarios**:

1. **Given** a strip with tabs A, B, C, **When** C is dragged before A, **Then** the order is C, A,
   B.
2. **Given** two groups, **When** a tab is dropped on the other group's strip or middle, **Then** it
   moves there, is shown and focused, and leaves its old group.
3. **Given** a group, **When** a tab is dropped on its bottom edge, **Then** a new group below holds
   it and the old group keeps its other tabs.
4. **Given** a drag in progress, **When** the pointer is over a target, **Then** the landing place
   is highlighted; **When** Escape is pressed, **Then** nothing changes.
5. **Given** a keyboard user, **When** they use a tab's menu (**Move left**, **Move right**, **Move
   to next group**, **Split right**, **Split down**), **Then** the same moves happen.

---

### User Story 3 - Tools are tabs or floating windows (Priority: P3)

The documents window, the library, and the dice panel are **tools**. A tool is either a tab of a
group, like a document, or a floating window above the page. Docking is putting a tool into a group:
by dropping its title bar on a strip, a middle, or an edge. A tool tab dragged out of the layout, or
**Float** in its tab menu, makes it a floating window again; a document tab floats the same way. The
reader can build, for example, the documents window on the left, the dice panel on the right, and
two documents in the middle one above the other.

**Why this priority**: it gives the tools one behavior and lets the reader keep the sheet, the dice,
and the documents visible together.

**Independent Test**: build the four-part layout above from a first visit, reload, float the dice
panel, click the window behind it.

**Acceptance Scenarios**:

1. **Given** a floating tool, **When** its title bar is dropped on a group's left edge, **Then** it
   becomes a tab of a new group on that side and the other groups narrow.
2. **Given** a tool tab, **When** it is dragged out of the layout or **Float** is chosen, **Then**
   it becomes a floating window at its last floating place and size.
3. **Given** two overlapping floating tools, **When** the reader presses or focuses the one behind,
   **Then** it comes to the front.
4. **Given** the library is opened, **When** it shows, **Then** it does not block the page: the
   reader can still type in a sheet.
5. **Given** a first visit, **When** a tool opens for the first time, **Then** the documents window
   and the library open as a group on the left edge and the dice panel as a group on the right edge;
   later each opens where it was last.

---

### User Story 4 - Drag documents from the documents window (Priority: P4)

The reader drags a document row from the documents window onto the layout: onto a strip it becomes a
tab there, onto a group's middle it is shown in that group, onto an edge it opens in a new group on
that side.

**Why this priority**: opening and placing a document becomes one gesture; grids need no buttons.

**Independent Test**: with one document open, drag three documents onto edges to make a 2 × 2 grid.

**Acceptance Scenarios**:

1. **Given** one group, **When** a document is dropped on its right edge, **Then** the two show side
   by side and the dropped one is current.
2. **Given** a document already in a tab, **When** it is dropped elsewhere, **Then** that tab moves
   there (a document is in at most one tab).
3. **Given** a folder or several selected rows, **When** they are dragged over the layout, **Then**
   no target is offered.

---

### User Story 5 - Collapse by dragging a divider (Priority: P5)

Dragging a divider well past a group's minimum collapses that group to a thin strip with its shown
tab's name; a click or Enter on the strip opens it again at its former size.

**Why this priority**: the quick way to make room without closing anything.

**Independent Test**: drag the divider of the documents group to the screen edge, reopen it.

**Acceptance Scenarios**:

1. **Given** two groups side by side, **When** the divider is dragged more than 80 px past one
   group's minimum, **Then** that group collapses to a strip and the other takes the room.
2. **Given** a strip, **When** the reader clicks it or presses Enter on it, **Then** the group opens
   at its former size.

---

### User Story 6 - Phones, narrow windows, and other pages (Priority: P6)

On a phone, or when the layout does not fit, one document shows at a time with one strip of every
open document, and a tool fills the screen above it when opened, as today. Outside the sheet page
the dice panel works as today.

**Why this priority**: the layout cannot work on a phone; the dice panel must not depend on the
sheet.

**Independent Test**: build a layout at 1280 px, narrow to 375 px, switch documents, open the dice
panel, widen again; open the dice panel on a documentation page.

**Acceptance Scenarios**:

1. **Given** a layout, **When** the window is 375 px wide, **Then** one document shows full width
   without a frame and one strip lists every open document; tools open full screen, one at a time.
2. **Given** the narrow view, **When** the window is widened, **Then** groups, tabs, tools, and
   sizes are back as they were.

---

### User Story 7 - The layout is remembered; spec 034 panes carry over (Priority: P7)

Groups, tabs, shown tabs, sizes, collapsed groups, views, and each tool's place (a group or
floating, with its floating place and size) come back after a reload. A stored spec 034 arrangement
becomes one row of one-tab groups.

**Why this priority**: sessions run for hours; readers of spec 034 must not lose their panes.

**Independent Test**: build the four-part layout, reload; load a stored spec 034 arrangement of
three panes.

**Acceptance Scenarios**:

1. **Given** any layout, **When** the page reloads, **Then** it comes back as it was.
2. **Given** a stored spec 034 arrangement, **When** the page loads, **Then** each former pane is a
   group with one tab, in order, with the same widths and views.
3. **Given** a stored layout naming a deleted document, **When** the page loads, **Then** its tab is
   gone, an emptied group removed, and nothing reports an error.

### Edge Cases

- A tool is in at most one place; opening it focuses its tab or brings its window to the front.
- The current document is the one the reader used last: the shown document of the focused group, or
  a focused floating document; focusing a tool keeps the last current document. **Open** always
  replaces the shown document of the last focused group, never a floating window.
- Opening a tool when six groups exist puts it as a tab into the edge group of its side; opening a
  tool is never refused.
- Closing a tool tab closes the tool; opening it again brings it back to the group side it had (a
  new group on that edge if its group is gone).
- Maximize (spec 034) applies to a group: double click on a tab or its button.
- A split that would leave a group below 320 × 200 px, or make a 7th group, is not offered; **Open
  beside** that cannot split opens a new tab with a notice saying why.
- A 5th floating window is refused: **Float** is disabled, a tab dragged out of the layout returns
  to its place, and a notice says four windows are open.
- Floating documents count toward the 12 documents; in the narrow view they join the one strip and
  float again when there is room.
- A 13th document closes the least recently focused document tab that is shown neither in a group
  nor in a floating window, with a notice (at most 10 are visible, so one always exists).
- Modal dialogs (confirmations, import, the library's own dialogs) open above everything and block.

## Requirements

### Functional Requirements

- **FR-001**: The sheet area MUST be divided into groups in nested rows and columns; every group
  holds one or more tabs, one shown; a tab is a document or a tool.
- **FR-002**: A group MUST show its strip when it has two or more tabs or when two or more groups
  exist; one group with one document MUST look as before spec 034.
- **FR-003**: **Open** MUST replace the shown document of the last focused group (never a floating
  window's); **Open in new tab** adds a tab to that group; **Open beside** adds a group right of it;
  no other action adds a tab except dragging.
- **FR-004**: Tabs MUST be reorderable, movable between groups, and able to split a group on any of
  its four edges by dragging, with a visible landing place and Escape to cancel.
- **FR-005**: Every move, split, float, maximize, and close MUST also be in a tab's keyboard menu.
- **FR-006**: Dividers, vertical and horizontal, MUST resize groups by pointer and keyboard, keeping
  each group at least 320 × 200 px.
- **FR-007**: The sheet toolbar MUST span the whole layout above every group, edge groups included.
  With two or more groups the layout MUST fill the window below the toolbar and each group scroll on
  its own; one group keeps the page scroll.
- **FR-008**: Every tab, a document or one of the tools (the documents window, the library, the dice
  panel), MUST be in a group or a floating window, never both, and MUST move between the two by
  dragging and by menu.
- **FR-009**: Floating windows MUST move by their title bar, resize by edges and corners (and both
  by keyboard), offer **Dock** in the title bar (back to the tab's last side), stay on screen, stack
  with the last pressed in front, and not block the page.
- **FR-010**: Document rows of the documents window MUST be draggable onto strips, middles, and
  edges of groups with the same results as dragging a tab.
- **FR-011**: Dragging a divider more than 80 px past a group's minimum, or Enter on the divider,
  MUST collapse it to a named strip that reopens it at its former size by pointer and keyboard.
- **FR-012**: At most 12 documents, 6 groups, and 4 floating windows MUST exist; limits behave as in
  the edge cases.
- **FR-013**: Below 768 px, or when the groups cannot keep their minimum sizes, one document MUST
  show at a time with one strip of all open documents, tools opening full screen; the layout returns
  unchanged when there is room.
- **FR-014**: Outside the sheet page the dice panel MUST behave as today.
- **FR-015**: The layout and every tool's place MUST be kept per device and restored; a spec 034
  arrangement MUST become one row of one-tab groups.
- **FR-016**: Strips, tabs, drop targets, dividers, strips of collapsed groups, and floating windows
  MUST be operable by keyboard and named for assistive technology; moves MUST be announced.
- **FR-017**: All text added MUST exist in English and Russian, and the user guide MUST describe
  groups, tools, dragging, splitting, floating, and collapsing in both languages.

### Key Entities

- **Group**: a rectangle of the layout with its tabs, the shown one, and a collapsed state.
- **Tab**: a document (with its own view) or a tool, in exactly one group or one floating window.
- **Tool**: the documents window, the library, or the dice panel.
- **Floating window**: one tab above the page, with its place, size, and place in the stack; a tab
  remembers its last floating place and size and its last side.
- **Layout**: the nesting of rows and columns of groups with their sizes and the maximized group,
  kept per device; the focused group is the one the reader used last.

## Success Criteria

- **SC-001**: From a first visit, a reader builds the four-part layout (documents window left, dice
  right, two documents one above the other in the middle) in at most 8 actions on a 1920 × 1080
  window.
- **SC-002**: A 3 × 2 grid of documents takes at most 12 actions, counting opening the documents
  window and floating it (docked, it would take one of the six groups), every group at least 320 ×
  200 px and all visible without scrolling the page.
- **SC-003**: After a reload the layout and tool places come back in 100% of attempts, including
  with one stored document deleted; a spec 034 arrangement keeps order, widths (within 1%), and
  views.
- **SC-004**: With one document and no tool open, the page at 375 and 1280 px differs by less than
  1% from before this change.
- **SC-005**: Every move, split, float, dock, resize, and collapse can be done with the keyboard,
  one test per action (a document row's keyboard path is **Open in new tab** and **Open beside**).
- **SC-006**: Showing or moving a tab takes at most 200 ms, and no frame of a window or divider drag
  takes more than 50 ms, with 3,000 documents in the collection.

## Assumptions

- The layout exists only on the sheet page.
- A floating window holds one tab; several tabs inside one floating window are out of scope.
- Later, documentation links will open their fragment as a tab or window in a group at the right
  edge instead of leaving the page; that is a separate task, but tabs are not limited to documents
  and the three tools.
- On a phone tools keep today's full-screen look; the strip lists documents only.
- Read-only documents wait for the online part (spec 034).
- Dragging from other places (library items onto a sheet, rolls into a chat) is out of scope.
- Spec 035 is superseded by this spec; its design is input to this one's design.
