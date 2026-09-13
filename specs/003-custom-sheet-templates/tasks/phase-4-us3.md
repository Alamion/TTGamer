# Phase 5: User Story 3 — Catalog-backed fields auto-fill (T026–T031)

Parent: [tasks.md](../tasks.md) · Priority: P2

**Goal**: Choice fields can bind to data catalogs; options come from the catalog (localized); selecting an entry copies mapped details into linked fields (copy-on-select, replace re-copies, clear untouched); unavailable catalogs degrade to manual lists with an affected-fields notice.

**Independent Test**: With a template containing a catalog-backed field, pick an entry on a character page — linked fields populate instantly and stay editable; replace/clear behave per the clarified semantics.

- [x] T026 [US3] Create the binding registry `src/sheet_manager/features/sheet/data/catalogBindings.ts` per `contracts/catalog-binding.md`: entries for `melee-weapons`, `ranged-weapons`, `armor`, `tools-gear`, `force-powers`, `force-skills`, `species`, `merits-flaws` from `src/data/*Data.ts`; `entryLabel(entry, lang)` via the existing localization adapter; closed `fillableDetails` sets (key + `text`/`number` kind + label); `defaultMapping` per catalog (depends on T003)
- [x] T027 [P] [US3] Contract tests in `tests/sheet_manager/catalog-bindings.test.ts`: every `defaultMapping` target is kind-compatible, `fillableDetails` keys are stable kebab ids, `entryLabel` returns a localized label, closed-set enforcement helper rejects unknown keys (depends on T026)
- [x] T028 [US3] Implement the binding editor in `src/sheet_manager/components/dialogs/template-editor/` (`CatalogBindingEditor`): attach a registry catalog to a select field, default fills prefill from `defaultMapping`, remap detail → target (kind-compatible targets only, unselectable otherwise), disable individual fills, save validates `fills` keys ⊆ closed set and targets exist in the template (depends on T014, T026)
- [x] T029 [US3] Implement the catalog runtime in `src/sheet_manager/features/sheet/declarative/hooks.ts` + `fieldControls.tsx`: `resolveCatalogField` returns localized options from the registry; select → copy mapped details into target fields as character-owned values (replace ⇒ re-copy new entry's data; clear ⇒ untouched); single-choice enforced (depends on T020, T026)
- [x] T030 [US3] Implement degradation rendering in `src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx`: unknown `catalogId` → the field falls back to its static options plus a notice (`role="alert"`) naming the affected field labels; stored binding stays persisted for recovery (depends on T029)
- [x] T031 [US3] Add en+ru strings for the binding editor and degradation notices to `translations/source/{en,ru}/ui/sheet/templates.yaml`; run `yarn build:translations` (depends on T028, T029, T030)

**Checkpoint**: Spec US3 fully testable — including the re-selection semantics fixed during clarification.
