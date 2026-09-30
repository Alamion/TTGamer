---
description: 'Task list for feature 016: custom list item template'
---

# Tasks: Custom list item template

**Input**: Design documents from `specs/016-list-item-template/`. These are:

- [plan.md](./plan.md) and [spec.md](./spec.md);
- [research.md](./research.md), whose decisions are cited as R1–R13;
- [data-model.md](./data-model.md);
- the contract [contracts/list-item-ui.md](./contracts/list-item-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: included. Constitution V requires tests for schema, persistence, and write-path
changes, and for user-visible sheet flows.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no unfinished dependencies).
- **[Story]**: US1–US5 from spec.md.

---

## Phase 1: Setup

- [x] T001 Mark T-077 as in progress (`[ ] 🟡`) in `TODO.md`, then run `yarn validate:backlog`.
- [x] T002 [P] Add key skeletons to `translations/source/{en,ru}/ui/sheet/templates.yaml`
      (contract "Strings"):
    - the editor strings: "Entries are named", "Entry", "Entry settings", "Suggestions need entry names", "At most 1000 entries";
    - the sheet strings: "Remove {name}", "Remove {list}, entry {n}", "{list}, entry {n}", and "{list} — name";
    - the save confirmation: its title, the per-list lines for lost values and hidden names (plurals), the note, and the confirm button.

    Reuse the existing field type names. Nested keys must not be named `message`, `description`, or `plural`. Run `yarn build:translations`.

---

## Phase 2: Foundational (blocks all stories)

- [x] T003 Extend `src/sheet_manager/types/template.ts` (R1, data-model "ListNode"):
    - add `ListItemFieldSchema`, which is `TemplateFieldSchema` minus `formula`, and the `ListItemField` type;
    - add `item` and `named` to `ListNodeSchema`;
    - add a refine: reject `item` or `named` on a list with `bindingKey`;
    - add `LIST_ITEM_TYPES`;
    - add `legacyListItem(list)`, the data-model "LEGACY_LIST_ITEM": a rating with dots, 0–5, all flags, the die, the label on the left, id `<list id>-item`, and the label = title ?? id;
    - add `listItemField(list)` and `listIsNamed(list)`.

    `collectTemplateFields` must NOT return list items.

- [x] T004 [P] Widen `TemplateListEntrySchema` in `src/sheet_manager/types/templateValues.ts`
      (R2):
    - `label` becomes 0–120 and optional;
    - `value` becomes the table cell value union or the image value;
    - add `detail?: RatingDetailSchema` and `pickLabel?: PickLabelSchema`.

    Add a pure `coerceListValue(item, value)` following the data-model coercion table (clamping to the item's range). Export `TemplateListEntry`. Old entries must still parse unchanged.

- [x] T005 Add a custom-list branch to `validateTemplatePageValues` in
      `src/sheet_manager/features/sheet/data/templateValueWrites.ts` (R3). It is keyed by
      `listValueKey` for lists without `bindingKey`, and checks:
    - the array and at most 1000 entries;
    - unique ids;
    - the label is kept only when the list is named;
    - changed entries only (compared by reference with the previous entry of the same id): `value` via `validateTemplateValue(listItemField(list), …)`, `detail` for rating items, and `pickLabel` for catalog choice items.

    It returns `{ok:false,key:'<list>[<id>]…'}` on failure.

- [x] T006 [P] Write `tests/sheet_manager/list-item-change.test.ts` (part 1):
    - the schema defaults and helpers from T003, including the refine;
    - the envelope entry parse: old entries, the new shapes, and an empty label;
    - `coerceListValue` over the whole data-model table;
    - write validation per item type: valid, invalid, and an unchanged invalid entry passing through.
- [x] T007 Move `LabeledField` out of `DeclarativeSheetView.tsx` into
      `src/sheet_manager/features/sheet/declarative/LabeledField.tsx`, adding
      `nameSlot?: ReactNode`, which replaces the `FieldLabel` at the same position, and
      `trailing?: ReactNode`, which sits at the right end of the label row, or in a header row when
      there is no label. Update the imports in `DeclarativeSheetView.tsx`.
- [x] T008 Add slots to `RatingRow` in `src/sheet_manager/components/stat-fields/RatingRow.tsx`:
    - `labelSlot?: ReactNode`, which replaces the label text in the same place and layout;
    - `trailing?: ReactNode`, the last element of the row, after the die;
    - `rollLabel?: string`, the stat name for the die, defaulting to `label`.
- [x] T009 Extend `TemplateFieldControlProps` in
      `src/sheet_manager/features/sheet/declarative/fieldControls.tsx` with `nameSlot`,
      `rollLabel`, and `removeSlot` (contract "Sheet: one entry"), and place `removeSlot` per
      control (R9, contract "Remove control placement"):
    - row-shaped controls (rating via `RatingRow.trailing`, number, toggle, single-line text, single choice, resource, reference) render it as the last element of their row;
    - block-shaped controls (multi-line text, image, multiple choice) expose it for `LabeledField.trailing`.

    Page fields pass none, so nothing changes for them.

**Checkpoint**: schemas, validation, and control slots exist. The sheet still renders lists the
old way.

---

## Phase 3: User Story 1 — Choose what one list entry is (P1) 🎯 MVP

**Goal**: an author picks the entry type and configures it. Every entry on the sheet is that
field.

**Independent Test**: a list of resources with a maximum of 10: add three entries, edit them, and
reload. The values are kept, and each shows "/ 10".

- [x] T010 [US1] Create `src/sheet_manager/features/sheet/declarative/listEntries.tsx`
      (R4, R10):
    - `CustomListView`: it reads the entries under `listValueKey`, has an add button (disabled at 1000 with the hint), respects columns, title, and frame, and memoizes the list runtime;
    - `ListEntryRow`: `memo`, one `templateFieldControl(item.type)` with the value from `coerceListValue`, `ratingDetail` from `entry.detail`, and `documentOptions`/`onOpenDocument`;
    - callbacks stable per entry id that read the current array from the document store at call time and write it with a single `setValue`;
    - a new entry stores no `value` (the control shows its own empty state; data-model "New entry");
    - an entry whose stored value is set but coerces to `undefined` shows empty and is reported once per list and render through `reportSheetIssue` with code `list-entry-unreadable` and details `{ templateId, listId, count }` (constitution III); a preview render (`previewSource`) does not report.

    Switch `ListView` in `DeclarativeSheetView.tsx` to it, and remove the old `CustomListView` from `primitives.tsx`; system lists stay as they are.

- [x] T011 [US1] Add the entry editor to `ListConfig` in
      `src/sheet_manager/components/dialogs/template-editor/ElementSettings.tsx` (R7, contract
      "Editor"). It is an "Entry" `<details>` block (open for new lists) containing:
    - a type select of `LIST_ITEM_TYPES`;
    - a `FieldEditor` for `listItemField(node)` with `itemOfList`, inside `EditorFillTargetsContext` with `[]`, and `fieldCallbacks(callbacks, item.id)`.

    Add the `itemOfList` prop to `FieldEditor` in `src/sheet_manager/components/dialogs/template-editor/FieldEditor.tsx`: it hides the value key, visibility, required, and placement, and removes `formula` from the type list.

- [x] T012 [US1] Make the draft model find list items: in
      `src/sheet_manager/components/dialogs/template-editor/draft.ts`, extend `mapFieldItems` (used
      by `updateField`, `changeFieldType`, `addOption`, `updateOption`, and the catalog and fill
      helpers) to also reach `list.item`, so update, type change, options, and catalog callbacks
      work by id. The first edit of a list
      without `item` materializes `legacyListItem(list)` into it. A newly added custom list gets a
      fresh generated item id.
- [x] T013 [US1] Check item references in
      `src/sheet_manager/features/sheet/data/templateReferences.ts`: the item's select options
      and catalog scope, the reference targets, and the rating `maxFrom`, reported with the
      list's node id. The item id counts as a used identifier (no duplicate with fields).
- [x] T014 [P] [US1] Write `tests/sheet_manager/list-items.test.tsx` (part 1). For each of the
      8 item types:
    - render a named list;
    - add an entry, edit it through the real control, and check the stored entry shape;
    - a rating in the number style, range 1–10: typing 12 is held to 10;
    - a multi-line text keeps its lines;
    - a select keeps its own pick per entry;
    - a reference entry whose target document was deleted shows the same missing state as a reference field;
    - a stored value the item rejects shows empty and reports `list-entry-unreadable` (expected with `takeSheetIssues`);
    - SC-006: with 1000 stored entries, editing one entry leaves every other entry object identical (`===`) in the stored array.
- [x] T015 [P] [US1] Extend `tests/sheet_manager/template-editor.test.tsx`:
    - the type select offers 8 types and no formula;
    - changing the item type and a setting updates `list.item`;
    - the hidden settings are absent;
    - editing a legacy list materializes the item.

**Checkpoint**: MVP. Any entry type works on named lists.

---

## Phase 4: User Story 2 — Named or unnamed entries (P1)

**Goal**: a per-list switch between typed names and plain fields.

**Independent Test**: two text lists, one named and one unnamed: only the named one shows a name
box.

- [x] T016 [US2] In `listEntries.tsx`, build the `nameSlot`:
    - it is a `CatalogSuggest` when the list has a catalog, otherwise a text input;
    - its placeholder is the list title, and its accessible name is "{list} — name";
    - the item label is hidden on named entries.

    On unnamed lists, show the item label, or none plus the accessible fallback "{list}, entry {n}". Pass `rollLabel` (the name, or the item label). The write keeps `label` only for named lists.

- [x] T017 [US2] Presets and seeding (R11):
    - `createListEntry`/seeding in `src/sheet_manager/features/sheet/declarative/hooks.ts` and the shared entry factory build entries from the item: the name, and for number items the value (number, rating, or resource `{current, max}`);
    - seeding is skipped for unnamed lists.

    In `ElementSettings.tsx`:
    - add the "Entries are named" toggle (`named: false` when off, removed when on);
    - hide `ListPresetsEditor` on unnamed lists;
    - disable `ListCatalogPicker` with the note on unnamed lists.

- [x] T018 [P] [US2] Extend `list-items.test.tsx` (part 2):
    - named versus unnamed rendering;
    - an image list with no name box;
    - the accessible fallback name;
    - a preset adding its name and value on number, rating, and resource items;
    - the rating die using the entry name.

---

## Phase 5: User Story 3 — Remove an entry of any type (P1)

**Goal**: every type has a fitting, accessible remove control.

**Independent Test**: for every type, remove the first of two entries with the keyboard only;
the second keeps its value.

- [x] T019 [US3] Add the `ListEntryRemove` atom in `listEntries.tsx` (R9, contract):
    - an icon button with a Lucide `X`;
    - a 32 px target and the shared focus ring;
    - the name "Remove {name}", or "Remove {list}, entry {n}".

    Pass it as `removeSlot` unless the list is disabled or read-only. Removing an entry writes the array without it, and its other entries keep their identity. For block-shaped items, route the slot into `LabeledField.trailing`.

- [x] T020 [P] [US3] Extend `list-items.test.tsx` (part 3):
    - for each type, remove the first of two entries via Tab and Enter;
    - no remove or add control is shown on a read-only sheet;
    - for block types (multi-line text, image, multiple choice), the button is outside the input's container.

    Check SC-005 manually in the quickstart (phone width).

---

## Phase 6: User Story 4 — Existing lists keep working; type changes are safe (P2)

**Goal**: legacy lists look the same, and a save that would hide stored values asks first.

**Independent Test**: an old list renders as before; changing rating → image lists the affected
entries at save.

- [x] T021 [US4] Legacy parity (R5): a list without `item` renders `legacyListItem` through
      `RatingRow` with the name slot: 5 dots, S/P/E, the die, and the remove control. The flags
      are now stored in `entry.detail`. Add a component test to `list-items.test.tsx` that
      pins:
    - the name input;
    - the 5 dots;
    - the 3 flag buttons;
    - the die;
    - the remove button;
    - an old stored `{id,label,value}` showing its value;
    - an old value above 5 (for example 8 from a preset) stays stored and shows 5 dots, as `StatDot` did;
    - a flag toggle surviving a re-render from the store.
- [x] T022 [P] [US4] Create `src/sheet_manager/features/sheet/data/listItemChanges.ts` with
      `listItemChangeReport(before, after, documents)` (R6, data-model): per list id present in
      both versions, count the documents, `lostValues`, and `hiddenNames`, using
      `coerceListValue`.
- [x] T023 [US4] Save confirmation in
      `src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx` (contract "Editor: save
      confirmation"):
    - compute the report next to `planTemplateRetarget` over the documents the template can render (same system and kind) that store entries under the list's key; entries live in the shared value bag, so this is exactly the data that stops showing;
    - when it is non-empty, open one `ConfirmDialog` with the per-list lines and the note;
    - a pending retarget's description joins the same dialog;
    - cancelling keeps the draft.
- [x] T024 [P] [US4] Extend `list-item-change.test.ts` (part 2) and `template-editor.test.tsx`:
    - report counts for rating → image (lost), rating → number (none), number → resource (none), and named → unnamed (hidden names);
    - the dialog shows and cancels;
    - no dialog appears for compatible changes;
    - the values of entries not edited in between come back after changing the type back.
- [x] T025 [P] [US4] Files: in `tests/sheet_manager/template-file.test.ts` and
      `tests/sheet_manager/library-file.test.ts`, check that importing a template or library file with an old list
      (no `item`) loads as legacy, and that a list with `item` round-trips unchanged.

---

## Phase 7: User Story 5 — Catalog fills the entry's field (P3)

**Goal**: the list catalog suggests names for any type, and "value from" fits the type.

**Independent Test**: a named text list with a catalog text column as "value from": a pick fills
the name and the text.

- [x] T026 [US5] In `listEntries.tsx`, handle a catalog pick. It sets `label` and, when `valueFrom`
      fits the item type (data-model "value from fit"), the value:
    - number and rating: clamped;
    - resource: `current`, keeping `max`;
    - text;
    - toggle.

    One write per pick. A choice item with its own catalog stores `pickLabel` and ignores fills.

- [x] T027 [US5] Filter the "Value from" options in `ListCatalogPicker`
      (`src/sheet_manager/components/dialogs/template-editor/CatalogBindingEditor.tsx`) by
      `listItemField(list).type`: none for image, reference, and choice. Pass the item type from
      `ListConfig`. In `templateReferences.ts`, report `unknown-fill-detail` for a `valueFrom`
      that does not fit, and `list-catalog-unnamed` for a catalog on an unnamed list. Replace the
      old `LIST_VALUE_MAX` clamp in `primitives.tsx` or remove it with the old view.
- [x] T028 [P] [US5] Extend `tests/sheet_manager/catalog-use-sites.test.tsx`:
    - a number item with a number column;
    - a text item with a text column;
    - a resource item keeping its `max`;
    - image offering no columns;
    - the fit and unnamed reference issues;
    - the existing rating list test still passing.

---

## Phase 8: Polish & Cross-Cutting

- [x] T029 [P] Storybook (FR-016, contract "Storybook") in
      `src/sheet_manager/storybook/stories.ts`:
    - one custom list story per item type (8), with image and multi-line text unnamed;
    - one named list with a catalog and "value from";
    - the legacy list.

    Update the guard expectations in `tests/sheet_manager/storybook.test.tsx`.

- [x] T030 [P] Editor guide: the list part of `docs/template-editor/elements.mdx` and the catalog
      "value from" part of `docs/template-editor/values.mdx`, plus their ru mirrors under
      `i18n/ru/docusaurus-plugin-content-docs/current/template-editor/`. Cover the entry type,
      named and unnamed entries, "value from" per type, and the save warning. Run
      `yarn validate:i18n`.
- [x] T031 [P] Update the current-state docs:
    - `.agents/skills/sheet-templates/SKILL.md` (Lists: `item`, `named`, the entry shape, the legacy item, coercion, the change report);
    - `src/sheet_manager/AGENTS.md`, if it describes lists;
    - add a historical banner where spec 006 or 015 docs describe the custom list entry shape as current.
- [x] T032 [P] Add a v3.14.0 entry to `CHANGELOG.md` and bump `package.json`, then run
      `yarn check:version`.
- [x] T033 Mark T-077 done (`[x] ✅`) in `TODO.md` with a dated note, then run
      `yarn validate:backlog`.
- [x] T034 Run `yarn verify:full` and fix everything it reports, including unused exports left
      by the removed list path (knip).
- [x] T035 Walk through the quickstart manually (the maintainer).

---

## Dependencies & Execution Order

- **Setup (T001–T002)** comes first.
- **Foundational (T003–T009)** blocks every story.
    - T003 comes before T004 and T005.
    - T006 follows T003–T005.
    - T007 and T008 come before T009.
- **US1 (T010–T015)** needs Foundational. T011 needs T012. T014 and T015 follow their code.
- **US2 (T016–T018)** needs T010.
- **US3 (T019–T020)** needs T010 and T009.
- **US4 (T021–T025)**:
    - T021 needs T016 and T019;
    - T022 needs only T004;
    - T023 needs T022.
- **US5 (T026–T028)** needs T016 (the name slot) and T011.
- **Polish (T029–T035)** comes last.

## Parallel Examples

- Foundational: T004 ∥ T007 ∥ T008 once T003 is done.
- US1: T014 ∥ T015 after T010–T013.
- US4: T022 can start right after T004, in parallel with US1–US3.
- Polish: T029 ∥ T030 ∥ T031 ∥ T032.

## Implementation Strategy

1. Foundational, then US1 (MVP): configurable entries on named lists.
2. US2 and US3 complete the everyday use: unnamed lists and removal for every type.
3. US4 makes the release safe for existing data. It must land before release, even though it is
   P2.
4. US5 extends the catalog copy, then Polish and `verify:full`.
