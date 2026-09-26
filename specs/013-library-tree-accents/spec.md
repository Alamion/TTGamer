# Feature Specification: Library tree for rules, settings, types, and pages

**Feature Branch**: `testing`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "T-071 + T-081: Library tree for rulesets, settings, document types, and pages (replaces the "Page templates" library dialog), plus primary/secondary accents in the template editor and library. Approved prototype: https://claude.ai/artifact/MQNPYvs8BYzXfRmFqK7ZDU. Fixed four levels: ruleset → setting → document type → page. Left tree + right inspector per level; search and filters; context menu; keyboard navigation; phone layout as tabs. Creating a setting or type never creates a page; a type without pages shows stored values; a setting's core character without its own page falls back to the ruleset's "Rules only" page. Default page selectable per type. Moving: your settings between rulesets, your types between settings, your pages between types — by drag, an inspector picker, or the context menu; moves across rulesets need confirmation. Export: tri-state selection over branches; your parents needed for installation are added automatically (the only tertiary/violet use); shipped nodes appear only as addresses. Import: preview the file's tree with new / same / conflict states, per-branch Replace or Keep both. T-081: accents use primary and secondary everywhere in the template editor and library; the violet becomes tertiary, reserved for edge cases."

## Scope

| Backlog | Entry                                                   | Role in this feature |
| ------- | ------------------------------------------------------- | -------------------- |
| T-071   | Separate type and setting manager (tree, import/export) | User Stories 1–5     |
| T-081   | Primary and secondary accents in the template editor    | User Story 6         |

Spec 012 let users create document types and settings, but manages them in the old template
library: a flat list of pages grouped by "system · kind", with type and setting controls bolted
on. A reviewer could not tell which setting a type belongs to, how to create a type for a
setting, or how to update, move, or delete either; creating a type or setting also created a
page nobody asked for. This feature replaces that dialog with one tree whose levels mirror how
the games are built — rules, then settings on those rules, then document types, then the pages
that show them — and gives each level its own actions, moving, and selective file transfer.

The accent change (T-081) lands with it: the new library and the template editor use the app's
primary and secondary colors; the violet stays only for edge cases.

Out of scope: user-defined rules (mechanics) — rulesets stay shipped; the folder-based
organization of documents (T-052), whose tree may later reuse this one's look; online sharing —
transfer stays file-based; changing which data a shipped type holds.

## Clarifications

### Session 2026-09-26

- Q: Pages in the tree or in a separate list? → A: In the tree, as its fourth level (maintainer,
  after reviewing the prototype).
- Q: Export adds required parents automatically? → A: Yes (maintainer).
- Q: Where can things be moved? → A: In the library itself, for settings, types, and pages alike
  — not only through the editor's "Type and setting" select (maintainer; prototype v3 adds drag,
  picker, and menu).
- Q: Hierarchy → A: Rules are their own level. WoD 2nd and 5th Edition are rulesets; Star Wars
  and Hunter are settings on them, so Hunter visibly belongs to the V5 family (maintainer).
- Q: What happens to documents of a setting's core character when the setting moves to another
  ruleset? → A: They stay on their old ruleset, detached from the setting, and open on its "Rules
  only" page; the confirmation names how many stay (maintainer, option A). Refined after analysis:
  the setting's pages for that character stay with them among the "Rules only" pages, and each
  document keeps the page it used, so nothing changes in how it looks.
- Q: Accent colors → A: Primary and secondary everywhere they can serve; violet only as a
  tertiary color for edge cases, in the library and the template editor alike (maintainer).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See and manage everything in one tree (Priority: P1)

A user opens the library and sees a tree: each ruleset (World of Darkness 2nd Edition, World of
Darkness 5th Edition), under it its settings — "Rules only" with the ruleset's own characters,
the shipped settings (Star Wars on WoD 2e; Hunter: the Reckoning as a V5 line), and the user's
own settings — under each setting its document types, and under each type its pages. Selecting
any row shows, beside the tree, what that item is and everything that can be done with it. The
user can create a setting on a ruleset, a type in a setting, and a page for a type; rename and
describe their own items; choose a type's default page; and delete their own items after seeing
how many documents are affected. Nothing is created that the user did not ask for.

**Why this priority**: It is the core of the complaint — users could not tell what they had or
how to manage it. Everything else hangs off this tree.

**Independent Test**: With the example data of spec 012 (a user type in Star Wars, a user
setting on V5 with a user type), open the library and answer, from the tree alone, which
setting owns each type and which pages each type has; create a setting and a type and confirm
that neither received a page.

**Acceptance Scenarios**:

1. **Given** a user setting "Ashen Realms" on V5, **When** the library opens, **Then** it appears
   under "World of Darkness 5th Edition" beside "Rules only" and "Hunter: the Reckoning", marked
   as the user's.
2. **Given** the ruleset row "World of Darkness 2nd Edition", **When** the user creates a
   setting "Misty Archipelago" from it, **Then** the setting appears under that ruleset with the
   ruleset's core character and no pages of its own, and the ruleset needs no separate choice.
3. **Given** a user setting, **When** the user creates a type "Ship" in it, **Then** the type
   appears with no pages, and its inspector says that its documents will show their stored
   values until a page is added.
4. **Given** a setting's core character without its own page, **When** a document of it opens,
   **Then** it shows the ruleset's "Rules only" page; the inspector of that character says so.
5. **Given** a type with two pages, **When** the user chooses the second as default, **Then**
   new documents of that type open on it, and the tree marks it with a star.
6. **Given** a user setting with 3 documents, **When** the user asks to delete it, **Then** the
   confirmation names the count and says the documents stay (they open on their stored values);
   after confirming, the setting, its types, and its pages are gone and the documents remain.
7. **Given** shipped items (a ruleset, a shipped setting or type, a shipped page), **When**
   selected, **Then** their names cannot be edited and they cannot be deleted; the user can still
   add their own types to a shipped setting and their own pages to a shipped type.
8. **Given** many items, **When** the user types in search or picks "Only yours" / "Edited
   shipped", **Then** the tree shows the matching items with the branches that lead to them.

---

### User Story 2 - Work with pages from the tree (Priority: P1)

From a page row the user opens it in the template editor, duplicates it, makes it the type's
default, exports it, deletes their own page, or resets an edited shipped page to its original.
New pages start blank or as a copy of another page of the same type and open in the editor.

**Why this priority**: Pages are what users edit most; the tree must not make that slower than
the old list.

**Independent Test**: From the tree, create a page for a shipped type as a copy of its shipped
page, edit it in the editor, save, and find it under that type; reset an edited shipped page.

**Acceptance Scenarios**:

1. **Given** a page row, **When** the user presses Enter or "Open in editor", **Then** the
   template editor opens on that page; after saving, the tree shows the saved name.
2. **Given** an edited shipped page, **When** the user resets it, **Then** the original returns
   and documents keep their values.
3. **Given** "New page" on a type, **When** the user picks "Copy of Full sheet", **Then** the
   editor opens on a new page for that type starting from that page.

---

### User Story 3 - Move settings, types, and pages (Priority: P2)

The user moves their own page to another type, their own type to another setting, and their own
setting to another ruleset — by dragging a row onto its new parent, through "Move…" in the
item's details, or from its context menu. Only valid destinations accept a drop. A move to
another ruleset explains what changes and waits for confirmation.

**Why this priority**: Items created in the wrong place were stuck there (T-070 fixed this only
for pages, and only inside the editor).

**Independent Test**: Drag a user type from one setting to another and confirm its documents
and pages followed; move a user setting from V5 to WoD 2e and confirm the warning appeared first.

**Acceptance Scenarios**:

1. **Given** a user page, **When** it is dropped on another type, **Then** it becomes that
   type's page; documents that opened on it and cannot use it any more return to their default
   page (as in T-070).
2. **Given** a user type with documents, **When** it is moved to another setting, **Then** the
   type, its pages, and its documents belong to the new setting, and the create dialog lists the
   type under the new setting.
3. **Given** a user setting on V5, **When** it is dropped on WoD 2e, **Then** a confirmation
   explains that page bindings to V5 data become editor issues, document values are kept, and the
   setting's core character becomes the WoD 2e one; nothing moves until the user confirms.
4. **Given** that setting has 3 V5 mortals, **When** the move is confirmed, **Then** the 3 mortals
   stay on V5 without a setting, open on the page they used before (now one of the V5 "Rules
   only" pages), and keep their values.
5. **Given** a shipped item or a setting's core character, **When** the user tries to drag it,
   **Then** it cannot be picked up and "Move…" is not offered.

---

### User Story 4 - Export chosen branches (Priority: P2)

The user switches the library to export, ticks branches of the tree (a whole setting, a few
types, single pages, edited shipped pages), sees a summary and a preview of the file, and saves
it. Anything the selection cannot be installed without — their own setting of a chosen type,
their own type of a chosen page — is added automatically and shown as such. Shipped items are
never copied into the file; they appear only as the place the user's parts belong.

**Why this priority**: Sharing a setting as one file was the maintainer's follow-up request, and
the tree makes selective export natural.

**Independent Test**: Tick one page of a user type and export; the file contains the page, its
type, and the type's setting, and nothing shipped except addresses.

**Acceptance Scenarios**:

1. **Given** a user page of a user type in a user setting, **When** only the page is ticked,
   **Then** the type and the setting are added automatically, marked as added for the page.
2. **Given** an edited shipped page, **When** it is exported, **Then** the file carries the
   user's version and the address of the shipped page it replaces.
3. **Given** a partly ticked branch, **When** viewed, **Then** its box shows a partial state.

---

### User Story 5 - Import with a preview (Priority: P2)

The user picks a library file and sees its tree before anything changes: every branch marked new,
already present and identical, or in conflict with something they have, plus the shipped places
it attaches to. For each conflict the user chooses Replace or Keep both; they untick what they do
not want and import the rest. Files from spec 012 (a single type, or a document carrying its type)
still import.

**Why this priority**: Export is only useful when import is safe; silent overwrites would lose
work.

**Independent Test**: Export a setting, change one of its pages, import the file back, choose
"Keep both" for the conflicting page, and confirm both pages exist.

**Acceptance Scenarios**:

1. **Given** a file whose setting already exists, **When** previewed, **Then** that setting shows
   "conflict" with the choice Replace / Keep both, and identical branches show "already present"
   and cannot be ticked.
2. **Given** "Keep both", **When** imported, **Then** the incoming item is installed under a new
   identity and a distinguishable name.
3. **Given** a file that references a ruleset or shipped setting this app does not have, **When**
   previewed, **Then** those branches are shown as unavailable and cannot be imported.
4. **Given** a spec 012 type file, **When** imported through the library, **Then** it previews
   and installs like a library file with one type.

---

### User Story 6 - One set of accent colors (Priority: P3)

The template editor and the library mark selection, focus, pressed modes, frames, insertion
points, and help with the app's primary and secondary colors, like the rest of the app. The
violet appears only in edge cases the user must tell apart, such as parts added automatically
to an export.

**Why this priority**: A visual consistency fix; valuable, not blocking.

**Independent Test**: Open the editor and the library in both themes and find no violet except
the automatically added export parts.

**Acceptance Scenarios**:

1. **Given** the template editor, **When** an element is selected or the Edit/Preview switch is
   pressed, **Then** the accent is primary or secondary, in light and dark themes.
2. **Given** the element storybook palette, **When** viewed, **Then** the violet is listed as the
   tertiary color.

### Edge Cases

- A user type whose default page was deleted or moved picks another of its pages; with none left
  it shows stored values (spec 012 behavior).
- Deleting a type's last page leaves the type and its documents intact.
- A stored user setting whose ruleset is no longer registered (for example after a system is
  removed) is kept and shown in an "Unavailable" group, never dropped; an import cannot bring in
  such a setting, because unavailable branches are not importable.
- Deleting a user setting detaches the documents of its core character (they open on the
  ruleset's "Rules only" page), so no document points at a setting that no longer exists.
- Moving a setting whose core character has documents to another ruleset: those documents stay
  on their old ruleset, detached from the setting, and keep opening on the page they used, which
  stays with them among that ruleset's "Rules only" pages, with every value intact; the
  confirmation names how many documents and pages stay. Documents of the setting's own
  types move with it.
- Dropping a row on itself, on its own descendant, or on its current parent does nothing.
- Search with no matches shows an empty state instead of an empty panel.
- Two items with the same name are told apart by their description and path in pickers.
- Very large libraries (hundreds of pages) keep the tree responsive: branches render only when
  expanded.

## Requirements _(mandatory)_

### Functional Requirements

#### Tree and details

- **FR-001**: The library MUST present one tree with exactly four levels — ruleset, setting,
  document type, page — replacing the page-template list.
- **FR-002**: Rulesets MUST be the shipped engines; each MUST list a "Rules only" setting with its
  core characters, the shipped settings built on it, and the user's settings on it.
- **FR-003**: Every row MUST show its level, whether it is shipped or the user's, whether a
  shipped page is edited, the default page of a type, and counts (settings, types, documents).
- **FR-004**: Selecting a row MUST show its details and the actions of its level beside the tree
  (stacked tabs on narrow screens).
- **FR-005**: The tree MUST support search, filters "All" / "Only yours" / "Edited shipped",
  a context menu with the selected item's actions, and keyboard navigation (arrows move and
  expand, Enter opens a page).

#### Creating, editing, deleting

- **FR-006**: Users MUST be able to create a setting on a ruleset, a type in any non-"Rules only"
  setting, and a page for any type; creating a setting or a type MUST NOT create any page.
- **FR-007**: A type without pages MUST open its documents on their stored values; a setting's
  core character without its own page MUST open on the ruleset's "Rules only" page.
- **FR-008**: Users MUST be able to rename and describe their own settings, types, and pages;
  shipped items MUST stay read-only and undeletable.
- **FR-009**: Users MUST be able to choose the default page of any type that has pages.
- **FR-010**: Deleting a setting or type MUST state how many documents are affected and keep
  those documents; deleting a page MUST return documents opened on it to their default page.
- **FR-011**: Page actions MUST include open in the editor, duplicate, make default, export,
  delete (own pages), and reset (edited shipped pages); a new page MUST start blank or as a copy
  of another page of the same type.

#### Moving

- **FR-012**: Users MUST be able to move their own pages between types, their own types between
  settings, and their own settings between rulesets, by drag and drop onto the new parent, by a
  destination picker in the details, and from the context menu.
- **FR-013**: Shipped items and settings' core characters MUST NOT be movable; invalid drop
  targets MUST NOT accept a drop.
- **FR-014**: A move that changes an item's system MUST require confirmation that states its
  consequences before anything changes — every move across rulesets, and a move between a
  setting system (Star Wars) and its ruleset, where bindings to the setting's data are lost.
- **FR-015a**: When a setting moves to another ruleset, documents of its core character MUST stay
  on the old ruleset, detached from the setting, together with the setting's pages for that
  character, which become "Rules only" pages of the old ruleset; each document MUST keep opening
  on the page it used (a document that followed the setting's page is pinned to it). The
  confirmation MUST state how many documents and pages stay.
- **FR-015**: Moves MUST carry their contents and keep documents: a moved type keeps its pages and
  documents; a moved page follows the T-070 rules for documents and setting pages.

#### Export and import

- **FR-016**: Users MUST be able to select branches for export with checked, unchecked, and
  partial states, see a summary and a preview, and save one file.
- **FR-017**: Export MUST add the user's own parents a selection needs, mark them as added
  automatically, and never copy shipped content — shipped rulesets, settings, types, and pages
  appear only as addresses; edited shipped pages carry the user's version.
- **FR-018**: Import MUST preview the file's tree with each branch marked new, already present,
  conflict, or unavailable, before changing anything.
- **FR-019**: For each conflict the user MUST choose Replace or Keep both; "Keep both" installs
  the incoming item under a new identity and a distinguishable name.
- **FR-020**: Import MUST accept the spec 012 type file and documents that carry their type.
- **FR-021**: Invalid or unreadable files MUST be rejected with a message naming the problem,
  changing nothing.

#### Accents (T-081)

- **FR-022**: The library and the template editor MUST use primary and secondary accents for
  selection, focus, pressed states, element frames, insertion points, and help.
- **FR-023**: The violet MUST become a tertiary color used only for edge cases the user must tell
  apart (in this feature: parts added automatically to an export), and appear as tertiary in the
  storybook palette.

#### Documentation

- **FR-024**: The template editor guide MUST describe the library tree, moving, and file transfer
  in both languages, with help links from the library to it.

### Key Entities

- **Ruleset**: a shipped game engine (mechanics, dice, core characters). Not created by users.
- **Setting**: a world on one ruleset — "Rules only", shipped (Star Wars, Hunter as a V5 line), or
  the user's. Holds document types.
- **Document type**: what documents are — a shipped definition, the ruleset's core character in a
  setting, or the user's own type. Has pages and optionally a default page.
- **Page**: a template that shows documents of one type — shipped, an edited shipped page, or the
  user's.
- **Library file**: a selection of the user's settings, types, and pages, with addresses of the
  shipped places they attach to; supersedes the single-type file while still reading it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A reviewer can name the setting and ruleset of every type in the example library,
  from the tree alone, within 1 minute.
- **SC-002**: Creating a setting, a type in it, and a first page takes under 2 minutes for a user
  who has not seen the library before.
- **SC-003**: Moving a type to another setting of the same system takes at most 2 actions (drag
  and drop, or Move and pick); a move that changes the system adds only the confirmation.
- **SC-004**: Exporting a setting and importing it into an empty profile reproduces every chosen
  setting, type, and page with no manual fixing.
- **SC-005**: No import changes anything before the user confirms the preview; conflicts never
  overwrite silently.
- **SC-006**: In the template editor and the library, no violet appears except in the defined
  edge cases, in both themes.
- **SC-007**: Opening the library with 300 pages shows the tree in under 1 second.

## Assumptions

- The rulesets are the two shipped ones (WoD 2e, V5); the "Rules only" setting is how the tree
  shows the engine's own characters (the WoD 2e engine character and the V5 mortal), not a new
  stored object.
- Star Wars stays its own system with frozen identities (spec 012); the tree presents it as a
  setting on the WoD 2e ruleset without changing stored data.
- The ruleset's core character is listed under "Rules only" and under every user setting; listing
  it under shipped line settings (a V5 mortal inside Hunter) needs a new stored notion and is a
  follow-up, not part of this feature.
- Choosing a default page affects new documents of a shipped type only; for a user type or a core
  character inside a user setting it also applies to existing documents that have no page of their
  own, because they follow the type's or setting's default (spec 012 behavior).
- A user type's default page becomes optional; existing stored types migrate without change of
  meaning.
- The library file is a new version of the spec 012 file family; old files remain importable.
- The look of the tree borrows from the maintainer's world-info workspace plugin (compact rows,
  expand toggles, badges, context menu), but its levels are fixed, unlike folders and files.
- Moving a page keeps the T-070 behavior already shipped; the editor's "Type and setting" select
  remains as a second way to move a page.
