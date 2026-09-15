# Contract: Hunter Template Bindings

Boundary: shipped/user templates ↔ hunter `document.data`. A re-skinned user template (spec US4)
keeps these coordinates; only labels, suggestions, placement, and visibility change. Relabelling a
node never changes the value it writes (FR-019).

## Ruleset (V5 core) bindings

| Coordinate / binding key                                                           | Kind                                                      | Data path                | Notes                                                        |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------ | ------------------------------------------------------------ |
| `field:name`                                                                       | field (string)                                            | `name`                   |                                                              |
| `trait:attributes:<key>` (9)                                                       | trait 1–5, `row: { specialization: false, flags: false }` | `attributes.<key>.value` | coordinate = `<key>` for formulas                            |
| `trait:skills:<key>` (27)                                                          | trait 0–5, `row: { flags: false }`                        | `skills.<key>`           | specialization as free text (`specializationText`)           |
| `track:health`                                                                     | track, computed `length`                                  | `health`                 | `length.from: stamina + 3`, adjustment `bonus` −5…10, max 15 |
| `track:willpower`                                                                  | track, computed `length`                                  | `willpower`              | `length.from: composure + resolve`, same adjustment          |
| `rows:advantages`                                                                  | rows                                                      | `advantages`             | columns name, kind (enum), dots, note; reorderable           |
| `rows:touchstones`                                                                 | rows                                                      | `touchstones`            | columns name, conviction; reorderable                        |
| `field:experience.total` / `.spent`                                                | field (number)                                            | `experience.*`           |                                                              |
| `field:chronicleTenets`, `field:notes`, `field:portrait` (shared portrait adapter) | field (string)                                            | same                     | multiline                                                    |
| `field:biography.<key>` (5)                                                        | field (string)                                            | `biography.<key>`        |                                                              |
| `equipment:weapons`, `equipment:inventory`                                         | equipment with `dataKey`                                  | `weapons`, `inventory`   | Star Wars item-card molecules, no catalog                    |

## Hunter module bindings

| Coordinate / binding key                                           | Kind                  | Data path | Notes                                                                                     |
| ------------------------------------------------------------------ | --------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `field:concept`, `ambition`, `desire`, `redemption`, `creedFields` | field (string)        | same      |                                                                                           |
| `field:creed`                                                      | field + suggestions   | `creed`   | catalog `v5-hunter-creeds`, custom allowed                                                |
| `field:drive`                                                      | field + suggestions   | `drive`   | catalog `v5-hunter-drives`, custom allowed                                                |
| `rows:edges`                                                       | rows (reorderable)    | `edges`   | columns `name` (catalog `v5-hunter-edges`), `note`                                        |
| `rows:perks`                                                       | rows (reorderable)    | `perks`   | columns `name` (catalog `v5-hunter-perks`, `fills: { edgeName: 'edge' }`), `edge`, `note` |
| `field:despair`                                                    | field (boolean)       | `despair` | toggle                                                                                    |
| `resource:desperation`, `resource:danger`                          | resource (rating 0–5) | same      | the WoD dot row (`TraitRow`)                                                              |

## Generic template capabilities (revised 2026-09-15)

> The first implementation added new elements (severity track, tag-list input, `tags` rows
> column, trait `specialties` list). They were replaced by the existing WoD elements with new
> optional features, so every system shares one look and one set of controls.

### Track bindings: computed length and length regulator

```ts
interface TrackBinding {
    // …existing: trackId, dataKey, levels, members?, variants?
    length?: {
        from: string; // formula over bound numeric coordinates (existing grammar)
        adjustmentKey: string; // number stored in the track record, e.g. 'bonus'
        adjustmentRange: { min: number; max: number };
        maxLength: number;
    };
}
```

A computed-length track stores `{ levels: ConditionMark[], [adjustmentKey]: number }` and shows
`from + adjustment` unlabeled boxes (1…maxLength); marks past the length are kept. The existing
`ConditionTrack` molecules render it; marks cycle empty → slash → cross on click.

- `ConditionTrackTable` / `ConditionTrackStrip` accept an optional `lengthControl` (−/+ buttons).
  Computed tracks step the adjustment; tracks with `variants` (Star Wars fodder 3/5/7) step through
  the variant lengths, replacing the former "Health levels" select (confirmation still asked when
  shortening would hide marks).
- Primitive nodes accept `trackLayout: 'table' | 'strip'` (template editor: "Track layout"). The
  default is `strip` for compact nodes and computed tracks, `table` otherwise.

### Trait row options

Trait bindings may declare `row: { specialization?: boolean; flags?: boolean }` (both default to
true): the free-text specialization input and the specialization/experienced/practiced flags.
V5 attributes turn both off; V5 skills keep the specialization text without flags.

### Rows reordering

The rows primitive supports move up/down (keyboard reachable, labelled) and hidden columns.

## Template matching

- `resolveEffectiveTemplate` and the template library match custom templates on
  `(systemId, documentKind)`; shipped defaults are looked up within the document's plugin only.
- `defaultOverrides` stay keyed by view id; V5 view ids are globally unique (`v5-` prefix), and the
  registry rejects duplicate view ids across plugins (new registry check). Composite
  `systemId:viewId` keys are follow-up T-046.
- Applying an incompatible template reports `template-incompatible` (new code in `diagnostics.ts`).
