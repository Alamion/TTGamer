# Feature Specification: Browser smoke tests and the first dependency upgrades

**Branch**: `026-playwright-upgrades` | **Created**: 2026-10-07 | **Status**: Draft

**Input**: "Spec 026 per the agreed plan: T-033 Playwright smoke tests as a project dependency (run
through ci:\* scripts), then T-088 dependency upgrades one at a time (small majors, Vitest 5/jsdom
30, Zod 4, lucide/react-table, TS 7, Tailwind 4 last)."

## Context

Every check today runs in a simulated DOM. Nothing opens the built site in a real browser, so a
broken route, a missing stylesheet, or a script error on load reaches users unnoticed. The unit
tests miss these, and so do the type check and the build (T-033).

Several dependencies are one or more major versions behind (T-088): the test runner and its DOM, the
schema library behind every stored document, the type checker, the icon and table libraries, the 3D
library, two lint tools, and the CSS framework. Each upgrade can change behavior in a way only a
real browser shows. That is why the browser tests come first and every upgrade lands on its own.

This spec takes the browser tests and the lower-risk majors. The schema library, the type checker,
and the CSS framework follow in their own specs, on top of this safety net.

Spec 024 left two targets here: a unit run of 60 s or less, which needs a lighter DOM environment,
and absolute time budgets, which belong to browser tests.

## Clarifications

### Session 2026-10-07

- Q: Should spec 026 take all seven stories, or be split? → A: Split. 026 covers the browser tests,
  the small majors, the test runner and DOM, and the icon and table libraries. Zod 4, TypeScript 7,
  and Tailwind 4 move to later specs (027 or one each), in the same order.
- Q: Should the browser tests also check absolute time budgets? → A: Yes, as a separate set of
  browser timings (an editor edit, a move preview, opening the sheet) printed and compared with
  their budgets in the report, never blocking, like the perf tests in CI.
- Q: How far should unit tests move to the lighter DOM environment? → A: File by file, only files
  that pass there without changing the tests; the rest stay on the full DOM with the reason noted.

## User Scenarios & Testing

### User Story 1 - The built site is checked in a real browser (Priority: P1)

A maintainer changes code and runs the full verification. A real browser opens the built site and
walks the main routes: the homepage, a documentation page in both languages, the character sheet,
the dice roller, and the template editor. It fails if a page does not load, a script error occurs,
or a key control does not respond, including from the keyboard.

**Why this priority**: every later story relies on it to show that an upgrade changed nothing
visible.

**Independent Test**: break one route on purpose (for example a thrown error in the sheet page); the
browser check fails, names the route, and keeps a screenshot and trace.

**Acceptance Scenarios**:

1. **Given** a built site, **When** the browser checks run, **Then** the homepage, an English and a
   Russian docs page, the sheet, and the dice roller load without script errors.
2. **Given** an empty browser profile, **When** the check creates a character, changes a value, and
   reloads, **Then** the value is still there (persistence works in a real browser).
3. **Given** the sheet, **When** the check rolls dice from the dice panel using only the keyboard,
   **Then** a result appears in the history.
4. **Given** the template editor, **When** the check opens a shipped page and moves an element with
   the keyboard, **Then** the page shows the new order and undo restores it.
5. **Given** a failing check, **When** the run ends, **Then** the report names the route and step
   and keeps a screenshot and a trace for it.
6. **Given** a push or pull request, **When** CI runs, **Then** the browser checks run through the
   same project script as locally.
7. **Given** the browser timings, **When** they run, **Then** the report prints each one next to its
   budget and marks those over it, and the run still passes.

---

### User Story 2 - Small majors land without notice (Priority: P2)

The maintainer upgrades the dependencies whose majors change little: the dead-code tool, the import
sorter, the 3D library with its types, and the in-range minors. Each is its own commit, and the full
verification passes after each one.

**Why this priority**: these are quick and make the later, larger steps easier to isolate.

**Independent Test**: after each commit the full verification and the browser checks pass. The
display-condition 3D dice tests pass unchanged.

**Acceptance Scenarios**:

1. **Given** the import sorter's new major, **When** it re-sorts imports, **Then** that re-sort is
   one formatting-only commit, separate from any code change.
2. **Given** the dead-code tool's new major, **When** it runs, **Then** it reports the same findings
   (none). Any new finding is fixed or exempted with a reason at its declaration.

---

### User Story 3 - A faster test runner (Priority: P2)

The maintainer upgrades the test runner, its coverage plugin, and the simulated DOM, and tries a
lighter DOM environment for the tests that allow it. The default unit run gets faster without losing
any test.

**Why this priority**: every story after this one pays for the unit run several times.

**Independent Test**: the unit run, best of three on the maintainer machine, against the current
baseline (about 108 s) with the same test count.

**Acceptance Scenarios**:

1. **Given** the upgraded runner, **When** the unit and perf projects run, **Then** every test
   passes, and the perf tests' ratios stay within their bounds.
2. **Given** a test file that fails in the lighter environment, **When** it is tried there, **Then**
   it stays on the full DOM unchanged, and the design's results list it with the reason. No test is
   edited to fit the lighter environment.

---

### User Story 4 - Icons and tables unchanged after their upgrades (Priority: P3)

The maintainer upgrades the icon library (some icons renamed) and the table library. Every icon
still shows, and catalog tables still sort, filter, and page the same way.

**Independent Test**: the browser checks visit a catalog table and sort and filter it. A check fails
the build when an icon import no longer exists.

**Acceptance Scenarios**:

1. **Given** a renamed icon, **When** the site builds, **Then** the new name is used and the icon
   looks the same.
2. **Given** a catalog page, **When** a reader sorts, filters, and pages it, **Then** the rows match
   those before the upgrade.

### Edge Cases

- **An upgrade breaks something that cannot be fixed quickly**: that upgrade is reverted as one
  commit and recorded in the backlog with the reason, and the remaining upgrades proceed.
- **A browser check fails without a code cause** (timing on a loaded machine): the flaky-test policy
  applies (fix or quarantine within a day). Checks wait for states, never for fixed delays.
- **The dev server is already running on port 3000**: the browser checks use the built site on their
  own port and never stop or reuse the dev server.
- **Browser binaries missing on a fresh machine**: the project script says how to install them
  instead of failing with a stack trace.

## Requirements

### Functional Requirements

- **FR-001**: The project MUST include browser tests as a project dependency, run by one project
  script (`ci:*`) that local runs, CI, and later runners call the same way.
- **FR-002**: The browser tests MUST run against the production build served locally, never the dev
  server.
- **FR-003**: The browser tests MUST cover the homepage, a docs page in each language, the sheet
  (create, edit, reload), the dice roller (keyboard roll), the template editor (open, keyboard move,
  undo), and a catalog table (sort and filter).
- **FR-004**: A browser test MUST fail on any uncaught script error or failed request for a site
  asset on the page it visits.
- **FR-005**: A failed browser test MUST keep a screenshot and a trace, and CI MUST upload them.
- **FR-006**: The full verification and the merge gate MUST include the browser tests. CI MUST run
  them and block on failure.
- **FR-007**: Every major upgrade MUST be its own commit (or one story commit per upgrade), with the
  full verification and the browser tests passing after it.
- **FR-008**: The upgrades MUST happen in this order: small majors, the test runner and DOM, icons
  and tables.
- **FR-009**: The default unit run MUST keep every test. A test file moves to the lighter DOM
  environment only if it passes there without changes to the test; the files that stay on the full
  DOM are listed once with their reasons in the design's results, and a test moved to another
  project says why.
- **FR-010**: An upgrade blocked by a missing ecosystem release, or one that cannot be fixed within
  its story, MUST be reverted and deferred with a backlog note instead of forced with overrides or
  forks.
- **FR-011**: A separate, non-blocking set of browser timings MUST measure an editor edit on the
  full shipped sheet (budget 100 ms), the move preview after the pointer rests (budget 100 ms), and
  opening the sheet (no budget yet; the first measurement is recorded as the baseline), each the
  best of several warm runs, and print each next to its budget.
- **FR-012**: Guidance (`AGENTS.md` tech stack and verification, the affected skills) MUST name the
  new versions and the browser test command when the spec completes.

## Success Criteria

- **SC-001**: A deliberately broken route, a script error, or a missing stylesheet is caught by the
  browser checks in 100% of tried cases (one of each tried).
- **SC-002**: The browser checks finish in 3 minutes or less locally on an existing build, including
  serving it.
- **SC-003**: The default unit run takes 60 s or less on the maintainer machine (best of three), or
  the remaining gap is measured and recorded with its cause.
- **SC-004**: Total JavaScript and CSS the browser downloads to open the sheet page, lazy chunks
  included, grows by no more than 5%.
- **SC-005**: After the spec, every dependency is on its current major except the schema library,
  the type checker, and the CSS framework (later specs), the site framework and React (Assumptions),
  the Node type definitions (they follow Node), and any deferred with a backlog note.
- **SC-006**: The browser timings report all three measurements on every full verification and CI
  run; none of them can fail the run.

## Assumptions

- One browser engine (Chromium) locally and in CI; other engines are out of scope for now.
- Browser tests run in the full verification and CI, not on commit or push: they need a build.
- Out of scope, in later specs: Zod 4, TypeScript 7, Tailwind 4 (T-088 keeps them open).
- Node stays on major 22; its floor rises to 22.22.2 because the new simulated DOM needs it. The
  Node type definitions stay on their current line (24), not the latest major.
- The upgrades stay inside the current framework major (Docusaurus 3, React 19); moving those is a
  separate decision.
- Axe accessibility checks (T-034) are out of scope, though the browser test setup should allow them
  later.
- Releases: the feature branch does not bump the version; the merge does (patch or minor per the
  maintainer).
