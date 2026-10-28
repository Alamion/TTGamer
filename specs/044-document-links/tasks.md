# Tasks: Links Between Documents

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order: Foundation (extraction, resolver, link index: every story reads them), US1, US2,
US3, US4, US5, US6, Finish. US6 follows US3 because embeds reuse the preview card's content.

## Foundation

- [x] T001 Measure before changing anything: main chunk and the `/universal_sheet` chunks in a
      production build; record them under "Implementation notes" in design.md
- [x] T002 Write `tests/shared/markdown/links.test.ts` first: `extractLinks` finds `[[Name]]`,
      `[[Folder/Name]]`, `[[Name|alias]]`, `[[Name#Section]]`, `![[…]]` with their line and a
      context of at most 160 characters, skips code spans and fenced blocks; `rewriteLinks` changes
      only the named links and keeps alias, section, and `!` (FR-010)
- [x] T003 `src/shared/markdown/links.ts`: `LinkRef`, `extractLinks(text)`,
      `rewriteLinks(text,     edits)` as a line scan (design D4); `src/shared/markdown/parse.ts` and
      `types.ts`: wikilink and embed nodes carry `path` and `section`; T002 and
      `tests/shared/markdown/parse.test.ts` pass
- [x] T004 Write `tests/sheet_manager/link-resolve.test.ts` first: name match is case-insensitive
      and ignores a trailing `.md`; a written folder path narrows by suffix; among several the one
      sharing the most leading folders with the source wins, then the earliest `createdAt` (missing
      times last, then id); unresolved returns nothing (FR-001)
- [x] T005 `src/sheet_manager/features/documents/linkResolve.ts`: name buckets built once per
      `entries` array, `resolveLink(link, sourceEntry, buckets)`, `folderPathOf(entry)`, and
      `linkTextFor(target, source, buckets)` (the name, or the full folder path when the name alone
      resolves elsewhere) (design D1); T004 passes
- [x] T006 Write `tests/sheet_manager/link-index.test.ts` first: a saved document writes its link
      record in the same writer pass; markdown values are the `{ text }` template values; purge
      removes the record; boot re-extracts sources without a current-version record in chunks and
      reports `link-index-rebuilt` once; an invalid record is re-extracted; the reverse map lists
      sources by normalized name (FR-007)
- [x] T007 `src/sheet_manager/persistence/linkStorage.ts`: localForage store `links`, Zod record
      `{ v: 1, links }`, read, write, remove, `iterate`; memory variant for tests beside
      `createMemoryRecordStorage`
- [x] T008 `src/sheet_manager/store/linkIndexStore.ts` (not persisted): reverse map and `ready`;
      `src/sheet_manager/store/documentContent.ts` writer writes the link record after `doc:<id>`;
      `src/sheet_manager/store/documentBoot.ts` purge removes it and an idle rebuild fills missing
      records; diagnostics codes `link-index-rebuilt`, `link-unresolved`, `link-section-missing`,
      `links-kept`, `link-preview-missing`, `mentions-truncated` in
      `src/sheet_manager/diagnostics.ts`; T006 passes
- [x] T009 Run `yarn verify` (store and persistence change) and commit the foundation

## User Story 1 - Follow a link from a note (P1)

**Check**: a note links an existing character, a missing name, and a section; follow each.

- [x] T010 [US1] Write `tests/sheet_manager/markdown-links-field.test.tsx` first (follow part): a
      resolved link opens its target through `DocumentLinkContext`; Ctrl/Cmd and middle click call
      the pane store's `openInNewTab`; an alias shows as the text; an unresolved link has its own
      look, and a click asks, then creates a General note of that name in the source's folder and
      opens it; a section link scrolls to the `data-section` element or the top and reports
      `link-section-missing`; a section of a shipped page matches in the shown language and by its
      English source text (FR-002, FR-003, FR-004)
- [x] T011 [US1] `src/shared/components/markdown/MarkdownView.tsx`: slots `renderWikilink(node)` and
      `renderEmbed(node)` (pictures through `resolveEmbed` first), `data-section` on headings;
      `tests/shared/markdown/MarkdownView.test.tsx` covers the slots and the attribute
- [x] T012 [US1] `src/sheet_manager/features/documents/DocumentLink.tsx`: the wikilink rendering
      (resolved link, unresolved link with the create prompt through `createFromChoice`), click
      handling, and the scroll to a section after the target is shown
- [x] T013 [US1] `src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx` (and the
      container and field wrappers it uses): `data-section` from the labels of sections, cards,
      brief blocks, and fields
- [x] T014 [US1] `src/sheet_manager/features/sheet/declarative/MarkdownFieldControl.tsx` passes
      `renderWikilink`; translations in `translations/source/{en,ru}/ui/sheet/links.yaml`; T010
      (follow part) passes
- [x] T015 [US1] Run the targeted tests and `yarn verify:fast`; commit the story

## User Story 2 - Write links with suggestions (P1)

**Check**: type `[[in`, pick Ines Ruiz; type `[[Bruno Kessel#`, pick Skills.

- [x] T016 [US2] Extend `tests/sheet_manager/markdown-links-field.test.tsx` first (suggestions
      part): `[[` opens a listbox over the textarea as an ARIA combobox; matches show kind and
      folder, nearest first; arrows and Enter insert `[[Name]]` with the cursor after it, or a
      folder path when the nearest rule would pick another; `#` after a name lists a note's headings
      or a sheet's section, card, block, and field labels; Esc or no match closes and keeps the text
      (FR-005)
- [x] T017 [US2] `src/sheet_manager/features/documents/linkSuggestions.ts`: matches from `query.ts`
      normalized names ordered by `linkResolve` nearness (at most 20), and `sectionsOf(entry)`
      (stored note headings, or labels of the default full page)
- [x] T018 [US2] `src/sheet_manager/features/sheet/declarative/caretPosition.ts`: caret coordinates
      of a textarea by mirror element;
      `src/sheet_manager/features/sheet/declarative/LinkSuggestions.tsx` and
      `MarkdownFieldControl.tsx` wiring (`aria-autocomplete`, `aria-activedescendant`); T016 passes
- [x] T019 [US2] Write `tests/sheet_manager/link-suggestions.perf.test.ts`: suggestions over 3,000
      entries within 100 ms per keystroke (SC-001)
- [x] T020 [US2] Storybook: the suggestions list in `src/sheet_manager/storybook/stories.ts`
- [x] T021 [US2] Run the targeted and perf tests and `yarn verify:fast`; commit the story

## User Story 3 - Preview a linked document (P2)

**Check**: point at a link in a note, a Star Wars vehicle's crew link, and a V5 group member.

- [x] T022 [US3] Write `tests/sheet_manager/document-preview-card.test.tsx` first: opens 400 ms
      after hover or keyboard focus and on a 500 ms touch press; closes 200 ms after leaving trigger
      and card or on Esc with focus back on the trigger; shows the brief view read-only, or for a
      document without a brief its title and first 12 lines; a link inside the card follows; a
      missing target reports `link-preview-missing`; reference chips and incoming references show
      the same card (FR-006)
- [x] T023 [US3] `src/sheet_manager/features/documents/DocumentPreviewContent.tsx`: loads the target
      by id (`loadIntoCache`), renders the brief (`briefViewOf`) inside `PaneSourceProvider` with a
      read-only source, or the note lines through `MarkdownView`
- [x] T024 [US3] `src/sheet_manager/features/documents/DocumentPreviewCard.tsx`: the trigger and the
      Radix Popover with the timings of design D9, 360 × 480 px at most, scrolling
- [x] T025 [US3] `src/sheet_manager/features/documents/DocumentLink.tsx` wraps resolved links in the
      card; `src/sheet_manager/features/sheet/declarative/fieldControls.tsx` wraps reference names
      and incoming reference names; T022 passes
- [x] T026 [US3] Write `tests/sheet_manager/document-preview-card.perf.test.tsx`: the card's content
      shows within 300 ms after the pause for a document not yet loaded (SC-002)
- [x] T027 [US3] Storybook: the card with a brief and with a note in
      `src/sheet_manager/storybook/stories.ts`
- [x] T028 [US3] Run the targeted and perf tests and `yarn verify:fast`; commit the story

## User Story 4 - Keep links when documents are renamed or moved (P2)

**Check**: three notes link to Ines; rename her; undo; create a nearer Sword.

- [x] T029 [US4] Write `tests/sheet_manager/link-keeper.test.ts` first: a rename rewrites links that
      resolved to the document (alias, section, `!` kept) and no others; renaming to a taken name
      writes a folder path; a move rewrites only where nearness changed; a folder move keeps inner
      links unchanged; a new, copied, imported, or moved-in document of the same name nearer to a
      source rewrites that source's links to keep their target; deleting rewrites nothing; undo
      reverts only the rewritten links and skips the keeper, keeping edits made to those notes after
      the rename, and leaves a link changed by hand meanwhile (reported); redo re-runs it; a name
      typed in the sheet is taken after 1.5 s, on blur, or on `pagehide`, and a rename from the
      documents window is not taken twice (FR-008)
- [x] T030 [US4] `src/sheet_manager/features/documents/linkKeeper.ts`: affected names from entries
      before and after; sources from the reverse map; resolve before and after; edits through
      `rewriteLinks`; documents loaded by id and written with `updateTemplateValues`; returns the
      link edits for undo (design D5)
- [x] T031 [US4] `src/sheet_manager/features/documents/history.ts` and `treeActions.ts`: a history
      entry carries link edits; `runTreeChange` runs the keeper and attaches them; undo applies the
      reverse edits without the keeper (design D6)
- [x] T032 [US4] A rename typed in a sheet's name field: taken after 1.5 s of quiet, on the field's
      blur, or on `pagehide` as a rename from the baseline name, pushed to the documents history
      with its link edits; renames made by tree operations are marked and skipped
      (`src/sheet_manager/features/documents/nameSettle.ts`, wired where the store syncs the title)
- [x] T033 [US4] Create, example copies (`createFromChoice.ts`), and imports (`importBatch.ts`) run
      the keeper without a history entry; the `links-kept` message names the count; T029 passes
- [x] T034 [US4] Write `tests/sheet_manager/link-keeper.perf.test.ts`: renaming a document linked
      from 100 notes rewrites them within 2 s (SC-004)
- [x] T035 [US4] Run `yarn verify` (store change) and commit the story

## User Story 5 - See what mentions a document (P3)

**Check**: two notes and a location type's description link to the note Docks; open Docks; add the
field to a character page.

- [x] T036 [US5] Write `tests/sheet_manager/mentioned-in.test.tsx` first: the `mentions` field lists
      the sources whose links resolve to the shown document with their kind and context line; a
      click opens the source scrolled to that line; a source that stops linking leaves the list;
      more than `rows` entries fold behind "Show all"; more than 200 sources report
      `mentions-truncated`; the field is in the + menu after `markdown`, refused in list items and
      table columns, and sits at the bottom of `general-note` only (FR-009)
- [x] T037 [US5] `src/sheet_manager/types/template.ts`: `MentionsFieldSchema` (`type: 'mentions'`,
      `rows` 1–50, default 8) in the field and node unions and `TEMPLATE_FIELD_TYPES`, excluded from
      list items and table columns; update `tests/sheet_manager/zod-baseline.test.ts` snapshot
- [x] T038 [US5] `src/sheet_manager/features/sheet/declarative/MentionsFieldControl.tsx`: reads the
      reverse map, resolves each source's links, loads at most 200 source link records for context;
      compact on a brief; opens at the line through `DocumentLink` scrolling
- [x] T039 [US5] Template editor: `elements/registry.tsx` palette entry, `model/factories.ts`,
      `model/fields.ts`, settings (label, `rows`) in `settings/registry.ts`; translations in
      `templates.yaml` and `links.yaml` (en, ru)
- [x] T040 [US5] `src/sheet_manager/systems/general/note.ts`: `noteTemplate` gains the `mentions`
      field at the bottom; storybook story in `src/sheet_manager/storybook/stories.ts`; T036 passes
- [x] T041 [US5] Add a "Mentioned in" timing to `tests-e2e/timings/documents.spec.ts` (3,000
      documents, 10 links each) next to the link index boot timing; a reported timing, while the
      measurement in design D3 is the check of SC-003
- [x] T042 [US5] Run `yarn verify` (schema change) and commit the story

## User Story 6 - Embed a document in a note (P4)

**Check**: a note embeds a character, a note, and a section of a note.

- [x] T043 [US6] Extend `tests/sheet_manager/document-preview-card.test.tsx` first (embeds):
      `![[Name]]` shows the preview content in place; `![[Note#Heading]]` shows the blocks to the
      next heading of the same or higher level; `![[Sheet#Section]]` shows that node; depth stops at
      2; a cycle shows a link; a name the field's `images` holds stays a picture (FR-012)
- [x] T044 [US6] `src/sheet_manager/features/documents/DocumentEmbed.tsx`: the embed rendering over
      `DocumentPreviewContent`, an embed-path context for depth and cycles, the heading slice, and a
      one-node page for a sheet section; `MarkdownFieldControl.tsx` passes `renderEmbed`; T043
      passes
- [x] T045 [US6] Run the targeted tests and `yarn verify:fast`; commit the story

## Finish

- [x] T046 Cloud contract proposal 0.2.0 (FR-011): `contracts/cloud-api/openapi.yaml` (`links` on
      `StoredDocument`, `GET /documents/mentions`) and an entry in `contracts/cloud-api/CHANGES.md`
      (author frontend, approval pending); `IMPLEMENTED_CONTRACT_VERSION` stays 0.1.0;
      `yarn validate:contract`
- [x] T047 Write `tests-e2e/smoke/links.spec.ts`: write a link with suggestions, follow it, Back,
      preview, rename keeps the link, reload keeps everything; export of the note keeps the link
      text, and the guide's link examples round-trip in `tests/sheet_manager/note-files.test.ts`
      (SC-005)
- [x] T048 Update guidance: `src/sheet_manager/AGENTS.md` (links, link index, keeper, card,
      `mentions` field), root `AGENTS.md` (§8: links through `linkResolve` and the card),
      `.agents/skills/sheet-templates` (`mentions` in the node tree),
      `contracts/cloud-api/README.md` if it lists versions
- [x] T049 User guide en + ru: `docs/guide/notes.mdx` "Links between documents" rewritten (writing,
      following, preview, keeping, Mentioned in, embeds); `docs/guide/template-editor/elements.mdx`
      the `mentions` element; reference fields' preview where the guide describes them
- [x] T050 Backlog: `TODO.md` T-128 and T-051 marked done with the scope note
- [x] T051 Bundle review: measure the chunks again and record the difference in design.md
- [x] T052 Run `yarn verify:full`; walk the steps in design.md "Manual walk" (SC-006); record
      results in design.md; commit the finish
