# Feature Specification: Custom list item template

**Feature Branch**: `testing`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "T-077: Custom list item template — a custom list's items are one configurable element of an existing field type, set up with the usual field settings; every field type places its remove control so it shows and works inside a list. The author picks the item's field type (every type except formula) and configures it with the usual field editor; per list, entries either carry a name typed by the sheet user or are just the field. The list-level catalog binding from spec 015 stays on the list and suggests names for any item type, copying a column into the entry's field when the types fit. Every field type places its own remove control inside a list. Existing lists keep working as named rating rows with no visible migration; changing a list's item type reports the stored values it cannot keep. System-bound lists are out of scope."

## Scope

| Backlog | Entry                     | Role in this feature |
| ------- | ------------------------- | -------------------- |
| T-077   | Custom list item template | User Stories 1–5     |

A custom list is a part of a template where the sheet's user adds as many entries as they need:
skills, contacts, notes. Today every custom list looks the same. Each entry is a trait row: a name
the user types, five dots, the S/P/E flags, and a die. That fits skills. It does not fit
a list of contacts (a name and a text note), a list of rituals (a name and a choice of level), a
list of mementos (just pictures), or a list of bonds (a name and a number with a maximum).

This feature lets the author decide what one entry is. They pick one field type and set it up
like any other field. Every entry the user adds is one copy of that field.

Out of scope:

- System-bound lists (lists that read a game system's own data, such as V5 disciplines). They stay
  as they are.
- Formula entries. A formula inside a list entry has nothing of its own to compute from; it can
  become a separate task if needed.
- Several fields per entry. A table is the repeated element with several columns and stays so.
- Reordering entries by the sheet's user, if the list does not offer it today.
- Formulas elsewhere on the sheet reading list entries.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Choose what one list entry is (Priority: P1)

A template author adds a custom list and picks the type of its entries from the field types they
already know: text, number, toggle, choice, rating, resource, document reference, or image. They
then set the entry up with the same settings panel any field of that type has: a rating's style
and range, a resource's maximum, a choice's options or catalog, a text's multi-line mode, the
label position. On the sheet, each entry the user adds is one copy of that field, and every copy
follows the author's settings.

**Why this priority**: This is the feature. Without it, every custom list is a list of skills.

**Independent Test**: Make a list whose entry is a resource with a maximum of 10. Add three
entries on a sheet, change their current values, and reload. Each entry keeps its own value, and
each one shows "/ 10".

**Acceptance Scenarios**:

1. **Given** a new custom list in the editor, **When** the author opens its settings, **Then**
   they can pick the entry type from text, number, toggle, choice, rating, resource, document
   reference, and image, and formula is not offered.
2. **Given** a list whose entry type is choice with three options, **When** the sheet's user adds
   two entries, **Then** each entry offers the same three options and keeps its own pick.
3. **Given** a list whose entry type is rating in the number style with a range of 1–10,
   **When** the user types 12 into an entry, **Then** the entry is held to 10, as a rating field
   outside a list would be.
4. **Given** a list whose entry type is text in the multi-line mode, **When** the user writes
   several lines in an entry, **Then** the entry keeps all lines after a reload.
5. **Given** an entry setting that only makes sense for one field (such as the field's own
   stored name), **When** the author sets up the entry, **Then** settings that cannot apply to
   repeated copies are not offered.

---

### User Story 2 - Named or unnamed entries (Priority: P1)

For each list, the author decides whether the sheet's user types a name for each entry. A list of
skills or contacts has names ("Firearms ●●●", "Aunt Vera: owes me a favour"). A list of notes or
pictures does not: each entry is just the field. When entries have no names, each entry shows the
entry template's label, or nothing if the author left that label empty.

**Why this priority**: Without this, half of the lists the feature enables (notes, images) carry a
useless name box.

**Independent Test**: Make two lists with the text entry type, one named and one unnamed. On a
sheet, the named list shows a name box and a text box in each entry; the unnamed list shows only
the text box.

**Acceptance Scenarios**:

1. **Given** a named list, **When** the user adds an entry, **Then** the entry shows an empty
   name box before the field, and the name is saved with the entry.
2. **Given** an unnamed list with the image entry type, **When** the user adds three entries,
   **Then** each entry is an image field with the entry template's label, and no name box.
3. **Given** a named list with a catalog, **When** the user types in an entry's name, **Then**
   catalog entries are suggested as today.
4. **Given** an unnamed list, **When** the author looks at the list's catalog setting, **Then** the
   catalog cannot be set, and the reason is shown: suggestions need entry names.
5. **Given** a named list with presets, **When** the user adds a preset, **Then** the entry gets
   the preset's name, and its value when the entry type holds a number.

---

### User Story 3 - Remove an entry of any type (Priority: P1)

Every entry, whatever its type, has a remove control in a place that suits that field. A row-shaped
field (a rating, a number, a toggle, a single-line text, a choice, a resource, a reference) has
the control at the end of its row. A block-shaped field (a multi-line text, an image) has it in
its top corner or header. The control never covers the field's own inputs. It can be reached by
keyboard and tapped on a touch screen, and it is gone when the sheet is read-only.

**Why this priority**: A list the user cannot shrink is broken. Today only trait rows know where
their remove control goes.

**Independent Test**: For every allowed entry type, add two entries and remove the first one with
the keyboard only (Tab to the control, Enter). The second entry stays with its value.

**Acceptance Scenarios**:

1. **Given** a list of any allowed entry type, **When** the user removes an entry, **Then** only
   that entry disappears and the others keep their values.
2. **Given** an entry whose field fills the width (a multi-line text or an image), **When** the
   entry is shown, **Then** the remove control does not cover any of the field's inputs or its
   picture.
3. **Given** a read-only sheet, **When** a list is shown, **Then** no entry shows a remove
   control and no add control is shown.
4. **Given** a phone-width screen, **When** a list of resources is shown in one column, **Then**
   the remove control is on screen and can be tapped without horizontal scrolling.

---

### User Story 4 - Existing lists keep working; changing the type is safe (Priority: P2)

Templates and sheets made before this feature keep working with no visible change. A list saved
without an entry type loads as a named list of ratings with dots, the S/P/E flags, and a die. Its
stored entries keep their names and values. When an author later changes a list's entry type,
the editor says which stored values the new type cannot show before saving, the same
way retargeting a template and retyping a catalog column warn today.

**Why this priority**: Existing sheets hold real play data. It must survive, but the feature can
be tried on new lists before this story is finished.

**Independent Test**: Open a sheet made with an old custom list. It looks and works as before.
In the editor, change that list's entry type from rating to text. The editor lists the entries
whose values would no longer show.

**Acceptance Scenarios**:

1. **Given** a template saved before this feature with a custom list, **When** it is opened,
   **Then** the list shows named rating rows with dots, flags, and a die, as before, and the
   template reports no problems.
2. **Given** a sheet with entries in that list, **When** it is opened, **Then** every entry shows
   its old name and value. (S/P/E flags toggled in old lists were never kept; from now on they
   are.)
3. **Given** a list with stored entries, **When** the author changes the entry type to one that
   cannot hold those values (for example rating → image), **Then** the editor says how many
   sheets and entries would no longer show their values and asks before applying. The values
   stay stored; an entry's hidden value or name is replaced only when that entry is edited.
4. **Given** a change that keeps values (for example rating → number, or number → resource
   current value), **When** the author applies it, **Then** stored values carry over without a
   warning.
5. **Given** a named list turned unnamed, **When** the author applies the change, **Then** the
   editor warns that stored entry names will no longer be shown.
6. **Given** a library file or template file exported before this feature, **When** it is
   imported, **Then** its lists load the same way as saved ones.

---

### User Story 5 - Catalog fills the entry's field (Priority: P3)

The catalog binding a list got in spec 015 stays on the list. It keeps suggesting entry names for
any entry type. Its "value from" setting copies a catalog column into the entry's field when the
types fit: a number column into a number, rating, or resource's current value; a text column
into a text; a toggle column into a toggle. A choice entry may also have its own catalog, as any
choice field can.

**Why this priority**: Catalog-backed lists work today for ratings. Extending the copy to other
types is useful but not needed for the first release of the feature.

**Independent Test**: Bind a named list with text entries to a catalog with a text column, and
set "value from" to that column. Pick a catalog entry in a new list entry. The name and the text
are filled.

**Acceptance Scenarios**:

1. **Given** a list whose entry type is number and whose catalog "value from" is a number column,
   **When** the user picks a suggestion, **Then** the entry's name and number are filled.
2. **Given** a list whose entry type is image, **When** the author opens "value from", **Then**
   no column is offered, because no catalog column fits an image.
3. **Given** a list whose "value from" names a column that no longer fits the entry type (after
   the author changed either one), **When** the template is checked, **Then** a template problem
   names the list and the column.
4. **Given** a choice entry with its own catalog, **When** the user picks an entry in it, **Then**
   the pick is stored as in any choice field, and its fills are ignored (an entry has no sibling
   fields to fill).

---

### Edge Cases

- **A stored value that the entry type rejects** (for example a sheet edited by hand, or a type
  change applied anyway): the entry shows as empty for that field, the sheet reports the problem
  as other bad stored values are reported, and the value is not rewritten until the user edits
  the entry.
- **1000 entries**: the list keeps the existing limit of 1000 entries per list; the add control
  is disabled at the limit and says why.
- **An image entry removed**: removing the entry treats its stored picture the same way clearing
  an image field does (today the picture stays on the device).
- **A document reference entry whose target was deleted**: the entry shows the same "missing
  document" state as a reference field outside a list.
- **Dice on rating entries**: a rating entry with the die option rolls through the document
  system's trait pool, as a rating field and today's trait rows do; the roll names the entry's
  name, or the entry template's label for unnamed lists.
- **Several columns**: the list's existing column setting (1–4) lays out entries of any type; a
  block-shaped entry fills its column.
- **Label position inside a list**: in a named list the typed name takes the label's place and
  follows the entry template's label position; in an unnamed list the entry template's label
  shows at its label position.
- **Entry template label empty in an unnamed list**: the entry shows no label, and the field's
  accessible name falls back to the list's title and the entry's position ("Notes, entry 3").

## Requirements _(mandatory)_

### Functional Requirements

**Entry template**

- **FR-001**: A custom list MUST have one entry template: a field of type text, number, toggle,
  choice, rating, resource, document reference, or image. Formula MUST NOT be offered.
- **FR-002**: The author MUST set up the entry template with the same settings panel as a field of
  that type outside a list, except settings that cannot apply to repeated copies (such as the
  field's own storage name and fills into other fields), which MUST NOT be offered.
- **FR-003**: Every entry on the sheet MUST render as one copy of the entry template and store its
  own value, validated by the same rules as a field of that type.
- **FR-004**: A list MUST have a setting "entries are named": when on, each entry has a name the
  sheet's user types; when off, entries have no name.

**Sheet behavior**

- **FR-005**: The add control MUST add an entry with the entry type's empty value (and an empty
  name for named lists); presets on a named list MUST add an entry with the preset's name and,
  for entry types that hold a number, the preset's value.
- **FR-006**: Every allowed entry type MUST show its own remove control inside a list: at the end
  of the row for row-shaped fields and in the top corner or header for block-shaped fields,
  never covering the field's inputs, reachable by keyboard, with an accessible name that
  includes the entry's name or position, and hidden on read-only sheets.
- **FR-007**: Removing an entry MUST remove only that entry and its stored value; an image
  entry's picture is handled the same way as clearing an image field.
- **FR-008**: The existing list settings (columns, show title, framed) MUST keep working for
  every entry type.

**Catalog**

- **FR-009**: The list-level catalog binding MUST suggest entry names for named lists of any entry
  type and MUST NOT be settable on unnamed lists.
- **FR-010**: "Value from" MUST offer only catalog columns whose type fits the entry type (number →
  number, rating, resource current value; text → text; toggle → toggle) and MUST copy the picked
  entry's column into the entry's field, held to the field's own range.
- **FR-011**: A choice entry template MAY carry its own catalog binding; its fills MUST NOT be
  offered in the editor and MUST be ignored if present.
- **FR-012**: A "value from" column that does not fit the entry type MUST be reported as a template
  problem naming the list and the column.

**Compatibility and changes**

- **FR-013**: A list saved without an entry template MUST load as a named list whose entries are
  ratings in the dot style with the S/P/E flags and the die, with the same range and look as
  today, and its stored entries MUST keep their names and values without any action from the
  user; flags toggled from now on MUST be kept.
- **FR-014**: Changing a list's entry type or turning off names MUST first report how many
  documents and entries would no longer show stored values or names, and MUST apply only after the author
  agrees; changes that keep every value MUST apply without a warning.
- **FR-015**: Template files and library files that contain lists without an entry template MUST
  import as in FR-013.

**Documentation and storybook**

- **FR-016**: The element storybook MUST show a custom list for every allowed entry type, and at
  least one named and one unnamed list.
- **FR-017**: The template editor guide (English and Russian) MUST explain entry types, named and
  unnamed entries, and the catalog's "value from" per type.
- **FR-018**: All new interface text MUST come from the translation sources in both languages.

### Key Entities

- **Custom list**: a template element whose entries are added by the sheet's user. Has a title,
  columns, show-title and framed settings, presets, an optional catalog binding, the "entries
  are named" setting, and one entry template.
- **Entry template** (`item` in the template file): one field definition (type and settings) that every entry of the list
  copies. It has no storage name of its own.
- **List entry**: one stored item in a document: an identity, an optional name, and one value of
  the entry template's type (plus the extras that type keeps, such as a rating's flags or a
  choice's picked name).
- **Type change report**: what the editor shows before a change of entry type or naming: the
  number of affected documents and entries, and what would no longer show.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An author can build a list of named contacts with a multi-line note, a list of
  unnamed pictures, and a list of named bonds with a current/maximum value, each in under two
  minutes, without leaving the list's settings panel.
- **SC-002**: 100% of the allowed entry types can have an entry added, edited, and removed on a
  sheet with the keyboard only.
- **SC-003**: Every sheet made before this feature shows every custom list entry with the same
  name and value after the update: 0 lost values.
- **SC-004**: No change of entry type or naming hides a stored value without the author first
  seeing how many entries are affected.
- **SC-005**: On a phone-width screen, every entry type shows its remove control fully on screen,
  with no horizontal scrolling of the page.
- **SC-006**: A list of 1000 entries of any type stays usable: typing in one entry does not
  visibly lag.

## Assumptions

- The entry template reuses the existing field settings panel; this feature adds only the entry
  type picker, the naming switch, and the rules on which settings are hidden.
- The limits stay as today: 1000 entries per list, 30 presets per list, 1–4 columns.
- A named entry's name keeps today's length limit (120 characters); an entry with an empty name
  in a named list is allowed while the user is typing, as today.
- The image entry type stores pictures the same way image fields do (on the device, or a secure
  web address); a list of images exported to a file carries the same image rules as image
  fields.
- The type change report counts documents stored on this device, the same scope retargeting a
  template uses.
- The T-075 work (references to any document type) and T-078 (configurable trackers) are
  separate; this feature uses the reference field as it is.
