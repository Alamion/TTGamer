# Feature Specification: Shipped page updates for edited copies

**Branch**: `048-shipped-page-updates` | **Created**: 2026-11-05 | **Status**: Draft

**Input**: "T-131 — Shipped page updates for edited copies: users who edited a shipped page still
get later improvements to it: an edited copy records the shipped version it was made from; when the
shipped page changes, the sheet says so once per version and offers to review; the template editor
opens the copy with the shipped changes merged three ways (base, shipped, user) and marked, the
user's own changes winning conflicts they can switch, and nothing is stored until the user saves;
copies made before the base was recorded are reviewed as a list of differences taken one by one; no
document value is ever lost."

## Context

A player can edit a shipped page (for example the Star Wars character sheet) in the template editor.
The edit is stored as the player's own copy of that page and replaces the shipped one for every
document that shows it. From then on the page is frozen: when a release improves the shipped page
(spec 047's help links, a corrected field, a new section), the player's copy gets none of it, and
nothing says that a better version exists. The only way out today is **Reset to default**, which
throws the player's edits away. This spec lets an edited copy take later shipped changes without
losing the player's own edits ([T-131](../../TODO.md), roadmap path `gm-notes-templates`).

## Clarifications

### Session 2026-11-06

- Q: Should a copy edited before this feature (no recorded base) get a notice right after the
  release that ships it? → A: Yes. The notice appears on the first open if the copy differs from the
  shipped page at all, and its list of differences includes the player's own edits, because without
  a base the two cannot be told apart; every row starts on keep, so nothing changes unless the
  player takes it.
- Q: Does the difference list offer a third answer, "later"? → A: No. Each row is take or keep;
  saving always records the base, and a kept row is the player's own edit from then on.
- Q: Is the update notice a passing toast or a lasting banner? → A: A banner above the page, drawn
  like the existing page-fallback notice. It stays until the player chooses **Review changes** or
  **Not now**, and is not a toast, which could vanish unseen.

## User Scenarios & Testing

### User Story 1 - Learn that the shipped page changed (Priority: P1)

A player who edited the Star Wars character page opens a sheet after a release that changed that
page. The sheet says, once, that the shipped page has an update and offers **Review changes** or
**Not now**. The player is never forced to take it, and the sheet still shows their own copy.

**Why this priority**: without the notice nobody knows an update exists; it is the entry to every
other story and is useful even before merging is built.

**Independent Test**: save an edited copy against a fixture shipped page, change the shipped page's
revision, open a document of that page, and check the notice appears once, again only after another
revision, and never for a page that was not edited.

**Acceptance Scenarios**:

1. **Given** an edited copy made from revision A and a shipped page now at revision B, **When** a
   document showing the page opens, **Then** one banner above the page names it and offers **Review
   changes** and **Not now**, stays until one is chosen, and the page itself is drawn from the
   player's copy.
2. **Given** the player chose **Not now** for revision B, **When** they open the sheet again,
   **Then** no notice appears for B; **Given** the shipped page later reaches revision C, **Then**
   one notice appears for C.
3. **Given** a shipped page that was never edited, **When** its revision changes, **Then** no notice
   appears and the page simply shows the new shipped version.
4. **Given** the player is in the template editor on an edited copy with a pending update, **Then**
   the editor offers **Review shipped changes** as well (the merge, or the list of differences for a
   copy with no recorded base), so the banner is not the only entry.
5. **Given** several edited copies with pending updates, **When** a document of one opens, **Then**
   the notice concerns only that page.

---

### User Story 2 - Review the shipped changes merged into my copy (Priority: P1)

The player chooses **Review changes**. The template editor opens their copy with the shipped changes
already merged in, every merged change marked (added, changed, removed by the shipped page), and the
player's own edits kept. Where both changed the same thing, the player's version is shown and the
conflict is marked; the player can switch that one item to the shipped version. Nothing is stored
until the player saves; leaving the review discards it. After saving, the copy's recorded base is
the new shipped revision and the notice goes away.

**Why this priority**: this is the point of the feature; the merged review is what makes an update
worth taking.

**Independent Test**: build a base page, a shipped page that differs from it (an added section, a
changed label, a removed field), and a copy that differs from the base (a moved field, a changed
label of another field, one label changed in both); open the review and check every merged item's
mark, the conflict's default and switch, that cancelling leaves the stores byte-identical, and that
saving records the new base.

**Acceptance Scenarios**:

1. **Given** the shipped page added a section and the copy did not touch that place, **When** the
   review opens, **Then** the section is present and marked as added by the shipped page.
2. **Given** the player changed a field's label and the shipped page changed a different field,
   **Then** both changes are present, each marked by who made it.
3. **Given** both changed the same field's label, **Then** the player's label is shown, the item is
   marked as a conflict, and a control switches it to the shipped label and back.
4. **Given** the player removed a field and the shipped page did not touch it, **Then** it stays
   removed and is not offered again; **given** the shipped page changed that field too, **Then** it
   is a conflict whose default is removed.
5. **Given** the review is open, **When** the player cancels or closes the editor, **Then** the
   stored copy, its recorded base, and its dismissed revision are exactly as before.
6. **Given** the player saved the merged page, **Then** documents that show it use it at once, the
   recorded base is the shipped revision that was merged, and the notice does not return for it.
7. **Given** the merged page has issues the editor already reports for any draft, **Then** they are
   listed as for any draft and block the save in the same way.

---

### User Story 3 - Review a copy that has no recorded base (Priority: P2)

Copies edited before this feature recorded no base. For them the notice and the review show **a list
of differences** between the shipped page and the copy instead of a merge: each difference is one
item the player takes (use the shipped version) or keeps (leave their own). Saving ends the list:
the copy records the current shipped revision as its base, and what the player kept is from then on
simply their own edit.

**Why this priority**: every existing user with an edited page starts here, but the page remains
usable without it, so it follows the merge.

Because there is no base, the list cannot tell the player's own edits from shipped changes: it shows
every difference, each row starts on keep, and the notice appears on the first open after the
release whenever the copy differs from the shipped page at all.

**Independent Test**: seed an edited copy with no base, change the shipped page, and check the
notice, one item per difference with its two answers, that nothing stored changes before **Save**,
and that a later change to the same shipped page is reviewed as a merge.

**Acceptance Scenarios**:

1. **Given** a copy with no recorded base and a shipped page that differs from it, **When** the
   player opens the review, **Then** they see one row per difference, each named by where it sits on
   the page, with the copy's value and the shipped value side by side.
2. **Given** the player takes some rows and keeps others, **When** they save, **Then** the copy has
   the shipped value for the taken rows and its own for the rest, and records the shipped revision
   as its base.
3. **Given** no row was changed from keep, **When** the player saves, **Then** the copy is unchanged
   and records the shipped revision as its base, and the notice does not return for that revision.
4. **Given** the copy and the shipped page are identical, **Then** no notice appears and the copy
   records the shipped revision as its base without asking.

---

### User Story 4 - Updates travel with the files and survive a reset (Priority: P3)

A player who exports a library file with an edited page and imports it on another device keeps the
page's recorded base, so the update is offered there too. **Reset to default** removes the copy and
its recorded base together.

**Why this priority**: it keeps the record from silently disappearing or lingering; the common path
works without it.

**Independent Test**: export and re-import a library file holding an edited copy and compare the
recorded base; reset a copy and check no base or dismissed revision is left.

**Acceptance Scenarios**:

1. **Given** an edited copy with a recorded base, **When** it is exported and imported, **Then** the
   imported copy has the same base and the same pending-update state.
2. **Given** a file written before this feature, **When** it is imported, **Then** its edited copies
   are accepted as copies with no recorded base (User Story 3).
3. **Given** a copy, **When** the player chooses **Reset to default**, **Then** the copy, its base,
   and its dismissed revision are removed.

### Edge Cases

- **A value whose field disappears**: when the merged page drops a field the shipped page removed,
  the documents' values for it stay stored (orphaned values are never deleted) and show again if the
  field returns; the review says that values are kept.
- **Both added the same thing**: when the shipped page and the copy each added an element at the
  same place with the same id, the player's is kept and the item is a conflict; with different ids
  both are present.
- **Moved elements**: a move made only by the player or only by the shipped page is taken as a
  change; a move made by both to different places is a conflict.
- **A copy edited to equal a later shipped page**: no differences, no notice; the base moves forward
  silently.
- **Tabs**: the template store does not sync between tabs today, so a review saved in one tab and a
  page saved in another end with the last write, as every template save does; this spec adds no
  sync.
- **A shipped change that leaves the copy as it is**: when merging would change nothing in the copy
  (the player's version already equals the merged result), no notice appears and the base moves
  forward silently.

## Requirements

### Functional Requirements

- **FR-001**: Each shipped page MUST have a revision that changes only when the page's content
  changes, not with every app release.
- **FR-002**: Saving an edited copy of a shipped page MUST record the base: the shipped page as it
  was when the copy was last brought up to date with it.
- **FR-003**: The sheet MUST show one notice per edited copy and shipped revision when the revision
  differs from the copy's base, offering **Review changes** and **Not now**, and MUST NOT show it
  for a page that was never edited or for a revision the player already dismissed.
- **FR-004**: The notice MUST be a banner above the page that stays until the player answers it, not
  a toast, and MUST NOT block the sheet, change any value, or change the page drawn; with several
  documents shown at once, each page's banner sits above that page.
- **FR-005**: The template editor MUST open a copy with a recorded base as a three-way merge of
  base, shipped page, and the copy, with every merged item marked as taken from the shipped page,
  kept from the copy, or a conflict.
- **FR-006**: In a conflict the player's version MUST win by default, and the player MUST be able to
  switch each conflict to the shipped version and back before saving.
- **FR-007**: A merge review MUST store nothing until **Save**; closing or cancelling MUST leave
  every store unchanged.
- **FR-008**: Saving a merge MUST record the merged shipped revision as the new base and make the
  merged page the copy.
- **FR-009**: For a copy with no recorded base, the sheet MUST show the notice on the first open
  after the shipped page differs from the copy, and the editor MUST list every difference between
  the shipped page and the copy (the player's own edits included), each answerable with take or keep
  and starting on keep, and MUST store nothing until **Save**.
- **FR-010**: Saving a difference list MUST record the shipped revision as the copy's base whatever
  the answers were; what the player kept becomes their own edit and returns only as a conflict in a
  later merge.
- **FR-011**: No document value MAY be deleted or rewritten by taking, keeping, or merging a change;
  values of elements the merged page no longer shows stay stored.
- **FR-012**: A merged page MUST pass the template schema and the editor's draft checks like any
  other saved page, and an invalid merge MUST be reported as draft issues instead of being saved.
- **FR-013**: Library export and import MUST carry a copy's recorded base, and files without one
  MUST import as copies with no recorded base.
- **FR-014**: **Reset to default** MUST remove the copy together with its base and dismissed
  revision.
- **FR-015**: The notice, the review marks, the conflict controls, and the difference list MUST be
  keyboard reachable, name their state to assistive technology (not by colour alone), and have
  English and Russian text.
- **FR-016**: Every unreadable base, merge failure, or skipped item MUST be reported through the
  template diagnostics channel and leave the player's copy untouched; when a merge fails the review
  opens as the list of differences and says the page could not be merged.
- **FR-017**: Finding which copies have an update MUST read only the stored copies and the shipped
  revisions, never the documents.

### Key Entities

- **Edited copy**: the player's saved version of a shipped page that replaces it for documents.
- **Base**: the shipped page's content as it was when the copy was last brought up to date; what the
  three-way merge compares both sides to.
- **Revision**: the identity of a shipped page's content; equal revisions mean equal pages.
- **Dismissed revision**: per copy, the shipped revision the player last answered **Not now** to.

## Success Criteria

- **SC-001**: A player sees the update notice exactly once per shipped revision for an edited page,
  and never for an unedited page (checked on every shipped page).
- **SC-002**: A merge of a page the player did not touch equals the shipped page; a merge of a
  shipped page that did not change equals the player's copy (both checked on every shipped page).
- **SC-003**: Cancelling a review leaves every store byte-identical to before it opened.
- **SC-004**: Across a review and save, the count and content of every document's values is
  unchanged.
- **SC-005**: Opening a review of the largest shipped page takes at most twice as long as opening
  that page in the editor without a review, measured in the same run, and finding pending updates
  adds no more than 5% to the time a sheet takes to open.
- **SC-006**: A player with an old edited copy reaches a page with the shipped changes they chose in
  at most one answer per difference plus one save.

## Assumptions

- **Scope**: "edited copy" means an edit of a shipped page saved as the page's override (the
  library's **Reset** applies to it). A page the player duplicated into their own template is theirs
  from the start and receives no shipped updates; it is not in this spec.
- A shipped page's revision is derived from its content, so a change is never missed and an
  unrelated release never raises a notice.
- Dismissed revisions and bases are device data stored with the copies, like the copies themselves;
  they are not part of the cloud contract.
- Merge is by element id: the page tree already gives every element a stable id. Changes are
  compared per element and per setting; the review's marks and conflict switch work at that same
  grain.
- The player's dismissal of one revision is remembered per copy and never expires.
- The review reuses the template editor's session, issue list, and save path; it is a mode of the
  editor, not a second editor.
- A release never removes or renames a shipped page's id; a copy whose shipped page is gone is not
  handled by this spec (the page resolver already ignores such a copy).
- Guide pages for the template editor gain a section on updates in both languages; no new element
  appears in templates, so the element storybook is unchanged.
