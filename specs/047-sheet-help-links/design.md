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
