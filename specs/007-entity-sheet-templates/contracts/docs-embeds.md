# Contract: Documentation Embeds

Public entry: `src/sheet_manager/docsEmbeds.tsx`. MDX files import sheet content **only** from this module (plus unrelated shared components such as `TWWrapper`).

## Exports

| Export                                                       | Kind      | Status                                                                                                                                           |
| ------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TemplateFragment({ template?, node?, systemId? })`          | component | changed: no matching current document → actionable prompt (create document) instead of empty render                                              |
| `TemplatePreview({ document, template?, node?, systemId? })` | component | unchanged                                                                                                                                        |
| `presetCharacterDocument(character)`                         | helper    | unchanged                                                                                                                                        |
| `healthPreviewDocument(levels)`                              | helper    | unchanged                                                                                                                                        |
| `JAX_VORN_PRESET`                                            | re-export | new (so docs need no `data/presets` import)                                                                                                      |
| `exampleDocument(id)`                                        | helper    | new — returns the example envelope ([data-model.md](../data-model.md) §7); unknown id reports `template-reference-invalid` and returns undefined |
| `vehicleDamagePreviewDocument(levels)`                       | helper    | new                                                                                                                                              |

## Legacy replacements (en and ru, identical)

| File (`docs/star-wars-wod-2e/…`)                                     | Legacy                                                                       | Replacement                                                                                             |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `quick-start.mdx`                                                    | `BaseBlock`, `AttributeBlock`, `SkillBlock`, `AdvantagesBlock`, `ForceBlock` | `<TemplateFragment node="…" />` with `base`, `attributes`, `skills`, `advantages`, `force` respectively |
| `character/creation-steps/step-1-concept-species.mdx`                | `BaseBlock`                                                                  | `TemplateFragment node="base"`                                                                          |
| `…/step-2-attributes.mdx`                                            | `AttributeBlock`                                                             | `node="attributes"`                                                                                     |
| `…/step-3-abilities.mdx`                                             | `SkillBlock`                                                                 | `node="skills"`                                                                                         |
| `…/step-4-backgrounds.mdx`                                           | `AdvantagesBlock`                                                            | `node="advantages"`                                                                                     |
| `…/step-5-virtues.mdx`                                               | `ForceBlock`                                                                 | `node="force"`                                                                                          |
| `core-rules/attributes-abilities.mdx`                                | `AttributeBlock`, `SkillBlock`                                               | `node="attributes"`, `node="skills"`                                                                    |
| `character/force.mdx`                                                | `ForceBlock`                                                                 | `node="force"`                                                                                          |
| `character/creation-steps/worked-example.mdx`, `example-of-play.mdx` | `CharacterViewer character={JAX_VORN_PRESET}`                                | `<TemplatePreview document={presetCharacterDocument(JAX_VORN_PRESET)} />`                               |
| `combat/health-damage-heal.mdx` (6 uses)                             | `HealthViewer levels={[…]}`                                                  | `<TemplatePreview node="track-health" document={healthPreviewDocument([…])} />` (same level arrays)     |

`template` defaults to `full-sheet`; `accentColor` props are dropped.

## New entity previews (en and ru; each replaces the static table)

| File                                               | Section                                 | Embed                                                                                                                             |
| -------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `creatures/mechanics.mdx`                          | Creature Example: Wampa                 | `TemplatePreview template="creature-sheet" document={exampleDocument('wampa::preset')}`                                           |
| `creatures/mechanics.mdx`                          | Fodder Stat Block Example: Stormtrooper | `TemplatePreview template="fodder-brief" document={exampleDocument('stormtrooper-squad::preset')}` (summary prose line kept)      |
| `vehicles-mechanisms/traits-systems.mdx`           | Example: X-wing Starfighter             | `template="vehicle-sheet"`, `red-five::preset`                                                                                    |
| same                                               | Example: Luke's Landspeeder             | `template="vehicle-brief"`, `lukes-landspeeder::preset`                                                                           |
| same                                               | Example: Millennium Falcon              | `template="vehicle-brief"`, `millennium-falcon::preset`                                                                           |
| `vehicles-mechanisms/durability-damage-repair.mdx` | Vehicle Damage Track                    | `template="vehicle-sheet" node="damage-track"` with `vehicleDamagePreviewDocument([…])`: empty, light (2 marks), severe (5 marks) |

`damage-track` is the id of the cohort primitive inside the `damage` section of `vehicle-sheet`.

## Verification (FR-015)

`tests/sheet_manager/docs-embeds.test.tsx` MUST:

- scan `.mdx` under `docs/` and `i18n/ru/docusaurus-plugin-content-docs/current`;
- parse `template`, `node`, `systemId` string attributes, including multi-line JSX;
- parse `exampleDocument('<id>')` calls and assert the id exists;
- fail naming file + reference for any unresolved template, node, or example id;
- fail if any MDX imports from `features/sheet/blocks`, `components/viewer`, or `data/presets`;
- assert each example document parses with its kind schema and renders its target template without `binding-unresolved` reports.
