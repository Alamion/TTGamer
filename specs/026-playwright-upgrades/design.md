# Design: Browser smoke tests and the first dependency upgrades

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-07

## Approach

Playwright comes first, as a dev dependency with its own config and a `tests-e2e/` folder outside
Vitest's `tests/**` glob. It serves the production build on its own port and walks the routes in
Chromium. A second Playwright project records browser timings and never fails. One script, `ci:e2e`,
builds and runs both, so `verify:full` and a new CI job call the same thing.

Then the upgrades run in spec order, one commit each, with `yarn verify:full` (now including the
browser tests) after each:

1. US2: the small majors.
2. US3: Vitest 5, coverage, jsdom 30, then happy-dom file by file.
3. US4: lucide-react 1 and @tanstack/react-table 9.

Current versions (2026-10-07):

- Vitest 4.1.11, jsdom 26.1.0, knip 5.88.1, simple-import-sort 12.1.1, three 0.184.
- lucide-react 0.468 (54 importing files).
- @tanstack/react-table 8.21.3: one table instance in `src/shared/components/DataCatalog.tsx`, plus
  `ColumnDef` types in 14 catalog configs.

## Decisions

- **D1 — Where the browser tests live**: `playwright.config.ts` and `tests-e2e/` (`smoke/`,
  `timings/`, `fixtures.ts`). _Why_: Vitest's `tests/**/*.test.*` glob would otherwise pick them up,
  and their runner is different. _Rejected_: the Vitest browser mode, which runs component tests in
  a browser but not the built site, routes, or persistence.
- **D2 — Against the build**: the Playwright `webServer` runs
  `docusaurus serve --port 3100 --no-open` on `build/` and reuses nothing. _Why_: the dev server on
  3000 is often running and must not be touched (spec edge case); the build is what users get.
  _Rejected_: `docusaurus start` in the tests, which is slower to start and is not what ships.
- **D3 — Scripts**: these scripts exist:
    - `test:e2e` (`playwright test`, needs a build);
    - `ci:e2e` (`yarn ci:build && yarn test:e2e`);
    - `verify:full` becomes `yarn verify && yarn ci:test:perf && yarn ci:e2e`.

    The Playwright config stops at once with "run `yarn build` first" when `build/` is missing.

    _Why_: `verify:full` builds once, CI and local runs call one command, and no runner holds logic.
    _Rejected_: a separate build in `test:e2e`, which would build twice in `verify:full`.

- **D4 — Browser install**: an `e2e:install` script runs `playwright install chromium`. CI runs
  `playwright install --with-deps chromium` as a setup step before `yarn ci:e2e`, the same way
  `setup-node` is a setup step. Locally, Playwright's own error names the install command; the
  script is listed in `AGENTS.md` §3. _Why_: browsers are about 150 MB and not needed by Vercel's
  `yarn build`. _Rejected_: a `postinstall` download, which would slow every install, Vercel
  included.
- **D5 — Failure capture**: the shared `fixtures.ts` extends `test` with a page that collects
  `pageerror` events and failed same-origin requests and fails the test with them (FR-004). Config:
  `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `retries: 0`. CI uploads
  `test-results/` and the HTML report as artifacts. _Why_: a retry would hide flakes, which §11 says
  to fix.
- **D6 — Waiting**: the tests use web-first assertions and locators by role and label only; no
  `waitForTimeout`. _Why_: fixed delays are the flake source the spec forbids.
- **D7 — Timings project**: `timings/` runs as its own Playwright project. Each measurement is
  measured inside the page:
    - an input event to the next frame for an editor edit on the shipped full sheet;
    - the dwell timer firing to the preview frame for a move;
    - navigation to the sheet's first interactive control for opening the sheet.

    Each is the best of 5 warm runs, attached as an annotation, printed next to its budget, and
    written to `test-results/timings.json`. They are never asserted. _Why_: the spec makes timings
    non-blocking (clarification Q2), and best-of-warm follows §11. _Rejected_: Playwright's expect
    with a soft budget, which still marks the run failed.

- **D8 — Smoke flows** (FR-003), one spec file per area:
    - `site.spec.ts`: home, an English docs page, the `/ru/` mirror;
    - `sheet.spec.ts`: a fresh profile, create a character, change a value, reload, still there;
    - `dice.spec.ts`: focus the dice input, type a pool, press Enter, see a history entry;
    - `editor.spec.ts`: open the shipped sheet in the editor, select an element, Alt+↓, then undo;
    - `catalog.spec.ts`: a catalog docs page, sort a column, filter, check the rows change.

    Each test starts with an empty storage state. _Why_: these are the flows unit tests cannot prove
    in a real browser.

- **D9 — CI job**: a new `e2e` job in `.github/workflows/ci.yml` (setup, browser install,
  `yarn ci:e2e`, artifact upload on failure). It blocks, and its timings print in the log. _Why_:
  FR-006. The perf job stays non-blocking as it is.
- **D10 — Upgrade unit**: each package major is one commit, with its code changes and a
  `verify:full` pass, and an import re-sort is a commit of its own. A blocked upgrade is reverted
  and gets a T-088 note. _Why_: FR-007 and FR-010 keep every step revertable.
- **D11 — happy-dom selection** (clarification Q3): a one-off scratchpad script tries each
  `@vitest-environment jsdom` file under happy-dom and keeps the passing ones, and the result is
  measured. Files that move get `// @vitest-environment happy-dom`. A file that stays on jsdom is
  listed with its reason in this design's results, not in each file: there are 99 files, and one
  list stays readable. _Rejected_: a global switch with per-file opt-outs, which would put every
  untried file on the lighter DOM at once.
- **D12 — Node**: jsdom 30 needs Node ≥ 22.22.2. `.nvmrc` becomes `22.22`, and `package.json` gains
  `engines.node: ">=22.22.2"`. _Why_: CI and Vercel resolve `22` to the latest 22.x today, but the
  floor should be explicit.
- **D13 — Table upgrade boundary**: react-table 9 is migrated in `DataCatalog.tsx`, with the
  `ColumnDef` type imports in the catalog configs. If v9 needs more than ~300 changed lines outside
  `DataCatalog`, it moves to its own small change with a T-088 note, and lucide stays in US4. _Why_:
  this keeps US4 bounded.

## Changed types and data

- No schema, persisted shape, store, or translation changes.
- `package.json` changes:
    - dev dependencies: `@playwright/test` and `happy-dom` added, and the upgraded versions;
    - scripts: `test:e2e`, `e2e:install`, `ci:e2e`, and `verify:full`;
    - `engines`.
- `.nvmrc`, `.github/workflows/ci.yml`, `.gitignore` (`playwright-report/`, `test-results/`),
  `knip.json` (the Playwright config and `tests-e2e/` as entries), `eslint.config` (`tests-e2e/` in
  the test globs), and `tsconfig` (a project for `tests-e2e/` so `tsc -b` checks it).

## Principles at risk

- **IV / V (testing)**: the browser tests add a layer, not a substitute. Unit tests stay
  authoritative for logic. No unit test is deleted or weakened by happy-dom (FR-009).
- **VII (performance)**: dependency changes run `verify:full` and a bundle check. Before US2 and
  after US4, the sheet page's JS and CSS sizes are recorded from `build/assets` and compared
  (SC-004).
- **Verification Workflow (timing)**: browser timings make no wall-clock assertion, so the rule that
  the default run holds none still holds. The merge gate gains blocking smoke tests only.
- **VI (accessibility)**: the tests locate controls by role and label, so an unlabeled control fails
  a smoke test. That is a side benefit; Axe stays T-034.

## Tests

- `tests-e2e/smoke/*.spec.ts`: the D8 flows. Each fails on a script error or a failed asset request.
- `tests-e2e/timings/editor.spec.ts`, `sheet.spec.ts`: the D7 measurements, reported only.
- SC-001 proof (once, recorded in the results):
    - throw in the sheet page → `sheet.spec` fails;
    - delete a built CSS asset → `site.spec` fails;
    - break a docs route → `site.spec` fails.
- Existing Vitest suites: unchanged in content through every upgrade. The unit run is measured as
  the best of three, before and after US3.

## Manual walk

1. `yarn ci:e2e` with the dev server running on 3000 → both run; the dev server stays up and is
   untouched.
2. `yarn test:e2e` without a build → a clear "run `yarn build` first" failure, not a hang.
3. Open the HTML report after a deliberate failure → screenshot and trace attached to the step.
4. After US4: sort and filter a catalog table on the dev server, and look over icons in the toolbar,
   editor, and dice panel → unchanged.
5. After US3: `yarn test` → the same test count, timing printed; compare with about 108 s.
