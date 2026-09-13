---
description: 'Task list for Custom Character Page Templates (split into per-phase files)'
---

# Tasks: Custom Character Page Templates

**Input**: Design documents from `/specs/003-custom-sheet-templates/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Tests**: Included deliberately — Constitution V (Risk-Proportional Testing) mandates round-trip, import, and migration tests for schema/persistence work, and `contracts/store-and-envelope.md` §Testing gates lists them. Schema/persistence edits require the `yarn verify` tier.

> **Post-review amendments (2026-09-03)**: after these 40 tasks completed, the shared-value
> store + system-scoping review ([clarifications-shared-values.md](./clarifications-shared-values.md),
> checklist `checklists/shared-values.md` 32/32) added FR-25–FR-29. They were implemented with
> their own tests (migration v2→v3 flattening, cross-template shared `valueKey`, FR-27
> editor feedback — see `tests/sheet_manager/shared-values.test.tsx`,
> `document-template-values.test.ts`, `template-editor.test.tsx`) and re-verified by the
> live walkthrough (`tests/e2e/walkthrough.cjs`).

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered independently. Task lists live in per-phase files; numbering is sequential across all files (T001–T040).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: the user story from spec.md the task belongs to (US1–US4)
- Every description carries the exact file path(s) to touch

## Phase Index

| Phase                                  | File                                                                         | Tasks     | Scope                                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| 1. Setup + 2. Foundational             | [tasks/phase-1-setup-foundational.md](./tasks/phase-1-setup-foundational.md) | T001–T011 | Baseline, shared contracts: binding schema, value bag + migration, library store, view resolution, store tests |
| 3. US1 — Author a template (P1) 🎯 MVP | [tasks/phase-2-us1.md](./tasks/phase-2-us1.md)                               | T012–T017 | Skeletons, editor dialog, library UI, en/ru strings, editor tests                                              |
| 4. US2 — Use as character page (P2)    | [tasks/phase-3-us2.md](./tasks/phase-3-us2.md)                               | T018–T025 | Field controls, declarative renderer + hook, page routing, selector merge, renderer tests                      |
| 5. US3 — Catalog-backed auto-fill (P2) | [tasks/phase-4-us3.md](./tasks/phase-4-us3.md)                               | T026–T031 | Binding registry, binding editor, copy-on-select runtime, degradation, runtime tests                           |
| 6. US4 — Import/export JSON (P3)       | [tasks/phase-5-us4.md](./tasks/phase-5-us4.md)                               | T032–T036 | Transfer module, export/import wiring, conflict flow, contract tests                                           |
| 7. Polish & cross-cutting              | [tasks/phase-6-polish.md](./tasks/phase-6-polish.md)                         | T037–T040 | i18n gates, a11y audit, backlog/AGENTS.md mirror, quickstart walkthrough + `yarn verify`                       |

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T002)**: no dependencies, start immediately
- **Foundational (T003–T011)**: BLOCKS all user stories — contract edits and stores land first
- **US1 (T012–T017)**: needs foundational T003, T006 — deliverable alone (MVP)
- **US2 (T018–T025)**: needs foundational T004–T008; testable against US1's saved templates or fixtures
- **US3 (T026–T031)**: needs T003 + US1's editor (T014) + US2's renderer/hook (T019–T021) — both are earlier priority stories
- **US4 (T032–T036)**: needs T003 + US1's library dialog (T015); also evaluates bindings via US3's registry (T026)
- **Polish (T037–T040)**: after all desired stories are complete

### Story dependency graph

```text
Setup ──► Foundational ──► US1 (P1) ──► US2 (P2) ──► US3 (P2) ──► US4 (P3) ──► Polish
                 │                                            ▲
                 └──────────── US1 can start with T003/T006 ──┘ (US3/US4 integrate earlier stories)
```

US1–US4 remain independently testable: US2 renders any saved template (fixture if US1 UI absent); US3's runtime works against registry data; US4 round-trips definitions without rendering.

### Within each story

- Tests for the story run after its implementation tasks in the same phase (contract/registration tests like T027/T033 pair with their module task)
- Data/registry → runtime/UI → wiring → strings → story tests
- Story complete before advancing to the next priority

## Parallel Opportunities

- Within foundational: T003, T004, T006, T008 are independent files ([P] marked); T005→T007 sequential on the envelope
- Across stories: US1 (editor flow) and US2 (renderer) share no files — different agents can run them simultaneously after foundational
- US3's registry tests (T027) run while the binding editor (T028) is built; US4's module + tests (T032, T033) parallelize before dialog wiring
- All test tasks marked [P] can run alongside neighboring implementation tasks once their subject exists

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 + Phase 2 (setup + foundational)
2. Phase 3 (US1) → **STOP and VALIDATE** (author/save/duplicate/delete works; `yarn verify`)
3. Ship or demo — templates exist even though nothing renders them yet

### Incremental Delivery

- +US2 → templates become usable character pages (the visible payoff)
- +US3 → pages connect to game data via catalogs
- +US4 → templates become shareable artifacts
- Each increment keeps prior stories green; `yarn verify` at each checkpoint

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps to spec.md user stories for traceability
- Checkpoints after each story phase — validate independently before proceeding
- Commit after each task or logical group
- YAML chrome strings live only in `translations/source/{en,ru}/ui/sheet/templates.yaml`; never edit generated `ttgamer.*` entries
- Deferred (documented in T039): draft auto-recovery, per-binding live-linked mode, embedding built-in interactive blocks
