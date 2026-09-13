# Research: Built-in Views as Default Templates

**Feature**: 004-default-view-templates | **Date**: 2026-09-05

## R1 — How do ready-made interactive blocks enter the declarative template schema?

**Decision**: Extend `TemplateBlockSchema` (src/sheet_manager/types/template.ts) with a third
variant `{ type: 'built-in', id, blockId, accentColor? }`. `blockId` references the existing
`builtInBlockRegistry` keys (`base`, `attributes`, `skills`, `advantages`, `force`, `body`,
`other`, `brief-document`, `star-wars-creature-sheet`, `star-wars-vehicle-sheet`,
`star-wars-fodder-sheet`). The existing `BuiltInDocumentLayout.blocks`
(`SheetBlockPlacement { id, accentColor? }`) is the model — the template variant adds a stable
placement `id` so it lives in the same identifier namespace as fields/tables (FR-6).

**Rationale**: the declarative renderer (DeclarativeSheetView) already walks ordered blocks per
section; a block-level union extension is the smallest additive contract. Ready-made blocks render
through the exact same components built-in views use (CharacterSheet.tsx pattern), giving rendering
parity by construction (FR-3, SC-001).

**Alternatives considered**:

- Per-block declarative re-implementation (rebuild attributes/health as template fields) —
  rejected: interactive behavior (dot rows, trackers, catalog pickers) would be duplicated and
  drift; the spec's bar is "indistinguishable from the built-in page".
- Treating whole views as monolithic single blocks only — rejected: the user explicitly wants
  elements of full and brief compositions freely mixable in one template (clarification Q4).

## R2 — What is a default template's identity, and how do existing documents resolve?

**Decision**: a default template's identity IS the registered view id (e.g. `full-sheet`,
`brief`, `droid-sheet`). The page selector value stays the view id; `metadata.preferredViewId`
continues to resolve with **no migration and no special-case mapping** (clarification Q4). Default
templates are _derived_ at runtime via `viewToDefaultTemplate(view, systemId, kind)` in
`systems/view.ts`, converting `BuiltInDocumentLayout.blocks` → built-in template blocks.

**Rationale**: the user was explicit — full and brief are ordinary views to the system; the shared
value-key mechanism (spec-003 FR-25) keeps their values consistent because both compositions bind
to the same document data. Deriving instead of storing means the pristine original (reset source,
FR-10) always comes from the registry, zero storage cost, and new systems' views become default
templates automatically (FR-7).

**Alternatives considered**:

- Persist default templates into the library on first run — rejected: creates a migration moment,
  duplicates the registry as a second source of truth, complicates reset.
- Separate `default-` id namespace with legacy lookup — rejected: adds exactly the special-case
  mapping the clarification rejected; view-id identity needs none.

## R3 — How are edits to default templates persisted without making them "stored templates"?

**Decision**: persisted **override** slice in `templateStore`: `defaultOverrides:
Record<viewId, CustomTemplate>`. Effective content = `defaultOverrides[viewId] ?? derived(view)`.
`modified` state = an override exists (FR-12). Save (draft-until-save, FR-9) writes the override;
**reset** (FR-10) deletes it after confirmation — the registry-defined original is restored by
derivation. `removeTemplate` refuses view ids (FR-11); `duplicateTemplate` snapshots the effective
(modified) content into a normal custom template with a fresh id (clarification Q1).

**Rationale**: overrides keep the library listing logic uniform (every visible template resolves
through one "effective content" function), keep reset trivially correct, and survive
reload/restart via the existing persist middleware.

**Alternatives considered**:

- Flip a `isDefault` flag on stored `CustomTemplate` entries — rejected: pollutes the shared
  schema, makes "unmodified default" indistinguishable from "stored copy", complicates reset.
- Store diffs against the original — rejected: fragile against app updates changing the original;
  full-content overrides are simpler and cheap (local-first, small data).

## R4 — How does the template editor offer ready-made blocks per system, and what happens to unavailable ones?

**Decision**: the built-in block registry gains a per-system availability query (a block belongs
to the system whose document definition registered the view using it). The editor lists only
blocks available for the template's `systemId` (FR-4 saveable rule). At render time an unknown or
cross-system `built-in` block (imported file, system changed) renders a clearly-labeled placeholder
with a notice; the rest of the page and all document data are unaffected (FR-4 degradation, edge
case). Validation never hard-fails on unknown block ids at import — it warns and degrades.

**Rationale**: mirrors the established catalog-degradation pattern (spec-003 FR-21) and keeps
import forward-compatible across setups (the follow-up "new setups" spec relies on this).

**Alternatives considered**:

- Reject imports containing unknown blocks — rejected: would break sharing between app versions
  and setups; degradation is the established, pleasurable-degradation-conformant pattern.

## R5 — Selector merge and value consistency between full and brief

**Decision**: `ViewModeSelect` renders one merged list: the definition's views (which now resolve
to their default templates) plus compatible custom templates — exactly one entry per page (FR-13,
edge case). Assignment stores either a view id (default) or `tpl:<id>` (custom); resolution order:
custom template first, then view. Value consistency across full/brief compositions needs **no
synchronization logic**: both compositions bind inputs to the same document data and the same
shared value bag (spec-003 FR-25), so editing on one page is visible on the other (FR-8).

**Rationale**: matches the clarification — "full and brief views are seen as ordinary views";
consistency is a property of one value per key, not of template coupling.

**Alternatives considered**:

- Cross-template value-sync actions — rejected: two owners for one value violates the shared-key
  design and would create update loops.

## R6 — Testing strategy for rendering parity

**Decision**: parity tests compare the _component tree contract_, not pixels: for each registered
view, assigning its default template renders the same ready-made block components in the same
order with the same accent settings (SC-002), and interactions (edit attribute, damage track,
catalog pick) write the same store mutations as the built-in path. Persistence tests cover
override save/reset/duplicate round-trips and import-with-unknown-blocks degradation. Store
migration: none required (no document format change; template store gains an optional overrides
map, absent → no overrides).

**Rationale**: `yarn verify` tier per Constitution V; parity-by-construction (R1) keeps the test
surface small and meaningful.
