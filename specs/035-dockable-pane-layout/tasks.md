# Tasks: Dockable Layout of Document Panes

**Input**: [spec.md](spec.md), [design.md](design.md)

**Paused until T-113** (spec.md banner): before implementing, check these tasks against T-113's
documents-window drag and run `/ttg-speckit-analyze` again.

Delivery order follows design.md "Approach": Foundation (layout tree, rectangles, store v2 with the
spec 034 migration, so no story ever loses a reader's panes), then US1 (tabs per group), US2 (drag
and the tab menu), US3 (splits in both directions), US4 (flattened narrow view), US5 (restore and
migration at the browser level), Finish. Paths are under `src/sheet_manager/` unless they start with
`src/shared/`, `translations/`, `tests/`, `tests-e2e/`, or `docs/`; pane code lives in
`features/sheet/panes/`. Phone and desktop are checked in every story (constitution VI).

## Foundation - Layout tree, store v2, migration

**Check**: with one document, and with a stored spec 034 arrangement of three panes, the page looks
and behaves as on branch 034 (three panes become one row of three one-tab groups).

- [ ] T001 Write `tests/sheet_manager/pane-layout-tree.test.ts`: `normalize` (emptied group removed,
      one-child split replaced by its child, same-direction nested split merged, weights kept per
      child); `groupsInOrder` (depth-first reading order); `groupOf`; `addTab` (after the shown
      tab); `moveTab` within and between groups (source group emptied → removed); `closeTab` (the
      right neighbour is shown, else the left); `splitGroup` for each side, inside a same-direction
      parent (sibling inserted, the group's weight halved) and a cross-direction one (wrapped);
      `minSizeOf` (row of three = 3 × 320 + 2 × 6 wide, 200 tall; column of two = 320 wide, 2 ×
      200 + 6 tall); `rectsOf` for a 3 × 2 grid in 1920 × 880 (whole pixels, dividers between, none
      under the minimum); every function returns the same object when nothing changes
- [ ] T002 Create `features/sheet/panes/layoutTree.ts` (types `LayoutNode`, `SplitNode`,
      `GroupNode`, `SplitSide`; the functions of T001; group ids from `randomToken()`) and
      generalize `paneWidths`/`moveDivider` in `layout.ts` to per-child minimums (design D2–D4);
      `MAX_TABS = 12`, `MAX_GROUPS = 6` in `types.ts` replace `MAX_PANES`
- [ ] T003 Write `tests/sheet_manager/pane-store.test.ts` (rewrite): `reconcileLayout` drops deleted
      documents and empty groups; a current document in no tab replaces the shown tab of the last
      focused group (the replaced document leaves the layout); a current document in a tab makes its
      group show it and leads `recent`; an empty layout with a current document becomes one group;
      maximized follows the current group and is cleared when that group goes
- [ ] T004 Rewrite `features/sheet/panes/paneStore.ts` to state `{root, recent, views, maximized}`
      with `reconcileLayout` in `layoutTree.ts`, actions `focusTab`, `closeTab`, `toggleMaximized`
      (group id), `setSplitWeights(path, weights)`, `setPaneView`, and `openBeside` (a new group
      right of the focused one; split rules arrive in US3, until then a row up to six groups and at
      six a new tab of the focused group with the old `panes.replaced` notice, which US1 replaces)
- [ ] T005 Write `tests/sheet_manager/pane-restore.test.tsx` (rewrite): a v2 layout round-trips;
      `readLayout` sanitizes duplicates (first wins), over 12 tabs or 6 groups (rest dropped in
      reading order), wrong weight counts, unknown maximized, each reporting
      `pane-arrangement-invalid` once with what was dropped; a stored `ttgamer:panes:v1` of three
      panes becomes one row with the same order, weights (within 1 %), views, and maximized group,
      and `v1` is removed; an invalid value reports `pane-arrangement-invalid` once and one document
      shows
- [ ] T006 In `features/sheet/panes/types.ts` add the recursive Zod schema (`z.lazy`) and
      `readLayout` (reports what it drops, design "Changed types"), set
      `PANES_STORAGE_KEY = 'ttgamer:panes:v2'`, keep `readArrangement` for the migration under
      `PANES_V1_STORAGE_KEY`; in `paneStore.ts` `merge` migrates v1 when v2 is absent (design
      "Migration")
- [ ] T007 Raise the pin limit to `MAX_TABS` in `store/documentStore.ts` (`pinDocuments`) and its
      test in `tests/sheet_manager/pane-cache.test.ts`
- [ ] T008 Rewrite `features/sheet/panes/PaneArea.tsx` to draw the tree: one group with one tab →
      the document only (no wrapper); otherwise groups as absolutely placed siblings keyed by group
      id from `rectsOf` over the measured area, in reading order in the DOM, vertical dividers
      between row children (design D3); each group renders only its shown tab; pins every open tab
      and loads the shown ones (D11); update `DocumentsWindow.tsx` to the new `openBeside` and
      `MAX_TABS`, and `shell/SheetWorkspace.tsx` (`several` = more than one tab)
- [ ] T009 Adapt
      `tests/sheet_manager/{pane-single,pane-area,pane-renders,pane-view,pane-source,pane-tabs}.test.tsx`
      and `documents-window.test.tsx` to the tree (same guarantees: one document unchanged, a change
      in one group renders no other group)
- [ ] T010 Run `yarn verify` (store and persistence change) and commit:
      `feat(sheet): layout tree and stored layout v2 with the spec 034 migration (spec 035, Foundation)`

## User Story 1 - Each group has its own tabs (P1)

**Check**: three documents in two groups (two tabs and one); switching a tab in the first group
leaves the second unchanged.

- [ ] T011 [US1] Write tests in `tests/sheet_manager/pane-tabs.test.tsx` and `pane-area.test.tsx`:
      each group has its own `tablist` named by group; choosing a tab changes only its group and
      makes it current; closing the shown tab shows the neighbour; closing a group's last tab
      removes the group and the others take its room; frames per design D12 (one group with tabs:
      strip, no frame; several groups: frame each, focused marked); with two or more groups the area
      height is the viewport below it and each group body scrolls (D6); the DOM and Tab order of
      groups follow reading order after a split (D3); double click on a tab and the maximize button
      give its group the whole area, and again restore it
- [ ] T012 [US1] Write tests in `tests/sheet_manager/pane-store.test.ts`: `openInNewTab` adds after
      the shown tab of the focused group and makes it current; a 13th tab closes the least recently
      focused tab that no group shows and returns it; opening a document already in a tab focuses
      that tab
- [ ] T013 [US1] Add `openInNewTab(id)` to `features/sheet/panes/paneStore.ts` (limit per design
      D10)
- [ ] T014 [US1] Turn `PaneTabs.tsx` into a per-group strip (tabs of one group, `aria-label` from
      `panes.groupLabel`, the shown tab's view selector and maximize button at its end) and
      `Pane.tsx` into the group body (`overflow-auto` with several groups, frame rules of D12); one
      group with tabs keeps page scroll; set the area height with several groups (D6) in
      `PaneArea.tsx`
- [ ] T015 [US1] Add **Open in new tab** to the row menu and the details of
      `components/documents/DocumentsWindow.tsx` (keeps the window open on desktop, closes it on a
      phone, as **Open beside**), with notices `panes.closedHidden`; test it in
      `tests/sheet_manager/documents-window.test.tsx` (replace the six-pane notice test)
- [ ] T016 [US1] Add strings `manager.details.openInNewTab`, `panes.groupLabel`,
      `panes.closedHidden` to `translations/source/{en,ru}/ui/sheet/documents.yaml`; remove
      `panes.replaced`; reword `panes.maximize` and `panes.restore` for groups (en + ru)
- [ ] T017 [US1] Run the targeted tests and `yarn verify`; check at 1280 and 375 px on the dev
      server; commit `feat(sheet): tabs per group and Open in new tab (spec 035, US1)`

## User Story 2 - Move tabs by dragging (P2)

**Check**: with two groups, reorder tabs in one, then move a tab to the other; order and membership
are right.

- [ ] T018 [US2] Write `tests/sheet_manager/pane-drag.test.tsx`: dragging C before A gives C, A, B;
      a drop on another strip inserts at the gap; a drop on another group's middle adds it there,
      shown and focused, and the source group loses it (removed if empty); the landing overlay or
      gap mark shows during the drag; `dragend` without a drop (Escape) changes nothing
- [ ] T019 [US2] Write `tests/sheet_manager/pane-keyboard.test.tsx` (moves): Shift+F10 and the
      strip's **Actions** button open the tab menu; **Move left**, **Move right**, **Move to next
      group** (reading order, wraps), **Maximize**, **Close**; each move is announced in the live
      line
- [ ] T020 [US2] Create `features/sheet/panes/useTabDrag.ts` (HTML drag and drop,
      `application/x-ttg-tab`, gap from tab midpoints, `dropZone` middle for bodies; edges come in
      US3) and wire it into `PaneTabs.tsx` and `Pane.tsx` with the overlay; no drag on a coarse
      pointer (design D8)
- [ ] T021 [US2] Add the tab menu with `src/shared/components/tree/TreeContextMenu.tsx` in
      `PaneTabs.tsx` (right click, Shift+F10, ContextMenu key, **Actions** button) and the `sr-only`
      `aria-live="polite"` announcer in `PaneArea.tsx` (design D9, D13); `moveTab` action in
      `paneStore.ts`
- [ ] T022 [US2] Add strings `panes.{actions, moveLeft, moveRight, moveToNextGroup, moved}` (en +
      ru) to `translations/source/{en,ru}/ui/sheet/documents.yaml`
- [ ] T023 [US2] Run the targeted tests and `yarn verify` (store action added); check drag and menus
      on the dev server (desktop and phone); commit
      `feat(sheet): move tabs by dragging or from their menu (spec 035, US2)`

## User Story 3 - Split groups in any direction (P3)

**Check**: three groups in a row, each split downwards, gives six groups in two rows; a horizontal
divider drag resizes them within the minimums.

- [ ] T024 [US3] Add a horizontal host to `tests/shared/splitter.contract.test.tsx` (↑/↓ and Shift
      steps, Home resets, drag previews then stores once, cancel restores,
      `aria-orientation="horizontal"`)
- [ ] T025 [US3] Add `orientation: 'vertical' | 'horizontal'` to
      `src/shared/components/Splitter.tsx` (`clientY`, ↑/↓, `cursor-row-resize`, a horizontal line;
      vertical stays the default)
- [ ] T026 [US3] Write tests: in `tests/sheet_manager/pane-store.test.ts`
      `splitWith(doc, groupId, side)` and **Open beside** refuse a 7th group or a split that would
      not fit `minSizeOf` in the measured area (Open beside then adds a tab with
      `panes.openedAsTab`); in the flattened view only the group count is checked, so on a phone
      **Open beside** still makes a group (design D7); in `pane-drag.test.tsx` a drop on each edge
      splits that way, its own single tab on its own edge does nothing, and no edge is offered at
      six groups or without room; in `pane-keyboard.test.tsx` **Split right**, **Split down**
      (disabled entries at the limit with `panes.groupLimit`), and arrows on a horizontal and a
      vertical divider
- [ ] T027 [US3] Add `splitWith` to `paneStore.ts` (the area size is passed from `PaneArea`), the
      edge zones to `useTabDrag.ts`, **Split right**/**Split down** to the tab menu, and horizontal
      dividers between column children in `PaneArea.tsx` with previews that write the groups'
      `style` directly and `setSplitWeights` on release (design D4, D5)
- [ ] T028 [US3] Add strings
      `panes.{splitRight, splitDown, groupLimit, openedAsTab, split, resizeRows}` (en + ru) to
      `translations/source/{en,ru}/ui/sheet/documents.yaml`
- [ ] T029 [US3] Extend `tests-e2e/smoke/panes.spec.ts`: build a 3 × 2 grid at 1920 × 1080 by
      dragging documents from the documents window onto group edges (T-113, design D14) in at most
      12 actions, every group at least 320 × 200 and all visible without page scroll (SC-001); drag
      a tab to another group (SC-002)
- [ ] T030 [US3] Run `yarn verify:full` (shared component changed); check on the dev server after
      restarting it; commit `feat(sheet): split groups in any direction (spec 035, US3)`

## User Story 4 - Phone and narrow windows stay simple (P4)

**Check**: two groups at 1280 px, narrowed to 375 px, switch documents, widen again.

- [ ] T031 [US4] Write tests in `tests/sheet_manager/pane-area.test.tsx`: under 768 px, or an area
      smaller than `minSizeOf(root)` (four rows in a short window), one strip lists every tab in
      reading order and one unframed document shows; switching there changes the current document
      and the shown tab of its group; widening restores groups, tabs, and sizes unchanged
- [ ] T032 [US4] Draw the flattened view in `features/sheet/panes/PaneArea.tsx` (design D7) with the
      spec 034 phone rendering (no frame, page scroll)
- [ ] T033 [US4] Extend `tests-e2e/smoke/panes.spec.ts`: two groups at 1280 px, 375 px shows one
      document and all tabs, back to 1280 px restores the groups; one document at 375 and 1280 px
      matches `panes-baseline.ts` within 1 % (SC-005)
- [ ] T034 [US4] Run the targeted tests and `yarn verify:fast`; check on a phone; commit
      `feat(sheet): one document at a time on narrow screens (spec 035, US4)`

## User Story 5 - The layout is remembered and existing panes carry over (P5)

**Check**: a two-row layout survives a reload; a stored spec 034 arrangement of three panes loads as
three side-by-side groups.

- [ ] T035 [US5] Extend `tests/sheet_manager/pane-restore.test.tsx`: a two-row layout with views and
      a maximized group survives a remount of the store; a deleted document in a tab is dropped
      quietly (no diagnostics) and an emptied group removed
- [ ] T036 [US5] Extend `tests-e2e/smoke/panes.spec.ts`: build two rows, reload, the same groups,
      tabs, shown tabs, sizes, and views (SC-003); seed `ttgamer:panes:v1` with three panes, load,
      three groups side by side with widths within 1 % (SC-004)
- [ ] T037 [US5] Extend `tests-e2e/timings/panes.spec.ts` with 3,000 documents: show a hidden tab
      and move a tab between groups, reported against 200 ms (SC-007)
- [ ] T038 [US5] Fix whatever the tests find; run `yarn verify`; commit
      `test(sheet): layout restore and spec 034 migration in the browser (spec 035, US5)`

## Finish

- [ ] T039 Update `src/sheet_manager/AGENTS.md` ("Several documents on one screen": groups, tree,
      current = focused group's shown tab, limits, flattened view, storage v2 and migration), and
      `.agents/skills/sheet-manager/SKILL.md`; give `specs/034-multi-document-screen/spec.md` a
      historical banner for its pane layout
- [ ] T040 Rewrite "Several documents side by side" in `docs/documents/index.mdx` and its ru mirror
      in `i18n/ru/` (groups, Open in new tab, dragging, splitting, the tab menu, limits, phone)
      (FR-015); run `yarn validate:i18n`
- [ ] T041 Mark T-117 done in `TODO.md` with a dated note (what was built, what stays for T-113)
- [ ] T042 Run `yarn verify:full`; walk the steps in design.md "Manual walk" on the dev server
      (restarted after the build); record results under "Walk results" in design.md; commit
      `docs(sheet): layout guidance, user guide, backlog, and walk results (spec 035, Finish)`

## Coverage

| Requirement    | Tasks                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| FR-001         | T001–T002, T008                                                             |
| FR-002         | T011, T014                                                                  |
| FR-003         | T012–T013, T015, T026                                                       |
| FR-004         | T018, T020                                                                  |
| FR-005         | T018, T020, T026–T027                                                       |
| FR-006         | T019, T021, T026–T027 (maximize: T011, T019)                                |
| FR-007         | T024–T027                                                                   |
| FR-008         | T011, T014                                                                  |
| FR-009         | T003–T004, T011                                                             |
| FR-010         | T001, T011                                                                  |
| FR-011         | T031–T033                                                                   |
| FR-012         | T005–T006, T035–T036                                                        |
| FR-013         | T012–T013, T026–T027                                                        |
| FR-014         | T019, T021, T024 (labels, keyboard, announcements)                          |
| FR-015         | T016, T022, T028, T040                                                      |
| SC-001, SC-002 | T029 (SC-001 needs the T-113 drag, design D14)                              |
| SC-003, SC-004 | T005, T035–T036                                                             |
| SC-005         | T033                                                                        |
| SC-006         | T019, T024, T026 (one test per action and divider direction)                |
| SC-007         | T037 (reported, not blocking: browser timings never fail a run, AGENTS §11) |
