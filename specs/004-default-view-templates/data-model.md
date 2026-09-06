# Data Model: Built-in Views as Default Templates

**Feature**: 004-default-view-templates | **Date**: 2026-09-05
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Extended Entities

### TemplateBlock (extended union — src/sheet_manager/types/template.ts)

New third variant alongside `fields` and `table`:

```ts
const BuiltInBlockPlacementSchema = z.object({
    id: templateIdentifierSchema, // placement id; one namespace with fields/tables (FR-6)
    type: z.literal('built-in'),
    blockId: z.string().min(1).max(80), // key into the per-system built-in block registry
    accentColor: z.enum(['primary', 'secondary']).optional(), // presentation option (FR-2)
});
```

Validation: `blockId` is NOT validated against the registry inside the schema (schema stays
system-agnostic; availability is a runtime registry query — research R4). Editor rejects
unavailable blocks at authoring time (FR-4); renderer degrades unknown ids to a placeholder.

### CustomTemplate — unchanged shape, new producer

No schema change. Default templates are `CustomTemplate` values **derived** from
`DocumentViewDefinition` (research R2): sections/block structure mirrors the view's
`BuiltInDocumentLayout.blocks` as one section with `built-in` block placements.

## New Entities

### DefaultTemplateDerivation (pure function, src/sheet_manager/systems/view.ts)

- **Input**: `view: DocumentViewDefinition`, `systemId`, `documentKind`.
- **Output**: `CustomTemplate` with identity = `view.id`, name = view label (translated registry
  data), sections composed of `built-in` placements carrying the view's block ids + accentColors.
- **Guarantee**: deterministic; the pristine reset source (FR-10). Never persisted as-is.

### DefaultOverride (persisted, templateStore)

```ts
defaultOverrides: Record<string, CustomTemplate>;   // key = view id (default template identity)
setDefaultOverride(viewId, template): void;          // explicit save (FR-9)
clearDefaultOverride(viewId): void;                  // reset (FR-10)
```

- Persisted through the existing Zustand persist middleware; absent key → unmodified default.
- Values validated by `CustomTemplateSchema` on hydration (same quarantine pattern as templates).
- `removeTemplate` refuses ids that are registered view ids (FR-11).
- `duplicateTemplate` snapshots **effective** content (override ?? derived) into a fresh custom
  template (clarification Q1).

## Relationships

- `DocumentViewDefinition` (registry, read-only) --derives--> `CustomTemplate` (default).
- `DefaultOverride[viewId]` --shadows--> derived default; reset removes the shadow.
- `TemplateBlock (built-in)` --references--> `builtInBlockRegistry[system][blockId]` (runtime).
- Page assignment (`metadata.templateId` / `preferredViewId`) --resolves--> default template
  (view id) or custom template (`tpl:<id>`); **no migration** (clarification Q4).

## State Transitions — Default Template lifecycle

| State             | Trigger                     | Result                                                    |
| ----------------- | --------------------------- | --------------------------------------------------------- |
| Pristine          | app start / reset confirmed | derived from registry; no override; no modified marker    |
| Draft (in editor) | author edits                | in-editor only; saved template unchanged                  |
| Modified          | explicit save               | override persisted; all assigned docs render it (FR-9)    |
| Reset (confirm →) | user reset + confirmation   | override deleted; pristine derived; marker clears (FR-12) |
| Duplicated        | user duplicate              | new independent custom template with current content (Q1) |

## Invariants

- One identifier namespace per template across fields, tables, and built-in placements (FR-6).
- Template size limits (TEMPLATE_LIMITS) apply to all block variants (edge case).
- Reset never touches document data; orphan semantics (spec-003 FR-12) govern removed content
  (FR-14; no special notice — clarification Q3).
- Unknown/unavailable `blockId` → placeholder + notice; never a render crash, never data loss
  (FR-4).
- Exactly one selector entry per page: view ids and `tpl:` ids never collide (FR-13).
