---
description: 'Task list for Built-in Views as Default Templates'
---

# Tasks: Built-in Views as Default Templates

**Input**: Design documents from `/specs/004-default-view-templates/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Tests**: Included deliberately — Constitution V (Risk-Proportional Testing) mandates round-trip, persistence, parity, and import tests for schema/persistence work (see contracts/default-template-override.md §Testing gates). Schema/persistence edits require the `yarn verify` tier.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered independently. Numbering is sequential (T001–T028).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: the user story from spec.md the task belongs to (US1–US3)
- Every description carries the exact file path(s) to touch

## Phase Index

| Phase                                               | Tasks     | Scope                                                                                   |
| --------------------------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| 1. Setup                                            | T001–T002 | Baseline verification, test scaffolding                                                 |
| 2. Foundational                                     | T003–T007 | Shared contracts: built-in block schema variant, per-system registry, derivation helper |
| 3. US1 — Ready-made blocks in templates (P1) 🎯 MVP | T008–T014 | Schema, renderer, editor picker, placeholder degradation, strings, tests                |
| 4. US2 — Default templates + overrides (P2)         | T015–T023 | Derivation, override store, selector merge, library badge/reset/duplicate, tests        |
| 5. US3 — Seamless transition (P2)                   | T024–T026 | Resolution no-op verification, orphan/data-safety tests, parity regression              |
| 6. Polish & cross-cutting                           | T027–T028 | i18n gates, a11y audit, quickstart walkthrough + `yarn verify`                          |

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T002)**: no dependencies, start immediately
- **Foundational (T003–T007)**: BLOCKS all user stories — schema + registry + derivation land first
- **US1 (T008–T014)**: needs foundational T003–T005 — deliverable alone (MVP)
- **US2 (T015–T023)**: needs T003 + T006 (derivation) + US1's renderer support (T010) — default templates render through the same built-in block path
- **US3 (T024–T026)**: needs US1 + US2 complete — it is the regression/data-safety validation slice
- **Polish (T027–T028)**: after all stories are complete

### Story dependency graph

```text
Setup ──► Foundational ──► US1 (P1) ──► US2 (P2) ──► US3 (P2) ──► Polish
                 │                             ▲
                 └── US1 needs T003–T005 ──────┘ (US2 needs T006 + US1 renderer)
```

US1 and US2 share the built-in block rendering path but are independently testable: US1 with
hand-built templates (fixtures or editor), US2 with derived defaults before/after US1's editor
picker lands.

### Within each story

- Contract/registry tests pair with their module task; data/registry → runtime/UI → wiring → strings → story tests
- Story complete before advancing to the next priority

## Parallel Opportunities

- Foundational: T003, T004, T006 are independent files ([P] marked); T005 depends on T003
- US1: schema tests (T008) parallel the renderer (T010); registry availability (T004) parallel everything
- US2: derivation tests (T016) parallel the override store (T017); selector (T020) and library UI (T021) are separate files
- All test tasks marked [P] can run alongside neighboring implementation tasks once their subject exists

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 + Phase 2 (setup + foundational)
2. Phase 3 (US1) → **STOP and VALIDATE** (author a template with ready-made blocks, assign, verify parity; `yarn verify`)
3. Templates can now recreate the main character page even before defaults exist

### Incremental Delivery

- +US2 → every current view becomes a default template (edit/reset/duplicate)
- +US3 → upgrade safety proven: pre-upgrade data renders identically, zero loss
- Each increment keeps prior stories green; `yarn verify` at each checkpoint

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps to spec.md user stories for traceability
- Checkpoints after each story phase — validate independently before proceeding
- Commit after each task or logical group
- YAML chrome strings live only in `translations/source/{en,ru}/ui/sheet/templates.yaml`; never edit generated `ttgamer.*` entries
- Full/brief value consistency needs NO synchronization code — shared value keys (spec-003 FR-25) already provide it; test it, don't build it (clarification Q4)

---

## Phase 1: Setup

**Purpose**: Baseline and scaffolding

- [x] T001 Run `yarn verify:fast` to confirm clean baseline; create `tests/sheet_manager/built-in-templates.test.ts` and `tests/sheet_manager/default-templates.test.ts` skeletons with `describe` blocks per contract test gate in specs/004-default-view-templates/contracts/default-template-override.md
- [x] T002 [P] Add feature chrome YAML keys (badges, reset confirmation, placeholder notice, delete-refusal message) to translations/source/en/ui/sheet/templates.yaml and translations/source/ru/ui/sheet/templates.yaml per contracts/template-block-extensions.md wording; run `yarn build:translations`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Extend TemplateBlockSchema in src/sheet_manager/types/template.ts with the `built-in` variant `{ id, type: 'built-in', blockId: string(1..80), accentColor?: 'primary'|'secondary' }` per contracts/template-block-extensions.md; keep one-namespace uniqueness rules; export `BuiltInBlockPlacement` type
- [x] T004 [P] Add per-system availability API to src/sheet_manager/features/sheet/registry/builtInBlockRegistry.ts: `isBuiltInBlockAvailable(systemId, blockId)`, `listBuiltInBlocks(systemId)` (translated labels from registry data), deriving availability from which registered views use each block id
- [x] T005 Add schema round-trip tests for the `built-in` block variant in tests/sheet_manager/built-in-templates.test.ts: valid parse, accentColor default absent, uniqueness violation rejected, limits still enforced, existing templates (fields/table only) parse unchanged (T003 dependent)
- [x] T006 [P] Add `viewToDefaultTemplate(view, systemId, documentKind): CustomTemplate` pure derivation to src/sheet_manager/systems/view.ts per data-model.md: identity = view.id, name/description from view label, single section of `built-in` placements mirroring `view.layout.blocks` (order + accentColor)
- [x] T007 Add derivation tests in tests/sheet_manager/default-templates.test.ts: every registered view derives deterministically; ids match view ids; block order and accent settings preserved; unknown view → undefined (T006 dependent)

**Checkpoint**: Foundation ready — template schema carries ready-made blocks; defaults derivable from the registry

---

## Phase 3: US1 — Compose templates from ready-made interactive blocks (P1) 🎯 MVP

**Goal**: A template can contain ready-made interactive page parts and reproduce any built-in page, including full/brief mixes

**Independent Test**: Create a template with the same ready-made blocks as the built-in full character page (and one with only the brief card, and one mixing both), assign it to a character, and verify identical content and interactions

### Tests for User Story 1

- [x] T008 [P] [US1] Renderer parity tests in tests/sheet_manager/built-in-templates.test.ts: template with built-in placements renders the same block components in the same order with the same accentColor as the built-in path; full-parity and brief-parity compositions per SC-001
- [x] T009 [P] [US1] Degradation tests in tests/sheet_manager/built-in-templates.test.ts: unknown/unavailable blockId renders placeholder with role="alert" notice; surrounding blocks unaffected; document data untouched (FR-4)

### Implementation for User Story 1

- [x] T010 [US1] Extend DeclarativeSheetView block rendering in src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx: handle `{ type: 'built-in' }` blocks via `getBuiltInSheetBlock(blockId)` with accentColor prop; add `BuiltInBlockPlaceholder` component (labeled placeholder + notice, FR-4) (depends on T003, T004)
- [x] T011 [US1] Ensure ready-made blocks operate on document data exactly as on built-in pages (no template value bag access) — verify hooks usage in src/sheet_manager/features/sheet/declarative/hooks.ts does not intercept built-in block writes; document the two persistence mechanisms in a code comment (FR-5)
- [x] T012 [US1] Add ready-made blocks to the template editor block picker in src/sheet_manager/components/dialogs/ (TemplateEditorDialog): new "built-in" block type option listing `listBuiltInBlocks(systemId)` results, per-block accentColor select, ordering like existing blocks; authoring-time rejection of unavailable blocks (FR-4)
- [x] T013 [US1] Enforce one identifier namespace + size limits for built-in placements in editor validation (same path as existing live feedback in src/sheet_manager/components/dialogs/); collisions identify the offending placement (FR-6, edge case)
- [x] T014 [US1] Wire placeholder/degradation strings through the YAML pipeline (keys from T002) so editor and renderer show en/ru messages; verify with `yarn build:translations` + `yarn validate:i18n`

**Checkpoint**: MVP — a hand-authored template reproduces the full and brief character pages; `yarn verify` green

---

## Phase 4: US2 — Every current view becomes a default template (P2)

**Goal**: Registered views appear as default templates: visible, assignable, editable-in-place via overrides, resettable, undeletable, badged

**Independent Test**: For each registered view, verify it appears as a default template, renders identically when assigned, can be edited (applies on save), and can be reset to the original

### Tests for User Story 2

- [x] T015 [P] [US2] Store tests in tests/sheet_manager/default-templates.test.ts: store v1→v2 migration adds optional `defaultOverrides` map (absent → {}); invalid override entries quarantined; `removeTemplate` refuses registered view ids; duplicate of a default snapshots effective (override ?? derived) content with a fresh id (FR-11, clarification Q1)
- [x] T016 [P] [US2] Selector merge tests in tests/sheet_manager/default-templates.test.ts (or a dedicated selector test file): view ids + `tpl:` ids render exactly one entry per page, no duplicates; assignment resolution order custom-then-view (FR-13)

### Implementation for User Story 2

- [x] T017 [US2] Extend src/sheet_manager/store/templateStore.ts: persist `defaultOverrides: Record<string, CustomTemplate>` (store version 2), `setDefaultOverride`, `clearDefaultOverride`, quarantine validation on hydration, `removeTemplate` refusal for view ids, `duplicateTemplate` effective-content snapshot (depends on T006; FR-9/10/11, Q1)
- [x] T018 [US2] Add `resolveEffectiveTemplate(id, state, systemId, documentKind)` helper (in src/sheet_manager/systems/view.ts or a store-adjacent module per contracts/default-template-override.md) returning `{ template, isDefault, modified }`; wire DeclarativeSheetView path in src/sheet_manager/features/sheet/CharacterSheet.tsx to render default templates declaratively (view id = template identity, no migration)
- [x] T019 [US2] Update page selector in src/sheet_manager/features/sheet/shell/ViewModeSelect.tsx: merged single list (views + custom templates), "default" badge option support, no duplicate entries (FR-13, Q5)
- [x] T020 [US2] Update template library UI in src/sheet_manager/components/dialogs/ (TemplateLibrary): default badge, modified marker (override exists), reset with confirmation dialog (reuse ConfirmDialog pattern), duplicate action, no delete control for defaults (FR-11/12, Q5)
- [x] T021 [US2] Implement draft-until-save for default template editing: editor draft writes `setDefaultOverride` only on explicit save; discard-with-confirmation unchanged; live propagation follows from shared-store resolution — add a test proving an assigned document renders the newly saved version (FR-9, Q2)
- [x] T022 [US2] Implement reset flow: `clearDefaultOverride(viewId)` after explicit confirmation; reset discards any unsaved draft as part of the confirmed reset; modified marker clears; pristine content re-derived (FR-10, FR-12, edge cases)
- [x] T023 [US2] Story test sweep in tests/sheet_manager/default-templates.test.ts: every registered view's default template renders identically to the built-in path (component tree contract per research.md R6); override survives simulated reload (persist round-trip); reset restores pristine exactly (SC-002, SC-003)

**Checkpoint**: Defaults live — all current views are editable, resettable default templates; `yarn verify` green

---

## Phase 5: US3 — Seamless transition for existing documents and data (P2)

**Goal**: Pre-upgrade documents render unchanged; no migration; zero data loss across edits/resets

**Independent Test**: Load a pre-upgrade library of documents, verify identical rendering, then edit and reset default templates and verify zero data loss

### Tests for User Story 3

- [x] T024 [P] [US3] Legacy resolution tests in tests/sheet_manager/default-templates.test.ts: documents with `preferredViewId` (including legacy ids like `npc-card`) render their current page unchanged post-upgrade; no document rewrite occurs (FR-8, Q4)
- [x] T025 [P] [US3] Data-safety tests in tests/sheet_manager/default-templates.test.ts: template edit removing a ready-made block retains orphaned values (no notice path); reset re-renders original; character data intact through edit→save→reset cycle (FR-14, Q3, edge cases)

### Implementation for User Story 3

- [x] T026 [US3] Verify and adjust view resolution in src/sheet_manager/systems/view.ts + src/sheet_manager/features/sheet/CharacterSheet.tsx so no special-case default-template mapping exists anywhere (view ids resolve as ordinary pages); remove any accidental migration/sync code if introduced in earlier phases (FR-8)

**Checkpoint**: Upgrade safety proven — quickstart.md scenarios 1, 8–9, 11 pass against pre-upgrade-style fixtures

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Gates, audit, end-to-end validation

- [x] T027 [P] Import/export contract tests + wiring check in tests/sheet_manager/built-in-templates.test.ts: export serializes built-in placements; import validates, degrades unknown blockIds per-field with a report, collision flow unchanged (FR-16, contracts/template-block-extensions.md)
- [x] T028 Run full quickstart.md walkthrough (all 14 scenarios) with `yarn start`; a11y audit of new editor/library controls (keyboard, aria-labels, role="alert"); run `yarn verify` (full tier) and fix findings; update src/sheet_manager/TODO.md with the follow-up spec pointer (task 3: user-defined setups)

---

## Dependencies & Execution Order

### Phase dependencies

- Setup (T001–T002) → Foundational (T003–T007) → US1 (T008–T014) → US2 (T015–T023) → US3 (T024–T026) → Polish (T027–T028)
- US3 is validation-heavy but still ships code (T026); it requires US1+US2 complete

### Parallel Example: Foundational

```bash
# Independent files, launch together:
Task: "T003 schema variant in src/sheet_manager/types/template.ts"
Task: "T004 registry availability in src/sheet_manager/features/sheet/registry/builtInBlockRegistry.ts"
Task: "T006 derivation helper in src/sheet_manager/systems/view.ts"
```

### Parallel Example: US2

```bash
# After T017 exists:
Task: "T019 selector in src/sheet_manager/features/sheet/shell/ViewModeSelect.tsx"
Task: "T020 library UI in src/sheet_manager/components/dialogs/"
```

## Implementation Strategy

- **MVP**: Phases 1–3 (US1) — templates can recreate the main character page
- **+US2**: defaults, edit/reset/duplicate — the full task-2 payoff
- **+US3**: safety proof, no-migration guarantee
- `yarn verify` at every checkpoint (schema/persistence tier per Constitution V)

## Notes

- No document-envelope migration in this feature — only the template store gains an optional overrides map (contracts/default-template-override.md §Persistence)
- Never hand-edit generated `ttgamer.*` entries in `i18n/*/code.json` or `src/i18n/generated/`
- Full/brief consistency: test the shared value-key behavior, add no synchronization code (clarification Q4)
