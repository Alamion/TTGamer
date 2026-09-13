# Research: Template Primitive Composition

**Feature**: 005-template-primitive-composition | **Date**: 2026-09-05

## R1 — Where do binding keys come from, and who owns the mapping?

**Decision**: a per-system **document binding registry** (new `systems/star-wars-wod/documentBindings.ts`)
declares the closed set. Trait, resource, and condition-track bindings are **derived from the
system profile** (`starWarsWodProfile` — trait groups with roles, resources, condition tracks),
so profile stays the single owner of names/limits. Identity fields and custom lists are declared
explicitly in the registry (they are definition-shaped, not profile-shaped). Descriptors carry
typed read/write accessors; templates persist only the string key.

**Rationale**: mirrors the established closed-contract pattern (`features/sheet/data/catalogBindings.ts`);
a future setup declares its own bindings without touching shared code (Constitution I). Deriving
trait/resource/track bindings from the profile guarantees label/limit consistency and no drift.

**Alternatives considered**:

- Arbitrary JSON paths in templates — rejected (fragile against schema refactors; user review Q1-A).
- Static per-key code generation — rejected: accessor closures are simpler and type-safe.

## R2 — How are primitives represented in the template schema?

**Decision**: a third+ block variant `primitive` in `TemplateBlockSchema`:
`{ id, type: 'primitive', bindingKey, label?, compact?, track?: { levels, names }, presets? }`.
Additive — template file format stays v2; old templates parse unchanged; unknown `bindingKey`
degrades at render (never validated against the registry inside the system-agnostic schema —
same split as feature 004's `built-in` placements).

**Rationale**: one block kind covers all binding kinds (the renderer switches on the resolved
descriptor's kind); keeps the declarative schema free of system knowledge.

**Alternatives considered**: per-kind block variants (`trait-row`, `resource`, …) — more schema
surface for no benefit; the binding descriptor already discriminates.

## R3 — How do default templates become primitive-composed (phased parity)?

**Decision**: replace `viewToDefaultTemplate` derivation with **explicit default template
definitions in the system module** (identity = view id, unchanged): phase-one pages composed of
primitives (identity fields, attribute/ability trait rows, custom lists, health track, willpower
and force-points resources) plus retained `built-in` placements for the not-yet-covered parts
(advantages, force, body-inventory) — the sanctioned hybrid. Brief forms composed from the same
primitives with `compact: true`. Droid/creature/vehicle/fodder defaults analogously from their
profiles/fields.

**Rationale**: the hybrid composition is data, reviewable and editable like any template; the
user explicitly approved phased parity (pre-plan review, second pass). Explicit definitions beat
derivation from legacy views — the legacy views encode the old opaque composition.

**Alternatives considered**: deriving primitives from legacy view structure — rejected: the
legacy views are exactly what we are retiring; explicit definitions make the phase-two swap
(review → replace placement with primitives) a local edit.

## R4 — Preset seeding semantics (FR-16)

**Decision**: **copy-on-assign, once per document×template**. When a document's effective
template first contains preset list primitives, the entries are copied into the document's
`customTalents/customSkills/customKnowledges` arrays through `updateDocumentData` (parse-on-write)
with deterministic ids `preset-<templateId>-<entryKey>`; the document's
`metadata.seededPresets` records the template id. Consequences (all deliberate, per review):
removed entries never re-seed; later author edits to presets never propagate to already-seeded
documents; two templates seeding the same label produce two entries (deterministic ids differ).

**Rationale**: matches spec-003's copy-on-select precedent (character-owned copies; system
changes never rewrite copied values); deterministic ids + a marker make seeding idempotent
without label matching (which is fragile with renames).

**Alternatives considered**:

- Render-time virtual merge (presets never stored) — rejected: "editable and removable,
  indistinguishable from user-created entries" requires stored entries; virtual rows break
  removal and per-document values.
- Seeding on every render with id-skip — rejected: a deleted preset would resurrect on next
  render; the marker respects removal.

## R5 — Renderer architecture for primitives

**Decision**: `PrimitiveBlockView` resolves the binding descriptor once (registry lookup) and
switches on the descriptor kind to existing molecules: `TraitRow` / `TraitRowWithInput`
(attributes/abilities via `useCharacter()`), `CustomTraitsEditor`, `ResourceBlock`-style pool /
derived display, `CompactConditionTrack`, compact text field. Writes go through the same
capability paths the built-in blocks use. Compact flag swaps the molecule variant. Unresolvable
binding → `role="alert"` placeholder naming the key. Accent from block parity (004 helper).

**Rationale**: parity by construction — the page parts ARE the built-in page parts; zero
duplicated interaction logic. Reads/writes flow through `useCharacter()` exactly as
`AttributeBlock`/`BodyBlock` do today (document data, never the template value bag — FR-8).

## R6 — Editor experience for primitives

**Decision**: the block picker gains "primitive" entries grouped by binding kind (Identity /
Traits / Lists / Resources / Tracks), each showing human-readable binding names for the draft's
system+kind (kind-scoped filtering per 004's fix). The primitive config panel shows: the bound
binding (with change), label override, compact toggle, and kind-specific editors — track
levels/names (validated against profile track ranges, defaults prefilled) and preset entries
(add/rename/default value). The panel names the primitive after its binding — no anonymous panels
(004 review lesson).

**Rationale**: direct answer to the review feedback; kind-scoping prevents cross-kind data
crashes at authoring time.

## R7 — Testing strategy

**Decision**: `yarn verify` tier per Constitution V:

- Registry: derivation from profile completeness, kind scoping, unknown key resolution.
- Schema: primitive variant round-trip; legacy templates parse unchanged; presets/track override
  validation bounds.
- Seeding: idempotency (assign twice → one copy), removal respected, preset edit non-propagation,
  cross-template duplicates allowed, parse-on-write rejection safety.
- Parity: rebuilt default templates render the same molecules/interactions as the legacy
  composition (component-tree contract, per 004's approach).
- Degradation: unknown/foreign-kind binding → placeholder, page + data intact.
- Mixed persistence: primitives (document data) + fields/tables (value bag) independent.
