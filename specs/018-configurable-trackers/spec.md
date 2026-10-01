# Feature Specification: Configurable trackers

> **Change record.** Partly superseded by 019 (the legend is a brush; a box holds a fill and an outline mark, boxes are smaller). Current tracker behavior: `.agents/skills/sheet-templates/SKILL.md`.

**Feature Branch**: `testing`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "T-078: Configurable trackers — template authors build custom trackers
beyond health and damage, enough to rebuild the Star Wars fodder-group health tracker from the
template element alone. The compact switch and the tracker view merge into one setting; the
penalty column is editable (title, per-level values, hide); authors add marks or text columns,
each with its own level count, optionally repeated by the sheet's user. Approved prototype:
`specs/018-configurable-trackers/prototype.html` (v2, 2026-09-30)."

## Scope

| Backlog | Entry                 | Role in this feature |
| ------- | --------------------- | -------------------- |
| T-078   | Configurable trackers | User Stories 1–7     |

A tracker is a sheet element made of levels (rows such as "Bruised … Incapacitated") and boxes
the sheet's user marks as damage, stress, or any other burden. Today every tracker is built into a
game system: health and willpower, vehicle and droid damage, and the member tracks of creatures,
vehicles, and fodder groups. The author can only place one on a page and choose between a table
and a strip, and a separate "compact" switch overlaps with that choice. Level names, the penalty
column, the kinds of marks, and the column titles all come from the game and cannot change.

This feature adds a **Tracker** field with its own values that any template can use, including
pages of user document types, and gives the built-in trackers the same settings. The prototype
is the approved reference for the editor and the sheet.

Maintainer decisions (2026-09-29 and 2026-09-30):

- The tracker is a new own-value field; built-in trackers get exactly the same settings, aiming at
  full parity between built-in and own trackers.
- Built-in trackers may get extra columns; those columns keep their values on the page.
- The author chooses the kinds of marks: one mark, two (bashing ╱ and lethal ×), three as in WoD
  20th (adding aggravated ✱ on violet), or their own kinds with their own symbol and fill. Marks
  look like today's filled squares.
- The total row shows the value of the deepest marked level on every tracker, built-in trackers
  included. It is set off by a thicker divider in the table's border color, with no background.
- Fodder-group parity is proven in the storybook and tests; the shipped Star Wars template and
  its data stay unchanged.

Out of scope (recorded as follow-ups):

- Formulas reading a tracker (for example its total value, to subtract from a dice pool). The
  stored shape must keep this possible; a later task builds it.
- A tracker as a custom list entry type (spec 016) or a table column: copies already repeat it.
- A square look for the toggle field, like a tracker mark, next to today's round dot.
- Migrating the shipped Star Wars fodder group or any stored document to the new field.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Add an own tracker to any page (Priority: P1)

A template author adds a Tracker field to a page, of a shipped setting, a user setting, or a user
document type. They name it, choose its levels (each with a name and an optional value such as a
penalty), choose its marks, and see it on the sheet. The sheet's user marks boxes by clicking;
each click moves a box to the next kind of mark, then back to empty. The values stay with the
document.

**Why this priority**: This is the core of the task: a tracker without a game system behind it.

**Independent Test**: On a page of a user type, add a Tracker, set five levels with values and one
mark, open a document, mark two boxes, reload, and check the marks and the total.

**Acceptance Scenarios**:

1. **Given** a page of any setting or user type, **When** the author opens the element palette,
   **Then** a Tracker field is offered, and a new one starts as a seven-level health track with
   the penalties 0, −1, −1, −2, −2, −5, and none, and two marks (bashing ╱, lethal ×).
2. **Given** a tracker, **When** the author adds, renames, reorders (up or down), or removes levels,
   **Then** the sheet follows; there is always at least 1 level and at most 20.
3. **Given** a tracker, **When** the author renames the value column (for example "Bonus"), changes
   a level's value, or hides the column, **Then** the sheet shows that title and those values, or no
   value column.
4. **Given** a sheet, **When** the user clicks an empty box, **Then** it gets the first mark; further
   clicks step through the marks in order, and a click on the last mark empties the box.
5. **Given** marked boxes, **When** the document is saved and reopened, **Then** the marks are the
   same.
6. **Given** a read-only sheet, **When** it shows a tracker, **Then** the marks show and cannot be
   changed.

---

### User Story 2 - Choose the kinds of marks (Priority: P1)

The author chooses which marks a box can take. They start from a ready set: one mark, two marks
(bashing ╱, lethal ×), or three as in WoD 20th (bashing ╱, lethal ×, aggravated ✱). They can also
make their own. Each mark has a name, a symbol of one or two characters, and a fill: one of the
app's colors, which follows the light and dark themes, or a color of their own. Later marks count
as heavier. A legend under the tracker names the marks when there is more than one.

**Why this priority**: The maintainer's key request: WoD 20th needs aggravated damage, and other
games need other marks.

**Independent Test**: Pick the WoD 20th set, check the violet ✱ mark on the sheet and in the legend,
then add a fourth mark with an own color and check the click order.

**Acceptance Scenarios**:

1. **Given** the mark settings, **When** the author picks a ready set, **Then** the tracker's marks
   are replaced by that set.
2. **Given** the marks, **When** the author adds, renames, changes the symbol or fill of, reorders
   (up or down), or removes a mark, **Then** the sheet and the legend follow; there is always at
   least 1 mark and at most 5.
3. **Given** a mark, **When** it fills a box, **Then** the box is a solid square in the mark's fill,
   with the symbol centered in white, the way marks look today.
4. **Given** a mark with an app color, **When** the theme switches, **Then** the fill follows the
   theme; a mark with its own color keeps it.
5. **Given** stored marks, **When** the author removes a mark kind, **Then** the editor says how many
   stored marks the change affects before it applies, as for other changes that drop stored
   values; reordering kinds keeps every stored mark on its kind.
6. **Given** more than one mark, **When** the sheet shows the tracker as a table or a strip, **Then** a
   legend lists each mark's box and name, each symbol centered in its box.

---

### User Story 3 - One display setting (Priority: P1)

The author picks how the tracker shows from one setting with three choices: **Table** (levels as
rows), **Strip** (a row of boxes per column), and **One line** (small boxes with the label inline,
no length control, for brief pages). The old "Compact" switch and "Tracker view" are gone; pages
that used them look the same as before.

**Why this priority**: The overlap is a named part of the backlog entry, and every tracker uses it.

**Independent Test**: Switch a tracker through the three choices; open a template saved before this
feature with "Compact" on, and check that it shows as one line.

**Acceptance Scenarios**:

1. **Given** a tracker, **When** the author picks Table, Strip, or One line, **Then** the sheet shows
   it that way, own and built-in trackers alike.
2. **Given** a template saved with "Compact" on, **When** it loads, **Then** its tracker shows as One
   line.
3. **Given** a template saved with a tracker view and "Compact" off, **When** it loads, **Then** its
   tracker shows in that view; with neither set, it shows as today (a table for named levels, a
   strip for a track whose length the game computes).

---

### User Story 4 - Columns and copies (Priority: P2)

The author adds columns next to the levels: a **marks** column (boxes) or a **text** column (a short
note per level, such as "Source" or "Trigger"). Each column has a title and covers all levels or
only the first N. Any column can be repeatable: the sheet's user adds copies named A, B, C… up to a
maximum the author sets (1–24), and removes them.

**Why this priority**: Columns and copies are what the fodder group needs, and what the backlog
entry asks for beyond the penalty column.

**Independent Test**: Add a text column covering three levels and a repeatable marks column with a
maximum of 4; on the sheet add three copies, mark them, remove the middle one.

**Acceptance Scenarios**:

1. **Given** a tracker, **When** the author adds a marks or a text column, gives it a title, and sets
   the levels it covers, **Then** the sheet shows it with boxes or text inputs on those levels
   only. "The first N levels" counts the levels shown at the current length, in order.
2. **Given** a repeatable column with a maximum of N, **When** the user adds copies, **Then** they are
   named A, B, C… and the add control is disabled at N.
3. **Given** copies A, B, C, **When** the user removes B, **Then** its values are gone and the
   remaining copies are relabeled A, B; one copy always remains.
4. **Given** a tracker, **Then** it has at least one marks column; the last marks column cannot be
   removed.
5. **Given** the Strip or One line display, **When** the tracker has text columns, **Then** the strip
   shows marks only and says that text columns show in the table.

---

### User Story 5 - Totals, lengths, and "out" (Priority: P2)

The author turns on a **total row**: under the levels, the tracker shows for each marks column (and
each copy) the value of the deepest marked level. The author can let the sheet's user **switch the
length**: they list the lengths and the levels each one shows (like the fodder group's 3 / 5 / 7).
The author can mark a copy as **out** when its last shown level is marked.

**Why this priority**: These finish the fodder-group parity and give every tracker its penalty at a
glance.

**Independent Test**: Rebuild the fodder group as an own tracker (User Story 6) and compare the
total, the length switch, and "out" with the shipped fodder group.

**Acceptance Scenarios**:

1. **Given** the total row is on, **When** boxes are marked, **Then** the row shows the value of the
   deepest marked level per marks column and copy, or "—" when nothing is marked or that level has
   no value.
2. **Given** the table display, **Then** the total row is set off by a divider twice as thick as the
   row dividers, in the same color, with no background; the strip displays show the total after the
   boxes.
3. **Given** lengths are on, **When** the user makes the tracker shorter or longer, **Then** only the
   levels of that length show.
4. **Given** marks on levels a shorter length hides, **When** the user shortens, **Then** the app asks
   first, then folds those marks into the new last level, keeping the heaviest mark, as the fodder
   group does today.
5. **Given** "out" is on, **When** a copy's last shown level is marked, **Then** its header or name is
   struck through and its total reads "out".
6. **Given** lengths are on, **Then** the author can set 1 to 6 lengths, and each length shows at
   least one level.

---

### User Story 6 - Built-in trackers get the same settings (Priority: P2)

On a page with a built-in tracker (Star Wars health, droid and vehicle damage, WoD 2e health, V5
health and willpower, and the member tracks of creatures, vehicles, and fodder groups), the author
sees the same settings as for an own tracker. The game keeps what makes it a rule: the number and
order of levels and how the length is computed, the number of mark kinds, and where the marks are
stored (the document's own data). The author may still rename levels and marks, change level values
and the value column, recolor marks, pick the display, add extra columns, and turn the total row
on.

**Why this priority**: The maintainer wants full parity between built-in and own trackers. The
Star Wars health tracker with its total penalty row is the visible result.

**Independent Test**: On the Star Wars character page, add a text column "Source" to health and
turn the total row on; mark boxes and check the total and the source; open the same document
with a page without these settings and check that the marks are shared.

**Acceptance Scenarios**:

1. **Given** a built-in tracker, **When** the author opens its settings, **Then** the settings are the
   same as for an own tracker, with the game's parts shown as fixed: level count and order, the
   number of marks, and the built-in marks column.
2. **Given** a built-in tracker, **When** the author renames a level or changes its value, **Then** the
   other levels keep the game's values (today a level override clears every penalty).
3. **Given** a built-in tracker with an extra column, **When** the user fills it, **Then** its values
   are kept with the page's values for that document, and the built-in marks stay in the
   document's own data, readable by every other page and by the dice and docs integrations as
   today.
4. **Given** the shipped Star Wars character page, **When** it loads after this feature, **Then** its
   health tracker shows its total penalty row.
5. **Given** a built-in member track (creature, vehicle, fodder group), **Then** its members are the
   copies of its built-in marks column, added and removed as today, up to the game's maximum.
6. **Given** a built-in tracker whose length the game computes (V5 health and willpower), **Then** its
   length control works as today and the author's length settings are not offered.

---

### User Story 7 - Fodder-group parity (Priority: P3)

A storybook example rebuilds the Star Wars fodder group's health tracker as an own tracker: seven
health levels with their penalties, two marks, a repeatable "Health" column up to 12 members, the
lengths 3 / 5 / 7 with the same levels as the shipped group, the total row, and "out". Tests show it
behaves like the shipped tracker for the same marks.

**Why this priority**: It is the backlog entry's measure of done, but the shipped template and data
stay as they are, so users see no change from this story alone.

**Independent Test**: Run the parity tests; open the storybook and compare both trackers side by
side.

**Acceptance Scenarios**:

1. **Given** the same marks on both trackers, **When** they show at each length, **Then** they show
   the same levels, totals, and "out" states.
2. **Given** marks on hidden levels, **When** both are shortened, **Then** both fold them the same way.

---

### Edge Cases

- A level is removed or the levels are reordered while documents hold marks on it: marks follow
  their level; marks of a removed level are dropped after the editor says how many are affected.
- A column's coverage is reduced below levels with stored values: the values are kept but hidden,
  and return if the coverage grows again (as for other hidden values).
- A repeatable column is made non-repeatable while documents hold several copies: the first copy
  shows; the others are kept and the editor says so.
- A mark kind is removed while boxes hold it: those boxes become empty after the editor says how
  many are affected.
- A length hides levels that hold text column values: the values are kept, not folded.
- An own color close to the page background: the box keeps its 2 px border so it still reads as a
  box; contrast is the author's choice.
- A symbol longer than two characters is cut to two; an empty symbol shows a filled box with no
  symbol.
- Two marks with the same name or symbol are allowed; the legend lists both.
- The total row with the value column hidden: the total still shows the values, under the value
  column's title.
- A built-in tracker whose game has no penalties (V5): the value column starts hidden and empty;
  the author may fill it.
- A page with a tracker on a template imported from an older version: loads with the display
  mapped as in User Story 3 and no other change.
- Large values: 20 levels × 24 copies of a marks column stays usable (the table scrolls sideways
  within its own frame, not the page).

## Requirements _(mandatory)_

### Functional Requirements

**The Tracker field**

- **FR-001**: The template editor MUST offer a Tracker field on every page, of shipped settings,
  user settings, and user document types, placed and moved like other fields.
- **FR-002**: An own tracker's values MUST be stored with the document's other page values and
  validated when written; invalid stored values MUST be reported to the developer diagnostics
  (constitution III) and shown as empty, never break the sheet.
- **FR-003**: A tracker MUST have a label with a "show label" option, 1–20 levels, 1–5 marks, and at
  least one marks column.

**Levels and the value column**

- **FR-004**: Each level MUST have a name and an optional short value (any text, such as "−1" or
  "+2"); the author MUST be able to add, rename, move up, move down, and remove levels.
- **FR-005**: The value column MUST have an editable title and a show/hide option.

**Marks**

- **FR-006**: Each mark MUST have a name, a symbol of up to two characters, and a fill chosen from
  the app's palette colors (amber, red, violet, green, ink), which follow the theme, or an own color.
- **FR-007**: The editor MUST offer ready sets: one mark; two marks (bashing ╱ amber, lethal × red);
  three marks as in WoD 20th (adding aggravated ✱ violet).
- **FR-008**: The author MUST be able to add, edit, move up, move down, and remove marks; mark
  order is the click order, and later marks count as heavier.
- **FR-009**: A marked box MUST look like today's marks: a solid square in the mark's fill with a
  2 px border, the symbol centered in white (in the page background color on the ink fill, so it
  stays readable in both themes), bold monospace; an empty box shows the border only.
- **FR-010**: A click (or Enter/Space) on a box MUST move it to the next mark, and from the last
  mark to empty. Each box MUST have an accessible name with its level, its copy, and its current
  mark.
- **FR-011**: When a tracker has more than one mark, the Table and Strip displays MUST show a
  legend with each mark's box and name.

**Display**

- **FR-012**: A single Display setting MUST offer Table, Strip, and One line for every tracker, own
  or built-in, and replace the "Compact" switch and the "Tracker view" setting.
- **FR-013**: Stored templates MUST map as follows: "Compact" on → One line; otherwise the stored
  view; otherwise today's default (Table for named levels, Strip for a computed length).

**Columns and copies**

- **FR-014**: The author MUST be able to add marks and text columns, each with a title and coverage
  (all levels or the first N), and remove them, except the last marks column.
- **FR-015**: A column MUST have a "readers add copies" option with a maximum of 1–24; copies are
  labeled A, B, C… in order, relabeled after a removal, and at least one copy always remains.
- **FR-016**: Text cells MUST take one line of up to 200 characters.

**Reading the marks**

- **FR-017**: A total row option MUST show, per marks column and copy, the value of the deepest
  marked shown level, or "—"; in the table it sits under a divider twice as thick as the row
  dividers, in the same color, with no background.
- **FR-018**: An own tracker MUST offer lengths the sheet's user switches between (1–6), each
  listing the levels it shows; shortening MUST ask before folding marks of hidden levels into the
  new last level, keeping the heaviest mark.
- **FR-019**: An own tracker MUST offer an "out" option: a copy whose last shown level is marked is
  struck through and its total reads "out".

**Built-in trackers**

- **FR-020**: Every built-in tracker MUST offer the same settings as an own tracker, except the
  parts the game fixes: level count and order, a computed length, the number of mark kinds, the
  built-in marks column and its members.
- **FR-021**: Renaming a built-in level or changing one level's value MUST keep the game's values of
  the other levels.
- **FR-022**: Extra columns on a built-in tracker MUST store their values with the page's values for
  the document; the built-in marks MUST stay in the document's own data and keep working for every
  other reader (other pages, dice, docs, exports) as today.
- **FR-023**: The shipped Star Wars character page MUST show the total penalty row on health.

**Compatibility, limits, and quality**

- **FR-024**: Every shipped template and every template saved before this feature MUST load without
  error and look as before, apart from FR-013's mapping, FR-023, and the mark legend (FR-011),
  which built-in trackers now show because they have two marks.
- **FR-025**: Stored document data MUST NOT be migrated; the shipped fodder group stays as it is.
- **FR-026**: Editor changes that would drop stored values (removing levels, marks, columns, or
  copies, or reducing the copy maximum) MUST say how many stored values are affected before they
  apply, as the editor does for other value-dropping changes.
- **FR-026a**: Stored marks and texts that no longer show because the template changed (a removed
  level, mark kind, column, or copy) MUST be reported to the developer diagnostics once per render,
  except in the editor preview (constitution III), whether the change came from the editor, a
  template file, or the library.
- **FR-027**: The storybook MUST show the Tracker in each display, with one, two, three, and own
  marks, with text and repeatable columns, with lengths and "out", a built-in tracker with an
  extra column and total row, and the fodder-group parity example (constitution VI).
- **FR-028**: The editor guide (English and Russian) MUST document the Tracker field and the
  built-in trackers' settings; the sheet-templates skill and module notes MUST describe the
  current behavior.
- **FR-029**: New user-facing text MUST be available in English and Russian.
- **FR-030**: The stored tracker values MUST keep marks per column, copy, and level with their mark
  kind, so a later task can let formulas read a tracker's total without changing the stored shape.

### Key Entities

- **Tracker**: a field with a label, levels, marks, columns, a display, and optional total row,
  lengths, and "out"; own (values with the page) or built-in (marks with the document's data).
- **Level**: a row of the tracker, with a name and an optional value.
- **Mark kind**: a name, a symbol, and a fill; its position sets the click order and weight.
- **Column**: marks or text, with a title, coverage, and optional copies with a maximum.
- **Copy**: one instance of a repeatable column (A, B, C…), holding its own marks or texts.
- **Length**: a set of shown levels, named by its level count, the sheet's user switches between.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An author builds a working seven-level health tracker with three marks on a new page
  in under 3 minutes, without reading the guide.
- **SC-002**: The own-tracker rebuild of the fodder group matches the shipped one in 100% of the
  parity cases (each length, marks folded on shortening, totals, "out").
- **SC-003**: 100% of shipped templates and of templates saved before the change load without error,
  and every tracker on them shows the same levels and marks as before.
- **SC-004**: Every built-in tracker offers every own-tracker setting except those FR-020 lists as
  fixed by the game.
- **SC-005**: No editor change drops stored tracker values without first saying how many are
  affected.
- **SC-006**: Every mark's symbol is centered in its box in the tracker, the legend, and the editor
  preview, in both themes.

## Assumptions

- A new Tracker starts from the familiar seven-level health track so it is useful at once; the
  author changes it from there.
- Level values are short free text, not numbers: they may be penalties, bonuses, or words. Reading
  them as numbers belongs to the formulas follow-up.
- "Heavier" marks (for folding on shortening) follow the mark order, as the shipped fodder group
  treats a cross as heavier than a slash.
- The built-in trackers' mark kinds map to today's slash and cross in order; renaming or
  recoloring them changes only how the page shows them.
- The palette colors are the app's secondary (amber), error (red), tertiary (violet), success
  (green), and text (ink) colors; the violet is the tertiary accent used for edge cases.
- Lengths and "out" stay own-tracker settings: built-in trackers keep their game's length rules and
  defeat state.
- The limits (20 levels, 5 marks, 24 copies, 6 lengths, 200-character text) follow today's limits
  for similar elements (members up to 24) and keep a sheet usable on a phone.
