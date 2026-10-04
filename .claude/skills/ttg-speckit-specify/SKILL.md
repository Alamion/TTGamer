---
name: "ttg-speckit-specify"
description: "Create the feature specification from a natural language feature description. (TTGamer lean process)"
metadata:
  author: "ttgamer, adapted from github-spec-kit"
---

## User Input

```text
$ARGUMENTS
```

The text after the command is the feature description. If it is empty, stop and ask for one.

## Steps

1. **Name**: derive a 2–4 word kebab-case short name (action-noun where possible, keep acronyms).
2. **Number**: next free three-digit prefix in `specs/` (`ls specs`), giving `specs/NNN-name`.
3. **Branch**: create `NNN-name` from `testing` (`git checkout -b NNN-name testing`) unless the
   maintainer named another base or branch.
4. **Files**: create `specs/NNN-name/spec.md` from `.specify/templates/spec-template.md`; write
   `{"feature_directory": "specs/NNN-name"}` to `.specify/feature.json` (git-ignored).
5. **Context**: read `.specify/memory/constitution.md` principles, the backlog entry the
   description points to (`TODO.md`/`TOFIX.md`), and the module notes it touches (root and
   module `AGENTS.md`). Do not load spec history to reconstruct current behavior.
6. **Write the spec** (template structure, 150–250 lines):
   - Stories by priority, each independently testable with Given/When/Then scenarios.
   - Functional requirements that can be tested; success criteria that can be measured and
     name no technology.
   - Edge cases only where a reader would not assume the behavior.
   - Defaults chosen for anything unspecified go to Assumptions.
   - At most three `[NEEDS CLARIFICATION: question]` markers, only for choices that change scope,
     privacy, or the user experience and have no reasonable default.
7. **Self-check** (no checklist file): no implementation details, every requirement testable,
   criteria measurable, scope bounded, no placeholder left. Fix what fails.
8. **Markers**: if any `[NEEDS CLARIFICATION]` remain, present each as a question with 2–4
   options in a table, recommend one, and wait for the answers; then replace the markers.

Do not commit: specify, clarify, design, and tasks are committed together by
`/ttg-speckit-tasks` (one planning commit).

## Report

Branch, spec path, open questions if any, and the next step: `/ttg-speckit-clarify` (always
recommended), then `/ttg-speckit-plan`. Reply in the maintainer's language.
