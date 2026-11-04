# Tasks: Sheet help that explains

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order (design "Approach"): Foundation (review and approval), US4 (mechanism), US3 (docs),
US1 (section, group, and field links), US2 (element help), Finish. No template link changes before
the review is approved (T005).

## Foundation - The review

- [x] T001 Dump the inventory of every shipped template (system, template, page kind, node, type,
      label, today's `docsPath`) and the docs tree (pages and anchors, en and ru) into the
      git-ignored `context/047/` (a script that can regenerate it), as the input of the review
- [x] T002 Draft the review by system with subagents (design D1): Star Wars (5 documents), WoD 2e,
      V5 core/Storyteller/group, Hunter and Vampire, General note and the field types; each row: id,
      document, page, where, what a newcomer sees, link today, link it should have (rules page or
      guide, with anchor), the first sentence of that target (quoted from our docs), target exists /
      must be written, and a one-line reason; rows cover sections, groups, element types, and only
      the fields and bound elements (primitives) a newcomer would not understand
- [x] T003 Merge the drafts into `specs/047-sheet-help-links/review.md` (grouped by document and
      page), check each proposed target against the docs, remove duplicates, and list the targets to
      write
- [x] T004 Publish the review page from `review.md` (Artifact with the `db` capability: one mark per
      row, `agree` / `change` with a comment, filter by document) (design D2); load the
      `artifact-design` and `artifact-capabilities` skills first
- [x] T005 Read the maintainer's marks (`ArtifactData`), apply the changes to `review.md`, repeat
      until every row is agreed; commit `review.md`

## User Story 4 - The "?" is a link for everyone, on sections and fields (P2, first)

**Check**: the section "?" is a link outside the fold button; a field with a docs link and a
markdown field show a "?" beside their labels; "Hide help" removes the element's.

- [x] T006 [US4] Write `tests/sheet_manager/section-help.test.tsx` first: the section and group "?"
      is a link named "Documentation for <title>" outside the fold button; clicking it opens the
      card and does not fold; the header folds by click and Enter (FR-008)
- [x] T007 [US4] `components/sections/SectionCard.tsx` and `CollapsibleBlock.tsx`: the header as a
      row of the fold button and the sibling `DocsPreviewLink` (design D3), full and dense looks;
      update `tests-e2e/smoke/docs-fragment.spec.ts` to find the link by role; remove F-011 from
      `TOFIX.md`
- [x] T008 [US4] Write `tests/sheet_manager/field-help.test.tsx` first: field `docsPath` shows its
      mark; an element type in `ELEMENT_HELP` shows its mark; `hideHelp` removes only the element
      help; every control of `declarativeFieldRegistry` draws the mark beside its label (FR-004,
      FR-011)
- [x] T009 [US4] `types/template.ts`: `docsPath` and `hideHelp` on field nodes (`fieldBaseShape`)
      and on `PrimitiveNodeSchema`; `features/sheet/declarative/elementHelp.ts`: `ELEMENT_HELP`
      (empty but for `markdown`), `elementHelpFor(node)` (by field type or the control a primitive
      draws as; full pages only), `FieldHelpContext`, `FieldHelpMark` named "Documentation for
      <label>", placed after `TermLabel` (design D4, D5)
- [x] T010 [US4] Resolve help in the field cell (`DeclarativeSheetView.tsx` / `primitives.tsx`) and
      draw `FieldHelpMark` beside the label in each control (`fieldControls.tsx`,
      `MarkdownFieldControl.tsx`, `MentionsFieldControl.tsx`, `TrackerFieldControl.tsx`) and the
      labelled primitives
- [x] T011 [US4] Editor: `docsPath` for fields and primitives and `hideHelp` (shown for types with
      element help) in `features/template-editor/settings/registry.ts`, labels in
      `translations/source/{en,ru}/ui/sheet/templates.yaml`; `shipped-parity.test.tsx` passes
      (design D6)
- [x] T012 [US4] Widen `tests/docs/docs-links-anchors.test.ts` to field `docsPath` and
      `ELEMENT_HELP` targets; storybook: a field with a docs link and a markdown field with its help
      (constitution VI)
- [x] T013 [US4] Run `yarn verify:full` (shared component, constitution VII); measure the main and
      sheet chunks and the sheet timing against `master` in one run (SC-005), record in design.md
    - [ ] Commit the story (left to the maintainer; the US4 brief forbids committing)

## User Story 3 - The docs the links need exist (P2)

**Check**: every target `review.md` marks "write" exists in English and Russian with the same anchor
and opens with a definition.

- [ ] T014 [US3] Write the rules parts the review lists (e.g. what a cell is, V5 skills overview, V5
      experience) in `docs/` and the Russian mirror: a plain definition first, explicit `\{#id}`
      anchors in both, paraphrased (design D8, FR-007)
- [ ] T015 [US3] Write the guide parts for element help (e.g. trackers, reference fields) in
      `docs/guide/` and the Russian mirror, same rules
- [ ] T016 [US3] Rewrite the first paragraph of existing targets the review marks "definition
      missing", in both languages
- [ ] T017 [US3] Run `yarn validate:i18n` and `yarn verify:full` (documentation paths); commit the
      story

## User Story 1 - Every section says what it is (P1)

**Check**: every row of `review.md` for sections, groups, and fields matches the shipped pages.

- [ ] T018 [US1] Write `tests/docs/help-links-review.test.ts` first: no shipped section with a group
      or field inside linking the same place; every shipped section, group, and field link equals
      its `review.md` row; a rules "?" of a shipped page leads to its own system's docs root or
      `/docs/guide/`; every target has en and ru (FR-001, FR-003, FR-005, FR-010, SC-001, SC-002)
- [ ] T019 [US1] Apply the agreed links to the Star Wars templates
      (`systems/star-wars-wod/templates/*.ts`) and the WoD 2e parts
      (`systems/wod2e/ruleset/templateParts.ts`), including the "Experience and notes" duplicate
- [ ] T020 [US1] Apply them to V5: `systems/v5/ruleset/templateParts.ts` (`V5_DOCS`), `core/`,
      `modules/hunter/templates/sheet.ts` (`HUNTER_DOCS`), `modules/vampire/templates/`
- [ ] T021 [US1] Run `yarn verify:full`; commit the story

## User Story 2 - Elements say how they work (P1)

**Check**: each element type the review marks has a "?" on every page, shipped and the user's.

- [ ] T022 [US2] Extend `field-help.test.tsx`: each type in the approved list has its guide target
      in `ELEMENT_HELP`, a user template's field of that type shows it (FR-004, FR-005)
- [ ] T023 [US2] Fill `ELEMENT_HELP` from `review.md`; E2E in `docs-fragment.spec.ts`: a note's
      markdown "?" opens the notes guide card
- [ ] T024 [US2] Run `yarn verify:full`, the sheet timing against `master`, and the chunk sizes
      (SC-005); commit the story

## Finish

- [ ] T025 Update `src/sheet_manager/AGENTS.md` (help marks: sections outside the button, field
      `docsPath`, `hideHelp`, `ELEMENT_HELP` as the one owner), the `sheet-templates` skill (field
      help settings), the template editor guide en + ru (`docs/guide/template-editor/elements.mdx`:
      a field's docs link, Hide help); `TODO.md` T-130 closed with a note; backlog entries for
      findings of the review that are not one-line fixes; `AGENTS.md` §6 says app help leads to the
      guide and a rules term's "?" on a sheet to its own system's rules; a historical banner on spec
      045 (the "?" no longer sits in the fold button) and the `docusaurus-integration` skill's "Docs
      Fragments in the App" updated
- [ ] T026 Run `yarn verify:full`; walk the steps in design.md "Manual walk"; record results in
      design.md

## Coverage

FR-001 T018 T019 T020 · FR-002 T014–T016, manual walk · FR-003 T018 T019 · FR-004 T008 T010 T022
T023 · FR-005 T018 T022, D5 · FR-006 T012 T018 · FR-007 T014–T016 · FR-008 T006 T007 · FR-009
T001–T005 · FR-010 T018 · FR-011 T008–T011 · SC-001 T018 · SC-002 T018 · SC-003 manual walk · SC-004
T006 T007 · SC-005 T013 T024
