# Feature Specification: Vampire: the Masquerade 5e Player Character

**Branch**: `037-vampire-character` | **Created**: 2026-10-16 | **Status**: Draft

**Input**: "T-039 — Vampire: the Masquerade 5e player character: players maintain VtM 5e vampire
sheets on the shared V5 ruleset, adding only the Vampire module (clan, disciplines, Blood Potency,
Hunger, Humanity, predator type, and the rest of a V5 vampire), with the Hunger dice already in the
dice roller finally used by a sheet."

## Context

Players can keep Hunter: the Reckoning 5e characters and plain V5 mortals, but not vampires, the
most played V5 line. The V5 ruleset already owns everything the lines share (attributes, skills,
Health and Willpower, advantages and flaws, touchstones, experience, equipment), and the dice roller
already reads Hunger dice (messy criticals, bestial failures) — but no sheet rolls them, so a
vampire player adds Hunger dice by hand in the dice panel. This feature adds the Vampire module
beside Hunter, in the same layering (TODO.md T-039, roadmap path `multi-system-sheets`).

## Source Material and Policy (Constitution VIII)

- **Sources** (`context/corebooks/wod/`, added 2026-10-16): the VtM 5e core rulebook (English, with
  an abridged Russian translation and the free Russian supplement for Ravnos, Salubri, and
  Tzimisce), the Players Guide (the clans outside the core, clan bane variants, every discipline
  power including Oblivion, the additional predator types), and Cults of the Blood Gods (Hecata,
  Oblivion ceremonies, Blood Sorcery rituals); the official English and Russian character sheets for
  a glance only. The sheet is designed from what the digital version can do (automatic Hunger dice,
  Rouse checks, derived Blood Potency effects, power pickers), not from the paper layout. The design
  cites pages; trait lists are checked against these books. Fan books in the folder are not sources.
- **Policy**: Paradox Interactive Dark Pack, as for Hunter: the Vampire module declares it; its
  sheets show the Dark Pack badge once per surface, exports carry the notice, and the full statement
  stays on the existing Dark Pack page, which then also lists vampire sheets.
- Names of clans, disciplines, powers, predator types, and other traits are used as names; any
  description is a short summary in the project's own words. No rules prose or tables are copied.

## Clarifications

### Session 2026-10-17

- Q: What does the sheet do when the player picks a predator type? → A: It shows what the type
  grants (a short summary) and changes nothing on the sheet; the player marks the dots. Applying
  grants belongs to guided creation (T-053).
- Q: Where do Blood Sorcery rituals, Oblivion ceremonies, and thin-blood alchemy formulas live? → A:
  In one separate list (name from the catalog or typed, level, note), shown only when the vampire
  has Blood Sorcery, Oblivion, or Thin-Blood Alchemy; they are not discipline powers.
- Q: Does the sheet offer the clan bane variants of the Players Guide? → A: Yes: the player switches
  between the clan's usual and variant bane; the clan catalog keeps both.
- Q: How smart is the Rouse check? → A: A general Rouse button by Hunger, plus a button on each
  catalog power that makes as many checks as the power costs and applies the Blood Potency re-roll
  when the power's level allows it.

## User Scenarios & Testing

### User Story 1 - Create and keep a vampire (Priority: P1)

A player picks **Vampire: the Masquerade 5e → Character** in the create dialog and fills in a sheet
laid out like the hunter's: identity (name, concept, chronicle, sire, clan, generation, predator
type, ambition, desire), the shared V5 traits, and the vampire's own: Hunger, Humanity with stains,
Blood Potency, disciplines with their dots and powers, the clan's bane and compulsion, and
convictions with their touchstones. Every change is saved on the device; the document exports and
imports like any other.

**Why this priority**: without the sheet nothing else in this feature has a place to live; it is
enough on its own to run a vampire at the table.

**Independent Test**: create a vampire, fill every section, reload, export, import on a clean
profile; every value comes back.

**Acceptance Scenarios**:

1. **Given** the create dialog, **When** the player chooses the vampire character, **Then** a new
   vampire opens on its full sheet with the defaults of a new fledgling (Hunger 1, Humanity 7, Blood
   Potency 1, no disciplines).
2. **Given** a vampire with a clan chosen, **When** the player opens the bane and compulsion fields,
   **Then** they show that clan's bane and compulsion in the project's own words, the player can
   switch to the clan's variant bane, and can replace either text with their own.
3. **Given** a vampire, **When** the player adds a discipline and marks 3 dots, **Then** new powers
   for it are offered from that discipline's powers of level 3 or lower (or typed freely), and a
   power of a higher level stays on the sheet, marked.
4. **Given** Humanity 7 with 2 stains, **When** the player marks a third stain, **Then** the track
   shows 7 filled, 3 stained, and no box both filled and stained.
5. **Given** a vampire document exported to a file, **When** it is imported elsewhere, **Then**
   every value matches and the file carries the Dark Pack notice.

---

### User Story 2 - Roll with Hunger (Priority: P1)

The player clicks a trait on the sheet and the pool is built with as many Hunger dice as the
vampire's current Hunger, replacing regular dice, so messy criticals and bestial failures are read
without counting by hand.

**Why this priority**: this is what makes the sheet usable during play; the dice reading already
exists and only needs the sheet to feed it.

**Independent Test**: set Hunger to 2, roll a pool of 5 from the sheet; the roll has 3 regular and 2
Hunger dice, and a 10 on a Hunger die in a critical is named a messy critical.

**Acceptance Scenarios**:

1. **Given** Hunger 2 and a pool of 5, **When** the player rolls from the sheet, **Then** the roll
   has 3 regular dice and 2 Hunger dice, drawn in the Hunger colour and listed apart in the history.
2. **Given** Hunger 4 and a pool of 3, **When** the player rolls, **Then** all 3 dice are Hunger
   dice (Hunger never adds dice beyond the pool).
3. **Given** Hunger 0, **When** the player rolls, **Then** the roll has no Hunger dice.
4. **Given** a shared roll from a vampire sheet, **When** it is posted to a chat, **Then** the post
   names the character and the Hunger reading as for any V5 roll.

---

### User Story 3 - Rouse checks and Blood Potency at a glance (Priority: P2)

During play the player spends blood: a **Rouse check** on the sheet rolls one die and, on a failure,
raises Hunger by one (never past 5) with a short message. A power from the catalog has its own
button that pays its cost in Rouse checks, re-rolling where Blood Potency allows. Blood Potency
shows what it gives the vampire now — blood surge, mend amount, power bonus, re-rolls of Rouse
checks, bane severity, and feeding penalty — so the player does not look it up.

**Why this priority**: frequent table actions, but the sheet is playable without them.

**Independent Test**: at Hunger 3, run Rouse checks until one fails; Hunger becomes 4 and the
message says so. Change Blood Potency from 1 to 3; the shown effects change accordingly.

**Acceptance Scenarios**:

1. **Given** Hunger 4, **When** a Rouse check fails, **Then** Hunger becomes 5 and the message says
   Hunger is now at its maximum.
2. **Given** Hunger 5, **When** the player starts a Rouse check, **Then** the sheet warns that a
   failure cannot raise Hunger further and still rolls.
3. **Given** Blood Potency 2 and a level 1 power that costs one Rouse check, **When** the check
   fails, **Then** it is re-rolled once and Hunger rises only if the re-roll fails too.
4. **Given** Blood Potency 2, **When** the player reads its effects, **Then** they match the V5
   rules for that level, and changing Blood Potency updates them at once.

---

### User Story 4 - A brief for play and for the layout (Priority: P2)

The vampire has a brief like every shipped type: name, clan, generation, predator type, Hunger,
Humanity, Blood Potency, Health, Willpower, attributes, skills, and disciplines with their dots,
fitting a phone screen and a narrow pane of the layout.

**Independent Test**: open a filled vampire beside another document in its brief; it fits the pane
width without horizontal scrolling and within the height limits of the other shipped briefs.

**Acceptance Scenarios**:

1. **Given** a filled vampire, **When** it is opened beside another document, **Then** it opens in
   its brief, and a trait's die there rolls with Hunger as on the full sheet.

---

### User Story 5 - Library, editor, and catalogs (Priority: P3)

The library lists **Vampire: the Masquerade 5e** as a shipped setting on the V5 rules with the
vampire character and its pages; the player can copy and change those pages in the template editor,
and the editor previews them on an example vampire. Catalogs of clans, disciplines and their powers,
and predator types appear in the library, read-only, each with a short summary in the reader's
language.

**Independent Test**: copy the shipped vampire page, move the Hunger block, save; a vampire opened
on the copy keeps every value and still rolls with Hunger.

### Edge Cases

- **Thin-blooded**: a vampire of the 14th–16th generation is thin-blooded: Blood Potency 0 is
  allowed only then; clan, bane, and compulsion may be empty; thin-blood alchemy counts as a
  discipline. A higher generation may not drop Blood Potency below 1.
- **Generation and Blood Potency**: Blood Potency above the generation's maximum is kept but marked,
  not clamped, since the Storyteller may allow it.
- **Clan changed after creation**: the bane and compulsion follow the new clan only if the player
  had not replaced them with their own text.
- **Powers above the discipline's dots**: kept and marked, because experience is often spent before
  dots are marked.
- **A hunter rolled while a vampire is the shown document**: each sheet's rolls use its own line
  (Desperation for hunters, Hunger for vampires); the dice panel follows the document rolled from.

## Requirements

### Functional Requirements

- **FR-001**: The V5 ruleset MUST gain a Vampire module beside Hunter that adds only
  vampire-specific data; shared traits MUST come from the ruleset unchanged.
- **FR-002**: Players MUST be able to create a vampire character from the create dialog, under a
  shipped setting named for VtM 5e, with fledgling defaults (Hunger 1, Humanity 7, Blood Potency 1).
- **FR-003**: The sheet MUST hold clan, generation, sire, predator type, Hunger (0–5), Humanity
  (0–10) with stains, Blood Potency (0–10), disciplines (dots 0–5, powers with level and name),
  bane, compulsion, convictions with touchstones, and every shared V5 section.
- **FR-004**: Clan, discipline, power, and predator-type fields MUST offer the catalog names and
  accept free text; a power field MUST offer only the powers of its discipline at or below that
  discipline's dots.
- **FR-004a**: Catalogs MUST cover every clan (with usual bane, variant bane, and compulsion),
  discipline, discipline power (with its discipline and level), ritual, ceremony, formula, and
  predator type of the source, each with a short summary in the project's own words in English and
  Russian.
- **FR-004b**: The sheet MUST keep rituals, ceremonies, and formulas in one list (name, level, note)
  apart from discipline powers, with no limit tied to discipline dots, shown when the vampire has
  Blood Sorcery, Oblivion, or Thin-Blood Alchemy dots; names come from the catalog for the matching
  discipline at or below its dots, or are typed.
- **FR-005**: Choosing a clan MUST fill bane and compulsion with that clan's summaries unless the
  player has written their own. A switch MUST choose between the clan's usual and variant bane;
  switching replaces only text the player has not written.
- **FR-005a**: Choosing a predator type MUST show what it grants (specialty, discipline dot,
  advantages and flaws, Humanity change) as a summary and MUST NOT change any other value.
- **FR-006**: Sheet rolls MUST replace regular dice with Hunger dice up to the current Hunger and
  the pool size, and MUST read their outcomes with the existing Hunger line.
- **FR-007**: A Rouse check MUST roll one die (6 or more passes) and raise Hunger by one on a
  failure, never past 5, reporting the result. The sheet MUST offer it by Hunger and on each power
  whose catalog entry has a cost: that button makes as many checks as the cost and re-rolls a failed
  check once when Blood Potency allows a re-roll for the power's level. Powers typed by the player
  have no cost button.
- **FR-008**: The sheet MUST show the effects of the current Blood Potency, derived from it, not
  typed by the player.
- **FR-009**: Values outside the usual limits (Blood Potency above the generation's maximum, powers
  above the discipline's dots, Blood Potency 0 outside thin-bloods) MUST be kept and marked.
- **FR-010**: The vampire MUST have a full sheet and a brief, both shipped pages the template editor
  can copy and change, and an example vampire for previews.
- **FR-011**: Vampire sheets MUST show the Dark Pack badge once per surface and exports MUST carry
  the notice; the Dark Pack page MUST list vampire sheets.
- **FR-012**: Every new label, message, catalog name, and summary MUST exist in English and Russian,
  with Russian terms checked against the glossary.
- **FR-013**: Existing hunters, mortals, and their pages MUST keep working unchanged.

### Key Entities

- **Vampire**: a V5 character with the Vampire module's data.
- **Discipline entry**: a discipline name, its dots, and its chosen powers (level, name).
- **Ritual entry**: a ritual, ceremony, or formula (name, level, note), apart from discipline
  powers.
- **Clan, discipline, power, predator type**: read-only catalog entries with names and summaries.

## Success Criteria

- **SC-001**: A player creates a playable fledgling vampire (clan, predator type, attributes,
  skills, two disciplines with powers) in under 10 minutes without leaving the sheet.
- **SC-002**: 100% of sheet rolls of a vampire carry the right number of Hunger dice for the current
  Hunger and pool size.
- **SC-003**: Every vampire value survives export and import with no difference.
- **SC-004**: The vampire brief fits a 375 px phone and a 400 px pane without horizontal scrolling.
- **SC-005**: No existing hunter or mortal document, page, or export changes.

## Assumptions

- Documentation for VtM 5e (rules pages, quick start, guided creation) is a separate task under
  roadmap path `core-book-docs` (clarified 2026-10-16); this feature only adds vampire sheets to the
  Dark Pack page and mentions the vampire in the site guide where the guide lists document kinds.
- Catalogs are complete, with summaries (clarified 2026-10-16): every power of the core rulebook is
  listed; powers from supplements are typed by the player unless the supplement is added too.
- Coteries, havens, and other group documents are out of scope (T-040 for NPCs and organizations).
- Remorse checks, frenzy, feeding and resonance tracking, and blood bonds are recorded as notes or
  free text, not automated.
- Experience costs are not calculated (shared V5 behavior).
- Blood Potency effects are shown as values computed from the rules, not as a copy of the book's
  table (Constitution VIII).
- Hunger in pools follows the core rule only: no option for house rules that change it.
