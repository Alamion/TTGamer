# Feature Specification: Development Speed — Process and Tooling

**Feature Branch**: `024-dev-speed-tooling`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "Spec 024 — process and tooling to restore development speed (from the
2026-10-04 audit): fast commit checks and runner-agnostic CI, a fast and stable test suite, a lean
spec-kit process, one owner per rule in agent guidance, and cheaper translation work. Editor
architecture is spec 025; Playwright smoke tests and dependency upgrades are spec 026."

## Context

Specs 018–023 took far longer than planned. A four-part audit (2026-10-04) found the cost outside
the product code as much as in it:

- Every commit waits 2–4 minutes for a "fast" check; a feature with ~15 commits spends 45–60
  minutes in hooks. There is no CI; the commit hook is the only gate.
- The type check reports success while checking 0 files from the root project; 34 source files
  are never type-checked.
- The full test run takes ~2–2.3 minutes, dominated by one 2177-line test file and by every page
  test loading nearly the whole application. Timing-based tests fail under load.
- A feature's spec documents run to 1.5k–4.5k lines (≈40% of its diff); most are never read again.
  Planning 022 took ~5.5 h against ~2 h of implementation.
- Each feature restates its facts in up to six places (spec, changelog, guide en/ru, skill, module
  notes); several guidance statements are stale or contradict each other.
- Generated translation files are committed and roughly double the translation diff; four
  overlapping translation checks take ~50 s.

The site deploys on Vercel today; a Jenkins pipeline follows once the backend exists.

## Clarifications

### Session 2026-10-04

- Q: How does the lean process reach the spec-kit commands, which live in the user's personal
  skill directory? → A: Install the spec-kit commands project-locally (`.claude/skills/` in the
  repository) and change only those. Claude Code documents that a personal skill overrides a
  project skill with the same name, so the override must be proven by a test: first a project
  setting that turns the personal skills off for this repository, otherwise distinct project
  command names. The personal skills stay untouched.
- Q: Where do the timing (perf) tests run, given shared CI machines are noisy? → A: They are a
  required part of the local pre-merge full check; in hosted CI they run and report but do not
  block.
- Q: What runs before a push, given pushes go straight to `testing`/`master` and Vercel deploys
  `master`? → A: A pre-push check runs the cached type check and the tests related to the changed
  files (about a minute); the full check is a required step of merging into `master`.
- Q: What threshold sends a task down the small change path instead of a full spec? → A: One
  story, no change to schemas, persistence, or contracts between modules, and an expected ≤ ~300
  lines of code (tests and docs excluded); a change that grows past this escalates to a spec.
- Q: Which review steps stay in the lean process? → A: Clarification always; the consistency
  analysis only for specs with four or more stories (or on request); no separate spec-quality
  checklist file.

## User Scenarios & Testing _(mandatory)_

The actors are the **maintainer** and the **coding agent** working on the repository, and the
**build runners** (local machine, Vercel, a hosted CI service now, Jenkins later).

### User Story 1 - Commit checks that are fast and actually check everything (Priority: P1)

The maintainer or agent commits work in progress without waiting minutes, while the type check
covers every source file and the complete set of checks runs where it belongs: once before a
feature is merged and on every push, through the same commands on any runner.

**Why this priority**: the commit check is paid on every commit of every feature; it is the largest
recurring cost and its type-check gap hides real errors.

**Independent Test**: time a commit of a small code change and of a docs-only change; introduce a
type error in a currently unchecked file (a page or theme component) and confirm the type check
fails; run the full check command locally and on the hosted CI service and compare results.

**Acceptance Scenarios**:

1. **Given** a staged change to two source files, **When** the maintainer commits, **Then** the
   commit check formats and lints only the staged files and finishes in under 15 seconds.
2. **Given** a type error in any source file, configuration file, or test, **When** the type check
   runs, **Then** it fails and names the file.
3. **Given** a commit on the main branch, **When** it is created, **Then** the commit check is no
   slower than on a feature branch; a push runs the type check and related tests, and the full
   check is part of the merge into the main branch.
4. **Given** a push or merge request, **When** the hosted CI service runs, **Then** it runs the same
   named check commands a maintainer runs locally and a later Jenkins pipeline would run, and
   reports which check failed.
5. **Given** a production build on Vercel from a clean checkout, **When** it runs, **Then** it
   succeeds without any manual preparation step.

---

### User Story 2 - A fast, stable test suite (Priority: P1)

The maintainer or agent runs the whole test suite in about a minute and trusts a red result: no
test fails because the machine was busy.

**Why this priority**: the suite runs before every merge and after every refactor (spec 025 relies
on it as its safety net); flaky timing failures cost investigation time and erode trust.

**Independent Test**: run the full suite five times in a row on the maintainer machine; record
wall time and failures; run the timing tests separately.

**Acceptance Scenarios**:

1. **Given** the default test run, **When** it completes, **Then** it took at most 60 seconds on the
   maintainer machine and contains no assertion on elapsed wall-clock time.
2. **Given** the timing (performance) tests, **When** they run through their own command, **Then**
   they run one at a time, compare against a baseline measured in the same run, and pass five runs
   in a row.
3. **Given** a test of one sheet element, **When** it loads, **Then** it does not load the template
   editor, the library, or every game system unless the element needs them.
4. **Given** a new editor or sheet test, **When** the author writes it, **Then** shared helpers open
   the editor or a sheet in one call instead of per-file copies.
5. **Given** a test that failed twice without a code cause, **When** the flaky-test policy applies,
   **Then** it is moved out of the default run or fixed within a day and recorded in the backlog,
   never silenced by a longer timeout alone.

---

### User Story 3 - A lean feature process (Priority: P2)

The maintainer starts a feature and gets a short specification and one design note instead of six
planning documents; small changes skip the spec process entirely; commits follow user stories;
the version and changelog change once per release.

**Why this priority**: planning documents outweigh the work they describe and are written once and
never read; but this only pays off on the next feature, after Stories 1–2 already save time.

**Independent Test**: run the next feature after this one through the new process and count the
lines and files of its spec folder and the hours before implementation starts; apply the small
change path to one backlog item.

**Acceptance Scenarios**:

1. **Given** a new feature, **When** the specification step runs, **Then** it produces a spec of
   stories, requirements, and success criteria, with edge cases only where not obvious.
2. **Given** the planning step, **When** it runs, **Then** it produces one design note (decisions
   with rejected alternatives, changed types and data, the test list, and the manual walk steps)
   and a task list, and no separate research, data-model, contract, or quickstart documents.
3. **Given** a change with one story, no schema, persistence, or module-contract change, and about
   300 lines of code or less, **When** the maintainer chooses the small change path, **Then** the
   work goes backlog entry → code and tests → guidance update → one commit, without spec
   documents.
4. **Given** an implemented user story, **When** it is committed, **Then** there is one commit per
   story (plus one for the planning documents), not one per process phase.
5. **Given** a merge into the main branch, **When** the release step runs, **Then** the version
   bump and the changelog entry are written once for everything merged, not per feature.
6. **Given** a UI layout that is already known, **When** planning runs, **Then** no prototype is
   built; a prototype for an unknown layout lives outside `specs/` and is limited to one screen.
7. **Given** the specs written before this feature, **When** the process changes, **Then** they
   stay as they are; nothing is rewritten.

---

### User Story 4 - Guidance with one owner per rule (Priority: P2)

The agent loads short, correct guidance: each rule is stated once and pointed to elsewhere, stale
statements are gone, and the large template skill becomes a short index with references loaded on
demand. A finished feature updates one or two guidance files, not five.

**Why this priority**: contradictory guidance misleads the agent and every duplicated rule must be
updated in several places per feature.

**Independent Test**: grep the guidance for each rule in the audit's duplication list and confirm
one owner plus pointers; spot-check the audit's stale statements; measure the template skill index;
reformat agent-facing markdown and confirm no manual reflow remains.

**Acceptance Scenarios**:

1. **Given** a rule (storybook coverage, verification tiers, publisher notices, bound document
   access, translations), **When** the guidance is searched, **Then** one file states it and others
   link to it.
2. **Given** the stale statements listed in the audit, **When** this feature is done, **Then** each
   matches the code or is removed.
3. **Given** a template task, **When** the agent loads the template skill, **Then** the index is at
   most 300 lines and names which reference to load for which area.
4. **Given** an edit to agent-facing markdown (skills, module notes, specs), **When** it is
   formatted, **Then** line wrapping is automatic and inline code is never split by hand reflow.
5. **Given** the constitution, **When** it is read, **Then** it holds principles and the current
   verification tiers only; its amendment history lives in version control and the changelog.

---

### User Story 5 - Cheaper translation and docs work (Priority: P3)

A new UI string is two edits (English and Russian source) and nothing generated appears in the
diff; one translation check runs instead of four; a new mirrored docs section needs no
registration; the Russian mirror is checked for structure, not only existence.

**Why this priority**: valuable but smaller savings; depends on Story 1 deciding where generation
runs.

**Independent Test**: add a UI string and count changed files; time the translation check; add a
docs section and confirm it is mirrored-checked without editing a list; break a heading anchor in a
Russian page and confirm the check fails.

**Acceptance Scenarios**:

1. **Given** a new UI string, **When** it is committed, **Then** only the two source files change;
   generated translation files are not tracked.
2. **Given** a clean checkout on any runner (local, Vercel, hosted CI, Jenkins), **When** the site
   starts, builds, type-checks, or tests, **Then** the generated translations are produced first
   without a manual step.
3. **Given** the translation checks, **When** they run, **Then** they run as one process that loads
   the sources once and reports every finding the four previous checks reported.
4. **Given** a new documentation section in English, **When** it has no Russian mirror, **Then**
   the check reports it without a hand-maintained list of sections (draft and developer pages
   excepted).
5. **Given** a Russian page whose heading anchors, headings, admonitions, or embeds differ from its
   English page, **When** the check runs, **Then** it reports the difference.

### Edge Cases

- **Fresh clone in an editor**: generated files are missing until the first install; the install
  step generates them so the editor's type information works immediately.
- **Docs-only or spec-only commit**: the commit check still formats the staged files but runs no
  code checks.
- **Bypassing the hook** (`--no-verify`): the push-time CI still runs every check.
- **Vercel build cache**: a cached dependency install must not skip generation; generation runs as
  part of the build itself.
- **Several features merged at once**: one release entry lists all of them.
- **A perf test on a slow runner**: ratio-based comparisons keep it meaningful; absolute budgets
  belong to browser tests (spec 026).
- **Personal spec-kit skills with the same names**: they win over project skills by default; the
  repository must switch them off for itself (or use distinct names), and other projects keep
  using the personal versions unchanged.
- **Hidden type errors**: switching the type check to cover all files may surface existing errors;
  they are fixed in this feature, not suppressed.

## Requirements _(mandatory)_

### Functional Requirements

**Checks and CI**

- **FR-001**: The commit check MUST format and lint only staged files, use caches, and skip code
  checks for commits that touch only documentation, specs, or backlog files.
- **FR-002**: The commit check MUST NOT run the full verification on the main branch.
- **FR-002a**: A pre-push check MUST run the cached type check and the tests related to the
  changed files, finishing within 90 seconds for a typical feature push; the full check (including
  build and timing tests) MUST be a required, documented step of merging into the main branch.
- **FR-003**: The type check MUST cover every source file, configuration file, and test, and MUST
  fail on any type error in them; any errors it surfaces are fixed in this feature.
- **FR-004**: The project MUST expose named check commands (lint, type check, unit tests, perf
  tests, dead-code audit, translations and data validation, build) that are the only entry points
  a runner calls; hosted CI, Vercel, and a future Jenkins pipeline call the same commands.
- **FR-005**: A hosted CI workflow MUST run those commands on every push and merge request and
  report each as a separate result.
- **FR-006**: Lint and format checks MUST use persistent caches locally and in CI where the runner
  allows.

**Tests**

- **FR-007**: The largest editor and library test files MUST be split so that no test file takes
  more than 25% of the default run's wall time.
- **FR-008**: Timing tests MUST run in a separate test group, one at a time, with ratio or
  same-run baseline assertions; the default run MUST NOT contain wall-clock assertions. The group
  MUST be part of the local pre-merge full check; in hosted CI it MUST run as a non-blocking,
  reported check.
- **FR-009**: Aggregate re-export modules that make element tests load the editor, the library, or
  every game system MUST be removed or narrowed, and a lint rule MUST prevent reintroducing such
  imports.
- **FR-010**: Shared test helpers MUST open the template editor and a sheet; existing per-file
  copies MUST be replaced.
- **FR-011**: A written flaky-test policy MUST exist in the testing guidance (quarantine or fix
  within a day with a backlog entry; no timeout-only fixes).

**Process**

- **FR-012**: The spec template MUST be shortened to stories, requirements, success criteria,
  non-obvious edge cases, and assumptions.
- **FR-013**: Planning MUST produce one design note and a task list; the research, data-model,
  contract, and quickstart documents MUST no longer be produced. The constitution check MUST be a
  short list of principles at risk.
- **FR-014**: The task template MUST drop sections a single sequential agent does not use
  (parallel execution examples, delivery strategy).
- **FR-014a**: The clarification step MUST stay for every spec; the consistency analysis MUST run
  only for specs with four or more stories or on request; the specification step MUST NOT produce
  a separate spec-quality checklist file.
- **FR-015**: A documented small change path MUST apply when a task has one story, changes no
  schema, persistence, or contract between modules, and is expected to stay within ~300 lines of
  code (tests and docs excluded); its steps are backlog entry → code and tests → guidance update →
  one commit, and a change that grows past the threshold MUST escalate to a spec.
- **FR-016**: Commits MUST follow user stories (plus one planning commit), not process phases.
- **FR-017**: Version bump and changelog MUST be written at merge to the main branch, once per
  release; the version check MUST still pass on every branch.
- **FR-018**: Prototypes MUST be built only for unknown layouts, outside `specs/`.
- **FR-019**: The spec-kit commands MUST be installed in the repository and carry the process
  changes there; the personal spec-kit skills MUST NOT be edited. A test MUST show that invoking a
  spec-kit command in this repository runs the project version (by a project setting that turns
  the personal versions off here, or else by distinct project command names).

**Guidance**

- **FR-020**: Each cross-cutting rule MUST have exactly one owning guidance file; other files link
  to it.
- **FR-021**: The stale statements found by the audit MUST be corrected or removed.
- **FR-022**: The template skill MUST be split into an index of at most 300 lines and on-demand
  references, without code-level detail that a search finds (file lists, test maps, test ids).
- **FR-023**: Agent-facing markdown (skills, module notes, specs) MUST be wrapped automatically by
  the formatter; user docs, changelog, and backlog keep one line per paragraph.
- **FR-024**: The constitution MUST drop its embedded amendment history and its verification
  section MUST match the new commit, push, and merge checks.

**Translations and docs**

- **FR-025**: Generated translation files MUST NOT be tracked; the Docusaurus-owned strings MUST
  move to a tracked source that the build merges in.
- **FR-026**: Generation MUST run automatically before start, build, type check, and tests, and on
  install, on every runner including Vercel and a future Jenkins pipeline.
- **FR-027**: The translation and documentation-parity checks MUST run as one process with no loss
  of findings.
- **FR-028**: Mirrored documentation sections MUST be derived (every docs section except developer
  and draft pages) instead of listed by hand.
- **FR-029**: The parity check MUST compare structure between an English page and its Russian
  mirror: heading anchors, heading count, admonitions, and embedded components.

### Key Entities

- **Check command**: a named, runner-independent command (lint, type check, tests, perf tests,
  dead-code, validators, build) with one owner in the project scripts.
- **Commit check / push check**: what runs on commit (staged files, seconds) versus on push or
  merge request (everything).
- **Design note**: the single planning document of a feature.
- **Small change path**: the documented route for changes below the spec threshold.
- **Guidance owner**: the one file that states a rule.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A commit of a typical small change (≤ 5 staged files) finishes its check in under 15
  seconds (median of 5), down from 2–4 minutes.
- **SC-002**: The type check covers 100% of source files (359 of 359 at the time of writing, up from 325) plus configuration and tests.
- **SC-003**: The default test run finishes in at most 60 seconds on the maintainer machine (down
  from ~120–140 s) and passes five consecutive runs with zero failures.
- **SC-004**: The timing tests pass five consecutive runs on the maintainer machine.
- **SC-005**: The same check commands pass locally and on the hosted CI service for the merge of
  this feature, and a Vercel deployment of a clean checkout succeeds with no manual step.
- **SC-006**: The next feature specified after this one has a spec folder of at most 800 lines
  (down from 1.5k–4.5k) and reaches implementation within 2 hours of starting the specification.
- **SC-007**: Finishing a feature updates at most two guidance files besides the user docs.
- **SC-008**: The template skill index is at most 300 lines (down from 901).
- **SC-009**: Adding a UI string changes two tracked files (down from five), and the translation
  check finishes in under 20 seconds (down from ~50 s).

## Assumptions

- GitHub Actions is the hosted CI service for now (the repository lives on GitHub); Jenkins comes
  later and only needs to call the same commands, so no Jenkins configuration is written here.
- Vercel keeps building with the project's build command, so generation inside that command
  covers it.
- The maintainer machine (20 cores) is the reference for time-based success criteria.
- Spec-kit command skills are copied into the repository and changed there; personal skills are
  not edited (see Clarifications).
- Existing spec folders stay unchanged; historical banners are added only where a later spec
  actually contradicts an earlier one.
- Editor architecture (including the source-switch settings loss), Playwright smoke tests, and
  dependency upgrades are out of scope (specs 025 and 026).
