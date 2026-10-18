# Tasks: A Create Dialog That Scales With Many Document Kinds

**Input**: [spec.md](spec.md), [design.md](design.md)

## Foundation

- [ ] T001 Add the create-dialog and docs-create strings (design "Changed types and data") to
      `translations/source/en/ui/sheet/documents.yaml` and
      `translations/source/ru/ui/sheet/documents.yaml` (`create.matches` as a plural), and run
      `yarn build:translations`
- [ ] T002 Extend `createDocument` options with `title?: string`, `data?: unknown` (parsed by the
      definition's schema; defaults when absent), and `templateValues?`; report the deleted-folder
      fallback through `reportSheetIssue` in `src/sheet_manager/store/documentStore.ts`, with a test
      in `tests/sheet_manager/document-store.create.test.ts`

## User Story 1 - Find the kind quickly (P1)

**Check**: with the shipped kinds and twenty user types, open **New**, type "vamp" → only the
vampire kind remains, `Enter` selects it.

- [ ] T003 [US1] Write `tests/sheet_manager/create-choices.test.ts`: grouping and order from the
      library tree, user settings under their ruleset with core kinds, unavailable kinds left out,
      collapsed one-child headings, search in en/ru by kind, setting, ruleset, English name, and
      description, recent order (≤ 5, newest first), missing recent kinds dropped and reported, bad
      stored JSON ignored and reported
- [ ] T004 [US1] Implement `src/sheet_manager/features/documents/createChoices.ts`:
      `createChoices(tree, locale)` over `buildLibraryTree` (D1), `filterChoices(groups, query)`
      with `matchesSearch` (D2), and the `ttgamer:create-dialog:v1` reader/writer for `recent` and
      `folded` (D5)
- [ ] T005 [US1] Write the left pane of
      `src/sheet_manager/components/dialogs/DocumentCreateDialog.tsx`: search combobox with the
      focus, **Recent** row, listbox of `role="group"` sections with folding heading buttons
      (`aria-expanded`, remembered), options with `data-kind`, empty state with **Clear search**
      (D3); remove `createGroups` and the radios; start
      `tests/sheet_manager/document-create-dialog.test.tsx` with the focus, filtering, folding, and
      empty-state cases, over the shipped kinds plus a fixture of twenty user types
- [ ] T006 [US1] Rewrite the radio-based cases in `tests/sheet_manager/document-dialogs.test.tsx`,
      `tests/sheet_manager/user-settings.test.tsx`, and
      `tests/sheet_manager/user-document-types.test.tsx` to pick options, and the helper
      `tests-e2e/brief.ts` to pick by `data-kind`
- [ ] T007 [US1] Write `tests/sheet_manager/create-choices.perf.test.tsx`: building, rendering the
      dialog, and filtering 100 kinds per keystroke within 100 ms (best of warm runs) (SC-002)
- [ ] T008 [US1] Run `yarn verify` and commit the story

## User Story 2 - Name it and choose where it goes (P1)

**Check**: **New** from a folder's menu, choose a kind, type "Night watch", change the folder,
**Create** → the document sits in the chosen folder under that name.

- [ ] T009 [US2] Write `tests/sheet_manager/create-from-choice.test.ts`: every shipped kind created
      with a name shows it as title and in its name value (character capability or `syncsTitle`
      bindings, D6); empty name keeps today's behavior; folder kept, deleted folder → top level;
      recent written
- [ ] T010 [US2] Implement `src/sheet_manager/features/documents/createFromChoice.ts` (D6, D7, D5):
      page via `newDocumentPage`, user-setting page, title and name value, `parentId`, `activate`,
      recent update
- [ ] T011 [US2] Add the right pane to `DocumentCreateDialog.tsx`: kind heading, name field (`Enter`
      creates), folder button opening `MoveToPicker` over the dialog, **Create**; two panes from 640
      px (D4); `onCreated(id, { named })`
- [ ] T012 [US2] In `src/sheet_manager/components/documents/DocumentsPanel.tsx` skip the inline
      rename when `named` is true; extend `tests/sheet_manager/document-create-dialog.test.tsx` with
      name, folder, and the named/unnamed hand-off
- [ ] T013 [US2] Run `yarn verify` (store change) and commit the story

## User Story 3 - Start from an example (P2)

**Check**: vampire → **Mirela Voss** → create; the copy has her values and portrait, and editing it
leaves the next copy unchanged.

- [ ] T014 [US3] Extend `tests/sheet_manager/create-from-choice.test.ts`: example copies get a new
      id, run through `migrate` and the schema, keep `templateValues` and the portrait, are named
      after the example without a typed name, and stay independent; kinds without examples start
      blank
- [ ] T015 [US3] Implement the `exampleId` path in `createFromChoice.ts` (D8) and the start choice
      (**Blank** + examples, only for kinds with examples) in the right pane of
      `DocumentCreateDialog.tsx`, with a dialog test case
- [ ] T016 [US3] Run the targeted tests and commit the story

## User Story 4 - Keyboard and phone (P2)

**Check**: at 360 px create a Hunter named "Ana" with the keyboard, then by touch, with no sideways
scrolling.

- [ ] T017 [US4] Extend `tests/sheet_manager/document-create-dialog.test.tsx`: arrows move the
      active option, `Enter` → name → create, `Escape` clears then closes, a single match is chosen,
      the live count, the two steps with **Back** below 640 px, a chosen user type deleted while
      open (choice cleared, **Create** disabled), and five keystrokes at 50 kinds (SC-001)
- [ ] T018 [US4] Implement keyboard flow, the polite live region, the single-match choice, clearing
      a deleted choice, and the phone steps (full screen, sticky search and **Create**, 32 px touch
      rows) in `DocumentCreateDialog.tsx` (D3, D4)
- [ ] T019 [US4] Add a smoke test `tests-e2e/smoke/create-dialog.spec.ts`: at 360 px create a named
      vampire from Mirela by keyboard; no element wider than the window, kind rows at least 32 px
      tall (SC-004)
- [ ] T020 [US4] Run `yarn verify` and the smoke test, commit the story

## User Story 5 - Create buttons in the documentation (P3)

**Check**: on "Meet Mirela" press **Copy Mirela Voss**, follow **Open**, see the copy on the sheet.

- [ ] T021 [US5] Write `tests/sheet_manager/docs-create-button.test.tsx`: label names the kind or
      the example, a copy is created, recent updated, toast with **Open** linking to
      `/universal_sheet`; a missing kind or example shows the error toast, reports, and creates
      nothing
- [ ] T022 [US5] Extend `src/sheet_manager/features/sheet/shell/CreateCharacterButton.tsx` with
      `exampleId`, the naming label, `createFromChoice`, the toast, and the failure path (D9); keep
      the `TemplateFragment` fallback working
- [ ] T023 [US5] Add copy buttons to the "Meet" pages:
      `docs/wod-v5/hunter/first-hunter/10-meet-lena.mdx`,
      `docs/wod-v5/vampire/first-vampire/11-meet-mirela.mdx`, and their Russian mirrors under
      `i18n/ru/docusaurus-plugin-content-docs/current/wod-v5/`
- [ ] T024 [US5] Run the targeted tests and `yarn validate:i18n`, commit the story

## Finish

- [ ] T025 Update `src/sheet_manager/AGENTS.md` (create path: `createChoices`, `createFromChoice`,
      device keys) and the `mdx-documentation` skill (docs create buttons with `exampleId`); update
      `docs/guide/sheet.mdx` ("New": search, recent, name, folder, examples, phone steps) and
      `docs/guide/documents/index.mdx` ("Add a document" asks for the name in the dialog), with
      their Russian mirrors; mark T-120 done in `TODO.md`
- [ ] T026 Run `yarn verify:full`; measure the sheet page bundle against `testing` (SC-005, ≤ 5 KB
      gzip); walk the steps in design.md "Manual walk" (SC-001, SC-003); record results in design.md

## Coverage

| Requirement                | Tasks                  |
| -------------------------- | ---------------------- |
| FR-001 grouping            | T003, T004, T005       |
| FR-002 folding remembered  | T004, T005             |
| FR-003 search              | T003, T004             |
| FR-004 recent              | T003, T004, T010, T022 |
| FR-005 descriptions        | T003, T005             |
| FR-006 name                | T002, T009, T010, T011 |
| FR-007 folder              | T009, T011, T012       |
| FR-008 examples            | T014, T015             |
| FR-009 name everywhere     | T009, T010             |
| FR-010 keyboard            | T017, T018             |
| FR-011 announced count     | T017, T018             |
| FR-012 phone steps         | T017, T018, T019       |
| FR-013 docs buttons        | T021, T022, T023       |
| FR-014 en + ru strings     | T001, T024             |
| FR-015 same page and view  | T009, T010             |
| FR-016 two panes           | T011                   |
| SC-001 keystrokes          | T017, T026 (walk)      |
| SC-002 100 ms at 100 kinds | T007                   |
| SC-003 five-task walk      | T026                   |
| SC-004 360 px, 32 px rows  | T018, T019             |
| SC-005 bundle              | T026                   |
