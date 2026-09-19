# Contract: Translation Coverage Verifier

## Commands

| Command                                                                   | Behavior                                                                                              |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `yarn build:translations`                                                 | unchanged: regenerates `code.json`, `uiMessages.ts`, `catalogTranslations.ts`, and now `bookTerms.ts` |
| `yarn build:translations --check`                                         | **new**: exits 1 and lists files if any generated output would change; writes nothing                 |
| `yarn validate:i18n`                                                      | existing docs parity + existing mirror validation + `verify-i18n.ts`                                  |
| `yarn i18n:verify [--area interface,catalog,docs] [--rule <id>] [--json]` | **new**: runs only the verifier; `--json` prints findings as JSON for tooling                         |
| `yarn i18n:status`                                                        | per-locale counts (existing) + per-area coverage table from the verifier                              |
| `yarn verify:fast`                                                        | `lint && typecheck && validate:backlog && build:translations --check && validate:i18n`                |

## Rules

| Rule id      | Area               | Detects                                                                                             | FR                              |
| ------------ | ------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------- |
| `interface`  | interface          | user-facing Latin literals in code positions from research D2                                       | FR-001, FR-002, FR-006a, FR-007 |
| `keys`       | interface          | `translate`/`<Translate id>`/`uiMessages.*` references missing in a locale; keys in one locale only | FR-006b, FR-006c                |
| `unused`     | interface          | source keys never referenced (warning only)                                                         | FR-009                          |
| `identical`  | interface, catalog | ru value equal to en value                                                                          | FR-006d                         |
| `plural`     | interface          | plural form counts; `(s)` in English messages                                                       | FR-004                          |
| `catalog`    | catalog            | missing ru fields, array length mismatch, missing `_labels`, unknown ids                            | FR-006e, FR-024                 |
| `pickers`    | interface          | catalog option lists built without `pickLabel`; search without `normalizeSearchText`                | FR-006h, FR-013, FR-014         |
| `docs`       | docs               | missing ru page (existing check), English prose lines in ru pages and frontmatter                   | FR-006f, FR-006g                |
| `docs-terms` | docs               | first mention of a glossary term on a ru page not in "ru (en)" form                                 | FR-020                          |
| `glossary`   | catalog            | unresolved refs, duplicate refs, ru text at a ref ≠ glossary `ru`, `en` mismatch                    | FR-006i, FR-025                 |
| `overflow`   | interface          | glossary term whose `ru` exceeds a row-kind budget without `ruShort`                                | FR-023                          |
| `exceptions` | all                | exception without `reason` (error); exception matching nothing (warning)                            | FR-008                          |

The `pickers` rule is structural: any call that builds `{ name|label }` option objects from a
registered catalog's entries inside `src/sheet_manager/**` must go through `pickLabel`
(or `entryLabel` in the English-only branch), and any `.filter` over such options must call
`normalizeSearchText`.

## Output

Human format, grouped by area then rule, one line per finding:

```text
interface  error  src/dice_roller/components/DiceRollerSettingsModal.tsx:42  JSX text "Sound volume"
catalog    error  merits-flaws/ace-pilot.name  missing ru value
docs       warn   ru/star-wars-wod-2e/combat/index.mdx:18  first mention of "Уклонение" without "(Dodge)"

Area        covered  missing  excepted
interface      812        0        14
catalog       1420       37         3
docs            71        0         0
```

Exit codes: 0 — no error-level findings in gated areas; 1 — at least one; 2 — the verifier itself
failed (unparseable YAML, missing file).

## Configuration

`scripts/i18n-verifier/config.ts`: per-area level (`report` | `error`), user-facing prop list,
sink list, scanned globs, overflow budgets per row kind. Changing a level from `error` back to
`report` requires a note in the PR description.

## Performance

A full scan of `src/`, `translations/`, and both docs trees finishes in under 30 s on a
contributor machine (SC-008): one `ts.createSourceFile` per file, no type checker.
