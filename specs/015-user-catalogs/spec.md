# Feature Specification: User-created catalogs

**Feature Branch**: `testing`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "T-074: User-created catalogs — template authors create their own catalogs for choice fields instead of only binding shipped ones. A user catalog belongs to a setting (user or shipped) and appears in the library tree under that setting next to its document types; it is created, renamed, moved, deleted, exported and imported with library branches. Each entry has a name plus author-defined columns (text, number, toggle); picking an entry copies its columns into mapped targets, as shipped catalogs do. Entries are edited in the library's details pane, including pasting rows from a spreadsheet. Use sites: choice fields, custom-list name suggestions, and choice columns of template tables (filling the same row). User catalogs are single-language. Deleting a catalog keeps stored values; bound templates degrade to manual choice. Shipped catalogs stay code-owned and may be listed read-only."

## Scope

| Backlog | Entry                 | Role in this feature |
| ------- | --------------------- | -------------------- |
| T-074   | User-created catalogs | User Stories 1–5     |

A catalog is a list of named things with details, such as weapons with damage and price, or
species with an attribute bonus. It lets a sheet offer "pick one", and picking copies the details
into the sheet. Today only the game's shipped catalogs exist, written into the site. An author
who builds their own setting, or adds house rules to Star Wars, cannot offer their own weapons,
cults, or spells from a list. They have to type the options into every choice field again, with
no details attached.

This feature lets authors make their own catalogs, keep them with a setting in the library, fill
them like a small spreadsheet, and use them wherever a template offers a choice.

Out of scope:

- Editing shipped catalogs.
- Translating user catalogs: they are single-language.
- Catalogs inside documentation pages.
- A catalog shared across settings.
- Row-valued details, such as an entry that carries a list of its own.
- Reworking custom list items into configurable elements (T-077).

## Clarifications

### Session 2026-09-27

- **Owner**: a setting, shown in the library next to the setting's types (maintainer).
- **Entry shape**: a name plus the author's own columns: text, number, or toggle (maintainer).
- **Where entries are edited**: in the library's details pane (maintainer).
- **Use sites in this feature**: choice fields, custom-list suggestions, and choice columns of
  template tables (maintainer).
- Q: Only settings, or rulesets too? → A: Rulesets too (maintainer, at plan time). A catalog
  declared on a ruleset, such as World of Darkness 5th Edition, is offered to every setting on
  that ruleset: Rules only, its lines such as Hunter, and user settings. Limits count per owner.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a catalog in a setting (Priority: P1)

An author opens the library. On their setting "Ashen Realms" they choose "New catalog", name it
"Relics", and it appears under the setting next to the document types, with its own icon.
Selecting it shows an empty table. The author adds columns "Power" (number) and "Cursed"
(toggle), then adds entries: "Bone Flute, 2, off" and "Black Mirror, 4, on".

The author can also create a catalog under a shipped setting, for example house-rule weapons for
Star Wars, or under a ruleset's "Rules only". A catalog that every setting of a ruleset should
share, such as "Common firearms" for all V5 chronicles, is created on the ruleset itself: it is
listed directly under the ruleset, above its settings.

**Why this priority**: Without a catalog to pick from, nothing else in the feature works.

**Independent Test**: Create a catalog in a user setting and in Star Wars, add columns and
entries, close and reopen the library, and check that everything is kept.

**Acceptance Scenarios**:

1. **Given** a user setting, **When** the author creates catalog "Relics", **Then** it appears
   under the setting beside its types and is selected, with an empty entries table.
2. **Given** the "Relics" catalog, **When** the author adds a number column "Power" and an entry
   "Bone Flute" with Power 2, **Then** the table shows the row. After the page is reloaded, the
   catalog, the column, and the entry are still there.
3. **Given** a catalog with entries, **When** the author renames an entry, reorders entries,
   renames a column, or changes a column's type, **Then** the table updates. A value that no
   longer fits the new type becomes empty, and the author is warned before the change.
4. **Given** a table copied from a spreadsheet (name, then values in column order, separated by
   tabs), **When** the author pastes it into the catalog, **Then** one entry per line is added.
   Lines that do not fit are listed and not added.
5. **Given** the Star Wars setting, **When** the author creates a catalog there, **Then** it is
   listed under Star Wars and marked as the user's own.
6. **Given** the ruleset "World of Darkness 5th Edition", **When** the author creates catalog
   "Common firearms" on it, **Then** it is listed under the ruleset above its settings, and
   templates of Rules only, Hunter, and every user V5 setting can bind it.
7. **Given** the shipped Star Wars catalogs, **When** the author looks at Star Wars in the
   library, **Then** they are listed read-only, with their entries viewable. They cannot be
   edited or deleted.

---

### User Story 2 - Pick from your catalog in a choice field (Priority: P1)

In the template editor, the author binds a choice field "Relic" to "Relics". The catalog picker
lists the setting's own catalogs next to the shipped ones. The existing mapping editor maps
"Power" to the number field "Relic power" and "Cursed" to the toggle "Relic cursed". On the
sheet, choosing "Black Mirror" fills "Relic power" with 4 and turns "Relic cursed" on, in one
step.

**Why this priority**: Choice fields are the main place catalogs are used, and the backlog entry
names them.

**Independent Test**: Bind a field to a user catalog, pick each entry on a document, and check
the choice and every mapped target.

**Acceptance Scenarios**:

1. **Given** a template of the setting "Ashen Realms", **When** the author opens the catalog
   picker of a choice field, **Then** it lists "Relics" (marked as the user's own), the
   catalogs of the setting's ruleset such as "Common firearms", and the shipped catalogs of the
   setting's system.
2. **Given** a choice field bound to "Relics" with mappings, **When** the reader picks "Black
   Mirror", **Then** the field shows "Black Mirror" and the mapped fields receive 4 and on.
3. **Given** a template of another setting, **When** the author opens the catalog picker,
   **Then** "Relics" is not offered.
4. **Given** a catalog with more than 12 entries, **When** the reader opens the choice,
   **Then** it is searchable, as long shipped catalogs are.
5. **Given** a document that picked "Black Mirror", **When** the author later renames the entry
   to "Dark Mirror", **Then** the document shows "Dark Mirror". The document keeps pointing at
   the entry, not at its old name.

---

### User Story 3 - Suggestions in lists and table columns (Priority: P2)

A custom list "Relics carried" suggests entries of the bound catalog while the reader types a
name. Picking one fills the entry's name and, when a number column is mapped, its value.

A template table "Inventory" has a choice column "Item" bound to "Relics", and columns "Power"
and "Cursed". Picking an item in a row fills that row's Power and Cursed, and leaves the other
rows alone.

**Why this priority**: These are the second and third use sites the maintainer chose. They
reuse the same catalog.

**Independent Test**: Bind a custom list and a table column to "Relics". Type and pick in the
list, then pick in two table rows, and check what each row stores.

**Acceptance Scenarios**:

1. **Given** a custom list bound to "Relics" with "Power" mapped to the entry value, **When** the
   reader types "Bo" in a new entry's name, **Then** "Bone Flute" is suggested. Picking it sets
   the name to "Bone Flute" and the value to 2.
2. **Given** the same list, **When** the reader types a name that is not in the catalog,
   **Then** it is kept as free text, as today.
3. **Given** a table with a choice column bound to "Relics" and fills to the "Power" and
   "Cursed" columns, **When** the reader picks "Black Mirror" in row 2, **Then** only row 2's
   Power and Cursed change, to 4 and on.
4. **Given** a table fill that targets a field outside the table, **When** the author tries to
   map it, **Then** the editor offers only the columns of the same table.

---

### User Story 4 - Move, delete, export, and import catalogs (Priority: P2)

A catalog behaves like a document type in the library. It can be:

- renamed;
- moved to another setting, by drag, the Move… picker, or the context menu;
- deleted, with a confirmation that names the templates using it;
- exported and imported with library branches.

Moving a catalog to a setting of another system asks for confirmation. Templates of the old
setting lose it and fall back to manual choice.

**Why this priority**: Library parity. Authors expect the same actions on every row they own,
and sharing a setting by file must carry its catalogs.

**Independent Test**: Export a setting with a catalog, delete both, and import the file.
Separately, move a catalog and delete a catalog that a template uses.

**Acceptance Scenarios**:

1. **Given** a setting with a catalog, **When** the author exports the setting, **Then** the file
   carries the catalog with its columns and entries. Importing it elsewhere recreates the catalog
   under the setting.
2. **Given** an import whose catalog already exists and differs, **When** the preview shows it,
   **Then** it is a conflict with Replace or Keep both, like types.
3. **Given** a catalog used by two templates, **When** the author deletes it, **Then** the
   confirmation names both templates. After deleting, their fields offer manual choice and
   documents keep showing what they had picked, as text.
4. **Given** a catalog in "Ashen Realms" (V5), **When** the author moves it to a Star Wars
   setting, **Then** a confirmation says that templates of "Ashen Realms" will lose it.
5. **Given** a picked export that includes a template bound to a user catalog, **When** the
   export closure is built, **Then** the catalog is added automatically as a needed part, like a
   type's parent setting.

---

### User Story 5 - Authors learn it from the guide and the storybook (Priority: P3)

The editor guide explains catalogs: where they live, columns, entries, pasting, binding a field,
list, or table column, and what happens on delete or move. The "?" beside the catalog picker
opens that section. The storybook shows a choice field, a list, and a table column bound to a
user catalog.

**Why this priority**: Required by the project's rules (constitution VI), but it builds on the
other stories.

**Independent Test**: Open the guide section from the editor. Check that the storybook shows the
three bound examples.

**Acceptance Scenarios**:

1. **Given** the field editor, **When** the author clicks "?" beside the catalog picker,
   **Then** the guide opens at the catalogs section in the reader's language.
2. **Given** the storybook, **When** a reviewer opens the template elements page, **Then** it
   shows a field, a list, and a table column bound to a sample user catalog.

---

### Edge Cases

- **An entry's name is empty or duplicated**: names are required. Duplicates are allowed but
  flagged in the table, since two entries may share a name with different details.
- **A catalog has no entries**: bound fields offer no options and show "No entries yet".
- **A column is deleted while templates map it**: those mappings are listed in the confirmation,
  and they become editor issues in the templates, as unknown fill details do today.
- **A column's type changes**: values that cannot convert become empty. Number to text keeps the
  digits; text to number keeps only numeric text; toggle converts to and from "yes"/"no" and
  1/0.
- **An entry is deleted that documents picked**: documents keep the picked name as text,
  shown as today for a stored value the catalog no longer offers.
- **Pasted rows with more cells than columns**: the extra cells are ignored and the line is
  reported. Fewer cells leave the missing values empty.
- **A limit is reached**: the table says so and blocks the next add. The limits are 1000 entries,
  20 columns, and 50 catalogs per owner (setting or ruleset); a template may therefore see up
  to 100 user catalogs. An import that would exceed the per-owner limit shows the extra
  catalogs as unavailable, with the limit as the reason, and installs the rest.
- **A setting is deleted**: its catalogs are deleted with it, after the same confirmation that
  already lists its types.
- **A setting is moved to another ruleset**: its catalogs move with it. Templates in it lose the
  old ruleset's catalogs and gain the new ones; the move confirmation names the bindings that
  break.
- **A catalog moves from a ruleset down to one setting**: templates of the other settings lose
  it; the confirmation names them. Moving up from a setting to its ruleset loses nothing.
- **A shipped setting's system is unavailable**: its user catalogs are listed under
  "Unavailable", like its types.
- **Shipped catalog names**: the ids of user catalogs can never collide with shipped catalog
  ids.

## Requirements _(mandatory)_

### Functional Requirements

**Catalogs in the library (US1, US4)**

- **FR-001**: Users MUST be able to create a catalog under any setting (their own, a shipped one,
  or a ruleset's "Rules only") or under a ruleset. The library tree MUST list a setting's
  catalog under that setting beside its types, and a ruleset's catalog directly under the
  ruleset above its settings, each with a distinct icon and the "yours" badge.
- **FR-002**: The library MUST list shipped catalogs read-only under the setting or ruleset that
  declares them (Star Wars catalogs under Star Wars, V5 catalogs under the V5 ruleset). Their
  entries MUST be viewable and not editable.
- **FR-003**: Users MUST be able to rename, move (drag, Move…, context menu), and delete their
  catalogs. A move to another system and a delete MUST be confirmed, naming the templates that
  use the catalog.
- **FR-004**: Deleting or moving a setting MUST delete or move its catalogs with it, listed in
  the existing confirmation.
- **FR-005**: The library search and the "Only yours" filter MUST include catalogs.

**Columns and entries (US1)**

- **FR-006**: A catalog MUST have author-defined columns, each with a name and a type (text,
  number, or toggle). Columns MUST be addable, renamable, reorderable, retypable (with a
  warning when values will be lost), and deletable (with the mappings that use them listed).
- **FR-007**: Entries MUST have a required name and one value per column. They MUST be addable,
  editable in place, reorderable, and deletable.
- **FR-008**: Users MUST be able to paste tab-separated lines (name first, then columns in
  order) to add entries in bulk. Lines that do not fit MUST be reported and skipped.
- **FR-009**: A catalog MUST hold up to 1000 entries and 20 columns, and each owner (a setting
  or a ruleset) up to 50 catalogs. The library MUST say when a limit blocks an action.
- **FR-010**: Catalogs, columns, and entries MUST persist in the browser like types and
  settings, and survive reloads.

**Use sites (US2, US3)**

- **FR-011**: The catalog picker of a choice field MUST offer the user catalogs of the template's
  setting and of that setting's ruleset, together with the shipped catalogs it offers today. It
  MUST NOT offer catalogs of other settings or other rulesets.
- **FR-012**: A choice field bound to a user catalog MUST offer its entries by name, become
  searchable above 12 entries, and on pick overwrite every mapped target with the entry's
  column values, with the same copy-on-select rules as shipped catalogs.
- **FR-013**: A document MUST store the picked entry by a stable identity, so renaming the entry
  updates what the document shows. When the entry is gone, the document MUST show the last
  picked name.
- **FR-014**: A custom list MUST be able to bind a catalog. Typing an entry's name suggests the
  catalog's entries, picking one sets the name, and a mapped number column sets the entry's
  value. Free text MUST stay allowed.
- **FR-015**: A choice column of a template table MUST be able to bind a catalog. Its fills MUST
  target only columns of the same table and MUST write only the row where the pick happened.

**Degradation and files (US4)**

- **FR-016**: A template bound to a catalog that is missing MUST degrade to manual choice and
  report it, as it does today for shipped catalogs. Stored values MUST stay visible.
- **FR-017**: Library export MUST include picked catalogs, and MUST add catalogs that picked
  templates are bound to automatically. Library import MUST preview catalogs with the same
  new / same / conflict / unavailable states and the same Replace or Keep both choices as types.
- **FR-018**: Older library files, type files, and template files MUST still import.

**Guide and storybook (US5)**

- **FR-019**: The editor guide (English and Russian) MUST describe catalogs, and the catalog
  picker's "?" MUST open that section.
- **FR-020**: The storybook MUST show a field, a list, and a table column bound to a sample user
  catalog, and its guard test MUST require them.
- **FR-021**: All new interface text MUST be available in English and Russian.

### Key Entities

- **User catalog**: A named list owned by one setting or one ruleset. It has a stable identity, a name, an
  ordered set of columns, an ordered set of entries, and the setting it belongs to.
- **Catalog column**: A stable identity, a name, and a type (text, number, or toggle).
- **Catalog entry**: A stable identity, a required name, and one value per column.
- **Catalog binding (template)**: Already exists for shipped catalogs. It names the catalog and
  maps catalog columns (for user catalogs) or details (for shipped ones) to fill targets. For a
  table column, the targets are columns of the same table. For a custom list, the target is the
  entry's value.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An author creates a catalog with 3 columns and 10 entries (pasted from a
  spreadsheet) and binds a choice field to it in under 3 minutes.
- **SC-002**: Picking an entry fills every mapped target in one step, for all three use sites.
  In the tests, 100% of mapped targets receive the entry's values and 0 unmapped targets change.
- **SC-003**: A library export of a setting with catalogs, imported into an empty browser,
  recreates every catalog, column, and entry exactly, with 0 differences.
- **SC-004**: Deleting a catalog in use leaves 0 documents with a blank choice: every document
  that had picked an entry still shows its name.
- **SC-005**: Every library, template, and document file saved before this feature imports with
  0 new issues.

## Assumptions

- User catalogs live in the same browser storage as user types and settings, and follow their
  save and quarantine rules.
- The library's tree gains no intermediate level. A catalog is a leaf: under a setting it is a
  sibling of the setting's types, under a ruleset a sibling of the ruleset's settings.
- The ruleset's "Rules only" setting and shipped line settings can own user catalogs. These are
  stored against the system, as shipped-setting types already are. Module lines such as Hunter
  are stored against their module.
- The custom list binding uses the list's name column for suggestions and its value for one
  mapped number column. Richer list items wait for T-077.
- The mapping editor for user catalogs reuses the existing catalog binding editor, with the
  catalog's columns as the details.
- Pasting accepts plain tab-separated text, which is what spreadsheets put on the clipboard.
  File upload of CSV is not included.
