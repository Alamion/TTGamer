# Implementation Plan: Custom Character Page Templates

**Branch**: `003-custom-sheet-templates` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-custom-sheet-templates/spec.md`

## Summary

Add user-authored declarative page templates to the sheet manager: authors compose pages from
sections → blocks (field groups / tables) → typed fields, optionally binding a choice field to a
data catalog with copy-on-select auto-fill; documents can select any compatible template as their
active page; templates persist locally, are editable as draft-until-saved, and import/export as
JSON with the established validation-first, replace/duplicate/cancel flow.

Technical approach: the codebase already pre-seeded the seams — `systems/types.ts` defines
`DeclarativeDocumentLayout { template: CustomTemplate }` alongside built-in layouts,
`types/document.ts` metadata already carries `templateId`, and `types/template.ts` owns the
declarative schema (`CustomTemplateSchema`, `TEMPLATE_LIMITS`). This plan fills the missing
management layer: a dedicated template library store, a declarative renderer + field-control
registry, view resolution honoring `metadata.templateId`, envelope-level per-document template
values, a sheet-local catalog-binding adapter registry, and template import/export in the shell.

## Amendments (2026-09-03)

The shared-value store and system-scoping decisions (D1–D4 in
[clarifications-shared-values.md](./clarifications-shared-values.md)) supersede parts of this
plan and of [research.md](./research.md): R2's per-template nested bag is replaced by one
flat document-scoped bag keyed by `valueKey` (store v1→v3 migration, FR-25/FR-28); R3's
page assignment gains system+kind compatibility (FR-26); the file format is v2 with
`systemId` (FR-29). Normative requirements: spec.md FR-25–FR-29; updated design detail:
[data-model.md](./data-model.md) and [contracts/store-and-envelope.md](./contracts/store-and-envelope.md).
Sections below retain the original text for history.

## Technical Context

**Language/Version**: TypeScript 6 (strict, no `any`) on React 19; Docusaurus 3.10 site

**Primary Dependencies**: Zustand 5 (+ persist), Zod, localForage (IndexedDB), Tailwind CSS 3,
clsx, Lucide-react, Radix UI primitives, Vitest

**Storage**: Browser IndexedDB via localForage through Zustand persist — one new store key for
the template library; per-document template values travel inside the existing document envelope

**Testing**: Vitest (`yarn test`); schema/persistence/import changes run `yarn verify`

**Target Platform**: Modern evergreen browsers (site is a static Docusaurus app; all logic client-side)

**Project Type**: Web SPA module inside a Docusaurus site (`/universal_sheet` route)

**Performance Goals**: Library stays responsive with ≥ 50 templates; declarative page render and
catalog auto-fill feel instantaneous (no perceptible delay) at max template size
(40 sections × 50 blocks × 60 fields limits)

**Constraints**: Local-first (no backend); no user code in templates (declarative data only);
async non-blocking persistence; en/ru UI strings via `translations/source` YAML pipeline;
bundle-budget awareness (no new heavy deps — everything reuses existing stack)

**Scale/Scope**: Single user per device, dozens of templates, documents in the hundreds; feature
spans `src/sheet_manager/` (store, types, features/sheet, components/dialogs) plus
`translations/source/` and `tests/`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                  | Verdict       | Notes                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                   | PASS          | Everything lives inside `sheet_manager` (store, types, features, dialogs) + `translations/source`. `data/` catalogs are consumed through a sheet-local adapter registry (precedent: `features/sheet/data/bodyEquipmentCatalogs.ts`); no reaching into other module internals, no cross-system conditionals.                                                                                        |
| II. Explicit Contracts at Boundaries       | PASS w/ gates | Envelope gains an optional generic `templateValues` bag — a contract change: requires store version bump + migration and round-trip tests on both sides (documented in contracts/store-and-envelope.md). Template import/export validates through `CustomTemplateSchema`; unknown fields stripped, never trusted. Catalog binding is a declared closed contract per catalog (fillable detail set). |
| III. Pleasurable Cross-Module Interactions | PASS          | Degrades gracefully: missing template → default page + notice; missing catalog → manual choice field + explicit list of affected fields; unsaved draft → confirm-before-discard. Handoff states declared in contracts.                                                                                                                                                                             |
| IV. Fit-for-Purpose Code Quality           | PASS          | New store is single-responsibility (templates only, never documents); strict TS, no `any`; Radix for dialog behavior; Tailwind + clsx; existing limits reused as invariants.                                                                                                                                                                                                                       |
| V. Risk-Proportional Testing               | PASS          | Schema/persistence/import edits → `yarn verify` tier: round-trip, import (legacy strip), migration integration tests; renderer/editor get targeted component tests; validators (`validate:data`) untouched.                                                                                                                                                                                        |
| VI. Consistent, Accessible Experience      | PASS          | A11y floor (aria-labels, `role="alert"`, keyboard, focus-trapped Radix dialogs); all UI strings through YAML canonical sources in en+ru; authored template labels are user data — not translated; spec/docs English-only.                                                                                                                                                                          |
| VII. Performance as a Shared Budget        | PASS          | No new dependencies; no heavy assets; declarative render is plain composition; persistence async through existing middleware; values stored sparse (only filled fields) so orphan retention costs nothing.                                                                                                                                                                                         |

No violations. Post-design re-check: see bottom of this file.

## Project Structure

### Documentation (this feature)

```text
specs/003-custom-sheet-templates/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions & rationale
├── data-model.md        # Phase 1 output — entities, validation, state
├── quickstart.md        # Phase 1 output — end-to-end validation guide
├── contracts/           # Phase 1 output — interface contracts
│   ├── template-file-format.md
│   ├── catalog-binding.md
│   └── store-and-envelope.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/sheet_manager/
├── types/
│   ├── template.ts               # EXISTS — CustomTemplateSchema, limits; gains binding schema
│   ├── document.ts               # EXISTS — metadata.templateId; envelope gains templateValues
│   └── templateValues.ts         # NEW — value-shape schema per field type (strict at write path)
├── store/
│   ├── documentStore.ts          # EXISTS — + migration (v1→v2), templateValues update action
│   └── templateStore.ts          # NEW — Zustand+persist library CRUD (not documents)
├── systems/
│   ├── types.ts                  # EXISTS — DeclarativeDocumentLayout already defined
│   └── view.ts                   # EXISTS — + custom-template-aware resolution helper
├── features/sheet/
│   ├── CharacterSheet.tsx        # EXISTS — route: custom template → declarative renderer
│   ├── declarative/              # NEW — renderer for sections/blocks/fields
│   │   ├── DeclarativeSheetView.tsx
│   │   ├── FieldsBlock.tsx
│   │   ├── TableBlock.tsx
│   │   └── hooks.ts              # useTemplatePage: template + values + write path
│   ├── registry/
│   │   └── declarativeFieldRegistry.ts   # NEW — field type → control component
│   ├── data/
│   │   └── catalogBindings.ts    # NEW — closed per-catalog fillable-detail contract + defaults
│   └── shell/
│       ├── ViewModeSelect.tsx    # EXISTS — + template page entries / assignment
│       ├── SheetWorkspace.tsx    # EXISTS — + template import/export wiring
│       └── TemplateManagerButton.tsx     # NEW — library entry point
├── components/
│   ├── dialogs/                  # NEW dialogs: TemplateEditorDialog, TemplateImportDialog
│   │                             # (reuse ConfirmDialog + ImportConflictDialog patterns)
│   └── controls/                 # NEW small controls for editor (field-type select, etc.)
└── TODO.md                       # updated as slices land

translations/source/              # NEW/UPDATED YAML — editor, library, import/export strings (en+ru)
tests/sheet_manager/              # NEW: templateStore, templateValues round-trip/migration,
                                  # declarative renderer, catalog binding, import/export contract
```

**Structure Decision**: single-project layout, all feature code inside the existing
`src/sheet_manager` module per its AGENTS.md composition scale (atoms → molecules → blocks →
views → shells); no new top-level directories, no new packages. Design artifacts in
`specs/003-custom-sheet-templates/`.

## Complexity Tracking

> No constitution violations to justify — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |

## Post-Design Constitution Re-Check (Phase 1)

- Boundary contract change (envelope `templateValues`) is the only cross-cutting edit; it is
  additive/optional (`default({})`), migration covered in `contracts/store-and-envelope.md`, and
  existing documents parse unchanged — no breaking behavior for current data.
- View resolution keeps definition-owned built-ins untouched; custom pages are a strictly
  additional resolution branch, so no module entanglement introduced by the renderer.
- Catalog binding adapters declare closed fillable-detail sets — the catalog side stays the
  single owner of what is bindable (Principle II), and the template stores only ids/remaps.
- All gates above remain PASS after design.
