# Feature Specification: Sheet help that explains

**Branch**: `047-sheet-help-links` | **Created**: 2026-10-29 | **Status**: Draft

**Input**: "T-130 and F-011: review every shipped sheet page as a reader who knows nothing about
tabletop games, and find the help links ("?") that are missing, lead to the wrong place, or repeat
each other; fix them, write the documentation they need, and move the '?' out of the section header
button."

## Context

Every shipped page (Star Wars characters, droids, creatures, vehicles, fodder groups; WoD 2e and V5
characters; hunters, vampires, Storyteller characters, V5 groups; the General note) has sections and
groups, and some carry a "?" that since spec 045 shows the linked part of the docs in a card. The
links were added one by one and never reviewed together. The maintainer found examples
([T-130](../../TODO.md), [F-011](../../TOFIX.md)):

- the Star Wars "Experience and notes" section and its "Experience" group link the same place;
- V5 Skills links to Specialties; Hunter's Cell links to Desperation, Danger, and Despair, never
  saying what a cell is; V5 has no experience link;
- a Markdown note has no link to how its syntax works;
- the section "?" sits inside the header's fold button, so screen readers do not find it.

These are examples. The real scope is every page: 13 full pages and 10 briefs across four systems
today, about 47 links, and many sections with none.

## Clarifications

### Session 2026-10-29

- Q: May a single field carry its own "?" (not only sections and groups)? → A: Yes, where the review
  finds a field a newcomer would not understand (a rules term such as Desperation or Blood Potency);
  set per field in the template, like a section's.
- Q: How does an element type's how-to-use help show when the element appears many times on a page?
  → A: A "?" beside the label of every such element (the same mark and card as a section's), only
  for the element types the review finds not obvious; the author can hide it per field in the
  editor.
- Q: In what form does the maintainer check and approve the review table? → A: Both: the table is
  `specs/047-sheet-help-links/review.md` (the record), and a published page built from it lets the
  maintainer mark each row "agree" or "change" with a comment; the marks are carried back into the
  file.
- Q: What happens to a user's edited copy of a shipped page when the shipped page changes? → A: For
  now it keeps what it has (new help links reach only the shipped page and new copies); a general
  notice-and-merge of shipped changes into edited copies is its own task, T-131.

## User Scenarios & Testing

### User Story 1 - Every section says what it is (Priority: P1)

A newcomer opens a hunter sheet and does not know what "Creed", "Drive", "Cell", or "Edges" are.
Each such section or group has one "?", and its card starts by saying what the thing is in plain
words, then how it works.

**Why this priority**: it is the point of the feature; the "?" exists for readers who do not know.

**Independent Test**: for each shipped full page, open every "?" and check that the card's first
paragraph explains the thing it sits on; check that every section a newcomer would not understand
has one.

**Acceptance Scenarios**:

1. **Given** any shipped full page, **When** the reader opens a section's or group's "?", **Then**
   the card's first lines say what that section or group is, not a neighbouring topic.
2. **Given** a section and a group inside it about the same thing, **When** the page draws, **Then**
   only one of them carries the "?".
3. **Given** a section a newcomer would not understand (by the agreed review), **When** the page
   draws, **Then** it has a "?"; sections that need none (a name field, a portrait) have none.

---

### User Story 2 - Elements say how they work (Priority: P1)

A player writing in a Markdown note does not know the syntax for links or callouts; a player looking
at a tracker does not know that a right click marks a box differently. The element itself offers
help that leads to the site guide's page on that element, on shipped pages and on the user's own.

**Why this priority**: the maintainer named the Markdown note; elements are the same on every page,
so one link per element type helps everywhere.

**Independent Test**: on a note and on a page with a tracker, open the element's help and check it
leads to the guide's section on that element; put the element on one's own page in the editor and
check the same help is there.

**Acceptance Scenarios**:

1. **Given** a Markdown field on any page, **When** the reader opens its help, **Then** the card
   shows the guide's part on writing notes (syntax, links, pictures, rolls).
2. **Given** an element type whose use is not obvious (by the agreed review), **When** it is on a
   page, **Then** its help leads to the guide's part on it; obvious ones (a text line, a number)
   have none.
3. **Given** the user's own page in the template editor, **When** the element is added, **Then** it
   carries the same help without the author setting anything.
4. **Given** a field whose author turned on "Hide help" in the editor, **When** the page draws,
   **Then** that field shows no element-type "?" (its own rules "?" stays if set).

---

### User Story 3 - The docs the links need exist (Priority: P2)

Where the right text does not exist yet (what a cell is, an overview of V5 skills, V5 experience),
it is written in English and Russian, starting with a plain definition, and linked.

**Why this priority**: a correct link to a missing text is no help; but most links can be fixed with
existing pages.

**Independent Test**: every link target agreed in the review exists in both languages and its first
paragraph defines the thing.

**Acceptance Scenarios**:

1. **Given** a link target the review marked "write", **When** the feature is done, **Then** the
   section exists in English and Russian with the same anchor, and opens with what the thing is.
2. **Given** a rules section, **When** it is written, **Then** it paraphrases the rules in the
   site's own words (constitution VIII), never quoting the books.

---

### User Story 4 - The "?" is a link for everyone (Priority: P2)

A screen-reader user moving through a sheet hears each section's help link as a link, separate from
the button that folds the section (F-011).

**Why this priority**: an accessibility defect in the same element this feature reworks.

**Independent Test**: with the accessibility tree, find each section's "?" as a link named after its
section, outside the fold button; folding still works by click and keyboard.

**Acceptance Scenarios**:

1. **Given** a section with a "?", **When** a screen reader lists links, **Then** it lists
   "Documentation for <section>" as a link, not inside a button.
2. **Given** the same section, **When** the reader clicks the header or presses Enter on it,
   **Then** it folds and unfolds as before; a click on "?" opens the card and does not fold.

### Edge Cases

- A section whose group repeats its link: the link stays on whichever names the thing more precisely
  (the agreed review says which), the other loses it.
- A brief: briefs keep no "?" of their own unless the review asks for one; they are short views of a
  full page that has them.
- A user's edited copy of a shipped page keeps the links it had; the new links reach only the
  shipped page and new copies. Taking shipped changes into edited copies is T-131.

## Requirements

### Functional Requirements

- **FR-001**: Every section and group of every shipped full page MUST carry a "?" exactly when the
  agreed review says a newcomer needs one.
- **FR-002**: A "?" MUST lead to a part of the docs whose first paragraph says what the thing it
  sits on is.
- **FR-003**: A section and a group inside it MUST NOT both link the same docs part.
- **FR-004**: Element types the review marks as needing help MUST show a "?" beside the label of
  every such element on every full page, shipped or the user's, leading to the site guide (not rules
  pages); a field's "Hide help" setting in the editor removes it for that field. Briefs show only a
  field's own explicit docs link, never element help.
- **FR-011**: A field, and a document-bound element (a primitive such as Hunger or Desperation), MAY
  carry its own "?" to a rules or guide part, set in the template like a section's and editable in
  the template editor; the review decides which shipped ones get one.
- **FR-005**: Rules help MUST lead to rules pages of the page's own system; how-to-use help MUST
  lead to the site guide.
- **FR-006**: Every link target MUST exist in English and Russian with the same anchor (as spec 045
  already checks).
- **FR-007**: New or rewritten docs MUST open with a plain definition and paraphrase rules in the
  site's own words.
- **FR-008**: A section's "?" MUST be a link outside its fold button, named "Documentation for
  <section>", reachable by keyboard; folding keeps working.
- **FR-009**: The review MUST be a table of every shipped section, group, and element type, and of
  every field or bound element a newcomer would not understand (not all ~1,000) — document, page,
  where, what the reader sees, the link today, the link it should have, the first sentence of its
  target, and whether its target must be written — kept in `review.md` beside this spec and agreed
  with the maintainer row by row (through a published page built from it) before pages change.
- **FR-010**: A check MUST fail when a shipped section and a group or field inside it link the same
  place.

### Key Entities

- **Help link**: a "?" on a section, group, field, or element type, with its target (rules page or
  guide) and anchor.
- **Review table**: the agreed list of every place and its intended link.

## Success Criteria

- **SC-001**: In the agreed review, every row marked "needs help" has a working "?" and every row
  marked "none" has none.
- **SC-002**: No shipped page has a section and a group inside it linking the same place.
- **SC-003**: Every "?" card's first paragraph names the thing it sits on (checked row by row in the
  manual walk).
- **SC-004**: A screen reader finds each section's "?" as a link outside the fold button.
- **SC-005**: Opening a sheet takes at most 10 % longer than on `master`, both measured on the same
  machine in one run, and the main chunk grows by no more than 2 KB compressed.

## Assumptions

- The review is done from the point of view of someone who has never played a tabletop RPG, page by
  page, on the dev server; it may also find missing labels or confusing wording, which go to the
  backlog unless they are one-line fixes.
- The card mechanism of spec 045 (fragments by anchor, in the reader's language) is reused; no new
  popover.
- How-to-use help comes from the element type, not from each template, so the user's pages get it
  with no stored change; rules help for one field is the field's own docs path in the template.
- Briefs and the documents window are out of scope except where the review finds a need.
- Rules texts follow constitution VIII: paraphrased, no tables or passages copied.
