# Rules and sheet consistency: decision register

**Backlog**: [T-132](../../TODO.md) | **Branch**: `049-rules-sheet-consistency` **Reviewed**:
2026-11-11 | **State**: approved rules and source evidence

This register records the eleven T-132 subjects as investigated before implementation. The
[spec 047 review](../047-sheet-help-links/review.md#other-findings) explains the intake; the
evidence below describes that starting state. Only decisions explicitly marked approved are
maintainer rules decisions; the implementation and verification record lives in the design.

## D1. Droid Force resources — approved

- **Evidence**: `docs/star-wars-wod-2e/character/droids-cyborgs.mdx`, Droid Characters, permits
  Force Points and Dark Side Resistance but forbids Force Skills. The local conversion source's
  Droid Characters section agrees. `DroidDataSchema` in
  `src/sheet_manager/systems/star-wars-wod/schema.ts` retains the optional resources. Both pages in
  `templates/character.ts` exclude the two controls for droids.
- **Maintainer decision, 2026-11-11**: expose both resources on the full droid page and its brief.
  Force Skills remain unavailable.
- **Boundary**: reveal already stored values. Missing optional values must not be backfilled from
  today's Virtues merely by opening a document.

## D2. Star Wars resource lifecycle — approved

- **Evidence**: `docs/star-wars-wod-2e/character/virtues-willpower.mdx`, Derived Stats and
  Willpower, agrees with the conversion source's Willpower, Force Points and Dark Side Resistance
  passages: the formulas determine starting values only, and Willpower is not spendable.
  `templates/character.ts` supplies ongoing `minFrom` and `maxMinFrom` restrictions. The setting
  profile inherits pool-mode Willpower.
- **Maintainer decision, 2026-11-11**: remove ongoing Virtue-derived minima; represent Willpower as
  a static rating. Force Points remain spendable. Later Virtue changes do not recalculate these
  independently advanced resources.
- **Boundary**: the current app has no character-creation wizard. This decision does not authorize
  guessing creation-time Virtues or recalculating existing characters. The lasting rating is the
  older pair's `willpower.max`; opening a document must preserve `willpower.current` even when it
  differs. This is a compatibility assumption for the design, not a conversion of stored values.

## D3. Droid memory terminology — evidence-backed correction

- **Evidence**: the memory table in `droids-cyborgs.mdx` lists Firearms, Computer, Occult and other
  classic WoD entries. The setting's actual category membership is declared in
  `src/sheet_manager/systems/star-wars-wod/profile.ts`: for example, Blaster and Programming are
  Skills; Interfaces and Tech are Knowledges. The existing reprogramming example already uses
  Cultures, Languages and Interfaces.
- **Proposed correction**: reconcile the complete table and examples with the setting's categories
  in English and Russian, using established localized names. Do not replace just three names while
  retaining other mismatched entries.
- **Boundary**: no stored trait ids, ratings, free memory counters or equipment records change as
  part of a vocabulary correction.

## D4. Force-derived calculations — supported formulas

- **Evidence**: the conversion source's Lightsaber Combat passage adds Control dice to initiative.
  Its Force Feats passage multiplies the ordinary action's successes by the lower of Control and
  Telekinesis and costs one Force Point. `templates/character.ts` displays
  `wits + alertness + control` and `max(min(control, telekinesis), 1)`. `character/force.mdx`,
  Force-derived Stats, already describes the prerequisite power and dimensionless multiplier.
- **Proposed correction**: retain supported calculations; validate labels and examples in both
  languages. A displayed baseline of x1 is not permission to use a power without its prerequisites
  and cost. Neither movement field denotes metres or metres per turn. Initiative is a pool, not a
  completed turn order.

## D5. Fodder and creature Health — approved

- **Evidence**: `gm/building-encounters.mdx` calls fodder health a shared pool.
  `creatures/mechanics.mdx`, Fodder Members, and the shipped pages track members separately, with
  3/5/7-box choices; the creature Health passage mentions only seven levels. The conversion's Fodder
  Sheets show separate A-L tracks.
- **Maintainer decision, 2026-11-11**: retain separate tracks; seven levels are the standard and 3/5
  are explicit shortened configurations. Correct the encounter guidance and explain the selector
  consistently for creatures and fodder.
- **Boundary**: no shared group pool and no conversion of stored per-member injuries.

## D6. WoD 2e engine meaning — approved

- **Evidence**: `systems/wod2e/ruleset/schema.ts` and `profile.ts` use health penalties
  0/-1/-2/-3/-4/-5, shared with Star Wars. The local Vampire 2nd Edition source's Health passage
  gives 0/-1/-1/-2/-2/-5. `ruleset/bindings.ts` names slash and cross Bashing and Lethal; the source
  distinguishes ordinary and aggravated wounds. `systems/wod-like/dicePool.ts` implements the
  conversion's Experienced flag and exploding specialty dice. Armor uses inherited editable text
  fields. `docs/wod-2e/rules/` currently describes the inherited implementation.
- **Maintainer decision, 2026-11-11**: make the engine follow the declared classic edition; preserve
  the Star Wars variant's mechanics. Audit trait flags, specialty interpretation, health, damage
  labels, armor and Willpower against that scope.
- **Maintainer compatibility decision, 2026-11-11**: keep the number and positions of existing
  wounds; convert both old damage types to ordinary damage under 2e, retain the original marks for
  recovery, and notify the user about the conversion. New aggravated damage is recorded explicitly.
  Converted characters use classic wound penalties; an old lethal cross must never become aggravated
  automatically.
- **Boundary**: this is not a new Vampire module (T-043). Retain old flags even when the corrected
  rules no longer give them an effect. Do not change the Star Wars meaning of stored marks, flags or
  penalties.

## D7. Ambiguous group names — terminology proposal

- **Evidence**: `systems/wod2e/ruleset/templateParts.ts` supplies common sections;
  `docs/wod-2e/rules/traits.mdx` has to explain that Skills names both the umbrella and a subgroup.
  The brief Resolve block combines several different values. Appearance names both a numerical
  Attribute and a written description card.
- **Proposed correction**: use Abilities for the WoD-family three-category umbrella, Condition for
  the combined status block, and Appearance description for the prose card; retain the actual trait
  and category names. Match English and Russian wording through the canonical translations and
  glossary.
- **Boundary**: V5's single Skills collection does not acquire a fictitious
  Talents/Skills/Knowledges split. Preserve node ids and stored coordinates.

## D8. Vehicle system records — approved

- **Evidence**: `templates/vehicle.ts` stores System slots in a template-value table (up to ten
  names plus Damaged flags); `schema.ts` stores Configuration as a separate list (up to twenty
  labels). `docs/guide/sheet.mdx` already describes the independence. The vehicle rules' sheet
  overview still calls the numeric vehicle characteristics Configuration; ion-damage guidance refers
  to its list.
- **Maintainer decision, 2026-11-11**: keep the records independent, explain the respective uses
  consistently, and align the vehicle overview with the actual page. Neither denotes fixed physical
  compartments or automatic synchronization.
- **Boundary**: no matching, merging or synchronization of the two records.

## D9. V5 mortal moral traits — approved

- **Evidence**: `systems/v5/core/templates.ts` exposes Touchstones, Convictions and Tenets.
  `docs/wod-v5/rules/convictions-touchstones.mdx` already treats them as portrayal notes and assigns
  no line-specific resources or consequences. `translations/glossary/v5.yaml` owns the canonical
  Russian names; use its `conviction`, `touchstone` and `chronicle-tenets` entries.
- **Maintainer decision, 2026-11-11**: retain that narrative scope. Check the sheet and bilingual
  help for agreement; do not introduce Vampire Humanity or Stains for mortals.
- **Boundary**: no new mortal morality subsystem is assumed.

## D10. Hunter Creed Fields — approved

- **Evidence**: `modules/hunter/schema.ts` stores free text `creedFields` and `redemption`. The full
  page's Creed and Drive card contains those two fields, while Creed and Drive themselves appear
  elsewhere. The current tutorial `03-creed-drive.mdx` supplies a free-text interpretation, not a
  distinct rating. Russian currently renders Creed Fields as a literal translation of that label.
- **Maintainer decision, 2026-11-11**: retain optional notes, give the field a meaningful label
  (Creed notes), and name the card for its actual contents. Do not claim this is a separate
  published mechanic. Preserve the stored key and existing text.
- **Boundary**: the field remains on the shipped page; this is a terminology correction, not a new
  Creed choice or mechanical rating.

## D11. Action help and rendered validation — implementation requirements

- **Evidence**: Rouse and Remorse, including row-level power Rouse, render via
  `features/sheet/declarative/SheetButton.tsx`. The component renders the action itself;
  `systems/v5/modules/vampire/templates/mechanics.ts` declares its effects. The existing help
  wrapper handles field labels, not an adjacent action-help target. A rules link must not be nested
  inside the action button.
- **Proposed behavior**: a visible sibling help target with a meaningful accessible name, reachable
  separately by keyboard and usable for row actions. Help must not roll dice or change a resource,
  including when the action itself is unavailable. Shipped and user-authored buttons use the same
  supported control/settings.
- **Rendered matrix still required**: every shipped full page and brief, EN/RU, including hidden
  identity headings, short brief labels and repeated row actions; desktop and narrow layouts for
  changed controls. Record actual inaccessible or missing marks and untranslated labels before
  declaring a defect. General note's suppressed default Markdown help remains intentional.
- **Not performed in this investigation**: browser walk, assistive-technology testing,
  implementation tests, build, or rule conversion of stored documents.

## Scope boundary

All eleven intake subjects remain in one T-132 specification. T-143's onward interaction-help links
and T-144's Hunter cell synchronization guidance stay in their own tasks. No new game system, online
service, initiative tracker or guided creation wizard is included. The feature remains offline and
must not load the document collection to render or update one sheet.

The accepted outcomes are recorded in [spec.md](spec.md); [design.md](design.md) and
[tasks.md](tasks.md) describe their delivery and verification. This file records evidence and
decisions; it is not an implementation plan or a test report.
