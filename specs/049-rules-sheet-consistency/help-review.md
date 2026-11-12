# Shipped help amendments

This table amends the [spec 047 review](../047-sheet-help-links/review.md) for the approved rules
and meaning decisions in [spec 049](spec.md). Unlisted decisions remain as recorded there. Node ids
and destinations are consumed by the help-link contract test. Page and repeated row actions are
included below.

## Droid resources (US1)

The droid's full page and brief now expose its existing Force Points and Dark Side Resistance.
Willpower on the brief receives the same rules destination as the full page. These are distinct
resources inside a card with several fields; no container repeats the destinations.

| id                                                             | link it should have                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `droid-sheet/condition/condition-vitals/resource-force-points` | `/docs/star-wars-wod-2e/character/virtues-willpower#force-points` |
| `droid-sheet/condition/condition-vitals/resource-dark-side`    | `/docs/star-wars-wod-2e/character/dark_side_resistance`           |
| `droid-brief/brief-resolve/resource-willpower`                 | `/docs/star-wars-wod-2e/character/virtues-willpower#willpower`    |
| `droid-brief/brief-resolve/resource-force-points`              | `/docs/star-wars-wod-2e/character/virtues-willpower#force-points` |
| `droid-brief/brief-resolve/resource-dark-side`                 | `/docs/star-wars-wod-2e/character/dark_side_resistance`           |

## Actions (US4)

Action help is a separate, keyboard-reachable target beside the action, including when the action is
unavailable. A power's row action explains its Rouse check rather than repeating its Powers
container's description. `rowButtons/<id>` identifies the declaration once, independent of how many
rows a character has. The brief has no per-power action table.

| id                                                                                | link it should have                                            |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `v5-vampire-sheet/condition/blood/rouse`                                          | `/docs/wod-v5/vampire/reference/hunger-rouse#rouse-checks`     |
| `v5-vampire-sheet/condition/blood/remorse`                                        | `/docs/wod-v5/vampire/reference/humanity-stains#remorse-check` |
| `v5-vampire-brief/condition/rouse`                                                | `/docs/wod-v5/vampire/reference/hunger-rouse#rouse-checks`     |
| `v5-vampire-brief/condition/remorse`                                              | `/docs/wod-v5/vampire/reference/humanity-stains#remorse-check` |
| `v5-vampire-sheet/disciplines/power-list/power-list-table/rowButtons/power-rouse` | `/docs/wod-v5/vampire/reference/hunger-rouse#rouse-checks`     |
