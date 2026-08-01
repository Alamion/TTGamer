# TODO

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.
Each task includes: name, description, priority, effort, impact, and dependencies.

---

## Legend

- ✅ **DONE** — fully implemented
- 🟡 **IN PROGRESS** — partially implemented
- ⬜ **NOT DONE** — not started

---

## Multi-System Character Sheet Support

### Epic: Multi-System Foundation

Core architecture to decouple the sheet manager from Star Wars WoD and support arbitrary TTRPG systems.

| #   | Status | Task                                        | Description                                                                                                                                                                                                                                           | Priority | Effort        | Impact                                          | Dependencies |
| --- | ------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- | ----------------------------------------------- | ------------ | --- | ------ | ------ |
| 1   | ⬜     | **Define `SystemPlugin` interface**         | Create `src/sheet_manager/systems/registry.ts` with `SystemPlugin` interface: `id`, `label`, `schema`, `createDefault()`, `blocks[]`, `deriveStats()`, `healthModel`, resource pools, attribute/skill templates.                                      | Critical | M             | Epic                                            | —            |
| 2   | ⬜     | **Polymorphic character schema**            | Replace monolithic `BaseCharacterSchema` with `z.discriminatedUnion('system', [...])`. Shared fields stay on root (`id`, `metadata`, `notes`); system-specific data goes into a `systemData: Record<string, unknown>` or per-system Zod union branch. | Critical | L             | Epic                                            | #1           |
| 3   | ⬜     | **System registry singleton**               | Map of system ID → `SystemPlugin`. Used by store, import/export, and sheet renderer to dispatch to the correct schema, factory, and blocks.                                                                                                           | Critical | S             | Epic                                            | #1           |
| 4   | ⬜     | **Extract Star Wars WoD as first plugin**   | Move current schema fields (`forceSkills`, `virtues`, `darkSideResistance`, etc.), `createDefaultCharacter()`, block list, derived stats into `src/sheet_manager/systems/star-wars-wod/`. No behavioral change — just extraction.                     | Critical | M             | Epic                                            | #1, #2, #3   |
| 5   | ⬜     | **Update store for polymorphic characters** | `CharacterState` stores `CharacterDocument[]` (generic envelope). CRUD operations unchanged but work through system dispatch.                                                                                                                         | High     | M             | Epic                                            | #2, #3       |
| 6   | ⬜     | **Update import/export**                    | Import reads `system` field → dispatches to correct Zod schema from registry. Export includes system discriminator. Graceful error for unknown systems.                                                                                               | High     | M             | High                                            | #2, #3, #4   |
| 7   | ⬜     | **Sheet renders from block registry**       | `CharacterSheet.tsx` iterates `systemPlugin.blocks` instead of hardcoding block order. Each block receives system-typed data.                                                                                                                         | High     | S             | High                                            | #1, #4       |
| 8   | ⬜     | **`useTraitUpdater` becomes generic**       | Replace fixed `TraitPath` (`'attributes'                                                                                                                                                                                                              | 'skills' | 'forceSkills' | 'virtues'`) with paths driven by system schema. | Medium       | M   | Medium | #1, #4 |
| 9   | ⬜     | **`StatDot` maxValue becomes configurable** | Accept `maxValue` from parent (default 5 for WoD, 18 for D&D abilities, 10 for Cyberpunk).                                                                                                                                                            | Medium   | S             | Medium                                          | —            |

---

### Epic: Star Wars — Vehicle & Droid Sheets

Vehicle and droid-specific layouts within the Star Wars WoD system.

| #   | Status | Task                                          | Description                                                                                                                                                                                                              | Priority | Effort | Impact | Dependencies |
| --- | ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------ | ------ | ------------ |
| 10  | ⬜     | **Vehicle schema + factory**                  | Fields: hyperdrive rating, hull integrity, shield rating, speed, maneuverability, crew/passengers/cargo, nav computer, weapons systems (linked to weapon data), modifications. Extends `systemData` for `star-wars-wod`. | High     | L      | High   | #2, #4       |
| 11  | ⬜     | **Vehicle sheet blocks**                      | Render hull/shield trackers, crew manifest, cargo manifest, weapon mounts, maneuverability stats, sensor range. Reuses `DataTable`, `StatDot`, and catalog hooks.                                                        | High     | L      | High   | #10          |
| 12  | ⬜     | **Droid schema + factory**                    | Fields: model, serial number, processor class, memory capacity, tool/weapon mounts, droid personality, restricted material flags. Droid Force block is hidden; Programming/Repair/Interfaces become primary skills.      | High     | L      | High   | #2, #4       |
| 13  | ⬜     | **Droid sheet blocks**                        | Processor/memory trackers, tool mount list, skill emphasis (Tech skills promoted), no Virtues/Willpower/Force. Droid-specific "personality" quirks.                                                                      | High     | L      | High   | #12          |
| 14  | ⬜     | **Character type selection in creation flow** | When creating a new Star Wars character, prompt for type (sentient/droid/vehicle) → generate appropriate defaults. Metadata `type` field drives block visibility within the system plugin.                               | Medium   | M      | High   | #10, #12     |

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

| #   | Status | Task                                                 | Description                                                                                                                                                                           | Priority | Effort | Impact   | Dependencies |
| --- | ------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | -------- | ------------ |
| 22  | ⬜     | **Migration path for existing Star Wars characters** | Characters stored in IndexedDB have the old `BaseCharacterSchema` shape. Need a one-time migration that wraps them into the new `system: 'star-wars-wod'` envelope without data loss. | High     | M      | Critical | #2, #3, #4   |
| 23  | ⬜     | **Bulk import with system detection**                | On import, try each registered system's schema and pick the first that validates. Fall back to "Custom Notes" if nothing matches.                                                     | Low      | M      | Medium   | #3, #15      |
