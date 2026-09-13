# Phase 4: User Story 2 — Use a custom template as a character's page (T018–T025)

Parent: [tasks.md](../tasks.md) · Priority: P2

**Goal**: A compatible custom template renders as the document's active page; values persist per document; built-in pages coexist; read-only contexts work; stale assignments degrade gracefully.

**Independent Test**: Assign a saved template to a character, fill fields, reload — same page and values return; switching pages keeps values.

- [x] T018 [P] [US2] Create field control atoms in `src/sheet_manager/features/sheet/declarative/fieldControls.tsx` for every field type — text (short/multiline), number (bounds), toggle, select (single/multi), rating (`dots`/`boxes`/`number`), resource (`current`/`max`), reference (existing document picker) — props `(field, value, onChange, { disabled })`, no store reads (composition-scale atoms), a11y-labelled
- [x] T019 [P] [US2] Create `src/sheet_manager/features/sheet/registry/declarativeFieldRegistry.ts` mapping `field.type` → control component (depends on T018)
- [x] T020 [US2] Create `src/sheet_manager/features/sheet/declarative/hooks.ts` — `useTemplatePage(templateId)`: template resolution via `resolveCustomTemplate`, sparse values read, `setValue`/`setRowValue` routing through the strict `updateTemplateValues` write path, `readOnly` from the viewer context, `status: 'none' | 'ready' | 'missing'` (depends on T007, T008, T019)
- [x] T021 [US2] Create `src/sheet_manager/features/sheet/declarative/FieldsBlock.tsx`, `TableBlock.tsx` (rows within `minRows`/`maxRows`, add/remove row), `DeclarativeSheetView.tsx` (sections → blocks → fields in order, columns 1–4, soft-required markers per FR-4a, orphaned values tolerated) (depends on T019, T020)
- [x] T022 [US2] Wire custom page routing in `src/sheet_manager/features/sheet/CharacterSheet.tsx`: try `resolveCustomTemplate` first; `missing` → built-in resolution plus a persistent fallback notice (`role="alert"`, re-pointable assignment per FR-13); `undefined` → existing path untouched (depends on T021)
- [x] T023 [US2] Merge template pages into the page selector in `src/sheet_manager/features/sheet/shell/ViewModeSelect.tsx` (built-ins + compatible templates; selecting a template sets `metadata.templateId`, selecting a built-in clears it and sets `preferredViewId`) and complete assignment wiring in `src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx`, including the FR-4a export note listing unfilled required fields (depends on T020)
- [x] T024 [US2] Add en+ru strings for the page selector, fallback notice, and required markers to `translations/source/{en,ru}/ui/sheet/templates.yaml`; run `yarn build:translations` (depends on T021, T022, T023)
- [x] T025 [US2] Component tests in `tests/sheet_manager/declarative-sheet.test.tsx`: render order matches the template, each field type writes through and persists, page-switch round trip retains values, read-only context disables edits, orphaned values are invisible but preserved (and return when the field is re-added), stale `templateId` shows the fallback notice (depends on T021, T022)

**Checkpoint**: Spec US2 fully testable against any saved template (US1's or a fixture).
