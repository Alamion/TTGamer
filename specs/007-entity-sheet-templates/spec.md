# Feature Specification: Entity Sheet Templates and Docs Embed Migration

> **Change record.** Partly superseded by 008 (system-aware template matching, registry-driven creation, plugin-declared catalogs). Current template behavior: `.agents/skills/sheet-templates/SKILL.md`.

**Feature Branch**: `007-entity-sheet-templates`

**Created**: 2026-09-13

**Status**: Implemented (v3.5.0)

**Input**: User description: "Last time we did complete the template sheets of character and droid for WoD SW. Now we have two tasks. First, to remake the whole sheets of other entities (Creature, Vehicle, Fodder group) - both full and brief versions while keeping them WoD SW specific. You can still stand on current implementation + the last pages with character sheet of context/Star_Wars_WEG_to_WoD_Conversion.pdf, but I also would like you to take advantage of digital version over pdf one and using such things as collapsibles, doc links, selects/suggests where needed and other stuff, we can extend current versions a bit and include the things GM would like to have under his hand or fill eventually. We want to stay the pages WoD SW specific, but keep in mind that we will probably add objects with the same names to other settings like DnD or cyberpunk, or not (e.g. fodder and creature may be excessive for cyberpunk, but organizations, items and events will fit this exact setting really well). Refactoring the rest of templates while keeping in mind the next step - settings expansion. And 2. of what we do want to do in the same spec - rework of docs/ inline elements to remove usage of deprecated pre-template elements (we should move these elements to context/ just in case we would like to reference them later) and use PartialTemplate from last spec instead."

## Scope Note

Feature 006 finished the template composition model and rebuilt the character and droid pages (full and brief) as shipped templates. Three WoD Star Wars document kinds — **creature**, **vehicle**, and **fodder group** — still render through the pre-template ready-made page path, and several documentation pages still embed pre-template ready-made blocks and viewers. This feature closes both gaps.

Decisions taken with the author before specification:

- **Settings expansion is structural only.** The new pages are built so the same kinds can later appear in other settings (D&D, cyberpunk, …) without rework of shared parts; the cross-setting kind identity, setup management, and new settings themselves belong to the next spec.
- **Only the existing three kinds** are rebuilt. Organizations, items, events, places, and maps are deferred to the settings-expansion spec.
- **Legacy components are archived, then removed.** Pre-template ready-made blocks and viewers are copied into `context/` for reference and deleted from the product once nothing uses them.
- **Docs embeds are `TemplateFragment` and `TemplatePreview`** (shipped in feature 006; the author's "PartialTemplate" referred to these): `TemplateFragment` is the editable fragment bound to the reader's current document, `TemplatePreview` the read-only preview bound to a fixed example document. They are used as they are, not renamed.

### Out of scope — recorded for the next spec

- Cross-setting kind identity (one "creature"/"vehicle" concept shared by several settings), setup management, and any non-Star-Wars setting content.
- New document kinds (organization, item, event, place, map).
- Encounter/initiative tooling that operates across several documents at once.
- Creating a document directly from a catalog page entry (e.g. "new creature from this bestiary row").

## Clarifications

### Session 2026-09-13

- Q: What are the correct names of the docs embeds? → A: `TemplateFragment` (editable, reader's document) and `TemplatePreview` (read-only, fixed example document).
- Q: When a catalog suggestion is picked over values the user already entered, what happens? → A: Overwrite — the catalog entry's mapped values replace the current ones; values the entry does not map are left untouched.
- Q: Which GM-facing fields beyond the paper sheets are needed, and why? → A (delegated to the spec author; rule: a field earns its place only if a rule, a catalog value, or a table-time decision uses it): **Creature** — merits & flaws (conversion step 7 and bestiary entries carry them; the paper sheet has no slot), movement (bestiary value; chases and closing distance), threat tier Fodder / Named (the rules split creatures into both tiers, and tier decides whether lethal damage can be soaked), derived soak pool (Stamina + armor, read-only), description & behaviour (prefilled from the bestiary; how it hunts/reacts), source reference. **Vehicle** — category and durability "reroll 10s" (catalog values that change rolls), the ten numbered system slots as a systems list with a damaged marker (specific and ion damage target systems), crew stations (pilot, co-pilot, gunners, engineer, sensors, comms — each optionally linked to a character document, because crew-role dice pools come from the crew's traits), modifications & quirks (customization and upgrade rules), description/notes. **Fodder group** — member count, quick pools (specialty/secondary pool from the Quick NPC Rolls table, for mooks without full stats), derived soak pool with a "cannot soak lethal" reminder, leader link to a named-NPC character document. Rejected as not rule- or table-backed: habitat, loot/uses, cost/availability, registration/transponder, morale (free notes cover them).
- Q: Where exactly do documentation pages show the new entity pages, and which parts? → A (delegated): all new entity embeds are `TemplatePreview`s of fixed example documents consistent with the page's prose, and each replaces the static table it duplicates — (1) _Creatures → Creature & NPC Mechanics_, "Creature Example: Wampa": full creature page, Wampa; (2) same page, "Fodder Stat Block Example: Stormtrooper": brief fodder group page, a stormtrooper squad with mixed damage across members; (3) _Vehicles → Traits & Systems_, "Vehicle Sheet": the X-wing "Red Five" as the full vehicle page, Luke's Landspeeder and the Millennium Falcon as brief vehicle pages; (4) _Vehicles → Durability, Damage & Repair_, "Vehicle Damage Track": the vehicle damage-track part only, with example damage states (mirroring the health-track examples on the Health page). No `TemplateFragment` is used for entity kinds, because a reader has no "current creature/vehicle". Bestiary, vehicle catalog, and Building Encounters pages get no embeds.
- Q: How many health levels does each fodder group member's track have? → A: Selectable per group — 3 (typical fodder: Hurt, Injured, Incapacitated), 5 (tough fodder: full track to Wounded), or 7 (full track, as on the conversion sheet); default 3.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Creature sheet as a template (Priority: P1)

A GM creates a creature document (for example, a rancor or a pack of womp rats) and gets a full page that covers everything on the conversion book's creature sheet — identity (species, type, scale, size), physical and mental attributes, abilities, willpower, armor, natural attacks, one health track per pack member, and the combat-scales reference — plus what the conversion rules and bestiary use but the paper sheet lacks — merits & flaws, movement, threat tier (fodder or named), a derived soak pool — and GM conveniences the paper sheet cannot offer: picking the species from the bestiary to prefill its statistics, a scale selector with the scale difference reference available in a collapsible with a link to the rules page, and collapsed description/behaviour, source, and notes.

**Why this priority**: Creatures are the most frequently used non-character opposition and currently render through the legacy path that this feature retires.

**Independent Test**: Create a creature document, fill it from a bestiary entry, adjust values, add pack members, mark damage on individual members, collapse and expand the optional sections, reload, and confirm everything persists and matches the paper sheet's coverage.

**Acceptance Scenarios**:

1. **Given** a new creature document, **When** the GM opens it, **Then** the page shows every field present on the conversion book's creature sheet, organized into sections with rules-page links where a rule applies.
2. **Given** the species field, **When** the GM picks an entry from the bestiary suggestions, **Then** the entry's statistics (attributes, willpower, abilities, armor, attacks, merits & flaws, movement, description, source) overwrite the current values and remain freely editable afterwards; free text that matches no entry is still accepted.
3. **Given** a creature with several pack members, **When** the GM marks damage on one member, **Then** only that member's health track and wound penalty change.
4. **Given** the secondary sections (description & behaviour, source, notes), **When** the page first opens, **Then** they are collapsed, and their expanded state is remembered after the GM opens them.
5. **Given** a creature with threat tier set to Fodder, **When** the page is viewed, **Then** the soak area shows that lethal damage cannot be soaked; set to Named, it shows the soak pool as soaking lethal damage.
6. **Given** an existing creature document created before this feature, **When** it is opened, **Then** all of its stored values appear in the new page without loss.

---

### User Story 2 - Vehicle sheet as a template (Priority: P1)

A GM or player opens a vehicle document (a speeder, a starfighter, a freighter, a capital ship) and gets a full page matching the conversion book's vehicle sheet — name, model, owner, scale, crew, length, cargo capacity, passengers, consumables, maneuverability, speed, altitude, sensors, hyperdrive, navigation computer, shields (including front/rear), the numbered system slots, the weapons table with arc, range, and damage, and a damage track per vehicle in a squadron — enhanced with model suggestions from the vehicle catalog that prefill statistics (including category and the durability "reroll 10s" property), an arc selector, a scale selector with the combat-scale reference in a collapsible, links to vehicle combat, damage/repair, and modification rules, the numbered system slots as a systems list with a damaged marker, crew stations that can link to character documents, and collapsed areas for modifications & quirks and description/notes.

**Why this priority**: Vehicles are the second legacy page and are central to space and chase play.

**Independent Test**: Create a vehicle from a catalog model, add a weapon with an arc, add a modification, add a second squadron member, mark damage on one member, reload, and verify persistence and coverage.

**Acceptance Scenarios**:

1. **Given** a new vehicle document, **When** it is opened, **Then** every field from the conversion book's vehicle sheet is present, with vehicle-scale damage level names (Cosmetic through Wrecked) on the damage track.
2. **Given** the model field, **When** a catalog model is picked, **Then** its statistics overwrite the current values and remain editable; values the catalog does not carry (name, owner, crew stations, modifications, systems damage) are untouched.
3. **Given** the weapons table, **When** a weapon row is added, **Then** its arc is chosen from the setting's valid arcs and its range and damage are editable.
4. **Given** a vehicle with a crew station, **When** the GM links the station to an existing character document, **Then** the link opens that character, and a link whose target was deleted degrades to a labeled placeholder without error.
5. **Given** an existing vehicle document created before this feature, **When** it is opened, **Then** all stored values appear without loss.

---

### User Story 3 - Fodder group sheet as a template (Priority: P1)

A GM running a squad of stormtroopers opens a fodder group document and gets a page matching the conversion book's fodder sheet — concept, notes, all nine attributes, the listed abilities plus free ability slots, willpower, the armor and weapon rows, and up to twelve lettered member health tracks (A–L) — improved with a member count the GM can change, per-member defeated state visible at a glance, a derived soak pool with a "cannot soak lethal" reminder, collapsed quick pools (specialty/secondary) for mooks run without full stats, a leader link to a named-NPC character document, and catalog armor and weapon suggestions that prefill their statistics.

**Why this priority**: Fodder groups are the third legacy page; together with Stories 1–2 they unblock legacy retirement.

**Independent Test**: Create a group of six troopers, pick armor and a weapon from catalogs, damage members B and E, incapacitate member E, reload, and confirm state.

**Acceptance Scenarios**:

1. **Given** a new fodder group, **When** it is opened, **Then** the shared statistics appear once and each member has its own lettered 3-level health track (Hurt, Injured, Incapacitated); switching the group to 5 or 7 levels lengthens every member's track.
2. **Given** a group, **When** the GM changes the member count, **Then** tracks are added or removed at the end, and removing a member that has recorded damage asks for confirmation first.
3. **Given** a member whose track reaches Incapacitated, **When** the page is viewed, **Then** that member is visibly marked as out of the fight.
4. **Given** an existing fodder group document, **When** it is opened, **Then** all stored values appear without loss.

---

### User Story 4 - Brief versions for encounter use (Priority: P2)

During an encounter the GM switches any creature, vehicle, or fodder group to its brief view: a compact stat block showing only what is needed at the table — the dice pools and ratings used in combat, armor/soak, attacks or weapons, willpower, and the health/damage tracks — with a link or control to open the full page.

**Why this priority**: Brief pages depend on the full pages' content, and are how GMs actually run several opponents at once.

**Independent Test**: Switch each of the three kinds to its brief view and run a combat round using only the brief page.

**Acceptance Scenarios**:

1. **Given** any of the three kinds, **When** its brief view is selected, **Then** a kind-specific brief page (not the generic character brief) is shown.
2. **Given** a value changed in the brief page, **When** the full page is opened, **Then** the change is reflected there, and vice versa.
3. **Given** a template author, **When** they copy a brief default, **Then** it is editable in the template editor like any other template.

---

### User Story 5 - Documentation embeds use template fragments (Priority: P2)

A reader of the Star Wars documentation (English or Russian) sees the same interactive sheet parts as before — base identity, attributes, abilities, advantages, Force, full example characters, health-track examples — but rendered from the shipped templates through `TemplateFragment` and `TemplatePreview`, so the docs always match the real sheet. The creature and vehicle rules pages replace their static example tables with read-only previews of the new pages (Wampa, stormtrooper squad, X-wing "Red Five", Luke's Landspeeder, Millennium Falcon, vehicle damage-track states).

**Why this priority**: Required to retire the legacy components; lower than the sheets because readers see no functional change.

**Independent Test**: Open every documentation page that previously embedded a legacy component in both locales and confirm each embed renders, edits the reader's current document where it did before, and shows fixed examples where it did before.

**Acceptance Scenarios**:

1. **Given** a documentation page that embedded an editable legacy block, **When** it is opened, **Then** the equivalent part of the shipped template is shown, bound to the reader's current document.
2. **Given** a page that showed a fixed example (a preset character, health-track states), **When** it is opened, **Then** a read-only preview of the same example is shown.
3. **Given** the reader has no current document of the needed kind, **When** an editable embed renders, **Then** it degrades to a clear prompt (e.g. create a character) rather than an error.
4. **Given** a documentation embed referencing a template part that no longer exists, **When** the project's verification runs, **Then** it fails and names the page and the missing part.
5. **Given** the Creature & NPC Mechanics and Vehicle Traits & Systems pages, **When** opened, **Then** each example formerly shown as a static table is shown as a read-only preview of the corresponding page (full or brief as listed in Clarifications), with the same values the prose describes, and the static table is gone.

---

### User Story 6 - Legacy component retirement and archive (Priority: P3)

A maintainer confirms that no product surface or documentation page uses the pre-template ready-made blocks and viewers, finds reference copies of them under `context/`, and sees that they are gone from the product.

**Why this priority**: Cleanup that depends on Stories 1–5.

**Independent Test**: Search the product and docs for the retired components; find none outside `context/`; full verification passes.

**Acceptance Scenarios**:

1. **Given** Stories 1–5 are complete, **When** the retirement is performed, **Then** each retired component has a reference copy in `context/` and no product or docs reference remains.
2. **Given** a user-authored template or document still pointing at a retired ready-made page, **When** it is opened, **Then** it falls back to the kind's shipped template with a clear notice, with no crash and no data change.

---

### User Story 7 - Pages ready for other settings (Priority: P3)

A maintainer preparing the next spec reviews the three new pages and finds that setting-specific content (Star Wars labels, damage-level names, scales, catalogs, rules links, arcs) is supplied by the Star Wars setting, while the page structure uses only setting-neutral building blocks — so a D&D or cyberpunk "creature" or "vehicle" could be produced by supplying different content rather than new element types.

**Why this priority**: Enables the next step but delivers no direct user-visible change now.

**Independent Test**: Review the three templates and the current-state template documentation; every Star-Wars-specific item is attributable to the Star Wars setting, and the documentation records which parts are reusable across settings.

**Acceptance Scenarios**:

1. **Given** the new templates, **When** reviewed, **Then** no new element type or shared behavior exists solely for one Star Wars kind; any required new capability is general-purpose.
2. **Given** the current-state template documentation, **When** read, **Then** it lists, per kind, what is setting-specific and what is expected to carry over to other settings.

---

### Edge Cases

- A catalog prefill applied over values the GM already typed: the entry's mapped values overwrite them; unmapped values (name, owner, notes, members' damage, crew stations) are never touched.
- A crew station or leader link whose character document is deleted: shown as a labeled placeholder; the rest of the page is unaffected.
- A catalog entry later removed or renamed: the document keeps its stored values; the suggestion simply no longer matches.
- Fodder group member count reduced below the number of damaged members.
- A vehicle or creature with zero members (a single entity) versus many members: the page presents a single track without lettering when there is one.
- Very large groups beyond twelve members: the limit is enforced with a clear message.
- Shortening a fodder group's track length (e.g. 7 → 3) while members have damage on levels that would disappear: requires confirmation, and damage is kept up to the new length (excess marks count toward Incapacitated rather than vanishing silently).
- An existing fodder group document created with the old 7-level track: opens with length 7 so no recorded damage is lost; the default 3 applies only to new groups.
- A creature, vehicle, or group document opened with a user default-override template saved before this feature.
- Documentation rendered with no stored documents at all (first visit, private window, storage unavailable).
- A documentation embed in the Russian locale where the English page's embed was changed: both locales must reference the same template parts.
- Health/damage track labels differ by kind (character-style wound levels for creatures and fodder, vehicle damage levels for vehicles) and must never be mixed.

## Requirements _(mandatory)_

### Functional Requirements

**Entity pages (creature, vehicle, fodder group)**

- **FR-001**: Each of creature, vehicle, and fodder group MUST have a shipped full template and a shipped kind-specific brief template for the Star Wars WoD setting, replacing the ready-made page path for those kinds.
- **FR-002**: Each full template MUST cover every field on the corresponding conversion book sheet (creature, vehicle, fodder) and every value the current page stores, so no existing document value becomes unreachable.
- **FR-003**: Pages MUST use digital affordances where they reduce effort: selectors for closed value sets (scale, size, vehicle arc, creature type, vehicle category), catalog suggestions with prefill for open sets backed by existing catalogs (species/bestiary, vehicle models, armor, weapons), collapsible sections for secondary or GM-only content, and links to the relevant rules pages on sections.
- **FR-004**: Pages MUST include exactly these additions beyond the paper sheets (each backed by a rule, catalog value, or table-time decision): **creature** — merits & flaws, movement, threat tier (Fodder / Named), derived read-only soak pool, description & behaviour, source reference; **vehicle** — category, durability "reroll 10s" marker, ten-slot systems list with per-system damaged marker, crew stations (pilot, co-pilot, gunners, engineer, sensors, comms) each optionally linked to a character document, modifications & quirks list, description/notes; **fodder group** — member count, derived soak pool with "cannot soak lethal" reminder, quick pools (specialty and secondary), leader link to a character document. Descriptive and reference additions (description, source, modifications, quick pools) MUST be collapsed by default and MUST NOT push combat-relevant content below them. Habitat, loot, cost/availability, registration, and morale fields are explicitly excluded.
- **FR-005**: Picking a catalog suggestion MUST overwrite the values the catalog entry maps, and MUST leave every value the entry does not map unchanged.
- **FR-006**: Multi-member kinds MUST show one independent track per member with kind-appropriate level names and penalties; fodder groups MUST support up to twelve lettered members with an adjustable count, and removing a member with recorded damage MUST require confirmation. A fodder group's track length MUST be selectable per group as 3 (Hurt, Injured, Incapacitated), 5, or 7 levels, defaulting to 3; all members of a group share the chosen length.
- **FR-007**: Brief templates MUST present the table-play subset (combat pools/ratings, armor/soak, attacks or weapons, willpower where applicable, tracks) and share values with the full page.
- **FR-008**: Existing creature, vehicle, and fodder group documents MUST open in the new pages with all stored values intact; new extended content MUST be stored without changing the shape of existing document data.
- **FR-009**: The shipped brief/full choice MUST be switchable per document like the character and droid pages, and user templates MUST be able to copy and edit the new defaults.

**Settings-expansion readiness**

- **FR-010**: The new templates MUST be composed only of general-purpose template elements; any capability added for them MUST be usable by any kind in any setting.
- **FR-011**: Star-Wars-specific content (labels, level names, scales, arcs, catalogs, rules links) MUST be supplied by the Star Wars setting, not by shared template or rendering behavior.
- **FR-012**: The current-state template documentation MUST record, per kind, which parts are setting-specific and which are expected to carry over to other settings.

**Documentation embeds**

- **FR-013**: Every documentation page (English and Russian) that embeds a pre-template ready-made block or viewer MUST instead use the template documentation embeds: the editable fragment where the legacy embed edited the reader's document, the read-only preview where it showed a fixed example.
- **FR-014**: Replaced embeds MUST preserve the teaching intent of each page (the same part of the sheet, the same example characters and health states).
- **FR-015**: Verification MUST fail when any documentation embed references a template or template part that does not exist, naming the page and the reference.
- **FR-016**: Editable embeds without a suitable current document MUST degrade to a clear, actionable prompt.
- **FR-016a**: Entity-kind documentation embeds MUST be read-only previews of fixed example documents placed exactly as recorded in Clarifications (Wampa full creature; stormtrooper squad brief fodder group; X-wing "Red Five" full vehicle; Luke's Landspeeder and Millennium Falcon brief vehicles; vehicle damage-track states), each replacing the static table it duplicates, in both locales. Example values MUST match the page prose.

**Legacy retirement**

- **FR-017**: After FR-001 and FR-013 are satisfied, the pre-template ready-made blocks and viewers, and the ready-made page path for the three kinds, MUST be removed from the product, with reference copies preserved under `context/`.
- **FR-018**: Documents or user templates still pointing at a retired ready-made page MUST fall back to the kind's shipped template with a notice, with no crash and no data change; the fallback MUST be observable to developers.

**Cross-cutting**

- **FR-019**: All new user-visible strings MUST ship in English and Russian; all new surfaces MUST meet the accessibility floor (keyboard operability, labeled controls, `aria-expanded` on collapsibles, `role="alert"` for errors).

### Key Entities _(include if feature involves data)_

- **Entity Kind**: a document kind within a setting — here creature, vehicle, and fodder group — with a full and a brief shipped template.
- **Shipped Template (full / brief)**: the setting-owned page definition for a kind; the source for documentation embeds.
- **Member Track**: a per-member health or damage track within a multi-member document, using the kind's level names and penalties.
- **Catalog Suggestion**: an open-set selector backed by an existing setting catalog; picking an entry overwrites the values it maps.
- **Crew Station / Leader Link**: a named role on a vehicle or fodder group optionally referencing a character document; degrades to a placeholder when the target is gone.
- **Documentation Embed**: `TemplateFragment` (editable, reader's document) or `TemplatePreview` (read-only, fixed example document) of a shipped template part.
- **Example Document**: a fixed, setting-owned document used only by previews (Wampa, stormtrooper squad, Red Five, Luke's Landspeeder, Millennium Falcon, damage-track states).
- **Legacy Archive**: reference copies of retired pre-template components kept outside the product under `context/`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of fields on the conversion book's creature, vehicle, and fodder sheets are present in the corresponding full pages.
- **SC-002**: 100% of values stored in existing creature, vehicle, and fodder group documents are visible and editable after the change, with zero data loss.
- **SC-003**: A GM can create a ready-to-play creature or vehicle from a catalog entry in under 2 minutes, and a six-member fodder group with armor and weapons in under 3 minutes.
- **SC-004**: A GM can resolve a full combat round for each kind using only its brief page, without opening the full page.
- **SC-005**: 0 documentation pages in either locale reference a pre-template ready-made block or viewer, and 0 product references to them remain outside `context/`.
- **SC-006**: 100% of documentation embeds render in both locales, and a broken embed reference is caught by verification every time.
- **SC-007**: 0 new template element types or shared behaviors exist that serve only one Star Wars kind.
- **SC-008**: 0 crashes and 0 unintended data changes across fallback paths (retired ready-made pages, missing catalog entries, deleted linked documents, missing current document in docs).

## Assumptions

- **A1 — Paper sheets are the coverage floor, not the layout**: the conversion book's sheets define required content; layout follows the existing character/droid template presentation (alternating accents, collapsible sections, wide centered page).
- **A2 — Extended content uses the template value space**: GM-facing extensions are stored as template values; existing document data keeps its shape, consistent with feature 006's no-shape-change rule. The single exception is the fodder group track length (a rules-owned system value): it is added to fodder data as an additive field that parses to 7 for existing groups and is created as 3 for new ones — no existing value changes (decided during planning).
- **A3 — Kind-specific briefs**: each of the three kinds gets its own brief template instead of the shared generic brief.
- **A4 — No migration of user templates**: as in feature 006, there is no permanent user base; user-authored templates or overrides for these kinds that no longer fit are retired with fallback rather than migrated.
- **A5 — Catalogs are reused, not expanded**: existing creature, vehicle, armor, and weapon catalogs back suggestions; catalog content growth is not part of this feature.
- **A6 — Docs embeds are used as shipped**: `TemplateFragment` and `TemplatePreview` are sufficient; small general-purpose extensions (e.g. supplying example documents for non-character kinds) are allowed if needed.
- **A7 — Archive is reference-only**: files under `context/` are not built, tested, or kept compiling.
- **A8 — Verification scope**: the change touches template content, persistence fallback, rendering, and docs; the schema/persistence verification tier (lint + typecheck + full test suite) plus the docs build and i18n parity checks apply.
