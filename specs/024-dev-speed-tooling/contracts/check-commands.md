# Contract: Check commands

The project scripts below are the only entry points any runner calls (local hooks, GitHub Actions,
Vercel, a future Jenkins pipeline). Runners never inline tool flags; a change to a check happens
in `package.json` (or the script it calls) once.

| Command             | Runs                                                             | Blocking in CI |
| ------------------- | ---------------------------------------------------------------- | -------------- |
| `yarn ci:lint`      | `eslint --cache .` and `prettier --check --cache .`              | yes            |
| `yarn ci:typecheck` | translation generation, then `tsc -b` (app, node, test projects) | yes            |
| `yarn ci:test`      | translation generation, then the `unit` Vitest project           | yes            |
| `yarn ci:test:perf` | the `perf` Vitest project, files one at a time                   | no (reported)  |
| `yarn ci:deadcode`  | knip                                                             | yes            |
| `yarn ci:validate`  | backlog, data, the single i18n check, version check              | yes            |
| `yarn ci:build`     | `yarn build` (its `prebuild` generates styles and translations)  | yes            |

Local compositions (documented in `AGENTS.md` §3 and §11):

| Command            | Composition                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| `yarn verify:fast` | `ci:lint`, `ci:typecheck`, `ci:validate`                                     |
| `yarn verify`      | `verify:fast`, `ci:deadcode`, `ci:test`                                      |
| `yarn verify:full` | `verify`, `ci:test:perf`, `ci:build` — required before merging into `master` |

Hooks:

| Hook         | Runs                                                                                    |
| ------------ | --------------------------------------------------------------------------------------- |
| `pre-commit` | `lint-staged` (staged files only; backlog and translation checks when those are staged) |
| `pre-push`   | `yarn typecheck` and `vitest related --run` on files changed since the upstream         |

Exit codes: 0 on success, non-zero on any finding; each command prints which check failed.
Caches live in `.eslintcache`, `node_modules/.cache/prettier`, and `node_modules/.tmp/`;
runners may persist them between runs, and a missing cache only costs time.
