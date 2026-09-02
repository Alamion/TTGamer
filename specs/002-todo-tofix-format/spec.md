# Feature Specification: TODO/TOFIX Backlog Format Standardization

**Feature Branch**: `002-todo-tofix-format`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "Standardize the TODO/TOFIX backlog file formats so that entries follow one stable schema, format drift is caught automatically, and raw inputs (ideas, bug reports) are normalized into the canonical form by the agent with questions only where required information is missing." (translated from the owner's request "Давай подготовим и реализуем фикс форматов TODO/TOFIX")

## User Scenarios & Testing _(mandatory)_

The primary actors are the **product owner** and **contributors** (human or agent) who add and update backlog entries. Players and GMs benefit indirectly: open work and known defects stay visible, trustworthy, and consistent over time instead of drifting between formats.

**Scope distinction — containers, not product intent**: this feature standardizes the _format and governance_ of the two backlog files (`TODO.md`, `TOFIX.md`). It does not add, remove, or re-prioritize product work; path-level product intent remains owned exclusively by `ROADMAP.md` (feature 001). No entry may gain or lose meaning as a side effect of restructuring.

### User Story 1 - Every Entry Follows One Canonical Schema (Priority: P1)

A contributor opens `TODO.md` or `TOFIX.md` and finds every entry shaped the same way: a stable identifier, a one-line name, its state (for TODO entries) or severity (for TOFIX entries), an area, a plain-language scope or defect description, and explicit dependencies. There is exactly one way to write "in progress" — the historically live encodings (checkbox marker, parenthetical text suffix, legend emoji) are reduced to a single canonical form, and completed entries agree with their status markers. The file headers describe exactly the fields entries actually carry — no aspirational schema promising fields that no entry has, and no self-declared format-version label that silently outlives the format it claims to describe.

**Why this priority**: without a single schema, every other improvement (validation, normalization) has nothing stable to validate against. This is the smallest slice that delivers standalone value: an immediately readable, consistent backlog.

**Independent Test**: Can be fully tested by opening both files and checking that every entry carries the required fields with unique identifiers, that exactly one status encoding exists, and that the header legend matches the real schema; delivers a readable, drift-free backlog.

**Acceptance Scenarios**:

1. **Given** a fresh copy of the project, **When** a contributor opens `TODO.md` and `TOFIX.md`, **Then** every entry carries a unique stable identifier and all required fields, and no legacy or duplicate status encodings remain.
2. **Given** the `TODO.md` header, **When** a reader compares the legend against actual entries, **Then** the promised fields and the real fields are identical, and no format-version label is present.
3. **Given** a completed TODO entry, **When** its checked state is inspected, **Then** it agrees with its status marker (a checked entry is `done`, an unchecked entry is not).

---

### User Story 2 - Format Drift Is Caught Automatically (Priority: P2)

A contributor (or agent) edits a backlog file and introduces a violation — an entry missing a required field, an unknown status value, a duplicated identifier, inconsistent status encoding, or path scope text duplicated from the roadmap. The project's standard verification flow fails for that change before it can be reviewed or merged, and the failure message names the file, the entry, and the violated rule. Valid changes pass silently.

**Why this priority**: manual conventions did not survive contact with history — `TODO.md` accumulated three encodings of the same status and a legend promising fields entries never carried. Automatic detection is what makes the schema permanent rather than aspirational.

**Independent Test**: Can be fully tested by deliberately introducing one schema violation into a scratch copy, running the standard verification flow, and observing a failure naming the violation; reverting the violation makes the flow pass. Delivers enforcement, not convention.

**Acceptance Scenarios**:

1. **Given** a backlog edit that removes a required field, **When** the standard verification flow runs, **Then** it fails and names the file, the entry, and the missing field.
2. **Given** a backlog edit that writes a status in a non-canonical encoding, **When** the standard verification flow runs, **Then** it fails with a message pointing to the canonical form.
3. **Given** a fully conforming backlog, **When** the standard verification flow runs, **Then** it passes without warnings.

---

### User Story 3 - Raw Input Is Normalized Into the Canonical Form (Priority: P3)

The owner hands the agent a messy raw input — a half-sentence idea, a bug report from play, a chat note — and asks to record it. The agent reshapes it into the canonical entry form for the right file, filling in the schema, and asks clarifying questions **only** when a required field cannot be filled from the input (what the work is, who it serves, what it depends on). Optional fields are never a reason to ask questions. The resulting entry passes the verification flow without further edits.

**Why this priority**: normalization removes the recurring cost of hand-formatting and the main source of drift (free-form additions). It only matters once the schema (Story 1) and its enforcement (Story 2) exist.

**Independent Test**: Can be fully tested by giving the agent a deliberately messy input and checking that the resulting entry conforms to the schema, passes verification untouched, and that any questions asked map exclusively to unfilled required fields. Delivers low-friction, drift-proof intake.

**Acceptance Scenarios**:

1. **Given** a raw bug report with observable symptom and affected area, **When** the agent normalizes it, **Then** a conforming TOFIX entry appears with identifier, severity, affected area, evidence, and a recommended direction — and no questions are asked.
2. **Given** a raw idea that lacks any statement of who it serves, **When** the agent normalizes it, **Then** exactly one clarifying question about the missing required information is asked before the entry is written.
3. **Given** a raw idea that is actually path-level product intent rather than an executable task, **When** the agent normalizes it, **Then** the content is directed to `ROADMAP.md` intake instead of becoming a TODO task, per the roadmap's entry rules.

---

### Edge Cases

- What happens when raw input is missing required information and the author is unavailable? The entry is not written; guessing scope is prohibited. The input is parked (chat, issue, or scratch note) until the answer exists.
- What happens when two defect reports describe the same problem? They are merged into one TOFIX entry that keeps both observations as evidence; identifiers of merged entries are retired, never reassigned.
- What happens when an entry's name or wording changes over time? The identifier is unchanged; only the name and body evolve.
- What happens when a TODO item turns out to be path-level product intent? Its content graduates to `ROADMAP.md` through the roadmap's intake rule; the TODO entry shrinks to a task referencing the path slug, or is removed if nothing task-level remains.
- What happens when a pre-existing TOFIX defect is fixed as part of a feature's work? The entry is removed from `TOFIX.md` in the same review that ships the fix; the durable record lives in the commit and release summary.
- What happens when one task serves several roadmap paths? The entry references all relevant slugs; it does not duplicate any path's scope.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every entry in `TODO.md` and `TOFIX.md` MUST carry a stable identifier (for example `T-013` for a task, `F-007` for a defect) that is unique within its file, assigned once at creation, never reused for a different entry, and never renumbered.
- **FR-002**: Each TODO entry MUST carry exactly one status from the roadmap status vocabulary — `done`, `in progress`, `not started`, or a closed outcome (`shipped`, `declined`, `superseded`) — expressed in exactly one canonical encoding; a completed entry's checked state and its status marker MUST agree.
- **FR-003**: Each TODO entry MUST contain: identifier, one-line name, status, area group, plain-language scope stating what becomes possible and for whom, and dependencies (or an explicit "none"). Effort, impact estimates, and open questions are optional. The file header MUST describe exactly the fields the schema defines — no promised-but-absent fields.
- **FR-004**: Priority ordering MUST be expressed only by section grouping (for example Major/Minor); per-entry priority values MUST NOT exist as a field.
- **FR-005**: TODO entries MAY reference roadmap paths by slug; path scope, status, and dependency text MUST live only in `ROADMAP.md`, never restated in the backlog (upholding feature 001 FR-013).
- **FR-006**: Each TOFIX entry MUST contain: identifier, severity (`Critical`, `High`, `Medium`, `Low`), affected area, a defect description with observable evidence, and a recommended direction. TOFIX entries MUST NOT carry a lifecycle status: an entry is open until its fix ships.
- **FR-007**: When a defect's fix ships, its TOFIX entry MUST be removed in the same review; the durable record of the fix is the commit and the release summary. The queue holds open work only.
- **FR-008**: Issues discovered during a feature's implementation cycle MUST be tracked in that feature's task list; `TOFIX.md` receives only issues found outside a feature cycle.
- **FR-009**: Both files MUST remain human-written markdown, editable without special tooling, English-only, with no self-declared format-version header.
- **FR-010**: A standard verification flow MUST detect schema violations — missing required field, unknown status or severity value, inconsistent status encoding, duplicated identifier, and path scope duplicated from the roadmap — and fail with a message naming the file, the entry, and the violated rule, so drifted content cannot merge.
- **FR-011**: Normalization of raw input MUST ask clarifying questions only when a required field cannot be filled from the input; optional fields MUST NOT trigger questions.
- **FR-012**: The backlog schema MUST have exactly one normative owner; a schema change MUST land as a single review that updates the owner and every mirrored summary (file headers, agent workflow guidance) together, so mirrored text cannot silently diverge.

### Key Entities _(include if feature involves data)_

- **Task Entry** (in `TODO.md`): a unit of executable work. Attributes: identifier, one-line name, status, area group, scope (what and for whom), dependencies (or "none"), optional effort/impact/open questions, optional roadmap path slug references. Belongs to a section group that expresses its priority.
- **Defect Entry** (in `TOFIX.md`): a known defect or quality issue awaiting a fix outside any feature cycle. Attributes: identifier, severity, affected area, evidence, recommended direction. No lifecycle status.
- **Entry Identifier**: short stable code unique per file; the join key for commit messages, discussion, and audit; never reused or renumbered.
- **Status**: lifecycle state of a task entry; vocabulary borrowed from the roadmap (`done` / `in progress` / `not started`; closed: `shipped` / `declined` / `superseded`); one canonical encoding.
- **Severity**: queue-ordering weight of a defect entry (`Critical` / `High` / `Medium` / `Low`); orthogonal to task status.
- **Roadmap Path Reference**: a slug pointing into `ROADMAP.md`; one-way — the backlog references paths, never the reverse, and never restates path scope.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After migration, 100% of entries in both files conform to the schema, and zero legacy status encodings remain (the historically coexisting encodings of "in progress" are reduced to one).
- **SC-002**: A deliberately introduced schema violation is detected by the standard verification flow in the same working session, before human review, with a message naming file, entry, and rule — 100% of the violation categories in FR-010 are detected.
- **SC-003**: A raw, messy input is normalized into a conforming entry in under 2 minutes, with zero questions about optional fields.
- **SC-004**: Any entry can be audited — identity, state, dependencies — in under 1 minute using only the file and search, because identifiers are stable and appear in commit messages.

## Assumptions

- Existing open work is preserved semantically: the migration reorganizes and re-labels entries but drops no open item; completed TODO entries remain as the shipped-capability inventory, matching roadmap audit needs.
- The exact identifier format is decided at planning; the informed default is prefixed sequential codes (`T-###`, `F-###`).
- The severity vocabulary stays as it exists today (`Critical` / `High` / `Medium` / `Low`); it orders the defect queue and does not overlap the roadmap status vocabulary.
- Validation covers the two backlog files only; `ROADMAP.md` governance remains review-based per feature 001.
- The normative owner of the schema (the executable checks behind FR-010) and the exact verification entry point are decided at planning; the requirement is that they are part of the project's standard verification flow, not a side document.
- Agent workflow guidance for writing and normalizing entries is mirrored per constitution governance; the checks behind FR-010 remain the executable truth, and prose summaries defer to them.
- This feature adds no new product paths or tasks; it restructures containers only.
