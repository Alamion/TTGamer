# Feature Specification: Visual template editor and template-defined document types

> **Change record.** Partly superseded by 013 (the library tree replaces the template library's type and setting controls; creating a type or setting no longer creates a page; library files supersede the type-file export). Current template behavior: `.agents/skills/sheet-templates/SKILL.md`.

**Feature Branch**: `testing`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Let's discuss the topic for the next spec. I'd like to work on templates. Two features interest me: changing the visual format of the template editor so the user sees right away where each element will be and how it will look (plus a quick preview), which will make manual editing much easier; the second feature is taking templates out of 'strictly a view' and letting templates create new settings, or new data types within an existing setting. You can also pick up small derivatives along the way."

## Scope

| Backlog | Entry                                                                                 | Role in this feature                                          |
| ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| T-054   | Live template editing                                                                 | User Stories 1–2 (the visual editor)                          |
| T-046   | Composite template keys                                                               | Prerequisite of User Story 4: user types multiply page owners |
| T-041   | Ruleset / module / setting layering for existing systems                              | User Story 7: Star Wars moves onto a WoD 2e ruleset           |
| —       | Undo/redo and element duplication in the editor (new, derived)                        | User Story 3                                                  |
| —       | Template-defined document types and user settings (new; roadmap `gm-notes-templates`) | User Stories 4–6                                              |

Today a template is only a **view**: it lays out a document whose type (its data, validation,
and place in the create dialog) is always shipped by a game system. The editor edits an
abstract tree of panels; the author sees the finished page only after saving and switching the
sheet to it. This feature changes both: the editor shows the page as it will look while it is
edited, and a template can become the definition of a new document type that users create,
export, and share like any shipped type.

Out of scope: new mechanics (dice rules, derived-stat rules, trait scales) defined by users;
the free-form markdown element (T-048); static template images (T-036); system/custom field
parity (T-058); a public template gallery or any online sharing — sharing stays file-based.

## Clarifications

### Session 2026-09-25

- Q: What is a user-created "setting"? → A: A named setting on an existing ruleset: it reuses
  the ruleset's reusable document types (character data, validation, dice) with the author's own
  pages, and groups the author's user types. Users define no mechanics.
- Q: Interaction model of the visual editor? → A: The page is the central surface for seeing and
  arranging; an outline of the tree sits on one side and the selected element's settings on the
  other; narrow screens switch between Page / Outline / Settings. Confirmed by the maintainer
  after reviewing a clickable prototype (hover chip with a drag grip, "+" insertion slots between
  elements, empty-column drop zones, hatched condition-hidden elements, a sample-data note, and a
  preview mode with a data picker).
- Q: Prototype review finding → A: Editor keyboard shortcuts failed under a non-Latin keyboard
  layout (Russian); shortcuts must be bound to physical keys so they work on any layout.
- Q: Does the feature depend on T-041? → A: T-041 is included: Star Wars migrates from one combined
  system onto a classic World of Darkness 2nd Edition ruleset plus the Star Wars setting, so user
  settings are available on both the WoD 2e and V5 rulesets.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See the page while editing it (Priority: P1)

A template author opens the editor and sees, next to the element settings, the page exactly as
the sheet will render it — real sections with their accent bars, real columns at their
proportional widths, real dot ratings, tracks, tables, and lists — filled with sample data.
Every change (a new field, a renamed label, a column count, a hidden title, a display
condition) appears in the page immediately. Clicking an element in the page selects it and
opens its settings; selecting an element in the outline highlights it in the page.

**Why this priority**: this is the main pain today — the author edits blind and has to save,
leave the editor, and switch views to learn what a change did. Everything else in the visual
editor builds on this.

**Independent Test**: open any shipped default for editing, change a label, a column count, and
a group's "Show title" setting; each change is visible in the page pane without saving, and
clicking an element in the pane opens that element's settings.

**Acceptance Scenarios**:

1. **Given** the editor is open on a template, **When** the author changes any setting of any
   element, **Then** the page pane reflects the change without saving and without leaving the
   editor.
2. **Given** a section with two columns at widths 2:1, **When** the author views it in the page
   pane, **Then** the section shows two real columns at those proportions with children placed
   in their assigned column.
3. **Given** the page pane, **When** the author clicks an element, **Then** that element becomes
   the selected element, its settings open, and the outline scrolls to it; **When** the author
   selects an element in the outline, **Then** the page pane scrolls to it and marks it.
4. **Given** an element with a display condition that is currently false for the sample data,
   **When** the author views the page pane, **Then** the element is still shown, visibly marked
   as conditionally hidden, so it can be selected and edited.
5. **Given** the page pane, **When** the author types into a field or clicks a dot rating,
   **Then** only the sample data changes; the author's real documents are never written.

---

### User Story 2 - Arrange elements where they will appear (Priority: P1)

The author reorders, moves, and adds elements directly in the page pane: dragging a group into
another column, dropping a new field between two existing ones, or dragging a section above
another. Column controls add and remove real columns in the pane, and widths can be adjusted
there. Every such action is also available from the keyboard.

**Why this priority**: seeing the page (Story 1) is only half the gain; arranging elements in
the page is what makes manual editing fast. It depends on Story 1's pane.

**Independent Test**: in the page pane, drag a field from column 1 to column 2 of the same
group, add a new field between two others, and move a section above its predecessor; the
outline and the saved template match what the pane showed.

**Acceptance Scenarios**:

1. **Given** a multi-column container, **When** the author drags an element into another column,
   **Then** the element's column placement changes and the pane shows it there.
2. **Given** the page pane, **When** the author uses "add element here" between two elements,
   **Then** the element menu (Section, Field group, Field, Table, List, Tracker) opens and the new
   element is inserted at exactly that position and selected.
3. **Given** a keyboard-only author with an element selected, **When** they use the move
   commands, **Then** the element moves up/down, into/out of containers, and between columns,
   and the new position is announced to screen readers.
4. **Given** an invalid move (a container into itself, past the depth limit), **When** the author
   attempts it, **Then** the move is refused with the existing explanatory message and nothing
   changes.

---

### User Story 3 - Quick preview and safe experimentation (Priority: P2)

At any point the author switches the editor into a full-width preview that shows the page as a
reader sees it, with display conditions evaluated, editor marks removed, and a choice of preview
data: the currently open document (when it is of the template's type), a shipped example of the
same type, or a blank document. The author can undo and redo any edit, and duplicate an element
(with its children) instead of rebuilding it.

**Why this priority**: the preview confirms the final result and the undo history makes
direct manipulation safe; both are small next to Stories 1–2 but remove the remaining reasons to
save-and-check.

**Independent Test**: toggle the preview on a Star Wars character template with the open
character selected as data; the page matches what the sheet will show after saving. Delete a
section, undo, redo, undo again; the section is back with its settings. Duplicate a group; the
copy has fresh unique identifiers.

**Acceptance Scenarios**:

1. **Given** the editor, **When** the author toggles the quick preview, **Then** the page renders
   without editor chrome, with display conditions applied, within one second for the largest
   shipped template.
2. **Given** the preview, **When** the author chooses the open document as data, **Then** its
   real values appear read-only; **When** they choose a shipped example or blank data, **Then**
   the page switches to it.
3. **Given** any sequence of edits in one editor session, **When** the author undoes and redoes,
   **Then** each step restores the previous and next state exactly, including selection.
4. **Given** a selected element, **When** the author duplicates it, **Then** a copy with new
   unique identifiers is placed right after it; custom values of the original are not shared by
   the copy unless the author reuses the same value key on purpose.

---

### User Story 4 - Create a new document type from a template (Priority: P2)

A GM wants a document type the setting does not ship — for example "Organization" or "Planet"
for Star Wars, or "Cell" for Hunter. In the template library they choose "New document type",
pick the setting it belongs to, give it a name, and build its page in the editor. Once saved,
the type appears in the create dialog under that setting, next to the shipped types; documents
of that type are created, listed, edited, exported, and imported like any other document, and
the type can have more than one page (for example a full page and a brief).

**Why this priority**: it turns templates from a presentation layer into the template builder the
`gm-notes-templates` roadmap path promises, and it is the first half of the second requested
feature. It does not depend on the visual editor, but benefits from it.

**Independent Test**: create the type "Organization" in the Star Wars setting with a name field,
a select from an existing Star Wars catalog, a rating, and a list; create two Organization
documents, fill them, reload the application, and export/import one of them; all values survive.

**Acceptance Scenarios**:

1. **Given** the template library, **When** the author creates a new type in a setting and saves
   its page, **Then** the create dialog lists the type under that setting with the author's name
   for it.
2. **Given** a user type, **When** a document of it is created, **Then** it opens on the type's
   page and every value the author enters is kept after reload.
3. **Given** a user type page, **When** the author adds a field whose options come from one of
   the setting's catalogs, **Then** the catalog is offered. **Given** a user type owned by a
   setting under a publisher policy (for example the Hunter module), **When** its documents are
   shown or exported, **Then** they carry that policy's badge and notice exactly as the setting's
   shipped types do.
4. **Given** a user type, **When** the author adds a second template for it, **Then** documents of
   the type can switch between the two pages in the view selector.
5. **Given** a user type that has documents, **When** the author edits its page (removing a
   field), **Then** the documents keep the removed field's stored value (it reappears if the
   field returns) and nothing is lost silently.
6. **Given** a user type that has documents, **When** the author tries to delete the type,
   **Then** they are told how many documents use it and must confirm; the documents are kept and
   open on a generic fallback page that still shows their stored values.

---

### User Story 5 - Share a user type with other players (Priority: P3)

The GM exports the new type to a file and gives it to a player. The player imports it; the type
appears in their create dialog. When the GM exports a document of that type, the file carries
the type with it, so a player who has never imported the type can still open the document.

**Why this priority**: a type that only lives in one browser cannot be used at a shared table,
but sharing is only valuable once Story 4 works.

**Independent Test**: export a user type and a document of it from one browser profile; import
only the document into a clean profile; the document opens on its page and the type is now
listed in the create dialog.

**Acceptance Scenarios**:

1. **Given** a user type, **When** it is exported, **Then** the file contains the type and all of
   its pages and passes the same validation on import as a template file.
2. **Given** a document file whose type is unknown to the importer, **When** it is imported,
   **Then** the embedded type is installed with the document; **Given** the importer already has
   a different type with the same identity, **Then** the existing replace / keep both / cancel
   choice is offered before anything changes.
3. **Given** a type or document file for a setting the importer's application does not have,
   **When** it is imported, **Then** it is rejected with the existing "unknown system" error.

---

### User Story 6 - Define a user setting on an existing ruleset (Priority: P3)

A user setting is a named setting built on an existing ruleset (World of Darkness 5th Edition
or, after Story 7, World of Darkness 2nd Edition) that reuses the ruleset's character data and
dice, supplies its own pages for them, and groups its own user types.

A GM running a homebrew campaign on an existing engine creates a setting "Ashen Realms" on the
V5 ruleset. The create dialog then shows "Ashen Realms" as its own group containing a character
(the ruleset's character data and dice, laid out by the GM's own page with the GM's own trait
labels) and the GM's user types for that setting.

**Why this priority**: it completes "templates create new settings", but it rests on user types
(Story 4) and, for the WoD 2e engine, on Story 7.

**Independent Test**: create the setting "Ashen Realms" on V5 with one re-labelled character page
and one user type; create a character in it; its dice rolls follow V5 rules, and its sheet shows
the GM's page and the setting name.

**Acceptance Scenarios**:

1. **Given** a ruleset, **When** the GM creates a user setting on it, **Then** the create dialog
   shows a group with the setting's name containing the ruleset's reusable document types and
   the setting's user types.
2. **Given** a character created in a user setting, **When** it is rolled from, **Then** the
   ruleset's dice rules apply unchanged.
3. **Given** a user setting built on material under a publisher policy, **When** its documents are
   shown or exported, **Then** the ruleset's notices appear as for the shipped setting.

4. **Given** the WoD 2e ruleset after Story 7, **When** the GM creates a user setting on it,
   **Then** its characters use the WoD 2e character data and dice without any Star Wars material
   (no Force skills or Star Wars notices, and no Star Wars catalogs unless the GM's pages add
   them).

---

### User Story 7 - Star Wars runs on a reusable WoD 2e ruleset (Priority: P3)

The Star Wars system stops being one combined system and becomes the Star Wars setting on a
classic World of Darkness 2nd Edition ruleset, the way Hunter is a module on the V5 ruleset.
Players notice nothing: every existing Star Wars document, edited page, custom template, and
file keeps working. GMs gain the WoD 2e ruleset as a base for their own settings (Story 6).

**Why this priority**: it is what makes user settings possible on the engine most existing
documents use; it is invisible to players and therefore judged by what does not break.

**Independent Test**: with a profile holding Star Wars characters, droids, creatures, vehicles,
fodder groups, an edited default page, and a custom template, upgrade; every document opens on
the same page with the same values, rolls produce the same pools, and files exported before the
upgrade import after it.

**Acceptance Scenarios**:

1. **Given** Star Wars documents saved before the upgrade, **When** the application loads,
   **Then** they migrate to the layered form with no value, page assignment, or seeded preset lost.
2. **Given** a template or document file exported before the upgrade, **When** it is imported,
   **Then** it is read as the Star Wars setting on the WoD 2e ruleset.
3. **Given** the create dialog, **When** it lists Star Wars types, **Then** they appear under the
   same Star Wars heading as today, and the Star Wars publisher notices are unchanged.
4. **Given** the WoD 2e ruleset without the Star Wars setting, **When** its character data is
   inspected, **Then** it contains only the engine's traits, resources, tracks, and dice, and the
   Star Wars additions (Force skills and powers, droids, Star Wars catalogs) belong to the setting.

---

### Edge Cases

- A user type page is saved empty or invalid: saving is blocked by the existing draft issues;
  a type cannot exist without a valid page.
- Two user types in the same setting get the same name: allowed; identities differ, and the
  create dialog shows each one's description under the name (or "no description") so they can
  be told apart.
- A user type's identity collides with a shipped type added in a later release: the user type
  keeps working and keeps its documents; shipped and user identities never share a namespace.
- The edited template in the page pane exceeds the element limit (200) or depth (10): the pane
  keeps rendering the last valid state and shows the blocking issue.
- A binding or catalog in the template cannot resolve against the preview data: the pane shows the
  existing degraded-element notice, as the sheet would.
- The author drags on a touch screen or narrow window: the editor falls back to a single pane
  with a "Page / Outline / Settings" switch; move commands remain available.
- The preview data document is deleted while the editor is open: the preview falls back to blank
  data and says so.
- A user setting's ruleset is later changed in a release (new traits): the setting's pages keep
  rendering; new ruleset data simply has no place on a user page until the GM adds it.
- A document of a deleted user type is exported: the file carries no type. It imports elsewhere
  and opens on the fallback page with all its values, and it gets its page back once a type file
  with the same identity is imported.

## Requirements _(mandatory)_

### Functional Requirements

**Visual editor**

- **FR-001**: The editor MUST show a page pane that renders the draft template with the same
  renderer, styles, and layout rules as the sheet, updated after every edit without saving.
- **FR-002**: The page pane MUST render against sample data that is never written to the user's
  documents; interacting with controls in the pane MAY change the sample data only.
- **FR-003**: Selection MUST be shared between the page pane, the outline, and the settings pane in both
  directions (click to select, select to reveal and mark).
- **FR-004**: Elements hidden by a display condition MUST remain visible and selectable in the page
  pane, marked as conditionally hidden.
- **FR-005**: Authors MUST be able to reorder elements, move them between containers and columns,
  and insert new elements at a chosen position directly in the page pane, by pointer and by
  keyboard, with moves announced to assistive technology.
- **FR-006**: Column count and proportional widths MUST be adjustable with immediate effect in the
  page pane.
- **FR-007**: Invalid moves MUST be refused with an explanation and leave the draft unchanged.
- **FR-008**: The editor MUST offer a quick preview that renders the page as a reader sees it (no
  editor marks, display conditions applied), with a choice of preview data: the open document if
  it matches the template's type, any shipped example of that type, or blank data.
- **FR-009**: The editor MUST support undo and redo of every draft change within an editing
  session, restoring selection with each step.
- **FR-010**: The editor MUST let the author duplicate an element with its descendants, assigning
  new unique identifiers.
- **FR-011**: On narrow screens the editor MUST switch between page, outline, and settings
  instead of showing them side by side; all editing actions stay reachable.
- **FR-011a**: Editor keyboard shortcuts (undo, redo, duplicate, delete, move) MUST work
  regardless of the active keyboard layout, including Cyrillic layouts, and MUST NOT be swallowed
  by browser shortcuts while the editor has focus.
- **FR-012**: Editing performance MUST stay interactive on the largest shipped template (see
  SC-002); the page pane MUST NOT re-render untouched elements on every keystroke.

**Template-defined document types**

- **FR-013**: Users MUST be able to create a document type inside an existing setting by giving it a
  name and at least one page built in the template editor.
- **FR-014**: User types MUST appear in the create dialog under their setting, and documents of
  them MUST be creatable, editable, listable, exportable, and importable like shipped types.
- **FR-015**: A user type's documents MUST store their values in the document's own value storage;
  the type MUST NOT require system data it cannot validate.
- **FR-016**: User type pages MUST be able to use every custom element and field type, the
  setting's catalogs (with their fills), references to other documents, and formulas over their
  own values; they MUST NOT use elements that need a shipped type's system data (traits,
  resources, health tracks of a character).
- **FR-017**: Documents of a user type MUST carry the publisher notices of their setting exactly
  as the setting's shipped types do.
- **FR-018**: A user type MAY have several pages; each appears as a view in the view selector of
  its documents, and one is the type's default page.
- **FR-019**: Changing a user type's pages MUST never delete stored document values; values of
  removed fields are kept.
- **FR-020**: Deleting a user type that has documents MUST require confirmation stating the number
  of affected documents; those documents MUST be kept and open on a generic fallback page that
  lists their stored values.
- **FR-021**: User type identities MUST never collide with shipped type identities, including
  types shipped in future releases.
- **FR-022**: Stored template overrides and shipped-page lookups MUST be keyed by setting and page
  together, so edited pages stay attached to the correct setting and type as settings and user
  types multiply (T-046); existing overrides MUST migrate without loss.

**Sharing**

- **FR-023**: A user type MUST be exportable to a file containing the type and all its pages, and
  importable with the same validation, conflict choice (replace / keep both / cancel), and
  degradation report as template files.
- **FR-024**: Exporting a document of a user type MUST embed the type, so the document can be
  imported where the type is unknown; importing it installs the type after the same conflict
  choice.
- **FR-025**: Files referring to a setting the application does not have MUST be rejected with the
  existing unknown-system error.

**User settings**

- **FR-026**: Users MUST be able to create a named setting on an existing ruleset, which reuses the
  ruleset's reusable document types with the author's own pages and groups the author's user
  types for that setting.
- **FR-027**: Documents created in a user setting MUST follow the ruleset's validation and dice
  rules unchanged and carry the ruleset's publisher notices.
- **FR-027a**: User settings MUST be offered on every ruleset that has ruleset/setting layering:
  World of Darkness 5th Edition and World of Darkness 2nd Edition.

**WoD 2e ruleset (T-041)**

- **FR-027b**: Star Wars MUST become a setting on a World of Darkness 2nd Edition ruleset; the
  ruleset owns the engine's traits, resources, tracks, and dice, and the setting owns Star Wars
  material (Force, droids, catalogs, policies, shipped pages).
- **FR-027c**: Every persisted Star Wars document, edited default page, custom template, and
  exported file MUST keep working after the change with no data loss; if any stored identity
  has to change, it changes only through a versioned migration. Old files MUST still import.
- **FR-027d**: Players MUST see no change in Star Wars pages, labels, notices, or dice results.

**Degradation and diagnostics**

- **FR-028**: Every fallback introduced by this feature (unknown user type, missing type page,
  unresolved preview data) MUST report through the existing sheet diagnostics channel and render a
  labeled fallback, never an empty page or an error screen.

### Key Entities

- **Template (page)**: unchanged role — a declarative page for documents of one type in one
  setting; a type may own several.
- **User document type**: a document type created by a user: identity, translated-by-author name,
  owning setting, its pages, and which page is the default. Its documents keep all values in
  their own value storage.
- **User setting**: a named setting created by a user on an existing ruleset; groups ruleset
  document types (with the author's pages) and user types. Defines no mechanics.
- **Ruleset**: the mechanics layer a setting runs on (World of Darkness 5th Edition, and after
  Story 7 World of Darkness 2nd Edition); owns data shape, validation, and dice.
- **Type file**: a shareable file carrying one user type and its pages; a document file of a user
  type embeds one.
- **Preview data**: the document the editor renders against — a scratch copy of the open
  document, a shipped example, or blank data; discarded with the editor session.
- **Edit history**: the per-session sequence of draft states that undo and redo walk through.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An author can make any layout change (move an element to another column, add a field
  at a position, change column widths) and see its final look without saving or leaving the
  editor — 0 save-and-switch round trips needed, compared with at least one today.
- **SC-002**: On the largest shipped template (the Star Wars full character sheet, ~120 elements),
  the page pane reflects a keystroke or a move within 100 ms and the quick preview opens within
  1 second on a mid-range laptop.
- **SC-003**: In a hallway test, an author who has never used the editor rebuilds a given
  two-column group with three fields at the right positions in under 5 minutes, unaided.
- **SC-004**: A GM can create a new document type with five fields and create the first document
  of it in under 10 minutes.
- **SC-005**: 100% of values entered in user-type documents survive reload, page edits that remove
  their fields, export, and import into a clean profile.
- **SC-006**: 0 existing edited default pages are lost or detached from their setting after the
  storage key migration.
- **SC-007**: Every editor action in Stories 1–3 is achievable by keyboard alone. Every
  interactive editor element has an accessible role and name, verified by component tests that
  query by role and name. Automated axe checks stay with the separate backlog item T-034.

## Assumptions

- Users are the same people who already author templates; no permissions or roles are
  introduced — everything stays local to the browser plus file-based sharing.
- The page pane uses sample data, not the real document, so experimenting in the editor can never
  damage a character; the open document is used read-only only in the quick preview.
- The settings of the selected element keep today's controls (source, layout, labels, conditions);
  they move from the tree of panels into a settings pane for one element at a time, next to the
  page and the outline (see Clarifications).
- User types store values only in the document's value storage; they get no new system data
  schema, no custom validation rules beyond field bounds, and no custom dice mechanics.
- A user type's name is entered by the author in one language; it is not part of the product's
  translated strings (translation of user content is out of scope).
- The publisher notice of a user type or user setting is inherited from its setting/ruleset; users
  cannot add or remove notices.
- Deleting a user type never deletes documents; cleaning them up is a separate, explicit action.
- Scale: a user is expected to have tens of user types and up to thousands of documents of them;
  the create dialog and view selector list types, not documents, so no new unbounded list is added.
- The WoD 2e ruleset extracted in Story 7 covers only what the Star Wars hybrid already uses from
  the classic engine; the remaining classic WoD lines (T-043) are not added by this feature.
- Source material and policies (constitution VIII), for the systems this feature adds or
  reshapes:
    - **World of Darkness 2nd Edition engine** (`wod-2e`, Story 7): source material is the
      classic World of Darkness 2nd Edition mechanics and trait names (attributes, the classic
      Talents / Skills / Knowledges names, virtues, willpower, health levels), used as names
      only with rules text in the project's own words. No community policy applies (the Dark
      Pack covers World of Darkness 5th Edition material only), so there is no notice or badge.
    - **Star Wars setting**: unchanged material and unchanged notices (none).
    - **V5 core character** (`v5-character`): source material is the World of Darkness 5th
      Edition engine already used by Hunter. The policy is the Paradox Dark Pack, with the
      existing badge on its sheets and the notice in its exports.
    - **User settings and user types**: they inherit their ruleset's and setting's policies and
      add no publisher material of their own; user content is the user's own.

    This follows the maintainer decision of 2026-09-25 and constitution 1.4.2.

- Shipping defaults stay as they are; no shipped page is redesigned by this feature.
