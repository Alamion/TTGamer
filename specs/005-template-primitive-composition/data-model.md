# Data Model: Template Primitive Composition

**Feature**: 005-template-primitive-composition | **Date**: 2026-09-05
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Extended Entities

### TemplateBlock (extended union — src/sheet_manager/types/template.ts)

New `primitive` variant alongside `fields`, `table`, `built-in`:

```ts
const PrimitivePresetSchema = z.object({
    key: templateIdentifierSchema, // author-chosen, part of the seeded entry id
    label: z.string().min(1).max(120),
    value: z.number().int().min(0).max(20).optional(), // dots default (CustomSkill-compatible)
});

const PrimitiveTrackOverrideSchema = z
    .object({
        levels: z.number().int().min(1).max(20),
        names: z.array(z.string().min(1).max(40)).min(1).max(20),
    })
    .refine(({ levels, names }) => names.length === levels, {
        message: 'Track names must match level count',
    });

const PrimitiveBlockSchema = z.object({
    id: templateIdentifierSchema,
    type: z.literal('primitive'),
    bindingKey: z.string().min(1).max(120),
    label: z.string().min(1).max(120).optional(), // presentation-only override (FR-6)
    compact: z.boolean().default(false), // brief-format rendering (FR-7)
    track: PrimitiveTrackOverrideSchema.optional(), // condition tracks only (FR-6)
    presets: z.array(PrimitivePresetSchema).max(TEMPLATE_LIMITS.presetsPerPrimitive).optional(),
});
```

Validation split (same principle as 004): the system-agnostic schema validates shape only —
`bindingKey` existence, kind-compatibility, and track-range checks are registry queries at
authoring time (editor) with render-time degradation.

### DocumentMetadata (additive — src/sheet_manager/types/document.ts)

```ts
seededPresets: z.array(z.string()).optional(),  // template ids whose presets were seeded
```

Absent on old documents → never seeded; additive optional parse keeps hydrate/round-trip green.

## New Entities

### DocumentBindingDescriptor (system-owned registry — systems/star-wars-wod/documentBindings.ts)

```ts
interface DocumentBindingDescriptor {
    key: string; // e.g. 'trait:ability:Athletics', 'list:customSkills',
    // 'resource:willpower', 'track:health', 'field:name'
    kind: 'trait' | 'list' | 'resource' | 'track' | 'field';
    label: string; // default label (from profile or declaration)
    documentKinds: ReadonlySet<string>; // kind scoping (FR-3/FR-4)
    // typed accessors — the system owns the mapping key → data:
    read(data: unknown): unknown; // descriptor-shaped value for the renderer
    write(data: unknown, value: unknown): unknown; // pure; applied via updateDocumentData
    meta?: { minimum?: number; maximum?: number; trackId?: string; listId?: string };
}
```

Registry API: `listDocumentBindings(systemId, documentKind)`, `resolveDocumentBinding(systemId,
documentKind, key)`. Trait/resource/track descriptors derive from `starWarsWodProfile` (groups by
role, resources, condition tracks); identity-field and custom-list descriptors are declared
explicitly per document kind. `list:custom*` descriptors carry `presets` support.

### Default Template Definitions (explicit — replaces viewToDefaultTemplate derivation)

Per definition, `full-sheet` / `brief` (and per-kind views) map to explicit `CustomTemplate`
values: identity-field primitives, trait-row primitives per profile trait (attributes, abilities),
custom-list primitives (talents/skills/knowledges), health track, willpower/force-points
resources — plus retained `built-in` placements for advantages/force/body-inventory (hybrid,
FR-10). Brief default = same bindings with `compact: true`. Identity = view id (no migration);
overrides/reset semantics from 004 unchanged (`resolveEffectiveTemplate` looks up the explicit
definition instead of deriving from the legacy view).

## Relationships

- `PrimitiveBlock.bindingKey` → `DocumentBindingDescriptor` (runtime registry lookup).
- `DocumentBindingDescriptor(trait)` → `character.attributes[key]` / `character.skills[key]`.
- `DocumentBindingDescriptor(list)` → `character.customTalents/customSkills/customKnowledges`
  (+ `presets` seeding).
- `DocumentBindingDescriptor(track)` → `character.health.levels` (vehicle-damage for mechanical).
- `metadata.seededPresets` ⊇ ids of templates whose presets were seeded into this document.

## State Transitions — Preset Seeding

| State          | Trigger                        | Result                                                   |
| -------------- | ------------------------------ | -------------------------------------------------------- |
| Not seeded     | template assigned (first time) | presets copied into the bound lists; marker recorded     |
| Seeded         | re-assign / re-render          | no-op (marker + deterministic ids)                       |
| Entry removed  | user deletes a seeded entry    | stays removed (marker prevents re-seed)                  |
| Presets edited | author saves template          | no effect on already-seeded documents (copy-on-assign)   |
| Template reset | override cleared               | seeding marker unchanged; entries remain character-owned |

## Invariants

- One identifier namespace per template across all block variants (FR-6/004 rule).
- Primitive data lives in document data; the template value bag is untouched by primitives (FR-8).
- Unknown or foreign-kind bindingKey → placeholder + notice; never a render crash; never data
  changes (FR-3).
- Seeding is idempotent per document×template and never resurrects deleted entries (R4).
- Label/track overrides are presentation-only — stored keys and derived calculations unaffected.
- Accent colors derive from parity; nothing stores accent for primitives.
- Track overrides validated against profile ranges at authoring time; invalid → editor message.
