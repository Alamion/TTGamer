# Feature Specification: Denser Brief Layouts

**Branch**: `033-dense-brief-layouts` | **Created**: 2026-10-14 | **Status**: Draft

**Input**: "T-056 Denser brief layouts: a brief sheet fits one phone screen or a quarter of a
desktop screen. CompactRating labels shorten to three uppercase letters with minimal label-to-value
spacing, and the other element kinds tighten the same way, so far more field groups fit without
losing information or visible grouping. Prerequisite for the embedded brief cards of T-051 and T-059
and for several documents on one screen (T-112). Check the result carefully on a phone and a
desktop, light and dark."

## Context

Every document kind has a **brief**: the short view a GM glances at during play, or that will be
embedded as a card inside another page (T-051, T-059) or shown beside other documents (T-112). Today
a brief is a single column of full-word rows: the shipped Star Wars character brief is about 2,500
px tall on a phone (nine attributes, thirty-four abilities, one row each), more than three screens,
so it is not a glance and cannot be a card. The layout also follows the browser window, not the area
the brief is drawn in, so a brief inside a narrow window or card still lays out as if it had the
whole screen. Backlog entry: T-056 in `TODO.md`.

## Clarifications

### Session 2026-10-14

- Q: Where do short labels come from? → A: Written by hand for every shipped trait in both
  languages; user-defined traits get a derived one (first three letters), editable by the author.
- Q: Which concept layout, and are the target heights right? → A: Cells (one row per rating, groups
  as columns) in narrow areas and Pills (label and value in one chip, flowing inside each group) in
  wide areas, chosen by the area width; heights of 700 px (phone) and 400 px (640 px area) stay.
- Q: Is a density setting needed? → A: Not decided; the brief stays always compact in this change. A
  per-element option may be added later and is out of scope here.

## User Scenarios & Testing

### User Story 1 - Read a character brief on a phone at a glance (Priority: P1)

A player at the table opens a character in the brief view on their phone. The attributes and
abilities appear as short, aligned cells (a three-letter label and its value, three or more cells
per row), grouped under the same headings as today, so the whole brief is about one screen tall and
every group is still visible as a group.

**Why this priority**: the brief exists to be read at a glance; one phone screen is the stated goal
and the measure every other story builds on.

**Independent Test**: open the shipped Star Wars character brief in a 375 px wide area and measure
its height; read every label; compare the visible values with the full sheet.

**Acceptance Scenarios**:

1. **Given** a Star Wars character in the brief view at 375 px wide, **When** it is drawn, **Then**
   its total height is at most 700 px, attributes and abilities show as short labels with their
   values, and each group keeps its heading.
2. **Given** a short label, **When** the reader hovers it, focuses it, or taps it, **Then** the full
   name (and the book hint, where the label has one) is available, and a screen reader announces the
   full name, not the three letters.
3. **Given** the same brief in the light and the dark theme, **When** compared, **Then** every
   label, value, and group boundary is readable in both with the project's palette colors only.
4. **Given** a Hunter brief, **When** drawn at 375 px, **Then** it is as dense as the Star Wars one
   by the same rules, with its own short labels.

---

### User Story 2 - Every element kind tightens the same way (Priority: P2)

A brief mixes several element kinds: ratings, current/maximum resources, text fields, condition
tracks, trackers, tables and lists, section headings, and the helper banner. Each one has a compact
form that follows one spacing rhythm (one gap between cells, one between groups), so the brief reads
as one dense page and not as dense ratings among loose rows.

**Why this priority**: a dense rating grid beside loose resources and tracks would hide the gain;
the backlog asks for "the other element kinds tighten the same way".

**Independent Test**: for each element kind that has a compact form, render it in a brief and check
its height and spacing against the shared rhythm; compare the brief before and after for lost data.

**Acceptance Scenarios**:

1. **Given** a brief with a resource (current/maximum), a condition track, a text field, and a list
   in compact form, **When** drawn, **Then** each is shorter than today's form and none loses a
   value, a label, or its edit control.
2. **Given** a compact element that is read-only, hidden by a display condition, or empty, **When**
   drawn, **Then** it follows the same rhythm and takes no more room than a filled one.
3. **Given** a section marked collapsible, **When** the reader collapses and expands it, **Then**
   the heading, the state, and the keyboard behavior are unchanged.

---

### User Story 3 - A brief fits the area it is drawn in (Priority: P3)

A brief is shown in an area that may be a quarter of a desktop screen: a window beside others, a
card embedded in a page, a narrow column. The brief decides its number of columns and its density
from the width of that area, not from the browser window, so the same brief is right on a phone, in
a quarter of a desktop screen, and in a full-width view.

**Why this priority**: T-051, T-059, and T-112 will place briefs in areas of every size; fixing this
now keeps those features from each inventing their own layout rules.

**Independent Test**: draw the same brief in areas 320, 375, 640, and 1280 px wide inside a larger
window and check the columns, the height, and the absence of horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** a brief drawn in a 640 px wide area on a 1280 px wide screen, **When** drawn, **Then**
   its height is at most 400 px (a quarter of a 1280 × 800 screen) and it shows no horizontal
   scroll.
2. **Given** a brief in a 320 px wide area, **When** drawn, **Then** it has no horizontal scroll and
   no clipped value; the cells reflow into fewer columns.
3. **Given** the same brief in a 1280 px wide area, **When** drawn, **Then** it uses the room (more
   columns or larger cells) and does not stretch three-letter labels across the screen.
4. **Given** the full sheet view of any document, **When** drawn, **Then** it is as tall and laid
   out as before this change.

---

### User Story 4 - Author a dense brief in the template editor (Priority: P4)

Someone building a brief page in the template editor chooses the short label form for a rating and
the compact form of the other elements from the element's settings, sees the result at once in the
editor preview, and the saved page behaves like the shipped ones.

**Why this priority**: the project builds shipped pages from the same elements user pages use
(constitution VI); a density only shipped pages can have would split them.

**Independent Test**: in the editor, switch a rating to its short form, check the preview and the
storybook, save, and open a document on that page.

**Acceptance Scenarios**:

1. **Given** a rating element, **When** the author turns on the short label, **Then** the preview
   shows the three-letter label with the same hint and accessible name as a shipped brief.
2. **Given** a user-defined trait with no short form of its own, **When** the short label is on,
   **Then** a short form is still shown (see Assumptions) and the author can see and change it.
3. **Given** a page saved before this change, **When** opened, **Then** it looks as it did.

### Edge Cases

- Two labels in one group would shorten to the same three letters: the short forms of a group are
  unique; a clash is resolved when the labels are defined, and a clash found at draw time falls back
  to the full label for the later one rather than showing two identical cells.
- A short label in Russian or another script: the three letters are of that language's own label,
  never the English one's; a label shorter than three letters is shown as it is.
- A value of four digits or a very long text value in a cell: the cell grows to fit it and the row
  wraps; a value is never cut off.
- A touch screen: the cell is small to read but its edit control keeps a hit area large enough to
  tap (see FR-008); long press and hover hints work as they do elsewhere on the sheet.
- A brief with a document-type's user-defined groups and no columns set: it uses the same column
  rules as a shipped brief.
- Printing or exporting a brief: not part of this change.

## Requirements

### Functional Requirements

- **FR-001**: A rating in its short form MUST show a label of three uppercase letters by default (up
  to four when its author sets one; the whole label when it has fewer) and its value with no more
  space between them than one gap of the shared rhythm; the label is the language's own (English and
  Russian).
- **FR-002**: The full name of a short label MUST remain available: as the accessible name of the
  control, as a hint on hover and focus, and on tap, together with the book-term hint the label
  already has.
- **FR-003**: Short labels of one group MUST be unique among that group's ratings.
- **FR-004**: Every element kind that has a compact form (rating, resource, text field, condition
  track, tracker, list or table, section heading, helper banner) MUST use one spacing rhythm: one
  gap between cells, one between rows, one between groups.
- **FR-005**: A compact form MUST NOT drop a value, a label, an edit control, a unit, or a visible
  group boundary that the previous compact form had.
- **FR-006**: A brief MUST choose its column count and cell size from the width of the area it is
  drawn in, not from the browser window, so that the same brief drawn in a narrow window, a card, or
  a full screen lays out for that width.
- **FR-007**: The shipped character briefs of every shipped system (Star Wars character, droid,
  creature, vehicle, fodder group, V5 core, Hunter) MUST be re-laid out under these rules and MUST
  keep the headings and groups they have.
- **FR-008**: On a touch screen, every edit control in a brief MUST keep a hit area of at least 32
  px in its smaller side, even where its visible cell is smaller.
- **FR-009**: A rating MUST offer its short form as a setting in the template editor, and the other
  compact forms MUST remain settings of their elements; user templates and shipped templates use the
  same settings.
- **FR-010**: The element storybook (constitution VI) MUST show each changed element with its short
  and its regular form, in the light and the dark theme.
- **FR-011**: The user guide page for the template editor MUST describe the short label and the
  compact forms, in English and Russian.
- **FR-012**: Pages and documents saved before this change MUST open unchanged: stored values,
  template ids, and saved pages need no migration, and the full sheet views keep their layout.
- **FR-013**: All text added by this change (hints, settings, descriptions) MUST exist in English
  and Russian.
- **FR-014**: In an area narrower than one threshold (about 450 px) a short-form rating MUST be
  drawn as one row per rating, groups side by side as columns; from that width up, as a chip holding
  the label and the value, chips flowing inside their group. One threshold decides both looks.

### Key Entities

- **Short label**: the short (three-letter by default) form of a rating's label in one language,
  defined beside the full label, unique within a group.
- **Brief**: the compact view of a document, drawn in an area of any width; a shipped template per
  document kind.

## Success Criteria

- **SC-001**: At 375 px wide, the shipped Star Wars character brief is at most 700 px tall (today
  about 2,500 px), and every shipped brief is at least 50% shorter than before at that width.
- **SC-002**: In a 640 px wide area, the shipped Star Wars character brief is at most 400 px tall.
- **SC-003**: In areas from 320 px to 1280 px wide, no shipped brief has a horizontal scroll or a
  clipped value, and at 1280 px it is not taller than at 640 px.
- **SC-004**: For every short label, 100% have the full name as their accessible name and as a hint,
  checked by one test over every shipped brief in both languages.
- **SC-005**: In the light and the dark theme, every label and value of a shipped brief uses only
  colors the application already defines, and each text and background pair has a contrast ratio of
  at least 4.5:1 (checked by a calculation over the palette tokens).
- **SC-006**: Every edit control in a brief has a pointer target of at least 32 px on a touch
  screen. To give each control its own target, rows grow to 32 px there, so the Star Wars character
  brief is about 720 px tall on a touch screen at 375 px (SC-001 is measured with a mouse pointer).
- **SC-007**: The full sheet views and saved pages are unchanged: their heights at 375 and 1280 px
  differ by less than 1% from before this change, and a page saved before it opens identically.
- **SC-008**: The existing browser timings (opening the sheet, an edit, a move preview) stay within
  their budgets.

## Assumptions

- Density is the brief's own character: the brief is always compact; there is no per-user comfort
  setting in this change.
- The width that decides the layout is the area the brief is drawn in; the sheet page is such an
  area too, so a brief shown there follows the same rules, and full sheet views keep their layout.
- A trait with no authored short label gets one from the first three letters of its label, shown in
  the editor so the author can change it; shipped traits get authored short labels where the first
  three letters would clash or read badly. A shipped rating that is not a glossary term (for example
  creature pools) keeps its full label unless its node sets a short label.
- The documents window, embedded cards, and several documents on one screen are not built here
  (T-051, T-059, T-112); this change only makes the brief fit their areas.
- Printing and export of briefs, and the Hunter v5 dice-roll behavior of ratings, are unchanged.
