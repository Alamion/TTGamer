# Tasks: Development Speed — Process and Tooling

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[contracts/check-commands.md](contracts/check-commands.md), [quickstart.md](quickstart.md)

**Tests**: tooling is verified by the quickstart steps; unit tests are added where a script gains
logic (i18n check rules, release script, lint rule).

**Order** (plan "Delivery order"): US1 → US2 → US5 → US3 → US4. One commit per story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from spec.md

## Phase 1: Setup

- [x] T001 Add `.nvmrc` with `22` (the local Node major) so CI and local runs match; keep
      `engines.node` `>=20.0` in `package.json`
- [x] T002 Add `lint-staged` as a devDependency in `package.json` (`yarn add -D lint-staged`)

## Phase 2: Foundational

- [x] T003 Give each TypeScript project incremental build info: `incremental: true` and its own
      `tsBuildInfoFile` under `node_modules/.tmp/` in `tsconfig.app.json`, `tsconfig.node.json`,
      `tsconfig.test.json`; add `tsconfig.test.json` to the `references` of the root `tsconfig.json`
- [x] T004 Switch `typecheck` in `package.json` to `tsc -b`; confirm it fails on a deliberate error
      in `src/pages/index.tsx` (then revert) and a warm rerun takes seconds (research R2)

**Checkpoint**: `yarn typecheck` covers app, node, and test projects.

## Phase 3: User Story 1 — Commit checks and CI (P1) 🎯 MVP

**Goal**: commits check staged files in under 15 s, pushes run the type check and related tests,
everything else runs through `ci:*` commands on any runner.

**Independent Test**: quickstart steps 1, 2, 5, 6.

- [x] T005 [US1] Add the `ci:*` scripts and recompose `verify:fast`, `verify`, `verify:full` from
      them in `package.json` exactly as in `contracts/check-commands.md` (`ci:lint` uses
      `eslint --cache .` and `prettier --check --cache .`; `ci:test:perf` may temporarily alias the
      existing perf files until US2 adds the project)
- [x] T006 [US1] Add `.eslintcache` to `.gitignore`; confirm `node_modules/.cache/prettier` and
      `node_modules/.tmp/` are ignored via `node_modules`
- [x] T007 [US1] Configure `lint-staged` in `package.json`: `*.{ts,tsx,js,mjs,cjs}` →
      `eslint --cache --fix` + `prettier --write --cache`; `*.{md,mdx,json,yaml,yml,css,scss}` →
      `prettier --write --cache`; `{TODO,TOFIX}.md` and `**/{TODO,TOFIX}.md` →
      `yarn -s validate:backlog`; `translations/**` → the translation check (until US5:
      `node --import tsx scripts/build-translations.ts --check`)
- [x] T008 [US1] Rewrite `.husky/pre-commit` to run `npx lint-staged` only (drop the
      master/`verify:full` branch)
- [x] T009 [US1] Add `.husky/pre-push`: compute changed files against the upstream
      (`git rev-parse --abbrev-ref @{push}` fallback `origin/master`), run `yarn -s typecheck`, then
      `yarn -s vitest related --run --project unit` on changed `src/`/`tests/` files when any; skip
      tests for docs/spec/backlog-only pushes
- [x] T010 [US1] Add `.github/workflows/ci.yml`: on push and pull_request; Node from
      `node-version-file: .nvmrc` with yarn cache; `yarn install --frozen-lockfile`; jobs `lint`,
      `typecheck`, `test`, `deadcode`, `validate`, `build`, `perf` (`continue-on-error: true`), each
      calling one `ci:*` script; cache `.eslintcache`, `node_modules/.cache/prettier`,
      `node_modules/.tmp`
- [x] T011 [US1] Make `prepare` safe on runners without git hooks (husky 9 no-op when `.git` is
      missing or `HUSKY=0`); verify `yarn install` succeeds in a temporary copy without `.git`
- [x] T012 [US1] Measure quickstart step 1 (five commits, median) and step 5 (pre-push), record in
      research.md § Implementation results
- [x] T013 [US1] Run `yarn verify:full` (constitution Tier 3 still applies until T043: config and
      dependency changes), then commit US1
      (`chore(tooling): staged commit check, pre-push, ci:* commands, GitHub Actions (spec 024, US1)`)

**Checkpoint**: commits take seconds; CI workflow exists (it runs on the first push).

## Phase 4: User Story 2 — Fast, stable tests (P1)

**Goal**: default run ≤ 60 s with no wall-clock assertions; timing tests in a sequential `perf`
project; element tests no longer import the editor and library.

**Independent Test**: quickstart steps 3 and 4.

- [x] T014 [US2] Define Vitest `test.projects` in `vitest.config.ts`: `unit` (all tests except
      `**/*.perf.test.{ts,tsx}`) and `perf` (`**/*.perf.test.{ts,tsx}`, `fileParallelism: false`),
      sharing aliases and setup; `test` → `vitest run --project unit`, `test:perf` →
      `vitest run --project perf`; point `ci:test`/`ci:test:perf` at them in `package.json`
- [x] T015 [US2] Move the "renders a 1000-entry catalog" case from
      `tests/sheet_manager/library-dialog.test.tsx` into
      `tests/sheet_manager/library-dialog.perf.test.tsx` (drop its local 90 s timeout comment once
      in the sequential project)
- [x] T016 [US2] Find wall-clock assertions outside perf files
      (`grep -rn "performance.now\|Date.now" tests`); move each timing case into a `*.perf.test.tsx`
      file or convert it to a same-run ratio
- [x] T017 [US2] Delete `src/sheet_manager/components/index.ts` and
      `src/sheet_manager/hooks/index.ts`; rewrite their importers to direct paths
      (`ArmorSection.tsx`, `ImplantsSection.tsx`, `bodyEquipmentCatalogs.ts`, `SectionCard.tsx`,
      `CollapsibleBlock.tsx`, `useBodyHandlers.ts`, and every other importer found by grep in `src/`
      and `tests/`)
- [x] T018 [US2] Add an ESLint `no-restricted-imports` rule in `eslint.config.mjs` forbidding
      directory-index imports inside `src/sheet_manager` (patterns for `**/components`, `**/hooks`,
      and `index` paths), allowing `systems/index.ts`; confirm `yarn ci:lint` passes and a
      reintroduced barrel import fails
- [x] T019 [US2] Add `renderEditor(template, options?)` and `mountSheet(...)` helpers in
      `tests/sheet_manager/helpers/editor.ts` and `tests/sheet_manager/helpers/sheet.ts`; replace
      the per-file `mount`/`openEditor` copies in `tests/sheet_manager/*.test.tsx`
- [x] T020 [US2] Split `tests/sheet_manager/template-editor.test.tsx` along its top-level `describe`
      groups into `tests/sheet_manager/template-editor.<area>.test.tsx` files (about six) without
      changing assertions; test count before and after must match
- [x] T021 [US2] Split the remaining `tests/sheet_manager/library-dialog.test.tsx` along its
      `describe` groups into `library-dialog.<area>.test.tsx` files; test count unchanged
- [x] T022 [US2] Check the per-file durations of the default run (`--reporter=json`); split any file
      above 25% of the run's wall time; record the slowest three in research.md
- [x] T023 [US2] Run `yarn test` five times and `yarn test:perf` five times; record wall times and
      failures in research.md § Implementation results (SC-003, SC-004)
- [x] T024 [US2] Run `yarn verify:full` (Tier 3: Vitest and ESLint config changed), then commit US2
      (`test: unit/perf projects, split editor and library suites, no barrel imports (spec 024, US2)`)

**Checkpoint**: default run ≤ 60 s, five green runs.

## Phase 5: User Story 5 — Translations and docs checks (P3, before guidance)

**Goal**: two tracked files per UI string; one i18n check under 20 s; derived mirrored roots;
structural parity.

**Independent Test**: quickstart step 9.

- [x] T025 [US5] Extract the Docusaurus-owned (non-`ttgamer.*`) keys of `i18n/{en,ru}/code.json`
      into `translations/source/{en,ru}/docusaurus.json`; make `scripts/translation-build.ts` merge
      them into the generated `code.json`, and stop formatting generated output with Prettier
- [x] T026 [US5] Untrack generated files: add `src/i18n/generated/` and `i18n/*/code.json` to
      `.gitignore`, `git rm --cached` them; add generation to `prepare`, `pretypecheck`, `pretest`
      (keep `prestart`, `prebuild`) in `package.json`; `ci:typecheck`/`ci:test` call
      `yarn typecheck`/`yarn test` so the pre-scripts generate once; update knip and ESLint ignores
      if they reference the files
- [x] T027 [US5] Verify a clean clone works: `git clone` the branch into a temp dir, `yarn install`,
      then `yarn typecheck`, `yarn test --passWithNoTests -t nothing`, and `yarn build` succeed with
      no manual step (stands in for Vercel/Jenkins)
- [x] T028 [US5] Make `scripts/docs-source.ts` derive the mirrored roots from `docs/*` (excluding
      `dev/` and draft pages) instead of `DOCUMENT_ROOTS`; keep the existing results
- [x] T029 [US5] Create `scripts/i18n-check.ts` running the rules of `validate-i18n.ts`,
      `validate-translations.ts`, and `verify-i18n.ts` in one process (sources and `systemRegistry`
      loaded once; the en↔ru key mirror, missing ru page, and `code.json` parity checks kept once);
      keep messages; point `validate:i18n` and `ci:validate` at it and delete the superseded entry
      scripts (keep their modules if the check imports them)
- [x] T030 [US5] Add the structural parity rule (heading `{#id}` anchors, heading count,
      admonitions, component tags per en page vs ru mirror) in the i18n verifier, with unit tests in
      `tests/scripts/` for a matching and a mismatching page pair
- [x] T031 [US5] Time `yarn validate:i18n` (target < 20 s) and add a UI string to both YAML files to
      confirm two changed tracked files; record in research.md
- [x] T032 [US5] Update the lint-staged translation entry (T007) to the new check; run
      `yarn verify:full` (Tier 3: build scripts and ignores changed); commit US5
      (`chore(i18n): untracked generated translations, one i18n check, structural docs parity (spec 024, US5)`)

## Phase 6: User Story 3 — Lean, project-local spec-kit (P2)

**Goal**: short spec, one design note, per-story commits, release at merge, from spec 025 on.

**Independent Test**: quickstart step 7; one backlog item through the small change path.

- [x] T033 [US3] Copy the personal spec-kit skills (`~/.claude/skills/speckit-*`) into
      `.claude/skills/speckit-*/SKILL.md` unchanged, add a version marker line to each description,
      commit nothing yet
- [x] T034 [US3] Add `.claude/settings.json` `skillOverrides` turning the personal `speckit-*`
      skills off for this repository; test in a fresh `claude -p` session in the repo which
      description (marker) is visible; if the setting hides both versions, rename the project skills
      to `ttg-speckit-*` instead and remove the setting (research R8); record the result in
      research.md
- [x] T035 [US3] Shorten `.specify/templates/spec-template.md` (stories, requirements, success
      criteria, non-obvious edge cases, assumptions; no checklist) and edit
      `.claude/skills/speckit-specify/SKILL.md` to stop creating `checklists/requirements.md`
- [x] T036 [US3] Add `.specify/templates/design-template.md` (decisions with rejected alternatives,
      changed types/data, test list, manual walk steps, principles at risk; ≤ 150 lines) and edit
      `.claude/skills/speckit-plan/SKILL.md` to produce only `design.md` (no research, data-model,
      contracts, quickstart, plan)
- [x] T037 [US3] Trim `.specify/templates/tasks-template.md` (no parallel examples, no delivery
      strategy; one commit per story) and edit `.claude/skills/speckit-tasks/SKILL.md` and
      `.claude/skills/speckit-implement/SKILL.md` to read spec/design/tasks and commit per story
- [x] T038 [US3] Edit `.claude/skills/speckit-analyze/SKILL.md` to run only for specs with four or
      more stories unless asked; keep `speckit-clarify` unchanged
- [x] T039 [US3] Add `scripts/release.ts` and `release` in `package.json`: bump `package.json`
      (`minor`/`patch`), prepend a `CHANGELOG.md` skeleton from `feat`/`fix` subjects since the last
      version bump; unit test in `tests/scripts/release.test.ts` with a fake git log
- [x] T040 [US3] Write the flaky-test policy (FR-011: quarantine to the `perf` project or fix within
      a day with a TOFIX entry; no timeout-only fixes) in `AGENTS.md` §11, and document the small
      change path (trigger, steps, escalation; clarification 4) and the merge procedure
      (`verify:full` → `yarn release` → fast-forward `testing` → `merge --no-ff` → push) in
      `AGENTS.md` (new §12 "Workflow"); add `prototypes` guidance (unknown layout only, outside
      `specs/`)
- [x] T041 [US3] Commit US3
      (`chore(process): project-local lean spec-kit, release script, small change path (spec 024, US3)`)

## Phase 7: User Story 4 — Guidance with one owner per rule (P2, last)

**Goal**: one owner per rule, no stale statements, a ≤ 300-line template skill index, automatic
wrapping of agent-facing markdown.

**Independent Test**: quickstart step 8.

- [x] T042 [US4] Add Prettier `overrides` (`proseWrap: "always"`) for `.agents/**/*.md`,
      `**/AGENTS.md`, `specs/**/*.md` in `.prettierrc`, and `specs/**/*.html` to `.prettierignore`;
      reformat those files in a separate commit (`style: wrap agent-facing markdown`)
- [x] T043 [US4] Amend `.specify/memory/constitution.md` under the current procedure one last time
      (amendment summary — principles touched, rationale, version 1.5.0 → 1.6.0 — in the commit
      message and the CHANGELOG entry), then: remove the Sync Impact Report, rewrite the amendment
      procedure to record history in git and CHANGELOG, rewrite Verification Workflow around
      commit/push/merge checks and `ci:*` commands, point Governance amendment history to git and
      CHANGELOG, bump to 1.6.0
- [x] T044 [US4] Make each cross-cutting rule single-owner (owners per research R11) across
      `AGENTS.md`, `src/sheet_manager/AGENTS.md`, `src/dice_roller/AGENTS.md`,
      `.agents/skills/*/SKILL.md`, replacing restatements with one-line pointers
- [x] T045 [US4] Fix the audit's stale statements: `useCharacter` → `useBoundDocument`
      (`.agents/skills/typescript/SKILL.md`); `verify*` descriptions (`AGENTS.md` §3, skills);
      `docs/wod` and missing doc trees (`AGENTS.md` §6); store `version: 3` → 4 and registered
      plugins (`.agents/skills/sheet-manager/SKILL.md`); Testing tier in
      `src/sheet_manager/AGENTS.md`; merge `.agents/skills/coding-standards` into
      `.agents/skills/typescript` and list skills correctly in `AGENTS.md` §7
- [x] T046 [US4] Split `.agents/skills/sheet-templates/SKILL.md` into an index (≤ 300 lines: mental
      model, invariants, extension checklists, "load X when touching Y") and
      `.agents/skills/sheet-templates/references/{editor,library,trackers,lists-tables,formulas-embeds}.md`;
      drop file lists, the tests map, and test ids
- [x] T047 [US4] Retire `src/sheet_manager/TODO.md` into the root `TODO.md` (or delete if fully
      superseded) and run `yarn validate:backlog`
- [x] T048 [US4] Commit US4
      (`docs(guidance): one owner per rule, constitution 1.6.0, sheet-templates index (spec 024, US4)`)

## Phase 8: Polish

- [x] T049 Update `TODO.md` (spec 024 entry, T-033/T-088 noted as spec 026, and a note on the spec
      025 entry to measure SC-006/SC-007 of spec 024 there) and run quickstart steps 1–9; record
      results in research.md § Implementation results
- [x] T050 Run `yarn verify:full`; push the branch; confirm GitHub Actions results (SC-005) and a
      Vercel preview build; record
- [x] T051 Commit polish (`docs: spec 024 results`); merge with the new procedure
      (`yarn release minor`, fast-forward `testing`, `merge --no-ff` into `master`, push) only when
      the maintainer says so

## Dependencies

- Phase 2 (T003–T004) before US1 (T005 uses `tsc -b`).
- US1 before all others (hooks and commands are used by every later commit).
- US2 independent of US5/US3; US5 before US4 (guidance documents final commands); US3 before US4
  (guidance documents the new process).
- Within US5: T025 → T026 → T027; T028–T030 independent of T025–T027.

## Parallel opportunities

- T006/T007 alongside T005 (different files); T019 alongside T017–T018; T028 and T030 alongside
  T025–T027; T035–T038 touch different skills and templates.

## Implementation strategy

MVP = Phase 2 + US1: the per-commit cost drops immediately. Then US2 (test speed), US5, US3, and
US4; each story is committed and verified on its own.
