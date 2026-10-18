# Feature Specification: V5 Storyteller Characters and Groups

**Branch**: `040-v5-npc-entities` | **Created**: 2026-10-18 | **Status**: Draft

**Input**: "Spec 040 — T-040, V5 non-player entities. Storytellers of Hunter: the Reckoning 5e and
Vampire: the Masquerade 5e track the people and things their players meet as documents instead of
free-form notes: mortal NPCs and retainers, other vampires and hunters met as antagonists,
supernatural creatures, and groups (a coterie's rivals, a hunter cell, a cult, a corporation) — each
with a compact sheet sized for play (V5 rules for secondary characters: a few dice pools instead of
full attributes and skills, health and willpower, a short list of powers or edges), a brief view for
the table, and examples in the docs. Covers which kinds ship (and which are templates over existing
kinds), how they appear in the create dialog and library, rolling their pools with
Hunger/Desperation where relevant, linking an NPC to its group, and the Star Wars
creature/vehicle/fodder documents as precedent. Branch from testing after v3.30.0."

## Context

The V5 lines ship player sheets only: the mortal, the hunter, and the vampire (T-038, T-039). A
Storyteller who runs them keeps the detective, the ghoul bodyguard, the werewolf in the woods, and
the cult behind the murders in free text, rolls their dice by hand, and tracks their damage on
paper. The V5 rules describe such characters in a short form: three standard pools (Physical,
Social, Mental), Health and Willpower, a few exceptional pools for what the character is good at,
and special notes; the simplest foes are only a difficulty ("a thug of difficulty 3"). Vampires met
as antagonists keep full Attributes and Skills because their Disciplines need them. The Star Wars
setting already ships compact documents for the same need (creatures, vehicles, fodder groups).
Backlog: T-040.

## Clarifications

### Session 2026-10-18

- Q: Do antagonist vampires and hunters need their own compact page, or is their brief enough? → A:
  The brief is enough; only a switch to stop tracking Hunger and Willpower is added (plus an example
  antagonist in the docs).
- Q: Where do the two new kinds appear in the create dialog and the library? → A: Once, under the V5
  rules beside the mortal (and in every user setting on V5), not copied into Hunter and Vampire.
- Q: Are exceptional pools and powers typed freely or chosen from catalogs? → A: Suggestions from
  the V5 catalogs (skills for pools; Disciplines and hunter Edges for powers) in the reader's
  language, with any text of one's own allowed.

## User Scenarios & Testing

### User Story 1 - A Storyteller character on one compact sheet (Priority: P1)

A Storyteller creates a **Storyteller character** for V5 (a police detective, a ghoul retainer, a
pack of dogs, a creature of the night), names it, sets its standard pools, Health, and Willpower,
lists a few exceptional pools ("Firearms 6"), a Discipline or two for a ghoul, and notes on what it
can do. The sheet fits beside a player's sheet, and its brief fits a narrow pane.

**Why this priority**: most characters the players meet are of this kind; it is the core of T-040.

**Independent Test**: Create a Storyteller character "Detective Ruiz" with Physical 3, Social 5,
Mental 4, Health 5, Willpower 5, and exceptional pools Investigation 7 and Firearms 5; open its
brief beside a vampire sheet at 400 px; everything is readable without sideways scrolling.

**Acceptance Scenarios**:

1. **Given** the create dialog, **When** the Storyteller searches "storyteller" or «рассказчик»,
   **Then** the Storyteller character of the V5 rules is offered, together with the group kind.
2. **Given** a new Storyteller character, **When** it opens, **Then** it shows a name, a concept, a
   type (mortal, ghoul, animal, supernatural, other), the three standard pools, Health and Willpower
   trackers, an empty list of exceptional pools, Disciplines or powers, and notes.
3. **Given** a character marked as a simple foe with difficulty 3, **When** the brief shows,
   **Then** it shows the difficulty prominently and offers a roll of twice that difficulty, as the
   rules suggest for rolling a simple foe.
4. **Given** damage taken, **When** the Storyteller marks Health, **Then** superficial and
   aggravated damage are tracked as on player sheets.

---

### User Story 2 - Roll an NPC's pools from its sheet (Priority: P1)

The Storyteller clicks a standard or exceptional pool and the dice panel rolls it with V5 dice,
naming the character; a modifier can be added before the roll. Willpower rerolls work as on player
sheets.

**Why this priority**: rolling by hand is what the Storyteller wants to stop doing; without rolls
the sheet is only a note.

**Independent Test**: On "Detective Ruiz", click Firearms 5; the dice panel rolls five V5 dice and
the result names Detective Ruiz.

**Acceptance Scenarios**:

1. **Given** a Storyteller character, **When** its Physical pool or an exceptional pool is clicked,
   **Then** the dice panel rolls that many V5 dice and names the character, as rolls from player
   sheets do.
2. **Given** a Storyteller character, **When** any pool is rolled, **Then** no Hunger or Desperation
   dice are added: those belong to vampire and hunter sheets only.

---

### User Story 3 - Groups and who belongs to them (Priority: P2)

The Storyteller creates a **Group** (a coterie of rivals, a hunter cell, a cult, a company, a gang)
with its kind, a description, its goals, its resources and holdings, the threat it poses, and its
members. Members are documents (Storyteller characters, vampires, hunters, mortals) linked from the
group; a character's sheet shows which groups name it, and opening the link opens the member.

**Why this priority**: groups tie the characters into a chronicle, but each character is useful
without one.

**Independent Test**: Create a group "Church of the Red Dawn", link two Storyteller characters and
one vampire as members; each member's brief shows "Church of the Red Dawn", and following the link
from the group opens the member.

**Acceptance Scenarios**:

1. **Given** a group, **When** the Storyteller adds a member, **Then** they choose from the V5
   documents (any kind) and the member is listed with its kind and a link.
2. **Given** a member document deleted, **When** the group opens, **Then** the member row says the
   document is gone instead of failing, and can be removed.
3. **Given** a character named by two groups, **When** its sheet opens, **Then** both groups are
   listed as links.

---

### User Story 4 - Vampires and hunters met as antagonists (Priority: P2)

Antagonist vampires and hunters use the existing vampire and hunter kinds, because the rules give
them full Attributes, Skills, and powers; their existing brief is the Storyteller's compact view and
rolls with Hunger or Desperation as it does today. A per-document switch lets the Storyteller stop
tracking Hunger and Willpower on an antagonist, as the rules allow for less bookkeeping, and the
docs show an example antagonist vampire.

**Why this priority**: important for vampire chronicles, but the sheets already work for antagonists
today; this story makes them lighter to run.

**Independent Test**: Create a vampire "The Sheriff", open its brief, switch Hunger and Willpower
tracking off; the trackers disappear from both pages and its pools roll without Hunger dice.

**Acceptance Scenarios**:

1. **Given** a vampire with tracking switched off, **When** a pool is rolled, **Then** no Hunger
   dice are added and no Rouse or Willpower track is shown.
2. **Given** a hunter with tracking switched off, **When** the sheet shows, **Then** the Willpower
   track is hidden; Desperation is unaffected.
3. **Given** tracking switched on again, **When** the sheet shows, **Then** the stored Hunger and
   Willpower values return unchanged.

---

### User Story 5 - Examples and documentation for Storytellers (Priority: P3)

The V5 documentation gets a Storyteller section in English and Russian: how to build a Storyteller
character and a group, when to use a simple difficulty instead of a sheet, and examples written in
the project's own words — a mortal, a ghoul retainer, an animal, a supernatural creature, and a
group with members — each shown on the page and creatable from it (the copy buttons of spec 039).
The same examples are offered by the create dialog.

**Why this priority**: examples teach the format, but the kinds work without them.

**Independent Test**: On the Storyteller page, copy the example group; the group and its member
examples are created and linked to each other.

**Acceptance Scenarios**:

1. **Given** the create dialog with the Storyteller character chosen, **When** the start choice
   shows, **Then** the example characters are offered.
2. **Given** the example group copied from the docs, **When** it opens, **Then** its members link to
   copies created with it, not to the shipped examples.

### Edge Cases

- A pool above the allowed maximum (by default 15 dice) or below zero is clamped on entry, as player
  sheet values are.
- A simple foe can still have exceptional pools; its difficulty and its pools are separate values.
- A group that names itself or a group as a member is allowed (a sect containing a coterie), but a
  group never lists itself twice.
- A user setting on the V5 rules gets both new kinds, as it gets the mortal today.

## Requirements

### Functional Requirements

- **FR-001**: The V5 rules MUST ship a **Storyteller character** kind with name, concept, type
  (mortal, ghoul, animal, supernatural, other), the three standard pools, Health and Willpower
  trackers with superficial and aggravated damage, a list of exceptional pools (a name and a dice
  count), a list of Disciplines or powers with dots, special notes, and an optional simple-foe
  difficulty.
- **FR-002**: The V5 rules MUST ship a **Group** kind with name, kind of group, description, goals,
  resources and holdings, threat, notes, and a list of members that link to V5 documents.
- **FR-003**: Both kinds MUST have a full page and a brief page, editable in the template editor
  like every shipped page.
- **FR-004**: Clicking a standard or exceptional pool MUST roll that many V5 dice through the dice
  panel, naming the document; the simple-foe difficulty MUST offer a roll of twice the difficulty.
  No impairment penalty is applied automatically (player sheets apply none either).
- **FR-005**: Storyteller characters MUST NOT add Hunger or Desperation dice; vampire and hunter
  documents keep them on every page.
- **FR-006**: A document's sheet MUST list the groups that name it as members, as links; a missing
  member MUST show as gone and be removable.
- **FR-007**: Vampire and hunter documents MUST have a switch that stops tracking Hunger (vampires)
  and Willpower on that document: the trackers hide on every page, vampire rolls add no Hunger dice,
  and switching it back restores the stored values. No new page is added for antagonists.
- **FR-008**: The new kinds MUST appear once in the create dialog and the library, under the V5
  rules beside the mortal and in every user setting on V5 (not copied into the Hunter and Vampire
  lines), and be found by search in English and Russian.
- **FR-009**: Each new kind MUST ship examples (FR-012) that the create dialog offers and the
  documentation copy buttons create; copying a group example MUST copy its member examples and link
  the copies.
- **FR-010**: Imported and exported documents of the new kinds MUST pass validation like every
  document; values out of range MUST be clamped or reported, never silently dropped.
- **FR-011**: All new interface text MUST exist in English and Russian, and the Storyteller
  documentation MUST have Russian mirrors.
- **FR-012**: Example characters and groups MUST be written in the project's own words; no stat
  block or text from a published book is copied (constitution VIII).
- **FR-013**: The V5 publisher notice badge MUST show on the new kinds' sheets as on the other V5
  sheets, and nowhere else new.
- **FR-014**: Exceptional pool names MUST suggest the V5 skills and power names MUST suggest the
  Disciplines and hunter Edges, in the reader's language; any text of the Storyteller's own MUST be
  accepted and kept as typed.

### Key Entities

- **Storyteller character**: a V5 document for a secondary character: standard pools, Health,
  Willpower, exceptional pools, powers, notes, optional simple-foe difficulty.
- **Group**: a V5 document for an organization: description fields and member links.
- **Member link**: a reference from a group to another V5 document; read back on the member's sheet.
- **Tracking switch**: a per-document setting on vampire and hunter documents; on by default.

## Success Criteria

- **SC-001**: A Storyteller creates a named Storyteller character with three pools, Health,
  Willpower, and two exceptional pools in under two minutes on the first try.
- **SC-002**: Every pool of a Storyteller character rolls with one click and names the character in
  the result.
- **SC-003**: The brief of each new kind fits a 400 px pane and a 360 px phone without sideways
  scrolling.
- **SC-004**: A group with 30 members opens and lists them in under 200 ms on the reference laptop.
- **SC-005**: The sheet page's bundle grows by at most 10 KB gzip.

## Assumptions

- **Kinds**: two new kinds on the V5 rules (not per line), so both Hunter and Vampire chronicles and
  user settings use them; antagonist vampires and hunters stay their existing kinds and use their
  existing brief, so a player character can become an antagonist and back.
- **Creatures**: animals and supernatural creatures (werewolves, ghosts, fae) are Storyteller
  characters of type "animal" or "supernatural"; there are no per-creature kinds or rules for other
  WoD lines.
- **No crowd document**: a mob of identical mooks is one Storyteller character with a note on its
  number; a crowd document like the Star Wars fodder group (several identical foes, each with its
  own Health) is out of scope and may become its own backlog task (maintainer, 2026-10-18).
- **Groups have no dice**: the rules give organizations no stats; group threat is a short text or a
  1–5 rating for the Storyteller's reference, not rolled.
- **Member direction**: members are stored on the group; the member's sheet only reads them back, so
  a character never stores its groups.
- **Hidden information**: Storyteller documents live on the Storyteller's device like any document;
  hiding them from players needs the multiplayer work of T-044 and is out of scope.
- **Source material**: the VtM 5e core rulebook (Storyteller characters and simple antagonists) and
  the H:tR 5e core rulebook; paraphrased, under the Dark Pack policy the V5 lines already follow.
- **Catalogs of published NPCs** are out of scope; only own-words examples ship.
