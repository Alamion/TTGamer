# Design: Sheet follow-ups after links

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-28

## Approach

Five independent stories, each its own commit, smallest risk first after the P1:

1. **US1 docs fragment card**: `DocsHelpLink` gains a `preview` mode; a click opens a Radix Popover
   (in `modalRoot()`) that loads the page's MDX module through Docusaurus's route registry and
   renders only the fragment. Containers (`SectionCard`, `CollapsibleBlock`) use the mode.
2. **US2 system badges**: a short badge message on `SystemPlugin`; `DocumentsTree` puts it in the
   row's existing `badges` slot.
3. **US3 document name**: one shared "Document name" field binding offered for every kind that has
   no name binding of its own; it reads and writes `metadata.title`.
4. **US4 trackers in formulas**: a pure `trackerReading` for own trackers and a track reading for
   built-in ones, wired into the formula resolver, coordinate lists, and dependency checks.
5. **US5 picture cleanup**: a prune when a document opens, and an idle sweep fed by the link index's
   existing read of every record.

## Decisions

- **D1 — Where a fragment comes from**: the docs page's own MDX module, found by its route in
  `@generated/routesChunkNames` and loaded through `@generated/registry` (both already in the main
  bundle: `ComponentCreator` and the preloader import them). _Why_: works in the dev server (which
  serves no pre-rendered HTML) and in the build, picks the reader's locale (each locale build has
  its own routes), keeps docs components and styling, and loads one chunk per page, cached.
  _Rejected_: fetching built HTML (no content in dev, redirect stubs, a second parser); a build
  index of sections (a new plugin and generated JSON for a few dozen links).
- **D2 — Slicing**: the module's `toc` gives heading ids and levels; the card passes MDX a `wrapper`
  component that keeps only the top-level children from the anchored heading to the next heading of
  the same or higher level (no anchor: up to the first heading). Only the fragment's components
  render. _Rejected_: rendering the whole page hidden and showing part with CSS (every widget of the
  page would run).
- **D3 — Russian anchors**: Russian headings slug differently (`## Атрибуты` → `#атрибуты`), so an
  English anchor finds nothing there. Every heading a shipped docs link targets gets the same
  explicit `{#english-id}` in the English and the Russian page (the parity check requires explicit
  anchors to match in both), and a test checks each shipped link's anchor exists in both languages.
  A user's link whose anchor is missing shows the page's first section with a note (spec FR-003
  corrected: the Russian build holds no English pages, so an English fallback is impossible).
  _Rejected_: mapping anchors by heading position at runtime (needs the English table of contents in
  the Russian build).
- **D4 — Click behavior** (clarified): a plain click opens the card; Ctrl/⌘, Shift, or a middle
  click keeps the browser's default (new tab). External links never get a card.
- **D5 — Badge source**: `SystemPlugin.badge` (a short translated message, e.g. "SW", "V5", "W20",
  "General"); the badge's full name is the system label. A user type or setting shows its owner's
  system (the entry's `systemId` already is it). Badges hide when every shown document row has the
  same system (computed once per list render from the shown rows). _Rejected_: colours or icons per
  system (design work, no source of truth yet).
- **D6 — Document name binding**: `listDocumentBindings` appends a shared `field:document-name`
  binding (coordinate `document-name`, `valueType: 'string'`, `title: true`) to any kind without a
  `syncsTitle` field binding. Reads come from `metadata.title`; writes go through the same rename
  path as the documents window (`updateDocumentMetadata`), so spec 044's link keeper sees them.
  Kinds with a name binding (characters, notes, Star Wars entities) keep theirs: it already is the
  document name. `collectDraftNotices` then covers own types without change. _Rejected_: replacing
  every system's `syncsTitle` binding (moves stored names, needs a migration).
- **D7 — Roll name fallback**: `boundDocument` names a roll `title || kind label`, through
  `documentLabeler` (the list's rule).
- **D8 — Own tracker reading**: `trackerReading(field, value)` in `features/sheet/data/tracker.ts`
  reads the first marks column on the reading layer (fill unless the tracker has only outline kinds,
  as the shown total does). `deepest`: per copy, the deepest marked shown level; the copy with the
  deepest one wins (clarified); its level value parsed as a number (`Number`, trimmed, a leading `+`
  allowed), `NaN` (→ "not a number") otherwise. `count`: the most filled copy's count. Nothing
  marked: 0. `resolveBase` calls it when the bag value is a tracker value; the tracker key joins
  `listTemplateNumericCoordinates` and `collectFormulaDependencies`.
- **D9 — Built-in tracks**: `track` bindings join `listNumericCoordinates` under their coordinate;
  `readBoundNumber` gives the deepest marked level's `penalty` when levels carry penalties, else the
  filled count (V5 Health, Willpower; clarified); with members, the worst member as in D8.
- **D10 — Picture prune on open**: `openDocument` drops markdown picture entries the value's text no
  longer names (the same rule as `MarkdownFieldControl`'s prune, moved to a shared pure helper) and
  saves through the normal writer, which releases blobs (`releaseImages`). A document never opens
  while its text is being edited, so undo inside an editing session is untouched.
- **D11 — Orphan sweep**: boot passes `scheduleLinkIndexLoad` a reader that also collects
  `deviceImageIdsOf` for each record; once the load finishes (same generation), the sweep adds the
  images of `pendingPurge` records (read once each, few), lists stored picture ids, and deletes
  those no document names and not written in this session (`portraitStorage` records ids it saves).
  _Rejected_: a separate boot pass over all records (doubles the reads, SC-006).

## Changed types and data

- `SystemPlugin` (`systems/types.ts`): `badge: TranslatableMessage`; set in general, wod2e,
  star-wars-wod, v5. YAML: `sheet.<system>.badge` (en, ru); `sheet.documents.docs` card strings
  (open the page, loading, missing, section not found) in `ui/shared` or `ui/sheet` next to
  `DocsHelpLink`'s strings.
- `FieldBinding` (`systems/templateBindings.ts`): optional `title: true` (value lives in the
  document's name). No stored shape changes: the name already lives in `metadata.title`.
- Template schema: none. Trackers keep their stored shape (spec 018 FR-030 holds).
- `portraitStorage.ts`: `listPortraitIds()`, and the session's saved ids.
- Docs: the same explicit `{#id}` on the English and Russian headings that shipped links target.

## Principles at risk

- **VII Performance**: fragments load on demand, one chunk per page, cached; badges are O(rows); the
  sweep reuses the link index read (SC-006), runs at idle, and is cancelled with it.
- **II Contracts**: `@generated/*` is Docusaurus-internal; one module (`docsFragments.ts`) owns the
  lookup, and a test resolves every shipped docs link through it, so an upgrade that changes the
  maps fails a test instead of a reader's card.
- **VI Accessibility**: the card is a labelled dialog-role popover, Esc closes and returns focus to
  "?"; badges have their full name as accessible name; the card scrolls on phones.
- **Destructive cleanup**: the sweep never deletes a picture of a live or pending-purge document,
  nor one saved this session; covered by tests with planted orphans.

## Tests

- `tests/shared/docs-fragment.test.tsx`: slicing by anchor, no anchor, missing anchor note; click
  opens the card, Ctrl-click and middle click do not; external link has no card.
- `tests/docs/docs-links-anchors.test.ts`: every shipped `docsPath` resolves to a route and its
  anchor exists in the English and Russian page.
- `tests/sheet_manager/documents-badges.test.tsx`: badges per system, owner's system for own types,
  hidden when all rows share one, General badge.
- `tests/sheet_manager/document-name-binding.test.tsx`: offered for own kinds only when no name
  binding; typing renames (and the link keeper takes it); rename shows in the field; the no-name
  notice for own types; roll name fallback.
- `tests/sheet_manager/tracker-formulas.test.ts`: deepest, count, nothing marked, non-numeric, worst
  copy by depth with bonuses, suggestions, cycle; built-in Star Wars penalty, V5 Health count,
  members.
- `tests/sheet_manager/picture-cleanup.test.ts`: prune on open; sweep deletes orphans, keeps live,
  pending-purge, and session pictures; no extra record reads.
- E2E `tests-e2e/smoke/docs-fragment.spec.ts`: "?" on a Star Wars section shows the fragment in both
  locales' builds (en run).
- Timing: documents window with 3,000 documents (existing timing, compare).

## Manual walk

1. Star Wars character → "?" on Attributes → card with the Attributes text; Ctrl-click → page in a
   new tab at the heading.
2. Russian site → same "?" → Russian fragment.
3. Phone → tap "?" → card, scrolls, tap outside closes.
4. Documents window with Star Wars, Hunter, a note, an own type → badges; filter one system → badges
   gone.
5. Own type: editor → text field → source **Document name** → type a name on the sheet → list, `[[`
   suggestions, a roll show it.
6. Own template: tracker with -1/-2 levels, button `{max(1, 3 + wounds)}d10` → mark → pool shrinks.
7. Star Wars character: a button using the health penalty → mark wounds → pool shrinks.
8. Note with a picture → delete its line and close the tab at once → reopen → picture gone from
   storage (Application tab).

## Implementation notes

- **Bundle baseline (T009)**, production build before any change: main 1,083.5 KB (290.1 KB gzip),
  `common` 1,478.1 KB (380.0 KB gzip), all JS 1,486.7 KB gzip in 134 files.
- **US1 bundle**: main 290.4 KB gzip (+0.3, strings), `common` 387.5 KB gzip (+7.5: the card and
  Radix Popover), all JS 1,488.0 KB gzip (+1.3). A first cut put the card in `DocsHelpLink`, which
  the navbar's dice settings use, and grew main by 18 KB gzip; the card is now `DocsPreviewLink`
  (`DocsFragmentCard.tsx`), used only by sections and cards, and `DocsHelpLink` takes an
  `onPlainClick` instead of a `preview` flag.
- **MDX v3 wrapper (D2)**: MDX hands its `wrapper` one element that draws the page, not the blocks;
  the wrapper draws that element itself to cut the blocks. The test stub page has the same shape,
  since the first stub (blocks passed straight to the wrapper) hid the difference.
- **Anchors (D3, T007)**: the docs write explicit anchors escaped (`\{#id}`, 160 of them), so the 24
  added ones are too. The test also found `#tools-gear` broken before this spec: "Tools & Gear"
  slugs to `tools--gear`, so the inventory's "?" opened the page top; an explicit `{#tools-gear}`
  fixes it in both languages.
- **The "?" inside a section header** sits inside the header's toggle button, so it is not exposed
  as a link to assistive technology (an older nested-interactive problem, not changed here); the
  browser test finds it by its label. Worth a backlog entry.
- **Ctrl-click in the browser test** checks the link's target and that no card opens; waiting for
  the new tab to load was flaky under load. The unit test checks the click is not prevented.
- **Browser timing (SC-001)**: first open 172–313 ms, later opens 115–178 ms.
- **US2**: `badge` is optional on `SystemPlugin` (falls back to the label), so test systems need
  none. Badges: "SW", "WoD 2e", "V5", "General" ("Общее"); the Russian Star Wars badge stays "SW".
  Documents window timing (T013), 3,000 documents: open 31–52 ms (53 before), search 18–23 ms (37
  before); that list holds one system, so it shows no badges: the badge cost is one pass over the
  rows plus a span on the drawn (virtualized) rows.
