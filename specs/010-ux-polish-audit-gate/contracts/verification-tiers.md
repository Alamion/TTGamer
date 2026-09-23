# Contract: verification tiers after this change

| Command            | Contents                                                                                      | Required for                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `yarn verify:fast` | lint, typecheck, backlog validation, translation build check, i18n validation — **unchanged** | small code edits; pre-commit on feature branches                                |
| `yarn verify`      | `verify:fast` + **`yarn audit:dead-code`** + tests                                            | dice-logic, schema, store, and persistence edits; pre-commit on `main`/`master` |
| `yarn verify:full` | `verify` + production build                                                                   | config, dependency, route, generated-CSS, documentation-path edits              |

## Gate behavior

- The audit fails the run on any unused file, export, or dependency, and the failure
  output names the file and the symbol.
- The only exemption mechanism is `@knipignore` at the declaration with a stated reason
  (`tags: ["-knipignore"]` in `knip.json`). Broad ignore patterns are not added to
  silence a finding.
- A dependency is never removed to satisfy the gate without human review (carried over
  from the T-030 note).

## Documents that must agree

- `.specify/memory/constitution.md` — "Verification Workflow": the advisory-audit bullet
  is replaced by the Tier 2 gate; Sync Impact Report and a MINOR version bump.
- `AGENTS.md` — §3 command table and §10 Verification Scope.
- `CHANGELOG.md` — release entry.
- `TODO.md` — T-013, T-030, T-055, T-064 marked done.
