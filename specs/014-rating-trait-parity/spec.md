# Feature Specification: Rating element parity with trait rows

**Feature Branch**: `testing`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "T-073: Rating element parity with trait rows — a template rating looks and works like the system attribute and skill rows. Optional label on the left, optional free-text input between the label and the dots, dots on the right; optional current/maximum numbers, off by default. The 'boxes' style is removed; stored 'boxes' ratings load as dots. Both remaining styles (dots, number) take an optional die symbol that rolls through the document system's dice rule, with the rating's label in the roll details; the dot style also takes the S/P/E flags. A computed maximum decides the range up to the schema limit, instead of writes stopping at the static maximum. Keep the compressed look of many dots, and give every dot a hitbox that fills its cell with no gaps."

## Scope

| Backlog | Entry                                 | Role in this feature |
| ------- | ------------------------------------- | -------------------- |
| T-073   | Rating element parity with trait rows | User Stories 1–5     |

A template author who adds a rating to a page expects it to behave like the attribute and skill
rows on the shipped sheets: label on the left, dots on the right, a die to roll it, flags for a
specialty. Today the rating is a separate control. It stacks its label above a row of small
buttons, always prints "current/max" after them, cannot roll, and has a "boxes" style that is
only paler dots. A maximum computed from another value draws extra dots, but clicking them stops
at the static maximum. With many dots the buttons are hard to hit, because only the round shape
reacts to a click and the gaps between dots do not.

Spec 012 already made the dots one per point and turned the minimum into a floor. This feature
finishes the parity.

Out of scope:

- System-bound fields (attributes, skills, resources that come from the document's own data) keep
  their current settings; making their settings match custom fields is T-058.
- Independent boxes, such as a damage track or checkbox cells, belong to configurable trackers
  (T-078).
- Denser brief layouts (T-056).

## Clarifications

### Session 2026-09-26

- Q: What happens to the "boxes" (cells) style? → A: It is removed. Only "dots" and "number"
  remain. Stored templates with "boxes" load as dots and keep their values (maintainer).

### Review 2026-09-27

- Q: A number rating with "current / maximum" shows the current value twice. → A: The number
  style puts a read-only "/ max" inside the input's frame, like a resource; the dots keep the
  numbers after them (maintainer).
- Q: Where does a field's label go? → A: Every template field gets a label position, above the
  value (caption style) or beside it (trait-row style); ratings and derived values default to
  beside, other fields to above (maintainer).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A rating reads like a trait row (Priority: P1)

A template author adds a rating "Renown" with maximum 5 to a page. On the sheet it looks like the
attribute rows of the shipped Star Wars and V5 sheets:

- the label is on the left, on the same line as the dots;
- the dots are on the right, the same size and spacing as a trait's dots;
- a dot is filled up to the value; clicking the filled top dot lowers the value by one.

The author can hide the label, as with any field. The author can also turn on a free-text input
between the label and the dots, for example for a specialization. The sheet's user types into it
and the text is kept with the document. An option shows the numbers "current / maximum" to the
right of the dots. It is off by default, so a new rating shows no numbers.

**Why this priority**: This is the core of the backlog entry. A rating that looks foreign on the
page is the complaint.

**Independent Test**: Put ratings with and without a label, with and without the text input, and
with numbers on and off next to a shipped attribute row. Compare the layout, then click dots and
type text and check what is stored.

**Acceptance Scenarios**:

1. **Given** a rating with label "Renown", maximum 5, and value 3, **When** the sheet shows it,
   **Then** "Renown" is on the left of the same line as five dots, three of them filled, and no
   numbers are shown.
2. **Given** the same rating with "hide label" on, **When** the sheet shows it, **Then** only the
   dots are visible and assistive technology still announces "Renown".
3. **Given** a rating with the text input on, **When** the user types "Politics" and reopens the
   document, **Then** the input shows "Politics" and the value's dots are unchanged.
4. **Given** a rating with numbers on, value 3, and maximum 5, **When** the sheet shows it,
   **Then** "3 / 5" appears to the right of the dots.
5. **Given** a narrow screen, **When** the label, the text input, and the dots do not fit on one
   line, **Then** the text input moves to its own line the way a skill's specialization input
   does, and nothing overflows.

---

### User Story 2 - Roll a rating (Priority: P1)

A template author turns on the die symbol for a rating. On the sheet the rating shows the same
die symbol as a trait row. Clicking it queues a roll of the rating's value in the dice panel;
the other mouse button rolls it at once, as on a trait. The pool is built by the document
system's own dice rule, the same rule its attributes use. The roll's details show the rating's
label and the document's name.

On the dot style the author can also turn on the specialization, practiced, and experienced flags
(S, P, E), each on its own. The sheet's user toggles them like a trait's flags, and the system's
dice rule takes them into account when it builds the pool. A system whose dice rule ignores a
flag (V5 ignores all three) still stores the flag but rolls the same pool.

**Why this priority**: Rolling is the main use of a rating in play. Without it, a custom rating
cannot stand in for a trait.

**Independent Test**: On a Star Wars document and on a V5 document, turn on the die and the flags
for a rating. Roll it with and without each flag and compare the queued notation with the pool
the system's own attribute of the same value produces.

**Acceptance Scenarios**:

1. **Given** a Star Wars document with a rating of value 4 and the die on, **When** the user
   clicks the die, **Then** the dice panel receives the same pool as a Star Wars attribute of 4,
   and the roll details name the rating's label.
2. **Given** the same rating with the specialization flag on, **When** the user rolls it,
   **Then** the pool is the one a Star Wars trait with specialization and value 4 gets.
3. **Given** a V5 document with the same rating and flags, **When** the user rolls it,
   **Then** the pool equals a V5 attribute of 4, since V5 applies no flags.
4. **Given** a rating of value 0, **When** the user clicks the die, **Then** nothing is queued,
   as for a trait of 0.
5. **Given** a rating in the number style with the die on, **When** the user rolls it,
   **Then** the typed number is rolled the same way. The number style offers no S/P/E flags.
6. **Given** a document whose system has no dice rule, **When** the page shows a rating with the
   die on, **Then** the die is not shown.

---

### User Story 3 - A computed maximum decides the range (Priority: P2)

A template author sets a rating's maximum to come from another value or a formula, for example
"Blood Potency × 2", and gives it a static maximum of 10. When the computed maximum is 14, the
rating shows 14 dots and the user can set any of them. When it drops to 6, the rating shows 6
dots. A stored value of 9 is kept, and the sheet shows that part of it is hidden, until the
maximum rises again. The computed maximum never goes above the element's schema limit of 100
dots.

**Why this priority**: The storybook shows the defect today (30 dots, only 10 selectable). It is
a correctness fix but touches fewer templates than stories 1 and 2.

**Independent Test**: In the storybook, set the source value above, equal to, and below the
static maximum, then click the highest dot each time and check the stored value.

**Acceptance Scenarios**:

1. **Given** a rating with static maximum 10 whose computed maximum is 30, **When** the user
   clicks dot 25, **Then** the stored value is 25.
2. **Given** a stored value of 25 and a computed maximum that drops to 12, **When** the sheet
   shows the rating, **Then** 12 dots are filled and the sheet marks that the stored value is
   higher. This works whether the numbers are on or off.
3. **Given** a computed maximum of 250, **When** the sheet shows the rating, **Then** it shows
   100 dots and accepts values up to 100.
4. **Given** a computed maximum whose source is unavailable, **When** the sheet shows the rating,
   **Then** it falls back to the static maximum and shows the existing "maximum unavailable"
   notice.

---

### User Story 4 - Many dots stay compact and easy to hit (Priority: P2)

A rating with dozens of dots keeps its compressed look: in a narrow column the dots narrow into
pills on one row instead of wrapping or overflowing. Every dot reacts to a click or tap anywhere
in its own slice of the row, up to the middle of the space before its neighbours. There is no
dead gap between dots. The visible round shape and the spacing between dots look the same as
today.

**Why this priority**: This is a usability fix for large ratings and a prerequisite for comfortable
touch use of story 3's larger ranges.

**Independent Test**: Render ratings of 5, 30, and 100 dots in a narrow column. Check that they
stay on one row, then click or tap in the gap between two dots and check which one responds.

**Acceptance Scenarios**:

1. **Given** a rating of 30 dots in a column narrower than 30 full-size dots, **When** the sheet
   shows it, **Then** the dots stay on one row as narrowed pills and the page does not scroll
   sideways.
2. **Given** two neighbouring dots 3 and 4, **When** the user clicks the gap between them,
   **Then** the click sets the value of whichever dot's half of the gap was hit. No click in the
   row is lost.
3. **Given** a rating of 5 dots, **When** it is compared with a trait row of 5, **Then** the
   dots have the same visible size and spacing.

---

### User Story 5 - Authors configure all of this in the editor (Priority: P2)

In the template editor, a rating's settings offer the style (dots or number), the text input, the
numbers display, the die symbol, and, on the dot style, the S, P, and E flags. Each option has a
short hint and links to the editor guide. The storybook shows a rating for each option. A rating
saved earlier with the "boxes" style opens in the editor as dots without an issue.

**Why this priority**: Without editor controls the new behavior cannot be used. The storybook and
the guide are required by the project's rules (constitution VI), and every option needs them.

**Independent Test**: Create a rating, toggle every option in the editor, and watch the live page
update. Import a template with a "boxes" rating and check that it loads as dots with its values.

**Acceptance Scenarios**:

1. **Given** a rating in the editor, **When** the author switches the style to number,
   **Then** the S/P/E options are hidden and the die option stays.
2. **Given** a stored or imported template with a "boxes" rating and documents with values,
   **When** it loads, **Then** it shows dots, the values are unchanged, and the editor reports no
   issue.
3. **Given** the storybook, **When** a reviewer opens the template elements page, **Then** it
   shows ratings with a hidden label, with the text input, with numbers, with a die, with each
   flag, with a floor, and with a computed maximum above the static one.

---

### Edge Cases

- **Text input with the number style**: the text input is available on both styles. It sits
  between the label and the number field.
- **Read-only document** (a shared view or a preview): dots, flags, text, and the die are shown
  but cannot be changed. The die is also inactive, matching trait rows on read-only documents.
- **Minimum (floor) above zero**: dots below the floor are filled in the darker "floor" shade
  used by trait rows. A click can never set a value below the floor.
- **Value stored above the static maximum from an older computed maximum**: it is kept. The
  display follows the current computed maximum (story 3).
- **Formulas, display conditions, and maximum sources that read the rating**: they keep reading
  the rating's number. Adding text or flags does not change what they see.
- **Shared value key** (two ratings in different templates with the same key): the number, the
  text, and the flags are shared together.
- **Rating inside a custom list or table**: the same options apply where the rating element is
  already allowed. This feature adds no new places for ratings.
- **Existing documents**: a value stored as a plain number keeps working. The text starts empty
  and the flags start off.
- **Export and import of documents and templates**: the new settings and values survive a round
  trip. Files from older builds load unchanged.

## Requirements _(mandatory)_

### Functional Requirements

**Layout (US1)**

- **FR-001**: A rating on the sheet MUST show its label on the left and its dots (or number
  field) on the right, on one line, matching the shipped trait rows in dot size, spacing, and
  alignment.
- **FR-002**: The existing "hide label" setting MUST hide the visible label and keep it as the
  accessible name.
- **FR-003**: Authors MUST be able to turn on a free-text input between the label and the value.
  It is off by default. Its text is stored with the document and wraps to its own line on narrow
  screens, as a skill's specialization input does.
- **FR-004**: Authors MUST be able to turn on a "current / maximum" display to the right of the
  value. It is off by default.

**Styles (US5)**

- **FR-005**: The rating MUST offer exactly two styles, dots and number.
- **FR-006**: Templates stored or imported with the "boxes" style MUST load as dots, keep all
  document values, and raise no editor issue.

**Rolling (US2)**

- **FR-007**: Authors MUST be able to turn on a die symbol on either style. On the sheet it
  queues the rating's current value (left click) or rolls it at once (other button), like a trait
  row's die.
- **FR-008**: The roll MUST use the pool the document's system builds for a trait of the same
  value and flags. The roll details MUST name the rating's label and the document.
- **FR-009**: On the dot style, authors MUST be able to turn on the specialization, practiced,
  and experienced flags independently, each off by default. On the sheet the flags behave like a
  trait row's flags and are stored with the document.
- **FR-010**: The die MUST be hidden when the document's system has no dice rule. It MUST queue
  nothing for a value of 0.

**Maximum (US3)**

- **FR-011**: When a rating has a computed maximum, the number of dots and the highest value the
  user can set MUST both equal the computed maximum, capped at the element's schema limit of 100.
  The static maximum applies only when there is no computed maximum or it is unavailable.
- **FR-012**: A stored value above the current maximum MUST be kept. The sheet MUST mark that part
  of it is hidden, whether the numbers display is on or off.

**Dots (US4)**

- **FR-013**: Rows with more dots than fit MUST narrow the dots into pills on one row. They MUST
  NOT wrap, overflow, or scroll the page sideways.
- **FR-014**: Each dot's clickable area MUST cover its whole slice of the row, up to the midpoint
  of the space before each neighbour. There MUST be no dead space between neighbouring dots, and
  the visible shape and spacing MUST stay unchanged.

**Data and compatibility**

- **FR-015**: Formulas, display conditions, and maximum sources that reference a rating MUST
  keep reading its number.
- **FR-016**: Existing documents that store a rating as a plain number MUST keep that value, with
  empty text and all flags off.
- **FR-017**: Ratings that share a value key MUST share the number, text, and flags.
- **FR-018**: The new template settings and document values MUST survive template and document
  export and import. Older files MUST load unchanged.

**Editor, storybook, guide**

- **FR-019**: The editor's rating settings MUST offer every option above, each with a hint and a
  link to its fragment in the editor guide. The S/P/E options MUST show only for the dot style.
- **FR-020**: The storybook MUST show a rating for each option, and its guard test MUST require
  them.
- **FR-021**: The editor guide (English and its Russian mirror) MUST describe the options and
  the removal of the "boxes" style. All new interface text MUST be available in English and
  Russian.

### Key Entities

- **Rating element (template)**: A labelled integer value on a page. Its settings are the label
  and the hidden-label switch, the floor (minimum), the static maximum, an optional computed
  maximum, the style (dots or number), and switches for the text input, the numbers display, the
  die, and each of the S/P/E flags.
- **Rating value (document)**: What a document stores for one rating (or one shared value key).
  It holds the number and, when the element uses them, the text and the three flags. The number
  is what formulas and conditions read.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Side by side with a shipped attribute row of the same value and maximum, a rating
  with label and dots differs in no visible measurement: label position, dot size, dot spacing,
  and row height.
- **SC-002**: For every shipped system with a dice rule, rolling a rating queues exactly the same
  notation as rolling that system's attribute with the same value and flags. This holds for 100%
  of the combinations of value 0–10 and flags that the tests cover.
- **SC-003**: In the storybook's "computed maximum above the static one" story, every shown dot
  (30 of 30) can be selected, up from 10 of 30 today.
- **SC-004**: With a rating of 30 dots, a click anywhere along the row's dot area sets a value.
  Today clicks in the gaps between dots do nothing.
- **SC-005**: Every template and document saved before this feature, including ratings with the
  "boxes" style, loads with 0 value changes and 0 new editor issues.

## Assumptions

- The roll uses the same dice panel, queue, and roll-details mechanism as trait rows. No new dice
  behavior is introduced.
- "Label in the roll details" means the same stat label the trait rows pass. The document name
  comes from the document title, as for traits.
- The S/P/E flags are offered on every system, even though V5's dice rule ignores them. The editor
  hint says so rather than hiding the options by system.
- The text input has no catalog suggestions in this feature. Catalog-backed text belongs to
  user-created catalogs (T-074).
- The compressed look relies on the row's available width. No explicit "compact" setting is
  added for ratings (T-056 covers brief layouts).
- T-058 (system/custom field parity) stays open. This feature makes the custom rating match
  system rows and does not change system-bound fields.
