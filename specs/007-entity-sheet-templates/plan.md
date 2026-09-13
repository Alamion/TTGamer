# Implementation Plan: Entity Sheet Templates and Docs Embed Migration

**Branch**: `007-entity-sheet-templates` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-entity-sheet-templates/spec.md`

## Summary

Replace the ready-made pages of the three remaining Star Wars WoD kinds (creature, vehicle, fodder group) with six shipped templates (full + kind-specific brief), migrate documentation from pre-template blocks to `TemplateFragment` / `TemplatePreview`, then archive and delete the legacy components and the `built-in` layout path.

The enabling work is setting-neutral: **data-lens bindings** let templates read/write any kind's typed `document.data` without the character capability (R1); a **cohort track** primitive renders per-member tracks with lettering, bounded add/remove, removal confirmation, defeated state, and selectable visible length (R2–R3); catalog selects gain **overwrite fill with explicit untouched/cleared rules**, bridged writes, row-valued details, and in-row fills, plus `creatures` / `vehicles` catalogs with Star Wars adapters (R4); nodes gain **`visibleWhen`** (R5); reference fields filter by kind, open their target, and show a missing-target placeholder (R6). GM extensions (merits/flaws, movement, threat tier, soak, systems damage, crew stations, modifications, quick pools, leader) live in the value bag; the only data addition is fodder `trackLength` (R3). Views become uniformly template-backed with per-kind ids and an observable `template-fallback` diagnostic (R8). Template authoring is split into neutral builders, WoD-family helpers, and one Star Wars file per kind (R9).

## Technical Context

**Language/Version**: TypeScript 6 (strict, no `any`) on React 19; Docusaurus 3.10

**Primary Dependencies**: Zod 3 (schemas), Zustand 5 + localForage persistence, Tailwind 3 + clsx, Lucide, Radix primitives — no new dependencies

**Storage**: IndexedDB via localForage — document store (`universal-character-storage`; entity data shapes unchanged except additive fodder `trackLength`), template store (`universal-template-storage`; unchanged shape, schema v3 stays valid)

**Testing**: Vitest (`tests/sheet_manager/*`); `validate:data`, `validate:i18n`, `build:translations`; `yarn verify` per checkpoint, `yarn verify:full` at docs and retirement checkpoints

**Target Platform**: Web (Docusaurus SPA + docs pages), en + ru, dark mode, offline-first

**Project Type**: Single-repo web application; `sheet_manager` module + `docs/` / `i18n/` + `translations/source` + `context/` archive

**Performance Goals**: entity pages render and respond like the character page (no perceptible lag at 24 members × 7 levels); one catalog pick applies all fills as a single store update; catalogs load through the existing catalog loading path (not on docs critical path beyond what the page already embeds)

**Constraints**: FR-008 no existing value changes; templates remain declarative data; setting-specific content only in `systems/star-wars-wod` (FR-010/011); docs import sheet content only via `docsEmbeds.tsx`; en/ru import parity; archived code excluded from all tooling

**Scale/Scope**: 7 user stories; 6 new shipped templates; ~5 new general capabilities (lens bindings, cohort track, fill semantics, `visibleWhen`, reference upgrades); 11 en + 11 ru MDX files; ~17 source files retired

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                  | Verdict | Notes                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                   | PASS    | Lens contract, cohort primitive, `visibleWhen`, fill semantics are setting-neutral inside `sheet_manager`; lens descriptors, catalog adapters, track variants, example documents live in `systems/star-wars-wod` (WoD-family helpers in `systems/wod-like`). Docs consume only `docsEmbeds.tsx`. No `shared/` changes.                    |
| II. Explicit Contracts at Boundaries       | PASS    | Every lens write re-parses with the kind schema; fodder `trackLength` is an additive defaulted field (old data parses unchanged, no silent coercion); template schema additions are optional (v3 templates stay valid); four written contracts; docs-embeds test guards MDX ↔ template references; new strings via `translations/source`. |
| III. Pleasurable Cross-Module Interactions | PASS    | Docs → sheet: editable fragment prompts to create a document when none; reference "open" preserves context; all degradations observable — new `template-fallback`, `reference-target-missing`, `catalog-detail-out-of-range` codes; resolution never throws.                                                                              |
| IV. Fit-for-Purpose Code Quality           | PASS    | Adapters are pure functions; cohort state transitions are pure and unit-tested; UI reuses `CollapsibleBlock`, `SectionCard`, `TraitRow`, `CompactConditionTrack`; template authoring split to keep files reviewable.                                                                                                                      |
| V. Risk-Proportional Testing               | PASS    | Schema/persistence tier (`yarn verify`) at each checkpoint: lens round-trips, parse defaults, fill semantics, cohort transitions, view resolution, entity template coverage, docs-embed guard; `yarn verify:full` for docs paths, removals, and the archive exclusion.                                                                    |
| VI. Consistent, Accessible Experience      | PASS    | Labels via explicit `labelMessage` (en + ru); confirmations use the existing dialog pattern; cohort tracks keyboard operable with labeled marks; `aria-expanded` on collapsed sections; `role="alert"` on placeholders/errors; docs pages updated in both locales.                                                                        |
| VII. Performance as a Shared Budget        | PASS    | No dependencies; entity catalogs follow the existing lazy catalog path; catalog fill batched into one write; formula/visibility evaluation memoized per render; `verify:full` reviews bundle impact of removals (net reduction expected).                                                                                                 |

Post-design re-check (after data-model and contracts): **PASS** — the only deviation from spec A2's "no data shape change" is the additive fodder `trackLength`, recorded in the spec and justified in R3 (rule-owned value; zero migration; existing values unchanged).

## Project Structure

### Documentation (this feature)

```text
specs/007-entity-sheet-templates/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── entity-templates.md
│   ├── catalog-fill.md
│   ├── docs-embeds.md
│   └── view-resolution-and-retirement.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
src/sheet_manager/
├── types/template.ts                     # EXTEND: visibleWhen (all nodes), primitive.cohort, in-row fill targets
├── diagnostics.ts                        # EXTEND: template-fallback, reference-target-missing, catalog-detail-out-of-range
├── docsEmbeds.tsx                        # EXTEND: create prompt, exampleDocument, vehicleDamagePreviewDocument, JAX re-export
├── templates/builders.ts                 # NEW: setting-neutral node builders (moved from defaultTemplates.ts)
├── systems/
│   ├── types.ts                          # CHANGE: remove built-in layout type
│   ├── templateBindings.ts               # EXTEND: data-lens descriptor kind, numeric readings, cohort descriptors
│   ├── wod-like/templateBuilders.ts      # NEW: trait dots, attribute groups, cohort track helpers, track variants
│   └── star-wars-wod/
│       ├── schema.ts                     # EXTEND: fodder trackLength (parse 7 / create 3)
│       ├── profile.ts                    # EXTEND: fodder track variants 3/5/7, arc enum
│       ├── entityBindings.ts             # NEW: lens descriptors for creature, vehicle, group
│       ├── catalogAdapters.ts            # NEW: creatures/vehicles/armor/weapon detail adapters
│       ├── examples.ts                   # NEW: example documents (::preset)
│       ├── index.ts                      # CHANGE: per-kind views (sheet + brief, legacy ids)
│       ├── defaultTemplates.ts           # SLIM: aggregates templates/*
│       └── templates/{character,creature,vehicle,fodder,docs}.ts  # NEW: one file per kind (+ DOCS paths)
├── features/sheet/
│   ├── CharacterSheet.tsx                # CHANGE: resolution order, kind check, no throw, fallback diagnostics
│   ├── view.ts                           # CHANGE: kind-checked user templates, unknown-view reporting
│   ├── data/catalogBindings.ts           # EXTEND: creatures, vehicles catalogs; adapter hook
│   └── declarative/
│       ├── DeclarativeSheetView.tsx      # EXTEND: visibleWhen, fill semantics, in-row fills, lens-bridged coordinates
│       ├── hooks.ts                      # EXTEND: lens read/write via document source, batched multi-write
│       ├── primitives.tsx                # EXTEND: lens-backed field/trait/pair/rows/list; cohort track primitive
│       └── fieldControls.tsx             # EXTEND: reference kind filter, open action, missing placeholder; unknown select value display
├── components/dialogs/template-editor/   # EXTEND: visibleWhen editor, cohort options, condition badge
├── features/sheet/blocks/**              # DELETE (archived)
├── features/sheet/views/{Creature,Vehicle,Fodder,BriefDocument,BriefCharacter}Sheet.tsx, StarWarsSheetSupport.tsx  # DELETE (archived)
├── features/sheet/registry/builtInBlockRegistry.ts  # DELETE (archived)
└── components/viewer/CharacterViewer.tsx # DELETE (archived)

docs/star-wars-wod-2e/… + i18n/ru/docusaurus-plugin-content-docs/current/star-wars-wod-2e/…
    # 11 legacy-embed pages migrated; creatures/mechanics, vehicles-mechanisms/{traits-systems,durability-damage-repair} gain previews
translations/source/*.yaml                # EXTEND: entity template labels, cohort/reference/fallback strings; REMOVE builtInBlocks.* (re-home "other")
context/legacy-sheet-components/          # NEW: archive + README; context/AGENTS.md entry
tsconfig.json, eslint.config.mjs, .prettierignore  # CHANGE: exclude context/**
.agents/skills/sheet-templates/SKILL.md, .agents/skills/sheet-manager/SKILL.md, src/sheet_manager/AGENTS.md, src/sheet_manager/TODO.md  # UPDATE current-state docs

tests/sheet_manager/
├── entity-bindings.test.ts               # NEW
├── cohort-track.test.tsx                 # NEW
├── entity-templates.test.ts              # NEW (coverage vs paper sheets, FR-004 inventory, briefs)
├── catalog-bindings.test.ts              # EXTEND (fill semantics, adapters, row fills)
├── template-references.test.ts           # EXTEND (kind filter, open, missing target)
├── template-schema.test.ts               # EXTEND (visibleWhen, cohort, in-row fills)
├── view-resolution.test.ts               # EXTEND (per-kind views, legacy ids, fallback reports)
├── docs-embeds.test.tsx                  # EXTEND (systemId, example ids, legacy import ban)
├── built-in-templates.test.ts            # REWRITE → every view template-backed
├── primitive-parity.test.tsx, document-system.test.ts  # UPDATE
└── brief-character-sheet.test.tsx        # DELETE
```

**Structure Decision**: all runtime changes stay in `sheet_manager`; setting knowledge is confined to `systems/star-wars-wod` (and reusable WoD-family helpers in `systems/wod-like`), which is the seam the next spec's settings expansion plugs into. Docs change only through the `docsEmbeds.tsx` public entry.

## Delivery Order (for task generation)

1. **Foundations** (blocks US1–3): lens bindings + document-source read/write; cohort track primitive + fodder `trackLength`; `visibleWhen`; fill semantics + adapters + catalogs; reference upgrades; diagnostics codes; template builders split (character templates must stay byte-equivalent in output — guarded by `default-templates.test.ts`).
2. **US1–US3** full templates (independent per kind) with per-kind views.
3. **US4** brief templates.
4. **US5** docs: `docsEmbeds` extensions + examples → legacy MDX replacements → new entity previews (en + ru together) → `verify:full`.
5. **US7** skill-doc settings table (can run in parallel with 4).
6. **US6** retirement gate: archive → delete → tooling exclusion → tests/docs update → `verify:full`.

## Complexity Tracking

| Item                                                                 | Why needed                                                                                                                  | Simpler alternative rejected because                                                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Additive fodder `trackLength` in `document.data` (spec A2 exception) | Rule-owned value; old groups must parse as 7 while new ones default to 3                                                    | A bag value cannot distinguish pre-existing groups from new ones without seeding; relaxing the 7-slot schema needs a data migration |
| Data-lens bindings alongside character bindings (two binding paths)  | Non-character kinds lack the character capability; converting character bindings now adds regression risk to finished pages | Pseudo-character capability couples all kinds to one setting's character model                                                      |
