# Design: Star Wars Shape in Its Plugin and Bulk Import

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-13

## Approach

Three stories, three commits, in this order: the shape move (US1), the importer (US2), the recovery
file (US3). US1 is a pure refactor guarded by the parity suites that exist today
(`tests/sheet_manager/systems/wod2e/`, `zod-baseline`, `import-export`); no assertion changes.
`types/character.ts` is deleted: its parts go where their owners are, following the layering rule
(ruleset = mechanics, setting = flavor):

- **Neutral atoms stay in `types/`** because generic code reads them: `types/trait.ts`
  (`TraitValue`, modifiers, the default ratings), `types/condition.ts` (`ConditionMark`),
  `types/equipment.ts` (`Item`, `ArmorItem`, `WeaponItem`, `ImplantItem` and their schemas; V5
  already imports two).
- **`systems/wod2e/ruleset/`** takes the engine character: health levels and the health penalty
  (`calculateHealthPenalty`), `HealthSchema`, backgrounds, merits and flaws, custom skills, the
  resource pair, the engine metadata, and the engine default. Its schema stops being derived from
  the Star Wars one and becomes the source.
- **`systems/star-wars-wod/`** takes what is Star Wars: metadata with `type`/`species`/`homeWorld`,
  force skills, Force points, dark side, force powers, implants, `createDefaultCharacter()`, the
  presets, and the character schema, built as the engine shape plus the setting shape.
- **Generic code** reads the character through a small structural `CharacterView` in
  `systems/capabilities.ts` (`id`, `metadata.name`, the four equipment lists), not through a Star
  Wars type.

## Decisions

- **D1 — engine vs setting split**: the move follows the existing ruleset/setting layering, so the
  spec's "Star Wars plugin" is met by the Star Wars folder plus the WoD 2e ruleset beneath it.
  _Why_: a pure move of everything into `star-wars-wod/` would make the engine schema import the
  setting (an inverted dependency that exists today). _Rejected_: all into `star-wars-wod/` — keeps
  the inversion and forces `wod2e` to import its own setting.
- **D2 — `CharacterView` instead of a Star Wars type in generic code**: the capability returns the
  view generic code needs; Star Wars returns its full character, which satisfies it. _Why_: generic
  files read only `id`, `metadata.name`, and the equipment lists (checked by search). _Rejected_:
  re-exporting the Star Wars type from a generic file — hides the dependency, not removes it.
- **D3 — one legacy module with an end date**: `systems/star-wars-wod/legacyExport.ts` owns the old
  flat schema, `repairLegacyExport(raw)` (returns the character and a list of repairs), and
  `LEGACY_EXPORT_END = '2027-04-13'`. The persisted-store migration and the importer both call it.
  _Why_: one place to delete (FR-013). _Rejected_: repair inside the importer only — the stored
  `characters` path breaks the same way.
- **D4 — repairs** (FR-005): armor without `name` takes its old `type`; a current value above its
  maximum raises the maximum, for Willpower and Force points only. Every other refinement failure
  stays a rejection. _Why_: only these two are proven by the real export; more rules are guesses.
- **D5 — one batch pipeline**: `features/sheet/shell/importBatch.ts` (no React) takes the files'
  parsed JSON and returns per-file outcomes; `SheetWorkspace` keeps only the dialogs. Order per
  file: recovery file → expand its records; envelope; legacy export (until its end); otherwise
  reject. The envelope wins when a file is both (spec edge case).
- **D6 — recovery record, no store bump**: new retained entries are
  `{ ttgRecovery: 1, content, reason, at }`; older retained entries are raw values and are wrapped
  on read (`reason: ''`, `at` unknown). _Why_: the store version stays 4, nothing to migrate.
  _Rejected_: a v5 migration — risk without need.
- **D7 — recovery file**: `{ ttgRecovery: 1, records: [...] }`, named
  `ttgamer_recovery_<date>.json`, recognized by the marker key, retried through D5 (FR-014);
  `portraitId` is stripped as in document export; a record that imports is not retained again.
- **D8 — summary and conflicts**: a dialog (`ImportSummaryDialog`) when anything was repaired or
  rejected, a toast otherwise; the collision dialog gets an "apply to the rest of the batch"
  checkbox whose state lives in the batch only.

## Changed types and data

- Deleted: `types/character.ts`. Added: `types/trait.ts`, `types/condition.ts`,
  `types/equipment.ts`; `BaseCharacter`/`BaseCharacterSchema` become `StarWarsCharacter*` in
  `systems/star-wars-wod/schema.ts`, and the flat legacy schema lives in `legacyExport.ts`.
- `systems/capabilities.ts`: `CharacterView`; `CharacterDocumentCapability` uses it.
- `store/documentStore.ts`: `recoveryEntries` entries gain the D6 record shape;
  `retainImportForRecovery(entry, error)` writes it; new `clearRecoveryEntries()`. No persisted
  version change, no stored document changes (FR-002).
- Translations (en, ru): summary, recovery section, collision checkbox, repair names.
- Docs/guidance: `src/sheet_manager/AGENTS.md` ("Schema and Import/Export" and the legacy end date),
  sheet-manager skill, root `AGENTS.md` §8 ("`BaseCharacterSchema` is only the legacy path"),
  constitution II wording for the same sentence.

## Principles at risk

- **I (semi-autonomy)**: generic code stops importing a Star Wars shape; the ESLint pattern for
  `systems/<system>/` is the check, plus a test that greps nothing generic imports `star-wars-wod`
  outside the allowed files.
- **II (contracts)**: the recovery file has its own Zod schema; imports still validate against the
  registered definition before anything is stored; the legacy path stays the only schema that strips
  unknown fields.
- **VI (accessible)**: summary and recovery controls are Radix dialogs with labels, focus trap,
  Escape; icon buttons carry `aria-label`; errors use `role="alert"`.
- **VII (performance)**: the batch is processed file by file; no work added to first load.

## Tests

- Existing parity suites unchanged (SC-001); `tests/sheet_manager/boundaries.test.ts`: no generic
  file imports `star-wars-wod` outside the allowed importers.
- `legacy-export.test.ts`: the real export (name removed) imports with every value intact (SC-003),
  reports both repairs; unrelated refinement failures still reject.
- `legacy-export-end.test.ts`: fails after `LEGACY_EXPORT_END`, saying what to delete (FR-013); and
  the importer rejects the old shape with the end-of-support reason after it (fake date).
- `import-batch.test.ts`: mixed batch (envelope, old export, broken, recovery file), one summary,
  valid files imported, collisions with and without apply-to-rest, rejected kept (FR-006, FR-008).
- `recovery-file.test.ts`: round trip is lossless and strips `portraitId`; retry of a fixed record
  imports it and does not retain it again; full collection reports it (SC-004).
- Component tests: manager shows count, download, confirmed clear; summary dialog focus and keys.
- `documentStore` migration test: old raw retained entries still read.

## Manual walk

1. Import the real old export with two current exports → three documents; summary lists the two
   repairs on the old one.
2. Import a text file with broken JSON among valid files → valid ones import, one summary names it.
3. Open the document manager → "Rejected files (1)"; download; edit the file to fix it; import it →
   the document appears and the count drops to 0.
4. Import 3 files that collide with stored ids, tick "apply to the rest" on the first → one prompt.
5. Reload the page with documents of every kind → all open, with the same numbers as before.

## Implementation notes

- **US1, neutral rated entries**: `CustomSkill`, background, and merit/flaw schemas live in
  `types/trait.ts` (not `wod2e`), because generic `primitives.tsx` reads their types.
- **US1, `CharacterView`** also carries `attributes`, `skills`, `health` (the docs roll link reads
  the first two; the droid capability maps `health`) and `metadata.type` (`useBodyHandlers` treats
  droids as mechanical). Capability methods use method syntax so a system may accept its own
  narrower update type.
- **US1, key order** of the flat Star Wars character and its metadata is written out explicitly: the
  Zod baseline snapshot compares parse-output key order.
- `data/presets.ts` moved to `systems/star-wars-wod/presets.ts`; `StarWarsSettingShape` moved from
  the WoD 2e ruleset to the Star Wars schema (it is the setting's, not the engine's).
