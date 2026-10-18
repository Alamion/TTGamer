# Design: Shipped Sheet Composition Fixes

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-19

## Approach

Layout only: the shipped full-sheet builders move existing nodes into new or merged cards and
sections; no binding, value key, formula, or catalog changes. The WoD 2e engine's character layout
moves into shared section builders in `systems/wod2e/ruleset/templateParts.ts`, used by the Star
Wars character and droid (`systems/star-wars-wod/templates/character.ts`) and the WoD 2e character
(`systems/wod2e/templates.ts`), so the three share one layout by construction (FR-011). Creature,
vehicle, and fodder sheets change in their own files; the vampire's predator text joins its identity
card (`systems/v5/modules/vampire/templates/sheet.ts`). Brief builders are not touched.

Each sheet's fix removes its entry from `KNOWN_EXCEPTIONS` in
`tests/sheet_manager/page-composition.test.ts`; the list is empty at the end, and the constant goes
with it.

Delivery order: US1 (shared character layout: Star Wars character, droid, WoD 2e) → US2 (creature,
vehicle, fodder) → US3 (vampire predator) → US4 is the empty exception list, closed in the Finish
phase with docs, heights, and the backlog.

## Target layouts

Weights count a growing element as 3. Ids of kept cards and sections stay; new containers get new
ids. Section column layout follows the existing pattern of each section (decided in the code).

**Star Wars character / droid / WoD 2e** (order after the V5 sheets):

| Section (id)                   | Cards                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base (`base`)                  | unchanged                                                                                                                                                                                                   |
| Condition (`condition`, new)   | **Health and Willpower** (`condition-vitals`, new): health track (droid: damage track), Willpower, Initiative (Std) (SW, WoD 2e), Force Points and Dark Side Resistance (SW); **Virtues** (`force-virtues`) |
| Attributes, Skills             | unchanged                                                                                                                                                                                                   |
| Force (`force`, SW only)       | Force Skills, Force Powers, **Force-derived stats** (`derived-stats`): Initiative (Saber), Jumping Distance, Running Speed                                                                                  |
| Advantages                     | unchanged (moved after Force, as V5 puts it after Disciplines)                                                                                                                                              |
| Equipment (`body`)             | Inventory / Built-in equipment, Weapons, Armor, Implants & Cyberware (not WoD 2e); all fold as today                                                                                                        |
| Experience and Notes (`other`) | Experience, Notes                                                                                                                                                                                           |

Weights: Condition SW 10, droid 7, WoD 2e 8; Force 11; Equipment 9–12; Experience and Notes 6.

**Creature**: Identity (unchanged) → **Condition** (`condition`, new) with one card **Health and
Resolve** (`creature-resolve`, kept id): health track, Willpower, both soaks (6) → Attributes
(unchanged) → **Abilities, Merits & Flaws** (`advantages`): cards Abilities (`creature-abilities`,
new, the list), Merits, Flaws (9) → **Combat**: Armor, Attacks (6) → **Details**: one card
**Details** (`creature-details`, new): description, source, notes (7).

**Vehicle**: Identification, Crew & capacity (unchanged) → **Systems**: as today plus
**Modifications & quirks** (`vehicle-modifications-group`, new, the table) → **Combat** (`combat`,
new): **Weapons** (`vehicle-weapons`, new, the rows), **Damage** (`vehicle-damage`, new, the track)
(6) → Crew stations (unchanged) → **Details**: one card **Details** (`vehicle-details`, new):
description, notes (6).

**Fodder group**: **Group** (`identity`): one card **Group** (`fodder-identity`): concept, leader,
notes (5) → **Members** (`members`): one card **Members** (`fodder-members`, new): members track,
Willpower, specialty pool, secondary pool (6) → **Attributes**: Physical, Social, Mental,
**Abilities** (`fodder-abilities`, the list) (12) → Combat (unchanged).

**Vampire**: the predator text moves into the Identity card right after the predator type field; the
`predator` card goes.

## Decisions

- **D1 — Shared section builders for the three character sheets**: `conditionSection`,
  `equipmentSection`, and `experienceNotesSection` in the WoD 2e ruleset parts, with options for
  what differs by kind (track binding and title, extra resources, implants, docs paths). _Why_:
  FR-011 is then a property of the code, not of care. _Rejected_: editing the three builders side by
  side — they already drifted (droid "Resources", WoD 2e "Derived Stats" of one field).
- **D2 — Initiative joins Health and Willpower**: the WoD 2e engine has one derived value, which
  cannot be a card. The standard Initiative sits with Health and Willpower on every kind that has
  it; the Star Wars Force-derived values (saber initiative, movement) form their own card in the
  Force section, where their skills are. _Rejected_: a one-field Derived Stats card (breaks the
  rule); derived values in Experience (wrong subject, FR-003).
- **D3 — Force Points and Dark Side Resistance in Condition**: they are spent and checked during a
  scene like Willpower (FR-003 "per-scene resources"). _Rejected_: a Force resources card of two
  fields (breaks the rule).
- **D4 — Merging over padding**: small cards join a neighbour of the same subject (fodder notes into
  the Group card, soaks into Health and Resolve, quick pools into Members). FR-004 forbids new
  fields.
- **D5 — Folding** (FR-006): Health and Willpower, Health and Resolve, Members, Combat cards, and
  Details do not fold (play values or the creature's main text); equipment and biography keep
  folding as today. The vehicle Configuration card keeps its fold.
- **D6 — Parity fixtures**: `tests/sheet_manager/fixtures/star-wars-parity.json` keeps its
  documents, defaults, and dice pools unchanged (the frozen identities of spec 012); only its
  `templates` part is regenerated, since the pages change on purpose. The zod-baseline
  `shipped-templates.json` snapshot is regenerated, and its diff must touch full sheets only (briefs
  unchanged, FR-005).
- **D7 — Height pins**: full-sheet heights in `tests-e2e/smoke/brief-baseline.ts` keep their spec
  033 role for briefs; a new `SHEET_PINS` holds the full-sheet heights measured after this spec for
  the changed kinds, and the "keeps its height" check uses it where present. Before the change every
  changed sheet (and the vampire, not pinned today) is measured to check SC-003 (≤ 10% taller).

## Changed types and data

- Template nodes of shipped full sheets: new section and card ids listed above; no schema change.
  Stored documents are untouched (values are keyed by value key, not node id). Remembered folds of
  removed containers are simply unused.
- Users' edited copies of these pages (overrides) are their own trees and keep loading (FR-007).
- Translations (`translations/source/{en,ru}/ui/sheet/templates.yaml`, `defaults`): new titles
  Condition, Health and Willpower, Health and Resolve, Force-derived stats, Equipment, Experience
  and Notes, Abilities, Merits & Flaws, Combat, Details, Members, Modifications & quirks — reusing
  an existing key wherever one already holds the text; Star Wars titles map through `LABEL_MESSAGES`
  as today.

## Principles at risk

- I (modules): Star Wars and WoD 2e share the layout through the ruleset parts they already import;
  no system conditional enters shared code.
- II (contracts): no persisted shape changes; the parity test still guards documents and dice.
- VI (consistent experience): the three character sheets and the V5 sheets now read alike.
- VIII: no third-party text added; titles are generic.

## Tests

- `tests/sheet_manager/page-composition.test.ts`: every shipped full sheet passes; the exception
  list is gone.
- `tests/sheet_manager/shared-character-layout.test.ts` (new): the Star Wars character, droid, and
  WoD 2e full sheets list the same section titles in the same order apart from Force; every value
  key bound on each full sheet before the change (captured from the current trees as a fixture in
  the first task) is still bound once (SC-002).
- `tests/sheet_manager/systems/wod2e/star-wars-parity.test.ts`: documents and dice unchanged;
  templates regenerated (D6).
- `tests/sheet_manager/zod-baseline.test.ts`: snapshot regenerated; diff limited to full sheets.
- Existing sheet tests that find cards by id (`default-templates`, `shipped-parity`, system tests)
  are updated where an id moved; none is weakened.
- `tests-e2e/smoke/brief-layout.spec.ts`: full sheets match `SHEET_PINS`; briefs keep `BRIEF_PINS`
  within 1% (SC-004).

## Docs

`docs/star-wars-wod-2e/character/reading-sheet.mdx` (layout map and section headings) and
`docs/star-wars-wod-2e/equipment.mdx` ("Body section") + ru mirrors; the `sheet-templates` skill's
composition section drops "known exceptions"; `TODO.md` T-126 done.

## Manual walk

1. Star Wars character, droid, WoD 2e character (built site, en and ru) → same section order;
   Condition holds health, Willpower, virtues; rolling Willpower and a rating works.
2. Creature, vehicle, fodder group → no loose element; damage marks, crew links, members' track
   work; Notes and Details editable.
3. Vampire → predator type's grants under the predator type in Identity; choosing another type
   updates it.
4. An edited shipped Star Wars full sheet saved before → still loads with its own layout; **Reset to
   original** gives the new one.
5. Every brief of the seven kinds → looks as before.
