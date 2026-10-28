# Tasks: Sheet follow-ups after links

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order: US1 (P1), then US2, US3, US4 (P2, independent), US5 (P3), Finish. No foundation: the
stories share no new code.

## User Story 1 - Read the rule without leaving the sheet (P1)

**Check**: on a Star Wars sheet, "?" on Attributes shows the Attributes text in a card; Ctrl-click
opens the page in a new tab.

- [x] T001 [US1] Write `tests/shared/docs-fragment.test.tsx` first: `fragmentOf(toc, anchor)` keeps
      the anchored heading up to the next heading of the same or higher level, no anchor keeps the
      text before the first heading, a missing anchor gives the first section and a "not found"
      flag; the card opens on a plain click, not on Ctrl/⌘/Shift or a middle click; an external link
      renders a plain link; an unavailable page shows the message and reports once; a page module
      loads only when a card opens and once per page (FR-001–FR-004)
- [x] T002 [US1] `src/shared/components/docsFragments.ts`: find a site path's route in
      `@generated/routesChunkNames` (locale `baseUrl` applied as `useSitePath` does), load its
      `content` module through `@generated/registry` once per page (cached promise), and
      `fragmentOf` from the module's `toc` (design D1, D2); report `docs-fragment-missing` /
      `docs-fragment-unavailable` once per link through the shared logging
- [x] T003 [US1] `src/shared/components/DocsFragmentCard.tsx`: Radix Popover in
      `container={modalRoot()}`, `z-[1000]`, height within
      `--radix-popover-content-available-height` and scrolling, labelled; renders the module's MDX
      through `@theme/MDXContent` with a `wrapper` that keeps only the fragment's top-level
      children; loading, "section not found", and unavailable states; "Open the page" link
- [x] T004 [US1] `src/shared/components/DocsHelpLink.tsx`: a `preview` option; with it, a plain
      click on a site link opens `DocsFragmentCard` and other clicks keep the default (design D4);
      `SectionCard.tsx` and `CollapsibleBlock.tsx` pass `preview`
- [x] T005 [US1] Card strings in `translations/source/{en,ru}/ui/shared` (open the page, loading,
      section not found, unavailable), then `yarn build:translations`
- [x] T006 [US1] Write `tests/docs/docs-links-anchors.test.ts`: every shipped `docsPath` (collected
      by walking every system's shipped templates, V5 and wod2e parts included) names an existing
      route, and its anchor is the same explicit `{#id}` heading in the English and the Russian page
      (design D3)
- [x] T007 [US1] Add the same explicit `{#english-id}` to the English (`docs/**`) and Russian
      (`i18n/ru/docusaurus-plugin-content-docs/current/**`) headings the shipped links target until
      T006 passes; `yarn validate:i18n`
- [x] T008 [US1] E2E `tests-e2e/smoke/docs-fragment.spec.ts`: "?" on a Star Wars section shows the
      fragment, styled (a known width), and Ctrl-click opens a new page; browser timing
      `tests-e2e/timings/docs-fragment.spec.ts`: first-open and repeat-open times against SC-001's 1
      s and 500 ms
- [x] T008a [US1] Storybook: a section with a docs link (card on click) in
      `src/sheet_manager/features/storybook/stories.ts` (constitution VI)
- [x] T009 [US1] Measure the main and `/universal_sheet` chunks before and after (constitution VII,
      a new shared component) and record them in design.md; run `yarn verify:full` and commit the
      story

## User Story 2 - Tell games apart in the documents window (P2)

**Check**: with documents of three systems, each row shows its badge; all of one system, none.

- [x] T010 [US2] Write `tests/sheet_manager/documents-badges.test.tsx` first: a badge per document
      row with the system's full name as accessible name; an own type shows its owner's system; a
      General note shows "General"; no badges when every shown row has one system or a system filter
      is on; folders have none (FR-005, FR-006)
- [x] T011 [US2] `src/sheet_manager/systems/types.ts`: `badge` on `SystemPlugin`; set it in
      `general`, `wod2e`, `star-wars-wod`, `v5` with YAML `sheet.<system>.badge` (en, ru);
      `features/documents/labeler.ts`: `systemBadge(systemId)` with the label as full name
- [x] T012 [US2] `src/sheet_manager/components/documents/DocumentsTree.tsx`: the badge in the row's
      `badges` slot, hidden when the shown rows share one system (design D5)
- [x] T013 [US2] Run the targeted tests and the documents window timing with 3,000 documents against
      its last value (SC-002); commit the story

## User Story 3 - Name documents of my own types (P2)

**Check**: an own type's text field set to **Document name**: typing renames the document, and the
list, `[[` suggestions, and a roll show it.

- [x] T014 [US3] Write `tests/sheet_manager/document-name-binding.test.tsx` first: the source is
      offered for a kind without a name binding and not added where one exists; typing writes
      `metadata.title` through the rename path (the link keeper takes it); a rename in the documents
      window shows in the field; the "no name" notice now covers own types; a roll of a document
      with an empty name is named after its type (FR-007–FR-009)
- [x] T015 [US3] `src/sheet_manager/systems/templateBindings.ts`: `title?: true` on `FieldBinding`,
      the shared `field:document-name` binding appended by `listDocumentBindings` when no
      `syncsTitle` field binding exists; its label in YAML (en, ru) (design D6)
- [x] T016 [US3] Read and write paths: `features/sheet/declarative/hooks.ts` (writes),
      `systems/templateBindings.ts` reads, `boundDocument.ts` (bound documents of own kinds), so a
      `title` binding reads `metadata.title` and writes through `updateDocumentMetadata`
- [x] T017 [US3] `src/sheet_manager/features/sheet/data/boundDocument.ts`: roll name falls back to
      the kind label through `documentLabeler` (design D7)
- [x] T018 [US3] Run `yarn verify` (binding contract change) and commit the story

## User Story 4 - Use a tracker in a formula (P2)

**Check**: an own template's button `{max(1, 3 + wounds)}d10`: marking the tracker changes the
rolled notation; the Star Wars health penalty reads the same way.

- [x] T019 [US4] Write `tests/sheet_manager/tracker-formulas.test.ts` first: `deepest` gives the
      deepest marked level's value, `count` the filled count, nothing marked 0, a text value "not a
      number", several copies the one marked deepest (with bonus values too) or most filled; the
      tracker key is in the numeric coordinates and the formula suggestions; a tracker named in its
      own lengths formula is a cycle; Star Wars wounds give the penalty, V5 Health and Willpower the
      filled count, members the worst one; a button's rolled notation changes after a box is marked
      (FR-010–FR-012, SC-004)
- [x] T020 [US4] `src/sheet_manager/features/sheet/data/tracker.ts`:
      `trackerReading(field,     value)` (design D8)
- [x] T021 [US4] `features/sheet/declarative/hooks.ts` `resolveBase`: a tracker value reads through
      `trackerReading`; `features/sheet/data/templateReferences.ts`
      `listTemplateNumericCoordinates`: tracker keys; `types/template.ts`
      `collectFormulaDependencies`: trackers' formulas
- [x] T022 [US4] `src/sheet_manager/systems/templateBindings.ts`: `track` bindings in
      `listNumericCoordinates`, and `readBoundNumber` for them (design D9)
- [x] T023 [US4] Run `yarn verify` (formula and binding change) and commit the story

## User Story 5 - Removed pictures free their space (P3)

**Check**: a stored note naming a picture its text lost: after a reload and opening it, the entry
and its stored file are gone; a planted orphan file is deleted at idle.

- [x] T024 [US5] Write `tests/sheet_manager/picture-cleanup.test.ts` first: opening a document drops
      picture entries its text no longer names and deletes their files; the idle sweep deletes files
      no document names and keeps those of live, pending-purge, and this session's saves; the sweep
      reads no record beyond the link index's and the pending-purge ones (FR-013, FR-014, SC-005,
      SC-006)
- [x] T025 [US5] Only on the first load of a record from storage (a document already in memory is
      not pruned again): a shared pure helper for "pictures the text names" used by
      `MarkdownFieldControl.tsx`'s prune and by `openDocument` in `store/documentStore.ts`, which
      saves the pruned document through the normal writer and reports `pictures-pruned` with the
      count (design D10)
- [x] T026 [US5] `src/sheet_manager/persistence/portraitStorage.ts`: `listPortraitIds()` and the ids
      saved this session; `store/documentBoot.ts` passes `scheduleLinkIndexLoad` a reader that
      collects `deviceImageIdsOf`, then sweeps after the load (same generation) (design D11);
      diagnostics code `pictures-swept`
- [x] T027 [US5] Run `yarn verify` (persistence change) and commit the story; F-010 marked done in
      `TOFIX.md`

## Finish

- [x] T028 Update the module notes and skills (one owner per rule): `src/sheet_manager/AGENTS.md`
      (badges, document name binding, picture sweep), the `sheet-templates` skill formulas reference
      (tracker readings), `docusaurus-integration` skill (docs fragments and the `{#id}` rule for
      linked Russian headings); the user guide en + ru (template editor: Document name source,
      trackers in formulas; sheet: docs card); `TODO.md` T-059, T-102, T-111, T-083 closed with
      notes
- [x] T029 Run `yarn verify:full`; walk the steps in design.md "Manual walk"; record results in
      design.md
