# Feature Specification: Brief block as its own template element

**Branch**: `041-brief-block-element` | **Created**: 2026-10-18 | **Status**: Draft

**Input**: "Spec 041 — T-125, brief block as its own template element. Today a brief is built from
ordinary groups that carry a brief-look flag; the maintainer wants the brief look to be a dedicated
element type of the template: a brief block that merges a section and a group, used as the plain
separator between clearly different kinds of fields, offered only on brief pages. Covers how a page
is known to be a brief, what happens to a brief block moved into a full page and to a section or
card on a brief, collapsibility by the composition rule, the editor palette and settings of the
block, migrating every shipped brief and every stored user template and default override, and
keeping today's measured brief heights."

## Context

A brief is the short view a GM glances at during play (spec 033). Today it is assembled from the
same containers as a full sheet — sections and cards (groups) — where a card carries a "brief look"
switch that removes its box and lays its cells out by the width of the area. Nothing tells a page
that it is a brief, so authors can mix boxed cards, sections, and brief-look cards on one page, and
the editor offers the brief switch on every card of every page.

The maintainer composes pages by a fixed rule (recorded in the `sheet-templates` skill): a full
sheet is sections → cards → fields; a brief has no sections and no cards, only plain blocks that
separate clearly different kinds of fields (attributes apart from skills). Making the brief block
its own element, offered only on brief pages, lets the editor enforce that rule instead of relying
on a flag. Backlog: T-125 (from the spec 040 review).

## User Scenarios & Testing

### User Story 1 - Build a brief from brief blocks (Priority: P1)

A template author opens a brief page in the template editor. The add menu offers a **Brief block**
instead of a section or a card. The block has a title, can start folded, and lays out its fields the
way brief-look cards do today. The author adds a block for attributes and another for skills and
sees two plain headings over a hairline, no boxes.

**Why this priority**: it is the element itself; without it nothing else in this spec applies.

**Independent Test**: create a brief page, add two brief blocks with fields, and check the sheet
draws them as today's brief-look groups do (heading, hairline, cells laid out by area width).

**Acceptance Scenarios**:

1. **Given** a brief page in the editor, **When** the author opens the add menu at the top level,
   **Then** it offers Brief block and fields, and offers neither Section nor Card.
2. **Given** a brief block, **When** the author opens its settings, **Then** they show its title,
   whether the title is shown, its columns, whether it can fold and whether it starts folded, and
   help text; they show no "brief look" switch.
3. **Given** a brief block with ratings set to their short form, **When** the sheet shows it,
   **Then** it looks and measures as a brief-look group of the same content does today.
4. **Given** a card with full-size fields converted to a brief block, **When** the sheet shows it,
   **Then** its fields draw compact and its ratings with short labels, with no field settings
   changed by hand; converted back to a card, they draw full size again.
5. **Given** a full page in the editor, **When** the author opens the add menu, **Then** it offers
   Section and Card and does not offer Brief block, and cards have no "brief look" switch.

---

### User Story 2 - Every page knows whether it is a brief (Priority: P1)

Each page is either a full page or a brief. Shipped briefs are briefs; the author chooses the kind
when making a page and can see it in the page's settings. The kind decides what the editor offers
and which page a document opens in beside another one.

**Why this priority**: the editor cannot offer the block "only on brief pages" without it.

**Independent Test**: open each shipped brief in the editor and see it marked as a brief; make a new
page as a brief and see the brief add menu.

**Acceptance Scenarios**:

1. **Given** any shipped brief (Star Wars, WoD 2e, V5), **When** it is opened in the editor,
   **Then** its settings say it is a brief.
2. **Given** the author creates a new page, **When** they switch it to a brief before adding
   anything, **Then** it holds one brief block with the starter field, and a full page starts as
   today.
3. **Given** a document opened beside another (spec 034), **When** its kind has a brief page,
   **Then** it starts in that page, whatever the page's id.
4. **Given** an existing page, **When** the author switches its kind in the page's settings,
   **Then** its containers convert (a full page's cards become brief blocks, one per card, and a
   section's loose fields a block of their own; a brief's blocks become cards), every field keeps
   its place in reading order, a message says what was converted, and one undo step restores the
   page.

---

### User Story 3 - Moving content between full pages and briefs (Priority: P2)

Authors copy and move parts between pages (clipboard, drag, the outline). A brief block that lands
on a full page, or a section or card that lands on a brief, must still give a page that follows the
composition rule, and the author must never lose fields.

**Why this priority**: copying parts between a full sheet and its brief is the common way briefs are
made; it must not produce pages the editor would not let one build.

**Independent Test**: copy a card from a full page into a brief and a brief block into a full page;
check the result's containers and that every field arrived.

**Acceptance Scenarios**:

1. **Given** a card copied from a full page, **When** it is pasted on a brief, **Then** it becomes a
   brief block with the same title, columns, fold settings, and fields, and a message says it was
   converted.
2. **Given** a section with three cards copied from a full page, **When** it is pasted on a brief,
   **Then** the result follows the same choice as a card, one brief block per card, and the
   section's own loose fields (if any) go into a block of their own.
3. **Given** a brief block, **When** it is pasted on a full page, **Then** it follows the same
   choice in the other direction (a card where it was pasted). Drags stay within one page, so they
   only follow the nesting rule (FR-004).
4. **Given** any of these, **When** it completes, **Then** one undo step returns the page as it was.

---

### User Story 4 - Existing briefs and templates keep working (Priority: P1)

Players and authors already have briefs: the shipped ones, edited copies of shipped briefs, and
their own pages that use brief-look cards. After the update they open exactly as before.

**Why this priority**: stored templates are user data; a change of format must not break or silently
restyle them.

**Independent Test**: load stored templates and default overrides made before the change (fixtures
of every shape) and check the result, its look, and its measured height.

**Acceptance Scenarios**:

1. **Given** every shipped brief, **When** it is drawn after the change, **Then** its height at 375
   and 1280 px stays within 1% of today's (SC-001) and nothing overflows sideways at 320, 375, 640,
   and 1280 px.
2. **Given** an edited shipped brief stored before the change, **When** it loads, **Then** it is a
   brief whatever it holds: its brief-look and boxed cards become brief blocks with the same titles,
   columns, fold state, and fields, a section becomes one block per card plus one for its loose
   fields, the author is told once if anything other than brief-look cards was converted, and the
   edit is still marked as an edit of the shipped page.
3. **Given** a user's own page that mixes brief-look cards with sections or boxed cards, **When** it
   loads, **Then** it is a brief only when every container at its top level is a brief-look card
   (those become brief blocks); otherwise it is a full page and its brief-look cards become ordinary
   cards, and the sheet page tells the author, once, which page was converted and how.
4. **Given** a template file exported before the change, **When** it is imported, **Then** it is
   converted the same way as a stored template, and the import report says what was converted.

### Edge Cases

- A brief block inside another brief block: not offered; a pasted one is flattened into its parent's
  place (its fields keep their order).
- A brief block at a place a card could not stand (inside a table or list): never offered there.
- A brief with no blocks, only fields: valid; the fields flow as today's ungrouped brief fields.
- Folding: a block that folds is drawn with its heading as the toggle; a block that does not fold
  has no toggle, and the remembered open/closed state of a converted card carries over.
- A brief page assigned as a user setting's page (spec 012) stays assignable as before.

## Clarifications

### Session 2026-10-18

- Q: Can the author change the kind of an existing page? → A: Yes, from the page's settings; its
  containers convert (cards and sections to brief blocks, blocks to cards), one undo step.
- Q: What happens to a card or section pasted on a brief, or a brief block on a full page? → A: It
  converts (card → block, section → one block per card, block → card) with a message.
- Q: What does a stored page that mixes brief-look cards with sections or boxed cards become? → A: A
  brief only when every top-level container is a brief-look card; otherwise a full page whose
  brief-look cards become ordinary cards, with a one-time notice to the author.
- Q: What does an edited shipped brief that holds boxed cards or sections become? → A: Always a
  brief; its cards and sections convert to brief blocks (the majority rule applies only to the
  user's own pages).
- Q: Does a field change its look when its card becomes a brief block, or the other way round? → A:
  Fields follow the page: on a brief every field draws compact and ratings show their short label;
  on a full page fields draw full size. The per-field "compact" setting goes away.
- Q: Does the editor enforce the full-sheet composition rule (sections ≥ 5 fields, cards ≥ 3)? → A:
  No; a test checks the shipped pages only, with named exceptions; authors' own pages are free.

## Requirements

### Functional Requirements

- **FR-001**: A template MUST be either a full page or a brief, and the kind MUST be visible in the
  page's settings in the editor.
- **FR-002**: The template format MUST have a brief block element: a titled container (title
  optionally hidden) with columns, optional folding with a starting state, optional help link, and
  field children laid out by the width of the area, as brief-look cards are today.
- **FR-003**: The editor MUST offer the brief block only on briefs, and sections and cards only on
  full pages; the "brief look" switch on cards MUST be removed.
- **FR-004**: A brief block MUST NOT contain sections, cards, or brief blocks.
- **FR-005**: Pasting content from a page of the other kind, and switching a page's kind, MUST
  convert containers (card ↔ brief block; a section → one block per card plus one for its loose
  fields), keep every field in reading order, say what was converted, and be one undo step.
- **FR-006**: Every shipped brief MUST be a brief built from brief blocks, with its current fold
  choices (parts that grow without bound or that play rarely needs start folded, as the composition
  rule says).
- **FR-007**: Stored user templates, edited shipped pages, and imported template files from before
  the change MUST be converted on load without loss of fields, values, titles, columns, fold states,
  or help links; an edited shipped page keeps the kind of the shipped page (its containers convert
  to fit it); a user's own page is a brief only when every top-level container is a brief-look card,
  otherwise a full page whose brief-look cards become cards; the author is told once; a page the
  conversion cannot read MUST go to quarantine and be reported as today.
- **FR-008**: A document opened beside another MUST start in its kind's brief page, found by page
  kind rather than by the page's id.
- **FR-009**: The element storybook and the editor's parity check MUST cover the brief block: every
  setting a shipped brief block uses MUST be settable in the editor.
- **FR-010**: The template editor guide (en and ru) MUST describe page kinds, the brief block, and
  what happens when parts move between kinds.
- **FR-012**: A field's look MUST follow its page kind: on a brief every field draws in the compact
  look and a rating shows its short label (the author's own short label kept); on a full page every
  field draws full size. The editor MUST NOT offer a per-field compact setting; a rating MAY keep a
  setting to show its full name on a brief where a short label would mislead. Stored compact flags
  are dropped on conversion, and a rating of a shipped brief that does not use its short label today
  keeps its full name (`fullLabel`).
- **FR-013**: A test MUST check every shipped page against the composition rule: a full page is
  sections of at least five fields holding cards of at least three, with no loose fields in a
  section; a brief holds only brief blocks and fields. Allowed exceptions (the shared portrait card)
  are named in the test; a shipped full sheet that breaks the rule today is listed as a named
  exception with a backlog entry rather than reworked in this spec. The editor does not check
  authors' own pages.
- **FR-011**: The composition rule in the `sheet-templates` skill MUST name the brief block as the
  only container of a brief.

### Key Entities

- **Page kind**: full page or brief; a property of every template (shipped, user, edited shipped).
- **Brief block**: the only container of a brief; title, columns, folding, help link, fields.

## Success Criteria

- **SC-001**: Every shipped brief's measured height at 375 and 1280 px stays within 1% of the
  heights pinned before the change, with no sideways overflow at 320–1280 px. The one expected
  exception is the vehicle brief, whose crew links take the compact look of briefs (FR-012); its new
  height is pinned instead.
- **SC-002**: 100% of the stored-template fixtures from before the change (every shipped brief,
  edited overrides, user pages of each shape) load with the same fields, values, and titles.
- **SC-003**: A template author builds a two-block brief (attributes, skills) from an empty brief in
  under two minutes using only the add menu and settings, on the first try.
- **SC-004**: On a brief, the add menu never offers a section or a card, and on a full page never
  offers a brief block (checked for every place an element can be added).

## Assumptions

- The look of a brief block is today's brief look (spec 033); this spec changes how a brief is built
  and checked, not how it looks.
- The storage format version of templates and template files goes up by one; older files are
  converted on import as stored templates are, and newer files are refused as today.
- A brief's top level may hold fields without a block; they flow as ungrouped brief fields do now.
- The brief look on pages of user document types (spec 012) follows the same rules: a user type's
  page is a full page unless its author makes it a brief.
- When a document's kind has several briefs (a shipped one and a user setting's page), a document
  opened beside another starts in the brief its setting assigns, else the shipped brief.
- Out of scope: new brief layouts or looks, briefs embedded in other documents (T-051, T-059), and
  automatic generation of a brief from a full page.
