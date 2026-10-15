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
