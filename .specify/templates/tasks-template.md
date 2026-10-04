# Tasks: [FEATURE NAME]

**Input**: [spec.md](spec.md), [design.md](design.md)

<!--
  Lean task list (spec 024): one phase per user story in delivery order, one commit per story.
  Format: `- [ ] T### [US#] Description with the exact file path`. No parallel examples or
  delivery-strategy sections.
-->

## Foundation

<!-- Only work every story needs. Delete if empty. -->

- [ ] T001 [Description with file path]

## User Story 1 - [Title] (P1)

**Check**: [the story's independent test]

- [ ] T002 [US1] [Test first where the change has logic: test file path]
- [ ] T003 [US1] [Implementation with file path]
- [ ] T004 [US1] Run the checks for the change size (AGENTS.md §11) and commit the story

## User Story 2 - [Title] (P2)

- [ ] T005 [US2] [...]

## Finish

- [ ] T0xx Update the module notes and skill this feature changes (one owner per rule), the user
      guide (en + ru) if behavior is visible, and the backlog entry
- [ ] T0xx Run `yarn verify:full`; walk the steps in design.md "Manual walk"; record results in
      design.md
