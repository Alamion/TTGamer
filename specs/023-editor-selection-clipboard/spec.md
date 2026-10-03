# Feature Specification: Copy, paste, multi-selection, and the element menu in the template editor

**Feature Branch**: `023-editor-selection-clipboard` (branched from `022-template-editor-ux`)

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "Take all three tasks (T-089, T-090, T-093) into a new spec; push and
merge after this feature."

## Scope

| Backlog | Entry                                                | Role in this feature |
| ------- | ---------------------------------------------------- | -------------------- |
| T-089   | Copy and paste elements in the template editor       | User Story 1         |
| T-090   | Multi-selection in the template editor               | User Stories 2 and 3 |
| T-093   | Element context menu and shortcut list in the editor | User Stories 4 and 5 |

The template editor (spec 022) selects one element at a time. The author can duplicate it right
after itself (Ctrl+D), move it (drag, Alt+arrows, move buttons), and remove it; every change is
one undo step. There is no way to take an element to another place or another template without
rebuilding it, no way to act on several elements at once, and the keys are known only from the
guide.

Players report (2026-10-02 feedback):

- **Rebuilding the same block is tedious.** A block built on one page (for example a set of
  ratings with formulas) cannot be reused on another page, and moving a copy far away on the same
  page takes many moves after Ctrl+D.
- **Arranging many elements is slow.** Removing or moving five fields takes five rounds of select
  and act; giving ten fields the same display condition takes ten edits.
- **The actions are hidden.** Authors who do not read the guide do not know Ctrl+D or the
  Alt+arrows; a right click on an element shows the browser's menu.

Maintainer decisions (2026-10-03):

- One feature for the three backlog entries, since all of them act on "the selection".
- The work continues on its own branch from `022-template-editor-ux`; both features are pushed and
  merged together after this one.

Out of scope:

- Copying values filled in documents: only the template elements are copied.
- Copying table columns, select options, or list entry fields on their own (they are parts of an
  element's settings, not elements).
- Rubber-band (lasso) selection by dragging on an empty part of the page.
- Touch dragging of elements (unchanged from spec 022).
- Copying whole pages; the library already duplicates pages.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Copy and paste elements (Priority: P1)

A template author selects a group of ratings on one page and presses Ctrl+C. They select a group
on the same page, or open another page in the editor, select an element there, and press Ctrl+V.
The copy appears right after the selected element, or inside the selected group or section at its
end, and becomes the selection. Ctrl+X does the same as copy followed by remove. Each paste is one
undo step. The copy is independent from the original: it has its own identity and keeps its own
values in documents. What the target page cannot support (a value it lacks, a game list of another
system) shows up in the issue list right away, as on a kind or type change.

**Why this priority**: it is the most requested of the three and the base the context menu and
multi-selection build on.

**Independent Test**: on the full Star Wars sheet, copy a section, open a blank page of the same
document kind in the editor, paste: the section with all its contents appears, the issue list
shows nothing for it; one Undo removes it.

**Acceptance Scenarios**:

1. **Given** an element selected, **When** the author presses Ctrl+C and then Ctrl+V with a field
   selected, **Then** a copy is inserted right after that field, in the same column, and is
   selected.
2. **Given** a Group (section or card) selected, **When** the author pastes, **Then** the copy goes
   inside the group at its end; **given** the copy cannot go inside it (for example a section into
   a card), **Then** it goes right after the group instead.
3. **Given** nothing selected, **When** the author pastes, **Then** the copy goes at the end of the
   page.
4. **Given** a paste, **Then** it is one undo step, and the copy and every element inside it have
   new identities; the copy shares no stored values with the original.
5. **Given** a copied element pasted into the same page, **Then** its name gets the same "copy"
   mark as Duplicate gives; **given** another page, **Then** the name is kept.
6. **Given** a copied element that reads a value, list, or catalog the target page does not have
   (another document kind or game system), **When** it is pasted, **Then** the element is kept and
   each such problem appears in the issue list, naming the element and the setting.
7. **Given** a copied element, **When** the author closes the editor and opens another page,
   **Then** Ctrl+V pastes it there.
8. **Given** the author is typing in a setting's box, **Then** Ctrl+C, Ctrl+X, and Ctrl+V copy and
   paste text as usual and do not touch elements.
9. **Given** Ctrl+X on an element, **Then** it is copied and removed as one undo step, and can be
   pasted elsewhere.

---

### User Story 2 - Select several elements and act on them together (Priority: P1)

The author Ctrl+clicks (Cmd on a Mac) several fields on the page or in the outline to add or
remove them from the selection, or Shift+clicks to select every element between the last selected
one and the clicked one among the same siblings. The page and the outline mark every selected
element; the settings area says how many are selected. Delete removes them all, Ctrl+D duplicates
each one after itself, Ctrl+C copies them all, and dragging one of them moves all of them together
to the drop place, in their page order. Each of these is one undo step. Escape or a plain click
returns to a single selection.

**Why this priority**: it turns the most repetitive arrangement work into one action and is the
condition for editing settings together.

**Independent Test**: on the full Star Wars sheet, Ctrl+click three fields in different groups and
drag them into one group: the three are there, in page order, and one Undo returns all three.

**Acceptance Scenarios**:

1. **Given** one element selected, **When** the author Ctrl+clicks another on the page or in the
   outline, **Then** both are selected and marked in both places; Ctrl+clicking a selected element
   removes it from the selection.
2. **Given** one element selected, **When** the author Shift+clicks a sibling, **Then** every
   element between them (inclusive) among those siblings is selected; Shift+click on an element
   with another parent selects just the two.
3. **Given** several selected, **When** the author presses Delete, **Then** all are removed as one
   undo step.
4. **Given** several selected, **When** the author drags one of them, **Then** all of them move to
   the drop place, one after another in their page order, with the live preview of spec 022 showing
   the whole set; one undo step; positions inside any selected element are not offered.
5. **Given** several selected, **When** the author copies and pastes, **Then** all copies are
   inserted together at the paste place, in page order, and become the new selection.
6. **Given** a group and one of its own elements both selected, **Then** actions treat the element
   as part of its group (it is moved, copied, or removed with the group, never twice).
7. **Given** several selected, **When** the author presses Alt+↑ or Alt+↓, **Then** the selected
   elements that share a parent move together by one place; Alt+←/→ and column moves act only when
   every selected element allows them.
8. **Given** several selected, **When** the author presses Escape or clicks one element without a
   modifier, **Then** only that element (or none, after Escape) stays selected.
9. **Given** a screen reader, **Then** adding to or removing from the selection is announced with
   the count of selected elements.

---

### User Story 3 - Change shared settings of several elements at once (Priority: P2)

With several elements selected, the settings area shows only the settings every one of them has,
in the same groups as for one element (spec 022), for example the label's visibility, the display
condition, the column span, or Required. A setting where the elements have different values shows
"Mixed" instead of a value. Changing a setting sets it on every selected element, as one undo step.
Settings only some of them have are not shown; the area says so and lists the selected elements, so
the author can open one of them alone.

**Why this priority**: valuable for large pages, but every change is already possible one element
at a time.

**Independent Test**: select five fields with different display conditions, set one condition in
the settings area: all five get it, and one Undo restores each one's previous condition.

**Acceptance Scenarios**:

1. **Given** several elements selected, **Then** the settings area shows the number selected, the
   list of their names (each opening that element alone), and only the settings every selected
   element has.
2. **Given** a shared setting with different values, **Then** it shows "Mixed"; **given** equal
   values, **Then** it shows the value.
3. **Given** the author changes a shared setting, **Then** every selected element gets the new value,
   as one undo step; settings left as "Mixed" are not changed.
4. **Given** elements of kinds that share no setting, **Then** the area says that they have no
   common settings and still offers the shared actions (remove, duplicate, copy, move).
5. **Given** a change that is invalid for some selected elements, **Then** the issue list names each
   element with the problem, as for single edits.
6. **Given** settings that identify one element (its value key, its options, its table columns, its
   list entry field), **Then** they are never offered for several elements at once.

---

### User Story 4 - Element context menu (Priority: P2)

A right click on an element, on the page or in the outline (a long press on touch screens, or the
context-menu key), selects it if it was not selected and opens a menu with the editor's actions
for the selection: Cut, Copy, Paste, Duplicate, Move up, Move down, Move out of the group, Move into
the group above, Remove, and, on touch screens, Add to selection. Each item shows its keyboard
shortcut; items that do not apply are shown disabled. The menu works with the keyboard and closes
with Escape.

**Why this priority**: it makes every action findable without the guide and gives touch screens
copy, paste, and multi-selection.

**Independent Test**: right-click a field on the page: the menu lists the actions with their keys;
choose Copy, right-click a group, choose Paste: the copy is inside the group.

**Acceptance Scenarios**:

1. **Given** a right click on an unselected element, **Then** it becomes the selection and the menu
   opens next to the pointer; **given** a right click on an element of a multi-selection, **Then**
   the selection is kept and the menu acts on all of it.
2. **Given** the menu, **Then** each item shows the same shortcut the keyboard uses, written for the
   author's platform (Ctrl or ⌘).
3. **Given** an action that does not apply (Paste with nothing copied, Move up on the first element),
   **Then** its item is disabled, not hidden.
4. **Given** a touch screen, **When** the author long-presses an element, **Then** the menu opens,
   including Add to selection (or Remove from selection) to build a multi-selection without keys.
5. **Given** keyboard focus on an element (page or outline), **When** the author presses the
   context-menu key or Shift+F10, **Then** the menu opens; arrows move between items, Enter chooses,
   Escape closes it and returns focus to the element.
6. **Given** a right click outside elements (an empty part of the page), **Then** the menu offers
   Paste at the end of the page.
7. **Given** a right click inside a setting's text box, **Then** the browser's own menu opens.

---

### User Story 5 - Shortcut list (Priority: P3)

The editor's help lists every keyboard shortcut of the editor with what it does, grouped (Edit,
Selection, Arrange, History), in the author's language and with the author's platform keys. It opens
from a button in the editor's toolbar and with "?" when the author is not typing. The template
editor guide shows the same list.

**Why this priority**: it completes discoverability; the menu already shows the most used keys.

**Independent Test**: in the editor, press "?": the list shows Copy (Ctrl+C) and Move up (Alt+↑);
the guide's page shows the same entries.

**Acceptance Scenarios**:

1. **Given** the editor, **When** the author presses "?" outside a text box or clicks the shortcuts
   button, **Then** the shortcut list opens; Escape closes it and returns focus.
2. **Given** the list, **Then** it contains every shortcut the editor reacts to, and no shortcut it
   does not react to.
3. **Given** a Mac, **Then** keys are shown as ⌘ and ⌥; elsewhere as Ctrl and Alt.
4. **Given** the template editor guide in English and Russian, **Then** its shortcut table lists the
   same shortcuts as the in-editor list.

### Edge Cases

- Pasting while the selected element is inside a collapsed section: the copy goes where the rules
  say; the section opens enough to show the new selection.
- Pasting a section where only cards are allowed is impossible today: the copy goes to the nearest
  place it may go (after the enclosing section, or at the end of the page), never fails silently.
- Pasting a copy of an element inside itself (copy a group, select an element inside it, paste):
  allowed, since the copy is a new element; nesting limits still apply.
- Copying an element whose formulas read values of its own children: the pasted copy reads its own
  children's values, not the original's.
- A copied element bound to a game's own data (a game list, a trait row) pasted on a page of the
  same system and document kind keeps working; on another system it shows an issue.
- The clipboard holds something that is not a copied element (text, an image): Ctrl+V on the page
  does nothing to the elements.
- Copying in one browser tab and pasting in another with the editor open: the copy is pasted.
- A multi-selection that includes the only element of a group: removing it leaves the group empty,
  as removing it alone would.
- A multi-selection with elements at different nesting levels: dragging places them all in the
  drop container; elements that may not go there make the place unavailable.
- Undo after a multi-element action: one Undo restores every element and the previous selection.
- Selecting elements that are hidden by a display condition (hatched in the editor): allowed.
- A very large selection (every element of the full Star Wars sheet): actions stay responsive.
- A right click during a drag: ignored.

## Requirements _(mandatory)_

### Functional Requirements

**Copy and paste (T-089)**

- **FR-001**: The editor MUST copy the selected elements with Ctrl+C (⌘C), cut them with Ctrl+X
  (copy and remove as one undo step), and paste with Ctrl+V; keys MUST work with any keyboard
  layout and MUST NOT act while the author types in a text box.
- **FR-002**: A paste MUST insert the copied elements right after the selected element, inside a
  selected Group at its end, or at the end of the page when nothing is selected; when the copy may
  not go there, the nearest place it may go is used. The pasted elements become the selection, as
  one undo step.
- **FR-003**: Pasted elements and everything inside them MUST get new identities and MUST NOT share
  stored values with the originals; values that address the game's own data stay, as Duplicate
  keeps them today. References between elements inside the copy MUST point to the copy.
- **FR-004**: A copy pasted on the page it came from MUST be named like a Duplicate (the "copy"
  mark); on another page its names MUST be kept.
- **FR-005**: The copied elements MUST stay available for pasting after the editor is closed, on
  any page opened in the editor in the same browser, including another tab.
- **FR-006**: A pasted element that reads values, lists, or catalogs the target page lacks MUST be
  kept and reported in the issue list, naming the element and the setting (spec 022 rules).

**Multi-selection (T-090)**

- **FR-007**: Ctrl+click (⌘-click) on the page or in the outline MUST add an element to the
  selection or remove it; Shift+click MUST select the range between the last selected element and
  the clicked one among the same siblings. Escape and a plain click MUST return to one or no
  selected element.
- **FR-008**: Every selected element MUST be marked on the page and in the outline; the number
  selected MUST be shown and announced to screen readers.
- **FR-009**: Remove, Duplicate, Copy, Cut, drag, and keyboard moves MUST act on the whole
  selection as one undo step each; an element inside a selected Group MUST be treated as part of
  it; a move MUST be offered only where every selected element may go.
- **FR-010**: A dragged multi-selection MUST land at the drop place in page order, and the live
  preview MUST show the whole set.
- **FR-011**: With several elements selected, the settings area MUST show the count, the list of
  selected elements (each opening it alone), and only the settings every selected element has, in
  the groups of spec 022; differing values MUST show as "Mixed"; settings that identify one element
  (value key, options, table columns, list entry field) MUST NOT be offered.
- **FR-012**: Changing a shared setting MUST set it on every selected element as one undo step and
  report problems per element in the issue list.

**Context menu and shortcuts (T-093)**

- **FR-013**: A right click on an element (page or outline), a long press on touch screens, the
  context-menu key, or Shift+F10 MUST open a menu of the actions for the selection — Cut, Copy,
  Paste, Duplicate, Move up, Move down, Move out of the group, Move into the group above, Remove,
  and on touch screens Add to / Remove from selection — selecting the element first if it is not
  selected.
- **FR-014**: Each menu item MUST show its shortcut in the author's platform notation; items that
  do not apply MUST be disabled, not hidden; the menu MUST be operable by keyboard and close with
  Escape, returning focus to the element.
- **FR-015**: A right click on an empty part of the page MUST offer Paste at the end of the page;
  inside text boxes the browser's own menu MUST stay.
- **FR-016**: The editor MUST offer a shortcut list (toolbar button and "?" outside text boxes)
  with every editor shortcut, grouped, in the author's language and platform notation; it MUST
  match the keys the editor reacts to.

**Records**

- **FR-017**: Every element, control, and variant this feature adds to the editor MUST follow the
  accessibility rules of the project (named buttons, menu roles, focus return) and, where it is an
  element variant, appear in the storybook.
- **FR-018**: The template editor guide (English and Russian) MUST describe copy and paste,
  multi-selection, shared settings, the context menu, and the full shortcut list; the backlog
  entries T-089, T-090, and T-093 MUST be closed when this ships.
- **FR-019**: Templates saved after these actions MUST be valid templates of today's shape; the
  feature changes no stored template or document format.

### Key Entities _(include if feature involves data)_

- **Selection**: the set of selected elements of the page being edited, with the last selected one
  (the anchor for Shift+click and for paste placement); part of each undo step.
- **Copied elements**: the elements last copied or cut, with the page, document kind, and game
  system they came from; kept in the browser for later pastes.
- **Shared setting**: a setting every selected element has, with one value or "Mixed".
- **Editor action**: an action the editor offers (copy, paste, move up, …) with its shortcut, its
  menu item, and whether it applies to the current selection; the single list behind the keys, the
  menu, and the shortcut list.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An author reuses a 10-element block from one page on another page in under 20
  seconds, with no issue in the list when the pages are of the same document kind.
- **SC-002**: Moving five scattered fields into one group takes one drag after selecting them, and
  one Undo returns all five (10 of 10 checks).
- **SC-003**: Giving ten fields the same display condition takes one edit after selecting them.
- **SC-004**: Every editor action is reachable without a keyboard on a touch screen (via the
  context menu), and every shortcut the editor reacts to appears in the shortcut list (0 missing,
  0 extra).
- **SC-005**: Copy, paste, remove, and a shared setting change on a selection of every element of
  the full Star Wars sheet each complete within a second.
- **SC-006**: Templates saved after copy, paste, and multi-element actions pass the template checks
  in 100% of the tested cases; pasting never changes the page it was copied from.
- **SC-007**: In a check with at least 3 people who have used the editor, everyone finds Copy and
  Paste for an element without being told the keys.

## Assumptions

- "Same browser" covers other tabs because the copy goes through the system clipboard when the
  browser allows it; when it does not, the copy is still kept in this tab for the session.
- Paste from the context menu uses the editor's own copy (browsers restrict menu-triggered reads of
  the system clipboard); Ctrl+V reads the system clipboard.
- Shift+click selects a range only among siblings (the same group or the page root); a range across
  groups is not needed.
- Duplicate of a multi-selection puts each copy after its original; Paste puts all copies together.
- Ctrl+X (cut) is added along with Ctrl+C and Ctrl+V because authors expect it and it is copy plus
  remove; "Select all" is not added.
- The shortcut list is shown inside the editor as a dialog; the guide's table is kept in sync by a
  test, not by hand.
- Russian names of the new actions follow the glossary.
