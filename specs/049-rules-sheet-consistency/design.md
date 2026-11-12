# Design: Rules and sheet consistency

**Spec**: [spec.md](spec.md) | **Date**: 2026-11-11

## Approach

Deliver US1 resources, US2 classic mechanics and migration, US3 terminology/docs, then US4 action
help and the rendered walk. All four reuse the declarative pages, definition registry and document
sources. The [decision register](decisions.md) holds source evidence and approved rules, not another
current-state rulebook. Shipped-page revisions deliver template edits through the existing spec 048
review. Do not touch unrelated local Claude configuration or the package script order.

## Decisions

- **D1 — Static Willpower without data replacement**: shipped Star Wars Willpower uses the existing
  resource `part: 'max'` rating view. Keep its stored pool pair and legacy formula coordinates;
  remove ongoing minima on the three resources. Droids receive the same Force resource controls and
  links, without Force Skills. _Why_: max is the lasting rating and existing UI already edits it
  separately. _Rejected_: replacing old pairs with numbers, which would lose their current values
  and break edited pages. Lowering the lasting rating may clamp an old current to the new maximum on
  an explicit edit, under the existing pool contract.
- **D2 — Separate edition mechanics at their owner**: classic health levels and Ordinary/Aggravated
  marks belong to `systems/wod2e/ruleset/`; conversion levels and Bashing/Lethal marks belong to
  `systems/star-wars-wod/`. Share structural schemas and neutral builders, not the different rule
  values. Classic stat rolls always cancel successes on ones and apply selected specialties only at
  four or more dots; Experienced/Practiced have no classic effects. Thread an optional flag subset
  through the existing trait/list controls to show only Specialization for the classic engine;
  retain stored flags. _Rejected_: changing shared rule constants in place or duplicating renderers.
- **D3 — Versioned classic wound conversion**: bump only the `wod2e-character` definition to
  version 2. Its migration copies the original seven marks to optional, bounded `legacyHealth` and
  turns occupied marks into Ordinary marks. Preserve all other data. Version 2 never repeats the
  mapping. A core character in a user setting uses this definition too; arbitrary custom types do
  not. _Rejected_: interpreting Lethal crosses as Aggravated, or migrating every document using a
  WoD ruleset regardless of its definition.
- **D4 — Persist migrations and tell the player**: `store/documentContent.ts` must not mark a
  version-migrated envelope clean, so the existing record writer saves it. Add optional
  definition-owned `migrationNotice(data)` metadata. A neutral active-document hook in the workspace
  renders the existing `toast()` notice and remembers acknowledgments per device in a bounded,
  validated list. The original marks remain in document exports. A storage failure reports via
  `diagnostics.ts`; it does not stop the character from opening. _Rejected_: notifications from pure
  parsers, collection scans, system imports in generic UI, or adding successful conversions to the
  rejected-file queue.
- **D5 — Fix prose where behavior is already right**: member tracks, independent vehicle lists and
  mortal moral notes retain their models. Correct the actual contradictions in both locales. The
  droid memory table follows the complete setting category lists. Retain supported Force
  calculations and explain units and prerequisites. Classic armor AR adds soak dice; its Dexterity
  penalty raises the difficulty of Dexterity rolls, without automatic combat arithmetic. _Rejected_:
  new synchronization, a group Health pool or copied rules tables.
- **D6 — Names describe their scope**: WoD-family three-category umbrella becomes Abilities;
  combined brief status becomes Condition; prose card becomes Appearance description. V5 keeps its
  one Skills collection. Hunter Creed notes retains its data key; its card becomes Redemption and
  creed notes. Use canonical EN/RU YAML, preserving node ids and coordinates. _Rejected_: resolving
  naming ambiguity by adding more help marks, or renaming persisted fields.
- **D7 — Action help is a sibling**: add optional `docsPath` to shared `buttonShape` (page and row
  actions), expose Documentation link in `ButtonSettings` using the existing setting control, and
  render `DocsPreviewLink` next to `SheetButton`. The help remains enabled while the action is
  disabled and uses the row-aware accessible name. Add paired explicit Rouse/Remorse anchors and
  links in Vampire mechanics. Document and show both variants in the existing storybook. _Rejected_:
  nested interactive links, title-only help, and Vampire-only UI forks.
- **D8 — Review amendments are explicit**: preserve spec 047's historical table. `help-review.md`
  here records added/changed destinations; extend the existing help-review contract test to merge it
  and inventory row actions too. Preserve system boundaries, duplicate-link checks and sole-content
  checks. _Rejected_: weakening the existing link contract or editing old decisions silently.

## Changed types and data

- Engine data: optional seven-mark `legacyHealth`; engine definition version 2. Star Wars definition
  versions and stored data shapes remain unchanged.
- `DocumentDefinition`: optional neutral migration-notice descriptor callback; workspace
  acknowledgment storage is device-only, bounded, and never exported.
- Trait/list binding presentation can select a subset of the existing rating flags; existing callers
  retain all/none semantics. Existing flags remain stored.
- Template button schema: optional `docsPath` <= 500 characters, no version bump. Editor settings,
  reference validation, snapshots and storybook cover it.
- Canonical translations change names and add classic mark/notification messages; generated files
  are rebuilt, never committed. Help anchors are paired EN/RU.

## Principles at risk

- **I/II**: system-owned values and migration callbacks preserve the boundary; old data passes the
  registered migration and schema, never a UI cast alone.
- **III/IV**: reuse `toast`, `DocsPreviewLink`, existing resource controls and settings. Conversion
  and ordinary edits are separately testable and observable.
- **V/VI**: migration/import round trips and actual browser interaction supplement component tests.
  Help targets remain independent of actions in both page kinds.
- **VII**: open one document; migrate its bounded payload. No collection scan, new dependency or
  eagerly loaded external material.
- **VIII**: paraphrase source rules. No new publisher policy or game line.

## Tests

- US1: `star-wars-resources.test.tsx`: full/brief droids, independent resources, static max,
  optional values and no opening writes. US2: engine, migration, parity, record-writer and notice
  tests: classic rules, retained originals, persisted v2, user settings and storage failures.
- US3: data/i18n, layout/composition and rendered terminology. US4: button/settings/help-review,
  reference and storybook tests; no roll/write/fold, disabled/row actions and schema round trips.
- SC-006 browser matrix: `sheet-preservation.spec.ts` and `wod2e-migration.spec.ts` use actual
  IndexedDB, edits, reloads, downloads and imports for old resource pairs, Hunter notes, original
  wounds, general notes and custom coordinates. No host API mock supplies persistence.
- Each story runs its targeted tests and AGENTS.md section 11 checks; finish with
  `yarn verify:full`.

## Manual walk

1. Character/droid full/brief EN/RU: independent resources below old minima, no droid Force Skills.
2. Raw classic v1 -> Ordinary wounds at original positions, one notice, retained export originals;
   reload preserves new Aggravated wounds. Compare unchanged Star Wars behavior.
3. Memory categories, member tracks, vehicle lists, mortal/Hunter notes -> labels match records.
4. Pointer/keyboard and phone-width action help -> readable, no action/write/fold, including
   disabled.
5. Every registered full page/brief EN/RU -> inventory hidden/short labels and help findings.
6. Edited shipped page review -> own edits and values survive through the existing flow.

## Implementation notes

The delivered changes follow D1–D8. The rendered walk additionally found Russian term-help replay
and toolbar overflow at 320 px; T029 adds wrapping and an actual phone-width keyboard regression.
The layout test previously compared 608 px and 592 px content areas; it now asserts equal content
width before comparing height. Its height tolerance is unchanged. Droid full-page pins alone grew
for the two added resources. Historical fixtures have explicit amendments; original pre-007 data and
spec 047's review remain intact. A prototype or new UI subsystem was unnecessary.

| Intake subject   | Delivered disposition and verification                                                    |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Droid resources  | Full/brief Force resources, no Force Skills; resource tests and browser matrix.           |
| Derived values   | Static max, no ongoing minima; supported Force formulas, parity and old-pair round trips. |
| Droid vocabulary | Complete category tables EN/RU; catalog validation and rendered walk.                     |
| Member Health    | Separate tracks, 7 standard and 3/5 shortened; layout tests and EN/RU help.               |
| Classic engine   | Edition-owned rolls/marks/penalties; engine/parity tests and real migration round trip.   |
| Group names      | Abilities, Condition, Appearance description; composition tests and 46-view walk.         |
| Vehicle records  | Independent lists retained and explained; unchanged payload and rendered help.            |
| Mortal morality  | Narrative scope retained; bilingual rules audit and rendered moral fields.                |
| Hunter notes     | Creed notes keeps `creedFields`; actual edit/persist/export/import test.                  |
| Action help      | Shared sibling help, editor/storybook coverage; EN/RU browser and phone checks.           |
| Rendered walk    | All 46 EN/RU views checked against the link inventory; no unresolved findings.            |

FR-001–020 and SC-001–006 are covered by these checks and the explicit SC-006 matrix. Existing
shipped-page review tests cover FR-020 without a second update mechanism. T-143/T-144 remain
separate.

## Verification record — 2026-11-11

- `yarn verify:full --config=/tmp/ttgamer-049/playwright.config.mts` — exit 0: lint, typecheck,
  validators, dead code, 3652 unit tests, 20 perf tests, EN/RU build and 85 browser tests passed.
  The temporary config uses IPv6 loopback because an unrelated server owns IPv4 port 3100;
  assertions, projects and browser settings are unchanged. Final edits repeat this same gate.
- `node /tmp/ttgamer-049/rendered-walk.cjs --go` — exit 0: 12 definitions, 23 pages, 46 EN/RU
  surfaces; zero surface/site errors or help follow-ups in `rendered-walk-results.json`.
- Chrome DevTools MCP: actual RU droid resources at 375 px; Rouse brief help at 375/320 px and
  disabled Remorse full-page help at 320 px opened by Enter, readable inside viewport. Term-help
  select/replay and page have no horizontal overflow at 320 px. Automated tests cover both locales,
  no writes/rolls/folds, per-power rows, replay and the actual SC-006 persistence boundary.
- Localhost 3000 was down, so the isolated built-site review uses `review049.localhost:3101` and a
  disposable Chrome profile. No deployment, remote CI, release, merge or push was performed.
