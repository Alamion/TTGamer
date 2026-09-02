# Tasks: TTRPG Product Roadmap

**Input**: Design documents from `/specs/001-product-roadmap/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: No automated tests — this is a documentation feature. Verification runs the manual scenarios in `quickstart.md`; those runs are scheduled as explicit tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Documentation feature: deliverables are repository-root files (`ROADMAP.md`, `TODO.md`) plus feature artifacts under `specs/001-product-roadmap/`. No source code, no `src/`/`tests/` layout.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm inputs before any file is written

- [x] T001 Read design decisions D1–D7 in specs/001-product-roadmap/research.md and confirm feature artifacts (spec.md, plan.md, data-model.md, quickstart.md) are present and current

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The roadmap skeleton blocks every user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Create ROADMAP.md skeleton at repository root per research.md D1–D4: header note (document role, relationship to TODO.md per FR-013, status vocabulary, offline-first note), overview table with 13 slug rows (slug, path, status, priority), and 13 empty `### <slug> — <Name>` section headings using the slug registry (D4)

**Checkpoint**: Skeleton exists — user story work can begin

---

## Phase 3: User Story 1 — Roadmap Captured as Single Source of Truth (Priority: P1) 🎯 MVP

**Goal**: Every planned enhancement path is written down in one place with status and readable description

**Independent Test**: Open ROADMAP.md and check that all thirteen enumerated paths appear with a status and a readable description (quickstart Scenario 1); no path scope text remains duplicated in TODO.md (Scenario 4)

### Implementation for User Story 1

- [x] T003 [US1] Fill the Status column of the overview table in ROADMAP.md from the spec Input: `offline-support` done; `multi-system-sheets`, `core-book-docs`, `gm-notes-templates` in progress; the remaining ten paths not started
- [x] T004 [US1] Author path entries 1–5 in ROADMAP.md (`multi-system-sheets`, `character-creation-flow`, `core-book-docs`, `gm-notes-templates`, `offline-support`) with the field list from data-model.md (Status, Priority, Users, Depends on, Scope, Open questions, Notes where dated context exists); scope written as business outcomes in plain language, no code-module names (FR-012)
- [x] T005 [US1] Author path entries 6–10 in ROADMAP.md (`app-packaging`, `note-tree`, `campaigns`, `map-notes`, `note-showcase`) with the same field list
- [x] T006 [US1] Author path entries 11–13 in ROADMAP.md (`multiplayer-groups`, `online-forum`, `llm-integrations`) with the same field list
- [x] T007 [P] [US1] Migrate path-level intent in TODO.md per research.md D6: add a one-line pointer to ROADMAP.md under the intro; on the "WoD (VtM 2e) System Docs" entry replace the "(in progress)" suffix with a `core-book-docs` slug reference; add slug references to "Database + Auth" (prerequisite of `multiplayer-groups`/`online-forum`) and "Multi-system dice pool tabs" (`multi-system-sheets`); remove no task content
- [x] T008 [US1] Run quickstart.md Scenario 1 (coverage 13/13, vocabulary check) and Scenario 4 (no duplication between ROADMAP.md and TODO.md); fix any drift found

**Checkpoint**: User Story 1 delivers a complete standalone roadmap; MVP reached

---

## Phase 4: User Story 2 — Each Path Is Plannable Independently (Priority: P2)

**Goal**: Any single entry carries enough context to seed its own specification session without re-interviewing the owner

**Independent Test**: Pick one entry (e.g. `campaigns`) and confirm scope, users, dependencies, and open questions are all present (quickstart Scenario 2)

### Implementation for User Story 2

- [x] T009 [US2] Add the four separately plannable sub-capabilities to the `llm-integrations` entry in ROADMAP.md per FR-009: note/image generation, dice-rolling support, LLM-driven story narration, LLM-as-player
- [x] T010 [US2] Complete dependency and open-question statements in ROADMAP.md per research.md D5: `campaigns` depends on `note-tree` (open question: archive format and bundle); `multiplayer-groups` depends on `campaigns`; `map-notes` and `note-tree` state their overlap in both entries with dependency direction deferred to planning (spec Edge Case 1); `app-packaging` open question on distribution route
- [x] T011 [US2] Run quickstart.md Scenario 2 against three entries (`campaigns`, `app-packaging`, `llm-integrations`); enrich any entry that fails the zero-re-elicitation test

**Checkpoint**: User Stories 1 AND 2 both hold independently

---

## Phase 5: User Story 3 — Roadmap Stays Truthful Over Time (Priority: P3)

**Goal**: Statuses match product reality and the update workflow keeps them truthful

**Independent Test**: Audit every `done` and `in progress` claim against the current product state (quickstart Scenario 3)

### Implementation for User Story 3

- [x] T012 [US3] Truthfulness audit in ROADMAP.md: verify `offline-support` done-claim corresponds to a working capability and each `in progress` entry (multi-system-sheets, core-book-docs, gm-notes-templates) lists its remaining gaps explicitly; correct any drift found
- [x] T013 [US3] Verify the closed-outcome convention is represented in ROADMAP.md: no path is deleted, vocabulary note documents `shipped`/`declined`/`superseded (by <slug>)`, and dated Notes exist where significant revision context exists (FR-008, Edge Case 2)
- [x] T014 [US3] Run quickstart.md Scenario 3 end-to-end and record the result

**Checkpoint**: All user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Language, formatting, and final validation

- [x] T015 English-only and terminology pass over ROADMAP.md and TODO.md (FR-015, Constitution 1.1.0): no Russian text, slugs used consistently, no code-module names in path scopes
- [x] T016 Run Prettier on the deliverables: `yarn prettier --write ROADMAP.md TODO.md` then `yarn prettier --check ROADMAP.md TODO.md` (quickstart Scenario 6)
- [x] T017 Run the full quickstart.md pass (Scenarios 1–6) and record results in the completion notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational; US2 refines entries authored in US1, US3 audits the result — run in priority order P1 → P2 → P3
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational — no dependencies on other stories
- **User Story 2 (P2)**: Operates on entries created in US1 — follows US1
- **User Story 3 (P3)**: Audits entries from US1/US2 — follows US2

### Within Each User Story

- Overview table before entry bodies (US1)
- Entry authoring before validation scenario runs
- Each story ends with its quickstart scenario as the story's independent test

### Parallel Opportunities

- T004–T006 author disjoint sections of the same file — sequential by convention, content-independent
- T007 (TODO.md) is file-independent of T004–T006 (ROADMAP.md) — marked [P]
- Scenario runs (T008, T011, T014) are single-command checks inside their story's tail

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (skeleton blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart Scenarios 1 and 4
5. The roadmap is already usable as the single source of truth

### Incremental Delivery

1. Skeleton + US1 → roadmap exists, TODO de-duplicated (MVP)
2. US2 → every entry is a planning seed
3. US3 → truthfulness conventions verified
4. Polish → language/format guarantees

### Notes

- This feature produces no code; "tests" are the quickstart scenarios
- Commit after each story checkpoint (reviewer-visible increments per FR-010)
- Stop at any checkpoint to validate the story independently

---

## Phase 7: Convergence

**Purpose**: Remaining work found by assessing the implementation against spec, plan, and tasks (2026-09-02)

- [x] T018 State the new-path intake rule in ROADMAP.md header conventions — a proposed future path is added as a new entry through the same review flow before any planning session references it — per Edge Case 4 (partial)
