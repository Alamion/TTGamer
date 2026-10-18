# Design: A Create Dialog That Scales With Many Document Kinds

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-18

## Approach

The dialog is rewritten in place (`components/dialogs/DocumentCreateDialog.tsx`, same props, used by
`SheetWorkspace` and `DocumentsPanel`). Its list comes from a new pure model,
`features/documents/createChoices.ts`, built over the library tree (`buildLibraryTree`), so kinds
are grouped exactly as the library shows them. Creating goes through one function,
`features/documents/createFromChoice.ts`, shared by the dialog and the documentation buttons: it
names the document, copies an example when one is chosen, places it in a folder, and records the
kind as recent. The store's `createDocument` gains `title` and `data` options; nothing persisted
changes shape. Order: US1 (model, search, recent, left pane) → US2 (name, folder, right pane) → US3
(examples) → US4 (keyboard, phone steps, announcements) → US5 (docs buttons) → finish.

## Decisions

- **D1 — Choices from the library tree**: `createChoices(tree)` walks
  `RulesetNode → SettingNode → TypeNode` and keeps type nodes that are available; a choice is
  `{ key, systemId, definitionId, settingId?, name, description?, path: [ruleset, setting], bookNames, examples }`.
  A ruleset with a single setting of the same name, or a setting with one kind, collapses its
  heading (spec edge case). _Why_: one source of grouping and order; user settings already sit under
  their ruleset with the core kinds. _Rejected_: keeping `createGroups` (the current per-setting
  list) — it repeats the grouping logic and has no ruleset level.
- **D2 — Search**: `matchesSearch` (`shared/utils/normalizeSearchText`) over the kind name in the
  interface language and English, the setting and ruleset names in both, and the user type's
  description. Search keeps matching kinds with their headings; folded groups open while a search is
  active. _Why_: the same matcher as the catalogs, accents and «ё» already handled. _Rejected_:
  fuzzy scoring — not needed at tens of kinds and harder to predict.
- **D3 — Widget**: the search is a `combobox` controlling a `listbox`; groups are `role="group"`
  with a heading button (`aria-expanded`) that folds them; kinds are `option`s carrying
  `data-kind="system/definition[/setting]"`. Arrows move `aria-activedescendant`, `Enter` selects
  and moves the focus to the name, `Escape` clears a non-empty search, then closes. A polite live
  region says "N kinds" after filtering. _Why_: one focus stop for type-and-pick, the pattern the
  APG gives for a filterable list; constitution VI. _Rejected_: radio buttons (one tab stop per
  group, no active-descendant filtering); the shared `TreeView` (built for files, no combobox, and
  folding only two levels would cost more than it saves).
- **D4 — Layout**: two panes from 640 px (the kinds left, `minmax(16rem, 1fr)`; the details right,
  20 rem), the dialog `min(52rem, 100% - 2rem)` wide and `min(36rem, 100dvh - 2rem)` tall with only
  the list scrolling. Below 640 px the dialog fills the screen and shows the kinds, then the details
  after a choice, with **Back**; the search sits at the top of step one and **Create** at the bottom
  of step two (sticky). _Why_: clarification of 2026-10-18. _Rejected_: a wizard on every screen;
  one column with an expanding block.
- **D5 — Recent and folds on the device**: `localStorage` key `ttgamer:create-dialog:v1` =
  `{ recent: string[] (≤ 5 choice keys, newest first), folded: string[] (group keys) }`, read with a
  guard (bad JSON or a missing kind is ignored). `createFromChoice` writes `recent`, so docs buttons
  count too. _Why_: a per-device preference, like the panes layout; never synced or exported.
  _Rejected_: the documents store (it is document data, exported and synced later).
- **D6 — Name**: `createFromChoice` writes the name to `metadata.title` and to the kind's own name
  value: the definition's character capability (`applyUpdates` of `metadata.name`, Star Wars
  characters) when it has one, else every field binding of the system for that kind with
  `syncsTitle` (V5, WoD 2e engine, creatures, vehicles, fodder groups). An empty name keeps today's
  behavior (empty title, the name field follows the first typed name). _Why_: FR-009 without a
  system conditional; it reuses the two ways names already reach the title. _Rejected_: only the
  title — the sheet would show an empty Name field next to a named tab.
- **D7 — Folder**: the right pane shows the folder as a button ("Top level" or the path) that opens
  the existing `MoveToPicker` over the dialog. The start is the dialog's `parentId`. A folder
  deleted meanwhile falls back to the top level, as `createDocument` already does. `DocumentsPanel`
  skips its inline rename when the document was created with a name (`onCreated(id, { named })`).
  _Why_: reuse the picker and its tests. _Rejected_: a flat `<select>` of folders — unusable with
  deep trees.
- **D8 — Examples**: the start choice (**Blank** + each `definition.examples` entry) shows only for
  kinds with examples. A copy takes the example's `data` through `definition.migrate` and
  `schema.parse`, its `templateValues`, and its portrait (`imageUrl` inside the data); never its id,
  folder, or preset status. With no name typed the copy is named after the example's label. _Why_:
  FR-008; the examples exist (Jax Vorn, wampa, three vehicles, stormtrooper squad, Lena, Mirela).
  _Rejected_: opening the preset read-only — the player wants a document of their own.
- **D9 — Documentation buttons**: `CreateCharacterButton` keeps its name and props (MDX in en + ru
  uses it) and gains `exampleId`; its label says what it makes ("New: Vampire character", "Copy
  Mirela Voss"), it calls `createFromChoice`, and a toast says "Created" with **Open**, a link to
  `/universal_sheet` where the new document is current. _Why_: clarification; one create path.
  _Rejected_: opening the dialog from the docs.
- **D10 — No lazy loading**: the library tree and the store are already on the sheet page; the
  dialog adds markup and two small modules. Measured against SC-005 (5 KB). _Rejected_: a lazy chunk
  for the dialog — a delay on every **New** for a few KB.

## Changed types and data

- `documentStore.createDocument` options: `title?: string`, `data?: unknown` (parsed by the
  definition's schema, defaults otherwise). No persisted shape changes; no migration.
- `CreateCharacterButton`: optional `exampleId`.
- `DocumentCreateDialog` `onCreated(id, { named: boolean })`.
- Translations (`documents.yaml`, en + ru): `create.search`, `create.recent`, `create.noMatch`,
  `create.clearSearch`, `create.matches` (plural), `create.start`, `create.blank`, `create.name`,
  `create.folder`, `create.topLevel`, `create.back`, `create.details`; `docsCreate.newKind`,
  `docsCreate.copy`, `docsCreate.created`, `docsCreate.open`.
- Removed: `createGroups` and the radio markup.

## Principles at risk

- **VI (accessibility)**: combobox + listbox with active descendant, `aria-expanded` group headings,
  a live count, `role="alert"` none needed (no errors); every action keyboard-reachable; 32 px rows
  on touch.
- **VII (scale)**: choices are built once per open and filtered in memory; at 200 kinds the list is
  a few hundred nodes, so no virtualization (spec scale note); a perf test guards SC-002.
- **I/II (boundaries)**: no system conditionals — names go through capabilities and bindings (D6),
  examples through `definition.examples`.

## Tests

- `tests/sheet_manager/create-choices.test.ts`: grouping and order from the library tree; user
  settings under their ruleset with core kinds; unavailable kinds left out; collapsed one-child
  headings; search in en/ru, by English name and by description; recent order, cap, and dropping of
  missing kinds; bad stored JSON ignored.
- `tests/sheet_manager/create-from-choice.test.ts`: every shipped kind created with a name shows it
  as title and in its name value (capability or `syncsTitle` binding); empty name keeps today's
  behavior; example copies are independent, migrated, keep the portrait; folder and fallback; recent
  written.
- `tests/sheet_manager/document-create-dialog.test.tsx` (replaces the radio cases in
  `document-dialogs`, `user-settings`, `user-document-types`): focus on search, filtering and the
  live count, `Enter`/`Escape` flow, fold state remembered, folder picker, start choice, two steps
  below 640 px.
- `tests/sheet_manager/docs-create-button.test.tsx`: labels, example copy, toast with **Open**.
- `tests/sheet_manager/create-choices.perf.test.ts`: building and filtering 100 kinds stays within
  budget (best of warm runs).
- `tests-e2e/brief.ts` helper: picks a kind by `data-kind`; a smoke test creates a named vampire
  from Mirela at 360 px without sideways scrolling.

## Manual walk

1. Open **New** from the toolbar, type «вамп» → only the vampire kind remains; `Enter`, type a name,
   `Enter` → the vampire opens with that name in the tab and the Name field.
2. In the documents window, **New** inside a folder → the folder is preselected; change it with the
   picker → the document lands in the chosen folder, no inline rename starts.
3. Choose Hunter → **Lena Varga**, create twice → two independent copies with her portrait.
4. Reopen **New** → **Recent** shows Hunter and Vampire, newest first; fold V5, reopen → still
   folded.
5. At 360 px: step one lists kinds, step two shows start, name, folder; **Back** returns; nothing
   scrolls sideways.
6. Docs, "Meet Mirela": **Copy Mirela Voss** → toast with **Open** → the copy on the sheet.
7. With a user setting on V5 and two same-named types → both listed under V5 with descriptions.
