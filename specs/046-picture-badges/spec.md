# Feature Specification: Picture badges

> **Rejected (2026-10-29).** Built, then rejected by the maintainer on review: in the documents
> window, letters read better than marks and pictures on PC and phone. Telling characters apart by
> icons stays a good idea for another place. Kept from this spec: the module letters (VtM, HtR) and
> the badge resolution by setting (user setting → module → system). The full code, the approved
> marks, and the SVG cleaner are on the branch `archive/046-picture-badges`. Lesson: icon work is
> first tried as a concept in its real place, not only as icons on a sheet.

**Branch**: `046-picture-badges` | **Created**: 2026-10-29 | **Status**: Rejected

**Input**: "T-129 — Picture badges for systems and settings: shipped systems carry an SVG mark, and
a user setting picks an icon from the app's set or uploads its own SVG, drawn only as an image so it
can run no script; the letters stay as its spoken name and the fallback." Amended by the maintainer:
a setting takes only its own uploaded SVG (within limits that keep it light and harmless) or its
letters, not an icon from the app's set.

## Context

Since spec 045 the documents window marks each document with a short text badge when the list mixes
games: SW, V5, WoD 2e, General for the shipped systems, and a user setting's own badge (up to 6
characters, or the initials of its name). Letters are hard to scan in a long list, and two settings
with similar names get similar initials. A small picture is recognized at a glance. This spec gives
every shipped setting (Star Wars, Vampire, Hunter) a picture mark and its own letters, and lets a
user setting upload its own picture ([T-129](../../TODO.md)).

## Clarifications

### Session 2026-10-29

- Q: When a badge has a picture, does it also show its letters? → A: The picture alone, the letters
  in its tooltip and spoken name; a badge with no picture (a new system not drawn yet, a setting
  that chose none) shows its letters.
- Q: May a setting pick one of the app's icons? → A: No; a setting has its own uploaded SVG or its
  letters.
- Q: What happens to an uploaded SVG with scripts, event handlers, external references, or
  `<foreignObject>`? → A: It is cleaned on upload: only safe drawing elements and attributes are
  kept, the form says what was removed, and a file with nothing left is rejected.
- Q: What limits keep an uploaded picture light? → A: At most 8 KB after cleaning and at most 200
  elements.
- Q: Who draws the shipped settings' marks? → A: Drawn for this spec, after game-icons.net pictures
  the maintainer chose as references (our own shapes, no copied paths, so no CC BY credit), and
  approved on one page before implementation; any can later be replaced by a file.
- Q: Do rulesets (V5, WoD 2e) get marks too? → A: No; marks belong to concrete settings (Star Wars,
  Vampire: the Masquerade, Hunter: the Reckoning, and later Werewolf, Demon...), so a player tells
  characters of different settings apart. A ruleset's own documents (a V5 Storyteller character, a
  plain WoD 2e character) and General notes show letters. A shipped setting's letters name the
  setting too (VtM, HtR), not its ruleset (V5).

## User Scenarios & Testing

### User Story 1 - Recognize a game by its picture (Priority: P1)

A player with Star Wars characters, hunters, vampires, and general notes opens the documents window.
Each character shows its setting's small picture where the text badge was; hovering it, or a screen
reader, still gives the full name. Notes and a ruleset's own documents keep their letters.

**Why this priority**: it is the visible change, and the shipped settings cover every player.

**Independent Test**: seed a Star Wars character, a hunter, a vampire, a V5 Storyteller character,
and a note; open the documents window and check each setting's picture, the letters of the other
two, and the full name as tooltip and accessible name.

**Acceptance Scenarios**:

1. **Given** a Star Wars character, a hunter, and a vampire, **When** the documents window opens,
   **Then** each row shows its setting's mark (no letters), and its tooltip and spoken name are the
   setting's full name.
2. **Given** a V5 Storyteller character and a note beside them, **When** the window opens, **Then**
   they show their letters (V5, General).
3. **Given** only documents of one setting are shown, **When** the window opens, **Then** no badge
   is shown (as today).
4. **Given** the dark theme, **When** the window opens, **Then** every mark is as legible as in the
   light theme.

---

### User Story 2 - Upload my setting's own picture (Priority: P1)

A GM who built two settings on V5 uploads a small SVG picture for each in the setting's form in the
library, and tells their documents apart at a glance. The picture travels with the setting: it is in
the setting's exported file and arrives on another device with it.

**Why this priority**: telling one's own settings apart is the reason T-129 was raised.

**Independent Test**: upload a small SVG to a setting, check the documents window shows it, export
the setting, import it into an empty library, and check the picture is there.

**Acceptance Scenarios**:

1. **Given** a setting's form, **When** the GM uploads an SVG file within the size limit, **Then**
   its documents show that picture.
2. **Given** an SVG that contains a script, an event handler, or a link to another address, **When**
   the GM uploads it, **Then** those parts are removed before it is saved, the form says what was
   removed, and the picture is shown without them.
3. **Given** a file over the size limit or not an SVG, **When** the GM uploads it, **Then** the form
   says why and keeps the previous badge.
4. **Given** a setting with an uploaded picture, **When** it is exported and imported elsewhere,
   **Then** the picture comes with it.
5. **Given** a setting with a picture, **When** the GM removes it, **Then** its documents show its
   letters again (its own badge or its initials).

### Edge Cases

- A picture that fails to draw (a broken uploaded file): the row shows the text badge instead, and
  the failure is reported once to developers.
- A setting with both a text badge and a picture: the picture is shown; the text badge stays its
  fallback and is not lost.

## Requirements

### Functional Requirements

- **FR-001**: Every shipped setting (a setting system such as Star Wars, or a ruleset's module such
  as Vampire: the Masquerade or Hunter: the Reckoning) MUST have a picture mark shown in place of
  its letters in the documents window; the letters stay as fallback. Rulesets (V5, WoD 2e) and
  General have no mark.
- **FR-012**: A document's badge MUST belong to its setting: a user setting's, else its module's
  (VtM, HtR, with the module's name in full), else its system's (SW, V5, WoD 2e, General).
- **FR-010**: A badge with a picture MUST show the picture alone, without its letters; a badge with
  no picture (a ruleset, General, a setting without a mark or an uploaded picture) MUST show its
  letters.
- **FR-002**: A badge MUST keep its setting's (or "Setting · System") full name as tooltip and
  accessible name; the picture itself is decorative.
- **FR-003**: Marks MUST stay legible in the light and dark themes at the badge's size.
- **FR-004**: A user setting's badge MUST be either its uploaded picture or its letters; there is no
  list of the app's icons to pick from.
- **FR-005**: A user setting MAY carry an uploaded SVG picture of at most 8 KB after cleaning and at
  most 200 elements, stored with the setting so it is exported, imported, and synced with it.
- **FR-006**: An uploaded picture MUST be drawn only as an image, never inserted into the page, so
  that scripts, event handlers, and external references in it cannot run or load.
- **FR-011**: On upload, the picture MUST be cleaned to an allowlist of drawing elements (shapes,
  paths, groups, gradients, text) and their presentation attributes; scripts, event handlers,
  `<foreignObject>`, styles that load anything, and references outside the file MUST be removed. The
  form MUST say what was removed, and MUST reject a file with nothing left to draw. Only the cleaned
  picture is stored, exported, or synced.
- **FR-007**: The form MUST reject a file that is not an SVG or is over the limit, saying why, and
  keep the setting's previous badge.
- **FR-008**: The setting's form MUST let the GM remove an uploaded picture, after which the text
  badge (own or initials) is shown.
- **FR-009**: Badges MUST be shown under the same rule as today: only when the shown rows' full
  names differ (hunters and vampires together are now badged).

### Key Entities

- **Setting mark**: a shipped setting's picture (setting system or module), with its letters as
  fallback.
- **Setting badge**: a user setting's text badge (spec 045), plus an optional uploaded picture.

## Success Criteria

- **SC-001**: In the documents window with documents of every shipped setting, a player names the
  setting of any row from its picture or letters without hovering.
- **SC-002**: The documents window with 3,000 documents of mixed systems opens no slower than before
  this spec (within measurement noise).
- **SC-003**: An uploaded SVG carrying a script, an `onload` handler, a `<foreignObject>`, and an
  external image runs and loads nothing when shown, and the stored and exported setting contains
  none of them.
- **SC-004**: The page's initial load grows by no more than 2 KB compressed.

## Assumptions

- Shipped marks are drawn for this site, not publisher logos or art (constitution VIII), and name no
  trademark. Their subjects follow game-icons.net pictures the maintainer chose (a glowing
  lightsaber for Star Wars, a drop of blood for Vampire, a crosshair for Hunter; wings for Demon,
  kept for later), but their shapes are our own, not copies or traces, so the site needs no CC BY
  credit. The maintainer approved the final drawings. A Werewolf mark (a wolf's head) is deferred to
  that module. Each mark is one file a later file can replace.
- Letters name the game line, not only its edition (SW, VtM, HtR, WoD V5, WoD 2e): a future D&D
  ruleset is "D&D 5e", never "5e", so it cannot be confused with a World of Darkness one.
- Only the documents window shows badges; other places (library tree, create dialog) are out of
  scope and may adopt the marks later.
- Raster pictures (PNG, WebP) are out of scope: SVG stays small and sharp at any size.
- User document types owned by a ruleset or setting system show that owner's badge; a setting added
  later (Werewolf, Demon) brings its mark with its module.
