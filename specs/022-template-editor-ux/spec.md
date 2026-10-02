# Feature Specification: Template editor usability from player feedback

**Feature Branch**: `022-template-editor-ux` (branched from `testing`)

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Player feedback on the template editor: the settings panel is hard to
read (an author mixed up a rating's tag field and its formula field), moving elements with the
mouse is hard (finding a drop position; the element should show in place while held over a
position), and the dividers between the editor's areas should be draggable with the widths
remembered."

## Scope

| Backlog | Entry                                                | Role in this feature |
| ------- | ---------------------------------------------------- | -------------------- |
| F-007   | Template editor settings panel is hard to read       | User Story 1         |
| T-091   | Drag and drop with live placement                    | User Story 2         |
| T-092   | Resizable template editor panes                      | User Story 3         |
| T-089   | Copy and paste elements (with T-090 multi-selection) | Not in scope         |
| T-093   | Element context menu and shortcut list               | Not in scope         |

The template editor has three areas on a desktop screen: the outline of the page on the left, the
live page in the middle, and the settings of the selected element on the right. Phones show one
area at a time behind tabs.

Players report three problems:

- **Settings are hard to tell apart.** Most settings are text boxes named only by the grey hint
  inside them; once a value is typed, the hint disappears and nothing says what the box is. A
  rating's value key (a short word such as `strength`) and its maximum formula (`willpower + 2`)
  then look the same, and an author typed one into the other.
- **Moving elements with the mouse is hard.** An element can only be dropped on thin insertion
  slots between elements, which are hard to hit, and the page shows nothing of the result until
  the button is released.
- **The areas have fixed widths.** The outline and settings take fixed space whatever the screen
  and the template, so long names and wide pages do not fit.

Maintainer decisions (2026-10-02):

- One feature for the three items; copy/paste and multi-selection (T-089, T-090) get their own
  feature, since they need a selection model.
- The work happens on its own branch so unrelated work can continue from `testing`.

Out of scope:

- Copy and paste, multi-selection, the element context menu, a shortcut list (T-089, T-090,
  T-093).
- Moving elements by touch dragging on phones; phones keep the current move buttons and keyboard
  arrangement.
- Changing what any setting does: this feature changes how settings are presented and found, not
  their meaning or stored values.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Readable settings panel (Priority: P1)

A template author selects a rating on the page. The settings panel shows the element's kind and
name at the top, then its settings in a few named groups — for example **Content**, **Value**,
**Limits and formulas**, **Look**, **Visibility and help**. Every setting has a visible name that
stays when the setting has a value. Formula settings look different from plain text: they carry a
formula mark, use a fixed-width font, and say right under the box when the formula is invalid or
reads a value that does not exist. Settings authors rarely change sit in collapsed groups that
open with one click and stay as the author left them.

**Why this priority**: the reported mistake (key typed into a formula field) produces broken pages
and is invisible until the sheet misbehaves; it is the most damaging of the three problems.

**Independent Test**: open the editor on the full Star Wars sheet, select a rating with a value key
and a maximum formula filled in; without reading hints or help, name which box holds the key and
which the formula.

**Acceptance Scenarios**:

1. **Given** any element selected, **When** a setting has a value, **Then** its name is still shown
   next to or above it.
2. **Given** a rating, **Then** its value key and its maximum formula are in different groups,
   named, and the formula box looks like a formula (mark and fixed-width text).
3. **Given** a formula that does not parse or reads a missing value, **Then** the message appears
   under that formula box (as well as in the editor's issue list).
4. **Given** every element kind (section, group, field of each type, rating and other bound
   elements, list, table, tracker), **Then** its settings follow the same group order and names.
5. **Given** a collapsed group with a setting that has an issue, **Then** the group shows that it
   contains an issue, and opening it shows the setting.
6. **Given** the author collapses or opens a group, **When** they select another element of any
   kind, **Then** the same group keeps the state they chose (for the rest of the session).
7. **Given** a setting with an explanation in the template editor guide, **Then** its "?" help link
   stays next to its name.

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
   its old place shown as empty.
3. **Given** the preview is shown, **When** the author releases, **Then** the element ends exactly
   where the preview showed it, as one undo step.
4. **Given** a drag, **When** the author presses Escape or releases outside any allowed position,
   **Then** nothing changes.
5. **Given** positions where the element may not go (for example a section inside a group, or an
   element into itself), **Then** they are never marked or previewed.
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

## Requirements _(mandatory)_

### Functional Requirements

**Settings panel (F-007)**

- **FR-001**: Every setting in the settings panel MUST have a visible name that stays visible when
  the setting has a value; a grey hint inside a box MAY remain only as an example of a value.
- **FR-002**: The settings panel MUST show the selected element's kind and name at the top, then its
  settings in named groups with one fixed order for every element kind: Content, Value, Limits and
  formulas, Look, Visibility and help; a group with no settings for the element is not shown.
- **FR-003**: Formula settings MUST look different from plain text settings (a formula mark and a
  fixed-width font) and MUST show their problems (does not parse, reads a missing value, refers to
  itself) right under the box, with the same wording as the editor's issue list.
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
  drop and the element's old place shown as empty.
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

**Records**

- **FR-018**: The template editor guide (English and Russian) MUST describe the settings groups,
  dragging with the placement preview, and resizing the areas; the backlog entries F-007, T-091,
  and T-092 MUST be closed when this ships.

### Key Entities _(include if feature involves data)_

- **Settings group**: a named part of the settings panel (Content, Value, Limits and formulas, Look,
  Visibility and help) with an open/closed state remembered for the session.
- **Placement**: during a drag, the target container and position the element would take; shown as
  a mark and, after the pointer rests, as a preview of the page.
- **Editor area widths**: the outline and settings widths, remembered per browser, with defaults,
  minimums, and maximums.

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

## Assumptions

- The group names and order (Content, Value, Limits and formulas, Look, Visibility and help) are a
  starting point; the prototype review may rename or merge them before planning.
- Widths are remembered in the browser only, like other per-viewer conveniences; nothing is stored
  in templates or documents.
- "Desktop width" is the width at which the editor shows three areas today.
- The placement preview may show the page without the element's hover chrome during the drag.
- Touch dragging is not added; the existing move buttons and keyboard arrangement cover phones.
