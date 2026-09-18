# Implementation Plan: V5 Ruleset and Hunter: the Reckoning 5e Player Character

**Branch**: `008-hunter-v5-character` (work currently on `testing`) | **Date**: 2026-09-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-hunter-v5-character/spec.md`

## Summary

Add a `v5` system plugin that acts as the V5 **ruleset** (attributes, skills with specialties,
Health/Willpower damage tracks, advantages/flaws, touchstones, experience, biography) and a
**Hunter module** contributing the `hunter` character definition (Creed, Drive, Edges with Perks,
Despair, Desperation, Danger) with shipped full and brief templates. Generic additions, all system-neutral: a **severity track** (N ordered severities, escalation rule,
formula-derived length) built from new atoms, a **tags** rows column with id-filtered suggestions,
a list mode for trait specialties, catalogs declared by every plugin (Star Wars included) in a
neutral `systems/catalogs.ts`, system-aware template matching, a
registry-driven create dialog, and metadata-driven **publisher policy notices** (Dark Pack) on
views, docs, and exports. Documentation adds `docs/wod-v5/` with shared V5 rules and a Hunter section
that has a quickstart and a guided newcomer creation path in a new page format, mirrored in Russian.

## Technical Context

**Language/Version**: TypeScript ~6.0 (strict), React 19, MDX (Docusaurus 3.10.1)

**Primary Dependencies**: Docusaurus, Zustand 5 (localForage/IndexedDB persistence), Zod 3, Tailwind,
Radix primitives, Lucide; existing sheet template engine and `InlineRoll`

**Storage**: IndexedDB via localForage; document store v3 unchanged; hunter definition `schemaVersion` 1

**Testing**: Vitest (`yarn test`), `yarn validate:i18n`, `yarn validate:data`, `yarn verify:full`

**Target Platform**: static web site (desktop and mobile browsers), offline-first

**Project Type**: single web application (Docusaurus site with React modules)

**Performance Goals**: damage/dot interactions update within one frame; hunter catalogs (~73 entries)
are static and tiny; no new heavy dependency

**Constraints**: first table session within 1–2 weeks of 2026-09-15 (slice plan D12); own-words
content only; Dark Pack notice everywhere H:tR material appears; no system conditionals in generic code

**Scale/Scope**: 1 new plugin, 1 definition, 2 shipped templates, 4 catalogs, 2 generic template
capabilities; ~26 docs pages × 2 locales

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                       | Check                                                                                                                                                                                                                                                                                                                                                        | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| I. Modular Semi-Autonomy        | V5 is one ruleset plugin; Hunter is a module inside it (D1); generic code gets capabilities (severity track, tags column, specialties list, plugin catalogs, policies); Star Wars catalogs move onto its plugin, never `hunter`/`v5` conditionals; Star Wars-bound entry points are generalised via the registry (D7). One supernatural module per document. | ✅     |
| II. Explicit Contracts          | Envelope + hunter Zod schema on create/update/import/load; recovery + diagnostics for failures; contracts in `contracts/`; UI strings via YAML; `@site/` imports in MDX.                                                                                                                                                                                     | ✅     |
| III. Pleasurable Interactions   | Docs ↔ sheet via `TemplateFragment` and `CreateCharacterButton` with create prompt when no hunter exists; import errors actionable; unresolved catalogs and rejected writes report through `diagnostics.ts`. No new `integrations/` adapter (no V5 dice handoff, T-045).                                                                                     | ✅     |
| IV. Code Quality                | Pure severity-track transitions module; new atoms in `components/controls`; molecules take data + callbacks only; Radix for any new popover (tags suggestions).                                                                                                                                                                                              | ✅     |
| V. Risk-Proportional Testing    | Schema/persistence edits → full suite: schema round-trip, import/export incl. notices, registry/policy resolution, severity-track unit tests, bindings, shipped-template tests, docs anatomy test.                                                                                                                                                           | ✅     |
| VI. Consistent, Accessible      | Reuses sheet primitives; track actions are labelled buttons; notices use `aside` with label; en + ru for UI and docs; spec/plan English-only.                                                                                                                                                                                                                | ✅     |
| VII. Performance                | Static catalogs; formula-derived lengths memoized with bound document; route and shared component additions → `yarn verify:full`. No thousands-scale collection introduced.                                                                                                                                                                                  | ✅     |
| Governance (current-state docs) | Skills, root and module `AGENTS.md` updated; banners on specs 003 and 007 (partly superseded) and a change-record banner on this spec.                                                                                                                                                                                                                       | ✅     |
| VIII. Third-Party Material      | Source, policy, and notice requirements named in spec; `PublisherPolicy` metadata; notices on views, docs, exports only where used; own-words docs and catalog summaries; product stays free.                                                                                                                                                                | ✅     |

**Post-design re-check (after Phase 1)**: still ✅. The two new generic capabilities are
system-neutral (a Vampire module or other WoD-family ruleset can use them); notice placement
outside the template tree keeps user re-skins compliant. No violations → Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/008-hunter-v5-character/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── hunter-document.md
│   ├── template-bindings.md
│   ├── policy-notice.md
│   └── docs-structure.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
src/sheet_manager/
├── diagnostics.ts                       + code template-incompatible
├── systems/
│   ├── types.ts                         + SystemPlugin.policies/catalogs, DocumentDefinition.module, label descriptor
│   ├── registry.ts                      + cross-plugin unique view ids, policy id validation, getPlugin/listDefinitions
│   ├── policies.ts                      NEW PublisherPolicy catalog (dark-pack) + resolvers
│   ├── catalogs.ts                      NEW defineCatalog + catalog types (moved from features)
│   ├── view.ts                          custom/default template matching on (systemId, kind)
│   ├── templateBindings.ts              + severity binding kind, tags column, trait specialties list mode
│   ├── index.ts                         register v5 plugin
│   ├── star-wars-wod/catalogs.ts        NEW home of Star Wars catalog declarations (moved)
│   └── v5/                              NEW ruleset plugin
│       ├── index.ts                     plugin: policies, documents from modules, catalogs, templates
│       ├── ruleset/
│       │   ├── profile.ts               attribute/skill keys and groups
│       │   ├── schema.ts                V5CoreShape pieces and limits
│       │   ├── bindings.ts              core binding builders (traits, severity tracks, rows, fields)
│       │   └── templateParts.ts         reusable section builders
│       └── modules/hunter/
│           ├── definition.ts            DocumentDefinition 'hunter' + views, module descriptor
│           ├── schema.ts                V5 core extended with hunter shape, createDefault
│           ├── bindings.ts
│           ├── catalogs.ts              creeds, drives, edges, perks
│           ├── example.ts               Lena Varga docs example document
│           └── templates/{sheet,brief}.ts
├── components/
│   ├── controls/SeverityBox.tsx         NEW atom
│   ├── controls/TrackActionButton.tsx   NEW atom
│   ├── controls/TagListInput.tsx        NEW atom
│   └── sections/SeverityTrack.tsx       NEW molecule (+ severityTrack.ts pure transitions)
├── components/dialogs/DocumentCreateDialog.tsx   registry-driven
├── features/sheet/
│   ├── declarative/primitives.tsx       severity primitive, tags column, specialties list, rows reorder
│   ├── data/catalogBindings.ts          aggregation from registry only
│   ├── data/templateSkeletons.ts        system from current document
│   └── shell/
│       ├── SheetWorkspace.tsx           PolicyNotice under view
│       ├── documentFile.ts              NEW pure export builder with notices
│       ├── PolicyNotice.tsx             NEW
│       ├── CreateCharacterButton.tsx    systemId/definitionId props
│       ├── TemplateLibraryDialog.tsx    group/match by system + kind
│       └── templateFile.ts              wrapper notices, unknown system rejection
├── components/dialogs/template-editor/draft.ts   system-aware empty draft
└── docsEmbeds.tsx                       PolicyNotice export, hunter example helper

translations/source/{en,ru}/ui/sheet/{policies,tracks,v5,v5-hunter}.yaml
translations/source/{en,ru}/data/v5-hunter.yaml

docs/wod-v5/**                                NEW (tree in contracts/docs-structure.md)
i18n/ru/docusaurus-plugin-content-docs/current/wod-v5/**   NEW mirror; current.json category labels
scripts/validate-i18n.ts                  multiple doc roots
eslint.config.mjs                         one generic "no concrete system imports" pattern

tests/sheet_manager/
├── severity-track.test.ts / .test.tsx   NEW generic transitions and rendering
├── tags-column.test.tsx                 NEW id-filtered suggestions
├── trait-specialties.test.tsx           NEW list mode
├── policy-notice.test.tsx               NEW
├── catalog-registry.test.ts             NEW plugin catalog aggregation
├── document-system.test.ts, view-resolution.test.ts, import-export.test.ts,
│   template-file.test.ts, docs-embeds.test.tsx, built-in-templates.test.ts   extended
└── systems/v5/                          NEW system-specific tests (schema, sheet coverage, re-skin, boundaries)
tests/docs/wod-v5-docs.test.ts               NEW page anatomy + notice enforcement

AGENTS.md, src/sheet_manager/AGENTS.md, .agents/skills/{sheet-templates,sheet-manager,mdx-documentation}/SKILL.md
specs/003-custom-sheet-templates/spec.md, specs/007-entity-sheet-templates/spec.md, this spec   banners
```

**Structure Decision**: single Docusaurus web project. Game-system code stays inside
`src/sheet_manager/systems/v5/` split into `ruleset/` and `modules/hunter/`; generic capabilities go
to their existing layers (`systems/`, `components/sections/`, `features/sheet/`). Documentation is a
new top-level `docs/wod-v5/` tree with shared `rules/` and a `hunter/` line.

## Delivery Slices (D12)

1. **Table-ready sheet** (target 2026-09-20): policies + types/registry, v5 plugin, hunter schema and
   catalogs, severity track, full + brief templates, create dialog, notice on views, export notices,
   tests. → Quickstart scenarios 1, 2.
2. **Re-skin and quickstart** : system-aware template matching and library, tags column in editor,
   template-file notices; `docs/wod-v5/index`, `rules/*`, `hunter/index`, `hunter/quick-start` (en).
   → Scenarios 3, 4.
3. **Newcomer path and polish** (target 2026-09-29): `first-hunter/*`, `reference/*`, Lena example,
   Russian mirror, `validate-i18n` roots, docs anatomy test, skills/AGENTS updates, TODO/ROADMAP
   status. → Scenarios 5, 6.

## Risks

| Risk                                                                               | Mitigation                                                                                                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Template editor cannot yet edit the new `tags` column / severity primitive options | Editor treats them as opaque nodes that can be relabelled and moved (enough for US4); full option editing deferred if slice 2 slips |
| Hard-coded Star Wars defaults missed somewhere                                     | `grep` for `star-wars-wod` in generic code during slice 1; existing ESLint rule plus a registry test with two plugins               |
| Newcomer docs take longer than planned                                             | Slice 3 is independent of the table session; quickstart ships first                                                                 |
| Dark Pack may also require logo display                                            | Verify on the agreement page before release; logo assets belong to T-037                                                            |

## Scaling Notes

- Generic capabilities carry no V5 vocabulary: severities, labels, and escalation come from bindings.
- Every plugin, Star Wars included, declares catalogs, policies, templates, and bindings the same way.
- Persisted choices that are hard to change later were made now: discrete specialties, Edge
  `entryId`, severity counts keyed by severity id.
- Known deferred debt with owners: composite template keys (T-046), explicit ruleset/setting/module
  envelope fields (T-041), Star Wars publisher notices (T-037).

## Complexity Tracking

No constitution violations; nothing to justify.
