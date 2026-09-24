# Feature Specification: V5 dice pools and precise notation errors

**Feature Branch**: `testing`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Agreed, let's go. Clarifications up front: like the settings for the character name, the character's used stats, or the roll details, this must be configurable — the user must be able to turn it on and off in the configuration. The `:h` label form suits me, and set bonuses can be included too. Note that both settings can go where the WoD difficulty setting lives, in the corresponding panel, and test that they work only for rolls made from that panel, or when the panel is closed but a character of the matching setting is open." (Preceding agreement in the session: V5 meaning must not be bound into the notation, because "5e" also names other popular systems such as D&D 5e; the notation gains only system-neutral building blocks, and V5 outcomes are read by the game system. The structured parser diagnostics task is taken into the same feature.)

## Scope

| Backlog                 | Entry                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| T-045 (module TODO #15) | V5 dice pools: criticals, Hunger/Desperation dice, and their outcomes |
| module TODO #3          | Structured parser diagnostics                                         |

The notation stays system-neutral. It gains two general building blocks that other
systems can use: a **label** that marks part of a pool (`:h`), and a **set bonus** that
adds successes for every complete set of matching dice. Everything that is specific to
V5 — the names Hunger and Desperation and what their results mean — belongs to the V5
game system and is shown only where V5 applies.

Out of scope:

- F-006 (erased sheet stats still label the next roll) — a separate defect in the same
  roll-context area, tracked in `TOFIX.md`.
- The VtM 5e character sheet (T-039). This feature makes Hunger dice rollable from the
  dice panel; rolling them from a vampire sheet arrives with that sheet.
- Automating the Willpower reroll, multi-system pool tabs (T-015), and any change to 3D
  physics (F-004, F-005, T-066).
- Classic WoD and Star Wars WoD dice behaviour, which must stay exactly as it is.

## Clarifications

### Session 2026-09-24

- Q: What is the default state of critical pairs and special-dice outcomes, given that the WoD tab also serves classic WoD and Star Wars WoD? → A: Both on by default; the WoD tab gains a Classic / V5 mode switch, and panel rolls get the V5 reading only in V5 mode. V5 mode shows the special-die button, the line choice, and the Difficulty in successes; Classic mode keeps today's target-number difficulty and botch button.
- Q: When does a panel roll get the V5 reading if a hunter sheet is open but the WoD tab in V5 mode is not selected? → A: A sheet's immediate roll (right-click on a stat) follows the sheet's system. A roll that goes through the panel's roll control, Enter in the notation input, or the header's pending-roll button (the notation shown next to the dice button after a stat is queued) follows the selected tab; when no tab is selected, the character the roll came from decides. Standard, D&D, and WoD Classic switch the V5 reading off.
- Q: Which dice-panel tab is selected by default, and is the choice remembered? → A: No tab is selected by default; the user's tab choice (including none) is remembered across panel open/close and page reloads.
- Q: (after implementation) Which line applies, and does the header button follow the tab? → A: Rolls made from a character — a sheet's immediate roll and the header's pending-roll button — follow the character: with a V5 character (queued stat, else the shown document) the V5 reading applies with that character's line whatever tab is selected; without one, the header falls back to the tab rule. Rolls made in the dice panel (roll button, Enter, history re-roll) follow the panel: the WoD tab's V5 mode and its line setting take priority, even when a hunter stat is queued. This amends the earlier answer that the header followed the tab.
- Q: (after implementation) Does the Difficulty affect a roll, and what about Classic mode? → A: When set, the successes needed produce a verdict — success with its margin, or failure with the shortfall — shown with the roll, for panel rolls in both modes; unset, it changes nothing. Classic mode gains an optional "successes needed" value, and its target number can be left unset as well (dice are then added without a threshold and the botch die is hidden).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Criticals are counted for me (Priority: P1)

A hunter's player rolls six dice from the dice panel's WoD tab in V5 mode and gets 6, 7, 10, 10, 4, 2.
With the "critical pairs" setting on, the result reads six successes, and the two 10s are
shown as a critical, so nobody at the table has to recount the dice.

**Why this priority**: every V5 roll can contain a critical; counting pairs by hand is the
most frequent manual step V5 players take today, and the docs currently tell them to do it.

**Independent Test**: roll fixed dice with the setting on and off from the WoD tab and
compare totals; roll the same notation typed by hand with the set bonus to confirm the
building block works outside V5.

**Acceptance Scenarios**:

1. **Given** critical pairs are on, **When** six dice show 6, 7, 10, 10, 4, 2, **Then** the
   total is 6 successes and the pair of 10s is marked as a critical.
2. **Given** critical pairs are on, **When** dice show three 10s, **Then** one pair counts as
   a critical (4 successes) and the third 10 counts as 1 success — 5 in total.
3. **Given** critical pairs are on, **When** four 10s are rolled, **Then** two criticals
   are counted (8 successes).
4. **Given** critical pairs are off, **When** the same dice are rolled, **Then** the total
   is 4 successes, as today.
5. **Given** any tab or context, **When** a user types a notation with a set bonus by hand,
   **Then** the bonus is applied: the building block itself is not tied to V5.

---

### User Story 2 - Hunger and Desperation dice are rolled apart and read for me (Priority: P1)

A hunter's player adds two Desperation dice to their pool from the WoD tab. The dice
appear in their own colour in the 2D and 3D views, in the roll history, and in the Discord
message. When a Desperation die shows a 1, the result says so and names the choice the
player now faces (push through and raise Danger, or fall into Despair). A vampire's player
does the same with Hunger dice and sees a messy critical or a bestial failure called out
when one occurs.

**Why this priority**: the separate dice and their outcomes are the part of V5 that is
easiest to get wrong by hand and the reason the table keeps a physical set of coloured
dice next to the site.

**Independent Test**: roll fixed dice containing labelled dice and check colour, history,
and the reported outcome for each line; turn the outcome setting off and confirm only the
colour and the plain count remain.

**Acceptance Scenarios**:

1. **Given** the pool contains dice labelled as special, **When** it is rolled, **Then**
   those dice are shown in the special colour in 3D, highlighted with a text marker in the
   history's roll details, and identified in the Discord message.
2. **Given** special-dice outcomes are on and the line is Desperation, **When** any
   labelled die shows 1, **Then** the result reports the price of a 1 and names both
   choices; **When** none shows 1, **Then** no outcome is reported.
3. **Given** the line is Hunger and critical pairs are on, **When** a critical includes at
   least one labelled 10, **Then** the result reports a messy critical.
4. **Given** the line is Hunger, **When** the roll fails and at least one labelled die shows
   1, **Then** the result reports a bestial failure.
5. **Given** the line is Hunger and no Difficulty was given, **When** a labelled die shows
   1, **Then** the result states that the roll is a bestial failure if it misses the
   Difficulty, instead of claiming success or failure it cannot know.
6. **Given** special-dice outcomes are off, **When** labelled dice are rolled, **Then** they
   keep their colour and count as ordinary successes, and no outcome is named.
7. **Given** the special-die button in the WoD tab, **When** it is clicked and
   right-clicked, **Then** it adds and removes one labelled die, like the other dice
   buttons.

---

### User Story 3 - The settings apply only where V5 applies (Priority: P2)

A player turns on critical pairs and special-dice outcomes in the WoD tab. Their V5 rolls
now read correctly, but a Star Wars WoD character's rolls, the Standard and D&D tabs, and
the inline rolls on documentation pages behave exactly as before. When the player
right-clicks a skill on their hunter's sheet, or queues it and rolls from the header
button with no tab selected, the roll still counts criticals and reads Desperation dice,
because the roll comes from a V5 character.

**Why this priority**: without clear boundaries the settings would silently change classic
WoD, Star Wars, and D&D results — worse than not having them. It depends on Stories 1 and 2.

**Independent Test**: with both settings on, roll the same dice from eleven contexts — WoD
tab in V5 mode; WoD tab in Classic mode; Standard tab; D&D tab; a docs inline roll; an
immediate roll from a Star Wars sheet; an immediate roll from a hunter sheet; a queued
hunter skill rolled from the panel with the Standard tab selected; the same rolled from the
header; a queued hunter skill rolled with no tab selected; a queued Star Wars skill rolled
with no tab selected — and check where the V5 reading is applied and with which line.

**Acceptance Scenarios**:

1. **Given** both settings are on, **When** a roll is made from the WoD tab in V5 mode,
   **Then** the V5 reading is applied; **When** the tab is in Classic mode, **Then** it is
   not, and the classic result is unchanged.
2. **Given** both settings are on, **When** a roll is made from the Standard or D&D tab or
   from a documentation inline roll, **Then** no V5 reading is applied.
3. **Given** both settings are on, **When** a skill is rolled immediately (right-click)
   from a hunter sheet, **Then** the V5 reading is applied with the Desperation line,
   whichever tab is selected.
4. **Given** both settings are on, **When** a skill is rolled immediately from a Star Wars
   WoD sheet, **Then** no V5 reading is applied and the classic result
   (ones subtract, specialty explodes) is unchanged.
5. **Given** both settings are on and the Standard tab is selected, **When** a hunter skill
   is queued (left-click) and rolled from the panel's roll button, **Then** the pool is
   still a V5 pool (scenario 7) but no V5 reading is applied: the panel decides. **When** it
   is rolled from the header's pending-roll button instead, **Then** the V5 reading is
   applied with the Desperation line: the character decides.
6. **Given** both settings are on and no tab is selected, **When** a hunter skill is queued
   and rolled from the panel or from the header's pending-roll button, **Then** the V5
   reading is applied with the Desperation line; for a queued Star Wars WoD skill it is
   not.
   6a. **Given** the WoD tab in V5 mode with the Hunger line and a hunter skill queued, **When**
   the pool is rolled from the panel, **Then** it is read with Hunger (the panel's setting);
   **When** it is rolled from the header, **Then** it is read with Desperation (the
   character's line).
7. **Given** a hunter sheet, **When** a skill is rolled, **Then** the pool is a V5 pool —
   ones do not subtract successes, dice do not explode, and no specialty die is added —
   whatever the settings are.
8. **Given** the settings, the WoD tab mode, and the selected tab, **When** the panel is
   closed and reopened or the page is reloaded, **Then** they are kept, as the other dice
   settings are.
9. **Given** a first visit, **When** the dice panel opens, **Then** no tab is selected, so
   a queued hunter skill rolled from the header gets the V5 reading without any setup.

---

### User Story 4 - Notation errors point at the mistake (Priority: P3)

A player types `5d10>=6f` or a misplaced label and, instead of a bare "Invalid notation",
sees which part of the input is wrong and what was expected there.

**Why this priority**: the new label and set bonus add syntax people will mistype; precise
errors make them learnable. Useful on its own, but not needed to roll V5 pools.

**Independent Test**: type a set of known-bad notations and check the highlighted span and
the message for each, in both languages.

**Acceptance Scenarios**:

1. **Given** a notation with an unknown character, **When** it is validated, **Then** the
   offending character is highlighted and the message names it.
2. **Given** a notation missing a value after a comparison, a closing bracket, or an
   operand, **When** it is validated, **Then** the position is highlighted and the message
   says what was expected.
3. **Given** a notation that breaks a limit (too many dice, too long), **When** it is
   validated, **Then** the message names the limit and its value.
4. **Given** any error, **When** a screen reader user reaches the input, **Then** the error
   is announced once, not on every keystroke.

### Edge Cases

- Several characters open in the sheet workspace and hand-typed notation with no tab
  selected: the character currently shown decides; with none shown, no V5 reading.
- A roll that is not a success count (e.g. `2d6+3`, or labelled dice without a compare
  point): the V5 reading does not apply and no outcome is shown, even in V5 mode.
- A pool made only of special dice, or with more special dice than regular ones: counts and
  outcomes work the same.
- A critical formed by one regular and one special 10 counts as messy (Hunger); a critical
  of two regular 10s alongside a special 1 counts as a critical, and the special 1 is still
  reported.
- Exploding, rerolled, or forced (`@`) dice inside a labelled part keep their label.
- The set bonus applies to the whole pool, including dice from different labelled parts
  and groups; it is not counted separately per part.
- A roll exceeding the 3D limit falls back to 2D and keeps colours and outcomes.
- A history entry or favourite recalled later is a new roll and uses the settings and
  context of that new roll; the old entry keeps showing the outcome it had.
- A label on something that is not a die (a number, a group total) is an error with a
  precise message.
- Discord messages with context turned off still carry the dice colours' meaning in text
  form (which dice were special), because colour alone is not accessible.

## Requirements _(mandatory)_

### Functional Requirements

**Notation building blocks (system-neutral)**

- **FR-001**: The notation MUST support a label on a dice term, written `:h` after the term
  (e.g. `3d10 + 2d10:h`), marking those dice as the pool's special subset.
- **FR-002**: The notation MUST support a set bonus: for every complete set of N dice that
  match a compare point, add K to the success count. The concrete spelling is decided in
  planning, must not collide with existing modifiers, and must not mention a game system.
- **FR-003**: Both building blocks MUST work in every context, including typed notation,
  favourites, history, and docs inline rolls; only the V5 reading (FR-008–FR-012) is
  context-dependent.
- **FR-004**: Existing notations MUST produce the same results as before; the dice-logic
  reference and the skill are updated with the new syntax.

**Presentation**

- **FR-005**: Labelled dice MUST be visually distinct in 3D and on the panel's special-die
  button, and MUST be identified in the roll history's roll details (colour plus a text
  marker), in Discord messages (text), and for assistive technology. Results are text in
  2D mode, history, and toasts today; this feature adds no per-die graphics there.
- **FR-006**: The special-dice colour MUST be configurable alongside the existing primary
  and secondary dice colours. Its default MUST give face numbers in the secondary colour a
  contrast of at least 4.5:1 and differ from the default primary colour by at least 3:1.

**V5 reading**

- **FR-007**: The dice panel's WoD tab MUST offer a Classic / V5 mode switch. Classic mode
  keeps today's controls (target-number difficulty, botch die) and adds the optional
  successes needed (FR-011). V5 mode offers a
  regular V5 die, a button that adds and removes one labelled die, a choice of line
  (Hunger — VtM 5e, Desperation — H:tR 5e), the optional Difficulty (FR-011), and the
  "critical pairs" and "special-dice outcomes" settings.
- **FR-008**: With critical pairs on, a V5 roll MUST count every pair of 10s as four
  successes in place of two and mark each pair as a critical.
- **FR-009**: With special-dice outcomes on and the Desperation line, a roll where any
  labelled die shows 1 MUST report the price of a 1 and name both choices.
- **FR-010**: With special-dice outcomes on and the Hunger line, a roll MUST report a messy
  critical when a critical includes a labelled 10, and a bestial failure when the roll
  fails and a labelled die shows 1.
- **FR-011**: When the Difficulty (successes needed) is not known, outcomes that depend on
  success or failure MUST be stated conditionally, never guessed. The WoD tab MUST let the
  user give that Difficulty optionally for panel rolls. When it is given, a success-pool
  roll from the tab MUST state whether it succeeded, with its margin or shortfall, in both
  Classic mode (its own optional "successes needed") and V5 mode; Classic's target number
  MUST also be optional, and an unset value MUST leave the roll unchanged.
- **FR-012**: Outcome names and explanations MUST be in the reader's language and written
  in the project's own words (Principle VIII). They are game mechanics, so the dice roller,
  toasts, history, and Discord carry no publisher badge or notice; the Dark Pack badge
  stays once on the V5 character sheet.

**Where the reading applies**

- **FR-013**: The V5 reading MUST apply to a roll only when:
  (a) it is made from a V5 character — a sheet's immediate roll, or the header's
  pending-roll button when the queued stat (else the shown document) belongs to a V5
  character — whatever tab is selected; or
  (b) it goes through the panel's roll control, Enter in the notation input, a history
  re-roll, or the header button without a V5 character, and the selected tab is WoD in V5
  mode; or
  (c) it goes through the panel's controls, no tab is selected, and the roll came from a
  V5 character — the one whose stat was queued, or, for hand-typed notation, the
  character open in the sheet workspace.
  For (a) and (c) the line follows that character's module (Desperation for a hunter);
  for (b) it follows the tab's line choice.
- **FR-014**: Panel rolls while the Standard, D&D, or WoD Classic tab is selected, header
  rolls in that state without a V5 character, documentation inline rolls, and immediate or
  no-tab rolls from characters of other systems MUST NOT receive the V5 reading, whatever
  the settings are.
- **FR-015**: A skill rolled from a V5 character sheet MUST build a V5 pool (successes on
  6+, ones do not subtract, dice do not explode) instead of the Star Wars WoD pool it
  builds today; Star Wars WoD sheets keep their current pool. A V5 specialty is free text
  that applies only when it fits the action, so the sheet does not add its die; the player
  adds it from the panel.
- **FR-016**: The two settings, the WoD tab mode, and the selected dice-panel tab
  (including "no tab") MUST persist like the other dice settings; no tab is selected by
  default. Critical pairs and special-dice outcomes default to on; the WoD tab mode
  defaults to Classic, so existing classic and Star Wars WoD users see no change until
  they switch.
- **FR-017**: Each roll's result MUST record whether the V5 reading was applied and with
  which line, so history, toasts, and Discord show the outcome the roll actually had.

**Notation errors**

- **FR-018**: Validation errors MUST carry an error kind, the position and length of the
  offending input, and, where applicable, what was expected or which limit was exceeded.
- **FR-019**: The notation input MUST highlight the offending span and show a translated
  message built from that error; the message is announced to assistive technology without
  repeating on every keystroke.

**Documentation**

- **FR-020**: The V5 dice-pool docs (English and Russian) MUST describe the automatic
  counting and the settings, replacing the "counted by hand for now" note; the dice-logic
  notation reference (there is no user-facing notation page yet) MUST document the label,
  the set bonus, and the diagnostics.

### Key Entities

- **Labelled dice term**: a dice term carrying the special-subset label; its dice keep the
  label through explosions, rerolls, and forced values.
- **Set bonus**: a pool-level rule — set size, the compare point dice must match, and the
  successes added per complete set.
- **V5 reading**: applied or not, the line (Hunger or Desperation), the optional Difficulty,
  and the outcomes found (critical, messy critical, bestial failure, price of a 1).
- **Roll origin**: where a roll came from — a dice-panel tab, a documentation page, or a
  character sheet with that character's system — used to decide whether the V5 reading
  applies.
- **Notation diagnostic**: error kind, position, length, and expected token or limit.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For a fixed-dice test set covering 0–4 tens, 0–3 special dice, and every
  outcome, 100% of results match a hand count made from the written rules.
- **SC-002**: A V5 player can roll a pool with two Desperation dice from the dice panel in
  under 10 seconds without typing notation.
- **SC-003**: Across the eleven roll contexts in User Story 3, the V5 reading appears in
  exactly the four where it should (WoD tab in V5 mode; immediate hunter roll; queued
  hunter roll from the header; queued hunter roll with no tab selected) and in none of the
  other seven.
- **SC-004**: 100% of the existing dice tests keep their expected roll results: no classic
  WoD, Star Wars WoD, or D&D result changes. Assertions on English error-message text move
  to the structured error kind; no expected total, success count, or formatted output
  changes.
- **SC-005**: For a test set of at least 20 invalid notations, every error highlights the
  exact offending span and names what was expected or which limit was broken.
- **SC-006**: The special dice are distinguishable from regular dice without relying on
  colour alone in history and Discord text.

## Assumptions

- "Both settings" in the request are the critical-pairs setting and the special-dice
  outcomes setting; they, the line choice, the special-die button, and the optional
  Difficulty sit in the WoD tab's V5 mode.
- The set bonus is general enough for V5 pairs; other set-based systems may need more
  later, which is out of scope.
- Rolling from a hunter sheet adds no Desperation dice by itself: the rules make them the
  player's choice, so the player adds them from the WoD tab.
- The special-subset label is a single fixed label; several independent labels in one pool
  are out of scope.
- The V5 Difficulty in the WoD tab is a number of successes, separate from the classic
  difficulty (target number) already there.
- Old history entries, created before this feature, show no V5 outcome.
- The roll-origin information needed by FR-013 comes from existing sheet → dice and docs →
  dice adapters; the dice engine itself does not learn about game systems.
