# Data Model: Custom Character Page Templates

Feature: `/specs/003-custom-sheet-templates/spec.md` · Date: 2026-09-02

All schemas are Zod; strict parse (unknown keys stripped) at every boundary. Existing
`TEMPLATE_LIMITS` (`types/template.ts`: 40 sections, 50 blocks/section, 60 fields/block,
100 options/field) are the product size limits referenced by spec FR-4.

## Entities

### Template (saved definition)

Existing `CustomTemplate` (`types/template.ts`) — extended with the catalog-binding field type
only where noted. Stored in the template library store.

| Field           | Type                | Rules                                                                                 |
| --------------- | ------------------- | ------------------------------------------------------------------------------------- |
| `id`            | kebab identifier    | unique within library, 1–64 chars, stable across renames (FR-8)                       |
| `name`          | string 1–120        | display name; duplicates allowed (FR-8)                                               |
| `description`   | string ≤ 1000       | optional                                                                              |
| `documentKind`  | `DocumentKind`      | compatibility scope (FR-9)                                                            |
| `schemaVersion` | int 1–1,000,000     | template-level format marker (FR-22); file format version lives in the export wrapper |
| `sections[]`    | `TemplateSection[]` | 1–40, unique `id`                                                                     |

### TemplateSection

| Field         | Type              | Rules                  |
| ------------- | ----------------- | ---------------------- |
| `id`          | kebab identifier  | unique within template |
| `title`       | string 1–120      | required               |
| `description` | string ≤ 500      | optional               |
| `blocks[]`    | `TemplateBlock[]` | 1–50, unique `id`      |

### TemplateBlock (discriminated union)

- **fields**: `id`, `title?`, `columns 1–4` (default 1), `fields[]` 1–60 (unique ids)
- **table**: `id`, `title?`, `minRows 0–1000` (default 0) ≤ `maxRows 1–1000` (default 100),
  `columns[]` = field defs 1–60 (unique ids)

### TemplateField (discriminated union by `type`)

Common: `id` (kebab), `label` 1–120, `description?` ≤ 500, `required` bool (soft advisory —
FR-4a, never blocks saving), `valueKey?` (kebab identifier; storage coordinate in the
document-scoped bag, default = field id — FR-25).

| Type                           | Extra settings                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`                         | `multiline` bool                                                                                                                                                    |
| `number`                       | optional `min` ≤ `max`, `step` > 0                                                                                                                                  |
| `toggle`                       | —                                                                                                                                                                   |
| `select`                       | `multiple` bool, `options[]` 1–100 (unique ids, label 1–120). **If catalog-bound: `multiple` MUST be false** (clarify Q5) and options come from the binding instead |
| `rating`                       | `min` int ≥ 0 (default 0), `max` int 1–100, `presentation`: `dots \| boxes \| number`                                                                               |
| `resource`                     | `min` int ≥ 0 (default 0), `max` int 1–1,000,000                                                                                                                    |
| `reference`                    | `targetKinds[]` 1–20 unique `DocumentKind`, `multiple` bool                                                                                                         |
| `select` + **catalog binding** | `binding: CatalogBinding` (below); options resolved at render                                                                                                       |

### CatalogBinding (NEW — part of select field def)

| Field       | Type                                              | Rules                                                                                                                                                                                                |
| ----------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalogId` | kebab identifier                                  | must resolve in the binding registry at render; unknown ⇒ degradation (FR-21)                                                                                                                        |
| `fills`     | `Record<detailKey, { targetFieldId, disabled? }>` | `detailKey` ∈ the catalog's closed `fillableDetails` set; `targetFieldId` must reference a field in the same template; `disabled: true` skips the fill. Missing detail key ⇒ default mapping applies |

Registry side (code-owned, `features/sheet/data/catalogBindings.ts` — NOT persisted):

- `catalogId → { entries, entryLabel(entry, lang), fillableDetails: { key, kind, label }[], defaultMapping }`
- `kind` of a detail ∈ `text | number` — determines target-field compatibility (text/multiline
  fields accept `text`; number/rating/resource accept `number`).

### Template Library Record (persisted entry)

Template as above + store-level bookkeeping: `createdAt`, `updatedAt` (epoch ms; not exported
as part of the template definition — wrapper only, see contracts). Provenance (skeleton /
duplicate / import) is derivable and NOT persisted.

### Page Assignment (document metadata — existing fields, new semantics)

| Field                      | Type                       | Rules                                                                                                     |
| -------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `metadata.templateId`      | kebab identifier, optional | set ⇒ custom page wins (R3); stale id ⇒ fallback + notice (FR-13); cleared when a built-in view is chosen |
| `metadata.preferredViewId` | `DocumentViewId`, optional | built-in page choice; untouched by template selection                                                     |

Resolution order: `templateId` present & resolvable → declarative page; present & missing →
built-in resolution + notice; absent → existing `resolveDocumentView()`.

### TemplateValues (envelope-level bag — flat since store v3)

```text
envelope.templateValues: Record<valueKey, FieldValue>
```

- One document-scoped namespace (clarification D1/D3, superseding the per-template nesting
  of store v2): fields in different templates sharing a `valueKey` address one entry.
- Optional on the envelope, `default({})`; v2 nested bags flatten through the v3 migration
  (per-key mapping, verbatim orphans, atomic per document — FR-28).
- Envelope-level validation is **permissive**: bounded record (≤ 2,000 entries,
  string values ≤ 10,000 chars, finite numbers, `current`/`max` pairs as
  `{ current: int, max: int }`) — integrity that protects parsing, not semantics.
- Sparse: only filled coordinates stored ⇒ orphaned keys survive template edits (FR-12).
- `FieldValue` by field type (enforced at write path where the template is known — R6):

| Field type         | Value shape                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `text`             | `string`                                                                                                           |
| `number`           | finite int within `min/max`                                                                                        |
| `toggle`           | `boolean`                                                                                                          |
| `select` (manual)  | option `id`; multi: array of unique option ids                                                                     |
| `select` (catalog) | catalog entry `id` (single)                                                                                        |
| `rating`           | int within `min/max`                                                                                               |
| `resource`         | `{ current: int, max: int }` within field bounds                                                                   |
| `reference`        | document id(s)                                                                                                     |
| table row cell     | per column type, keyed by row index: rows stored as `Record<rowIndex, Record<columnId, value>>` under the block id |

### Starter skeletons (code-owned, not persisted)

`features/sheet/data/templateSkeletons.ts`: one declarative `CustomTemplate` per document kind
with fresh ids on copy; approximate the built-in page structure (R4).

## Relationships

```text
TemplateLibrary (per system) 1 ──* Template (by systemId + documentKind compatibility)
Template 1 ──* TemplateSection ──* TemplateBlock ──* TemplateField
TemplateField (select) 0..1 ── CatalogBinding ── catalogId ──► binding registry entry
DocumentEnvelope.metadata.templateId 0..1 ──► Template (same systemId + documentKind)
DocumentEnvelope.templateValues[valueKey] ──► FieldValue (shared across templates)
CatalogBinding.fills[detailKey].targetFieldId ──► TemplateField (same template)
```

## State transitions

### Template lifecycle

```text
(new) ──create from base──► Draft ──save (valid)──► Saved ⇄ Saved (edited via new Draft)
                               │                        │
                               └──discard (confirm)─────┴──delete (confirm)──► (removed;
                                  draft only                        documents keep values,
                                                                    page falls back + notice)
```

- Draft lives in editor component state only (R8); leaving with unsaved changes ⇒ confirm.
- Save runs full `CustomTemplateSchema` validation; failure keeps draft intact (FR-4).
- Saved templates are immutable to characters between saves — characters render last saved
  version (clarify Q2).

### Catalog binding lifecycle

```text
attach catalog ──► default fills offered ──► remap/disable per detail ──► saved with template
render: catalogId resolvable? ── yes ──► options from catalog, localized
                               └─ no ──► manual choice field + affected-field notice (FR-21)
select entry ──► copy details into target fields (one-time, character-owned)
replace selection ──► re-copy new entry's details over linked values
clear selection ──► copied values untouched
```

### TemplateValues lifecycle (flat, valueKey coordinates)

```text
absent ({} after migration) ──fill field──► entry created ──edit──► updated
template field removed ──► entry becomes orphaned (retained, invisible)
template field re-added ──► entry visible again
valueKey renamed ──► new empty coordinate; old entry stays orphaned (never migrated)
field type changed ──► value kept if compatible, else converted or kept-as-is + loss warning
document deleted ──► values deleted with envelope
```

## Validation rules summary (boundary → enforcement)

| Boundary             | Rule                                                                                                 | Owner                        |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
| Template save/import | `CustomTemplateSchema` full parse; limits; unique ids                                                | `types/template.ts`          |
| Template file import | wrapper `format`/`formatVersion` check → schema parse → catalog availability scan                    | shell import flow            |
| Document envelope    | permissive `templateValues` record bounds                                                            | `types/templateValues.ts`    |
| Value write          | field-type-strict validation via template                                                            | store `updateTemplateValues` |
| Page assignment      | `templateId` kind-compatible; stale tolerated with notice                                            | view resolution              |
| Catalog binding save | `fills` keys ⊆ registry `fillableDetails`; targets exist in template; text/number kind compatibility | editor + write path          |
