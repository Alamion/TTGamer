# Contract: Built-in Block Placement in Templates

**Feature**: 004-default-view-templates | **Status**: designed (Phase 1)

## Template file format (additive)

Template file version stays **2**; the format gains no version bump because the change is
additive — v2 parsers that ignore unknown block types would skip built-in blocks, but this
application's parser is version-locked to the current schema, so files written by this version
carry `built-in` blocks and older app versions reject the file as unsupported (acceptable:
single-user local-first app, no server).

Block union (within `TemplateBlockSchema`):

```jsonc
// New variant, sibling of { "type": "fields" } and { "type": "table" }
{
    "id": "header-placement", // placement id; unique across the whole template (FR-6)
    "type": "built-in",
    "blockId": "base", // registry key of the ready-made page part
    "accentColor": "primary", // optional; presentation option where supported (FR-2)
}
```

Rules:

- `id` MUST be unique across the template (fields, tables, built-in placements — one namespace).
- `blockId` availability is validated against the owning system's registry at **authoring** time
  (editor hides/unavailable blocks are unsaveable, FR-4) and **degraded** at render/import time
  (placeholder + notice, never a hard failure).
- All existing `TEMPLATE_LIMITS` apply; built-in placements count as blocks.

## Ready-made block registry (per-system availability)

`builtInBlockRegistry` exposes, besides component lookup:

```ts
getBuiltInSheetBlock(blockId: string): ComponentType<BuiltInBlockProps> | undefined;
isBuiltInBlockAvailable(systemId: string, blockId: string): boolean;
listBuiltInBlocks(systemId: string): ReadonlyArray<{ id: string; label: DocumentViewLabel }>;
```

`listBuiltInBlocks` feeds the editor's block picker (translated labels from registry data).
Availability derives from which registered views of that system use the block id.

## Renderer contract (DeclarativeSheetView)

- `{ type: 'built-in' }` block → `createElement(getBuiltInSheetBlock(blockId), { accentColor })`
  — the exact component and props the built-in view path uses (parity by construction, FR-3).
- Missing component (unknown id) → `BuiltInBlockPlaceholder` with the block id, `role="alert"`
  notice; surrounding page continues; no document data touched (FR-4).
- Ready-made blocks receive document data through the same hooks the built-in path uses; they do
  NOT read the template value bag (FR-5 — two persistence mechanisms, one page).

## Import/export

- Export serializes built-in placements like any block (FR-16).
- Import validates structure via the schema; unknown `blockId` values are reported per placement
  and import proceeds (degraded), consistent with the catalog-field degradation precedent.
- Import identity collision unchanged (replace / duplicate / cancel).
