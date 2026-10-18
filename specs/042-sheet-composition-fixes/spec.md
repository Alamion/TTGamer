# Feature Specification: Shipped Sheet Composition Fixes

**Branch**: `042-sheet-composition-fixes` | **Created**: 2026-10-19 | **Status**: Draft

**Input**: "Spec 042 — T-126, shipped full sheets that break the composition rule. Players get the
Star Wars droid, creature, vehicle, and fodder-group full sheets, the WoD 2e full sheet, and the V5
vampire's predator card laid out like the other shipped full sheets: sections of at least five
fields made of cards of at least three, no loose field in a section (a growing element counts as a
card's worth). Each fix removes that sheet's named exception from the composition test until the
list is empty. Stored documents keep every value; edited shipped pages keep working; brief pages are
untouched; full sheet heights are re-measured where the layout changes. Collapsible only for
unboundedly growing objects or rarely needed ones. Branch from testing after v3.32.0."

## Context

Spec 041 wrote down the maintainer's composition rule for shipped full sheets: a page is made of
sections; a section holds at least five fields and is made only of cards; a card holds at least
three fields. A growing element (a list, a table, built-in rows, equipment, a track, a multiline
text, a multiple reference, a tracker) counts as three fields on its own. A test checks every
shipped full sheet and lists the sheets that broke the rule when it was written as named exceptions
(backlog T-126):

- **Star Wars droid**: the Resources section holds four fields; its Willpower card holds one.
- **Star Wars creature**: Abilities and Health are sections of one growing element each, placed
  loose in the section; Details holds three loose texts.
- **Star Wars vehicle**: Weapons, Damage, and Modifications are sections of one loose growing
  element; Details holds two loose texts.
- **Star Wars fodder group**: the Group section and card hold two fields; Abilities holds four with
  a one-field Willpower card; Members is one loose track; Quick pools holds two; Notes one loose
  text.
- **WoD 2e character**: Resources holds four fields; its Willpower card and the Derived Stats card
  hold one each.
- **V5 vampire**: the "What the predator type gives" card holds one field.

On these sheets a reader meets one-field cards, sections that are a single bare list or track, and
loose fields that sit outside any card, unlike every other shipped sheet.

## Clarifications

### Session 2026-10-19

- Q: How far may the six sheets be rearranged? → A: After the V5 pattern: Health, Willpower, and
  resources in one Condition section, weapons and damage in Combat; reading order may change to
  group fields by meaning.
- Q: Should the Star Wars character, which shares its layout with the droid and the WoD 2e
  character, be rearranged the same way? → A: Yes, one layout for all three sheets.

## User Scenarios & Testing

### User Story 1 - Star Wars, droid, and WoD 2e characters share one layout (Priority: P1)

A player opens a Star Wars character, a droid, or a WoD 2e character. All three follow one layout
after the V5 pattern: Willpower, the virtues, and Health sit together in a Condition section,
weapons, armor, and Initiative in Combat, and every card holds at least three fields inside sections
of at least five.

**Why this priority**: these are player sheets in daily use; the three share the engine's page
parts, so one layout fixes the droid and WoD 2e sheet and keeps the Star Wars character alike.

**Independent Test**: open one document of each of the three kinds, check every section and card
against the rule, and check that every value shown before is shown and editable after.

**Acceptance Scenarios**:

1. **Given** a droid with values in every field, **When** it is opened after the change, **Then**
   every value shows in the same field, edits save as before, and no section or card breaks the
   rule.
2. **Given** a Star Wars character and a droid, **When** both are opened, **Then** their sections
   come in the same order with the same titles, apart from what only one kind has (the Force, a
   droid's built-in equipment).
3. **Given** a WoD 2e character, **When** it is opened, **Then** Willpower and Initiative sit in
   cards of at least three fields and the section holding them has at least five.
4. **Given** any of the three full sheets, **When** a roll is made from a rating or Willpower,
   **Then** it rolls the same pool as before.

---

### User Story 2 - Creatures, vehicles, and fodder groups are made of cards (Priority: P2)

A Storyteller opens a creature, a vehicle, or a fodder group. Each list, table, track, and set of
notes is inside a card, small sections are merged into neighbours by meaning, and no section is a
single bare element.

**Why this priority**: these sheets are opened during play by the Storyteller; loose elements and
one-element sections are the most visible breaks of the rule.

**Independent Test**: open one document of each kind and check the rule and the values as in
story 1.

**Acceptance Scenarios**:

1. **Given** a creature with abilities, attacks, health damage, and notes, **When** it is opened,
   **Then** each of them is inside a card, every section has at least five fields, and every value
   is where its card names it.
2. **Given** a vehicle with weapons, damage, modifications, and crew links, **When** it is opened,
   **Then** the weapons, damage track, and modifications table each sit in a card, crew links still
   open their documents, and damage marks are kept.
3. **Given** a fodder group with members, quick pools, and a leader, **When** it is opened, **Then**
   the members' track, quick pools, and leader are in cards of sections that meet the rule, and
   marking a member's damage works as before.

---

### User Story 3 - The vampire's predator text has a proper home (Priority: P3)

A vampire player looks up what their predator type gives. The text (shown from the chosen predator
type, never stored) sits in a card with related fields instead of a one-field card of its own.

**Why this priority**: one card on one sheet; small but the last exception in the list.

**Independent Test**: open a vampire with a predator type, check the card and the shown text.

**Acceptance Scenarios**:

1. **Given** a vampire with a predator type chosen, **When** the full sheet is opened, **Then** what
   the type gives shows in a card of at least three fields, and choosing another type changes it as
   before.

---

### User Story 4 - The rule holds for every shipped full sheet (Priority: P3)

A maintainer runs the composition check. It lists no exception: every shipped full sheet passes as
it is.

**Why this priority**: keeps the rule from eroding; it closes T-126.

**Independent Test**: the composition check passes with an empty exception list.

**Acceptance Scenarios**:

1. **Given** the change is complete, **When** the composition check runs, **Then** it has no named
   exception left, and the portrait card stays the only allowed small card.

### Edge Cases

- **Edited shipped page**: a user's saved edit of one of these sheets keeps its own layout; it is
  not rearranged. **Reset to original** gives the new layout.
- **Remembered folds**: a card's remembered open or closed state may reset where a card is new or
  merged; values never do.
- **Fold rule**: a card folds only when it grows without bound (equipment, lists of weapons, notes)
  or is rarely needed in play (biography, appearance); merged cards that hold play values
  (Willpower, pools, Damage) do not fold.

## Requirements

### Functional Requirements

- **FR-001**: Every shipped full sheet MUST follow the composition rule: only sections at the top;
  each section holds at least five fields and only cards; each card holds at least three fields; a
  growing element counts as three fields; the portrait card is the only allowed small card.
- **FR-002**: The change MUST be a change of layout only: every value a document stored before MUST
  show in a field bound to the same value after, and no value key, binding, formula, or roll MAY
  change.
- **FR-003**: The sheets MUST be regrouped after the V5 sheets' pattern: Health, Willpower, and
  other per-scene resources in one Condition section; weapons, attacks, armor, and damage in a
  Combat section; notes and descriptions with the details. A field moves only into a card of the
  same subject, and sections may change order to group fields by meaning.
- **FR-004**: No new field MAY be added to meet the rule; a small card or section MUST be merged
  into a neighbour instead.
- **FR-005**: Brief pages MUST NOT change.
- **FR-011**: The Star Wars character, droid, and WoD 2e full sheets MUST share one section layout;
  only sections or cards a kind alone has (the Force, built-in equipment) differ.
- **FR-006**: Cards MUST fold only when they grow without bound or are rarely needed in play (spec
  040 rule); a card that holds values used every scene MUST NOT fold.
- **FR-007**: A user's edited copy of a changed shipped page MUST keep loading and showing the same
  values; it is not rewritten.
- **FR-008**: The composition check MUST pass with no named exception left, and the backlog entry
  T-126 MUST be marked done.
- **FR-009**: Where a full sheet's layout changes, its pinned height used by the browser checks MUST
  be measured again and recorded.
- **FR-010**: Titles of new or merged cards and sections MUST be translated in English and Russian.

## Success Criteria

- **SC-001**: The composition check reports 0 exceptions (today 6 sheets, 31 problems).
- **SC-002**: 100% of the values in the example and test documents of the seven changed sheets show
  in the same bound field before and after (checked field by field).
- **SC-003**: No changed full sheet is more than 10% taller than before at 375 px or 1280 px.
- **SC-004**: Every brief page keeps its height within 1% at 375 px and 1280 px.

## Assumptions

- The rule and its counting are the ones recorded in spec 041 and the `sheet-templates` skill; this
  spec does not change them.
- The Star Wars character full sheet already passes and changes only to share the droid's and WoD 2e
  layout (clarified); the V5 full sheets other than the vampire's predator card are not touched.
- Node ids of moved fields may stay or change; documents store values by value key, not by node id.
- Out of scope: new fields, brief pages, user templates, changing the rule.
