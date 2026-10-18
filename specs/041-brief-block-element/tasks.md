# Tasks: Brief block as its own template element

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order (design "Approach"): Foundation (schema 4 and the upgrade, which every story reads),
US1, US2, US4, US3, Finish. US4 comes before US3 because the stored-data upgrade must ship with the
schema change, while paste conversions only add editor convenience.

## Foundation

- [ ] T001 Measure before changing anything: heights of every shipped brief at 320, 375, 640, and
      1280 px on the built site, and which shipped full sheets break the composition rule (sections
      ≥ 5 fields, cards ≥ 3, no loose field in a section); record both in design.md "Implementation
      notes" and add the brief heights to `tests-e2e/smoke/brief-baseline.ts` (`brief` pins)
- [ ] T002 Write `tests/sheet_manager/template-upgrade.test.ts` first: fixtures of a shipped brief,
      an edited override holding a boxed card and a section, a user page of only area groups, a
      mixed user page, a full page with compact formulas, and a schema-4 page (untouched) → kind,
      node types, every field kept in reading order, titles/columns/fold/help kept, `fullLabel` on
      brief ratings without `shortForm`, summary contents (design D4)
- [ ] T003 Schema 4 in `src/sheet_manager/types/template.ts`: `TEMPLATE_SCHEMA_VERSION` 4,
      `pageKind?: 'brief'`, `BriefNode` + schema in `templateNodeSchema`, refinement "a brief holds
      no section, group, or brief", `walkTemplateNodes`/`isContainerNode`/`collectTreeIssues` know
      `brief`; drop `layout` from groups and `compact`/`shortForm` from fields and primitives; add
      `fullLabel` to ratings and primitives
- [ ] T004 `src/sheet_manager/types/templateUpgrade.ts`: `upgradeTemplate(raw, shippedKind)`
      returning `{ template, summary }` (design D4), wired as a `z.preprocess` of
      `CustomTemplateSchema` for `schemaVersion < 4`; the shipped-kind lookup is registered by
      `src/sheet_manager/systems/index.ts` through `setShippedKindLookup` (no import from `types/`
      to the registry), and without a registration the user-page rule applies; T002 passes
- [ ] T005 Builders in `src/sheet_manager/templates/builders.ts`: `dense()`/`denseAll()`/
      `denseBrief()` build `brief` nodes and set `pageKind: 'brief'`; remove the `compact`/
      `shortForm` options; add `fullLabel`; update every shipped template under
      `src/sheet_manager/systems/**/templates*` and `systems/v5/**` that passed those options
      (ratings that were not short keep `fullLabel: true`); regenerate
      `tests/sheet_manager/fixtures/zod-baseline/*.json`

## User Story 1 - Build a brief from brief blocks (P1)

**Check**: a brief of two blocks draws like today's area groups; fields follow the page's look.

- [ ] T006 [US1] Tests first: extend `tests/sheet_manager/area-group.test.tsx` and
      `brief-short-render.test.tsx` — a `brief` node draws heading, hairline, area cells; on a brief
      a plain rating shows its short label and a `fullLabel` one its name; on a full page the same
      fields draw full size; a card turned into a block needs no field edits (US1 scenario 5)
- [ ] T007 [US1] Renderer: `PageKindContext` + `useBriefPage()` in
      `src/sheet_manager/features/sheet/declarative/areaLayout.ts`, provided by
      `DeclarativeSheetView.tsx` from `template.pageKind`; render `brief` nodes as area groups
      (`SectionCard dense`, area `ChildrenGrid`, `BriefGroupContext`); replace every `compact` read
      in `DeclarativeSheetView.tsx`, `fieldControls.tsx`, `primitives.tsx`, `RowsBody.tsx`, and
      `features/sheet/data/trackerModel.ts` (a track's own `tracker.display` still wins), and
      `useShortLabel` in `shortLabels.ts`/`ShortLabelScope.tsx` reads the page kind and `fullLabel`;
      a block keeps the fold-state storage key of a group (`template-<id>-<nodeId>`), so a converted
      card's remembered state carries over (tested in T006)
- [ ] T008 [US1] Editor element: `brief` entry in
      `src/sheet_manager/features/template-editor/elements/registry.tsx` (settings: title, title
      shown, columns, collapsible, starts folded, help link, show when) built in
      `elements/containers.tsx`; remove the group "brief look" toggle and the field/primitive
      `compact`/`shortForm` settings (`panels/PrimitiveConfig.tsx`, `panels/ShortFormSettings.tsx`,
      `settings/registry.ts`, `panels/builtInTrackerSettings.ts`), add `fullLabel` for ratings on
      brief pages; strings in `translations/source/{en,ru}/ui/sheet/templates.yaml`
- [ ] T009 [US1] Nesting rule in the editor: `model/moveTargets.ts` refuses dragging a block into a
      block and a section or card into a block; a block pasted inside a block is flattened into its
      place by `model/clipboard.ts` (its fields keep their order); `issues/draftIssues.ts` names a
      broken nesting
- [ ] T010 [US1] Storybook story for the brief block in `src/sheet_manager/storybook/stories.ts`;
      `tests/sheet_manager/shipped-parity.test.tsx` and `storybook.test.tsx` pass with it (FR-009)
- [ ] T011 [US1] Run `yarn verify` (schema and renderer change) and commit the story

## User Story 2 - Every page knows whether it is a brief (P1)

**Check**: every shipped brief shows "Brief" in the editor; the add menu follows the page kind; a
document opened beside another starts in the brief found by page kind.

- [ ] T012 [US2] Tests first: `tests/sheet_manager/editor-add-menu.test.tsx` (new) — every insertion
      point (root, inside a block, inside a section and a card) offers the block and no section/card
      on a brief and the reverse on a full page (SC-004); `panes`/views test that `briefViewOf`
      picks the view whose shipped template is a brief
- [ ] T013 [US2] Page kind setting in
      `src/sheet_manager/features/template-editor/components/EditorTemplateFields.tsx`: shown on
      every page, switchable while the draft holds only its starter section (it becomes one block
      with the starter field; switching a page with content arrives in US3); the `+` menu's group
      entry builds a `brief` node on a brief page and `KindChoice.tsx` offers section/card only on
      full pages
- [ ] T014 [US2] `briefViewOf` in `src/sheet_manager/features/sheet/panes/views.ts` by page kind
      (design D8); a user setting's own page as today
- [ ] T015 [US2] Run the targeted editor and pane tests and commit the story

## User Story 4 - Existing briefs and templates keep working (P1)

**Check**: stored templates, overrides, and files from before load converted, the author is told
once, and shipped briefs keep their pinned heights.

- [ ] T016 [US4] Tests first: `tests/sheet_manager/template-store-migration.test.ts` (v5 → v6 with
      `conversions` recorded once, a shipped-style brief converts silently, an unreadable entry goes
      to quarantine) and `template-file.test.ts` (version 3 accepted and reported, 2 and 5 refused,
      a version 4 export imports back unchanged)
- [ ] T017 [US4] `src/sheet_manager/store/templateStore.ts` version 6: the migration calls
      `upgradeTemplate` explicitly with the registry lookup, keeps `conversions` (≤ 50), and offers
      `takeConversions()`; the sheet page shows one toast (up to five names and the count of others)
      in `features/sheet/shell/SheetWorkspace.tsx`; strings in `templates.yaml`
- [ ] T018 [US4] `features/sheet/shell/templateFile.ts` version 4 (D9); template and library file
      imports (`templateFile.ts`, `libraryFile.ts`, `typeFile.ts`) add the conversion summaries to
      their import reports
- [ ] T019 [US4] Heights: `tests-e2e/smoke/brief-layout.spec.ts` checks every shipped brief within
      1% of the T001 pins at 375 and 1280 px (vehicle brief pinned anew, SC-001); remeasure the full
      sheets whose look changed (vampire Blood Potency effects) and record why in design.md
- [ ] T020 [US4] Run `yarn verify:full` (persisted shape, look of shipped pages) and commit the
      story

## User Story 3 - Moving content between full pages and briefs (P2)

**Check**: a card pasted on a brief becomes a block and a block on a full page a card; switching a
page's kind converts it; each is one undo step with an announcement.

- [ ] T021 [US3] Tests first: `tests/sheet_manager/page-kind-conversions.test.ts` (new) —
      `toBriefNodes`/`toFullNodes` round trips, reading order, a section with loose fields, nested
      cards flattened into their block; `editor-clipboard.test.ts` and
      `editor-clipboard-ui.test.tsx` for paste across kinds, the announcement, one undo step
- [ ] T022 [US3] `src/sheet_manager/features/template-editor/model/pageKind.ts`: `toBriefNodes`,
      `toFullNodes(nodes, title)` (design D6), reusing the rules of `templateUpgrade.ts`
- [ ] T023 [US3] Paste across kinds in `model/clipboard.ts` (`pasteCopied`) and switching the kind
      in `EditorTemplateFields.tsx` through an operation in `operations/switches.ts` (one undo step,
      announcement strings in `templates.yaml`); a new full draft switched to a brief keeps its
      starter field in one block
- [ ] T024 [US3] Run `yarn verify` and commit the story

## Finish

- [ ] T025 Composition test `tests/sheet_manager/page-composition.test.ts` (FR-013, design D10) with
      the portrait card and the T001 list as named exceptions; a backlog entry in `TODO.md` for the
      shipped full sheets that break the rule
- [ ] T026 Guidance: `src/sheet_manager/AGENTS.md` "Brief look" (page kind, brief node, look follows
      the page, no `layout`/`compact`/`shortForm`); `.agents/skills/sheet-templates/SKILL.md`
      (terminology, the composition rule naming the brief block as a brief's only container, FR-011)
      and `references/node-tree.md`, `references/editor.md`; user guide
      `docs/guide/template-editor/*.mdx` + ru mirror (page kinds, the brief block, conversions,
      FR-010); `TODO.md` T-125 marked done
- [ ] T027 Run `yarn verify:full`; measure the sheet page's bundle growth against the 10 KB gzip
      budget; walk the steps in design.md "Manual walk"; record results in design.md

## Coverage

| Requirement | Tasks                                                            |
| ----------- | ---------------------------------------------------------------- |
| FR-001      | T003, T013                                                       |
| FR-002      | T003, T007, T008                                                 |
| FR-003      | T008, T012, T013                                                 |
| FR-004      | T003, T009                                                       |
| FR-005      | T009, T021–T023                                                  |
| FR-006      | T005                                                             |
| FR-007      | T002, T004, T016–T018                                            |
| FR-008      | T012, T014                                                       |
| FR-009      | T010                                                             |
| FR-010      | T026                                                             |
| FR-011      | T026                                                             |
| FR-012      | T003, T006, T007, T008                                           |
| FR-013      | T001, T025                                                       |
| SC-001      | T001, T019                                                       |
| SC-002      | T002, T016                                                       |
| SC-003      | T027 (manual walk: a two-block brief from an empty brief, timed) |
| SC-004      | T012                                                             |
