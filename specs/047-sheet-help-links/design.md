# Design: Sheet help that explains

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-29

## Approach

Help on a sheet is the "?" mark of spec 045 (`DocsPreviewLink` in
`shared/components/DocsFragmentCard.tsx`): a Radix Popover in `modalRoot()` showing a docs page's
part by anchor, in the reader's language. Today it sits only on sections, groups, and brief blocks
(`docsPath` on those nodes), drawn inside the fold button of `SectionCard` and `CollapsibleBlock`.
This feature keeps the card and changes where marks are and where they lead:

1. **Review first** (FR-009): a table of every place on every shipped page, filled from the
   newcomer's point of view, agreed with the maintainer before any page changes.
2. **Mechanism**: the "?" moves out of the fold button (F-011); fields gain their own `docsPath` and
   `hideHelp`; element types gain a how-to-use help path; the editor gets both settings.
3. **Docs**: the targets the review marks "write", in English and Russian.
4. **Links**: shipped templates and the element help map follow the agreed table.

Delivery order: Foundation (the review and its approval), US4 (mechanism, so later stories have the
field and element marks), US3 (docs, so the links have targets), US1 (section, group, and field
links), US2 (element help map), Finish. US1 and US2 depend on the approved table; nothing in
templates changes before it.

## Decisions

- **D1 — The review is done by system, in parallel, then merged by hand**: one subagent per system
  (Star Wars: character, droid, creature, vehicle, fodder; WoD 2e; V5 core, Storyteller, group;
  Hunter and Vampire; General note and the field types) reads the inventory (every shipped
  template's sections, groups, and fields with today's links), the template source, its
  translations, and the docs tree, and drafts rows as a newcomer. Then the rows are merged into
  `review.md`, checked against the docs, and deduplicated. _Why_: 23 pages and ~1,200 nodes are too
  many for one pass; the systems are independent. _Rejected_: one sequential pass (days of context);
  fully automatic rules ("every section gets a link") — the point is judgement.
- **D2 — `review.md` is the record; a published page collects the marks**: the table is grouped by
  document and page; each row has an id (`<template>/<node>` or `type:<fieldType>`). The page is an
  Artifact built from the file, with the `db` capability storing one mark per row (`agree` or
  `change` with a comment); the marks are read back with `ArtifactData` and written into
  `review.md`. _Why_: the maintainer's answer (both); hundreds of rows read better on a page, the
  decision stays in the repository.
- **D3 — The "?" sits beside the fold button, not in it** (F-011): `SectionCard` and
  `CollapsibleBlock` draw the header as a row: the fold `button` (title and chevron) and, after the
  title, the `DocsPreviewLink` as a sibling. The button keeps its label ("Toggle <title>"); the link
  keeps "Documentation for <title>". A click on the link does not reach the button. _Rejected_:
  `stopPropagation` inside the button (the cause of F-011: interactive content inside a button is
  hidden from the accessibility tree).
- **D4 — A field's help is one mark beside its label**: `docsPath?: string` and `hideHelp?: true` on
  every field node (`fieldBaseShape` in `types/template.ts`) **and on `PrimitiveNodeSchema`**: the
  rules terms (Hunger, Desperation, Blood Potency, Humanity, Danger) are document-bound primitives,
  not fields. The mark goes after the existing term hint (`TermLabel`, spec 009), which keeps
  working. Its accessible name is "Documentation for <label>", or the binding key's name when the
  label is hidden (`hideLabel`). The field's cell (where `templateFieldControl` is chosen) resolves
  the field's help: its own `docsPath`, else its type's help (D5) unless `hideHelp`. It passes the
  help to the control through `FieldHelpContext`, and a shared `FieldHelpMark` (a `DocsPreviewLink`
  named after the field's label) is drawn by each control beside its label. Every control and the
  bound primitives with a label gain the mark. _Why_: one resolution point; controls only draw.
  _Rejected_: a wrapper drawing "?" outside the control (it cannot sit beside a label that the
  control lays out); a per-control resolution (twelve copies).
- **D5 — Element help is a map from how an element draws to a guide part**: `ELEMENT_HELP` in
  `features/sheet/declarative/elementHelp.ts` (`markdown → /docs/guide/notes#syntax`, and the rest
  as the review decides), read through `elementHelpFor(node)`, which looks at the field type and,
  for a bound primitive, at the control it draws as (shipped trackers are primitives drawn as
  trackers; no shipped field has type `tracker`). Element help shows on full pages only; a brief
  shows a node's own `docsPath` and nothing else. Code, not template data: the user's pages get it
  with no stored change (spec assumption), and the map is the one owner. The help never leads to a
  rules page (FR-005).
- **Amendment D5 — Maintainer review, round 2**: automatic element help is limited to Markdown
  (`/docs/guide/template-editor/elements#markdown`) and mentions (`#mentions`), only when the field
  appears on a full page, including user pages. Other control explanations belong in the template
  editor: repeating them across a sheet adds clutter and competes with the section's rules help.
  `elementHelpFor(node)` no longer inspects bindings or control presentations. Explicit `docsPath`
  and `hideHelp` keep D4's precedence. A shipped descendant cannot repeat an ancestor's link; a
  linked section/group's sole content cannot carry a separate explicit link to a broader page.
- **D6 — Editor settings**: `docsPath` widens from containers to fields in the settings registry
  (`features/template-editor/settings/registry.ts`), and `hideHelp` is a new toggle shown for field
  types that have element help. `tests/sheet_manager/shipped-parity.test.tsx` keeps both honest.
- **D7 — Checks**: `tests/docs/docs-links-anchors.test.ts` widens to field `docsPath` and
  `ELEMENT_HELP` targets (route exists, same explicit anchor in en and ru). A new
  `tests/docs/help-links-review.test.ts` fails when a shipped section and a group or field inside it
  link the same place (FR-010), and when a shipped template's links differ from the approved
  `review.md` (SC-001), so the table and the pages cannot drift.
- **D8 — Docs**: new or rewritten parts open with a plain definition of the thing (FR-007), carry an
  explicit `\{#id}` anchor in both languages (spec 045, D3), and paraphrase rules (constitution
  VIII). How-to-use parts go into the site guide (`docs/guide/`), never into rules pages
  (`AGENTS.md` §6: the app's help links to the guide).

## Changed types and data

- `types/template.ts`: `docsPath?: string` and `hideHelp?: boolean` on field nodes, with schema
  entries (`z.string().max(500)`, `z.boolean()`); both optional: stored templates parse unchanged,
  no template schema or store version change.
- `features/sheet/declarative/elementHelp.ts` (new):
  `ELEMENT_HELP: Partial<Record<TemplateFieldType, string>>`; `FieldHelpContext` and `FieldHelpMark`
  beside the controls.
- Translations (`ui/sheet/templates.yaml` editor, en + ru): "Hide help" and its hint; the field
  docs-link label reuses `editor.docsLink`.
- Shipped templates in `systems/*/templates/` and `systems/*/ruleset/templateParts.ts`: links per
  the approved review.
- Docs: new and rewritten parts in `docs/` and `i18n/ru/docusaurus-plugin-content-docs/current/`.
- `specs/047-sheet-help-links/review.md`: the agreed table.

## Principles at risk

- VI (accessible, one product): the "?" becomes a real link outside the button (D3); every mark is
  the same component with the same name pattern.
- VII (performance): element help adds a mark to many fields. `DocsPreviewLink` mounts a Popover
  root and a trigger only; the content loads on open. The sheet timing
  (`tests-e2e/timings/sheet.spec.ts`) is rerun against `master` in the same run, and the main and
  sheet chunks are measured before and after (SC-005; spec 045 once pulled a card into the main
  chunk). Constitution VII requires `yarn verify:full` for a shared component.
- VIII (third-party material): rules parts are paraphrased; no tables or passages copied.
- II (contracts): new template fields are optional and validated; the editor shows a setting for
  each (shipped parity).

## Tests

- `tests/shared/docs-fragment.test.tsx` / `tests/sheet_manager/section-help.test.tsx`: the section
  "?" is a link outside the fold button, named "Documentation for <title>"; clicking it opens the
  card and does not fold; the header still folds by click and Enter (FR-008).
- `tests/sheet_manager/field-help.test.tsx`: a field with `docsPath` shows its mark; a markdown
  field shows the element help; `hideHelp` removes the element help but not the field's own link;
  every control in `declarativeFieldRegistry` draws the mark when given help (FR-004, FR-011).
- `tests/sheet_manager/shipped-parity.test.tsx`: field `docsPath` and `hideHelp` have editor
  settings.
- `tests/docs/docs-links-anchors.test.ts`: field and element help targets exist in en and ru.
- `tests/docs/help-links-review.test.ts`: no section/group/field duplicates; shipped links match
  `review.md`.
- E2E `tests-e2e/smoke/docs-fragment.spec.ts`: the section "?" is found by role `link` (the F-011
  workaround locator goes away); a markdown field's "?" opens the notes guide card.

## Manual walk

1. One full page per system (Star Wars character, WoD 2e, V5 core, Hunter, Vampire): every section,
   field, and bound element the review marked has "?"; each card starts by saying what the thing is
   → as in the review's "first sentence" column.
2. Star Wars "Experience and notes": one "?" only.
3. A note: the markdown field's "?" opens "What a note understands".
4. Screen reader (or the accessibility tree): each "?" is a link outside the fold button; folding by
   click and Enter still works.
5. Template editor: a field's docs link and "Hide help" settings; hide help on a markdown field →
   its "?" is gone.
6. Russian site: the same cards in Russian.
7. Phone width: marks fit beside labels; the card opens and scrolls.

## Implementation notes

### US4 (T006–T013), 2026-11-04

- Section, card, and dense-card help uses the existing `DocsPreviewLink` beside the fold button. The
  fold button retains its own accessible name and native keyboard activation. The browser test
  scopes the button to the sheet because the documentation card can contain an embedded sheet with
  the same button name. Dense headings apply their padding and border once, on the header row; all
  existing brief-height pins remain unchanged.
- Field and primitive help is resolved by `FieldHelpProvider` into `FieldHelpContext`, with
  `FieldHelpMark` passed through existing label slots. `LabeledField` already owns the labels for
  ordinary controls, including Markdown and Mentions, so their marks are drawn there rather than
  duplicating labels inside those controls. Ratings, trackers, and labelled bound values use their
  own label slots. Table columns place their mark in the header; list entries use their own help
  context. Hidden labels retain their previous layout when there is no mark.
- `elementHelpFor` accepts the resolved binding when a primitive's actual control depends on its
  descriptor (for example a rating resource versus a pool). `ELEMENT_HELP` contains only Markdown
  for US4. Full pages use its default unless `hideHelp`; briefs use only explicit `docsPath`.
  Explicit paths take precedence even with `hideHelp`. No shipped template links or documentation
  content changed. The editor exposes both optional properties through the existing settings
  registry and English/Russian YAML sources.

**Verification:** tests were written before implementation. Targeted section, field/control,
primitive, editor settings/parity, storybook, and anchor checks passed. The final implementation's
`yarn verify:full` passed in `/tmp/ttgamer047-candidate`: lint, typecheck, all validators, dead
code, 335 unit files / 3,364 tests, 13 performance files / 20 tests, both locale production builds,
and 72 browser tests. No tests were skipped or relaxed. Two nonblocking browser pane timings
reported 231 ms to open a second document (200 ms budget) and 203 ms to move a tab (200 ms budget).

The working-tree `yarn verify:full` stops at Prettier on the pre-existing uncommitted `AGENTS.md`
edit. As the brief forbids changing it or `.claude/`, verification used an isolated archive of HEAD
with this story's files overlaid and the committed versions of those protected files. The complete
verification command was unchanged. No dev server was started on port 3000; browser checks used and
released their own port 3100. The story remains uncommitted as required by the brief.

**SC-005:** master `4a0a8cb6e8f913d9f84308339772f0b9266768a3` was built in `/tmp/ttgamer047-master`.
After full verification, both production builds were measured sequentially on the same machine in
one paired run with `yarn test:e2e tests-e2e/timings/sheet.spec.ts --project=timings` (master, then
US4). Each measurement uses the existing test's one warm-up and best of five reloads. Sheet opening
was **110.2 ms → 118.2 ms (+7.26%)**, within the 10% limit (121.22 ms). Downloaded JS/CSS was
3,700,950 → 3,707,050 bytes (+6,100 uncompressed bytes).

English production JavaScript sizes, compressed with gzip level 9 and `mtime=0`:

| Chunk                           | master gzip bytes | US4 gzip bytes | Change |
| ------------------------------- | ----------------: | -------------: | -----: |
| Main (`main.*.js`)              |           289,598 |        289,717 |   +119 |
| Shared renderer (`common.*.js`) |           386,867 |        388,072 | +1,205 |
| Sheet route (`1c7e39ea.*.js`)   |           104,832 |        105,026 |   +194 |

Main-chunk growth is **119 bytes**, below 2 KB; the three measured chunks together grew by 1,518
gzip bytes. Both SC-005 limits pass.

**SC-005 re-measured at HEAD (US1 and US2 included):** the raw JS and CSS the sheet downloads grew
3,700,950 → 4,059,210 bytes, but only because the larger docs tree (191 pages against 171) moved
Docusaurus's `common` chunk threshold, so modules shuffled between `common` and the sheet-route
chunk; no help-link code moved into the first load. The gzip level 9 total of the chunks loaded on
open is 826,278 (master) → 820,355 bytes, and the main chunk grew 288,644 → 289,985 (+1,341, below 2
KB). Sheet opening, best of five interleaved paired runs: master 107–113 ms, HEAD 112–127 ms (median
111 → 116 ms, +4.5 %), within the 10 % limit. The sheet now draws about 74 help marks (DOM nodes
1,777 → 2,251); `DocsPreviewLink` mounts its popover only while open instead of one Radix popover
root per mark.
