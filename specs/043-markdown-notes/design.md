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

- `types/template.ts`: `MarkdownFieldSchema` (`type: 'markdown'`, base shape, `minRows` 4–40,
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
