# Design: Several Documents on One Screen

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-15

## Approach

The sheet page shows `CurrentDocumentSheet` through `SheetWorkspace`. Every bound element already
reads its document through `useDocumentSource()` (`hooks/useDocumentSource.ts`), which a
`DocumentSourceContext` provider can override, so a **pane** is: a provider bound to one document
id, a view choice, and the existing `DeclarativeSheetView` inside a named size container (spec 033
lays the brief out from that container, so a pane needs no new layout code). A new shell component
`PaneArea` replaces the single `{currentDocument && children}` and lays out the tab strip and panes.
A new small store keeps the arrangement. `documentStore.currentDocumentId` stays the single
"current" fact and always equals the focused pane's document, so the documents window, the
shown-document publisher (dice panel), and the rest of the app need no change.

Order of work: (1) the loaded-cache pinning and the pane source; (2) the arrangement store and
one-pane `PaneArea` that must look identical to today (SC-005 first); (3) tabs, two or more panes,
**Open beside**; (4) layout, divider, maximize; (5) per-pane view; (6) persistence and restore; (7)
rolls and focus checks, strings, guide.

## Decisions

- **D1 — Pane = source provider + view, not a second workspace.** `PaneSourceProvider` supplies a
  store-backed `DocumentSource` for its document id (writes go through the same store actions).
  _Why_: all bound elements, formulas, rolls, and reference fields already go through the source, so
  editing, validation, and cross-tab behavior (FR-009) are inherited. _Rejected_: mounting several
  `SheetWorkspace`s (duplicates dialogs, toolbar, and the shown-document publisher).
- **D2 — `useDocumentSource` takes the id from the pane.** The store branch is factored into
  `useStoreDocumentSource(documentId)`, which subscribes by selector to its own document and entry
  (today's hook subscribes to the whole store); without a pane it uses `currentDocumentId` as now.
  The pane provider is a `DocumentSourceContext` value, `preview: false`. `CurrentDocumentSheet`
  takes `documentId` and `viewId` props instead of reading `currentDocumentId`. _Rejected_: a global
  "pane id" read inside every element (hidden coupling).
- **D3 — Current document = focused pane.** Focusing or editing in a pane calls
  `setCurrentDocument(id)`; the pane store keeps `focus` only as a mirror of that. A document opened
  from the documents window (**Open**, `setCurrentDocument`) or a reference field replaces the
  focused pane's document (today's behavior), or focuses the pane that already shows it; **Open
  beside** adds a pane (on a phone a tab that is focused; FR-019). _Why_: one meaning of "current"
  (FR-011), single-document use unchanged (FR-014). _Rejected_: a second "focused pane" fact in the
  pane store (two truths).
- **D4 — Pinned loaded cache.** `documentStore` holds only the open one and up to eight others
  (`loadInto`, `MAX_LOADED_DOCUMENTS = 8`); a pane's document must never be evicted. Add `pinnedIds`
  (set by the pane store, at most six) beside `currentDocumentId` in `loadInto`'s keep rule, and
  `loadIntoCache(ids)` (read records, add to `documents`, no change of current). The existing
  `loadDocuments` does not keep documents, so it is not reused. _Rejected_: raising the cap (3,000
  documents must stay cheap, SC-003).
- **D5 — Arrangement store, per device, not in the document store.**
  `features/sheet/panes/paneStore.ts`, Zustand `persist` (`skipHydration`, rehydrated after mount so
  the server build and first client render agree) on localStorage key `ttgamer:panes:v1` (the same
  place other per-device layout preferences live, `useLocalStorageState`), shape below. _Why_:
  FR-012 says per device, not exported, synced, or undoable; the document store's IndexedDB, index,
  and tombstone rules would apply to it for no benefit. _Rejected_: a field in `entries` (leaks into
  export and the cloud contract).
- **D6 — How many panes are visible.**
  `visibleCount = width < 768 ? 1 : min(6, floor((width + 1) / 321))` from the measured page width
  (`useMeasuredElement`); the visible panes are the most recently focused ones, drawn in pane order.
  768 is the `md` breakpoint where `Splitter` already appears. Choosing a hidden tab focuses it, so
  it replaces the least recently focused visible pane (spec US2.2). Closing, resizing the window, or
  maximizing recomputes; nothing is stored about visibility except `recent`. Until the width is
  measured the area shows one column, so reload does not jump.
- **D7 — Widths as fractions.** `weights` per visible id (sum 1), each pane at least 320 px after
  conversion. A divider between neighbours uses the shared `Splitter`: `onPreview` sets a CSS
  variable, `onChange` moves px between the two neighbours (clamped so both stay ≥ 320) and stores
  fractions; Home resets to equal. `Splitter` is vertical-only and `md`-up, as needed. Panes lay out
  with CSS grid columns from those fractions, not flex, so a divider drag changes two columns.
  _Rejected_: px widths (wrong after a window resize).
- **D8 — Per-pane view as an override.** `views[id]` holds a view id or `tpl:<id>` (the
  `ViewModeSelect` value). `ViewModeSelect` and `selectableViews` are reused unchanged; the pane
  passes handlers that write the pane store, never `updateDocumentMetadata`. A new pane starts with
  `views[id] = ` the first definition view whose id is `brief` or ends with `-brief` (every shipped
  one does: `brief`, `droid-brief`, `wod2e-brief`, `v5-core-brief`, …), else absent (the document's
  preferred view). With one pane the toolbar's selector keeps writing the preferred view as today;
  with two or more it is hidden and each pane header carries its own (FR-002), so a view has one
  selector. _Rejected_: a `brief` flag on `DocumentViewDefinition` (a type change for a naming
  convention that a unit test can pin).
- **D9 — Tab strip.** One strip (`role="tablist"`, tabs `role="tab"` with `aria-selected` on the
  focused one, ←/→/Home/End, a close button per tab) shown when two or more panes exist; a tab's
  name is the document's title (`entries` name) and wraps on a scroll when many. Each visible pane
  is a `role="region"` labelled by its tab. Double-click on a tab and a **maximize** button in the
  pane header both toggle `maximized`; maximize is ignored when `visibleCount` is 1. Tabs follow
  pane order; no dragging (spec Assumptions).
- **D10 — Open beside entry points.** `DocumentsWindow` row menu and the details pane get an **Open
  beside** action next to **Open** (`onMenuAction`, `DocumentDetails`); the window stays open on
  desktop, closes on a phone like **Open**. On a phone it adds a tab and focuses it (one pane
  shows). Beyond six panes the least recently focused (never the focused one) is replaced and a
  toast (`role="status"`) says so (`react-hot-toast`, as in the workspace). Closing a pane moves
  focus to the neighbouring tab (FR-013).
- **D11 — Restore.** On start the pane store filters `ids` against `entries` (dropped ids simply
  vanish), `loadIntoCache`s them, and guarantees `currentDocumentId` is a pane (if not: it replaces
  the focused one; nothing stored: `[current]`). A deleted document (the tree's delete, or another
  tab's merge) removes its pane by a subscription to `entries`, silently (a normal state, not a
  fallback); the focused pane's deletion falls to the survivor the window already chooses
  (`setCurrentDocument(survivor)`). A broken stored arrangement and a record that cannot be read
  report through `reportSheetIssue` (Principle III); the latter shows an error notice with a close
  control in its pane. A pane whose document has an unavailable type shows `TypeMissingNotice`
  through the same `CurrentDocumentSheet` path.
- **D12 — Layout rules unchanged inside a pane.** The pane wrapper is `min-w-0` with the spec 033
  container class on the view root, so a brief in a 400 px pane draws as at 400 px (SC-007). With
  one pane the wrapper adds no padding, border, or header (FR-014): `PaneArea` renders `children`
  exactly as `SheetWorkspace` does today.

## Changed types and data

- `PaneArrangement` (new, `features/sheet/panes/types.ts`, Zod-parsed on read; broken storage falls
  back to empty):
  `{ ids: string[]; recent: string[]; weights: Record<string, number>; views: Record<string, string>; maximized: string | null }`,
  at most six ids, no duplicates, version in the key.
- `documentStore`: `pinnedIds: string[]` (not persisted), `pinDocuments(ids)`, `loadIntoCache(ids)`;
  `loadInto` keeps pinned ids. No schema, index, or storage version change.
- `hooks/useDocumentSource.ts`: `useStoreDocumentSource(documentId)` factored out; public
  `useDocumentSource()` behavior unchanged. `CharacterSheet.tsx`: `CurrentDocumentSheet` gets props.
  `SheetWorkspace.tsx`: renders `PaneArea`; the toolbar's selector acts on the focused pane.
- Strings `ttgamer.ui.sheet.panes.*` (tabs label, close, maximize/restore, open beside, replaced
  notice, divider label, gone/unavailable pane) in `translations/source/en/ui/sheet/…` and `ru`.
- Docs: `docs/documents/index.mdx` and its Russian mirror; `src/sheet_manager/AGENTS.md` (panes,
  pinned cache, "current = focused pane"); `sheet-manager` skill note; `TODO.md` T-112 done.
- No cloud contract, export, or template schema change.

## Principles at risk

- **II Explicit contracts**: the arrangement is a device preference, outside export and contract;
  the pane source implements the existing `DocumentSource` interface only.
- **VI Consistent, accessible experience**: shared `Splitter`, `ViewModeSelect`, toasts reused; tab
  pattern and keyboard map in D9; phone gets tabs, never side by side; touch targets of tab and
  close ≥ 32 px on coarse pointers.
- **VII Performance**: only visible panes render (hidden ones are tabs, not mounted); at most six
  pinned documents; one more pane re-renders no other pane (each pane subscribes by selector to its
  own document through the source; a render-count test proves it). SC-003 is measured in the
  existing browser timings plus a new one.
- **I Modular semi-autonomy**: panes live in `features/sheet/panes/`; the store gets two generic
  actions and no knowledge of panes beyond ids.

## Tests

- `tests/sheet_manager/pane-store.test.ts`: open beside, duplicate focuses, limit six replaces the
  least recently focused (not the focused), close, recent order, restore filters deleted ids, broken
  storage, nothing stored = current alone, maximize toggle.
- `tests/sheet_manager/pane-visible.test.ts`: `visibleCount` and weights/clamp at 375, 767, 768,
  1280, 1920; hidden tab replaces the least recently focused visible pane.
- `tests/sheet_manager/pane-source.test.tsx`: two panes edit only their document; rolls carry the
  pane's `rollSource` and name; focusing sets `currentDocumentId`; a pane document is never evicted
  from the cache while pinned (nine loaded documents, six panes).
- `tests/sheet_manager/pane-view.test.tsx`: a new pane starts in the brief, an override does not
  write `preferredViewId`, no brief view uses the preferred one; every shipped definition with a
  brief view matches the id rule.
- `tests/sheet_manager/pane-tabs.test.tsx`: roles, `aria-selected`, arrow keys, close, no strip and
  no extra chrome with one pane (class-name snapshot equal to today's output).
- `tests/shared/splitter` contract stays green; `tests/sheet_manager/documents-window.test.tsx`
  gains **Open beside** (menu, details, phone).
- `tests-e2e/smoke/panes.spec.ts`: 1280 px three panes, no sideways scroll, each ≥ 320 px; 375 px
  one pane plus tabs; maximize and restore; reload restores panes, order, sizes, views, with one
  deleted document; roll in each pane names its character. `brief-layout` heights per pane width
  700/400 (SC-007); single-document height within 1% of the spec 033 baseline (SC-005).
- Browser timing: open a second pane on a store with 3,000 entries (SC-003, reported).

## Manual walk

1. Open the documents window, choose a character, **Open beside** → two panes, new one in brief, tab
   strip appears, focus on the new pane.
2. Edit a value in each, roll a stat in each → only that document changes, the roll names the pane's
   character; the dice panel follows the pane you last clicked.
3. Drag the divider, reload → sizes, order, and views are back; delete one document in another tab,
   reload → it is gone without an error.
4. Open six, then a seventh → toast, the least recently focused pane is replaced.
5. Narrow the window below 768 px (and a real phone) → one pane, tabs only, switching works; no
   sideways scroll; light and dark.
6. Double-click a tab → only that pane at full width; again → the previous panes and sizes; the
   maximize button and Tab/Enter do the same.
7. Close down to one pane → no strip, no divider, page identical to before this feature.

## Implementation notes

- **Foundation.** `SheetWorkspace` takes `renderDocument(documentId)` instead of `children`, so
  `PaneArea` can draw one document per pane; `CurrentDocumentSheet` became `DocumentSheet` with a
  `documentId` prop. The `viewId` prop and the pane store file arrive with the stories that use them
  (US3 and US1): an export nothing imports fails the dead-code gate. The baseline in
  `tests-e2e/smoke/panes-baseline.ts` holds the heights after spec 033 (full sheet 7926/3473, brief
  623/333 at 375/1280 px), since SC-005 compares with the page as it is now.
- **US1.** The store has no separate focus: `reconcilePanes(state, currentId, entryIds)` derives the
  panes from the current document (a document opened with **Open** takes the place of the pane
  focused last; deleted documents drop out), used in render and committed by an effect; `openBeside`
  reconciles first. A pane has its own close button besides its tab's, both named `Close <name>`.
  Deleting the current document is still the documents window's job (it picks the survivor), as
  before.
- **US2.** Dividers are the shared `Splitter` in 6 px tracks (as in the editor), so a pane count is
  `floor((width + 6) / 326)` for 768 px and wider (`layout.ts`); a pane keeps at least 320 px after
  a window resize because widths are fitted from the weights, never stored in px. The grid uses px
  tracks from those widths; a drag previews by rewriting the tracks and stores weights on release.
  Maximize follows the focused tab and clears with fewer than two panes. A full sheet in a pane
  needed its group columns to follow the pane, not the window: `AreaLayoutContext`
  (`declarative/areaLayout.ts`) swaps the `md`/`xl` column classes for `@3xl`/`@7xl` of the sheet's
  named container, at the same widths (768 and 1280 px); outside a pane nothing changes. Other small
  `sm:`/`md:` styles inside elements still follow the window. The brief heights per pane width
  (SC-007) are measured with US3, when a pane first starts in the brief. Walk at 1280 (light, dark),
  960, and 375 px: three panes of 400 px, two of 470 px, and one pane with the tabs; no sideways
  scroll.
- **US3.** The view of a pane is `views[id]` in the pane store, written only when a document is
  opened beside (its brief, unless a user setting gives its type a page) or the pane's own selector
  changes; with one pane the overrides are ignored, so the page is as before, and a closed or
  replaced pane forgets its view. `DocumentSheet` takes the override as `viewId` (a built-in view
  id, or `tpl:<page>` for a custom page); `PaneViewSelect` reuses `ViewModeSelect` (new `compact`
  option) in each pane header and the toolbar's selector hides with two or more panes. A sheet in a
  pane also drops its `lg:p-6` padding (it follows the window, not the pane), which cost 16 px of
  brief height at 1400 px; the brief now stays within 400 px at a pane of 640 px or more and within
  700 px at about 400 px (`panes.spec.ts`, SC-007).
