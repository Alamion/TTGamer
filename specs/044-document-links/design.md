# Design: Links Between Documents

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-27

## Approach

Links stay text: `[[…]]` in markdown values is the only stored truth, and which document it means is
a pure function of the document index (names, folders, creation times) and the link's own place. A
small **link index** (what each document's markdown links to, as written) is kept beside the records
so "Mentioned in" and rewrites never scan documents. The shared `MarkdownView` gains slots for
wikilinks and embeds; the sheet side fills them with a resolver, a **preview card**, and embeds, and
the markdown field gains `[[` suggestions. Reference chips get the same card.

Order: Foundation (extraction, resolver, link index) → US1 follow → US2 suggestions → US3 preview
card (+ reference fields) → US4 keeping links → US5 Mentioned in → US6 embeds → Finish (contract
proposal, guide, guidance).

## Decisions

- **D1 — Resolution is live and pure** (`features/documents/linkResolve.ts`): normalize (trim,
  case-fold, drop a trailing `.md`), match entries by name, narrow by a written folder path (suffix
  of the target's folder path, segments by `/`), then pick the one sharing the most leading folders
  with the source's folder, then the earliest `createdAt` (missing times last, then id). Name
  buckets are built once per `entries` array (as `query.ts` does). _Why_: the clarified rule;
  nothing stored can go stale. _Rejected_: storing the resolved id in the text or index — breaks
  Obsidian files (spec Q) and needs its own repair.
- **D2 — Deleting is not protected**: a link whose target is deleted falls to the next nearest
  document of that name, or shows unresolved if none, as in Obsidian; Undo of the delete brings it
  back. _Why_: deleting never rewrites text (spec edge case); the spec's "shows unresolved" holds
  when the name was unique. _Rejected_: rewriting other links on delete — Undo would have to revert
  them too, for little gain.
- **D3 — Link index: one record per source, in its own localForage store** (`links`, key = source
  id, value `{ v: 1, links: [{ target, path?, section?, alias?, embed, key, line, context }] }`,
  context ≤ 160 chars). Written by the record writer in the same pass as `doc:<id>`; removed with
  the purge; on boot (idle) sources without a current-version record are re-extracted in chunks of
  50, reported once (`link-index-rebuilt`). An in-memory reverse map `normalized name → sources` is
  built with one `iterate()`. _Measured_ (Chromium, this machine, 3,000 sources × 10 links with
  context, 4.6 MB): `iterate` + reverse map 55–85 ms, keys 15 ms. _So_ "Mentioned in" covers every
  markdown field of every document (SC-003 met; the smaller-scope fallback is not needed).
  _Rejected_: links inside index entries — the slim store value is written whole on every change
  (4.6 MB each time); one aggregate record — the same rewrite cost per save. _Limit_: a second tab's
  reverse map is not refreshed by the first tab's writes until it reloads (the index entries are
  merged across tabs, the link map is not).
- **D4 — Extraction is a scan, not a parse** (`shared/markdown/links.ts`): line by line, skipping
  fenced blocks and code spans, `[[…]]`/`![[…]]` with `|`, `#`, and a path; values are every
  template value shaped `{ text }` (markdown values). _Why_: a 300,000-character note is scanned in
  a few ms on every save; the full parser stays for rendering.
- **D5 — Keeping links is one pass over affected names** (`features/documents/linkKeeper.ts`): given
  entries before and after a change, take the names of documents created, renamed, or moved (old and
  new names); for each source linking those names (reverse map), resolve every such link before and
  after; where they differ and the earlier target still exists, rewrite the link to the target's new
  name, or to its full folder path when the name alone would resolve elsewhere (alias, section, and
  `!` kept). Rewritten documents are loaded by id and written through `updateTemplateValues`.
  _Rejected_: re-resolving on read only (spec Q answered A).
- **D6 — Where it runs and how it undoes**: tree changes (`runTreeChange`) run the keeper after the
  operations and attach the link edits (document, key, link before and after) to the same history
  entry; Undo applies the reverse edits through `rewriteLinks` and skips the keeper, so edits made
  to those documents since stay; a link changed by hand meanwhile is left alone and reported
  (`links-kept` with `skipped`). Redo re-runs the keeper. A rename typed into a sheet's name field
  is taken once the name has been quiet for 1.5 s, on the field's blur, or on `pagehide` (baseline
  name → current), and pushed to the same documents history as a rename, so Ctrl+Z undoes both;
  renames made by tree operations (which also write the title) are marked and not taken again.
  Create, example copies, and imports run the keeper without an undo entry (their rewrites keep
  targets, so nothing needs reverting). A message names the count (`links-kept`). _Rejected_: a
  keeper per keystroke — would rewrite `[[I]]`, `[[In]]`, …
- **D7 — Following** reuses `DocumentLinkContext` (history, `?doc=`); Ctrl/Cmd/middle click calls
  the pane store's `openInNewTab`. A section scrolls to the element marked `data-section` with that
  name: note headings (`MarkdownView` adds the attribute) and sheet sections, cards, brief blocks,
  and field labels (`DeclarativeSheetView` adds it from node labels). Shipped labels are translated,
  so a section matches the label in the shown language or its English source text
  (`data-section-source`), and suggestions insert the shown label. An unresolved click asks in a
  small confirm dialog and calls `createFromChoice` for the General note in the source's folder.
- **D8 — Suggestions** in `MarkdownFieldControl`: the textarea is an ARIA combobox while the caret
  sits after an open `[[`; a listbox placed at the caret (mirror-element measurement in
  `features/sheet/declarative/caretPosition.ts`, kept out of `shared/` while it has one user; no new
  dependency) shows up to 20 matches from `query.ts` normalized names, nearest first (D1 order),
  with kind and folder. After `#` it lists the target's sections: note headings from its stored
  text, or the labels of sections, cards, blocks, and fields of its default full page.
- **D9 — Preview card** (`features/documents/DocumentPreviewCard.tsx`, Radix Popover, already a
  dependency): opens 400 ms after hover or keyboard focus (meets US3 scenario 5 without a special
  key), on a 500 ms touch press; closes 200 ms after pointer leaves trigger and card, or on Esc,
  focus returning to the trigger. Content loads the target by id into the cache and renders its
  brief view (`briefViewOf`) through `PaneSourceProvider` with a read-only source; without a brief,
  the title and the first 12 lines of its first markdown value. Max 360 × 480 px, scrolling.
  Reference chips (`fieldControls.tsx` reference list and incoming references, `listEntries`
  pickers) wrap their name in the same trigger. _Rejected_: `@radix-ui/react-hover-card` — a new
  dependency for timers we need to tune for touch anyway.
- **D10 — Embeds are in** (US6): `![[Name]]` renders the card's content inline (shared
  `DocumentPreviewContent`), `![[Note#Heading]]` the blocks from that heading to the next one of the
  same or higher level, `![[Sheet#Section]]` the one node through a one-node page. Depth ≤ 2, a
  document already on the embed path shows as a link (cycle). Pictures win: a name the field's
  `images` holds is a picture. _Why_: the content component is the preview card's; the extras are
  the heading slice and the one-node page (~120 lines). _Rejected_: deferring — the cost is small.
- **D11 — "Mentioned in" is a field type** `mentions` (`types/template.ts`, read-only, label and
  `rows` to show before "Show all", default 8): drawn as a list of source names with their kind and
  the context line, each opening the source at the line. In the **+** menu after `markdown`; not
  allowed in list items or table columns (no value to hold). Shipped only at the bottom of
  `general-note`. A brief draws it compact. _Why_: the maintainer's choice (spec Q); it reuses the
  field machinery and lets authors place it. _Rejected_: a fixed footer under every page or the
  documents window details — no control for authors, and brief heights are pinned.
- **D12 — Cloud contract** (FR-011): proposal 0.2.0 in `openapi.yaml` and `CHANGES.md` (author
  frontend, approval pending): `StoredDocument` gains optional `links` (the D3 rows, snake_case),
  sent by the client because `template_values` stay opaque to the server;
  `GET /documents/mentions?name=…` returns sources whose links name it (the client resolves
  nearness). `IMPLEMENTED_CONTRACT_VERSION` stays 0.1.0 until the backend approves.

## Changed types and data

- `shared/markdown/links.ts` (new): `LinkRef`, `extractLinks(text)`, `rewriteLinks(text, edits)`;
  `parse.ts` wikilink/embed nodes gain `path` and `section`.
- `MarkdownView`: slots `renderWikilink(node)`, `renderEmbed(node)` (after `resolveEmbed` for
  pictures), `data-section` on headings. Shared, so no sheet imports.
- `persistence/linkStorage.ts` (new localForage store `links`); `documentContent.ts` writer and
  `documentBoot.ts` purge and rebuild call it. No change to envelopes, index entries, exports.
- `store/linkIndexStore.ts` (new Zustand, not persisted): reverse map, ready flag.
- `types/template.ts`: `MentionsFieldSchema` in the field and node unions and
  `TEMPLATE_FIELD_TYPES`; editor palette entry, factory, settings (label, `rows`); storybook story;
  `general-note` gains the field (shipped page, no migration: pages are code).
- `features/documents/history.ts`: an entry may carry `texts` (document, key, previous text).
- Translations: `ui/sheet/links.yaml` (en, ru): suggestions, card, Mentioned in, create prompt,
  kept-links message. Diagnostics: `link-index-rebuilt`, `link-unresolved`, `link-section-missing`,
  `links-kept`, `link-preview-missing`, `mentions-truncated` (list capped at 200 sources).

## Principles at risk

- **I (boundaries)**: extraction and rendering slots stay in `shared/`; resolving, cards, and
  keeping in `sheet_manager/features/documents`; no system folder is imported.
- **II (contracts)**: the link record is Zod-validated on read; a bad record is re-extracted. The
  cloud change follows `CHANGES.md` and stays unimplemented until approved.
- **VII (scale)**: reverse map from one cursor (D3 numbers); suggestions over prebuilt name buckets;
  "Mentioned in" loads at most 200 source contexts from the link records, never the documents; the
  keeper loads only sources whose links change. Bundle: card and suggestions sit in the sheet chunk;
  measured in Finish.
- **VI (experience)**: one card for every link kind; the card and suggestions get storybook stories;
  Esc, focus return, and `aria-*` per AGENTS §5.

## Tests

- `tests/shared/markdown/links.test.ts`: extraction (paths, sections, aliases, code skipped, line
  numbers), rewrite keeps alias/section/`!` and untouched text.
- `tests/sheet_manager/link-resolve.test.ts`: nearest by folder, earliest created, written paths,
  case and `.md`, unresolved.
- `tests/sheet_manager/link-keeper.test.ts`: rename, move, same-name create nearer, rename to a
  taken name, folder move, delete leaves text; undo restores texts exactly.
- `tests/sheet_manager/link-index.test.ts`: written with the record, purge, boot rebuild, bad record
  re-extracted; reverse map.
- `tests/sheet_manager/markdown-links-field.test.tsx`: follow, Ctrl-click new tab, create from
  unresolved, suggestions by keyboard, `#` sections, Esc.
- `tests/sheet_manager/document-preview-card.test.tsx`: hover/focus/touch timings, brief or note
  lines, reference chips, Esc returns focus; embeds, depth and cycle, picture precedence.
- `tests/sheet_manager/mentioned-in.test.tsx`: the `mentions` field lists sources with context,
  opens at line, updates; + menu entry; excluded from lists and tables; on the Note page only.
- Perf (`*.perf.test.ts`): suggestions over 3,000 entries < 100 ms; keeper over 100 sources.
- E2E: `tests-e2e/smoke/links.spec.ts` (write, follow, back, preview, rename keeps links, reload);
  `tests-e2e/timings/documents.spec.ts` gains link index boot and Mentioned in timings.
- Contract: `yarn validate:contract` for the 0.2.0 proposal.

## Manual walk

1. In a note type `[[In`, pick Ines Ruiz → `[[Ines Ruiz]]` inserted; Done; click → Ines opens, Back
   returns.
2. Ctrl-click the link → Ines in a new tab, the note stays.
3. Hover the link, then a V5 group member chip → the brief card for each; Esc closes.
4. `[[Bruno Kessel#` → his sections listed; pick Skills; follow → scrolled to Skills.
5. `[[Docks]]` (missing) → click offers a note; accept → it opens in the same folder.
6. Rename Ines to "Ines Ruiz-Vega" in the documents window → note text follows, message with count;
   Ctrl+Z → both back.
7. Create another "Sword" next to a note that links `[[Sword]]` → the link gets a path and still
   opens the old one.
8. Link a note "Docks" from another note; open Docks → "Mentioned in" at its bottom lists the other
   note with its line; click → that note at the line. Add the field to a character page in the
   editor → it lists the notes linking to that character.
9. `![[Bruno Kessel]]` and `![[How notes work#Callouts]]` → brief and section in place.
10. Reload → everything above still resolves; export the note → links unchanged in the `.md`.

## Implementation notes

- **Bundle baseline (T001)**, production build before any change: main chunk 1,078.4 KB (289.0 KB
  gzip); `common` 1,435.5 KB (365.7 KB gzip); all JS 1,472.6 KB gzip in 134 files.
- **Target parts by a helper, not on the nodes (T003)**: `splitLinkTarget` in
  `shared/markdown/links.ts` reads `Folder/Name#Section` from the raw target the wikilink and embed
  nodes already carry, so `MarkdownView` and its callers keep their node shape; `linkName` (the
  compare form of a name) lives there too, since the store reads it as well as the resolver.
- **Link records always written (T008)**: a document without links gets an empty record, so the
  start-up rebuild re-reads only documents never indexed (all of them once, the first time). The
  records live in their own IndexedDB database (`ttgamer-links`), not a second store of the
  documents' database, so localForage never has to upgrade that database's version.
- **Section anchors by wrapper (T013)**: instead of a `data-section` attribute in every container
  and field component, each titled or labelled node is wrapped in a `display: contents` element with
  `data-node-id`, `data-section` (shown name), and `data-section-source` (source name)
  (`declarative/sectionAnchors.tsx`); it takes no box, so layouts and pinned brief heights do not
  move, and the scroll goes to its first child. The page root carries `data-document-id`.
- **The kind a missing link creates is declared**: `DocumentDefinition.newFromLink` (the General
  note sets it), so generic code finds it through the registry without naming a system.
- **The card in the storybook (T027)**: the storybook shows template elements on a sandbox page, and
  the card is not one; it is reached from the markdown story's links (a link to a document on the
  device), whose note says so. Reference chips show it on the reference field stories.
- **Workspace renderer as context**: cards draw a brief through `DocumentRenderContext`, which
  `SheetWorkspace` provides from its `renderDocument`; without it (docs pages, tests) a card shows
  the title and first lines, so `features/documents` never imports the sheet's page renderer.
- **Redo writes the step's edits again (T031)**: undo applies a step's link edits in reverse and
  redo applies the same edits forward, instead of planning anew; for the same tree change both give
  the same text, and a link edited by hand meanwhile is left alone either way.
- **Moving a source counts (T030)**: a document moved to another folder has every link of its own
  checked too, since nearness is read from where the link is; FR-008's "any change" covers it.
- **Where a name typed on a sheet is taken (T032)**: `linkKeeperRuntime.ts` watches the index while
  the workspace is open: a new, copied, or imported document is kept at once, a name once quiet for
  1.5 s, on `focusout`, or on `pagehide`; tree changes run inside `withoutKeeper`, so a rename from
  the documents window (which also writes the title) is taken once. A typed rename joins the
  documents history only when it rewrote links. A short status line (`LinksKeptStatus`) says how
  many links were kept or put back: the app had no message line to reuse.
- **`maxShown`, not `rows` (T037)**: the editor's settings registry names a property once with one
  label, and `rows` is the markdown field's "Starting height (lines)"; the mentions field's limit is
  `maxShown` ("Entries shown before “Show all”"), 1–50, default 8.
- **Opening at a line (T038)**: each top-level markdown block sits in a box-less wrapper with its
  source line (`data-line`), so a mention opens its source and scrolls to the block holding that
  line; the document page rule (`page-composition.test.ts`) allows the note's mentions field.
