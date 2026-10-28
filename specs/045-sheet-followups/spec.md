# Feature Specification: Sheet follow-ups after links

**Branch**: `045-sheet-followups` | **Created**: 2026-10-28 | **Status**: Draft

**Input**: "Sheet follow-ups after links (T-059, T-102, T-111, T-083, F-010): sheet hints show the
chosen documentation fragment in place (reusing the embed/preview mechanism); system badges in the
documents window and the loaded-document indicator, with a filter by system; a name for documents of
user-defined types from a text field, through a "document name" source in the template binding
contract; a tracker's total value as a numeric coordinate formulas can read (e.g. wound penalty in a
dice pool); picture entries a note's text no longer names are dropped on load or boot so their blobs
are freed."

## Context

Five small gaps left around the sheet after links between documents (spec 044):

- **T-059**: a section, group, or brief can point at a documentation page, but its "?" only opens
  that page in a new browser tab; the reader leaves the sheet to read one paragraph.
- **T-102**: the documents window can already filter and sort by system, but a row does not say
  which game a document belongs to, so a mixed collection (Star Wars, Hunter, notes, own types)
  reads as a flat list of names.
- **T-111**: documents of a user's own type have no name field: the list shows the type's name and
  dice rolls show no name at all, unless the document was named in the create dialog or renamed in
  the documents window.
- **T-083**: a template author cannot use a tracker in a formula. A wound penalty shown on the sheet
  never reaches a dice pool; a formula naming a tracker reports "not a number". Built-in wound
  penalties (Star Wars wound levels) are shown but not readable either.
- **F-010** (`TOFIX.md`): a picture removed from a note's text keeps its stored file when the page
  closes before the text is left, and nothing ever finds such leftovers.

## User Scenarios & Testing

### User Story 1 - Read the rule without leaving the sheet (Priority: P1)

A player looks at the Disciplines section of a sheet and presses its "?". A card opens next to it
with that part of the rules (the heading and what follows until the next heading of the same level),
in the reader's language. The card has "Open the page" for the full chapter.

**Why this priority**: the hint is the most-used way into the rules from a sheet; reading in place
keeps the table moving.

**Independent Test**: on a shipped sheet with a docs link, press "?" and read the fragment in the
card; press "Open the page" and land on the same heading.

**Acceptance Scenarios**:

1. **Given** a section whose docs link is a site page with an anchor, **When** the reader presses
   its "?", **Then** a card shows that heading and its text up to the next heading of the same or
   higher level, and the sheet stays where it was.
2. **Given** the same "?", **When** the reader Ctrl-clicks or middle-clicks it, **Then** the page
   opens in a new tab as today, with no card.
3. **Given** the site in Russian, **When** the card opens, **Then** it shows the Russian page's
   fragment (shipped links target headings that exist in both languages).
4. **Given** a docs link to an external `https://` address, **When** the reader presses "?",
   **Then** it opens in a new tab as today (no card).
5. **Given** a docs link without an anchor, **When** the card opens, **Then** it shows the page's
   first section (title and the text before the first subheading).
6. **Given** the page cannot be loaded (offline, removed page, missing heading), **When** the card
   opens, **Then** it says so and keeps "Open the page"; the problem is reported once.
7. **Given** a phone, **When** the reader taps "?", **Then** the card opens the same way and closes
   on a tap outside or Esc; it scrolls when the fragment is longer than the screen.

---

### User Story 2 - Tell games apart in the documents window (Priority: P2)

A GM keeps Star Wars characters, Hunter cells, notes, and an own "Faction" type in one collection.
Each document row in the documents window shows a small badge with its game; the badge's full name
is in its tooltip and accessible name.

**Why this priority**: cheap, and the documents window is where mixed collections are managed.

**Independent Test**: with documents of three systems, open the documents window and read each row's
badge.

**Acceptance Scenarios**:

1. **Given** documents of several systems, **When** the documents window lists them, **Then** each
   document row shows its system badge after its name; folders show none.
2. **Given** a document of a user type or user setting, **When** it is listed, **Then** its badge is
   the game system the type belongs to.
3. **Given** every document in the collection belongs to one system, **When** the list is shown,
   **Then** no badge is shown (it would say nothing).
4. **Given** a system filter is active, **When** the list is shown, **Then** badges are hidden too
   (every row has the same one).
5. **Given** a note of the "General" kind, **When** it is listed among game documents, **Then** it
   shows a "General" badge, so the reader sees it belongs to no game.

---

### User Story 3 - Name documents of my own types (Priority: P2)

A GM made an own type "Faction". In the template editor they set its "Title" text field to store
**Document name**. A new faction's title typed on the sheet becomes its name in the documents
window, in links, and in dice rolls; renaming it in the documents window updates the field.

**Why this priority**: own types are first-class documents since spec 044 made names link targets; a
type with no name is hard to link.

**Independent Test**: on an own type, choose **Document name** for a text field, type a name on the
sheet, and see it in the list, a `[[link]]` suggestion, and a roll's name.

**Acceptance Scenarios**:

1. **Given** a text field on any page, **When** the author opens its value source, **Then** an own
   kind offers **Document name**; a built-in kind offers its own name field, which already is the
   document's name.
2. **Given** a field storing the document name, **When** the reader types in it, **Then** the
   document's name changes as when renamed in the documents window (links to it are kept, spec 044).
3. **Given** the document is renamed in the documents window, **When** the page is shown, **Then**
   the field shows the new name.
4. **Given** a page of an own type with no field storing the name, **When** the author saves it,
   **Then** the editor's existing hint says the documents will show no name of their own.
5. **Given** a document with an empty name, **When** it rolls, **Then** the roll is named after its
   type, as the list already does.

---

### User Story 4 - Use a tracker in a formula (Priority: P2)

A template author gives a custom health tracker levels with values (0, -1, -2, -5) and a "Strike"
button whose pool is `{max(1, dexterity + wounds)}d10`. When the reader marks two levels, the pool
shrinks by the level's value. The Star Wars character's wound penalty can be used the same way.

**Why this priority**: closes the last loop of configurable trackers (spec 018 kept it possible).

**Independent Test**: a template with a tracker and a button whose pool names it; mark boxes and see
the rolled notation change.

**Acceptance Scenarios**:

1. **Given** a tracker with numeric level values that totals "deepest", **When** its deepest marked
   level has the value -2, **Then** a formula reading the tracker gets -2.
2. **Given** a tracker that totals "count", **When** three boxes are filled, **Then** a formula
   reading it gets 3.
3. **Given** nothing is marked, **When** a formula reads the tracker, **Then** it gets 0.
4. **Given** the deepest marked level's value is not a number (for example "Out"), **When** a
   formula reads it, **Then** the formula reports "not a number" the way a text field does.
5. **Given** a tracker whose marks column has several reader copies (one per gang member), **When**
   a formula reads the tracker, **Then** it reads the worst copy: the one marked deepest for a
   tracker totaling "deepest" (whatever the sign of its value), the most filled for one totaling
   "count".
6. **Given** the formula editor, **When** the author types a formula, **Then** trackers are
   suggested with the other numeric values.
7. **Given** a built-in health tracker with level penalties (Star Wars wounds), **When** a formula
   names it, **Then** it reads the current penalty as a number.

---

### User Story 5 - Removed pictures free their space (Priority: P3)

A player deletes a picture's line from a note and closes the tab at once. The next time the note is
opened, the picture's entry is dropped and its stored file deleted. Leftover stored pictures no
document names are found and deleted too.

**Why this priority**: storage hygiene; no visible harm today besides used space.

**Independent Test**: store a note whose value names a picture its text does not use; reload and
open it; the entry and its stored file are gone.

**Acceptance Scenarios**:

1. **Given** a note value with a picture its text does not name, **When** the note is opened,
   **Then** the entry is dropped and its stored file deleted.
2. **Given** a stored picture that no document names (portrait or note picture), **When** the app
   has started and is idle, **Then** the file is deleted.
3. **Given** a deleted document waiting for its purge (undo still possible), **When** the sweep
   runs, **Then** its pictures are kept.
4. **Given** the reader is still editing (the text field has focus), **When** a picture line is
   removed, **Then** the entry stays until the text is left, so undo can bring it back (as today).

### Edge Cases

- A docs fragment shows its widgets (live rolls, tables) as on the page; links inside it open the
  docs in a new tab.
- A docs link with an old path that the site redirects is followed to its target page.
- A tracker named in its own length or bounds formula is a cycle and is reported as one.
- The orphan sweep never deletes a file written in the same session (a picture being added).

## Clarifications

### Session 2026-10-28

- Q: Does a General note carry a badge? → A: yes, "General".
- Q: What does a tracker with several copies read? → A: the worst copy.
- Q: Do V5 Health and Willpower enter formulas? → A: yes, as their count of filled boxes.
- Q: How does "?" behave on a computer when its link is a site page? → A: a click opens the card;
  Ctrl-click or a middle click opens the page in a new tab.
- Q: Which copy is the worst when level values may be penalties or bonuses? → A: the copy marked
  deepest (for a count total, the most filled); the formula gets that level's value.

## Requirements

### Functional Requirements

- **FR-001**: A click on a container's site docs link MUST open a card with that page's fragment in
  the reader's language, with a way to open the whole page; Ctrl-click or a middle click MUST open
  the page in a new tab as today; external links MUST stay links.
- **FR-002**: The fragment MUST run from its heading to the next heading of the same or higher
  level; without an anchor, from the page start to its first subheading.
- **FR-003**: A heading missing from the page (for example a user's English anchor on the Russian
  site) MUST show the page's first section with a visible note; an unavailable page MUST show a
  message; both MUST be reported once per link. Every shipped docs link MUST resolve in both
  languages.
- **FR-004**: Fragments MUST load only when a card opens, and each page at most once per session.
- **FR-005**: Every document row of the documents window MUST show its system as a badge with an
  accessible full name, except when the badge would be the same on every shown row.
- **FR-006**: Each system MUST have a short badge label in both languages; own types and settings
  MUST show the badge of the system they belong to.
- **FR-007**: Any text field MUST be able to store the document's name: through the kind's own name
  field where it has one, through a "Document name" source otherwise (own kinds); editing either
  side MUST update the other.
- **FR-008**: The editor's "no name" hint MUST cover own types.
- **FR-009**: A roll from a document with an empty name MUST be named after the document's type.
- **FR-010**: A tracker MUST be readable in formulas as a number: its deepest marked level's value
  or its fill count, as its total setting says, taking the copy marked deepest (or most filled) of
  several; 0 when nothing is marked; "not a number" for a non-numeric level value.
- **FR-011**: Trackers MUST be offered among numeric values in formula suggestions and checked for
  cycles like other values.
- **FR-012**: Built-in trackers MUST be readable the same way: their numeric level penalty, or their
  count of filled boxes when their levels carry none (V5 Health, Willpower).
- **FR-013**: Opening a document MUST drop the picture entries its markdown text no longer names,
  outside active editing.
- **FR-014**: After start-up, at idle, stored pictures that no live or pending-purge document names
  MUST be deleted, reusing the read the link index already makes of every document.

### Key Entities

- **Docs fragment**: a heading of a documentation page and its text, per language.
- **System badge**: a short label of a game system, with its full name.
- **Document name source**: a value source binding a text field to the document's name.
- **Tracker reading**: the number a tracker gives formulas.

## Success Criteria

- **SC-001**: A docs fragment card shows its text within 500 ms of the press when the page was read
  before, and within 1 s on the first read of a page.
- **SC-002**: Opening the documents window with 3,000 documents is no slower than today by more than
  10%.
- **SC-003**: A reader can name an own-type document from its page and find it by that name in link
  suggestions, with no step in the documents window.
- **SC-004**: A dice pool reading a tracker changes on the next roll after a box is marked.
- **SC-005**: After a reload, no stored picture remains that no document names (checked in tests
  with orphans planted).
- **SC-006**: The idle sweep adds no read of document records beyond the link index's.

## Assumptions

- Fragments come from the built documentation site itself (the same address the "?" opens today); in
  development the dev server serves them. No separate content index is built for this spec.
- Hints stay on containers (sections, groups, briefs) as today; fields get no docs links here.
- The "loaded-document indicator" named in T-102 does not exist; no new toolbar element is added.
  The current document keeps its "current" badge in the list.
- The filter by system already exists (documents window toolbar) and is not changed.
- Formula names for trackers follow other fields: the tracker's key. A text column has no reading.
- Built-in trackers whose levels carry no numeric penalty (V5 Health, Willpower) read their count of
  filled boxes (their damage), for conditions such as `if(health >= 7, …)`.
- Wound penalties are not applied to dice pools automatically; authors opt in through formulas.
- Only documents store pictures on the device (portraits, image fields, note pictures); library
  items and templates do not, so a picture no document names is safe to delete.
