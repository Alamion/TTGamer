# Design: Vampire: the Masquerade 5e Player Character

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-17

## Approach

A new V5 module `systems/v5/modules/vampire/` beside `hunter/`, built the same way: schema
(`V5CoreShape` + vampire fields), definition `vampire` (kind `character`, module `vampire`, Dark
Pack), bindings, catalogs, two shipped pages (`v5-vampire-sheet`, `v5-vampire-brief`) made from the
ruleset's page parts, and an example vampire. The existing `hungerDiceLine` gets the definition.
Almost everything renders through existing elements (field, rating, list `named-trait`, rows with a
catalog parent, track). Four small system-neutral additions cover the rest: read-only and fallback
field bindings (D4, D5), a level limit on rows catalog parents (D3), action bindings (D6), and
special dice from the rolling document (D2).

Order (one commit per story): **US1** schema, definition, bindings, catalogs with names and
summaries, full sheet → **US2** Hunger dice in sheet rolls → **US3** Rouse actions and Blood Potency
effects → **US4** brief → **US5** library and editor checks, example, storybook, Dark Pack page and
site guide mentions.

Sources and pages (Constitution VIII; names and structure only, summaries in our own words): core
rulebook (English PDF, book pages) — character creation pp. 133–152 (summary sheet p. 152), clans
pp. 63–113, convictions and touchstones pp. 172–173, predator types pp. 175–178, Hunger and Rouse
pp. 205–213, generation and Blood Potency pp. 214–221, Humanity pp. 236–239, disciplines from p. 243
(the table of contents gives no page numbers there; the index puts Unliving Hive on p. 246); Players
Guide — clans pp. 11–55, bane variants pp. 56–59, powers pp. 69–105, predator types pp. 106–109;
Cults of the Blood Gods — Oblivion ceremonies and Blood Sorcery rituals (pages fixed while writing
that catalog).

## Decisions

- **D1 — Disciplines as a list, powers and rituals as rows.** `disciplines` is a list binding
  (`named-trait` `{id, name, value}`: name with clan/catalog suggestions, dots 0–5, the die rolls
  the discipline). `powers` and `rituals` are rows (`name`, `discipline`, `level`, hidden `entry`
  and `rouse`) whose catalog has a parent: disciplines,
  `namedBy: { dataKey: 'disciplines', column: 'name' }` — the Perk → Edge mechanism of Hunter.
  _Why_: no new element; picking a power writes its discipline and level. _Rejected_: a nested
  "discipline with its powers" element — a new generic container for one system; Hunter's
  Edges/Perks already work flat.
- **D2 — Hunger replaces dice when the pool is rolled, not when a stat is queued.** A V5 dice line
  may declare `replaces: { count(data): number }` (Hunger: `data.hunger`). The sheet's roll source
  (`useDocumentRollSource`) carries `specialDice` read through the system's reading
  (`RollReadingRules.specialDice?(definitionId, data)`), and
  `prepare(notation, { criticalPairs, specialDice })` turns `NdS>=T` into `(N−h)dS>=T + hdS:h>=T`
  with a new pure helper `withSpecialDice` in `dice-logic/notation-utils.ts`. A notation that
  already has labelled dice is left alone (re-rolls from history stay valid). _Why_: Attribute +
  Skill merge in the panel into one pool, and Hunger applies to the whole pool. _Rejected_: Hunger
  in `traitPool` — each stat would take its own Hunger dice; Hunger in the dice store — the store
  must not know systems.
- **D3 — Powers above the discipline's dots.**
  `RowsCatalogParent.limit?: { entryKey, column, parentValue }` (power `level` ≤ the parent entry's
  `value`): suggestions above it are hidden, and a stored row above it is marked (not clamped,
  FR-009). _Rejected_: clamping — experience is often spent before dots are marked.
- **D4 — Read-only field bindings.** `FieldBinding.readOnly` renders the value without an input;
  `adapter.read` computes it. Used for Blood Potency effects (`modules/vampire/bloodPotency.ts`:
  surge, mend, power bonus, Rouse re-roll level, bane severity, feeding penalty from Blood Potency)
  and the generation's Blood Potency range. Numeric ones are formula coordinates. _Why_: the formula
  language has no rounding or lookups. _Rejected_: formula fields per page — a re-skinned page could
  break the rules; lookups belong to the system.
- **D5 — Bane, compulsion, and predator grants follow the catalog until written.**
  `FieldBinding.fallback?(data, locale)` gives the text shown, in a muted style, while the stored
  value is empty; typing stores the player's own text, clearing it returns to the fallback. Bane
  reads `clan` + `baneVariant` (`usual` | `variant`); predator grants read `predatorType` and are
  read-only (clarification 1). _Why_: switching clan or variant needs no "was it edited" flag, and
  the text follows the reader's language. _Rejected_: catalog fills — they overwrite (FR-005 forbids
  it) and freeze one language into the document.
- **D6 — Rouse checks are action bindings.** New binding kind `action` (`action:<id>`): a button
  that rolls `notation(data, row?)` through the dice roller as a sheet roll with `specialDice: 0`,
  waits for the result, then writes `apply(data, result, row?)`. Rows may list `actions` shown on
  each row. Rouse: `1d10>=6`; a power row rolls one check per `rouse` cost, re-rolling one failure
  when `level ≤` the Blood Potency re-roll level; every failure raises Hunger by one up to 5; the
  result toast says what changed. `diceRollerStore.roll` resolves with the final `RollResult` (or
  `null` when the 3D roll is cancelled — then nothing is written). _Rejected_: a Rouse button
  hard-coded in a page — templates hold no code, and Hunter's Willpower re-roll can reuse actions.
  _Handoff (Constitution III)_: `sheet_manager` → `dice_roller` through `integrations/sheet-dice`
  (`useSheetDiceActions`), contract `roll(notation, options) → RollResult | null`. Success: the roll
  lands in the history under the character and a toast says whether Hunger rose. Failure: a
  cancelled 3D roll shows "Rouse check cancelled" and writes nothing; a write the schema rejects
  reports `template-value-write-rejected`; in a read-only document the button is disabled.
- **D7 — Humanity is a score track.** `TrackBinding.score?: { valuePath, marksPath, length }`: boxes
  `1..humanity` filled, the last `stains` boxes slashed, never both (a stain on a filled box is
  refused with a message); stored as `humanity` (0–10) and `stains` (0–10). _Rejected_: the
  health-like `{ levels }` record — a box would carry two meanings.
- **D8 — Thin-bloods.** Generation 14–16 allows Blood Potency 0 and an empty clan; other values are
  kept and marked (FR-009) by a read-only check field beside Blood Potency (out of the generation's
  range). No separate definition.
- **D9 — Long catalog texts load on demand (Constitution VII).** Names, levels, Rouse costs, and
  parent links stay in the bundle: pickers and Rouse need them at once. Summaries, banes,
  compulsions, and predator grants of catalogs declaring `lazyText` are written by
  `scripts/translation-build.ts` into `src/i18n/generated/catalogText/<catalogId>.ts` (both locales)
  instead of `catalogTranslations.ts`, and read through a cached dynamic import (`useCatalogText`);
  while loading, a fallback field shows a muted placeholder. Budget: the sheet page's JS grows by at
  most 25 KB gzip (the timings' "sheet JS and CSS", before and after US1). _Rejected_: everything in
  `catalogTranslations.ts` — about 150 KB of text on every page that loads catalogs; a lazy V5
  plugin — the registry is synchronous and every V5 document needs it.
- **D10 — Accessibility of the new controls (Constitution VI).** Action buttons name their action
  and target ("Rouse check for Bond Famulus"); the score track is a group named "Humanity 5 of 10"
  whose arrow keys move the score and `S` toggles a stain on the focused box; a row above its
  parent's dots carries visible text ("above Blood Sorcery 2"), not colour alone.

## Changed types and data

- `systems/v5/modules/vampire/schema.ts` (new): `concept`, `chronicle`, `sire`, `clan`, `generation`
  (4–16, default 13), `predatorType`, `ambition`, `desire`, `hunger` (0–5, 1), `humanity` (0–10, 7),
  `stains` (0–10), `bloodPotency` (0–10, 1), `baneVariant`, `bane`, `compulsion` (empty = catalog),
  `disciplines` (≤ 16), `powers` (≤ 60), `rituals` (≤ 40); schema version 1, no migration. Persisted
  envelopes of other kinds unchanged (FR-013).
- `systems/v5/index.ts`: registers the definition, templates, bindings, catalogs; `hungerDiceLine`
  gets `definitionIds: ['vampire']` and `replaces`.
- `systems/templateBindings.ts`: `FieldBinding.readOnly`, `fallback`; `RowsCatalogParent.limit`;
  `ActionBinding` and `RowsBinding.actions`; `TrackBinding.score`. Editor sources list action
  bindings like primitives.
- `scripts/translation-build.ts`, `systems/catalogs.ts`: `lazyText` catalogs and the `catalogText/`
  modules (D9).
- `systems/types.ts`: `RollReadingRules.specialDice`, `prepare` option `specialDice`;
  `dice_roller/utils/rollReader.ts`: `RollSource.specialDice?`; `diceRollerStore.roll` returns
  `Promise<RollResult | null>`.
- Catalogs (new): `v5-vampire-clans` (name, summary, bane, variant bane, compulsion, disciplines),
  `v5-vampire-disciplines`, `v5-vampire-powers` (discipline, level, rouse cost, amalgam, summary),
  `v5-vampire-rituals` (discipline, level, summary), `v5-vampire-predator-types` (summary, grants).
- Translations: `ui/sheet/v5Vampire.yaml` (en, ru), `data/v5-vampire-*.yaml` (en, ru), glossary
  terms for clans, disciplines, Hunger, Rouse, Blood Potency, bane, compulsion; `catalogNames.yaml`.
- Docs: the Dark Pack page lists vampire sheets; the site guide's document-kind lists name the
  vampire (en and ru). No rules pages (T-121).

## Principles at risk

- **I. Modular semi-autonomy**: generic changes are options without system names; `vampire/` is
  imported only by `systems/v5/index.ts` (ESLint rule unchanged).
- **VI. Consistent experience**: every new option (read-only, fallback, action, rows limit, score
  track) gets a storybook story and a `REQUIRED_VARIANTS` tag; the brief follows spec 033 sizes.
- **III. Cross-module flows**: Hunger replacement and Rouse go through `integrations/roll-reading`
  and `integrations/sheet-dice`; D6 states success and failure.
- **VII. Performance**: D9 keeps long catalog texts off page load within a 25 KB gzip budget; the
  power suggestion list is filtered before rendering; the brief keeps the phone height limit. The
  new shared options run `yarn verify:full` with a bundle review before merge.
- **VIII. Third-party material**: names as names, summaries written fresh in both languages, no
  copied tables (Blood Potency values are computed mechanics, not a reproduced table); Dark Pack
  badge from module policies.

## Tests

- `tests/dice_roller/notation-special-dice.test.ts`: `withSpecialDice` splits, caps at the pool,
  keeps labelled notations, ignores non-pools.
- `tests/integrations/roll-reading.test.ts` (extend): sheet rolls of a vampire carry Hunger dice;
  hunters and mortals do not; Rouse rolls carry none.
- `tests/sheet_manager/systems/v5/vampire-schema.test.ts`: defaults, limits, thin-blood rules, round
  trip through export and import.
- `.../vampire-sheet.test.tsx`: full sheet renders without degradation; clan → bane/compulsion
  fallback, variant switch, own text kept; predator grants shown, nothing else changes.
- `.../vampire-powers.test.tsx`: power suggestions follow the discipline and its dots; a row above
  the dots is kept and marked; rituals appear only with Blood Sorcery, Oblivion, or Alchemy.
- `.../vampire-rouse.test.tsx`: Rouse raises Hunger on failure, stops at 5, re-rolls per Blood
  Potency, cancelled roll writes nothing.
- `.../vampire-blood-potency.test.ts`: effects for 0–10, generation ranges.
- `.../vampire-brief.test.tsx` and the e2e `brief-layout` list: the brief fits 375 px and 400 px.
- Existing: `document-system`, `entity-templates`, `storybook`, `docs-embeds`, policy tests.

## Manual walk

1. **New → Vampire: the Masquerade 5e → Character** → full sheet, Hunger 1, Humanity 7, BP 1.
2. Pick clan Tremere → bane and compulsion show its text; switch to the variant bane → text changes;
   type own bane, switch clan → own text stays.
3. Add Blood Sorcery 2 → rituals list appears; add a power → only Blood Sorcery powers of level ≤ 2
   are offered; raise a power to level 3 → the row is marked.
4. Set Hunger 2, click Dexterity then Firearms, roll → 2 Hunger dice in the result and history.
5. Click Rouse on a power costing one check at BP 1 until it fails → Hunger rises by one; at Hunger
   5 the warning shows.
6. Open the vampire beside a hunter in its brief → fits the pane; rolls from each use its own line.
7. Library → Vampire: the Masquerade 5e → copy the full sheet, move the Hunger block, save → the
   sheet keeps values and still rolls Hunger.
8. Switch to Russian → labels, catalog names, summaries in Russian; export → file has the notice.

## Implementation notes

- T001 baseline (2026-10-17, `yarn ci:e2e` on `037-vampire-character` before any code): the timings
  report "sheet JS and CSS: 3958167 bytes" — uncompressed bytes as served by `docusaurus serve`. The
  D9 budget is therefore checked as at most +80 KB of these bytes (about 25 KB gzip).
- **Kind `vampire`, not `character`.** Hunter and vampire share the V5 plugin; with one kind their
  bindings (`field:concept`, the ruleset's bindings) would collide by key. The vampire definition
  and its pages use document kind `vampire` (the label stays "Character"), as the V5 mortal uses
  `mortal`.
- **D7 as a resource mode.** Humanity is `ResourceBinding.mode: 'score'` with `score.marksKey`
  (`components/stat-fields/ScoreTrack.tsx`) rather than a `TrackBinding` option: built-in tracks
  carry the spec 018 tracker overrides, which a score with stains does not need. Numbers read as for
  `rating` (`readBoundNumber`), so `humanity` is a formula coordinate; `stains` is a number field
  binding.
- **D9 marker in the English YAML.** `_lazy: [fields]` in `translations/source/en/data/<id>.yaml`
  (not a `defineCatalog` option): `scripts/translation-build.ts` reads only the sources, and the
  catalog code needs no flag. The vampire entries in code hold names and structure only.
- **Computed fields everywhere numbers are read.** `readBoundNumber` and `visibleWhen` read a field
  binding through its `adapter` (the rituals block shows by the read-only `ritual-dots` coordinate,
  the sum of Blood Sorcery, Oblivion, and Thin-Blood Alchemy dots).
- **US1–US5 in one commit.** The stories share files (the bindings, the sheet test, the roll source,
  the translations), so they were verified and committed together; T040's storybook coverage comes
  from binding signatures that now include `readOnly`, `fallback`, the rows `limit`, and `actions`,
  so every new shape gets an automatic story; `vampireExampleDocument` waits for the VtM
  documentation (T-121), since nothing would import it yet.
- **Tests folded.** T013's fallback and read-only checks run on the real vampire sheet
  (`vampire-sheet.test.tsx`); the shared post of a vampire roll needs no own test (the message is
  built from the generic reading, covered by `roll-sharing.test.ts`; `roll-reading.test.ts` checks
  the `hunger` reading).
