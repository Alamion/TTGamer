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
    - navigation to the sheet's first interactive control for opening the sheet;
    - the bytes of JS and CSS the browser downloads to open the sheet, lazy chunks included
      (SC-004), recorded with no budget.

    Each is the best of 5 warm runs, attached as an annotation, printed next to its budget, and
    written to `test-results/timings.jsonl`. They are never asserted. _Why_: the spec makes timings
    non-blocking (clarification Q2), and best-of-warm follows §11. _Rejected_: Playwright's expect
    with a soft budget, which still marks the run failed.

- **D8 — Smoke flows** (FR-003), one spec file per area:
    - `site.spec.ts`: home, an English docs page, the `/ru/` mirror;
    - `sheet.spec.ts`: a fresh profile, create a character, change a value, reload, still there;
    - `dice.spec.ts`: focus the dice input, type a pool, press Enter, see a history entry;
    - `editor.spec.ts`: open the shipped sheet in the editor, select an element, Alt+↓, then undo;
    - `catalog.spec.ts`: a catalog docs page, sort a column, filter, page, and check known rows of
      the shipped catalog, so the same test compares before and after the table upgrade.

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
  `engines.node: ">=22.22.2"`; `@types/node` stays on its 24 line. _Why_: CI and Vercel resolve `22`
  to the latest 22.x today, but the floor should be explicit.
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
- **VII (performance)**: dependency changes run `verify:full` and a bundle check. The timings
  project records the JS and CSS the browser downloads to open the sheet; the US1 run is the
  baseline, compared after US4 (SC-004).
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

## Implementation notes

- **US1:**
    - **The fixture also fails on logged errors.** The first browser run found React hydration error
      #418 on every page of the build: `src/theme/Root.tsx` rendered the toast container only when
      `window` existed, so the client tree never matched the server HTML and React re-rendered each
      page from scratch. Fixed with `BrowserOnly`. React reports such errors through
      `console.error`, not as uncaught errors, and so does an error boundary (the SC-001 sheet break
      showed up only that way). FR-004 is therefore stricter in the fixture: a logged error fails
      the test too.
    - **The preview timing reads a mark from the editor.** Timing from the last pointer move proved
      unreliable: the preview can start at a pause on the way, after which it follows the pointer
      without a new dwell. `useEditorDrag` now sets the User Timing mark `template-editor:preview`
      when the dwell ends, and the timing runs from that mark to the frame after it.
    - **Timings go to `test-results/timings.jsonl`.** Each test appends one line. Parallel workers
      cannot safely rewrite one JSON file.
    - **Opening the sheet** runs from the navigation start until the first text field of the sheet
      appears. The server HTML already holds the toolbar's file input, so that input does not count.
    - **The dev server's `merits-flaws` page crashed during the exploration** (`DocItem` reading
      `id` of undefined). The production build serves the page correctly, so this was a stale dev
      server, not a code fault.
- **US3:**
    - **happy-dom came before jsdom 30.** On jsdom 30 the move-preview perf test failed every run,
      at 5.7× the commit against a 3.5× bound. jsdom 27 replaced its selector engine with
      `@asamuzakjp/dom-selector`, and on the full sheet each attribute query takes about 85 ms. The
      browser timing stayed at 32–84 ms, so this cost belongs to jsdom only.
        - `setMarker` (`useEditorDrag.ts`) now remembers the elements it marked instead of searching
          the page for its attribute. Commit and release got about twice as fast; the preview was
          still slow.
        - The perf file passes on happy-dom unchanged (preview about 2× the commit), so the
          happy-dom switch (T022–T023) ran first. jsdom 30 (T021) now applies only to the files that
          stay on jsdom.
    - **Vitest 5 reports errors thrown after a test file ends.** The editor's `revealNode` kept
      stepping on timers after the dialog closed. The steps now stop when no editor page is left.
    - **Vitest 5 makes Vite a peer dependency**, so `vite` 8 is now a direct dev dependency.

## Results

- **T001 baseline (2026-10-07):**
    - Unit run, best of three: 103.0 s by Vitest's count (107.6 s wall), 2218 tests. The other two
      runs took 104.6 s and 105.5 s.
    - Versions: Vitest 4.1.11, jsdom 26.1.0, knip 5.88.1, simple-import-sort 12.1.1, three 0.184.0,
      lucide-react 0.468.0, @tanstack/react-table 8.21.3, Playwright 1.63 (new).
- **US1 baseline timings** (one local run): editor edit 35 ms and move preview 32 ms against a 100
  ms budget each, opening the sheet 273 ms, sheet JS and CSS 3,638,638 bytes (SC-004 baseline).
- **SC-001:** each deliberate break failed its test and was then reverted.
    - A thrown error in `CharacterSheet` failed `sheet.spec` with the logged error.
    - A deleted `assets/css/styles.*.css` failed `site.spec` with HTTP 404 on two pages.
    - A deleted `docs/.../attributes-abilities/index.html` failed `site.spec` with HTTP 404.
- **SC-002:** `yarn test:e2e` on an existing build took 38 s for 10 tests. The dev server on 3000
  kept answering 200.
- **happy-dom (T022–T023):** each of the 99 jsdom files ran three times under happy-dom; 97 passed
  all three runs unchanged and moved. The files that stay on jsdom:
    - `tests/sheet_manager/tracker-field.test.tsx` and `tracker-builtin.test.tsx`: color. They read
      an inline color back from the style, which jsdom serializes as `rgb(...)` and happy-dom keeps
      as written (`#0e7490`).
- **SC-003 (T024):** the unit run is now 79.7 s (best of three: 84.1, 79.7, 80.2 s, 2218 tests)
  against the 103.0 s baseline, 23% less, but above the 60 s target. The remaining cost, summed over
  the workers:
    - test bodies, 46%: mostly full shipped-sheet renders in editor and sheet tests;
    - module imports, 24%: each isolated worker loads the sheet module graph again;
    - environment setup and transform, 14% each.

    The DOM environment is no longer the main cost. Reaching 60 s needs fewer full-sheet renders per
    test or shared module state across files (`isolate: false`). Both change tests, so neither fits
    this spec.

- **US4:**
    - lucide-react 1 kept every icon the site imports, so no renames were needed.
    - React Table 9 now declares its features in `src/shared/components/catalogTable.ts`, and the
      configs type their columns with `CatalogColumnDef`. The change took 98 lines added and 81
      removed across 20 files, within the D13 bound.
    - The six `size` column options went away; `DataCatalog` never read them.
    - Under `useTable`, the React Compiler lint now checks `DataCatalog`. It flagged the URL read in
      a layout effect, which is kept, with its reason: the server renders without the query string.
- **Type check gap:** after the React Table upgrade, `yarn typecheck` (`tsc -b`) passed while 78
  errors were waiting. `tsc -b` decides what is up to date from the project's own files, not
  node_modules. Fixed in `9462d4a`:
    - `scripts/typecheck.ts` forces a full build after a `yarn.lock` change;
    - the CI cache key includes the lockfile hash.

    A forced check confirmed that the earlier upgrade commits had no hidden errors.

- **Flaky under load:** with the machine at load 20–30 (editor, browser, dev server), two unit tests
  over every shipped template crossed the 5 s timeout, and the move-preview perf ratio failed. All
  passed when rerun at lower load. After US3 the perf file runs on happy-dom, where the preview is
  about 2× the commit, not about 3×.
- **SC-004:** sheet JS and CSS grew from 3,638,638 to 3,663,519 bytes, or 0.68%.
- **SC-005:** `yarn outdated` lists only Zod, TypeScript, Tailwind (later specs), and `@types/node`
  (follows Node 22).
- **SC-006:** every `verify:full` run printed all four browser timings, and none failed a run.
- **Manual walk:**
    - Steps 1–3 and 5 passed. `ci:e2e` ran with the dev server on 3000, which stayed up. `test:e2e`
      without a build stops at once with "run `yarn build` first". A failure keeps a screenshot and
      a trace. The unit run kept 2218 tests.
    - Step 4 (look over icons and a catalog table) is left to the maintainer. The catalog smoke test
      covers the table's behavior.
