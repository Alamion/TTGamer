# Feature Specification: Several Documents on One Screen

**Branch**: `034-multi-document-screen` | **Created**: 2026-10-14 | **Status**: Draft

**Input**: "T-112 Several documents on one screen: GMs and players read several documents side by
side — for example a faction, a region, and a session recap, or a sheet and its brief cards —
without opening each one in turn. Builds on the documents window of T-052 and the area-based brief
layout of T-056 (spec 033); T-113 (shared window management) comes after."

## Context

Today the sheet page shows exactly one document: the current one. To glance at a second character, a
GM opens it (which changes the current document), reads, and goes back. The documents window
(spec 032) organizes documents but only ever opens one at a time, and briefs (spec 033) now lay out
from the width of the area they are drawn in, so they can sit in a column or a card of any size.
This feature lets the reader keep several documents open at once, each in its own **pane** on the
sheet page, so a GM can watch the party's briefs, or a sheet and an NPC's brief, together. Only
character-like documents exist today; markdown notes and canvases will join the same panes later
(T-052 remainder). Backlog entry: T-112 in `TODO.md`; roadmap path `note-showcase`.

## Clarifications

### Session 2026-10-15

- Q: Should panes have a read-only mode? → A: Not now; every pane is editable. Read-only belongs to
  the online part with the backend, where access rights matter.
- Q: Are six panes and 320 px per pane right? → A: Yes.
- Q: How does the reader move between open documents, especially on a phone? → A: A tab strip over
  the panes lists the open documents; on a phone it is the only way to change the shown document.
  The same strip stays on desktop (like an editor's tabs).
- Q: Can a pane take the whole screen? → A: On desktop, yes: double-click on a tab hides the other
  panes, another double-click restores them. Not on a phone (it already shows one pane).

## User Scenarios & Testing

### User Story 1 - Keep a second document open beside the first (Priority: P1)

A GM is reading a player's character and wants an NPC's brief next to it. They choose **Open
beside** on the NPC in the documents window (or its row menu); the NPC appears in a second pane next
to the first, in its brief view, and both stay readable and editable. Closing a pane leaves the
others in place.

**Why this priority**: it is the whole point of the feature and every later story builds on two
panes existing.

**Independent Test**: with two documents, open the second beside the first, edit a value in each,
close one, and confirm the other and its values are unchanged.

**Acceptance Scenarios**:

1. **Given** one document shown, **When** the reader opens another beside it, **Then** two panes
   share the page, each with its own title, view selector, and close control, and the first
   document's view and scroll position are unchanged.
2. **Given** two panes, **When** a value is edited in the right pane, **Then** only that document
   changes and is saved as it always is.
3. **Given** two panes, **When** the reader closes one, **Then** the other takes the room and the
   closed document is still in the documents window.
4. **Given** the same document already shown in a pane, **When** the reader opens it beside again,
   **Then** that pane is focused instead of a duplicate appearing.

---

### User Story 2 - The panes fit the screen they are on (Priority: P2)

On a wide desktop screen the panes sit side by side, each a column or a card sized by the room it
has, so briefs show their dense look and full sheets keep their usual look when they get enough
room. A tab strip over them lists every open document, on desktop and on a phone alike. On a narrow
screen (phone) the panes do not squeeze: one pane shows at a time and the tabs switch between the
open documents. On desktop a reader can also give one pane the whole screen and go back.

**Why this priority**: side by side on a phone would make every pane unreadable; the layout rule is
what makes the feature usable on both device classes.

**Independent Test**: open three documents at 1280 px and at 375 px and check how each is laid out
and that nothing needs sideways scrolling.

**Acceptance Scenarios**:

1. **Given** three open documents on a 1280 px screen, **When** the page is drawn, **Then** the
   panes share the width, each at least 320 px wide, without sideways scrolling of the page.
2. **Given** more panes than fit at that minimum width, **When** another is opened, **Then** the
   panes that no longer fit show only as tabs; choosing such a tab shows it in place of the least
   recently focused visible pane.
3. **Given** a 375 px screen with three open documents, **When** the page is drawn, **Then** one
   document shows full width and the tab strip lists all three by name; choosing a tab shows it.
4. **Given** the reader drags the divider between two panes, **When** they release it, **Then** the
   sizes are kept (the same way other split panes in the app remember theirs).
5. **Given** several panes on desktop, **When** the reader double-clicks a pane's tab (or uses its
   maximize control), **Then** only that pane shows, full width; doing it again restores the
   previous panes and sizes.

---

### User Story 3 - Choose what each pane shows (Priority: P3)

Each pane has its own view: a brief for a quick look, the full sheet for work, or any other view the
document type offers. A new pane starts in the brief when the document has one. The reader can
switch a pane's view without affecting the others, and a document's preferred view is not changed by
what a pane shows.

**Why this priority**: reading several documents side by side works because panes default to dense
views, but the reader must be able to work in one of them.

**Independent Test**: open two documents, switch the right pane from brief to full sheet, and
confirm the left pane and the documents' stored preferences did not change.

**Acceptance Scenarios**:

1. **Given** a document with a brief view, **When** it is opened beside, **Then** it shows the
   brief.
2. **Given** a document with no brief view, **When** it is opened beside, **Then** it shows its
   preferred or default view.
3. **Given** a pane switched to the full sheet, **When** the page reloads, **Then** the pane comes
   back in the same view.

---

### User Story 4 - The arrangement is remembered (Priority: P4)

The reader's open panes, their order, sizes, and views come back after a reload or a later visit on
the same device, and a document that was deleted in the meantime simply drops out of the
arrangement.

**Why this priority**: a table session lasts hours across reloads; rebuilding the screen each time
would defeat the feature.

**Independent Test**: arrange three panes, reload, and confirm the same three appear; delete one
document and reload again.

**Acceptance Scenarios**:

1. **Given** three panes, **When** the page is reloaded, **Then** the same documents, order, sizes,
   and views are shown.
2. **Given** a stored arrangement naming a document that no longer exists, **When** the page loads,
   **Then** that pane is dropped without an error and the others are shown.
3. **Given** a reader with no stored arrangement (or from before this feature), **When** the page
   loads, **Then** it shows the current document alone, as it did before.

---

### User Story 5 - Rolls and the dice panel know which document they belong to (Priority: P5)

With several documents open, a roll started from a stat names the document of the pane it came from,
and the dice panel's idea of the shown document follows the pane the reader last worked in.

**Why this priority**: without it a roll from the right pane could be attributed to the left
character, which is wrong at the table.

**Independent Test**: roll a stat in each of two panes and check the named character; click into the
left pane and check the dice panel's shown document.

**Acceptance Scenarios**:

1. **Given** two panes, **When** a stat is rolled in the right pane, **Then** the roll names the
   right pane's document.
2. **Given** two panes, **When** the reader focuses or edits in a pane, **Then** that pane is the
   current one: its document is the one the documents window marks as current and the dice panel
   treats as shown.

### Edge Cases

- A document deleted while shown (in this tab, or by another tab's merge): its pane is removed from
  the arrangement without an error; if it was the focused one, focus moves to a remaining pane, and
  with none left the page shows the empty state as before. A document whose record cannot be read
  when loading shows an error notice with a close control in its pane.
- The same document in two panes is not allowed (see US1), but the same document may be open in two
  tabs: the cross-tab merge rules of documents apply and nothing here changes them.
- A document whose type is unavailable (a user type that was removed): the pane shows the existing
  "unavailable type" notice for that document only; other panes are unaffected.
- A pane with unsaved typing when it is closed: values are saved on change as everywhere, so nothing
  is lost.
- More documents than the limit: opening beyond the limit replaces the least recently focused pane
  after saying so, never silently closes the one being worked in.

## Requirements

### Functional Requirements

- **FR-001**: The documents window and a document's row menu MUST offer **Open beside**, which adds
  the document as a pane next to the current ones without changing which documents exist.
- **FR-002**: Each pane MUST show one document with its title, a view selector, and a close control
  that has an accessible name; closing a pane MUST NOT delete the document.
- **FR-003**: A document MUST appear in at most one pane; opening it beside again MUST focus the
  existing pane.
- **FR-004**: The number of open panes MUST be at most six; beyond it the least recently focused
  pane is replaced after the reader is told.
- **FR-005**: On a screen wide enough for it, panes MUST share the page width side by side, each at
  least 320 px wide, with a divider the reader can drag (keyboard-operable); panes that do not fit
  MUST show only as tabs, and choosing one MUST show it in place of the least recently focused
  visible pane.
- **FR-006**: On a narrow screen (phone), exactly one pane MUST show at a time; the tab strip is the
  way to change it, and no side-by-side layout is offered.
- **FR-007**: Each pane MUST lay its document out from the width of the pane, not of the window (the
  brief and full-sheet area rules of spec 033 apply inside a pane).
- **FR-008**: A pane MUST start in the document's brief view when it has one, otherwise in its
  preferred or default view, and MUST keep its own view; changing a pane's view MUST NOT change the
  document's stored preferred view.
- **FR-009**: Values edited in a pane MUST be written to that pane's document only, with the same
  validation, saving, and cross-tab behavior as editing the current document.
- **FR-010**: A roll started from a stat in a pane MUST name that pane's document as its source.
- **FR-011**: The pane the reader last focused or edited in MUST be the current document: the
  documents window MUST mark it as current, and the dice panel's shown document MUST follow it.
- **FR-012**: The open panes, their order, widths, and views MUST be kept on the device and restored
  on the next visit; entries for documents that no longer exist MUST be dropped without an error; a
  device with nothing stored MUST show the current document alone.
- **FR-013**: Opening, closing, switching, and resizing panes MUST work with the keyboard and
  announce the change to assistive technology (a pane's region has a name; the strip's tabs expose
  the selected one and the arrow keys move between them). After a pane is closed, focus moves to the
  neighbouring tab; a replaced pane is announced through a status message.
- **FR-014**: With a single document open the page MUST look and behave as it does before this
  change (no strip, no divider, no extra chrome).
- **FR-015**: All text added by this change MUST exist in English and Russian.
- **FR-016**: The user guide page for the documents window MUST describe opening documents beside
  each other, in English and Russian.
- **FR-017**: A tab strip MUST list every open document by name whenever two or more are open, on
  every screen size, with the focused pane's tab marked; each tab has a close control. With one
  document open there is no strip (FR-014).
- **FR-018**: On desktop, double-clicking a tab, or a maximize control with the same effect that
  works by keyboard, MUST show only that pane at full width, and repeating it MUST restore the
  previous panes and sizes. The maximize state is not offered on a phone.
- **FR-019**: Choosing **Open** (or a reference to another document) with several panes MUST show
  that document in the focused pane, or focus the pane that already shows it; on a phone, **Open
  beside** adds a tab and focuses it.

### Key Entities

- **Pane**: one open document on the sheet page, with its view and width; a document is in at most
  one pane.
- **Arrangement**: the ordered list of panes, the focused one, the widths, and whether one pane is
  maximized, kept per device.
- **Tab strip**: the list of open documents by name, one tab per pane, shown when two or more are
  open.

## Success Criteria

- **SC-001**: A reader goes from one document to two side by side in at most two actions (choose the
  document, choose **Open beside**), measured on the documents window.
- **SC-002**: At 1280 px, three documents show side by side with no sideways page scroll and every
  pane at least 320 px wide; at 375 px exactly one pane shows and the tab strip lists all open
  documents. On desktop, maximizing then restoring brings back the same panes and sizes in 100% of
  attempts.
- **SC-003**: Opening a second pane adds no more than 200 ms to showing it on a page with 3,000
  documents, and the existing browser timings (opening the sheet, a move preview, the documents
  window) stay within their budgets.
- **SC-004**: After a reload the same panes, order, sizes, and views come back in 100% of attempts,
  including when one stored document was deleted.
- **SC-005**: With one document open, the page's height and layout at 375 and 1280 px differ by less
  than 1% from before this change.
- **SC-006**: Every roll started in a pane names that pane's document in 100% of cases, checked with
  two characters of different names.
- **SC-007**: In each pane, the brief of the Star Wars character keeps the heights of spec 033 for
  the pane's width (at most 700 px tall in a 375 px pane, at most 400 px in a 640 px pane).

## Assumptions

- Panes show documents the app already has (the shipped character-like kinds and user types);
  markdown and canvas documents join later without changing this feature's rules.
- Each pane is editable, like the current sheet; a read-only mode is deferred to the online part
  with the backend, where access rights matter.
- Tabs follow pane order; dragging tabs to reorder or to split into groups (as in a code editor) is
  not part of this change.
- The arrangement is a per-device reading preference, not a document property: it is not exported
  with documents, not synced between tabs while open, and not undoable.
- Moving, resizing, stacking, and docking windows (floating windows) belong to T-113; this feature
  only tiles panes inside the sheet page.
- The Library and dice panels are not panes in this change (T-113).
- The limit of six panes and the 320 px minimum are the defaults chosen here; both are easy to
  revisit after the maintainer tries them.
