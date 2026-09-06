# Contract: Primitive Block and Preset Seeding

**Feature**: 005-template-primitive-composition | **Status**: designed (Phase 1)

## Template schema (additive)

Template file format stays **v2**; the block union gains the `primitive` variant
(see data-model.md for the exact shape). Legacy `built-in` placements keep parsing (hybrid
defaults + pre-005 templates); the editor stops offering them for covered content (FR-11).

## Renderer contract

`PrimitiveBlockView` (inside `DeclarativeSheetView`'s block walk):

1. `resolveDocumentBinding(systemId, documentKind, bindingKey)` — miss → placeholder
   (`role="alert"`, names the key), page continues, no data touched.
2. Switch on descriptor `kind`:
    - `trait` → `TraitRow` / `TraitRowWithInput` (specialization support when the trait has it);
      value from `character.attributes/skills[key]`; writes via `useCharacter().updateCharacter`.
    - `list` → `CustomTraitsEditor` over the bound array; add/remove/rename/delete as today.
    - `resource` → pool/rating control (mode from descriptor meta); willpower shows its derived
      value even when virtue primitives are absent (derived computation, not composition).
    - `track` → `CompactConditionTrack` / full track; level count + names from the primitive's
      `track` override or the profile defaults; marks write `character.health.levels`.
    - `field` → labeled text field (compact variant = `CompactTextField`).
3. `compact: true` swaps each molecule for its compact variant (same binding, FR-7).
4. `label` override replaces the rendered label; absent → descriptor label.
5. Accent color from block parity helper (004); nothing stored.

Primitives NEVER read or write the template value bag (FR-8 — two persistence mechanisms, one
page, verified by mixed-persistence tests).

## Preset seeding contract

- Trigger: first resolution of a template (by id) for a document whose
  `metadata.seededPresets` does not include that id, in an editable context.
- Action: for each `primitive` with `presets` bound to a list — append
  `{ id: 'preset-<templateId>-<entryKey>', label, value: value ?? 0 }` entries to the bound array
  via one `updateDocumentData` call (parse-on-write validated, single atomic update).
- Marker: `metadata.seededPresets` gains the template id (one write, same or subsequent update).
- Guarantees: idempotent (re-assign/re-render → no-op); deletion of a seeded entry is final;
  later author edits to presets do not propagate; cross-template duplicates possible by design
  (deterministic ids include the template id).
- Read-only contexts never seed.

## Editor contract (template editor)

- Block picker: "primitive" group per binding kind; entries show descriptor labels filtered by
  draft's system+kind; unknown-kind entries are not offered (authoring-time FR-3/FR-4).
- Primitive config panel: bound binding (re-pickable), label override, compact toggle, and
  kind-specific editors — track levels/names (defaults prefilled from profile; count ≤ profile
  max) and presets (add/remove/rename/default value).
- The panel heading names the binding — no anonymous panels (004 review lesson).

## Testing gates (Constitution V — `yarn verify` tier)

- Registry derivation completeness + kind scoping + unknown-key resolution.
- Primitive schema round-trip; legacy templates parse unchanged; preset/track validation bounds.
- Seeding: idempotency, removal respected, non-propagation, duplicates, read-only no-seed.
- Parity: rebuilt defaults render the same molecules/interactions as the legacy composition.
- Degradation: unknown/foreign-kind binding → placeholder; page + data intact.
- Mixed persistence: primitives and declarative fields/tables write their own stores
  independently.
