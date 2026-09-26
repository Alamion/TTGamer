# Tasks: Visual template editor and template-defined document types

**Input**: Design documents from `specs/012-template-editor-custom-types/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: included. Constitution V asks for the following, and research "Testing strategy"
lists the suites:

- round-trip and migration tests for schemas and stores (template store v5, the new type
  store, and Star Wars parse parity);
- component tests for user-visible flows.

**Organization**: grouped by user story (US1–US7 from spec.md). Paths are repo-relative.
Before starting a kind of task, load the matching skill:

| Before                         | Load                                      |
| ------------------------------ | ----------------------------------------- |
| any template or editor task    | `.agents/skills/sheet-templates/SKILL.md` |
| schema, store, or system tasks | `.agents/skills/sheet-manager/SKILL.md`   |
| translation tasks              | `.agents/skills/ui-i18n/SKILL.md`         |
| editing `TODO.md`              | `.agents/skills/backlog/SKILL.md`         |
| writing `.ts` / `.tsx`         | `.agents/skills/typescript/SKILL.md`      |

Every new user-visible string goes through `translations/source/{en,ru}/…` +
`yarn build:translations`, never as a literal.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US7 for story phases; none for setup, foundational, and polish

---

## Phase 1: Setup

**Purpose**: backlog statuses and shared test fixtures.

- [x] T001 Mark T-054, T-046, and T-041 as in progress (`[ ] 🟡`) in `TODO.md` and add a dated note under `gm-notes-templates` in `ROADMAP.md` that spec 012 adds user document types and settings; run `yarn validate:backlog`
- [x] T002 [P] Capture the Star Wars parity fixtures **before any refactor** in `tests/sheet_manager/fixtures/star-wars-parity.json`. It holds:
    - the parsed data of one stored character, droid, creature, vehicle, and fodder group, taken from `examples.ts` and `JAX_VORN_PRESET`, plus one legacy `characters[]` entry through `characterDocumentFromBase`;
    - the JSON of every shipped Star Wars template (`systemRegistry.getSystem('star-wars-wod').defaultTemplates`);
    - `traitPool` output for `value` 0–10 × every flag combination.

    Generate it with a one-off script in `scripts/`, commit the output, and delete the script.

- [x] T003 [P] Create `tests/sheet_manager/helpers/editor.ts` with three helpers:
    - `renderEditor(base)`: renders `TemplateEditorDialog` with a reset `useTemplateStore`, `useDocumentStore`, and `useDocumentTypeStore` (the last guarded until T048 exists);
    - `pressShortcut(target, code, { ctrl, shift, alt, key })`: fires `keydown` with both `code` and a caller-chosen `key`, so tests can simulate a Russian layout (`key: 'я'`, `code: 'KeyZ'`);
    - `dragNode(sourceTestId, targetElement)`: uses the MIME type `application/x-ttgamer-template-node`, as in the drag-and-drop section of `tests/sheet_manager/template-editor.test.tsx:613-714`.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: pure editor logic, the scratch document source, the renderer overlay seam, and
T-046 composite override keys. Every story depends on this phase.

**⚠️ No user-story work starts before this phase is complete.**

### Shared value writes and document sources (research R3)

- [x] T004 Move `validateTemplatePageValues` and the merge rule "validate changed keys only, orphans pass through, `undefined` drops a key" out of `src/sheet_manager/store/documentStore.ts` (`:124`, `:357-400`) into `applyTemplateValueWrites(template, current, next)` in the new `src/sheet_manager/features/sheet/data/templateValueWrites.ts`. Make `documentStore.updateTemplateValues` call it with unchanged behaviour. `tests/sheet_manager/template-value-writes.test.ts` must pass unmodified.
- [x] T005 Add `preview: boolean` to `DocumentSource` in `src/sheet_manager/hooks/useDocumentSource.ts`:
    - the store source uses `false`, and `createStaticDocumentSource` uses `true`;
    - switch the reference "open document" guard and the `reference-target-missing` suppression in `src/sheet_manager/features/sheet/declarative/hooks.ts` (`previewSource`, `:155`, `:320-326`) from `readOnly` to `preview`.
- [x] T006 Add `createScratchDocumentSource(envelope, definition)` to `src/sheet_manager/hooks/useDocumentSource.ts`, following the table in data-model "Document source":
    - it keeps an in-memory envelope in a tiny Zustand store created per call;
    - `readOnly: false`, `preview: true`;
    - `updateDocumentData` parses with `definition.schema`, without the portrait deletion side effect;
    - `updateDocumentMetadata` merges;
    - `updateTemplateValues` uses `applyTemplateValueWrites` from T004;
    - it exposes `reset(envelope)`.
- [x] T007 [P] Extend `tests/sheet_manager/document-source.test.ts` for the scratch source:
    - writes to data, metadata, and template values change only the scratch envelope, and `useDocumentStore` stays untouched;
    - an invalid value is rejected with `template-value-write-rejected`;
    - `preview` disables "open document".

### Pure editor logic (research R5, R6, R8, R9)

- [x] T008 [P] Implement `src/sheet_manager/components/dialogs/template-editor/history.ts`:
    - `createHistory(initial)`, `applyChange(history, draft, meta)`, `undo(history)`, `redo(history)`, `canUndo`, `canRedo`;
    - snapshots are `{ draft, selectedId }`, and `past` is capped at 100;
    - a change with the same `meta.coalesceKey` within 800 ms (injectable clock) replaces `present`;
    - a new change clears `future`.
- [x] T009 [P] Unit tests for T008 in `tests/sheet_manager/template-editor-history.test.ts`: the cap, coalescing inside and outside the window, redo cleared by a new change, and selection restored on undo and redo.
- [x] T010 [P] Implement `src/sheet_manager/components/dialogs/template-editor/shortcuts.ts`:
    - a pure `matchEditorShortcut(event, { typing })` that returns `'undo' | 'redo' | 'duplicate' | 'delete' | 'move-up' | 'move-down' | 'move-out' | 'move-in' | 'column-prev' | 'column-next' | null`;
    - it matches `event.code` only, per the table in `contracts/editor-interaction.md`, and `typing` lets Ctrl+Z, Ctrl+Y, and Delete fall through;
    - a `useEditorShortcuts(ref, handlers)` hook that listens on the dialog content element and calls `preventDefault()` only for handled keys.
- [x] T011 [P] Unit tests for T010 in `tests/sheet_manager/template-editor-shortcuts.test.ts`:
    - every command with `key` values from the Russian layout (`я`, `в`, `н`) and `code` Latin;
    - Meta instead of Ctrl;
    - `typing: true` passes through Ctrl+Z, Ctrl+Y, and Delete.
- [x] T012 [P] Implement `src/sheet_manager/components/dialogs/template-editor/moveTargets.ts`: a pure `resolveMoveTarget(draft, nodeId, command)` that returns `{ parentId, index, column? } | null` for move-up, move-down, move-out (right after the parent container), move-in (end of the previous sibling container), and column-prev/next (clamped to the parent's `columns`). Unit tests go in `tests/sheet_manager/template-editor-move-targets.test.ts`.
- [x] T013 Add `duplicateNode(draft, nodeId): DraftOpResult` to `src/sheet_manager/components/dialogs/template-editor/draft.ts` (research R8):
    - it re-issues ids for the node, its descendants, table columns, and select options, using `newId` with the original prefix;
    - it drops an explicit custom `valueKey` but keeps one that `resolveDataBindingByCoordinate` resolves for the draft's system and kind;
    - it adds the "(copy)" suffix from a new `ttgamer.ui.sheet.templates.editor.copySuffix` message and drops `labelMessage`, as on rename;
    - it inserts after the original and checks the depth and count limits.
- [x] T014 Add `nodeId?: string` to `DraftIssue` in `src/sheet_manager/components/dialogs/template-editor/draft.ts`, and fill it in `collectDraftIssues` for duplicate ids, bounds, formula parse errors and cycles, and per-node `validateTemplateReferences` issues.
- [x] T015 [P] Extend the pure draft section of `tests/sheet_manager/template-editor.test.tsx` for T013 and T014:
    - a duplicate has no id in common with the original, including columns and options;
    - a custom `valueKey` is dropped and a bridged one kept;
    - a duplicate at the node limit is refused;
    - issues carry `nodeId`.

### Renderer overlay seam (research R2, R10)

- [x] T016 Create `src/sheet_manager/features/sheet/declarative/editorOverlay.ts` with `TemplateEditorOverlayContext`. Its value is `{ selectedId, select(id), renderFrame(node, content, meta) }`, and it is `null` by default.
- [x] T017 In `src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx`, make three changes, all inert when the context is `null`:
    - wrap each node in `ChildrenGrid.renderNode` (`:500-508`) with `overlay.renderFrame(node, content, { parentId, column, index })` when the context is present;
    - in `NodeView` (`:413`), render a hidden-by-condition node through `renderFrame(…, { conditionHidden: true })` instead of returning `null` when the context is present;
    - prefix the collapse-state keys (`:421`, `:445`) with `editor-` when the context is present.
- [x] T018 Memoize `NodeView` in `src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx` on node identity plus `pageApi` identity. Confirm `tests/sheet_manager/declarative-sheet.test.tsx`, `template-layout.test.tsx`, and `docs-embeds.test.tsx` pass unchanged.

### Composite override keys — T-046 (research R22)

- [x] T019 In `src/sheet_manager/store/templateStore.ts`:
    - add `overrideKey(systemId, viewId)`;
    - key `defaultOverrides` by it;
    - bump `STORE_VERSION` to 5;
    - extend `migrateTemplateStoreState` to re-key each raw entry from its parsed `override.systemId` (quarantine on parse failure, as today);
    - make `setDefaultOverride` / `clearDefaultOverride` take `(systemId, viewId)`;
    - update `duplicateTemplate` (`:112`).
- [x] T020 Update every override call site to `overrideKey`: `src/sheet_manager/systems/view.ts` (`:38`, `:73`), `src/sheet_manager/features/sheet/CharacterSheet.tsx` (`:71`, `:117`), `src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx` (`:75`, `:144`), and `src/sheet_manager/components/dialogs/TemplateLibraryDialog.tsx` (`:59-66`, `:108-113`, `:423`).
- [x] T021 In `src/sheet_manager/components/dialogs/TemplateImportDialog.tsx` (`:66`), give an imported template whose id equals any shipped view id (`systemRegistry` views) a fresh `tpl-` id, instead of letting it shadow the shipped page.
- [x] T022 [P] Tests in `tests/sheet_manager/template-store-migration.test.ts` and `tests/sheet_manager/view-resolution.test.ts`:
    - a v4 state with overrides for `full-sheet` and `v5-hunter-sheet` migrates to `star-wars-wod:full-sheet` and `wod-v5:v5-hunter-sheet` with equal content (SC-006);
    - a broken entry is quarantined;
    - resolution applies the override only for its own system;
    - importing a template whose id is `full-sheet` yields a new id.

**Checkpoint**: foundations ready. `yarn verify` is green.

---

## Phase 3: User Story 1 — See the page while editing it (Priority: P1) 🎯 MVP

**Goal**: the editor shows Outline | Page | Settings. The page is the draft rendered on sample
data, with selection shared in both directions and condition-hidden nodes visible.

**Independent Test**: open the shipped Star Wars full sheet in the editor. Change a label, a
column count, and a group's "Show title"; each shows on the page without saving. Clicking
"Strength" on the page opens its settings (quickstart §1).

### Tests for User Story 1

- [x] T023 [P] [US1] Component tests in `tests/sheet_manager/template-editor-page.test.tsx`:
    - editing a label or a column count re-renders the page node (`[data-node-id]`) before saving;
    - a click on a page node sets `data-selected`, shows its settings, and marks `data-outline-row`;
    - an outline click marks the page node;
    - a `visibleWhen`-false section renders with `data-condition-hidden`;
    - clicking dots changes the scratch document and leaves `useDocumentStore` unchanged;
    - editor collapse keys never touch `template-…` keys.
- [x] T024 [P] [US1] Performance test in `tests/sheet_manager/template-editor.perf.test.tsx`, modelled on `tests/sheet_manager/term-hint.perf.test.tsx`: on the Star Wars full sheet, 20 label keystrokes and one column change each commit within 300 ms in jsdom (SC-002's 100 ms × a fixed jsdom factor of 3, stated as a named constant in the test).

### Implementation for User Story 1

- [x] T025 [US1] Extract the settings body of `ElementEditor` (`src/sheet_manager/components/dialogs/template-editor/ElementEditor.tsx:413-455`: `ColumnPlacementControl`, `VisibilityControl`, `SectionConfig`, `GroupConfig`, `TableConfig`, `ListConfig`, `ListPresetsEditor`, `PrimitiveConfig`, `FieldEditor` adapters) into an exported `ElementSettings({ node, parentColumns, callbacks })` in the new `src/sheet_manager/components/dialogs/template-editor/ElementSettings.tsx`. Move the private `*Config` functions with it.
- [x] T026 [US1] Create `src/sheet_manager/components/dialogs/template-editor/OutlineTree.tsx`: a memoized compact tree with one row per node (`data-outline-row`, `data-node-id`, grip test id `grip-<id>`, kind, label, ◐/◌ condition marker, issue marker from `DraftIssue.nodeId`), indented by depth, with click-to-select and `aria-current` on the selected row. It reads the draft-derived data from `EditorModelContext`.
- [x] T027 [US1] Create `src/sheet_manager/components/dialogs/template-editor/EditorNodeFrame.tsx`. The frame:
    - carries `data-node-id`, `data-selected`, and `data-condition-hidden`;
    - shows a chip "⠿ Kind · Label" (grip with an `aria-label`);
    - selects on click unless the target is a value control (input, select, `button` inside a stat or track);
    - shows the hatched style and the condition note (new `ttgamer.ui.sheet.templates.editor.hiddenByCondition` message naming the coordinate and value);
    - handles hover through one delegated `pointerover` on the page root that sets `data-hover`.

    Use Tailwind with palette variables. Add the editor accent as a new `--editor` variable (light and dark values) in `src/css/custom.css` and an `editor` colour in `tailwind.config.cjs`, so editor marks never use the sheet's primary/secondary accents. This changes generated CSS, so T092 `yarn verify:full` covers it.

- [x] T028 [US1] Create `src/sheet_manager/components/dialogs/template-editor/EditorPage.tsx`:
    - it builds the sample document (research R3 order: a compatible open document copy, else the first example, else `createDefault()`) with `createScratchDocumentSource`, reset when `documentKind` changes;
    - it renders `DeclarativeSheetView embedded` with `useDeferredValue(draft)` inside `DocumentSourceContext` and `TemplateEditorOverlayContext`, whose `renderFrame` returns `EditorNodeFrame`;
    - it shows the sample-data note (new message `ttgamer.ui.sheet.templates.editor.sampleNote`);
    - a click on empty background clears the selection;
    - selecting from the outline scrolls the page node to the centre (`behavior: 'auto'` under `prefers-reduced-motion`).
- [x] T029 [US1] Rework `src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx` into three areas:
    - Outline | Page | Settings, with both editor contexts and the single coordinate `<datalist>` above all three;
    - `selectedId` state, with `parentColumns` derived for `ElementSettings`;
    - issues rendered as buttons that select `nodeId`;
    - below `md`, tabs Page / Outline / Settings (Radix-free `role="tablist"` with `aria-selected`), Page the default;
    - keep the header (name, kind, description), save/discard, and the discard confirmation.
- [x] T030 [US1] Add en and ru strings for the areas, tabs, sample note, condition note, chip kind names, and "(copy)" to `translations/source/en/ui/sheet/templates.yaml` and `translations/source/ru/ui/sheet/templates.yaml`; run `yarn build:translations` and `yarn i18n:verify`.
- [x] T031 [US1] Port `tests/sheet_manager/template-editor.test.tsx` to the new layout. Keep its selectors (`data-node-id`, `data-palette-option`, `grip-<id>`); where the old recursive panel is gone, assert through the outline and the settings area.

**Checkpoint**: US1 works on its own. The editor shows the real page and selection is synced.

---

## Phase 4: User Story 2 — Arrange elements where they will appear (Priority: P1)

**Goal**: move, insert, and re-column elements on the page and in the outline, by pointer and
by keyboard, with announcements.

**Independent Test**: on the page, drag a field to column 2, insert a field between two
others, and move a section up; the outline and the saved template match (quickstart §2).

### Tests for User Story 2

- [x] T032 [P] [US2] Component tests in `tests/sheet_manager/template-editor-arrange.test.tsx`:
    - dropping on a `data-insert-slot` moves the node and sets `column` in one history step;
    - dropping on a `data-drop-zone` of an empty column works;
    - activating a slot opens the add menu, and the chosen element is inserted at that index and selected;
    - `Alt+ArrowDown`, `Alt+Shift+ArrowRight`, and `Alt+ArrowLeft` via `pressShortcut` with Russian `key` values move as `resolveMoveTarget` says, and the live region announces the move;
    - moving a section into its own child is refused with the `cannotMoveIntoItself` text and leaves the draft unchanged;
    - the column count buttons change the real columns on the page.

### Implementation for User Story 2

- [x] T033 [US2] Add insertion slots and empty-column drop zones to `EditorNodeFrame`, or to a sibling `EditorSlots` rendered by the overlay's `renderFrame` metadata, in `src/sheet_manager/components/dialogs/template-editor/EditorNodeFrame.tsx`:
    - slots carry `data-insert-slot="<parentId|root>:<index>:<column|->"` and an accessible name, and are keyboard-focusable buttons;
    - drop handlers read the MIME type from T003 and `stopPropagation`, converting to the final index as in `ElementEditor.tsx:100-118`.

    Where `renderNode` does not see empty columns, add an overlay hook in `ChildrenGrid` (`DeclarativeSheetView.tsx:524-549`) that renders `overlay.renderEmptyColumn(parentId, column)` for columns with no children.

- [x] T034 [US2] Move `AddElementPalette` out of `ElementEditor.tsx` (`:168-304`) into `src/sheet_manager/components/dialogs/template-editor/AddElementMenu.tsx` as a Radix Popover anchored to a slot, keeping `data-palette-option`. Its node builders move into `draft.ts` factories (`newListNode`, `newTrackerNode(bindings)`).
- [x] T035 [US2] Make outline rows and page chips drag sources, and outline slots drop targets, in `OutlineTree.tsx` and `EditorNodeFrame.tsx`. Every drop goes through `moveNode` plus a `column` update, as **one** history change.
- [x] T036 [US2] Wire `useEditorShortcuts` from T010 and `resolveMoveTarget` from T012 in `TemplateEditorDialog.tsx`, plus Move up / Move down buttons and column placement buttons in `ElementSettings.tsx`. Announce each move through a polite live region using new messages `ttgamer.ui.sheet.templates.editor.moved*`. Refused moves show the existing messages in the live region and the issue area.
- [x] T037 [US2] Make the column count and width controls (`LayoutControls.tsx`, `ColumnLayoutControl`) take effect on the page immediately, which follows from T029 once they are wired through the history reducer. Clamp children beyond a reduced column count to the last column in the same change (`updateNode` in `draft.ts`).
- [x] T038 [US2] Add en and ru strings for the slot and drop-zone names and the move announcements in `translations/source/{en,ru}/ui/sheet/templates.yaml`; run `yarn build:translations`.

**Checkpoint**: US1 + US2. Layout editing happens on the page.

---

## Phase 5: User Story 3 — Quick preview and safe experimentation (Priority: P2)

**Goal**: a quick preview with a data picker, undo and redo for every change, and element
duplication.

**Independent Test**: preview the character template on the open document, an example, and
blank data. Delete, undo, redo, and undo a section. Duplicate a group and edit the copy
independently (quickstart §3).

### Tests for User Story 3

- [x] T039 [P] [US3] Component tests in `tests/sheet_manager/template-editor-preview.test.tsx`:
    - Preview hides the outline, settings, and overlay (no `data-insert-slot`), and applies conditions;
    - the data picker lists "Open document" only for a compatible document, then each declared example, then "Blank";
    - a deleted chosen document falls back to Blank with a notice;
    - `Ctrl+Z`, `Ctrl+Shift+Z`, and `Ctrl+Y` via `pressShortcut` with `key: 'я'` / `'н'` undo and redo, with the selection restored;
    - `Ctrl+D` (`key: 'в'`) duplicates, and editing a copy's value leaves the original unchanged;
    - `Delete` in a text input edits text and does not remove the node.

### Implementation for User Story 3

- [x] T040 [US3] Add `examples?: readonly DocumentExample[]` to `DocumentDefinition` in `src/sheet_manager/systems/types.ts`, as in data-model "Plugin declarations". Declare the examples:
    - Star Wars in `src/sheet_manager/systems/star-wars-wod/index.ts`: Jax Vorn on `character`, wampa on `creature`, stormtroopers on `fodder-group`, Red Five / landspeeder / Falcon on `vehicle`;
    - Hunter in `src/sheet_manager/systems/v5/modules/hunter/definition.ts`: Lena Varga.

    Make `src/sheet_manager/docsEmbeds.tsx` helpers read the same declarations where they duplicate them.

- [x] T041 [US3] Route **every** draft change in `TemplateEditorDialog.tsx` through one `applyDraftChange(next, meta)` that feeds the T008 history. This covers `applyOp` insert and move and every `setDraft` callback (`:161-190`), keeping the stable-callback rule (`draftRef`). Pass `coalesceKey` = `<nodeId>:<property>` from label, placeholder, and option text edits. Add toolbar Undo and Redo buttons with `aria-label` and disabled states. Wire the undo, redo, duplicate, and delete shortcuts. On delete, the selection moves to the next sibling, else the previous one, else the parent.
- [x] T042 [US3] Create `src/sheet_manager/components/dialogs/template-editor/EditorPreview.tsx`:
    - an Edit / Preview switch in the dialog toolbar;
    - the preview mounts only while active and renders `DeclarativeSheetView embedded` with `createStaticDocumentSource(chosen)`, without the overlay;
    - the data picker is built from the open document (when `systemId` and `documentKind` match), `definition.examples`, and `createDefault()`;
    - it falls back to Blank with a notice if the chosen document disappears.
- [x] T043 [US3] Add a Duplicate button in `ElementSettings.tsx`, calling `duplicateNode` through `applyDraftChange` and selecting the copy.
- [x] T044 [US3] Add en and ru strings for Preview, the data picker, Undo, Redo, Duplicate, and the fallback notice in `translations/source/{en,ru}/ui/sheet/templates.yaml`; run `yarn build:translations`.

**Checkpoint**: the visual editor (T-054) is complete, with US1–US3 independently usable.

---

## Phase 6: User Story 4 — Create a new document type from a template (Priority: P2)

**Goal**: users create `user-` document types in a shipped setting. They appear in the create
dialog, keep all values in `templateValues`, may have several pages, and degrade to a fallback
page when deleted.

**Independent Test**: create "Organization" in Star Wars with a name field, a catalog select,
a rating, and a list. Create two documents, reload, and remove and re-add a field. Delete the
type; the documents remain on the fallback page (quickstart §4).

### Tests for User Story 4

- [x] T045 [P] [US4] Registry and store tests in `tests/sheet_manager/user-document-types.test.ts`:
    - a `user-` document parses without its type and after the type is deleted, with values intact;
    - a shipped definition id starting with `user-` makes the registry constructor throw;
    - `listDefinitions` includes user types after `setUserDocumentTypes`, and orphans are excluded;
    - `getDocumentDefinition` returns the synthesized and orphan definitions from data-model;
    - `resolveDocumentPolicies` gives a Hunter-module user type `['dark-pack']` and a Star Wars user type `[]`;
    - the type store round-trips through persist, and an entry with an unknown owner system is quarantined with `template-quarantined`;
    - a `user-` document rendered before the type store hydrates shows the loading state and produces no `template-fallback` report, then its page after hydration.
- [x] T046 [P] [US4] Component tests in `tests/sheet_manager/user-document-types.test.tsx`:
    - "New document type" asks for an owner and a name, and saving creates the type and its first page together;
    - the create dialog lists the type under its setting;
    - a created document keeps the values entered after a store rehydrate;
    - a second page appears in `ViewModeSelect`;
    - removing a field keeps its value, which reappears when a field with that value key returns;
    - deleting the type confirms with the document count, and the document then renders the fallback page and reports `template-fallback` with reason `type-missing`;
    - the "Stores value in" source offers only custom values;
    - the catalog picker lists only the owner system's catalogs;
    - the reference field offers a kind picker with shipped and user kinds.

### Implementation for User Story 4

- [x] T047 [US4] Create `src/sheet_manager/systems/userTypes.ts` (system-independent):
    - `USER_KIND_PREFIX = 'user-'`, `isUserKind`, `newUserTypeId()`, `UserTypeDataSchema = z.object({}).strip()`;
    - Zod schemas `UserDocumentTypeSchema` and `UserSettingSchema`, per data-model;
    - `synthesizeUserDefinition(type, templates)` and `synthesizeOrphanDefinition(definitionId)` returning `DocumentDefinition`, per data-model "Synthesized definitions".
- [x] T048 [US4] Create `src/sheet_manager/store/documentTypeStore.ts`:
    - a Zustand persist store with localForage, key `universal-document-type-storage`, version 1;
    - state `{ types, settings, quarantine }` (quarantine max 100, reporting `template-quarantined`);
    - actions `saveType`, `removeType`, `saveSetting`, `removeSetting`, `getType`.
- [x] T049 [US4] Extend `SystemRegistry` in `src/sheet_manager/systems/registry.ts`:
    - an invariant that no shipped definition id or kind starts with `user-`;
    - a `setUserDocumentTypes({ types, settings, templates })` overlay;
    - `getDocumentDefinition` / `listDefinitions` consult the overlay;
    - `parseDocument` parses `user-` definitions of registered systems with `UserTypeDataSchema`, independently of the overlay.

    Subscribe the overlay to `useDocumentTypeStore` and `useTemplateStore` in `src/sheet_manager/systems/index.ts`, including once after hydration.

- [x] T050 [US4] Change `resolveDocumentPolicies` in `src/sheet_manager/systems/policies.ts` (`:74`) to look up the definition through the registry (so user types resolve) and to add the owner module's policies for user types owned by a module.
- [x] T051 [US4] Create `src/sheet_manager/features/sheet/data/orphanPage.ts`: `buildOrphanPage(document)` returns a `CustomTemplate` with one group titled by the document title and a `text` field per `templateValues` key (label = key, `valueKey` = key, key order).
- [x] T052 [US4] In `src/sheet_manager/features/sheet/CharacterSheet.tsx` (`:74-78`), replace `return null` for a missing definition, and a user-type definition without pages, with the orphan page rendered through `DeclarativeSheetView`. While `useDocumentTypeStore` has not hydrated (expose `hasHydrated` from T048 via the persist API), render the existing loading state instead, with no report (contract "Pages"). Report `template-fallback` with `{ documentId, reason: 'type-missing', requested }` once; add the reason to `src/sheet_manager/diagnostics.ts`.
- [x] T053 [US4] Library flows in `src/sheet_manager/components/dialogs/TemplateLibraryDialog.tsx`:
    - "New document type" takes an owner picker (every shipped setting: system, or system + module) and a name, then opens the editor with `createEmptyDraft(newUserTypeId(), systemId)`; saving writes the template and then `saveType` (owner, `defaultTemplateId`);
    - groups are labelled by setting and type name instead of the raw kind string (fixing `groupLabel`, `:34-37`, and the raw `newKind` button label, `:348`);
    - delete type counts documents with that `definitionId` in `useDocumentStore` and confirms with the count, then removes the type and its templates;
    - template targets come from `listDefinitions()` at open time (`:24-32`), not once per mount.
- [x] T054 [US4] In `src/sheet_manager/features/sheet/data/templateSkeletons.ts` (`:64-89`), stop falling back to the Star Wars character skeleton for kinds without shipped defaults. A `user-` kind gets an empty draft of its own system and kind.
- [x] T055 [US4] In `src/sheet_manager/components/dialogs/DocumentCreateDialog.tsx`, group entries per contract "Create dialog groups" step 1: shipped definitions, then the user types owned by that setting (the type name as the literal label, with the description, or a translated "no description", under it, data-model "User document type"). `documentStore.createDocument` must work for `user-` ids unchanged; verify, and fix only if it relies on shipped lookups beyond `getDocumentDefinition`.
- [x] T056 [US4] In `src/sheet_manager/components/dialogs/DocumentManagerDialog.tsx` (`:118-180`), show the type name for user types and the translated "Unknown type" for orphans instead of raw ids.
- [x] T057 [US4] Scope the catalog picker in `src/sheet_manager/components/dialogs/template-editor/CatalogBindingEditor.tsx` (`:40`) to catalogs of `useEditorModel().systemId`. Validation and import stay global.
- [x] T058 [US4] Reference kind picker:
    - in `src/sheet_manager/components/dialogs/template-editor/FieldEditor.tsx` (`:397-407`), a multi-select over `listDefinitions()` kinds (shipped labels translated, user types by name);
    - in `draft.ts` (`:372`), the default `targetKinds` becomes the draft's own kind.
- [x] T059 [US4] Add en and ru strings for the new type flow, owner picker, delete confirmation with plural count, "Unknown type", and the fallback page to `translations/source/{en,ru}/ui/sheet/documents.yaml` and `templates.yaml`; run `yarn build:translations` and `yarn i18n:verify`.

**Checkpoint**: user types work end to end in one browser.

---

## Phase 7: User Story 5 — Share a user type with other players (Priority: P3)

**Goal**: type files, and document files that carry their type.

**Independent Test**: export a type and a document from one profile. Import only the document
into a clean profile: it opens on its page and the type is installed. A changed type file
offers Replace / Keep both / Cancel, and an unknown system is rejected (quickstart §5).

### Tests for User Story 5

- [x] T060 [P] [US5] File tests in `tests/sheet_manager/type-file.test.ts`, following `contracts/type-file-format.md`:
    - a serialize → parse round trip;
    - rejections: wrong format or version, a template with a different `documentKind`, a missing default template, an unknown system;
    - unknown catalogs are stripped and reported;
    - a colliding template id is re-issued and references to it are rewritten;
    - Keep both rewrites the type id, `documentKind`, and `settingId`;
    - a document export of a user type embeds `documentType`;
    - a document import installs the embedded type before parsing the envelope;
    - a document of a shipped type has no `documentType`.

### Implementation for User Story 5

- [x] T061 [US5] Create `src/sheet_manager/features/sheet/shell/typeFile.ts`:
    - `serializeTypeFile(type, setting?, templates)`, which adds `notices` from the owner system and module policies;
    - `parseTypeFile(raw)`, with full validation before any state change, reusing the catalog stripping and reference checks from `templateFile.ts` (extract shared helpers rather than copying);
    - `rewriteTypeIdentity(payload)` for Keep both.
- [x] T062 [US5] In `src/sheet_manager/features/sheet/shell/documentFile.ts`, embed an optional `documentType` for user-type documents on export. On import (`:50-62`), validate the embedded payload with the `typeFile.ts` validators and return it next to the envelope.
- [x] T063 [US5] In `src/sheet_manager/components/dialogs/TemplateImportDialog.tsx`, accept type files: detect `format: 'ttgamer-document-type'` and run the identity conflict flow (reuse its Replace / Duplicate / Cancel UI). In `src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx` (`:127-163`), install an embedded type first (same conflict flow), rewrite the document's `kind` and `definitionId` on Keep both, then run the existing document conflict dialog.
- [x] T064 [US5] Add Export type and Import type actions to `TemplateLibraryDialog.tsx`, with the filename `ttgamer_type_<slug>.json`.
- [x] T065 [US5] Add en and ru strings for type import and export and the "already installed" message in `translations/source/{en,ru}/ui/sheet/templates.yaml`; run `yarn build:translations`.

**Checkpoint**: user types can be shared by file.

---

## Phase 8: User Story 7 — Star Wars runs on a reusable WoD 2e ruleset (Priority: P3)

Ordered before US6 because user settings on the WoD 2e engine need the `wod-2e` plugin.

**Goal**: the WoD 2e engine is extracted into `systems/wod2e/ruleset/`. Star Wars is
recomposed on it with every identity frozen, and the engine plugin `wod-2e` ships a core
character.

**Independent Test**: with the T002 fixtures, every Star Wars document parses equal, every
shipped template serializes identically, and dice pools are unchanged. The `wod-2e` character
has no Force content and no policy badge (quickstart §7).

### Tests for User Story 7

- [x] T066 [P] [US7] Parity tests in `tests/sheet_manager/systems/wod2e/star-wars-parity.test.ts` against `fixtures/star-wars-parity.json` (T002):
    - parse equality for each document kind and the legacy path;
    - byte-identical shipped Star Wars templates;
    - identical `traitPool` output;
    - `resolveDocumentPolicies` for Star Wars definitions still returns `[]`.
- [x] T067 [P] [US7] Engine tests in `tests/sheet_manager/systems/wod2e/engine.test.ts`:
    - `wod2e-character` default parses with no `forceSkills`, `forcePoints`, `darkSideResistance`, `implants`, `species`, or `homeWorld`;
    - its views `wod2e-sheet` / `wod2e-brief` resolve and render with no `binding-unresolved`;
    - dice use the classic pool;
    - policies are empty;
    - ESLint forbids importing `systems/wod2e/` from generic code (extend the existing boundary test if one exists, else assert the rule's pattern in `eslint.config.mjs`).

### Implementation for User Story 7

- [x] T068 [US7] Create `src/sheet_manager/systems/wod2e/ruleset/schema.ts` with `Wod2eCoreShape` (the engine fields in data-model "WoD 2e ruleset"), taken from the current Star Wars character shape without renaming any field. Keep the migrate helpers the Star Wars schema already applies.
- [x] T069 [US7] Create `src/sheet_manager/systems/wod2e/ruleset/profile.ts` with the engine profile (9 attributes; Talents / Skills / Knowledges with classic names; virtues; willpower; health) via `defineWodSheetProfile`. Rebuild `starWarsWodProfile` in `src/sheet_manager/systems/star-wars-wod/profile.ts` as `createWodSheetProfileVariant` of it, keeping the profile id `star-wars-wod-core` and every group and key.
- [x] T070 [US7] Create `src/sheet_manager/systems/wod2e/ruleset/bindings.ts` with `buildWod2eCoreBindings(documentKinds, { catalogIds? })`: traits, willpower, health, merits/flaws/backgrounds lists, equipment, identity, and XP fields, built with the `systems/wod-like/templateBindings.ts` builders. Rebuild `src/sheet_manager/systems/star-wars-wod/documentBindings.ts` on it, adding only the Force, droid, implants, and catalog decorations.
- [x] T071 [US7] Create `src/sheet_manager/systems/wod2e/ruleset/templateParts.ts` (attributes, abilities, virtues + willpower, health, advantages, equipment, and experience sections, plus the willpower-minimum and standard-initiative formulas) and `dice.ts` (re-exporting `classicWodTraitPool` from `systems/wod-like/dicePool.ts`). Recompose `src/sheet_manager/systems/star-wars-wod/templates/character.ts` from these parts; T066 must stay byte-identical.
- [x] T072 [US7] Recompose `src/sheet_manager/systems/star-wars-wod/schema.ts` as `{ ...Wod2eCoreShape, ...StarWarsShape }` for character and droid, keeping every schema's parse result. Move the `metadata.setting: 'Star Wars WoD 2e'` default out of `createDefaultCharacter` (`src/sheet_manager/types/character.ts:251`) into the Star Wars default, with `BaseCharacterSchema` output unchanged for Star Wars documents.
- [x] T073 [US7] Create `src/sheet_manager/systems/wod2e/index.ts` with the engine plugin `wod-2e`:
    - label "World of Darkness 2nd Edition";
    - definition `wod2e-character` (kind `character`, `Wod2eCoreShape` schema, `createDefault`);
    - views `wod2e-sheet` / `wod2e-brief` built from the ruleset parts in `src/sheet_manager/systems/wod2e/templates/`;
    - `dice: { traitPool: classicWodTraitPool }`, **no `policies`** (constitution 1.4.2).

    Register it in `src/sheet_manager/systems/index.ts` after Star Wars.

- [x] T074 [US7] In `eslint.config.mjs` (`:45-76`), extend the restricted-import pattern so it covers `systems/wod2e/`, with one scoped allowance: `systems/star-wars-wod/**` may import `systems/wod2e/ruleset/**`.
- [x] T075 [US7] Add `translations/source/{en,ru}/ui/sheet/wod2e.yaml` (the system label, character label, view labels, classic ability names, and group titles). Queue the Russian ability terms in `translations/glossary/` with the review status used for V5 terms. Run `yarn build:translations` and `yarn i18n:verify`.

**Checkpoint**: Star Wars is a setting on the WoD 2e ruleset with no visible change, and the
engine character is available.

---

## Phase 9: User Story 6 — Define a user setting on an existing ruleset (Priority: P3)

**Goal**: users create named settings on the V5 or WoD 2e engine. Each reuses the engine's core
character with the setting's own pages and groups its own user types.

**Independent Test**: create "Ashen Realms" on V5 with a re-labelled character page and a user
type. Create a character: it uses the setting's page, rolls `Nd10>=6`, and shows the Dark Pack
badge. Repeat on WoD 2e: no Force content, the classic pool, no badge (quickstart §6).

### Tests for User Story 6

- [x] T076 [P] [US6] Tests in `tests/sheet_manager/user-settings.test.tsx`:
    - "New setting" lists only systems with `coreDefinitions` (`wod-v5`, `wod-2e`);
    - the create dialog shows the setting group with its core character and user types;
    - a document created there gets `metadata.settingId`, and `metadata.templateId` when the setting has a page;
    - `ViewModeSelect` lists only templates with the same `settingId`;
    - the V5 setting character rolls with the V5 pool and shows Dark Pack, and the WoD 2e one rolls with the classic pool with no badge;
    - deleting a setting confirms with its type and document counts and keeps the documents;
    - a registry invariant rejects `coreDefinitions` that name a missing or module definition.

### Implementation for User Story 6

- [x] T077 [US6] Add `coreDefinitions?: readonly DocumentDefinitionId[]` to `SystemPlugin` in `src/sheet_manager/systems/types.ts`. Add the registry invariant (each id exists and has no `module`) in `src/sheet_manager/systems/registry.ts`. Declare `coreDefinitions: ['wod2e-character']` in `src/sheet_manager/systems/wod2e/index.ts`.
- [x] T078 [US6] Add the V5 core character (research R18):
    - definition `v5-character` in `src/sheet_manager/systems/v5/core/definition.ts` (kind `mortal`, research R18; `V5CoreShape` schema, no module);
    - views `v5-core-sheet` / `v5-core-brief` in `src/sheet_manager/systems/v5/core/templates.ts`, built from `ruleset/templateParts.ts`;
    - bindings from `buildV5CoreBindings(['mortal'])`;
    - register it in `src/sheet_manager/systems/v5/index.ts` with `coreDefinitions: ['v5-character']`;
    - labels in `translations/source/{en,ru}/ui/sheet/v5.yaml`.

    Add a test in `tests/sheet_manager/user-settings.test.tsx` that Hunter templates and Hunter-only bindings are not offered for `v5-character` documents, and the reverse.

- [x] T079 [US6] Add optional `settingId` to `DocumentMetadataSchema` in `src/sheet_manager/types/document.ts` and to `CustomTemplateSchema` in `src/sheet_manager/types/template.ts`. Both are additive; the template file stays version 3.
- [x] T080 [US6] Setting flows in `TemplateLibraryDialog.tsx`:
    - "New setting" takes a ruleset picker (systems with `coreDefinitions`) and a name;
    - a setting's core-character page is edited as a user template carrying `settingId`, and saving records `setting.pages[definitionId]`;
    - "New document type" also offers user settings as owners;
    - deleting a setting confirms with its counts.
- [x] T081 [US6] Create dialog groups 2 and 3 of the contract in `DocumentCreateDialog.tsx`:
    - engine plugins list their core character;
    - user settings list the core definitions and their user types;
    - creating in a user setting sets `metadata.settingId` and `metadata.templateId` in `documentStore.createDocument` (new optional `options` argument in `src/sheet_manager/store/documentStore.ts`).
- [x] T082 [US6] Page and view resolution:
    - `src/sheet_manager/systems/view.ts` resolves `setting.pages[definitionId]` after `metadata.templateId`;
    - `src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx` (`:67-75`) and `ViewModeSelect.tsx` filter templates by equal `settingId`;
    - the registry overlay passes settings through (T049).
- [x] T083 [US6] Type file support for user settings: `typeFile.ts` embeds `setting` when the owner is a user setting and installs it on import, re-issuing ids on Keep both (contract `type-file-format.md`).
- [x] T084 [US6] Add en and ru strings for the setting flows, the ruleset picker, and the delete confirmation with counts in `translations/source/{en,ru}/ui/sheet/documents.yaml` and `templates.yaml`; run `yarn build:translations`.

**Checkpoint**: all stories are independently functional.

---

## Phase 10: Polish & cross-cutting

- [x] T085 [P] Update `.agents/skills/sheet-templates/SKILL.md`:
    - the editor section (three areas, overlay seam, scratch source, history, shortcuts by `code`, duplicate, issues with `nodeId`);
    - the stores section (template store v5 composite keys, the document type store);
    - a new "User types and settings" section (identity, overlay, generic parse, orphan page, files);
    - the tests map rows;
    - the history table row for 012;
    - known debts: remove the `ElementEditor` overload if it is resolved.
- [x] T086 [P] Update `src/sheet_manager/AGENTS.md`: user types, the registry overlay, and WoD 2e layering (ruleset + Star Wars setting + engine plugin, frozen ids). Update root `AGENTS.md` §8: the system-layering sentence names `systems/wod2e/`, and the policy bullet says the Dark Pack applies to V5 material only.
- [x] T087 [P] Add historical banners pointing at the skill to the parts this feature supersedes: the editor parts of `specs/006-template-composition-usability/spec.md` and `specs/007-entity-sheet-templates/spec.md`, and the view-id-keyed overrides in `specs/004-default-view-templates/spec.md` (T-046).
- [x] T088 [P] Update `docs/wod-v5/dark-pack.mdx` and `i18n/ru/docusaurus-plugin-content-docs/current/wod-v5/dark-pack.mdx` to say that the notice covers World of Darkness 5th Edition material; run `yarn validate:i18n`.
- [x] T089 Remove dead code left by the split (`AddElementPalette` remains, the unused `ElementEditor` recursion) and the unused exports noted in the skill (`newNodeId`, `ALL_TEMPLATE_SKELETONS`, `collectPrimitiveNodes`) if they are still unused; run `yarn audit:dead-code`.
- [x] T090 Add a `CHANGELOG.md` entry and bump `package.json` to the next minor version (`yarn check:version`).
- [x] T091 Mark T-054, T-046, and T-041 done with dated notes in `TODO.md`; add a note to `gm-notes-templates` in `ROADMAP.md` (user types and settings shipped). Run `yarn validate:backlog`.
- [x] T092 Run `yarn verify:full` and fix every finding.
- [ ] T093 Walk every scenario in `quickstart.md` in the running dev server (check <http://localhost:3000/> first), including the pre-feature profile and the Russian keyboard layout. Time scenario 4 against SC-004 (under 10 minutes for a five-field type and its first document), and ask the maintainer to run the SC-003 hallway test (a first-time author rebuilds a two-column group with three fields in under 5 minutes). Record the results in the T091 notes.

---

## Dependencies & execution order

### Phase dependencies

| Phase            | Depends on                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Setup (1)        | none. T002 must run **before** any Phase 8 change.                                                                |
| Foundational (2) | Setup; it blocks all stories                                                                                      |
| US1 (3)          | Foundational                                                                                                      |
| US2 (4)          | US1 (page overlay, outline, settings pane)                                                                        |
| US3 (5)          | US1 (the history reducer from Phase 2 is wired in T041)                                                           |
| US4 (6)          | Foundational (T-046). It does not depend on US1–US3; the old editor works too, but in practice it runs after US1. |
| US5 (7)          | US4                                                                                                               |
| US7 (8)          | Foundational and T002; independent of US1–US5                                                                     |
| US6 (9)          | US4 (types, overlay) and US7 (the `wod-2e` plugin). The V5 part alone needs only US4.                             |
| Polish (10)      | all desired stories                                                                                               |

### Within stories

- Tests are written first and fail before the implementation.
- Order is schemas and pure modules, then stores and the registry, then UI, then translations.
- T013 comes before T043. T047 → T048 → T049 → T052–T056. T068–T072 run in order, with T066
  green after each step.

### Parallel opportunities

- Phase 1: T002 ∥ T003.
- Phase 2: T008, T010, and T012 in parallel (separate pure files), with their tests T009 and
  T011. T007 and T015 in parallel with the implementation of other files. T019–T021 are
  independent of T004–T018.
- US7 (Phase 8) can run in parallel with US1–US5 by a second developer. The two touch disjoint
  files except `systems/index.ts` (T049, T073) and `eslint.config.mjs`.
- Test tasks marked [P] within a story run in parallel.

## Parallel example: Foundational

```text
Task: "T008 history.ts"          Task: "T010 shortcuts.ts"          Task: "T012 moveTargets.ts"
Task: "T009 history tests"       Task: "T011 shortcut tests"        Task: "T019 templateStore v5"
```

## Parallel example: User Story 4

```text
Task: "T045 registry/store tests"     Task: "T046 component tests"
then T047 → T048 → T049, while T051 (orphan page) and T057/T058 (catalog scope, kind picker) proceed in parallel
```

## Implementation strategy

### MVP (User Story 1)

1. Phases 1–2.
2. Phase 3 (US1). **Stop and validate** quickstart §1: the author sees the page while editing.

### Incremental delivery

1. US2 then US3 complete the visual editor (T-054). This is a releasable increment.
2. US4 then US5: user types and sharing.
3. US7: the WoD 2e ruleset, possibly in parallel from Phase 2 onward, gated by parity tests.
4. US6: user settings on both engines.
5. Polish, `yarn verify:full`, the quickstart walk-through, and the version bump.
