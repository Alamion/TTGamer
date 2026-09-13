# Phase 1: Setup + Phase 2: Foundational (T001–T011)

Parent: [tasks.md](../tasks.md)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working baseline before feature changes.

- [x] T001 [P] Create feature string resource files `translations/source/en/ui/sheet/templates.yaml` and `translations/source/ru/ui/sheet/templates.yaml` with mirrored empty chrome groups (library, editor, page, binding, transfer) so `yarn build:translations` / `yarn validate:i18n` stay green from the start
- [x] T002 [P] Add a feature tracking section to `src/sheet_manager/TODO.md` recording this feature's slices (authoring, page rendering, catalog binding, import/export) per backlog conventions (English-only)

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contracts and stores every user story consumes. MUST complete before any story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 [P] Extend the select field schema in `src/sheet_manager/types/template.ts` with `CatalogBindingSchema` (`catalogId`, `fills: Record<detailKey, { targetFieldId, disabled? }>`); enforce: bound field ⇒ `multiple: false`, closed-set/kind/target checks as schema refinements where expressible, static placeholder `options` (min 1) preserved so the existing union stays valid; export the new types
- [x] T004 [P] Create `src/sheet_manager/types/templateValues.ts`: permissive envelope-layer bag schema (≤100 template ids, ≤2,000 field entries per template, strings ≤10,000 chars, finite numbers, resource `{current,max}` ints, table rows `Record<rowIndex, Record<columnId, value>>`) plus strict write-path helpers `validateTemplateValue(field, value)` and a keep-or-convert rule for field type changes (warn on lossy conversion)
- [x] T005 Add optional `templateValues` (default `{}`) to `DocumentEnvelopeBaseSchema` in `src/sheet_manager/types/document.ts` and bump `src/sheet_manager/store/documentStore.ts` to `version: 2`, extending `migrateDocumentStoreState` to accept missing bag as `{}` (existing documents parse unchanged)
- [x] T006 Create `src/sheet_manager/store/templateStore.ts`: Zustand + persist, storage key `'universal-template-storage'`, `version: 1`, actions `saveTemplate` (upsert via `CustomTemplateSchema.parse`), `duplicateTemplate(id, newId)`, `removeTemplate(id)`, `getTemplate(id)`; invalid persisted entries land in a bounded quarantine collection, never silently discarded
- [x] T007 Add `updateTemplateValues(documentId, templateId, values)` to `src/sheet_manager/store/documentStore.ts`: strict write path — resolve the template via `templateStore` and validate every value through `validateTemplateValue` before persisting; permissive envelope re-parse guards the bag
- [x] T008 [P] Add `resolveCustomTemplate(templateId, library, documentKind)` to `src/sheet_manager/systems/view.ts` (returns `CustomTemplate | { reason: 'missing' } | undefined`; kind compatibility enforced) and export it from `src/sheet_manager/systems/index.ts`
- [x] T009 [P] Foundational tests in `tests/sheet_manager/template-store.test.ts`: persistence round-trip (save → hydrate), upsert by id, duplicate under fresh id, remove, invalid persisted entry → quarantine
- [x] T010 [P] Foundational tests in `tests/sheet_manager/document-template-values.test.ts`: envelope parse with/without bag, v1→v2 migration (legacy documents unchanged), strict `updateTemplateValues` accept/reject matrix, oversized/corrupt bag → recovery semantics
- [x] T011 [P] Foundational tests in `tests/sheet_manager/view-resolution.test.ts`: `resolveCustomTemplate` outcomes (ready / missing / none), kind compatibility, stale id tolerated

**Checkpoint**: All contract seams ready — stories can start (US1 needs T003/T006; US2 needs T004–T008; US3 needs T003/T007/T008; US4 needs T003/T006).
