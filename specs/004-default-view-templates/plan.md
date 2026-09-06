# Implementation Plan: Built-in Views as Default Templates

**Branch**: `004-default-view-templates` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-default-view-templates/spec.md`

## Summary

Make built-in views template-backed. Two mechanisms: (1) templates gain a third block type — a
ready-made interactive block placement referencing a system-registered page part (character header,
attributes, skills, advantages, Force, body/health, other, brief card, specialized document pages)
— so a template can reproduce any built-in page, including mixes of full- and brief-composition
elements; (2) every registered view is exposed as a **default template**: an ordinary template
derived from the view definition (never migrated, no special-case mapping — the view id is the
default template's identity), editable in place via a persisted override, undeletable, always
resettable to the registry-defined original, badged "default" and marked when modified.

## Technical Context

**Language/Version**: TypeScript 6 (strict, no `any`) on React 19; Docusaurus 3.10 site

**Primary Dependencies**: Zustand 5 (+ persist), Zod, localForage (IndexedDB), Tailwind CSS 3,
clsx, Lucide-react, Radix UI primitives, Vitest

**Storage**: Browser IndexedDB via localForage through Zustand persist — one new persisted
"default template overrides" slice in the template store; per-document template values travel in
the existing document envelope (unchanged from spec-003)

**Testing**: Vitest (`yarn test`); schema/persistence changes run the `yarn verify` tier

**Target Platform**: Modern evergreen browsers (static Docusaurus app, all logic client-side)

**Project Type**: Web SPA module inside a Docusaurus site (`/universal_sheet` route)

**Performance Goals**: Default templates render with no perceptible delay versus today's built-in
views; library responsive with ≥ 50 templates including defaults; editing shows no degradation at
max template size (40 sections × 50 blocks × 60 fields)

**Constraints**: Local-first (no backend); no user code in templates; ready-made blocks render
through the existing built-in block components (no reimplementation); async non-blocking
persistence; en/ru strings via `translations/source` YAML pipeline; no new heavy deps

**Scale/Scope**: Single user per device, dozens of templates, documents in the hundreds; feature
spans `src/sheet_manager/` (types, systems, features/sheet, store, components/dialogs) plus
`translations/source/` and `tests/`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                  | Verdict | Notes                                                                                                                                                                                                                                     |
| ------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                   | PASS    | Everything lives inside `sheet_manager`. Default templates derive from the system registry (the single owner of view definitions); no cross-module reach, no new cross-system conditionals.                                               |
| II. Explicit Contracts at Boundaries       | PASS    | `TemplateBlockSchema` gains a `built-in` variant — additive contract change with round-trip + import tests. Default-template overrides persist through the validated `CustomTemplateSchema` only; unknown fields stripped, never trusted. |
| III. Pleasurable Cross-Module Interactions | PASS    | Degrades gracefully: unknown/unavailable ready-made block → labeled placeholder + notice; reset → confirm dialog; modified defaults → visible marker. No dead ends.                                                                       |
| IV. Fit-for-Purpose Code Quality           | PASS    | New override slice is single-responsibility in the existing template store; strict TS, no `any`; reuse ConfirmDialog patterns; existing limits reused as invariants.                                                                      |
| V. Risk-Proportional Testing               | PASS    | Schema/persistence edits → `yarn verify` tier: round-trip, import with unknown blocks, override persistence/reset, default-template derivation, parity tests (default template renders identically to built-in view).                     |
| VI. Consistent, Accessible Experience      | PASS    | A11y floor for editor/library additions; all strings en+ru via YAML canonical sources; default-template labels are registry data (translated), user edits are user data (not translated).                                                 |
| VII. Performance as a Shared Budget        | PASS    | No new dependencies; defaults derive lazily from registry (zero storage cost unless modified); ready-made blocks reuse existing components; values stay sparse in the shared bag.                                                         |

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-default-view-templates/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions & rationale
├── data-model.md        # Phase 1 output — entities, validation, state
├── quickstart.md        # Phase 1 output — end-to-end validation guide
├── contracts/
│   ├── template-block-extensions.md   # built-in block placement + default template file/identity contract
│   └── default-template-override.md   # override store shape, reset semantics, selector merge
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/sheet_manager/
├── types/
│   └── template.ts               # EXISTS — TemplateBlockSchema gains { type: 'built-in' } variant
│                                 #           + builtInBlockId, accentColor fields
├── systems/
│   ├── types.ts                  # EXISTS — DocumentViewDefinition unchanged (derivation source)
│   └── view.ts                   # EXISTS — + default-template derivation helper:
│                                 #   viewToDefaultTemplate(view, systemId, kind) → CustomTemplate
├── store/
│   └── templateStore.ts          # EXISTS — + persisted overrides map (defaultId → CustomTemplate),
│                                 #   setDefaultOverride / clearDefaultOverride (reset) actions;
│                                 #   removeTemplate refuses default ids; duplicateTemplate keeps content
├── features/sheet/
│   ├── declarative/
│   │   ├── DeclarativeSheetView.tsx   # EXISTS — renders { type: 'built-in' } blocks via
│   │   │                              #   builtInBlockRegistry; unknown block → placeholder + notice
│   │   └── hooks.ts              # EXISTS — unchanged (ready-made blocks use document data directly)
│   ├── registry/
│   ├── builtInBlockRegistry.ts   # EXISTS — per-system ready-made block lookup + availability check
│   └── shell/
│       ├── ViewModeSelect.tsx    # EXISTS — merged list: default templates (view ids) + custom
│       │                         #   templates (tpl:<id>), exactly one entry per page
│       └── SheetWorkspace.tsx    # EXISTS — assignment unchanged (templateId = view id for defaults)
├── components/
│   └── dialogs/                  # EXTEND TemplateEditorDialog: block-type picker includes
│                                 #   ready-made blocks (per-system availability); TemplateLibrary:
│                                 #   default badge, modified marker, reset, duplicate; no delete
└── translations/source/          # UPDATED YAML — badges, reset confirmation, placeholder strings (en+ru)

tests/sheet_manager/              # NEW: built-in block schema round-trip, default derivation,
                                  # override persist/reset, selector merge, import with unknown
                                  # blocks, view↔default-template rendering parity
```

**Structure Decision**: single-project layout, all feature code inside the existing
`src/sheet_manager` module; no new top-level directories. Design artifacts in
`specs/004-default-view-templates/`.

## Post-Design Constitution Re-Check (Phase 1)

- Default-template derivation reads only the system registry (its declared purpose); overrides
  persist through the same validated schema as custom templates — no new boundary, no entanglement.
- The `built-in` template block variant is additive: existing templates parse unchanged, unknown
  block ids degrade to placeholders (never throw at render), import validation precedes apply.
- Ready-made blocks reuse the exact components built-in views use — rendering parity is by
  construction, verified by parity tests rather than duplicated markup.
- All gates above remain PASS after design.

## Complexity Tracking

> No constitution violations to justify — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
