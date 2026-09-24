# Contract: notation additions (label and set bonus)

System-neutral. Existing notation keeps its meaning (SC-004).

## Grammar delta

```text
diceTerm     := DICE label? forced? modifier*
label        := ':h'                          ; literal, directly after the dice, before @values
modifier     := … existing … | setBonus
setBonus     := 'x' N ('.' K)? comparePoint   ; N ≥ 2, K ≥ 1 (default K = N)
group        := '(' expr ')' groupModifier*
groupModifier:= … existing (distributed to inner terms) … | setBonus (kept on the group)
```

- `setBonus` parses its own compare point, like `cs`/`cf`; `x2=10` never sets a target.
- A set bonus needs a success target (`>=`, `>`, `=`, …) in the same scope: the term's
  own target for a term-level bonus, the group's target for a group-level bonus.
- At most one set bonus per scope.

## Semantics

- **Label**: every die of the term, including explosions and rerolls, carries `label: 'h'`.
  The label changes no value; it is data for presentation and readings.
- **Set bonus**: over the kept dice in scope, in roll order, dice matching the compare
  point are grouped into complete sets of N; each set adds K to the scope's success count.
  Leftover matching dice count as usual. Dropped dice never form sets.
- **Order**: term scope — after critical failure, before sort. Group scope — after the
  inner expression is evaluated.

## Examples (fixed dice)

| Notation                   | Dice                | Total | Note                                                |
| -------------------------- | ------------------- | ----- | --------------------------------------------------- |
| `6d10>=6x2=10`             | 6, 7, 10, 10, 4, 2  | 6     | one set: 4 base successes + 2                       |
| `6d10>=6x2=10`             | 10, 10, 10, 3, 3, 3 | 5     | one set; the third 10 is a plain success            |
| `4d10>=6x2=10`             | 10, 10, 10, 10      | 8     | two sets                                            |
| `(4d10+2d10:h)>=6x2=10`    | 10, 3, 3, 3 / 10, 1 | 4     | the set spans the regular and labelled terms        |
| `(4d10+2d10:h)>=6f=1x2=10` | 10, 3, 3, 3 / 10, 1 | 3     | failures still subtract (classic combos stay legal) |
| `6d10>=6`                  | 6, 7, 10, 10, 4, 2  | 4     | unchanged behaviour without `x`                     |
| `3d6x3=6` → error          | —                   | —     | `set-bonus-needs-target`                            |
| `(2d10):h` → error         | —                   | —     | `label-position`                                    |

## Output formatting

- `formatted` re-emits the label and the bonus: `[10**x,3,3,3]+[10**x,1]:h …`.
- Set members carry a trailing `x` in `details`/`formatted`, after the existing marker.
- `RollResult.setBonus` lists `{ sets, added }` per scope.

## Notation helpers (UI)

- `handleDiceNotation` / `mergeDiceNotation` treat `d10` and `d10:h` as different parts.
- `rewriteWodDifficulty` rewrites `d10:h>=N` like `d10>=N`.
- The V5 tab builds `Nd10>=6` for one term and `(Nd10+Md10:h)>=6` for two; the reading
  (not the tab) adds `x2=10` when critical pairs apply.
