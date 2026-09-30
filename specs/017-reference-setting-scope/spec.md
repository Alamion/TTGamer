# Feature Specification: Document references scoped to the template's setting

**Feature Branch**: `testing`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "T-075: Document reference to any kind — a document reference field targets any document type available to the template's setting, shipped or user-defined. Scope is the template's own setting only: the editor offers the setting's shipped types, the ruleset's shared core types the setting reuses, and the user-defined types that belong to that setting, each once under its own name, with no merging across systems. On the sheet, a reference offers only documents of the template's setting whose type is one of the targets. Existing templates and stored references keep working; targets the setting no longer offers are kept, shown as unavailable, and reported, never silently dropped."

## Scope

| Backlog | Entry                          | Role in this feature |
| ------- | ------------------------------ | -------------------- |
| T-075   | Document reference to any kind | User Stories 1–4     |

A document reference is a template field that links to other documents: a vehicle's pilot, a
hunter's cell mates, an NPC's patron. The author picks which document types the field may point
to; the sheet's user then picks documents of those types.

Today the author's list of types mixes every game system together. Types that share a name
across systems (every system has a "character") appear once, under whichever system came
first, and a reference to "character" matches characters of every system. On a Hunter sheet, the
"pilot" field of a user's own vehicle type offers Star Wars characters next to hunters. User types
from every user setting also appear, whichever setting the template belongs to.

This feature makes a reference belong to the template's setting: the author sees exactly the
types that setting has, shipped or their own, and the sheet's user sees exactly the documents of
that setting.

Out of scope:

- References across settings or systems (a Star Wars sheet pointing at a V5 character). The
  maintainer chose the setting's own scope (2026-09-28).
- Core characters inside shipped line settings (T-082): what "a mortal inside Hunter" means for
  stored documents is decided there. This feature uses today's meaning of which documents belong
  to a setting.
- Reading values of the referenced document on the sheet (formulas, displayed stats).
- Changing how a reference is displayed, opened, or cleared on the sheet.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Pick target types from the template's setting (Priority: P1)

A template author edits a page of a setting (a shipped one such as Hunter or Star Wars, or their
own) and adds a document reference. The list of types they may target shows the types of that
setting: its shipped types, the ruleset's shared core types the setting reuses (such as the V5
mortal in a V5 line, or core characters in a user setting built on a ruleset), and the user
types created in that setting. Each type appears once under its own name. Types of other
settings and systems are not listed.

**Why this priority**: This is the core of the task. Without it, the author cannot tell which
"character" they are choosing, and their own types from one setting leak into another.

**Independent Test**: Open the template editor on a Hunter page, add a document reference, and
check the offered types; repeat on a Star Wars page and on a page of a user setting with its own
types.

**Acceptance Scenarios**:

1. **Given** a Hunter page, **When** the author adds a document reference, **Then** the offered
   types are the Hunter character, the V5 mortal, the user types created for Hunter, and the user
   types shared by the whole V5 ruleset, and no Star Wars or WoD 2e type is offered.
2. **Given** a Star Wars page, **When** the author adds a document reference, **Then** the offered
   types are the Star Wars character, creature, vehicle, and group, and the user types created
   for Star Wars, each once.
3. **Given** a page of a user setting built on V5 with two user types, **When** the author adds a
   document reference, **Then** the offered types are the V5 core types the setting reuses and
   those two user types, and no user type of another user setting.
4. **Given** a page of a user type, **When** the author adds a document reference, **Then** the
   offered types are those of the setting the user type belongs to.
5. **Given** two systems that both have a type named "character", **When** the author looks at the
   offered types on a page of either system, **Then** only that system's character appears, and
   its name tells which setting it belongs to wherever the setting could be ambiguous.
6. **Given** a new document reference, **When** it is added, **Then** it targets the page's own
   document type by default, as today.

---

### User Story 2 - Choose only documents of the setting on the sheet (Priority: P1)

A sheet user fills a document reference. The search offers only their documents that belong to
the template's setting and are of one of the target types. Documents of other systems and other
user settings are not offered, even when their type has the same name.

**Why this priority**: This is what the sheet user sees. The mixed list is the visible bug.

**Independent Test**: With a Star Wars character, a Hunter character, and a character of a user
setting on the device, open a Hunter sheet with a reference to characters and search.

**Acceptance Scenarios**:

1. **Given** Star Wars, Hunter, and user-setting characters, **When** the user searches a Hunter
   sheet's character reference, **Then** only Hunter characters are offered.
2. **Given** a reference in a user setting's page that targets one of its user types, **When** the
   user searches, **Then** only documents of that type created in that setting are offered.
3. **Given** a reference that targets the V5 mortal on a Hunter page, **When** the user searches,
   **Then** mortals of the V5 ruleset are offered, by the same rule that decides which mortals
   belong to Hunter today.
4. **Given** a reference inside a custom list entry (spec 016), **When** the user fills an entry,
   **Then** the same scoping applies.
5. **Given** the shipped Star Wars vehicle page, **When** the user fills a crew station, **Then**
   Star Wars characters are offered as before, and no characters of other systems.

---

### User Story 3 - Existing references keep their values (Priority: P2)

A user opens a sheet whose reference already points at a document that is outside the setting
(stored before this feature). The link is not lost: the document still shows by its title, can
still be opened, and can be removed, and the field says it is outside this setting. Once removed,
it is not offered again.

**Why this priority**: Stored data must survive. Silent loss of a link the user made is worse
than the mixing bug.

**Independent Test**: Store a Hunter sheet reference to a Star Wars character, open the sheet,
check the entry, open it, and remove it.

**Acceptance Scenarios**:

1. **Given** a stored reference to a document outside the setting, **When** the sheet opens,
   **Then** the entry shows the document's title with a note that it is outside this setting,
   keeps its "open" action, and keeps its value.
2. **Given** such an entry, **When** the user removes it, **Then** it is removed, and the search no
   longer offers that document.
3. **Given** a stored reference to a document that no longer exists, **When** the sheet opens,
   **Then** it shows the "missing document" placeholder, as today.
4. **Given** a read-only sheet, **When** it shows an out-of-scope entry, **Then** the note shows and
   no remove control appears.

---

### User Story 4 - Stale targets in the editor are kept and reported (Priority: P2)

An author opens a template whose reference targets a type the setting no longer offers: a user
type that was deleted or belongs to another setting, or a type name that only another system
has. The target stays in the template, the editor shows it as unavailable, and the template's
problem list says so. The author can uncheck it. Nothing is dropped on load or save without
their action.

**Why this priority**: Templates were saved under the old, mixed list; they must load unchanged
and tell the author what no longer fits.

**Independent Test**: Load a template whose reference targets a user type from another setting,
open the field, and check the list and the problems panel; uncheck it and save.

**Acceptance Scenarios**:

1. **Given** a reference whose targets include a type the setting does not offer, **When** the
   template loads, **Then** it loads without error and the target is kept.
2. **Given** that template in the editor, **When** the author opens the reference, **Then** the
   stale target is listed, checked, and marked unavailable, and the problems panel names the
   field and the target.
3. **Given** the stale target, **When** the author unchecks it, **Then** it is removed and the
   problem clears; the last remaining target can never be unchecked.
4. **Given** a reference whose only target is stale, **When** the sheet opens, **Then** the search
   offers nothing, the stored values show by rule of User Story 3, and nothing breaks.
5. **Given** an imported template file with a stale target, **When** it is imported, **Then** it is
   accepted with the target kept and reported, like other stale settings.
6. **Given** a library file whose templates target user types defined in the same file, **When** it
   is imported, **Then** no target is reported as stale.

---

### Edge Cases

- A type is offered by both the ruleset and a line of it: it appears once, as the one the setting
  uses.
- A user type is deleted while a template targets it: the target becomes stale (User Story 4);
  documents of that type already stored in the field show by rule of User Story 3 or as missing.
- A user setting is deleted: its pages' references keep their targets as stale.
- A template of a shipped setting targets a user type owned by that setting's system with no
  specific line: it is offered on pages of that system that have no line, and on line pages of
  that system, as the user type's owner defines today for other lists (for example the library).
- The template has no known setting (an orphaned template whose system is missing): the editor
  offers only the targets already stored, all marked unavailable, and the sheet offers nothing
  new.
- The referencing document itself is excluded from its own search, as today.
- The preview in the editor uses sample data and reports nothing for missing or out-of-scope
  targets, as today.
- The limit of 1–20 targets per reference is unchanged.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A template's **setting scope** MUST be derived from the template itself: its system,
  and its user setting if it has one, or the line (supernatural module) of its own document type
  in a shipped system.
- **FR-002**: The editor MUST offer as reference targets exactly the document types of the
  template's setting scope: the shipped types of that setting, the ruleset's shared core types the
  setting reuses, and the user types owned by that setting (or by its system and line), each
  once.
- **FR-003**: The editor MUST NOT offer types of other systems or of other user settings, and MUST
  NOT merge two types of different systems that share a name.
- **FR-004**: Each offered type MUST show its own name; where two offered types would read the
  same, the name MUST also show the setting they belong to.
- **FR-005**: A new reference MUST default to the page's own document type.
- **FR-006**: On the sheet, the reference search MUST offer only documents of the template's
  setting scope whose type is one of the targets, excluding the document itself.
- **FR-007**: A document belongs to a setting scope when it is of the same system and, for user
  settings, was created in that user setting; shipped lines follow the same membership rule the
  app already uses to decide which pages a document can open.
- **FR-008**: A stored reference to an existing document outside the scope MUST show that
  document's title with an "outside this setting" note, keep its "open" action, keep its value
  until the user removes it, and hide the remove control on a read-only sheet. Like a missing
  target, it MUST be reported to the developer diagnostics (constitution III), except in the
  editor preview.
- **FR-009**: A stored reference to a document that no longer exists MUST keep today's missing
  placeholder and diagnostic.
- **FR-010**: Stored targets that the scope does not offer MUST be kept on load, import, and save;
  the editor MUST show them checked and marked unavailable, and the template's problem list MUST
  report each with the field it belongs to.
- **FR-011**: The author MUST be able to uncheck any target, stale or not, except the last one.
- **FR-012**: Custom list entries of type reference (spec 016) MUST follow FR-006 to FR-009.
- **FR-013**: Shipped templates MUST keep working without change of their stored targets.
- **FR-014**: New user-facing text MUST be available in English and Russian.
- **FR-015**: The storybook MUST show a reference with in-scope, out-of-scope, and missing entries
  (constitution VI). The editor's stale-target state is an editor panel, not a sheet element, so
  it is covered by editor tests rather than the storybook.
- **FR-016**: The editor guide (English and Russian) MUST say which types a reference can target
  and what an out-of-scope entry means; the sheet-templates skill and module notes MUST describe
  the current behavior.

### Key Entities

- **Setting scope**: the system, and the user setting or shipped line, a template belongs to;
  decides both the offered target types and the offered documents.
- **Reference target**: a document type a reference may point to; available (in the scope) or
  stale (stored but not in the scope).
- **Reference entry**: one stored document id in a reference value; in scope, out of scope
  (existing document of another scope), or missing (no such document).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On a page of each shipped setting (Star Wars, WoD 2e, Hunter, V5 core) and of a user
  setting, the offered target types contain no type of another system or user setting and no
  duplicates.
- **SC-002**: With documents of three different settings on the device, a reference search on
  each sheet offers only documents of that sheet's setting: 0 foreign documents offered.
- **SC-003**: 100% of stored references to existing documents keep showing their titles after the
  change, including those outside the scope.
- **SC-004**: Every shipped template and every template saved before the change loads without
  error, with its targets unchanged.
- **SC-005**: Every stale target in a loaded template appears in the template's problem list.

## Assumptions

- "Setting" follows the app's existing layering: a shipped system (Star Wars, WoD 2e), a line of a
  ruleset (Hunter in V5), a ruleset's own core pages, or a user setting built on a ruleset.
- The ruleset's shared core types are the ones the app already lets a setting reuse (core
  definitions); a shipped line reuses its ruleset's core types.
- Which documents belong to a shipped line uses today's rule; refining it for core characters
  inside lines is T-082.
- Out-of-scope stored entries stay visible and openable instead of being shown as missing, because
  the document exists and hiding it would look like data loss (resolves the open question in the
  input).
- No stored data migration: targets stay document type ids; the scope is derived from the
  template, not stored on the field.
