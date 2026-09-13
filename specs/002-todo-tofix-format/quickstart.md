# Quickstart: TODO/TOFIX Backlog Format Standardization

**Feature**: 002-todo-tofix-format | **Date**: 2026-09-02

Validation scenarios proving the feature end-to-end. Prerequisites: repository checkout with the feature applied; `TODO.md`, `TOFIX.md`, `ROADMAP.md` at repo root.

## Scenario 1 — Schema conformance audit (SC-001)

1. Run `yarn validate:backlog` — expect exit 0, no violations.
2. Open `TODO.md` and `TOFIX.md`: every entry carries an identifier (`T-###` / `F-###`), required fields, and the single canonical status encoding.
3. Confirm the historical encodings are gone: search both files for `[/]` and `(in progress)` — expect zero matches; confirm `TOFIX.md` has no Version header and no DONE legend row.

**Expected**: 100% conformance; zero legacy encodings.

## Scenario 2 — Violation detection (SC-002, FR-010)

For each violation category, in a scratch copy: introduce the violation, run `yarn validate:backlog`, confirm a non-zero exit with a message naming file, line, code, and rule; then revert.

| Step | Introduced violation                             | Expected code     |
| ---- | ------------------------------------------------ | ----------------- |
| 1    | Duplicate a `T-###` identifier                   | `E-ID-DUP`        |
| 2    | Remove an entry's identifier                     | `E-ID-FMT`        |
| 3    | Write `- [x]` without ✅ on a task               | `E-STATUS-AGREE`  |
| 4    | Delete a defect's `**Evidence:**` field          | `E-FIELD-MISSING` |
| 5    | Reference slug `campaign` (not `campaigns`)      | `E-SLUG-DANGLING` |
| 6    | Paste a roadmap scope sentence into a TODO entry | `E-SCOPE-OVERLAP` |

**Expected**: every category detected deterministically in the same session; conforming copy passes silently.

## Scenario 3 — Normalization workflow (SC-003, US3)

1. Hand the agent a deliberately messy input, e.g. "the dice history loses rolls when you reopen the app, saw it twice yesterday".
2. Confirm the agent produces a `TOFIX.md` entry (`F-###`, severity section, area, evidence, recommendation) that passes `yarn validate:backlog` untouched, with zero questions asked.
3. Hand an input missing a required piece, e.g. "add some kind of stats page" (who is it for?) — confirm exactly one clarifying question about the missing required field, not about optional ones.

**Expected**: conforming entry in under 2 minutes; questions map only to unfilled required fields.

## Scenario 4 — Standard verification flow integration (FR-010)

1. Run `yarn verify:fast` — expect it to include the backlog check (lint → typecheck → `validate:backlog`).
2. Introduce a violation in `TODO.md`, re-run `yarn verify:fast` — expect failure originating from the backlog stage.

**Expected**: drift cannot pass the standard flow; no separate memory-dependent step exists.

## Scenario 5 — Agent guidance is discoverable (US3, FR-012)

1. Open `.agents/skills/backlog/SKILL.md` — confirm it covers: when to load, entry writing per the grammar, normalization procedure, and the ask-only-for-required rule.
2. Confirm `AGENTS.md` §7 lists the skill, and `contracts/backlog-format.md` matches the validator's behavior (codes, grammar) — same review, no divergence.

**Expected**: a fresh agent session can write conforming entries without re-deriving rules.

## Related artifacts

- Entry grammar, violation codes, CLI contract: [contracts/backlog-format.md](./contracts/backlog-format.md)
- Entities and violation model: [data-model.md](./data-model.md)
- Decisions: [research.md](./research.md)
