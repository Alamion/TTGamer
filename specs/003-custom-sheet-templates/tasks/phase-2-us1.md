# Phase 3: User Story 1 — Author a custom template (T012–T017)

Parent: [tasks.md](../tasks.md) · Priority: P1 · 🎯 MVP

**Goal**: Users can create a template from a base (empty / built-in-style skeleton / duplicate), compose sections → blocks → typed fields with live integrity feedback, and save it into their library.

**Independent Test**: Create a template from a chosen base, add a section with fields, save, reopen — structure persists exactly; invalid configs are rejected naming the offending item.

- [x] T012 [P] [US1] Create starter skeletons in `src/sheet_manager/features/sheet/data/templateSkeletons.ts`: one declarative `CustomTemplate` per document kind approximating the built-in page's section structure (fresh kebab ids on copy, within `TEMPLATE_LIMITS`); skeletons are data, never executable
- [x] T013 [P] [US1] Create editor building blocks in `src/sheet_manager/components/dialogs/template-editor/` (`SectionListEditor`, `BlockEditor` for fields/table, `FieldEditor` with per-type settings: text multiline, number bounds, options list editor, rating min/max/presentation, resource bounds, reference kinds; reorder controls)
- [x] T014 [US1] Create `src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx`: local draft state seeded from base (empty / skeleton / duplicate / edit), Radix modal (labelled, focus trap, Escape closes, focus restored), live integrity feedback on every edit (duplicate ids, limits, bounds — message names the item), explicit Save → `CustomTemplateSchema.parse` → `templateStore.saveTemplate`, Discard/close-with-changes confirmation (depends on T006, T013)
- [x] T015 [US1] Create `src/sheet_manager/components/dialogs/TemplateLibraryDialog.tsx` (library grouped by document kind; create-from-base including skeletons; edit, duplicate, delete via existing `ConfirmDialog`; export hook point) and `src/sheet_manager/features/sheet/shell/TemplateManagerButton.tsx` wired into `src/sheet_manager/features/sheet/shell/SheetToolbar.tsx` (depends on T014)
- [x] T016 [US1] Add en+ru strings for library/editor chrome to `translations/source/en/ui/sheet/templates.yaml` + `translations/source/ru/ui/sheet/templates.yaml`; run `yarn build:translations` (depends on T014, T015)
- [x] T017 [US1] Component tests in `tests/sheet_manager/template-editor.test.tsx`: create from each base, save persists the exact structure, duplicate-id/limit rejection names the offending item, unsaved-changes close prompts confirmation and cancel leaves the saved template untouched (depends on T014)

**Checkpoint**: A user can author, save, duplicate, and delete templates with zero rendering involved — spec US1 fully testable.
