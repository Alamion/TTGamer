# Design: Brief block as its own template element

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-18

## Approach

Today every shipped brief is a page of top-level groups with `layout: 'area'` (22 shipped templates
checked: all 11 briefs are only area groups at the top, all 11 full sheets only sections; no area
group is nested). The change adds a page kind to the template, a `brief` node type, and makes the
field look follow the page. One pure upgrade function turns a schema-3 template into schema 4; it
runs inside the template schema, so every parse site (stores, template/type/library files, the
clipboard, cloud items) reads old data, and the template store reports what it converted once.
Editor conversions (switching a page's kind, pasting across kinds) reuse one conversion module.

Delivery order: US1 + US2 (schema 4, renderer, shipped briefs, page kind in the editor) → US4
(upgrade of stored data and files, notices, heights) → US3 (paste and kind switch conversions) →
guides and the composition test.

## Decisions

- **D1 — Page kind on the template**: `CustomTemplate.pageKind?: 'brief'` (absent = full page).
  _Why_: one optional key, full pages unchanged on disk. _Rejected_: deriving it from the view id
  (`*-brief`), which is what `briefViewOf` does today and what users' own pages cannot follow.
- **D2 — A new node type `brief`**:
  `{ id, type: 'brief', title, labelMessage?, hideTitle?, docsPath?, columns?, columnWidths?, collapsible, defaultCollapsed?, visibleWhen?, children }`;
  children are any node but `section`, `group`, and `brief` (schema refinement, like the depth
  rule). It renders exactly as an area group does today (`SectionCard dense` + area `ChildrenGrid`
    - `BriefGroupContext`), so heights do not move. _Why_: the spec asks for its own element; a type
      of its own lets the editor's element table (`ELEMENT_EDITORS`, which must list every type) and
      the schema enforce the rule. _Rejected_: a third kind of `group` (`kind: 'brief'`) — every
      group reader would need to tell three kinds apart, and the old flag would live on.
- **D3 — Field look follows the page (FR-012)**: the renderer publishes the page kind
  (`PageKindContext`, set by `DeclarativeSheetView` from the template); every reader of `compact`
  (`DeclarativeSheetView`, `fieldControls`, `primitives`, `RowsBody`, `trackerModel`) reads
  `useBriefPage()` instead. Ratings (`rating` fields, trait and resource primitives) show their
  short label on a brief unless `fullLabel: true`; `shortLabel` stays. `compact` and `shortForm`
  leave the schema; a track primitive's own `tracker.display` still wins over the brief's `line`.
  _Rejected_: keeping per-field flags (the conversion would have to rewrite them, and a card turned
  into a block would look wrong until the author fixed every field).
- **D4 — One upgrade, in the schema**: `upgradeTemplate(raw, shippedKind)` in
  `types/templateUpgrade.ts` runs as a `z.preprocess` of `CustomTemplateSchema` when
  `schemaVersion < 4`, and sets 4. Kind: an edited shipped page takes the shipped page's kind
  (`shippedKind(systemId, id)`, a parameter; `types/` never imports the registry, so the schema
  preprocess reads a lookup that `systems/index.ts` registers on load with `setShippedKindLookup`,
  and where none is registered — Node scripts — the user-page rule applies); a user's own page is a
  brief only when every top-level container is an area group. Then a brief's area groups and cards
  become `brief` nodes, a section becomes one block per card plus one block (the section's title)
  for its loose fields, nested containers inside a block are flattened into it; a full page's area
  groups become plain groups. Ratings on a brief without `shortForm: true` get `fullLabel: true`;
  `compact`/`shortForm`/`layout` are dropped. It returns the template and a summary
  (`{ kind, blocks, flattened, lookDropped }`). _Why_: one place, every reader covered, testable on
  fixtures. _Rejected_: converting only in the template store — files, the clipboard, and library
  imports would still meet schema-3 pages.
- **D5 — Telling the author once**: template store v6 runs the upgrade explicitly in its migration
  and keeps `conversions: { templateId, name, kind, summary }[]` (persisted, at most 50); the sheet
  page shows one toast listing up to five names and the number of others, then clears the list.
  Template and library file imports add the summaries to their existing import report. Only pages
  whose conversion changed more than "area groups → blocks on a brief" are listed (a shipped-style
  brief converts silently).
- **D6 — Conversions in the editor**: `model/pageKind.ts` exports `toBriefNodes(nodes)` and
  `toFullNodes(nodes, title)` (same rules as D4 for live nodes; a brief's blocks become cards inside
  one section named after the page, loose top-level fields join it). Switching the page kind in the
  page settings (`EditorTemplateFields`) and pasting copied elements of the other kind call them;
  each is one undo step and announces what was converted. Drags happen within one page, so they only
  need the nesting rule: `resolveMoveTarget` refuses a block inside a block and a section or card on
  a brief; a pasted block landing inside a block is flattened into its place (spec edge case).
  Copies taken before the update parse as schema 4: their `layout`/`compact` keys are stripped,
  which is harmless because the look follows the page and the paste converts the containers.
- **D7 — New pages and the add menu**: a new draft is a full page as today; switching it to a brief
  while it holds only the starter section turns that section into one block with the starter field
  (US2; switching a page with content converts it through D6, US3). The `+` menu's group entry
  builds a `brief` node on a brief page (anywhere a block may stand) and a section/card on a full
  page; `KindChoice` offers section/card only on full pages; the group look setting "brief look" is
  removed.
- **D8 — Which brief opens beside another**: `briefViewOf` picks the first view whose shipped
  template has `pageKind: 'brief'`; a user setting's own page is used as today. _Rejected_: id
  suffixes.
- **D9 — Template file version 4**: `TEMPLATE_FILE_VERSION` 3 → 4; files of version 3 are accepted
  and upgraded through D4, version 2 and below stay refused, newer refused. Library and type files
  keep their versions (their templates carry `schemaVersion`).
- **D10 — Composition test (FR-013)**: `tests/sheet_manager/page-composition.test.ts` walks every
  shipped page: briefs hold only `brief` nodes and fields; full pages hold sections of at least five
  fields made of cards of at least three, no loose field in a section. Named exceptions: the shared
  portrait card; any shipped full sheet that breaks the rule today is listed by id with a backlog
  entry (measured in the first task, not reworked here).

## Changed types and data

- `types/template.ts`: `TEMPLATE_SCHEMA_VERSION` 3 → 4; `pageKind`; `BriefNode` and its schema in
  `templateNodeSchema`; refinement "no container in a brief"; `walkTemplateNodes`,
  `isContainerNode`, `collectTreeIssues` know `brief`; `layout` leaves `GroupNode`; `compact` and
  `shortForm` leave fields and primitives; `fullLabel` added to ratings and primitives.
- `types/templateUpgrade.ts` (new): D4. `templates/builders.ts`: `dense()`/`denseBrief()` build
  `brief` nodes and set `pageKind`; the `compact`/`shortForm` builder options go.
- Shipped templates (Star Wars, WoD 2e, V5): rebuilt through the builders; zod-baseline fixtures
  regenerated (shape change, same content).
- `store/templateStore.ts`: version 6, `conversions`. Overrides keep their keys.
- `shell/templateFile.ts`: version 4 (D9). Clipboard format unchanged (`COPIED_ELEMENTS_VERSION`
  stays 1; old copies are upgraded by the schema's preprocess like any template).
- Translations (`templates.yaml`): element and kind names "Brief block", page kind setting and its
  options, `fullLabel` setting, conversion announcements, the toast. The `layout`, `compact`,
  `shortForm` setting strings go.
- Docs: `docs/guide/template-editor/*.mdx` + ru (page kinds, brief block, conversions); module notes
  (`src/sheet_manager/AGENTS.md` "Brief look") and the `sheet-templates` skill (node tree, the
  composition rule naming the brief block).

## Principles at risk

- II (explicit contracts, persisted data): stored templates change shape. Kept by the versioned
  upgrade inside the schema, fixtures of every stored shape, quarantine for what cannot be read.
- V (risk-proportional tests): schema and store edits run `yarn verify`; shipped pages and look
  changes run `yarn verify:full` with the brief layout tests.
- VI (consistent experience): briefs must not move. Heights of every shipped brief at 320, 375, 640,
  and 1280 px are measured before the change and pinned (`brief-baseline.ts` gains brief heights).
  Two known look changes are accepted and named here: the vehicle brief's crew references take the
  compact reference look (spec 040), and the vampire full sheet's Blood Potency effects lose their
  small text (full pages draw full size); their pins are remeasured.
- VII (performance): the upgrade is linear in nodes and runs once per stored template; no change on
  render paths beyond a context read.

## Tests

- `template-upgrade.test.ts` (new): fixtures of each stored shape (shipped brief, edited override
  with a boxed card and a section, user page of all area groups, mixed user page, full page with
  compact formulas) → kind, node types, no field lost, titles/columns/fold/help kept, summary.
- `template-store-migration.test.ts`: v5 → v6 with conversions recorded once; unreadable →
  quarantine.
- `template-file.test.ts`: version 3 accepted and upgraded with a report; 2 and 5 refused.
- `page-kind-conversions.test.ts` (new): `toBriefNodes`/`toFullNodes` round trips, reading order,
  section with loose fields, nested cards flattened.
- `editor-clipboard.test.ts` / `editor-clipboard-ui.test.tsx`: card pasted on a brief becomes a
  block and the announcement says so; block on a full page becomes a card; one undo step.
- `editor-add-menu.test.tsx` (new or extended): every insertion point on a brief offers the block
  and no section/card; on a full page the reverse (SC-004).
- `page-composition.test.ts` (new): D10.
- `shipped-parity.test.tsx`, `storybook.test.tsx`: the brief node is settable and has a story.
- `brief-short-render.test.tsx`, `area-group.test.tsx`: look follows the page; `fullLabel`.
- `tests-e2e/smoke/brief-layout.spec.ts`: pinned brief heights within 1% (SC-001); beside opens the
  brief by page kind (`panes.spec.ts`).

## Manual walk

1. Open each shipped brief (Star Wars character, V5 vampire, Storyteller) → looks as before.
2. Editor: open the vampire brief → page settings say Brief; `+` offers Brief block, no section.
3. Copy the Attributes card of the vampire full sheet, paste into a user brief → a block with
   short-label ratings and a message.
4. Switch a user full page to Brief → cards become blocks, Undo restores it.
5. Load a library file exported before the change → import report lists the converted pages.
6. Reload with an edited shipped brief stored before the change → one toast names it; it still shows
   as an edit of the shipped brief.
7. New page → switch to Brief → add two blocks (Attributes, Skills) with three ratings each → done
   in under two minutes on the first try (SC-003).
