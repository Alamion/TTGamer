# Design: Documents Window with a Folder Tree

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-14

## Approach

Seven steps, one commit each. Storage first because it is the riskiest and everything reads it:

1. **Foundation: storage split** — a light index per document plus one stored record per document.
2. **Foundation: shared splitter** — `PaneDivider` promoted; editor and library dialog use it.
3. **Foundation: shared tree** — `LibraryTree`/`TreeRow` generalized; the library is its first user.
4. **US1 window** — floating window (desktop) or full screen (phone), tree left, details right.
5. **US2 folders** — pure tree operations, undo/redo, drag, "Move to…", delete with confirmation.
6. **US3 search, filter, sort** — name search, facets, sort modes, kept per visit.
7. **US4 scale** — windowed rows, a 3,000-document seed, perf and browser timings.

Phone and desktop are designed together: every control has a pointer, a keyboard, and a touch path,
and every layout is checked at 375 px and at 1280 px (manual walk, steps 9–10).

## Decisions

- **D1 — placement and times live in the index, not in the envelope**: an index entry is
  `{ id, name, kind, systemId, definitionId, settingId?, templateId?, parentId, rank, createdAt?, changedAt? }`;
  folders are `{ id, name, parentId, rank, createdAt, changedAt }`. _Why_: the envelope schema, the
  export file, and the cloud contract stay untouched (contract changes need the backend's approval,
  `contracts/cloud-api/CHANGES.md`); a file's folder is not file content. _Rejected_:
  `folderId`/times in `DocumentMetadata` — a contract and export change, and a new `zod-baseline`
  snapshot. Mapping folders to the cloud is a later contract change (FR-020 is met by ids and one
  shape, not by the cloud).
- **D2 — one stored record per document** (`doc:<id>` in the existing localForage), the persisted
  store keeps only entries, folders, `currentDocumentId`, `recoveryEntries`. `documents` stays the
  array of **loaded** envelopes (the open one plus an LRU of 8); `openDocument(id)` loads, then sets
  the current one; `entries` is the full list. Readers that scanned every envelope for metadata
  (`libraryActions`, `libraryMoves`, `templateRetarget`, `LibraryDialog` counts) read entries
  instead; the few that need data (`EditorPreview` of the open document, retarget compatibility)
  load by id. _Why_: principle VII; 3,000 sheets of tens of KB each must not sit in memory at boot.
  _Rejected_: index beside whole-array persistence — boot still parses every sheet.
- **D3 — write-through, one writer**: every store mutation updates the loaded envelope and its entry
  in one `set`; a subscriber saves changed envelopes after 300 ms (flushed on `pagehide`).
  `changedAt` moves at most once per 5 s per document. `rebuildIndex()` (reads every record) runs
  only on migration or when an entry has no record. Entries carry `updatedAt` so a save merges by id
  instead of replacing the whole index (D13).
- **D4 — migration v4 → v5 with a backup**: the raw v4 value is copied to
  `universal-character-storage:v4-backup` first; then each envelope becomes a record and an entry
  (times unknown, top level). Idempotent, so a crash mid-way reruns. The backup is deleted after the
  second launch that opened the app and its open document without a reported storage issue (a
  counter in `localStorage`), so it does not double the stored size for long. _Rejected_: migrating
  in place — a failed migrate followed by the next write would overwrite the only copy; a fixed date
  — keeps the copy for months on a device that opens the app daily.
- **D5 — delete removes entries, not content**: undo restores entries from the history; a delete
  also appends the ids to `pendingPurge` in the persisted state, and the next boot's sweep removes
  exactly those records (and their portraits). A record with no entry that is not in `pendingPurge`
  is never deleted: it is reported and its entry rebuilt (`rebuildIndex`), so a stale tab cannot
  turn a lost index row into a lost document. _Why_: undo of a 3,000-document folder holds nothing
  heavy; "history until reload" (clarified) needs no disk. _Rejected_: reading deleted envelopes
  into the history — memory spike.
- **D6 — tree operations are data**: `TreeOperation` (Zod, JSON) =
  `createFolder | rename | move | delete`; `apply(state, ops)` returns
  `{ state, inverse, problems }`; `describe(op, state)` gives the preview line; reorder is a `move`
  with `before`. `rank` is a number midpoint, renormalized when a gap drops under 1e-6. The window
  runs the same functions an AI role will call later (FR-010); no model code is written now. Undo
  history is an in-memory stack of 50 inverses. Depth bound 32; a move into itself or a descendant
  is a `problem` and changes nothing.
- **D7 — shared tree**: `src/shared/components/tree/TreeView` takes flat rows
  (`key, depth, setSize, position, expandable, expanded, label, icon`), selection (single, or multi
  with anchor), and slots (trailing, menu, drag). It owns the WAI-ARIA keys, type-ahead, roving
  focus, context menu keys, and fixed-height row windowing above 200 rows (row height is measured;
  32 px, 44 px on coarse pointers). `LibraryTree` keeps only its node content and flatten.
  _Rejected_: a second tree for documents — the style drift the maintainer asked to avoid.
- **D8 — shared splitter**: `shared/components/Splitter` (vertical divider) plus
  `usePaneSizes(storageKey, limits, containerWidth, minRest)`; the editor's `usePaneWidths`,
  `readPaneWidths`, and `fitPaneWidths` become wrappers with the same storage key and results.
  Added: size revert on `pointercancel`. Collapsing a pane below a threshold is not built here; it
  arrives with several windows (T-113). Library tree pane gets a splitter (`library-panes`)
  replacing its fixed `md:max-w-[26rem]`.
- **D9 — window**: `shared/components/FloatingWindow` (non-modal `role="dialog"`, `aria-modal` off,
  no focus trap, Escape closes while focus is inside). Pointer-capture drag by the title bar, eight
  resize handles, clamped to the viewport, layout in `useLocalStorageState('documents-window')` and
  repaired on resize. Below `md` it is a full-screen sheet with a visible close; the tree and the
  details become two tabs (as in the library) and opening a document closes it. _Rejected_: Radix
  `Dialog` — modal, blocks the sheet (FR-002). T-113 later adds z-order and several windows; the
  component takes `id`/`onFocus` now so it does not change.
- **D10 — details pane (spec FR-024)**: the right pane shows the selected row: name (editable),
  kind, system, setting, place, created and changed, "Open", "Move to…", "Delete"; for several rows
  a count and the bulk actions; the manager's rejected-files section moves here unchanged.
- **D11 — touch and HTML5 drag**: mouse drag uses HTML5 drag (as the library does); touch has no
  drag, so phone and keyboard use selection plus "Move to…" (a folder picker, itself the shared
  tree). Menu buttons are always visible on coarse pointers.
- **D12 — search**: names normalized once per entries change (`normalizeSearchText`), a linear scan
  after a 100 ms debounce; ancestors of matches are expanded and kept. Facets come from entries
  (distinct kinds, systems, settings); time filters are presets (24 h, 7 d, 30 d, older, unknown).
  _Rejected_: BM25 or a worker — names only, 3,000 rows scan in under a millisecond; the perf test
  is the check, a worker is the fallback.
- **D13 — other tabs**: on window focus the index is rehydrated (entries and folders only) and
  merged by id with the newer `updatedAt` winning; saving the index merges the same way, so a stale
  tab never drops another tab's rows. A record saved by another tab is read when opened. Last write
  per document wins.

## Changed types and data

- New: `features/documents/{operations,history,query,rows}.ts`,
  `components/documents/{DocumentsWindow,DocumentsTree,DocumentDetails,DocumentsToolbar,MoveToPicker}.tsx`,
  `store/documentContent.ts` (records, writer, sweep), `store/documentIndex.ts` (entry and folder
  types, Zod). The persisted state also holds `pendingPurge` (ids).
- `documentStore.ts`: persisted version 5; `entries`, `folders`, `openDocument`, folder and tree
  actions; `createDocument`, `importDocument`, `deleteDocument`, metadata and value writers keep
  their signatures. Imports (spec 031) arrive at the top level.
- Removed: `DocumentManagerDialog.tsx` (its rejected-files section moves to the details pane).
- Translations (en, ru): window, toolbar, filters, menus, confirmations, empty states,
  announcements.
- Guidance: `src/sheet_manager/AGENTS.md` (storage, tree, window), sheet-manager skill, `AGENTS.md`
  §6 and §8, `TODO.md`/`ROADMAP.md` (T-052 first slice done; backup removal; cloud mapping of
  folders to the cloud contract), a short user guide page (en + ru).

## Principles at risk

- **VII**: the storage split and windowing are the answer; the perf test is the proof. Boot reads
  the slim state and the open record only.
- **II**: no envelope, export, or contract change; entries and folders have Zod schemas; the v4
  backup and the idempotent migration protect stored data.
- **I**: new code lives under `features/documents` and `shared/`; generic code reads kinds and
  systems through the registry like `documentLabels`; the boundary test stays green.
- **VI**: tree and splitter semantics, labels, alerts, themes, en/ru; the storybook rule covers
  template elements only, so it does not apply.
- **V**: persistence and schema edits run `yarn verify` plus `yarn contract:report`; every step that
  adds a shared component runs `yarn verify:full` and compares the bundle size (VII).

## Tests

- `document-store-v5.test.ts`: migration of v4 (all envelopes, current id, recovery entries, backup
  written, idempotent rerun); a record missing for an entry rebuilds it; the sweep removes only
  `pendingPurge` ids and never an unlisted record; the backup goes after the second clean launch;
  boot and a name search read no record but the open one (spy on `readRecord`).
- `document-index.test.ts`: write-through keeps entries equal to envelopes; `changedAt` throttle;
  two store instances over one storage (stale tab) merge by id and lose no row.
- `tree-operations.test.ts`: create, rename, move, reorder, delete, cycle refusal, depth bound,
  batch with inverse equals identity, rank renormalization; saved and reloaded folders and order
  equal the state before.
- `documents-query.test.ts`: search (case, `ё`, accents), ancestors kept, filters combine, sort with
  folders first, unknown times kept apart.
- `splitter.contract.test.tsx`: one suite over the documents window, library dialog, template editor
  (pointer, keys, reset, bounds, remember, container shrink); the editor's existing tests stay
  unchanged. The documents-window host is the real window once US1 exists.
- `tree-view.contract.test.tsx`: keys, type-ahead, multi-select, windowing over the library and
  documents trees; library tests keep passing with the new row attribute.
- `documents-window.test.tsx`: open/move/resize/restore/repair layout, click opens, Ctrl/Shift
  select, folder delete confirmation and undo, narrow layout (media query mocked).
- `documents.perf.test.ts` and `tests-e2e/timings/documents.spec.ts`: 3,000 entries seeded; open,
  search, move, scroll against SC-001/002; smoke test `tests-e2e/smoke/documents.spec.ts` at 375 px
  and 1280 px with no logged error.

## Manual walk

1. Reload with old documents → all at the top level, sheet unchanged, backup key exists.
2. Open the window; drag, resize, reload → same place; shrink the browser → window stays visible.
3. Create nested folders, drag documents in, reorder, undo each → structure returns.
4. Delete a folder with the open document inside → confirmation names it; undo restores all.
5. Search, filter by kind and age, sort by changed → rows and ancestors match.
6. Tab through the tree with the keyboard; move rows with "Move to…"; Escape closes the window.
7. Seed 3,000 documents → window opens at once, scrolling smooth, search responsive.
8. Library dialog and template editor dividers: drag, arrows, Home, double click.
9. 375 px width: full-screen sheet, tabs tree/details, tap targets 44 px, no horizontal scroll.
10. 1280 px width: sheet usable behind the window; light and dark themes.
