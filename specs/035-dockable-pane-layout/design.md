# Design: Dockable Layout of Document Panes

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-15 | **Status**: paused until T-113 (see spec)

## Approach

The panes of spec 034 (`features/sheet/panes/`) stay the module; their flat list of panes becomes a
**layout tree**: a split node (a row or a column with child weights) or a group leaf (tabs, the
shown tab). Pure functions in a new `layoutTree.ts` do every change (add, move, split, close,
reconcile), `paneStore.ts` keeps the tree under a new storage key and migrates the spec 034 value,
and `PaneArea` draws the groups. `currentDocumentId` stays the one "current" fact: the focused group
is the group whose tab holds it, so the documents window, the dice panel, and the shown-document
publisher need no change beyond the new **Open in new tab** entry.

Order: **Foundation** (tree model, rectangles, store v2 with the migration, so a 034 user never
loses panes) → **US1** groups with their own strips, **Open in new tab**, groups in one row →
**US2** drag and the tab menu → **US3** splits in both directions, horizontal dividers, edge drops →
**US4** the flattened narrow view → **US5** restore and migration tests at the browser level →
**Finish**.

## Decisions

- **D1 — Tree, focus from the current document**: `root: Split | Group | null`;
  `Split = {type: 'split', direction: 'row' | 'column', children, weights}`,
  `Group = {type: 'group', id, tabs, shown}`; no stored focused group. _Why_: a document is in at
  most one group, so the group of `currentDocumentId` is the focused one; one fact, as in spec 034.
  _Rejected_: a stored `focusedGroup` — two facts that can disagree.
- **D2 — Normal form**: after every change, emptied groups go, a split with one child is replaced by
  it, and a split inside a split of the same direction is merged into it. _Why_: one shape per
  arrangement keeps the code and the stored value simple, and it matches a code editor (splitting
  right inside a row adds a sibling). _Rejected_: a binary tree — a row of three would hold unequal
  nested pairs.
- **D3 — Groups drawn flat, placed by computed rectangles**: `rectsOf(root, area)` gives each group
  and divider a rectangle; `PaneArea` renders all groups as siblings, keyed by group id, absolutely
  placed, in reading order (`groupsInOrder`) so Tab and screen readers follow the screen. _Why_:
  splitting or moving a neighbour reshapes the tree; nested elements would remount the open sheets
  and lose focus, scroll, and an edit in progress. _Rejected_: nested CSS grids — simpler CSS, but
  every split remounts its subtree.
- **D4 — Sizes**: weights per split (average 1, as spec 034) fitted to the area; a child's minimum
  is its subtree's (a row of three groups is at least 3 × 320 + 2 × 6 px wide), from
  `minSizeOf(node)`. `paneWidths`/`moveDivider` in `layout.ts` take per-child minimums instead of
  one constant. A divider drag previews by writing the affected groups' `style` directly (no React
  render) and stores the weights on release, the `Splitter` contract.
- **D5 — Horizontal dividers in the shared `Splitter`**: an `orientation: 'vertical' | 'horizontal'`
  option (`aria-orientation`, `clientY`, ↑/↓, `cursor-row-resize`). _Why_: AGENTS §8, add an option
  rather than a copy; the contract in `tests/shared/splitterContract.tsx` gains a horizontal host.
  _Rejected_: a pane-only divider.
- **D6 — Scrolling (FR-008)**: with two or more groups the area's height is the viewport height
  below the area's top (`100dvh` minus its measured page offset, re-measured on resize) and each
  group body is `overflow-auto`; with one group nothing changes (no wrapper, page scroll). The
  policy badges stay under the area.
- **D7 — The flattened view (FR-011, US4)**: when the area is under 768 px wide, or smaller than
  `minSizeOf(root)` in either direction, `PaneArea` draws spec 034's single view: one strip of every
  tab in reading order (depth-first, left to right, top to bottom) and the current document. The
  tree is untouched, so it comes back when there is room. Splits are checked only outside it, so a
  phone may still **Open beside** (the group shows once the window is wide).
- **D8 — Drag with HTML drag and drop, menus for the rest**: tabs are `draggable` with a
  `application/x-ttg-tab` payload (the documents tree's pattern, `useDocumentsDrag`); Escape cancels
  natively. Over a strip the slot is the nearest tab gap; over a group body `dropZone(rect, point)`
  picks an edge (outer quarter of that side) or the middle; an overlay shows the landing area. Touch
  has no tab drag (as the documents tree, spec 032 D11): the tab menu does every move. _Rejected_:
  pointer-event drag as in the template editor — more code, and T-113 will want the documents window
  to drag into the layout, which HTML drag and drop gives across components.
- **D9 — Tab menu**: right click or Shift+F10/ContextMenu on a tab, and one **Actions** button at
  the end of each strip for its shown tab, open `TreeContextMenu` (shared) with Move left, Move
  right, Move to next group, Split right, Split down, Maximize, Close. Disabled entries stay listed
  (FR-013). _Rejected_: a menu button on every tab — too wide for 320 px groups.
- **D10 — Limits (FR-013)**: `MAX_TABS = 12`, `MAX_GROUPS = 6` replace `MAX_PANES`. Adding a 13th
  tab closes the least recently focused tab that is not shown and returns it for the notice. A split
  is offered only if the groups stay under 7 and the area still fits `minSizeOf` after it. **Open
  beside** that cannot split opens the document as a new tab of the focused group and says why
  (never a dead end, constitution III).
- **D11 — Hidden tabs are not mounted**: only each group's shown document renders; all open tabs are
  pinned in the cache (12 at most), the shown ones loaded. _Why_: 12 mounted sheets cost memory and
  render time for nothing. _Rejected_: keeping hidden tabs mounted for their scroll.
- **D12 — Strip visibility (FR-002)**: one group with one tab draws only the document (as before
  spec 034); one group with tabs draws a strip and no frame; several groups draw a strip and a frame
  each, the focused one marked (spec 034 follow-up rules).
- **D13 — Announcements (FR-014)**: a `sr-only` `aria-live="polite"` line in `PaneArea` says what a
  move or split did (the template editor's announcer pattern).

- **D14 — Grid building waits for T-113**: SC-001 counts on dragging a document from the documents
  window onto a group's edge (one drag per group). _Why_: with menus alone a 3 × 2 grid takes about
  17 actions, and the maintainer wants no extra buttons. _Rejected_: an **Open below** entry in the
  documents window; relaxing SC-001.

## Changed types and data

- `panes/layoutTree.ts` (new, pure): types, `normalize`, `groupsInOrder`, `groupOf(docId)`,
  `addTab`, `moveTab(doc, groupId, index)`, `splitGroup(groupId, side, doc)`, `closeTab`,
  `reconcileLayout(state, currentId, entryIds)` (gone documents drop; a current document not in a
  tab replaces the shown tab of the last focused group, else its group shows it), `minSizeOf`,
  `rectsOf`, `dropZone`. Returns the same object when nothing changes.
- `panes/types.ts`: Zod schema of the stored layout (recursive, `z.lazy`), `readLayout` sanitizes
  (duplicate tabs: first wins; over 12 tabs or 6 groups: the rest dropped in reading order; weights
  fixed to the children's count; then `normalize`); anything dropped other than deleted documents
  reports `pane-arrangement-invalid` with what was dropped (constitution III). `PANES_STORAGE_KEY` =
  `ttgamer:panes:v2`.
- `paneStore.ts`: state `{root, recent, views, maximized}` (`views` stays keyed by document id;
  `maximized` is a group id). Actions: `openInNewTab`, `openBeside`, `moveTab`, `splitWith`,
  `closeTab`, `focusTab`, `toggleMaximized`, `setSplitWeights(path, weights)`, `setPaneView`.
- **Migration**: when `v2` is absent and `ttgamer:panes:v1` reads (`readArrangement`), its panes
  become one row of one-tab groups in order with the same weights, views, and maximized pane; `v1`
  is then removed. An unreadable value reports `pane-arrangement-invalid` (existing code).
- `DocumentsWindow.tsx`: **Open in new tab** in the row menu and the details; notices use the new
  strings.
- Translations (`ui/sheet/documents.yaml`, en + ru): `manager.details.openInNewTab`;
  `panes.{groupLabel, actions, moveLeft, moveRight, moveToNextGroup, splitRight, splitDown, closedHidden, groupLimit, openedAsTab, moved, split, resizeRows}`;
  `replaced` removed.
- Docs: `docs/documents/index.mdx` + ru mirror, "Several documents side by side" rewritten for
  groups; `src/sheet_manager/AGENTS.md` panes section rewritten; the skill's line updated.

## Principles at risk

- **III (forgiving, observable)**: a refused split or a closed hidden tab always has a notice; an
  unreadable stored layout reports through diagnostics.
- **VI (accessibility, both languages)**: strips are `tablist`s labelled by group, dividers are
  focusable separators, every drag has a menu path, moves are announced; strings in en and ru.
- **VII (performance)**: hidden tabs unmounted, divider previews outside React, layout math on at
  most 6 groups; the 3,000-document timing of spec 034 is extended (SC-007).
- **VI (look on PC and phone)**: one-document page unchanged at 375/1280 px (SC-005, the spec 034
  baseline); the flattened view is spec 034's phone view.

## Tests

- `tests/sheet_manager/pane-layout-tree.test.ts`: normal form, add/move/split/close, reading order,
  `minSizeOf`, `rectsOf` (3 × 2 at 1920 × 880), `dropZone` edges and middle, limits.
- `pane-store.test.ts` (rewritten): reconcile (Open replaces the shown tab; deleted documents; focus
  follows current), 13th tab closes the least recent hidden one, 7th group refused, Open beside
  falls back to a tab.
- `pane-restore.test.tsx`: v2 round trip; v1 → one row (order, widths within 1 %, views, maximized);
  deleted document quietly; a sanitized or invalid value reports once.
- `pane-tabs.test.tsx`, `pane-area.test.tsx`: strips per group, switching a tab changes one group,
  close shows the neighbour, last tab removes the group, frames (D12), group scroll vs page scroll.
- `pane-drag.test.tsx` (new): reorder, move to another strip and body, edge split, Escape, refused
  edge at the limit.
- `pane-keyboard.test.tsx` (new, SC-006): one test per menu action and per divider direction.
- `pane-single.test.tsx`, `pane-renders.test.tsx`: unchanged guarantees (one document, no extra
  renders of other groups when one changes).
- `tests/shared/splitter.contract.test.tsx`: a horizontal host.
- `documents-window.test.tsx`: **Open in new tab**, the limit notices.
- `tests-e2e/smoke/panes.spec.ts`: 3 × 2 grid at 1920 × 1080 by dragging from the documents window
  (SC-001, D14), drag a tab between groups, reload, narrow to 375 px and back, SC-005 baseline.
  `tests-e2e/timings/panes.spec.ts`: show a tab and move one between groups (SC-007, reported).

## Manual walk

1. One document, 1280 px and 375 px → the page looks as before spec 034.
2. **Open in new tab** twice → one strip with three tabs, no frame; page scrolls as a whole.
3. **Open beside** → two framed groups filling the window; each scrolls on its own.
4. Drag a tab to the other strip, then to the bottom edge of a group → it moves; then a row below.
5. Build 3 × 2 at 1920 × 1080; drag a horizontal and a vertical divider → no group under 320 × 200;
   a 7th split is disabled with a notice.
6. Keyboard only: Shift+F10 on a tab → Split down, Move to next group; arrows on a divider.
7. Open a 13th document → a hidden tab closes with a notice naming it.
8. Narrow to 375 px → one document and one strip of all tabs; widen → the grid is back.
9. Reload → same groups, tabs, sizes, views. Delete a document in a tab → it disappears quietly.
10. Dark mode, phone (real device): strips, frames, menus, and notices are readable.
