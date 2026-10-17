# Feature Specification: Template-Editor Parity for the Vampire Mechanics

**Branch**: `038-editor-mechanics-parity` | **Created**: 2026-10-17 | **Status**: Draft

**Input**: "Spec 038 — template-editor parity for the spec 037 vampire mechanics (constitution VI).
Every mechanic 037 built as a system-only binding becomes a template element or element option
authors configure in the editor, and the shipped vampire templates are rebuilt on them: a Button
element and row buttons; a field option 'From catalog'; formula functions with comparisons and text
results; a tracker option for marks of a second value from the end; a catalog list option limiting
rows by their parent row; display conditions on computed values. Code-only mechanics are retired.
Hunger dice in rolls stay a ruleset mechanic. Hunter and Star Wars templates need no buttons. Branch
from 037-vampire-character; 037 merges only together with 038."

## Context

Spec 037 (Vampire: the Masquerade 5e character, not merged) gave the shipped vampire sheet six
behaviors that exist only in system code: Rouse buttons, catalog texts shown read-only or as a
suggestion (predator grants, bane, compulsion), values computed from tables (Blood Potency effects),
Humanity with stains marked from the other end, powers limited by their discipline's dots, and a
block shown by a computed value (rituals). A template author cannot rebuild any of them, which
breaks constitution VI ("Template-editor parity for new elements": a setting's need is built as an
element user templates configure, and an existing element gains an option rather than a
near-duplicate appearing). This feature turns each behavior into an element or an element option in
the template editor, rebuilds the shipped vampire templates on them, and removes the code-only
versions. 037 and 038 merge together.

## Clarifications

### Session 2026-10-17

- Q: Does a button's roll on a vampire automatically turn dice into the game's special dice (Hunger
  dice)? → A: Only when the author turns on the button's "Roll with the game's dice" option; it is
  off by default (Rouse and Remorse checks roll plain dice).
- Q: Can the reader take back what a button changed? → A: Yes: the result message offers **Undo**
  for a few seconds, which restores the changed values; the roll stays in the history.
- Q: How does a user catalog express entries belonging to entries of another catalog (needed by
  Limit by parent)? → A: User catalogs gain a **Parent** column (an entry of another catalog) and
  use a number column as the level, so an author can rebuild powers under disciplines.

## User Scenarios & Testing

### User Story 1 - A button that rolls and changes values (Priority: P1)

A template author adds a **Button** from the editor's "+" menu, names it, and configures what it
does: the dice to roll (notation that may use values of the document, such as "as many dice as empty
boxes"), how many times to roll, when a failed roll is re-rolled once, what counts as a success, and
which values change on a success and on a failure (add an amount within the value's bounds, or set a
value). A reader presses the button: the dice roll as any sheet roll does (3D dice, history,
sharing), and the configured changes are written to the document with a short message saying what
changed and an **Undo** action.

**Why this priority**: Rouse and Remorse checks are the vampire's most frequent sheet actions, and
buttons are the one mechanic no template can express today.

**Independent Test**: In a user template on any document, add a button "Test" rolling `1d10>=6` that
adds 1 to a number field on a failure; press it until both outcomes occur and check the field and
the messages.

**Acceptance Scenarios**:

1. **Given** a button rolling `1d10>=6` that adds 1 to Hunger (bounds 0–5) on a failure, **When**
   the roll fails at Hunger 2, **Then** Hunger becomes 3 and the message names the change.
2. **Given** the same button at Hunger 5, **When** the roll fails, **Then** Hunger stays 5 and the
   message says the value is already at its limit.
3. **Given** a button set to roll twice and re-roll a failed roll once while a condition holds,
   **When** the condition holds and the first roll fails, **Then** that roll is re-rolled once and
   only its second result counts.
4. **Given** a reader cancels the 3D roll, **When** the roll ends, **Then** nothing from the
   unfinished roll is written and the message says it was cancelled.
5. **Given** a document opened read-only, **When** it is shown, **Then** its buttons are disabled
   with an explanation.
6. **Given** the result message of a button that lowered a value, **When** the reader chooses Undo
   within its time, **Then** the value returns to what it was and the roll stays in the history.
7. **Given** a button with "Roll with the game's dice" off on a vampire at Hunger 3, **When** it
   rolls `3d10>=6`, **Then** no die is a Hunger die; with the option on, as many dice as Hunger are.
8. **Given** a button with an availability condition (Remorse: stains above 0), **When** the
   condition does not hold, **Then** the button is disabled and says why.
9. **Given** a table of the template (or a built-in list of rows such as powers), **When** the
   author adds a **row button**, **Then** each row shows the button, and the button's notation,
   count, and conditions may use that row's values (a power's level and cost); a condition can hide
   the button on rows it does not fit.

---

### User Story 2 - Formulas with rounding, comparisons, conditions, and text (Priority: P1)

An author writes derived values the books give as tables: "half Blood Potency rounded up", "2 below
Blood Potency 2, else 1", a text such as "Animal blood slakes half" by thresholds, and "the dots of
the discipline named Blood Sorcery in the disciplines list". Formulas gain rounding, comparisons, a
condition with two results, text results, and reading a list entry's rating by its name. A display
condition can test a derived value, so a block appears only when it applies.

**Why this priority**: the Blood Potency effects, the potency range, and the rituals block all
depend on it, and the button conditions of Story 1 use the same language.

**Independent Test**: In a user template, add derived values for each new function, a text result,
and a list lookup; change the inputs and check each result; hide a card unless a derived value is
above 0.

**Acceptance Scenarios**:

1. **Given** Blood Potency 3, **When** a derived value computes half of it rounded up, **Then** it
   shows 2; rounded down shows 1.
2. **Given** a condition choosing between two texts by a threshold, **When** the input crosses the
   threshold, **Then** the shown text changes; texts may be translated when the template ships.
3. **Given** a disciplines list with "Blood Sorcery ●●" (or its Russian name), **When** a derived
   value reads that entry's rating by name, **Then** it shows 2, and 0 when the entry is missing.
4. **Given** a card whose display condition tests that derived value, **When** the dots go from 0 to
   1, **Then** the card appears.
5. **Given** a formula with a mistake, **When** the author types it, **Then** the editor names the
   problem as it does for formulas today.

---

### User Story 3 - Text from a catalog entry (Priority: P2)

An author sets a text field's **From catalog** option: a catalog, the field whose value picks the
entry, and which text of the entry to show, optionally a second text used while a condition holds
(the clan's variant bane). In **Show only** mode the field displays the text and cannot be typed
into (what a predator type grants). In **Suggest** mode the text shows as a suggestion until the
reader writes their own, and clearing the field brings the suggestion back (bane, compulsion).

**Why this priority**: three vampire fields use it, and any catalog-backed sheet benefits; it is an
option of an existing field, not a new element.

**Independent Test**: In a user template with a user catalog, bind a picker field and a text field
"From catalog" in each mode; pick entries and type over the suggestion.

**Acceptance Scenarios**:

1. **Given** clan Brujah picked, **When** the bane field is empty, **Then** it suggests Brujah's
   bane in the reader's language; typing replaces it; clearing restores the suggestion.
2. **Given** the bane variant switch set to "variant", **When** the field is empty, **Then** it
   suggests the variant bane.
3. **Given** a typed name matching no entry, **When** the field is shown, **Then** it shows nothing
   (show only) or no suggestion (suggest), with no error.
4. **Given** texts that load on demand, **When** they are not loaded yet, **Then** the field shows
   empty without a placeholder flash of another language, then the text.

---

### User Story 4 - A tracker with marks from the other end (Priority: P2)

An author gives a tracker a **second value marked from the end**: boxes fill from the start up to
the first value and the second value's marks fill from the last box backward, never on a filled box
(Humanity and its stains). The values can be the document's built-in values or the template's own.
The keyboard and the outline action (right click, Shift+Enter, long press) work as on other
trackers.

**Why this priority**: Humanity is on every vampire sheet; the option extends the existing tracker
rather than keeping a separate score element.

**Independent Test**: In a user template, add a tracker of 10 boxes with the option, set the value
and marks by mouse and keyboard, and try to mark a filled box.

**Acceptance Scenarios**:

1. **Given** Humanity 7 and 1 stain, **When** shown, **Then** boxes 1–7 are filled and box 10 is
   marked.
2. **Given** Humanity 7 and 3 stains, **When** the reader marks one more stain, **Then** it is
   refused with a message, because box 7 is filled.
3. **Given** a screen reader, **When** the tracker is focused, **Then** it announces the value, the
   marks, and the length.

---

### User Story 5 - Rows limited by their parent row (Priority: P3)

A user catalog can say which entry of another catalog each entry belongs to (a **Parent** column)
and use a number column as its level. In a table whose catalog entries belong to entries of another
list's catalog (powers under disciplines), the author turns on **Limit by parent**: the picker
offers only entries whose level is at most the parent row's rating, and a row above it (kept from
before, or typed) carries an "above the parent" mark instead of being removed.

**Why this priority**: it makes the power pickers fit the character, but the sheet works without it.

**Independent Test**: Make a user catalog of parents and one of children with a Parent column and a
level; in a user template, set a parent row to 2 and check the picker and the mark on a level-3 row.

**Acceptance Scenarios**:

1. **Given** Auspex ●● and the option on, **When** the reader picks a power, **Then** only Auspex
   powers of level 1–2 are offered.
2. **Given** a level-3 Auspex power on the sheet, **When** Auspex drops to 2, **Then** the row stays
   and is marked as above its discipline.
3. **Given** a user catalog entry whose parent entry was deleted, **When** the catalog is opened,
   **Then** the entry keeps working without a parent and the catalog editor marks the broken link.

---

### User Story 6 - The vampire sheet on configurable elements (Priority: P1)

The shipped vampire sheet and brief are rebuilt on Stories 1–5 and look and behave as in spec 037:
the general Rouse check and a Rouse button on each catalog power with a cost, Blood Potency effects,
predator grants, bane and compulsion suggestions, Humanity with stains, limited power pickers, and
the rituals block. A new **Remorse check** button joins Humanity. A user copy of the vampire
template shows every one of these as ordinary, editable elements. The code-only versions are gone.

**Why this priority**: it is what makes 037 mergeable under constitution VI.

**Independent Test**: Copy the shipped vampire sheet into a user template, open it in the editor,
and find every mechanic above as an element or option; run the 037 vampire tests against the rebuilt
templates.

**Acceptance Scenarios**:

1. **Given** Humanity 7 with 2 stains, **When** the reader presses Remorse check, **Then** 1 die is
   rolled (the empty boxes without stains, at least 1); on a success Humanity stays 7, on a failure
   it becomes 6; the stains are cleared either way. Without stains the button is disabled.
2. **Given** a power costing 1 Rouse at level 1 and Blood Potency 2, **When** its button's check
   fails, **Then** it is re-rolled once, as in spec 037.
3. **Given** the editor opened on a copy of the shipped vampire sheet, **When** the author selects
   the Rouse button, **Then** its settings show the roll, the re-roll condition, and the Hunger
   change.

### Edge Cases

- A button whose notation or condition does not evaluate (a missing value): pressing it shows why,
  rolls nothing, and changes nothing.
- A change targeting a value the document cannot store (a built-in value of another document kind, a
  removed field): the editor flags it; on the sheet the change is skipped and reported.
- Several rolls in one press: changes from finished rolls are written even if a later roll is
  cancelled, and the message says how many rolls were made.
- Two changes to the same value in one outcome apply in the order the author listed them.
- Undo after the reader edited a changed value by hand: that value is kept as the reader set it; the
  message says which values were not restored.
- The second-value marks of a tracker exceed the room left when the first value rises: the marks
  shrink to fit, as stains do in spec 037.

## Requirements

### Functional Requirements

- **FR-001**: The editor's "+" menu MUST offer a Button element; tables and built-in rows MUST
  accept row buttons. A button has a label (translatable when shipped) and a roll, count, re-roll
  condition, success rule, availability condition, "Roll with the game's dice" option (off by
  default), and changes for success and failure, each optional except the label.
- **FR-002**: A button's roll MUST go through the same dice path as other sheet rolls (3D dice,
  history, sharing, game-system readings) and MUST write nothing for a cancelled roll.
- **FR-003**: A change MUST target a value coordinate of the document (the template's own fields or
  the document's built-in values), either adding an amount kept within the value's bounds or setting
  a value; the outcome message MUST name each changed value with its old and new value and say when
  a value was already at its limit, and offer Undo for a few seconds, restoring every value the
  press changed unless the reader has changed it since.
- **FR-004**: A button without a roll MUST apply its success changes directly (a plain "spend" or
  "reset" button).
- **FR-005**: A button MUST be disabled in a read-only document and MUST show why it cannot run when
  its notation or a condition does not evaluate.
- **FR-006**: Formulas MUST support rounding up and down, comparisons, a condition with two results,
  text results, and reading a list entry's rating by name (any of the entry's names in either
  language when the list follows a catalog); existing formulas MUST keep their results.
- **FR-007**: Display conditions MUST be able to test a derived value.
- **FR-008**: A text field MUST offer From catalog with a catalog, the field picking the entry, the
  entry text, an optional second text with its condition, and the modes Show only and Suggest.
- **FR-009**: A tracker MUST offer a second value marked from the end that never covers a filled
  box, editable by click, the trackers' outline action (right click, Shift+Enter, long press), and
  the arrow keys, with an accessible description.
- **FR-010**: A catalog table under a parent list MUST offer Limit by parent: picks filtered to
  levels within the parent row's rating, and rows above it marked, not removed. User catalogs MUST
  offer a Parent column (an entry of another catalog) so the option works with them as with shipped
  catalogs.
- **FR-011**: The shipped vampire sheet and brief MUST be built only from elements and options an
  author can configure, MUST keep the 037 behaviors, and MUST add a Remorse check.
- **FR-012**: The code-only mechanics MUST be removed: built-in actions, the score mode of built-in
  resources, read-only and fallback built-in fields, and per-system parent limits in built-in rows.
  Hunger dice in rolls stay with the V5 ruleset.
- **FR-013**: Every new element and option MUST appear in the element storybook and in the
  template-editor guide (English and Russian), with the editor's issue checks covering their
  settings.
- **FR-014**: Templates saved before this feature MUST open unchanged; documents keep their data.

### Key Entities

- **Button**: a template element (or a row button of a table or built-in rows) with a label, an
  optional roll (notation, count, re-roll condition, success rule), and changes per outcome.
- **Change**: a target value coordinate, an operation (add within bounds, or set), and an amount or
  formula.
- **From catalog**: a text field option naming the catalog, the picking field, the entry text (and a
  conditional second text), and the mode.
- **Marks from the end**: a tracker option naming the second value and what its marks are called.
- **Limit by parent**: a catalog table option naming the entry's level and the parent's rating.
- **Parent column**: a user catalog column whose value is an entry of another catalog.

## Success Criteria

- **SC-001**: Every vampire mechanic of spec 037 listed in the Context is found as an element or
  option in a user copy of the shipped vampire sheet, and the 037 behavior tests pass against the
  rebuilt templates.
- **SC-002**: An author reproduces the Rouse check, the Remorse check, and the bane suggestion in a
  new template from the guide alone, in under ten minutes each.
- **SC-003**: No shipped template uses a mechanic that the editor cannot configure (checked by a
  test over every shipped template).
- **SC-004**: Pressing a button shows its result message within the time of the roll's animation
  plus 100 ms; formula evaluation of the full vampire sheet stays within the current sheet render
  budget.
- **SC-005**: The sheet page's download grows by no more than 10 KB compressed against the 037
  branch.

## Assumptions

- Spec 037 is unmerged, so its shipped vampire templates and bindings change without a migration; no
  user template can depend on them yet.
- Hunter and Star Wars templates need no buttons: Overreach or Despair is the player's choice after
  a roll, and spending Force Points is a tracker edit. Their templates change only if a removed
  code-only mechanic was used (none known).
- The roll's success rule counts the roll's total (successes for target-number notation); other
  readings (messy criticals) stay with the game-system reading of the roll.
- Button messages are generated from the changes; an author may add their own success and failure
  texts.
- Rows and buttons in the documents window and the brief follow the same rules as on the sheet.
- Out of scope: chains of buttons, buttons that open dialogs or roll on other documents, and guided
  creation (T-053).
