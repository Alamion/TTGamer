# Tasks: Markdown Notes

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order: Foundation (parser, view, and the `markdown` field, which every story renders
through), US1, US2, US5, US3, US4, US6, Finish. US5 comes before US3 and US4 although they share P2,
because the editor's + menu and settings complete the element that rolls and images extend.

## Foundation

- [ ] T001 Write `tests/shared/markdown/parse.test.ts` first: every block and inline of FR-003
      (ATX/setext headings, rules, fenced code with info string, quotes with lazy continuation,
      tight/loose/nested/task lists with their source line, pipe tables, inline code, escapes,
      entities, emphasis and strong with flanking rules, links with titles and balanced parentheses,
      autolinks, bare URLs, `==highlight==`), every line of a paragraph its own paragraph, callouts
      with `-`/`+`/no marker → `fold` `closed`/`open`/`null`, `[[x]]`, `[[x|alias]]`, `![[x]]` kept
      verbatim, `||x||` literal
- [ ] T002 Write `tests/shared/markdown/safety.test.ts` first: `<script>`, `<img onerror>`,
      `<details>`, `javascript:`/`data:`/`vbscript:` links, entity-encoded schemes → rendered text
      or inert spans, no element outside the renderer's whitelist in the DOM (SC-005, FR-009)
- [ ] T003 `src/shared/markdown/parse.ts` and `src/shared/markdown/types.ts`: the block and inline
      AST of design D1, ported from WorldInfo Workspace `src/core/preview.ts` (docblock names the
      source), no HTML in any node; links limited to http(s), mailto, `#`, relative paths; T001
      passes
- [ ] T004 `src/shared/components/markdown/MarkdownView.tsx`: renders the AST with slots
      `renderCode`, `resolveEmbed`, `onToggleTask`, `onIssue`; unknown callout types render as a
      neutral callout and call `onIssue`, which the sheet field forwards to `diagnostics.ts`;
      memoize blocks by source text; Tailwind palette classes only; T002 passes
- [ ] T005 Write `tests/shared/markdown/MarkdownView.perf.test.tsx`: parse + render of a
      300,000-character note against a same-run baseline of a 30,000-character one, best of several
      warm runs (SC-002)
- [ ] T006 `src/sheet_manager/types/template.ts`: `MarkdownFieldSchema` (`type: 'markdown'`, field
      base shape, `minRows` 4–40, default 12) in the field union and `TEMPLATE_FIELD_TYPES`;
      `src/sheet_manager/types/templateValues.ts`: markdown value schema `{ text, images? }`,
      `TEMPLATE_VALUES_LIMITS.markdownMaxLength` 300,000 and `markdownImagesMax` 100, value
      switches, `coerceStoredValue` text ↔ markdown (cut over 10,000 characters with
      `template-value-unreadable`); regenerate `tests/sheet_manager/fixtures/zod-baseline/*.json`
- [ ] T007 Write `tests/sheet_manager/markdown-field.test.tsx` first: reading mode by default,
      Edit/Done toggle and its shortcut, split at ≥ 720 px vs source/result toggle below,
      Ctrl/Cmd+B/I/K/L and toolbar buttons wrap the selection, the limit stops input with a
      `role="status"` line and a `template-value-write-rejected` report, writes go through
      `updateTemplateValues`, coercion from a text value
- [ ] T008 `src/sheet_manager/features/sheet/declarative/MarkdownFieldControl.tsx` (textarea,
      toolbar of labelled buttons, shortcuts via `insertText` with a value-write fallback,
      `useDeferredValue` preview, `Splitter` or toggle by `ResizeObserver` width) and its entry in
      `registry/declarativeFieldRegistry.ts` and `fieldControls.tsx`; strings in
      `translations/source/{en,ru}/ui/shared/markdown.yaml`; T007 passes

## User Story 1 - Write a formatted note (P1)

**Check**: create a Note, type each supported block, reload, see the same note in reading mode.

- [ ] T009 [US1] Write `tests/sheet_manager/systems/general/note.test.ts` first: `noteDefinition`
      parses `{ name, frontMatter? }`, the `general-note` page renders name and body, the create
      choices show the Note in a "General" group with any registry, the documents window's system
      filter labels it "General", a user setting on General offers the Note, the name syncs the
      title
- [ ] T010 [US1] `src/sheet_manager/systems/general/` (plugin `general`: ruleset, no dice, policies,
      or catalogs; `documents: [noteDefinition]`; `coreDefinitions: ['note']`), the definition,
      `field:name` binding with `syncsTitle`, the `general-note` template (name + a `markdown` field
      with coordinate `body`), and an example note showing the syntax; register it last in
      `src/sheet_manager/systems/index.ts`; labels in
      `translations/source/{en,ru}/ui/sheet/general.yaml`; T009 passes
- [ ] T011 [US1] Task checkboxes in reading mode toggle `[ ]`/`[x]` on their source line through
      `onToggleTask` (FR-005); case in `tests/sheet_manager/markdown-field.test.tsx`
- [ ] T012 [US1] `tests/sheet_manager/page-composition.test.ts`: the shape rule "a full page whose
      content is one growing element is a document page" instead of an exception entry; the
      `general-note` page passes `shipped-parity.test.tsx`
- [ ] T013 [US1] A new note opens in edit mode with the cursor in the text (`createFromChoice.ts`
      hand-off), case in `tests/sheet_manager/systems/general/note.test.ts`
- [ ] T014 [US1] `tests-e2e/smoke/notes.spec.ts`: create a note, write a heading and a list, reload,
      reading mode shows them
- [ ] T015 [US1] Run `yarn verify` (schema and store edits) and commit the story

## User Story 2 - Organize a long note with foldable callouts (P1)

**Check**: `-`, `+`, and plain callouts after a reload start folded, open, and not foldable.

- [ ] T016 [US2] Write the cases first in `tests/shared/markdown/MarkdownView.test.tsx`: folded
      callouts show only the title, a button with `aria-expanded` toggles by click, Enter, and
      Space, `+` starts open, folding never changes the text, fold state is per view
- [ ] T017 [US2] Folding in `src/shared/components/markdown/MarkdownView.tsx` (local state keyed by
      block index) and the toolbar's Callout and Folded callout inserts in
      `MarkdownFieldControl.tsx`; add the folded and open callouts to the e2e smoke test
- [ ] T018 [US2] Run the targeted tests and `yarn verify:fast`; commit the story

## User Story 5 - Markdown in my own pages (P2)

**Check**: add the element to a user page, set it up, write in a document; the storybook shows it.

- [ ] T019 [US5] Write the editor cases first in the existing template editor tests
      (`tests/sheet_manager/template-editor*.test.tsx`): + menu offers Markdown on full pages and
      briefs, settings label / value key / starting height, type change text ↔ markdown keeps the
      text
- [ ] T020 [US5] Factory case in `template-editor/model/factories.ts`, entry in
      `template-editor/elements/registry.tsx`, settings in `panels/field/` and
      `settings/registry.ts`, `fieldTypes.markdown` label in en/ru YAML; T019 passes
- [ ] T021 [US5] On a brief the element is read-only rendered text, folded by default, with a link
      to the full page; case in `tests/sheet_manager/markdown-field.test.tsx`
- [ ] T022 [US5] Storybook stories in `src/sheet_manager/storybook/stories.ts` (reading, editing,
      folded and open callouts, brief look, full note) and `REQUIRED_VARIANTS` tags in
      `tests/sheet_manager/storybook.test.tsx` (FR-012)
- [ ] T023 [US5] Run the targeted tests and `yarn verify:fast`; commit the story

## User Story 3 - Roll from a note (P2)

**Check**: valid `dice:` code rolls through the dice flow; invalid stays text with the reason.

- [ ] T024 [US3] Write `tests/integrations/note-rolls.test.tsx` first: `` `dice: 6d10>=6` `` renders
      a roll button that rolls exactly that notation with the note's title as the name and the note
      as source; invalid notation keeps the code with the diagnostic in `title` and
      `aria-describedby` and reports through `diagnostics.ts`; other inline code stays code
- [ ] T025 [US3] `src/integrations/sheet-dice/noteRolls.tsx`: the `renderCode` slot using
      `validateNotation`/`diagnoseNotation` and `useSheetDiceActions().rollImmediately`, passed by
      `MarkdownFieldControl.tsx`; T024 passes; storybook stories for a roll and an invalid roll
- [ ] T026 [US3] Run the targeted tests and `yarn verify:fast`; commit the story

## User Story 4 - Images in a note (P2)

**Check**: paste, pick, and an HTTPS image render after a reload; a removed reference frees the
blob.

- [ ] T027 [US4] Write `tests/sheet_manager/markdown-images.test.ts` first: paste and pick store a
      blob, add `images[name]`, insert `![[name]]` at the cursor; names are unique; removing the
      reference drops the entry and `deviceImageIdsOf` no longer lists the blob; `http:` images
      render as a link with an explanation; over 100 images is refused with a status line
- [ ] T028 [US4] Paste and file pick in `MarkdownFieldControl.tsx` through
      `persistence/portraitStorage.ts`, pruning of unreferenced names on every write, the
      `resolveEmbed` slot for `![[name]]` of the value's images (others stay inert, FR-010); T027
      passes; storybook story with an image
- [ ] T029 [US4] Run `yarn verify` (persistence) and commit the story

## User Story 6 - Markdown files in and out (P3)

**Check**: export → import gives the same title and body byte for byte, foreign front matter kept.

- [ ] T030 [US6] Write `tests/sheet_manager/note-files.test.ts` first: `.md` export (front matter
      `title` + verbatim body), `.zip` export with `note.md` and `images/`, import of both into a
      new Note with images restored, unknown front matter keys and comments kept byte-exact, title
      from the file name when front matter has none, every syntax example of the guide page
      round-trips (SC-003), non-text, broken zip, and oversize files rejected with a reason
- [ ] T031 [US6] `src/sheet_manager/features/documents/noteFiles.ts` (lazy `import('yaml')` and
      `import('fflate')`), Export of a Note in `SheetWorkspace.tsx` writing `.md`/`.zip`, Import
      accepting `.md` and `.zip` in `SheetToolbar.tsx` and joining the batch summary and
      `RejectedFiles`; `package.json`: add `fflate`, move `yaml` to dependencies; T030 passes
- [ ] T032 [US6] Run `yarn verify:full` (dependency change) and commit the story

## Finish

- [ ] T033 Check SC-004: add notes to the 3,000-document fixture of
      `tests-e2e/timings/documents.spec.ts` and compare the window's open and search timings with
      the sheets-only run; record the numbers in design.md
- [ ] T034 Guidance: `src/sheet_manager/AGENTS.md` (the `general` system, the Note, markdown values
      and their images), `.agents/skills/sheet-templates/SKILL.md` and `references/node-tree.md`
      (the `markdown` field, the page-composition shape rule), root `AGENTS.md` §6/§8 (the
      `shared/markdown` module); a historical note on T-048's original scope in TODO.md
- [ ] T035 User guide: `docs/guide/notes.mdx` (creating, editing, syntax with examples, folding,
      rolls, images, files) and its Russian mirror under `i18n/ru/…/guide/notes.mdx`; link it from
      `docs/guide/index.mdx` and the field's help link; `yarn validate:i18n`
- [ ] T036 Backlog: mark T-048 done with a dated note in `TODO.md`; add the next slice (links,
      previews, backlinks, embeds) as a task under `gm-notes-templates`/`note-tree`
- [ ] T037 Run `yarn verify:full`; walk the steps in design.md "Manual walk"; record results in
      design.md

## Coverage

FR-001 T006, T020 · FR-002 T010 · FR-003 T001, T003 · FR-004 T016–T017 · FR-005 T011 · FR-006
T007–T008 · FR-006a T007–T008 · FR-007 T024–T025 · FR-008 T027–T028 · FR-009 T002–T004 · FR-010
T001, T028 · FR-011 T030–T031 · FR-012 T022, T025, T028, T035 · FR-013 T004, T007, T024, T027 ·
SC-001 manual walk with the guide (T035, T037) · SC-002 T005 · SC-003 T030 · SC-004 T033 · SC-005
T002.
