---
draft: true
---

# TODO

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.
Each task includes: name, description, priority, effort, impact, and dependencies.

---

## Legend

- ✅ **DONE** — fully implemented
- 🟡 **IN PROGRESS** — partially implemented
- ⬜ **NOT DONE** — not started

---

## Available MDX Components

| Component        | Import                                                             | When to use                                                                                                                                |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `TWWrapper`      | `@site/src/shared/components/TWWrapper`                            | Wrap any Tailwind-styled content or interactive component                                                                                  |
| `InlineRoll`     | `@site/src/dice_roller/components/InlineRoll`                      | Self-contained clickable roll. **Preferred** over `CharRoll` in docs (works without a character loaded, use `preroll` for static examples) |
| `CharRoll`       | `@site/src/shared/components/DocCharData`                          | Roll derived from loaded character (only if reader has a character in the sheet)                                                           |
| `WodTab`         | `@site/src/dice_roller/components/dice_pool/DiceTabWod`            | Interactive WoD dice tab — difficulty slider, d10 button, botch tracking. Embed inside a `<TWWrapper>` with `max-w-[375px]` for layout     |
| `RollControls`   | `@site/src/dice_roller/components/dice_pool/RollControls`          | Roll/Clear buttons + settings gear for the dice roller. Place below `WodTab`                                                               |
| `EntityGrid`     | `@site/src/shared/components/EntityCard`                           | Responsive grid of expandable cards with popover details. Used for attribute/ability/species catalogs                                      |
| `DataCatalog`    | `@site/src/shared/components/DataCatalog`                          | Full-featured searchable/sortable/paginated data table with detail popovers. Use for large trait lists (abilities, merits, species)        |
| `AttributeBlock` | `@site/src/sheet_manager/features/sheet/components/AttributeBlock` | 3×3 collapsible attribute grid. Shows the reader what the sheet looks like; pass `accentColor` prop                                        |
| `SkillBlock`     | `@site/src/sheet_manager/features/sheet/components/SkillBlock`     | Talents/Skills/Knowledges collapsible ability editor. Pass `accentColor` prop                                                              |

---

## Build Status

All planned files exist on disk. Status below reflects **content completeness**:

| Phase                             | Status                                                  |
| --------------------------------- | ------------------------------------------------------- |
| Phase 1 — Core Mechanics          | ✅ **DONE** (both files fully written)                  |
| Phase 2 — Character Creation      | ✅ **DONE** (10 of 10 files done)                       |
| Phase 3 — Combat                  | ✅ **DONE** (3 of 3 files done)                         |
| Phase 4 — Equipment & Gear        | ✅ **DONE** (1 file, fully written)                     |
| Phase 5 — Creatures & Adversaries | ✅ **DONE** (2 files, both written)                     |
| Phase 6 — Vehicles                | ✅ **DONE** (4 files, all written)                      |
| Phase 7 — GM Section              | ✅ **DONE** (5 of 5 files written)                      |
| Phase 8 — Polish                  | ✅ **DONE** (3 files, all written)                      |
| Phase 9 — WEG SWRPG Book Fill     | ⬜ NOT DONE (6 areas, not started)                      |
| Phase 10 — Translation            | 🟡 IN PROGRESS (1/4 done — docs i18n, glossary partial) |

`quick-start.mdx` (241 lines) — not in the build sequence table but fully written and serves as the foundation for Phase 1.

### Side effects from interactive doc implementations

New data files created to support `DataCatalog`-driven tables:

- `src/data/speciesData.ts` — 11 era-variant entries across 8 species with `SpeciesEntry` interface
- `src/data/speciesConfig.tsx` — columns + `renderSpeciesDetail` for the species table
- `src/data/alienPhysData.ts` — 27 alien physiology merits/flaws with `AlienPhysEntry` interface
- `src/data/alienPhysConfig.tsx` — columns + `renderAlienPhysDetail` for the alien physiology table
- `src/data/backgroundsData.ts` — 12 backgrounds with `BackgroundEntry` interface
- `src/data/backgroundsConfig.tsx` — columns + `renderBackgroundDetail` for the backgrounds table
- `src/data/meritsFlawsData.ts` — merits/flaws catalog with `MeritFlawEntry` interface
- `src/data/meritsFlawsConfig.tsx` — columns + `renderMeritFlawDetail` for the merits/flaws table
- `src/data/attributes.ts` — 9 attribute entries with `AttributeEntry` interface
- `src/data/attributeConfig.tsx` — render function for `EntityGrid`
- `src/data/abilities.ts` — 30 ability entries with `AbilityEntry` interface
- `src/data/abilityConfig.tsx` — columns + `renderAbilityDetail` for the abilities table
- `src/data/forcePowersData.ts` — 35 Force Powers with `ForcePowerEntry` interface (skills array, FP cost, full descriptions with difficulty/results gradients)
- `src/data/forcePowersConfig.tsx` — columns + `renderForcePowerDetail` with skill dots display, boolean filter for FP cost, array filter for skills

`DataCatalog` extended with `filterColumnId2` prop for dual-filter support (used: category + era).

## Proposed Build Sequence

Each file builds on concepts + component patterns established in prior files. **No file requires content from a later file.**

### Phase 1 — Core Mechanics (foundation for everything) ✅

| #   | File                                  | Builds on   | Key content from conversion doc                                                                                                                                                                                        | Status                  |
| --- | ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | `core-rules/dice-pools.mdx`           | quick-start | Full dice pool mechanics: difficulty table (repeated), Rule of One deep-dive, botch vs failure distinction, **1 success = marginal** (explicit), extended actions detail, untrained actions, splitting pools, teamwork | ✅ **DONE** (371 lines) |
| 2   | `core-rules/attributes-abilities.mdx` | #1          | All 9 attributes with descriptions, all 30 abilities by column (Talents/Skills/Knowledges) with dot-rank descriptions, specialization examples, secondary abilities                                                    | ✅ **DONE** (88 lines)  |

These two establish `InlineRoll` patterns (simple, details, multiline) with hardcoded notations like `5d10>=6f=1`, `3d10>=6f=1`, etc.

### Phase 2 — Character Creation (sequenced by creation order) ✅

| #   | File                                 | Builds on | Key content                                                                                                                                                                                                                                                | Status                                 |
| --- | ------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 3   | `character/species.mdx`              | #1, #2    | Species table from conversion doc (Ewok, Gamorrean, etc with merits/flaws and freebie point adjustments), droid as species alternative, rules about ignoring WEG min/max                                                                                   | ✅ **DONE** (91 lines + 4 data files)  |
| 4   | `character/creation-steps/`          | #1–3      | Full step-by-step directory (10 files): concept/nature/demeanor, species choice, 7/5/3 attributes, 13/9/5 abilities, backgrounds, virtues, freebie spending (with cost table), complete worked example (Jax Vorn)                                          | ✅ **DONE** (10 files)                 |
| 5   | `character/backgrounds.mdx`          | #4        | All background descriptions from conversion doc (Allies, Contacts, Customization, Droid, Influence, Mentor, Military Rank, Noble Status, Reputation, Resources, Retainers, Vehicle) with dot-rank tables                                                   | ✅ **DONE** (65 lines + 2 data files)  |
| 6   | `character/merits-flaws.mdx`         | #4, #5    | Full merits/flaws catalog from conversion doc: Psychological, Mental, Awareness, Aptitudes, Galactic Connections, Alien Physiology groups; point costs and freebie point balance rules                                                                     | ✅ **DONE** (70 lines + 2 data files)  |
| 7   | `character/virtues-willpower.mdx`    | #4        | Conscience, Passion, Self-Control deep-dive (dot descriptions, movie character examples), derived formulas (Willpower = Passion + Self-Control, Force Points = Self-Control), optional non-Force-user rules                                                | ✅ **DONE** (198 lines)                |
| 8   | `character/dark_side_resistance.mdx` | #7        | DSR formula (5 + Conscience - Passion), humanity-like degeneration, optional social ostracism rule, recovery costs                                                                                                                                         | ✅ **DONE** (143 lines)                |
| 9   | `character/force.mdx`                | #7, #8    | Force Skills, Force Points for Force users, 35-power Force Powers catalog (DataCatalog with skill + FP filters), Light Side/Dark Side temp increases, common Force rules, Force-related Merits & Flaws catalog (DataCatalog filtered by Force Connections) | ✅ **DONE** (227 lines + 2 data files) |
| 10  | `character/droids-cyborgs.mdx`       | #9        | Droid creation differences (upgrade vs XP, reprogramming rules with table, memory types by column), NPC droid degree table, cybernetic enhancements (limbs, sensory, uplink, life support, clunky)                                                         | ✅ **DONE** (200 lines)                |
| 11  | `character/reading-sheet.mdx`        | #3–10     | Reference guide to every section of the character sheet with field descriptions, derived stat callouts, sheet layout map                                                                                                                                   | ✅ **DONE** (184 lines)                |

### Phase 3 — Combat (builds on core mechanics + characters) ⬜

| #   | File                            | Builds on | Key content                                                                                                                                                                          | Status                  |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| 12  | `combat/combat-flow.mdx`        | #1, #2    | Initiative (Wits + Alertness), turn structure (move + one action), attack resolution (Dex + Blaster vs difficulty 6, opposed Dodge), damage rolls, soak rules, reactions             | ✅ **DONE** (199 lines) |
| 13  | `combat/health-damage-heal.mdx` | #12       | 7-level track, damage types (Bashing/Lethal/Stun) with mechanics, wound penalties table (-1 to -5), healing rates, Bacta Tank, amputation rules, **heroic soak rule** (min 1 lethal) | ✅ **DONE** (207 lines) |
| 14  | `combat/combat-scales.mdx`      | #12, #13  | Scale ladder (Vermin to Death Star), cross-scale damage multipliers/divisions, vehicle vs character combat                                                                           | ✅ **DONE** (129 lines) |

### Phase 4 — Equipment & Gear ✅

| #   | File            | Builds on | Key content                                                                                    | Status                  |
| --- | --------------- | --------- | ---------------------------------------------------------------------------------------------- | ----------------------- |
| 15  | `equipment.mdx` | #12, #13  | Weapons table (damage dice, range, ammo), armor types and AR, gear and tools, price references | ✅ **DONE** (251 lines) |

### Phase 5 — Creatures & Adversaries ✅

| #   | File                      | Builds on | Key content                                                       | Status                                |
| --- | ------------------------- | --------- | ----------------------------------------------------------------- | ------------------------------------- |
| 16  | `creatures/mechanics.mdx` | #12–14    | Creature/NPC stat blocks, scale classification, special abilities | ✅ **DONE** (230 lines)               |
| 17  | `creatures/beastiary.mdx` | #16       | Example creature stat blocks (Rancor, Nexu, etc.)                 | ✅ **DONE** (30 lines + 2 data files) |

### Phase 6 — Vehicles ✅

| #   | File                                               | Builds on     | Key content                                                                | Status                  |
| --- | -------------------------------------------------- | ------------- | -------------------------------------------------------------------------- | ----------------------- |
| 18  | `vehicles-mechanisms/traits-systems.mdx`           | #14           | Vehicle attributes (Maneuverability, Durability, Speed, etc.), scale types | ✅ **DONE** (303 lines) |
| 19  | `vehicles-mechanisms/durability-damage-repare.mdx` | #18           | Vehicle damage track, repair rules, droid repair parallel                  | ✅ **DONE** (213 lines) |
| 20  | `vehicles-mechanisms/space-combat.mdx`             | #12, #18, #19 | Dogfighting, Gunnery vs Pilot opposed rolls, capital ship combat           | ✅ **DONE** (212 lines) |
| 21  | `vehicles-mechanisms/modifications.mdx`            | #18           | Customization background examples, attribute trade-offs, upgrade costs     | ✅ **DONE** (175 lines) |

### Phase 7 — GM Section (depends on everything) 🟡

| #   | File                          | Builds on  | Key content                                                                         | Status                  |
| --- | ----------------------------- | ---------- | ----------------------------------------------------------------------------------- | ----------------------- |
| 22  | `gm/building-encounters.mdx`  | #12–21     | Encounter balance guidelines, NPC creation, threat rating                           | ✅ **DONE** (226 lines) |
| 23  | `gm/difficulty-reference.mdx` | #22        | Interactive probability calculator, difficulty calibration, success thresholds      | ✅ **DONE** (340 lines) |
| 24  | `gm/rewards-advancement.mdx`  | #4, #7, #8 | XP costs for attributes/abilities/virtues/force, training time, bonus XP guidelines | ✅ **DONE** (160 lines) |
| 25  | `gm/adventure-design.mdx`     | #22–24     | Story structure, pacing, session zero tips                                          | ✅ **DONE** (170 lines) |
| 26  | `gm/running-the-game.mdx`     | #22–25     | The 80/20 principle, making rulings, difficulty calibration, tone and genre         | ✅ **DONE** (205 lines) |

### Phase 8 — Polish ✅

| #   | File                  | Builds on | Key content                                                                                                            | Status                  |
| --- | --------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 27  | `example-of-play.mdx` | #1–26     | Full narrative example showing dice pool formation → roll → success evaluation → damage, using `InlineRoll` throughout | ✅ **DONE** (203 lines) |
| 28  | `en-ru-termins.mdx`   | #1–27     | Bilingual terminology glossary (en/ru) for all system terms                                                            | ✅ **DONE** (214 lines) |
| 29  | `index.mdx`           | #1–28     | Expand from 4-line stub to a proper landing page with module overview                                                  | ✅ **DONE** (57 lines)  |

### Phase 9 — Fill from WEG SWRPG Source Book ⬜

| #   | Area             | What to add                                                                                                                                       | Status |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 30  | **Species**      | Expand species catalog with EU species (Bothans, Nautolans, Togruta, Chiss, Mandalorians, etc.) using era-variant entries from WEG source books   | ✅     |
| 31  | **Bestiary**     | Populate `creatureData.ts` with 20+ creature stat blocks from WEG (nexu, acklay, reek, mynock, dianoga, sarlacc, krayt dragon, etc.)              | ✅     |
| 32  | **Equipment**    | Expand `rangedWeaponsData.ts` with additional blasters, slugthrowers, sporting weapons from WEG source books; add grenade types and heavy weapons | ✅     |
| 33  | **Armor**        | Expand `armorData.ts` with additional armor types (flight suit, armored flightsuit, combat jumpsuit, etc.) from WEG                               | ✅     |
| 34  | **Vehicles**     | Populate vehicle data files with stats from WEG (speeder bikes, landspeeders, starfighters, freighters, capital ships)                            | ✅     |
| 35  | **Items & Gear** | Expand equipment.mdx misc gear with full WEG item catalog (sensors, survival gear, security devices, medical upgrades, etc.)                      | ✅     |

### Phase 10 — Translation 🟡

| #   | Focus          | What to do                                                                                                                                                           | Status |
| --- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 35  | **Docs i18n**  | Translate all MDX docs under `docs/star-wars-wod-2e/` into Russian using Docusaurus i18n (ru locale).                                                                | ✅     |
| 36  | **UI i18n**    | Translate all UI strings in `src/` (dice_roller, sheet_manager, shared components) — extract English strings into i18n JSON files.                                   | ⬜     |
| 37  | **Glossary**   | Update `docs/star-wars-wod-2e/en-ru-termins.mdx` with any new terms introduced during translation; ensure it stays the single source of truth for terminology pairs. | 🟡     |
| 38  | **Data files** | Translate user-facing strings in `src/data/` (species, abilities, equipment, etc.) — add `ru` fields to data entries.                                                | ⬜     |

> **Note:** The `en-ru-termins.mdx` bilingual glossary must be updated throughout this phase whenever new terminology is introduced. Keep it in sync as the single source of truth for all en↔ru term pairs.

---

## Key cross-cutting notes to preserve throughout

From quick-start's subtext + conversion doc, these nuances should surface in their relevant files:

- **1 success is marginal** — core dictum from quick-start example, reinforce in dice-pools.mdx
- **Botch requires at least one `1` AND zero net successes** — not just any failure
- **Heroic soak rule** — PCs always take min 1 lethal; fodder NPCs can't soak lethal at all
- **Force Points serve the Willpower role** in V:TM; Willpower is a static defense stat
- **Attributes floor at 1, cap at 5**; abilities floor at 0, cap at 3 (starting)
- **Droid memory partitioning** — Talents/Skills/Knowledges use separate memory
- **Freebie costs** cascade (5/dot attribute, 2/dot ability, 2/dot virtue, 3/dot force skill, 1/dot background/merit)

---
