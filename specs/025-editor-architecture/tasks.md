# Tasks: Template Editor Architecture

**Input**: [spec.md](spec.md), [design.md](design.md)

`F` = `src/sheet_manager/features/template-editor`. Delivery order: Foundation (the move, design
D1), then US1–US5 in priority order.

## Foundation

- [x] T001 Move `src/sheet_manager/components/dialogs/template-editor/**` to `F/` (keeping
      `settings/`) and `src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx` to
      `F/TemplateEditorDialog.tsx` with `git mv`; fix relative imports inside the moved files only
- [x] T002 Update the outside importers: `components/dialogs/LibraryDialog.tsx`,
      `components/dialogs/library/{ExportPanel,ImportPreview,MovePanel}.tsx`,
      `features/sheet/shell/{typeFile,libraryImport}.ts`, `features/docs/ElementStorybook.tsx`, and
      every editor test under `tests/sheet_manager/` (import paths only)
- [x] T003 Move `generateDraftId` from `F/draft.ts` to `F/model/ids.ts` and point its three outside
      importers and the tests that import it at it
- [x] T004 Run `yarn verify` and commit the move alone
      (`refactor(editor): move the template editor to features/ (spec 025)`)

## User Story 1 - Settings survive a source or kind switch (P1)

**Check**: switching the source of a field with span, display condition, compact, and hidden label
keeps all four; every rendered `data-setting` has a registry entry.

- [x] T005 [US1] Write `tests/sheet_manager/template-editor/settings-registry.test.tsx`. It covers:
    - every `data-setting` rendered for each storybook element (`listElementStories`) has a registry
      entry (prefixes such as `item.` and `option:N` stripped);
    - each `carry` setting survives each source switch (`sourceNodes.ts`) and kind switch
      (`elementKinds.ts`) whose target it applies to;
    - the multi-selection panel (several fields of one type) and the tracker and pool-tracker
      variants are rendered too, so controls shown only in those states are covered;
    - US1 scenarios 1–3, including dropped labels and restore on switching back;
    - a display condition that refers to the switched element's own old value key keeps it.

    The test fails first.

- [x] T006 [US1] Create `F/settings/registry.ts` with `SettingDescription`:
    - `group`, `label`;
    - `appliesTo`;
    - `shared?: { control, inverted? }`;
    - `identity?`;
    - `carry?`.

    Add one entry per key from today's lists: `SHARED_SETTINGS`, `OWN_KEYS`, `FIELD_PANEL_KEYS`
    (`F/sharedSettings.tsx`); `GROUP_KEYS`, `SETTING_NAMES` (`F/issues.ts`); `carried()`
    (`F/sourceNodes.ts`); `LIST_ONLY_KEYS` (`F/elementKinds.ts`). Then add every other
    `data-setting` key the panels render.

- [x] T007 [US1] Derive `SHARED_SETTINGS`, `OWN_KEYS`, and `FIELD_PANEL_KEYS` in
      `F/sharedSettings.tsx` and the group and name lookups in `F/issues.ts` from the registry;
      delete the hand lists
- [x] T008 [US1] Add `keepSettings(from, to)` in `F/settings/keepSettings.ts`. It returns the node
      with every applicable `carry` key copied, plus the dropped keys and labels. Replace
      `carried()` in `F/sourceNodes.ts` and the `LIST_ONLY_KEYS` handling in `F/elementKinds.ts`
      with it, and generalize `KindStash` so that source switches stash dropped settings too
- [x] T009 [US1] Add `sheet.templates.editor.settingsDropped` ("Not applicable to the new element:
      {settings}") to the en and ru YAML under `translations/source/`. Announce it from the source
      and kind switch paths in `F/TemplateEditorDialog.tsx`
- [x] T010 [US1] Make panel labels and `setting=` keys read the registry where a panel repeats them
      (`F/FieldEditor.tsx`, `F/ElementSettings.tsx`, `F/PrimitiveConfig.tsx`,
      `F/LayoutControls.tsx`)
- [x] T011 [US1] Run the editor tests and `yarn verify:fast`, then commit US1

## User Story 2 - One editing session owns state, operations, and commands (P1)

**Check**: existing editor tests pass unchanged; operations are tested without rendering; the dialog
is at most 400 lines.

- [x] T012 [US2] Write `tests/sheet_manager/template-editor/operations.test.ts`. For remove,
      duplicate, move by command, place, insert, update, switch kind, and switch source, one id and
      several ids must match today's single and multi results and refusals (depth, count, move into
      itself). Each operation also returns the right announcement descriptor (name for one, count
      for several)
- [x] T013 [US2] Write `tests/sheet_manager/template-editor/session.test.ts`:
    - change, undo, and redo are each one step;
    - coalescing works;
    - a refused operation sets the issue and the announcement;
    - the stash restores dropped settings;
    - selection reveal is not part of the store.
- [x] T014 [US2] Create `F/operations/{types,structure,selection,fields,switches}.ts`. `OpResult` is
      `{ ok, draft, selection?, announce? }` or a refusal. Fold `F/multiOps.ts` and the dialog's
      single-node bodies (`removeSelected`, `duplicate`, `moveByCommand`, `switchKind`, `actions`)
      into them, then delete `F/multiOps.ts`
- [x] T015 [US2] Create `F/session/store.ts` (`createEditorSession`, built with `createStore` from
      `zustand/vanilla`). It holds history, selection, save issues, announcement, and stash, with
      `run(op, meta)`, `change(update, meta)`, `select`, `undo`, and `redo`; the dropped-settings
      announcement from T009 goes through the session's `announce`. Also create
      `F/session/context.tsx` (provider, `useEditorSession(selector)`, `useEditorStore()`)
- [x] T016 [US2] Create `F/session/useNodeEdits.ts`, the edits bound to the session for a node and
      for the selection. Replace `ElementEditorCallbacks` (`F/ElementSettings.tsx`) and
      `SeveralFieldCallbacks` (`F/sharedSettings.tsx`) in every panel. Drop the unused `onInsert`,
      `onRemove`, and `onMove`
- [x] T017 [US2] Replace `EditorActionsContext` and `EditorSelectionContext` (`F/editorActions.ts`)
      with session selectors in `F/EditorNodeFrame.tsx`, `F/OutlineTree.tsx`, `F/EditorPage.tsx`,
      and `F/useEditorDrag.ts`. Delete `F/editorActions.ts`
- [x] T018 [US2] Write `tests/sheet_manager/template-editor/commands.test.ts`. A command's `enabled`
      must agree between the key handler and the menu, and a disabled command's keys do nothing (for
      example "move up" on the first element, "move out" at the root)
- [x] T019 [US2] Move `F/commands.ts` to `F/commands/list.ts` and add `run(session)` and
      `enabled?(state)` to `EditorCommand`. Then:
    - move the menu building (`menuSource`) out of the dialog to `F/commands/menu.ts`;
    - make `F/shortcuts.ts` (moved to `F/commands/keys.ts`) and the toolbar undo/redo read `run` and
      `enabled`.
- [x] T020 [US2] Shrink `F/TemplateEditorDialog.tsx` to at most 400 lines: layout, the session
      provider, save, and close. Extract `F/components/EditorToolbar.tsx`,
      `F/components/EditorPanes.tsx`, and `F/components/EditorConfirms.tsx` as needed
- [x] T021 [US2] Run `yarn verify` and `yarn test:perf template-editor`, then commit US2

## User Story 3 - Element kinds register once for the editor (P2)

**Check**: deleting one entry fails `yarn typecheck`; labels, add menu, outline, and settings are
unchanged.

- [x] T022 [US3] Write `tests/sheet_manager/template-editor/element-registry.test.ts`:
    - `kindLabel` and `displayName` equal today's `nodeKindLabel` and `nodeDisplayName` for one node
      of every `TemplateNodeType`;
    - a `// @ts-expect-error` case that a registry missing a type does not type-check.
- [x] T023 [US3] Create `F/elements/registry.ts` as a mapped type over `TemplateNodeType`. Each
      entry has `kindLabel`, `displayName`, `settings(node, ctx)`, `create?`, and `kinds?`. Move the
      `kindSettings` switch and `section`/`group`/`table`/`list` settings out of
      `F/ElementSettings.tsx` and the `baseField` switch out of `F/draft.ts`
- [x] T024 [US3] Make `F/AddElementMenu.tsx`, `F/OutlineTree.tsx`, `nodeKindLabel`/`nodeKindShort`,
      and `ElementSettings` read the registry
- [x] T025 [US3] Run the editor tests and `yarn verify:fast`, then commit US3

## User Story 4 - Save warnings come from one list (P2)

**Check**: a save that triggers every check shows today's confirmation; an added check appears with
no other change.

- [x] T026 [US4] Write `tests/sheet_manager/template-editor/save-checks.test.ts`:
    - for kind, list, and tracker effects together, the title, lines, and confirm label equal
      today's;
    - no effects means no confirmation;
    - a test-only check shows its lines.
- [x] T027 [US4] Create `F/saveChecks.ts` with
      `SaveCheck { id, title, confirm, run(before, after,     state) }`. Its list wraps
      `kindChangeReport`, `listItemChangeReport`, and `trackerChangeReport` in today's order.
      Replace `pendingSaveDescription`, the title and confirm chains, and the three report calls in
      `F/TemplateEditorDialog.tsx`. The retarget plan stays a separate step
- [x] T028 [US4] Run the editor tests and `yarn verify:fast`, then commit US4

## User Story 5 - The editor is one feature module (P3)

**Check**: no file over 600 lines among those split from `draft.ts`; no import of editor internals
from outside.

- [x] T029 [US5] Split `F/draft.ts` into:
    - `F/model/tree.ts` (locate, insert, remove, move, replace, find, placement, columns);
    - `F/model/clone.ts`;
    - `F/model/factories.ts`;
    - `F/model/fields.ts` (field updates, type changes, options);
    - `F/model/tables.ts`;
    - `F/model/catalogs.ts`;
    - `F/issues/draftIssues.ts` (`collectDraftIssues` and its helpers).

    Merge `F/issues.ts` into `F/issues/schemaIssues.ts`. Delete `F/draft.ts`.

- [x] T030 [US5] Group the remaining components under `F/components/` (panels, outline, page, menus,
      help), keeping `sampleDocuments.ts` and `TemplateEditorDialog.tsx` at the root, and update
      imports
- [x] T031 [US5] Check that outside code imports only `F/TemplateEditorDialog.tsx`,
      `F/model/ids.ts`, `F/components/EditorHelp.tsx`, and `F/sampleDocuments.ts`
      (`grep -rn "features/template-editor/" src --include=*.ts*`). Fix any other
- [x] T032 [US5] Run `yarn verify`, then commit US5

## Finish

- [x] T033 Update the guidance. Each place names one location for a setting, an element kind, a
      command, and a save check; remove the superseded text:
    - `src/sheet_manager/AGENTS.md`: structure tree and the editor rules;
    - root `AGENTS.md` §6: the structure tree gets `features/template-editor/`;
    - `.agents/skills/sheet-templates/references/editor.md`;
    - `.agents/skills/sheet-templates/SKILL.md`: the "New field type" checklist and the `draft.ts`
      debt.

    Count the guidance files changed for SC-006.

- [x] T034 Check the user guide `docs/template-editor/` and its ru mirror for text about switching a
      source or kind. If it says settings are lost, correct both locales. Update T-097 in `TODO.md`,
      and add backlog entries for any settings panel still over 600 lines (SC-003)
- [x] T035 Measure and record in design.md "Results":
    - dialog and new file line counts;
    - panel sizes before and after;
    - the unit run, best of two, against the 113 s baseline (SC-005);
    - the planning document lines (SC-006).
- [ ] T036 Run `yarn verify:full`; walk design.md "Manual walk" on the dev server and record the
      results in design.md
