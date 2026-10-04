---
name: "ttg-speckit-implement"
description: "Implement tasks.md story by story, committing each story. (TTGamer lean process)"
metadata:
  author: "ttgamer, adapted from github-spec-kit"
---

## User Input

```text
$ARGUMENTS
```

The input may name a story or task range to do; otherwise do all open tasks in order.

## Steps

1. **Locate** the feature via `.specify/feature.json`; read `spec.md`, `design.md`, `tasks.md`,
   the constitution principles, and the guidance the design names. Load a skill's references only
   for the area being changed.
2. **Per story**, in task order:
   - Write the tests first where the change has logic, then the code.
   - Follow the repository conventions (`AGENTS.md` §4–§5; the `typescript` skill before any
     `.ts`/`.tsx` edit).
   - Mark each finished task `[x]` in `tasks.md` as you go.
   - Run the checks for the change size (`AGENTS.md` §11). Failing checks stop the story; fix
     them, never skip or weaken a test to pass (flaky-test policy in §11).
   - Commit the story with its tasks file: `feat|fix|test|chore(scope): <what> (spec NNN, US#)`.
     The pre-commit hook formats and lints the staged files; the pre-push hook type-checks and
     runs the related tests.
3. **Deviations**: when the code shows the design was wrong, follow the code's reality, record
   the deviation and its reason under "Implementation notes" in `design.md`, and tell the
   maintainer in the report.
4. **Finish** phase: guidance and docs updates (one owner per rule), `yarn verify:full`, the
   manual walk from `design.md` on the dev server (it is usually already running on
   `localhost:3000`; do not start a second one), results recorded in `design.md`.
5. **Never** push, merge, bump the version, or write the changelog unless the maintainer asks;
   the merge procedure is in `AGENTS.md` ("Workflow").

## Report

Commits per story, what was built, deviations, checks run with their results, and what is left
for the maintainer (manual checks, merge). Reply in the maintainer's language.
