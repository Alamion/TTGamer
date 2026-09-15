---
name: sheet-manager
description: Deep reference for the universal document/sheet manager — document envelope and system registry, capability adapters, character schema, store architecture, and import/export flow.
---

# Sheet Manager — Deep Reference

## Architecture (canonical)

`src/sheet_manager/AGENTS.md` is the authoritative module map and composition-scale rulebook
(atom → molecule → block → view → shell). Read it before structural changes. This skill adds
the data-layer detail.

- Documents are polymorphic envelopes: `{ id, kind, systemId, definitionId, schemaVersion,
metadata, data }` (see `types/document.ts`).
- `systems/registry.ts` (`SystemRegistry`) owns lookup, duplicate detection, version checks,
  migration dispatch, and schema validation. `parseDocument()` is the boundary for every
  imported or persisted entry.
- Definitions (`systems/types.ts`) own schema, default factory, views, a translated `label`
  descriptor, optional `capabilities`, `migrate`, and `module` (`{ id, policies }`).
- Plugins (`SystemPlugin`) carry a translated `label`, `policies` (publisher policy ids),
  `catalogs` (declared with `systems/catalogs.ts`), `defaultTemplates`, and `templateBindings`.
  Registered plugins: `star-wars-wod` (`systems/star-wars-wod/`) and `v5`
  (`systems/v5/`). The registry rejects view ids shared by two systems and unknown policy ids,
  and exposes `listDefinitions()` (create dialog) and `getSystem()`.
- **Layering (constitution I).** `v5` is a _ruleset_ plugin: `systems/v5/ruleset/` owns the
  shared V5 mechanics (profile, `V5CoreShape` schema, core bindings, page parts) and
  `systems/v5/modules/<line>/` adds a supernatural module (hunter today). A module extends
  `V5CoreShape`, appends its own bindings, catalogs, and templates, and names itself in
  `DocumentDefinition.module.id` (independent of the definition id, so NPC definitions can share
  a module). Until T-041, `systemId` means _ruleset_ for `v5` but _ruleset + setting_ for
  `star-wars-wod`; T-041 introduces explicit ruleset/setting/module fields.
- **Publisher policies (constitution VIII).** `systems/policies.ts` holds `PUBLISHER_POLICIES`
  (`dark-pack`: verbatim notice, own-words explanation, URL, `badge`, `aboutPage`).
  `resolveDocumentPolicies()` = system policies ∪ module policies. `SheetWorkspace` renders only
  `<PolicyBadges>` bottom-left below the active page (outside every template), linking to
  `aboutPage`; the full statement is `<PolicyStatement>` on that single docs page; exports carry
  a `notices` array. Other docs pages carry nothing. Strings live in
  `translations/source/*/ui/sheet/policies.yaml`.
- `capabilities.character` (`systems/capabilities.ts`) adapts a payload to the shared
  `BaseCharacter` interface: `read(documentId, data)` for display, `applyUpdates(data,
updates)` for writes. The droid capability maps persisted `damage` ↔ `health` and
  `builtInEquipment` ↔ `inventory` without renaming stored fields.
- Shared views route by capability presence (`definition.capabilities?.character`), never by
  `definitionId` string matching. View labels are definition-owned translation descriptors
  (`DocumentViewLabel`), consumed by `ViewModeSelect` via `translate(view.label)`.

## Document Schema Details

- `types/character.ts` — `BaseCharacterSchema` (shared character payload): metadata (with
  `type: sentient|droid|vehicle`), trait records (`TraitValueSchema` = value + flags +
  specializationText), resources, `forcePowerItems` (single Force-power representation),
  equipment arrays, custom skills (`customTalents/customSkills/customKnowledges`), health.
- `systems/star-wars-wod/schema.ts` — definition payloads:
    - `StarWarsCharacterDataSchema` = BaseCharacter minus `id`, metadata `type: 'sentient'`.
    - `DroidDataSchema` = BaseCharacter minus `id/forceSkills/health`, plus
      `builtInEquipment: Item[]` and `damage` (7-level track).
    - `CreatureDataSchema` / `VehicleDataSchema` / `FodderDataSchema` — flat non-character
      payloads; cohort members carry per-member `health`/`damage` tracks.
- `createDefaultCharacter()` produces a fully initialized sentient; per-definition factories
  wrap it (`createDefaultDroidData()` etc.).
- `systems/v5/ruleset/schema.ts` — `V5CoreShape`: `name`, `attributes` (9 keys, 1–5),
  `skills` (27 kebab keys, 0–5 with `specializationText` ≤ 200), `health` and `willpower`
  condition tracks (`{ levels: ConditionMark[] ≤ 15, bonus −5…10 }`; slash = Superficial,
  cross = Aggravated; pre-release count drafts migrate in the schema),
  `advantages` / `flaws` (merit-flaw entries `{ id, label, points 1–5 }`), `touchstones`
  (`{ id, name, conviction }`), `experience`, `chronicleTenets`, `weapons` / `inventory`
  (the shared `WeaponItem` / `Item` schemas; draft `equipment` text migrates to one item),
  `metadata` (portrait: `portraitId` / `imageUrl`, as every system), `notes`,
  `biography`. Limits in `V5_LIMITS`.
- `systems/v5/modules/hunter/schema.ts` — `HunterSchema` = core + `concept`, `creed`, `drive`,
  `ambition`, `desire`, `redemption`, `creedFields`, `edges` (`{ id, name, note }` ≤ 20),
  `perks` (`{ id, name, edge, note }` ≤ 60; a picked book Perk fills its Edge name), `despair`, and the cell
  values `desperation` / `danger` (0–5, per-hunter copies until cells exist). Example document:
  `modules/hunter/example.ts` (Lena Varga, used by docs).
- IDs are opaque non-empty strings (presets use stable textual IDs). Zod strips unknown keys;
  do not `.passthrough()` without a migration reason.

## Store Architecture

`store/documentStore.ts` — Zustand 5 + `persist` (async localForage storage, IndexedDB):

- Storage key `'universal-character-storage'`, `version: 3`, `migrate: migrateDocumentStoreState`.
- State: `documents[]`, `currentDocumentId`, bounded `recoveryEntries` (max 100).
- Envelopes also carry the flat `templateValues` bag; templates, defaults, formulas, and the
  template write path are documented in `.agents/skills/sheet-templates/SKILL.md`.
- `migrateDocumentStoreState()` accepts both envelope collections and legacy
  `{ characters: [...] }` shapes; legacy characters are wrapped via `wrapLegacyCharacter()`
  (droids map `inventory → builtInEquipment`, `health → damage`); failed entries land in
  recovery, never silently dropped.
- Mutations re-parse through the owning definition: `updateDocumentData(id, updater)` runs
  `definition.schema.parse(updater(data))`.
- Preset documents (`isPresetId`) are immutable.

## Component Data Flow

1. `features/sheet/CharacterSheet.tsx` renders `SheetWorkspace` (shell: toolbar, create/manage
   dialogs, import/export, view select) around `CurrentDocumentSheet`.
2. `CurrentDocumentSheet` renders an assigned custom template, else the effective default
   template for the view (`resolveDocumentView()` honors `legacyIds`, e.g. `npc-card → brief`,
   then `resolveEffectiveTemplate`). Every view is a shipped template; there is no built-in
   React layout path. Details: `sheet-templates` skill.
3. Bound template elements read and write through `useBoundDocument()`
   (`features/sheet/declarative/boundDocument.ts`): character documents via their
   `capabilities.character`, every other kind via its typed `document.data`; read-only context
   ignores writes. Star Wars equipment sections still use `useCharacter()`; `dataKey` equipment bindings
   edit the bound document directly.
4. Shipped pages: character/droid full (base → attributes → skills → advantages →
   force/resolve → body → other) and brief; creature, vehicle, and fodder group full and brief
   pages (`systems/star-wars-wod/templates/`).
5. Custom talents/skills/knowledges render inside their ability group column (bound lists in
   the character templates) — never as separate top-level sections.

## Import/Export Flow

Pure file logic in `features/sheet/shell/documentFile.ts`, wired in `SheetWorkspace.tsx`:

- **Export:** `serializeDocumentExport()` — the envelope with device images and `portraitId`
  stripped, plus `notices` when the document's policies are non-empty; filename
  `exportFileName()` = `ttgamer_<title|definitionId>.json`.
- **Import:** `parseImportedDocument()` — `systemRegistry.parseDocument()` (unknown keys such as
  `notices` stripped); untagged legacy character JSON falls back to the legacy wrapper; ID
  collisions offer Replace / Duplicate (new ID) / Cancel (`ImportConflictDialog`). A readable
  file that fails validation shows an error toast and is kept via
  `retainImportForRecovery()` (reports `document-recovered`).

## Derived Stats Formulas

| Stat                         | Formula                                         |
| ---------------------------- | ----------------------------------------------- |
| Minimum Willpower            | `Passion + Self Control` (clamped to 10)        |
| Minimum Dark Side Resistance | `5 + Conscience - Passion` (clamped to 0–10)    |
| Initiative (Standard)        | `Wits + Alertness`                              |
| Initiative (Lightsaber)      | `Initiative (Standard) + Control (Force Skill)` |
| Jumping Distance             | `×min(Control, Telekinesis)`                    |
| Running Speed                | `×min(Control, Telekinesis)`                    |

Virtues provide the minimum values (`minFrom`) for the editable Willpower and Dark Side
Resistance resources in the character template's Force section; merits/flaws may raise them.
The other formulas are read-only formula fields in its Other section
(`systems/star-wars-wod/templates/character.ts`). `calculateHealthPenalty()` (`types/character.ts`)
returns the deepest marked level's penalty (Bruised 0 → Crippled −5; Incapacitated none).

## Testing Notes

- Component tests need Docusaurus stubs: `vitest.config.ts` aliases
  `@docusaurus/Translate` and `@docusaurus/useDocusaurusContext` to `tests/stubs/`. Render
  with `createElement()` if the suite avoids JSX parsing quirks.
- V5 tests live in `tests/sheet_manager/systems/v5/` (schema, full/brief renders, sheet
  coverage of the printed sheet, re-skin, document files, ruleset/module boundaries); generic
  catalog-registry, and policy-notice tests stay in
  `tests/sheet_manager/`.
- Composition regression coverage: `primitive-parity.test.tsx` and `entity-templates.test.tsx`
  (shipped pages render without degradation), `document-system.test.ts` (registry, migrations,
  view aliases, template-backed views).
- Run `yarn verify` for schema/persistence/import changes; `yarn verify:fast` plus targeted
  tests otherwise.
