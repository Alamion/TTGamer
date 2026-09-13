# Research: TODO/TOFIX Backlog Format Standardization

**Feature**: 002-todo-tofix-format | **Date**: 2026-09-02

All decisions below are derived from repository evidence (existing validators, verification chain, current backlog files, feature-001 history). No external research required.

## D1 — Validator home, runner, and wiring

**Decision**: `scripts/validate-backlog.ts`, executed as `yarn validate:backlog` (`node --import tsx scripts/validate-backlog.ts`), appended to the `verify:fast` chain (`lint && typecheck && validate:backlog`).

**Rationale**: Sibling validators (`validate-data.ts`, `validate-i18n.ts`, `check-version.ts`) establish the pattern — TypeScript under `scripts/`, run through `tsx`, exposed as a `validate:*` npm script. Wiring into `verify:fast` makes it part of the "standard verification flow" (FR-010) with the tightest feedback loop: the pre-commit hook runs the fast verifier on feature branches, so drifted backlog content is blocked before merge, not at CI.

**Alternatives considered**:

- CI-only check — rejected: feedback arrives after push; drift survives locally.
- Standalone command only (not in `verify:fast`) — rejected: "standard flow" must include it, or compliance depends on memory (the failure mode this feature exists to fix).
- ESLint custom plugin for the two files — rejected: a lint plugin is the wrong shape for multi-line entry grammar; a dedicated parser is clearer and testable.

## D2 — Identifier format and assignment

**Decision**: Prefixed sequential codes: `T-001`… (`TODO.md`), `F-001`… (`TOFIX.md`). Initial assignment follows document order during migration. New entries take the next free number per file; removed entries leave permanent gaps.

**Rationale**: Matches the spec's informed default; short, greppable in commit messages; per-file namespaces avoid collisions if entries ever move between queues. Gaps are the visible proof that renumbering never happens.

**Alternatives considered**:

- Content slugs instead of numbers — rejected: names evolve; 001 gave slugs to _paths_ (stable product concepts), while tasks/defects churn.
- One shared sequence across both files — rejected: no benefit; per-file codes are shorter and unambiguous with the prefix.

## D3 — Canonical status encoding for TODO entries

**Decision**: Each entry is a list item whose checkbox and a legend emoji must agree — the pair IS the status:

| Encoding     | Status                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `- [x] ✅ …` | done                                                                                                            |
| `- [ ] 🟡 …` | in progress                                                                                                     |
| `- [ ] ⬜ …` | not started                                                                                                     |
| `- [ ] 🚫 …` | closed outcome (`declined` / `superseded`; the entry body names which and why; a shipped task is simply `done`) |

**Rationale**: A checkbox alone cannot distinguish "not started" from "in progress" — that gap is exactly what produced the historical `[/]` hack. The emoji legend already exists in the file, so the pair costs nothing new, and the agreement rule (FR-002: "checked state and status marker MUST agree") gives the validator a mechanical check that kills all three historical encodings at once: a bare `[x]` without ✅, a parenthetical "(in progress)", or a `[/]` are all violations.

**Alternatives considered**:

- Emoji-only (drop checkboxes) — rejected: loses GitHub-rendered checkboxes and the agreement property the spec demands.
- Explicit `**Status:** …` text field per entry — rejected: verbose for a per-line list format; the pair is shorter and already conventional here.
- Resurrect `[/]` as the in-progress marker — rejected: nonstandard rendering on GitHub (shows as unchecked), which is how the ambiguity crept in originally.

## D4 — TOFIX structure: severity by section, no lifecycle status

**Decision**: `TOFIX.md` keeps severity sections (`## 🟠 Critical` … `## ⬜ Low`) as the ONLY carrier of severity; each entry is a `### F-### — Name` subsection with fields: affected area, evidence, recommendation. No status field anywhere; the "Version"/"Last updated" header is removed.

**Rationale**: Consistent with FR-004's philosophy (ordering lives in grouping, not fields): the section a defect sits in _is_ its severity, so a separate field would be a second authority. Removing the version header applies feature-001 research D7 (a self-version label that outlived three format generations is decoration). "Last updated" is owned by git history.

**Alternatives considered**:

- Explicit `**Severity:**` field per entry with matching-section enforcement — rejected: duplicates the section, creating the exact drift surface this feature removes.
- Flat file with severity as a field — rejected: loses at-a-glance queue ordering that the current file already provides.

## D5 — Detecting "path scope duplicated from the roadmap" (FR-010)

**Decision**: Two concrete checks against `ROADMAP.md`:

1. **Dangling slug reference** — a backlog entry referencing a slug that does not exist in the roadmap's overview table fails.
2. **Scope-text overlap** — after normalizing whitespace and case, any ≥8-consecutive-word overlap between a backlog entry and any roadmap scope sentence fails.

**Rationale**: FR-010 requires the duplication category to be machine-detected, and these two checks cover the realistic failure modes: pointing at a path that no longer exists, and copy-pasting scope prose. An n-gram check is simple, deterministic, and cheap for two small files.

**Alternatives considered**:

- Embedding-difference/semantic similarity — rejected: non-deterministic, heavy, unjustified for two small files.
- Manual review only — rejected: contradicts FR-010's verifiability.

## D6 — Agent workflow guidance home

**Decision**: New skill `.agents/skills/backlog/SKILL.md` (load when editing `TODO.md`/`TOFIX.md` or normalizing raw input) + one row in `AGENTS.md` §7 Key Skills.

**Rationale**: Constitution governance requires runtime guidance mirrored for agents; the established pattern is `.agents/skills/<domain>/SKILL.md` referenced from the AGENTS.md skills table. The skill defers to the validator as executable truth and to `contracts/backlog-format.md` as the grammar mirror — it teaches _when and how_, never redefines the schema.

**Alternatives considered**:

- Rules only in AGENTS.md — rejected: AGENTS.md is the always-loaded cheat sheet; per-domain detail belongs in lazily loaded skills (existing convention).
- Rules only in the contract doc — rejected: agents need procedural guidance (normalization steps, when to ask), not just grammar.

## D7 — Migration mapping of existing content

**Decision**: Every open item is preserved semantically. `TODO.md`: all five section groups (Major, Minor, Localization, LLM Support, Verification Backlog) remain as area groups; each entry gains `T-###`, the canonical encoding, and keeps its roadmap slug references from feature 001. Completed entries keep their checked state as `done`. The header legend is rewritten to the honest schema. `TOFIX.md`: every open defect gains `F-###` under its severity section; the "✅ DONE" legend row is dropped (fixed entries are removed, not marked — FR-007); "Pre-existing Notes"-style informational entries become `Low` defects or are removed if they record no actionable defect.

**Rationale**: Spec Assumption 1 (nothing open is dropped) + FR-003 (legend matches reality) + FR-007 (queue holds open work only). The current "DONE" row in the TOFIX legend encodes the session-snapshot mentality this feature retires.

**Alternatives considered**: Keeping closed defects in a "Fixed" archive section — rejected: the commit/release summary is the durable record (FR-007); an in-file archive reintroduces the second-authority problem.

## D8 — Validator tests

**Decision**: Fixture-based vitest suite at `tests/backlog-format/validate-backlog.test.ts`: one valid-file fixture (passes) plus one fixture per violation category (fails with the expected message), asserting on rule behavior rather than console output.

**Rationale**: The validator is a merge gate (constitution V: risk-proportional testing — gate logic must be trustworthy). Existing validators are untested, but they postdate the constitution's testing matrix; this new gate should not repeat that. Fixtures make each FR-010 category a named, verifiable behavior.

**Alternatives considered**: No tests (match older validators) — rejected: an untested gate can silently pass everything, defeating the feature's purpose.
