# Contract: roll origin and the V5 reading

Connects `dice_roller` (store, panel, header button) with `sheet_manager` (system dice
rules) through `integrations/roll-reading` and `integrations/sheet-dice`.

## Boundary

```text
sheet_manager ──(SystemPlugin.dice via systemRegistry)──► integrations/roll-reading
                                                               │ registers RollReader
dice_roller store.roll(notation, { origin }) ──► reader.prepare ─► roll ─► reader.interpret
                                                               ▲
integrations/sheet-dice ── RollSource (queued stat / shown document / immediate roll)
```

- `dice_roller` defines `RollOrigin`, `RollReader`, `RollReadingSummary`, and
  `registerRollReader(reader) → unregister`. It never imports `sheet_manager`.
- `integrations/roll-reading` imports only `sheet_manager/systems` (the registry entry
  point) and the dice roller's public types; it is registered in `src/theme/Root.tsx`.
- `sheet_manager` publishes the shown document and roll sources through
  `integrations/sheet-dice`.

## Who passes which origin

| Call site                               | Origin                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| StatDot right-click (`rollImmediately`) | `{ kind: 'sheet', source }`                                     |
| Panel roll button (`RollControls`)      | `{ kind: 'panel', control: 'roll-button', tab, wod?, source? }` |
| Enter in `NotationInput`                | `{ kind: 'panel', control: 'enter', tab, wod?, source? }`       |
| Header pending-roll button              | `{ kind: 'panel', control: 'header', tab, wod?, source? }`      |
| History right-click re-roll             | `{ kind: 'panel', control: 'history', tab, wod?, source? }`     |
| Docs `InlineRoll` / `CharRoll`          | none — they call `rollDices()` and never reach the store        |

The queued source is cleared whenever the notation input becomes empty (by hand, the
clear button, the header's right-click, or a roll), so an erased stat never lends its
system to a later hand-typed roll.

`tab` is the persisted `panelTab` even while the panel is closed. `wod` is filled from
settings when `tab === 'wod'`. `source` is the queued stat's source from session storage,
else the shown document, else absent.

## Applicability (FR-013 / FR-014)

| Origin                                                                      | Reading applies when | Line              |
| --------------------------------------------------------------------------- | -------------------- | ----------------- |
| `sheet` with a V5 source                                                    | always               | the module's line |
| `panel`, control `header`, V5 source (queued, else shown)                   | always, any tab      | the module's line |
| `sheet` with another system                                                 | never                | —                 |
| `panel`, tab `wod`, mode `v5` (other controls, or header without V5 source) | always               | `settings.v5Line` |
| `panel`, tab `wod`, mode `classic`                                          | never                | —                 |
| `panel`, tab `standard` or `dnd`                                            | never                | —                 |
| `panel`, tab `''`, V5 source                                                | always               | the module's line |
| `panel`, tab `''`, other or no source                                       | never                | —                 |

"V5 source" = the source's system declares `dice.reading`. When a reading applies:

1. `prepare`: if `v5CriticalPairs` is on and the pool is a success count, add `x2=10` at
   pool scope (wrap multi-term pools in parentheses and move the shared target onto the
   group). A notation that is not a success count is left as is, and no reading is
   recorded. `prepare` is idempotent: a pool that already has a set bonus (e.g. a
   re-roll from history, recent, or favourites) is left unchanged, whatever the setting.
2. Roll as usual (2D or 3D).
3. `interpret`: if `v5SpecialOutcomes` is on, compute outcomes (see data-model V5 rules);
   the result always records `reading` with the line so history shows what applied.

Difficulty: the tab's `v5Difficulty` for panel origins with tab `wod`; unknown (`null`)
for sheet and no-tab origins.

## Presentation of a reading

| Surface | Shows                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------- |
| Toast   | `notation = total` as today, plus the first outcome title                                           |
| History | outcome titles and details under the roll; labelled dice in `specialDiceColor` with the `:h` marker |
| Discord | outcome titles as text lines; labelled values prefixed with the line name                           |

No publisher badge or notice appears on any of these surfaces (constitution VIII, 1.4.1).

## Failure behaviour

- No reader registered, or the reader throws: the roll proceeds unread, and the error is
  logged through the dice roller's logger (never silent, never blocking).
- A source whose system is unknown (e.g. a deleted document): treated as "no source".
- 3D fallback to 2D keeps the reading and labels.
