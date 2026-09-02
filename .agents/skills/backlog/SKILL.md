---
name: backlog
description: Editing TODO.md/TOFIX.md or normalizing raw input into backlog entries. Read before touching the backlog files or recording new tasks/defects.
---

# TTGamer Backlog (TODO/TOFIX)

## Scope and authority

- `TODO.md` is the execution task queue; `TOFIX.md` is the queue of open defects found
  outside feature cycles. Path-level product intent lives only in `ROADMAP.md` — tasks
  reference paths by slug and never restate their scope.
- The **executable truth** of the entry format is `scripts/validate-backlog.ts`
  (`yarn validate:backlog`). The normative grammar mirror is
  `specs/002-todo-tofix-format/contracts/backlog-format.md`. This skill teaches _when
  and how_; it never redefines the schema.
- Defects discovered while implementing a feature belong to that feature's task list —
  `TOFIX.md` only receives issues found outside a feature cycle.

## Task entry grammar (TODO.md)

`- [x| ] <emoji> **T-### — Name** (dependencies or "none") — <scope: what becomes
possible and for whom>[ (task for roadmap path \`slug\`[, \`slug\`])]`

- Status is the checkbox + emoji pair, and the pair must agree:
  `[x] ✅` done · `[ ] 🟡` in progress · `[ ] ⬜` not started · `[ ] 🚫` closed
  (the body names declined/superseded and why).
- Illegal: `[/]`, a bare checkbox without emoji, parenthetical status suffixes like
  "(in progress)", per-entry priority values (priority = section grouping only).
- Identifiers: next free `T-###` in the file; never reuse or renumber; gaps are
  permanent.

## Defect entry grammar (TOFIX.md)

`### F-### — Name` under exactly one severity section (`🟠 Critical` / `🟡 High` /
`🟢 Medium` / `⬜ Low` — the section IS the severity), with three required fields:
`**Area:**`, `**Evidence:**` (observable symptom), `**Recommendation:**`.

- No lifecycle status: an entry is open until its fix ships; the fix removes the entry
  in the same review (the commit and release summary are the durable record).

## Normalizing raw input

1. Classify the input: executable task → `TODO.md`; defect/quality issue → `TOFIX.md`;
   path-level product intent → `ROADMAP.md` intake (per its entry rules), not the
   backlog.
2. Pick the target section: task area group by topic; defect severity by impact
   (Critical: data loss/crash/major UX; High: significant smell; Medium: minor quality;
   Low: nitpick).
3. Fill every required field from the input. Ask clarifying questions **only** when a
   required field cannot be filled (what the work is, who it serves, what it depends
   on). Optional fields (effort, impact, open questions) are never a reason to ask.
4. If required information is unavailable, do not write the entry and do not guess —
   park the input until the answer exists.
5. Validate the result: `yarn validate:backlog` must pass. For scratch rehearsals the
   validator accepts explicit paths: `node --import tsx scripts/validate-backlog.ts
<todo> <tofix> <roadmap>`.
