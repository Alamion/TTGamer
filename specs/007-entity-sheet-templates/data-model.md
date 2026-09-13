# Data Model: Entity Sheet Templates and Docs Embed Migration

Phase 1 output. Decisions referenced as R# are in [research.md](./research.md).

## 1. Document data (system-owned, `systems/star-wars-wod/schema.ts`)

Existing shapes are unchanged (FR-008). One additive field:

| Kind             | Field         | Type          | Parse default | Create default | Rule                                                                          |
| ---------------- | ------------- | ------------- | ------------- | -------------- | ----------------------------------------------------------------------------- |
| `group` (fodder) | `trackLength` | `3 \| 5 \| 7` | `7`           | `3`            | Visible health levels per member (R3). No `schemaVersion` bump; no `migrate`. |

Unchanged but newly **bound** (R1): creature `name, species, type, scale, size, owner, attributes, abilities, willpower, armor, attacks, notes, members[].health`; vehicle `name, model, owner, scale, crew, length, cargoCapacity, passengers, consumables, durability, maneuverability, speed, altitude, communicationsSensors, sensorRange, hyperdrive, navigationComputer, shields, frontShields, rearShields, configuration, weapons (incl. arc), notes, members[].damage`; group `concept, notes, attributes, abilities, willpower, armor, weapons, members[].health, trackLength`.

Validation: every lens write goes through `updateDocumentData`, which re-parses with the kind schema; a rejected write reports `template-value-write-rejected` and leaves data unchanged.

## 2. Template values (value bag, `document.templateValues`)

Extensions only (FR-004). Coordinates are kebab-case, shared by the kind's full and brief templates.

| Kind     | Coordinate                                                                  | Shape                                             | Notes                                                  |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| creature | `species-catalog`                                                           | select (catalog `creatures`)                      | Picking overwrites mapped targets (R4).                |
| creature | `threat-tier`                                                               | select `fodder` \| `named`                        | Default `named` when unset. Drives `visibleWhen` (R5). |
| creature | `movement`                                                                  | text                                              | Catalog-filled.                                        |
| creature | `creature-merits` / `creature-flaws`                                        | value list `{label, value?}`                      | Catalog-filled (replace entries).                      |
| creature | `description`                                                               | text (multiline)                                  | Catalog-filled.                                        |
| creature | `source`                                                                    | text                                              | Catalog-filled.                                        |
| vehicle  | `model-catalog`                                                             | select (catalog `vehicles`)                       | Overwrites mapped targets.                             |
| vehicle  | `category`                                                                  | text                                              | Catalog-filled.                                        |
| vehicle  | `durability-reroll`                                                         | toggle                                            | Catalog-filled.                                        |
| vehicle  | `vehicle-systems`                                                           | table, 10 rows: `system` text, `damaged` toggle   | R7.                                                    |
| vehicle  | `crew-pilot`, `crew-copilot`, `crew-engineer`, `crew-sensors`, `crew-comms` | reference (single, `character`)                   | R6.                                                    |
| vehicle  | `crew-gunners`                                                              | reference (multiple, `character`)                 | R6.                                                    |
| vehicle  | `vehicle-modifications`                                                     | table: `name` text, `effect` text, `quirk` toggle | R7.                                                    |
| vehicle  | `description`                                                               | text (multiline)                                  | Catalog-filled.                                        |
| group    | `quick-pool-specialty`, `quick-pool-secondary`                              | number 0–10                                       | Quick NPC Rolls.                                       |
| group    | `leader`                                                                    | reference (single, `character`)                   | R6.                                                    |

Derived (never stored): creature/group `soak` = `stamina + armor-rating` (formula, R5).

## 3. Binding descriptors (new: data lens)

```text
DataLensBinding
  key            e.g. "field:scale", "trait:strength", "table:attacks", "track:members-health"
  documentKinds  set of kinds (creature | vehicle | group)
  path           property path inside document.data (e.g. ["attributes","Strength"])
  shape          text | number | dots | pair | enum | list | rows | cohort-track
  options?       enum options (id, labelMessage) — scale, arc
  numeric?       numeric reading for formulas (e.g. leading signed integer of "+3D")
  cohort?        { membersPath, trackKey, trackId, lengthPath? }
  rows?          { columns: [{ key, shape, options? }] }
```

Rules: descriptors are declared by the system module only; the template schema stores just `bindingKey`; unknown or kind-mismatched keys degrade to a labeled placeholder with `binding-unresolved` (existing behavior).

## 4. Template node additions (`types/template.ts`, schema version stays 3)

| Addition       | On                                    | Shape                                                         | Semantics                                                                                                                                                                                                                                                     |
| -------------- | ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visibleWhen`  | any node                              | `{ coordinate: string, equals: string \| number \| boolean }` | Rendered only when the resolved coordinate value equals `equals` (unset values compare against the field's default); the template editor always shows the node with a condition badge. An unknown coordinate hides the node and reports `binding-unresolved`. |
| `cohort`       | `primitive`                           | `{ maxMembers: 1–24, lengthFrom?: coordinate }`               | Only valid with a `cohort-track` binding.                                                                                                                                                                                                                     |
| table-row fill | `select` field inside `table.columns` | `binding.fills[*].targetFieldId` may name a sibling column id | Fill writes that row only.                                                                                                                                                                                                                                    |

Because these are additive optional properties, existing v3 templates stay valid; no quarantine.

## 5. Cohort track state

```text
Member { id, label (A..X), marks: ConditionMark[7] }
visibleLevels = variant(trackLength)  // 3 | 5 | 7 → level ids + penalties
penalty(member) = penalty of the highest marked visible level (null → 0)
defeated(member) = last visible level marked

Transitions
  add member        members < maxMembers → append { label: next letter, marks: empty }
  remove member     members > 1; if any mark → confirm → remove
  mark level i      i < visibleLevels.length → set stored slot i
  change length     new < old and marks beyond new → confirm →
                    marks[newLen-1] = max severity of slots ≥ newLen-1; slots ≥ newLen cleared
  single member     no letter shown
```

Level variants (fodder, R3): `3` = Hurt −1, Injured −2, Incapacitated · `5` = Bruised, Hurt −1, Injured −2, Wounded −3, Incapacitated · `7` = Bruised … Incapacitated. Creatures use `7` health; vehicles use `7` vehicle-damage (Cosmetic … Wrecked).

## 6. Views and templates (per kind)

| Definition     | Kind       | Views (default first)              | Legacy ids                      |
| -------------- | ---------- | ---------------------------------- | ------------------------------- |
| `creature`     | `creature` | `creature-sheet`, `creature-brief` | brief view: `brief`, `npc-card` |
| `vehicle`      | `vehicle`  | `vehicle-sheet`, `vehicle-brief`   | brief view: `brief`, `npc-card` |
| `fodder-group` | `group`    | `fodder-sheet`, `fodder-brief`     | brief view: `brief`, `npc-card` |

Every view has a shipped template with the same id and kind (asserted by test). The `built-in` layout type is removed.

## 7. Example documents (`systems/star-wars-wod/examples.ts`)

| Id                                     | Kind     | Used by                                    | Content source                                    |
| -------------------------------------- | -------- | ------------------------------------------ | ------------------------------------------------- |
| `wampa::preset`                        | creature | Creature & NPC Mechanics — Wampa (full)    | page table                                        |
| `stormtrooper-squad::preset`           | group    | same page — Stormtrooper (brief)           | page stat block; 4 members, mixed marks, length 3 |
| `red-five::preset`                     | vehicle  | Traits & Systems — X-wing (full)           | page table                                        |
| `lukes-landspeeder::preset`            | vehicle  | same page (brief)                          | page table                                        |
| `millennium-falcon::preset`            | vehicle  | same page (brief)                          | page table                                        |
| `vehicleDamagePreviewDocument(levels)` | vehicle  | Durability, Damage & Repair — damage track | generated                                         |

All ids end in `::preset` (store refuses writes); each parses with its kind schema in tests.

## 8. Diagnostics (`sheet_manager/diagnostics.ts`)

| Code                                                                                                                        | New?     | When                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `template-fallback`                                                                                                         | new      | Document falls back: missing/mismatched user template, unknown view id, missing shipped template. |
| `reference-target-missing`                                                                                                  | new      | Reference value names no existing document.                                                       |
| `catalog-detail-out-of-range`                                                                                               | new      | Adapter clamps a catalog value (e.g. dots > 5).                                                   |
| `binding-unresolved`, `template-value-write-rejected`, `catalog-unavailable`, `formula-error`, `template-reference-invalid` | existing | Reused as before.                                                                                 |
