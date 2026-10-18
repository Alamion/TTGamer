# Feature Specification: A Create Dialog That Scales With Many Document Kinds

**Branch**: `039-document-create-dialog` | **Created**: 2026-10-17 | **Status**: Draft

**Input**: "Spec 039 — T-120, a create dialog that scales with many document kinds. Players and GMs
find the kind of document to create quickly however many systems, settings, modules, and their own
document types are installed, instead of scanning one long list of radio buttons grouped by system.
Covers choosing the kind (search, grouping by ruleset/setting/module as the library tree does,
recent or favourite kinds), the start of the document (blank or one of the kind's examples), name
and folder, keyboard and phone use, and the documentation create buttons. T-102 touches the same
question; decide whether it joins this spec. Branch from master after v3.29.0."

## Context

The **New** dialog lists every document kind as a radio button under a heading per setting: today
eleven shipped kinds (Star Wars five, WoD 2e one, V5 mortal, Hunter, Vampire) plus every user
setting and type, each user setting repeating its ruleset's core kinds. It already needs scrolling
on a laptop and is a long page on a phone, and it grows with every plugin and user type (T-120). It
also does less than the rest of the app: the new document has no name until the sheet is opened, it
always lands where the dialog was opened, and the example documents each kind ships (Jax Vorn, the
wampa, the stormtrooper squad, Lena Varga, Mirela Voss) can be used only as sample data in the
template editor, never as a starting point. Documentation create buttons make a blank document
without saying where it went.

## Clarifications

### Session 2026-10-18

- Q: How is the dialog laid out on a computer? → A: Two panes on one screen: search, **Recent**, and
  the grouped kinds on the left; the chosen kind's start (blank or an example), name, folder, and
  **Create** on the right. On a phone the same parts come as two steps (kind, then details).
- Q: Does T-102 (system badges and a system filter in the document manager) join this spec? → A: No;
  it stays a separate task that reuses this spec's ruleset and setting labels.
- Q: Are favourite (pinned) kinds needed besides **Recent**? → A: No, only **Recent** for now.
- Q: What do documentation create buttons do? → A: They create at once, as today, but name what they
  create and confirm with a message that offers **Open**; they do not open the dialog.

## User Scenarios & Testing

### User Story 1 - Find the kind quickly (Priority: P1)

A player opens **New** and sees the kinds grouped the way the library tree shows them: by ruleset,
then by setting or module (Star Wars under WoD 2e; Hunter and Vampire under V5), with their own
settings and types under the ruleset they are built on. Groups can be folded. A search field at the
top has the focus: typing part of a kind's name, its setting's name, or its English book name in
either language narrows the list to matching kinds, keeping their group headings. The kinds the
player created last appear first in a short **Recent** row.

**Why this priority**: finding the kind is the whole problem of T-120; everything else builds on it.

**Independent Test**: With the shipped kinds and twenty user types installed, open **New**, type
"vamp", and check that only the vampire kind remains and that `Enter` selects it.

**Acceptance Scenarios**:

1. **Given** the shipped kinds, **When** the dialog opens, **Then** the kinds appear under ruleset
   and setting/module headings in the library tree's order, and the search field has the focus.
2. **Given** the Russian interface, **When** the player types "hunter" or «охот», **Then** the
   Hunter kind is listed in both cases.
3. **Given** a user setting "Lunar Colony" on the V5 ruleset with two own types, **When** the dialog
   opens, **Then** the setting appears under V5 with its own types and the ruleset's core kinds, and
   types with the same name are told apart by their descriptions.
4. **Given** the player created a vampire and then a vehicle, **When** the dialog opens again,
   **Then** **Recent** shows the vehicle and the vampire, newest first.
5. **Given** a search with no match, **When** the list is empty, **Then** the dialog says nothing
   matched and offers to clear the search.

---

### User Story 2 - Name it and choose where it goes (Priority: P1)

After choosing a kind, the player can type the document's name and pick its folder in the same
dialog, then press **Create**. The folder starts as the one the dialog was opened from (the top
level from the sheet's toolbar). The document is created with that name and, unless the dialog was
opened only to create, opens on the sheet.

**Why this priority**: today every new document is untitled until the sheet is opened, and moving it
to a folder is a second step.

**Independent Test**: Open **New** from a folder's menu, choose a kind, type "Night watch", change
the folder to another one, press **Create**; the document appears in the chosen folder under that
name.

**Acceptance Scenarios**:

1. **Given** a chosen kind, **When** the player types a name and presses `Enter`, **Then** the
   document is created with that name and opens.
2. **Given** an empty name, **When** the player creates the document, **Then** it gets the name a
   new document of that kind gets today, and the name field of the sheet is ready to type in as now.
3. **Given** the dialog opened from folder "Campaign", **When** it shows, **Then** the folder is
   "Campaign"; choosing another folder places the document there.
4. **Given** a kind whose page stores the name in a document field (a character's Name), **When**
   the document is created with a name, **Then** the sheet shows that name in the field.

---

### User Story 3 - Start from an example (Priority: P2)

For a kind that ships examples, the player chooses between **Blank** and each example (Jax Vorn,
Lena Varga, Mirela Voss, the wampa, the stormtrooper squad, the vehicles). The new document is an
independent copy of the example — its values and portrait — under the name typed, or the example's
name when none is typed.

**Why this priority**: examples teach a system by showing a finished document, and they already
exist.

**Independent Test**: Choose the vampire kind, then **Mirela Voss**, and create; the new document
has Mirela's values and portrait, and editing it leaves the example unchanged for the next copy.

**Acceptance Scenarios**:

1. **Given** a kind without examples, **When** it is chosen, **Then** no start choice is shown and
   the document starts blank.
2. **Given** **Lena Varga** chosen, **When** the document is created twice, **Then** two independent
   documents exist and changing one does not change the other or the example.
3. **Given** an example chosen and no name typed, **When** created, **Then** the document is named
   after the example.

---

### User Story 4 - Keyboard and phone (Priority: P2)

The whole dialog works without a mouse: typing searches, arrows move through the visible kinds,
`Enter` on a kind moves to the name, `Enter` in the name creates, `Escape` clears the search and
then closes. On a phone the dialog fills the screen and comes in two steps: the kind (search,
**Recent**, groups in one column with touch-sized rows), then its details (start, name, folder,
**Create**), with a way back to the first step.

**Why this priority**: the app is used at the table on phones; keyboard reachability is constitution
VI.

**Independent Test**: At a 360 px wide screen, create a Hunter named "Ana" using only the keyboard,
then by touch, without horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** the search has text, **When** `Escape` is pressed, **Then** the search clears; a second
   `Escape` closes the dialog.
2. **Given** a 360 px wide screen, **When** the dialog opens, **Then** it covers the screen, rows
   are at least 32 px tall, and nothing scrolls sideways.
3. **Given** a screen reader, **When** the list is filtered, **Then** the number of matching kinds
   is announced.

---

### User Story 5 - Create buttons in the documentation (Priority: P3)

A create button in the documentation names what it makes ("New: Vampire character", "Copy Mirela
Voss") and, after creating, says that the document was created with a link that opens it on the
sheet. A button for an example creates a copy as in story 3.

**Why this priority**: docs buttons are the entry point for newcomers, but they work today.

**Independent Test**: On the Vampire "Meet Mirela" page, press the copy button, follow the link, and
see Mirela's copy on the sheet.

**Acceptance Scenarios**:

1. **Given** the Vampire landing page, **When** the player presses **New: Vampire character**,
   **Then** a blank vampire is created on the kind's default page and a message with **Open**
   appears.
2. **Given** a docs button for an example, **When** pressed, **Then** an independent copy is created
   and the kind counts as recent in the dialog.

### Edge Cases

- A recent kind whose user type or setting was deleted is dropped from **Recent** without a message
  to the player (developers still see it in the diagnostics).
- A documentation button whose kind or example is not installed says so in a message instead of
  failing silently.
- A user type deleted while the dialog is open disappears from the list; if it was chosen, the
  choice clears and **Create** is disabled until another kind is chosen.
- The folder chosen in the dialog is deleted before **Create**: the document goes to the top level.
- A kind with a single result in the search is chosen automatically, so `Enter` goes to the name.
- A ruleset with one setting and one kind shows no empty or one-child intermediate heading.

## Requirements

### Functional Requirements

- **FR-001**: The dialog MUST group kinds by ruleset and then by setting or module, in the library
  tree's order, with user settings under their ruleset and their own types inside them.
- **FR-002**: Groups MUST fold and unfold; the fold state MUST be remembered on the device.
- **FR-003**: A search field MUST filter kinds by kind name, setting/module name, ruleset name, and
  English book name, in the interface language and in English, ignoring case and letter accents.
- **FR-004**: The dialog MUST show up to five most recently created kinds in a **Recent** row,
  remembered on the device and updated by every create path (dialog and documentation buttons).
- **FR-005**: User types MUST show their description; kinds with the same name MUST be told apart.
- **FR-006**: The dialog MUST offer a name field; an empty name MUST keep today's default naming.
- **FR-007**: The dialog MUST offer a folder choice, starting at the folder it was opened from.
- **FR-008**: For kinds with examples, the dialog MUST offer **Blank** or one example; creating from
  an example MUST make an independent copy of its values and portrait.
- **FR-009**: A document created with a name MUST show that name wherever the kind stores its name
  (document title and the page's name field).
- **FR-010**: Every action MUST be reachable by keyboard as in story 4; `Escape` clears the search
  before it closes.
- **FR-011**: The number of matching kinds MUST be announced to assistive technology after
  filtering.
- **FR-012**: On screens narrower than 640 px the dialog MUST fill the screen and show two steps
  (kind, then details) with a way back; the search stays visible in the first step and **Create** in
  the second.
- **FR-013**: Documentation create buttons MUST name what they create, MUST support creating from an
  example, and MUST confirm the creation with a way to open the document.
- **FR-014**: All new strings MUST exist in English and Russian.
- **FR-015**: The new document MUST open on the same page and view as a document created today (the
  library's default page, a user setting's own page).
- **FR-016**: On wider screens the dialog MUST show two panes at once: the kinds on one side and the
  chosen kind's start, name, folder, and **Create** on the other.

### Key Entities

- **Kind**: a document definition of a system, setting, module, or user type; has a name, an
  optional description, a group path (ruleset → setting/module), and optional examples.
- **Recent kinds**: an ordered, device-local list of up to five kind references.
- **Example**: a named, read-only document shipped with a kind, copied on creation.

## Success Criteria

- **SC-001**: With 50 kinds installed, a player creates a document of a kind with a unique
  three-letter prefix in 5 keystrokes after opening the dialog (three letters, `Enter`, `Enter`).
- **SC-002**: With 100 kinds installed, the dialog appears and the list reacts to each keystroke
  within 100 ms on the reference laptop.
- **SC-003**: In a walk of five tasks (find a user type, create a named Hunter in a folder, copy an
  example, create on a phone, create from the docs), every task succeeds on the first try.
- **SC-004**: The dialog never scrolls sideways at 360 px, and every interactive row is at least 32
  px tall on touch screens.
- **SC-005**: The sheet page's bundle grows by at most 5 KB gzip.

## Assumptions

- **T-102 stays separate**: system badges and a system filter belong to the document manager's list,
  a different surface; this spec only reuses the same ruleset/setting labels, so T-102 can adopt
  them.
- Favourite (pinned) kinds are out of scope; **Recent** covers the frequent-kind need. They can be
  added later without changing the dialog's layout.
- Examples are the ones kinds already ship; adding new examples is not part of this spec.
- The dialog's choice of kinds uses only installed definitions; no new kinds are added.
- Import stays a separate action in the document manager.
- The number of kinds is expected in the tens to low hundreds; the list is not virtualized below 200
  kinds (scale note, constitution VII).
