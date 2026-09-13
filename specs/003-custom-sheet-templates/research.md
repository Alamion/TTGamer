# Research: Custom Character Page Templates

Feature: `/specs/003-custom-sheet-templates/spec.md` · Branch: `003-custom-sheet-templates` · Date: 2026-09-02

All unknowns were resolved by direct inspection of the existing codebase (no open questions
remained from the spec's clarification sessions). Each decision below records what was chosen,
why, and what was rejected.

> **Amendments (2026-09-03)**: R2 (per-document bag nested by template id) is superseded by
> the flat `valueKey`-keyed shared store (D1–D3, FR-25/FR-28, store v3); R3 gains system+kind
> compatibility (D4, FR-26); R7's file format is v2 (`systemId`, `valueKey`, FR-29). See
> [clarifications-shared-values.md](./clarifications-shared-values.md); the decisions below
> are kept as history.

## R1. Where the template library lives

**Decision**: New dedicated `store/templateStore.ts` — Zustand 5 + `persist` middleware with its
own localForage storage key (e.g. `'universal-template-storage'`), holding `templates[]` and
CRUD actions (upsert, remove, duplicate-with-new-id).

**Rationale**: Templates are not documents: different schema, different lifecycle (no envelopes,
no definitions, no presets), different import/export payload. Constitution IV demands one
responsibility per store; `documentStore.ts` is already polymorphic over document envelopes and
must not learn a second entity kind. A separate store also means template operations never
re-parse or touch character data.

**Alternatives considered**:

- _Inside `documentStore` as a second collection_ — rejected: pollutes the document envelope
  store's responsibility, couples migration paths, complicates the bounded recovery semantics.
- _Plain IndexedDB access without Zustand_ — rejected: loses the established persistence
  pattern (versioned migrate, async hydration) every other feature relies on.

## R2. Where per-document template values are stored

**Decision**: Add an optional, generic `templateValues` bag to the document envelope base schema
(`types/document.ts`): shape `Record<templateId, Record<fieldId, FieldValue>>`, sparse (only
filled fields have entries), validated at envelope level by a permissive size-bounded record
schema (`types/templateValues.ts`). Strict value-shape validation happens at the write path,
where the template definition is available to combine `field.type` + value.

**Rationale**:

- Values must travel **with the document**: export/import and multi-device sharing of a
  character must carry its custom-page values (spec FR-11, FR-18–FR-20 story). That rules out a
  separate store keyed by `documentId`.
- Definition data schemas (`BaseCharacterSchema`, per-kind payloads) are code-owned; injecting
  an open-ended user-defined field map into every definition schema would make each definition
  own a concept it does not know about. The envelope is the shared, generic layer — the correct
  owner for "any template's values".
- Sparse keys make FR-12 (orphaned values preserved; re-adding a field restores them) fall out
  naturally: nothing is deleted when a template changes, the renderer simply only displays
  fields the template declares.
- Envelope-level permissiveness + write-path strictness keeps the boundary honest: corrupted or
  oversized bags are stripped to recovery semantics rather than crashing render.

**Alternatives considered**:

- _Values inside each definition's `data` schema_ — rejected: spreads a generic concept across
  five+ code-owned schemas; every new definition must remember it; migration churn per kind.
- _Separate `templateValuesStore` keyed by document id_ — rejected: breaks atomic export
  (character JSON would not include page values) and doubles persistence failure modes.

**Contract impact (Constitution II)**: envelope schema change → store `version` bump
(1 → 2) with `migrateDocumentStoreState` accepting missing bag as `{}`; round-trip + migration
integration tests on both sides. Existing documents parse unchanged (additive optional field).

## R3. Page assignment and view resolution

**Decision**: `metadata.templateId` (already present in `DocumentMetadataSchema`) selects a
custom page; `preferredViewId` continues to select built-in views. Resolution order in
`CharacterSheet` / `SheetWorkspace`:

1. If `templateId` is set **and** the template exists in the library → render declarative page.
2. If `templateId` is set but missing → built-in resolution via `resolveDocumentView()`
   (falling back to `definition.defaultViewId`) **plus a persistent fallback notice** (spec FR-13);
   the stale `templateId` stays on metadata so it can be re-pointed later.
3. Otherwise → existing built-in resolution unchanged.

`ViewModeSelect` lists built-in views plus compatible custom templates (same document kind);
choosing a built-in clears `templateId`, choosing a template sets it (and vice versa), so the
two controls form one coherent "page" choice (spec FR-9).

**Rationale**: reuses the pre-seeded metadata field and keeps built-in view logic untouched —
custom pages are a strictly additional branch (Constitution I). The ViewModeSelect merging gives
users one place to switch pages, matching the spec's coexistence assumption.

**Alternatives considered**:

- _Encode template pages as `preferredViewId = 'custom:<id>'`_ — rejected: `DocumentViewId` is a
  definition-owned kebab identifier; smuggling entity ids into it breaks the "shells must not
  maintain view-ID label maps" rule and aliases would collide with real view ids.
- _Separate page-picker dialog only_ — rejected: fragments the page choice; the existing
  view selector is already where users change pages.

## R4. "Copy of a built-in page layout" as a starting point

**Decision**: Provide **code-owned declarative starter skeletons** ("standard character
skeleton" and one per other document kind) as the built-in starting points — declarative
approximations of each built-in page's section structure (attributes, skills, advantages,
force, equipment, notes) using plain fields/tables. They live in `features/sheet/data/`
alongside presets, are copied (never referenced) when chosen (spec FR-1).

**Rationale**: Built-in layouts are React block placements (`BuiltInDocumentLayout` — code
blocks like the health tracker), which by design cannot be expressed as declarative fields
(spec's declared v1 scope: declarative-only). A literal "copy the React layout" is impossible
without embedding code; the honest interpretation of FR-1(b) is a shipped structural skeleton
that feels like the built-in page's organization. Skeletons are data, versioned with the app,
and never executable (FR-5).

**Alternatives considered**:

- _Serialize built-in layouts to templates_ — rejected: impossible without violating the
  declarative-only decision (Q2 of clarify session); code blocks have no field representation.
- _Empty structure only_ — rejected: loses the spec's explicitly required starting point (b)
  and the SC-001 "under 10 minutes" goal.

## R5. Catalog binding contract

**Decision**: Sheet-local adapter registry `features/sheet/data/catalogBindings.ts` mapping a
stable `catalogId` (kebab-case, e.g. `'melee-weapons'`, `'force-powers'`, `'species'`) to:

- `entries` — the typed catalog array (existing `src/data/*Data.ts`),
- `entryLabel(entry, lang)` — localized display label (reuses `localizeCatalogEntry`),
- `fillableDetails` — the **closed set** of bindable entry details (key + value kind),
  declared by the adapter,
- `defaultMapping` — default detail → target mapping offered on attach (clarify Q3).

The template stores only ids: `catalogId`, and a remap of detail-key → target field id
(or `disabled`). At render time the binding resolves through the registry; unknown `catalogId`
degrades the field to a manual choice list (spec FR-21) with the affected field named.

**Rationale**: `data/` stays the single owner of what is bindable (Constitution II — explicit
contract at the boundary); `sheet_manager` already keeps sheet-local catalog adapters in
`features/sheet/data/` (precedent: `bodyEquipmentCatalogs.ts`). Templates importable across
devices stay valid because only ids cross the boundary; the closed `fillableDetails` set makes
import validation deterministic (an unknown detail key is a validation error, not silent data).

**Alternatives considered**:

- _`src/integrations/` adapter module_ — rejected for now: both sides (catalogs, sheet manager)
  are in-app and the module's own AGENTS.md establishes the sheet-local adapter precedent;
  promoting to `integrations/` is warranted only if a second consumer appears.
- _Free-form author mapping over raw entry objects_ — rejected by clarify Q3 (default set +
  remap) and because raw entry shapes are not stable enough to persist.

## R6. Value validation strategy

**Decision**: Two-layer validation. Envelope layer (`templateValues` bag): permissive record
schema with hard bounds (max entries per document, value byte-size caps, finite numbers) so a
corrupt bag can never break document parsing — oversized/invalid entries drop to the store's
existing recovery semantics. Write layer: `updateTemplateValues()` combines the template's
field schema (type, bounds, option membership, rating/resource limits, required refs) with the
incoming value and rejects mismatches before persisting. Read layer: renderer defensively
coerces/falls back per field type.

**Rationale**: The envelope cannot know which template (if any) owns a key — strict validation
belongs where the template is in hand. Envelope permissiveness preserves FR-12 (orphaned keys
survive template edits) without weakening the write boundary. Mirrors the existing pattern:
`updateDocumentData` re-parses through the owning definition; here we re-parse through the
owning template.

**Alternatives considered**:

- _Strict union schema at envelope level_ — rejected: envelope cannot resolve template context;
  strictness there would corrupt-reject legal orphaned values.
- _No read-layer coercion_ — rejected: templates can change type after values exist; the edge
  case list requires keep-or-convert with a loss warning.

## R7. Template import/export file format

**Decision**: Export a single JSON object — the template plus an explicit format marker:

```json
{
  "format": "ttgamer-template",
  "formatVersion": 1,
  "template": { ...CustomTemplate... }
}
```

Validation path: `JSON.parse` → check `format`/`formatVersion` → `CustomTemplateSchema.parse`
(strips unknown keys) → catalog-id availability check (degrade, don't reject) → conflict flow.
Export filename `ttgamer_template_<id>.json` (extends the `ttgamer_` convention). Import reuses
`ImportConflictDialog` (Replace / Duplicate-new-id / Cancel); cancel changes nothing. Template
values of characters are **not** part of the file — they travel with character exports.

**Rationale**: The wrapper object (vs bare template) makes the file self-describing and lets
future format migrations key off `formatVersion` without guessing (FR-22); reusing the
document conflict dialog gives identical UX (Constitution VI) and reuses tested components.

**Alternatives considered**:

- _Bare `CustomTemplate` JSON_ — rejected: no place for the format marker; legacy/foreign files
  become indistinguishable from future shapes.
- _Bundle characters with the template_ — rejected: scope creep; values are document-owned.

## R8. Draft editing model for the editor

**Decision**: `TemplateEditorDialog` keeps the working copy in local (Zustand-free) component
state seeded from the saved template (or a fresh/duplicated/skeleton base). "Save" validates
against `CustomTemplateSchema` and upserts into `templateStore`; "Discard"/close-with-changes
prompts confirmation. The library list always renders the saved version (clarify Q2). Live
integrity feedback (duplicate ids, limits) computes against the draft on each edit.

**Rationale**: Matches the clarified explicit save/discard model with zero persistence risk;
no new store state or persistence of half-built templates; local draft keeps the editor
throwaway-safe (close tab = lose draft, consistent with the confirmation prompt).

**Alternatives considered**:

- _Draft persisted to storage (auto-recovery)_ — rejected for v1: extra persistence surface and
  migration; noted as a possible follow-up (edge case documented in spec).
- _Editing directly in the store (auto-save)_ — rejected: contradicts clarify Q2 decision.

## R9. Localization of authored content vs UI chrome

**Decision**: Template-authored labels/descriptions/option labels are **user data** — stored
verbatim, rendered as-is, never routed through the translation pipeline. All feature _chrome_
(library, editor, import/export, fallback notices, degradation warnings) ships through
`translations/source` YAML in en + ru (`yarn build:translations`, `validate:i18n` gates).
Catalog entry labels localize via the existing `localizeCatalogEntry` adapter.

**Rationale**: The YAML pipeline is for shipped UI strings; user content must round-trip
through export/import byte-identical (SC-004). Constitution VI's language split is respected:
chrome localized, data not.

## R10. Performance posture

**Decision**: No lazy-loading surface needed for v1: the renderer is plain composition over
existing primitives; the editor dialog mounts on demand (existing dialog pattern already
code-splits nothing else in the module — the feature adds no new heavy dependencies, 3D, or
audio). Sparse value storage keeps documents small. Store selectors keep re-renders scoped
(template lookup by id, values by template id). SC-006 scale (50 templates × max limits) is
trivial for IndexedDB + memoized lookups.

**Rationale**: Constitution VII asks for budget awareness; the plan adds no critical-path
weight. The one watch-item is re-render scope on value edits in table blocks — handled via
per-field write callbacks and selector granularity, verified in component tests.
