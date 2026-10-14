# Tasks: Documents Window with a Folder Tree

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order follows design.md "Approach": three Foundation phases (storage, splitter, tree —
every story reads them), then US1 to US4. The storage phase goes first as the riskiest; if it
stalls, the later phases do not start. Paths are under `src/sheet_manager/` unless they start with
`src/shared/`, `tests/`, or `tests-e2e/`.

## Foundation A - Storage split (D1–D5)

**Check**: all existing store, import, library, and sheet suites pass; a v4 store migrates with
every document intact; boot reads only the slim state and the open record.

- [ ] T001 Write `tests/sheet_manager/document-store-v5.test.ts`: migration of a v4 value (every
      envelope becomes a record and an entry, `currentDocumentId` and `recoveryEntries` kept, backup
      key written first, a rerun after a simulated crash gives the same result), a missing record
      rebuilds its entry, orphan records are purged by the sweep (portrait included)
- [ ] T002 Create `store/documentIndex.ts`: `DocumentIndexEntrySchema` and `FolderSchema` (Zod;
      fields in design D1), `entryOf(envelope)`, `STORE_KEYS` (`doc:<id>`, backup key); no store
      access
- [ ] T003 Create `store/documentContent.ts`: `readRecord`, `writeRecord`, `removeRecord`,
      `listRecordIds` over localForage; the debounced writer (300 ms, flush on `pagehide`, one write
      per changed envelope identity); the boot sweep; a loaded-cache LRU of 8 that never evicts the
      open or an unsaved document; failures reported with
      `reportSheetIssue('document-write-failed')`
- [ ] T004 Rework `store/documentStore.ts` to persisted version 5: add `entries`, `folders`,
      `openDocument(id)`, `rebuildIndex()`; `documents` becomes the loaded cache; every mutation
      (`createDocument`, `importDocument`, `updateDocumentData`, `updateDocumentMetadata`,
      `relocateDocuments`, `updateTemplateValues`, `deleteDocument`) updates envelope and entry in
      one `set`, with `changedAt` moving at most once per 5 s and `createdAt` set on create;
      `deleteDocument` removes the entry and leaves the record to the sweep;
      `migrateDocumentStoreState` writes the `universal-character-storage:v4-backup` copy, then
      records and entries; imports land at the top level
- [ ] T005 Move the metadata-only readers to `entries`: `features/sheet/data/libraryActions.ts`,
      `libraryMoves.ts`, `templateRetarget.ts`, `components/dialogs/LibraryDialog.tsx` (counts),
      `features/sheet/data/libraryTree.ts` callers; load by id where data is needed
      (`features/template-editor/components/EditorPreview.tsx`, `EditorPage.tsx`, retarget
      compatibility)
- [ ] T006 Make the sheet shell wait for the open record: `features/sheet/shell/SheetWorkspace.tsx`
      and the callers of `setCurrentDocument` (`DocumentCreateDialog`, import path, manager) use
      `openDocument`; show the existing loading feedback while it reads
- [ ] T007 Fix the tests that set `documents` directly (`tests/sheet_manager/**`,
      `tests/integrations/**`) through a small helper `tests/sheet_manager/helpers/seedDocuments.ts`
      that fills `documents` and `entries` together; no assertion is weakened
- [ ] T008 Add the backlog entry for removing the v4 backup after 2027-01-14 (`TODO.md`, same
      pattern as T-108) and a test that fails after that date naming what to delete
- [ ] T009 Run `yarn verify` (schema and persistence change) and commit:
      `feat(store): one record per document and a light index (spec 032, Foundation A)`

## Foundation B - Shared splitter (D8)

**Check**: the template editor behaves as before (its existing tests unchanged); the library dialog
has a draggable divider.

- [ ] T010 Write `tests/shared/splitter.contract.test.tsx`: one suite run against three hosts (the
      editor panes, the library dialog, a bare host for the documents window): pointer drag stores
      once on release and previews while moving, `pointercancel` reverts, arrows move by 10 and
      Shift by 40, Home and double click reset, `role="separator"` with value, min and max, bounds,
      the remembered size, a container that shrinks, collapse below a threshold where enabled
- [ ] T011 Create `src/shared/components/Splitter.tsx` from
      `features/template-editor/components/PaneDivider.tsx` (vertical; adds `collapseBelow` and the
      `pointercancel` revert; keeps `data-pane-divider`) and `src/shared/hooks/usePaneSizes.ts`
      (storage key, limits, container width, minimum for the rest); no import from `sheet_manager`
- [ ] T012 Make `features/template-editor/components/usePaneWidths.ts` a wrapper of `usePaneSizes`
      with the same key (`template-editor-panes`), limits, and results for `readPaneWidths` and
      `fitPaneWidths`; `EditorPanes.tsx` uses `Splitter`; delete `PaneDivider.tsx`
- [ ] T013 Put a `Splitter` between the tree and the details of
      `components/dialogs/LibraryDialog.tsx` (key `library-panes`, replacing `md:max-w-[26rem]`);
      the narrow tab layout stays
- [ ] T014 Run `yarn verify` and commit:
      `refactor(ui): one splitter for the editor and the library (spec 032, Foundation B)`

## Foundation C - Shared tree (D7)

**Check**: library tests pass with the new row attribute only; the generic tree windows long lists.

- [ ] T015 Write `tests/shared/tree-view.contract.test.tsx`: roving focus, arrows, Home, End, Left
      and Right on branches, type-ahead, Enter, Space, Delete, ContextMenu and Shift+F10, single and
      multi selection (Ctrl/Cmd, Shift range), `aria-level`, `aria-setsize`, `aria-posinset`,
      windowing above 200 rows (only visible rows in the DOM, keyboard reaches an unrendered row)
- [ ] T016 Create `src/shared/components/tree/TreeView.tsx`, `TreeRowShell.tsx` (chevron, selection,
      menu button, drag slots), and `VirtualRows.tsx` (measured fixed height; 32 px, 44 px on coarse
      pointers) from `components/dialogs/library/LibraryTree.tsx` and `TreeRow.tsx`; flat rows carry
      their own `setSize` and `position`
- [ ] T017 Rebuild `components/dialogs/library/LibraryTree.tsx` and `TreeRow.tsx` on the shared
      tree: they keep node content (icon per level, badges, counts, drag, checkbox) and
      `features/sheet/data/libraryTree.ts` flatten; rename `data-library-row` in the library tests
- [ ] T018 Run `yarn verify` and commit:
      `refactor(ui): shared tree view for the library (spec 032, Foundation C)`

## User Story 1 - A documents window beside the sheet (P1)

**Check**: open the window with existing documents, move, resize, open a document by click, close,
reload, reopen; the same at 375 px.

- [ ] T019 [US1] Write `tests/sheet_manager/documents-window.test.tsx`: lists old documents at the
      top level with name or type label and marks the open one; click and Enter open on the sheet,
      Ctrl/Cmd and Shift click select without opening; drag by the title bar stays on screen; resize
      within bounds; layout restored and repaired when the screen shrinks; the sheet behind stays
      operable; narrow layout (mocked media query) is full screen with tabs, closes on open; Escape
      closes
- [ ] T020 [US1] Create `src/shared/components/FloatingWindow.tsx` (D9: non-modal dialog, pointer
      drag, eight resize handles, viewport clamp, layout in `useLocalStorageState`, `id` and
      `onFocus` props, full-screen below `md`)
- [ ] T021 [US1] Create `features/documents/rows.ts` (entries and folders to flat rows with names,
      icons, expanded set) and
      `components/documents/{DocumentsWindow,DocumentsTree,DocumentDetails}.tsx`: the tree on
      `TreeView` with open-on-click, the details pane with name, kind, system, setting, place,
      times, Open, Delete, and the rejected-files section moved from the old manager; `Splitter`
      between them (`documents-panes`)
- [ ] T022 [US1] Replace `DocumentManagerDialog` in `features/sheet/shell/SheetWorkspace.tsx`
      (toolbar "Manage" opens the window), delete `components/dialogs/DocumentManagerDialog.tsx`,
      move `tests/sheet_manager/rejected-files-manager.test.tsx` to the new window, and keep
      multi-delete with `ConfirmDialog`
- [ ] T023 [US1] Add en and ru translations in `translations/source/{en,ru}` (window, details, empty
      states, announcements) and run `yarn validate:i18n`
- [ ] T024 [US1] Run `yarn verify` and commit:
      `feat(documents): documents window with a tree (spec 032, US1)`

## User Story 2 - Organize with folders (P2)

**Check**: create nested folders, move by drag, menu, and keyboard, rename, delete, undo, reload.

- [ ] T025 [US2] Write `tests/sheet_manager/tree-operations.test.ts`: create, rename, move, reorder
      by `before`, delete, a move into itself or a descendant refused, depth bound 32, batch applied
      then its inverse equals the start, rank renormalization, `describe` lines, the operation
      schema rejects malformed input
- [ ] T026 [US2] Create `features/documents/operations.ts` (`TreeOperationSchema`, `apply`,
      `describe`, problems) and `features/documents/history.ts` (in-memory 50-step undo and redo of
      inverses); wire `documentStore` folder actions that persist `folders` and entry placement
- [ ] T027 [US2] Add to the window: create, rename, delete of folders; HTML5 drag with the drop
      position shown before the drop and a refusal message for illegal targets; the row menu and
      keyboard commands (F2 rename, Delete, Ctrl+X and Ctrl+V or "Move to…"); the `MoveToPicker.tsx`
      folder picker on the shared tree; undo and redo buttons and Ctrl+Z (`components/documents/`)
- [ ] T028 [US2] Folder delete: a confirmation listing counts and the open document, then the delete
      as one operation; deleting the open document moves the sheet to the nearest remaining one or
      the empty state; sweep behaviour from T003 verified by a test
- [ ] T029 [US2] Extend `documents-window.test.tsx`: drag onto a folder and between rows,
      multi-select move and delete as one step, undo restores order, the open document stays shown
      after a move, a drop on a hidden target is refused, reorder under an active sort is refused
      with the hint
- [ ] T030 [US2] Add en and ru translations; run `yarn verify` and commit:
      `feat(documents): folders, moves, and undo (spec 032, US2)`

## User Story 3 - Find things: search, filter, sort (P3)

**Check**: with mixed documents in nested folders, search, filter by each field, sort by each field.

- [ ] T031 [US3] Write `tests/sheet_manager/documents-query.test.ts`: name search ignoring case,
      `ё`, and accents; ancestors kept and expanded; filters (kind, system, setting, created and
      changed presets) combine; sort by name, kind, system, created, changed in both directions with
      folders first; manual order; unknown times kept apart and never invented
- [ ] T032 [US3] Create `features/documents/query.ts` (normalized names built once per entries
      change, filters, sorts, ancestor expansion) and extend `rows.ts` to take a query
- [ ] T033 [US3] Create `components/documents/DocumentsToolbar.tsx`: debounced search box, a filter
      disclosure (`aria-expanded`) with facets from the entries, removable active-filter chips, the
      sort control, a clear-all action, the empty-result message; the toolbar wraps on narrow
      screens and keeps search and filters for the visit (session storage)
- [ ] T034 [US3] Extend `documents-window.test.tsx` for the toolbar: marks matches, clears one
      filter at a time, kept across close and reopen in the same visit, keyboard operation of every
      control
- [ ] T035 [US3] Add en and ru translations; run `yarn verify` and commit:
      `feat(documents): search, filter, and sort (spec 032, US3)`

## User Story 4 - Thousands of documents stay usable (P4)

**Check**: 3,000 documents: opening, scrolling, search, and a move within the budgets.

- [ ] T036 [US4] Write `tests/sheet_manager/documents.perf.test.ts`: 3,000 entries in nested
      folders; building rows, a search, a sort, and a move compared with a baseline measured in the
      same run (SC-002); a unit test that a closed window adds no subscription to the page
- [ ] T037 [US4] Write `tests-e2e/timings/documents.spec.ts` (seed 3,000 records through the page's
      storage; time open, scroll frames, search; budgets from SC-001 and SC-002; reported only) and
      `tests-e2e/smoke/documents.spec.ts` (create a folder, move, search, undo, reload at 1280 px
      and at 375 px, no logged error or failed request)
- [ ] T038 [US4] Fix whatever the measurements show (row memoization, selectors, debounce); if the
      search misses 200 ms, move it to a worker and record the change in design.md
- [ ] T039 [US4] Run `yarn verify:full` and commit:
      `test(documents): thousands of documents within budget (spec 032, US4)`

## Finish

- [ ] T040 Update the module notes and skills (one owner per rule): `src/sheet_manager/AGENTS.md`
      (storage, index, folders, window, tree operations), the sheet-manager skill, root `AGENTS.md`
      §6 and §8 (shared tree, splitter, window), the T-052 entries in `TODO.md` and `ROADMAP.md`,
      and a historical banner on specs that this one supersedes
- [ ] T041 Write the user guide page for the documents window in `docs/` with its ru mirror
      (folders, search, filters, phone use) and run `yarn validate:i18n`
- [ ] T042 Run `yarn verify:full`; walk the ten steps in design.md "Manual walk" on the dev server
      at 1280 px and 375 px; record results in design.md

## Coverage

| Requirement                    | Tasks                        |
| ------------------------------ | ---------------------------- |
| FR-001, FR-002, FR-003, FR-004 | T019–T022                    |
| FR-005, FR-006                 | T021, T004                   |
| FR-007, FR-008, FR-009         | T025–T029                    |
| FR-010, FR-011, FR-012         | T025–T028                    |
| FR-013, FR-014, FR-015         | T031–T034                    |
| FR-016                         | T004, T031                   |
| FR-017, FR-022                 | T003, T004, T016, T036–T038  |
| FR-018, FR-019                 | T015, T019, T023, T030, T035 |
| FR-020                         | T002, T004                   |
| FR-021                         | T010–T013                    |
| FR-023                         | T015–T017                    |
| FR-024                         | T021, T022                   |
| SC-001, SC-002, SC-003         | T036, T037, T039             |
| SC-004, SC-005, SC-006         | T029, T001, T037             |
| SC-007, SC-008, SC-009         | T019, T034, T010, T015       |
