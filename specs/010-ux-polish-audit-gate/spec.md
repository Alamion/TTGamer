# Feature Specification: Small UX polish and dead-code gate

**Feature Branch**: `testing`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Take the two very small and the two small tasks into one spec. Of the options: finish knip off and add it to verify, it is a useful thing."

## Scope

Four backlog entries, deliberately batched because each is small and none depends on
another:

| Backlog | Entry                                                                                |
| ------- | ------------------------------------------------------------------------------------ |
| T-055   | Visible StatDot clear control                                                        |
| T-030   | Dead-code/export audit — close the remaining findings and turn the audit into a gate |
| T-064   | Searchable long catalog selects                                                      |
| T-013   | Lazy load 3D packages                                                                |

Out of scope: bundle-size budgets (T-029), any change to what the dice evaluator
computes, any new template capability, and removal of dependencies beyond what the
audit findings require.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The page loads without the 3D engine (Priority: P1)

A reader opens a documentation page or the character sheet on a phone connection. The
site is usable without ever downloading the 3D dice engine and its physics library;
those arrive only when someone actually asks for a 3D roll, and while they arrive the
roll still completes.

**Why this priority**: it affects every visitor of every route, not only people who use
dice, and it is the only entry in this batch with a measurable product-wide effect.

**Independent Test**: load each route with 3D dice never requested and confirm the 3D
engine is not among the downloaded code; then request a 3D roll and confirm the roll
completes.

**Acceptance Scenarios**:

1. **Given** a first visit to the homepage, documentation, or the character sheet,
   **When** the page has finished loading and no 3D roll has been requested,
   **Then** the 3D rendering and physics code has not been downloaded.
2. **Given** a reader with 3D dice enabled, **When** they trigger the first roll of the
   session, **Then** the 3D code is fetched on demand and the roll plays out with its
   result identical to the same roll before this change.
3. **Given** the 3D code cannot be fetched (offline or blocked), **When** a 3D roll is
   requested, **Then** the roll still produces its result through the 2D presentation
   and the user sees an actionable message instead of a dead end.
4. **Given** a second roll in the same session, **When** it is requested,
   **Then** no second download happens and the roll starts without extra delay.

---

### User Story 2 - Picking from a long catalog list (Priority: P2)

A player fills in a template field bound to a large catalog (species, vehicles,
creatures, Force techniques). Instead of scrolling a plain drop-down of hundreds of
entries, they type a few letters in either language and pick the match.

**Why this priority**: it removes a daily friction on the sheets that ship today, and
the searchable control already exists elsewhere in the sheet, so the user-visible
behavior is already established.

**Independent Test**: open a template field bound to a catalog with more than the
threshold number of options and confirm typing narrows the list; open one with fewer
options and confirm it is unchanged.

**Acceptance Scenarios**:

1. **Given** a catalog-bound field whose list has more than 12 options, **When** the
   player opens it, **Then** they get the searchable control with bilingual
   "localized (English)" labels rather than a plain drop-down.
2. **Given** that searchable control, **When** the player types text in Russian or
   English ignoring case, `ё`/`е`, and diacritics, **Then** only matching entries remain
   and choosing one stores the same value the plain drop-down would have stored.
3. **Given** a field whose list has 12 options or fewer, **When** it is opened,
   **Then** it behaves exactly as today.
4. **Given** a keyboard-only user, **When** they reach the searchable control,
   **Then** they can search, move through results, choose, and leave without a mouse.

---

### User Story 3 - Noticing the clear control on a rating (Priority: P3)

A player looking at a trait row sees at a glance that the trait can be removed: the
clear cross reads as a destructive control instead of blending into the row.

**Why this priority**: small, self-contained, and purely presentational.

**Independent Test**: look at a rating row that offers removal, in light and dark
themes, and confirm the control is visible at rest and stronger under pointer and
keyboard focus.

**Acceptance Scenarios**:

1. **Given** a rating that offers removal, **When** it is displayed at rest,
   **Then** the clear control is shown in a semi-transparent destructive color that is
   legible against the row background in both themes.
2. **Given** that control, **When** it is hovered or reaches keyboard focus,
   **Then** it becomes more opaque and the focus is visible without the mouse.
3. **Given** a rating that does not offer removal, **When** it is displayed,
   **Then** no clear control appears and the row's layout is unchanged.
4. **Given** an assistive-technology user, **When** they reach the control,
   **Then** it announces what it removes rather than only carrying a tooltip.

---

### User Story 4 - The dead-code audit stops being advisory (Priority: P3)

A contributor runs the project's verification command. Unused files, exports, and
dependencies fail the run with a readable report, so dead code cannot accumulate
between manual audits.

**Why this priority**: a maintainer-facing guarantee; it protects the other three
stories from re-introducing orphans but delivers nothing to players on its own.

**Independent Test**: run the verification command on a clean tree and confirm it
passes; add an unused export, re-run, and confirm it fails naming that export.

**Acceptance Scenarios**:

1. **Given** the current repository with the two remaining audit findings resolved,
   **When** the verification command runs, **Then** it passes.
2. **Given** a newly added unused export or unused dependency, **When** the verification
   command runs, **Then** it fails and the report names the file and symbol.
3. **Given** an export that exists deliberately without importers (an exhaustiveness
   guard), **When** the audit runs, **Then** it is not reported, because the reason it
   exists is recorded at the declaration.
4. **Given** the pre-commit hook, **When** it runs on its branch tier,
   **Then** its behavior matches the documented verification tiers with no surprise
   additional wait on the fast tier.

---

### Edge Cases

- A 3D roll requested twice in quick succession, before the first download finishes:
  the second request must not start a second download or lose its result.
- A 3D roll requested while the previous roll is still animating.
- A catalog-bound field whose options arrive asynchronously and cross the threshold
  after first render: the control must not swap under the user's hands mid-interaction.
- A catalog field with a value that is no longer in the catalog: the stored value stays
  and is shown, it is not silently cleared by the new control.
- A multi-select catalog field: explicitly left on the plain control (see Assumptions),
  so a long multi-select must keep behaving exactly as today.
- Narrow (phone) width: the searchable control and the clear cross must not cover the
  input they belong to.
- The audit gate reporting a finding in generated sources, which contributors do not
  hand-edit.

## Requirements _(mandatory)_

### Functional Requirements

**3D on demand (T-013)**

- **FR-001**: The 3D dice rendering and physics code MUST NOT be part of the initial
  download of any route; it MUST be fetched only when a 3D roll is first requested.
- **FR-002**: A roll's result MUST be identical whether or not the 3D code is loaded;
  loading MUST NOT change evaluation, history, or sharing behavior.
- **FR-003**: When the 3D code cannot be loaded, the roll MUST still complete through
  the 2D presentation and the user MUST see an actionable message; the failure MUST be
  reported through the module's diagnostics channel.
- **FR-004**: Concurrent or repeated 3D requests MUST share one load; after a
  successful load the code MUST NOT be fetched again in that session. A failed load MAY
  be retried on a later roll.
- **FR-005**: The public entry point of the dice evaluation core MUST keep its current
  shape for its consumers.

**Searchable catalog selects (T-064)**

- **FR-006**: A single-select catalog-bound template field whose resolved option list
  exceeds the threshold MUST present the searchable control; at or below the threshold,
  and for multi-select fields, it MUST keep the current control.
- **FR-007**: The searchable control MUST show bilingual labels and match typed text
  case-insensitively and insensitively to `ё`/`е` and diacritics, consistent with the
  existing pickers.
- **FR-008**: The value written by either control MUST be the same for the same chosen
  entry, and an already-stored value that is absent from the catalog MUST be preserved
  and displayed.
- **FR-009**: The searchable control MUST be fully operable by keyboard and MUST carry
  the field's label for assistive technology.
- **FR-010**: Fields with static (non-catalog) options MUST be unaffected.

**Clear control (T-055)**

- **FR-011**: The rating clear control MUST render in a semi-transparent destructive
  color at rest and MUST increase in opacity on pointer hover and on keyboard focus.
- **FR-012**: The control MUST expose an accessible name describing the removal, not a
  tooltip alone, and that name MUST come from the canonical translation sources in both
  locales.
- **FR-013**: The control MUST keep its current position and size so row layouts,
  including the narrow brief layouts, do not shift.

**Dead-code gate (T-030)**

- **FR-014**: The two remaining audit findings — the deliberate schema alias reported as
  a duplicate export, and the configuration hint about the generated-translations ignore
  entry — MUST be resolved so the audit exits clean on an unmodified tree.
- **FR-015**: The audit MUST run as part of Tier 2 verification (`yarn verify`, and
  therefore `yarn verify:full`) and MUST fail the run on any new finding; the fast tier
  MUST stay free of it.
- **FR-016**: Exports that deliberately exist without importers MUST be exempted at the
  declaration with a stated reason, not by broad configuration.
- **FR-017**: The verification tiers documented in the constitution and in `AGENTS.md`
  (§3 command table, §10 Verification Scope) MUST describe the audit's new status,
  replacing the "advisory, not a merge gate" wording; this is a constitution amendment
  with a version bump and a Sync Impact Report.
- **FR-018**: A contributor running the gate MUST be able to see, from the failure
  output alone, which file and symbol to act on.

**Backlog and records**

- **FR-019**: On completion, T-013, T-030, T-055, and T-064 MUST be marked done in
  `TODO.md`, with the T-030 entry stating the resolution of both remaining findings.

### Key Entities

- **Verification tier**: the named command a contributor runs (fast / logic / full) and
  the set of checks it includes.
- **Catalog option list**: the resolved, localized options behind a template field
  bound to a catalog; its length decides which control is used.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On a first visit with no 3D roll requested, no 3D rendering or physics
  code is downloaded on any route (homepage, documentation, sheet).
- **SC-002**: The initial download of the character sheet route shrinks measurably
  against the pre-change baseline, and the baseline and new figures are recorded.
- **SC-003**: A player finds and selects a known entry in the largest catalog-bound
  field using only the keyboard, and the attempt is timed once during acceptance at
  under 10 seconds.
- **SC-004**: 100% of rolls produce the same result as before the change, verified by
  the existing dice test suite plus a first-roll-with-3D case.
- **SC-005**: The clear control is identifiable as destructive at rest by a reviewer in
  both light and dark themes, and both it and the searchable control pass the project's
  accessibility floor.
- **SC-006**: The verification command passes on a clean tree and fails, naming the
  symbol, when an unused export is introduced deliberately in a test run.

## Assumptions

- The threshold for switching to the searchable control is **more than 12 options**, as
  recorded in T-064, and applies to single-select catalog fields. Multi-select catalog
  fields keep the current control: the existing searchable control has no multi-value
  affordance, and designing one is a separate change (research R4).
- "Fetched only on demand" means the first 3D roll of the session; the project does not
  prefetch on hover or on idle in this change.
- The 2D fallback and its messaging already exist and are reused; this change does not
  design a new failure surface.
- The destructive color and focus treatment come from the existing palette and focus
  conventions; no new design tokens are introduced.
- The audit gate joins **Tier 2 (`yarn verify`)**, decided 2026-09-23: the fast tier
  keeps running on every feature-branch commit without the audit's cost and without
  failing on a module that is written but not yet imported, while `yarn verify` (and
  therefore `verify:full` and the main-branch pre-commit hook) blocks dead code before
  it merges. The constitution amendment records this.
- Resolving the duplicate-export finding does not change what the schema validates; if a
  rename is needed, existing importers are updated in the same change.
- No dependency is removed without human review, per the existing T-030 note.
