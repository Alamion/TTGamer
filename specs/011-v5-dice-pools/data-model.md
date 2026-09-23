# Data Model: V5 dice pools and precise notation errors

Types are described by shape; names follow the existing modules. "New" marks additions;
everything else exists today.

## dice-logic (system-neutral)

### DiceGroupNode (AST) — extended

| Field       | Type               | Notes                                          |
| ----------- | ------------------ | ---------------------------------------------- |
| `label`     | `'h' \| undefined` | New. Set by `:h` directly after the dice token |
| `modifiers` | `DiceModifiers`    | Gains `setBonus?: SetBonus` (term scope)       |

### ParenthesizedNode (AST) — extended

| Field           | Type                      | Notes                                                                |
| --------------- | ------------------------- | -------------------------------------------------------------------- |
| `poolModifiers` | `{ setBonus?: SetBonus }` | New. Not distributed to inner terms; other group modifiers still are |

### SetBonus — new

| Field          | Type           | Rule                                      |
| -------------- | -------------- | ----------------------------------------- |
| `size`         | integer ≥ 2    | N, dice per set                           |
| `bonus`        | integer ≥ 1    | K, successes added per set; defaults to N |
| `comparePoint` | `ComparePoint` | dice that can form a set                  |

Validation: requires `targetSuccess` in the same scope; N ≤ `MAX_DICE_COUNT`.

### DiceRoll — extended

| Field      | Type                  | Notes                                                     |
| ---------- | --------------------- | --------------------------------------------------------- |
| `label`    | `'h' \| undefined`    | New. Copied from the term, kept through explode/reroll    |
| `setIndex` | `number \| undefined` | New. 0-based index of the complete set the die belongs to |

### DiceGroupResult — extended

| Field   | Type               | Notes |
| ------- | ------------------ | ----- |
| `label` | `'h' \| undefined` | New   |

### FullRollResult / RollResult — extended

| Field      | Type                                | Notes                                                          |
| ---------- | ----------------------------------- | -------------------------------------------------------------- |
| `setBonus` | `{ sets: number; added: number }[]` | New. One entry per scope that had a set bonus                  |
| `origin`   | `RollOrigin \| undefined`           | New (RollResult only). Stored in history                       |
| `reading`  | `RollReadingSummary \| undefined`   | New (RollResult only). Absent when no reading applied (FR-017) |

### NotationDiagnostic — new

| Field      | Type                                            | Notes                                      |
| ---------- | ----------------------------------------------- | ------------------------------------------ |
| `kind`     | `NotationErrorKind`                             | See the contract for the full list         |
| `offset`   | integer                                         | 0-based; `notation.length` at end of input |
| `length`   | integer ≥ 0                                     | 0 at end of input                          |
| `found`    | `string \| undefined`                           | offending text                             |
| `expected` | `string[] \| undefined`                         | token classes, e.g. `['number']`           |
| `limit`    | `{ name: LimitName; max: number } \| undefined` | for `limit-exceeded`                       |

Thrown as `NotationError` (extends `Error`, `diagnostic` field).

## dice_roller (store and UI)

### DiceRollerSettings — extended (persisted, store `version: 1`)

| Key                 | Type                        | Default         |
| ------------------- | --------------------------- | --------------- |
| `specialDiceColor`  | colour string               | `#8B0000`       |
| `wodMode`           | `'classic' \| 'v5'`         | `'classic'`     |
| `v5Line`            | `'hunger' \| 'desperation'` | `'desperation'` |
| `v5CriticalPairs`   | boolean                     | `true`          |
| `v5SpecialOutcomes` | boolean                     | `true`          |
| `v5Difficulty`      | integer 1–10 or `null`      | `null`          |

Each key also gets a `SETTINGS_METADATA` entry. Migration: stored settings are merged
over defaults (missing keys take defaults; unknown keys are dropped).

### Persisted panel state — new

| Key        | Type                                 | Default |
| ---------- | ------------------------------------ | ------- |
| `panelTab` | `'standard' \| 'dnd' \| 'wod' \| ''` | `''`    |

### RollOrigin — new

```text
RollOrigin =
  | { kind: 'sheet'; source: RollSource }                         // immediate roll from a stat
  | { kind: 'panel'; control: 'roll-button' | 'enter' | 'header' | 'history';
      tab: 'standard' | 'dnd' | 'wod' | '';
      wod?: { mode: 'classic' | 'v5'; line: 'hunger' | 'desperation'; difficulty: number | null };
      source?: RollSource }                                       // queued or shown character
RollSource = { systemId: string; definitionId: string }
```

The dice roller treats `systemId`/`definitionId` as opaque strings.

### RollReader — new (interface owned by dice_roller, implemented by an integration)

| Member      | Shape                                                   |
| ----------- | ------------------------------------------------------- |
| `prepare`   | `(notation, origin, settings) → { notation; context? }` |
| `interpret` | `(result, context) → RollReadingSummary \| undefined`   |

`context` is opaque to the dice roller and passed back unchanged. No reader registered
→ rolls behave exactly as today.

### RollReadingSummary — new (stored in history)

| Field        | Type               | Notes                               |
| ------------ | ------------------ | ----------------------------------- |
| `readingId`  | string             | e.g. `v5`                           |
| `line`       | string             | e.g. `desperation`                  |
| `lineLabel`  | message descriptor | "Desperation" / "Hunger"            |
| `difficulty` | number \| null     | successes needed, when known        |
| `outcomes`   | `RollOutcome[]`    | empty when nothing notable happened |

`RollOutcome`: `{ id; title: descriptor; detail?: descriptor; conditional: boolean }`.
Descriptors are the plain `{ id, message }` objects from generated `uiMessages`, safe to
persist.

## sheet_manager (systems)

### SystemPlugin — extended

| Field  | Type                           | Notes                                 |
| ------ | ------------------------------ | ------------------------------------- |
| `dice` | `SystemDiceRules \| undefined` | New. Absent → no dice button on stats |

### SystemDiceRules — new

| Member      | Shape                                                                                |
| ----------- | ------------------------------------------------------------------------------------ |
| `traitPool` | `(value, flags: { specialization; experienced; practiced }) → notation \| undefined` |
| `reading`   | `RollReadingRules \| undefined`                                                      |

### RollReadingRules — new

| Member      | Shape                                                                   |
| ----------- | ----------------------------------------------------------------------- |
| `id`        | string (`v5`)                                                           |
| `lines`     | `{ id; label: descriptor }[]` (`hunger`, `desperation`)                 |
| `lineFor`   | `(definitionId) → line id \| undefined` (hunter → `desperation`)        |
| `prepare`   | `(notation, { criticalPairs }) → notation` (adds `x2=10` at pool scope) |
| `interpret` | `(result, { line; outcomes; difficulty }) → RollOutcome[]`              |

### V5 outcome rules (interpret)

| Condition (special = labelled dice)                           | Line        | Outcome                                                         |
| ------------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| any special die shows 1                                       | Desperation | price of a 1: push through (Danger +1) or Despair               |
| a set (critical) contains a special 10, and the roll succeeds | Hunger      | messy critical                                                  |
| same, Difficulty unknown                                      | Hunger      | messy critical if the roll succeeds (conditional)               |
| roll fails and any special die shows 1                        | Hunger      | bestial failure                                                 |
| same, Difficulty unknown                                      | Hunger      | bestial failure if the roll misses the Difficulty (conditional) |
| `v5SpecialOutcomes` off                                       | any         | no outcomes (count and colour only)                             |

"Succeeds" = total ≥ Difficulty; with no Difficulty the conditional form is used.

## integrations

### Shown document — new (non-persisted store in `integrations/sheet-dice/`)

| Field    | Type                 | Lifecycle                                                  |
| -------- | -------------------- | ---------------------------------------------------------- |
| `source` | `RollSource \| null` | set by `SheetWorkspace` on mount/change, `null` on unmount |

### Session roll source — new key

`dice_roller_roll_source` in session storage: the `RollSource` of the last queued stat;
consumed by a roll and cleared with the character name.
