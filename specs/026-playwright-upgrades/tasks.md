# Tasks: Browser smoke tests and the first dependency upgrades

**Input**: [spec.md](spec.md), [design.md](design.md)

Upgrade stories make one commit per package major (FR-007, D10), not one per story; an import
re-sort is its own commit. Every upgrade commit passes `yarn verify:full`, which runs the browser
tests from US1 on.

## Foundation

- [ ] T001 Record the baselines in design.md "Results":
    - the unit run, best of three (`yarn test`);
    - the sheet page's JS and CSS bytes from `build/assets` after `yarn build` (the files
      `build/universal_sheet/index.html` loads);
    - the current versions.

## User Story 1 - The built site is checked in a real browser (P1)

**Check**: a thrown error in the sheet page makes `yarn ci:e2e` fail with the route named and a
screenshot and trace kept (SC-001).

- [ ] T002 [US1] Set up Playwright:
    - add `@playwright/test` as a dev dependency;
    - add the scripts `test:e2e` (`playwright test`), `e2e:install` (`playwright install chromium`),
      and `ci:e2e` (`yarn ci:build && yarn test:e2e`) in `package.json`;
    - change `verify:full` to `yarn verify && yarn ci:test:perf && yarn ci:e2e`;
    - ignore `playwright-report/` and `test-results/` in `.gitignore` and in `.prettierignore` if
      needed.
- [ ] T003 [US1] Write `playwright.config.ts` (D2, D5, D7):
    - fail at once with "run `yarn build` first" when `build/` is missing;
    - `webServer` is `docusaurus serve --port 3100 --no-open` with `reuseExistingServer: false`;
    - `baseURL` is `http://localhost:3100`, Chromium only;
    - `retries: 0`, `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`;
    - an HTML reporter that never opens, plus `list`;
    - projects `smoke` (`tests-e2e/smoke`) and `timings` (`tests-e2e/timings`);
    - every test starts with an empty storage state.
- [ ] T004 [US1] Write `tests-e2e/fixtures.ts`. It extends `test` with a page that records
      `pageerror` events and failed same-origin requests (status ≥ 400 or request failed) and fails
      the test after its body if any were recorded (FR-004).
- [ ] T005 [US1] Make the new folder part of every tool:
    - a `tsconfig` project for `tests-e2e/` and `playwright.config.ts`, referenced from the root so
      `tsc -b` checks it;
    - the test globs in `eslint.config` cover `tests-e2e/`;
    - `knip.json` entries for `playwright.config.ts` and `tests-e2e/**`;
    - `yarn verify:fast` and `yarn ci:deadcode` pass.
- [ ] T006 [US1] Write `tests-e2e/smoke/site.spec.ts`. The homepage, an English docs page, and its
      `/ru/` mirror load, show their main heading, and load their stylesheet.
- [ ] T007 [US1] Write `tests-e2e/smoke/sheet.spec.ts`. From an empty profile on `/universal_sheet`,
      create a character, change its name, reload, and the name is still there (IndexedDB
      persistence).
- [ ] T008 [US1] Write `tests-e2e/smoke/dice.spec.ts`. With the keyboard only, focus the dice input,
      type a pool, press Enter, and a result appears in the history.
- [ ] T009 [US1] Write `tests-e2e/smoke/editor.spec.ts`. Open the shipped sheet in the template
      editor, select an element in the outline, press Alt+↓, and the outline order changes; undo
      restores it.
- [ ] T010 [US1] Write `tests-e2e/smoke/catalog.spec.ts`. On a catalog docs page, sort a column and
      type a filter, and the visible rows change accordingly.
- [ ] T011 [US1] Write `tests-e2e/timings/editor.spec.ts` and `tests-e2e/timings/sheet.spec.ts` (D7,
      FR-011):
    - an edit on the shipped full sheet: from the input event to the next frame, budget 100 ms;
    - the move preview: from the dwell to the preview frame, budget 100 ms;
    - opening the sheet: from navigation to its first interactive control, no budget yet (this first
      measurement becomes the baseline).

    Each is the best of 5 warm runs, attached as an annotation, printed next to its budget, and
    written to `test-results/timings.json`; none is asserted.

- [ ] T012 [US1] Add an `e2e` job to `.github/workflows/ci.yml` (D9). It installs Chromium with
      `npx playwright install --with-deps chromium`, runs `yarn ci:e2e` as a blocking step, and
      uploads `playwright-report/` and `test-results/` when it fails.
- [ ] T013 [US1] Prove SC-001 locally and record the results in design.md:
    - a thrown error in the sheet page fails `sheet.spec`;
    - a deleted built CSS asset fails `site.spec`;
    - a broken docs link target fails `site.spec`.

    Revert each break. Also time `yarn ci:e2e` (SC-002) and confirm that the dev server on 3000 is
    untouched.

- [ ] T014 [US1] Run `yarn verify:full` and commit the story,
      `test(e2e): browser smoke tests and timings on the built site (spec 026, US1)`.

## User Story 2 - Small majors land without notice (P2)

**Check**: `yarn verify:full` passes after each commit; knip reports no findings.

- [ ] T015 [US2] Upgrade the in-range minors (Radix context menu, dialog, and popover; eslint;
      typescript-eslint; postcss; @types/node within 24) in `package.json` and `yarn.lock`, then run
      `yarn verify:full` and commit.
- [ ] T016 [US2] Upgrade knip to 6 in `package.json`. Fix any new finding, or exempt it with
      `@knipignore` and a reason at its declaration. Adjust `knip.json` to the new schema if needed.
      Run `yarn verify:full` and commit.
- [ ] T017 [US2] Upgrade eslint-plugin-simple-import-sort to 14 in `package.json`:
    - commit the version change with any config change;
    - run `yarn lint:fix` and commit the re-sort alone, as
      `style: re-sort imports (simple-import-sort 14)`;
    - run `yarn verify:full`.
- [ ] T018 [US2] Upgrade `three` and `@types/three` to 0.186 in `package.json` and fix the type or
      API changes in `src/dice_roller/`. The display-condition dice tests
      (`tests/dice_roller/renderer/`) must pass unchanged. Run `yarn verify:full` and commit.

## User Story 3 - A faster test runner (P2)

**Check**: the same test count passes; the unit run (best of three) is compared with the T001
baseline (SC-003).

- [ ] T019 [US3] Pin Node (D12): set `.nvmrc` to `22.22` and `engines.node` to `>=22.22.2` in
      `package.json`. Commit with T020.
- [ ] T020 [US3] Upgrade `vitest` and `@vitest/coverage-v8` to 5 in `package.json` and adapt
      `vitest.config.ts` to the changed options:
    - the projects, pool, and per-file `vi.setConfig` must work;
    - `yarn test`, `yarn test:perf`, and `yarn test:coverage` must pass;
    - run `yarn verify:full` and commit.
- [ ] T021 [US3] Upgrade `jsdom` to 30 in `package.json`, fix any test failures in the code or the
      test setup without weakening an assertion, run `yarn verify:full`, and commit.
- [ ] T022 [US3] Add `happy-dom` as a dev dependency. With a scratchpad script (not committed), run
      each `@vitest-environment jsdom` test file under happy-dom alone, three times, and list the
      files that pass every time without changes.
- [ ] T023 [US3] Switch the passing files to `// @vitest-environment happy-dom`. Run `yarn test`
      twice; move back any file that fails. List the files kept on jsdom, with their reasons grouped
      (focus, pointer events, layout, clipboard, other), in design.md "Results" (FR-009).
- [ ] T024 [US3] Measure the unit run (best of three) against the T001 baseline. If it is over 60 s,
      record the remaining cost and its cause in design.md (SC-003). Run `yarn verify:full` and
      commit, `test: lighter DOM for the tests that allow it (spec 026, US3)`.

## User Story 4 - Icons and tables unchanged after their upgrades (P3)

**Check**: the catalog smoke test passes; `tsc` finds no missing icon export; the manual icon
look-over shows no change.

- [ ] T025 [US4] Upgrade `lucide-react` to 1 in `package.json`. Rename the icons that
      `yarn     typecheck` reports missing, choosing the same glyphs, across `src/`. Run
      `yarn verify:full` and commit.
- [ ] T026 [US4] Upgrade `@tanstack/react-table` to 9 in `package.json` and migrate
      `src/shared/components/DataCatalog.tsx` and the `ColumnDef` / `ColumnMeta` / `Row` imports in
      the catalog configs under `src/data/`. If the change outside `DataCatalog.tsx` exceeds ~300
      lines, revert it and add a T-088 note instead (D13).
- [ ] T027 [US4] Run the catalog tests (`tests/` covering `DataCatalog`) and `catalog.spec.ts`, then
      `yarn verify:full`, and commit.

## Finish

- [ ] T028 Update the guidance:
    - root `AGENTS.md`:
        - §2: Playwright, Vitest 5, jsdom/happy-dom;
        - §3: `test:e2e`, `e2e:install`, `ci:e2e`;
        - §6: the `tests-e2e/` folder;
        - §11: `ci:e2e` among the checks, `verify:full` composition, timings non-blocking, the
          happy-dom rule;
    - the `typescript` or `sheet-templates` skill only where it names a changed version or test
      environment.

    The user guide is not affected (no visible change).

- [ ] T029 Update `TODO.md`:
    - T-033 done, with a note;
    - T-088: the remaining Zod 4, TypeScript 7, and Tailwind 4, and any deferral from T026 or a
      blocked upgrade.

    Run `yarn validate:backlog`.

- [ ] T030 Record the sheet page's JS and CSS bytes after the upgrades and compare them with T001
      (SC-004). Confirm that every dependency except Zod, TypeScript, and Tailwind is on its current
      major with `yarn outdated` (SC-005). Note the timings report from a full run (SC-006).
- [ ] T031 Run `yarn verify:full`, walk design.md "Manual walk", record the results in design.md,
      and commit, `docs: guidance, backlog, and results for browser tests and upgrades (spec 026)`.

## Coverage

| Requirement | Tasks                                  |
| ----------- | -------------------------------------- |
| FR-001      | T002, T003, T012                       |
| FR-002      | T003                                   |
| FR-003      | T006–T010                              |
| FR-004      | T004, T013                             |
| FR-005      | T003, T012                             |
| FR-006      | T002 (`verify:full`), T012             |
| FR-007      | T015–T027 (one commit per major), T017 |
| FR-008      | phase order US2 → US3 → US4            |
| FR-009      | T022, T023                             |
| FR-010      | T026, T029                             |
| FR-011      | T011                                   |
| FR-012      | T028                                   |
| SC-001      | T013                                   |
| SC-002      | T013                                   |
| SC-003      | T001, T024                             |
| SC-004      | T001, T030                             |
| SC-005      | T030                                   |
| SC-006      | T011, T030                             |
