# Feature Specification: Star Wars Shape in Its Plugin and Bulk Import

**Branch**: `031-star-wars-shape-bulk-import` | **Created**: 2026-10-13 | **Status**: Draft

**Input**: "T-098 (Star Wars character shape inside its plugin, no behavior change) together with
T-103 (bulk import with system detection: other legacy shapes and a recovery export of rejected
files remain). Both touch the legacy character shape and the import path, so they are one spec with
two stories."

## Context

Generic code still owns the Star Wars character: `types/character.ts` holds its fields, its
defaults, and its derived stats (the health penalty), and 28 files import from it, although the game
belongs to the Star Wars plugin (T-098). The same file defines the one old file shape the importer
understands: the flat character the first versions exported. Players can already pick several files
at once, but a real old export (for example a character saved by the first version, kept in the
maintainer's downloads) is **rejected today**: its armor uses an earlier form without a `name`, and
its current Willpower is above its stored maximum. A rejected file is kept in an internal collection
players cannot reach, and a batch reports one message per file (T-103). The app has few users, so
the old shape is supported for a limited time with a fixed end date, after which its conversion code
is deleted. Backlog: `TODO.md` T-098, T-103.

## Clarifications

### Session 2026-10-13

- Q: What happens when a recovery file is imported back? → A: Import reads it and retries each
  record as its own file; those that now pass become documents, the rest return to the rejected
  files.
- Q: How are id collisions chosen in a large batch? → A: Each collision asks (Replace, Duplicate,
  Cancel) with an option to apply the choice to the remaining collisions of the batch.

## User Scenarios & Testing

### User Story 1 - Star Wars character shape lives in its plugin (Priority: P1)

A maintainer looks for any Star Wars character field, its default character, or a derived stat (for
example the health penalty) and finds it in the Star Wars system folder. Generic sheet code no
longer names Star Wars fields. Players notice nothing: every saved document, export file, preset,
and sheet page works exactly as before.

**Why this priority**: It removes the last Star Wars special case from shared code, and the import
story builds its legacy conversion on this boundary.

**Independent Test**: Run the existing parse, page, dice, and import parity suites unchanged, then
check that no file outside the Star Wars system folder (and the documented legacy import path)
imports a Star Wars character field, default, or derived stat.

**Acceptance Scenarios**:

1. **Given** documents stored by the previous version, **When** the app loads them, **Then** every
   one opens with the same values, views, and derived numbers.
2. **Given** an export file made by the previous version, **When** it is imported, **Then** the
   result equals what the previous version produced.
3. **Given** a new Star Wars character created from the default, **When** it is compared with one
   created before the change, **Then** the two are identical apart from generated ids.
4. **Given** the codebase, **When** the module-boundary check runs, **Then** generic code imports no
   Star Wars character shape, default, or derived stat.

---

### User Story 2 - Old exports import, in bulk (Priority: P2)

A player who kept characters exported by the first version selects many files at once, together with
current exports. Each file lands as its own document in its own system, old exports are repaired
where they break today's rules, and the player sees one summary at the end instead of one message
per file.

**Why this priority**: It is the visible gain and builds on the boundary from Story 1.

**Independent Test**: Import a batch with a current envelope, the old-export fixture (a copy of the
real file with its armor and Willpower problems), and a broken file; check what lands where and the
summary.

**Acceptance Scenarios**:

1. **Given** a batch of files of mixed systems and versions, **When** the player imports them,
   **Then** each supported file becomes a document of the system it belongs to, with no manual
   system choice.
2. **Given** an old export whose armor lacks a `name` or whose current value exceeds its maximum,
   **When** it is imported, **Then** it becomes a valid document with no value lost, and the summary
   says it was repaired.
3. **Given** a batch where some files collide with stored ids, **When** it is imported, **Then** the
   player is asked for the first collision (Replace, Duplicate, Cancel) and may apply the choice to
   every remaining collision of the batch; without that, each collision asks.
4. **Given** a batch with unsupported or invalid files, **When** it is imported, **Then** the valid
   ones are still imported and the summary counts imported, skipped, and rejected files and names
   each rejected file.
5. **Given** any outcome, **When** the batch ends, **Then** the player has seen exactly one summary,
   and nothing imported earlier was undone by a later failure.

---

### User Story 3 - Recover rejected files (Priority: P3)

A player whose files were rejected can see that rejected files are kept, and can download them to
repair or send them to a maintainer. Nothing a player tried to import is lost without a way out.

**Why this priority**: Closes the "retained but unreachable" gap; useful only after Story 2 narrows
what is rejected.

**Independent Test**: Import an invalid file, open the place the summary points to, download the
recovery export, and check it contains the original file content.

**Acceptance Scenarios**:

1. **Given** rejected files are retained, **When** the player opens the document manager, **Then**
   it shows how many are kept and offers to download them.
2. **Given** the player downloads the recovery export, **When** the file is opened, **Then** it
   holds each rejected file's original content, the reason it was rejected, and when.
3. **Given** the player clears the retained files, **When** they confirm, **Then** the collection is
   empty and the count disappears.
4. **Given** a recovery file (downloaded earlier, possibly after the app was updated), **When** the
   player imports it with the other files, **Then** each record is retried as its own file and the
   summary counts them like any other file.
5. **Given** the collection is full, **When** another file is rejected, **Then** the player is told
   it could not be kept, and the rest of the batch is unaffected.

### Edge Cases

- A file that is not valid JSON is rejected with a reason, and its text is kept only when it can be
  stored as a string within the size limit.
- A device-only portrait reference inside an older file is dropped, as in the current import.
- A file that is both a current envelope and shaped like an old export is read as the envelope.
- A file of an unknown shape or system is rejected, never guessed into a system.
- After the end date, an old export is rejected with a reason that names the end of support, and is
  kept for recovery like any rejected file.
- The recovery file never contains device-only data. Importing it retries each record; a record that
  still fails is kept again with its new reason, and the recovery file itself is never stored as a
  document.

## Requirements

### Functional Requirements

- **FR-001**: The Star Wars character fields, its default character, and its derived stats MUST be
  owned by the Star Wars system and MUST NOT be imported by generic code, except the documented
  legacy import path.
- **FR-002**: Moving the shape MUST NOT change any stored or exported value, any parsed result, any
  derived number, or any page; existing parity tests MUST pass without edits to their expectations.
- **FR-003**: The importer MUST detect the system and version of each selected file and create the
  document in its own system, without a system prompt.
- **FR-004**: The importer MUST read current envelopes and the old export shape (the untagged flat
  character), converting the old one explicitly and validating the result against its system's
  schema before storing anything. No other old shape is read.
- **FR-005**: Repairing an old export MUST lose no stored value: an armor item without a `name`
  takes its old `type` as the name, and a current value above its maximum raises the maximum. Each
  repair MUST be reported in the batch summary.
- **FR-013**: The old export conversion MUST live in one place that names an end-of-support date in
  the code and in `src/sheet_manager/AGENTS.md`; a test MUST fail after that date with a message to
  delete the conversion, its fixtures, and its guidance.
- **FR-006**: An invalid file MUST NOT stop the batch, MUST NOT change stored documents, and MUST be
  kept for recovery.
- **FR-007**: A batch MUST end with one summary: counts of imported, skipped (cancelled), and
  rejected files, and the name of each rejected file with its reason.
- **FR-008**: The id-collision choice (Replace, Duplicate, Cancel) MUST be offered per colliding
  document, with an option to apply the choice to the remaining collisions of the same batch; the
  option MUST NOT carry over to the next batch.
- **FR-009**: The player MUST be able to see how many rejected files are kept, download them as one
  recovery file, and clear them after confirmation.
- **FR-010**: The recovery file MUST hold each file's original content, rejection reason, and time,
  and MUST strip device-only data.
- **FR-014**: Importing a recovery file MUST retry each record as an independent file under FR-003
  to FR-008, and MUST NOT retain a record that has just been imported.
- **FR-011**: All new player-facing text MUST exist in English and Russian.
- **FR-012**: Controls MUST follow the accessibility rules (labelled icon buttons, `aria-expanded`
  on collapsibles, `role="alert"` on error text), and the summary MUST be reachable by keyboard.

### Key Entities

- **Import batch**: the files selected in one action and their per-file outcomes (imported, skipped,
  rejected).
- **Rejected file record**: original content, reason, time; bounded in number.
- **Recovery file**: one downloadable file holding the rejected file records.

## Success Criteria

- **SC-001**: After Story 1, the number of generic files that import a Star Wars character field,
  default, or derived stat is zero outside the documented legacy path, and every existing parity
  test passes unchanged.
- **SC-002**: A player imports a mixed batch of 20 files in one action and sees exactly one summary;
  valid files are 100% imported regardless of the invalid files around them.
- **SC-003**: The real old export used as a fixture imports into the Star Wars system with every
  value intact (including the value that was above its maximum), checked field by field.
- **SC-004**: A rejected file's original content can be recovered from the downloaded recovery file
  byte-for-byte equal in content to what the player selected.
- **SC-005**: A player finds the rejected-file count and download within two interactions from the
  document manager.

## Assumptions

- Story 1 is a pure move: no schema change, no persisted version bump, no new field names.
- Only one old shape is in scope, the flat character export of the first versions (decided by the
  maintainer 2026-10-13: the app has few users). The end date is 2027-04-13, six months out, unless
  the maintainer sets another; the fixture is the real export with the player's text kept and the
  name removed.
- A current value above its maximum is read as a stale maximum, since Willpower is derived from
  virtues and the old app did not keep both in step; raising the maximum loses nothing.
- Importing is still file-based; drag-and-drop, folders, and archives are out of scope.
- The bound on kept rejected files stays at its current size; the recovery file is a download, not
  cloud storage, so the cloud API contract is untouched.
- Dropping Star Wars specifics from generic imports may leave the legacy character conversion as the
  one documented exception, since untagged legacy files are Star Wars by definition.
