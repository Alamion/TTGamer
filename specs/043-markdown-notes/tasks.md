# Tasks: Markdown Notes

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order: Foundation (parser, view, and the `markdown` field, which every story renders
through), US1, US2, US5, US3, US4, US6, Finish. US5 comes before US3 and US4 although they share P2,
because the editor's + menu and settings complete the element that rolls and images extend.

## Foundation

- [x] T001 Measure before changing anything: the size of the sheet chunk (`/universal_sheet`) and of
      the main chunk in a production build; record both under "Implementation notes" in design.md
- [x] T002 Write `tests/shared/markdown/parse.test.ts` first: every block and inline of FR-003
      (ATX/setext headings, rules, fenced code with info string, quotes with lazy continuation,
      tight/loose/nested/task lists with their source line, pipe tables, inline code, escapes,
      entities, emphasis and strong with flanking rules, links with titles and balanced parentheses,
      autolinks, bare URLs, `==highlight==`), every line of a paragraph its own paragraph, callouts
      with `-`/`+`/no marker → `fold` `closed`/`open`/`null`, `[[x]]`, `[[x|alias]]`, `![[x]]` kept
      verbatim, `||x||` literal
- [x] T003 Write `tests/shared/markdown/safety.test.ts` first: `<script>`, `<img onerror>`,
      `<details>`, `javascript:`/`data:`/`vbscript:` links, entity-encoded schemes → rendered text
      or inert spans, no element outside the renderer's whitelist in the DOM (SC-005, FR-009)
- [x] T004 `src/shared/markdown/parse.ts` and `src/shared/markdown/types.ts`: the block and inline
      AST of design D1, ported from WorldInfo Workspace `src/core/preview.ts` (docblock names the
      source), no HTML in any node; links limited to http(s), mailto, `#`, relative paths; T002
      passes
- [x] T005 `src/shared/components/markdown/MarkdownView.tsx`: renders the AST with slots
      `renderCode`, `resolveEmbed`, `onToggleTask`, `onIssue`; callout types map to existing palette
      tokens only (design D1); unknown callout types render as a neutral callout and call `onIssue`,
      which the sheet field forwards to `diagnostics.ts`; memoize blocks by source text; T003 passes
- [x] T006 Write `tests/shared/markdown/MarkdownView.perf.test.tsx`: parse + render of a
      300,000-character note within 200 ms and within a bound of a same-run 30,000-character
      baseline, best of several warm runs (SC-002)
- [x] T007 `src/sheet_manager/types/template.ts`: `MarkdownFieldSchema` (`type: 'markdown'`, field
      base shape, `rows` 4–40, default 12) in the field union and `TEMPLATE_FIELD_TYPES`;
      `src/sheet_manager/types/templateValues.ts`: markdown value schema `{ text, images? }`,
      `TEMPLATE_VALUES_LIMITS.markdownMaxLength` 300,000 and `markdownImagesMax` 100, value
      switches, `coerceStoredValue` text ↔ markdown (cut over 10,000 characters with
      `template-value-unreadable`); regenerate `tests/sheet_manager/fixtures/zod-baseline/*.json`
- [x] T008 Write `tests/sheet_manager/markdown-field.test.tsx` first: reading mode by default, Edit
      and Done buttons, Ctrl/Cmd+E toggles and Esc leaves edit mode, split at ≥ 720 px vs
      source/result toggle below, Ctrl/Cmd+B/I/K/L and toolbar buttons wrap the selection, the limit
      stops input with a `role="status"` line and a `template-value-write-rejected` report, writes
      go through `updateTemplateValues`, coercion from a text value
- [x] T009 `src/sheet_manager/features/sheet/declarative/MarkdownFieldControl.tsx` (textarea,
      toolbar of labelled buttons, shortcuts via `insertText` with a value-write fallback,
      `useDeferredValue` preview, `Splitter` or toggle by `ResizeObserver` width) and its entry in
      `registry/declarativeFieldRegistry.ts` and `fieldControls.tsx`; strings in
      `translations/source/{en,ru}/ui/shared/markdown.yaml`; T008 passes
- [x] T010 Run `yarn verify` (schema edits) and commit the foundation

## User Story 1 - Write a formatted note (P1)

**Check**: create a Note, type each supported block, reload, see the same note in reading mode.

- [x] T011 [US1] Write `tests/sheet_manager/systems/general/note.test.ts` first: `noteDefinition`
      parses `{ name, frontMatter? }`, the `general-note` page renders name and body, the create
      choices show the Note in a "General" group with any registry, the documents window's system
      filter labels it "General", the library node of General has no empty "Rules only" heading, a
      user setting on General offers the Note, the name syncs the title
- [x] T012 [US1] `src/sheet_manager/systems/general/` (plugin `general`: ruleset, no dice, policies,
      or catalogs; `documents: [noteDefinition]`; `coreDefinitions: ['note']`), the definition,
      `field:name` binding with `syncsTitle`, the `general-note` template (name + a `markdown` field
      with coordinate `body`), and an example note showing the syntax; register it last in
      `src/sheet_manager/systems/index.ts`; labels in
      `translations/source/{en,ru}/ui/sheet/general.yaml`; adjust the library tree labels if T011
      shows an empty heading; T011 passes
- [x] T013 [US1] Task checkboxes in reading mode, and in the brief's read-only look, toggle
      `[ ]`/`[x]` on their source line through `onToggleTask` (FR-005); cases in
      `tests/sheet_manager/markdown-field.test.tsx`
- [x] T014 [US1] `tests/sheet_manager/page-composition.test.ts`: the shape rule "a full page whose
      only growing element is one markdown field, with at most a name field beside it, is a document
      page" instead of an exception entry; the `general-note` page passes `shipped-parity.test.tsx`
- [x] T015 [US1] A newly created empty note opens in edit mode with the cursor in the text
      (`createFromChoice.ts` hand-off); case in `tests/sheet_manager/systems/general/note.test.ts`
- [x] T016 [US1] Base storybook stories in `src/sheet_manager/storybook/stories.ts` (reading,
      editing, full note) and their `REQUIRED_VARIANTS` tags in
      `tests/sheet_manager/storybook.test.tsx` (constitution VI, FR-012)
- [x] T017 [US1] `tests-e2e/smoke/notes.spec.ts`: create a note, write a heading and a list, reload,
      reading mode shows them
- [x] T018 [US1] Bundle check: rebuild, compare the sheet and main chunks with T001, confirm the
      parser and view are not in the main chunk; record the numbers in design.md
- [x] T019 [US1] Run `yarn verify:full` (new shared component) and commit the story

## User Story 2 - Organize a long note with foldable callouts (P1)

**Check**: `-`, `+`, and plain callouts after a reload start folded, open, and not foldable.

- [x] T020 [US2] Write the cases first in `tests/shared/markdown/MarkdownView.test.tsx`: folded
      callouts show only the title, a button with `aria-expanded` toggles by click, Enter, and
      Space, `+` starts open, folding never changes the text, fold state is per view
- [x] T021 [US2] Folding in `src/shared/components/markdown/MarkdownView.tsx` (local state keyed by
      block index) and the toolbar's Callout and Folded callout inserts in
      `MarkdownFieldControl.tsx`; stories for folded and open callouts; add them to the e2e smoke
      test
- [x] T022 [US2] Run the targeted tests and `yarn verify:fast`; commit the story

## User Story 5 - Markdown in my own pages (P2)

**Check**: add the element to a user page, set it up, write in a document; the storybook shows it.

- [x] T023 [US5] Write the editor cases first in the existing template editor tests
      (`tests/sheet_manager/template-editor*.test.tsx`): + menu offers Markdown on full pages and
      briefs, settings label / value key / starting height, type change text ↔ markdown keeps the
      text
- [x] T024 [US5] Factory case in `template-editor/model/factories.ts`, entry in
      `template-editor/elements/registry.tsx`, settings in `panels/field/` and
      `settings/registry.ts`, `fieldTypes.markdown` label in en/ru YAML; T023 passes
- [x] T025 [US5] On a brief the element is read-only rendered text, folded by default; case in
      `tests/sheet_manager/markdown-field.test.tsx`; brief-look story and its tag
- [x] T026 [US5] Run the targeted tests and `yarn verify:fast`; commit the story

## User Story 3 - Roll from a note (P2)

**Check**: valid `dice:` code rolls through the dice flow; invalid stays text with the reason.

- [x] T027 [US3] Write `tests/integrations/note-rolls.test.tsx` first: `` `dice: 6d10>=6` `` renders
      a roll button that rolls exactly that notation with the note's title as the name and the note
      as source; invalid notation keeps the code with the diagnostic in `title` and
      `aria-describedby` and reports through `diagnostics.ts`; other inline code stays code
- [x] T028 [US3] `src/integrations/sheet-dice/noteRolls.tsx`: the `renderCode` slot using
      `validateNotation`/`diagnoseNotation` and `useSheetDiceActions().rollImmediately`, passed by
      `MarkdownFieldControl.tsx`; T027 passes; storybook stories for a roll and an invalid roll
- [x] T029 [US3] Run the targeted tests and `yarn verify:fast`; commit the story

## User Story 4 - Images in a note (P2)

**Check**: paste, pick, and an HTTPS image render after a reload; a removed reference frees the blob
when the field is left, and undo before that keeps it.

- [x] T030 [US4] Write `tests/sheet_manager/markdown-images.test.ts` first: paste and pick store a
      blob, add `images[name]`, insert `![[name]]` at the cursor; names are unique; removing the
      reference keeps the entry until blur or unmount, then drops it and `deviceImageIdsOf` no
      longer lists the blob; undo before blur shows the image again; `http:` images render as a link
      with an explanation; over 100 images is refused with a status line
- [x] T031 [US4] Paste and file pick in `MarkdownFieldControl.tsx` through
      `persistence/portraitStorage.ts`, pruning of unreferenced names on blur and unmount (design
      D5), the `resolveEmbed` slot for `![[name]]` of the value's images (others stay inert,
      FR-010); T030 passes; storybook story with an image
- [x] T032 [US4] Run `yarn verify` (persistence) and commit the story

## User Story 6 - Markdown files in and out (P3)

**Check**: export → import gives the same title and body byte for byte, foreign front matter kept.

- [ ] T033 [US6] Write `tests/sheet_manager/note-files.test.ts` first: `.md` export (front matter
      `title` + verbatim body), `.zip` export with `note.md` and `images/`, import of both into a
      new Note with images restored, unknown front matter keys and comments kept byte-exact, title
      from the file name when front matter has none, every syntax example of the guide page
      round-trips (SC-003), non-text, broken zip, and oversize files rejected with a reason
- [ ] T034 [US6] `src/sheet_manager/features/documents/noteFiles.ts` (lazy `import('yaml')` and
      `import('fflate')`); Export of a document of the Note kind (`general/note`, by definition) in
      `SheetWorkspace.tsx` writing `.md`/`.zip`; Import accepting `.md` and `.zip` in
      `SheetToolbar.tsx` and joining the batch summary and `RejectedFiles`; `package.json`: add
      `fflate`, move `yaml` to dependencies; T033 passes
- [ ] T035 [US6] Bundle check: `yaml` and `fflate` load in chunks of their own, not in the sheet or
      main chunk; record it in design.md
- [ ] T036 [US6] Run `yarn verify:full` (dependency change) and commit the story

## Finish

- [ ] T037 Check SC-004: add notes to the 3,000-document fixture of
      `tests-e2e/timings/documents.spec.ts` and compare the window's open and search timings with
      the sheets-only run; record the numbers in design.md
- [ ] T038 Guidance: `src/sheet_manager/AGENTS.md` (the `general` system, the Note, markdown values
      and their images), `.agents/skills/sheet-templates/SKILL.md` and `references/node-tree.md`
      (the `markdown` field, the page-composition shape rule), root `AGENTS.md` §6/§8 (the
      `shared/markdown` module)
- [ ] T039 User guide: `docs/guide/notes.mdx` (creating, editing, syntax with examples, folding,
      rolls, images, files) and its Russian mirror under `i18n/ru/…/guide/notes.mdx`; link it from
      `docs/guide/index.mdx` and the field's help link; `yarn validate:i18n`
- [ ] T040 Backlog: mark T-048 done with a dated note in `TODO.md` that records its narrowed scope
      (no inline HTML or MDX embeds); add the next slice (links, previews, backlinks, embeds) as a
      task under `gm-notes-templates`/`note-tree`
- [ ] T041 Run `yarn verify:full`; walk the steps in design.md "Manual walk"; record results in
      design.md

## Coverage

FR-001 T007, T024 · FR-002 T012 (+T014) · FR-003 T002, T004 · FR-004 T020–T021 · FR-005 T013 ·
FR-006 T008–T009, T015 · FR-006a T008–T009 · FR-007 T027–T028 · FR-008 T030–T031 · FR-009 T003–T005
· FR-010 T002, T031 · FR-011 T033–T034 · FR-012 T016, T021, T025, T028, T031, T039 · FR-013 T005,
T008, T027, T030 · SC-001 manual walk with the guide (T039, T041) · SC-002 T006 · SC-003 T033 ·
SC-004 T037 · SC-005 T003 · Constitution VII bundle review T001, T018, T035.
