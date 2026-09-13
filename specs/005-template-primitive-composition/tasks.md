---
description: 'Task list for Template Primitive Composition'
---

# Tasks: Template Primitive Composition

**Input**: Design documents from `/specs/005-template-primitive-composition/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Tests**: Included deliberately — Constitution V (Risk-Proportional Testing) mandates schema round-trip, seeding, degradation, and parity tests for schema/persistence work (see contracts/primitive-block-and-seeding.md §Testing gates). Schema/persistence edits require the `yarn verify` tier.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered independently. Numbering is sequential (T001–T029).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: the user story from spec.md the task belongs to (US1–US4)
- Every description carries the exact file path(s) to touch

## Phase Index

| Phase                                        | Tasks     | Scope                                                                  |
| -------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| 1. Setup                                     | T001–T002 | Baseline, test skeletons, chrome strings (en/ru)                       |
| 2. Foundational                              | T003–T008 | Primitive schema, metadata marker, binding registry, draft model       |
| 3. US1 — Compose from primitives (P1) 🎯 MVP | T009–T016 | Renderer, seeding, editor picker/config, degradation, tests            |
| 4. US2 — Defaults rebuilt (P2)               | T017–T022 | Explicit primitive-composed defaults (hybrid), parity + scenario tests |
| 5. US3 — Brief via compact (P2)              | T023–T025 | Compact default briefs, sync tests                                     |
| 6. US4 — Legacy demotion (P3)                | T026–T027 | Picker stops offering placements; retention verified                   |
| 7. Polish                                    | T028–T029 | i18n/a11y gates, quickstart walkthrough, phase-two pointer             |

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T002)**: no dependencies, start immediately
- **Foundational (T003–T008)**: BLOCKS all user stories — schema + registry + draft model land first
- **US1 (T009–T016)**: needs foundational T003–T005 — deliverable alone (MVP)
- **US2 (T017–T022)**: needs US1's renderer (T009–T010) + registry (T005)
- **US3 (T023–T025)**: needs US2's default-template mechanism (T017–T018)
- **US4 (T026–T027)**: needs US1 + US2 — it is the demotion/retention slice
- **Polish (T028–T029)**: after all stories are complete

### Story dependency graph

```text
Setup ──► Foundational ──► US1 (P1) ──► US2 (P2) ──► US3 (P2) ──► US4 (P3) ──► Polish
                 │                            ▲
                 └── US1 needs T003–T005 ─────┘ (US2 needs T005 + T009/T010)
```

### Within each story

- Contract/registry tests pair with their module task; schema → renderer/editor → wiring → tests
- Story complete before advancing to the next priority

## Parallel Opportunities

- Foundational: T003, T004, T005, T006, T007, T008 are independent files ([P] marked)
- US1: renderer (T009/T010) parallel to editor work (T012/T013) once schema+registry exist
- US2: parity tests for other definitions (T021) parallel the character work (T017–T020)
- All test tasks marked [P] can run alongside neighboring implementation tasks once their subject exists

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 + Phase 2 (setup + foundational)
2. Phase 3 (US1) → **STOP and VALIDATE** (author a template with bound primitives, assign, edit values, verify persistence; `yarn verify`)
3. Users can compose pages from document-bound primitives even before defaults are rebuilt

### Incremental Delivery

- +US2 → built-in pages rebuilt as primitive-composed defaults (hybrid interim)
- +US3 → brief cards from compact primitives
- +US4 → legacy placements demoted; retention verified; cleanup gate recorded
- Each increment keeps prior stories green; `yarn verify` at each checkpoint

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps to spec.md user stories for traceability
- Checkpoints after each story phase — validate independently before proceeding
- Commit after each task or logical group
- YAML chrome strings live only in `translations/source/{en,ru}/ui/sheet/templates.yaml`; never edit generated `ttgamer.*` entries
- Template file format stays v2; no document-envelope migration (only additive `metadata.seededPresets`)
- Primitives NEVER read/write the template value bag — document data only (FR-8, contract test)

---

## Phase 1: Setup

**Purpose**: Baseline and scaffolding

- [x] T001 Run `yarn verify:fast` to confirm clean baseline; create test skeletons `tests/sheet_manager/primitives.test.ts` (schema + rendering + mixed persistence), `tests/sheet_manager/document-bindings.test.ts` (registry), `tests/sheet_manager/primitive-seeding.test.ts`, `tests/sheet_manager/primitive-parity.test.tsx` with `describe` blocks per contracts/primitive-block-and-seeding.md §Testing gates
- [x] T002 [P] Add feature chrome YAML keys to translations/source/en/ui/sheet/templates.yaml and translations/source/ru/ui/sheet/templates.yaml: binding-kind group names (identity/traits/lists/resources/tracks), primitive picker labels, "bound to" config label, track editor labels (levels, level names), presets editor labels, compact toggle, seeding/degradation notices; run `yarn build:translations` + `yarn validate:i18n`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add `PrimitiveBlockSchema` to src/sheet_manager/types/template.ts per data-model.md: `{ id, type: 'primitive', bindingKey: string(1..120), label?: string(1..120), compact: boolean (default false), track?: { levels: int 1..20, names: string[] matching levels }, presets?: array(max TEMPLATE_LIMITS.presetsPerPrimitive = 30) of { key: identifier, label: string(1..120), value?: int 0..20 } }`; add to `TemplateBlockSchema` union; export types; keep one-namespace rules intact
- [x] T004 [P] Add optional `seededPresets: array(string)` to `DocumentMetadataSchema` in src/sheet_manager/types/document.ts (additive; absent on old documents parses unchanged)
- [x] T005 [P] Create the binding registry src/sheet_manager/systems/star-wars-wod/documentBindings.ts per contracts/document-binding-registry.md: `DocumentBindingDescriptor` type exported from src/sheet_manager/systems/types.ts; derive trait bindings from `starWarsWodProfile` groups (trait:<group>:<TraitKey>, bounds from profile), resources (willpower/force-points/dark-side-resistance with pool/rating meta), condition tracks (health, vehicle-damage), declare identity-field bindings per document kind and custom-list bindings (customTalents/customSkills/customKnowledges, presets-capable); implement `listDocumentBindings(systemId, documentKind)` and `resolveDocumentBinding(systemId, documentKind, key)` with kind scoping
- [x] T006 [P] Schema round-trip tests in tests/sheet_manager/primitives.test.ts: primitive variant parses (bindingKey/label/compact/track/presets); track names must match level count; preset bounds enforced; legacy templates (fields/table/built-in only) parse unchanged; template file v2 round-trips a primitive-containing template via parseTemplateFile/serializeTemplateFile
- [x] T007 [P] Registry tests in tests/sheet_manager/document-bindings.test.ts: every profile trait yields a binding with profile bounds; resources/tracks/lists/identity fields present per kind; kind scoping filters foreign kinds; unknown key resolves undefined; `write` transforms are pure and shape-correct
- [x] T008 [P] Add draft-model helpers in src/sheet_manager/components/dialogs/template-editor/draft.ts: `addPrimitive(draft, sectionId, bindingKey)`, `updatePrimitive`, `setPrimitivePresets`, `setPrimitiveTrack` (with validation against registry defaults), move/remove reuse existing block helpers

**Checkpoint**: Foundation ready — schema carries primitives; the registry resolves bindings; the editor draft model can place them

---

## Phase 3: US1 — Compose pages from document-bound primitives (P1) 🎯 MVP

**Goal**: A template author places primitives bound to real document data; the page edits the document exactly like built-in pages do

**Independent Test**: Create a template with a trait row (Strength), trait row with input (Blaster), custom list with presets, resource (Willpower), condition track (Health), identity field (Name); assign to a character; edit each; verify values land in document data and survive reload/restart

### Implementation for User Story 1

- [x] T009 [US1] Create src/sheet_manager/features/sheet/declarative/primitives.tsx: `PrimitiveBlockView` resolving the binding via `resolveDocumentBinding`, switching on descriptor kind to existing molecules — `TraitRow`/`TraitRowWithInput` (attributes/abilities via `useCharacter()`), `CustomTraitsEditor` (lists), pool/rating resource control, `CompactConditionTrack`/track (marks via `updateCharacter`), labeled text field (identity); `compact` swaps compact variants; `label` override; accent from block parity helper; missing/foreign binding → `role="alert"` placeholder naming the key (FR-3)
- [x] T010 [US1] Route `primitive` blocks in src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx block walk (renderSectionBlocks + countUnfilledRequired skip) and pass template systemId/documentKind context
- [x] T011 [US1] Implement preset seeding in src/sheet_manager/features/sheet/declarative/hooks.ts: `usePresetSeeding(effectiveTemplate)` — when the document's `metadata.seededPresets` lacks the template id and context is editable, copy each preset into the bound custom list as `{ id: 'preset-<templateId>-<key>', label, value: value ?? 0 }` via one `updateDocumentData` call and record the template id in `seededPresets`; idempotent; read-only contexts never seed (FR-16, contracts/primitive-block-and-seeding.md)
- [x] T012 [US1] Add primitive entries to the block picker in src/sheet_manager/components/dialogs/template-editor/SectionEditor.tsx: groups per binding kind (identity/traits/lists/resources/tracks) from `listDocumentBindings(draft.systemId, draft.documentKind)`, human-readable labels, calling `addPrimitive` (T008)
- [x] T013 [US1] Add the primitive config panel to src/sheet_manager/components/dialogs/template-editor/BlockEditor.tsx: heading names the binding, re-pick binding (kind-scoped list), label override input, compact toggle, track editor (levels count + level names, prefilled from profile defaults, validated against profile max), presets editor (add/rename/default value/remove) — no anonymous panels (004 review lesson)
- [x] T014 [US1] Degradation tests in tests/sheet_manager/primitives.test.ts: unknown bindingKey and foreign-kind bindingKey render a single `role="alert"` placeholder naming the key; surrounding primitives and declarative fields unaffected; document data untouched (FR-3, SC-005)
- [x] T015 [US1] Seeding tests in tests/sheet_manager/primitive-seeding.test.ts: assign once → entries seeded with deterministic ids and marker recorded; re-assign/re-render → no duplicates; user deletes a seeded entry → it never re-seeds; author edits presets later → already-seeded documents unchanged; two templates seeding the same label → two entries; read-only context → no seeding (FR-16)
- [x] T016 [US1] Mixed persistence test in tests/sheet_manager/primitives.test.ts: page mixing a trait-row primitive and a declarative text field — primitive edit lands in document data, field edit lands in `templateValues`, both survive reload; primitives never read the value bag (FR-8)

**Checkpoint**: MVP — users compose pages from document-bound primitives; `yarn verify` green

---

## Phase 4: US2 — Built-in pages rebuilt from primitives (P2)

**Goal**: Current pages become primitive-composed default templates with parity (hybrid interim for Force/advantages/inventory)

**Independent Test**: Assign rebuilt defaults and compare content/behavior with the previous built-in pages; compose the "no Force, with Willpower, custom skills" variant

### Implementation for User Story 2

- [x] T017 [US2] Create src/sheet_manager/systems/star-wars-wod/defaultTemplates.ts: explicit default templates per definition — character full ('full-sheet') and droid full ('droid-sheet') as hybrid: identity-field primitives, attribute/ability trait rows from profile groups, custom-list primitives (talents/skills/knowledges with no presets by default), health track, willpower/force-points resources + retained `built-in` placements for advantages/force/body-inventory; creature ('creature-sheet'), vehicle ('vehicle-sheet'), fodder ('fodder-sheet') from their fields/tracks per contracts
- [x] T018 [US2] Swap the default-template source in src/sheet_manager/systems/view.ts: `resolveEffectiveTemplate` resolves default ids from the explicit definitions (identity = view id; override/reset semantics from 004 unchanged); remove `viewToDefaultTemplate` derivation usage (keep exported only if templateSkeletons still consumes it until T019)
- [x] T019 [US2] Update src/sheet_manager/features/sheet/data/templateSkeletons.ts to derive skeletons from the new explicit default templates (fresh ids `skeleton-<definitionId>`, same structure)
- [x] T020 [US2] Parity test for the character full default in tests/sheet_manager/primitive-parity.test.tsx: rebuilt default renders the same molecule set/interactions as the legacy composition (identity fields, 9 attribute rows, 30 ability rows, 3 custom lists, health track, willpower/force-points; advantages/force/body via legacy placements) — no capability missing (SC-001)
- [x] T021 [P] [US2] Parity tests for droid/creature/vehicle/fodder defaults in tests/sheet_manager/primitive-parity.test.tsx: each rebuilt default covers its previous built-in page's capabilities (SC-002)
- [x] T022 [US2] Scenario test "no Force, with Willpower, custom skills" in tests/sheet_manager/primitive-parity.test.tsx: duplicate the full default, remove the Force/advantages/body placements and a subset of skill rows — page renders, Willpower shows its derived value, omitted traits simply absent, document data intact (FR-13, SC-002)

**Checkpoint**: Defaults rebuilt — all covered pages are primitive-composed (hybrid); `yarn verify` green

---

## Phase 5: US3 — Brief-format fields via compact presentation (P2)

**Goal**: Brief cards composed from the same bindings with compact primitives

**Independent Test**: Compose a brief card from compact primitives bound to the same traits as the full page; verify values stay in sync

### Implementation for User Story 3

- [x] T023 [US3] Rebuild the brief defaults ('brief' view id) for all definitions in src/sheet_manager/systems/star-wars-wod/defaultTemplates.ts as compact-primitive compositions replacing the 'brief-document' legacy placement (FR-10 phased parity: brief is fully covered by the core set)
- [x] T024 [US3] Compact rendering tests in tests/sheet_manager/primitives.test.ts: `compact: true` renders compact molecule variants (CompactTextField/compact ratings/CompactConditionTrack) for the same bindings (FR-7)
- [x] T025 [US3] Sync test in tests/sheet_manager/primitive-seeding.test.ts (or primitives.test.ts): full page and brief card bound to the same traits show identical values after edits on either side (SC-004)

**Checkpoint**: Brief pages are primitive-composed; `yarn verify` green

---

## Phase 6: US4 — Legacy page parts demoted to reference (P3)

**Goal**: Editor stops offering placements; legacy path retained for hybrid + pre-005 templates

**Independent Test**: Editor offers no placements; pre-005 templates still render; cleanup gate recorded

### Implementation for User Story 4

- [x] T026 [US4] Remove the ready-made placement entries from the block picker in src/sheet_manager/components/dialogs/template-editor/SectionEditor.tsx (listBuiltInBlocks usage) — legacy placements remain only inside code-owned hybrid defaults (FR-11)
- [x] T027 [US4] Retention verification in tests/sheet_manager/primitive-parity.test.tsx: a pre-005 template containing `built-in` placements renders through the retained legacy path without data loss; record the cleanup gate (delete legacy blocks/placements after user confirmation) in src/sheet_manager/TODO.md (FR-12)

**Checkpoint**: Demotion complete — direction is one-way; `yarn verify` green

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Gates, audit, end-to-end validation

- [x] T028 [P] i18n gate (`yarn build:translations` + `yarn validate:i18n`) for all new strings; a11y audit of the picker/config panels and primitive controls (keyboard operability, aria-labels, `role="alert"` announcements) (FR-14/FR-15)
- [x] T029 Run the full quickstart.md walkthrough (13 scenarios) with `yarn start`; run `yarn verify` (full tier) and fix findings; update src/sheet_manager/TODO.md with the phase-two pointer (Force-list, merits/flaws, equipment-with-catalogs primitives) and the cleanup gate

---

## Dependencies & Execution Order

### Phase dependencies

- Setup (T001–T002) → Foundational (T003–T008) → US1 (T009–T016) → US2 (T017–T022) → US3 (T023–T025) → US4 (T026–T027) → Polish (T028–T029)
- US3/US4 depend on US2's default-template mechanism; US4's editor change must land after US2 parity is verified (placements must not disappear from defaults before they are rebuilt)

### Parallel Example: Foundational

```bash
# Independent files, launch together:
Task: "T003 primitive schema in src/sheet_manager/types/template.ts"
Task: "T004 metadata marker in src/sheet_manager/types/document.ts"
Task: "T005 binding registry in src/sheet_manager/systems/star-wars-wod/documentBindings.ts"
```

### Parallel Example: US2

```bash
# After T017/T018 exist:
Task: "T020 parity test character full"
Task: "T021 [P] parity tests other definitions"
```

## Implementation Strategy

- **MVP**: Phases 1–3 (US1) — compose pages from document-bound primitives
- **+US2**: defaults rebuilt (hybrid), the "no Force" scenario works
- **+US3**: brief from compact primitives
- **+US4**: legacy demoted; cleanup gate recorded for user confirmation
- `yarn verify` at every checkpoint (schema/persistence tier per Constitution V)

## Notes

- No document-envelope migration — only additive `metadata.seededPresets` (contracts/primitive-block-and-seeding.md §Persistence)
- Template file format stays v2; primitive blocks ride the existing schema
- Never hand-edit generated `ttgamer.*` entries in `i18n/*/code.json` or `src/i18n/generated/`
- Primitives never touch the template value bag (FR-8); declarative fields never touch document data
