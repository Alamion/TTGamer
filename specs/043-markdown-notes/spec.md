# Feature Specification: Markdown Notes

**Branch**: `043-markdown-notes` | **Created**: 2026-10-25 | **Status**: Draft

**Input**: "Markdown notes for GMs (and sometimes players), the first slice: a markdown template
element (T-048) and a shipped Note document type built from it. Syntax follows the maintainer's
SillyTavern WorldInfo Workspace preview (every line its own paragraph, GFM blocks, Obsidian
callouts, highlights); foldable callouts serve as spoilers for organizing a long note. Links between
documents, previews, backlinks, and secrets are later slices."

## Context

GMs keep most campaign material as free text — session plans, places, factions, recaps — and players
keep journals and clues. Today the only home for it is a plain multiline text field on a sheet: no
formatting, no structure, no rolls. The documents tree (spec 032) and the pane layout (specs
034–036) already expect "markdown beside sheets" (T-052), and T-048 plans a markdown element for
templates. This spec builds that element and a Note type made of it, so notes live in the same tree,
tabs, export, and template editor as every other document. The syntax is the one the maintainer's
SillyTavern WorldInfo Workspace already uses for lore, so text moves between the two (and Obsidian
vaults) without rewriting. Links between documents (`[[…]]` that navigate, brief previews, backlinks
— T-051) are the next slice and out of scope here.

## Clarifications

### Session 2026-10-25

- Q: Where does the Note live relative to game systems — outside every system or inside a setting? →
  A: a neutral kind outside every system, in its own "General" group in the create dialog and the
  library; the system filter of the documents window lists it on its own.
- Q: What happens to device-stored images when a note is exported as markdown? → A: a note with
  images exports as a zip of the `.md` file and an images folder, its `![[name]]` references
  pointing at the files beside it; a note without images exports as a plain `.md`.
- Q: How much markup help does the source editor give in this slice? → A: a plain text field with
  keyboard shortcuts (bold, italic, link, checklist) and a small toolbar that also inserts a callout
  and a folded callout; no syntax highlighting.
- Q: Are inline spoilers (`||hidden text||`) part of this slice? → A: no; spoilers are block-level
  foldable callouts only, and `||…||` stays literal text, as in Workspace and Obsidian.

## User Scenarios & Testing

### User Story 1 - Write a formatted note (Priority: P1)

A GM creates a **Note** from the create dialog, names it "Session 12 plan", and writes it in
markdown: headings for scenes, a checklist of things to prepare, a table of NPC motives, a quote
from a letter, a highlighted warning. While writing, the rendered text is visible beside the source;
afterwards the note opens in reading mode. The note sits in the documents tree like any document: in
a folder, in a tab, beside a character sheet.

**Why this priority**: it is the whole value of the slice — a place for formatted campaign text.

**Independent Test**: create a Note, type each supported block, reload the page, and see the same
rendered note in reading mode.

**Acceptance Scenarios**:

1. **Given** the create dialog, **When** the GM searches "note", **Then** the Note kind is offered
   whatever rules and settings are installed, and creating it opens an empty note in edit mode with
   the cursor in the text.
2. **Given** a note in edit mode on a wide screen, **When** the GM types, **Then** the rendered
   result beside the source follows the text without a visible lag, and the text is saved as it is
   typed, like other fields.
3. **Given** lines typed one under another without blank lines, **When** they render, **Then** each
   line is its own paragraph.
4. **Given** a saved note, **When** it is opened again, **Then** it shows in reading mode, and one
   action (a button, or a keyboard shortcut) switches to editing and back.
5. **Given** a phone-width pane, **When** the GM edits, **Then** source and result are one view at a
   time with a toggle between them, not two cramped columns.
6. **Given** selected text in edit mode, **When** the GM presses the bold shortcut or a toolbar
   button, **Then** the selection is wrapped in that markup, and the edit is undoable with the usual
   undo shortcut.

---

### User Story 2 - Organize a long note with foldable callouts (Priority: P1)

A GM writes a location note with a long history. They put the history in a callout that starts
folded (`> [!info]- History`), keep the "What the players see" callout open, and mark a twist as a
folded `> [!spoiler]- What is really going on`. Reading the note at the table, they unfold only what
they need.

**Why this priority**: long notes are unreadable without folding; this is the organizing tool the
maintainer asked for in place of secrets.

**Independent Test**: write callouts with `-`, `+`, and no marker; reload; folded ones start folded,
unfold and fold on click and keyboard, and the source text is unchanged by folding.

**Acceptance Scenarios**:

1. **Given** `> [!type]- Title`, **When** the note renders, **Then** the callout shows only its
   title and starts folded; `+` starts unfolded but foldable; no marker is not foldable.
2. **Given** a folded callout, **When** the reader presses its title (or Enter/Space on it),
   **Then** it unfolds, and screen readers hear its expanded state.
3. **Given** a callout of an unknown type, **When** it renders, **Then** it shows as a neutral
   callout with its title, never as broken text.

---

### User Story 3 - Roll from a note (Priority: P2)

The session plan says "Ambush: `dice: 6d10>=6`". During play the GM clicks the roll and the dice
roller rolls it, with the result in the history and shared to Discord/Matrix like any other roll.

**Why this priority**: rolls are what separates a game note from a text file, and the parser and
roll flow already exist.

**Independent Test**: write a roll with valid and invalid notation; the valid one rolls through the
normal dice flow, the invalid one shows as text with a readable reason.

**Acceptance Scenarios**:

1. **Given** inline code `` `dice: <notation>` ``, **When** the note renders, **Then** it shows as a
   roll control with the notation, and pressing it rolls exactly that notation.
2. **Given** notation the dice parser rejects, **When** the note renders, **Then** the code stays
   visible as written with the parser's message on hover or focus, and nothing else on the page
   breaks.
3. **Given** the roll came from a note, **When** it lands in the history, **Then** it is named after
   the note.

---

### User Story 4 - Images in a note (Priority: P2)

A GM pastes a map screenshot into a note, or picks an image file, and it appears where the cursor
was. A web image by its HTTPS address works too.

**Why this priority**: maps and portraits are a large part of prep material.

**Independent Test**: paste an image, pick a file, and write an HTTPS image; reload; all three
render; deleting the reference and leaving the note frees the stored image.

**Acceptance Scenarios**:

1. **Given** edit mode, **When** the GM pastes or picks an image, **Then** it is stored on the
   device with the note and a reference is inserted at the cursor.
2. **Given** a stored image that no line of the note references any more, **When** the note is
   saved, **Then** the image is deleted, as with other document images.
3. **Given** an image address that is not HTTPS, **When** the note renders, **Then** it shows as a
   plain link with an explanation instead of loading.

---

### User Story 5 - Markdown in my own pages (Priority: P2)

A template author makes a "Location" type: a name, a region choice, a danger rating, and a markdown
"Description". The markdown element is offered in the + menu like any field and behaves there as it
does in a Note.

**Why this priority**: the element, not the Note, is the reusable unit (constitution VI), and the
same element will later host links and canvases.

**Independent Test**: add the element to a user page, set its settings, write text in a document of
that type, and see it in the storybook with each variant.

**Acceptance Scenarios**:

1. **Given** the template editor, **When** the author opens the + menu, **Then** a Markdown element
   is offered on full pages and briefs, with a label, a value key, and a starting height setting.
2. **Given** a brief, **When** it shows a markdown element, **Then** the element is read-only
   rendered text, folded by default, and editing happens on the full page.

---

### User Story 6 - Markdown files in and out (Priority: P3)

A GM exports a note as a `.md` file to keep it in their Obsidian vault, and imports a `.md` file
written elsewhere as a new Note.

**Why this priority**: notes are text the GM owns; leaving and arriving must be lossless, but it is
not needed to write notes at all.

**Independent Test**: export a note with front matter, import the file, and compare: same title,
same body byte for byte, unknown front matter keys kept.

**Acceptance Scenarios**:

1. **Given** a note without stored images, **When** the GM exports it as markdown, **Then** a `.md`
   file holds the body verbatim and the title in front matter.
2. **Given** a note with stored images, **When** the GM exports it, **Then** a zip holds the `.md`
   file and an images folder, and opening the unpacked folder in Obsidian shows the images where the
   note shows them.
3. **Given** a `.md` file, or a zip exported as above, **When** the GM imports it, **Then** a Note
   is created with the title from front matter or else the file name, the zip's images are stored
   with it, and front matter keys the app does not know are kept and written back on the next
   export.
4. **Given** a file that is not text or is over the size limit, **When** it is imported, **Then** it
   lands in the existing rejected-files list with the reason.

### Edge Cases

- Raw HTML in the text (`<script>`, `<img onerror>`, `<details>`) is shown escaped, never
  interpreted; links work only for http(s), mailto, and in-page anchors.
- `[[Name]]`, and `![[Name]]` that names no image of this document, written now (or imported from
  Obsidian) are kept verbatim and shown as link-styled text that does nothing yet; the next slice
  gives them meaning without changing the stored text.
- A note at the size limit stays editable and says it is full instead of dropping input.
- Folding is reading state only: it is not written into the note and not shared between panes.

## Requirements

### Functional Requirements

- **FR-001**: Template authors MUST be able to place a Markdown element on any page; its value is
  one text stored like other field values (coordinate, export, reset, undo of value changes).
- **FR-002**: The app MUST ship a Note document type whose page is a single Markdown element plus
  the document name. The Note belongs to no ruleset or setting: the create dialog and the library
  show it in its own "General" group, and the documents window's system filter lists it as its own
  entry.
- **FR-003**: The renderer MUST support the Workspace syntax: ATX and setext headings, rules, fenced
  code, quotes with lazy continuation, tight/loose/nested/task lists, pipe tables, inline code,
  escapes, entities, emphasis, links, autolinks and bare URLs, `==highlights==`, Obsidian callouts;
  every line of a paragraph is its own paragraph.
- **FR-004**: Callouts with `-` MUST start folded and with `+` start unfolded; both fold and unfold
  by pointer and keyboard and expose their expanded state. They are the only spoiler form: `||…||`
  renders as literal text.
- **FR-005**: Task list checkboxes MUST be toggleable in reading mode, writing the change into the
  text.
- **FR-006**: Reading mode MUST be the default when a note opens; editing MUST show source and
  result side by side when the pane is wide enough and as a toggle when it is not.
- **FR-006a**: The source editor MUST be a plain text field with keyboard shortcuts for bold,
  italic, link, and checklist, and a toolbar of labelled, keyboard-reachable buttons for those plus
  a callout and a folded callout; it MUST NOT add syntax highlighting in this slice.
- **FR-007**: `` `dice: <notation>` `` MUST render as a roll control that rolls through the existing
  dice flow, with the note as the roll's source; invalid notation MUST stay as text with the
  parser's message.
- **FR-008**: Pasted or picked images MUST be stored on the device with the document and freed when
  no longer referenced; external images MUST be HTTPS only.
- **FR-009**: Raw HTML MUST never be interpreted; the renderer's output MUST be safe for any input.
- **FR-010**: `[[…]]` and `![[…]]` MUST round-trip unchanged. `![[name]]` naming an image stored
  with the same document renders that image (the form pasted images are inserted in); every other
  `[[…]]` or `![[…]]` renders as inert link-styled text.
- **FR-011**: A note MUST export as a `.md` file (front matter + verbatim body), or as a zip of that
  file and an images folder when it has stored images; both forms MUST import as a Note with its
  images, keeping unknown front matter keys.
- **FR-012**: The element and its variants (reading, editing, folded callouts, a roll, an image, an
  error) MUST appear in the element storybook, and the site guide MUST explain notes and their
  syntax in English and Russian.
- **FR-013**: Every fallback (unknown callout type, rejected image, invalid roll, oversize text)
  MUST report through the sheet diagnostics channel.

### Key Entities

- **Markdown element**: a template field whose value is markdown text; settings: label, value key,
  starting height.
- **Note**: a document of the shipped Note type — a name, one markdown text, its stored images, and
  any front matter keys it arrived with.

## Success Criteria

- **SC-001**: A GM new to the site creates a note and writes a heading, a list, and a folded callout
  in under two minutes using only the guide page.
- **SC-002**: While typing in a 20,000-word note, the rendered result keeps up with typing with no
  pause a user notices.
- **SC-003**: Export followed by import gives back the same body text for 100% of the syntax
  examples on the guide page.
- **SC-004**: With 3,000 notes stored, the documents window opens and searches by name as fast as it
  does today with 3,000 sheets.
- **SC-005**: No input in the renderer test corpus (including hostile HTML) produces executable
  markup.

## Assumptions

- A Note carries no publisher notice, since it uses no publisher material (FR-002).
- The composition rule for shipped pages (sections → cards → fields) governs character sheets; the
  Note page is one markdown element and is exempt by its shape, not by an exception list.
- Inline roll syntax `` `dice: …` `` follows the Obsidian Dice Roller plugin, so vault notes roll as
  they are.
- The size limit per markdown value is 300,000 characters and 100 images (design D6).
- The Note ships a full page only; a brief would repeat the note (design D4).
- Out of scope (later slices): navigating `[[links]]`, brief previews on hover (T-051), backlinks,
  embedding notes or cards (`note-showcase`), rolling a character's pool from a note, full-text
  search, note templates, inserting rolls from the history, folder import/export and linked folders,
  secrets and audience views (T-044), canvas (T-049).
