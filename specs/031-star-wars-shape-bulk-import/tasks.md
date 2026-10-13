# Tasks: Star Wars Shape in Its Plugin and Bulk Import

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order follows design.md "Approach": US1 (the move; US2 builds the legacy repair on the new
Star Wars schema), US2, then US3 (needs the batch pipeline and the retained-record shape).

## User Story 1 - Star Wars character shape lives in its plugin (P1)

**Check**: the parse, page, dice, and import parity suites pass with no changed expectation; no
generic file imports `star-wars-wod` outside the allowed importers.

- [x] T001 [US1] Write `tests/sheet_manager/boundaries.test.ts`: no file under `src/` outside
      `systems/`, `docsEmbeds.tsx`, and `store/documentStore.ts` imports `systems/star-wars-wod` or
      `systems/wod2e` (design Tests); run it first and note which files fail today
- [x] T002 [US1] Create `src/sheet_manager/types/trait.ts` (`TraitValueSchema`, modifiers,
      `DEFAULT_ATTRIBUTE_VALUE`, `DEFAULT_SKILL_VALUE`), `types/condition.ts`
      (`ConditionMarkSchema`, `ConditionMark`), and `types/equipment.ts` (`ItemSchema`,
      `ArmorItemSchema`, `WeaponItemSchema`, `ImplantItemSchema` and their types), copied unchanged
      from `types/character.ts`
- [x] T003 [US1] Move the engine pieces into `src/sheet_manager/systems/wod2e/ruleset/`:
      `HEALTH_LEVELS`, `HealthSchema`, `calculateHealthPenalty`, backgrounds, merits and flaws,
      custom skills, the resource pair, the engine metadata, and the engine default; make
      `ruleset/schema.ts` the source of the engine schema instead of omitting from
      `BaseCharacterSchema`; update `ruleset/profile.ts`
- [x] T004 [US1] Move the setting pieces into `src/sheet_manager/systems/star-wars-wod/schema.ts`:
      metadata with `type`/`template`/`species`/`homeWorld`, force skills, Force points, dark side,
      force powers, implants; the character schema as engine shape plus setting shape (field names
      and defaults unchanged); `createDefaultCharacter()`; move `data/presets.ts` beside it
- [x] T005 [US1] Add `CharacterView` to `src/sheet_manager/systems/capabilities.ts` (`id`,
      `metadata.name`, `inventory`, `armor`, `weapons`, `implants`) and use it in
      `CharacterDocumentCapability`, `hooks/useCharacter.ts`, `context/CharacterContext.tsx`,
      `features/sheet/declarative/boundDocument.ts`, and `features/sheet/hooks/useBodyHandlers.ts`;
      give `integrations/docs-character-rolls/CharRoll.tsx` a local type of the two maps it reads
- [x] T006 [US1] Repoint the remaining importers of `types/character` (body sections,
      `declarative/primitives.tsx`, `cohort.ts`, `trackLength.ts`, `trackerModel.ts`,
      `BuiltInTracker.tsx`, `CompactSheetFields.tsx`, `docsEmbeds.tsx`,
      `systems/v5/ruleset/schema.ts`, `star-wars-wod/{index,examples,characterDocument}.ts`) and the
      12 test files that import it; keep the flat legacy schema in
      `star-wars-wod/characterDocument.ts` for now; delete `types/character.ts`
- [x] T007 [US1] Run `yarn verify` (schema and persistence edits) and commit:
      `refactor(sheet): Star Wars character shape moves into its system folders (spec 031, US1)`

## User Story 2 - Old exports import, in bulk (P2)

**Check**: a mixed batch (envelope, old export, broken file) imports every valid file, repairs the
old export without losing a value, and ends with one summary.

- [ ] T008 [US2] Add `tests/sheet_manager/fixtures/legacy-export-first-version.json` (the real
      export, character name replaced, player text kept) and write
      `tests/sheet_manager/legacy-export.test.ts`: it parses into the Star Wars system with every
      value intact, reports the armor-name and Willpower repairs, raises Force points the same way,
      and a weapon with ammo above its maximum still rejects (FR-004, FR-005, SC-003)
- [ ] T009 [US2] Write `tests/sheet_manager/legacy-export-end.test.ts`: fails after
      `LEGACY_EXPORT_END` with a message to delete the module, its fixture, its tests, and its
      guidance; with a faked date after the end, the importer rejects the old shape with the
      end-of-support reason (FR-013, edge cases)
- [ ] T010 [US2] Create `src/sheet_manager/systems/star-wars-wod/legacyExport.ts`: the flat legacy
      schema, `repairLegacyExport(raw)` returning the character and its repairs, and
      `LEGACY_EXPORT_END = '2027-04-13'`; make `characterDocumentFromBase` and the migration in
      `store/documentStore.ts` use it; remove the old schema from `characterDocument.ts`
- [ ] T011 [US2] Write `tests/sheet_manager/import-batch.test.ts`: mixed batch, one summary with
      counts and rejected names and reasons, valid files imported around invalid ones, an envelope
      that also looks like an old export read as the envelope, collisions asked per file and applied
      to the rest when chosen, the choice not carried to the next batch (FR-003, FR-006, FR-007,
      FR-008, SC-002)
- [ ] T012 [US2] Create `src/sheet_manager/features/sheet/shell/importBatch.ts` (no React): classify
      each parsed file (envelope, legacy export, otherwise reject), collect outcomes and repairs,
      keep rejected content for recovery; use it from `SheetWorkspace.tsx` `handleImport` and remove
      the inline loop; keep the embedded user type install order
- [ ] T013 [US2] Add the "apply to the rest of the batch" checkbox to the import-conflict dialog in
      `src/sheet_manager/components/dialogs/` and `ImportSummaryDialog` beside it (Radix dialog,
      labelled, focus trap, Escape, `role="alert"` on rejected reasons); show the dialog when
      anything was repaired or rejected, a toast otherwise; add en and ru strings under
      `translations/source`
- [ ] T014 [US2] Run `yarn verify` (import and persistence edits) and commit:
      `feat(import): old exports import with repairs, one summary per batch (spec 031, US2)`

## User Story 3 - Recover rejected files (P3)

**Check**: a rejected file is downloaded in the recovery file, fixed, imported back, and the count
drops to zero.

- [ ] T015 [US3] Write `tests/sheet_manager/recovery-file.test.ts`: record shape and the Zod schema
      of the file; old raw retained entries read back as records; export strips `portraitId`; a
      fixed record imports through the batch and is not retained again; a record that still fails is
      kept with its new reason; a full collection is reported; the recovery file is never stored as
      a document (FR-009, FR-010, FR-014, SC-004)
- [ ] T016 [US3] Add the recovery record and file schemas in
      `src/sheet_manager/features/sheet/shell/recoveryFile.ts`; make
      `retainImportForRecovery(entry, error)` in `store/documentStore.ts` write
      `{ ttgRecovery: 1, content, reason, at }`; add `clearRecoveryEntries()`; read both shapes
- [ ] T017 [US3] Teach `importBatch.ts` to recognize a recovery file and retry each record as an
      independent file; report a full collection in the summary
- [ ] T018 [US3] Add a "Rejected files (N)" section with Download and Clear (confirmation through
      the existing confirm dialog, icon buttons labelled) to the document manager in
      `src/sheet_manager/components/dialogs/`; file name `ttgamer_recovery_<date>.json`; en and ru
      strings; component test for count, download, and confirmed clear (FR-009, FR-012, SC-005)
- [ ] T019 [US3] Run `yarn verify` and commit:
      `feat(import): download, retry, and clear rejected files (spec 031, US3)`

## Finish

- [ ] T020 Update the guidance, one owner per rule: `src/sheet_manager/AGENTS.md` ("Schema and
      Import/Export": the legacy path, its end date, the recovery file, the shape's new homes),
      `.agents/skills/sheet-manager/SKILL.md`, root `AGENTS.md` §8 (the `BaseCharacterSchema`
      sentence), and the same sentence in constitution principle II (ask the maintainer first); the
      user guide en + ru where file import is described (search `docs/` for it); mark T-098 and
      T-103 done in `TODO.md` with a dated note and add a backlog entry to delete the legacy module
      after 2027-04-13
- [ ] T021 Run `yarn verify:full`; walk the steps in design.md "Manual walk"; record results in
      design.md
