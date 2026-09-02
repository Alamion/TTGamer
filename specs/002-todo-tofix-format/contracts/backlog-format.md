# Contract: Backlog Entry Format

**Feature**: 002-todo-tofix-format | **Date**: 2026-09-02

**Ownership**: `scripts/validate-backlog.ts` (`yarn validate:backlog`) is the **executable truth** of this contract. This document is its derived, human/agent-readable mirror — any change lands in the same review on both sides (spec FR-012). The agent skill (`.agents/skills/backlog/SKILL.md`) defers to this contract and to the validator; it never redefines the schema.

## Consumers

- Humans editing `TODO.md` / `TOFIX.md` by hand.
- Agents normalizing raw input into entries (`.agents/skills/backlog/SKILL.md`).
- The verification flow (`yarn verify:fast`), which fails on any violation below.

## TODO.md entry grammar

File header: title, role note (roadmap pointer), honest legend describing exactly the schema below. No version header.

Area sections: `### <Area name>` (current groups: Major, Minor, Localization, LLM Support, Verification Backlog). Section membership is the only priority ordering.

Entry (one list item + optional sub-bullets):

```markdown
- [ ] 🟡 **T-### — <Name>** (<dependencies or "none">) — <scope: what becomes possible and for whom>[ (task for roadmap path `<slug>`[, `<slug>`])]
    - <optional detail: effort / impact / open questions / evidence>
```

Status encoding — the checkbox + emoji pair must agree:

| Pair       | Status                                                        |
| ---------- | ------------------------------------------------------------- |
| `- [x] ✅` | done                                                          |
| `- [ ] 🟡` | in progress                                                   |
| `- [ ] ⬜` | not started                                                   |
| `- [ ] 🚫` | closed (`declined` / `superseded` — body names which and why) |

Illegal encodings (auto-detected): `[/]`, bare checkbox without emoji, emoji without checkbox, parenthetical status suffixes like "(in progress)", per-entry priority values.

## TOFIX.md entry grammar

File header: title, role note ("queue of open defects found outside feature cycles; fixed entries are removed in the same review"). No version header, no DONE legend row.

Severity sections (the only severity carrier): `## 🟠 Critical` / `## 🟡 High` / `## 🟢 Medium` / `## ⬜ Low`.

Entry:

```markdown
### F-### — <Name>

**Area:** <affected area>

**Evidence:** <observable symptom or concrete observation>

**Recommendation:** <suggested direction>
```

Illegal: lifecycle status of any kind, entry outside a severity section, "Fixed/DONE" archive sections, version/last-updated headers.

## Identifier rules

- Format: `T-\d{3,}` in TODO, `F-\d{3,}` in TOFIX; unique per file.
- Assigned once (migration order, then next free number); retired identifiers are never reassigned; gaps are permanent.

## Violation codes (validator output)

| Code              | Meaning                                                                                | Typical fix                                           |
| ----------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `E-ID-DUP`        | identifier used twice in one file                                                      | re-identify the newer entry with the next free number |
| `E-ID-FMT`        | missing/malformed identifier at the entry anchor                                       | add/repair `T-###` / `F-###`                          |
| `E-STATUS-VAL`    | status emoji outside the legend or missing                                             | use a legend pair                                     |
| `E-STATUS-AGREE`  | checkbox/emoji disagreement or legacy encoding                                         | align pair; replace `[/]` / text suffixes             |
| `E-FIELD-MISSING` | required field absent (task: scope/dependencies; defect: area/evidence/recommendation) | fill the field or write explicit "none"               |
| `E-SECT-UNKNOWN`  | entry outside a known section                                                          | move under a declared section                         |
| `E-SLUG-DANGLING` | referenced roadmap slug does not exist                                                 | fix the slug or update the roadmap first              |
| `E-SCOPE-OVERLAP` | ≥8-word overlap with roadmap scope prose                                               | replace restated scope with the slug reference        |

## Validator CLI contract

- Command: `yarn validate:backlog` (also runs as part of `yarn verify:fast`).
- Input: `TODO.md`, `TOFIX.md`, `ROADMAP.md` (for slug and overlap checks) at repo root.
- Output: one line per violation — `<file>:<line>: <code>: <message naming entry and rule>` — then a summary `N violations`.
- Exit codes: `0` = conforming; `1` = one or more violations; `2` = input file missing.
- Deterministic: same input → same output, no network, no writes.
