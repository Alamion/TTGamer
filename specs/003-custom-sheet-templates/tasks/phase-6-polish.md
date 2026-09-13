# Phase 7: Polish & Cross-Cutting Concerns (T037–T040)

Parent: [tasks.md](../tasks.md)

**Purpose**: Governance gates, accessibility floor, and backlog hygiene after all stories land.

- [x] T037 Run `yarn build:translations` and `yarn validate:i18n` — every feature string present in both `translations/source/en/ui/sheet/templates.yaml` and `translations/source/ru/ui/sheet/templates.yaml`; no generated `ttgamer.*` entries hand-edited
- [x] T038 [P] Accessibility + dark-mode audit across `src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx`, `TemplateLibraryDialog.tsx`, `TemplateImportDialog.tsx`, and `src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx`: icon-only actions have `aria-label`, table headers `scope="col"`, collapsibles expose `aria-expanded`, errors use `role="alert"`, dialogs label/trap-focus/restore-focus, keyboard-only pass, dark mode parity
- [x] T039 [P] Update `src/sheet_manager/TODO.md` (mark delivered slices; record deferred follow-ups: draft auto-recovery, per-binding live-linked mode, embedding built-in blocks) and mirror the new structure/rules into `src/sheet_manager/AGENTS.md` (declarative renderer, `templateStore`, `templateValues`, catalog binding registry) — English-only
- [x] T040 Walk `specs/003-custom-sheet-templates/quickstart.md` scenarios 1–5 end-to-end on the dev server; then run `yarn verify` (Tier 2 — schema/persistence/import paths were touched) and confirm green
