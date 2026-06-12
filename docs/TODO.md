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

| Phase                             | Status                                 |
| --------------------------------- | -------------------------------------- |
| Phase 1 — Core Mechanics          | ✅ **DONE** (both files fully written) |
| Phase 2 — Character Creation      | ⬜ NOT DONE (8 files, 0-line stubs)    |
| Phase 3 — Combat                  | ⬜ NOT DONE (3 files, 0-line stubs)    |
| Phase 4 — Equipment & Gear        | ⬜ NOT DONE (1 file, 0-line stub)      |
| Phase 5 — Creatures & Adversaries | ⬜ NOT DONE (2 files, 0-line stubs)    |
| Phase 6 — Vehicles                | ⬜ NOT DONE (4 files, 0-line stubs)    |
| Phase 7 — GM Section              | ⬜ NOT DONE (4 files, 0-line stubs)    |
| Phase 8 — Polish                  | ⬜ NOT DONE (3 files, 0-line stubs)    |

`quick-start.mdx` (241 lines) — not in the build sequence table but fully written and serves as the foundation for Phase 1.

## Proposed Build Sequence

Each file builds on concepts + component patterns established in prior files. **No file requires content from a later file.**

### Phase 1 — Core Mechanics (foundation for everything) ✅

| #   | File                                  | Builds on   | Key content from conversion doc                                                                                                                                                                                        | Status                  |
| --- | ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | `core-rules/dice-pools.mdx`           | quick-start | Full dice pool mechanics: difficulty table (repeated), Rule of One deep-dive, botch vs failure distinction, **1 success = marginal** (explicit), extended actions detail, untrained actions, splitting pools, teamwork | ✅ **DONE** (371 lines) |
| 2   | `core-rules/attributes-abilities.mdx` | #1          | All 9 attributes with descriptions, all 30 abilities by column (Talents/Skills/Knowledges) with dot-rank descriptions, specialization examples, secondary abilities                                                    | ✅ **DONE** (88 lines)  |

These two establish `InlineRoll` patterns (simple, details, multiline) with hardcoded notations like `5d10>=6f=1`, `3d10>=6f=1`, etc.

### Phase 2 — Character Creation (sequenced by creation order) ⬜

| #   | File                                 | Builds on | Key content                                                                                                                                                                                                 | Status  |
| --- | ------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 3   | `character/species.mdx`              | #1, #2    | Species table from conversion doc (Ewok, Gamorrean, etc with merits/flaws and freebie point adjustments), droid as species alternative, rules about ignoring WEG min/max                                    | ⬜ stub |
| 4   | `character/creation-steps.mdx`       | #1–3      | Full step-by-step — concept/nature/demeanor, species choice, 7/5/3 attributes, 13/9/5 abilities, backgrounds, virtues, freebie spending (with cost table), complete worked example (Jax Vorn or similar)    | ⬜ stub |
| 5   | `character/backgrounds.mdx`          | #4        | All background descriptions from conversion doc (Allies, Contacts, Customization, Droid, Influence, Mentor, Military Rank, Noble Status, Reputation, Resources, Retainers, Vehicle) with dot-rank tables    | ⬜ stub |
| 6   | `character/merits-flaws.mdx`         | #4, #5    | Full merits/flaws catalog from conversion doc: Psychological, Mental, Awareness, Aptitudes, Galactic Connections, Alien Physiology groups; point costs and freebie point balance rules                      | ⬜ stub |
| 7   | `character/virtues-willpower.mdx`    | #4        | Conscience, Passion, Self-Control deep-dive (dot descriptions, movie character examples), derived formulas (Willpower = Passion + Self-Control, Force Points = Self-Control), optional non-Force-user rules | ⬜ stub |
| 8   | `character/dark_side_resistance.mdx` | #7        | DSR formula (5 + Conscience - Passion), humanity-like degeneration, optional social ostracism rule, recovery costs                                                                                          | ⬜ stub |
| 9   | `character/force.mdx`                | #7, #8    | Force Skill prerequisites (Control, Dynamism, Rapport, Sense, Telekinesis), Force Point spending options (auto-success vs +Passion dice), Force Powers (reference to conversion doc)                        | ⬜ stub |
| 10  | `character/droids-cyborgs.mdx`       | #9        | Droid creation differences (upgrade vs XP, reprogramming rules with table, memory types by column), NPC droid degree table                                                                                  | ⬜ stub |
| 11  | `character/reading-sheet.mdx`        | #3–10     | Reference guide to every section of the character sheet with field descriptions, derived stat callouts, sheet layout map                                                                                    | ⬜ stub |

### Phase 3 — Combat (builds on core mechanics + characters) ⬜

| #   | File                            | Builds on | Key content                                                                                                                                                                          | Status  |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 12  | `combat/combat-flow.mdx`        | #1, #2    | Initiative (Wits + Alertness), turn structure (move + one action), attack resolution (Dex + Blaster vs difficulty 6, opposed Dodge), damage rolls, soak rules, reactions             | ⬜ stub |
| 13  | `combat/health-damage-heal.mdx` | #12       | 7-level track, damage types (Bashing/Lethal/Stun) with mechanics, wound penalties table (-1 to -5), healing rates, Bacta Tank, amputation rules, **heroic soak rule** (min 1 lethal) | ⬜ stub |
| 14  | `combat/combat-scales.mdx`      | #12, #13  | Scale ladder (Vermin to Death Star), cross-scale damage multipliers/divisions, vehicle vs character combat                                                                           | ⬜ stub |

### Phase 4 — Equipment & Gear ⬜

| #   | File            | Builds on | Key content                                                                                    | Status  |
| --- | --------------- | --------- | ---------------------------------------------------------------------------------------------- | ------- |
| 15  | `equipment.mdx` | #12, #13  | Weapons table (damage dice, range, ammo), armor types and AR, gear and tools, price references | ⬜ stub |

### Phase 5 — Creatures & Adversaries ⬜

| #   | File                      | Builds on | Key content                                                       | Status  |
| --- | ------------------------- | --------- | ----------------------------------------------------------------- | ------- |
| 16  | `creatures/mechanics.mdx` | #12–14    | Creature/NPC stat blocks, scale classification, special abilities | ⬜ stub |
| 17  | `creatures/beastiary.mdx` | #16       | Example creature stat blocks (Rancor, Nexu, etc.)                 | ⬜ stub |

### Phase 6 — Vehicles ⬜

| #   | File                                               | Builds on     | Key content                                                                | Status  |
| --- | -------------------------------------------------- | ------------- | -------------------------------------------------------------------------- | ------- |
| 18  | `vehicles-mechanisms/traits-systems.mdx`           | #14           | Vehicle attributes (Maneuverability, Durability, Speed, etc.), scale types | ⬜ stub |
| 19  | `vehicles-mechanisms/durability-damage-repare.mdx` | #18           | Vehicle damage track, repair rules, droid repair parallel                  | ⬜ stub |
| 20  | `vehicles-mechanisms/space-combat.mdx`             | #12, #18, #19 | Dogfighting, Gunnery vs Pilot opposed rolls, capital ship combat           | ⬜ stub |
| 21  | `vehicles-mechanisms/modifications.mdx`            | #18           | Customization background examples, attribute trade-offs, upgrade costs     | ⬜ stub |

### Phase 7 — GM Section (depends on everything) ⬜

| #   | File                         | Builds on  | Key content                                                                         | Status  |
| --- | ---------------------------- | ---------- | ----------------------------------------------------------------------------------- | ------- |
| 22  | `gm/building-encounters.mdx` | #12–21     | Encounter balance guidelines, NPC creation, threat rating                           | ⬜ stub |
| 23  | `gm/rewards-advancement.mdx` | #4, #7, #8 | XP costs for attributes/abilities/virtues/force, training time, bonus XP guidelines | ⬜ stub |
| 24  | `gm/adventure-design.mdx`    | #22, #23   | Story structure, pacing, session zero tips                                          | ⬜ stub |
| 25  | `gm/running-the-game.mdx`    | #22–24     | The 80/20 principle, making rulings, difficulty calibration, tone and genre         | ⬜ stub |

### Phase 8 — Polish ⬜

| #   | File                  | Builds on | Key content                                                                                                            | Status  |
| --- | --------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- | ------- |
| 26  | `example-of-play.mdx` | #1–25     | Full narrative example showing dice pool formation → roll → success evaluation → damage, using `InlineRoll` throughout | ⬜ stub |
| 27  | `en-ru-termins.mdx`   | #1–26     | Bilingual terminology glossary (en/ru) for all system terms                                                            | ⬜ stub |
| 28  | `index.mdx`           | #1–27     | Expand from 4-line stub to a proper landing page with module overview                                                  | ⬜ stub |

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
