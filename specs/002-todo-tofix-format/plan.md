# Implementation Plan: TODO/TOFIX Backlog Format Standardization

**Branch**: `002-todo-tofix-format` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-todo-tofix-format/spec.md`

## Summary

Give the two backlog files one executable contract: a written entry grammar (stable `T-###`/`F-###` identifiers, single canonical status encoding, honest header legend, severity-only-by-section for defects), a TypeScript validator (`scripts/validate-backlog.ts`, `yarn validate:backlog`) wired into the fast verifier so the five violation categories from FR-010 block merge, targeted vitest tests for the validator rules, and a `backlog` agent skill that implements the raw-input normalization workflow. Both files are migrated to the schema without dropping any open work.

## Technical Context

**Language/Version**: TypeScript (strict) for the validator, executed via `node --import tsx` — the established pattern of sibling validators (`validate-data.ts`, `validate-i18n.ts`, `check-version.ts`). The two backlog files remain plain Markdown.

**Primary Dependencies**: Existing toolchain only — `tsx` (runner), `vitest` (validator tests), `prettier` (formatting). No new dependencies.

**Storage**: Repository files (`TODO.md`, `TOFIX.md`); no runtime data.

**Testing**: Targeted vitest unit tests for validator parsing/rule logic (fixture-based); manual audit scenarios in [quickstart.md](./quickstart.md) for the migrated files and the normalization workflow.

**Target Platform**: Repository contributors and AI agents (tooling runs locally and in CI via the verification scripts).

**Project Type**: Repository tooling + documentation governance. No application code touched.

**Performance Goals**: Validator completes in well under a second for the two current files (dozens of entries).

**Constraints**: Both files remain human-written and editable without special tooling (FR-009); the validator is the single executable schema owner (FR-012); English-only (Constitution 1.1.0); no open work may be dropped during migration.

**Scale/Scope**: 2 files migrated (~40 entries), 1 new script, 1 new test suite, 1 new skill, 2 one-line package.json/AGENTS.md edits.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                                  | Status | Notes                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                   | PASS   | Tooling lives in `scripts/` (established home of repo validators); no `src/` module boundaries touched; the new skill is a standalone `.agents/skills/` document.                                                                                                      |
| II. Explicit Contracts at Boundaries       | PASS   | The backlog format becomes a validated contract with one normative owner (the validator); FR-012's atomic-change rule mirrors the constitution's own governance pattern.                                                                                               |
| III. Pleasurable Cross-Module Interactions | N/A    | No runtime or cross-module interaction.                                                                                                                                                                                                                                |
| IV. Fit-for-Purpose Code Quality           | PASS   | Validator follows sibling conventions: TypeScript strict, no `any`, tsx runner, uncommon comments. Fits the "scripts" quality bar of the constitution's matrix.                                                                                                        |
| V. Risk-Proportional Testing               | PASS   | The validator is a merge gate, so its rule logic gets targeted vitest tests (fixture per violation category); the prose files themselves are validated, not unit-tested. This mirrors the existing split where validators replace hand-written tests for their domain. |
| VI. Consistent, Accessible Experience      | PASS   | English-only files and messages (Constitution 1.1.0); no UI strings.                                                                                                                                                                                                   |
| VII. Performance as a Shared Budget        | PASS   | No bundle impact; `verify:fast` grows by a sub-second two-file check.                                                                                                                                                                                                  |

**Post-Phase 1 re-check**: PASS — design added no surfaces beyond the planned layout; violation codes and grammar are internal to the repo tooling.

## Project Structure

### Documentation (this feature)

```text
specs/002-todo-tofix-format/
├── plan.md                    # This file
├── research.md                # Phase 0 output
├── data-model.md              # Phase 1 output
├── contracts/
│   └── backlog-format.md      # Phase 1 output — entry grammar + violation codes
├── checklists/                # Pre-existing spec quality checklist
└── tasks.md                   # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
scripts/validate-backlog.ts     # NEW — executable schema owner: parses both files, checks FR-010 categories, exit 1 on violation
package.json                    # EDIT — add "validate:backlog" script; append it to "verify:fast"
TODO.md                         # EDIT — migrate all entries to the schema: IDs, canonical status encoding, honest header legend
TOFIX.md                        # EDIT — migrate all entries to the schema: IDs, no version header, no lifecycle status
.agents/skills/backlog/SKILL.md # NEW — agent workflow: when loaded, how to write/normalize entries per the grammar
AGENTS.md                       # EDIT — one row in the Key Skills table pointing at the new skill
tests/backlog-format/
  validate-backlog.test.ts      # NEW — fixture-based tests: one per violation category + valid-file pass cases
```

**Structure Decision**: The validator is the single normative owner of the schema (executable truth); `contracts/backlog-format.md` is its derived human/agent-readable mirror — kept in sync in the same review (FR-012); the skill defers to both. The two backlog files remain data, not code.

## Complexity Tracking

> No Constitution Check violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
