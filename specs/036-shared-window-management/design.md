# Design: Shared Window Management

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-15

## Approach

The panes of spec 034 (`features/sheet/panes/`) become the **layout** of spec 035's design (input,
not repeated here: its D1–D13 hold unless changed below): a tree of row/column splits with group
leaves, groups drawn flat by computed rectangles, `currentDocumentId` as the one current fact,
storage v2 with the spec 034 migration. This design adds three things: **tabs of several kinds**
(documents, the three tools, later documentation fragments) through a small tab-kind registry;
**floating windows** for any tab through the shared `FloatingWindow`, stacked; and **one drop-target
model** fed by HTML drag and drop (tabs, document rows) and by a floating window's title-bar drag.

Order: **Foundation** (tree, tab keys, store v2 + migration, tree renderer) → **US1** strips per
group, **Open in new tab** → **US2** tab drag, splits, horizontal dividers, tab menu → **US3** tools
as tabs and windows (tool content split from hosts, stacking, library non-modal, dice adapter) →
**US4** document rows dragged in → **US5** collapse → **US6** narrow view and other pages → **US7**
restore at the browser level → **Finish**.

## Decisions

- **D1 — Tab keys are strings**: `d:<documentId>` or `t:<toolId>` (`documents`, `library`, `dice`).
  A registry `tabKinds` maps a prefix to `{title, render, onClose, minSize}`; documents and the two
  sheet tools register in `features/sheet/panes/`, the dice panel from an integration (D6). _Why_:
  arrays of strings keep dedup, order, and storage trivial, and a later `f:<docsPath>` kind (spec
  Assumptions) plugs in without a schema change. _Rejected_: tagged objects — every comparison and
  the stored shape get heavier for no gain.
- **D2 — Focus and current**: `currentDocumentId` stays the one current fact (as spec 034); a
  focused document tab, grouped or floating, calls `setCurrentDocument`, focusing a tool keeps it.
  `recent` (tab keys, last used first) is derived: `reconcileLayout` puts the current document's key
  first, so a reload cannot make them disagree. **Open** replaces the shown tab of the group holding
  the most recent `d:` key that is in a group (never a floating one, clarification 3); with none,
  the first group in reading order.
- **D3 — Floating windows**: state `floating: {key, rect}[]` (at most `MAX_FLOATING = 4`), front
  last; `lastRect` and `lastSide` remembered for tools only (documents float at a cascaded default).
  `FloatingWindow` gains a controlled mode (`layout`, `onLayoutChange`, `zIndex`) so the store owns
  the rects instead of one `window-layout:<id>` key per window; its uncontrolled mode stays for
  other users. The documents window's spec 032 rect (`window-layout:documents`) is read once as
  `lastRect` of `t:documents` and removed. Keyboard: arrows on the focused title bar move the
  window, Shift + arrows resize it, Home puts it back to its default; a **Dock** button in the title
  bar of a floating tab sends it to its last side (D10). _Rejected_: a storage key per floating
  document — unbounded keys.
- **D4 — Stacking**: a shared `useWindowStack` (`src/shared/hooks/`, not persisted) orders the open
  floating windows; `FloatingWindow.onFocus` (already reserved for T-113) raises one. Z-indexes stay
  between the layout and modal dialogs (`z-[900]`–`z-[949]`; modals keep `z-[9998]`+, FR-013).
- **D5 — Tools split into content and host**: `DocumentsPanel` (from `DocumentsWindow.tsx`),
  `LibraryPanel` (from `LibraryDialog.tsx`: the Radix modal shell goes, its inner confirm and editor
  dialogs stay modal), `DicePanelContent` (from `DiceRollerPanel.tsx`). A host is a group body or a
  `FloatingWindow`. Their narrow layouts follow their **container** width (`useMeasuredElement`)
  instead of the viewport, so a 320 px group shows the documents list/details tabs. _Rejected_:
  keeping hosts inside each tool — the duplication T-113 exists to remove.
- **D6 — Dice adapter**: `dice_roller` gets a host claim (`claimPanelHost()` → release) in
  `diceRollerStore`; while claimed, `DiceRollerPanel` draws no `SlidePanel`. A new adapter
  `integrations/sheet-dice/diceTab.tsx` registers the `t:dice` kind and, mounted on the sheet page,
  claims the host and maps `panelOpen` to opening (at its last place) or closing the tab. Off the
  sheet page nothing claims it, so the dice panel is as today (FR-014). Contract: `claimPanelHost`
  and `panelOpen` in `diceRollerStore`. Success: the dice open as a tab or window at their place;
  failure (the tab kind cannot render): the adapter releases the claim so the slide panel opens as
  today, and reports `dice-tab-unavailable` through the sheet diagnostics. _Why_: constitution III —
  the sheet and the dice module meet only in `integrations/`.
- **D7 — One drop-target model**: `PaneArea` registers group rects; `hitTest(point)` returns
  `{groupId, zone: 'strip' + index | 'middle' | 'left' | 'right' | 'top' | 'bottom'}` or the **float
  zone** (anywhere outside the groups) and draws the overlay. Inputs: HTML drag and drop of
  `application/x-ttg-tab` (tabs) and of document rows (`useDocumentsDrag` adds the type
  `application/x-ttg-document` only when exactly one document is dragged, since types are readable
  during `dragover` and data is not); and the pointer drag of a floating window's title bar, which
  calls the same `hitTest` and docks on release over a group. A **tab** dropped in the float zone
  floats at the drop point (document rows have no float zone, so a stray row drop does nothing);
  Escape fires no drop, so nothing changes. _Rejected_: pointer drag for tabs too — more code, and
  rows of the documents tree already use HTML drag and drop.
- **D8 — Splits and limits**: as spec 035 D4, D10: `MAX_DOCUMENTS = 12`, `MAX_GROUPS = 6`; a split
  is offered only under seven groups and while `minSizeOf` still fits the area; **Open beside** that
  cannot split adds a tab with a notice. The float zone and **Float** are disabled at four windows
  (clarification 2).
- **D9 — Collapse in the shared `Splitter`**: options `orientation` (spec 035 D5) and
  `collapseAfter` (80 px past `min`, or Enter on the divider, calls `onCollapse` instead of
  clamping; the WAI-ARIA window splitter pattern). A collapsed group keeps its weight and draws a 28
  px strip button named by its shown tab (`aria-expanded="false"`); `minSizeOf` counts it as the
  strip. _Rejected_: collapse inside `PaneArea` only — the backlog asks for the splitter behavior,
  and the contract tests then cover it for every user.
- **D10 — First places**: a tool opened with no remembered place makes a group at the left edge
  (`documents`, `library`: as tabs of one group if both are open) or the right edge (`dice`) of the
  root; later it opens at `lastSide`, in the group of that side's outermost edge if one holds a
  tool, else a new edge group; at six groups it becomes a tab of the outermost group of its side, so
  opening a tool is never refused.
- **D11 — Narrow view (FR-013)**: spec 035 D7, plus: floating documents join the one strip in
  reading order after the groups; tools are not in the strip and open full screen one at a time (the
  existing `FloatingWindow` below `md`); closing that view hides the tool without changing its
  desktop place.
- **D12 — Leaving the sheet page**: the layout and floating windows are not drawn elsewhere; the
  stored layout keeps them. Only the dice panel exists off the page (D6).

## Changed types and data

- `panes/layoutTree.ts` (new, pure, from spec 035's design) over tab keys, plus `collapsed` on
  groups; `panes/tabKeys.ts` (keys, `tabKinds` registry); `panes/dropTargets.ts` (`hitTest`).
- `panes/types.ts`: stored layout v2
  `{root, recent, views, maximized, floating, lastRect, lastSide}`, Zod (recursive), `readLayout`
  sanitizes and reports drops as `pane-arrangement-invalid`; key `ttgamer:panes:v2`; v1 migrated and
  removed (spec 035 "Migration").
- `paneStore.ts`: actions `openInNewTab`, `openBeside`, `openTool`, `closeTab`, `moveTab`,
  `splitWith`, `floatTab`, `dockFloating`, `raise`, `collapseGroup`, `expandGroup`,
  `toggleMaximized`, `setSplitWeights`, `setPaneView`.
- `src/shared/components/FloatingWindow.tsx`: controlled mode, `zIndex`; `Splitter.tsx`:
  `orientation`, `collapseAfter`/`onCollapse`; `src/shared/hooks/useWindowStack.ts` (new).
- `dice_roller/store/diceRollerStore.ts`: `claimPanelHost` (not persisted); `diagnostics.ts`: code
  `dice-tab-unavailable`.
- `SheetWorkspace.tsx`: `managerDialogOpen`/`templatesDialogOpen` become
  `openTool('documents' | 'library')`.
- Translations (`ui/sheet/documents.yaml`, en + ru): spec 035's list plus
  `panes.{float, dock, floatLimit, collapse, expand, toolDocuments, toolLibrary, toolDice}`;
  `panes.replaced` removed.
- Docs: `docs/documents/index.mdx` + ru; the library and dice pages where they say "dialog" or
  "slides in"; `src/sheet_manager/AGENTS.md`, `src/dice_roller` notes, root `AGENTS.md` §8 shared UI
  line (FloatingWindow stacking, Splitter options).

## Principles at risk

- **I/III (module boundaries)**: dice and sheet meet only in `integrations/sheet-dice/` (D6); the
  ESLint boundary rules stay unchanged.
- **III (forgiving, observable)**: every refusal has a notice; sanitizing reports diagnostics.
- **VI (accessibility, look on PC and phone)**: strips are labelled `tablist`s, DOM order follows
  reading order, every drag has a menu path, moves announced; one-document page unchanged (SC-004);
  tools tested in a 320 px group.
- **VII (performance)**: hidden tabs unmounted, previews outside React, at most 6 groups + 4 windows
  drawn; `yarn verify:full` for the shared components.

## Tests

- `tests/sheet_manager/pane-layout-tree.test.ts`, `pane-store.test.ts`, `pane-restore.test.tsx`:
  spec 035's list over tab keys, plus floating limits, `recent` and current (D2), tool first places
  (D10), collapse in `minSizeOf`, migration v1 → v2.
- `pane-tabs`, `pane-area`, `pane-drag`, `pane-keyboard` tests: spec 035's list plus float zone,
  docking a floating window by title bar, tools in groups.
- `tests/shared/splitter.contract.test.tsx`: horizontal host, collapse; `floating-window.test.tsx`:
  controlled mode and stacking.
- `tests/integrations/dice-tab.test.tsx` (new): host claim hides the slide panel; navbar toggle
  opens and closes the tab; release restores today's panel.
- `documents-window.test.tsx`, `library-*.test.tsx`: content renders in a group and a window; the
  library no longer traps focus; narrow layout by container width.
- e2e `tests-e2e/smoke/panes.spec.ts`: four-part layout in ≤ 8 actions (SC-001), 3 × 2 grid by
  dragging rows (SC-002), reload and spec 034 migration (SC-003), 375 px and back, SC-004 baseline;
  `tests-e2e/timings/panes.spec.ts`: tab show/move and drag frames (SC-006, reported).

## Manual walk

1. One document at 1280 and 375 px → as before spec 034.
2. Open the documents window, the library, the dice → left group with two tabs, right group with the
   dice; the sheet between.
3. Drag two document rows onto the middle group's bottom edge and strip → the four-part layout.
4. Float the dice, open a document and float it; click the one behind → it comes forward; a 5th
   float is refused with a notice.
5. Drag a floating window's title bar onto a group edge → docked there.
6. Drag the left divider past the edge → the documents group collapses; Enter on the strip → back.
7. Keyboard only: tab menu Split down, Float, Move to next group; arrows on both dividers.
8. 375 px → one document, one strip; tools full screen; widen → layout back.
9. Open a documentation page → dice slide panel as today; back to the sheet → dice tab in place.
10. Reload → same; dark mode and a real phone readable.

## Implementation notes

- **Foundation**: groups are already drawn by `rectsOf` in an area that fills the window (D6 moved
  up from US1), since absolute placement needs a height; a global strip of every document stays
  until US1 replaces it with strips per group. Spec 034's "as many panes as fit, the rest as tabs"
  is gone: when the groups do not fit, the narrow single view of D11 shows (its tests move up from
  US6). The notices `panes.closedHidden` and `panes.openedAsTab` replace `panes.replaced` in this
  phase, because **Open beside** no longer replaces a pane. The `tabKinds` registry holds tools
  only; documents are drawn by the sheet's `renderDocument`. Reading `window-layout:documents` into
  `lastRect` moves to US3 (T033): until then the documents window still uses that key itself.
- **US1**: a group is a frame (`data-group-frame`) holding its strip and its page; the pane header
  of spec 034 is gone, and the shown document's view selector and the maximize button sit at the end
  of the strip. One group with tabs keeps the page scroll and no frame. The dev server was down
  during this story, so the 1280/375 px check waits for the maintainer.
- **US2**: tab drops are computed from the event target, not a central `hitTest`: a strip finds its
  gap from its tabs' boxes, a group's page finds its edge (`edgeAt`) or middle; the float zone comes
  with floating windows in US3. The shared tree menu gained `disabled` items (`onDisabled` says
  why). happy-dom's `DragEvent` takes no coordinates, so the tests set them on the event
  (`tests/sheet_manager/helpers/tabDrag.ts`). Browser timing "open a second document beside (3,000)"
  read 305 ms against its 200 ms budget in this run (spec 034 saw 169–567 ms on the same machine);
  it is reported, and looked at again in US7.
- **Follow-up after US2 (maintainer's walk)**: group frames are 1 px, the focused one in
  `primary-muted` (the toolbar's New button colour). **Open beside** now checks the room: a new
  group that would leave any group under its minimum in the drawn area (`setLayoutArea`, the
  window's size until the area is drawn) opens the document as a tab instead, with the notice
  `panes.openedAsTab`. Before, six documents opened beside on a 1920 px window made groups that did
  not fit, and the whole layout fell back to the narrow view.
- **US3**:
    - No `useWindowStack`: the stack is the order of `floating` in the layout store (front last,
      kept across reloads), and `FloatingWindow` takes a `zIndex`; it also gained the owned mode
      (`layout`, `onLayoutChange`), keyboard move and resize on its title bar (`moveLabel`), and
      `onDragMove`/`onDragEnd` for docking by the title bar.
    - The documents window and the library are `DocumentsPanel` and `LibraryPanel`; their narrow
      layouts (tree and details as tabs) follow their container (`@container/documents`,
      `@container/library`, switching at `@2xl`) instead of the viewport. The library already had
      that narrow layout, so no new concept was drawn for it. Tests host the panels in a floating
      window (`tests/sheet_manager/helpers/toolWindows.tsx`).
    - Documents open into the group of the last used document, never a tool's (`documentGroup`),
      also for **Open in new tab** and **Open beside**.
    - With no document there is no layout: a tool opened then floats.
    - A tool in a group is a region named by its tab, like a document; browser tests find a tool as
      that region or as a dialog (`tests-e2e/tools.ts`) and float the documents window before
      building grids of documents at 1280 px.
    - New floating windows are 720 × 560, the documents window's old size, so tools open in their
      full layout. The spec 032 place of the documents window (`window-layout:documents`) is read
      once as where it floats, then removed.
    - The dice panel on a phone: closing the full-screen panel keeps its tab; the navbar toggle then
      closes the tab, so reopening takes a second press.
- **US3 follow-up (maintainer's walk)**:
    - A tool the reader switches to in the group of the current document stays shown; reconciling
      showed the current document again on every render.
    - A phone is told by the **window** width (below 768 px), not the layout area: the area is the
      window less its padding, so 768–800 px windows fell into the narrow view with one group.
    - The narrow view of a window that is not a phone but too narrow for the layout keeps the docked
      tools in its strip, after D11 left them out: there the full-screen tool of a phone does not
      exist, so tools could not be reached. A phone keeps the strip of documents only.
- **US4**:
    - A single document row carries `application/x-ttg-document`; its id is held in the page
      (`setDraggedDocument` in `dropTargets.ts`), because a drag's data cannot be read before the
      drop. `useTabDrag` takes it as that document's tab; `dropDocument` moves an open tab, docks a
      floating one, or opens the document there (the limit of 12 applies, with its notice).
    - The one document drawn without a frame is a drop target too, without wrapping the page (spec
      034, FR-014): while a row is dragged (`useRowDragging`), a fixed layer over the page takes it,
      with the same edges and middle; floating windows stay above it. A zero-height element before
      the page measures the area. The overlay is shared (`DropOverlay`).
    - A row over the documents window's own tree is left to the tree (moving it between folders).
- **US6**:
    - Most of the narrow view came earlier (Foundation; the US3 follow-up). Its strip now differs by
      where it shows: a phone floats nothing, so its strip lists the grouped documents and then the
      floating ones (D11), and tools show over the page; a wider window that only lacks room keeps
      its windows floating and lists the grouped documents and tools.
    - The dice toggle on a phone: when the full-screen panel was put away but its tab is open, the
      navbar toggle shows it again instead of closing the tab (the US3 nuance).
    - A tool shows over the page only when it is opened on a phone (`shownTool`); before, opening
      one on a wide screen set it too, so narrowing the window later popped the tool up over the
      strip (found by the new browser test).
    - Tests make a window width with `windowWidth` (media queries and listeners); happy-dom's
      `ResizeObserver` never fires, so the widening test measures on window resizes.
- **US7** (the tests found two defects):
    - Every floating window took focus as it mounted, and focus raises a window, so a reload
      reordered the stack and moved focus into a restored window. Now only the window the reader
      just opened (`freshWindow`: floated, or a tool opened with no document) takes focus
      (`FloatingWindow`'s `focusOnOpen`).
    - The layout filled the window but the publisher notices below it still made the page scroll by
      their height. The fill height now leaves room for what the page lays out below the area
      (`flowBelow`), so a 3 × 2 grid at 1920 × 1080 shows whole with no page scroll (SC-002).
    - Browser checks: the four-part layout takes 3 actions (SC-001), the 3 × 2 grid 8 (SC-002), a
      spec 034 arrangement keeps its widths (SC-003). Timings with 3,000 documents: show a hidden
      tab 85 ms, move a tab 181 ms, longest frame 17 ms (divider) and 33 ms (window) (SC-006).
- **Publisher badge (maintainer's walk after US7)**: the badge followed the current document and sat
  under the layout, so groups filling the window pushed it below the fold, and a floating V5
  document's badge appeared under a tool shown in the page. Now the layout places it once per
  surface for the documents that surface shows: under the page while one document scrolls with it
  (as before), at the end of the toolbar over groups that fill the window, and at the foot of each
  floating document's window (constitution VIII: once, prominent, on the surface with the material).
- **Dock compass (maintainer's walk after US4)**: a floating window docked on whatever group was
  under its title bar, so with several groups it could hardly be moved without docking. Now, while
  it is dragged, a compass of five 36 px squares shows in the middle of the group's page (the
  middle, and each side the group may split on); the window docks only on a square or on a strip,
  and anywhere else it only moves (the Visual Studio pattern). Dragged tabs keep the large zones: a
  tab is always dropped somewhere in the layout. The one document's drop layer also shows while a
  window is dragged, so it has a compass too.
- **US5**:
    - `Splitter` collapses by side (`onCollapse('start' | 'end')`): a drag ending 80 px past either
      neighbour's minimum collapses that neighbour; Enter collapses the `primary` side, which the
      layout sets to the smaller group (a split next to a group is never collapsed). The divider
      next to a strip is not drawn: the strip opens with a click or Enter.
    - A tab placed or shown in a collapsed group opens it, so opening a document or a tool there
      never leaves it hidden.
    - Agreed with the maintainer during the US3 walk: when the layout does not fit, groups of tools
      only are drawn as strips (the least recently used first, never the group used last) before the
      narrow view takes over (`fitByCollapsing`). It changes only the drawing; a click on such a
      strip uses its tool, and another tool group gives way. Opening beside, docking a tool, and the
      split targets count that room too, so a third group of tools opens at about 700 px of area
      instead of 980.

## Walk results

2026-10-16, after `yarn verify:full` (green: 2747 unit tests, perf, 47 browser tests).

- The maintainer walked every story on the dev server as it landed (US1–US7) and reported what to
  change; each report was fixed and recorded above: the tab corner, thinner frames, Open beside
  stacking into one group, switching to a tool tab, tools unreachable in 760–810 px windows, the
  dock hitboxes (dock compass), the publisher badge under the layout and under a tool.
- Steps 1, 2–3, 8, 9, and 10 are also browser tests: one document at 375 and 1280 px within 1 % of
  the baseline (SC-004); the four-part layout in 3 actions (SC-001); the 3 × 2 grid in 8 actions,
  all in view, back after a reload (SC-002); 1280 → 375 → 1280 px with the dice; the dice sliding in
  on a documentation page. Steps 4–7 are covered by component tests (floating limit and stack,
  docking by title bar and compass, collapse by drag and Enter, every keyboard menu action) and were
  walked by the maintainer.
- Timings with 3,000 documents, run alone: open beside 145–164 ms, move a tab 126–181 ms, show a
  hidden tab 77–97 ms, longest frame 17 ms (divider) and 17–33 ms (window). In the full run after
  the build, open beside (248 ms) and move a tab (268 ms, one sample) read over their 200 ms budget;
  they are reported, not failing (§11), and worth watching.
- Not walked by the agent: dark mode and a real phone (step 10); left to the maintainer before the
  merge.
