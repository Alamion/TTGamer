# Clarification: Shared Value Store + System Scoping (2026-09-03)

Decisions recorded after visual review and follow-up discussion (user-selected).

> **Authority note**: the normative requirement text now lives in [spec.md](./spec.md)
> (FR-9/FR-11/FR-12/FR-4a/FR-17 amended; FR-25–FR-29 added). This record is historical;
> where wording differs, spec.md supersedes.

## D1. Shared value store (replaces per-template bag)

**Decision**: One document-level value bag. The envelope keeps a single
`templateValues: Record<valueKey, FieldValue>` — **not** nested by template id. Templates
declare a `valueKey` per field (defaulting to the field id). Two fields in different
templates/views sharing the same `valueKey` read and write the same value — the vampire's
"appearance color" is one value shown by both its human-form and true-form pages.

Consequences:

- Re-assigning a different template no longer strands values under the old template id
  (strengthening FR-12): values live at document scope, keyed by semantic `valueKey`.
- Field identity for rendering is still the template's `field.id`; `valueKey` is only the
  storage coordinate. Default `valueKey = field.id` keeps authoring zero-config.
- Table block rows store under the table block's `valueKey` (default = block id).

**Migration (store v2 → v3)**: old `templateValues: { [templateId]: { fieldId: value } }`
is flattened — for each template in the library matching `templateId`, its fields' keys
map to `valueKey ?? field.id`; orphaned template ids keep their keys verbatim (values are
never destructively dropped). Legacy shape parsed leniently; unknown shapes go to recovery.

## D2. Author-visible value keys

**Decision**: Every field gets an optional author-visible `valueKey` (same identifier rules
as field ids). Uniqueness is enforced **within a template only** (the same restriction as
field ids today); across templates, an equal `valueKey` is the _sharing mechanism_, not an
error. The editor shows the key and allows editing it; a hint explains that identical keys
across templates share values on the same document.

## D3. Document-global key scope

**Decision**: `valueKey` scope is the document, no system/kind namespace. A key denotes one
value per document regardless of which template or system declared it. Collisions across
unrelated systems are possible only when two templates share a key intentionally — which is
the feature, not a hazard.

## D4. System scoping of templates

**Decision**: `CustomTemplateSchema` gains a required `systemId`. Compatibility for page
assignment and the library/selector listing becomes `(systemId, documentKind)` so Star Wars
skeletons never surface for a future VtM character. Code-owned skeletons declare their
systemId (`star-wars-wod`). Export format version bumps to 2 (wrapper unchanged); imports of
v1 files migrate by accepting them and defaulting `systemId` from… the template's declared
`documentKind`-owning system when unambiguous — implementation detail resolved as: v1 files
import as `systemId: 'star-wars-wod'` (the only system that existed at v1), with the
degradation report unchanged.

## Requirement mapping (spec deltas)

- FR-8 (stable identity) unchanged; add: template carries `systemId`.
- FR-11 (persist values) re-scoped: values persist per document keyed by `valueKey`.
- FR-12 (orphan preservation) re-scoped: orphaned = no template field currently maps a key;
  values never deleted by re-assignment.
- New FR-25: fields in different templates with equal `valueKey` share one stored value.
- New FR-26: template compatibility for assignment = same `systemId` and same `documentKind`.
- FR-18/FR-22: export wrapper `formatVersion: 2`; v1 files accepted with systemId default.

## Walkthrough resolutions (2026-09-03 checklist review)

- **D5 — Rename semantics**: changing a field's `valueKey` starts a new empty coordinate; the
  previous value stays orphaned and is never silently migrated (re-key back restores it).
  Spec: FR-12.
- **D6 — Type authority**: the shared store is type-agnostic. Each field validates its own
  writes against its own type; readers apply the keep-or-convert rule. A text/number,
  single/multi-select mismatch on one key never destroys data. Spec: FR-25.
- **D7 — Uniqueness namespace**: within one template, effective value keys of all fields AND
  all table blocks must be unique (one namespace). Across templates, equal keys are the
  sharing mechanism. Spec: FR-27.
- **D8 — Migration specifics**: per-key mapping (only keys the known template declares map
  through `valueKey`; undeclared keys pass verbatim), one-time per store upgrade, atomic per
  document (failures retained untouched in bounded recovery), template-library hydration is
  an ordering dependency. Later-imported templates do NOT retroactively remap orphaned v2
  keys. Spec: FR-28, SC-008.
- **D9 — v1 import default retirement**: `systemId` defaults to `star-wars-wod` while it is
  the only registered system; a second system plugin must switch v1 imports to explicit
  system choice. Spec: FR-29.
