# Research: Template Composition Usability

**Feature**: 006-template-composition-usability | **Date**: 2026-09-06

## R1 — How is the recursive composition model encoded in the template schema?

**Decision**: replace `sections: TemplateSection[]` with a single recursive node tree:
`CustomTemplate.children: TemplateNode[]`, where `TemplateNode` is a discriminated union of
containers (`section`, `group`) and leaves (`field`, `table`, `list`, `image`, `primitive`).
Containers hold ordered `children` arrays; every node keeps a stable `id`. Limits become
`maxDepth: 10` (Assumption A2) and `nodesPerTemplate: 200` (replaces section/block/field
counting). The template schema version moves 2 → 3.

**Rationale**: one placement rule for every element (FR-1) is exactly "children arrays all the
way down"; discriminated unions keep Zod parsing strict and the renderer exhaustive. The old
three-level counting rules (sections/blocks/fields) cannot express a field at page root or a
section inside a section, so they are replaced by node counting.

**Alternatives considered**:

- Flat node list with parent pointers — rejected: ordered children arrays are what the editor
  and renderer already do per level; parent pointers add index-bookkeeping bugs for no gain.
- Keeping `sections` and adding an optional `children` escape hatch — rejected: two coexisting
  composition models double every editor/renderer path; the user explicitly retired the old
  realization (clarification 3).

## R2 — How do pre-feature templates retire (FR-4) without data damage?

**Decision**: `templateStore` bumps to version 3; its migrate function parses each saved
template (and default override) against the new schema. Old-shape entries fail parsing by
construction (they carry `sections`, not `children`) and move into the existing bounded
`quarantine` — the established "retained for recovery, never silently dropped" pattern.
`resolveCustomTemplate()` then reports `missing` for documents whose `metadata.templateId`
points at a retired entry, which already renders the built-in page plus the stale-template
notice and keeps the assignment re-pointable. Document data and the value bag are untouched.

**Rationale**: the quarantine path already exists, is bounded (100), and is surfaced in the
library UI; reusing it means "clearly marked incompatible" costs no new mechanism and no
document changes (graceful retirement, zero data corruption — SC-003).

**Alternatives considered**:

- A `retired: true` flag kept in the library list — rejected: dead entries users cannot edit
  or assign are exactly what quarantine already represents; a flag adds a third template state.
- Best-effort structural migration — explicitly rejected by the user (no user base; migration
  becomes a constitution-amendment obligation only once permanent users exist, A5).

## R3 — How do formulas work (FR-12/FR-13)?

**Decision**: a new pure module `features/sheet/declarative/formula.ts`: tokenizer +
recursive-descent parser producing an AST, evaluator resolving **coordinates** to numbers.
Grammar is arithmetic-only: `+ − × ÷`, parentheses, unary minus, numeric literals, and
coordinate references (optionally `.current` / `.max` for pool-shaped values) — exactly the
clarified scope. A bare coordinate is a valid formula, so **one mechanism** covers both "max
bound to a direct value" and "max bound to a formula": `maxFrom: string` on rating fields and
on resource primitives. Dependency sources are extracted from the AST; the template's whole
dependency graph is validated at authoring/save time (unknown coordinates, parse errors,
cycles with the cycle path named). At render, resolution is memoized per pass with a
visited-set guard (defense in depth) and failure yields an explicit labeled error state, never
a wrong number. Formula results are never stored (A4); display clamps `min(stored, cap)`,
write clamps on the value's own write path.

**Rationale**: pure/deterministic per Constitution IV (dice-logic standard); coordinate-only
grammar removes the need for a second "direct link" concept; AST extraction gives both the
authoring picker and cycle detection from one source of truth.

**Alternatives considered**:

- Reusing the dice-logic lexer/parser — rejected: different language (no dice, no fudge),
  and dice-logic must stay free of sheet/template concerns (module boundary).
- Storing computed values — rejected: violates A4 and creates double-owner data.
- Clamping stored values whenever a cap source changes — rejected: it would rewrite history
  the user did not touch; display clamp satisfies SC-005 while writes stay user-owned.

## R4 — What is the unified value-coordinate space formulas and pickers see?

**Decision**: one resolver (`hooks.ts`) enumerates numeric coordinates from two sources and
presents them as one undifferentiated labeled list: (a) template-owned — numeric fields and
ratings by value key, resource fields as `<key>.current` / `<key>.max`; (b) system-owned —
trait bindings (trait value), resource bindings as `<resourceId>.current` / `.max`. The
resolver reads system bindings through the registry (system/custom split stays under the
hood, per spec) and template fields from the flat value bag. Non-numeric coordinates are
simply not offered to formulas.

**Rationale**: the flat bag already shares coordinates across templates (D1/D2 semantics), and
`resolveDataBindingByCoordinate` already bridges bag keys to document data — the resolver is
their union with numeric typing, not a new namespace.

**Alternatives considered**: formula syntax with system prefixes (`system:willpower`) —
rejected: it would surface the system/custom split the spec requires hiding.

## R5 — How do custom lists work anywhere (FR-17/FR-18)?

**Decision**: a `list` leaf with two storage modes behind one element interface: `valueKey`
(stores `Array<{ id, label, value? }>` in the value bag under a new list value shape,
validated on the write path) or `bindingKey` (a system-owned list through the registry).
Author configures title, optional rating display, and columns 1–4; presets carry over from
the 005 mechanism (seed-once via `metadata.seededPresets`). `CustomTraitsEditor` gains a
columns parameter (1–4, default from author config instead of hardcoded 3). System list
bindings extend beyond the skills domain: `forcePowers`, `merits`, `flaws`, `backgrounds`
(see R6) — rendered by the same editor molecules with their catalogs.

**Rationale**: value-key storage reuses the bag's orphaned-value conventions; the element
interface stays identical across modes (spec FR-17); extending the proven list molecules keeps
parity by construction.

**Alternatives considered**:

- Lists as rows of fields — rejected: entry add/remove lifecycle and per-entry ids are list
  semantics; faking them with fields loses identity and seeding.
- Unifying trait maps and list arrays — rejected (spec A6): no user-visible gain for a
  breaking schema rework.

## R6 — How do the remaining character-card elements become expressible (FR-20)?

**Decision**: extend the binding registry (v2 contract): `list:` bindings gain
`forcePowers`, `merits`, `flaws`, `backgrounds` (each declaring its catalog: FORCE_POWERS /
MERITS_FLAWS split by type / BACKGROUNDS, with copy-on-select rules) and a new `equipment:`
binding kind addresses `inventory` / `armor` / `weapons` / `implants` through the existing
body-section molecules and `useBodyHandlers` capability paths. The renderer maps these
descriptors to `CustomTraitList` / `MeritFlawList` / body sections exactly as `ForceBlock`,
`AdvantagesBlock`, and `BodyBlock` do today. Foreign-kind usage degrades to placeholders
(existing rule).

**Rationale**: parity by construction — the template elements ARE the built-in molecules; the
registry stays the single owner of key → data mapping (Constitution I), and catalogs remain
behind the established `features/sheet/data` adapters.

**Alternatives considered**: new bespoke template-only editors for merits/equipment —
rejected: duplicating interaction logic is exactly what the module rules forbid.

## R7 — How is the per-document image field built (FR-16)?

**Decision**: an `image` leaf stores its value under the field's value coordinate as
`{ source: 'device', blobId } | { source: 'url', url }` (new write-path-validated value
shape). Device upload reuses `persistence/portraitStorage.ts` as-is — resize, 512 KB bound,
50 MB quota, IndexedDB — via its existing save/load/delete functions (renamed exports stay
compatible; the portrait field keeps working). URL entry applies `getSafePortraitUrl` rules
(HTTPS or site-relative only). JSON export strips device-source values (blob ids), matching
the portrait rule; read-only contexts render without edit affordances.

**Rationale**: FR-16 names the portrait rules verbatim; reusing the proven, tested store is
the constitution's "reuse proven primitives before creating type-specific equivalents".

**Alternatives considered**: a second image store — rejected: doubles quota bookkeeping for
no user-visible gain; the 50 MB shared bucket is a feature (bounded device usage).

## R8 — How do presentation and editor affordances get their distinct forms (FR-6/9/10)?

**Decision**: view rendering maps containers to the existing molecules: `section` →
`CollapsibleBlock` (no background; optional `docsPath`; when the author sets columns 1–4 the
renderer lays direct children into the matching grid); `group` → `SectionCard` (surface
background, always-visible title; `storageKey` — hence remembered state — only when the
author opts into collapsibility). Editor panels get a **grip handle (Lucide `GripVertical`)
on the panel's left edge** that starts native HTML5 drag to reorder within or across
containers, with keyboard reorder on the focused grip (arrow keys) and distinct ArrowUp/ArrowDown
fallback buttons; the collapse chevron stays on the panel's right — different icon, different
side, no shared hit area at any depth (A3's fallback is built in from the start for keyboard
users).

**Rationale**: both presentations already exist as tested molecules — the renderer composes
them instead of inventing chrome; left-grip/right-chevron is a spatially unambiguous pattern
that survives arbitrary nesting depth.

**Alternatives considered**:

- Rendering sections as new components — rejected: CollapsibleBlock/SectionCard already
  encode the requested styling; a section's column layout belongs to the renderer's child
  layout, not to the molecule.
- Hover-revealed move buttons next to the chevron — rejected: same spot = same confusion the
  spec bans (FR-6).

## R9 — How are shipped default templates rebuilt (FR-4)?

**Decision**: rewrite `systems/star-wars-wod/defaultTemplates.ts` from scratch. Full view =
section-per-block mirroring the built-in viewer order Base → Attributes → Skills →
Advantages → Force → Body → Other with the same docsPath links and alternating accents;
groups mirror the built-ins' inner SectionCards (e.g. Force Skills / Virtues / resources /
Force Powers; Backgrounds / Merits / Flaws; inventory/armor/weapons/implants + health track).
Content is composed of identity fields, the portrait image, trait-row primitives, list
bindings (custom + new kinds), the health track, resource primitives with system-default
`maxFrom` formulas (Willpower ≤ virtues sum, Force Points ≤ max link), derived-stats formula
fields (initiative etc. per the documented formulas), and equipment bindings — **zero**
`built-in` placements. Brief view = same coordinates with `compact: true` presentation.
Default overrides from the old shape are retired with R2's migration.

**Rationale**: the clarification mandates the pre-template built-in viewer as the visual
reference and forbids preserving the current composition; composing defaults as pure data
keeps them editable/resettable under the 004 override mechanism unchanged.

**Alternatives considered**: incremental edits to the existing hybrid defaults — rejected:
the old composition is hybrid by design (placements), and the user explicitly declined
preserving it.

## R10 — Testing strategy

**Decision**: Constitution V tier 2 (`yarn verify`) at every checkpoint, plus validators:

- Formula evaluator: exhaustive unit tests — grammar acceptance/rejection, precedence,
  parentheses, unary minus, coordinate resolution (trait value, pool current/max, bag
  numbers), division by zero and non-numeric sources → error states, deep chains, cycle
  detection with named path, memoized re-evaluation on source change.
- Schema: recursive round-trips, depth/node limit rejection with messages, unique-id rules
  across one tree, old-shape rejection.
- Store migration: v2 entries → quarantine (templates + overrides), documents untouched,
  stale fallback still renders built-in page; quarantine bounded.
- Lists/images: value-shape validation, orphan retention on element removal, export stripping
  of device images, preset seeding idempotency for the new list kinds, columns rendering.
- Editor: tree ops (insert/move subtree/remove), depth guardrail messaging, drag/keyboard
  reorder separation from collapse (unit + component), a11y labels.
- Defaults: parity contract tests vs built-in viewer composition (molecule tree), zero
  placements, accent alternation.
- i18n/a11y gates: `build:translations` + `validate:i18n` green; `role="alert"` degradation
  asserted in component tests.
