---
description: Task list for 006-template-composition-usability implementation
---

# Tasks: Template Composition Usability

**Input**: Design documents from `/specs/006-template-composition-usability/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included — the spec's verification scope (A8, Constitution V) mandates the
schema/persistence tier; each phase pairs implementation with its test tasks.

**Organization**: Tasks grouped by user story (spec priorities P1–P3). All paths are
repository-relative; the module is `src/sheet_manager/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: user story label ([US1]…[US7]) from spec.md
- Verification tier: `yarn verify` at every checkpoint (schema/persistence changes)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the green baseline before the schema rework

- [x] T001 Run `yarn verify` and record the passing baseline before any schema/store changes (no code edits in this task)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema v3, formula engine, store retirement, registry v2 — all stories depend on these

**⚠️ CRITICAL**: No user story work until this phase is complete

- [x] T002 Rewrite the template schema to the recursive node union in src/sheet_manager/types/template.ts per contracts/template-node-model.md §1–2 (TemplateNode: `section`/`group`/`field` incl. `image` + `formula` variants and `maxFrom`/`table`/`list`/`primitive`; TEMPLATE_LIMITS.maxDepth=10, nodesPerTemplate=200, columnsMax=4; CustomTemplateSchema v3 with `children`; tree helpers: node collection, depth/count/unique-id validation, `fieldValueKey`/`tableValueKey` carried over)
- [x] T003 [P] Extend value shapes in src/sheet_manager/types/templateValues.ts per data-model.md (TemplateListEntry/ListValueSchema, TemplateImageValueSchema; write-path validators + coerce rules for list and image values; orphans retained — no destructive deletion)
- [x] T004 Implement the pure formula module in src/sheet_manager/features/sheet/declarative/formula.ts per contracts/formula-grammar.md (tokenizer + recursive-descent parser → Expr AST; evaluate with injected coordinate resolver and error states `unknown-coordinate`/`non-numeric`/`division-by-zero`/`circular`; collectDependencies; detectCycles returning named cycle paths; zero UI/store imports)
- [x] T005 [P] Write exhaustive formula unit tests in tests/sheet_manager/template-formulas.test.ts (grammar acceptance/rejection incl. unicode-operator rejection, precedence and parentheses, unary minus, coordinate resolution with `.current`/`.max`, every error state, deep chains, cycle detection naming the path) (depends on T004)
- [x] T006 Write recursive schema tests in tests/sheet_manager/template-schema.test.ts (v3 round-trips of a 10-level tree, depth/node-limit rejection with messages, unique-id rules, old-shape `sections` rejection, list/image value validation via T003 shapes) (depends on T002, T003)
- [x] T007 Bump templateStore to STORE_VERSION 3 with retirement migration in src/sheet_manager/store/templateStore.ts (parse `templates` + `defaultOverrides` against v3; failures → bounded quarantine (max 100); documents untouched; keep 004 override API) (depends on T002)
- [x] T008 Write store-migration tests in tests/sheet_manager/template-store-migration.test.ts (v2-shape entries → quarantine; `resolveCustomTemplate` → missing → built-in fallback + stale notice; quarantine bound respected; documents and templateValues untouched) (depends on T007)
- [x] T009 Extend the binding registry in src/sheet_manager/systems/star-wars-wod/documentBindings.ts per contracts/binding-registry-v2.md (ListBinding listId union + catalog metadata + entry mapping for `forcePowers`/`merits`/`flaws`/`backgrounds`; new EquipmentBinding kind `inventory`/`armor`/`weapons`/`implants`; listNumericCoordinates; documentKinds scoping preserved) (depends on T002)
- [x] T010 [P] Extend registry tests in tests/sheet_manager/document-bindings.test.ts (new list kinds with catalogs and entry mapping, equipment kind, kind scoping, numeric coordinate enumeration incl. `.current`/`.max` forms) (depends on T009)

**Checkpoint**: `yarn verify` green — schema, formulas, store retirement, registry v2 all in place; user stories can start

---

## Phase 3: User Story 1 — Free composition: every element at every level (P1) 🎯 MVP

**Goal**: Section, field group, field, table (and list/image/primitive) placeable at any depth; editor tree operations; recursive renderer; graceful retirement of pre-feature templates

**Independent Test**: Create a template with a bare root field, a section nested two levels holding a table, and a group with one field; assign to a character; all render, edit, persist (quickstart scenario 1)

### Implementation for User Story 1

- [x] T011 [US1] Rewrite the editor draft model in src/sheet_manager/components/dialogs/template-editor/draft.ts as pure tree ops per contracts/template-node-model.md §4 (insert(parentPath, index, node), remove(nodePath) with subtree, move(nodePath, targetParent, index) rejecting self-subtree moves, update(nodePath, patch); depth/node guardrails with actionable messages; stable id generation; drop the legacy sections model) (depends on T002)
- [x] T012 [US1] Create the recursive ElementEditor in src/sheet_manager/components/dialogs/template-editor/ElementEditor.tsx (per-node panel switching on node type; per-container add palette: field types incl. image/formula, group, section, table, list, kind-scoped primitives; config delegation to FieldEditor; data-\* test hooks per node id) (depends on T011)
- [x] T013 [US1] Remove src/sheet_manager/components/dialogs/template-editor/SectionEditor.tsx and BlockEditor.tsx and rewire src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx (draft = tree ops from T011; save path re-validates formula/cycle rules from T004; import/export bump wrapper version 3) (depends on T012)
- [x] T014 [US1] Rewrite the recursive renderer in src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx (walk CustomTemplate.children; containers render children recursively; leaves: fields via registry controls, table, list placeholder hookup (US5), primitives via PrimitiveBlockView; countUnfilledRequired walks the tree) (depends on T002)
- [x] T015 [US1] Extend the page hook in src/sheet_manager/features/sheet/declarative/hooks.ts for the tree model (collect all leaf value coordinates from the tree; bag read/write and orphan retention unchanged; seeded-preset trigger unchanged) (depends on T014)
- [x] T016 [US1] Surface incompatible library entries in src/sheet_manager/components/dialogs/TemplateLibraryDialog.tsx (show quarantined pre-feature templates as clearly marked incompatible; document fallback via existing `resolveCustomTemplate` missing path verified end-to-end) (depends on T007)
- [x] T017 [US1] Rewrite editor tests in tests/sheet_manager/template-editor.test.tsx (tree ops: insert at any level, remove subtree, move across containers preserving ids/children, depth guardrail rejection message, palette at root and inside containers) (depends on T011, T012)
- [x] T018 [US1] Rewrite renderer tests in tests/sheet_manager/declarative-sheet.test.tsx (bare root field renders/persists; 3-level nesting collapses independently; table inside nested section; mixed bag/document writes independent; no crash on unknown binding) (depends on T014, T015)

**Checkpoint**: US1 fully functional — compose anything at any level; old templates retire without damage (quickstart 1 + 8)

---

## Phase 4: User Story 2 — Unambiguous editor affordances (P1)

**Goal**: Collapse and reorder visually/spatially distinct at every level; drag handle reorder with keyboard fallback

**Independent Test**: First-exposure identification of collapse vs reorder at two nesting levels; drag/keyboard moves never toggle collapse (quickstart 2)

### Implementation for User Story 2

- [x] T019 [US2] Implement distinct affordances in src/sheet_manager/components/dialogs/template-editor/ElementEditor.tsx (left-edge GripVertical drag handle with native HTML5 DnD reorder within/between containers; visible ArrowUp/ArrowDown fallback buttons for keyboard users; collapse chevron stays on the right edge; aria-labels state the action; grip is focusable and arrow keys move when focused) (depends on T012)
- [x] T020 [US2] Affordance tests in tests/sheet_manager/template-editor.test.tsx (icon/side distinction asserted per panel depth, drag reorders without changing collapse state, toggle never reorders, keyboard move path, aria-labels present) (depends on T019)

**Checkpoint**: US2 done — unambiguous gestures at every depth

---

## Phase 5: User Story 3 — Presentation rework (P2)

**Goal**: Section = collapsible block (no background, docsPath, columns); group = titled surface card with opt-in remembered collapsibility

**Independent Test**: Bare section shows no box with docs link; collapsible group keeps state across reload; section columns lay out direct children (quickstart 3)

### Implementation for User Story 3

- [x] T021 [US3] Map presentation in src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx (section → CollapsibleBlock: no background, accent parity by node index, docsPath link that opens without toggling, columns 1–4 grid for direct children; group → SectionCard: bg-bgSurface, always-visible title, collapsible only when opted in with storageKey `template-<templateId>-<nodeId>` persistence) (depends on T014)
- [x] T022 [US3] Presentation tests in tests/sheet_manager/declarative-sheet.test.tsx (section renders without box + accent alternation, docs link click does not toggle, group box + title always visible, non-collapsible group has no toggle, collapsible group remembers state, columns layout) (depends on T021)

**Checkpoint**: US3 done — free composition renders in the built-in visual language

---

## Phase 6: User Story 4 — Dependent/derived fields and the image element (P2)

**Goal**: Formula fields, dynamic maxima (template ratings + system resources), per-document image — uniform coordinate space, authoring validation, degradation

**Independent Test**: Rating capped by `willpower.max` clamps; formula field recomputes instantly; image upload/URL persists, insecure URL rejected (quickstart 4 + 5)

### Implementation for User Story 4

- [x] T023 [US4] Implement the unified coordinate resolver and evaluation layer in src/sheet_manager/features/sheet/declarative/hooks.ts (listNumericCoordinates + template numeric fields as one undifferentiated labeled picker; memoized per-pass formula evaluation with visited-set circular guard; display clamp `min(stored, resolvedMax)` for maxFrom ratings; write clamp only when the bounded value is edited; missing source → labeled degraded state) (depends on T004, T009, T015)
- [x] T024 [US4] Add the image field control in src/sheet_manager/features/sheet/declarative/fieldControls.tsx (device upload through persistence/portraitStorage.ts save/load/delete; URL entry validated by getSafePortraitUrl; clear rejection messages for insecure/oversize/unsupported; read-only display without edit affordances) (depends on T003, T014)
- [x] T025 [US4] Add formula/maxFrom authoring UI in src/sheet_manager/components/dialogs/template-editor/FieldEditor.tsx (formula input with coordinate picker from T023; inline validation: parse errors, unknown coordinates, cycle detection via draft save; maxFrom picker on rating/number and resource primitives; image needs no extra config beyond valueKey) (depends on T023)
- [x] T026 [US4] Honor maxFrom on resource primitives in src/sheet_manager/features/sheet/declarative/primitives.tsx (Willpower/Force Points ceilings computed via formula; current clamped to computed max on write; display clamped; system-derived minimums unchanged) (depends on T023)
- [x] T027 [US4] Strip device image values on JSON export in src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx (remove `source:'device'` entries from the exported envelope like portraitId; URL values and document data untouched) (depends on T024)
- [x] T028 [US4] Derived-field and clamp tests in tests/sheet_manager/declarative-sheet.test.tsx (formula recomputes within one interaction, read-only enforcement, clamp on lowered/raised cap without stored rewrite, missing-source degradation, cycle rejection naming the path, division-by-zero error state) (depends on T023, T025, T026)
- [x] T029 [P] [US4] Image tests in tests/sheet_manager/template-lists-images.test.ts (image value write validation, device upload → blob id stored, URL validation rules, export stripping, read-only rendering) (depends on T024, T027)

**Checkpoint**: US4 done — derived stats and portrait expressible with formula-bound limits

---

## Phase 7: User Story 5 — Custom lists anywhere (P2)

**Goal**: List element with value-key or system-list storage, author-configured columns, presets carried over

**Independent Test**: Root-level value-key list (2 columns) and system-bound list behave identically; edits persist under their own coordinates (quickstart 6)

### Implementation for User Story 5

- [x] T030 [P] Parameterize list molecule columns in src/sheet_manager/components/sections/DocumentSheetSections.tsx (CustomTraitsEditor accepts columns 1–4 replacing the hardcoded 3; MeritFlawList reuses the same grid option) (depends on T002)
- [x] T031 [US5] Implement the list element in src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx + hooks.ts (valueKey mode: list ops add/edit/remove entries under the list's coordinate via T003 shapes; bindingKey mode: registry list writes incl. new kinds; identical interface; presets seeding reuse) (depends on T009, T014, T030)
- [x] T032 [US5] Add list authoring config in src/sheet_manager/components/dialogs/template-editor/ElementEditor.tsx + FieldEditor.tsx path (mode selector valueKey vs system binding — presented as one choice list without system/custom labels; columns 1–4; presets editor reuse from 005) (depends on T031)
- [x] T033 [US5] List tests in tests/sheet_manager/template-lists-images.test.ts + tests/sheet_manager/primitive-seeding.test.ts (both modes add/edit/remove persisting; two lists independent; columns render config not hardcoded 3; orphan retention on list removal; preset seeding idempotent for forcePowers/merits/flaws/backgrounds) (depends on T031, T032)

**Checkpoint**: US5 done — lists free of the skills domain anywhere on the page

---

## Phase 8: User Story 6 — Remaining character-card elements (P2)

**Goal**: Force powers, merits/flaws, catalog-backed equipment as first-class elements; defaults rebuilt with zero placements

**Independent Test**: A template covering every built-in character-page section using only first-class elements; side-by-side capability parity with the built-in page (quickstart 7)

### Implementation for User Story 6

- [x] T034 [US6] Render the new list bindings in src/sheet_manager/features/sheet/declarative/primitives.tsx (forcePowers/merits/flaws/backgrounds through CustomTraitList/MeritFlawList with their catalogs and copy-on-select mapping per contracts/binding-registry-v2.md; foreign-kind → placeholder) (depends on T009, T023)
- [x] T035 [US6] Render equipment bindings in src/sheet_manager/features/sheet/declarative/primitives.tsx (inventory/armor/weapons/implants through the body-section molecules + useBodyHandlers capability paths; catalog-backed copy-on-select parity with BodyBlock; foreign-kind → placeholder) (depends on T009)
- [x] T036 [US6] Rebuild shipped defaults from scratch in src/sheet_manager/systems/star-wars-wod/defaultTemplates.ts per research R9 (full view: Base → Attributes → Skills → Advantages → Force → Body → Other sections with built-ins' docsPath links and alternating accents; groups mirror built-in inner cards; identity fields, portrait image, trait rows, custom + new-kind lists, health track, resource primitives with system-default maxFrom, derived-stat formula fields, equipment bindings; brief view = same coordinates compact; ZERO built-in placements; overrides/reset semantics unchanged) (depends on T021, T024, T031, T034, T035)
- [x] T037 [US6] Rewrite defaults tests in tests/sheet_manager/default-templates.test.ts (molecule-tree parity contract vs the built-in viewer composition order, zero placements assertion, accent alternation, compact brief coverage) and adjust tests/sheet_manager/primitive-parity.test.tsx degradation cases for the new element set (depends on T036)

**Checkpoint**: US6 done — 100% of the built-in character card expressible without legacy placements

---

## Phase 9: User Story 7 — Legacy path retirement gate (P3)

**Goal**: Keep the legacy placement path inert but present until the user confirms parity; record the gate state honestly

**Independent Test**: No shipped template references placements; the legacy path still compiles; gate documentation states the supersession (quarantined pre-feature templates no longer render)

- [x] T038 [US7] Verify retention and update the gate record in src/sheet_manager/TODO.md (legacy block components + `built-in` placement variant remain compilable and tested until user confirmation; note the FR-4 supersession: pre-feature templates already retire via quarantine, so the retained path serves no shipped template; cleanup deletes blocks + variant + registry placements only after explicit user confirmation) (depends on T036)

**Checkpoint**: Direction stays one-way with the explicit, user-driven gate

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: i18n, a11y, documentation, end-to-end validation

- [x] T039 [P] Add all new editor/page strings to translations/source/en/ui/sheet/templates.yaml (+ base.yaml as needed) and the Russian mirror under translations/source/ru/, run `yarn build:translations` and `yarn validate:i18n` (no hand-edited generated `ttgamer.*` entries) (depends on T012–T036)
- [x] T040 [P] Accessibility audit of the editor and renderer (aria-expanded on every collapsible, grip/chevron labels, role="alert" degradation, full keyboard pass) with fixes where found (depends on T019, T021, T024)
- [x] T041 Update module documentation in src/sheet_manager/AGENTS.md (recursive node model, formula module, registry v2, retirement rule, defaults composition) consistent with the constitution's runtime-guidance rule (depends on T036)
- [x] T042 Run the quickstart.md walkthrough (10 scenarios) with `yarn start`; fix findings and re-run (depends on T038, T039)
- [x] T043 Run the final gates: `yarn verify` per checkpoint (already enforced) plus one `yarn verify:full` for the new UI surface and bundle review; confirm SC-001…SC-006 spot-checks pass (depends on T042)

---

## Dependencies & Execution Order

### Phase dependencies

- Setup (T001) → Foundational (T002–T010) → US1 (T011–T018) → US2 (T019–T020) → US3 (T021–T022) → US4 (T023–T029) → US5 (T030–T033) → US6 (T034–T037) → US7 (T038) → Polish (T039–T043)
- US2–US6 all depend on US1's recursive editor/renderer shell; US4 also depends on foundational T004/T009; US6's defaults rebuild (T036) is the convergence point of US3–US5 capabilities
- US7 is a retention/gate task, not new capability — schedule after US6 parity

### User Story Dependencies

- **US1 (P1)**: foundational only — the composition shell everything else rides on
- **US2 (P1)**: editor shell from US1; no data-model dependencies
- **US3 (P2)**: renderer shell from US1
- **US4 (P2)**: formula engine (T004) + registry coordinates (T009) + renderer (US1)
- **US5 (P2)**: value shapes (T003) + registry list kinds (T009) + renderer (US1)
- **US6 (P2)**: US3 presentation + US4 image/formula + US5 lists (defaults rebuild uses all)
- **US7 (P3)**: US6 parity before the gate record is updated

### Parallel Opportunities

- Foundational: T003 (value shapes) and T005 (formula tests) run parallel to T002/T004; T010 parallel to schema tests
- Within US4: T029 image tests parallel to derived-field work; T024 image control independent of T023/T025/T026 after T003/T014
- Within US5: T030 molecule columns parallel to renderer work
- US2/US3 can proceed in parallel once US1 lands (different files: ElementEditor vs DeclarativeSheetView)
- Polish: T039/T040/T041 mutually parallel after their dependencies

---

## Parallel Example: US4

```bash
# After T023 lands, launch together:
Task: "T024 image field control in src/sheet_manager/features/sheet/declarative/fieldControls.tsx"
Task: "T025 formula/maxFrom authoring UI in src/sheet_manager/components/dialogs/template-editor/FieldEditor.tsx"
Task: "T026 resource maxFrom in src/sheet_manager/features/sheet/declarative/primitives.tsx"
```

## Parallel Example: Foundational

```bash
Task: "T002 recursive schema in src/sheet_manager/types/template.ts"
Task: "T003 value shapes in src/sheet_manager/types/templateValues.ts"        # [P]
Task: "T004 formula module in src/sheet_manager/features/sheet/declarative/formula.ts"
```

---

## Implementation Strategy

- **MVP**: Phases 1–3 (US1) — free composition shell; old templates retire safely; page renders any structure
- **+US2/US3**: usable editor gestures + built-in presentation language
- **+US4**: derived stats, dynamic limits, portrait — the biggest expressiveness jump
- **+US5/US6**: lists anywhere; full character card parity; defaults rebuilt with zero placements
- **+US7**: gate recorded; cleanup deferred to explicit user confirmation
- `yarn verify` at every checkpoint (Constitution V tier 2); single `yarn verify:full` at T043

## Notes

- No document-envelope or templateValues shape migration — retirement via quarantine only (clarification 4)
- Template file wrapper version bumps 2 → 3; import of v2 files is rejected with an explanatory message
- Never hand-edit generated `ttgamer.*` entries in `i18n/*/code.json` or `src/i18n/generated/`
- Formula results and accent colors are never stored (A4/FR-11); collapse state never affects order or data
- All node ids stable across moves — bag values and seeded entries depend on them
