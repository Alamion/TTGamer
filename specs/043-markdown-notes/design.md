# Design: Markdown Notes

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-25

## Approach

A pure markdown parser and a React renderer go into `shared/` (system- and feature-independent),
ported from the maintainer's WorldInfo Workspace preview (`src/core/preview.ts`, same author, MIT):
same syntax and the same line-per-paragraph rule, but producing a small AST instead of an HTML
string, so folding, checkboxes, rolls, and images are real React controls. A new template field type
`markdown` renders that view and a plain-textarea editor. A new system-neutral plugin `general` (a
ruleset with no dice, no policies, no catalogs) ships the Note definition and its one page, so the
create dialog, the library, and the documents window's filters show it through the registry they
already read. Rolls go through the existing `integrations/sheet-dice` hook; images reuse device
image storage; `.md`/`.zip` files go through the toolbar's import and export.

Order (one commit per story): renderer → field type and editor (US1, US2, US5) → `general` system
and the Note (US1) → rolls (US3) → images (US4) → markdown files (US6) → guide pages, storybook,
guidance.

## Decisions

- **D1 — Hand-written parser with an AST**: `shared/markdown/parse.ts` turns text into blocks
  (heading, paragraph line, rule, code, quote, callout with `fold: 'open' | 'closed' | null`, list
  with task items and their source line, table) and inlines (text, emphasis, strong, highlight,
  code, link, autolink, wikilink, embed). `shared/components/markdown/MarkdownView.tsx` renders it
  with slots: `renderCode(code)`, `resolveEmbed(name)`, `onToggleTask(line)`, `onIssue(issue)`.
  Callout colors map each type to an existing palette token (note/info → hologram blue, tip/success
  → jedi green, warning/spoiler → droid gold, danger/bug → primary, others neutral); no new token,
  so the storybook's palette page is unchanged. _Why_: the syntax is non-standard (every line a
  paragraph, Obsidian callouts and embeds), the interactive parts need React nodes, and the project
  already hand-writes its dice parser. _Rejected_: markdown-it / micromark with plugins — a client
  dependency of 30–100 KB plus three plugins to reach the same syntax; rendering the Workspace HTML
  string with `dangerouslySetInnerHTML` — no place for React controls and one escape bug from an
  XSS.
- **D2 — A new field type `markdown`**, not a `format` option on `text`. _Why_: its value has
  another shape (`{ text, images }`, D5), another size limit (D6), another editor and renderer; as
  an option every text code path would branch on it. Switching the type in the editor converts
  through `coerceStoredValue` (string ↔ `{ text }`, text over 10,000 characters is cut with the
  existing "value unreadable" report). _Rejected_: `text` + `format: 'markdown'` — constitution VI
  prefers options only for elements of similar function; this one shares only "it is text".
- **D3 — The Note lives in a `general` system plugin** (`systems/general/`, label "General" /
  «Общее», registered last). It is a ruleset: no `dice`, no `policies`, no `catalogs`;
  `documents: [noteDefinition]`, `coreDefinitions: ['note']`, so a user setting on General can hold
  its own system-neutral types (a "Location" with markdown). Generic code gains no `general` branch.
  _Why_: the envelope requires a `systemId`, and every surface (create dialog groups, library tree,
  filters, roll source) already reads systems from the registry. _Rejected_: an optional `systemId`
  — touches the envelope, the index, the cloud contract, and every reader.
- **D4 — Note shape**: kind `note`, definition `note`, data `{ name, frontMatter? }` with `name`
  bound as `field:name` + `syncsTitle` (as the V5 group). The text is the page's markdown field,
  coordinate `body`, in `templateValues`. `frontMatter` is the raw YAML text of keys the app does
  not own (≤ 20,000 characters). One shipped view `general-note` (full page): the name and the body,
  no brief. _Why_: a brief of a note would repeat the note; raw YAML keeps foreign keys byte-exact
  without validating arbitrary values. _Rejected_: front matter as parsed JSON — dates, comments,
  and key order would change on the round trip.
- **D5 — Markdown value `{ text: string, images?: Record<name, ImageValue> }`**: pasted or picked
  images are stored with `portraitStorage` and named `paste-<randomToken>.png` (or the file name,
  made unique); the text gets `![[name]]`. When the textarea loses focus or the control unmounts, it
  drops `images` entries whose name no `![[…]]` of the text mentions; `deviceImageIdsOf` already
  walks nested values, so the existing write path frees the blobs. HTTPS URL images stay plain
  `![alt](url)`. _Rejected_: pruning on every write — undo of a deleted image line would bring back
  a reference to a freed blob; images as separate page values — the name→blob link would live
  outside the field and leak on copy and type change.
- **D6 — Limits**: markdown text ≤ 300,000 characters (≈ 45,000 words; the spec's 20,000-word case
  fits twice); ≤ 100 images per value. At the limit the textarea stops taking input and a
  `role="status"` line says the note is full. _Why_: a record is written whole per change
  (`recordWriter`); 300 K characters keep a write well under a frame (measured in the perf test).
- **D7 — Editing view**: reading mode by default per pane (state not stored); a new empty note opens
  in edit mode. Edit/Done buttons and Ctrl/Cmd+E switch modes (Obsidian's toggle key), Esc leaves
  edit mode. A brief shows the field read-only and folded; its checkboxes still tick. Edit mode: a
  `Splitter` with textarea and preview when the field is ≥ 720 px wide (ResizeObserver), else a
  source/result toggle. The preview renders `useDeferredValue(text)` and memoizes blocks by their
  source text, so typing stays responsive in long notes. Shortcuts: Ctrl/Cmd+B, I, K, and Ctrl/Cmd+L
  (checklist, Obsidian's "toggle checkbox" key); the toolbar adds Callout and Folded callout. Edits
  go through `document.execCommand('insertText')` where available so the browser's undo keeps them,
  with a plain value write as fallback.
- **D8 — Rolls**: `renderCode` from the field recognises `dice: <notation>`, checks it with
  `validateNotation`/`diagnoseNotation` (dice-logic public API), and renders a roll button that
  calls `useSheetDiceActions({ characterName: note title, rollSource })` → `rollImmediately`.
  Invalid notation keeps the code with the diagnostic in its `title` and `aria-describedby`.
  _Rejected_: the docs' `InlineRoll` — it rolls locally without history or sharing.
- **D9 — Markdown files**: the toolbar's Export of a document of the Note kind (`general/note`, by
  definition, whatever page shows it) writes `.md` (no images) or `.zip` (`note.md` + `images/`);
  Import accepts `.md` and `.zip` beside `.json`. `yaml` (moved to dependencies) and `fflate`
  (direct dependency; today only transitive) load with `import()` on these actions only. Front
  matter: `title` is owned; everything else stays in `frontMatter` via `parseDocument` / `toString`.
  Failures join the existing rejected-files list. _Rejected_: a hand-written zip reader — zip64,
  data descriptors, and deflate variants from other tools are where hand-written readers break.

## Changed types and data

- `types/template.ts`: `MarkdownFieldSchema` (`type: 'markdown'`, base shape, `rows` 4–40,
  default 12) in the field union and `TEMPLATE_FIELD_TYPES`; additive, no template schema bump
  (older builds reject templates using it, as with every new type).
- `types/templateValues.ts`: markdown value schema and `TEMPLATE_VALUES_LIMITS.markdownMaxLength` /
  `markdownImagesMax`; `coerceStoredValue` cases for text ↔ markdown.
- `systems/general/`: plugin, `noteDefinition` (data schema `{ name, frontMatter? }`, version 1),
  bindings, the `general-note` template, an example note showing the syntax.
- `systems/index.ts`: register `generalSystem` last.
- Document storage, index, envelope, cloud contract: unchanged (a note is an ordinary document).
- Translations: `ui/sheet/general.yaml` (system, kind, page, field labels, example),
  `ui/shared/markdown.yaml` (toolbar, modes, full-note status, roll and image errors),
  `fieldTypes.markdown`, import/export messages; en and ru.
- `package.json`: `fflate` added, `yaml` moved to dependencies (both lazy-loaded).

## Principles at risk

- I (modules): the parser and view stay in `shared/` with slots; dice reach them only through
  `integrations/sheet-dice`; no `general` conditional in generic code (D3).
- II (contracts): note files are validated like JSON imports — size, type, front matter parse, then
  the envelope and definition schemas; rejected files keep their reason.
- III/IV security: the AST never carries HTML; links are limited to http(s), mailto, and `#`; a
  hostile corpus test guards it (SC-005).
- VI: the storybook gets the field (reading, editing, folded and open callouts, roll, invalid roll,
  image, full note); callout titles are buttons with `aria-expanded`; toolbar buttons are labelled.
  The base stories ship with US1, the first story that commits the element. The composition test
  gains one shape rule — a full page whose only growing element is one markdown field, with at most
  a name field beside it, is a document page, not a sheet — instead of an exception list entry.
- VII: `yaml`/`fflate` are lazy; the renderer is part of the sheet chunk only; 300 K limit and
  deferred preview (D6, D7). The new shared component and the dependencies are gated by
  `yarn verify:full` and a bundle check: the sheet chunk's size before and after the parser and
  view, and `yaml`/`fflate` in chunks of their own, recorded under "Implementation notes".

## Tests

- `tests/shared/markdown/parse.test.ts`: every block and inline of FR-003, lines as paragraphs, lazy
  quotes, callout folds, wikilinks/embeds kept verbatim, `||…||` literal.
- `tests/shared/markdown/safety.test.ts`: hostile HTML and `javascript:`/`data:` links render inert.
- `tests/shared/markdown/MarkdownView.test.tsx`: folding by click and keyboard with `aria-expanded`,
  task toggle reports the right line, slots called.
- `tests/shared/markdown/MarkdownView.perf.test.tsx`: parse + render of a 300 K note within 200 ms
  (best of several warm runs) and within a bound of the same-run 30 K baseline (SC-002).
- `tests/sheet_manager/markdown-field.test.tsx`: edit/read toggle, wide split vs narrow toggle,
  shortcuts wrap the selection, limit status, value write and coercion from text.
- `tests/sheet_manager/markdown-images.test.ts`: paste stores and inserts `![[name]]`; removing the
  reference prunes `images` and frees the blob on blur or unmount, not before; undo before blur
  keeps the image.
- `tests/integrations/note-rolls.test.tsx`: `dice:` rolls with the note as source; invalid stays
  text with the diagnostic.
- `tests/sheet_manager/systems/general/*.test.ts`: definition parse, page, create choice in its own
  group, filter label, the library node of General reads well (no empty "Rules only" heading), user
  setting on General offers the Note.
- `tests/sheet_manager/note-files.test.ts`: `.md` and `.zip` export → import round trip (body
  byte-exact, foreign front matter kept, images restored), oversize and broken files rejected.
- Existing: `shipped-parity`, `page-composition` (new shape rule), `storybook`, `docs-embeds`.
- `tests-e2e/smoke/notes.spec.ts`: create a note, write, reload, fold, roll.

## Manual walk

1. New → search "note" → Note under General → empty note in edit mode, cursor in the text.
2. Type the guide's syntax sample on a wide pane → preview beside it follows; narrow the pane →
   toggle replaces the split.
3. Reload → reading mode; folded callout folded; click and Enter unfold it; Ctrl/Cmd+E edits, Esc
   returns.
4. Tick a checklist item in reading mode → the source shows `[x]`.
5. `` `dice: 6d10>=6` `` → roll lands in history named after the note; `` `dice: 6q` `` stays text
   with the reason on hover.
6. Paste a screenshot → image appears; delete its line, Ctrl/Cmd+Z → image back; delete it again and
   click outside the text → stored image is gone.
7. Export → `.zip` with `note.md` + `images/`; unpack into an Obsidian vault → note and image show;
   import the zip → identical note.
8. Template editor on a user type → + Markdown → write in a document of that type.
9. Documents window filter by system → "General" lists the notes.
10. Library → General shows the Note page and lets a setting be created on it, with headings that
    make sense for a ruleset without rules.

## Implementation notes

- **Bundle baseline (T001)**, production build before any change: main chunk 1,039.4 KB (277.7 KB
  gzip); JS loaded first on `/universal_sheet` 282.2 KB gzip; all JS 1,366.2 KB gzip in 131 files.
- **Callout colors (D1)**: the semantic tokens `info`, `success`, `warning`, `error` instead of the
  Star Wars names: a shared component should not speak a setting's palette, and these tokens already
  exist (no storybook palette change).
- **Line cache (D7)**: inline parses are cached by line text (at most 20,000 lines, then cleared).
  Measured in happy-dom on a 300,000-character note with distinct lines: a cold parse 81 ms, a
  re-parse after one edited line 16 ms, the re-render 105 ms. Without the cache a re-parse cost the
  full parse (170 ms) on every pause.
- **Link safety**: `safeHref` also refuses a colon before any path part (`&#106;avascript:`), found
  by the hostile corpus; React never decodes it, but it is not a relative link either.
- **Empty field opens in edit mode**: any empty markdown field starts in edit mode (no focus taken),
  which covers the new empty note without a hand-off from the create dialog (T015 only adds the
  cursor).
- **Limit (D6)**: the textarea's `maxLength` stops input at 300,000 characters, so no write is
  rejected; the status line says the text is full.
- **Editor entries in Foundation**: the field factory, the element registry entry, the
  `fieldTypes.markdown` label, and the table-column and list-entry exclusions are required by the
  compiler with the new type, so they ship with Foundation; US5 adds the + menu entry and settings.
  The base storybook story (T016) also ships with Foundation: the storybook test requires a story
  for every field type.
- **Bundle after US1 (T018)**: main chunk 1,046.6 KB (279.7 KB gzip, +2.0): only translation
  strings, most of it the example note's text, since `uiMessages` ships in the main chunk; the
  parser, view, and field are in the shared `common` chunk (349.5 KB gzip, +9.6), never in main. All
  JS 1,377.4 KB gzip (+11.2).
- **`minRows` → `rows`**: the editor's settings registry names a property once, and `minRows` is
  already a table's "Minimum rows" in the limits group; the field's starting height is `rows` under
  its look settings ("Starting height (lines)").
- **Library wording**: General is a ruleset, and the library's ruleset texts speak of "rules
  characters". `SystemPlugin.library` (optional) gives a ruleset its own intro, the name and note of
  its own types ("Any game" instead of "Rules only"), and its core-type texts; the "Rules only"
  fallback note now names the node through `{name}`. Generic code reads the declared texts, never a
  system id.
- **Example text in the interface language**: system code is also loaded by Node scripts, which
  cannot import `@docusaurus/Translate`. `DocumentExample.create` takes an optional `localize` (the
  UI passes `translate`; without it the English message is used).
- **The cursor in a new note (T015)**: `features/documents/newDocumentFocus.ts` holds claims; an
  empty markdown field claims the focus for its document, and the create dialog hands the focus to
  the claim when it closes (instead of back to the New button). An unnamed document created from the
  documents window keeps asking for its name there, as before.
- **Record writer (found in US2)**: the browser test typed a note and reloaded; the text came back
  cut at a different place each run. Each change queued its own write of a snapshot, so fast typing
  built a backlog that a reload cut short. `createRecordWriter` now takes the versions to write when
  the previous write ends: at most one write runs and one waits, always the latest version. Writing
  every change in parallel (relying on IndexedDB's transaction order) was tried and was worse: one
  transaction per keystroke made the backlog longer. A reload within milliseconds of the last
  keystroke can still lose it, as on any page that saves asynchronously, so the smoke test waits for
  the record before reloading.
- **Pictures (US4)**: `savePortrait` takes optional limits; pictures in a markdown text are stored
  up to 2,048 px on the long edge and 1.5 MB (a portrait stays 768 px and 512 KB), sharing the 50 MB
  quota. Unused pictures are freed on blur, when editing ends with Done or Esc (the text field goes
  away without a blur event), and on unmount. A picture that is not HTTPS shows as a link after a
  short reason.
- **Markdown files (US6)**: the format belongs to the General system
  (`systems/general/noteFiles.ts`) as `DocumentDefinition.files`, an optional file format of a
  kind's own; the toolbar reads it through the registry (`features/sheet/shell/kindFiles.ts`), since
  generic code may not import a system folder (the design placed it in `features/documents`). A file
  of such a format becomes a JSON envelope before the import batch, so it is checked, kept, and
  reported like any other; one that cannot be read joins the rejected files with its reason
  (`ImportFile.rejected`). A one-line `title:` is cut out of the front matter as text, so the other
  keys keep their bytes; a web picture leaves as an ordinary `![name](url)`.
- **Bundle after US6 (T035)**: `yaml` (96.9 KB) and `fflate` (31.8 KB) are chunks of their own,
  loaded on export or import only; main chunk 279.9 KB gzip (+0.2 since US1, strings), `common`
  353.4 KB gzip (+3.9, the file format and the toolbar wiring).
- **SC-004 (T037)**: the 3,000-document timing now stores every other entry as a note. Sheets only
  (the US6 run): open 55 ms, search 24 ms, 60 fps; with notes: open 24 ms, search 23 ms, 60 fps
  (best of five warm runs; the difference is noise).
- **Picture addresses (found in the walk)**: when a text's pictures changed, the old object URLs
  were freed a frame later while the new ones still loaded, so a shown picture pointed at a freed
  address for a moment (a console error, a blink). `useImageUrls` now frees the previous set only
  after the next one is shown; the smoke test adds two pictures in a row and fails on any console
  error.

## Manual walk results (2026-10-26)

Walked on a production build of the branch (`yarn ci:build`, served on port 3100 by Playwright) at
1,400 and 600 px; the maintainer's dev server shows another branch.

1. Pass: New → "note" → Note under General; the note opens in edit mode with the cursor in it.
2. Pass: the guide's syntax sample renders beside the source at 1,400 px; at 600 px Source and
   Result switch.
3. Pass: after a reload the note reads; the folded callout opens with Enter; Ctrl+E edits, Esc
   returns.
4. Pass: ticking a checklist item in reading mode writes `[x]` into the source.
5. Pass: `dice: 6d10>=6` rolls the 3D dice and shows "6d10>=6 = 2"; `dice: 6q` stays code with "Not
   a roll: Unknown character “q”".
6. Pass: a picked picture shows; deleting its line and undoing brings the reference and the picture
   back; Esc after that keeps it.
7. Pass in the browser: Export gives `Docks.zip` with `Docks.md` and `images/jax_vorn.png`, and
   importing the zip makes the note again. **Left for the maintainer**: unpack it into an Obsidian
   vault and check the note and its picture there.
8. Covered by the editor tests (+ menu, starting height setting, a document of a user type).
9. Covered by the note tests (the system filter labels notes "General").
10. Pass: the library lists General last, its own types under "Any game".
