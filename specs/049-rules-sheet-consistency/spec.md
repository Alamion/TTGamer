# Feature Specification: Rules and sheet consistency

**Branch**: `049-rules-sheet-consistency` | **Created**: 2026-11-11 | **Status**: Draft

**Input**: "T-132 — Rules and sheet consistency fixes from the spec 047 review. Reconcile the
shipped sheets, their labels and their English/Russian rules documentation, after agreeing the rules
and meaning choices with the maintainer."

## Context

The sheet-help review exposed differences between the rules a reader learns and the controls a
player uses. Some are inherited mechanics, such as Star Wars wound penalties on the generic WoD 2e
character, while others are misleading labels or explanations. [T-132](../../TODO.md) groups eleven
subjects into one consistency pass. [The decision register](decisions.md) records current evidence
and separates confirmed rules choices from terminology proposals and rendered checks still to
perform.

The affected systems already exist. This feature corrects them and their bilingual help; it does not
add a new game line or redesign the document workspace. Players with stored characters or edited
pages must retain their data and receive understandable updates rather than an unexplained change in
what their marks mean.

## Clarifications

### Session 2026-11-11

- Droids receive Force Points and Dark Side Resistance on full pages and briefs, but cannot learn
  Force Skills.
- Star Wars Willpower is a static rating. Force Points are spendable. Starting values come from
  Virtues only at creation; later Virtue changes do not set resource minima.
- Creatures and fodder retain individual member Health tracks. Seven levels are the standard; three
  and five are explicitly shortened configurations.
- WoD 2e follows the classic second edition. Star Wars retains its conversion rules.
- Old WoD 2e wounds keep their count and positions. Both old damage types become ordinary damage,
  original marks are retained for recovery, and the user is notified. The converted character uses
  classic wound penalties. No old cross automatically becomes aggravated damage.
- Vehicle System slots and Configuration remain independent records, with no implied physical
  compartments or automatic synchronization.
- Mortal Convictions, Touchstones and Tenets are portrayal notes, without Vampire Humanity, Stains
  or other line-specific consequences.
- Hunter Creed Fields remains optional free text, named Creed notes. Its containing card is named
  for its actual contents. Existing notes keep their stored identity.

## User Scenarios & Testing

### User Story 1 - Use the Star Wars resources the rules describe (Priority: P1)

A player records a living character or droid without working around hidden resources or a resource
minimum that prevents a valid character state.

**Why this priority**: resource controls currently contradict both the setting's rules and the
documentation, including the ability to record lost Dark Side Resistance.

**Independent Test**: use a living character and a droid, each with known Virtues and resources;
verify both views, resource edits, later Virtue changes and re-opening.

**Acceptance Scenarios**:

1. **Given** a droid with stored Force Points and Dark Side Resistance, **When** the player opens
   its full page or brief, **Then** both resources are shown and editable, while Force Skills remain
   unavailable.
2. **Given** a Star Wars character with independently advanced resources, **When** a Virtue changes,
   **Then** the resources keep their values and valid lower values can still be entered.
3. **Given** a character with Willpower, **When** the player reads or edits it, **Then** the control
   and help describe a lasting rating rather than a spendable reserve.
4. **Given** Force Points below capacity, **When** the player spends or restores them, **Then**
   current points change within capacity without altering that capacity.

### User Story 2 - Record injuries under the intended rules (Priority: P1)

A GM tracks creatures and fodder individually and can use a generic WoD 2e character without
unknowingly applying the Star Wars conversion's wound rules.

**Why this priority**: changing an injury's meaning can affect every later action; edition
corrections and old-character recovery must be handled together.

**Independent Test**: mark individual members of a pack and fodder group; compare a new classic
character, an old classic character and a Star Wars character after the same injury positions are
recorded.

**Acceptance Scenarios**:

1. **Given** two members on one sheet, **When** one takes damage, **Then** only that member's Health
   changes, and the help explains the standard and shortened tracks.
2. **Given** a new generic WoD 2e character, **When** damage is recorded, **Then** the damage names
   and wound penalties match the classic edition's shared core rules.
3. **Given** an old WoD 2e character with both old damage marks, **When** it is converted, **Then**
   all wound positions remain occupied by ordinary damage, the player learns about the change, and
   the original marks remain recoverable.
4. **Given** an existing Star Wars character, **When** the classic engine is updated, **Then** the
   Star Wars penalties, damage meanings and setting-specific trait rules remain unchanged.

### User Story 3 - Understand what each label and record means (Priority: P2)

A player reading either language sees the same abilities, resources and purpose on the sheet and in
the corresponding help, without inventing relationships between independent records or applying
another game line's consequences.

**Why this priority**: terminology fixes remove repeated confusion while keeping the existing
records and the way players organize their notes.

**Independent Test**: follow the affected labels and help in both languages, using a droid memory
table, a vehicle with different system lists, a mortal and a hunter.

**Acceptance Scenarios**:

1. **Given** a droid memory table, **When** the reader compares it with its sheet, **Then** every
   listed ability belongs to the displayed setting category.
2. **Given** a vehicle with different names in its two system records, **When** one record changes,
   **Then** the other remains unchanged and the help explains why.
3. **Given** a mortal's moral notes, **When** the reader follows their help, **Then** it explains
   their portrayal use without assigning Vampire consequences.
4. **Given** a hunter with existing Creed Fields text, **When** the updated page opens, **Then**
   Creed notes shows the same text and the containing card's name describes its contents.

### User Story 4 - Read action help without performing the action (Priority: P2)

A player can inspect a Rouse or Remorse action before using it, including the Rouse action on a
power row, with mouse, keyboard or touch.

**Why this priority**: these actions roll and change character state; learning what they do must not
require activating them.

**Independent Test**: reach each action's help independently of the action, open it, close it, and
verify that no roll, resource change or fold occurred. Repeat with an unavailable action and with
help configured on a user-authored button.

**Acceptance Scenarios**:

1. **Given** a Rouse, Remorse or power-row Rouse action, **When** the player opens its help,
   **Then** the explanation appears without performing the action.
2. **Given** an unavailable action, **When** the player navigates by keyboard, **Then** its
   explanation remains separately reachable and meaningfully named.
3. **Given** a full page or brief in either language, **When** the affected help is rendered,
   **Then** retained help is visible and reachable even beside hidden headings or abbreviated
   labels, with no unintended English fallback.

### Edge Cases

- Old Star Wars Willpower pairs may have different current and maximum values. The lasting rating is
  the maximum; reading it does not erase or refill the old current.
- A missing optional droid resource is not evidence of creation-time Virtues. Opening an old droid
  never fabricates historical starting values or rewrites its data.
- A reopened or reimported converted WoD 2e character is not converted a second time; newly recorded
  aggravated wounds keep their meaning.
- A saved page copy can retain older labels and controls until its owner accepts the shipped update.
  Applying that update must preserve document values and user edits.
- Help on a repeated power row must identify the relevant action without making a help target part
  of its action button.

## Requirements

### Functional Requirements

- **FR-001**: Full droid pages and briefs MUST expose Force Points and Dark Side Resistance without
  exposing Force Skills.
- **FR-002**: Star Wars Willpower MUST be represented as a static rating. Current Force Points MUST
  remain a spendable reserve bounded by their capacity.
- **FR-003**: Later Virtue changes MUST NOT recalculate or impose minima on Star Wars Willpower,
  Force Point capacity or Dark Side Resistance.
- **FR-004**: Starting-resource explanations MUST distinguish creation calculations from later
  independent advancement. Existing characters MUST NOT be reinitialized.
- **FR-005**: Droid memory tables and examples MUST use the actual Star Wars ability categories and
  established names in both languages.
- **FR-006**: Force-derived labels, calculations and examples MUST agree with the conversion's
  initiative pool and conditional movement multiplier, stating the baseline and activation
  requirements without implying distance or speed units.
- **FR-007**: Creature and fodder pages MUST retain separate member Health. Help MUST identify seven
  levels as standard and three/five as shortened configurations.
- **FR-008**: The generic WoD 2e engine's wound penalties, damage types, trait modifiers, specialty
  behavior, Willpower and armor explanations MUST agree with the classic second edition's shared
  core rules rather than setting-specific extensions.
- **FR-009**: Correcting the classic engine MUST preserve the Star Wars conversion's mechanics and
  its stored characters' meanings.
- **FR-010**: Old WoD 2e damage MUST convert to ordinary damage with the same occupied positions,
  preserve original marks for recovery, and inform the player. Conversion MUST run once and MUST NOT
  classify old lethal damage as aggravated damage.
- **FR-011**: Existing trait flags, resource values and notes MUST NOT be deleted as a side effect
  of hiding a control or correcting its rules interpretation.
- **FR-012**: WoD-family umbrella Ability headings, combined condition blocks and written Appearance
  descriptions MUST have names distinct from their narrower categories or numerical traits,
  consistently in full pages, briefs and help.
- **FR-013**: Vehicle System slots and Configuration MUST remain independent; their help and the
  vehicle overview MUST describe their actual purposes and behavior.
- **FR-014**: Mortal moral fields MUST remain portrayal notes, without Vampire Humanity or Stains;
  both languages MUST use the established glossary terms.
- **FR-015**: Hunter Creed Fields MUST be named Creed notes, retain existing text and have no new
  mechanical effect; its card MUST be named for its actual contents.
- **FR-016**: Rouse, Remorse and per-power Rouse MUST have visible, separately keyboard-reachable
  help, including when the action itself is unavailable.
- **FR-017**: Reading action help MUST NOT roll, alter data, run the action or fold a containing
  section. The same help capability MUST be available on user buttons.
- **FR-018**: Every changed rules explanation, interface label and help destination MUST have
  equivalent English and Russian meaning and working destinations.
- **FR-019**: All registered shipped full pages and briefs MUST be walked in both languages; hidden
  headings, abbreviated labels and repeated actions MUST be covered. Findings MUST record rendered
  evidence before being classified as defects.
- **FR-020**: Edited shipped pages MUST receive changes through the existing review flow, preserving
  user edits and document values. Reading one sheet MUST NOT require loading unrelated documents or
  an online service.

## Success Criteria

- **SC-001**: Each of T-132's eleven intake subjects has a recorded disposition and verification
  evidence; no subject is closed solely by restating the older review.
- **SC-002**: Resource scenarios pass for living characters and droids in both views; changing
  Virtues leaves the three independently stored resources unchanged.
- **SC-003**: Every old-engine injury fixture keeps its occupied positions, has no automatically
  aggravated wounds, retains recoverable originals and converts once. Star Wars behavior remains
  unchanged for corresponding comparison fixtures.
- **SC-004**: The bilingual walk covers every registered shipped full page and brief, with no
  unresolved inaccessible help or unintended untranslated label in scope.
- **SC-005**: Opening each action-help variant with keyboard and pointer produces zero new rolls and
  zero character writes; its action remains separately usable.
- **SC-006**: Stored resource values, notes, template coordinates and recovery data survive opening,
  editing, saving, reloading, exporting and importing affected cases.

## Assumptions

- Source scope is the local Star Wars conversion and Vampire second edition's shared core,
  identified in `context/AGENTS.md`; rules prose is paraphrased, not copied.
- The old Willpower pair's maximum denotes its lasting rating. Its unused current is retained for
  compatibility rather than silently discarded.
- No creation wizard, new classic supernatural module, automated combat resolution, vehicle-list
  synchronization or new mortal morality subsystem is included.
- T-143's onward links to interaction help and T-144's Hunter cell workflow remain separate tasks.
  General note's deliberately suppressed Markdown help is preserved.
- The first new-edition correction does not prove every existing custom character follows a legal
  build; unsupported or ambiguous data is retained rather than guessed.
