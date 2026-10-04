---
name: "ttg-speckit-plan"
description: "Write the feature's one design note (design.md) from its spec. (TTGamer lean process)"
metadata:
  author: "ttgamer, adapted from github-spec-kit"
---

## User Input

```text
$ARGUMENTS
```

Consider the input before proceeding (it may name constraints or choices).

## Steps

1. **Locate** the feature: `.specify/feature.json` → `feature_directory`; require `spec.md`.
   Stop if a `[NEEDS CLARIFICATION]` marker remains (suggest `/ttg-speckit-clarify`).
2. **Read** the spec, the constitution principles, and the current-state guidance the feature
   touches (root `AGENTS.md`, module `AGENTS.md`, the relevant `.agents/skills/*` index and only
   the references it points to for this area).
3. **Investigate** the code the feature changes: confirm file names, existing patterns, and
   measurements (run commands or tests when a decision depends on a number). Prefer extending
   an existing module or element over a new one (UI rules in `src/sheet_manager/AGENTS.md`).
4. **Write `design.md`** in the feature folder from `.specify/templates/design-template.md`, at
   most ~150 lines:
   - Approach and delivery order.
   - Decisions, each with the reason and the rejected alternative.
   - Changed types and data: schemas, stores, persisted shapes, translations, with migration
     notes.
   - Principles at risk, and how the design keeps each.
   - The test list.
   - Manual walk steps with expected results.

   Do not write `plan.md`, `research.md`, `data-model.md`, `contracts/`, or `quickstart.md`.
5. **Prototype** only when the UI layout is unknown: one screen, outside `specs/` (scratchpad or
   `context/`), shown to the maintainer before tasks.
6. **Gate**: a design that breaks a constitution principle is changed, or the conflict is put to
   the maintainer as a question; never proceed silently.

Do not commit (the planning commit is made by `/ttg-speckit-tasks`).

## Report

The design path, the key decisions in a few lines, open questions, and the next step:
`/ttg-speckit-tasks`. Reply in the maintainer's language.
