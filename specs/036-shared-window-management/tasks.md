# Tasks: Shared Window Management

**Input**: [spec.md](spec.md), [design.md](design.md), and as input
[spec 035's design](../035-dockable-pane-layout/design.md) (D1–D13 hold unless design.md changes
them)

Delivery order follows design.md "Approach". Paths are under `src/sheet_manager/` unless they start
with `src/shared/`, `src/dice_roller/`, `src/integrations/`, `translations/`, `tests/`,
`tests-e2e/`, or `docs/`; pane code lives in `features/sheet/panes/`. Phone and desktop are checked
in every story (constitution VI); where the look of a tool in a narrow group is uncertain, show the
maintainer a concept as an artifact before building it.

## Foundation - Layout tree over tab keys, store v2, migration

**Check**: with one document, and with a stored spec 034 arrangement of three panes, the page looks
and behaves as on branch 034 (three panes become one row of three one-tab groups).

- [x] T001 Write `tests/sheet_manager/pane-tab-keys.test.ts`: `d:`/`t:` keys round-trip, unknown
      prefixes are rejected, `tabKinds` lookup by key
- [x] T002 Create `features/sheet/panes/tabKeys.ts` (`docKey`, `toolKey`, `parseTabKey`, the
      `tabKinds` registry with `title`, `render`, `onClose`, `minSize`; design D1)
- [x] T003 Write `tests/sheet_manager/pane-layout-tree.test.ts`: `normalize` (emptied group removed,
      one-child split replaced, same-direction nested split merged, weights per child);
      `groupsInOrder` (depth-first reading order); `groupOf(key)`; `addTab` (after the shown tab);
      `moveTab` within and between groups; `closeTab` (right neighbour shown, else left);
      `splitGroup` on each side, inside a same-direction parent (sibling, weight halved) and a cross
      one (wrapped); `minSizeOf` (row of three = 3 × 320 + 2 × 6 wide; column of two = 2 × 200 \+ 6
      tall; a collapsed group counts as its 28 px strip); `rectsOf` for 3 × 2 in 1920 × 880 (whole
      pixels, none under the minimum); the same object back when nothing changes
- [x] T004 Create `features/sheet/panes/layoutTree.ts` (types `LayoutNode`, `SplitNode`, `GroupNode`
      with `collapsed`, `SplitSide`; the functions of T003; group ids from `randomToken()`) and
      generalize `paneWidths`/`moveDivider` in `layout.ts` to per-child minimums;
      `MAX_DOCUMENTS = 12`, `MAX_GROUPS = 6`, `MAX_FLOATING = 4` in `types.ts` replace `MAX_PANES`
- [x] T005 Write `tests/sheet_manager/pane-store.test.ts` (rewrite): `reconcileLayout` drops deleted
      documents and empty groups; `currentDocumentId` is the source and its key leads `recent` (a
      stale stored `recent` is corrected, never trusted); a current document in no tab replaces the
      shown tab of the group holding the most recent grouped `d:` key (never a floating one; none →
      first group); a current document in a tab makes its group show it; an empty layout with a
      current document becomes one group; maximized follows its group and is cleared when it goes
- [x] T006 Rewrite `features/sheet/panes/paneStore.ts` to state
      `{root, recent, views, maximized, floating, lastRect, lastSide}` with `reconcileLayout`,
      `focusTab`, `closeTab`, `toggleMaximized` (group id), `setSplitWeights(path, weights)`,
      `setPaneView`, and `openBeside` (a new group right of the focused one; until US2 a row of up
      to six groups, then a new tab with the old `panes.replaced` notice, which US1 replaces)
- [x] T007 Write `tests/sheet_manager/pane-restore.test.tsx` (rewrite): v2 round-trips; `readLayout`
      drops duplicates (first wins), over 12 documents, 6 groups, or 4 floating windows (rest
      dropped in reading order), wrong weight counts, unknown keys and maximized, each reporting
      `pane-arrangement-invalid` once with what was dropped; a stored `ttgamer:panes:v1` of three
      panes becomes one row with the same order, weights (within 1 %), views, maximized, and `v1` is
      removed; an invalid value reports once and one document shows
- [x] T008 In `features/sheet/panes/types.ts` add the recursive Zod schema (`z.lazy`) and
      `readLayout`, `PANES_STORAGE_KEY = 'ttgamer:panes:v2'`, `readArrangement` kept under
      `PANES_V1_STORAGE_KEY`; `paneStore.ts` `merge` migrates v1 when v2 is absent and reads
      `window-layout:documents` once as `lastRect` of `t:documents`, then removes it
- [x] T009 Raise the pin limit in `store/documentStore.ts` (`pinDocuments`) to `MAX_DOCUMENTS`; its
      test in `tests/sheet_manager/pane-cache.test.ts`
- [x] T010 Rewrite `features/sheet/panes/PaneArea.tsx` to draw the tree: one group with one document
      → the document only (no wrapper); otherwise groups absolutely placed from `rectsOf` over the
      measured area, siblings keyed by group id in reading order in the DOM, vertical dividers
      between row children; each group renders only its shown tab through `tabKinds`; pins every
      open document and loads the shown ones; update `DocumentsWindow.tsx` (new `openBeside`,
      `MAX_DOCUMENTS`) and `shell/SheetWorkspace.tsx` (`several` = more than one tab)
- [x] T011 Adapt `tests/sheet_manager/pane-single.test.tsx`, `pane-area.test.tsx`,
      `pane-renders.test.tsx`, `pane-view.test.tsx`, `pane-source.test.tsx`, `pane-tabs.test.tsx`,
      and `documents-window.test.tsx` to the tree (one document unchanged; a change in one group
      renders no other group)
- [x] T012 Run `yarn verify` and commit
      `feat(sheet): layout tree over tab keys and stored layout v2 with the spec 034 migration (spec 036, Foundation)`

## User Story 1 - Groups with their own tabs (P1)

**Check**: three documents in two groups (two tabs and one); switching a tab in the first leaves the
second unchanged.

- [x] T013 [US1] Write tests in `tests/sheet_manager/pane-tabs.test.tsx` and `pane-area.test.tsx`: a
      `tablist` per group named by group; choosing a tab changes only its group and makes its
      document current; closing the shown tab shows the neighbour; a group's last tab closed removes
      the group; frames (one group with tabs: strip, no frame; several: frame each, the focused
      marked); with two or more groups the area is the viewport below the toolbar and each group
      scrolls, one group keeps page scroll; DOM and Tab order follow reading order; double click on
      a tab and the maximize button give the group the whole area and restore it
- [x] T014 [US1] Write tests in `tests/sheet_manager/pane-store.test.ts`: `openInNewTab` adds after
      the shown tab of the last focused group and makes it current; a 13th document closes the least
      recently used document tab that no group shows and returns it; opening a document already in a
      tab or floating focuses it
- [x] T015 [US1] Add `openInNewTab(id)` to `paneStore.ts`; turn `PaneTabs.tsx` into a per-group
      strip (`panes.groupLabel`, the shown document's view selector and maximize button at its end)
      and `Pane.tsx` into the group body (`overflow-auto` with several groups); set the area height
      with several groups in `PaneArea.tsx`
- [x] T016 [US1] Add **Open in new tab** to the row menu and details of
      `components/documents/DocumentsWindow.tsx` (window stays open on desktop, closes on a phone)
      with the `panes.closedHidden` notice; test it in
      `tests/sheet_manager/documents-window.test.tsx` (replacing the six-pane notice test)
- [x] T017 [US1] Strings in `translations/source/{en,ru}/ui/sheet/documents.yaml`:
      `manager.details.openInNewTab`, `panes.groupLabel`, `panes.closedHidden`; reword
      `panes.maximize`/`panes.restore` for groups; remove `panes.replaced`
- [x] T018 [US1] Run the targeted tests and `yarn verify`; check 1280 and 375 px on the dev server;
      commit `feat(sheet): tabs per group and Open in new tab (spec 036, US1)`

## User Story 2 - Drag tabs and split groups in any direction (P2)

**Check**: reorder tabs, move one to another group, drop one on a bottom edge, drag the new
horizontal divider.

- [x] T019 [US2] Add a horizontal host to `tests/shared/splitter.contract.test.tsx` (↑/↓, Shift
      steps, Home resets, preview then one store, cancel restores, `aria-orientation`), then add
      `orientation` to `src/shared/components/Splitter.tsx` (`clientY`, `cursor-row-resize`)
- [x] T020 [US2] Write `tests/sheet_manager/pane-drop-targets.test.ts`: `hitTest` gives the strip
      gap from tab midpoints, the middle, each edge (outer quarter), and the float zone outside
      groups; no edge at six groups or when `minSizeOf` would not fit; its own single tab on its own
      edge gives nothing
- [x] T021 [US2] Write `tests/sheet_manager/pane-drag.test.tsx`: C before A gives C, A, B; a drop on
      another strip or middle moves the tab there, shown and focused; a drop on each edge splits
      that way; the overlay shows during the drag; `dragend` without a drop changes nothing
- [x] T022 [US2] Write `tests/sheet_manager/pane-keyboard.test.tsx`: Shift+F10, the ContextMenu key,
      right click, and the strip's **Actions** button open the tab menu; **Move left**, **Move
      right**, **Move to next group** (reading order, wraps), **Split right**, **Split down**
      (disabled at six groups with `panes.groupLimit`), **Maximize**, **Close**; arrows on a
      vertical and a horizontal divider; each move announced in the live line
- [x] T023 [US2] Create `features/sheet/panes/dropTargets.ts` (`hitTest`, overlay state) and
      `useTabDrag.ts` (HTML drag and drop, `application/x-ttg-tab`; no drag on a coarse pointer);
      add `moveTab`, `splitWith` (area size from `PaneArea`) to `paneStore.ts`; **Open beside** that
      cannot split adds a tab with `panes.openedAsTab`, except in the narrow view where only the
      group count is checked
- [x] T024 [US2] Add the tab menu with `src/shared/components/tree/TreeContextMenu.tsx` in
      `PaneTabs.tsx`, the `sr-only` `aria-live="polite"` announcer and horizontal dividers between
      column children (previews write the groups' `style` directly, `setSplitWeights` on release) in
      `PaneArea.tsx`
- [x] T025 [US2] Strings (en + ru):
      `panes.{actions, moveLeft, moveRight, moveToNextGroup, splitRight, splitDown, groupLimit, openedAsTab, moved, split, resizeRows}`
- [x] T026 [US2] Run `yarn verify:full` (shared component); restart-check on the dev server; commit
      `feat(sheet): drag tabs and split groups in any direction (spec 036, US2)`

## User Story 3 - Tools are tabs or floating windows (P3)

**Check**: from a first visit build documents left, dice right, two documents in the middle; reload;
float the dice; click the window behind.

- [x] T027 [US3] Extend `tests/shared/floating-window.test.tsx`: controlled mode (`layout`,
      `onLayoutChange`, `zIndex`) keeps no storage key; pressing a window calls `onFocus`; arrows on
      the focused title bar move it, Shift + arrows resize it within its limits, Home restores the
      default; write `tests/shared/window-stack.test.ts` for `useWindowStack` (raise, remove, order,
      z-indexes within `900`–`949`)
- [x] T028 [US3] Add the controlled mode and keyboard move/resize to
      `src/shared/components/FloatingWindow.tsx` and create `src/shared/hooks/useWindowStack.ts`
- [x] T029 [US3] Split `components/documents/DocumentsWindow.tsx` into `DocumentsPanel.tsx`
      (content; its narrow list/details tabs follow its container width via `useMeasuredElement`)
      and the host; register `t:documents` in `tabKeys.ts`; test in `documents-window.test.tsx` that
      the panel works in a 320 px group and in a window
- [x] T030 [US3] Split `components/dialogs/LibraryDialog.tsx` into `LibraryPanel.tsx` (content,
      container-width narrow layout; its confirm and editor dialogs stay modal above everything) and
      register `t:library`; test that it no longer traps focus and that its inner dialogs block;
      before building its narrow layout, show the maintainer a concept artifact of the library in a
      320 px group
- [x] T031 [US3] Write `tests/integrations/dice-tab.test.tsx`: with the host claimed the slide panel
      is not drawn; the navbar toggle opens the dice tab at its last place and closes it; releasing
      the claim brings back today's panel; a tab kind that fails to render releases the claim and
      reports `dice-tab-unavailable` once; then add `claimPanelHost` to
      `src/dice_roller/store/diceRollerStore.ts`, `DicePanelContent` out of
      `src/dice_roller/components/DiceRollerPanel.tsx`, and
      `src/integrations/sheet-dice/diceTab.tsx` registering `t:dice` and mounted by
      `SheetWorkspace.tsx`, and the code `dice-tab-unavailable` in `diagnostics.ts`
- [x] T032 [US3] Write tests in `tests/sheet_manager/pane-store.test.ts`: `openTool` first places
      (documents and library a left-edge group, together as tabs; dice a right-edge group), later
      `lastSide`; `floatTab` (refused at four with `panes.floatLimit`), `dockFloating`, `raise`;
      closing a tool tab closes the tool; a tool is in one place only; at six groups `openTool` adds
      a tab to the outermost group of the tool's side; a 13th document never closes a floating one
- [x] T033 [US3] Add `openTool`, `floatTab`, `dockFloating`, `raise` to `paneStore.ts`; draw
      floating windows in `PaneArea.tsx` through the controlled `FloatingWindow` and the stack; dock
      by dropping a title bar (the window's pointer drag calls `hitTest`); a tab dropped in the
      float zone floats at the drop point; **Float** in the tab menu and **Dock** in a floating
      tab's title bar; replace `managerDialogOpen`/`templatesDialogOpen` in
      `shell/SheetWorkspace.tsx` with `openTool`
- [x] T034 [US3] Extend `tests/sheet_manager/pane-drag.test.tsx` and `pane-keyboard.test.tsx`: float
      by drop and by menu, dock a floating window by title bar onto an edge and by its **Dock**
      button with the keyboard, raise by focus
- [x] T035 [US3] Strings (en + ru):
      `panes.{float, dock, floatLimit, toolDocuments, toolLibrary, toolDice}`
- [x] T036 [US3] Run `yarn verify:full`; check the tools in groups and windows at 1280 and 1920 px
      and on a phone; commit `feat(sheet): tools as tabs or floating windows (spec 036, US3)`

## User Story 4 - Drag documents from the documents window (P4)

**Check**: with one document open, three rows dropped on edges make a 2 × 2 grid.

- [ ] T037 [US4] Write tests in `tests/sheet_manager/pane-drag.test.tsx`: a single document row
      dropped on a strip, a middle, or an edge acts as a tab drop; a document already in a tab moves
      that tab; a folder or several rows offer no target; a row dropped outside every group does
      nothing (no float zone for rows)
- [ ] T038 [US4] In `components/documents/useDocumentsDrag.ts` add the `application/x-ttg-document`
      type when exactly one document is dragged; accept it in `dropTargets.ts`/`PaneArea.tsx`
- [ ] T039 [US4] Run the targeted tests and `yarn verify:fast`; commit
      `feat(sheet): drag documents from the documents window into the layout (spec 036, US4)`

## User Story 5 - Collapse by dragging a divider (P5)

**Check**: the documents group dragged past its edge collapses to a strip and reopens.

- [ ] T040 [US5] Add a collapse case to `tests/shared/splitter.contract.test.tsx` (80 px past `min`
      or Enter calls `onCollapse`, hosts without it clamp as before), then
      `collapseAfter`/`onCollapse` in `src/shared/components/Splitter.tsx`
- [ ] T041 [US5] Write tests in `tests/sheet_manager/pane-area.test.tsx`: collapsing gives a 28 px
      strip button named by the shown tab with `aria-expanded="false"`, the neighbour takes the
      room; Enter on the divider collapses too; click or Enter on the strip expands at the former
      weight; collapsed state survives a remount
- [ ] T042 [US5] Add `collapseGroup`/`expandGroup` to `paneStore.ts` and the strip in
      `PaneArea.tsx`; strings `panes.{collapse, expand}` (en + ru)
- [ ] T043 [US5] Run `yarn verify:full`; commit
      `feat(sheet): collapse a group by dragging its divider (spec 036, US5)`

## User Story 6 - Phones, narrow windows, and other pages (P6)

**Check**: a layout at 1280 px narrowed to 375 px, documents switched, dice opened, widened; the
dice panel on a documentation page.

- [ ] T044 [US6] Write tests in `tests/sheet_manager/pane-area.test.tsx`: under 768 px or below
      `minSizeOf(root)` one strip lists grouped documents in reading order then floating ones, one
      unframed document shows; a tool opens full screen and closing it keeps its desktop place;
      widening restores everything
- [ ] T045 [US6] Draw the narrow view in `PaneArea.tsx` (spec 035 D7, design D11)
- [ ] T046 [US6] Extend `tests-e2e/smoke/panes.spec.ts`: layout at 1280 → 375 → 1280 px; one
      document at 375 and 1280 px within 1 % of `panes-baseline.ts` (SC-004); on a documentation
      page the dice slide panel opens as today
- [ ] T047 [US6] Run the targeted tests and `yarn verify:fast`; check on a phone; commit
      `feat(sheet): one document at a time on narrow screens (spec 036, US6)`

## User Story 7 - The layout is remembered; spec 034 panes carry over (P7)

- [ ] T048 [US7] Extend `tests/sheet_manager/pane-restore.test.tsx`: a two-row layout with tools,
      floating windows, a collapsed group, views, and maximized survives a remount; a deleted
      document is dropped quietly (no diagnostics)
- [ ] T049 [US7] Extend `tests-e2e/smoke/panes.spec.ts`: the four-part layout from a first visit in
      at most 8 actions (SC-001); a 3 × 2 grid by opening and floating the documents window, then
      dragging rows, in at most 12 actions, all groups at least 320 × 200 without page scroll
      (SC-002); reload restores it; a seeded `ttgamer:panes:v1` of three panes loads as three groups
      with widths within 1 % (SC-003)
- [ ] T050 [US7] Extend `tests-e2e/timings/panes.spec.ts` with 3,000 documents: show a hidden tab,
      move a tab, and the longest frame of a window and a divider drag (SC-006, reported)
- [ ] T051 [US7] Fix what the tests find; run `yarn verify`; commit
      `test(sheet): layout restore, migration, and timings in the browser (spec 036, US7)`

## Finish

- [ ] T052 Update `src/sheet_manager/AGENTS.md` (the panes section becomes "Workspace layout":
      groups, tab keys and kinds, current document, floating windows, limits, narrow view, storage
      v2), the dice notes (host claim), `.agents/skills/sheet-manager/SKILL.md`, root `AGENTS.md` §8
      (FloatingWindow stacking and controlled mode, Splitter orientation and collapse); historical
      banner on `specs/034-multi-document-screen/spec.md` for its pane layout
- [ ] T053 Rewrite "Several documents side by side" in `docs/documents/index.mdx` and its ru mirror
      (groups, tools, dragging, splitting, floating, collapsing, limits, phone); update the library
      and dice pages that call them a dialog or a sliding panel; run `yarn validate:i18n`
- [ ] T054 Mark T-113 and T-117 done in `TODO.md` with dated notes (what was built; documentation
      fragments as tabs stay a later task)
- [ ] T055 Run `yarn verify:full`; walk design.md "Manual walk" on the restarted dev server; record
      results under "Walk results" in design.md; commit
      `docs(sheet): workspace layout guidance, user guide, backlog, and walk results (spec 036, Finish)`

## Coverage

| Requirement | Tasks                                                         |
| ----------- | ------------------------------------------------------------- |
| FR-001      | T003–T004, T010                                               |
| FR-002      | T013, T015                                                    |
| FR-003      | T005–T006, T014, T016, T023                                   |
| FR-004      | T020–T021, T023                                               |
| FR-005      | T022, T024, T034                                              |
| FR-006      | T019, T022, T024                                              |
| FR-007      | T013, T015                                                    |
| FR-008      | T029–T034                                                     |
| FR-009      | T027–T028, T033–T034 (keyboard move/resize, **Dock**)         |
| FR-010      | T037–T038                                                     |
| FR-011      | T040–T042                                                     |
| FR-012      | T014, T020, T022, T032 (tool at six groups, 13th document)    |
| FR-013      | T044–T046                                                     |
| FR-014      | T031, T046                                                    |
| FR-015      | T007–T008, T048–T049                                          |
| FR-016      | T013, T019, T022, T041                                        |
| FR-017      | T017, T025, T035, T042, T053                                  |
| SC-001      | T049                                                          |
| SC-002      | T049                                                          |
| SC-003      | T007, T048–T049                                               |
| SC-004      | T046                                                          |
| SC-005      | T019, T022, T034, T040–T041 (one test per action)             |
| SC-006      | T050 (reported; browser timings never fail a run, AGENTS §11) |
