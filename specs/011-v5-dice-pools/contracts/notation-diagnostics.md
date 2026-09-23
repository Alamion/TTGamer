# Contract: notation diagnostics

## Public API (`dice_roller/dice-logic/index.ts`)

| Export                                    | Change                                                        |
| ----------------------------------------- | ------------------------------------------------------------- |
| `validateNotation`                        | Unchanged signature: `(notation) → boolean`                   |
| `diagnoseNotation`                        | New: `(notation) → NotationDiagnostic \| null` (null = valid) |
| `NotationDiagnostic`, `NotationErrorKind` | New type exports                                              |

`rollDices` still throws on invalid input; the thrown error is a `NotationError` with a
`diagnostic` field.

## Kinds

| `kind`                   | When                                                                    | Span                                                                   | Extra                  |
| ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------- |
| `unknown-character`      | lexer cannot match                                                      | the first unmatched character                                          | `found`                |
| `unexpected-token`       | a token where another was required                                      | that token                                                             | `found`, `expected`    |
| `unexpected-end`         | input ends early                                                        | `offset = length`, length 0                                            | `expected`             |
| `missing-compare-value`  | a comparison operator without a number                                  | the operator                                                           | `expected: ['number']` |
| `unclosed-group`         | `(` without `)`                                                         | the `(`                                                                |                        |
| `trailing-input`         | tokens after a complete expression                                      | first trailing token                                                   | `found`                |
| `label-position`         | `:h` not directly after a dice token                                    | the `:h`                                                               |                        |
| `set-bonus-needs-target` | `x…` without a success target in scope                                  | the `x…` modifier                                                      |                        |
| `forced-values-count`    | `@` values count ≠ dice count                                           | the `@…` list                                                          | `limit.max = count`    |
| `invalid-set-size`       | set size N < 2 or bonus K < 1                                           | the `x…` modifier                                                      |                        |
| `limit-exceeded`         | notation length, AST size, number size, dice count, sides, custom faces | the offending token, or the whole input for notation length / AST size | `limit: { name, max }` |

`LimitName`: `notation-length`, `ast-nodes`, `numeric-literal`, `dice-count`,
`dice-sides`, `custom-faces`.

Positions are 0-based UTF-16 offsets into the input string as given.

## UI behaviour (`NotationInput`)

- After the existing 300 ms debounce, an invalid notation shows the translated message
  for its `kind` (`dice.pool.notation.errors.<kind>`, with `{found}`, `{expected}`,
  `{max}` placeholders) instead of the generic "Invalid notation".
- The offending span is highlighted in an overlay aligned with the input text; the input
  gets `aria-invalid` and `aria-describedby` pointing at the message.
- The message sits in a polite live region that updates only when the diagnostic changes,
  so it is announced once, not on every keystroke.
- Both locales carry every message (`yarn i18n:verify`).
