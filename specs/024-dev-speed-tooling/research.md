# Research: Development Speed — Process and Tooling

Measurements are from the maintainer machine (20 cores) on 2026-10-04 unless noted. The audit
findings behind the spec are summarized in [spec.md](spec.md#context).

## R1. Commit check

- **Decision**: husky `pre-commit` runs `lint-staged`: `eslint --cache --fix` and
  `prettier --write --cache` on staged code files, `prettier --write --cache` on staged markdown,
  JSON, YAML, and CSS. Staged `TODO.md`/`TOFIX.md` add `validate:backlog`; staged
  `translations/**` add the translation check (R9). No type check, no tests, no branch special
  case (the `master` → `verify:full` branch is removed).
- **Rationale**: ESLint and Prettier cost 52 s and 51 s on the whole tree today; with caches they
  take 4 s and 7 s warm, and on staged files about 1–3 s. Docs-only commits get formatting only.
- **Alternatives**: a whole-tree `verify:fast` with caches (still ~40 s with the type check);
  `nano-staged` or `simple-git-hooks` (husky already exists).

## R2. Type check

- **Decision**: `typecheck` becomes `tsc -b`. The root `tsconfig.json` references
  `tsconfig.app.json` (all of `src`), `tsconfig.node.json` (configs), and `tsconfig.test.json`
  (tests, scripts). Each project sets `incremental: true` and its own `tsBuildInfoFile` under
  `node_modules/.tmp/` (the test config currently inherits the app's file, so the two overwrite
  each other's cache).
- **Rationale**: plain `tsc` on the solution-style root checks 0 files; only the test project ran,
  covering 325 of 359 `src` files. Measured with separate build-info files: 47 s cold, 3.9 s warm,
  and the app project passes today (no hidden errors surfaced).
- **Alternatives**: three `tsc -p` calls (no incremental reuse across runs); pointing the test
  config at `src` too (one 50 s program, no caching).

## R3. Pre-push check

- **Decision**: husky `pre-push` runs `yarn typecheck` and `vitest related --run` on the source and
  test files changed between the upstream and `HEAD` (fallback: `origin/master`). A push with only
  docs, specs, or backlog changes runs the type check alone.
- **Rationale**: clarification 3; pushes go straight to `testing`/`master` and Vercel deploys
  `master`, so a minute-scale gate before the push catches most breakage.
- **Alternatives**: none (A) or full verify (C) — rejected in clarification.

## R4. Check commands and CI

- **Decision**: runner-independent scripts are the only entry points (contract:
  [contracts/check-commands.md](contracts/check-commands.md)). `verify:*` compose them for local
  use. A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request
  with one job per command, Node 20, the yarn cache, and caches for `.eslintcache`,
  `node_modules/.cache/prettier`, and `node_modules/.tmp`; the perf job is `continue-on-error`.
  Vercel keeps `yarn build` (its `prebuild` generates translations). A Jenkins pipeline later calls
  the same scripts; no Jenkins file is written now.
- **Rationale**: one owner per command; CI logic in YAML stays a thin list of script calls, so
  moving runners costs nothing.
- **Alternatives**: a single CI job (no per-check result); Vercel "wait for checks" (deferred,
  maintainer's choice).

## R5. Test groups

- **Decision**: Vitest `test.projects` with two projects. `unit` (default, everything except
  perf) and `perf` (`*.perf.test.{ts,tsx}`, `fileParallelism: false`). `yarn test` runs `unit`;
  `yarn test:perf` runs `perf`. The 1000-entry library test moves to a perf file (it has no
  timing assertion but is the heaviest render). Remaining wall-clock assertions in `unit` are
  removed or converted to same-run ratios.
- **Rationale**: timing tests failed only under full parallel load; clarification 2 makes them a
  local pre-merge gate and a non-blocking CI report.
- **Alternatives**: retries on the default run (hides real failures); a separate config file
  (two places to keep aliases in sync).

## R6. Large test files and helpers

- **Decision**: split `tests/sheet_manager/template-editor.test.tsx` (2177 lines, 82 tests, 124 s
  under load) along its `describe` groups into about six files, and `library-dialog.test.tsx`
  likewise. Add `renderEditor()` and `mountSheet()` to `tests/sheet_manager/helpers/` and replace
  the 12 per-file `mount` and 6 `openEditor` copies.
- **Rationale**: Vitest runs one file per worker, so the largest file bounds the wall time;
  target: no file above 25% of the default run.
- **Alternatives**: `test.sequence.concurrent` inside the file (shared jsdom state makes it
  unsafe).

## R7. Barrel imports

- **Decision**: delete `src/sheet_manager/components/index.ts` (11 importers) and
  `src/sheet_manager/hooks/index.ts`; importers use direct paths. An ESLint `no-restricted-imports`
  rule forbids importing a directory index inside `src/sheet_manager` except the declared public
  surfaces (`systems/index.ts`, `dice-logic/index.ts`, `integrations/*/index.ts`).
- **Rationale**: the chain `ArmorSection → components/index → LibraryDialog →
TemplateEditorDialog` and `hooks/index → useCharacter → systems/index` makes every element test
  import the editor, the library, and every system: 6–7 s per jsdom file against 0.17 s for a
  pure-logic file; import is 610–743 s of the summed run.
- **Alternatives**: lazy-loading dialogs (keeps the misleading barrel); narrowing the barrel
  (re-grows).

## R8. Lean spec-kit, project-local

- **Decision**: copy the spec-kit command skills into `.claude/skills/speckit-*` and change only
  those: specify (short template, no checklist file), plan (one `design.md`: decisions with
  rejected alternatives, changed types and data, test list, manual walk steps; principles at risk
  instead of the constitution table), tasks (no parallel or strategy sections; one commit per
  story), implement (reads spec, design, tasks; commits per story), analyze (only for 4+ stories
  or on request), clarify unchanged. Templates in `.specify/templates/` change to match
  (`design-template.md` replaces the plan template's phase outputs). Precedence: Claude Code lets a
  personal skill override a project skill of the same name, so `.claude/settings.json` sets
  `skillOverrides` to switch the personal `speckit-*` skills off for this repository; a test run
  (`claude -p` asking for a marker in the project skill's description) proves which version
  loads. Fallback if the setting hides both: project skills named `ttg-speckit-*`.
- **Rationale**: clarifications 1 and 5; personal skills stay untouched and other projects keep
  the stock behavior. `.opencode/commands` (an earlier opencode setup) is left as is.
- **Alternatives**: editing the personal skills (affects every project); templates only (the plan
  skill itself writes research, data-model, contracts, quickstart).

## R9. Translations and docs checks

- **Decision**:
    - Stop tracking `src/i18n/generated/` and `i18n/{en,ru}/code.json`. The 82 Docusaurus-owned keys
      move to tracked `translations/source/{en,ru}/docusaurus.json`, which the generator merges
      into `code.json`.
    - Generation runs in `prepare` (install), `prestart`, `prebuild`, `pretypecheck`, and `pretest`.
      It also runs first in every `ci:*` command that needs it. It stops running Prettier on its
      output (−12 s; the output is no longer reviewed).
    - One entry `scripts/i18n-check.ts` runs the four validators' rules in one process: sources and
      `systemRegistry` load once, and duplicated rules (key mirror, missing ru page, `code.json`
      parity) are kept once.
    - Mirrored doc roots are derived: every `docs/*` tree except `dev/` and draft pages.
    - A structural parity rule compares `{#id}` anchors, heading count, admonitions, and component
      tags between each en page and its ru mirror. It currently reports 0 mismatches.
- **Rationale**: generated churn is 26.3k lines against 11.6k lines of YAML since June, it causes
  merge conflicts, and the four checks take ~50 s.
- **Alternatives**: keep committing the generated files with faster generation (keeps the churn
  and conflicts); a `translatedFrom` hash in ru frontmatter (deferred; structure is enough now).

## R10. Release at merge

- **Decision**: a `yarn release <minor|patch>` script bumps `package.json` and prepends a
  `CHANGELOG.md` skeleton built from `feat`/`fix` subjects since the last version bump, for
  editing. Merge procedure (documented once in AGENTS.md):
    1. `verify:full` (including perf);
    2. `yarn release`;
    3. fast-forward `testing`;
    4. `git merge --no-ff` into `master`;
    5. push.

    Feature branches no longer bump the version; `check:version` still passes there because nothing
    changes.

- **Rationale**: FR-017; one entry per release instead of one per feature.
- **Alternatives**: changesets (overkill for one maintainer).

## R11. Guidance owners and skill split

- **Decision**:
    - One owner per rule. Verification and testing policy (tiers, flaky-test policy, merge
      procedure) live in `AGENTS.md` §11. Storybook coverage lives in constitution VI. Publisher
      notices live in constitution VIII. Bound document access lives in `src/sheet_manager/AGENTS.md`.
      Translations live in the `ui-i18n` skill. Every other mention becomes a one-line pointer.
    - The constitution drops the Sync Impact Report (history goes to git and CHANGELOG; version 1.6.0)
      and rewrites its Verification Workflow to match commit, push, and merge checks.
    - `coding-standards` merges into `typescript`.
    - The audit's stale statements are fixed.
    - `sheet-templates` becomes an index (≤ 300 lines: mental model, invariants, extension
      checklists, "load X when touching Y") plus `references/{editor,library,trackers,lists-tables,formulas-embeds}.md`.
      File lists, test maps, and test ids are dropped.
    - Prettier `overrides` set `proseWrap: "always"` for `.agents/**/*.md`, `**/AGENTS.md`, and
      `specs/**/*.md`, applied in one reformat commit. `specs/**/*.html` goes into `.prettierignore`.
- **Rationale**: FR-020–FR-024; each feature currently restates facts in up to six places.
- **Alternatives**: keep the 901-line skill and trim it (it re-grows; agents still load it whole).

## Measured baselines (for success criteria)

| Measure                     | Before                   | Target           |
| --------------------------- | ------------------------ | ---------------- |
| Commit check (small change) | 125 s (`verify:fast`)    | < 15 s           |
| Type-checked `src` files    | 325 / 359                | 359 / 359        |
| Type check warm             | 33 s (test program only) | ~4 s (all three) |
| Default test run            | 119–139 s                | ≤ 60 s           |
| Translation checks          | ~50 s (4 processes)      | < 20 s           |
| Files per new UI string     | 5                        | 2                |
| `sheet-templates` skill     | 901 lines                | index ≤ 300      |
