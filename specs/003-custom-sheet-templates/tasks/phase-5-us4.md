# Phase 6: User Story 4 — Import and export templates as JSON (T032–T036)

Parent: [tasks.md](../tasks.md) · Priority: P3

**Goal**: Saved templates export to self-describing JSON files and import with validation-first, atomic semantics: wrapper + schema checks, catalog degradation, identity-collision Replace / Duplicate / Cancel reusing the established conflict dialog.

**Independent Test**: Export a template, delete it locally, import the file — an identical template (structure + bindings) is restored; invalid files are rejected with a specific reason and zero mutation.

- [x] T032 [P] [US4] Create the pure transfer module `src/sheet_manager/features/sheet/shell/templateFile.ts`: `serializeTemplateFile(template)` → `{ format: 'ttgamer-template', formatVersion: 1, template }`; `parseTemplateFile(json)` → wrapper checks (`format` literal, `formatVersion` — newer rejects with "made by a newer version", older migrates or rejects), `CustomTemplateSchema.parse`, catalog availability scan → `{ ok, template, degradedCatalogFields } | { error }`; `buildTemplateFilename(id)` → `ttgamer_template_<id>.json` (depends on T003)
- [x] T033 [P] [US4] Contract tests in `tests/sheet_manager/template-file.test.ts` per `contracts/template-file-format.md`: export→import round trip reproduces the template identically; rejection matrix (bad `format`, unsupported version, schema violation — no partial state); degradation path with an unavailable `catalogId`; filename convention (depends on T032)
- [x] T034 [US4] Wire export into `src/sheet_manager/components/dialogs/TemplateLibraryDialog.tsx`: saved templates only (drafts never exportable), Blob download named via `buildTemplateFilename` (depends on T015, T032)
- [x] T035 [US4] Create `src/sheet_manager/components/dialogs/TemplateImportDialog.tsx`: file read → `parseTemplateFile` → degradation report (affected field labels) → on identity collision reuse `ImportConflictDialog` patterns (Replace / Duplicate-new-id / Cancel, applied completely or not at all) → `templateStore.saveTemplate`; Cancel guarantees zero mutation (depends on T032, T015)
- [x] T036 [US4] Add en+ru strings for import/export, degradation report, and conflict copy to `translations/source/{en,ru}/ui/sheet/templates.yaml`; run `yarn build:translations` (depends on T034, T035)

**Checkpoint**: Spec US4 fully testable; the whole feature loop (author → use → bind → share) is complete.
