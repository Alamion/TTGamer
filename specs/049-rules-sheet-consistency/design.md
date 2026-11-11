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

- US1: `tests/sheet_manager/template-layout.test.tsx` and a dedicated
  `star-wars-resources.test.tsx`: full/brief droids, independent resources, static max, missing
  optional values and no writes from opening.
- US2: `tests/sheet_manager/systems/wod2e/engine.test.tsx`, migration fixtures and
  `tests/sheet_manager/record-writer.test.ts`: classic rules, Star Wars parity, raw v1 storage ->
  persisted v2 -> reload, exports, user-setting core characters, notice acknowledgment and storage
  failures. Use real boundary validation.
- US3: existing data/i18n, sheet layout/composition and docs validators; assert names through
  meaningful rendered coverage, not source-text snapshots alone.
- US4: `button-ui.test.tsx`, editor button settings, help-review and reference tests; no
  action/roll/write when help is opened, disabled and row actions, schema round trips and storybook
  variants. Add a browser regression.
- Each story runs its targeted tests and required checks from AGENTS.md section 11. Finish with
  `yarn verify:full`; record exact commands and results here.

## Manual walk

1. Full/brief living character and droid, EN/RU: edit resources below old Virtue minima; change
   Virtues -> resources remain independent, no Force Skills on droid.
2. Open a raw v1 classic character -> Ordinary wounds at original positions, classic penalties and
   one conversion notice; export retains originals; reload does not remap a newly recorded
   Aggravated wound. Compare Star Wars unchanged.
3. Inspect memory categories, individual pack/fodder tracks, both vehicle lists, mortal moral notes
   and hunter notes -> labels/help agree with actual records.
4. Keyboard, mouse and touch-width Rouse/Remorse/power-row help -> readable fragment, no action or
   write; unavailable action's help remains reachable.
5. Walk every registered shipped full page and brief in EN/RU; record template id, language and
   actual help/fallback findings, including hidden/short labels.
6. Accept changes on an edited shipped page -> own edits and values survive.
