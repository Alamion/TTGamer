# Data Model: Template Composition Usability

**Feature**: 006-template-composition-usability | **Date**: 2026-09-06
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Template Node Tree (schema version 3 — src/sheet_manager/types/template.ts)

`CustomTemplateSchema` (v3) replaces `sections: TemplateSection[]` with a recursive tree.
Shape-only validation (no registry/formula knowledge inside the system-agnostic schema —
same split as 004/005):

```ts
const TEMPLATE_LIMITS = {
    maxDepth: 10,            // A2 guardrail; authoring-time rejection with message
    nodesPerTemplate: 200,   // replaces sections/blocks/fields counting
    optionsPerField: 100,
    fillMappingsPerField: 100,
    presetsPerList: 30,
    columnsMax: 4,           // sections, groups, lists
} as const;

const SectionNodeSchema = z.object({
    id, type: z.literal('section'),
    title: z.string().min(1).max(120),
    docsPath: z.string().max(500).optional(),      // FR-9 documentation link
    columns: z.number().int().min(1).max(4).optional(), // FR-9 direct-children layout
    children: NodeArraySchema,                     // 1..nodesPerTemplate, unique ids
});

const GroupNodeSchema = z.object({
    id, type: z.literal('group'),
    title: z.string().min(1).max(120),
    collapsible: z.boolean().default(false),       // FR-10 opt-in; remembered via storage key
    columns: z.number().int().min(1).max(4).optional(),
    children: NodeArraySchema,
});

const TableNodeSchema = /* as before: id, type 'table', title?, valueKey?, minRows, maxRows, columns: TemplateField[] */;

const ListNodeSchema = z.object({
    id, type: z.literal('list'),
    title: z.string().min(1).max(120).optional(),
    valueKey: templateIdentifierSchema.optional(), // mode A: value-bag storage
    bindingKey: z.string().min(1).max(120).optional(), // mode B: system-owned list
    columns: z.number().int().min(1).max(4).default(1), // FR-18; replaces hardcoded 3
    presets: z.array(PrimitivePresetSchema).max(TEMPLATE_LIMITS.presetsPerList).optional(), // FR-19
}).refine(exactly one of valueKey | bindingKey set);

const PrimitiveNodeSchema = /* as 005: bindingKey, label?, compact?, track? */;

const ImageFieldSchema = z.object({
    ...fieldBaseShape, type: z.literal('image'),
});

const FormulaFieldSchema = z.object({
    ...fieldBaseShape, type: z.literal('formula'),
    formula: z.string().min(1).max(500),           // arithmetic over coordinates (contract: formula-grammar.md)
});

// rating (and number) fields gain:
maxFrom: z.string().max(500).optional(),           // coordinate or arithmetic formula; dynamic maximum (FR-12)

// resource primitives gain:
maxFrom: z.string().max(500).optional(),           // formula-bound ceiling for system pools (FR-12)

const TemplateNodeSchema = z.discriminatedUnion('type', [
    SectionNodeSchema, GroupNodeSchema, /* field union incl. image + formula */,
    TableNodeSchema, ListNodeSchema, PrimitiveNodeSchema,
]);

const CustomTemplateSchema = z.object({
    id, name, description?, systemId, documentKind,
    schemaVersion: z.number().int(),               // authored templates persist 3
    children: NodeArraySchema,                     // page root: any node, any order
});
```

Rules carried over: one identifier namespace per template (all node ids unique across the
tree); `valueKey` defaults to the field id; equal keys share one bag entry; container
`children` ids unique within the template, not per container.

## Value Bag Shapes (src/sheet_manager/types/templateValues.ts)

Additive unions on the write path (envelope layer stays permissive):

```ts
export const TemplateListEntrySchema = z.object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(120),
    value: z.number().int().min(0).max(20).optional(),
});
export const TemplateListValueSchema = z.array(TemplateListEntrySchema).max(1000);

export const TemplateImageValueSchema = z.union([
    z.object({ source: z.literal('device'), blobId: z.string().min(1).max(128) }).strict(),
    z.object({ source: z.literal('url'), url: z.string().min(1).max(2048) }).strict(),
]);
```

- List values under the list's `valueKey`; removing a list element orphans (retains) the
  stored array — never destructively deleted.
- Image values: device blobs live only in IndexedDB (`persistence/portraitStorage.ts` —
  reused store, resize + 512 KB + 50 MB quota); JSON export strips `source:'device'` entries.
- Formula results are **not** bag values (A4 — computed at render, never stored).
- Rating clamping: renderer displays `min(stored, resolvedMax)`; the write path clamps when
  the bounded value itself is edited. Stored values are never rewritten by cap changes.

## Binding Registry v2 (src/sheet_manager/systems/star-wars-wod/documentBindings.ts)

Extensions (full contract: [contracts/binding-registry-v2.md](./contracts/binding-registry-v2.md)):

- `ListBinding.listId` union grows: `customTalents | customSkills | customKnowledges |
forcePowers | merits | flaws | backgrounds` — each with catalog metadata (catalog id,
  copy-on-select detail mapping) so the renderer reuses `CustomTraitList` / `MeritFlawList`.
- New `EquipmentBinding` kind (`kind: 'equipment'`): `sectionId: 'inventory' | 'armor' |
'weapons' | 'implants'`, rendered through the body-section molecules + `useBodyHandlers`.
- Numeric coordinate resolution for formulas: trait → value; resource → `.current` / `.max`;
  field → value. Pool-shaped coordinates expose the `.current` / `.max` suffixes.

## Formula Module (src/sheet_manager/features/sheet/declarative/formula.ts)

Pure, deterministic, zero UI/store imports:

```ts
type Expr = { kind: 'num'; value: number }
          | { kind: 'coord'; path: string }             // 'willpower.max', 'strength', ...
          | { kind: 'bin'; op: '+' | '-' | '*' | '/'; left: Expr; right: Expr }
          | { kind: 'neg'; operand: Expr };

parseFormula(src: string): { ok: true; expr: Expr; coords: string[] } | { ok: false; error: FormulaParseError };
evaluateFormula(expr: Expr, resolve: (path: string) => number | undefined):
    { ok: true; value: number } | { ok: false; error: 'unknown-coordinate' | 'non-numeric' | 'division-by-zero' | 'circular' };
collectDependencies(expr: Expr): string[];
detectCycles(nodes: { id: string; coords: string[] }[]): string[][]; // named cycles for authoring errors
```

Grammar and resolution rules: [contracts/formula-grammar.md](./contracts/formula-grammar.md).

## Template Store v3 (src/sheet_manager/store/templateStore.ts)

Persisted shape unchanged (`templates`, `quarantine`, `defaultOverrides`), `STORE_VERSION` 3.
Migration: parse every entry against the v3 schema; failures (all pre-feature shapes) →
quarantine (bounded 100); documents are not touched. `resolveCustomTemplate()` returns
`missing` for retired ids → built-in page + stale-template notice (existing behavior).
Default overrides keyed by view id parse identically; old-shape overrides → quarantine.

## State Transitions

| State                                          | Trigger                  | Result                                                                 |
| ---------------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| Pre-feature v2 template on store hydrate       | migrate v2→v3            | moved to quarantine; documents fall back to built-in page + notice     |
| Retired template id in `metadata.templateId`   | resolve                  | `missing` → built-in page fallback; assignment re-pointable            |
| Rating with `maxFrom`                          | render                   | display `min(stored, resolvedMax)`; missing source → labeled state     |
| Rating with `maxFrom`                          | user edits bounded value | write clamped to resolved max; stored value never auto-rewritten       |
| System pool with `maxFrom` (e.g. Force Points) | render/edit              | current clamped to computed ceiling on write; display clamped          |
| Formula source deleted                         | render                   | labeled error state; page + data unaffected                            |
| List (valueKey) edited                         | view time                | array replaced under its coordinate; orphans retained on removal       |
| List (bindingKey) first use                    | template assigned        | presets seeded once per document×template (005 semantics)              |
| Group collapsible toggled                      | view time                | expanded state persisted per user (storage key `template-<tid>-<nid>`) |
| Container moved                                | editor tree op           | whole subtree moves; ids, values, seeded markers untouched             |

## Relationships

- `CustomTemplate.children` — recursive tree; every node's `id` unique per template.
- `field.valueKey` / `table.valueKey` / `list.valueKey` / `image.valueKey` → flat
  `templateValues` bag (shared namespace across templates, unchanged).
- `primitive.bindingKey` / `list.bindingKey` → registry descriptor → document data paths.
- `formula`/`maxFrom` coordinate strings → unified coordinate space (bag numbers + registry
  numeric coordinates); dependency edges validated acyclic at authoring time.
- `image.valueKey` → bag image value → (`portraitStorage` blob id | safe URL).
- `metadata.seededPresets` ⊇ template ids whose list presets were seeded (unchanged mechanism,
  now also for `forcePowers`/`merits`/`flaws`/`backgrounds` list bindings).

## Invariants

- Every element is placeable at every level up to `maxDepth`; exceeding it is an
  authoring-time rejection — never silent truncation, never render corruption.
- The template schema never references systems: binding/formula validity are editor queries
  with render-time degradation (placeholder + notice, zero crashes, zero data changes).
- Primitives, list bindings, and image device blobs live outside the value bag; declarative
  fields/tables/lists-with-valueKey live inside it; both persist independently on mixed pages.
- Formula results and accent colors are never stored; label/track overrides are
  presentation-only.
- Collapse state never affects order or data; reorder never affects visibility or data.
- Retired templates: zero crashes, zero data changes; quarantine is bounded and recoverable.
- All node ids remain stable across editor moves — stored values and seeded entries depend on
  them.
