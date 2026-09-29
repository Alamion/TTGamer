---
description: 'Task list for feature 017: document references scoped to the template setting'
---

# Tasks: Document references scoped to the template's setting

**Input**: Design documents from `specs/017-reference-setting-scope/`. These are:

- [plan.md](./plan.md) and [spec.md](./spec.md);
- [research.md](./research.md), whose decisions are cited as R1–R7;
- [data-model.md](./data-model.md);
- the contract [contracts/reference-scope-ui.md](./contracts/reference-scope-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: included. Constitution V requires tests for user-visible sheet flows and for the editor's
issue pipeline.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no unfinished dependencies).
- **[Story]**: US1–US4 from spec.md.

---

## Phase 1: Setup

- [x] T001 Mark T-075 as in progress (`[ ] 🟡`) in `TODO.md`, then run `yarn validate:backlog`.
- [x] T002 [P] Add the contract "Strings" to `translations/source/{en,ru}/ui/sheet/templates.yaml`:
    - `reference.outOfScope`, next to the existing `reference.*` keys;
    - the editor's "{type} (unavailable)" label, next to `editor.referenceKinds`;
    - the issue text "“{field}” can point to {type}, which this setting does not have", in the group
      that holds the other template reference issue messages used by `draft.ts`.

    Run `yarn build:translations`.

---

## Phase 2: Foundational (blocks all stories)

- [x] T003 Create `src/sheet_manager/features/sheet/data/referenceScope.ts` (R1–R3, data-model), a
      pure module over `SystemRegistry` with no `systems/<system>/` imports:
    - `referenceTargetsOf(registry, template: {systemId, documentKind, settingId?})`, which
      returns `ReferenceTarget[]` (`{kind, label}`):
        - the setting comes from `catalogScopeOf(registry, template).setting`;
        - the kinds follow the rules in the R2 table: user setting, shipped line
          (module + `coreDefinitions` + user types of the module and of the system without a
          module), or shipped system without a module;
        - there is one entry per kind; shipped kinds come first in registry order, then user
          types sorted by name;
        - labels come from `kindLabel`; when two labels are equal, both use `targetLabel` (R6).
    - `referenceScopeSystemId(registry, template)`, which returns the system documents must
      have: the user setting's `systemId`, or else the template's system.
    - `isDocumentInReferenceScope(scope, document)`, where `scope` is
      `{systemId, settingId?, kinds: ReadonlySet<string>}` and `document` is
      `{systemId, kind, metadata: {settingId?}}` (R3).
    - `referenceKindName(registry, kind)`: the best known name of a stale kind, taken from the
      first definition of that kind in any system (`targetLabel`), or else the raw id.

- [x] T004 [P] Write pure tests in `tests/sheet_manager/reference-scope.test.ts`, using the
      real registry and the user types snapshot set through
      `systemRegistry.setUserDocumentTypes`:
    - **Targets per setting:**
        - a Hunter page (`wod-v5`/`character`) gives `character` and `mortal`, the Hunter-owned
          user type, and a V5-level user type, and nothing else;
        - a Star Wars page gives `character` (once), `creature`, `vehicle`, `group`, and the
          Star Wars user type;
        - a V5 core page (`mortal`) gives `mortal` and the V5-level user type;
        - a user setting on V5 gives `mortal` and its own user type only;
        - a user type's page gives the targets of its owner's setting;
        - a WoD 2e page gives no Star Wars kinds;
        - an orphaned template (unregistered system) gives no targets.
    - **Duplicate labels:** a user type named like a shipped kind gets the setting label.
    - **Document scope:** covers a Star Wars character, a Hunter character, a V5 mortal, a
      user-setting mortal, and a user-type document.
    - **Stale names:** `referenceKindName` resolves a known kind and falls back to the raw id.

**Checkpoint**: the scope rules are proven without UI.

---

## Phase 3: User Story 1 — Pick target types from the template's setting (P1) 🎯 MVP

**Goal**: the editor offers exactly the setting's types, each once and under its own name.

**Independent Test**: open the editor on Hunter, Star Wars, and user-setting pages, add a
reference, and compare the offered types with R2.

- [x] T005 [US1] Rewrite `ReferenceKindsControl` in
      `src/sheet_manager/components/dialogs/template-editor/FieldEditor.tsx`:
    - read `systemId`, `documentKind`, and `settingId` from `useEditorModel()`;
    - list `referenceTargetsOf(systemRegistry, …)` (memoized on those three values) instead of
      `listTemplateTargets()`;
    - keep the rule that the last checked target cannot be unchecked;
    - make sure custom list items (spec 016, `itemOfList`) and table cells render the same
      control.
- [x] T006 [P] [US1] Add editor tests in `tests/sheet_manager/template-editor.test.tsx`
      ("reference targets (T-075)"):
    - a Hunter draft offers Character, Mortal, the Hunter user type, and a V5-level user type,
      and does not offer Star Wars Creature or another setting's user type;
    - a Star Wars draft offers Character once;
    - a list item of type reference offers the same types as a page field;
    - a new reference field, and a field retyped to reference, target the draft's own kind
      (FR-005; `draft.ts` already does this, so this only guards it).
- [x] T007 [US1] Pre-check existing tests whose reference targets fall outside their template's
      setting, and fix their fixtures to in-scope kinds unless the test is about that:
    - `tests/sheet_manager/document-system.test.ts:67` (`organization`);
    - `tests/sheet_manager/list-items.test.tsx:29` (`mortal`).

    Grep `tests/` for other `targetKinds`.

**Checkpoint**: US1 works; stale targets are not listed yet (US4).

---

## Phase 4: User Story 2 — Choose only documents of the setting on the sheet (P1)

**Goal**: the reference search offers only documents of the template's setting.

**Independent Test**: with Star Wars, Hunter, and user-setting characters stored, search a Hunter
sheet's character reference and see only Hunter characters.

- [x] T008 [US2] Add optional `inScope?: boolean` to `DocumentOption` in
      `src/sheet_manager/features/sheet/declarative/fieldControls.tsx`. When it is absent it
      means in scope (story and preview data). In `ReferenceFieldControlRender`, `docs` must keep
      only options that are in scope and have a target kind.
- [x] T009 [US2] Compute `inScope` in `documentOptions` in
      `src/sheet_manager/features/sheet/declarative/hooks.ts`:
    - memoize the scope from the current `template`: `referenceScopeSystemId`, the template's
      user setting (`catalogScopeOf(...).setting.settingId`), and the kinds of
      `referenceTargetsOf`;
    - mark each option with `isDocumentInReferenceScope`;
    - keep excluding the current document;
    - keep the list memoized on `documents` and the scope.
- [x] T010 [P] [US2] Add sheet tests in `tests/sheet_manager/reference-scope.test.tsx`, mounting
      `DeclarativeSheetView` with stores set as in `derived-values.test.tsx`:
    - a Hunter template with a character reference, over a Star Wars character, a Hunter
      character, and a user-setting character: the search offers only the Hunter one;
    - a user-setting template offers only that setting's documents of the target type;
    - a Star Wars vehicle crew-station reference (shipped template) offers only Star Wars
      characters;
    - a custom list whose item is a reference (spec 016) applies the same filter.

**Checkpoint**: US1 and US2 give the full everyday flow.

---

## Phase 5: User Story 3 — Existing references keep their values (P2)

**Goal**: stored entries outside the scope stay visible and openable, with a note.

**Independent Test**: store a Star Wars character's id in a Hunter reference, open the sheet,
see the title with "outside this setting", open it, and remove it.

- [x] T011 [US3] Update the selected entries in `ReferenceFieldControlRender` in
      `src/sheet_manager/features/sheet/declarative/fieldControls.tsx` (contract "Sheet"):
    - **out of scope**: the option exists and is not in scope, or its kind is not a target.
      Render the title, a `text-textSecondary` note `reference.outOfScope`, the open button,
      and the remove button when editable. Use normal item styling (no error border). Report
      `reference-target-out-of-scope` (`fieldId`, `documentIds`) through `reportSheetIssue`
      in an effect keyed on the joined out-of-scope ids, skipped for `previewSource`, exactly
      like the missing report. Add the code wherever sheet issue codes are declared (check
      `diagnostics.ts`).
    - **missing**: keep it exactly as today.
    - **after removal**: the document is not offered again, because the search already filters
      it (T008).
- [x] T012 [P] [US3] Add tests to `tests/sheet_manager/reference-scope.test.tsx`:
    - an out-of-scope entry shows its title and the note, is not an alert, and reports
      `reference-target-out-of-scope` once (`takeSheetIssues`);
    - it opens through `onOpenDocument` (store `currentDocumentId` changes);
    - removing it updates the stored value;
    - a read-only sheet shows the note and no remove button;
    - a deleted target still shows the missing placeholder and reports
      `reference-target-missing` (checked with `takeSheetIssues`).

---

## Phase 6: User Story 4 — Stale targets in the editor are kept and reported (P2)

**Goal**: targets that the setting does not offer are kept, marked unavailable, and listed as
issues.

**Independent Test**: load a Hunter template that targets another setting's user type, then see
"(unavailable)" and the issue; uncheck it and see the issue clear.

- [x] T013 [US4] Add the issue code `reference-target-unavailable` to `TemplateReferenceIssue` in
      `src/sheet_manager/features/sheet/data/templateReferences.ts`. Emit it in
      `validateTemplateReferences` for every `targetKinds` entry of a reference field that is
      not in `referenceTargetsOf(systemRegistry, template)`. This covers page and group fields,
      table cells, and custom list items. Compute the targets once per call. Add the option
      `{ referenceScope?: boolean }` (default `true`) that skips this check. In
      `src/sheet_manager/features/sheet/shell/templateFile.ts`, let `resolveImportedTemplate`
      pass the option through. In `src/sheet_manager/features/sheet/shell/libraryFile.ts`, pass
      `referenceScope: false`, because the file's own types and settings are not installed yet
      (R5).
- [x] T014 [US4] Map the new issue in `referenceIssueMessage` in
      `src/sheet_manager/components/dialogs/template-editor/draft.ts`. Use the field's label
      and `referenceKindName`, and focus the field node as other reference issues do.
- [x] T015 [US4] Extend `ReferenceKindsControl` in `FieldEditor.tsx`: list the stored targets
      that are not in scope after the scope's types. Each one is checked, labelled with the
      "(unavailable)" string over `referenceKindName`, and uncheckable, except when it is the
      last checked target.
- [x] T016 [P] [US4] Add editor tests in `tests/sheet_manager/template-editor.test.tsx`:
    - a stale target is listed as unavailable and checked, and the issue names the field;
    - unchecking it clears the issue;
    - the template otherwise saves unchanged, with targets kept until unchecked;
    - an orphaned template lists every stored target as unavailable.
- [x] T017 [P] [US4] Add pure tests in `tests/sheet_manager/reference-scope.test.ts`:
    - `validateTemplateReferences` reports stale targets in a page field, a table cell, and a
      list item, and reports none for shipped templates of every system (`defaultTemplates`);
    - `CustomTemplateSchema` still parses a template with a stale target;
    - importing a template file with a stale target is accepted and reports exactly one
      `template-reference-invalid` (US4-AS5);
    - parsing a library file with a user setting, its user type, and a page whose reference
      targets that type reports nothing (US4-AS6).

**Checkpoint**: all user stories are complete.

---

## Phase 7: Polish & Cross-Cutting

- [x] T018 [P] Update the reference stories in `src/sheet_manager/storybook/stories.ts`
      (FR-015):
    - story document options include an out-of-scope option (`inScope: false`) and a missing
      id, so the "Several references" story shows in-scope, out-of-scope, and missing entries;
    - editor states are not stories (contract "Storybook"); tests T016 cover them.

    Check `tests/sheet_manager/storybook.test.tsx` and extend it if it lists element variants.

- [x] T019 [P] Document in `docs/template-editor/elements.mdx` (Document reference) and in its
      ru mirror under `i18n/ru/docusaurus-plugin-content-docs-template-editor/…` (find it with
      `yarn validate:i18n`):
    - which types a reference offers (its setting's types, the ruleset's shared types, and the
      setting's own types);
    - out-of-scope entries;
    - unavailable targets.
- [x] T020 [P] Update the reference section of `.agents/skills/sheet-templates/SKILL.md` with the
      scope rules, the `inScope` option, the stale target issue, and the test files. Update
      `src/sheet_manager/AGENTS.md` only if it describes reference targets.
- [x] T021 Update `CHANGELOG.md` (v3.15.0 entry), `package.json` (3.15.0), and `TODO.md` (T-075
      ✅ with a dated note), then run `yarn check:version` and `yarn validate:backlog`.
- [x] T022 Run `yarn verify:full` and fix everything it reports. Walk through
      [quickstart.md](./quickstart.md) against the dev server if it is running at
      localhost:3000; do not start or kill it.

---

## Dependencies & Execution Order

- **Setup** (T001–T002) comes first. T002 is needed by T011, T014, and T015.
- **Foundational** (T003) blocks every story. T004 can run with the stories.
- **US1** (T005–T007) and **US2** (T008–T010) are independent of each other after T003. T007
  (fixture pre-check) must be done before T013 turns the new issue on.
- **US3** (T011–T012) follows T008, since it uses the same control and filter.
- **US4** (T013–T017):
    - T013 is independent after T003;
    - T014 needs T013;
    - T015 extends T005.
- **Polish** (T018–T022) comes after all stories. T022 is last.

## Parallel Examples

- After T003: T004, T005, T008, and T013 touch different files.
- Tests: T006 and T016 are in the same file, so run them one after the other; T010 and T012
  also share a file.
- Polish: T018, T019, and T020 can run together.

## Implementation Strategy

1. **MVP**: Setup, then Foundational, then US1 and US2. With these, authors and sheet users see
   only their setting.
2. **Safety**: US3 (stored links stay visible), then US4 (stale targets reported).
3. **Last**: Polish, then `yarn verify:full`.
