---
name: "ttg-speckit-analyze"
description: "Read-only consistency check of spec.md, design.md, and tasks.md before implementation. (TTGamer lean process)"
metadata:
  author: "ttgamer, adapted from github-spec-kit"
---

## User Input

```text
$ARGUMENTS
```

## When to run

Run it for specs with four or more user stories, or when the maintainer asks. Otherwise say it is
not needed and suggest `/ttg-speckit-implement`.

## Rules

- **Read-only**: change no file. Report, then offer fixes; edit only after the maintainer agrees.
- The constitution (`.specify/memory/constitution.md`) is authoritative: a conflict with a MUST is
  CRITICAL and is fixed in the spec, design, or tasks, never by reinterpreting the principle.

## Steps

1. **Locate** the feature via `.specify/feature.json`; read `spec.md`, `design.md`, and `tasks.md`,
   plus the constitution principles.
2. **Inventory**: FRs and SCs (keep their ids), stories, decisions, and tasks with their stories.
3. **Detect** (at most 30 high-signal findings):
   - **Coverage**: an FR or buildable SC without a task; a task without a requirement.
   - **Inconsistency**: terms, files, or commands named differently across the three documents;
     task order against stated dependencies; a decision the tasks contradict.
   - **Ambiguity**: vague adjectives without a measure; placeholders.
   - **Constitution**: a principle at risk that the design does not address; a missing gate.
   - **Duplication**: requirements that say the same thing.
4. **Severity**: CRITICAL (constitution MUST, or a requirement with no coverage that blocks the
   feature); HIGH (conflict, untestable criterion); MEDIUM (drift, missing non-functional
   coverage); LOW (wording).

## Report

1. A findings table: id, category, severity, location, summary, recommendation.
2. A coverage table: requirement → task ids.
3. The counts.
4. The next step: fix CRITICAL first; MEDIUM/LOW may be fixed in one small edit before
   implementing.

Ask whether to apply the fixes. Reply in the maintainer's language.
