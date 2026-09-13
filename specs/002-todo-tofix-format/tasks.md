# Tasks: TODO/TOFIX Backlog Format Standardization

**Input**: Design documents from `/specs/002-todo-tofix-format/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/backlog-format.md, quickstart.md

**Tests**: Validator rule tests are required by the plan (research D8: the validator is a merge gate). Backlog files themselves are validated, not unit-tested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Tooling + documentation governance feature: new code in `scripts/` and `tests/backlog-format/`, deliverable edits in repository-root files (`TODO.md`, `TOFIX.md`, `package.json`, `AGENTS.md`), new skill in `.agents/skills/backlog/`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm inputs before any file is changed

- [x] T001 Read specs/002-todo-tofix-format/research.md decisions D1–D8 and contracts/backlog-format.md; confirm spec, plan, data-model, and quickstart are present and current

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migration completeness baseline — blocks the migration tasks

**⚠️ CRITICAL**: No migration task may start until the inventory baseline exists

- [x] T002 Build the migration baseline: count and list every open entry in TODO.md (per section: Major, Minor, Localization, LLM Support, Verification Backlog) and every open defect in TOFIX.md (per severity section), recording the counts in the task notes — after migration the same counts must hold (spec Assumption 1: nothing open is dropped)

**Checkpoint**: Baseline recorded — user story work can begin

---

## Phase 3: User Story 1 — Every Entry Follows One Canonical Schema (Priority: P1) 🎯 MVP

**Goal**: Both backlog files carry every entry in the single canonical schema with stable identifiers, one status encoding, and honest headers

**Independent Test**: Open TODO.md and TOFIX.md and verify per US1 acceptance scenarios: required fields present, unique IDs, exactly one status encoding, legend matches real schema, checked state agrees with status marker

### Implementation for User Story 1

- [x] T003 Rewrite the TODO.md header: title, role note pointing to ROADMAP.md (task queue references path slugs, never restates scope), and the honest legend from contracts/backlog-format.md — the schema field table, the canonical status encoding pairs (`[x]✅` done / `[ ]🟡` in progress / `[ ]⬜` not started / `[ ]🚫` closed), no version header, no promised-but-absent fields (FR-003, FR-009)
- [x] T004 Migrate the Major and Minor sections of TODO.md to the schema: assign `T-###` identifiers in document order, convert every entry to the canonical checkbox+emoji encoding, ensure each entry carries scope (what and for whom) and dependencies or explicit "none", keep the roadmap slug references added by feature 001, preserve all completed entries as `done` and all open work unchanged in meaning (FR-001, FR-002, FR-005; baseline from T002)
- [x] T005 Migrate the Localization, LLM Support, and Verification Backlog sections of TODO.md the same way (T-### identifiers, canonical encoding, required fields; baseline from T002)
- [x] T006 [P] Migrate TOFIX.md to the schema: remove the Version/Last-updated header and the DONE legend row, add the role note from contracts/backlog-format.md, assign `F-###` identifiers to every open defect in document order per severity section, restructure each entry to `### F-### — Name` with `**Area:**`, `**Evidence:**`, `**Recommendation:**` fields, remove non-actionable informational entries per research D7 (FR-001, FR-006, FR-007, FR-009)
- [x] T007 Manual conformance audit of TODO.md and TOFIX.md per US1 acceptance scenarios: every entry has unique identifier and required fields; exactly one status encoding exists (no `[/]`, no "(in progress)" suffixes, no bare checkboxes); checked entries are `done` and unchecked are not; legend matches actual fields; record the open-entry counts and compare against the T002 baseline — zero open items lost

**Checkpoint**: User Story 1 delivers a readable, drift-free backlog; MVP reached

---

## Phase 4: User Story 2 — Format Drift Is Caught Automatically (Priority: P2)

**Goal**: The standard verification flow fails on any schema violation and passes silently on conforming files

**Independent Test**: Introduce each FR-010 violation into a scratch copy, run `yarn validate:backlog`, observe a non-zero exit naming file, line, code, and rule; revert and observe a pass (quickstart Scenario 2)

### Implementation for User Story 2

- [x] T008 Implement scripts/validate-backlog.ts per contracts/backlog-format.md: Markdown parsers for TODO.md and TOFIX.md following the entry grammar; violation rules `E-ID-DUP`, `E-ID-FMT`, `E-STATUS-VAL`, `E-STATUS-AGREE`, `E-FIELD-MISSING`, `E-SECT-UNKNOWN`, `E-SLUG-DANGLING` (cross-checks ROADMAP.md overview slugs), `E-SCOPE-OVERLAP` (≥8-consecutive-word normalized overlap with roadmap scope sentences); CLI contract — output `<file>:<line>: <code>: <message>` per violation then `N violations` summary, exit 0 conforming / 1 violations / 2 missing input; deterministic, no writes, no network; TypeScript strict, no `any`, sibling-validator conventions (FR-010, research D1, D5)
- [x] T009 [P] Write tests/backlog-format/validate-backlog.test.ts: fixture-based vitest suite with one conforming fixture (expects pass) and one fixture per violation category (expects fail with the expected code and message naming file/entry/rule), asserting on rule behavior; fixtures inline in the test file (FR-010, research D8)
- [x] T010 [P] Wire package.json: add `"validate:backlog": "node --import tsx scripts/validate-backlog.ts"` and append `yarn validate:backlog` to the `verify:fast` chain so it reads `yarn lint && yarn typecheck && yarn validate:backlog` (research D1)
- [x] T011 Run `yarn validate:backlog` against the migrated TODO.md and TOFIX.md — must exit 0 with no violations; fix any residual schema violations found in the migrated files and re-check the T002 baseline

**Checkpoint**: User Stories 1 AND 2 both hold — the backlog is conforming and the gate is live

---

## Phase 5: User Story 3 — Raw Input Is Normalized Into the Canonical Form (Priority: P3)

**Goal**: A fresh agent session can turn messy input into conforming entries, asking only about missing required fields

**Independent Test**: Give the agent two raw inputs (complete bug report; idea missing "who it serves") and verify quickstart Scenario 3 behavior: conforming entry untouched by the validator; exactly one question about the missing required field

### Implementation for User Story 3

- [x] T012 Create .agents/skills/backlog/SKILL.md: when to load (editing TODO.md/TOFIX.md, normalizing raw input, recording backlog items), the entry grammar by reference to specs/002-todo-tofix-format/contracts/backlog-format.md (never redefining it), the normalization procedure (detect target file and section; fill required fields; ask only for missing required fields; park input without answers; direct path-level intent to ROADMAP.md intake per its entry rules), and the statement that the validator is the executable truth (FR-011, FR-012, research D6)
- [x] T013 Add a backlog row to the Key Skills table in AGENTS.md §7 referencing .agents/skills/backlog/SKILL.md ("editing TODO/TOFIX, normalizing raw input into backlog entries")
- [x] T014 Perform the normalization dry-runs from quickstart Scenario 3 on scratch copies (a complete bug report → conforming F-entry with zero questions; an under-specified idea → exactly one required-field question), confirming results pass `yarn validate:backlog`; do not commit the demo entries into the real files

**Checkpoint**: All user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification and consistency guarantees

- [x] T015 Run the full quickstart.md pass (Scenarios 1–5) and record results
- [x] T016 Run `yarn verify:fast` end-to-end and confirm the backlog stage is part of the chain and passes (lint covers Prettier check on the edited files)
- [x] T017 Consistency review across the three mirrors of the schema — scripts/validate-backlog.ts (executable truth), specs/002-todo-tofix-format/contracts/backlog-format.md, .agents/skills/backlog/SKILL.md — confirming no rule exists in one mirror only, per FR-012

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational; US2's validator (T008–T011) must run against the migrated files from US1, so run stories in priority order P1 → P2 → P3
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational — no dependencies on other stories
- **User Story 2 (P2)**: Validator gate runs against US1's migrated files (T011) — follows US1
- **User Story 3 (P3)**: Skill documents the grammar the validator enforces — follows US2 so the dry-runs (T014) can use the live gate

### Within Each User Story

- Headers before entry bodies (US1); parser before its tests (US2); skill before dry-runs (US3)
- Each story ends with its independent test as the story's verification

### Parallel Opportunities

- T004/T005 (TODO.md sections) are content-independent but same-file — sequential by convention
- T006 (TOFIX.md) is file-independent of T004/T005 — marked [P]
- T009 (test file) and T010 (package.json) are file-independent of each other, both after T008 — marked [P]

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (baseline blocks migration)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: manual conformance audit (T007)
5. The backlog is already consistent even before the gate exists

### Incremental Delivery

1. Baseline + US1 → schema-conformant backlog (MVP)
2. US2 → violations become merge-blocking
3. US3 → raw input normalizes without re-interviewing
4. Polish → end-to-end guarantees recorded

### Notes

- The validator is the executable schema owner; the contract doc and the skill are derived mirrors (FR-012) — any rule change lands in one review across all three
- Do not drop open work during migration; the T002 baseline is the completeness proof
- Commit after each story checkpoint; stop at any checkpoint to validate the story independently
