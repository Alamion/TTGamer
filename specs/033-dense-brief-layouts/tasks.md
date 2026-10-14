# Tasks: Denser Brief Layouts

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order follows design.md "Approach": Foundation (schema, the named area container, the group
layout), then US1 (short labels and the cell/pill looks), US3 (fit to the area, measured), US2 (one
rhythm for the other compact forms), US4 (editor, storybook, guide). Paths are under
`src/sheet_manager/` unless they start with `src/shared/`, `src/css/`, `scripts/`, `translations/`,
`tests/`, `tests-e2e/`, or `docs/`.

## Foundation - Schema, area container, group layout

**Check**: saved pages and full sheets parse and draw as before; a group with `layout: 'area'` draws
three columns from the container width.

- [x] T001a Before any code change, record the baseline in `tests-e2e/smoke/brief-layout.spec.ts`:
      the height of every shipped brief (Star Wars character and droid, creature, vehicle, fodder,
      V5 core, Hunter) and of the full sheets at 375 and 1280 px, as constants in
      `tests-e2e/smoke/brief-baseline.ts`; commit with the story's first commit
- [x] T001 Extend `tests/sheet_manager/template-schema.test.ts`: a rating field without the new keys
      parses with `shortForm: false` and no `shortLabel`; a group without `layout` parses to
      `'window'`; `shortLabel` over 4 characters is rejected; a saved template parses to the same
      tree
- [x] T002 Add `shortForm` (boolean, default false) and `shortLabel` (1–4 chars) to the field shape
      and `layout` (`'window' | 'area'`, default `'window'`) to the group shape in
      `types/template.ts`; leave `TEMPLATE_SCHEMA_VERSION` at 3; carry the keys in the builders
      (`templates/builders.ts`: `field` options and `group` options) and the editor factories
      (`features/template-editor/model/factories.ts`)
- [x] T003 Wrap the sheet view root in a named size container (`@container/brief`, inline-size) in
      `features/sheet/declarative/DeclarativeSheetView.tsx`; check nothing there depends on the
      root's width from its content
- [x] T004 Write `tests/sheet_manager/area-group.test.tsx`: a group with `layout: 'area'` carries
      the container-variant column classes (three columns, one below 260 px) and a `window` group
      keeps `columnClasses` exactly; a full sheet render snapshot of class names is unchanged; the
      full sheet heights from T001a stay within 1% in the e2e spec (SC-007, FR-012)
- [x] T005 Implement the `area` layout in `DeclarativeSheetView.tsx` (the `columns` branch near
      `columnClasses`): `@max-[259px]/brief:grid-cols-1`, column stacks as a multi-column list in
      narrow areas (`[column-width:5.25rem]`) and wrapping flex from `@md/brief` (design D1, D3)
- [x] T006 Run `yarn verify` (schema edit) and commit:
      `feat(sheet): area container and area group layout (spec 033, Foundation)`

## User Story 1 - Read a character brief on a phone at a glance (P1)

**Check**: the Star Wars character brief at 375 px shows three-letter labels with values, grouped,
and every short label has its full name as accessible name and hint, in en and ru.

- [x] T007 [US1] Write `tests/sheet_manager/short-labels.test.ts` for `shortLabelsFor`: order (node
      `shortLabel`, glossary abbreviation by locale, first three letters uppercased), labels under
      three letters kept whole, Cyrillic derived from the Russian label, a clash gives the later
      node its full label
- [x] T008 [US1] Add `abbr` and `ruAbbr` to every rated term in `translations/glossary/wod2e.yaml`,
      `star-wars-wod.yaml`, `v5.yaml`, `v5-hunter.yaml` (attributes, abilities, virtues, Hunter
      attributes and skills; Strength is МОЩ, not СИЛ), document the keys in each file's header,
      carry them through `scripts/translation-build.ts` and `scripts/translation-source.ts` into the
      generated `BookTerm`
- [x] T009 [US1] Add the verifier rule in `scripts/i18n-verifier/rules/glossary.ts` (new
      `abbreviation` check): a term with a rating ref lacks `abbr` or `ruAbbr`, or one is outside
      2–4 characters; extend the verifier test file for it
- [x] T010 [US1] Create `features/sheet/declarative/shortLabels.ts`:
      `shortLabelFor(node, label, locale)` and `shortLabelsFor(nodes, locale)`; a
      `ShortLabelContext` the area group provides per group (memoized on the nodes and locale)
- [x] T011 [US1] Write `tests/sheet_manager/brief-short-labels.test.tsx`: for every shipped brief
      (Star Wars character, droid, creature, vehicle, fodder, V5 core, Hunter) in en and ru, no
      short-label clash per group, each short control has the full name as accessible name and a
      hint (SC-004), the value input is present, `shortForm` ratings keep `NumberInput` labels
      (FR-005)
- [x] T012 [US1] Rework `CompactRating` in `components/stat-fields/CompactSheetFields.tsx`: a
      `shortLabel` prop; cell look (label, value, 24 px row, hover tint) in narrow areas and pill
      look (label and value chip, 26 px) from `@md/brief`; full name stays in `aria-label`, `title`
      and the `TermLabel` hint; touch hit area ≥32 px through an extended pseudo-element under
      `@media (pointer: coarse)` (D4, D7, D8); pass the label from `primitives.tsx` (rating branch
      near `traitRowKind`)
- [x] T013 [US1] Turn on `shortForm: true` and `layout: 'area'` in the shipped briefs: Star Wars
      `systems/star-wars-wod/templates/character.ts` (`briefSheet`, also droid), `creature.ts`,
      `vehicle.ts`, `fodder.ts`, V5 core `systems/v5/core/templates.ts`, and Hunter
      `systems/v5/modules/hunter/templates/brief.ts` (both through `compactTraitsGroup` in
      `systems/v5/ruleset/templateParts.ts`); ratings that are not glossary terms (creature pools,
      vehicle stats) keep the full label unless the node sets `shortLabel`; keep headings and groups
- [x] T014 [US1] Run `yarn verify` (translations and glossary edits) and commit:
      `feat(sheet): three-letter labels and cell/pill looks in briefs (spec 033, US1)`

## User Story 3 - A brief fits the area it is drawn in (P3)

**Check**: the same brief at 320, 375, 640, and 1280 px areas inside a larger window.

- [x] T015 [US3] Extend `tests-e2e/smoke/brief-layout.spec.ts`: draw the Star Wars character brief
      in areas of 320, 375, 640, 1280 px inside a 1280 px window; assert ≤700 px at 375, ≤400 px at
      640, not taller at 1280 than at 640, no horizontal scroll and no clipped value at any width
      (SC-001 – SC-003), for the other shipped briefs at least 50% shorter than the baseline from
      T001a at 375 px (SC-001); full sheet heights at 375 and 1280 within 1% of that baseline
      (SC-007); a test hook mounts a brief in a fixed-width wrapper
- [x] T016 [US3] Tune the narrow/wide thresholds and gaps until T015 passes on the dev server in
      light and dark and on a phone viewport; record the final numbers in `design.md`
      "Implementation notes"
- [x] T017 [US3] Run `yarn verify:full` (shared sheet styles) and commit:
      `test(sheet): brief fits its area at four widths (spec 033, US3)`

## User Story 2 - Every element kind tightens the same way (P2)

**Check**: a brief with a resource, a track, a text field, and a list in compact form is shorter
than today with no value, label, or control lost.

- [x] T018 [US2] Write `tests/sheet_manager/compact-elements.test.tsx`: compact resource shows
      `short label current / max` with both inputs named `label: current` and `label: maximum`;
      compact text field, condition track, tracker, list, and banner keep their value, label, and
      edit control; read-only, hidden-by-condition, and empty forms take no more room than filled
      ones (FR-004, FR-005); a collapsible section keeps heading, `aria-expanded`, and keyboard
      behavior
- [x] T019 [US2] Create `features/sheet/declarative/briefRhythm.ts` (class constants: cell gap,
      group gap, heading, label style) and apply them in `CompactResource` (one chip),
      `CompactTextField`, `CompactConditionTrack` (box size and gaps), the compact tracker
      (`features/sheet/declarative/BuiltInTracker.tsx`, `features/sheet/data/trackerModel.ts`), list
      and table rows, section headings and the helper banner
      (`features/sheet/declarative/RowsBody.tsx`, section/group headings in
      `DeclarativeSheetView.tsx`)
- [x] T020 [US2] Re-check every shipped brief (T015 limits still hold) and light and dark colors use
      only palette tokens (SC-005): add a style test that fails on a hard-coded color in the touched
      files and computes the contrast ratio (≥4.5:1) of each text and background token pair used by
      the brief in both themes
- [x] T021 [US2] Run `yarn verify:full` and commit:
      `feat(sheet): one spacing rhythm for compact elements (spec 033, US2)`

## User Story 4 - Author a dense brief in the template editor (P4)

**Check**: in the editor, switch a rating to its short form, see the preview and the storybook,
save, and open a document on that page.

- [x] T022 [US4] Extend `tests/sheet_manager/editor-shared-settings.test.tsx` for `shortForm`
      (toggle, ratings only), `shortLabel` (text, shown while `shortForm` is on, derived value as
      placeholder, over 4 characters refused), and group `layout`; a user trait without a short
      label shows the derived one (FR-009, US4 scenario 2)
- [x] T023 [US4] Register `shortForm`, `shortLabel`, and `layout` in
      `features/template-editor/settings/registry.ts` (look group; `appliesTo` ratings and groups),
      the field panel in `features/template-editor/panels/PrimitiveConfig.tsx`, outline labels if
      needed; strings in `translations/source/en/ui/…` and `ru/ui/…` (FR-013)
- [x] T024 [US4] Show each changed element in its short and regular form, light and dark, in the
      storybook (`storybook/stories.ts`, `features/docs/ElementStorybook.tsx`), and extend
      `tests/sheet_manager/storybook.test.tsx` (FR-010)
- [x] T025 [US4] Run `yarn verify` and commit:
      `feat(template-editor): short label and area layout settings (spec 033, US4)`

## Finish

- [ ] T026 Update the module notes and skill this feature changes (one owner per rule):
      `src/sheet_manager/AGENTS.md` (briefs, area container, short labels), the `sheet-templates`
      skill (new settings, glossary abbreviations), `.agents/skills/ui-i18n` (glossary `abbr` keys)
- [ ] T027 Update the user guide: `docs/template-editor/types-and-settings.mdx` and its Russian
      mirror (short label, compact forms, area layout) (FR-011); `yarn validate:i18n`
- [ ] T028 Mark T-056 in `TODO.md` as done with the spec reference; note in T-051/T-059/T-112
      entries that briefs now fit their area
- [ ] T029 Run `yarn verify:full`; walk the steps in design.md "Manual walk" on the dev server
      (phone and desktop, light and dark); record results in design.md

## Coverage

| Requirement            | Task                                                   |
| ---------------------- | ------------------------------------------------------ |
| FR-001, FR-003         | T007, T010, T012 (four-character override: T001, T022) |
| FR-002, SC-004         | T011, T012                                             |
| FR-004, FR-005         | T018, T019                                             |
| FR-014                 | T005, T012, T015                                       |
| FR-006, SC-002, SC-003 | T004, T005, T015                                       |
| FR-007, SC-001         | T013, T015                                             |
| FR-008, SC-006         | T012 (pseudo-element), T029 (touch walk)               |
| FR-009                 | T002, T022, T023                                       |
| FR-010                 | T024                                                   |
| FR-011                 | T027                                                   |
| FR-012, SC-007         | T001, T001a, T004, T015                                |
| FR-013                 | T008, T023                                             |
| SC-005                 | T020                                                   |
| SC-008                 | T017, T021, T029 (existing timings, reported)          |
