# Tasks: Several Documents on One Screen

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order follows design.md "Approach": Foundation (pinned cache, pane source, one-pane
`PaneArea` identical to today), then US1 (open beside, tabs), US2 (fit the screen), US3 (per-pane
view), US4 (remembered), US5 (rolls and focus), Finish. Paths are under `src/sheet_manager/` unless
they start with `src/shared/`, `src/integrations/`, `translations/`, `tests/`, `tests-e2e/`, or
`docs/`. New code lives in `features/sheet/panes/`. Phone and desktop are checked in every story
(constitution VI).

## Foundation - Pinned cache, pane source, one-pane area

**Check**: the sheet page with one document looks and behaves exactly as before; a pane's document
is never evicted from the loaded cache.

- [ ] T001 Before any code change, record the baseline in `tests-e2e/smoke/panes-baseline.ts`: page
      heights of the Star Wars character in brief and full view at 375 and 1280 px, as constants
      (the spec 033 baseline files are reused where they already hold them); commit with the first
      commit
- [ ] T002 Write `tests/sheet_manager/pane-cache.test.ts`: with six pinned ids and nine loaded
      documents, `loadInto` evicts none of the pinned or the current one; `loadIntoCache(ids)` reads
      records into `documents` without changing `currentDocumentId`; unknown ids are skipped
- [ ] T003 Add `pinnedIds`, `pinDocuments(ids)` (not persisted, at most six) and
      `loadIntoCache(ids)` to `store/documentStore.ts`; `loadInto` keeps pinned ids beside the
      current one (design D4)
- [ ] T004 Factor `useStoreDocumentSource(documentId?)` out of `useDocumentSource` in
      `hooks/useDocumentSource.ts` (the public hook behaves as before; it subscribes by selector to
      its own document and entry, not to the whole store, design D2); create
      `features/sheet/panes/PaneSourceProvider.tsx` providing it through `DocumentSourceContext`
      with `preview: false` (D1, D2)
- [ ] T005 Give `CurrentDocumentSheet` in `features/sheet/CharacterSheet.tsx` the props `documentId`
      and optional `viewId` instead of reading `currentDocumentId`; the view id overrides
      `preferredViewId` only when given; `CharacterSheet` passes the current id
- [ ] T006 Create `features/sheet/panes/types.ts` (`PaneArrangement`, Zod schema, limit constant 6,
      min width 320) and `features/sheet/panes/paneStore.ts` with the empty state only; create
      `PaneArea.tsx` rendering exactly today's `children` for zero or one pane (D12); use it in
      `features/sheet/shell/SheetWorkspace.tsx`
- [ ] T007 Write `tests/sheet_manager/pane-single.test.tsx`: with one document the page markup
      (class-name snapshot) has no strip, divider, header, or wrapper added; run the existing sheet
      and workspace tests unchanged
- [ ] T008 Run `yarn verify:full` (store edit, shared page shell, baseline in e2e) and commit:
      `feat(sheet): pinned document cache and pane source (spec 034, Foundation)`

## User Story 1 - Keep a second document open beside the first (P1)

**Check**: with two documents, open the second beside the first, edit a value in each, close one;
the other and its values are unchanged.

- [ ] T009 [US1] Write `tests/sheet_manager/pane-store.test.ts`: `openBeside` adds a pane and
      focuses it; the same document focuses its pane (no duplicate); the seventh replaces the least
      recently focused pane, never the focused one, and reports the replaced id; `close` keeps the
      document in `entries`; `recent` order; focus calls `setCurrentDocument` (FR-001 – FR-004,
      FR-011)
- [ ] T010 [US1] Implement `openBeside`, `focus`, `close`, `recent`, and the limit in
      `features/sheet/panes/paneStore.ts`; `pinDocuments(ids)` follows `ids`; "Open" and reference
      fields (`setCurrentDocument`) replace the focused pane's document or focus the pane that shows
      it (D3)
- [ ] T011 [US1] Write `tests/sheet_manager/pane-tabs.test.tsx`: strip only with two or more panes;
      roles `tablist`, `tab`, `aria-selected` on the focused one; ←/→/Home/End move focus and
      select; each tab has a named close button; each pane is a `region` labelled by its tab;
      closing a pane moves focus to the neighbouring tab; a pane whose record cannot be read shows
      an error notice with a close control (reported through `reportSheetIssue`, consumed with
      `takeSheetIssues()`); an unavailable type shows the existing notice for that pane only
      (FR-002, FR-013, FR-017, edge cases)
- [ ] T012 [US1] Create `features/sheet/panes/PaneTabs.tsx` and `Pane.tsx` (header with title, view
      selector slot, maximize slot, close; provider and `CurrentDocumentSheet` inside) and render
      them from `PaneArea.tsx` for two or more panes, panes stacked one under another until the
      layout of US2; touch targets of tab and close at least 32 px on coarse pointers
- [ ] T013 [US1] Add **Open beside** to the row menu and the details pane in
      `components/documents/DocumentsWindow.tsx` and `DocumentDetails.tsx` (window stays open on
      desktop, closes on a phone like Open); toast through `react-hot-toast` (`role="status"`) when
      a pane was replaced; on a phone it adds a tab and focuses it, and **Open** replaces the
      focused pane's document or focuses the pane that already shows it (FR-019); extend
      `tests/sheet_manager/documents-window.test.tsx` and `documents-window.touch.test.tsx` (FR-001,
      FR-004, SC-001)
- [ ] T014 [US1] Add the strings (`ttgamer.ui.sheet.panes.*`: tabs label, close, open beside,
      replaced notice, gone, unavailable) to `translations/source/en/ui/sheet/documents.yaml` and
      the ru mirror (FR-015); run `yarn build:translations`
- [ ] T015 [US1] Run `yarn verify` and commit:
      `feat(sheet): open a document beside another, with a tab strip (spec 034, US1)`

## User Story 2 - The panes fit the screen they are on (P2)

**Check**: three documents at 1280 px and at 375 px; nothing scrolls sideways.

- [ ] T016 [US2] Write `tests/sheet_manager/pane-layout.test.ts` for a pure
      `features/sheet/panes/layout.ts`: `visibleCount` at 375, 767, 768, 1280, 1920 (1 below 768,
      never above six, each pane at least 320 px); visible set is the most recently focused, drawn
      in pane order; choosing a hidden tab replaces the least recently focused visible pane; weights
      sum to 1 and clamp so both neighbours stay at least 320 px (D6, D7; FR-005, FR-006)
- [ ] T017 [US2] Implement `layout.ts` and use it in `PaneArea.tsx`: measure the width with
      `useMeasuredElement`, grid columns from weights, hidden panes not mounted; `Splitter` between
      neighbours (`onPreview` CSS variable, `onChange` stores fractions, Home resets) with the
      divider label string; phone shows one pane and the tabs only
- [ ] T018 [US2] Implement maximize: double click on a tab and a header button (named, keyboard
      operable) toggle `maximized`; ignored when one pane is visible; the restore brings back the
      same panes and weights; add cases to `pane-store.test.ts` and `pane-tabs.test.tsx` (FR-018,
      SC-002)
- [ ] T019 [US2] Write `tests-e2e/smoke/panes.spec.ts` layout cases: 1280 px three panes, each at
      least 320 px, no sideways page scroll; 375 px exactly one pane and the tab strip listing all;
      a third pane at 960 px goes to tabs only; maximize then restore returns the same panes and
      sizes (SC-002); brief heights at pane widths 700 and 400 stay within spec 033 limits (SC-007);
      with one document the page height at 375 and 1280 px stays within 1% of the T001 baseline
      (SC-005); no layout jump on reload
- [ ] T020 [US2] Walk the layout on the dev server on a phone viewport and desktop, light and dark
      (Chrome devtools device mode, touch), tune gaps, header height, and strip scrolling; record
      the numbers in `design.md` "Implementation notes"
- [ ] T021 [US2] Run `yarn verify:full` (shared page layout and a new e2e) and commit:
      `feat(sheet): panes fit the screen with a divider, tabs, and maximize (spec 034, US2)`

## User Story 3 - Choose what each pane shows (P3)

**Check**: switch the right pane from brief to full sheet; the left pane and the documents' stored
preferences do not change.

- [ ] T022 [US3] Write `tests/sheet_manager/pane-view.test.tsx`: a new pane starts in the brief when
      the definition has a view with id `brief` or ending `-brief`, else with no override; every
      shipped definition's brief view matches that rule; changing a pane's view writes the pane
      store and never `preferredViewId`; a custom page option (`tpl:<id>`) works in a pane (FR-008)
- [ ] T023 [US3] Add `views` to the pane store and `briefViewOf(definition)` in
      `features/sheet/panes/views.ts`; in `Pane.tsx` use `ViewModeSelect` and `selectableViews`
      unchanged with handlers writing the pane store, passing `viewId` to `CurrentDocumentSheet`;
      with two or more panes the toolbar selector in `SheetWorkspace.tsx` is hidden with two or more
      panes (each pane header has its own), with one pane it keeps writing the preferred view (D8)
- [ ] T024 [US3] Run `yarn verify` and commit:
      `feat(sheet): each pane has its own view (spec 034, US3)`

## User Story 4 - The arrangement is remembered (P4)

**Check**: arrange three panes, reload, the same three; delete one document and reload again.

- [ ] T025 [US4] Write `tests/sheet_manager/pane-restore.test.ts`: persisted panes, order, weights,
      views, and maximized restore; ids with no entry are dropped without an error; broken or
      old-version storage falls back to the current document alone and reports once; a normal
      deletion reports nothing; the current document missing from the stored panes replaces the
      focused one; deleting a document (tree delete or another tab's index merge) removes its pane
      and focuses the survivor (FR-012, D11)
- [ ] T026 [US4] Persist the pane store (Zustand `persist` with `skipHydration`, rehydrated after
      mount, on localStorage key `ttgamer:panes:v1`, Zod parse on read, `partialize` without
      transient fields); restore after the documents index hydrates in
      `features/sheet/panes/useRestorePanes.ts`: filter against `entries`, `loadIntoCache`, ensure
      the current document is a pane, call `pinDocuments`; subscribe to `entries` for deletions; use
      it in `PaneArea.tsx`
- [ ] T027 [US4] Extend `tests-e2e/smoke/panes.spec.ts`: three panes reload to the same panes,
      order, sizes, and views; delete one document through the documents window, reload, the other
      two come back (SC-004); a store with nothing stored shows the current document alone
- [ ] T028 [US4] Run `yarn verify` and commit:
      `feat(sheet): the pane arrangement is kept per device (spec 034, US4)`

## User Story 5 - Rolls and the dice panel know their document (P5)

**Check**: roll a stat in each of two panes; focus the left pane; the dice panel's shown document
follows.

- [ ] T029 [US5] Write `tests/sheet_manager/pane-source.test.tsx`: two panes edit only their own
      document; a roll queued from the right pane carries the right document's `rollSource` and
      character name through `useSheetDiceActions`; focusing or editing in a pane sets
      `currentDocumentId` and the published shown document (`getShownDocument`); the documents
      window marks the focused pane's document as current; with six panes no pane's document leaves
      the cache; a write to one document does not re-render the other panes (render count) (FR-009 –
      FR-011, SC-006)
- [ ] T030 [US5] Focus on pointer down, focus-in, and edit inside a pane calls `focus(id)`; fix what
      T029 finds in `useBoundDocument` / `useDocumentRollSource` paths
      (`features/sheet/declarative/boundDocument.ts`, `hooks/useDocumentSource.ts`) so every element
      reads the pane's document, including `useCharacterContext` overrides
- [ ] T031 [US5] Extend `tests-e2e/smoke/panes.spec.ts`: roll a stat in each pane with two
      characters of different names and read the history entry names (SC-006); add a browser timing
      for opening a second pane on 3,000 documents next to the existing documents timings (SC-003,
      reported); no console error in any smoke case
- [ ] T032 [US5] Run `yarn verify:full` and commit:
      `feat(sheet): rolls and the dice panel follow the focused pane (spec 034, US5)`

## Finish

- [ ] T033 Update the module notes and skills this feature changes (one owner per rule):
      `src/sheet_manager/AGENTS.md` (panes, pinned cache, "current = focused pane", per-pane view),
      the `sheet-manager` skill note, root `AGENTS.md` structure line if it lists panes
- [ ] T034 Update the user guide `docs/documents/index.mdx` and its Russian mirror
      `i18n/ru/docusaurus-plugin-content-docs/current/documents/index.mdx` (open beside, tabs,
      maximize, phone behavior) (FR-016); run `yarn validate:i18n`
- [ ] T035 Mark T-112 in `TODO.md` as done with the spec reference; note in T-113 what panes leave
      open (floating windows, docks, Library and dice in windows)
- [ ] T036 Run `yarn verify:full`; walk the steps in design.md "Manual walk" on the dev server
      (phone and desktop, light and dark); record results in design.md

## Coverage

| Requirement            | Task                            |
| ---------------------- | ------------------------------- |
| FR-001                 | T009, T010, T013                |
| FR-002, FR-003         | T009, T011, T012                |
| FR-004                 | T009, T010, T013                |
| FR-005, FR-006         | T016, T017, T019                |
| FR-007, SC-007         | T012, T017, T019                |
| FR-008                 | T022, T023                      |
| FR-009, FR-010, FR-011 | T029, T030                      |
| FR-012, SC-004         | T025, T026, T027                |
| FR-013                 | T011, T012, T013, T018          |
| FR-014, SC-005         | T001, T007                      |
| FR-015                 | T014                            |
| FR-016                 | T034                            |
| FR-017                 | T011, T012                      |
| FR-018                 | T018, T019                      |
| FR-019                 | T010, T013                      |
| SC-001                 | T013                            |
| SC-002                 | T018, T019                      |
| SC-003                 | T031 (browser timing, reported) |
| SC-006                 | T029, T031                      |
