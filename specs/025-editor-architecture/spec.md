# Feature Specification: Template Editor Architecture

**Branch**: `025-editor-architecture` | **Created**: 2026-10-06 | **Status**: Draft

**Input**: "Delete the stale branches and start the next spec as agreed: the template editor
architecture (T-097), with the `carried()` source-switch fix."

## Context

The template editor grew through specs 012–023 faster than its structure. Three things have no
single owner, so each editor feature edits every place that lists them by hand: the editor's state
and operations (the dialog component is 1,780 lines with four ways to change the draft,
single-element and multi-element versions of the same operation, and changed in 16 of the 65 commits
of specs 018–023), each element setting (described in six or seven places), and each element kind
(the tracker field touched 30 files, about 15 of them manual registration). One defect already comes
from this: switching an element's value source keeps only three of its settings and drops its column
span and display condition. This spec gives each of those things one owner without changing what
template authors can do, apart from that fix. It is the second of the three structural specs (024
process, 025 editor, 026 browser tests and upgrades); backlog entry T-097 in `TODO.md`.

## Clarifications

### Session 2026-10-06

- Q: Does the 600-line file limit apply to every editor file, including the three large settings
  panels? → A: No (B). The dialog is at most 400 lines and the files split out of the page model at
  most 600; the panels are measured before and after, and one still over 600 lines becomes a backlog
  entry.
- Q: How is the author told that a source or kind switch dropped settings? → A: A screen-reader
  announcement naming the dropped settings by their labels, like the existing delete, duplicate, and
  move announcements; no new visible element.

## User Scenarios & Testing

### User Story 1 - Settings survive a source or kind switch (Priority: P1)

A template author has placed an element, given it a column span and a display condition, and then
picks a different value source for it (or switches a list to a table, or a group to a section).
Every setting that still means something for the new element stays as it was; only settings the new
element cannot have are dropped, and a screen-reader announcement names them. Behind this, each
setting is described once — its key, label, which elements have it, whether it is shared in a
multi-element selection, whether it survives a switch, and where a problem with it is reported — and
every editor surface reads that description.

**Why this priority**: it is the only author-visible defect in scope, and the setting description is
what the other stories and the later T-058 (system field parity) build on.

**Independent Test**: switch the source of an element that has a span, a display condition, a
compact display, and a hidden label; all four are kept. Then list every setting of every element
type from the description and check that the settings panel, the multi-selection panel, the switch
rules, and issue locations all agree with it.

**Acceptance Scenarios**:

1. **Given** a number field spanning two columns with a display condition, **When** the author binds
   it to a document trait, **Then** the bound element still spans two columns and keeps the display
   condition.
2. **Given** a bound trait element with a hidden label, **When** the author unbinds it, **Then** the
   free field keeps the hidden label, span, and display condition.
3. **Given** a list with settings a table cannot have, **When** the author switches it to a table,
   **Then** only those settings are dropped and announced by label, switching back restores them in
   the same session, and undo restores the list in one step.
4. **Given** several fields of one type are selected, **When** the author opens the settings panel,
   **Then** it offers exactly the settings the description marks as shared for that type.
5. **Given** a setting with an invalid value, **When** the author tries to save, **Then** the issue
   points at that setting's control, as it does today.

---

### User Story 2 - One editing session owns state, operations, and commands (Priority: P1)

Every change to the page being edited goes through one editing session: it holds the draft, history,
and selection, and applies operations that are plain functions of the page. An operation acts on the
selection, and a single selected element is a selection of one, so there is one version of each
operation instead of a single-element and a multi-element copy. Each command (cut, copy, paste,
duplicate, delete, move, undo, redo, and the rest) states once what it does and when it is
available; the keyboard, the element menu, the toolbar, and the shortcut list all read that.

**Why this priority**: the dialog is where most editor changes collide; shrinking it to layout and
wiring is the largest speed-up for later editor features.

**Independent Test**: the existing editor behavior tests pass with only import-path changes; each
operation has unit tests that run without rendering the editor; the dialog component is short enough
to read in one sitting (SC-003).

**Acceptance Scenarios**:

1. **Given** one element is selected, **When** the author deletes, duplicates, or moves it, **Then**
   the result, the undo step, and the screen-reader message are the same as today.
2. **Given** three elements are selected, **When** the author runs the same commands, **Then** the
   result is the same as today: one undo step and a message naming the count.
3. **Given** a command is unavailable (for example "move out" at the page root, or "move up" on the
   first element), **When** the author opens the element menu or presses its keys, **Then** the menu
   shows it disabled and the keys do nothing, both for the same reason.
4. **Given** the author closes the editor with unsaved changes, **When** they confirm discarding,
   **Then** nothing is written, as today.

---

### User Story 3 - Element kinds register once for the editor (Priority: P2)

A maintainer adding an element type or kind to the editor registers it in one place: its factory for
new elements, its settings panel, its entry in the add menu, its outline icon and label, and its
kind switches. Anything missing is a compile-time error, as it already is for the sheet renderer.

**Why this priority**: it removes most of the manual registration that made the tracker field touch
30 files, but no author-visible behavior depends on it.

**Independent Test**: remove one element type's editor entry and confirm the project no longer
type-checks; walk the add menu, outline, and settings panel for every existing element and see them
unchanged.

**Acceptance Scenarios**:

1. **Given** the registry lists every element type, **When** the editor shows the add menu, the
   outline, and the settings panel, **Then** each element appears with the same label, icon, and
   controls as today.
2. **Given** a new field type is added to the template schema without an editor entry, **When** the
   project is type-checked, **Then** it fails and names the missing entry.

---

### User Story 4 - Save warnings come from one list (Priority: P2)

Before a save that would stop showing values players have entered (list entries a changed list no
longer shows, tracker marks, values of a list switched to a table, documents moved with a page), the
author is asked to confirm and sees every such effect. Each kind of effect is one entry in a list of
save checks; the confirmation shows whatever the entries report.

**Why this priority**: every recent spec added a check by editing the save handler, the pending
state, and the confirmation text; one list makes the next check one entry.

**Independent Test**: a save that triggers every existing check shows the same confirmation text as
today; a test-only check added to the list appears in the confirmation without other changes.

**Acceptance Scenarios**:

1. **Given** a save that removes a tracker mark and switches a list holding entries to a table,
   **When** the author saves, **Then** the confirmation names both effects, as today.
2. **Given** a save with no effects, **When** the author saves, **Then** it completes without a
   confirmation.

---

### User Story 5 - The editor is one feature module (Priority: P3)

The editor's code lives in one feature folder next to the sheet renderer, split by concern (page
model, operations, issues, settings, element kinds, session, components), with no file mixing
unrelated concerns. Module notes and the template skill describe the new layout.

**Why this priority**: it makes the structure of the other stories visible, but it is mostly moves.

**Independent Test**: no editor file imports another feature's internals; the page-model file no
longer holds issue collection, catalog bindings, and table columns together; guidance files point at
the new paths and the documentation checks pass.

**Acceptance Scenarios**:

1. **Given** the moved editor, **When** the full verification runs, **Then** it passes, including
   dead-code and boundary checks.
2. **Given** a maintainer reads the module notes, **When** they look for where to add a setting, an
   element kind, a command, or a save check, **Then** each has one named place.

### Edge Cases

- Settings dropped by a switch are remembered for the rest of the session, so switching back
  restores them, as list and table switches already do.
- A display condition that refers to the switched element's own old value key keeps pointing at that
  key; the existing reference check reports it if it no longer resolves.

## Requirements

### Functional Requirements

- **FR-001**: Switching an element's value source or kind MUST keep every setting that the new
  element can have, including column span, display condition, compact display, and hidden label.
- **FR-002**: Settings the new element cannot have MUST be dropped, kept for the session so
  switching back restores them, and the switch MUST be one undo step. When settings are dropped, the
  editor MUST announce their labels to screen readers (no new visible element).
- **FR-003**: Each element setting MUST be described once: key, label, the element types that have
  it, whether it is shared in a selection of several elements of one type, whether it survives a
  switch, and where issues about it are reported.
- **FR-004**: The settings panel, the multi-selection panel, switch rules, and issue locations MUST
  read the setting descriptions; a test MUST fail when a setting control exists without one.
- **FR-005**: All changes to the edited page MUST go through one editing session that holds the
  draft, history, and selection.
- **FR-006**: Each editing operation MUST be a function of the page and the selection that can be
  tested without rendering the editor; one selected element MUST use the same operation as several.
- **FR-007**: Messages announced after an operation MUST stay as today: an element's name for one, a
  count for several.
- **FR-008**: Each command MUST define what it does and when it is available once; the keyboard, the
  element menu, the toolbar, and the shortcut list MUST read that definition.
- **FR-009**: Each element type and kind MUST have one editor entry (factory, settings panel, add
  menu entry, outline label and icon, kind switches); a missing entry MUST fail the type check.
- **FR-010**: Each save effect that hides stored values MUST be one entry in a list of save checks,
  and the save confirmation MUST show what every entry reports.
- **FR-011**: The editor's code MUST live in one feature folder split by concern; no file MAY mix
  page-model edits with issue collection or with catalog-binding edits.
- **FR-012**: Template authors MUST see no change in the editor apart from FR-001 and FR-002: same
  controls, labels, shortcuts, messages, and saved output for the same edits.
- **FR-013**: Module notes and the template skill MUST name one place to add a setting, an element
  kind, a command, and a save check; superseded descriptions MUST be removed, not duplicated.

### Key Entities

- **Setting description**: one editor setting — key, label, element types, shared flag, switch
  behavior, issue location.
- **Editing session**: the draft, its history, and the selection; it applies operations and
  remembers dropped settings for the session.
- **Operation**: a change to the page given the selection, returning the new page or a reason it
  cannot apply.
- **Command**: a user action with its availability, keys, and menu placement.
- **Element editor entry**: what the editor needs to create, configure, list, and switch one element
  type or kind.
- **Save check**: one kind of effect on stored values that a save confirmation reports.

## Success Criteria

- **SC-001**: For every setting of every element type, a source or kind switch keeps 100% of the
  settings the new element can have (checked by one test over all settings).
- **SC-002**: Adding an element kind, a command, or a save check needs one code location plus
  translations and tests; adding a setting needs its description and its control in the element's
  panel. The type check or a test fails if a required part is missing.
- **SC-003**: The editor dialog component is at most 400 lines, and each file split out of the page
  model is at most 600 lines. The settings panels are measured before and after; a panel still over
  600 lines gets a backlog entry rather than failing this criterion.
- **SC-004**: Every existing editor behavior test passes with at most import-path changes; no
  assertion is weakened or removed.
- **SC-005**: Editor timing tests stay within their current budgets, and the unit test run is no
  more than 5% slower than before the change.
- **SC-006**: The process targets from spec 024 are measured on this feature and recorded: the
  planning documents total at most 800 lines, and the changed guidance files are counted.

## Assumptions

- The editing session lives in memory for one editor opening, as today; closing still discards
  unsaved work. Keeping a session across reloads is out of scope.
- T-058 (system field parity) is out of scope; the setting descriptions only prepare it.
- New actions on a multi-element selection (for example switching the source of several elements)
  are out of scope; unification keeps today's single-only actions single-only, and any such idea
  goes to the backlog.
- The sheet renderer, the template schema, and saved template files do not change; no data migration
  is needed.
- The existing integration tests are the safety net; behavior tests are split or moved only when a
  file moves, and stay one-to-one with today's cases.
- The library dialog and the document dialogs are not restructured here.
