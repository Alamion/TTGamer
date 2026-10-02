# Feature Specification: Template editor usability from player feedback

**Feature Branch**: `022-template-editor-ux` (branched from `testing`)

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Player feedback on the template editor: the settings panel is hard to
read (an author mixed up a rating's tag field and its formula field), moving elements with the
mouse is hard (finding a drop position; the element should show in place while held over a
position), and the dividers between the editor's areas should be draggable with the widths
remembered." Added after the prototype review: "a save can fail with a raw error that names no
element; table columns and table rows cannot be reordered; section and group, and table and list,
do the same job and can each be one element with a kind."

## Scope

| Backlog | Entry                                                | Role in this feature |
| ------- | ---------------------------------------------------- | -------------------- |
| F-007   | Template editor settings panel is hard to read       | User Story 1         |
| T-091   | Drag and drop with live placement                    | User Story 2         |
| T-092   | Resizable template editor panes                      | User Story 3         |
| F-008   | A failed save shows a raw error and no element       | User Story 4         |
| T-094   | Reorder table columns and rows, list entries         | User Story 5         |
| T-095   | Fewer element kinds: Group and List with a kind      | User Story 6         |
| T-089   | Copy and paste elements (with T-090 multi-selection) | Not in scope         |
| T-093   | Element context menu and shortcut list               | Not in scope         |

The template editor has three areas on a desktop screen: the outline of the page on the left, the
live page in the middle, and the settings of the selected element on the right. Phones show one
area at a time behind tabs.

Players report:

- **Settings are hard to tell apart.** Most settings are text boxes named only by the grey hint
  inside them; once a value is typed, the hint disappears and nothing says what the box is. A
  rating's value key (a short word such as `strength`) and its maximum formula (`willpower + 2`)
  then look the same, and an author typed one into the other.
- **Moving elements with the mouse is hard.** An element can only be dropped on thin insertion
  slots between elements, which are hard to hit, and the page shows nothing of the result until
  the button is released.
- **The areas have fixed widths.** The outline and settings take fixed space whatever the screen
  and the template, so long names and wide pages do not fit.
- **A save can fail with a raw error.** Some mistakes (for example an empty label of a list's entry
  field) are not in the editor's issue list; the save then fails with a technical message
  (`"code": "too_small" … "path": ["children", 0, …, "item", "label"]`), no element is marked, and
  the author cannot tell what to fix.
- **Order inside tables cannot be changed.** Authors cannot reorder a table's columns, and players
  cannot reorder the rows they filled in on the sheet.
- **Too many element kinds.** Section and group both gather elements under a title; table and list
  both hold entries the player adds. Six choices in the add menu blur what each is for.

Maintainer decisions (2026-10-02):

- One feature for all six items; copy/paste and multi-selection (T-089, T-090) get their own
  feature, since they need a selection model.
- Prototype review: the element's actions go above its name, so the name stays readable in a
  narrow settings area; "Book name hint" and "Required" move to Visibility and help; the other
  groups stay as prototyped.
- Section and group become one **Group** element with a kind; table and list become one **List**
  element with a kind. Stored templates keep their current shape: only the editor presents them
  together.
- The work happens on its own branch so unrelated work can continue from `testing`.

Out of scope:

- Copy and paste, multi-selection, the element context menu, a shortcut list (T-089, T-090,
  T-093).
- Moving elements by touch dragging on phones; phones keep the current move buttons and keyboard
  arrangement.
- Changing what any setting does or how templates are stored: this feature changes how settings
  and elements are presented and found, not their meaning or stored values.
- Moving existing document values when an author switches a list between its kinds.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Readable settings panel (Priority: P1)

A template author selects a rating on the page. The settings panel shows the element's actions
(move, duplicate, remove) in a row, and under them the element's kind and full name. Then come its
settings in named groups — **Content**, **Value**, **Limits and formulas**, **Look**, **Visibility
and help**. Every setting has a visible name that stays when the setting has a value. Formula
settings look different from plain text: they carry a formula mark, use a fixed-width font, and say
right under the box when the formula is invalid or reads a value that does not exist. Settings
authors rarely change sit in collapsed groups that open with one click and stay as the author left
them.

**Why this priority**: the reported mistake (key typed into a formula field) produces broken pages
and is invisible until the sheet misbehaves.

**Independent Test**: open the editor on the full Star Wars sheet, select a rating with a value key
and a maximum formula filled in; without reading hints or help, name which box holds the key and
which the formula.

**Acceptance Scenarios**:

1. **Given** any element selected, **When** a setting has a value, **Then** its name is still shown
   above it.
2. **Given** a rating, **Then** its value key and its maximum formula are in different groups,
   named, and the formula box looks like a formula (mark and fixed-width text).
3. **Given** a formula that does not parse or reads a missing value, **Then** the message appears
   under that formula box (as well as in the editor's issue list).
4. **Given** every element kind, **Then** its settings follow the same group order and names.
5. **Given** a collapsed group with a setting that has an issue, **Then** the group shows that it
   contains an issue, and opening it shows the setting.
6. **Given** the author collapses or opens a group, **When** they select another element of any
   kind, **Then** the same group keeps the state they chose (for the rest of the session).
7. **Given** a setting with an explanation in the template editor guide, **Then** its "?" help link
   stays next to its name.
8. **Given** the settings area at its minimum width, **Then** the element's kind and full name are
   readable (wrapping if needed); the action buttons never cover them.
9. **Given** a field, **Then** "Required", "Book name hint", the display condition, and the
   documentation link are in Visibility and help.

---

### User Story 2 - Drag with live placement (Priority: P1)

The author drags an element on the page. As the pointer moves, the editor finds the nearest
position where the element may go — the author does not have to hit a thin slot — and marks it.
When the pointer rests over a position for a moment, the page shows the element placed there:
the elements around it move aside, as they will after the drop. Releasing the button keeps
exactly that placement; pressing Escape or dropping outside the page puts the element back where
it was. The outline on the left marks the same position while the page shows it.

**Why this priority**: arranging elements is the editor's main activity; today authors fall back to
move buttons because the mouse misses.

**Independent Test**: on the full Star Wars sheet, drag a field from one group to a group in
another column and release where the preview showed it; the field is in that group at that
position, and one undo puts it back.

**Acceptance Scenarios**:

1. **Given** a drag in progress, **When** the pointer is anywhere over a container that accepts the
   element, **Then** the nearest allowed position in it is marked, without the pointer having to
   touch a slot.
2. **Given** the pointer rests over a position for a short moment (about a third of a second),
   **Then** the page shows the element at that position, with the surrounding elements moved, and
   its old place marked by a thin dashed line.
3. **Given** the preview is shown, **When** the author releases, **Then** the element ends exactly
   where the preview showed it, as one undo step.
4. **Given** a drag, **When** the author presses Escape or releases outside any allowed position,
   **Then** nothing changes.
5. **Given** positions where the element may not go (for example an element into itself), **Then**
   they are never marked or previewed.
6. **Given** the pointer near the top or bottom edge of the page area during a drag, **Then** the
   page scrolls so far positions can be reached.
7. **Given** a drag over the outline instead of the page, **Then** the same nearest-position rule
   applies, and the page shows the preview too.
8. **Given** the keyboard and move-button arrangement of today, **Then** it works unchanged.

---

### User Story 3 - Resizable editor areas (Priority: P2)

On a desktop screen, the author drags the divider between the outline and the page, or between the
page and the settings, to make an area wider or narrower. Each area stays between a minimum and a
maximum width, and the page always keeps room. The widths are remembered in this browser: after
closing the editor, reloading, or opening another template, the areas have the widths the author
left. A double click on a divider restores its default. The dividers can also be moved from the
keyboard.

**Why this priority**: it removes daily friction with long names and wide pages, but nothing is
blocked without it.

**Independent Test**: widen the settings area, close and reopen the editor on another template:
the settings area keeps the new width; double-click the divider: the default width returns.

**Acceptance Scenarios**:

1. **Given** a desktop-width editor, **When** the author drags a divider, **Then** the two areas
   beside it change width as the pointer moves, smoothly on the full Star Wars sheet.
2. **Given** a drag beyond a limit, **Then** the area stops at its minimum or maximum, and the page
   area never becomes narrower than its minimum.
3. **Given** new widths, **When** the editor is closed and opened again, after a reload or on
   another template, **Then** the widths are the same.
4. **Given** a double click on a divider, **Then** that divider returns to its default position.
5. **Given** keyboard focus on a divider, **When** the author presses the arrow keys, **Then** the
   divider moves in small steps; a screen reader announces it as a resizable separator with its
   current position.
6. **Given** a phone-width screen, **Then** the editor keeps today's tabbed areas and shows no
   dividers.
7. **Given** remembered widths that no longer fit (a smaller window), **Then** the areas shrink to
   fit, keeping the page at its minimum.

---

### User Story 4 - Every save problem points at its element (Priority: P1)

An author leaves a list's entry field without a label and presses Save. Instead of a technical
message, the issue list says in plain words what is wrong and where — "The entry field of list
'Skills' has no label" — the element is marked on the page and in the outline, and clicking the
issue selects the element, scrolls it into view, opens the settings group that holds the setting,
and focuses that setting. The same holds for every problem that can stop a save, including ones
the editor did not foresee.

**Why this priority**: a save that fails with no way to find the cause blocks the author completely
and loses their work if they give up.

**Independent Test**: make a list's entry field label empty, press Save: the issue names the list
and the label in plain words; clicking it focuses the empty label box.

**Acceptance Scenarios**:

1. **Given** an empty label on a list's entry field, **Then** it appears in the issue list before
   Save is pressed, names the list, and marks the list on the page and in the outline.
2. **Given** any problem that stops a save, **Then** the message is in the reader's language and in
   plain words; field codes, paths, and raw error text are never shown to the author.
3. **Given** an issue in the list, **When** the author clicks it, **Then** the element is selected
   and scrolled into view, the settings group that holds the setting opens, and the setting gets
   focus.
4. **Given** a problem the editor has no specific message for, **Then** the issue still names the
   element it belongs to (the closest element that has a name) and the setting, with a general
   message such as "This value is not allowed here", and still leads to it.
5. **Given** issues are fixed, **Then** they disappear from the list and Save works.

---

### User Story 5 - Reorder table columns, rows, and list entries (Priority: P2)

In the editor, the author changes the order of a table's columns: by dragging a column in the
table's settings or with move buttons, and the page shows the new order. On the sheet, a player
reorders the rows of a table and the entries of a list they filled in, with a drag handle or with
move-up and move-down buttons, also from the keyboard.

**Why this priority**: column order is part of designing a table; row order matters to players (for
example equipment by importance), but nothing is lost without it.

**Independent Test**: in the editor, move a table's third column first: the page shows it first.
On a sheet, move a filled row of that table up: it stays there after reload.

**Acceptance Scenarios**:

1. **Given** a table with several columns in the editor, **When** the author moves a column, **Then**
   the columns' order on the page follows, as one undo step, and values already filled in documents
   stay with their columns.
2. **Given** a table or a list with entries on a sheet, **When** the player moves an entry up or
   down (button, drag handle, or keyboard), **Then** the order changes and is saved with the
   document.
3. **Given** the first entry, **Then** "move up" is not offered; likewise "move down" for the last.
4. **Given** a screen reader, **Then** the move controls name the entry they move.
5. **Given** a read-only view of the sheet, **Then** no move controls appear.

---

### User Story 6 - Fewer element kinds (Priority: P2)

The add menu offers four elements instead of six: **Group**, **Field**, **List**, **Tracker**. A
Group has a kind — **Section** (a large collapsible block with a heading and the accent bar) or
**Card** (a titled card inside a section) — chosen in its settings like a field's type. A List has
a kind — **Entries** (entries added one by one, each one value, optionally from a catalog or a
game's list) or **Table** (rows with the same columns). The outline, the settings, and the guide
use these names. Switching a Group between Section and Card keeps its title, contents, and the
settings both kinds share. Switching a List between Entries and Table keeps its title and value
key and converts the entry field into a column and back; a table with several columns becomes
Entries only after a confirmation that names which columns go.

**Why this priority**: it makes the editor easier to learn, but every page can already be built.

**Independent Test**: add a Group, switch it to Card and back to Section: title and contents stay.
Add a List, switch it to Table: its entry field is the first column.

**Acceptance Scenarios**:

1. **Given** the add menu, **Then** it lists Group, Field, List, and Tracker, each with a one-line
   hint.
2. **Given** an existing template with sections, groups, tables, and lists, **Then** it opens with
   the same page; the outline shows them as Group (Section), Group (Card), List (Table), and List
   (Entries).
3. **Given** a Group, **When** the author switches its kind, **Then** the title, contents, columns,
   and the settings both kinds have are kept; kind-only settings are put aside and come back if the
   author switches back in the same editing session.
4. **Given** a List of kind Entries, **When** the author switches it to Table, **Then** its entry
   field becomes the table's first column and the title and value key stay.
5. **Given** a Table with one column, **When** switched to Entries, **Then** that column becomes the
   entry field; **given** several columns, **Then** the editor asks first and names the columns that
   will be dropped.
6. **Given** a List that shows a game's own list (for example backgrounds) or uses catalog
   suggestions, **Then** the Table kind is unavailable with a short reason.
7. **Given** documents already filled for a List whose kind changes, **Then** the editor says before
   saving that their entries for this list will not show in the new kind.
8. **Given** a saved template, **Then** templates saved after these switches are valid templates of
   today's shape; templates saved without switches are identical to today's.

### Edge Cases

- An element with no settings in a group: the group is not shown for it.
- A formula setting that is empty: no error, the formula mark still shows.
- A very long value key or formula: it wraps or scrolls inside its box; the setting name stays
  visible.
- Dragging over a collapsed group or section: the drop goes into the visible container around it,
  not into the hidden content; the preview does not expand it.
- Dragging an element that is hidden by a display condition: it moves like any other.
- Dragging very fast across many positions: the preview appears only after the pointer rests; the
  marked position follows the pointer at once.
- A drag that ends because the window lost focus: nothing changes.
- The browser blocks local storage: widths fall back to defaults each time; nothing breaks.
- The editor opened on a screen that changes from desktop to phone width (rotation): dividers
  disappear, the tabs return, and the remembered widths are kept for the next desktop use.
- A save problem inside a table column or a list entry field: the issue names the table or list
  and the column or entry field.
- Several problems in one element: each is listed; clicking each focuses its own setting.
- Moving a row while another player edits the same document: out of scope (single user today).
- A table with the minimum number of rows: moving rows is allowed; removing stays limited as today.

## Requirements _(mandatory)_

### Functional Requirements

**Settings panel (F-007)**

- **FR-001**: Every setting in the settings panel MUST have a visible name above it that stays
  visible when the setting has a value; a grey hint inside a box MAY remain only as an example.
- **FR-002**: The settings panel MUST show the selected element's actions in a row, then its kind
  and full name (wrapping, never covered), then its settings in named groups with one fixed order
  for every element kind: Content, Value, Limits and formulas, Look, Visibility and help; a group
  with no settings for the element is not shown. Required, the book name hint, the display
  condition, and the documentation link belong to Visibility and help.
- **FR-003**: Formula settings MUST look different from plain text settings (a formula mark and a
  fixed-width font) and MUST show their problems right under the box, with the same wording as the
  editor's issue list.
- **FR-004**: Groups MAY be collapsed; the editor MUST remember each group's open or closed state
  for the session across element selections, MUST mark a collapsed group that contains an issue,
  and MUST open a group when the author jumps to one of its issues.
- **FR-005**: Every setting that has a section in the template editor guide MUST keep its "?" help
  link next to its name.
- **FR-006**: The new presentation MUST NOT change what any setting stores or does; templates saved
  before and after the change MUST be identical for the same author actions.

**Moving elements (T-091)**

- **FR-007**: While an element is dragged with a mouse or pen, the editor MUST mark the allowed
  position nearest to the pointer within the container under the pointer, without requiring the
  pointer to touch an insertion slot.
- **FR-008**: When the pointer rests over one position for about a third of a second, the page MUST
  show the element placed at that position, with the surrounding elements laid out as after the
  drop and the element's old place marked by a thin dashed line.
- **FR-009**: Releasing MUST place the element exactly where it was last marked, as one undo step;
  Escape, a release outside any allowed position, or a lost window focus MUST leave the template
  unchanged.
- **FR-010**: Positions where the element may not go MUST never be marked or previewed; the rules
  are the ones the editor's move commands already follow.
- **FR-011**: During a drag, the page area MUST scroll when the pointer is near its top or bottom
  edge.
- **FR-012**: The outline MUST mark the same position as the page during a drag over either; a drag
  started in the outline MUST follow the same rules and show the same page preview.
- **FR-013**: Keyboard arrangement, the move buttons, and undo/redo MUST keep working as today.

**Editor areas (T-092)**

- **FR-014**: On desktop-width screens, the dividers between the outline and the page and between
  the page and the settings MUST be draggable; each side area MUST stay within a minimum and a
  maximum width, and the page area MUST keep a minimum width.
- **FR-015**: The editor MUST remember the side areas' widths in this browser across editor sessions,
  reloads, and templates; a double click on a divider MUST restore its default; if remembered widths
  no longer fit, the areas MUST shrink to fit.
- **FR-016**: Each divider MUST be reachable by keyboard and movable with the arrow keys, and MUST be
  announced as a resizable separator with its position.
- **FR-017**: Phone-width screens MUST keep today's tabbed layout without dividers.

**Save problems (F-008)**

- **FR-018**: Every problem that can stop a save MUST appear in the editor's issue list before the
  author presses Save, with a plain-language message in the reader's language that names the
  element (and, inside a table or list, the column or entry field) and the setting.
- **FR-019**: A problem without a specific message MUST still be shown with a general message, the
  closest named element, and the setting; raw codes, paths, and error text MUST NOT reach the
  author (they go to the developer diagnostics instead).
- **FR-020**: Clicking an issue MUST select its element, scroll it into view on the page and in the
  outline, open the settings group that holds the setting, and focus the setting.

**Order in tables and lists (T-094)**

- **FR-021**: In the editor, a table's columns MUST be reorderable (drag and move buttons), as one
  undo step each; values already filled in documents MUST stay with their columns.
- **FR-022**: On the sheet, the rows of a table and the entries of a list MUST be reorderable by the
  player with move-up and move-down controls and a drag handle, operable from the keyboard and named
  for screen readers; the new order MUST be saved with the document; read-only views show no move
  controls.

**Element kinds (T-095)**

- **FR-023**: The add menu MUST offer Group, Field, List, and Tracker; the outline, settings, issue
  messages, and guide MUST name sections and groups as Group with kind Section or Card, and tables
  and lists as List with kind Table or Entries.
- **FR-024**: A Group's kind MUST be switchable in its settings, keeping its title, contents,
  columns, and shared settings; settings only one kind has MUST be kept aside for the editing
  session and restored when switching back.
- **FR-025**: A List's kind MUST be switchable between Entries and Table, converting the entry field
  and the first column into each other and keeping the title and value key; dropping extra columns
  MUST be confirmed first, naming them; Table MUST be unavailable, with a reason, for lists that show
  a game's own list or use catalog suggestions.
- **FR-026**: Before saving a template in which a filled List changed kind, the editor MUST say that
  documents' entries for that list will not show in the new kind.
- **FR-027**: Stored templates MUST keep today's shape (sections, groups, tables, lists as they are);
  templates saved without kind switches MUST be identical to today's.

**Records**

- **FR-028**: The template editor guide (English and Russian) MUST describe the settings groups,
  dragging with the placement preview, resizing the areas, the issue list, reordering, and the
  Group and List kinds; the backlog entries F-007, F-008, T-091, T-092, T-094, and T-095 MUST be
  closed when this ships.

### Key Entities _(include if feature involves data)_

- **Settings group**: a named part of the settings panel (Content, Value, Limits and formulas, Look,
  Visibility and help) with an open/closed state remembered for the session.
- **Placement**: during a drag, the target container and position the element would take; shown as
  a mark and, after the pointer rests, as a preview of the page.
- **Editor area widths**: the outline and settings widths, remembered per browser, with defaults,
  minimums, and maximums.
- **Issue**: a problem that stops a save — message, element, and setting it leads to.
- **Element kind**: the presented kind of a stored element — Group (Section, Card), List (Entries,
  Table), Field, Tracker.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a check with at least 3 people who have used the editor before, everyone names the
  value key and the maximum formula of a filled-in rating correctly at first sight (0 mix-ups).
- **SC-002**: Moving a field to a group in another column with the mouse succeeds on the first try
  in at least 9 of 10 attempts, and the result always matches the preview (0 mismatches).
- **SC-003**: The placement preview appears within a tenth of a second after the pointer rests, on
  the full Star Wars sheet.
- **SC-004**: Area widths set by the author are the same after closing and reopening the editor and
  after a reload, in 10 of 10 checks.
- **SC-005**: Saving templates after the same edits gives identical stored templates before and
  after the feature (no change in meaning), checked over every shipped template.
- **SC-006**: For every rule that can reject a template, a test template breaking it shows a named,
  plain-language issue that leads to its element; 0 raw error texts reach the author.
- **SC-007**: A player reorders three rows of a table on a sheet in under 15 seconds, and the order
  survives a reload.
- **SC-008**: Authors new to the editor pick the right element for "a block of fields", "one value",
  "entries the player adds", and "boxes to mark" from the add menu on the first try in at least 9 of
  10 choices.

## Assumptions

- The group names and order (Content, Value, Limits and formulas, Look, Visibility and help) are
  confirmed by the prototype review.
- The kind names Section and Card (Group) and Entries and Table (List) are proposals for the review
  of the updated prototype; Russian names follow the glossary.
- Widths are remembered in the browser only, like other per-viewer conveniences; nothing is stored
  in templates or documents.
- "Desktop width" is the width at which the editor shows three areas today.
- The placement preview may show the page without the element's hover chrome during the drag.
- Touch dragging of elements in the editor is not added; on the sheet, rows and entries move with
  buttons on every screen and with a drag handle where a pointer is available.
- A List switched between kinds does not convert values already stored in documents (Out of scope);
  the editor warns instead.
