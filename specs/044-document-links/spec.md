# Feature Specification: Links Between Documents

**Branch**: `044-document-links` | **Created**: 2026-10-27 | **Status**: Draft

**Input**: "Links between documents (T-128, closes T-051): [[Name]] links in markdown notes and
fields with autocomplete of document names on `[[` and of sections/fields of a document on
`[[Name#`; follow (history, Ctrl-click to new tab/pane); hover/long-press preview card (brief, or a
note's beginning) shared with existing reference fields (Vehicle WoD SW, V5 group members, Member
of); unresolved links offer to create a note; duplicate names resolve to the nearest by creation
date, autocomplete inserts an Obsidian-style folder path when the name is not unique; a link index
built now, rewriting links on rename (with undo), its format proposed to the backend in the OpenAPI
contract; "Mentioned in" backlinks — ideally from every markdown field, scope set by measured
performance and backend plan; embeds ![[Name]] / ![[Name#Section]] in this spec only if they are a
cheap extension of the preview card, otherwise deferred (decide by research in plan). Export keeps
links as text; imported Obsidian links resolve."

## Context

Spec 043 shipped markdown notes: `[[Name]]` and `![[Name]]` are kept as written and look like links,
but open nothing. Reference fields (a vehicle's crew in Star Wars, a V5 group's members, a
character's "Member of") already link documents by id and open them with Back/Forward history, but a
reader sees nothing of the target before opening it. GMs keep a campaign as a web of notes,
characters, places, and groups, so they need to write links quickly, glance at a linked document
without leaving the page, see what mentions a document, and keep links intact when a document is
renamed. Backlog: T-128 (links in notes) and T-051 (one shared link mechanism with brief previews),
roadmap path `gm-notes-templates`.

## Clarifications

### Session 2026-10-27

- Q: Which document does `[[Name]]` mean when several documents share the name? → A: The nearest to
  the document the link is in by folder structure (the one sharing the longest folder path with it,
  as Obsidian prefers nearby files); among equally near ones the earliest created. Suggestions add a
  folder path only when this rule would pick a different document than the one chosen.
- Q: When the nearest document of a name changes (the target moves, or a same-name document appears
  nearer), what do existing links point to? → A: Links resolve live by the nearest rule, but every
  change that would move an existing link to another document (renaming or moving its target,
  creating, copying, importing, or moving in a document of the same name) rewrites that link with a
  folder path so it keeps its target; the change and the rewrites undo as one step.
- Q: Where does "Mentioned in" show? → A: As a field of its own, drawn as a list: by default only at
  the bottom of the General pages (today the Note), and any template author can place it on other
  pages from the template editor.

## User Scenarios & Testing

### User Story 1 - Follow a link from a note (Priority: P1)

A GM reads a session note and clicks `[[Ines Ruiz]]`: the character opens, and Back returns to the
note. Ctrl-click (or a middle click) opens the character in a new tab of the documents window
instead. A link to a name no document has looks different, and clicking it offers to create a note
with that name.

**Why this priority**: links that work are the base of every other story.

**Independent Test**: a note linking to an existing character, a missing name, and a duplicated
name; follow each.

**Acceptance Scenarios**:

1. **Given** a note with `[[Ines Ruiz]]` and a character of that name, **When** the GM clicks the
   link, **Then** the character is shown and Back shows the note again.
2. **Given** the same note, **When** the GM Ctrl-clicks the link, **Then** the character opens in a
   new tab and the note stays shown where it was.
3. **Given** `[[The Lantern Choir|the choir]]`, **When** the note is read, **Then** "the choir" is
   shown as the link text and it opens the group.
4. **Given** `[[Docks]]` and no document named Docks, **When** the GM clicks it, **Then** a
   confirmation offers a new note named "Docks"; accepting creates it in the note's folder, opens
   it, and the link now resolves.
5. **Given** `[[Bruno Kessel#Skills]]`, **When** the GM follows it, **Then** the character opens
   scrolled to its Skills section; a section the target lacks opens it at the top.

---

### User Story 2 - Write links with suggestions (Priority: P1)

Typing `[[` in a markdown field suggests documents by name as the GM types; picking one inserts the
link. Typing `#` after a name suggests that document's sections: a note's headings, a sheet's
sections and fields.

**Why this priority**: without suggestions names are mistyped and links break silently.

**Independent Test**: type `[[in`, pick "Ines Ruiz"; type `[[Bruno Kessel#`, pick "Skills".

**Acceptance Scenarios**:

1. **Given** documents "Ines Ruiz" and "Inn of the Seven", **When** the GM types `[[in`, **Then**
   both are suggested with their kind, the arrow keys move between them, and Enter inserts
   `[[Ines Ruiz]]` with the cursor after it.
2. **Given** a note in `World/Characters` and two documents named "Sword" in `World/Items` and
   `World 2/Items`, **When** the GM types `[[Sw`, **Then** the one in `World/Items` is suggested
   first and inserted as `[[Sword]]`; picking the other inserts `[[World 2/Items/Sword]]`.
3. **Given** `[[Bruno Kessel#`, **When** the GM types, **Then** the character's sections and fields
   are suggested by their shown names, and picking one completes the link.
4. **Given** suggestions are open, **When** the GM presses Esc or keeps typing a name no document
   has, **Then** the suggestions close and the typed text stays as written.

---

### User Story 3 - Preview a linked document (Priority: P2)

Pointing at a link (or a long press on a touch screen, or focusing it with the keyboard) shows a
card of the target without leaving the page: a document's brief, or a note's beginning. The same
card shows on reference fields: vehicle crew, group members, "Member of".

**Why this priority**: GMs check who someone is mid-session without losing their place.

**Independent Test**: point at a link in a note, at a crew link of a Star Wars vehicle, and at a
member of a V5 group.

**Acceptance Scenarios**:

1. **Given** a link to a character with a brief, **When** the GM points at it, **Then** after a
   short pause a card shows the character's brief, and it closes when the pointer leaves both.
2. **Given** a link to a note, **When** the GM points at it, **Then** the card shows the note's
   title and its first lines, read-only.
3. **Given** a V5 group's member chip or a vehicle's crew link, **When** the GM points at it,
   **Then** the same card shows the member's brief.
4. **Given** the card is open, **When** the GM clicks a link inside it, **Then** that document opens
   as if the link were followed from the page.
5. **Given** a keyboard user focuses a link, **When** they press the preview key, **Then** the card
   opens, Esc closes it, and focus returns to the link.

---

### User Story 4 - Keep links when documents are renamed or moved (Priority: P2)

Renaming or moving a document rewrites every link to it in other documents' markdown, and a new
document of the same name never takes over links written before it, so text stays correct; Undo
restores the old state and the old links.

**Why this priority**: renames are common while a world grows; broken links lose work quietly.

**Independent Test**: three notes link to "Ines"; rename her to "Ines Ruiz"; undo.

**Acceptance Scenarios**:

1. **Given** three notes linking `[[Ines]]` and `[[Ines|she]]`, **When** the character is renamed
   "Ines Ruiz", **Then** the notes read `[[Ines Ruiz]]` and `[[Ines Ruiz|she]]`, and a message says
   how many documents were updated.
2. **Given** that rename, **When** the GM presses Undo, **Then** the name and all rewritten links
   return to what they were.
3. **Given** a link that resolved to another document of the same old name, **When** one of them is
   renamed, **Then** only links that resolved to the renamed document change.
4. **Given** a note in `World/Characters` linking `[[Sword]]` to `World/Items/Sword`, **When** the
   GM creates (or copies, imports, or moves in) another "Sword" in `World/Characters`, **Then** the
   existing link is rewritten `[[World/Items/Sword]]` and still opens the first sword.
5. **Given** that note, **When** `World/Items/Sword` moves to `Archive/`, **Then** the link keeps
   opening it, rewritten with a path only if the nearest rule would now pick another sword.

---

### User Story 5 - See what mentions a document (Priority: P3)

A "Mentioned in" field lists the documents whose markdown links to this one, each with the line
around the link, opening the source at that line. Notes show it at the bottom; template authors can
put it on any page.

**Why this priority**: it turns notes into a navigable web, but reading and following come first.

**Independent Test**: two notes and a location type's description link to a note; open the note; add
the field to a character page and open the character.

**Acceptance Scenarios**:

1. **Given** two notes and a "Location" document's markdown description link to the note "Docks",
   **When** the GM opens Docks, **Then** "Mentioned in" at its bottom lists the three with the line
   around each link.
2. **Given** a listed mention, **When** the GM clicks it, **Then** the source opens scrolled to that
   line.
3. **Given** a note stops linking to Docks, **When** the note is saved, **Then** it leaves the list.
4. **Given** a template author adds "Mentioned in" from the **+** menu to a character page, **When**
   the GM opens Ines, **Then** the field lists the notes that link to her; pages without the field
   show nothing.

---

### User Story 6 - Embed a document in a note (Priority: P4)

`![[Bruno Kessel]]` shows his brief inside the note, `![[Docks]]` shows that whole note, and
`![[Docks#History]]` one section of it. Included: the design found it a small extension of the
preview card (Story 3, design D10).

**Why this priority**: valuable for session sheets, but a preview already answers "who is this".

**Independent Test**: a note embedding a character, a note, and a section of a note.

**Acceptance Scenarios**:

1. **Given** `![[Bruno Kessel]]`, **When** the note is read, **Then** his brief shows in place.
2. **Given** note A embeds B and B embeds A, **When** A is read, **Then** the cycle is cut after one
   level with a link in place of the repeat.

### Edge Cases

- **Same name, several documents**: an unqualified `[[Name]]` resolves to the document nearest to
  the link's document in the folder tree (longest shared folder path); among equally near ones the
  earliest created, so a copy made beside the original never takes over its links. A folder path
  chooses one explicitly.
- **Picture or document**: `![[map.png]]` stays a picture when the note stores a picture of that
  name; only otherwise is it a document embed.
- **Deleted target**: its links show as unresolved; restoring the document (Undo) resolves them
  again. Deleting never rewrites other documents' text.
- **Rename to a taken name**: rewritten links use the folder path when the new name is no longer
  unique, so they keep resolving to the renamed document.
- **Moving a folder**: moving a folder counts as moving every document in it; links between
  documents inside the folder keep resolving without rewrites when their relative nearness holds.
- **Links inside code**: `` `[[Name]]` `` and fenced code are text, never links, and are never
  rewritten.
- **Obsidian files**: imported notes keep their links as written; they resolve as soon as documents
  of those names exist. Export writes them unchanged.

## Requirements

### Functional Requirements

- **FR-001**: The reader MUST resolve `[[Name]]`, `[[Folder/Name]]`, `[[Name|text]]`, and
  `[[Name#Section]]` in every markdown field to a document by title (and folder path when given),
  case-insensitively; among several matches the one sharing the longest folder path with the link's
  document wins, then the earliest created.
- **FR-002**: Clicking a resolved link MUST open its target through the same history as reference
  fields; Ctrl/Cmd-click and middle click MUST open it in a new tab of the documents window.
- **FR-003**: A link to a section MUST open the target scrolled to the section (a note's heading, a
  sheet's section or field by shown name), or at the top when no such section exists.
- **FR-004**: An unresolved link MUST look different from a resolved one and, on click, offer to
  create a note of that name in the source's folder.
- **FR-005**: Typing `[[` in a markdown field MUST suggest documents by name (with kind and folder),
  nearest documents first; typing `#` after a name MUST suggest that document's sections;
  suggestions MUST work by keyboard and by pointer and insert a folder path only when FR-001 would
  otherwise resolve the link to a different document.
- **FR-006**: A preview card of the target MUST open on hover after a pause, on long press, and by
  keyboard, for markdown links and for existing reference fields (vehicle crew, group members,
  "Member of"); it shows the target's brief, or for a document without a brief its title and first
  lines.
- **FR-007**: The application MUST keep a link index: for each document, the links its markdown
  makes (target as written, resolved document, field, line), updated when a document is saved,
  imported, deleted, or restored, and rebuilt when missing or out of date.
- **FR-008**: Any change that would make an existing link resolve to a different document — renaming
  or moving its target, or creating, copying, importing, or moving in a document of the same name —
  MUST rewrite that link (new name, or a folder path when the nearest rule would pick another
  document), keeping aliases and sections, report the count, and undo as one step with the change.
- **FR-009**: A read-only "Mentioned in" field MUST list, from the link index, the documents whose
  markdown links to the shown document, with the line around each link, opening the source at that
  line; it MUST be offered in the template editor's **+** menu and sit at the bottom of the shipped
  General pages (the Note), and on no other shipped page.
- **FR-010**: Following, previewing, and rewriting MUST never change text inside code spans or
  fenced code, and export MUST write links exactly as stored.
- **FR-011**: The cloud API contract MUST carry a proposed change (approval pending, backend)
  describing how the link index is stored or derived on the server, so "Mentioned in" can later
  include cloud documents.
- **FR-012**: `![[Name]]` and `![[Name#Section]]` MUST show the target's preview content in place,
  read-only, with nesting depth bounded and cycles cut.
- **FR-013**: Every fallback (unresolved link, missing brief, truncated list, index rebuild) MUST be
  reported through the sheet diagnostics.

### Key Entities

- **Link**: a reference written in markdown: the target as written, an optional folder path,
  section, and alias; the document and field it is in, and its line.
- **Link index**: the stored list of links per source document, with the resolved target id, read
  for "Mentioned in" and renames without loading every document.

## Success Criteria

- **SC-001**: With 3,000 documents, suggestions update within 100 ms of each keystroke.
- **SC-002**: A preview card shows within 300 ms after the hover pause for a document not yet
  loaded.
- **SC-003**: With 3,000 documents and 10 links each, "Mentioned in" lists a document's mentions
  within 500 ms of opening it, or the design states the measured limit and the smaller scope.
- **SC-004**: Renaming or moving a document linked from 100 notes rewrites them within 2 seconds,
  typing elsewhere stays responsive, and one Undo restores every note.
- **SC-005**: 100% of links in the guide's examples and in notes exported to and re-imported from
  Obsidian files round-trip with text unchanged.
- **SC-006**: In a usability walk, a GM writes five links with suggestions and checks two linked
  characters by preview without opening them, with no mistyped link.

## Assumptions

- Links resolve among the documents on this device; cloud documents join through FR-011 later.
- A new note created from an unresolved link starts empty in the source note's folder.
- Ctrl-click opens a new tab in the documents window layout of spec 036; when the layout is full, it
  replaces the oldest unpinned tab as opening any document does.
- Reference fields keep their stored ids; only the preview card is added to them.
- Plain text fields are out of scope; links work in markdown fields only.
- Links to library items, catalog entries, and rules pages are out of scope.
- "Mentioned in" counts links from every markdown field of every document (design D3 measured
  SC-003).
