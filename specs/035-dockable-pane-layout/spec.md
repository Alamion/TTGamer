# Feature Specification: Dockable Layout of Document Panes

**Branch**: `035-dockable-pane-layout` | **Created**: 2026-10-15 | **Status**: Superseded by spec
036

**Input**: "T-117 Dockable layout of document panes: GMs and players arrange open documents like the
tabs and groups of a code editor: every pane group has its own tabs, tabs move between groups by
dragging and can be reordered, and groups split in any direction (for example three briefs over
three more). Builds on the panes of spec 034 (T-112), which has one global tab strip over
side-by-side panes that only grow to the right, no several tabs per pane, and no rows below. Phone
keeps one document at a time with tabs. T-113 (shared window management, Library and dice panel as
windows) is related and may follow."

> **Superseded 2026-10-15 by [spec 036](../036-shared-window-management/spec.md).** The maintainer
> merged this layout with T-113: documents and tools (documents window, library, dice panel) are
> tabs of the same groups. Nothing here was built; the design below is input to spec 036's design.
>
> **Paused 2026-10-15.** The plan is analyzed and committed, nothing is built. The layout needs
> documents dragged from the documents window onto a group's edge (SC-001: a 3 × 2 grid in at most
> 12 actions is out of reach with menus alone, and the maintainer wants no extra buttons). That drag
> belongs to T-113, so this spec resumes after T-113: re-check design.md against T-113's window and
> drag code, then run `/ttg-speckit-analyze` again before implementing.

## Context

Since spec 034 the sheet page shows up to six documents side by side, each in a pane, with one tab
strip for all of them above the panes. Trying it, the maintainer found the model too rigid: panes
only line up left to right, a pane holds exactly one document, a GM cannot build a grid such as
three briefs over three more, and the global strip does not say which pane a tab belongs to. The
wanted model is a code editor's: the area is split into **groups**, each group has its own tabs (one
of them shown), tabs are dragged within and between groups, and dropping a tab on a group's edge
splits it in that direction. A phone keeps the spec 034 behavior: one document at a time and a strip
of tabs. Backlog entry: T-117 in `TODO.md` (T-113 follows).

## Clarifications

### Session 2026-10-15

- Q: How does the layout scroll with two or more groups? → A: Like a code editor: the layout fills
  the window from the toolbar to the bottom and each group scrolls its own document; one group keeps
  the whole-page scroll of today.
- Q: What does **Open** do with several groups or tabs? → A: As today: it replaces the shown
  document of the focused group; tabs are added only by **Open in new tab**, **Open beside**, or
  dragging.
- Q: What limits does the layout have? → A: At most 12 open documents and 6 groups, every group at
  least 320 × 200 px.
- Q: What happens at a limit? → A: A 13th document closes the least recently focused tab that is not
  shown in any group, with a notice; a 7th group is not offered (no split target, menu entry
  disabled) and a notice says six groups are open.

## User Scenarios & Testing

### User Story 1 - Each group has its own tabs (Priority: P1)

A GM keeps the party's briefs in one group and an NPC's sheet in another. Each group shows a tab
strip of its own documents, one of them visible; choosing a tab shows that document in its group
only. **Open beside** creates a new group next to the focused one; a new **Open in new tab** action
adds the document as a tab of the focused group.

**Why this priority**: tabs per group are the base every other story uses (moving tabs, splitting).

**Independent Test**: open three documents into two groups (two tabs in one, one in the other),
switch tabs in the first group, and check the second group is unchanged.

**Acceptance Scenarios**:

1. **Given** one group with one document, **When** the reader chooses **Open in new tab** on another
   document, **Then** the group shows a strip with both tabs and the new one is shown.
2. **Given** two groups, **When** the reader chooses a tab in the left group, **Then** only the left
   group's shown document changes, and its document becomes the current one.
3. **Given** a group with two tabs, **When** the reader closes the shown tab, **Then** the neighbour
   tab is shown; closing the last tab of a group removes the group and its neighbours take the room.
4. **Given** one group with one document, **When** the page is drawn, **Then** it looks exactly as
   the single-document page did before spec 034 (no strip, no frame).

---

### User Story 2 - Move tabs by dragging (Priority: P2)

The reader drags a tab along its strip to reorder it, onto another group's strip to move the
document there, or onto the middle of another group to move it in as that group's shown tab.

**Why this priority**: arranging documents by hand is the point of a dockable layout.

**Independent Test**: with two groups, reorder tabs in one, then move a tab to the other group, and
check order and membership.

**Acceptance Scenarios**:

1. **Given** a strip with tabs A, B, C, **When** C is dragged before A, **Then** the order is C, A,
   B.
2. **Given** two groups, **When** a tab is dropped on the other group's strip or body, **Then** the
   document moves there, is shown and focused, and leaves its old group.
3. **Given** a drag in progress, **When** the pointer is over a target, **Then** the place the tab
   would land is highlighted; **When** Escape is pressed, **Then** nothing changes.
4. **Given** a keyboard user, **When** they use the tab's menu (**Move left**, **Move right**,
   **Move to next group**), **Then** the same moves happen without a pointer.

---

### User Story 3 - Split groups in any direction (Priority: P3)

Dropping a tab on the left, right, top, or bottom edge of a group splits that group and puts the
document in a new group on that side. The same splits are offered in the tab's menu (**Split
right**, **Split down**). Dividers between groups, vertical and horizontal, are dragged to resize.

**Why this priority**: rows below columns is what the current layout cannot do (a 3 × 2 grid of
briefs).

**Independent Test**: build three groups in a row, then split each downwards, and check six groups
in two rows with their sizes after dragging a horizontal divider.

**Acceptance Scenarios**:

1. **Given** a group, **When** a tab is dropped on its bottom edge, **Then** a new group appears
   below it holding that document, and the old group keeps its other tabs.
2. **Given** a group, **When** the reader chooses **Split down** on a tab, **Then** the same happens
   without dragging.
3. **Given** two groups one above the other, **When** the divider between them is dragged or moved
   with the arrow keys, **Then** both resize and neither goes below its minimum size.
4. **Given** several groups, **When** the layout is drawn, **Then** every group is visible at once
   inside the area below the toolbar and scrolls its own content.

---

### User Story 4 - Phone and narrow windows stay simple (Priority: P4)

On a phone, or in a window too narrow for the layout, one document shows at a time with one strip of
all open documents, as in spec 034; the layout itself is kept and returns when the window is wide
enough again.

**Why this priority**: the grid cannot work on a phone, and the maintainer is content with the phone
behavior of spec 034.

**Independent Test**: build two groups at 1280 px, narrow the window to 375 px, switch documents,
widen again.

**Acceptance Scenarios**:

1. **Given** a layout of several groups, **When** the window is 375 px wide, **Then** one document
   shows full width without a frame and one strip lists every open document.
2. **Given** the narrow view, **When** the window is widened, **Then** the groups, their tabs, and
   their sizes are back as they were.

---

### User Story 5 - The layout is remembered and existing panes carry over (Priority: P5)

Groups, their tabs and order, the shown tab of each group, sizes, and views come back after a
reload. A device that has a spec 034 arrangement gets one row of groups, one per former pane.

**Why this priority**: a session runs for hours; and readers of spec 034 must not lose their panes.

**Independent Test**: build a two-row layout, reload; then load a stored spec 034 arrangement of
three panes and check three groups side by side.

**Acceptance Scenarios**:

1. **Given** a two-row layout, **When** the page reloads, **Then** the same groups, tabs, shown
   tabs, sizes, and views appear.
2. **Given** a stored spec 034 arrangement, **When** the page loads, **Then** each former pane is a
   group with one tab, in the same order, with the same widths and views.
3. **Given** a stored layout naming a deleted document, **When** the page loads, **Then** that tab
   is gone, an emptied group is removed, and nothing reports an error.

### Edge Cases

- Maximize (spec 034) applies to a group: double click on a group's tab, or its maximize button,
  gives the group the whole area; again restores the layout.
- Dropping a tab on its own group's edge when the group has only that tab does nothing.
- A document is in at most one group; opening it anywhere focuses the tab that shows it.
- A split that would leave a group below its minimum size is refused, and the drop target is not
  offered there.
- More documents or groups than the limits: see FR-013 (a hidden tab gives way; a 7th group is never
  made).

## Requirements

### Functional Requirements

- **FR-001**: The layout area MUST be divided into groups arranged in rows and columns that can
  nest; every group MUST hold one or more document tabs, one of them shown.
- **FR-002**: Each group with two or more tabs, or any group while two or more groups exist, MUST
  show its own tab strip; a single group with one tab MUST look as the page did before spec 034.
- **FR-003**: The documents window MUST offer **Open** (shows the document in the focused group's
  shown tab, as today), **Open in new tab** (adds it to the focused group), and **Open beside** (a
  new group to the right of the focused one); no other action MUST add a tab, so a reader who only
  uses **Open** keeps one document on the page.
- **FR-004**: Tabs MUST be reorderable within a strip and movable between groups by dragging, with a
  visible drop indication and Escape to cancel.
- **FR-005**: Dropping a tab on a group's edge MUST split that group in the edge's direction and put
  the document in the new group; dropping on its middle MUST move it into that group.
- **FR-006**: Every move and split MUST also be possible from a tab's menu with the keyboard (move
  left or right, move to the next group, split right, split down, maximize, close).
- **FR-007**: Dividers between groups, vertical and horizontal, MUST resize the groups by pointer
  and by keyboard and MUST keep every group at least 320 px wide and 200 px tall.
- **FR-008**: With two or more groups the layout MUST fill the area below the toolbar to the bottom
  of the window, and each group MUST scroll its own document; with one group the page MUST scroll as
  a whole, as today.
- **FR-009**: The focused group's shown document MUST be the current document (documents window,
  dice panel, rolls), as in spec 034.
- **FR-010**: Closing the last tab of a group MUST remove the group and give its room to its
  neighbours; closing a tab MUST never delete the document.
- **FR-011**: Below 768 px, or whenever the layout cannot keep every group at its minimum size, one
  document MUST show at a time with one strip of all open documents, and the layout MUST return
  unchanged when there is room again.
- **FR-012**: Groups, tabs, their order, shown tabs, sizes, maximize state, and views MUST be kept
  on the device and restored; a spec 034 arrangement MUST become one row of one-tab groups.
- **FR-013**: At most 12 documents MUST be open and at most 6 groups exist at once. Opening a 13th
  document MUST close the least recently focused tab that no group shows, with a notice (with at
  most six shown, such a tab always exists). A 7th group MUST NOT be offered: no edge drop target,
  split entries disabled, and a notice on the attempt; **Open beside** that cannot make a group
  opens the document as a new tab of the focused group and says why.
- **FR-014**: Tab strips, tabs, drop targets, and dividers MUST be operable by keyboard and named
  for assistive technology; a move or split MUST be announced.
- **FR-015**: All text added by this change MUST exist in English and Russian, and the user guide of
  the documents window MUST describe groups, moving, and splitting in both languages.

### Key Entities

- **Group**: a rectangle of the layout with its own tabs, one shown; it has a size inside its row or
  column.
- **Tab**: one open document in one group, with its own view.
- **Layout**: the nesting of rows and columns of groups, their sizes, and the maximized group, kept
  per device; the focused group is the one whose shown tab is the current document.

## Success Criteria

- **SC-001**: On a 1920 × 1080 window a reader builds a grid of three groups over three groups in at
  most 12 actions, using the drag from the documents window that T-113 adds, every group at least
  320 × 200 px and all six visible without scrolling the page.
- **SC-002**: Moving a tab to another group or splitting takes one drag or two menu choices.
- **SC-003**: After a reload, groups, tabs, shown tabs, sizes, and views come back in 100% of
  attempts, including with one stored document deleted.
- **SC-004**: A stored spec 034 arrangement of three panes loads as three side-by-side groups with
  the same documents, order, widths (within 1%), and views.
- **SC-005**: With one document open the page height and layout at 375 and 1280 px differ by less
  than 1% from before this change.
- **SC-006**: Every move, split, and resize can be done with the keyboard alone, checked by one test
  per action.
- **SC-007**: Showing a tab or moving it between groups takes no more than 200 ms with 3,000
  documents in the collection; existing browser timings stay within their budgets.

## Assumptions

- The phone behavior of spec 034 is kept as is (one document, one strip, no frame).
- Dragging a document from the documents window into the layout, floating windows, docking the
  Library or the dice panel, and tabs of other kinds than documents belong to T-113.
- Read-only panes remain deferred to the online part (spec 034).
- Only the shown tab of each group is drawn; a tab shown again starts at its top (its scroll is not
  kept).
- This spec depends on T-113 for dragging documents from the documents window into the layout; it
  adds no buttons of its own for building a grid.
