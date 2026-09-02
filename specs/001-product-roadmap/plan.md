# Implementation Plan: TTRPG Product Roadmap

**Branch**: `001-product-roadmap` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-product-roadmap/spec.md`

## Summary

Create `ROADMAP.md` at the repository root: a human-written, English-only document that records the thirteen product enhancement paths as business outcomes, each identified by a stable slug with status, indicative priority, plain-language scope, intended users, dependencies, and open questions. Path-level intent currently embedded in `TODO.md` migrates into the roadmap; `TODO.md` remains the execution task queue and references path slugs instead of restating scope (FR-013). No runtime code, no tooling: the backlog-format/validator feature is a separate future feature.

## Technical Context

**Language/Version**: Markdown (repository documentation). English-only per FR-015 and Constitution 1.1.0 language-split rule.

**Primary Dependencies**: None. No build tooling, generator, or validator is added in this feature (deliberately deferred to the future backlog-format feature).

**Storage**: Git-versioned repository files at the repo root (alongside `TODO.md`, `TOFIX.md`, `AGENTS.md`).

**Testing**: No automated tests. Verification is review plus the manual audit scenarios in [quickstart.md](./quickstart.md), mapped to SC-001..004.

**Target Platform**: Repository readers — product owner, contributors, AI agents (human/agent-readable document; not served by the site).

**Project Type**: Documentation artifact.

**Performance Goals**: N/A (root markdown file; not bundled or served by the site).

**Constraints**: Human-written and editable without special tooling (FR-005); records intent, scope, dependencies, and status only — never machine-readable facts owned elsewhere (FR-006); paths are business outcomes, never scoped by code modules (FR-012); stable slugs, never renumbered (FR-014); English only (FR-015).

**Scale/Scope**: One new root file, 13 path entries, targeted edits to `TODO.md` (slug references + removal of migrated path-level scope text).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                                  | Status | Notes                                                                                                                                                                                                                 |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                   | PASS   | No module code touched. Deliverable is a repo-root artifact alongside `TODO.md`/`TOFIX.md`/`AGENTS.md`; the `docs/` + `i18n/` module is untouched.                                                                    |
| II. Explicit Contracts at Boundaries       | PASS   | Roadmap records intent/status only and defers owned facts (version → `package.json`, releases → `CHANGELOG.md`) per FR-006. `TODO.md` ownership split implemented per FR-013.                                         |
| III. Pleasurable Cross-Module Interactions | N/A    | No runtime or cross-module interaction in this feature.                                                                                                                                                               |
| IV. Fit-for-Purpose Code Quality           | PASS   | Markdown quality bar: Prettier-formatted, consistent heading hierarchy, slug-anchored sections. Plain markdown (not MDX) because the file is not part of the served docs module.                                      |
| V. Risk-Proportional Testing               | PASS   | Documentation change: verification via review + manual audit (quickstart scenarios). Automated backlog validation is deliberately deferred to the future backlog-format feature; no tests are hand-written for prose. |
| VI. Consistent, Accessible Experience      | PASS   | English-only per FR-015 and Constitution 1.1.0. No UI strings introduced.                                                                                                                                             |
| VII. Performance as a Shared Budget        | PASS   | Root markdown file; not imported, bundled, or served. No `verify:full` trigger (no config/dependency/route/generated-CSS change).                                                                                     |

**Post-Phase 1 re-check**: PASS — design produced no new surfaces beyond the planned file layout; `contracts/` skipped as N/A (see Project Structure).

## Project Structure

### Documentation (this feature)

```text
specs/001-product-roadmap/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── checklists/          # Pre-existing spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

No source code is produced. The deliverable touches repository-root documentation files only:

```text
ROADMAP.md               # NEW — the roadmap document (the feature's deliverable)
TODO.md                  # EDIT — path-level scope text migrates to ROADMAP.md; remaining tasks reference path slugs (FR-013)
TOFIX.md                 # unchanged (out of scope)
AGENTS.md                # unchanged (language rule already mirrored, Constitution 1.1.0)
```

**Structure Decision**: A single root-level markdown document. Root placement (not `docs/`) because the roadmap is contributor-facing intent, not end-user documentation, and must not enter the docs i18n parity flow (FR-015). Root placement (not `specs/NNN-*`) because specs are per-feature lifecycle artifacts, while the roadmap is a living, standing document. `contracts/` is skipped: the deliverable exposes no external interface — it is an in-repo document consumed by humans and agents.

## Complexity Tracking

> No Constitution Check violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
