# Quickstart: Validating Entity Sheet Templates and Docs Embeds

Validation guide for feature 007. Contracts: [entity-templates](./contracts/entity-templates.md), [catalog-fill](./contracts/catalog-fill.md), [docs-embeds](./contracts/docs-embeds.md), [view-resolution-and-retirement](./contracts/view-resolution-and-retirement.md).

## Prerequisites

- `yarn install` done; check whether the dev server already runs at `http://localhost:3000/` before starting one (`yarn start`).
- Browser storage may contain pre-feature creature/vehicle/fodder documents — keep one of each to validate FR-008.

## Automated gates

| Command                                                  | Proves                                                                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `yarn test tests/sheet_manager/entity-bindings.test.ts`  | lens reads/writes per kind, schema re-parse, fodder `trackLength` parse default 7 / create default 3              |
| `yarn test tests/sheet_manager/cohort-track.test.tsx`    | lettering, add/remove limits, removal confirmation, defeated state, length change collapse                        |
| `yarn test tests/sheet_manager/catalog-bindings.test.ts` | overwrite / untouched / cleared semantics, adapters, row fills, bridged writes                                    |
| `yarn test tests/sheet_manager/entity-templates.test.ts` | six templates parse; every node resolves for its kind; FR-004 field inventory; paper-sheet coverage list (SC-001) |
| `yarn test tests/sheet_manager/docs-embeds.test.tsx`     | every MDX embed and example id resolves; no legacy imports (SC-005/006)                                           |
| `yarn test tests/sheet_manager/view-resolution.test.ts`  | every view template-backed; legacy `brief` id; `template-fallback` reports; no throw                              |
| `yarn verify`                                            | lint + typecheck + full suite (schema/persistence tier)                                                           |
| `yarn validate:data && yarn validate:i18n`               | catalogs intact; en/ru docs + import parity                                                                       |
| `yarn verify:full`                                       | production build with docs changes and removed modules                                                            |

## Manual scenarios

1. **Creature from bestiary** (US1, SC-003): new creature → pick _Wampa_ in Species → attributes, abilities, attacks, merits, description fill; type a value, pick _Rancor_ → mapped values overwritten, name/notes untouched. Set tier Fodder → "cannot soak lethal" row appears. Add members B, C; mark C Injured → only C's penalty changes. Reload → all persists; "Details" collapsed state remembered.
2. **Vehicle from catalog** (US2): new vehicle → pick _T-65B X-wing_ → systems and weapons fill with arcs selected; add a modification; link Pilot to a character → "open" switches to it; delete that character → placeholder shown, page still works.
3. **Fodder squad** (US3, edge cases): new group → tracks have 3 levels; set 6 members, mark B Hurt and E Incapacitated → E shows defeated; remove E → confirmation; switch length 3→7 → tracks lengthen; 7→3 with marks beyond → confirmation and collapse to Incapacitated. Try a 13th member → blocked with message.
4. **Brief pages** (US4, SC-004): switch each kind to its brief view; resolve a round (roll pools, apply damage) without opening the full page; change a value in brief → full page reflects it.
5. **Pre-feature documents** (FR-008, SC-002): open the kept legacy documents → every previous value visible; old groups show 7 levels.
6. **Docs** (US5): in `en` and `ru` open Quick Start, creation steps 1–5, Attributes & Abilities, Force, Worked Example, Example of Play, Health/Damage, Creature & NPC Mechanics, Vehicle Traits & Systems, Durability/Damage/Repair. Editable embeds edit the current character; with no character, a create prompt appears; previews are read-only and match the prose; static example tables are gone.
7. **Retirement** (US6): `grep -rn "features/sheet/blocks\|components/viewer\|builtInBlockRegistry" src docs i18n tests` → no hits; `context/legacy-sheet-components/README.md` exists. Set a document's `preferredViewId` to an unknown id (devtools) → default view + notice; diagnostics show `template-fallback`.
