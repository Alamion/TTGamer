---
name: "ttg-speckit-tasks"
description: "Generate tasks.md from the spec and design, then commit the planning documents. (TTGamer lean process)"
metadata:
  author: "ttgamer, adapted from github-spec-kit"
---

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Locate** the feature via `.specify/feature.json`; require `spec.md` and `design.md`.
2. **Write `tasks.md`** from `.specify/templates/tasks-template.md`:
   - One phase per user story in delivery order (priority, unless the design orders it
     otherwise and says why); a Foundation phase only for work every story needs.
   - Each task: `- [ ] T### [US#] Description with the exact file path`, specific enough to do
     without re-reading the design. Test tasks first where the change has logic.
   - Each story ends with a task to run the checks for its size (`AGENTS.md` §11) and commit it.
   - A Finish phase: guidance updates (one owner per rule), user guide en + ru if behavior is
     visible, backlog entry, `yarn verify:full`, and the manual walk from `design.md`.
   - No parallel-execution examples, no delivery-strategy section.
3. **Map coverage** yourself: every FR and SC has a task, or the task list says why it is
   measured elsewhere. Fix gaps before committing.
4. **Commit** the planning documents (spec, design, tasks) in one commit:
   `docs(specs): spec NNN <short name> — spec, design, tasks`.

## Report

Task count per story, any requirement not covered, and the next step: `/ttg-speckit-analyze`
when the spec has four or more stories (or the maintainer asks), otherwise
`/ttg-speckit-implement`. Reply in the maintainer's language.
