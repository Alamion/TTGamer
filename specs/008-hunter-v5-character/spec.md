# Feature Specification: V5 Ruleset and Hunter: the Reckoning 5e Player Character

> **Change record.** Current behavior: `.agents/skills/sheet-manager/SKILL.md` (systems, V5 layering, policies) and `.agents/skills/sheet-templates/SKILL.md` (templates, bindings, docs embeds).

**Feature Branch**: `008-hunter-v5-character`

**Created**: 2026-09-14

**Status**: Implemented (v3.6.0) — revision in progress (2026-09-15: policy placement, reuse of existing sheet elements)

**Input**: User description: "по задаче T-038 из TODO.md" — T-038: players create, edit, and export a
validated H:tR 5e hunter sheet built on a reusable V5 ruleset layer, and can re-skin it for a
homebrew setting through the template system (roadmap path `multi-system-sheets`). A table game
runs on it within 1–2 weeks of 2026-09-15; scope is limited to what that session needs.

## Source Material and Policy _(Constitution VIII)_

- **Source**: Hunter: the Reckoning 5th Edition core book (`context/Hunter the reckoning 5e.pdf`,
  image-only scan). Used for sheet structure and trait names only: character sheet (pp. 282–283),
  creation summary (p. 54), attributes and skills (pp. 57, 61), Creeds and Drives (p. 57), Edges
  and Perks (pp. 90–100), cell characteristics (pp. 125–127).
- **Policy**: Paradox Interactive Dark Pack (World of Darkness). The V5 ruleset and the Hunter
  module both declare it.
- **Notice requirement** (revised 2026-09-15, following common fan-project practice): the full
  statement — Dark Pack badge, verbatim notice, and explanation — appears once, on a dedicated
  documentation page (`docs/v5/dark-pack`). Hunter sheets (full, brief, and any user template)
  show only the small Dark Pack badge in the bottom-left corner, linking to that page. Other
  documentation pages carry neither badge nor text. Exported hunter documents and hunter
  templates carry the notice text in the file. Nothing is shown for Star Wars sheets or unrelated
  pages.
- No rules prose, tables, or art from the book are reproduced; descriptions of Edges, Perks,
  Creeds, and Drives, if shown at all, are one-line summaries in the project's own words.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and play a hunter (Priority: P1)

A player creates a new Hunter: the Reckoning 5e character, fills in the sheet the way they would
fill in the printed one — identity, Creed and Drive, attributes, skills with specialties, Edges and
Perks, advantages and flaws, touchstones, equipment, notes — and tracks Health, Willpower, Despair,
and experience during a session. The sheet is saved automatically and reopens unchanged.

**Why this priority**: the upcoming table game needs exactly this; without it nothing else in the
feature matters.

**Independent Test**: create a hunter from scratch, fill every section, mark damage and Willpower
loss, toggle Despair, reload the site, and confirm every value persists and dot values stay within
their allowed ranges.

**Acceptance Scenarios**:

1. **Given** the sheet workspace, **When** the player creates a new document, **Then** "Hunter: the
   Reckoning 5e — Hunter" is offered alongside the existing Star Wars kinds and creates a blank
   hunter with all attributes at 1 and all skills at 0.
2. **Given** a hunter with Stamina 3, **When** the sheet is shown, **Then** the Health track has 6
   boxes; **When** Stamina is raised to 4, **Then** it has 7 boxes and already-marked damage is
   kept.
3. **Given** Composure 2 and Resolve 3, **When** the sheet is shown, **Then** the Willpower track has
   5 boxes.
4. **Given** a Health or Willpower track, **When** the player marks a box, **Then** it can be set to
   superficial or aggravated damage and cleared again.
5. **Given** the Creed and Drive fields, **When** the player edits them, **Then** they can pick one
   of the 5 Creeds / 7 Drives from a list or type a custom value.
6. **Given** the Edges section, **When** the player adds an Edge, **Then** they can pick one of the
   12 Edges (grouped as Assets, Aptitudes, Endowments) or a custom name; in the Perks table they
   pick a book Perk (its Edge fills in) or type a custom one.
7. **Given** a skill with dots, **When** the player types specialties next to it, **Then** the
   free-text specialization (several separated by commas) is stored for that skill.
8. **Given** the player enters a value outside a trait's range (e.g. 6 dots), **When** the value is
   saved, **Then** the write is rejected, the sheet keeps showing the last valid value, and the
   rejection is reported to developer diagnostics.
9. **Given** any hunter sheet view, **When** it is displayed, **Then** the Dark Pack badge is
   visible in its bottom-left corner and links to the Dark Pack documentation page.

---

### User Story 2 - Brief hunter view for the table (Priority: P1)

During play, the player or GM switches a hunter to a compact view that shows at a glance what gets
rolled and tracked: name, concept, Creed, Drive, attributes, skills with dots, specialties, Edges
with Perks, Health, Willpower, Despair, and Desperation/Danger.

**Why this priority**: the table game is run from compact views; the full sheet is for building
and between-session edits.

**Independent Test**: open an existing hunter in the brief view, adjust Health and Willpower there,
switch back to the full view, and confirm the same values.

**Acceptance Scenarios**:

1. **Given** a filled hunter, **When** the brief view is selected, **Then** it shows the fields listed
   above and hides biography, notes, and experience.
2. **Given** the brief view, **When** the player marks damage or Willpower loss, **Then** the change
   is visible in the full view immediately.
3. **Given** a hunter in a documentation or read-only embed context that supports briefs, **When**
   it is rendered, **Then** it uses the same brief view and cannot be edited.

---

### User Story 3 - Export and import a hunter (Priority: P2)

A player exports their hunter to a file to send to the GM or move to another device, and the GM
imports it with the same validation as other documents.

**Why this priority**: players prepare characters on their own devices before the session; there
is no online sync yet.

**Independent Test**: export a filled hunter, delete it, import the file, and confirm an identical
sheet; import a tampered file with out-of-range dots and confirm it is not silently accepted.

**Acceptance Scenarios**:

1. **Given** a hunter, **When** it is exported, **Then** the file name follows the existing
   `ttgamer_` export convention and the file carries the Dark Pack notice.
2. **Given** an exported hunter file, **When** it is imported, **Then** the resulting sheet is
   identical to the original.
3. **Given** a file with an ID that already exists, **When** it is imported, **Then** the existing
   Replace / Duplicate / Cancel choice is offered.
4. **Given** a file whose hunter data fails validation, **When** it is imported, **Then** the user
   sees a clear error and the entry is kept in the recovery collection rather than dropped.

---

### User Story 4 - Re-skin the hunter sheet for a homebrew setting (Priority: P2)

The GM runs a homebrew fantasy game on the V5 hunter rules. They copy the shipped hunter template,
rename labels (e.g. Firearms → Archery, Technology → Alchemy, Creeds and Edges renamed), remove or
add sections, save it as a user template, export the template to a file, and share it with the
players, who import it and use it for their hunters.

**Why this priority**: the planned game is this homebrew setting, but it can start on the stock
template if the re-skin slips.

**Independent Test**: build a renamed copy of the hunter full template, apply it to a hunter,
export the template, import it on a clean profile, and confirm the hunter shows the renamed
labels while its stored values are unchanged.

**Acceptance Scenarios**:

1. **Given** the shipped hunter full or brief template, **When** the GM copies it in the template
   editor, **Then** every label, section, list of suggestions, and field placement can be changed
   with the existing template tools.
2. **Given** a re-skinned template applied to a hunter, **When** a renamed skill is edited, **Then**
   it writes the same underlying hunter value as the stock label, so switching back to the stock
   template shows the same dots.
3. **Given** a re-skinned template, **When** it is exported and imported elsewhere, **Then** it
   works for hunter documents there and still displays the Dark Pack badge.
4. **Given** the product release, **When** a user browses shipped templates, **Then** no homebrew
   fantasy template is included.

---

### User Story 5 - Ruleset ready for Vampire 5e (Priority: P3)

A contributor adding Vampire: the Masquerade 5e (T-039) reuses the V5 ruleset — attributes, skills
with specialties, Health and Willpower damage tracks, advantages and flaws, experience, the Dark
Pack policy — and only adds a Vampire module, without copying hunter code or adding
hunter/vampire conditionals to shared parts.

**Why this priority**: it shapes the structure but delivers no player value in this release.

**Independent Test**: a review walkthrough lists, for each part of the hunter sheet, whether it
belongs to the V5 ruleset or the Hunter module; every item VtM 5e also needs is on the ruleset side.

**Acceptance Scenarios**:

1. **Given** the delivered structure, **When** it is reviewed, **Then** attributes, skills,
   specialties, Health/Willpower tracks, advantages/flaws, experience, touchstones, biography, and
   the Dark Pack policy are owned by the V5 ruleset.
2. **Given** the delivered structure, **When** it is reviewed, **Then** Creed, Drive, Ambition,
   Desire, Redemption, Edges/Perks, Despair, Desperation, and Danger are owned by the Hunter module.
3. **Given** the existing Star Wars system, **When** this feature ships, **Then** its documents,
   templates, and behavior are unchanged.

---

### User Story 6 - Learn the game and build a first hunter from the docs (Priority: P2)

Two kinds of reader arrive at the Hunter documentation. Someone who knows tabletop games reads a
one-page quickstart, learns the core loop (build a pool, count successes, spend Willpower, take
damage) and has a playable hunter within the session prep. A complete newcomer who knows nothing
about the World of Darkness or tabletop roleplaying follows a guided path that explains what a
hunter is, walks through each creation decision with a running example character, and fills the
real sheet directly from the page as they read.

**Why this priority**: several players at the upcoming table have never played V5; the GM needs
something to hand them. The sheet (P1) is still usable without the docs.

**Independent Test**: give the newcomer path to a person who has never played a TTRPG; they finish
with a complete hunter on the sheet without asking the GM what any field means.

**Acceptance Scenarios**:

1. **Given** the documentation home, **When** a reader opens the Hunter section, **Then** its first
   page offers a clear choice between the quickstart, the newcomer path, and reference pages.
2. **Given** the quickstart, **When** it is read end to end, **Then** it covers the dice core loop,
   Health/Willpower/damage basics, Desperation and Despair at a glance, and fast hunter creation, and
   links to the deeper pages for each.
3. **Given** a newcomer path step, **When** it is read, **Then** it explains why the choice matters
   at the table, what to decide, shows the matching part of the reader's own sheet to fill in, and
   continues the running example.
4. **Given** a reader with no hunter document, **When** they open a step with an embedded sheet
   part, **Then** they are offered to create a hunter right there.
5. **Given** any Hunter documentation page, **When** it is shown in English or Russian, **Then** it
   exists in both languages; the Dark Pack statement (badge and text) appears only on the
   dedicated Dark Pack page.
6. **Given** any Hunter documentation page, **When** it is compared with the book, **Then** it
   contains no copied passages, tables, or art — only names and own-words explanations.

### Edge Cases

- **Derived track shrinks**: lowering Stamina or Composure/Resolve below the number of marked boxes
  keeps the marks recorded; the track shows the overflow as full rather than silently deleting damage.
- **Health/Willpower modifiers**: advantages or Edges that change track size are applied manually
  through the track's −/+ regulator, since rules automation is out of scope.
- **Cell values on a single character**: Desperation and Danger belong to the cell, but there is no
  cell document yet; each hunter stores its own copy (0–5), and players keep them in sync by hand.
- **Edge without Perks / Perk without a listed Edge**: both are allowed; custom names are accepted.
- **Automatic specialties**: Academics, Craft, Performance, and Science are not forced to have a
  specialty; the sheet does not enforce creation rules.
- **Over-budget characters**: point spreads (attributes 4/3/3/3/2/2/2/2/1, skill spreads, 7
  advantage / 2 flaw points, Edge/Perk picks) are not enforced; experienced hunters legitimately
  exceed them.
- **User template for a different kind**: applying an exported hunter template to a Star Wars
  document is refused with a clear message, as for other kind mismatches.
- **Example dice rolls in docs**: V5 successes, critical pairs, and Desperation dice are counted by
  hand until T-045; docs examples show fixed rolls and explain the count in words.
- **Unknown future modules**: a document naming a module or definition not present in this version
  is kept in recovery, not dropped.

## Requirements _(mandatory)_

### Functional Requirements

#### Ruleset, module, and setting layering

- **FR-001**: The system MUST provide a V5 ruleset that owns the mechanics shared by V5 lines: nine
  attributes (Strength, Dexterity, Stamina; Charisma, Manipulation, Composure; Intelligence, Wits,
  Resolve), 27 skills in three columns, skill specialties, Health (Stamina + 3) and Willpower
  (Composure + Resolve) tracks with superficial and aggravated damage, advantages and flaws with
  dots, touchstones, experience (total and spent), equipment, notes, and biography.
- **FR-002**: The system MUST provide a Hunter module on top of the V5 ruleset that owns Concept,
  Creed, Drive, Ambition, Desire, Redemption, Edges and Perks, Despair, Desperation, and Danger.
- **FR-003**: A hunter document MUST name its ruleset and its single supernatural module; adding a
  second V5 module (Vampire) MUST NOT require changes to the ruleset's shared parts or to other
  systems.
- **FR-004**: The ruleset and module MUST declare the Dark Pack policy as metadata, and the notice
  shown in the UI and in exports MUST be derived from that metadata.
- **FR-005**: The existing Star Wars WoD system MUST keep working unchanged; its migration to the
  layered model is out of scope (T-041).

#### Hunter sheet

- **FR-006**: Users MUST be able to create a blank hunter document from the existing create flow.
- **FR-007**: Attributes MUST accept 1–5 dots and skills 0–5 dots; each skill MUST hold a free-text
  specialization (several specialties separated by commas).
- **FR-008**: Health and Willpower track lengths MUST be derived from the current attributes plus an
  per-track adjustment set with the track's −/+ regulator, bounded to a maximum of 15 boxes, and
  MUST update when those change.
- **FR-009**: Creed (5 options) and Drive (7 options) MUST offer the book names as suggestions while
  accepting custom text.
- **FR-010**: Users MUST be able to add, edit, reorder, and remove Edges; each Edge MUST offer the 12
  book Edges (grouped by category) as suggestions and accept custom names. Perks MUST be a separate
  reorderable table whose rows name the Perk and its Edge, suggesting the book Perks (picking one
  fills its Edge) and accepting custom names.
- **FR-011**: Advantages and flaws MUST be editable rows with a name, 1–5 dots, and an
  advantage/flaw kind; touchstones MUST be editable entries with a name and a conviction text.
- **FR-012**: Despair MUST be a toggle; Desperation and Danger MUST each accept 0–5.
- **FR-012a** (added 2026-09-15): Hunter sheets MUST reuse the existing WoD sheet elements — dot
  rows for traits and ratings, the condition track for Health and Willpower (clicking a box cycles
  Superficial ╱ → Aggravated ×), the trait row's specialization text — extended only by optional,
  system-neutral features (unlabeled strip layout, length regulator, trait row options, row
  reordering). No hunter-only visual elements.
- **FR-013**: Header fields (Name, Concept, Ambition, Desire, Redemption), Chronicle Tenets, Creed
  Fields, notes, and biography (age, date of birth, appearance, distinguishing features,
  history) MUST be editable free text.
- **FR-014**: The hunter definition MUST register a full view and a brief view, both shipped as
  templates editable through the existing template system.
- **FR-014a** (revised 2026-09-15): The full view MUST be laid out for the screen, not in the printed
  sheet's order: every section gathers at least two related field groups (Hunter: portrait,
  identity, collapsed biography; Condition: Health, Willpower, the cell; Attributes; Skills; Edges
  and Perks; Aims and Convictions; Advantages and Flaws; Equipment: weapons and inventory item
  cards; Experience and Notes). Rarely edited groups collapse. The brief view has no sections, only
  compact groups. The portrait, weapons, and inventory reuse the existing portrait and equipment
  elements.
- **FR-014b** (added 2026-09-15): Document lists MUST show a setting-neutral type ("Character")
  and the setting separately (a module's name, e.g. "Hunter: the Reckoning 5e", otherwise the
  system's name); the create dialog groups types by setting.
- **FR-015**: All hunter data MUST be validated with range and type limits on every write, import,
  and load; invalid entries MUST follow the existing recovery and diagnostics behavior.
- **FR-016**: The sheet MUST NOT enforce character-creation budgets or roll dice automatically.
- **FR-017**: Book-derived names MAY be shown; any explanatory text for Creeds, Drives, Edges, or
  Perks MUST be the project's own brief wording.

#### Export, templates, and notices

- **FR-018**: Hunter documents MUST export and import through the existing document file flow,
  including the collision choice, and exported files MUST include the Dark Pack notice.
- **FR-019**: User templates derived from hunter templates MUST be exportable to and importable from
  a file, and MUST keep binding to the same hunter values regardless of relabelling.
- **FR-020**: The Dark Pack badge MUST appear, small and in the bottom-left corner, on every hunter
  full and brief view (including user-template views of hunter documents), outside the template
  tree, and link to the Dark Pack documentation page; the notice text MUST NOT be shown on sheets.
  Views of documents that use no Dark Pack material MUST show no badge.
- **FR-021**: No homebrew or fantasy template MUST be shipped with the product.
- **FR-022**: All new UI strings (labels, suggestions, notice, view names) MUST exist in English and
  Russian; the Dark Pack notice MAY stay in its required English wording with a Russian explanation.

#### Documentation

- **FR-023**: The documentation MUST include a Hunter: the Reckoning 5e section with an entry page
  that routes readers to a quickstart, a newcomer creation path, and reference pages.
- **FR-024**: The quickstart MUST let a reader who knows tabletop games play a first scene: core dice
  loop, damage and Willpower, Desperation/Danger/Despair in brief, and fast hunter creation.
- **FR-025**: The newcomer path MUST assume no prior tabletop or World of Darkness knowledge, cover
  every creation step from the book's creation order, follow one running example hunter, and embed
  the matching part of the reader's own sheet on each step.
- **FR-026**: Mechanics that V5 lines share (dice pools, attributes and skills, damage and
  Willpower) MUST be documented once in a place a future Vampire 5e section can link to.
- **FR-027**: Every Hunter documentation page MUST exist in English and Russian and be written in the
  project's own words. A single dedicated page (`docs/v5/dark-pack`, both languages) MUST carry the
  full Dark Pack statement: badge, verbatim notice, explanation, and policy link. No other
  documentation page carries the badge or the notice.

### Key Entities _(include if feature involves data)_

- **Ruleset (V5)**: a mechanics layer shared by V5 lines — trait lists and ranges, damage tracks and
  their derivation, advantages/flaws, experience, and publisher policy metadata.
- **Module (Hunter)**: a supernatural layer bound to one ruleset — hunter-specific fields, suggestion
  lists (Creeds, Drives, Edges with Perks), its own policy metadata, and its views.
- **Setting**: flavor and catalogs. This feature ships no named setting beyond the book default; a
  homebrew setting is expressed as a user template.
- **Hunter document**: a persisted character naming ruleset and module, holding ruleset values and
  hunter values; exported and imported as a file.
- **Hunter view template**: shipped full and brief templates; user copies re-label and re-arrange
  them without changing the document's stored values.
- **Publisher policy notice**: machine-readable policy (Dark Pack) attached to ruleset/module (badge, notice
  text, docs page), from which the sheet badge, the docs statement, and export notices are derived.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A player familiar with the printed sheet can enter a complete starting hunter from a
  filled paper sheet in under 15 minutes without outside help.
- **SC-002**: 100% of fields on the printed H:tR 5e sheet (pp. 282–283) have a place in the full view.
- **SC-003**: During a session, marking damage, spending Willpower, or toggling Despair takes one
  interaction in the brief view.
- **SC-004**: An exported hunter re-imported on another device is identical in 100% of fields.
- **SC-005**: A GM can produce and export a re-labelled hunter template (at least 10 renamed labels)
  in under 30 minutes using only the template editor.
- **SC-006**: The Dark Pack badge is present on 100% of hunter views, the notice text on 100% of hunter
  exports and on exactly one documentation page per locale, and neither appears on views of
  documents whose system declares no Dark Pack policy. (Whether the Star Wars WoD conversion declares one is decided by T-037, not here.)
- **SC-007**: 100% of existing Star Wars documents and templates load and behave as before this
  feature.
- **SC-009**: A reader with no tabletop experience completes a hunter by following the newcomer
  path in under 60 minutes.
- **SC-010**: 100% of Hunter documentation pages have a Russian counterpart, including the Dark Pack
  page.
- **SC-008**: The feature is usable at the table by 2026-09-29 (within two weeks of 2026-09-15).

## Assumptions

- Only the player character is in scope; NPCs, creatures, and cells as documents come in T-040.
- V5 dice pools are counted manually; no dice-panel handoff specific to V5 is added (T-045).
- Documentation covers play basics and character creation only; full rules chapters (combat detail,
  hunts, GM advice, bestiary) are not added. Personas are out of scope (T-044).
- The documentation may use its own page format, looser than the Star Wars section; if it works
  well, the Star Wars docs may later be reworked to match (not part of this feature).
- Desperation and Danger are stored per hunter until a cell or campaign document exists.
- Specialties are stored per skill even though the printed sheet has no slot for them, because
  the book grants them and the digital sheet can hold them.
- Health and Willpower adjustments are manual (−/+); no Advantage or Edge effect is automated, and
  damage marks (including upgrading Superficial to Aggravated on a full track) are placed by the
  player.
- Creation-point validation belongs to the `character-creation-flow` roadmap path, not this feature.
- Existing template, export/import, recovery, diagnostics, and translation mechanisms are reused;
  the template editor is capable of relabelling and restructuring as delivered in specs 003–007.
- The hunter is the first system on the layered ruleset/module model; the model is kept minimal —
  just enough for VtM 5e (T-039) to sit beside it.
