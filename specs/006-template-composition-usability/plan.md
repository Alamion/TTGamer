# Implementation Plan: Template Composition Usability

**Branch**: `006-template-composition-usability` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-template-composition-usability/spec.md`

## Summary

Rework the declarative template system from a fixed hierarchy (section → fields-block →
fields) into a **recursive composition model** where sections, field groups, fields, tables,
custom lists, images, and system-bound primitives are placeable at any depth (guarded at 10).
The editor gets unambiguous collapse-vs-reorder affordances (drag handle vs chevron); view
rendering adopts the built-in presentation language (section = collapsible block without
background, field group = titled surface card, opt-in collapsibility with remembered state).
A pure arithmetic **formula engine** over the unified value-coordinate space powers derived
read-only fields and formula-bound maxima (template ratings and system resources such as
Willpower / Force Points, with display-time and write-time clamping). Custom lists become
first-class anywhere-placed elements with their own value coordinate or a system-list binding.
The remaining character-card content (Force powers, merits/flaws, catalog-backed equipment,
per-document image) becomes expressible through first-class elements; shipped default
templates are rebuilt from scratch against the pre-template built-in viewer presentation with
zero legacy placements; pre-feature user templates are retired into the existing quarantine
(no migration while there is no user base).

## Technical Context

**Language/Version**: TypeScript (strict, no `any`) on React 19; Docusaurus 3.10 site

**Primary Dependencies**: Zod (schemas), Zustand 5 + persist/localForage (IndexedDB),
Tailwind CSS 3 + clsx, Lucide icons, Radix primitives; no new runtime dependencies planned
(native HTML5 drag events for reordering)

**Storage**: IndexedDB via localForage — template library store (`universal-template-storage`,
version 2 → 3) and the existing device-local image store (`persistence/portraitStorage.ts`,
reused for template image fields)

**Testing**: Vitest (`tests/sheet_manager/*`, Docusaurus stubs per `vitest.config.ts`);
validators `validate:data`, `validate:i18n`, `build:translations` for their domains

**Target Platform**: Web (Docusaurus SPA pages), dark-mode capable, offline-first

**Project Type**: Single-repo web application feature inside the `sheet_manager` module

**Performance Goals**: derived/clamped values update within one interaction (SC-005) —
formula resolution memoized per render pass; deep nesting (10 levels, ~200 nodes) renders
without noticeable lag; no new heavy dependencies on the critical path

**Constraints**: templates are declarative data (no executable user code); system-agnostic
template schema (binding knowledge stays in system modules); local-first persistence with
parse-on-write; pre-feature user templates retired, not migrated; images device-local and
excluded from JSON exports

**Scale/Scope**: ~7 user stories, one module (`sheet_manager`) + YAML translation sources;
template schema becomes recursive (schema version 3), one new pure formula module, editor
draft model rewritten to tree operations

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                  | Verdict | Notes                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                   | PASS    | Template schema stays system-agnostic; new binding kinds (force powers, merits/flaws, equipment, list catalogs) live in the owning system module's registry; formula evaluator is a pure module inside `sheet_manager`; no shared/ or cross-module reach-through.                     |
| II. Explicit Contracts at Boundaries       | PASS    | Template file format bumps to schema version 3; store migration retires old-shape entries into the existing bounded quarantine (never silently dropped); write-path value validation extended for list/image values; YAML translation gates unchanged.                                |
| III. Pleasurable Cross-Module Interactions | PASS    | Every degradation path is specified (unknown bindings, missing formula sources, invalid formulas, insecure images, retired templates → built-in page + notice); no dead ends.                                                                                                         |
| IV. Fit-for-Purpose Code Quality           | PASS    | Formula evaluator: pure, deterministic, side-effect-free (dice-logic standard); store changes keep single-responsibility + migrate function; UI reuses proven molecules (CollapsibleBlock, SectionCard, TraitRow, CustomTraitList/MeritFlawList, section sections) instead of clones. |
| V. Risk-Proportional Testing               | PASS    | Schema/persistence tier (`yarn verify`) at every checkpoint: exhaustive formula unit tests, store-migration retirement tests, clamp/dependency tests, editor interaction tests, defaults parity tests, degradation tests.                                                             |
| VI. Consistent, Accessible Experience      | PASS    | All new strings via `translations/source` (en + ru, `build:translations` + `validate:i18n`); a11y floor: `aria-expanded` on every collapsible, labeled controls, keyboard-operable collapse/reorder, `role="alert"` errors; distinct collapse/reorder affordances.                    |
| VII. Performance as a Shared Budget        | PASS    | No new dependencies (native drag events); formula evaluation memoized and allocation-light; image blobs stay in IndexedDB (async), never in Zustand JSON; `yarn verify:full` once for the new shared/UI surface (bundle review).                                                      |

Post-design re-check: **no violations** — see Complexity Tracking (empty).

## Project Structure

### Documentation (this feature)

```text
specs/006-template-composition-usability/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── template-node-model.md
│   ├── formula-grammar.md
│   └── binding-registry-v2.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created here)
```

### Source Code (repository root)

```text
src/sheet_manager/
├── types/
│   ├── template.ts                  # REWRITE: recursive TemplateNode union, depth/node limits, schema v3
│   └── templateValues.ts            # EXTEND: list + image value shapes (write-path validation)
├── store/
│   └── templateStore.ts             # v2→v3 migration: retire old-shape templates/overrides to quarantine
├── persistence/
│   └── portraitStorage.ts           # REUSE as the device-local image store for template image fields
├── features/sheet/declarative/
│   ├── DeclarativeSheetView.tsx     # REWRITE: recursive renderer (sections/groups/columns/leaves)
│   ├── formula.ts                   # NEW: pure arithmetic evaluator + dependency graph + cycle detection
│   ├── hooks.ts                     # EXTEND: unified coordinate space, clamps, list operations, formula values
│   ├── fieldControls.tsx            # EXTEND: image control, read-only formula display, dynamic-max rating
│   └── primitives.tsx               # EXTEND: force-powers/merits/flaws/equipment primitives, resource maxFormula
├── components/dialogs/template-editor/
│   ├── draft.ts                     # REWRITE: recursive tree ops (insert/move/remove subtree, depth checks)
│   ├── ElementEditor.tsx            # NEW (replaces SectionEditor/BlockEditor): recursive node editor,
│   │                                #   grip drag handle + distinct collapse chevron, per-container add palette
│   └── FieldEditor.tsx              # EXTEND: image/formula/dynamic-max config panels
├── components/sections/
│   └── DocumentSheetSections.tsx    # EXTEND: CustomTraitsEditor/MeritFlawList columns 1..4 (parameterized)
├── systems/star-wars-wod/
│   ├── documentBindings.ts          # EXTEND: list kinds (force powers, merits, flaws, backgrounds),
│   │                                #   equipment kind; numeric coordinate resolution for formulas
│   └── defaultTemplates.ts          # REBUILD: full + brief defaults from scratch, zero built-in placements
tests/sheet_manager/
├── template-schema.test.ts          # NEW: recursive schema round-trips, depth/node limits
├── template-formulas.test.ts        # NEW: evaluator, coordinates, cycles, degradation (exhaustive)
├── template-store-migration.test.ts # NEW: v2→v3 retirement to quarantine, override handling
├── template-lists-images.test.ts    # NEW: list value ops, image validation/export stripping
├── template-editor.test.tsx         # REWRITE: tree ops, affordances, depth guardrail, keyboard
├── declarative-sheet.test.tsx       # REWRITE: recursive rendering, presentation, columns, collapse memory
└── default-templates.test.ts        # REWRITE: parity vs built-in viewer, zero placements
translations/source/*.yaml           # EXTEND: editor/page strings for all new surfaces (en + ru)
```

**Structure Decision**: single-project web app; all changes stay inside the `sheet_manager`
module plus its canonical YAML translation sources and the Vitest suite. No new module
boundaries; the formula evaluator is feature-internal (`features/sheet/declarative/formula.ts`)
because it is part of the declarative rendering contract, not a shared utility.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

None — all gates pass without exceptions.
