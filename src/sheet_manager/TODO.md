# TODO

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.
Each task includes: name, description, priority, effort, impact, and dependencies.

---

## Legend

- ✅ **DONE** — fully implemented
- 🟡 **IN PROGRESS** — partially implemented
- ⬜ **NOT DONE** — not started

---

## Multi-System Document and Sheet Support

### Accepted target architecture

The top-level persisted object will be a tabletop document, not a character-only record:

```ts
type DocumentKind = string; // validated lowercase identifier, e.g. character or organization

interface DocumentEnvelope<TData> {
    id: string;
    kind: DocumentKind;
    systemId: string;
    definitionId: string;
    schemaVersion: number;
    metadata: DocumentMetadata;
    data: TData;
}
```

Each `SystemPlugin` registers one or more typed document definitions. A definition owns its Zod schema, default factory, layout, derived selectors, and migration chain. Built-in documents remain a discriminated union; `unknown` is allowed only at registry/import boundaries and must be narrowed by the selected schema. Document kinds are validated identifiers rather than a closed enum, allowing `item`, `event`, `organization`, and future domain concepts without changing the core. Layouts can use registered built-in React blocks or a validated declarative section/block/field model; custom user templates never contain executable user code.

Persistence should converge on `documents[]` plus `currentDocumentId`, avoiding a duplicate current object. This supports characters, vehicles, creatures, and custom sheets across systems without forcing them into one character schema.

### Epic: Multi-System Foundation

Core architecture to decouple document rendering from Star Wars WoD and support arbitrary systems and document kinds.

| #   | Status | Task                                        | Description                                                                                                                                                                                                                     | Priority | Effort | Impact | Dependencies |
| --- | ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------ | ------------ |
| 1   | ✅     | **Define `SystemPlugin` interface**         | Create a registry in which each system exposes typed document definitions with `kind`, schema, factory, layout, and migrations.                                                                                                 | Critical | M      | Epic   | —            |
| 2   | ✅     | **Polymorphic document envelope**           | Generic validated envelopes identify `kind`, `systemId`, `definitionId`, `schemaVersion`, metadata, and schema-owned payload data. Persisted characters migrate through #5 and #22.                                             | Critical | L      | Epic   | #1           |
| 3   | ✅     | **System registry**                         | Explicit immutable registry mapping system ID → `SystemPlugin`, with duplicate detection, definition lookup, version rejection, migration dispatch, and schema validation. Store/import integration follows with #5–6.          | Critical | S      | Epic   | #1           |
| 4   | 🟡     | **Extract Star Wars WoD as first plugin**   | The first plugin and block layout are registered. Move the remaining schema fields, `createDefaultCharacter()`, derived stats, and system-owned helpers into `src/sheet_manager/systems/star-wars-wod/`. No behavioral change.  | Critical | M      | Epic   | #1, #2, #3   |
| 5   | ✅     | **Update store for polymorphic documents**  | Store `documents[]` and `currentDocumentId`; CRUD validates through the definition selected by `systemId` + `definitionId`.                                                                                                     | High     | M      | Epic   | #2, #3       |
| 6   | ✅     | **Update import/export**                    | Current envelopes dispatch to the registered schema, unsupported versions are rejected, legacy characters migrate explicitly, and unknown/invalid persisted entries are retained for recovery.                                  | High     | M      | High   | #2, #3, #4   |
| 7   | ✅     | **Sheet renders from block registry**       | The active definition and named view select registered built-in blocks. Character, droid, creature, vehicle, and fodder full/brief layouts all use this path; the declarative custom-template renderer remains a separate task. | High     | S      | High   | #1, #4       |
| 8   | ⬜     | **`useTraitUpdater` becomes generic**       | Replace the fixed `TraitPath` union (`attributes`, `skills`, `forceSkills`, `virtues`) with update capabilities driven by the selected system definition.                                                                       | Medium   | M      | Medium | #1, #4       |
| 9   | ⬜     | **`StatDot` maxValue becomes configurable** | Accept `maxValue` from parent (default 5 for WoD, 18 for D&D abilities, 10 for Cyberpunk).                                                                                                                                      | Medium   | S      | Medium | —            |

---

### Epic: Star Wars — Vehicle & Droid Sheets

Vehicle and droid-specific layouts within the Star Wars WoD system.

| #   | Status | Task                                         | Description                                                                                                                                                                                               | Priority | Effort | Impact | Dependencies |
| --- | ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------ | ------------ |
| 10  | ✅     | **Vehicle schema + factory**                 | Vehicle definition owns scale, durability, shields, speed, maneuverability, crew/passengers/cargo, sensors, hyperdrive, configuration, weapons, notes, and reusable damage cohorts.                       | High     | L      | High   | #2, #4       |
| 11  | ✅     | **Vehicle sheet blocks**                     | The PDF-derived full sheet composes shared identity, trait-dot, table, and named damage-track blocks; the shared compact primitives provide its distinct brief representation.                            | High     | L      | High   | #10          |
| 12  | ✅     | **Droid schema + factory**                   | Droid is a separate character-kind definition with character-compatible identity/traits, built-in equipment, and a damage track instead of sentient health.                                               | High     | L      | High   | #2, #4       |
| 13  | ✅     | **Droid sheet blocks**                       | A definition-owned character capability maps droid damage/equipment into the standard Base, Attributes, Skills, Advantages, Resolve, Body, and Other block composition without changing persisted fields. | High     | L      | High   | #12          |
| 14  | ✅     | **Document type selection in creation flow** | The Star Wars creation dialog offers character, droid, creature, vehicle, and fodder-group definitions and creates the selected schema defaults.                                                          | Medium   | M      | High   | #10, #12     |

---

### Epic: Sheet Composition Standardization

Keep the UI hierarchy enforceable as new systems and document families are added.

| #   | Status | Task                                     | Description                                                                                                                                                                                                                                                       | Priority | Effort | Impact | Dependencies |
| --- | ------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------ | ------------ |
| 24  | ✅     | **Define element-scale boundaries**      | Atoms are store-free controls/stat fields; molecules accept values/callbacks; blocks adapt capabilities; views compose blocks; shells own collection and active-view behavior.                                                                                    | Critical | S      | High   | #7           |
| 25  | ✅     | **Brief view as a standard capability**  | Every built-in Star Wars definition registers `brief`; compact fields, ratings, resources, and condition tracks provide consistent styling. The retired `npc-card` ID remains a compatibility alias.                                                              | High     | M      | High   | #7, #10, #12 |
| 26  | ✅     | **Split special full-sheet organisms**   | Creature, vehicle, and fodder organisms live in one view module per document; the retired droid implementation was removed with the monolith.                                                                                                                     | High     | M      | High   | #24          |
| 27  | ⬜     | **Definition-owned block configuration** | Replace remaining label/track conditionals inside shared blocks with typed definition capability configuration where more than two variants need the same interaction.                                                                                            | Medium   | M      | Medium | #24          |
| 28  | 🟡     | **Composition regression coverage**      | Add component tests for full/brief view selection, character capability adapters, custom traits embedded in groups, and organic/mechanical condition labels. Brief character composition and custom-trait embedding are covered; full-view organisms are not yet. | High     | M      | High   | #24, #25     |

---

### Epic: Additional System Plugins

New TTRPG systems implemented as plugins.

| #   | Status | Task                                    | Description                                                                                                                                                                                              | Priority | Effort | Impact | Dependencies   |
| --- | ------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------ | -------------- |
| 15  | ⬜     | **Generic / Custom Notes system**       | A "blank" system plugin: no predefined attributes or skills — just name, description, free-form notes, and a custom trait list (user-defined key-value pairs). Acts as fallback for unsupported systems. | Medium   | M      | Medium | #1, #2, #3, #4 |
| 16  | ⬜     | **D&D 5e plugin**                       | 6 abilities (STR/DEX/CON/INT/WIS/CHA), skills (Acrobatics, Arcana, etc.), HP/AC/initiative, class features, spell slots, equipment, XP/level.                                                            | Low      | XL     | Medium | #1, #2, #3     |
| 17  | ⬜     | **WoD / Chronicles of Darkness plugin** | 9 attributes (same as Star Wars but without Force), 24+ skills, Virtues/Morality, Willpower, Health (7-level), Merits/Flaws.                                                                             | Low      | L      | Medium | #1, #2, #3     |
| 18  | ⬜     | **Cyberpunk RED plugin**                | 9 stats (INT/REF/DEX/TECH/COOL/WILL/LUCK/MOVE/BODY), skills, HP, humanity/empathy, armor SP, cyberware, gear.                                                                                            | Low      | XL     | Low    | #1, #2, #3     |

---

### Epic: UI — System-Aware Shell

UX improvements that make multi-system support visible to the user.

| #   | Status | Task                                    | Description                                                                                                                                                          | Priority | Effort | Impact | Dependencies |
| --- | ------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------ | ------------ |
| 19  | ⬜     | **New Character wizard**                | Step 1: pick system (Star Wars WoD, D&D 5e, Custom…). Step 2: pick character type within system (if applicable). Step 3: enter name. Generates appropriate defaults. | Medium   | M      | High   | #3, #14      |
| 20  | ⬜     | **Character Manager — system badges**   | Show system icon/badge per character row. Allow filtering by system. Show system in the currently loaded indicator.                                                  | Medium   | S      | Medium | #3           |
| 21  | ⬜     | **Metadata `setting` → system-derived** | Replace free-text `setting` with computed field from the system plugin ID + optional user subtitle. Display as badge.                                                | Low      | S      | Low    | #3           |

---

### Epic: Import/Export & Migration

Before the multi-system envelope migration, version the current persisted state:

- [x] Add Zustand `version` and `migrate`, validate after migration, and preserve failed entries in a bounded recovery collection. Add fixtures for future released shapes as they appear.
- [ ] Add import-conflict component tests covering Replace, Duplicate, Cancel, multiple files, malformed JSON, and blank names.
- [ ] Add viewer-context tests for every block and persistence hydration/failure tests.
- [x] Keep HTTPS portrait URLs with an explicit privacy warning and store resized local portraits as bounded IndexedDB blobs. Device-local blob IDs are omitted from JSON exports.
- [ ] When authentication/backend storage exists, add opt-in portrait upload, ownership checks, deletion, quotas, content sniffing, and migration from device-local blobs. Never expose storage credentials or accept arbitrary server-side URL fetching.

| #   | Status | Task                                                 | Description                                                                                                                                                                                              | Priority | Effort | Impact   | Dependencies |
| --- | ------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | -------- | ------------ |
| 22  | ✅     | **Migration path for existing Star Wars characters** | Legacy `BaseCharacterSchema` records are wrapped into Star Wars envelopes; legacy droids select the droid definition, payload IDs are removed, and invalid entries are preserved for recovery.           | High     | M      | Critical | #2, #3, #4   |
| 23  | 🟡     | **Bulk import with system detection**                | Multi-file import supports explicit current envelopes plus the untagged legacy character shape. Additional legacy fingerprints and recovery export UI remain to be added as more systems are introduced. | Low      | M      | Medium   | #3, #15      |

---

### Epic: Custom Page Templates (feature 003)

User-authored declarative page templates: sections → blocks → typed fields, optional data-catalog
bindings with copy-on-select auto-fill, per-document page assignment, local template library, and
JSON import/export. Spec: `specs/003-custom-sheet-templates/spec.md`.

| #    | Status | Task                                 | Description                                                                                                                                                  | Priority | Effort | Impact | Dependencies |
| ---- | ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------ | ------ | ------------ |
| T-1  | ✅     | **Template contracts + stores**      | Catalog-binding schema on select fields; `templateValues` envelope bag (store v1→v2); `templateStore` library CRUD with quarantine; `resolveCustomTemplate`. | High     | M      | High   | #2, #3       |
| T-2  | ✅     | **Template authoring (US1)**         | Starter skeletons, template editor dialog (draft + explicit save/discard), library dialog grouped by document kind.                                          | High     | L      | High   | T-1          |
| T-3  | ✅     | **Declarative page rendering (US2)** | Field controls, `DeclarativeSheetView` (fields/table blocks), page routing with stale-template fallback, merged page selector.                               | High     | L      | High   | T-1, T-2     |
| T-4  | ✅     | **Catalog bindings (US3)**           | Registry of bindable catalogs with closed fillable-detail sets; binding editor; copy-on-select runtime; unavailable-catalog degradation.                     | High     | L      | High   | T-2, T-3     |
| T-05 | ✅     | **Template import/export (US4)**     | `ttgamer-template` v1 file wrapper, export naming, validation-first import with Replace/Duplicate/Cancel and degradation report.                             | Medium   | M      | Medium | T-2, T-4     |
