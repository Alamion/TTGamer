# Feature Specification: Documents Window with a Folder Tree

**Branch**: `032-documents-workspace` | **Created**: 2026-10-14 | **Status**: Draft

**Input**: "T-052 (with a shared divider behavior for every multi-pane place): replace the 'Manage
documents' modal with a draggable, resizable window whose left side is a folder tree holding
documents and folders (markdown, canvas, and other types later), with search, filter, and sort over
the fields every entity has; usable with thousands of entities; built so AI roles (assistant,
scriptwriter, narrator) can later read and change the same tree."

## Context

Documents (character sheets of every game, droids, vehicles, groups, and documents of user types)
live in one flat list, and the only way to manage them is a modal table that lists name, type, and
setting and can delete. A GM with a campaign's worth of material cannot group it, find it, or keep
the manager open while working. T-052 replaces the list with a file-system organization: folders
holding documents, shown in a window that stays open beside the sheet. This first slice covers the
window, the tree, folders, moving, and finding; later entity kinds (markdown, canvas) join the same
tree, and later specs add denser brief cards (T-056), several documents on one screen (T-112), and
shared window management (T-113). The same tree is meant to be the material AI roles read and write
(`llm-integrations`), so every change to it is a named operation that can be previewed and undone.
Backlog: `TODO.md` T-052; roadmap path `note-tree`.

## Clarifications

### Session 2026-10-14

- Q: Does the first slice keep every document in memory, or does the window browse a light index? →
  A: A light record per document drives the tree and search; a document's full content is read only
  when it is opened.
- Q: What happens to a folder's contents when the folder is deleted? → A: They are deleted with it
  after a confirmation that lists what would go, and the delete can be undone.
- Q: Are the dividers between panes specific to this window? → A: No. One shared divider behavior
  serves every place where panes sit side by side: this window, the library (template manager)
  dialog, and the template editor, which has its own today.
- Q: Does a single click on a document open it? → A: Yes. A plain click or Enter opens it on the
  sheet; Ctrl/Cmd-click and Shift-click select several rows without opening.
- Q: Does the tree have its own look and behavior? → A: No. It shares one tree structure (rows,
  roving focus, type-ahead, menu, expand and collapse) with the library dialog's tree, so the two
  stay alike in style and keys.
- Q: How long does undo history live? → A: Until the page is reloaded; nothing deleted is kept on
  disk, and the folder-delete confirmation is the safeguard against a lost tab.
- Q: What counts as a change for the changed time? → A: Any edit of content, name, or place;
  consecutive edits within a few seconds update it once.

## User Scenarios & Testing

### User Story 1 - A documents window beside the sheet (Priority: P1)

A player or GM opens the documents window from the sheet toolbar. It floats over the page, can be
dragged by its title bar and resized by its edges, and stays open while they work on the sheet
behind it. On its left is a tree of folders and documents; a click on a document shows it on the
sheet. The window comes back where and how big it was left.

**Why this priority**: It replaces the modal and is the surface every other story lives on.

**Independent Test**: Open the window with a few existing documents, move and resize it, open a
document from the tree, close the window, reload, and open it again.

**Acceptance Scenarios**:

1. **Given** documents saved before this feature, **When** the window opens, **Then** every one of
   them is listed at the top level of the tree with its name or type label, and the one open on the
   sheet is marked.
2. **Given** the window is open, **When** the user drags its title bar, **Then** it follows the
   pointer and cannot be dragged fully off the screen; **When** the user drags an edge or corner,
   **Then** it resizes within a minimum and maximum size.
3. **Given** the window is open, **When** the user works on the sheet behind it, **Then** the sheet
   stays usable (the window does not block it) and the window stays above the page content.
4. **Given** the window was moved and resized, **When** the page is reloaded and the window opened,
   **Then** it appears with the same position and size, adjusted if the screen got smaller.
5. **Given** a screen narrower than a tablet, **When** the window opens, **Then** it fills the
   screen instead of floating, with a clear way to close it.
6. **Given** the window and its tree, **When** the user uses only the keyboard, **Then** they can
   move through the tree, expand and collapse folders, open a document, and close the window.

---

### User Story 2 - Organize with folders (Priority: P2)

A GM groups documents the way they think about them: a folder per campaign, folders inside it for
arcs, sessions, or factions. They create, rename, and delete folders, and move documents and folders
by dragging them, with a menu, or with the keyboard. Each document lives in exactly one place, like
a file.

**Why this priority**: It is the point of T-052; it needs the window of Story 1.

**Independent Test**: Create nested folders, move documents and a folder between them by each
method, rename and delete, undo a move, reload, and check the structure is the same.

**Acceptance Scenarios**:

1. **Given** the tree, **When** the user creates a folder, **Then** it appears where they chose with
   an editable name, and the structure survives a reload.
2. **Given** a document, **When** the user drags it onto a folder, **Then** it moves into that
   folder; **When** they drop it between two rows, **Then** it is placed there and the position
   shows before the drop.
3. **Given** a folder, **When** the user tries to move it into itself or one of its own subfolders,
   **Then** the move is refused with a message and nothing changes.
4. **Given** several selected rows (click, range, and toggle selection), **When** they are moved or
   deleted, **Then** the whole selection is moved or deleted as one step.
5. **Given** a move, rename, or delete, **When** the user undoes it, **Then** the previous structure
   returns, including the order of the rows.
6. **Given** a folder with contents, **When** the user deletes it, **Then** they are shown what
   would be removed and must confirm before anything is deleted.
7. **Given** the open document is moved or its folder is renamed, **When** the change is made,
   **Then** the sheet stays on that document.

---

### User Story 3 - Find things: search, filter, sort (Priority: P3)

Someone with hundreds of documents types part of a name and sees only matching rows, with the
folders that contain them kept visible so they can see where each lives. They narrow by type, game
system, or setting, by when a document was created or last changed, and sort by any of those.

**Why this priority**: Folders alone do not scale; search-first navigation is the scale answer.

**Independent Test**: With a mixed set of documents in nested folders, search, filter by each field,
and sort by each field; compare the rows with the expected ones.

**Acceptance Scenarios**:

1. **Given** documents in nested folders, **When** the user types in the search box, **Then** only
   rows whose name matches stay, with their ancestor folders shown and expanded, and the match is
   marked.
2. **Given** a search with no match, **When** the list is empty, **Then** the window says nothing
   matches and offers to clear the search and filters.
3. **Given** the filter controls, **When** the user filters by type, game system, setting, or a
   created or changed time range, **Then** only rows matching every active filter stay, and the
   active filters are visible and clearable one by one.
4. **Given** the sort control, **When** the user sorts by name, type, system, created, or changed
   time (ascending or descending), **Then** rows within each folder follow that order, with folders
   first; **When** they choose manual order, **Then** the order they arranged returns.
5. **Given** a search or filter is active, **When** the user opens a document or closes the window,
   **Then** the search and filters are kept the next time the window opens in the same visit, and
   cleared by one action.
6. **Given** a document saved before this feature, **When** the user sorts or filters by created or
   changed time, **Then** it is shown with an unknown time, kept apart from dated rows, never given
   an invented date.

---

### User Story 4 - Thousands of documents stay usable (Priority: P4)

A GM with years of material has thousands of documents. The window opens at once, scrolls smoothly,
and searches as they type; none of this makes the sheet page itself slower.

**Why this priority**: The constitution requires entity collections to stay usable at thousands; it
constrains how Stories 1–3 are built, so it is checked last but designed first.

**Independent Test**: Load 3,000 documents in nested folders and time opening, scrolling, search,
and a move (browser timings, reported next to their budgets).

**Acceptance Scenarios**:

1. **Given** 3,000 documents, **When** the window opens, **Then** the tree shows its first rows
   within the budget in Success Criteria and only the rows in view are drawn.
2. **Given** 3,000 documents, **When** the user types a search, **Then** the list updates within the
   budget without freezing the page or the sheet behind.
3. **Given** the window is closed, **When** the user works on the sheet, **Then** the sheet's speed
   is the same as before this feature.

### Edge Cases

- A document is open on the sheet and is deleted from the window: the sheet moves to the nearest
  remaining document, or shows its empty state when none is left.
- A move or delete is made in another browser tab of the same site: the window shows the newer
  structure the next time it gets focus, and never loses a change made here.
- A folder with contents is deleted: its contents are deleted with it after the confirmation, which
  lists the counts and names the open document if it is inside; undo brings back the folder,
  everything in it, and their order.
- Dragging when a filter or search hides the drop target: the drop is refused with a message, and
  nothing moves into a hidden place.
- Manual order and a sorted view: dragging to reorder while a sort is active is refused and says to
  switch to manual order.
- Import (spec 031): imported documents arrive at the top level of the tree, and the summary stays
  as it is.

## Requirements

### Functional Requirements

- **FR-001**: The documents window MUST replace the "Manage documents" modal: the toolbar opens it,
  and everything the modal did (listing, opening, selecting several, deleting with confirmation)
  remains possible in it.
- **FR-002**: The window MUST be draggable by its title bar, resizable by edges and corners within
  minimum and maximum sizes, kept inside the visible screen, and non-blocking: the page behind it
  stays usable.
- **FR-003**: The window MUST remember its position, size, and the open and closed state of its
  folders across reloads, and MUST repair a remembered position or size that no longer fits the
  screen.
- **FR-004**: On narrow screens the window MUST fill the screen with a visible close control, show
  the tree and the details as two tabs, close itself when a document is opened, and offer every
  action without dragging (selection and a "Move to…" picker); touch targets are at least 44 px.
- **FR-005**: The tree MUST show folders and documents; folders MUST nest without a fixed depth
  limit beyond a stated safety bound, and MUST expand and collapse.
- **FR-006**: A document MUST belong to exactly one place (a folder or the top level); documents
  saved before this feature MUST appear at the top level with no change to their content.
- **FR-007**: Users MUST be able to create, rename, and delete folders and to move documents and
  folders by dragging, by a menu, and by keyboard commands, with a drop position shown before the
  drop.
- **FR-008**: A folder MUST NOT be movable into itself or into one of its subfolders.
- **FR-009**: Selecting several rows by click, range, and toggle MUST allow moving and deleting them
  as one step.
- **FR-010**: Every change to the tree (create, rename, move, reorder, delete) MUST be one named
  operation with a target and a result; a set of operations MUST be listable before it is applied
  and undoable as one step. The same operations are what the window itself performs.
- **FR-011**: Moves, renames, reorders, and deletes MUST be undoable and redoable in the window
  until the page is reloaded (history is not stored), including the order of rows.
- **FR-012**: Deleting a folder MUST show what it holds and require confirmation, and MUST follow
  the rule in Edge Cases (a folder with contents is deleted).
- **FR-013**: Search MUST match document and folder names, ignoring case, `ё`, and accents (the
  rules the catalogs already use), keep ancestors of matches visible, and mark the match.
- **FR-014**: Filters MUST cover type, game system, setting, created time, and changed time, MUST
  combine (all active filters apply), and MUST each be visible and clearable.
- **FR-015**: Sorting MUST cover name, type, game system, created time, and changed time in both
  directions, plus a manual order; folders sort before documents in every sorted view.
- **FR-016**: Every document MUST get a created time when it is made and a changed time when its
  content, name, or place changes (edits within a few seconds of each other update it once);
  documents that predate this MUST show an unknown time.
- **FR-017**: The tree MUST draw only the rows in view and MUST NOT make the sheet page slower while
  the window is closed.
- **FR-018**: The window MUST be fully usable by keyboard and by assistive technology: the tree has
  tree semantics and roving focus, icon-only controls have labels, expanded state is announced, and
  messages use alerts.
- **FR-019**: All new text MUST exist in English and Russian, and the window MUST follow the light
  and dark themes.
- **FR-020**: A folder's contents, a document's place, order, and times MUST be stored beside the
  documents under their ids (not inside the document file, whose format does not change), so a later
  cloud contract change can carry them; folder ids follow the device-id rule.
- **FR-021**: Panes that sit side by side MUST use one shared divider behavior: dragged with the
  pointer, moved by keyboard with a stated step, reset by double click or Home, announced as a
  separator with its size, bounded by a minimum and maximum, remembered, repaired when the container
  shrinks, and collapsible by dragging below a threshold where the pane allows it. The documents
  window, the library dialog (the template manager), and the template editor MUST all use it, with
  no change to what the editor's dividers do today.
- **FR-023**: The tree MUST be built on the same shared tree component as the library dialog's tree
  (row layout, keys, focus, type-ahead, context menu, tree semantics), taking its rows through a
  generic row description; differences between the two are options, not forks. A plain click or
  Enter on a document opens it; Ctrl/Cmd-click and Shift-click select without opening.
- **FR-024**: The window's right side MUST show the selected row (name, kind, game system, setting,
  place, created and changed times) with open, rename, move, and delete; for several rows, their
  count and the bulk actions. The rejected-files section of the old manager moves here unchanged.
- **FR-022**: Opening the window, browsing, and searching by name MUST NOT read the full content of
  documents that are not open; a document's content is read when it is opened, and documents saved
  before this feature MUST be carried over without loss.

### Key Entities

- **Folder**: a named container that holds documents and folders; it has an id, a name, a place, an
  order among its siblings, and created and changed times.
- **Entity**: anything the tree holds (today: a document; later: markdown, canvas, and other kinds).
  It has the fields every entity shares: name, kind, game system, setting, place, created time, and
  changed time.
- **Tree operation**: one named change to the tree (create, rename, move, reorder, delete) with its
  target and its result, usable one at a time or as a previewable, undoable batch.
- **Window layout**: the remembered position, size, open folders, search, filters, and sort.
- **Pane layout**: the remembered sizes of the panes a shared divider separates, per place.

## Success Criteria

- **SC-001**: With 3,000 documents in nested folders, the window shows its first rows in at most 500
  ms after the click, and scrolling the tree never drops below 30 frames per second.
- **SC-002**: With 3,000 documents, the visible list updates at most 200 ms after the user stops
  typing in the search box.
- **SC-003**: With the window closed, the sheet page loads and edits as fast as before this feature
  (the existing browser timings stay within their budgets).
- **SC-004**: A GM can create a folder, move five documents into it, and undo the move in fewer than
  10 actions, by pointer and by keyboard alike.
- **SC-005**: After any sequence of moves, renames, and deletes followed by a reload, the tree
  equals what the window showed before the reload, and no document is ever lost or duplicated by a
  move.
- **SC-006**: Every document saved before this feature opens unchanged, at the top level, with the
  same content.
- **SC-008**: In the documents window, the library dialog, and the template editor, a divider
  behaves the same way by pointer and by keyboard, checked by one shared test run against each of
  the three.
- **SC-009**: One shared test of tree keys and semantics runs against both the documents window and
  the library dialog.
- **SC-007**: The window passes the project's accessibility floor and is reachable and operable with
  the keyboard alone, checked by a test for each of the tree, search, filter, and move controls.

## Assumptions

- **Entities** in this slice are the documents that exist today (sheets of every system and user
  type); the roadmap's "notes" are documents. Markdown and canvas join in later specs through the
  same shape.
- The window lives on the sheet page, where the manager lives today; it is one window at a time.
  Several windows and shared window behavior are T-113.
- The library of templates, settings, and catalogs stays a separate dialog; folders hold documents
  only.
- **Scale model**: the tree and search work from a light record of each document (name, kind, game
  system, setting, place, times); a document's full content is read only when it is opened.
  Documents saved before this feature are carried over without loss.
- Fields known today and used for filter and sort: name, kind, game system, setting, place, created
  time, changed time. Fields considered for later and not built here: last opened, favorite or
  pinned, tags (the document schema has a `tags` list that nothing sets or shows today), size, links
  in and out (T-051), and needs-repair state.
- The window's search is name-based in this slice; searching document content is out of scope.
- Exporting or importing a folder as a unit, and campaigns as archives, are out of scope
  (`campaigns`).
- AI roles are not built here. This slice only guarantees that tree changes are listable,
  previewable, and undoable operations over the same fields, so a later role can propose a batch and
  the window can show it.
